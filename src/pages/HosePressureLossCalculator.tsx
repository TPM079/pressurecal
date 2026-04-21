import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import BackToTopButton from "../components/BackToTopButton";
import PressureCalLayout from "../components/PressureCalLayout";

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
  { label: '3/16" (4.76 mm)', value: 4.76, unit: "mm" as DiameterUnit },
  { label: '1/4" (6.35 mm)', value: 6.35, unit: "mm" as DiameterUnit },
  { label: '5/16" (7.94 mm)', value: 7.94, unit: "mm" as DiameterUnit },
  { label: '3/8" (9.53 mm)', value: 9.53, unit: "mm" as DiameterUnit },
  { label: '1/2" (12.70 mm)', value: 12.7, unit: "mm" as DiameterUnit },
];

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
        <title>
          Pressure Washer Hose Pressure Loss Calculator | Metres, PSI &amp; LPM | PressureCal
        </title>
        <meta
          name="description"
          content="Estimate pressure loss through pressure washer hose using metres, PSI and LPM first, while still supporting feet, BAR and GPM when needed. Useful for checking at-gun pressure and real setup performance."
        />
        <link
          rel="canonical"
          href="https://www.pressurecal.com/hose-pressure-loss-calculator"
        />
        <meta
          property="og:title"
          content="Pressure Washer Hose Pressure Loss Calculator | Metres, PSI & LPM | PressureCal"
        />
        <meta
          property="og:description"
          content="Estimate pressure loss through pressure washer hose using metres, PSI and LPM first, while still supporting feet, BAR and GPM when needed. Useful for checking at-gun pressure and real setup performance."
        />
        <meta
          property="og:url"
          content="https://www.pressurecal.com/hose-pressure-loss-calculator"
        />
        <meta property="og:type" content="website" />
        <meta
          name="twitter:title"
          content="Pressure Washer Hose Pressure Loss Calculator | Metres, PSI & LPM | PressureCal"
        />
        <meta
          name="twitter:description"
          content="Estimate pressure loss through pressure washer hose using metres, PSI and LPM first, while still supporting feet, BAR and GPM when needed. Useful for checking at-gun pressure and real setup performance."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Pressure Washer Hose Pressure Loss Calculator",
            url: "https://www.pressurecal.com/hose-pressure-loss-calculator",
            applicationCategory: "EngineeringApplication",
            operatingSystem: "Web",
            description:
              "Estimate pressure loss through pressure washer hose using metres, PSI and LPM first, while still supporting feet, BAR and GPM when needed. Useful for checking at-gun pressure and real setup performance.",
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
                  Estimate how much pressure your setup is losing through hose length and hose size.
                  Use this calculator to check pressure drop before the gun, compare different hose
                  runs, and see why a machine can feel different at the trigger than it does at the pump.
                </p>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                  PressureCal keeps metres, PSI and LPM first, with feet, BAR and GPM still
                  available when needed. Useful estimates for real setup checks.
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
                      Pump flow ({flowUnit === "lpm" ? "LPM" : "GPM"})
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
                        <option value="gpm">GPM</option>
                      </select>
                    </div>
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
                          before the nozzle.
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
                  Even if your pump is rated for a certain pressure and flow, that is not always
                  what you get at the gun. Longer hose runs and smaller hose sizes increase pressure
                  loss, which can affect cleaning performance, nozzle matching, surface cleaner
                  performance, and how a setup feels in real use.
                </p>

                <p>
                  If pressure feels weak at the gun, hose loss is one of the first things worth
                  checking. This calculator helps you estimate whether the hose itself is only a small
                  part of the story or a meaningful contributor to the pressure you are losing before
                  the nozzle.
                </p>

                <p>
                  PressureCal keeps metres, PSI and LPM first, with feet, BAR and GPM still visible
                  when you need to compare mixed-spec equipment, manuals, or parts.
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Common use case
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Pump pressure
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">4000 PSI</p>
                  <p className="mt-1 text-sm text-slate-500">(276 BAR)</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Pump flow
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">15 LPM</p>
                  <p className="mt-1 text-sm text-slate-500">(4.0 GPM)</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-800">
                  Example check
                </p>
                <p className="mt-3 text-sm leading-6 text-blue-900">
                  A 4000 PSI / 15 LPM machine running 30 metres of 3/8 inch hose will usually lose a
                  noticeable amount of pressure before the gun. This calculator helps you see whether
                  that drop is minor, moderate, or meaningful before you start changing other parts of
                  the setup.
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
                    How much pressure do you lose through pressure washer hose?
                  </h3>
                  <p className="mt-2">
                    It depends on hose length, hose size, flow rate, and operating pressure. Longer
                    hose and smaller hose size generally increase pressure loss.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Does a larger hose reduce pressure loss?
                  </h3>
                  <p className="mt-2">
                    Yes. In many setups, increasing hose size can reduce pressure loss, especially
                    over longer hose runs or higher flow rates.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Why is pressure lower at the gun than at the pump?
                  </h3>
                  <p className="mt-2">
                    Some pressure is lost through the hose, fittings, reels, and other components in
                    the setup. Hose pressure loss is one of the most common reasons the pressure at
                    the gun is lower than expected.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Should I change hose size or nozzle size?
                  </h3>
                  <p className="mt-2">
                    That depends on what you are trying to fix. If the issue is pressure loss through
                    the hose, hose size may matter. If the issue is operating pressure at the gun,
                    nozzle size also plays a major role.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Related tools
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                Need more than hose loss alone? Move into the live tools:
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/calculator"
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Full Setup Calculator
                </Link>

                <Link
                  to="/nozzle-size-calculator"
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Nozzle Size Calculator
                </Link>

                <Link
                  to="/nozzle-size-chart"
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Nozzle Size Chart
                </Link>
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
