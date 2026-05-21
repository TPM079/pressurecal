import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import BackToTopButton from "../components/BackToTopButton";
import PressureCalLayout from "../components/PressureCalLayout";
import CalculationExplainer from "../components/CalculationExplainer";

type PressureUnit = "psi" | "bar";
type FlowUnit = "gpm" | "lpm";
type LengthUnit = "m" | "ft";
type DiameterUnit = "mm" | "in";

const PSI_PER_BAR = 14.5037738;
const LPM_PER_GPM = 3.785411784;
const FT_PER_M = 3.280839895;
const MM_PER_IN = 25.4;

const DEFAULTS = {
  pressure: 4000,
  pressureUnit: "psi" as PressureUnit,
  flow: 15,
  flowUnit: "lpm" as FlowUnit,
  hoseLength: 30,
  hoseLengthUnit: "m" as LengthUnit,
  hoseId: 9.53,
  hoseIdUnit: "mm" as DiameterUnit,
};

const hosePresets = [
  { label: '1/8" (3.18 mm)', value: 3.18, unit: "mm" as DiameterUnit },
  { label: '3/16" (4.76 mm)', value: 4.76, unit: "mm" as DiameterUnit },
  { label: '1/4" (6.35 mm)', value: 6.35, unit: "mm" as DiameterUnit },
  { label: '5/16" (7.94 mm)', value: 7.94, unit: "mm" as DiameterUnit },
  { label: '3/8" (9.53 mm)', value: 9.53, unit: "mm" as DiameterUnit },
  { label: '1/2" (12.70 mm)', value: 12.7, unit: "mm" as DiameterUnit },
  { label: '3/4" (19.05 mm)', value: 19.05, unit: "mm" as DiameterUnit },
  { label: '1" (25.40 mm)', value: 25.4, unit: "mm" as DiameterUnit },
];

const PAGE_TITLE = "Pressure Washer Hose Pressure Loss Calculator | PressureCal";
const PAGE_DESCRIPTION =
  "Estimate pressure loss through pressure washer hose by hose length, flow rate and internal diameter. Built for operators using PSI, BAR, LPM and GPM.";

const faqItems = [
  {
    question: "How do I calculate pressure loss through a pressure washer hose?",
    answer:
      "Enter the hose length, hose internal diameter and flow rate. PressureCal estimates the pressure drop through the hose and shows the estimated pressure left at the gun.",
  },
  {
    question: "Does a longer pressure washer hose reduce pressure at the gun?",
    answer:
      "Yes. A longer pressure washer hose gives water more distance to travel, so friction loss increases. Doubling hose length will usually increase pressure drop by roughly the same proportion when the same hose ID and flow rate are used.",
  },
  {
    question: "Does 3/8 inch hose lose less pressure than 1/4 inch hose?",
    answer:
      "Usually, yes. A larger hose internal diameter gives the water more room to move, which can reduce pressure loss. This becomes more important with higher flow rates and longer hose runs.",
  },
  {
    question: "Why is pressure lower at the gun than at the pump?",
    answer:
      "Pressure can be lost through the hose, reel, fittings, gun, lance and nozzle. Hose pressure loss is one common reason the pressure at the gun is lower than the pump rating.",
  },
  {
    question: "Should I change hose size or nozzle size first?",
    answer:
      "Check both. Hose size affects pressure loss before the gun, while nozzle size controls the operating pressure and flow relationship at the nozzle. The full setup calculator is the better tool when you want to model the whole system.",
  },
] as const;

const relatedTools = [
  { label: "Full Pressure Washer Setup Calculator", path: "/calculator" },
  { label: "Pressure Washer Nozzle Size Calculator", path: "/nozzle-size-calculator" },
  { label: "PSI to BAR Converter", path: "/psi-bar-calculator" },
  { label: "LPM to GPM Converter", path: "/lpm-gpm-calculator" },
] as const;

function fmt(n: number, dp = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dp);
}

function fmtRounded(n: number) {
  if (!Number.isFinite(n)) return "—";
  return String(Math.round(n));
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

function toMetres(value: number, unit: LengthUnit) {
  return unit === "m" ? value : value / FT_PER_M;
}

function fromMetres(metres: number, unit: LengthUnit) {
  return unit === "m" ? metres : metres * FT_PER_M;
}

function toMm(value: number, unit: DiameterUnit) {
  return unit === "mm" ? value : value * MM_PER_IN;
}

function fromMm(mm: number, unit: DiameterUnit) {
  return unit === "mm" ? mm : mm / MM_PER_IN;
}

function estimateHoseLossPsi(flowGpm: number, lengthM: number, hoseIdMm: number) {
  const rho = 1000;
  const mu = 0.001;
  const roughnessM = 0.0000015;

  if (!(flowGpm > 0) || !(lengthM > 0) || !(hoseIdMm > 0)) return 0;

  const q = (flowGpm * 0.003785411784) / 60;
  const d = hoseIdMm / 1000;
  const area = (Math.PI * d * d) / 4;
  const velocity = q / area;

  const re = (rho * velocity * d) / mu;
  if (!(re > 0)) return 0;

  const relRoughness = roughnessM / d;

  let frictionFactor = 0;
  if (re < 2300) {
    frictionFactor = 64 / re;
  } else {
    const a = relRoughness / 3.7;
    const b = 5.74 / Math.pow(re, 0.9);
    frictionFactor = 0.25 / Math.pow(Math.log10(a + b), 2);
  }

  const dpPa =
    frictionFactor * (lengthM / d) * ((rho * velocity * velocity) / 2);
  const dpPsi = dpPa / 6894.757293168;

  return Math.max(dpPsi, 0);
}
const EXAMPLE_FLOW_LPM = 15;
const EXAMPLE_FLOW_GPM = toGpm(EXAMPLE_FLOW_LPM, "lpm");
const EXAMPLE_HOSE_ID_MM = 9.53;
const EXAMPLE_30M_LOSS_PSI = estimateHoseLossPsi(
  EXAMPLE_FLOW_GPM,
  30,
  EXAMPLE_HOSE_ID_MM
);
const EXAMPLE_60M_LOSS_PSI = estimateHoseLossPsi(
  EXAMPLE_FLOW_GPM,
  60,
  EXAMPLE_HOSE_ID_MM
);

export default function HosePressureLossCalculator() {
  const [pressure, setPressure] = useState<number>(DEFAULTS.pressure);
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>(DEFAULTS.pressureUnit);
  const [flow, setFlow] = useState<number>(DEFAULTS.flow);
  const [flowUnit, setFlowUnit] = useState<FlowUnit>(DEFAULTS.flowUnit);
  const [hoseLength, setHoseLength] = useState<number>(DEFAULTS.hoseLength);
  const [hoseLengthUnit, setHoseLengthUnit] = useState<LengthUnit>(DEFAULTS.hoseLengthUnit);
  const [hoseId, setHoseId] = useState<number>(DEFAULTS.hoseId);
  const [hoseIdUnit, setHoseIdUnit] = useState<DiameterUnit>(DEFAULTS.hoseIdUnit);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const pRaw = params.get("p");
    const puRaw = params.get("pu");
    const fRaw = params.get("f");
    const fuRaw = params.get("fu");
    const lRaw = params.get("l");
    const luRaw = params.get("lu");
    const dRaw = params.get("d");
    const duRaw = params.get("du");

    const nextPressureUnit: PressureUnit = puRaw === "bar" ? "bar" : "psi";
    const nextFlowUnit: FlowUnit = fuRaw === "gpm" ? "gpm" : "lpm";
    const nextLengthUnit: LengthUnit = luRaw === "ft" ? "ft" : "m";
    const nextDiameterUnit: DiameterUnit = duRaw === "in" ? "in" : "mm";

    const nextPressure = pRaw !== null ? Number(pRaw) : null;
    const nextFlow = fRaw !== null ? Number(fRaw) : null;
    const nextLength = lRaw !== null ? Number(lRaw) : null;
    const nextDiameter = dRaw !== null ? Number(dRaw) : null;

    const hasAnyParams =
      (nextPressure !== null && Number.isFinite(nextPressure)) ||
      (nextFlow !== null && Number.isFinite(nextFlow)) ||
      (nextLength !== null && Number.isFinite(nextLength)) ||
      (nextDiameter !== null && Number.isFinite(nextDiameter)) ||
      puRaw !== null ||
      fuRaw !== null ||
      luRaw !== null ||
      duRaw !== null;

    if (!hasAnyParams) return;

    setPressureUnit(nextPressureUnit);
    setFlowUnit(nextFlowUnit);
    setHoseLengthUnit(nextLengthUnit);
    setHoseIdUnit(nextDiameterUnit);

    if (nextPressure !== null && Number.isFinite(nextPressure)) setPressure(nextPressure);
    if (nextFlow !== null && Number.isFinite(nextFlow)) setFlow(nextFlow);
    if (nextLength !== null && Number.isFinite(nextLength)) setHoseLength(nextLength);
    if (nextDiameter !== null && Number.isFinite(nextDiameter)) setHoseId(nextDiameter);
  }, []);

  const pressurePsi = useMemo(() => toPsi(pressure, pressureUnit), [pressure, pressureUnit]);
  const flowGpm = useMemo(() => toGpm(flow, flowUnit), [flow, flowUnit]);
  const hoseLengthM = useMemo(() => toMetres(hoseLength, hoseLengthUnit), [hoseLength, hoseLengthUnit]);
  const hoseIdMm = useMemo(() => toMm(hoseId, hoseIdUnit), [hoseId, hoseIdUnit]);

  const hoseLossPsi = useMemo(
    () => estimateHoseLossPsi(flowGpm, hoseLengthM, hoseIdMm),
    [flowGpm, hoseLengthM, hoseIdMm]
  );

  const pressureAtGunPsi = useMemo(
    () => Math.max(pressurePsi - hoseLossPsi, 0),
    [pressurePsi, hoseLossPsi]
  );

  const lossPct = useMemo(
    () => (pressurePsi > 0 ? (hoseLossPsi / pressurePsi) * 100 : 0),
    [pressurePsi, hoseLossPsi]
  );

  const interpretation = useMemo(() => {
    if (lossPct < 3) {
      return "Low hose loss. Most of the pump pressure is still reaching the gun.";
    }
    if (lossPct < 8) {
      return "Moderate hose loss. This may be noticeable depending on the nozzle and the job.";
    }
    return "Higher hose loss. Hose length or hose size could be having a meaningful effect on real cleaning performance.";
  }, [lossPct]);

  const lossMeaning = useMemo(() => {
    if (lossPct < 3) return "Very close to rated performance.";
    if (lossPct < 8) return "Noticeable, but often still workable depending on the job.";
    return "Meaningful pressure loss. Hose length or hose ID may be worth revisiting.";
  }, [lossPct]);

  const flowLpm = useMemo(() => flowGpm * LPM_PER_GPM, [flowGpm]);
  const hoseLossBar = useMemo(() => fromPsi(hoseLossPsi, "bar"), [hoseLossPsi]);
  const pressureAtGunBar = useMemo(() => fromPsi(pressureAtGunPsi, "bar"), [pressureAtGunPsi]);

  function resetAll() {
    setPressure(DEFAULTS.pressure);
    setPressureUnit(DEFAULTS.pressureUnit);
    setFlow(DEFAULTS.flow);
    setFlowUnit(DEFAULTS.flowUnit);
    setHoseLength(DEFAULTS.hoseLength);
    setHoseLengthUnit(DEFAULTS.hoseLengthUnit);
    setHoseId(DEFAULTS.hoseId);
    setHoseIdUnit(DEFAULTS.hoseIdUnit);
    setCopyMessage("");
    window.history.replaceState({}, "", window.location.pathname);
  }

  function swapUnits() {
    const nextPressureUnit: PressureUnit = pressureUnit === "psi" ? "bar" : "psi";
    const nextFlowUnit: FlowUnit = flowUnit === "gpm" ? "lpm" : "gpm";
    const nextLengthUnit: LengthUnit = hoseLengthUnit === "m" ? "ft" : "m";
    const nextDiameterUnit: DiameterUnit = hoseIdUnit === "mm" ? "in" : "mm";

    setPressureUnit(nextPressureUnit);
    setFlowUnit(nextFlowUnit);
    setHoseLengthUnit(nextLengthUnit);
    setHoseIdUnit(nextDiameterUnit);

    setPressure(Number(fromPsi(pressurePsi, nextPressureUnit).toFixed(nextPressureUnit === "psi" ? 0 : 1)));
    setFlow(Number(fromGpm(flowGpm, nextFlowUnit).toFixed(nextFlowUnit === "gpm" ? 2 : 0)));
    setHoseLength(Number(fromMetres(hoseLengthM, nextLengthUnit).toFixed(0)));
    setHoseId(Number(fromMm(hoseIdMm, nextDiameterUnit).toFixed(nextDiameterUnit === "mm" ? 2 : 3)));
    setCopyMessage("");
  }

  async function copySetupLink() {
    const params = new URLSearchParams();
    params.set("p", String(pressure));
    params.set("pu", pressureUnit);
    params.set("f", String(flow));
    params.set("fu", flowUnit);
    params.set("l", String(hoseLength));
    params.set("lu", hoseLengthUnit);
    params.set("d", String(hoseId));
    params.set("du", hoseIdUnit);

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
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <link
          rel="canonical"
          href="https://www.pressurecal.com/hose-pressure-loss-calculator"
        />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta
          property="og:url"
          content="https://www.pressurecal.com/hose-pressure-loss-calculator"
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={PAGE_TITLE} />
        <meta name="twitter:description" content={PAGE_DESCRIPTION} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "SoftwareApplication",
                name: "Pressure Washer Hose Pressure Loss Calculator",
                url: "https://www.pressurecal.com/hose-pressure-loss-calculator",
                applicationCategory: "EngineeringApplication",
                operatingSystem: "Web",
                description: PAGE_DESCRIPTION,
              },
              {
                "@type": "FAQPage",
                mainEntity: faqItems.map((item) => ({
                  "@type": "Question",
                  name: item.question,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: item.answer,
                  },
                })),
              },
            ],
          })}
        </script>
      </Helmet>

      <PressureCalLayout>
        <div className="-mx-4 -my-8 bg-slate-100 px-4 py-8 sm:-my-10 sm:py-10">
          <div className="mx-auto max-w-5xl space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  Hose Pressure Loss Calculator
                </div>

                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                  Pressure Washer Hose Pressure Loss Calculator
                </h1>

                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                  Use this calculator to estimate how much pressure is lost through a pressure
                  washer hose before water reaches the gun or nozzle. Enter hose length, hose
                  internal diameter and flow rate to estimate pressure drop for your setup.
                </p>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                  Built for pressure washing operators using PSI, BAR, LPM and GPM. PressureCal
                  keeps the numbers practical so you can compare hose runs, check at-gun pressure,
                  and understand what your setup is actually doing.
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

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
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

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      PressureCal uses US gallons per minute for GPM, matching the convention used by most pressure washer nozzle charts and pump specifications.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Hose length ({hoseLengthUnit === "m" ? "Metres" : "Feet"})
                    </label>

                    <div className="flex gap-3">
                      <input
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        type="number"
                        inputMode="decimal"
                        value={hoseLength}
                        onChange={(e) => setHoseLength(Number(e.target.value))}
                      />

                      <select
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        value={hoseLengthUnit}
                        onChange={(e) => setHoseLengthUnit(e.target.value as LengthUnit)}
                      >
                        <option value="m">Metres</option>
                        <option value="ft">Feet</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Hose internal diameter ({hoseIdUnit === "mm" ? "mm" : "in"})
                    </label>

                    <div className="flex gap-3">
                      <input
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        type="number"
                        inputMode="decimal"
                        value={hoseId}
                        onChange={(e) => setHoseId(Number(e.target.value))}
                      />

                      <select
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        value={hoseIdUnit}
                        onChange={(e) => setHoseIdUnit(e.target.value as DiameterUnit)}
                      >
                        <option value="mm">mm</option>
                        <option value="in">in</option>
                      </select>
                    </div>

                    <div className="mt-4">
                      <p className="mb-3 text-sm font-medium text-slate-700">Common hose IDs</p>
                      <div className="flex flex-wrap gap-2">
                        {hosePresets.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setHoseId(preset.value);
                              setHoseIdUnit(preset.unit);
                            }}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
                  <div className="flex flex-col gap-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                        Estimated hose pressure loss
                      </p>

                      <div className="mt-3 flex flex-wrap items-end gap-3">
                        <div className="rounded-2xl bg-blue-600 px-4 py-3 text-white shadow-sm">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">
                            Loss
                          </div>
                          <div className="mt-1 text-4xl font-bold tracking-tight">
                            {fmtRounded(hoseLossPsi)} PSI
                          </div>
                          <div className="mt-1 text-sm text-blue-100">
                            {fmt(fromPsi(hoseLossPsi, "bar"), 1)} BAR
                          </div>
                        </div>

                        <div className="rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                          Useful for checking how much pressure the hose itself may be taking
                          before the gun and nozzle.
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Pressure at gun
                        </p>
                        <p className="mt-2 text-xl font-semibold text-slate-900">
                          {fmtRounded(pressureAtGunPsi)} PSI
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {fmt(fromPsi(pressureAtGunPsi, "bar"), 1)} BAR
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Loss percentage
                        </p>
                        <p className="mt-2 text-xl font-semibold text-slate-900">
                          {fmt(lossPct, 1)}%
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Estimated pressure drop
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        What this means
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {interpretation}
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {lossMeaning}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={copySetupLink}
                        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Copy setup link
                      </button>

                      <Link
                        to="/calculator"
                        className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Open full setup calculator
                      </Link>
                    </div>

                    <p className="text-xs text-slate-500">
                      {copyMessage || "Share link preserves your units and inputs."}
                    </p>

                    <CalculationExplainer
                      formula={
                        <div className="space-y-2">
                          <p>
                            Hose pressure loss is estimated from flow, hose length, and hose internal diameter using a Darcy-Weisbach style pressure-loss calculation.
                          </p>
                          <p>
                            When GPM is used, PressureCal treats it as US gallons per minute.
                          </p>
                          <p className="font-mono text-xs text-slate-600">
                            Pressure at gun = Pump pressure - Estimated hose loss
                          </p>
                        </div>
                      }
                      inputs={[
                        {
                          label: "Pump pressure",
                          value: `${fmtRounded(pressurePsi)} PSI (${fmt(fromPsi(pressurePsi, "bar"), 1)} BAR)`,
                          note: `Entered as ${fmt(pressure, pressureUnit === "psi" ? 0 : 1)} ${pressureUnit.toUpperCase()}.`,
                        },
                        {
                          label: "Pump flow",
                          value: `${fmtRounded(flowLpm)} LPM (${fmt(flowGpm, 2)} US GPM)`,
                          note: `Entered as ${fmt(flow, flowUnit === "gpm" ? 2 : 0)} ${flowUnit === "gpm" ? "GPM (US)" : "LPM"}.`,
                        },
                        {
                          label: "Hose length",
                          value: `${fmt(hoseLengthM, 1)} m`,
                          note: `Entered as ${fmt(hoseLength, 0)} ${hoseLengthUnit === "m" ? "metres" : "feet"}.`,
                        },
                        {
                          label: "Hose ID",
                          value: `${fmt(hoseIdMm, 2)} mm`,
                          note: `Entered as ${fmt(hoseId, hoseIdUnit === "mm" ? 2 : 3)} ${hoseIdUnit}.`,
                        },
                      ]}
                      results={[
                        {
                          label: "Estimated hose loss",
                          value: `${fmtRounded(hoseLossPsi)} PSI (${fmt(hoseLossBar, 1)} BAR)`,
                          note: `${fmt(lossPct, 1)}% of the entered pump pressure.`,
                        },
                        {
                          label: "Estimated pressure at gun",
                          value: `${fmtRounded(pressureAtGunPsi)} PSI (${fmt(pressureAtGunBar, 1)} BAR)`,
                        },
                      ]}
                      explanation={
                        <p>
                          PressureCal estimates the pressure being lost as water moves through the hose. Longer hose runs, smaller hose IDs, and higher flow rates usually increase pressure loss. GPM is treated as US gallons per minute, matching the pressure washer convention used by most nozzle charts and pump specifications. This helps show whether the hose is a small part of the setup or a meaningful reason the machine feels weaker at the gun.
                        </p>
                      }
                      disclaimer={
                        <p>
                          Use this as a setup estimate only. Always confirm with a pressure gauge and check pump, hose, reel, gun, lance, fittings, nozzle, and manufacturer limits before making equipment decisions.
                        </p>
                      }
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Why hose pressure loss matters
              </h2>

              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
                <p>
                  A pressure washer may be rated at a certain PSI and flow rate at the pump, but
                  that is not always what reaches the gun. Water loses pressure as it moves through
                  hose, reels, fittings and the rest of the setup.
                </p>

                <p>
                  Hose pressure loss matters because it can change how the machine feels at the
                  trigger, how well a surface cleaner performs, and whether the nozzle is matched
                  properly to the real at-gun pressure.
                </p>

                <p>
                  This page is focused on pressure loss through hose. To model pump pressure, hose
                  loss, nozzle size and at-gun performance together, use the{" "}
                  <Link
                    to="/calculator"
                    className="font-semibold text-blue-700 underline-offset-4 hover:underline"
                  >
                    Full Pressure Washer Setup Calculator
                  </Link>
                  .
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                How hose length affects pressure drop
              </h2>

              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
                <p>
                  Longer hose runs create more friction loss. If the hose ID and flow rate stay the
                  same, increasing hose length usually increases pressure drop in a fairly direct way.
                  That is why a machine can feel sharper on a short hose and softer on a long hose,
                  even when the pump and nozzle have not changed.
                </p>

                <p>
                  For pressure washing operators, the practical question is not only how much hose is
                  on the job, but how much pressure is left at the gun once that hose loss has been
                  taken into account.
                </p>
              </div>

              <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                <h3 className="text-lg font-semibold text-blue-950">
                  Example: 30 m vs 60 m of 3/8 inch pressure washer hose
                </h3>

                <p className="mt-2 text-sm leading-6 text-blue-900">
                  Using a 4000 PSI pump, {EXAMPLE_FLOW_LPM} LPM flow and 3/8 inch hose
                  internal diameter, PressureCal estimates:
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-blue-200 bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                      30 m hose
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      {fmtRounded(EXAMPLE_30M_LOSS_PSI)} PSI
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {fmt(fromPsi(EXAMPLE_30M_LOSS_PSI, "bar"), 1)} BAR estimated pressure drop
                    </p>
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                      60 m hose
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      {fmtRounded(EXAMPLE_60M_LOSS_PSI)} PSI
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {fmt(fromPsi(EXAMPLE_60M_LOSS_PSI, "bar"), 1)} BAR estimated pressure drop
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-6 text-blue-900">
                  Same pump. Same nozzle assumption. Same 3/8 inch hose ID. More hose means more
                  pressure loss before the water reaches the gun.
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                What changes pressure loss through hose?
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                Hose friction loss is mainly driven by hose length, hose internal diameter and flow
                rate. PressureCal keeps those inputs front and centre because they are the values
                operators can usually check or change in the real setup.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-base font-semibold text-slate-900">
                    Hose length
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Longer hose gives water more distance to travel. A 60 m hose run will usually
                    lose more pressure than a 30 m run with the same hose ID and flow rate.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-base font-semibold text-slate-900">
                    Hose internal diameter
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Smaller hose ID increases restriction. Moving from a smaller hose to 3/8 inch
                    or 1/2 inch hose can reduce pressure drop in higher-flow or longer-hose setups.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-base font-semibold text-slate-900">
                    Flow rate
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Higher LPM or GPM pushes more water through the same hose. That usually increases
                    friction loss, especially when the hose ID is tight for the flow.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-semibold text-slate-900">
                  Hose pressure drop is only one part of the setup
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  If the result shows meaningful pressure loss, the next step is to compare the hose
                  result with nozzle sizing and full setup performance. The{" "}
                  <Link
                    to="/nozzle-size-calculator"
                    className="font-semibold text-blue-700 underline-offset-4 hover:underline"
                  >
                    Pressure Washer Nozzle Size Calculator
                  </Link>{" "}
                  helps check nozzle match, while the full setup calculator combines pump, hose and
                  nozzle behaviour in one place.
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                FAQ
              </h2>

              <div className="mt-5 space-y-5 text-sm leading-7 text-slate-600">
                {faqItems.map((item) => (
                  <div key={item.question}>
                    <h3 className="text-base font-semibold text-slate-900">
                      {item.question}
                    </h3>
                    <p className="mt-2">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Related PressureCal tools
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                Hose pressure loss is only one part of pressure washer setup matching. These tools
                help you check pressure, flow, nozzle size and real at-gun performance.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {relatedTools.map((tool) => (
                  <Link
                    key={tool.path}
                    to={tool.path}
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {tool.label}
                  </Link>
                ))}
              </div>

              <p className="mt-6 text-xs text-slate-500">
                Useful estimates for real setup checks. Results do not replace testing, gauge checks,
                manufacturer limits, or operator judgment.
              </p>
            </section>

          </div>

          <BackToTopButton />
        </div>
      </PressureCalLayout>
    </>
  );
}


