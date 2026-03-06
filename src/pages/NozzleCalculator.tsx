// src/pages/NozzleCalculator.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type PressureUnit = "psi" | "bar";
type FlowUnit = "gpm" | "lpm";

const PSI_PER_BAR = 14.5037738;
const LPM_PER_GPM = 3.785411784;

// Common nozzle sizing convention: tip code ~ (GPM @ 4000 PSI) * 10
function tipFromGpmAt4000(gpmAt4000: number) {
  const n = Math.max(0, gpmAt4000);
  const tip = Math.round(n * 10);
  return String(tip).padStart(3, "0");
}

// Standard nozzle rating scaling: Q ∝ sqrt(P)
function gpmAt4000FromFlowAtPressure(flowGpm: number, pressurePsi: number) {
  if (!(pressurePsi > 0) || !(flowGpm > 0)) return 0;
  return flowGpm * Math.sqrt(4000 / pressurePsi);
}

// Estimate orifice diameter using orifice equation
function orificeDiameterMmFromFlowAndPressure(
  flowLpm: number,
  pressurePsi: number,
  cd = 0.62,
  rho = 1000
) {
  if (!(pressurePsi > 0) || !(flowLpm > 0) || !(cd > 0)) return 0;

  const q = (flowLpm / 1000) / 60; // L/min -> m^3/s
  const pa = pressurePsi * 6894.757293168; // psi -> Pa

  const denom = cd * Math.sqrt((2 * pa) / rho);
  if (!(denom > 0)) return 0;

  const area = q / denom;
  if (!(area > 0)) return 0;

  const d = Math.sqrt((4 * area) / Math.PI); // m
  return d * 1000; // mm
}

function fmt(n: number, dp = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dp);
}

function toPsi(value: number, unit: PressureUnit) {
  return unit === "psi" ? value : value * PSI_PER_BAR;
}

function fromPsi(psi: number, unit: PressureUnit) {
  return unit === "psi" ? psi : psi / PSI_PER_BAR;
}

function toGpm(value: number, unit: FlowUnit) {
  return unit === "gpm" ? value : value / LPM_PER_GPM;
}

function fromGpm(gpm: number, unit: FlowUnit) {
  return unit === "gpm" ? gpm : gpm * LPM_PER_GPM;
}

export default function NozzleCalculator() {
  const DEFAULTS = useMemo(
    () => ({
      pressure: 4000,
      pressureUnit: "psi" as PressureUnit,
      flow: 4,
      flowUnit: "gpm" as FlowUnit
    }),
    []
  );

  const [pressure, setPressure] = useState<number>(DEFAULTS.pressure);
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>(DEFAULTS.pressureUnit);
  const [flow, setFlow] = useState<number>(DEFAULTS.flow);
  const [flowUnit, setFlowUnit] = useState<FlowUnit>(DEFAULTS.flowUnit);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const pRaw = params.get("p");
    const puRaw = params.get("pu");
    const fRaw = params.get("f");
    const fuRaw = params.get("fu");

    const nextPu: PressureUnit = puRaw === "bar" ? "bar" : "psi";
    const nextFu: FlowUnit = fuRaw === "lpm" ? "lpm" : "gpm";

    const nextP = pRaw !== null ? Number(pRaw) : null;
    const nextF = fRaw !== null ? Number(fRaw) : null;

    const hasAny =
      (nextP !== null && Number.isFinite(nextP)) ||
      (nextF !== null && Number.isFinite(nextF)) ||
      puRaw !== null ||
      fuRaw !== null;

    if (!hasAny) return;

    setPressureUnit(nextPu);
    setFlowUnit(nextFu);

    if (nextP !== null && Number.isFinite(nextP)) setPressure(nextP);
    if (nextF !== null && Number.isFinite(nextF)) setFlow(nextF);
  }, []);

  const pressurePsi = useMemo(() => toPsi(pressure, pressureUnit), [pressure, pressureUnit]);
  const flowGpm = useMemo(() => toGpm(flow, flowUnit), [flow, flowUnit]);
  const flowLpm = useMemo(() => flowGpm * LPM_PER_GPM, [flowGpm]);

  const gpmAt4000 = useMemo(
    () => gpmAt4000FromFlowAtPressure(flowGpm, pressurePsi),
    [flowGpm, pressurePsi]
  );

  const tip = useMemo(() => tipFromGpmAt4000(gpmAt4000), [gpmAt4000]);

  const orificeMm = useMemo(
    () => orificeDiameterMmFromFlowAndPressure(flowLpm, pressurePsi, 0.62, 1000),
    [flowLpm, pressurePsi]
  );

  const orificeIn = useMemo(() => orificeMm / 25.4, [orificeMm]);

  function resetAll() {
    setPressure(DEFAULTS.pressure);
    setPressureUnit(DEFAULTS.pressureUnit);
    setFlow(DEFAULTS.flow);
    setFlowUnit(DEFAULTS.flowUnit);
    window.history.replaceState({}, "", window.location.pathname);
  }

  function swapUnits() {
    const nextPressureUnit: PressureUnit = pressureUnit === "psi" ? "bar" : "psi";
    const nextFlowUnit: FlowUnit = flowUnit === "gpm" ? "lpm" : "gpm";

    const pPsi = pressurePsi;
    const fGpm = flowGpm;

    setPressureUnit(nextPressureUnit);
    setFlowUnit(nextFlowUnit);

    setPressure(Number(fmt(fromPsi(pPsi, nextPressureUnit), 2)));
    setFlow(Number(fmt(fromGpm(fGpm, nextFlowUnit), 2)));
  }

  async function copySetupLink() {
    const params = new URLSearchParams();
    params.set("p", String(pressure));
    params.set("pu", pressureUnit);
    params.set("f", String(flow));
    params.set("fu", flowUnit);

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    try {
      await navigator.clipboard.writeText(url);
      alert("Setup link copied");
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-slate-900">
            Pressure Washer Nozzle Size Calculator
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Calculate the correct pressure washer nozzle size based on pump pressure and flow rate.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={swapUnits}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              title="Swap PSI↔BAR and GPM↔LPM"
            >
              Swap units
            </button>

            <button
              type="button"
              onClick={resetAll}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              title="Reset to defaults"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="space-y-8">
            <div>
              <div className="mb-2 text-center text-base font-semibold text-slate-800">Pump Pressure</div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                <input
                  className="w-full max-w-3xl rounded-xl border border-slate-200 px-4 py-3 text-lg text-slate-900 outline-none focus:border-slate-400"
                  type="number"
                  inputMode="decimal"
                  value={pressure}
                  onChange={(e) => setPressure(Number(e.target.value))}
                />

                <select
                  className="w-full max-w-[140px] rounded-xl border border-slate-200 px-4 py-3 text-lg text-slate-900 outline-none focus:border-slate-400"
                  value={pressureUnit === "psi" ? "PSI" : "BAR"}
                  onChange={(e) => setPressureUnit(e.target.value === "BAR" ? "bar" : "psi")}
                >
                  <option>PSI</option>
                  <option>BAR</option>
                </select>
              </div>
            </div>

            <div>
              <div className="mb-2 text-center text-base font-semibold text-slate-800">Pump Flow</div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                <input
                  className="w-full max-w-3xl rounded-xl border border-slate-200 px-4 py-3 text-lg text-slate-900 outline-none focus:border-slate-400"
                  type="number"
                  inputMode="decimal"
                  value={flow}
                  onChange={(e) => setFlow(Number(e.target.value))}
                />

                <select
                  className="w-full max-w-[140px] rounded-xl border border-slate-200 px-4 py-3 text-lg text-slate-900 outline-none focus:border-slate-400"
                  value={flowUnit === "gpm" ? "GPM" : "L/min"}
                  onChange={(e) => setFlowUnit(e.target.value === "L/min" ? "lpm" : "gpm")}
                >
                  <option>GPM</option>
                  <option>L/min</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-100 px-6 py-10 text-center">
              <div className="text-sm font-medium text-slate-600">Recommended Nozzle Size</div>

              <div className="mt-3 text-6xl font-semibold tracking-tight text-slate-900">{tip}</div>

              <div className="mt-4 text-sm text-slate-600">
                Orifice diameter{" "}
                <span className="font-semibold text-slate-800">{fmt(orificeMm, 2)} mm</span> •{" "}
                <span className="font-semibold text-slate-800">{fmt(orificeIn, 3)} in</span>
              </div>

              <div className="mt-2 text-sm text-slate-500">
                Tip equivalent ≈ <span className="font-medium">{fmt(gpmAt4000, 2)} GPM</span> @ 4000 PSI
              </div>

              <div className="mt-8 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={copySetupLink}
                  className="rounded-xl bg-slate-900 px-8 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Copy Setup Link
                </button>
                <div className="text-xs text-slate-500">Share link preserves your units & inputs.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="text-sm font-semibold text-slate-700 underline hover:text-slate-900"
          >
            Open full PressureCal rig calculator
          </Link>
        </div>

        <div className="mt-10 text-center text-xs text-slate-500">
          Results are indicative. Orifice estimate assumes water, Cd≈0.62.
        </div>
      </div>
    </div>
  );
}