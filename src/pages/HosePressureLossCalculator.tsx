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

function estimateHoseLossPsi(
  flowGpm: number,
  lengthM: number,
  hoseIdMm: number
) {
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
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>(
    DEFAULTS.pressureUnit
  );

  const [flow, setFlow] = useState<number>(DEFAULTS.flow);
  const [flowUnit, setFlowUnit] = useState<FlowUnit>(DEFAULTS.flowUnit);

  const [hoseLength, setHoseLength] = useState<number>(DEFAULTS.hoseLength);
  const [hoseLengthUnit, setHoseLengthUnit] = useState<LengthUnit>(
    DEFAULTS.hoseLengthUnit
  );

  const [hoseId, setHoseId] = useState<number>(DEFAULTS.hoseId);
  const [hoseIdUnit, setHoseIdUnit] = useState<DiameterUnit>(
    DEFAULTS.hoseIdUnit
  );

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

    if (nextPressure !== null && Number.isFinite(nextPressure)) {
      setPressure(nextPressure);
    }

    if (nextFlow !== null && Number.isFinite(nextFlow)) {
      setFlow(nextFlow);
    }

    if (nextLength !== null && Number.isFinite(nextLength)) {
      setHoseLength(nextLength);
    }

    if (nextDiameter !== null && Number.isFinite(nextDiameter)) {
      setHoseId(nextDiameter);
    }
  }, []);

  const pressurePsi = useMemo(
    () => toPsi(pressure, pressureUnit),
    [pressure, pressureUnit]
  );

  const flowGpm = useMemo(() => toGpm(flow, flowUnit), [flow, flowUnit]);

  const hoseLengthM = useMemo(
    () => toMetres(hoseLength, hoseLengthUnit),
    [hoseLength, hoseLengthUnit]
  );

  const hoseIdMm = useMemo(
    () => toMm(hoseId, hoseIdUnit),
    [hoseId, hoseIdUnit]
  );

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
    const nextPressureUnit: PressureUnit =
      pressureUnit === "psi" ? "bar" : "psi";
    const nextFlowUnit: FlowUnit = flowUnit === "gpm" ? "lpm" : "gpm";
    const nextLengthUnit: LengthUnit = hoseLengthUnit === "m" ? "ft" : "m";
    const nextDiameterUnit: DiameterUnit = hoseIdUnit === "mm" ? "in" : "mm";

    setPressureUnit(nextPressureUnit);
    setFlowUnit(nextFlowUnit);
    setHoseLengthUnit(nextLengthUnit);
    setHoseIdUnit(nextDiameterUnit);

    setPressure(Number(fromPsi(pressurePsi, nextPressureUnit).toFixed(2)));
    setFlow(Number(fromGpm(flowGpm, nextFlowUnit).toFixed(2)));
    setHoseLength(Number(fromMetres(hoseLengthM, nextLengthUnit).toFixed(2)));
    setHoseId(Number(fromMm(hoseIdMm, nextDiameterUnit).toFixed(3)));
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
          <div className="mx-auto max-w-5xl">
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
                Pressure Washer Hose Pressure Loss Calculator
              </h1>

              <p className="mx-auto mt-4 max-w-3xl text-lg text-slate-600">
                Estimate how much pressure your setup is losing through hose
                length and hose size. Use this calculator to check pressure drop
                before the gun, compare different hose runs, and see why a machine
                can feel different at the trigger than it does at the pump.
              </p>

              <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-slate-500">
                Useful for real setup checks. These results are estimates based on
                the inputs provided and should be used alongside real-world
                testing, gauge checks, manufacturer limits, and operator judgment.
              </p>

              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={swapUnits}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  title="Swap PSI↔BAR, LPM↔GPM, metres↔feet and mm↔in"
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
              <div className="mb-8 text-center">
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Calculator
                </div>
                <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  Enter hose length in metres, pump pressure in PSI and pump flow in LPM first, while still supporting feet, BAR and GPM when needed.
                </p>
              </div>

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
                      <option value="lpm">LPM</option>
                      <option value="gpm">GPM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-center text-base font-semibold text-slate-800">
                    Hose Length
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                    <input
                      className="w-full max-w-3xl rounded-xl border border-slate-200 px-4 py-3 text-lg text-slate-900 outline-none focus:border-slate-400"
                      type="number"
                      inputMode="decimal"
                      value={hoseLength}
                      onChange={(e) => setHoseLength(Number(e.target.value))}
                    />

                    <select
                      className="w-full max-w-[140px] rounded-xl border border-slate-200 px-4 py-3 text-lg text-slate-900 outline-none focus:border-slate-400"
                      value={hoseLengthUnit}
                      onChange={(e) =>
                        setHoseLengthUnit(e.target.value as LengthUnit)
                      }
                    >
                      <option value="m">Metres</option>
                      <option value="ft">Feet</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-center text-base font-semibold text-slate-800">
                    Hose Internal Diameter
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                    <input
                      className="w-full max-w-3xl rounded-xl border border-slate-200 px-4 py-3 text-lg text-slate-900 outline-none focus:border-slate-400"
                      type="number"
                      inputMode="decimal"
                      value={hoseId}
                      onChange={(e) => setHoseId(Number(e.target.value))}
                    />

                    <select
                      className="w-full max-w-[140px] rounded-xl border border-slate-200 px-4 py-3 text-lg text-slate-900 outline-none focus:border-slate-400"
                      value={hoseIdUnit}
                      onChange={(e) =>
                        setHoseIdUnit(e.target.value as DiameterUnit)
                      }
                    >
                      <option value="mm">mm</option>
                      <option value="in">in</option>
                    </select>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {hosePresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setHoseId(preset.value);
                          setHoseIdUnit(preset.unit);
                        }}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-100 px-6 py-10 text-center">
                  <div className="text-sm font-medium text-slate-600">
                    Estimated Pressure Loss
                  </div>

                  <div className="mt-3 text-6xl font-semibold tracking-tight text-slate-900">
                    {fmt(hoseLossPsi, 0)}
                  </div>

                  <div className="mt-2 text-sm text-slate-600">
                    PSI • {fmt(fromPsi(hoseLossPsi, "bar"), 1)} bar
                  </div>

                  <div className="mt-6 text-sm text-slate-600">
                    Pressure at gun{" "}
                    <span className="font-semibold text-slate-800">
                      {fmt(pressureAtGunPsi, 0)} PSI
                    </span>{" "}
                    •{" "}
                    <span className="font-semibold text-slate-800">
                      {fmt(fromPsi(pressureAtGunPsi, "bar"), 1)} bar
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-slate-500">
                    Loss percentage ≈{" "}
                    <span className="font-medium">{fmt(lossPct, 1)}%</span>
                  </div>

                  <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-600">
                    <span className="font-semibold text-slate-900">What this means:</span>{" "}
                    {interpretation}
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

            <section className="mt-10 space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Why hose pressure loss matters
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Even if your pump is rated for a certain pressure and flow,
                  that is not always what you get at the gun. Longer hose runs
                  and smaller hose sizes increase pressure loss, which can affect
                  cleaning performance, nozzle matching, surface cleaner
                  performance, and how a setup feels in real use.
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  If pressure feels weak at the gun, hose loss is one of the
                  first things worth checking. This calculator helps you estimate
                  whether the hose itself is only a small part of the story or a
                  meaningful contributor to the pressure you are losing before
                  the nozzle.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Example uses
                </h2>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      30 metre hose check
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Estimate how much pressure is lost through a typical hose
                      run and whether the loss is small or significant for your
                      setup.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      60 metre hose check
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Compare close-range work to longer hose runs. Extra length
                      often makes pressure loss much more noticeable.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Hose size comparison
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Run different hose IDs through the calculator to see
                      whether a larger hose meaningfully reduces pressure loss at
                      your flow rate.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  FAQ
                </h2>

                <div className="mt-6 space-y-5">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      How much pressure do you lose through pressure washer hose?
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      It depends on hose length, hose size, flow rate, and
                      operating pressure. Longer hose and smaller hose size
                      generally increase pressure loss.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Does a larger hose reduce pressure loss?
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Yes. In many setups, increasing hose size can reduce
                      pressure loss, especially over longer hose runs or higher
                      flow rates.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Why is pressure lower at the gun than at the pump?
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Some pressure is lost through the hose, fittings, reels,
                      and other components in the setup. Hose pressure loss is
                      one of the most common reasons the pressure at the gun is
                      lower than expected.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Should I change hose size or nozzle size?
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      That depends on what you are trying to fix. If the issue is
                      pressure loss through the hose, hose size may matter. If
                      the issue is operating pressure at the gun, nozzle size
                      also plays a major role.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Related tools
                </h2>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Full Setup Calculator
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Need a fuller answer? Check what your setup is actually
                      doing with the Full Setup Calculator.
                    </p>
                    <Link
                      to="/calculator"
                      className="mt-4 inline-block text-sm font-semibold text-slate-900 underline hover:text-slate-700"
                    >
                      Open Full Setup Calculator
                    </Link>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Nozzle Size Calculator
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Trying to match nozzle size as well? Check nozzle selection
                      against pressure and flow.
                    </p>
                    <Link
                      to="/nozzle-size-calculator"
                      className="mt-4 inline-block text-sm font-semibold text-slate-900 underline hover:text-slate-700"
                    >
                      Open Nozzle Size Calculator
                    </Link>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Nozzle Size Chart
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Want a quick reference first? Use the chart for fast nozzle
                      lookup before you move into the calculators.
                    </p>
                    <Link
                      to="/nozzle-size-chart"
                      className="mt-4 inline-block text-sm font-semibold text-slate-900 underline hover:text-slate-700"
                    >
                      Open Nozzle Size Chart
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-10 text-center text-xs text-slate-500">
              Useful estimates for real setup checks. Results do not replace
              testing, gauge checks, manufacturer limits, or operator judgment.
            </div>
          </div>

          <BackToTopButton />
        </div>
      </PressureCalLayout>
    </>
  );
}
