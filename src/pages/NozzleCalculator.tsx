import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import BackToTopButton from "../components/BackToTopButton";
import PressureCalLayout from "../components/PressureCalLayout";
import { roundTipCodeToFive } from "../pressurecal";

type PressureUnit = "psi" | "bar";
type FlowUnit = "gpm" | "lpm";

const PSI_PER_BAR = 14.5037738;
const LPM_PER_GPM = 3.785411784;

const DEFAULTS = {
  pressure: 4000,
  pressureUnit: "psi" as PressureUnit,
  flow: 15,
  flowUnit: "lpm" as FlowUnit,
};

function tipFromGpmAt4000(gpmAt4000: number) {
  const tip = Math.round(Math.max(0, gpmAt4000) * 10)
    .toString()
    .padStart(3, "0");
  return roundTipCodeToFive(tip);
}

function gpmAt4000FromFlowAtPressure(flowGpm: number, pressurePsi: number) {
  if (!(pressurePsi > 0) || !(flowGpm > 0)) return 0;
  return flowGpm * Math.sqrt(4000 / pressurePsi);
}

function orificeDiameterMmFromFlowAndPressure(
  flowLpm: number,
  pressurePsi: number,
  cd = 0.62,
  rho = 1000,
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

type NozzleCalculatorProps = {
  embedded?: boolean;
};

type CalculatorCoreProps = {
  embedded: boolean;
  pressure: number;
  setPressure: (value: number) => void;
  pressureUnit: PressureUnit;
  setPressureUnit: (value: PressureUnit) => void;
  flow: number;
  setFlow: (value: number) => void;
  flowUnit: FlowUnit;
  setFlowUnit: (value: FlowUnit) => void;
  tip: string;
  orificeMm: number;
  orificeIn: number;
  gpmAt4000: number;
  swapUnits: () => void;
  resetAll: () => void;
  copySetupLink: () => Promise<void>;
  copyMessage: string;
};

function CalculatorCore({
  embedded,
  pressure,
  setPressure,
  pressureUnit,
  setPressureUnit,
  flow,
  setFlow,
  flowUnit,
  setFlowUnit,
  tip,
  orificeMm,
  orificeIn,
  gpmAt4000,
  swapUnits,
  resetAll,
  copySetupLink,
  copyMessage,
}: CalculatorCoreProps) {
  return (
    <div className={embedded ? "space-y-6" : "space-y-8"}>
      {!embedded && (
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
            Calculate the correct pressure washer nozzle size based on pump pressure and flow
            rate.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={swapUnits}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              Swap units
            </button>

            <button
              type="button"
              onClick={resetAll}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {embedded && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Embedded calculator
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                Nozzle Size Calculator
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={swapUnits}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                Swap units
              </button>

              <button
                type="button"
                onClick={resetAll}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Dial in the recommended tip size from pump pressure and flow, then use the cards on
            the right to see how the full setup performs.
          </p>
        </div>
      )}

      <div
        className={
          embedded ? "space-y-6" : "rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        }
      >
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
                onChange={(e) => setPressureUnit(e.target.value as PressureUnit)}
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
            <div className="text-sm font-medium text-slate-600">Recommended Nozzle Size</div>

            <div className="mt-3 text-6xl font-semibold tracking-tight text-slate-900">{tip}</div>

            <div className="mt-4 text-sm text-slate-600">
              Orifice diameter{" "}
              <span className="font-semibold text-slate-800">{fmt(orificeMm, 2)} mm</span> •{" "}
              <span className="font-semibold text-slate-800">{fmt(orificeIn, 3)} in</span>
            </div>

            <div className="mt-2 text-sm text-slate-500">
              Tip equivalent ≈ <span className="font-medium">{fmt(gpmAt4000, 2)} GPM</span> @ 4000
              PSI
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

      {!embedded && (
        <>
          <section className="mt-10 space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                How to choose the correct pressure washer nozzle size
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                Choosing the correct pressure washer nozzle size is important for maintaining the
                intended pressure and flow of your machine. A nozzle that is too small can increase
                pressure, place extra load on the pump and engine, and cause the unloader to work
                harder. A nozzle that is too large can reduce operating pressure and make cleaning
                performance feel weak at the gun.
              </p>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                PressureCal estimates the nozzle tip size by using your pump pressure and flow
                rate, then converts that to the common tip sizing convention based on flow at 4000
                PSI. It also estimates the approximate orifice diameter so you can better
                understand what the nozzle is physically doing.
              </p>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                In practical terms, both PSI and flow matter. Pressure influences impact force,
                while flow influences rinsing ability and overall cleaning speed. The best nozzle is
                the one that matches your machine’s rated output rather than relying on guesswork or
                a generic chart.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Common nozzle sizing questions
              </h2>

              <div className="mt-6 space-y-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    What nozzle size do I need for 4 GPM at 4000 PSI?
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    A 4 GPM machine at 4000 PSI commonly corresponds to a 040 tip. PressureCal
                    calculates this directly from the values you enter and also shows the estimated
                    orifice diameter.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    What happens if my nozzle is too small?
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    A nozzle that is too small can increase pressure above the intended operating
                    point, increase engine load, and contribute to unloader cycling or bypass
                    activity.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    What happens if my nozzle is too large?
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    A nozzle that is too large usually reduces pressure at the gun. The machine may
                    still flow water, but cleaning performance and impact can drop noticeably.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Is nozzle size the only thing that affects real pressure?
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    No. Hose length, hose internal diameter, fittings, and unloader settings all
                    affect real operating pressure. For a more complete picture, combine this page
                    with the hose loss tool and the full PressureCal rig calculator.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-700">
                Also need to estimate pressure drop through the hose? Use the{" "}
                <Link
                  to="/hose-pressure-loss-calculator"
                  className="font-semibold text-slate-900 underline hover:text-slate-700"
                >
                  Hose Pressure Loss Calculator
                </Link>
                .
              </p>
            </div>
          </section>

          <div className="mt-8 text-center">
            <Link to="/" className="text-sm font-semibold text-slate-700 underline hover:text-slate-900">
              Open full PressureCal rig calculator
            </Link>
          </div>

          <div className="mt-10 text-center text-xs text-slate-500">
            Results are indicative. Orifice estimate assumes water, Cd≈0.62.
          </div>
        </>
      )}
    </div>
  );
}

export default function NozzleCalculator({ embedded = false }: NozzleCalculatorProps) {
  const [pressure, setPressure] = useState<number>(DEFAULTS.pressure);
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>(DEFAULTS.pressureUnit);
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

  const pressurePsi = useMemo(() => toPsi(pressure, pressureUnit), [pressure, pressureUnit]);
  const flowGpm = useMemo(() => toGpm(flow, flowUnit), [flow, flowUnit]);
  const flowLpm = useMemo(() => flowGpm * LPM_PER_GPM, [flowGpm]);
  const gpmAt4000 = useMemo(
    () => gpmAt4000FromFlowAtPressure(flowGpm, pressurePsi),
    [flowGpm, pressurePsi],
  );
  const tip = useMemo(() => tipFromGpmAt4000(gpmAt4000), [gpmAt4000]);
  const orificeMm = useMemo(
    () => orificeDiameterMmFromFlowAndPressure(flowLpm, pressurePsi),
    [flowLpm, pressurePsi],
  );
  const orificeIn = useMemo(() => orificeMm / 25.4, [orificeMm]);

  function resetAll() {
    setPressure(DEFAULTS.pressure);
    setPressureUnit(DEFAULTS.pressureUnit);
    setFlow(DEFAULTS.flow);
    setFlowUnit(DEFAULTS.flowUnit);
    setCopyMessage("");

    if (!embedded) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  function swapUnits() {
    const nextPressureUnit: PressureUnit = pressureUnit === "psi" ? "bar" : "psi";
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

    const basePath = embedded ? "/nozzle-size-calculator" : window.location.pathname;
    const url = `${window.location.origin}${basePath}?${params.toString()}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage("Setup link copied");
      window.setTimeout(() => setCopyMessage(""), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  const content = (
    <CalculatorCore
      embedded={embedded}
      pressure={pressure}
      setPressure={setPressure}
      pressureUnit={pressureUnit}
      setPressureUnit={setPressureUnit}
      flow={flow}
      setFlow={setFlow}
      flowUnit={flowUnit}
      setFlowUnit={setFlowUnit}
      tip={tip}
      orificeMm={orificeMm}
      orificeIn={orificeIn}
      gpmAt4000={gpmAt4000}
      swapUnits={swapUnits}
      resetAll={resetAll}
      copySetupLink={copySetupLink}
      copyMessage={copyMessage}
    />
  );

  if (embedded) return content;

  return (
    <>
      <Helmet>
        <title>Pressure Washer Nozzle Size Calculator | PressureCal</title>
        <meta
          name="description"
          content="Calculate the correct pressure washer nozzle size using PSI and flow rate. Get accurate tip sizing for optimal performance, cleaning power, and equipment protection."
        />
        <link rel="canonical" href="https://www.pressurecal.com/nozzle-size-calculator" />
      </Helmet>

      <PressureCalLayout>
        <div className="-mx-4 -my-8 bg-slate-100 px-4 py-8 sm:-my-10 sm:py-10">
          <div className="mx-auto max-w-5xl">{content}</div>
          <BackToTopButton />
        </div>
      </PressureCalLayout>
    </>
  );
}
