import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BackToTopButton from "../components/BackToTopButton";
import CalculationExplainer from "../components/CalculationExplainer";
import PressureCalLayout from "../components/PressureCalLayout";
import {
  barFromPsi,
  lpmFromGpm,
  roundTipCodeToFive,
  solvePressureCal,
} from "../pressurecal";
import type { FlowUnit, Inputs, LengthUnit, PressureUnit } from "../pressurecal";
import { parseRigSearchParams } from "../lib/rigUrlState";
import {
  buildCalculatorPathWithSearch,
  buildFullSetupHref,
  buildFullSetupShareUrl,
  hasFullSetupQueryParams,
} from "../lib/fullSetupShareLinks";
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
    title: "Pressure Washer Setup Calculator",
    description:
      "Model pump flow, hose pressure loss, nozzle size, and estimated at-gun performance in one full setup view.",
    cta: "Open pressure washer setup calculator →",
  },
  {
    href: "/nozzle-size-calculator",
    title: "Pressure Washer Nozzle Size Calculator",
    description:
      "Calculate the correct nozzle / tip code from your pump flow and working pressure before you buy or fit parts.",
    cta: "Use the pressure washer nozzle size calculator →",
  },
  {
    href: "/target-pressure-nozzle-calculator",
    title: "Target Pressure Nozzle Calculator",
    description:
      "Work backwards from your desired PSI or BAR to estimate the nozzle size needed to reduce or match pressure.",
    cta: "Use the target pressure nozzle calculator →",
  },
  {
    href: "/hose-pressure-loss-calculator",
    title: "Pressure Washer Hose Pressure Loss Calculator",
    description:
      "Estimate pressure drop through pressure washer hose using hose length, internal diameter, and flow rate before water reaches the gun.",
    cta: "Use the hose pressure loss calculator →",
  },
  {
    href: "/nozzle-size-chart",
    title: "Pressure Washer Nozzle Size Chart",
    description:
      "Use a quick PSI, LPM and US GPM chart for common nozzle / tip sizes, then calculate exact setups when needed.",
    cta: "Open pressure washer nozzle size chart →",
  },
];

const proFeatures = [
  "Model hose ID, nozzle mode, maximum pressure and engine power",
  "Save common machines, hoses, nozzles and surface cleaners",
  "Compare setup changes before swapping parts",
  "Share setup links with customers, staff or support",
  "Generate printable setup reports",
];

const proofPoints = [
  {
    title: "At-gun pressure",
    description:
      "See the estimated pressure that remains after hose loss instead of relying only on the machine’s rated PSI.",
  },
  {
    title: "Hose pressure loss",
    description:
      "See what hose length and hose size are taking away before the water reaches the gun.",
  },
  {
    title: "Flow and nozzle match",
    description:
      "Check whether the expected flow and nozzle / tip size suit the machine output and the way you want to run it.",
  },
  {
    title: "Warnings and recommendations",
    description:
      "Highlights likely mismatches, pressure loss and setup conditions that deserve a closer look before you change equipment.",
  },
];

const supportingToolCards = toolCards.slice(1);

const converterLinks = [
  {
    href: "/psi-bar-calculator",
    title: "PSI ↔ BAR Converter",
  },
  {
    href: "/lpm-gpm-calculator",
    title: "LPM ↔ GPM (US) Converter",
  },
];

const useCaseCards = [
  {
    title: "The setup feels weaker at the gun than the spec sheet suggests",
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
  const location = useLocation();
  const navigate = useNavigate();

  const [inputs, setInputs] = useState<Inputs>(() => ({
    ...defaultInputs,
    ...parseRigSearchParams(window.location.search),
  }));
  const [copyMessage, setCopyMessage] = useState("");
  const copyMessageTimeoutRef = useRef<number | null>(null);
  const [loadedFromLink, setLoadedFromLink] = useState(false);

  const pressurePsi = toPsi(Number(inputs.pumpPressure || 0), inputs.pumpPressureUnit);
  const flowGpm = toGpm(Number(inputs.pumpFlow || 0), inputs.pumpFlowUnit);
  const flowLpm = lpmFromGpm(flowGpm);
  const recommendedTip = recommendedNozzleCode(pressurePsi, flowGpm);
  const hoseLengthLabel = inputs.hoseLengthUnit === "m" ? "Metres" : "Feet";
  const hoseLengthShortUnit = inputs.hoseLengthUnit === "m" ? "m" : "ft";

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
    if (!hasFullSetupQueryParams(location.search)) return;

    navigate(buildCalculatorPathWithSearch(location.search), {
      replace: true,
    });
  }, [location.search, navigate]);

  useEffect(() => {
    if (hasFullSetupQueryParams(location.search)) return;

    trackEvent("homepage_viewed", { page: "home" });
  }, [location.search]);

  useEffect(() => {
    if (window.location.hash === "#calculator") {
      trackEvent("calculator_section_viewed", { page: "home" });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (copyMessageTimeoutRef.current !== null) {
        window.clearTimeout(copyMessageTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (hasFullSetupQueryParams(location.search)) return;

    const parsed = parseRigSearchParams(window.location.search);
    if (Object.keys(parsed).length > 0) {
      setLoadedFromLink(true);
      const timer = window.setTimeout(() => setLoadedFromLink(false), 2600);
      return () => window.clearTimeout(timer);
    }
  }, [location.search]);

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
      buildFullSetupHref({
        ...inputs,
        nozzleSizeText: recommendedTip,
      }),
    [inputs, recommendedTip]
  );


  const performanceCards = [
    {
      label: "At-gun pressure",
      value:
        inputs.pumpPressureUnit === "psi"
          ? `${fmt(solved.gunPressurePsi, 0)} PSI · ${fmt(gunBar, 1)} BAR`
          : `${fmt(gunBar, 1)} BAR · ${fmt(solved.gunPressurePsi, 0)} PSI`,
    },
    {
      label: "Hose loss",
      value:
        inputs.pumpPressureUnit === "psi"
          ? `${fmt(solved.hoseLossPsi, 0)} PSI · ${fmt(lossBar, 1)} BAR`
          : `${fmt(lossBar, 1)} BAR · ${fmt(solved.hoseLossPsi, 0)} PSI`,
      note: `${efficiencyTier} · ${efficiencyNote}`,
      showHoseLink: true,
    },
    {
      label: "Gun flow",
      value:
        inputs.pumpFlowUnit === "lpm"
          ? `${fmt(gunLpm, 0)} LPM · ${fmt(solved.gunFlowGpm, 2)} GPM`
          : `${fmt(solved.gunFlowGpm, 2)} GPM · ${fmt(gunLpm, 0)} LPM`,
    },
    {
      label: "Nozzle status",
      value: solved.isPressureLimited
        ? `${systemBadge.text} · ${statusBadge.text} · tip code ${recommendedTip}`
        : `${statusBadge.text} · tip code ${recommendedTip}`,
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

  const homepageStructuredData = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://www.pressurecal.com/#organization",
          name: "PressureCal",
          url: "https://www.pressurecal.com/",
          description:
            "PressureCal provides professional pressure washer calculator tools for nozzle sizing, target pressure, hose pressure loss, unit conversion and full setup performance checks.",
        },
        {
          "@type": "WebSite",
          "@id": "https://www.pressurecal.com/#website",
          url: "https://www.pressurecal.com/",
          name: "PressureCal",
          description:
            "PressureCal provides professional pressure washer calculator tools for nozzle sizing, target pressure, hose pressure loss, unit conversion and full setup performance checks.",
          publisher: {
            "@id": "https://www.pressurecal.com/#organization",
          },
        },
        {
          "@type": "WebPage",
          "@id": "https://www.pressurecal.com/#webpage",
          url: "https://www.pressurecal.com/",
          name: "PressureCal | Professional Pressure Washer Calculator Tools",
          description:
            "PressureCal gives pressure washing operators practical calculators for nozzle size, target pressure, hose loss, PSI/BAR, LPM/GPM and full setup performance.",
          isPartOf: {
            "@id": "https://www.pressurecal.com/#website",
          },
          about: {
            "@id": "https://www.pressurecal.com/#organization",
          },
          mainEntity: {
            "@id": "https://www.pressurecal.com/#webapplication",
          },
        },
        {
          "@type": "WebApplication",
          "@id": "https://www.pressurecal.com/#webapplication",
          name: "PressureCal",
          url: "https://www.pressurecal.com/",
          applicationCategory: "EngineeringApplication",
          operatingSystem: "Web",
          isAccessibleForFree: true,
          description:
            "PressureCal is a set of pressure washer calculator tools for nozzle size, target pressure, hose pressure loss, PSI/BAR conversion, LPM/GPM conversion and full setup modelling.",
          publisher: {
            "@id": "https://www.pressurecal.com/#organization",
          },
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "AUD",
            availability: "https://schema.org/InStock",
          },
        },
      ],
    }),
    []
  );

  function showCopyMessage(message: string) {
    setCopyMessage(message);

    if (copyMessageTimeoutRef.current !== null) {
      window.clearTimeout(copyMessageTimeoutRef.current);
    }

    copyMessageTimeoutRef.current = window.setTimeout(() => {
      setCopyMessage("");
      copyMessageTimeoutRef.current = null;
    }, 2200);
  }

  async function copySetupLink() {
    trackEvent("copy_setup_link_clicked", {
      page: "home",
      recommended_tip: recommendedTip,
    });

    const url = buildFullSetupShareUrl({
      ...inputs,
      nozzleSizeText: recommendedTip,
    });

    try {
      await navigator.clipboard.writeText(url);
      showCopyMessage("Setup link copied");
    } catch {
      window.prompt("Copy this link:", url);
      showCopyMessage("Copy link opened");
    }
  }

  return (
    <PressureCalLayout>
      <Helmet>
  <title>PressureCal | Professional Pressure Washer Calculator Tools</title>
  <meta
    name="description"
    content="PressureCal gives pressure washing operators practical calculators for nozzle size, target pressure, hose loss, PSI/BAR, LPM/GPM and full setup performance."
  />
  <link rel="canonical" href="https://www.pressurecal.com/" />
  <meta
    property="og:title"
    content="PressureCal | Professional Pressure Washer Calculator Tools"
  />
  <meta
    property="og:description"
    content="PressureCal gives pressure washing operators practical calculators for nozzle size, target pressure, hose loss, PSI/BAR, LPM/GPM and full setup performance."
  />
  <meta property="og:url" content="https://www.pressurecal.com/" />
  <meta property="og:type" content="website" />
  <meta
    name="twitter:title"
    content="PressureCal | Professional Pressure Washer Calculator Tools"
  />
  <meta
    name="twitter:description"
    content="PressureCal gives pressure washing operators practical calculators for nozzle size, target pressure, hose loss, PSI/BAR, LPM/GPM and full setup performance."
  />
  <script type="application/ld+json">
    {JSON.stringify(homepageStructuredData)}
  </script>
</Helmet>

      <section className="-mx-4 -mt-8 overflow-hidden border-b border-slate-200 bg-white px-4 sm:-mt-10">
        <div className="mx-auto max-w-6xl py-8 sm:py-11 lg:py-12">
          <div className="max-w-4xl">
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Pressure Washer Calculator for Real-World Pressure
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              See what actually reaches the gun after hose loss, flow and nozzle size are taken into account.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={scrollToCalculator}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
              >
                Check My Setup
              </button>

              <Link
                to={fullRigHref}
                onClick={() =>
                  trackEvent("open_full_setup_calculator_clicked", {
                    page: "home",
                    location: "hero",
                  })
                }
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
              >
                Full Calculator
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        id="calculator"
        className="-mx-4 scroll-mt-20 border-b border-slate-200 bg-slate-50/70 px-4"
      >
        <div className="mx-auto max-w-6xl py-7 sm:py-10 lg:py-11">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Quick Setup Check
            </h2>
            <p className="mt-2 text-base leading-7 text-slate-600 sm:mt-3 sm:text-lg">
              Enter your pressure washer specs. Takes about 10 seconds.
            </p>
            {loadedFromLink ? (
              <div className="mt-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                Loaded from shared link
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="text-xl font-semibold text-slate-950 sm:text-2xl">Your setup</h3>

              <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-5">
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
                      <option value="psi">PSI</option>
                      <option value="bar">BAR</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Pump flow ({inputs.pumpFlowUnit === "lpm" ? "LPM" : "GPM (US)"})
                  </label>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    GPM means US gallons per minute in PressureCal.
                  </p>
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
                      <option value="lpm">LPM</option>
                      <option value="gpm">GPM (US)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Hose length ({hoseLengthLabel})
                  </label>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Assumes 9.53 mm (3/8&quot;) hose ID. For hose ID and length comparisons,{" "}
                    <Link
                      to="/hose-pressure-loss-calculator"
                      onClick={() =>
                        trackEvent("internal_link_clicked", {
                          page: "home",
                          destination: "hose_pressure_loss_calculator",
                          location: "hose_length_input_help",
                        })
                      }
                      className="font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-950"
                    >
                      estimate pressure loss through your hose
                    </Link>
                    .
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
                      <option value="m">Metres</option>
                      <option value="ft">Feet</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Quick result
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">
                  Setup performance
                </h3>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-600">Recommended nozzle / tip code</p>
                <p className="shrink-0 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {recommendedTip}
                </p>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {performanceCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">
                      {card.label}
                    </p>
                    <p className="mt-1.5 text-base font-semibold leading-6 text-slate-950 sm:text-lg">
                      {card.value}
                    </p>
                    {card.note ? (
                      <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">
                        {card.note}
                      </p>
                    ) : null}
                    {card.showHoseLink ? (
                      <Link
                        to="/hose-pressure-loss-calculator"
                        onClick={() =>
                          trackEvent("internal_link_clicked", {
                            page: "home",
                            destination: "hose_pressure_loss_calculator",
                            location: "loss_meaning_card",
                          })
                        }
                        className="mt-2 inline-flex text-xs font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-700 sm:text-sm"
                      >
                        Check hose pressure drop in detail →
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>

              <CalculationExplainer
                className="mt-4"
                formula={
                  <div className="space-y-2">
                    <p>
                      PressureCal converts the entered flow to US GPM, converts pressure to PSI,
                      estimates the matching nozzle / tip code using the 4000 PSI nozzle convention,
                      then estimates hose loss and likely at-gun pressure.
                    </p>
                    <p className="font-mono text-xs text-slate-600">
                      Pressure at gun = Pump pressure - Estimated hose loss
                    </p>
                  </div>
                }
                inputs={[
                  {
                    label: "Pump pressure",
                    value: `${fmt(Number(inputs.pumpPressure || 0), inputs.pumpPressureUnit === "psi" ? 0 : 1)} ${
                      inputs.pumpPressureUnit === "psi" ? "PSI" : "BAR"
                    }`,
                    note: `${fmt(pressurePsi, 0)} PSI used internally.`,
                  },
                  {
                    label: "Pump flow",
                    value:
                      inputs.pumpFlowUnit === "lpm"
                        ? `${fmt(Number(inputs.pumpFlow || 0), 1)} LPM`
                        : `${fmt(Number(inputs.pumpFlow || 0), 2)} GPM (US)`,
                    note: `${fmt(flowLpm, 1)} LPM / ${fmt(flowGpm, 2)} US GPM after unit conversion.`,
                  },
                  {
                    label: "Hose length",
                    value: `${fmt(Number(inputs.hoseLength || 0), 1)} ${hoseLengthShortUnit}`,
                    note: 'Quick setup check assumes 9.53 mm (3/8") hose ID.',
                  },
                  {
                    label: "Reference pressure",
                    value: "4000 PSI",
                    note: "Pressure washer nozzle codes are commonly based on US GPM at 4000 PSI.",
                  },
                ]}
                results={[
                  {
                    label: "Recommended nozzle / tip code",
                    value: recommendedTip,
                    note: "Rounded to the nearest practical pressure washer nozzle code.",
                  },
                  {
                    label: "Estimated hose loss",
                    value: `${fmt(solved.hoseLossPsi, 0)} PSI (${fmt(lossBar, 1)} BAR)`,
                    note: efficiencyTier,
                  },
                  {
                    label: "Estimated at-gun pressure",
                    value: `${fmt(solved.gunPressurePsi, 0)} PSI (${fmt(gunBar, 1)} BAR)`,
                  },
                  {
                    label: "Estimated gun flow",
                    value: `${fmt(gunLpm, 1)} LPM (${fmt(solved.gunFlowGpm, 2)} GPM)`,
                  },
                ]}
                explanation={
                  <p>
                    This quick setup check gives operators a practical starting point from the main
                    pressure, flow, and hose length inputs. For deeper setup control, open the full setup
                    calculator and check hose ID, nozzle mode, maximum pressure, engine HP, and other limits.
                  </p>
                }
                disclaimer={
                  <p>
                    Use this as a setup estimate only. Always confirm with a pressure gauge and check pump,
                    hose, reel, gun, lance, fittings, nozzle, surface cleaner, and manufacturer limits before
                    making equipment decisions.
                  </p>
                }
              />

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={copySetupLink}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                >
                  {copyMessage ? "Copied!" : "Copy link"}
                </button>

                <Link
                  to={fullRigHref}
                  onClick={() =>
                    trackEvent("open_full_setup_calculator_clicked", {
                      page: "home",
                      location: "calculator_result",
                    })
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                >
                  Full Calculator
                </Link>
              </div>

              {copyMessage ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="mt-2 text-center text-sm font-semibold text-green-700"
                >
                  {copyMessage}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10 lg:py-11">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-sm">
              Why does this matter?
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:mt-3 sm:text-4xl">
              Your machine’s rated PSI isn’t necessarily what reaches the gun.
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:mt-4 sm:text-lg sm:leading-8">
              PressureCal connects the pressure, flow, hose and nozzle so you can see what the setup is likely doing in the real world and spot mismatches before changing parts.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4">
            {proofPoints.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-5"
              >
                <h3 className="text-base font-semibold text-slate-950 sm:text-lg">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10 lg:py-11">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300 sm:text-sm">
                Full calculator + PressureCal Pro
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:mt-3 sm:text-4xl">
                Go further when a quick check isn’t enough
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-300 sm:mt-4 sm:text-lg">
                Use the full calculator for deeper setup modelling, then save, compare and share repeat setups with PressureCal Pro.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={fullRigHref}
                  onClick={() =>
                    trackEvent("open_full_setup_calculator_clicked", {
                      page: "home",
                      location: "features_section",
                    })
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-white px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Full Calculator
                </Link>

                <Link
                  to="/pricing"
                  onClick={() =>
                    trackEvent("pro_bridge_clicked", {
                      page: "home",
                      location: "features_section",
                    })
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  See Pro Plans
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
              <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {proFeatures.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-sm leading-5 text-slate-100">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-bold"
                    >
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10 lg:py-11">
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Pressure washer calculator tools and guides
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600 sm:mt-4 sm:text-lg sm:leading-8">
              Use a dedicated tool when you only need one answer, or open the full setup calculator when pressure, flow, hose and nozzle choice need to be checked together.
            </p>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-950 sm:text-xl">Pressure washer calculator tools</h3>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                  className={`${index > 1 ? "hidden md:block " : ""}rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 sm:p-5`}
                >
                  <h4 className="text-base font-semibold leading-6 text-slate-950 sm:text-lg">{item.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  <p className="mt-3 text-sm font-semibold text-slate-950">{item.cta}</p>
                </Link>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-500 md:hidden">
              More tools are available from the Tools menu.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Quick unit tools
            </p>

            <div className="grid flex-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:max-w-2xl">
              {converterLinks.map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-950 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                >
                  <span>{item.title}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10 lg:py-11">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Common pressure washer setup problems to check
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600 sm:mt-4 sm:text-lg sm:leading-8">
              These are common signs that hose loss, nozzle sizing or the overall setup should be checked before blaming the machine.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 md:gap-4">
            {useCaseCards.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <h3 className="text-base font-semibold leading-6 text-slate-950 sm:text-lg">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>

                {item.title === "You added hose length and want to know what it is costing you" ? (
                  <Link
                    to="/hose-pressure-loss-calculator"
                    onClick={() =>
                      trackEvent("internal_link_clicked", {
                        page: "home",
                        destination: "hose_pressure_loss_calculator",
                        location: "use_case_hose_length",
                      })
                    }
                    className="mt-3 inline-flex text-sm font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-700"
                  >
                    Estimate pressure loss through your hose →
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <BackToTopButton />
    </PressureCalLayout>
  );
}


