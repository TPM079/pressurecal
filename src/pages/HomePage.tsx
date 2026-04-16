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

const toolCards: ToolCard[] = [
  {
    href: "/calculator",
    title: "Full Setup Calculator",
    description:
      "Check nozzle match, hose loss, pressure, flow, and engine load in one place.",
    cta: "Open Full Setup Calculator →",
  },
  {
    href: "/nozzle-size-calculator",
    title: "Nozzle Size Calculator",
    description:
      "Check whether the nozzle is right before you buy it, fit it, or blame the machine.",
    cta: "Check nozzle size →",
  },
  {
    href: "/target-pressure-nozzle-calculator",
    title: "Target Pressure Nozzle Calculator",
    description: "Work backwards from your target PSI and find the nozzle size that best matches your pump and setup.",
    cta: "Open tool →",
  },
  {
    href: "/hose-pressure-loss-calculator",
    title: "Hose Pressure Loss Calculator",
    description:
      "Check what the hose run is costing you before you start chasing the wrong problem.",
    cta: "Check hose loss →",
  },
  {
    href: "/nozzle-size-chart",
    title: "Nozzle Size Chart",
    description:
      "Use a quick field chart when you just need a fast nozzle reference.",
    cta: "Open chart →",
  },
];

const proFeatures = [
  "Save setups you already trust",
  "Compare changes before you swap parts",
  "Keep your repeat-job setups organised",
  "Share proven setups with the team",
];

const proofPoints = [
  {
    title: "Nozzle match",
    description: "Check whether the nozzle is actually matched to the machine.",
  },
  {
    title: "Hose loss",
    description:
      "See what hose length and hose size are taking away before the water hits the gun.",
  },
  {
    title: "At-gun pressure and flow",
    description:
      "Get a clearer read on what pressure and flow you are likely working with at the gun.",
  },
];

const supportingToolCards = toolCards.slice(1);

const converterLinks = [
  {
    href: "/psi-bar-calculator",
    title: "PSI ↔ BAR Converter",
    description: "Quick pressure conversion when you just need the numbers.",
  },
  {
    href: "/lpm-gpm-calculator",
    title: "LPM ↔ GPM Converter",
    description: "Quick flow conversion for specs, nozzle checks, and setup work.",
  },
];

const fullCalculatorReasons = [
  "The machine feels weaker at the gun than the rated spec suggests.",
  "Hose length and nozzle choice both changed and you want the setup checked together.",
  "You want a clearer read on at-gun pressure, flow, and likely rig behaviour.",
];

const useCaseCards = [
  {
    title: "The machine feels weaker at the gun than the spec sheet suggests",
    description:
      "Hose loss, nozzle size, fittings, and the rest of the setup can all pull real pressure down before the water reaches the gun.",
  },
  {
    title: "You are deciding between nozzle sizes before buying parts",
    description:
      "A nozzle that is too small can load the engine harder. A nozzle that is too large can make the setup feel weak and sluggish.",
  },
  {
    title: "You added hose length and want to know what it is costing you",
    description:
      "Longer hose runs and smaller hose IDs can shift the real operating point more than most operators expect.",
  },
  {
    title: "You want the full setup checked before blaming the machine",
    description:
      "PressureCal helps you check the whole picture before changing parts, chasing faults, or guessing at the gun.",
  },
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

  const heroProofItems = [
    {
      label: "At-gun",
      value: `${fmt(solved.gunPressurePsi, 0)} PSI`,
    },
    {
      label: "Hose loss",
      value: `${fmt(solved.hoseLossPsi, 0)} PSI`,
    },
    {
      label: "Tip",
      value: recommendedTip,
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
  <title>Pressure Washer Calculator | Nozzle Size, Hose Loss & At-Gun Pressure</title>
  <meta
    name="description"
    content="Model what your pressure washer is really doing at the gun with nozzle sizing, hose loss, at-gun pressure, flow, and full setup checks."
  />
  <link rel="canonical" href="https://www.pressurecal.com/" />
  <meta
    property="og:title"
    content="Pressure Washer Calculator | Nozzle Size, Hose Loss & At-Gun Pressure"
  />
  <meta
    property="og:description"
    content="Model what your pressure washer is really doing at the gun with nozzle sizing, hose loss, at-gun pressure, flow, and full setup checks."
  />
  <meta property="og:url" content="https://www.pressurecal.com/" />
  <meta property="og:type" content="website" />
  <meta
    name="twitter:title"
    content="Pressure Washer Calculator | Nozzle Size, Hose Loss & At-Gun Pressure"
  />
  <meta
    name="twitter:description"
    content="Model what your pressure washer is really doing at the gun with nozzle sizing, hose loss, at-gun pressure, flow, and full setup checks."
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
        "PressureCal is a pressure washer calculator for nozzle sizing, hose pressure loss, PSI/LPM conversions, at-gun pressure, flow, and bypass behaviour.",
    })}
  </script>
</Helmet>

      <section className="-mx-4 -mt-8 overflow-hidden border-b border-slate-200 bg-white px-4 sm:-mt-10">
        <div className="mx-auto grid max-w-6xl items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
              Built for pressure washing operators
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
  Model what your pressure washer is really doing at the gun
</h1>

<p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
  Check nozzle match, hose pressure loss, at-gun pressure, and flow from one setup
  view — before you swap parts, buy the wrong nozzle, or blame the machine.
</p>

<p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
  PressureCal is a pressure washer calculator built for operators who need more than
  a simple converter, chart, or guess.
</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={fullRigHref}
                onClick={() =>
                  trackEvent("open_full_setup_calculator_clicked", {
                    page: "home",
                    location: "hero",
                  })
                }
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Open Full Setup Calculator
              </Link>

              <button
                type="button"
                onClick={scrollToCalculator}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                Quick Setup Check
              </button>
            </div>

            <div className="mt-6 lg:hidden">
              <div className="grid grid-cols-3 gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                {heroProofItems.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-base font-semibold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs font-medium text-slate-500">
                Live preview from the current inputs.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-slate-600">
              <span>Nozzle match</span>
              <span className="text-slate-300">•</span>
              <span>Hose loss</span>
              <span className="text-slate-300">•</span>
              <span>Pump-to-gun setup check</span>
            </div>
          </div>

          <div className="hidden lg:block lg:pl-4">
            <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">Live setup preview</h2>
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
                  Small changes in hose, nozzle, and setup can shift what you
                  actually get at the gun. PressureCal helps you check the setup before
                  you start changing parts in the field.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-14">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              See what your setup is actually doing
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Pump specs only tell part of the story. Hose length, hose size, nozzle size,
              and the rest of the setup can change what you actually get at the gun.
              PressureCal helps you check the whole picture before you buy parts, swap
              nozzles, or start chasing the wrong problem.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {proofPoints.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6"
              >
                <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <h3 className="text-xl font-semibold text-slate-950">Other useful tools</h3>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {supportingToolCards.map((item, index) => (
                <Link
                  key={item.title}
                  to={item.href}
                  onClick={() =>
                    trackEvent("homepage_tool_clicked", {
                      page: "home",
                      tool: item.title,
                    })
                  }
                  className={`${index > 1 ? "hidden md:block " : ""}rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md sm:p-6`}
                >
                  <h4 className="text-lg font-semibold text-slate-950 sm:text-xl">{item.title}</h4>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                  <p className="mt-5 text-sm font-semibold text-slate-950">{item.cta}</p>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-500 md:hidden">
              More tools are available from the Tools menu.
            </p>
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Quick unit tools
            </p>

            <div className="mt-4 grid gap-3 sm:hidden">
              {converterLinks.map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300"
                >
                  <span className="text-sm font-semibold text-slate-950">{item.title}</span>
                  <span className="text-sm font-semibold text-slate-950">Open →</span>
                </Link>
              ))}
            </div>

            <div className="mt-4 hidden gap-4 md:grid md:grid-cols-2">
              {converterLinks.map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
                >
                  <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  <p className="mt-4 text-sm font-semibold text-slate-950">Open {item.title} →</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="calculator" className="-mx-4 border-b border-slate-200 bg-slate-50/70 px-4">
        <div className="mx-auto max-w-6xl py-10 sm:py-12 lg:py-12">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Quick Setup Check
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Enter your pressure, flow, and hose length to see your recommended nozzle,
              estimated hose loss, and likely at-gun pressure and flow. Open the full
              setup calculator when you want deeper control.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
                  className="hidden rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 sm:inline-flex"
                >
                  Open Full Setup Calculator
                </Link>
              </div>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                Start with rated pressure, flow, and hose length. PressureCal estimates
                the nozzle and shows what the setup is likely doing at the gun.
              </p>

              <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5">
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

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center sm:mt-8 sm:p-6">
                <p className="text-sm font-medium text-slate-600">Recommended nozzle size</p>
                <p className="mt-3 text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
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
                    Open Full Setup Calculator
                  </Link>
                </div>
              </div>
            </div>

            <div className="space-y-5 sm:space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
                  See nozzle match, hose loss, and at-gun pressure and flow in one place.
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

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-lg font-semibold text-slate-950 sm:text-xl">When to open the full calculator</h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use the full setup calculator when nozzle size, hose loss, pressure,
                  and flow all need to be checked together instead of guessed separately.
                </p>

                <div className="mt-4 space-y-3 sm:mt-5">
                  {fullCalculatorReasons.map((reason, index) => (
                    <div
                      key={reason}
                      className={`${index > 1 ? "hidden sm:block " : ""}rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700`}
                    >
                      {reason}
                    </div>
                  ))}
                </div>

                <Link
                  to={fullRigHref}
                  onClick={() =>
                    trackEvent("open_full_setup_calculator_clicked", {
                      page: "home",
                      location: "quick_check_callout",
                    })
                  }
                  className="mt-5 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open Full Setup Calculator
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
                PressureCal Pro
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                PressureCal Pro is for repeat-job workflow
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
                Save proven setups, compare changes before swapping parts, and stop
                working out the same machine over and over.
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
                  See Pro workflow
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
                  See saved setups
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="grid gap-3">
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
              Use PressureCal when the setup needs more than a quick chart
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              PressureCal is most useful when pressure, flow, nozzle, and hose decisions
              need to be checked together instead of guessed separately.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 md:gap-5">
            {useCaseCards.map((item, index) => (
              <div
                key={item.title}
                className={`${index > 1 ? "hidden md:block " : ""}rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6`}
              >
                <h3 className="text-lg font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Open the full setup calculator and model the setup properly
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Load in your pressure, flow, hose, and nozzle and get a clearer read on
              nozzle match, hose loss, and what the setup is likely doing at the gun.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to={fullRigHref}
              onClick={() =>
                trackEvent("open_full_setup_calculator_clicked", {
                  page: "home",
                  location: "final_cta",
                })
              }
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Open Full Setup Calculator
            </Link>
          </div>
        </div>
      </section>

      <BackToTopButton />
    </PressureCalLayout>
  );
}
