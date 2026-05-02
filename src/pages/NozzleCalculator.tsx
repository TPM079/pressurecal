import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import BackToTopButton from "../components/BackToTopButton";
import CalculationExplainer from "../components/CalculationExplainer";
import PressureCalLayout from "../components/PressureCalLayout";
import { roundTipCodeToFive } from "../pressurecal";

type PressureUnit = "psi" | "bar";
type FlowUnit = "gpm" | "lpm";

const SITE_URL = "https://www.pressurecal.com";
const PAGE_URL = `${SITE_URL}/nozzle-size-calculator`;
const PAGE_TITLE =
  "Pressure Washer Nozzle Size Calculator | Match PSI, LPM & Tip Code | PressureCal";
const PAGE_DESCRIPTION =
  "Calculate the right pressure washer nozzle size from pump pressure and flow, then check the matching nozzle / tip code before you fit the wrong nozzle to the machine. GPM refers to US gallons per minute.";

const PSI_PER_BAR = 14.5037738;
const LPM_PER_GPM = 3.785411784;

const DEFAULTS = {
  pressure: 4000,
  pressureUnit: "psi" as PressureUnit,
  flow: 15,
  flowUnit: "lpm" as FlowUnit,
};

const commonSetupPresets = [
  {
    label: "4000 PSI / 15 LPM",
    pressure: 4000,
    pressureUnit: "psi" as PressureUnit,
    flow: 15,
    flowUnit: "lpm" as FlowUnit,
  },
  {
    label: "3000 PSI / 21 LPM",
    pressure: 3000,
    pressureUnit: "psi" as PressureUnit,
    flow: 21,
    flowUnit: "lpm" as FlowUnit,
  },
  {
    label: "200 BAR / 15 LPM",
    pressure: 200,
    pressureUnit: "bar" as PressureUnit,
    flow: 15,
    flowUnit: "lpm" as FlowUnit,
  },
  {
    label: "250 BAR / 21 LPM",
    pressure: 250,
    pressureUnit: "bar" as PressureUnit,
    flow: 21,
    flowUnit: "lpm" as FlowUnit,
  },
];

function fmt(n: number, dp = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dp);
}

function fmtRounded(n: number) {
  if (!Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

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

function flowLabel(valueGpmAt4000: number) {
  const lpm = valueGpmAt4000 * LPM_PER_GPM;
  return `${fmtRounded(lpm)} LPM (${fmt(valueGpmAt4000, 2)} GPM)`;
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
  pressurePsi: number;
  flowGpm: number;
  flowLpm: number;
  gpmAt4000: number;
  tip: string;
  orificeMm: number;
  orificeIn: number;
  tipFlowLabel: string;
  swapUnits: () => void;
  resetAll: () => void;
  copySetupLink: () => Promise<void>;
  copyMessage: string;
  applyPreset: (preset: {
    pressure: number;
    pressureUnit: PressureUnit;
    flow: number;
    flowUnit: FlowUnit;
  }) => void;
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
  pressurePsi,
  flowGpm,
  flowLpm,
  gpmAt4000,
  tip,
  orificeMm,
  orificeIn,
  tipFlowLabel,
  swapUnits,
  resetAll,
  copySetupLink,
  copyMessage,
  applyPreset,
}: CalculatorCoreProps) {
  const pressureDisplayUnit = pressureUnit === "psi" ? "PSI" : "BAR";
  const flowDisplayUnit = flowUnit === "lpm" ? "LPM" : "GPM (US)";

  return (
    <div className={embedded ? "space-y-6" : "space-y-8"}>
      {!embedded && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              Nozzle Size Calculator
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Pressure Washer Nozzle Size Calculator
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Calculate the right pressure washer nozzle size from pump pressure and flow,
              then check the matching nozzle / tip code before you fit the wrong nozzle to
              the machine.
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              PressureCal keeps PSI and LPM first, with BAR and GPM (US) still available when
              you need to compare mixed-spec equipment, manuals, or parts.
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              In PressureCal, GPM refers to US gallons per minute. That matches the
              common pressure washer nozzle convention of GPM at 4000 PSI.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={swapUnits}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]"
            >
              Swap units
            </button>

            <button
              type="button"
              onClick={resetAll}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]"
            >
              Reset
            </button>
          </div>
        </section>
      )}

      {embedded && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Embedded calculator
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                Nozzle Size Calculator
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Match nozzle size to pump pressure and flow, then use the linked tools to
                check hose loss and the full setup when needed.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={swapUnits}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]"
              >
                Swap units
              </button>

              <button
                type="button"
                onClick={resetAll}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]"
              >
                Reset
              </button>
            </div>
          </div>
        </section>
      )}

      <section
        className={
          embedded
            ? "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            : "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
        }
      >
        <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Pump pressure ({pressureUnit === "psi" ? "PSI" : "BAR"})
              </label>

              <div className="flex gap-3">
                <input
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  type="number"
                  inputMode="decimal"
                  value={pressure}
                  onChange={(e) => setPressure(Number(e.target.value))}
                />

                <select
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  value={pressureUnit}
                  onChange={(e) => setPressureUnit(e.target.value as PressureUnit)}
                >
                  <option value="psi">PSI</option>
                  <option value="bar">BAR</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Pump flow ({flowUnit === "lpm" ? "LPM" : "GPM (US)"})
              </label>

              <div className="flex gap-3">
                <input
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  type="number"
                  inputMode="decimal"
                  value={flow}
                  onChange={(e) => setFlow(Number(e.target.value))}
                />

                <select
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  value={flowUnit}
                  onChange={(e) => setFlowUnit(e.target.value as FlowUnit)}
                >
                  <option value="lpm">LPM</option>
                  <option value="gpm">GPM (US)</option>
                </select>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-slate-700">
                Popular setup shortcuts
              </p>

              <div className="flex flex-wrap gap-2">
                {commonSetupPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            id={embedded ? undefined : "result"}
            className="scroll-mt-28 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  Recommended nozzle / tip code
                </p>

                <div className="mt-4 flex flex-wrap items-end gap-4">
                  <div className="rounded-2xl bg-blue-600 px-5 py-4 text-white shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">
                      Tip code
                    </div>
                    <div className="mt-1 text-5xl font-bold tracking-tight">{tip}</div>
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-white px-4 py-4 text-sm leading-6 text-slate-600">
                    Useful for matching nozzle size before buying, fitting, or blaming
                    the machine.
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Orifice diameter
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {fmt(orificeMm, 2)} mm
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {fmt(orificeIn, 3)} in
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Tip equivalent
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {tipFlowLabel}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">@ 4000 PSI</p>
                </div>
              </div>

              <CalculationExplainer
                formula={
                  <p>
                    PressureCal converts the entered flow to US GPM, converts pressure to PSI,
                    then estimates the US GPM equivalent at 4000 PSI: tip flow = flow × √(4000 ÷ pressure).
                    The nozzle code is then rounded to the nearest standard tip code.
                  </p>
                }
                inputs={[
                  {
                    label: "Pump pressure",
                    value: `${fmt(pressure, pressureUnit === "psi" ? 0 : 1)} ${pressureDisplayUnit}`,
                    note: `${fmt(pressurePsi, 0)} PSI used in the nozzle calculation.`,
                  },
                  {
                    label: "Pump flow",
                    value: `${fmt(flow, flowUnit === "lpm" ? 1 : 2)} ${flowDisplayUnit}`,
                    note: `${fmt(flowLpm, 1)} LPM / ${fmt(flowGpm, 2)} US GPM after unit conversion.`,
                  },
                  {
                    label: "Reference pressure",
                    value: "4000 PSI",
                    note: "Pressure washer nozzle codes are commonly based on US GPM at 4000 PSI.",
                  },
                ]}
                results={[
                  {
                    label: "Flow equivalent",
                    value: `${fmt(gpmAt4000, 2)} GPM (US) @ 4000 PSI`,
                    note: `${fmtRounded(gpmAt4000 * LPM_PER_GPM)} LPM equivalent after pressure adjustment.`,
                  },
                  {
                    label: "Recommended tip code",
                    value: tip,
                    note: "Rounded to the nearest practical pressure washer nozzle code.",
                  },
                  {
                    label: "Estimated orifice",
                    value: `${fmt(orificeMm, 2)} mm (${fmt(orificeIn, 3)} in)`,
                    note: "Orifice estimate assumes water and Cd ≈ 0.62.",
                  },
                ]}
                explanation={
                  <p>
                    A smaller nozzle restricts flow more and raises operating pressure. A larger nozzle
                    restricts flow less and normally lowers pressure at the gun. This estimate gives you
                    a practical starting point for matching a nozzle to the pressure and flow you entered.
                  </p>
                }
                disclaimer={
                  <p>
                    Use this as a setup estimate only. Always confirm with a pressure gauge and check
                    pump, hose, gun, lance, surface cleaner, and nozzle limits before operating.
                  </p>
                }
              />

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={copySetupLink}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Copy setup link
                </button>

                {!embedded && (
                  <Link
                    to="/calculator"
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Open full setup calculator
                  </Link>
                )}
              </div>

              <p className="text-xs text-slate-500">
                {copyMessage || "Share link preserves your units and inputs."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {!embedded && (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Why nozzle size matters
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
              <p>
                Matching nozzle size to pump pressure and flow is one of the most important
                setup checks in pressure washing. Pressure washer nozzle codes commonly use US GPM
                at 4000 PSI. A nozzle that is too small can raise pressure,
                increase engine load, and push the unloader harder than intended.
              </p>

              <p>
                A nozzle that is too large can make the machine feel weak at the gun. The setup
                may still flow water, but impact and cleaning performance can drop noticeably.
              </p>

              <p>
                PressureCal works from the pressure and flow you enter, converts that to the
                common nozzle / tip code convention, and gives you a clearer starting point than
                guesswork or a generic chart alone.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Common example
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Machine pressure
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  4000 PSI
                </p>
                <p className="mt-1 text-sm text-slate-500">(276 BAR)</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Machine flow
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  15 LPM
                </p>
                <p className="mt-1 text-sm text-slate-500">(4.0 GPM US)</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-800">
                Recommended nozzle / tip code
              </p>
              <p className="mt-2 text-4xl font-bold tracking-tight text-blue-950">040</p>
              <p className="mt-3 text-sm leading-6 text-blue-900">
                A common 4000 PSI / 15 LPM setup lands on a 040 tip code. That is why 040 is
                such a familiar reference point for many professional pressure washer setups.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              FAQ
            </h2>

            <div className="mt-5 space-y-5 text-sm leading-7 text-slate-600">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  What nozzle size suits 15 LPM at 4000 PSI?
                </h3>
                <p className="mt-2">
                  A common 15 LPM setup at 4000 PSI lands on a 040 tip code.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  What happens if my nozzle is too small?
                </h3>
                <p className="mt-2">
                  A nozzle that is too small can raise pressure, increase engine load, and
                  contribute to unloader cycling or bypass activity.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  What happens if my nozzle is too large?
                </h3>
                <p className="mt-2">
                  A nozzle that is too large usually reduces operating pressure at the gun and
                  can make cleaning performance feel weak.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Is nozzle size the only thing that affects real pressure?
                </h3>
                <p className="mt-2">
                  No. Hose length, hose ID, fittings, and unloader settings also affect real
                  operating pressure. Use the related tools below when you need the fuller
                  setup picture.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Related tools
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              Need more than nozzle size alone? Move into the live tools:
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/hose-pressure-loss-calculator"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Hose Pressure Loss Calculator
              </Link>

              <Link
                to="/target-pressure-nozzle-calculator"
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Target Pressure Nozzle Calculator
              </Link>

              <Link
                to="/nozzle-size-chart"
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Nozzle Size Chart
              </Link>

              <Link
                to="/calculator"
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Full Setup Calculator
              </Link>
            </div>

            <p className="mt-6 text-xs text-slate-500">
              Results are indicative. Orifice estimate assumes water and Cd ≈ 0.62. GPM means US gallons per minute throughout PressureCal unless otherwise stated.
            </p>
          </section>
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

  useEffect(() => {
    if (embedded) return;

    const params = new URLSearchParams(window.location.search);
    const hasInputParams =
      params.has("p") || params.has("pu") || params.has("f") || params.has("fu");
    const shouldJumpToResult = hasInputParams || window.location.hash === "#result";

    if (!shouldJumpToResult) return;

    const timer = window.setTimeout(() => {
      document.getElementById("result")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [embedded]);

  const pressurePsi = useMemo(() => toPsi(pressure, pressureUnit), [pressure, pressureUnit]);
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
  const tipFlowLabel = useMemo(() => flowLabel(gpmAt4000), [gpmAt4000]);

  const structuredData = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "@id": `${PAGE_URL}#webapplication`,
      name: "Pressure Washer Nozzle Size Calculator",
      url: PAGE_URL,
      applicationCategory: "Calculator",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      description: PAGE_DESCRIPTION,
      publisher: {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "PressureCal",
        url: `${SITE_URL}/`,
      },
    }),
    []
  );

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
    setPressure(
      Number(fromPsi(currentPressurePsi, nextPressureUnit).toFixed(nextPressureUnit === "psi" ? 0 : 1))
    );
    setFlow(
      Number(fromGpm(currentFlowGpm, nextFlowUnit).toFixed(nextFlowUnit === "gpm" ? 2 : 1))
    );
    setCopyMessage("");
  }

  function applyPreset(preset: {
    pressure: number;
    pressureUnit: PressureUnit;
    flow: number;
    flowUnit: FlowUnit;
  }) {
    setPressure(preset.pressure);
    setPressureUnit(preset.pressureUnit);
    setFlow(preset.flow);
    setFlowUnit(preset.flowUnit);
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
      pressurePsi={pressurePsi}
      flowGpm={flowGpm}
      flowLpm={flowLpm}
      gpmAt4000={gpmAt4000}
      tip={tip}
      orificeMm={orificeMm}
      orificeIn={orificeIn}
      tipFlowLabel={tipFlowLabel}
      swapUnits={swapUnits}
      resetAll={resetAll}
      copySetupLink={copySetupLink}
      copyMessage={copyMessage}
      applyPreset={applyPreset}
    />
  );

  if (embedded) return content;

  return (
    <>
      <Helmet>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={PAGE_TITLE} />
        <meta name="twitter:description" content={PAGE_DESCRIPTION} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <PressureCalLayout>
        <div className="-mx-4 -my-8 bg-slate-100 px-4 py-8 sm:-my-10 sm:py-10">
          <div className="mx-auto max-w-5xl space-y-8">{content}</div>
          <BackToTopButton />
        </div>
      </PressureCalLayout>
    </>
  );
}
