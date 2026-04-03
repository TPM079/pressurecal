import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState, type FocusEvent } from "react";
import { Link } from "react-router-dom";
import BackToTopButton from "../components/BackToTopButton";
import PressureCalLayout from "../components/PressureCalLayout";
import {
  barFromPsi,
  lpmFromGpm,
  roundTipCodeToFive,
  solvePressureCal,
} from "../pressurecal";
import type { FlowUnit, Inputs, LengthUnit, PressureUnit } from "../pressurecal";
import {
  buildFullRigSearchParams,
  buildLiteRigSearchParams,
  parseRigSearchParams,
} from "../lib/rigUrlState";
import { trackEvent } from "../lib/analytics";

type ToolCard = {
  href: string;
  title: string;
  description: string;
  cta: string;
  span?: string;
};

const trustBarItems = [
  "Real-world setup modelling",
  "Australian-first defaults (PSI + LPM)",
  "Built for working operators",
];

const toolCards: ToolCard[] = [
  {
    href: "/nozzle-size-calculator",
    title: "Nozzle Size Calculator",
    description:
      "Find the right tip size for your pump output before you buy, swap, or refine the wider setup.",
    cta: "Open tool →",
  },
  {
    href: "/hose-pressure-loss-calculator",
    title: "Hose Pressure Loss Calculator",
    description:
      "Estimate real pressure drop from hose length, hose ID, and flow instead of relying on rough rules of thumb.",
    cta: "Open tool →",
  },
  {
    href: "/psi-bar-calculator",
    title: "PSI ↔ BAR Calculator",
    description:
      "Convert pressure quickly for machine specs, gauges, labels, and compliance references.",
    cta: "Open tool →",
  },
  {
    href: "/lpm-gpm-calculator",
    title: "LPM ↔ GPM Calculator",
    description:
      "Convert flow rates instantly for pumps, injectors, nozzles, and hose loss checks.",
    cta: "Open tool →",
  },
  {
    href: "/nozzle-size-chart",
    title: "Nozzle Size Chart",
    description:
      "Use a quick dual-unit field chart across standard and high-pressure ranges.",
    cta: "Open chart →",
    span: "sm:col-span-2",
  },
];

const featureBadges = [
  "Full setup modelling",
  "Nozzle sizing",
  "Hose pressure loss",
  "PSI ↔ BAR conversion",
  "LPM ↔ GPM conversion",
  "Nozzle size chart",
];

const proFeatures = [
  "Save proven setups",
  "Compare saved setups",
  "Build your setup library",
  "Export and share saved setups",
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

function fmt(value: number, decimals: number) {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(decimals);
}

function roundForUnit(value: number, decimals: number) {
  return Number(value.toFixed(decimals));
}

function toPsi(value: number, unit: PressureUnit) {
  return unit === "psi" ? value : value * 14.5037738;
}

function fromPsi(value: number, unit: PressureUnit) {
  return unit === "psi" ? value : value / 14.5037738;
}

function toGpm(value: number, unit: FlowUnit) {
  return unit === "gpm" ? value : value / 3.785411784;
}

function toMeters(value: number, unit: LengthUnit) {
  return unit === "m" ? value : value / 3.28084;
}

function fromMeters(value: number, unit: LengthUnit) {
  return unit === "m" ? value : value * 3.28084;
}

function selectAllOnFocus(event: FocusEvent<HTMLInputElement>) {
  event.target.select();
}

function recommendedNozzleCode(pressurePsi: number, flowGpm: number) {
  if (!(pressurePsi > 0) || !(flowGpm > 0)) return "000";

  const gpmAt4000 = flowGpm * Math.sqrt(4000 / pressurePsi);
  const tip = Math.round(Math.max(0, gpmAt4000) * 10)
    .toString()
    .padStart(3, "0");

  return roundTipCodeToFive(tip);
}

function getStatusBadge(status: string) {
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

  const solved = useMemo(
    () =>
      solvePressureCal({
        ...inputs,
        pumpPressure: Number(inputs.pumpPressure || 0),
        pumpFlow: Number(inputs.pumpFlow || 0),
        maxPressure: Number(inputs.maxPressure || 0),
        hoseLength: Number(inputs.hoseLength || 0),
        hoseId: Number(inputs.hoseId || 0),
        engineHp: Number(inputs.engineHp || 0),
        nozzleSizeText: recommendedTip,
      }),
    [inputs, recommendedTip]
  );

  useEffect(() => {
    trackEvent("homepage_viewed", { page: "home" });
  }, []);

  useEffect(() => {
    if (window.location.hash === "#calculator") {
      trackEvent("calculator_section_viewed", { page: "home" });
    }
  }, []);

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

    const queryString = params.toString();
    const nextUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    window.history.replaceState({}, "", nextUrl);
  }, [inputs, recommendedTip]);

  const gunBar = barFromPsi(solved.gunPressurePsi);
  const pumpBar = barFromPsi(solved.pumpPressurePsi);
  const reqPumpBar = barFromPsi(solved.requiredPumpPsi);
  const gunLpm = lpmFromGpm(solved.gunFlowGpm);
  const lossBar = barFromPsi(solved.hoseLossPsi);
  const statusBadge = getStatusBadge(solved.status);
  const systemBadge = solved.isPressureLimited
    ? { text: "Bypass active", cls: "bg-red-50 text-red-800 border-red-200" }
    : statusBadge;

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
        ? "Some pressure drop — typically acceptable."
        : lossPctAbs < 20
          ? "Noticeable drop — consider hose length or diameter."
          : "Large drop — hose length or ID is significantly reducing performance.";

  const ratedBar = barFromPsi(pressurePsi);
  const pqRated = ratedBar * flowLpm;
  const pqAtGun = gunBar * gunLpm;
  const pqClassRated = pqRated >= 5600 ? "Class B" : "Class A";
  const pqClassGun = pqAtGun >= 5600 ? "Class B" : "Class A";

  const fullRigHref = useMemo(
    () =>
      `/calculator?${buildFullRigSearchParams({
        ...inputs,
        nozzleSizeText: recommendedTip,
      }).toString()}`,
    [inputs, recommendedTip]
  );

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
      primary: systemBadge.text,
      secondary: `Recommended tip ${recommendedTip}`,
    },
  ];

  function scrollToCalculator() {
    const el = document.getElementById("calculator");
    if (!el) return;

    trackEvent("calculator_section_viewed", {
      page: "home",
      location: "hero_button",
    });

    window.history.replaceState({}, "", `${window.location.pathname}#calculator`);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function copySetupLink() {
    trackEvent("copy_setup_link_clicked", {
      page: "home",
      recommended_tip: recommendedTip,
    });

    const params = buildLiteRigSearchParams({
      ...inputs,
      nozzleSizeText: recommendedTip,
    });

    const queryString = params.toString();
    const url = `${window.location.origin}${window.location.pathname}${
      queryString ? `?${queryString}` : ""
    }`;

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
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Stop guessing your pressure washer setup.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Model nozzle size, hose loss, and real at-gun pressure in one place so you
              can make better setup decisions with less guesswork.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={scrollToCalculator}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Start your setup
              </button>

              <Link
                to={fullRigHref}
                onClick={() =>
                  trackEvent("open_full_setup_calculator_clicked", {
                    page: "home",
                    location: "hero",
                  })
                }
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                Open full setup calculator
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Built for working pressure washing operators.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Real hose loss",
                  description:
                    "Quantify pressure drop from hose length and hose ID instead of guessing what the line is costing you.",
                },
                {
                  title: "Nozzle match",
                  description:
                    "See whether your tip is the right size for the machine — or costing you performance.",
                },
                {
                  title: "At-gun performance",
                  description:
                    "See the pressure and flow that matter where the work happens — at the gun.",
                },
              ].map((item) => (
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

          <div className="hidden lg:block lg:pl-4">
            <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">Your current setup</h2>
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

              {copyMessage ? <p className="mt-3 text-sm text-green-300">{copyMessage}</p> : null}

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
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Start simple. Get real setup answers fast.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Enter your pressure, flow, and hose length to instantly see your recommended
              nozzle, estimated hose loss, and real at-gun performance. Open the full
              setup calculator when you want deeper control.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-950">Core inputs</h3>
                </div>

                <Link
                  to={fullRigHref}
                  onClick={() =>
                    trackEvent("open_full_setup_calculator_clicked", {
                      page: "home",
                      location: "calculator_card",
                    })
                  }
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                >
                  More control
                </Link>
              </div>

              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Start with rated pressure, flow, and hose length. PressureCal estimates
                the nozzle and shows how the setup is likely to perform in the real world.
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
                      onChange={(event) =>
                        setInputs((current) => ({
                          ...current,
                          pumpPressure:
                            event.target.value === "" ? "" : Number(event.target.value),
                          maxPressure:
                            event.target.value === "" ? "" : Number(event.target.value),
                        }))
                      }
                    />
                    <select
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
                      value={inputs.pumpPressureUnit}
                      onChange={(event) =>
                        setInputs((current) => {
                          const nextUnit = event.target.value as PressureUnit;
                          if (current.pumpPressureUnit === nextUnit) return current;

                          const nextPressurePsi = toPsi(
                            Number(current.pumpPressure || 0),
                            current.pumpPressureUnit
                          );

                          return {
                            ...current,
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
                      onChange={(event) =>
                        setInputs((current) => ({
                          ...current,
                          pumpFlow:
                            event.target.value === "" ? "" : Number(event.target.value),
                        }))
                      }
                    />
                    <select
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
                      value={inputs.pumpFlowUnit}
                      onChange={(event) =>
                        setInputs((current) => {
                          const nextUnit = event.target.value as FlowUnit;
                          if (current.pumpFlowUnit === nextUnit) return current;

                          const currentFlowGpm = toGpm(
                            Number(current.pumpFlow || 0),
                            current.pumpFlowUnit
                          );

                          return {
                            ...current,
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
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Assumes 9.53 mm (3/8") hose ID
                  </p>
                  <div className="mt-2 flex gap-3">
                    <input
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
                      type="number"
                      inputMode="decimal"
                      value={inputs.hoseLength}
                      onFocus={selectAllOnFocus}
                      onChange={(event) =>
                        setInputs((current) => ({
                          ...current,
                          hoseLength:
                            event.target.value === "" ? "" : Number(event.target.value),
                        }))
                      }
                    />
                    <select
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
                      value={inputs.hoseLengthUnit}
                      onChange={(event) =>
                        setInputs((current) => {
                          const nextUnit = event.target.value as LengthUnit;
                          if (current.hoseLengthUnit === nextUnit) return current;

                          const hoseLengthMeters = toMeters(
                            Number(current.hoseLength || 0),
                            current.hoseLengthUnit
                          );

                          return {
                            ...current,
                            hoseLength: roundForUnit(fromMeters(hoseLengthMeters, nextUnit), 1),
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
                  Rated flow <span className="font-semibold text-slate-900">{fmt(flowLpm, 1)} LPM</span>
                  {" · "}
                  Estimated hose loss <span className="font-semibold text-slate-900">{fmt(solved.hoseLossPsi, 0)} PSI</span>
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
                    onClick={() =>
                      trackEvent("open_full_setup_calculator_clicked", {
                        page: "home",
                        location: "calculator_result",
                      })
                    }
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                  >
                    Open full setup calculator
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
                  Setup performance
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  See nozzle match, hose loss, and real at-gun performance in one place.
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
                  <p className="text-sm font-semibold text-slate-900">Pressure loss guide</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{efficiencyNote}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mt-3 text-xl font-semibold text-slate-950">
                  System details
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
                      Recommended nozzle
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{recommendedTip}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Based on the current pressure and flow
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Pump pressure needed
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {inputs.pumpPressureUnit === "psi"
                        ? `${fmt(solved.requiredPumpPsi, 0)} PSI`
                        : `${fmt(reqPumpBar, 1)} BAR`}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Pump pressure shown {inputs.pumpPressureUnit === "psi"
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

      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Save the setups you trust
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
                The core calculator is free and useful on its own. PressureCal Pro helps
                regular operators save proven setups, compare changes, and keep repeat-job
                configurations organised.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/pricing"
                  onClick={() =>
                    trackEvent("pro_bridge_clicked", {
                      page: "home",
                      location: "pro_bridge",
                    })
                  }
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  See PressureCal Pro
                </Link>
                <Link
                  to={fullRigHref}
                  onClick={() =>
                    trackEvent("open_full_setup_calculator_clicked", {
                      page: "home",
                      location: "pro_bridge",
                    })
                  }
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Open full setup calculator
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {proFeatures.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <p className="text-base font-semibold text-white">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Most tools stop at charts. Real setup decisions do not.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Pressure washer calculators often stop at simple conversions. They can
              swap PSI for BAR or GPM for LPM, but they do not tell you how the full
              setup will actually perform.
            </p>
            <ul className="mt-6 space-y-3 text-base leading-7 text-slate-700">
              <li>• What pressure am I actually getting at the gun?</li>
              <li>• Is my nozzle correctly matched?</li>
              <li>• How much is my hose reducing performance?</li>
              <li>• What changes before I buy a different nozzle, hose, or accessory?</li>
            </ul>
            <p className="mt-6 text-lg font-semibold text-slate-950">
              Because your setup is not just numbers — it is connected.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
              PressureCal models the whole setup.
            </h2>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
              <div className="grid gap-3 text-center sm:grid-cols-4">
                {[
                  "Pump",
                  "Hose",
                  "Nozzle",
                  "Gun",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
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
              <p>PressureCal shows how each part of the setup affects the others:</p>
              <ul className="space-y-3 text-slate-700">
                <li>• Pump sets available flow</li>
                <li>• Nozzle determines operating pressure</li>
                <li>• Hose introduces real pressure loss</li>
                <li>• The result shows likely performance where the work happens</li>
              </ul>
            </div>

            <p className="mt-6 text-lg font-semibold text-slate-950">
              See what your machine is actually doing — not just what it is rated for.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              More tools for real setup decisions
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Start with the quick calculator here, then use these tools when you want
              to check one part of the setup in more detail before you buy, swap, or
              troubleshoot parts.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            {featureBadges.map((item) => (
              <div
                key={item}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {toolCards.map((tool) => (
              <Link
                key={tool.href}
                to={tool.href}
                className={`group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${tool.span ?? ""}`}
              >
                <h3 className="text-xl font-semibold text-slate-950 group-hover:text-blue-700">
                  {tool.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{tool.description}</p>
                <p className="mt-5 text-sm font-semibold text-slate-950">{tool.cta}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Make better setup decisions with confidence
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Use PressureCal free to check your setup before you buy, swap, or
              troubleshoot parts.
            </p>
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
              Open full setup calculator
            </Link>
          </div>
        </div>
      </section>

      <BackToTopButton />
    </PressureCalLayout>
  );
}
