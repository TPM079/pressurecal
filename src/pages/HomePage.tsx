import { Helmet } from "react-helmet-async";
import { useEffect, useState, type FocusEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import BackToTopButton from "../components/BackToTopButton";
import PressureCalLayout from "../components/PressureCalLayout";
import {
  solvePressureCal,
  barFromPsi,
  lpmFromGpm,
  roundTipCodeToFive,
} from "../pressurecal";
import type { Inputs, PressureUnit, FlowUnit, LengthUnit } from "../pressurecal";
import {
  buildLiteRigSearchParams,
  buildFullRigSearchParams,
  parseRigSearchParams,
} from "../lib/rigUrlState";

const homepageTools = [
  {
    href: "/nozzle-size-calculator",
    eyebrow: "Calculator",
    title: "Nozzle Size Calculator",
    description:
      "Find the correct tip size for your pump output, with quick links into your setup workflow.",
    cta: "Open tool →",
    span: "",
  },
  {
    href: "/hose-pressure-loss-calculator",
    eyebrow: "Calculator",
    title: "Hose Pressure Loss Calculator",
    description:
      "Estimate real pressure drop from hose length, internal diameter, and flow rate.",
    cta: "Open tool →",
    span: "",
  },
  {
    href: "/psi-bar-calculator",
    eyebrow: "Unit converter",
    title: "PSI ↔ BAR Calculator",
    description:
      "Convert pressure quickly for pump specs, gauges, compliance references, and stickers.",
    cta: "Open tool →",
    span: "",
  },
  {
    href: "/lpm-gpm-calculator",
    eyebrow: "Unit converter",
    title: "LPM ↔ GPM Calculator",
    description:
      "Convert flow rates instantly for pumps, injectors, nozzles, and hose loss calculations.",
    cta: "Open tool →",
    span: "",
  },
  {
    href: "/nozzle-size-chart",
    eyebrow: "Field reference",
    title: "Nozzle Size Chart",
    description:
      "Use a fast field reference chart with dual units across standard and high-pressure ranges.",
    cta: "Open chart →",
    span: "sm:col-span-2",
  },
];

const homepageHighlights = [
  {
    title: "Real hose loss",
    description:
      "Quantify pressure drop from hose length and internal diameter instead of relying on guesswork.",
  },
  {
    title: "Nozzle calibration",
    description:
      "See whether your selected tip is aligned, restrictive, or oversized for the machine.",
  },
  {
    title: "At-gun performance",
    description:
      "See the pressure and flow that matter where the work actually happens — at the gun.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Enter your machine",
    description: "Start with rated pressure and flow.",
  },
  {
    step: "02",
    title: "See real performance",
    description:
      "Get nozzle size, hose loss, and operating pressure instantly.",
  },
  {
    step: "03",
    title: "Refine your setup",
    description: "Use the full calculator for advanced tuning.",
  },
];




const trustBarItems = [
  "Real system modelling",
  "Australian-first defaults (PSI + LPM)",
  "Built for field use",
];

const featureGrid = [
  "Nozzle size calculator",
  "Hose pressure loss calculator",
  "PSI ↔ BAR conversion",
  "LPM ↔ GPM conversion",
  "Nozzle size chart",
];

const proFeatures = [
  "Save setups",
  "Compare configurations",
  "Share rigs with your team",
];

const defaultInputs: Inputs = {
  pumpPressure: 4000,
  pumpPressureUnit: "psi",
  pumpFlow: 15,
  pumpFlowUnit: "lpm",
  maxPressure: 4000,
  maxPressureUnit: "psi",
  hoseLength: 15,
  hoseLengthUnit: "m",
  hoseId: 9.53,
  hoseIdUnit: "mm",
  engineHp: 13,
  sprayMode: "wand",
  nozzleCount: 2,
  nozzleMode: "tipSize",
  nozzleSizeText: "040",
  orificeMm: 1.2,
  dischargeCoeffCd: 0.62,
  waterDensity: 1000,
  hoseRoughnessMm: 0.0015,
};

function fmt(n: number, dp: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dp);
}

function toPsi(value: number, unit: PressureUnit) {
  return unit === "psi" ? value : value * 14.5037738;
}

function toGpm(value: number, unit: FlowUnit) {
  return unit === "gpm" ? value : value / 3.785411784;
}

function fromPsi(value: number, unit: PressureUnit) {
  return unit === "psi" ? value : value / 14.5037738;
}

function toMeters(value: number, unit: LengthUnit) {
  return unit === "m" ? value : value / 3.28084;
}

function fromMeters(value: number, unit: LengthUnit) {
  return unit === "m" ? value : value * 3.28084;
}

function roundForUnit(value: number, decimals: number) {
  return Number(value.toFixed(decimals));
}

function selectAllOnFocus(e: FocusEvent<HTMLInputElement>) {
  e.target.select();
}

function recommendedNozzleCode(pressurePsi: number, flowGpm: number) {
  if (!(pressurePsi > 0) || !(flowGpm > 0)) return "000";
  const gpmAt4000 = flowGpm * Math.sqrt(4000 / pressurePsi);
  const tip = Math.round(Math.max(0, gpmAt4000) * 10)
    .toString()
    .padStart(3, "0");
  return roundTipCodeToFive(tip);
}

function statusBadge(status: string) {
  if (status === "calibrated") {
    return {
      text: "Calibrated",
      cls: "bg-green-50 text-green-800 border-green-200",
    };
  }
  if (status === "under-calibrated") {
    return {
      text: "Under-calibrated",
      cls: "bg-amber-50 text-amber-900 border-amber-200",
    };
  }
  return {
    text: "Over-calibrated",
    cls: "bg-red-50 text-red-800 border-red-200",
  };
}

export default function HomePage() {
  const [inputs, setInputs] = useState<Inputs>(() => ({
    ...defaultInputs,
    ...parseRigSearchParams(window.location.search),
  }));
  const [copyMessage, setCopyMessage] = useState("");
  const [loadedFromLink, setLoadedFromLink] = useState(false);

  const pressurePsi = toPsi(Number(inputs.pumpPressure || 0), inputs.pumpPressureUnit);
  const flowGpm = toGpm(Number(inputs.pumpFlow || 0), inputs.pumpFlowUnit);
  const flowLpm = lpmFromGpm(flowGpm);
  const recommendedTip = recommendedNozzleCode(pressurePsi, flowGpm);

  const solved = solvePressureCal({
    ...inputs,
    pumpPressure: Number(inputs.pumpPressure || 0),
    pumpFlow: Number(inputs.pumpFlow || 0),
    maxPressure: Number(inputs.maxPressure || 0),
    hoseLength: Number(inputs.hoseLength || 0),
    hoseId: Number(inputs.hoseId || 0),
    engineHp: Number(inputs.engineHp || 0),
    nozzleSizeText: recommendedTip,
  });

  useEffect(() => {
    const parsed = parseRigSearchParams(window.location.search);
    if (Object.keys(parsed).length > 0) {
      setLoadedFromLink(true);
      const timer = window.setTimeout(() => setLoadedFromLink(false), 2600);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const params = buildLiteRigSearchParams({
      ...inputs,
      nozzleSizeText: recommendedTip,
    });
    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }, [inputs, recommendedTip]);

  const gunBar = barFromPsi(solved.gunPressurePsi);
  const pumpBar = barFromPsi(solved.pumpPressurePsi);
  const reqPumpBar = barFromPsi(solved.requiredPumpPsi);
  const gunLpm = lpmFromGpm(solved.gunFlowGpm);
  const lossBar = barFromPsi(solved.hoseLossPsi);
  const badge = statusBadge(solved.status);
  const systemBadge = solved.isPressureLimited
    ? { text: "Bypass active", cls: "bg-red-50 text-red-800 border-red-200" }
    : badge;

  const pressureVariancePct =
    pressurePsi > 0 ? ((solved.gunPressurePsi - pressurePsi) / pressurePsi) * 100 : 0;
  const lossPctAbs = Math.abs(pressureVariancePct);

  const efficiencyTier =
    lossPctAbs < 5
      ? "Optimal"
      : lossPctAbs < 10
      ? "Moderate loss"
      : lossPctAbs < 20
        ? "High loss"
        : "Severe loss";

  const efficiencyNote =
    lossPctAbs < 5
      ? "Very close to rated performance."
      : lossPctAbs < 10
        ? "Some pressure drop—typically acceptable."
        : lossPctAbs < 20
          ? "Noticeable drop—consider hose length or diameter."
          : "Large drop—hose length or ID is significantly reducing performance.";

  const ratedBar = barFromPsi(pressurePsi);
  const pqRated = ratedBar * flowLpm;
  const pqAtGun = gunBar * gunLpm;
  const pqClassRated = pqRated >= 5600 ? "Class B" : "Class A";
  const pqClassGun = pqAtGun >= 5600 ? "Class B" : "Class A";

  const fullRigHref = `/calculator?${buildFullRigSearchParams({
    ...inputs,
    nozzleSizeText: recommendedTip,
  }).toString()}`;

  const liveSetupItems = [
    {
      label: "Pressure",
      value: `${fmt(Number(inputs.pumpPressure || 0), 0)} ${
        inputs.pumpPressureUnit === "psi" ? "PSI" : "BAR"
      }`,
    },
    {
      label: "Flow",
      value: `${fmt(flowLpm, 1)} LPM (${fmt(flowGpm, 2)} GPM)`,
    },
    {
      label: "Hose length",
      value: `${fmt(Number(inputs.hoseLength || 0), 0)} ${inputs.hoseLengthUnit}`,
    },
    {
      label: "Nozzle",
      value: recommendedTip,
    },
  ];

  const performanceCards = [
    {
      label: "At-gun pressure",
      primary:
        inputs.pumpPressureUnit === "psi"
          ? `${fmt(solved.gunPressurePsi, 0)} PSI`
          : `${fmt(gunBar, 1)} BAR`,
      secondary:
        inputs.pumpPressureUnit === "psi"
          ? `${fmt(gunBar, 1)} BAR`
          : `${fmt(solved.gunPressurePsi, 0)} PSI`,
    },
    {
      label: "Hose loss",
      primary:
        inputs.pumpPressureUnit === "psi"
          ? `${fmt(solved.hoseLossPsi, 0)} PSI`
          : `${fmt(lossBar, 1)} BAR`,
      secondary: efficiencyTier,
    },
    {
      label: "Gun flow",
      primary:
        inputs.pumpFlowUnit === "lpm"
          ? `${fmt(gunLpm, 1)} LPM`
          : `${fmt(solved.gunFlowGpm, 2)} GPM`,
      secondary:
        inputs.pumpFlowUnit === "lpm"
          ? `${fmt(solved.gunFlowGpm, 2)} GPM`
          : `${fmt(gunLpm, 1)} LPM`,
    },
    {
      label: "Nozzle status",
      primary:
        solved.status === "calibrated"
          ? "Calibrated"
          : solved.status === "under-calibrated"
            ? "Under-calibrated"
            : "Over-calibrated",
      secondary: recommendedTip,
    },
  ];

  async function copySetupLink() {
    const params = buildLiteRigSearchParams({
      ...inputs,
      nozzleSizeText: recommendedTip,
    });
    const qs = params.toString();
    const url = `${window.location.origin}/${qs ? `?${qs}` : ""}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage("Setup link copied");
      window.setTimeout(() => setCopyMessage(""), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <PressureCalLayout>
      <Helmet>
        <title>Pressure Washer Calculator (PSI, LPM, Nozzle Size) | PressureCal</title>
        <meta
          name="description"
          content="Model your pressure washer setup from pump to gun. Calculate nozzle size, hose pressure loss, operating pressure, flow, and bypass behaviour in one place."
        />
      </Helmet>

      <section className="-mx-4 -mt-8 overflow-hidden border-b border-slate-200 bg-white px-4 sm:-mt-10">
        <div className="mx-auto grid max-w-6xl items-center gap-10 py-14 sm:py-16 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">
              Built for real operators
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Model your pressure washer setup — from pump to gun.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Nozzle size, hose loss, and at-gun pressure — calculated together so you
              can see how your machine will perform in the real world.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={fullRigHref}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Open full rig calculator
              </Link>

              <Link
                to="/nozzle-size-chart"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                View nozzle chart
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Built for pressure washing professionals and serious operators.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {homepageHighlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:pl-4">
            <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                    Live setup snapshot
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold">Your current setup</h2>
                  <div className="mt-3 inline-flex items-center rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1 text-xs font-semibold text-green-200">
                    Live preview
                  </div>

                  {loadedFromLink ? (
                    <div className="mt-3 inline-flex items-center rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-100">
                      Loaded from shared link
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={copySetupLink}
                  className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                >
                  Copy setup link
                </button>
              </div>

              {copyMessage ? (
                <p className="mt-3 text-sm text-green-300">{copyMessage}</p>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {liveSetupItems.map((item) => (
                  <motion.div
                    key={`${item.label}-${item.value}`}
                    initial={{ opacity: 0.75, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`rounded-2xl border p-5 ${
                      item.label === "Nozzle"
                        ? "border-blue-300/30 bg-blue-400/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-300">
                      {item.label}
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-300">
                  Current operating snapshot
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                      At-gun pressure
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {fmt(solved.gunPressurePsi, 0)} PSI
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                      Hose loss
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {fmt(solved.hoseLossPsi, 0)} PSI
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-5 sm:grid-cols-3">
          {trustBarItems.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-medium text-slate-100"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section id="calculator" className="-mx-4 border-b border-slate-200 bg-slate-50/70 px-4">
        <div className="mx-auto max-w-6xl py-10 lg:py-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Start simple, then go deeper
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Use quick setup to see nozzle size, hose loss, and real output
              fast. Open the full rig calculator when you need deeper control.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                    Quick setup
                  </h3>
                </div>

                <Link
                  to={fullRigHref}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                >
                  Open advanced setup
                </Link>
              </div>

              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Enter your rated pressure, flow, and hose length. PressureCal will
                estimate the recommended nozzle and show how the setup performs.
              </p>

              <div className="mt-8 grid gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Pump pressure ({inputs.pumpPressureUnit.toUpperCase()})
                  </label>
                  <div className="mt-2 flex gap-3">
                    <input
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
                      type="number"
                      inputMode="decimal"
                      value={inputs.pumpPressure}
                      onFocus={selectAllOnFocus}
                      onChange={(e) =>
                        setInputs((s) => ({
                          ...s,
                          pumpPressure: e.target.value === "" ? "" : Number(e.target.value),
                          maxPressure: e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                    />
                    <select
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
                      value={inputs.pumpPressureUnit}
                      onChange={(e) =>
                        setInputs((s) => {
                          const nextUnit = e.target.value as PressureUnit;
                          if (s.pumpPressureUnit === nextUnit) return s;

                          const nextPressurePsi = toPsi(
                            Number(s.pumpPressure || 0),
                            s.pumpPressureUnit
                          );

                          return {
                            ...s,
                            pumpPressure: roundForUnit(
                              fromPsi(nextPressurePsi, nextUnit),
                              nextUnit === "psi" ? 0 : 1
                            ),
                            pumpPressureUnit: nextUnit,
                            maxPressure: roundForUnit(
                              fromPsi(nextPressurePsi, nextUnit),
                              nextUnit === "psi" ? 0 : 1
                            ),
                            maxPressureUnit: nextUnit,
                          };
                        })
                      }
                    >
                      <option value="psi">psi</option>
                      <option value="bar">bar</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Pump flow ({inputs.pumpFlowUnit === "lpm" ? "LPM" : "GPM"})
                  </label>
                  <div className="mt-2 flex gap-3">
                    <input
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
                      type="number"
                      inputMode="decimal"
                      value={inputs.pumpFlow}
                      onFocus={selectAllOnFocus}
                      onChange={(e) =>
                        setInputs((s) => ({
                          ...s,
                          pumpFlow: e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                    />
                    <select
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
                      value={inputs.pumpFlowUnit}
                      onChange={(e) =>
                        setInputs((s) => {
                          const nextUnit = e.target.value as FlowUnit;
                          if (s.pumpFlowUnit === nextUnit) return s;
                          const currentFlowGpm = toGpm(
                            Number(s.pumpFlow || 0),
                            s.pumpFlowUnit
                          );

                          return {
                            ...s,
                            pumpFlow: roundForUnit(
                              nextUnit === "gpm"
                                ? currentFlowGpm
                                : lpmFromGpm(currentFlowGpm),
                              nextUnit === "gpm" ? 2 : 1
                            ),
                            pumpFlowUnit: nextUnit,
                          };
                        })
                      }
                    >
                      <option value="lpm">L/min</option>
                      <option value="gpm">GPM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Hose length ({inputs.hoseLengthUnit})
                  </label>
                  <div className="mt-2 flex gap-3">
                    <input
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
                      type="number"
                      inputMode="decimal"
                      value={inputs.hoseLength}
                      onFocus={selectAllOnFocus}
                      onChange={(e) =>
                        setInputs((s) => ({
                          ...s,
                          hoseLength: e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                    />
                    <select
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
                      value={inputs.hoseLengthUnit}
                      onChange={(e) =>
                        setInputs((s) => {
                          const nextUnit = e.target.value as LengthUnit;
                          if (s.hoseLengthUnit === nextUnit) return s;
                          const hoseLengthMeters = toMeters(
                            Number(s.hoseLength || 0),
                            s.hoseLengthUnit
                          );

                          return {
                            ...s,
                            hoseLength: roundForUnit(
                              fromMeters(hoseLengthMeters, nextUnit),
                              1
                            ),
                            hoseLengthUnit: nextUnit,
                          };
                        })
                      }
                    >
                      <option value="m">m</option>
                      <option value="ft">ft</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm font-medium text-slate-600">Recommended nozzle size</p>
                <p className="mt-3 text-6xl font-semibold tracking-tight text-slate-950">
                  {recommendedTip}
                </p>
                <p className="mt-3 text-sm text-slate-600">
                  Rated flow:{" "}
                  <span className="font-semibold text-slate-900">{fmt(flowLpm, 1)} LPM</span>
                  {" · "}
                  Estimated hose loss:{" "}
                  <span className="font-semibold text-slate-900">
                    {fmt(solved.hoseLossPsi, 0)} PSI
                  </span>
                </p>

                <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={copySetupLink}
                    className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Copy setup link
                  </button>

                  <Link
                    to={fullRigHref}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                  >
                    Continue to advanced setup
                  </Link>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${systemBadge.cls}`}
                  >
                    {systemBadge.text}
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-semibold text-slate-950">
                  Calculated performance
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This is where PressureCal starts earning trust: one view of nozzle calibration,
                  hose loss, and real output at the gun.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {performanceCards.map((card) => (
                    <div
                      key={card.label}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                        {card.label}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">
                        {card.primary}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{card.secondary}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Efficiency note</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{efficiencyNote}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                  
                </p>
                <h3 className="mt-3 text-xl font-semibold text-slate-950">
                  Class and operating snapshot
                </h3>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Rated P × Q
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {fmt(pqRated, 0)} ({pqClassRated})
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {fmt(ratedBar, 1)} BAR × {fmt(flowLpm, 1)} LPM
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      At-gun P × Q
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {fmt(pqAtGun, 0)} ({pqClassGun})
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {fmt(gunBar, 1)} BAR × {fmt(gunLpm, 1)} LPM
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Selected nozzle
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {recommendedTip}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Calibrated target for current pressure and flow
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Required pump pressure
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {inputs.pumpPressureUnit === "psi"
                        ? `${fmt(solved.requiredPumpPsi, 0)} PSI`
                        : `${fmt(reqPumpBar, 1)} BAR`}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Pump pressure shown:{" "}
                      {inputs.pumpPressureUnit === "psi"
                        ? `${fmt(solved.pumpPressurePsi, 0)} PSI`
                        : `${fmt(pumpBar, 1)} BAR`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Most tools don’t show what actually matters.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Pressure washer calculators usually stop at simple conversions.
            </p>
            <div className="mt-6 space-y-2 text-base text-slate-700">
              <p>PSI to BAR.</p>
              <p>GPM to LPM.</p>
            </div>
            <p className="mt-6 text-base leading-7 text-slate-600">
              But they don’t answer the real questions:
            </p>
            <ul className="mt-4 space-y-3 text-base leading-7 text-slate-700">
              <li>• What pressure am I actually getting at the gun?</li>
              <li>• Is my nozzle correctly sized?</li>
              <li>• How much is my hose reducing performance?</li>
            </ul>
            <p className="mt-6 text-lg font-semibold text-slate-950">
              Because your system isn’t just numbers — it’s connected.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              PressureCal models the full system.
            </h2>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
              <div className="grid gap-3 text-center sm:grid-cols-4">
                {["Pump", "Hose", "Nozzle", "Gun"].map((item, index) => (
                  <div key={item} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-950">{item}</p>
                    {index < 3 ? (
                      <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-slate-400 sm:block">
                        →
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 space-y-4 text-base leading-7 text-slate-600">
              <p>PressureCal calculates how each part of your setup affects the others:</p>
              <ul className="space-y-3 text-slate-700">
                <li>• Pump sets flow</li>
                <li>• Nozzle determines pressure</li>
                <li>• Hose introduces loss</li>
                <li>• The result shows real-world performance</li>
              </ul>
            </div>

            <p className="mt-6 text-lg font-semibold text-slate-950">
              See what your machine is actually doing — not just what it’s rated for.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Not another calculator.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Most tools convert numbers. PressureCal models how a pressure washer actually works.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Real nozzle sizing logic",
              "Hose friction using engineering formulas",
              "At-gun performance (not just pump specs)",
              "System behaviour when limits are reached",
            ].map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
              >
                <p className="text-base font-semibold text-slate-950">{item}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-lg font-semibold text-slate-950">
            Built for real-world use — not spreadsheets.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50/70">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              A better way to dial in your setup
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {workflowSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Everything you need to model your system
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {featureGrid.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-900 shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {homepageTools.map((tool) => (
              <Link
                key={tool.href}
                to={tool.href}
                className={`group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${tool.span}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  {tool.eyebrow}
                </p>
                <h3 className="mt-3 text-xl font-semibold text-slate-950 group-hover:text-blue-700">
                  {tool.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{tool.description}</p>
                <p className="mt-5 text-sm font-semibold text-slate-950">{tool.cta}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="border-b border-slate-200 bg-slate-50/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              Built for real operators
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Built from real-world pressure washing experience
            </h2>
            <div className="mt-5 space-y-4 text-base leading-7 text-slate-600">
              <p>
                PressureCal started from real-world frustration — trying to accurately size
                nozzles and understand pressure loss in actual systems.
              </p>
              <p>
                Most tools only convert units. None model how a pressure washer actually behaves.
              </p>
              <p>
                So PressureCal was built to simulate the full system — giving operators real
                answers, not guesses.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
              
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Free to calculate. Built for professionals.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Full system modelling is free. PressureCal Pro will expand how you use it:
            </p>
            <ul className="mt-5 space-y-3 text-base leading-7 text-slate-100">
              {proFeatures.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
              
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Start modelling your setup
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/#calculator"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Start your setup
            </Link>
            <Link
              to={fullRigHref}
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Open full rig calculator
            </Link>
          </div>
        </div>
      </section>

      <BackToTopButton />
    </PressureCalLayout>
  );
}
