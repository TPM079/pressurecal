import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

type PressureUnit = "psi" | "bar";
type FlowUnit = "gpm" | "lpm";

const PSI_PER_BAR = 14.5037738;
const LPM_PER_GPM = 3.785411784;

const DEFAULTS = {
  pressure: 4000,
  pressureUnit: "psi" as PressureUnit,
  flow: 4,
  flowUnit: "gpm" as FlowUnit,
};

function tipFromGpmAt4000(gpmAt4000: number) {
  const tip = Math.round(Math.max(0, gpmAt4000) * 10);
  return String(tip).padStart(3, "0");
}

function gpmAt4000FromFlowAtPressure(flowGpm: number, pressurePsi: number) {
  if (!(pressurePsi > 0) || !(flowGpm > 0)) return 0;
  return flowGpm * Math.sqrt(4000 / pressurePsi);
}

function orificeDiameterMmFromFlowAndPressure(
  flowLpm: number,
  pressurePsi: number,
  cd = 0.62,
  rho = 1000
) {
  if (!(pressurePsi > 0) || !(flowLpm > 0) || !(cd > 0)) return 0;

  const q = (flowLpm / 1000) / 60;
  const pa = pressurePsi * 6894.757293168;

  const denom = cd * Math.sqrt((2 * pa) / rho);
  if (!(denom > 0)) return 0;

  const area = q / denom;
  if (!(area > 0)) return 0;

  const d = Math.sqrt((4 * area) / Math.PI);
  return d * 1000;
}

function fmt(n: number, dp = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dp);
}

function toPsi(value: number, unit: PressureUnit) {
  return unit === "psi" ? value : value * PSI_PER_BAR;
}

function fromPsi(valuePsi: number, unit: PressureUnit) {
  return unit === "psi" ? valuePsi : valuePsi / PSI_PER_BAR;
}

function toGpm(value: number, unit: FlowUnit) {
  return unit === "gpm" ? value : value / LPM_PER_GPM;
}

function fromGpm(valueGpm: number, unit: FlowUnit) {
  return unit === "gpm" ? valueGpm : valueGpm * LPM_PER_GPM;
}

export default function NozzleCalculator() {
  const [pressure, setPressure] = useState<number>(DEFAULTS.pressure);
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>(
    DEFAULTS.pressureUnit
  );
  const [flow, setFlow] = useState<number>(DEFAULTS.flow);
  const [flowUnit, setFlowUnit] = useState<FlowUnit>(DEFAULTS.flowUnit);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const pRaw = params.get("p");
    const puRaw = params.get("pu");
    const fRaw = params.get("f");
    const fuRaw = params.get("fu");

    const nextPressureUnit: PressureUnit = puRaw === "bar" ? "bar" : "psi";
    const nextFlowUnit: FlowUnit = fuRaw === "lpm" ? "lpm" : "gpm";

    const nextPressure = pRaw !== null ? Number(pRaw) : null;
    const nextFlow = fRaw !== null ? Number(fRaw) : null;

    const hasAnyParams =
      (nextPressure !== null && Number.isFinite(nextPressure)) ||
      (nextFlow !== null && Number.isFinite(nextFlow)) ||
      puRaw !== null ||
      fuRaw !== null;

    if (!hasAnyParams) return;

    setPressureUnit(nextPressureUnit);
    setFlowUnit(nextFlowUnit);

    if (nextPressure !== null && Number.isFinite(nextPressure)) {
      setPressure(nextPressure);
    }

    if (nextFlow !== null && Number.isFinite(nextFlow)) {
      setFlow(nextFlow);
    }
  }, []);

  const pressurePsi = useMemo(
    () => toPsi(pressure, pressureUnit),
    [pressure, pressureUnit]
  );

  const flowGpm = useMemo(() => toGpm(flow, flowUnit), [flow, flowUnit]);

  const flowLpm = useMemo(() => flowGpm * LPM_PER_GPM, [flowGpm]);

  const gpmAt4000 = useMemo(
    () => gpmAt4000FromFlowAtPressure(flowGpm, pressurePsi),
    [flowGpm, pressurePsi]
  );

  const tip = useMemo(() => tipFromGpmAt4000(gpmAt4000), [gpmAt4000]);

  const orificeMm = useMemo(
    () => orificeDiameterMmFromFlowAndPressure(flowLpm, pressurePsi),
    [flowLpm, pressurePsi]
  );

  const orificeIn = useMemo(() => orificeMm / 25.4, [orificeMm]);

  function resetAll() {
    setPressure(DEFAULTS.pressure);
    setPressureUnit(DEFAULTS.pressureUnit);
    setFlow(DEFAULTS.flow);
    setFlowUnit(DEFAULTS.flowUnit);
    setCopyMessage("");
    window.history.replaceState({}, "", window.location.pathname);
  }

  function swapUnits() {
    const nextPressureUnit: PressureUnit =
      pressureUnit === "psi" ? "bar" : "psi";
    const nextFlowUnit: FlowUnit = flowUnit === "gpm" ? "lpm" : "gpm";

    const currentPressurePsi = pressurePsi;
    const currentFlowGpm = flowGpm;

    setPressureUnit(nextPressureUnit);
    setFlowUnit(nextFlowUnit);

    setPressure(Number(fromPsi(currentPressurePsi, nextPressureUnit).toFixed(2)));
    setFlow(Number(fromGpm(currentFlowGpm, nextFlowUnit).toFixed(2)));
    setCopyMessage("");
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
      setCopyMessage("Setup link copied");
      window.setTimeout(() => setCopyMessage(""), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <>
      <Helmet>
        <title>Pressure Washer Nozzle Size Calculator | PressureCal</title>
        <meta
          name="description"
          content="Calculate the correct pressure washer nozzle size based on PSI and GPM. Includes orifice diameter and tip sizing for professional pressure washing setups."
        />
        <link
          rel="canonical"
          href="https://www.pressurecal.com/nozzle-size-calculator"
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Pressure Washer Nozzle Size Calculator",
            url: "https://www.pressurecal.com/nozzle-size-calculator",
            applicationCategory: "Calculator",
            operatingSystem: "Web",
            description:
              "Calculate the correct pressure washer nozzle size based on pump pressure and flow rate.",
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-slate-100">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <a href="/" className="inline-flex items-center">
              <img
                src="/PressureCal_primary_logo.png"
                alt="PressureCal"
                className="h-14 w-auto sm:h-16"
              />
            </a>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="text-center">
            <div className="mb-4">
              <Link
                to="/"
                className="text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                ← Back to PressureCal
              </Link>
            </div>

            <h1 className="text-5xl font-semibold tracking-tight text-slate-900">
              Pressure Washer Nozzle Size Calculator
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Calculate the correct pressure washer nozzle size based on pump
              pressure and flow rate.
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
                <div className="mb-2 text-center text-base font-semibold text-slate-800">
                  Pump Pressure
                </div>

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
                    value={pressureUnit}
                    onChange={(e) =>
                      setPressureUnit(e.target.value as PressureUnit)
                    }
                  >
                    <option value="psi">PSI</option>
                    <option value="bar">BAR</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="mb-2 text-center text-base font-semibold text-slate-800">
                  Pump Flow
                </div>

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
                    value={flowUnit}
                    onChange={(e) => setFlowUnit(e.target.value as FlowUnit)}
                  >
                    <option value="gpm">GPM</option>
                    <option value="lpm">L/min</option>
                  </select>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-100 px-6 py-10 text-center">
                <div className="text-sm font-medium text-slate-600">
                  Recommended Nozzle Size
                </div>

                <div className="mt-3 text-6xl font-semibold tracking-tight text-slate-900">
                  {tip}
                </div>

                <div className="mt-4 text-sm text-slate-600">
                  Orifice diameter{" "}
                  <span className="font-semibold text-slate-800">
                    {fmt(orificeMm, 2)} mm
                  </span>{" "}
                  •{" "}
                  <span className="font-semibold text-slate-800">
                    {fmt(orificeIn, 3)} in
                  </span>
                </div>

                <div className="mt-2 text-sm text-slate-500">
                  Tip equivalent ≈{" "}
                  <span className="font-medium">{fmt(gpmAt4000, 2)} GPM</span> @
                  4000 PSI
                </div>

                <div className="mt-8 flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={copySetupLink}
                    className="rounded-xl bg-slate-900 px-8 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Copy Setup Link
                  </button>

                  <div className="text-xs text-slate-500">
                    {copyMessage || "Share link preserves your units and inputs."}
                  </div>
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
    </>
  );
}