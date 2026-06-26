import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import PressureCalLayout from "../components/PressureCalLayout";
import BackToTopButton from "../components/BackToTopButton";
import CalculationExplainer from "../components/CalculationExplainer";

const PSI_TO_BAR = 0.0689476;
const BAR_TO_PSI = 1 / PSI_TO_BAR;
const BAR_TO_MPA = 0.1;
const MPA_TO_BAR = 10;
const BAR_TO_KPA = 100;
const KPA_TO_BAR = 0.01;

const PAGE_URL = "https://www.pressurecal.com/psi-bar-calculator";
const SEO_TITLE = "PSI to BAR Converter | MPa & kPa Pressure Conversion | PressureCal";
const SEO_DESCRIPTION =
  "Convert PSI to BAR, MPa and kPa for pressure washers, pumps, hoses, gauges and nozzles. Includes common pressure washer conversions like 4000 PSI to BAR and MPa.";

type PressureUnit = "psi" | "bar" | "mpa" | "kpa";

type PressureResult = Record<PressureUnit, string>;

type PressureUnitMeta = {
  id: PressureUnit;
  label: string;
  hint: string;
  placeholder: string;
  maxDecimals: number;
};

type CommonPressureConversion = {
  psi: string;
  bar: string;
  mpa: string;
  kpa: string;
  context: string;
};

type CommonConversionCard = {
  title: string;
  body: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

const PRESSURE_UNIT_META: PressureUnitMeta[] = [
  {
    id: "psi",
    label: "PSI",
    hint: "Common pressure washer rating",
    placeholder: "Enter PSI",
    maxDecimals: 2,
  },
  {
    id: "bar",
    label: "BAR",
    hint: "Common pump and gauge rating",
    placeholder: "Enter BAR",
    maxDecimals: 4,
  },
  {
    id: "mpa",
    label: "MPa",
    hint: "Used in some pump specs and manuals",
    placeholder: "Enter MPa",
    maxDecimals: 4,
  },
  {
    id: "kpa",
    label: "kPa",
    hint: "Used in technical pressure specs",
    placeholder: "Enter kPa",
    maxDecimals: 2,
  },
];

const EMPTY_RESULT: PressureResult = {
  psi: "",
  bar: "",
  mpa: "",
  kpa: "",
};

const quickPsiExamples = [1450, 3000, 4000, 5000];
const quickBarExamples = [100, 200, 250, 300];

const commonPressureConversions: CommonPressureConversion[] = [
  {
    psi: "1450 PSI",
    bar: "100 BAR",
    mpa: "10.0 MPa",
    kpa: "10,000 kPa",
    context: "Approximate 100 BAR pressure washer reference",
  },
  {
    psi: "2000 PSI",
    bar: "137.9 BAR",
    mpa: "13.8 MPa",
    kpa: "13,790 kPa",
    context: "Light commercial and general cleaning reference",
  },
  {
    psi: "3000 PSI",
    bar: "206.8 BAR",
    mpa: "20.7 MPa",
    kpa: "20,684 kPa",
    context: "Common petrol pressure washer rating",
  },
  {
    psi: "4000 PSI",
    bar: "275.8 BAR",
    mpa: "27.6 MPa",
    kpa: "27,579 kPa",
    context: "Common contractor pressure washer rating",
  },
  {
    psi: "5000 PSI",
    bar: "344.7 BAR",
    mpa: "34.5 MPa",
    kpa: "34,474 kPa",
    context: "High-pressure specialist equipment reference",
  },
  {
    psi: "6000 PSI",
    bar: "413.7 BAR",
    mpa: "41.4 MPa",
    kpa: "41,369 kPa",
    context: "Industrial pressure system comparison",
  },
];

const commonConversionCards: CommonConversionCard[] = [
  {
    title: "4000 PSI to BAR and MPa",
    body: "4000 PSI is 275.8 BAR and 27.6 MPa. This is a common contractor pressure washer rating.",
  },
  {
    title: "3000 PSI to BAR and MPa",
    body: "3000 PSI is 206.8 BAR and 20.7 MPa. This is common on petrol pressure washer specs.",
  },
  {
    title: "5000 PSI to BAR and MPa",
    body: "5000 PSI is 344.7 BAR and 34.5 MPa. Always confirm hose, gun, lance and nozzle ratings before use.",
  },
  {
    title: "BAR to MPa",
    body: "To convert BAR to MPa, divide BAR by 10. For example, 250 BAR is 25 MPa.",
  },
  {
    title: "MPa to PSI",
    body: "To convert MPa to PSI, multiply MPa by 145.038. For example, 20 MPa is about 2901 PSI.",
  },
  {
    title: "kPa to BAR",
    body: "To convert kPa to BAR, divide kPa by 100. For example, 25,000 kPa is 250 BAR.",
  },
];

const faqs: FaqItem[] = [
  {
    question: "What is 4000 PSI in BAR and MPa?",
    answer:
      "4000 PSI is approximately 275.8 BAR and 27.6 MPa. It is also about 27,579 kPa. For pressure washer work, 4000 PSI is commonly rounded to 276 BAR when comparing machine ratings, pumps, gauges, nozzles and manuals.",
  },
  {
    question: "How do you convert PSI to MPa?",
    answer:
      "Multiply the PSI value by 0.00689476. For example, 4000 PSI × 0.00689476 = 27.579 MPa, which is commonly rounded to 27.6 MPa.",
  },
  {
    question: "Is MPa the same as BAR?",
    answer:
      "No. MPa and BAR both measure pressure, but they are different units. 1 MPa equals 10 BAR, and 1 BAR equals 0.1 MPa.",
  },
  {
    question: "Why do some pressure washers use MPa?",
    answer:
      "Some pumps, gauges, manuals and technical documents use metric pressure units such as MPa or kPa. Many operators still talk in PSI or BAR, so converting between the units helps compare pressure washer parts and ratings clearly.",
  },
  {
    question: "Is kPa useful for pressure washer specs?",
    answer:
      "kPa is useful when a gauge, test sheet or technical document lists pressure that way, but pressure washer operators usually work more commonly with PSI, BAR or MPa. For quick comparisons, 100 kPa equals 1 BAR.",
  },
  {
    question: "What pressure unit should I use for pressure washers?",
    answer:
      "Use the unit shown on your machine, gauge or manual, then convert when comparing parts. In Australia, PSI and BAR are usually the most practical pressure washer units, while MPa and kPa can appear in pump data, gauges and technical documentation.",
  },
  {
    question: "Is pressure the only thing that matters in a pressure washer setup?",
    answer:
      "No. Pressure is only one part of a pressure washer setup. Flow rate, nozzle size, hose pressure loss, fittings, nozzle wear and working pressure at the gun all affect real-world performance.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${PAGE_URL}#webpage`,
      url: PAGE_URL,
      name: SEO_TITLE,
      description: SEO_DESCRIPTION,
      isPartOf: {
        "@type": "WebSite",
        name: "PressureCal",
        url: "https://www.pressurecal.com",
      },
      about: [
        "PSI to BAR conversion",
        "BAR to PSI conversion",
        "PSI to MPa conversion",
        "MPa to PSI conversion",
        "kPa to BAR conversion",
        "pressure washer pressure ratings",
        "pressure washer calculators",
      ],
    },
    {
      "@type": "WebApplication",
      "@id": `${PAGE_URL}#app`,
      name: "PSI to BAR, MPa & kPa Converter",
      url: PAGE_URL,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      description: SEO_DESCRIPTION,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "AUD",
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${PAGE_URL}#faq`,
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${PAGE_URL}#breadcrumbs`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "PressureCal",
          item: "https://www.pressurecal.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "PSI to BAR Converter",
          item: PAGE_URL,
        },
      ],
    },
  ],
};

function formatNumber(value: number, maxDecimals = 4) {
  if (!Number.isFinite(value)) return "";
  return parseFloat(value.toFixed(maxDecimals)).toString();
}

function getUnitLabel(unit: PressureUnit) {
  return PRESSURE_UNIT_META.find((item) => item.id === unit)?.label ?? "PSI";
}

function pressureToBar(value: number, unit: PressureUnit) {
  switch (unit) {
    case "psi":
      return value * PSI_TO_BAR;
    case "bar":
      return value;
    case "mpa":
      return value * MPA_TO_BAR;
    case "kpa":
      return value * KPA_TO_BAR;
    default:
      return value;
  }
}

function getFormulaText(unit: PressureUnit) {
  switch (unit) {
    case "psi":
      return "BAR = PSI × 0.0689476 · MPa = PSI × 0.00689476 · kPa = PSI × 6.89476";
    case "bar":
      return "PSI = BAR × 14.5038 · MPa = BAR × 0.1 · kPa = BAR × 100";
    case "mpa":
      return "BAR = MPa × 10 · PSI = MPa × 145.038 · kPa = MPa × 1000";
    case "kpa":
      return "BAR = kPa × 0.01 · MPa = kPa ÷ 1000 · PSI = kPa × 0.145038";
    default:
      return "BAR = PSI × 0.0689476";
  }
}

function getConversionFactorNote(unit: PressureUnit) {
  switch (unit) {
    case "psi":
      return "PressureCal treated PSI as the source pressure and converted it to BAR, MPa and kPa.";
    case "bar":
      return "PressureCal treated BAR as the source pressure and converted it to PSI, MPa and kPa.";
    case "mpa":
      return "PressureCal treated MPa as the source pressure and converted it to PSI, BAR and kPa.";
    case "kpa":
      return "PressureCal treated kPa as the source pressure and converted it to PSI, BAR and MPa.";
    default:
      return "PressureCal treated the entered value as the source pressure.";
  }
}

export default function PsiBarCalculatorPage() {
  const [activeUnit, setActiveUnit] = useState<PressureUnit>("psi");
  const [rawValue, setRawValue] = useState("4000");
  const [baseBar, setBaseBar] = useState<number | null>(() =>
    pressureToBar(4000, "psi")
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [copied]);

  const result = useMemo<PressureResult>(() => {
    if (baseBar === null || !Number.isFinite(baseBar)) {
      return {
        ...EMPTY_RESULT,
        [activeUnit]: rawValue,
      };
    }

    return {
      psi:
        activeUnit === "psi"
          ? rawValue
          : formatNumber(baseBar * BAR_TO_PSI, 2),
      bar: activeUnit === "bar" ? rawValue : formatNumber(baseBar, 4),
      mpa:
        activeUnit === "mpa"
          ? rawValue
          : formatNumber(baseBar * BAR_TO_MPA, 4),
      kpa:
        activeUnit === "kpa"
          ? rawValue
          : formatNumber(baseBar * BAR_TO_KPA, 2),
    };
  }, [activeUnit, baseBar, rawValue]);

  const hasValidResult = baseBar !== null && Number.isFinite(baseBar);

  const activeUnitLabel = getUnitLabel(activeUnit);

  function handleUnitChange(unit: PressureUnit, value: string) {
    const sourcePressure = parseFloat(value);

    setActiveUnit(unit);
    setRawValue(value);
    setBaseBar(
      Number.isFinite(sourcePressure)
        ? pressureToBar(sourcePressure, unit)
        : null
    );
    setCopied(false);
  }

  function handleClear() {
    setRawValue("");
    setActiveUnit("psi");
    setBaseBar(null);
    setCopied(false);
  }

  function setPressurePreset(unit: PressureUnit, value: number) {
    setActiveUnit(unit);
    setRawValue(String(value));
    setBaseBar(pressureToBar(value, unit));
    setCopied(false);
  }

  async function handleCopyResult() {
    if (!hasValidResult) return;

    try {
      await navigator.clipboard.writeText(
        `${result.psi} PSI = ${result.bar} BAR = ${result.mpa} MPa = ${result.kpa} kPa`
      );
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <PressureCalLayout>
      <Helmet>
        <title>{SEO_TITLE}</title>
        <meta name="description" content={SEO_DESCRIPTION} />
        <link rel="canonical" href={PAGE_URL} />

        <meta property="og:title" content={SEO_TITLE} />
        <meta property="og:description" content={SEO_DESCRIPTION} />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:type" content="website" />

        <meta name="twitter:title" content={SEO_TITLE} />
        <meta name="twitter:description" content={SEO_DESCRIPTION} />

        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="-mx-4 -my-8 bg-slate-100 px-4 py-8 sm:-my-10 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                Pressure washer pressure conversion
              </div>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                PSI to BAR, MPa & kPa Converter
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Convert between PSI, BAR, MPa and kPa for pressure washers,
                pumps, hoses, gauges and nozzles. Pressure washer ratings are
                commonly listed in PSI or BAR, while some pumps, gauges and
                technical documents may use MPa or kPa.
              </p>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                PSI to BAR stays front and centre, with MPa and kPa available
                when a manual, data plate, gauge or technical sheet uses metric
                pressure units.
              </p>
            </div>

            <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Featured pressure washer example
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                4000 PSI = 275.8 BAR = 27.6 MPa
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The exact conversion is 275.7904 BAR, 27.579 MPa and 27,579
                kPa. Pressure washer operators commonly round 4000 PSI to 276
                BAR for quick spec comparisons.
              </p>
            </div>

            <div className="mt-8">
              <p className="text-sm font-semibold text-slate-900">
                Primary conversion
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Type into any pressure unit. The highlighted field is used as
                the source pressure and the other units update instantly.
              </p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {PRESSURE_UNIT_META.slice(0, 2).map((unit) => (
                  <div key={unit.id}>
                    <label
                      htmlFor={unit.id}
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      {unit.label}
                    </label>
                    <input
                      id={unit.id}
                      type="number"
                      inputMode="decimal"
                      autoFocus={unit.id === "psi"}
                      value={activeUnit === unit.id ? rawValue : result[unit.id]}
                      onChange={(e) => handleUnitChange(unit.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      placeholder={unit.placeholder}
                      className={`w-full rounded-2xl border bg-white px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
                        activeUnit === unit.id
                          ? "border-blue-500 ring-4 ring-blue-100"
                          : "border-slate-300"
                      }`}
                    />
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {activeUnit === unit.id
                        ? "Currently used as the source pressure."
                        : unit.hint}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Secondary pressure units
              </p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {PRESSURE_UNIT_META.slice(2).map((unit) => (
                  <div key={unit.id}>
                    <label
                      htmlFor={unit.id}
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      {unit.label}
                    </label>
                    <input
                      id={unit.id}
                      type="number"
                      inputMode="decimal"
                      value={activeUnit === unit.id ? rawValue : result[unit.id]}
                      onChange={(e) => handleUnitChange(unit.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      placeholder={unit.placeholder}
                      className={`w-full rounded-2xl border bg-white px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
                        activeUnit === unit.id
                          ? "border-blue-500 ring-4 ring-blue-100"
                          : "border-slate-300"
                      }`}
                    />
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {activeUnit === unit.id
                        ? "Currently used as the source pressure."
                        : unit.hint}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleClear}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={handleCopyResult}
                disabled={!hasValidResult}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? "Copied" : "Copy Result"}
              </button>
            </div>

            {hasValidResult && (
              <div className="mt-6 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                      Converted Pressure
                    </p>

                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-blue-100">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          PSI
                        </div>
                        <div className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                          {result.psi}
                        </div>
                      </div>

                      <div className="pb-2 text-2xl font-semibold text-slate-400">
                        =
                      </div>

                      <div className="rounded-2xl bg-blue-600 px-4 py-3 text-white shadow-sm">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">
                          BAR
                        </div>
                        <div className="mt-1 text-3xl font-bold tracking-tight">
                          {result.bar}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          MPa
                        </div>
                        <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                          {result.mpa}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          kPa
                        </div>
                        <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                          {result.kpa}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600 md:max-w-xs">
                    Use this as a pressure rating conversion. For real working
                    pressure at the gun, also check hose pressure loss, nozzle
                    size and flow.
                  </div>
                </div>

                <CalculationExplainer
                  className="mt-5"
                  formula={<p>{getFormulaText(activeUnit)}</p>}
                  inputs={[
                    {
                      label: `${activeUnitLabel} entered`,
                      value: `${rawValue} ${activeUnitLabel}`,
                      note: getConversionFactorNote(activeUnit),
                    },
                  ]}
                  results={[
                    {
                      label: "PSI",
                      value: `${result.psi} PSI`,
                      note: "Common machine rating and operator reference unit.",
                    },
                    {
                      label: "BAR",
                      value: `${result.bar} BAR`,
                      note: "Common pump, gauge and European equipment reference unit.",
                    },
                    {
                      label: "MPa",
                      value: `${result.mpa} MPa`,
                      note: "Useful when a pump, gauge or manual lists pressure in megapascals.",
                    },
                    {
                      label: "kPa",
                      value: `${result.kpa} kPa`,
                      note: "Useful for technical sheets and some metric pressure references.",
                    },
                  ]}
                  explanation={
                    <p>
                      PressureCal is doing a direct pressure unit conversion
                      here. This is useful when a pump, gauge, unloader, manual
                      or machine label lists pressure in a different unit, but
                      it does not model flow, hose pressure loss, nozzle
                      restriction or real working pressure at the gun.
                    </p>
                  }
                  disclaimer={
                    <p>
                      Use this as a pressure rating conversion only. For real
                      setup checks, confirm working pressure with a gauge and
                      stay within pump, hose, gun, lance, unloader, surface
                      cleaner and nozzle limits.
                    </p>
                  }
                />
              </div>
            )}

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-medium text-slate-700">
                  Quick PSI presets
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickPsiExamples.map((value) => {
                    const isActive =
                      activeUnit === "psi" && rawValue === String(value);

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPressurePreset("psi", value)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition active:scale-[0.98] ${
                          isActive
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {value} PSI
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-slate-700">
                  Quick BAR presets
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickBarExamples.map((value) => {
                    const isActive =
                      activeUnit === "bar" && rawValue === String(value);

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPressurePreset("bar", value)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition active:scale-[0.98] ${
                          isActive
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {value} BAR
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm md:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  Quick answer
                </p>

                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                  What does 4000 PSI mean in BAR and MPa?
                </h2>

                <p className="mt-4 text-sm leading-7 text-slate-700">
                  4000 PSI = 275.8 BAR and 27.6 MPa when rounded to one
                  decimal place. The exact conversion is 275.7904 BAR and
                  27.579 MPa. It is also about 27,579 kPa.
                </p>

                <p className="mt-3 text-sm leading-7 text-slate-700">
                  Formula: 4000 × 0.0689476 = 275.7904 BAR. For MPa, 4000 ×
                  0.00689476 = 27.579 MPa.
                </p>
              </div>

              <div className="rounded-3xl border border-blue-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">
                  4000 PSI conversion card
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      PSI
                    </div>
                    <div className="mt-1 text-3xl font-bold text-slate-900">
                      4000
                    </div>
                  </div>

                  <div className="rounded-2xl bg-blue-600 p-4 text-center text-white">
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                      BAR
                    </div>
                    <div className="mt-1 text-3xl font-bold">275.8</div>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-slate-50 p-4 text-center">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      MPa
                    </div>
                    <div className="mt-1 text-3xl font-bold text-slate-900">
                      27.6
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                  Also equal to about 27,579 kPa.
                </p>

                <button
                  type="button"
                  onClick={() => setPressurePreset("psi", 4000)}
                  className="mt-4 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 active:scale-[0.98]"
                >
                  Load 4000 PSI in calculator
                </button>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              How to convert PSI to BAR, MPa and kPa
            </h2>

            <div className="mt-4 grid gap-5 md:grid-cols-[1fr_0.9fr]">
              <div className="space-y-4 text-sm leading-7 text-slate-600">
                <p>
                  To convert PSI to BAR, multiply the PSI value by 0.0689476.
                  This gives you the equivalent pressure in BAR for pressure
                  washer ratings, pump data plates, gauges, manuals and
                  component specifications.
                </p>

                <p>
                  MPa and kPa are metric pressure units. They are useful when a
                  pump, gauge, technical sheet or overseas manual does not list
                  pressure in PSI or BAR. These are direct pressure unit
                  conversions and do not change the actual performance of the
                  pressure washer setup.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <h3 className="text-base font-semibold text-slate-900">
                  Conversion formulas
                </h3>
                <p className="mt-3 text-sm text-slate-600">
                  1 BAR = 14.5038 PSI
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  1 PSI = 0.0689476 BAR
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  1 MPa = 10 BAR = 1000 kPa
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  1 PSI = 0.00689476 MPa = 6.89476 kPa
                </p>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Example: 4000 PSI × 0.0689476 = 275.7904 BAR.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Common pressure washer conversions
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              These common PSI to BAR, MPa and kPa conversions are useful for
              comparing pressure washer machine labels, pump data plates,
              gauges, manuals and component specs. Treat the context column as
              a guide only and always stay within manufacturer limits.
            </p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-900">
                        PSI
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-900">
                        BAR
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-900">
                        MPa
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-900">
                        kPa
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-900">
                        Pressure washer context
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {commonPressureConversions.map((row) => (
                      <tr key={row.psi}>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                          {row.psi}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {row.bar}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {row.mpa}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {row.kpa}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {row.context}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Common conversion questions
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              These are the pressure conversions operators most often need when
              comparing machine ratings, pump specs, gauges, hoses, unloaders
              and nozzles.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {commonConversionCards.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <h3 className="text-base font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Why pressure washers use different pressure units
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
              <p>
                PSI, BAR, MPa and kPa all describe pressure, but pressure washer
                equipment is sold across different markets. A machine might be
                advertised at 4000 PSI, a pump manual may list 275 BAR, and a
                technical document may use MPa or kPa.
              </p>

              <p>
                Australian operators often talk in PSI and LPM. Many European
                pumps, unloaders, gauges and technical sheets use BAR and L/min,
                while some metric documents use MPa or kPa. This page helps
                bridge those specs so you can compare parts and ratings without
                doing the maths manually.
              </p>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <h3 className="text-base font-semibold text-slate-900">
                Pressure is only one part of the setup
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Pressure conversion is useful for comparing ratings, but it does
                not tell the full performance story. Flow, nozzle size, hose
                pressure loss, fittings, nozzle wear, unloader setting and
                working pressure at the gun all affect how a pressure washer
                setup behaves in the real world.
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                For actual setup checks, use the related PressureCal tools to
                model nozzle size, hose pressure loss, flow and working pressure
                at the gun together.
              </p>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              FAQ
            </h2>

            <div className="mt-5 space-y-5 text-sm leading-7 text-slate-600">
              {faqs.map((faq) => (
                <div key={faq.question}>
                  <h3 className="text-base font-semibold text-slate-900">
                    {faq.question}
                  </h3>
                  <p className="mt-2">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Related PressureCal tools
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              Pressure is only one part of the setup. Check nozzle size, hose
              pressure loss, flow and working pressure at the gun with
              PressureCal when you need to understand what the full pressure
              washer setup is actually doing.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                to="/calculator"
                className="rounded-2xl border border-slate-200 bg-slate-900 px-5 py-4 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Full Pressure Washer Setup Calculator
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-300">
                  Model pump, hose, nozzle, flow and working pressure at the gun together.
                </span>
              </Link>

              <Link
                to="/hose-pressure-loss-calculator"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              >
                Hose Pressure Loss Calculator
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                  Estimate hose pressure loss through hose length and hose ID.
                </span>
              </Link>

              <Link
                to="/nozzle-size-calculator"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              >
                Pressure Washer Nozzle Size Calculator
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                  Match pressure and flow to the correct pressure washer nozzle.
                </span>
              </Link>

              <Link
                to="/lpm-gpm-calculator"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              >
                LPM to GPM Converter
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                  Convert flow ratings between Australian-style LPM and US gallons per minute.
                </span>
              </Link>
            </div>
          </section>

          <BackToTopButton />
        </div>
      </div>
    </PressureCalLayout>
  );
}
