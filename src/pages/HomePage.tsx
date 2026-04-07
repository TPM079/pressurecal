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
};

const trustBarItems = [
  "Real-world setup modelling",
  "Australian-first defaults (PSI + LPM)",
  "Built for real operators",
];

const toolCards: ToolCard[] = [
  {
    href: "/calculator",
    title: "Full Rig Calculator",
    description:
      "Model the whole setup in one place, including nozzle match, hose loss, operating pressure, flow, and power requirement.",
    cta: "Open full calculator →",
  },
  {
    href: "/nozzle-size-calculator",
    title: "Nozzle Size Calculator",
    description:
      "Estimate the right tip size from pressure and flow before you buy, swap, or troubleshoot.",
    cta: "Open tool →",
  },
  {
    href: "/hose-pressure-loss-calculator",
    title: "Hose Pressure Loss Calculator",
    description:
      "Estimate pressure drop from hose length, hose ID, and flow instead of relying on rough rules of thumb.",
    cta: "Open tool →",
  },
  {
    href: "/nozzle-size-chart",
    title: "Nozzle Size Chart",
    description:
      "Use a quick field reference for common pressure and flow combinations in PSI, BAR, LPM, and GPM.",
    cta: "Open chart →",
  },
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
        <link rel="canonical" href="https://www.pressurecal.com/" />
        <meta
          property="og:title"
          content="Pressure Washer Calculator (PSI, LPM, Nozzle Size) | PressureCal"
        />
        <meta
          property="og:description"
          content="Model your pressure washer setup from pump to gun. Calculate nozzle size, hose pressure loss, operating pressure, flow, and bypass behaviour in one place."
        />
        <meta property="og:url" content="https://www.pressurecal.com/" />
        <meta property="og:type" content="website" />
        <meta
          name="twitter:title"
          content="Pressure Washer Calculator (PSI, LPM, Nozzle Size) | PressureCal"
        />
        <meta
          name="twitter:description"
          content="Model your pressure washer setup from pump to gun. Calculate nozzle size, hose pressure loss, operating pressure, flow, and bypass behaviour in one place."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "PressureCal",
            url: "https://www.pressurecal.com/",
            applicationCategory: "EngineeringApplication",
            operatingSystem: "Web",
            description:
              "PressureCal is a professional pressure washer calculator for nozzle sizing, hose pressure loss, at-gun pressure, and unloader bypass behaviour.",
          })}
        </script>
      </Helmet>

      <section className="-mx-4 -mt-8 overflow-hidden border-b border-slate-200 bg-white px-4 sm:-mt-10">
        <div className="mx-auto grid max-w-6xl items-center gap-10 py-14 sm:py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
              Built for real operators
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Pressure washer setup modelling for real operators
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Model your machine from pump to gun. Estimate nozzle size, hose pressure
              loss, at-gun pressure, flow, and bypass behaviour in one place.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={scrollToCalculator}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Start Modelling
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

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Nozzle match",
                  description:
                    "See whether your tip is the right size for the machine — or costing you performance.",
                },
                {
                  title: "Real hose loss",
                  description:
                    "Estimate what hose length and hose ID are taking away before the water reaches the gun.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
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

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-300">
                  Why it matters
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Small changes in hose, nozzle, and setup can shift real working
                  performance. PressureCal helps you model the full picture before you
                  make changes in the field.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-3 px-4 py-4 sm:grid-cols-3">
          {trustBarItems.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Stop guessing what your setup is really doing
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Machine specs only tell part of the story. Hose length, hose ID, nozzle size,
              and system setup all affect real working performance. PressureCal helps you
              estimate how your setup behaves from pump to gun, so you can make better
              decisions with more confidence.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {toolCards.map((item) => (
              <Link
                key={item.title}
                to={item.href === "/calculator" ? fullRigHref : item.href}
                onClick={() =>
                  trackEvent("homepage_tool_clicked", {
                    page: "home",
                    tool: item.title,
                  })
                }
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md"
              >
                <h3 className="text-xl font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                <p className="mt-5 text-sm font-semibold text-slate-950">{item.cta}</p>
              </Link>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              More quick converters
            </p>

            <div className="mt-2 flex flex-col gap-2 text-sm">
              <Link
                to="/psi-bar-calculator"
                className="font-medium text-slate-700 hover:text-slate-950"
              >
                PSI ↔ BAR Converter
              </Link>

              <Link
                to="/lpm-gpm-calculator"
                className="font-medium text-slate-700 hover:text-slate-950"
              >
                LPM ↔ GPM Converter
              </Link>
            </div>
          </div>
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
                  <h3 className="text-2xl font-semibold text-slate-950">Core inputs</h3>
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
                    Assumes 9.53 mm (3/8&quot;) hose ID
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
                  Rated flow{" "}
                  <span className="font-semibold text-slate-900">{fmt(flowLpm, 1)} LPM</span>
                  {" · "}
                  Estimated hose loss{" "}
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
                <h3 className="text-xl font-semibold text-slate-950">System details</h3>

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
                      Pump pressure shown{" "}
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

      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Save your setups and build a better workflow
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
                PressureCal Pro helps regular operators save proven setups, compare changes,
                and keep repeat-job configurations organised.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/pricing"
                  onClick={() =>
                    trackEvent("pro_bridge_clicked", {
                      page: "home",
                      location: "pro_section",
                    })
                  }
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Explore PressureCal Pro
                </Link>

                <Link
                  to="/saved-setups"
                  onClick={() =>
                    trackEvent("saved_setups_page_clicked", {
                      page: "home",
                      location: "pro_section",
                    })
                  }
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  View saved setups
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
                PressureCal Pro
              </p>

              <div className="mt-5 grid gap-3">
                {proFeatures.map((feature) => (
                  <div
                    key={feature}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-100"
                  >
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Better setup decisions start with better estimates
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              PressureCal helps operators move beyond rough guesses by connecting pressure,
              flow, hose loss, and nozzle choice into one practical setup picture.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">
                How do I calculate the right nozzle size?
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                The correct nozzle size depends on both pressure and flow. If the nozzle is
                too small, pressure can climb and engine load can increase. If the nozzle is
                too large, pressure can drop and cleaning performance can feel weak. The{" "}
                <Link
                  to="/nozzle-size-calculator"
                  className="font-semibold text-slate-900 underline hover:text-slate-700"
                >
                  Nozzle Size Calculator
                </Link>{" "}
                is the fastest way to check this.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">
                Why is my pressure lower at the gun than at the pump?
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Real pressure at the gun is lower when hose friction, hose length, hose
                internal diameter, fittings, or nozzle selection reduce the available
                pressure between the pump and the gun. That is why a setup can look fine on
                paper but feel weaker in the field. PressureCal helps model that difference
                directly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to model your setup?
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Start with the free calculator to check pressure, hose loss, and nozzle match
              before you buy, swap, or troubleshoot parts.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={scrollToCalculator}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Start Modelling
            </button>
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
