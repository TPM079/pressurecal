import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import PressureCalLayout from "../components/PressureCalLayout";
import BackToTopButton from "../components/BackToTopButton";
import CalculationExplainer from "../components/CalculationExplainer";

const US_GPM_TO_LPM = 3.78541;
const LPM_TO_US_GPM = 0.264172;

const PAGE_URL = "https://www.pressurecal.com/lpm-gpm-calculator";
const SEO_TITLE = "LPM to GPM Converter for Pressure Washers | PressureCal";
const SEO_DESCRIPTION =
  "Convert LPM to GPM and GPM to LPM for pressure washer flow rates. Includes common pressure washer examples like 15 LPM, 21 LPM, 4 GPM and 5.5 GPM.";

type CommonFlowConversion = {
  lpm: string;
  gpm: string;
  context: string;
};

type ConversionExample = {
  title: string;
  result: string;
  body: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

const quickLpmExamples = [11, 15, 21, 30];
const quickGpmExamples = [4, 5.5, 8];

const commonFlowConversions: CommonFlowConversion[] = [
  {
    lpm: "11 LPM",
    gpm: "2.91 GPM",
    context: "Smaller pressure washer or pump flow reference",
  },
  {
    lpm: "15 LPM",
    gpm: "3.96 GPM",
    context: "Common general pressure washer flow reference",
  },
  {
    lpm: "15.14 LPM",
    gpm: "4 GPM",
    context: "Useful when a US machine or nozzle chart lists 4 GPM",
  },
  {
    lpm: "20.82 LPM",
    gpm: "5.5 GPM",
    context: "Useful for comparing 5.5 GPM pump and nozzle specifications",
  },
  {
    lpm: "21 LPM",
    gpm: "5.55 GPM",
    context: "Common higher-flow pressure washer reference in Australia",
  },
  {
    lpm: "30 LPM",
    gpm: "7.93 GPM",
    context: "High-flow pressure washer or equipment reference",
  },
  {
    lpm: "30.28 LPM",
    gpm: "8 GPM",
    context: "Useful when a US pump or nozzle chart lists 8 GPM",
  },
];

const conversionExamples: ConversionExample[] = [
  {
    title: "15 LPM to GPM",
    result: "15 LPM = 3.96 GPM",
    body: "Convert 15 LPM to US GPM when comparing an Australian pump or machine rating with a US nozzle chart or overseas specification.",
  },
  {
    title: "21 LPM to GPM",
    result: "21 LPM = 5.55 GPM",
    body: "A 21 LPM pressure washer delivers approximately 5.55 US GPM before allowing for any real-world flow variation.",
  },
  {
    title: "30 LPM to GPM",
    result: "30 LPM = 7.93 GPM",
    body: "A 30 LPM flow rating is approximately 7.93 US GPM, which is useful for high-flow pump and nozzle comparisons.",
  },
  {
    title: "4 GPM to LPM",
    result: "4 GPM = 15.14 LPM",
    body: "A pressure washer rated at 4 US GPM has a nominal flow of approximately 15.14 LPM.",
  },
  {
    title: "5.5 GPM to LPM",
    result: "5.5 GPM = 20.82 LPM",
    body: "A 5.5 US GPM pump or machine rating converts to approximately 20.82 LPM.",
  },
  {
    title: "8 GPM to LPM",
    result: "8 GPM = 30.28 LPM",
    body: "An 8 US GPM pressure washer flow rating converts to approximately 30.28 LPM.",
  },
];

const faqs: FaqItem[] = [
  {
    question: "How many GPM is 15 LPM?",
    answer:
      "15 LPM is approximately 3.96 GPM. PressureCal uses US gallons per minute for GPM.",
  },
  {
    question: "How many GPM is 21 LPM?",
    answer:
      "21 LPM is approximately 5.55 GPM using US gallons per minute.",
  },
  {
    question: "How many LPM is 5.5 GPM?",
    answer:
      "5.5 US GPM is approximately 20.82 LPM.",
  },
  {
    question: "Is pressure washer GPM US or imperial?",
    answer:
      "Pressure washer GPM normally means US gallons per minute, especially on US pump specifications, machine ratings and nozzle charts. PressureCal uses US GPM, not imperial gallons per minute.",
  },
  {
    question: "Why does flow rate matter for pressure washers?",
    answer:
      "Flow rate affects how much water reaches the cleaning surface and therefore influences rinsing ability and cleaning speed. It also needs to be matched with the correct nozzle size, hose and working pressure at the gun.",
  },
  {
    question: "Do I need LPM or GPM for nozzle sizing?",
    answer:
      "Either LPM or GPM can be used for nozzle sizing as long as the calculator or nozzle chart uses the same unit. Australian pump specifications commonly use LPM, while many pressure washer nozzle charts use US GPM.",
  },
  {
    question: "How does flow rate affect hose pressure loss?",
    answer:
      "Higher flow through the same hose length and internal diameter creates more hose pressure loss. When LPM or GPM increases, check the hose size and length so the setup can still deliver the required working pressure at the gun.",
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
        "LPM to GPM conversion",
        "GPM to LPM conversion",
        "litres per minute to gallons per minute",
        "pressure washer flow rates",
        "pressure washer nozzle sizing",
        "hose pressure loss",
      ],
    },
    {
      "@type": "WebApplication",
      "@id": `${PAGE_URL}#app`,
      name: "LPM to GPM Converter for Pressure Washers",
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
          name: "LPM to GPM Converter",
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

function formatLpmFromGpm(gpm: number) {
  return formatNumber(gpm * US_GPM_TO_LPM, 2);
}

function formatGpmFromLpm(lpm: number) {
  return formatNumber(lpm * LPM_TO_US_GPM, 2);
}

export default function GpmLpmCalculatorPage() {
  const [gpmInput, setGpmInput] = useState("");
  const [lpmInput, setLpmInput] = useState("15");
  const [lastEdited, setLastEdited] = useState<"gpm" | "lpm">("lpm");
  const [copied, setCopied] = useState(false);

  const lpmInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [copied]);

  const result = useMemo(() => {
    if (lastEdited === "gpm") {
      const gpm = parseFloat(gpmInput);

      if (!Number.isFinite(gpm)) {
        return { gpm: gpmInput, lpm: "" };
      }

      return {
        gpm: gpmInput,
        lpm: formatLpmFromGpm(gpm),
      };
    }

    const lpm = parseFloat(lpmInput);

    if (!Number.isFinite(lpm)) {
      return { gpm: "", lpm: lpmInput };
    }

    return {
      gpm: formatGpmFromLpm(lpm),
      lpm: lpmInput,
    };
  }, [gpmInput, lpmInput, lastEdited]);

  const hasValidResult =
    result.gpm !== "" &&
    result.lpm !== "" &&
    Number.isFinite(parseFloat(result.gpm)) &&
    Number.isFinite(parseFloat(result.lpm));

  function handleGpmChange(value: string) {
    setLastEdited("gpm");
    setGpmInput(value);
    setCopied(false);
  }

  function handleLpmChange(value: string) {
    setLastEdited("lpm");
    setLpmInput(value);
    setCopied(false);
  }

  function handleClear() {
    setGpmInput("");
    setLpmInput("");
    setLastEdited("lpm");
    setCopied(false);
    lpmInputRef.current?.focus();
  }

  function setGpmPreset(value: number) {
    setLastEdited("gpm");
    setGpmInput(String(value));
    setCopied(false);
  }

  function setLpmPreset(value: number) {
    setLastEdited("lpm");
    setLpmInput(String(value));
    setCopied(false);
  }

  function handleSwap() {
    if (!hasValidResult) return;

    if (lastEdited === "gpm") {
      setLpmInput(result.lpm);
      setGpmInput(result.gpm);
      setLastEdited("lpm");
      setCopied(false);
      return;
    }

    setGpmInput(result.gpm);
    setLpmInput(result.lpm);
    setLastEdited("gpm");
    setCopied(false);
  }

  async function handleCopyResult() {
    if (!hasValidResult) return;

    try {
      await navigator.clipboard.writeText(
        `${result.lpm} LPM = ${result.gpm} GPM (US)`
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
                Pressure washer flow conversion
              </div>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                LPM to GPM Converter for Pressure Washers
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Convert pressure washer flow rates between LPM and GPM. Enter
                litres per minute or US gallons per minute to compare pump flow,
                nozzle sizing and setup performance.
              </p>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                GPM on this page means US gallons per minute, matching the unit
                used by most pressure washer nozzle charts, US pump specifications
                and overseas equipment listings.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="lpm"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  LPM
                </label>
                <input
                  ref={lpmInputRef}
                  id="lpm"
                  type="number"
                  inputMode="decimal"
                  autoFocus
                  value={lastEdited === "lpm" ? lpmInput : result.lpm}
                  onChange={(e) => handleLpmChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  placeholder="Enter LPM"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="gpm"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  GPM (US)
                </label>
                <input
                  id="gpm"
                  type="number"
                  inputMode="decimal"
                  value={lastEdited === "gpm" ? gpmInput : result.gpm}
                  onChange={(e) => handleGpmChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  placeholder="Enter GPM (US)"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
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
                onClick={handleSwap}
                disabled={!hasValidResult}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Swap
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
                      Converted Flow
                    </p>

                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <div className="rounded-2xl bg-blue-600 px-4 py-3 text-white shadow-sm">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">
                          LPM
                        </div>
                        <div className="mt-1 text-3xl font-bold tracking-tight">
                          {result.lpm}
                        </div>
                      </div>

                      <div className="pb-2 text-2xl font-semibold text-slate-400">
                        =
                      </div>

                      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-blue-100">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          GPM (US)
                        </div>
                        <div className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                          {result.gpm}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600 md:max-w-xs">
                    Use the converted flow to compare pump specifications, nozzle
                    charts and pressure washer setup calculations that use a
                    different flow unit.
                  </div>
                </div>

                <CalculationExplainer
                  className="mt-5"
                  formula={
                    lastEdited === "gpm"
                      ? "LPM = US GPM × 3.78541"
                      : "US GPM = LPM × 0.264172"
                  }
                  inputs={[
                    {
                      label: "Entered flow",
                      value:
                        lastEdited === "gpm"
                          ? `${gpmInput} GPM (US)`
                          : `${lpmInput} LPM`,
                    },
                  ]}
                  results={[
                    {
                      label: "Converted flow",
                      value: `${result.lpm} LPM = ${result.gpm} GPM (US)`,
                    },
                    {
                      label: "Rounded result",
                      value:
                        lastEdited === "gpm"
                          ? `${result.lpm} LPM`
                          : `${result.gpm} GPM (US)`,
                    },
                  ]}
                  explanation={
                    <p>
                      PressureCal converts the entered flow into the opposite unit
                      so operators can compare Australian LPM ratings with US GPM
                      figures used on many nozzle charts, pumps, manuals and
                      overseas specifications.
                    </p>
                  }
                  disclaimer={
                    <p>
                      This is a direct flow-unit conversion. Actual pressure washer
                      flow may vary with pump condition, engine speed, nozzle size,
                      unloader operation, restrictions and water supply.
                    </p>
                  }
                />
              </div>
            )}

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-medium text-slate-700">
                  Quick LPM presets
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickLpmExamples.map((value) => {
                    const isActive =
                      lastEdited === "lpm" && lpmInput === String(value);

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setLpmPreset(value)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition active:scale-[0.98] ${
                          isActive
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {value} LPM
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-slate-700">
                  Quick GPM (US) presets
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickGpmExamples.map((value) => {
                    const isActive =
                      lastEdited === "gpm" && gpmInput === String(value);

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setGpmPreset(value)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition active:scale-[0.98] ${
                          isActive
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {value} GPM
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              How to convert LPM and GPM
            </h2>

            <div className="mt-4 grid gap-5 md:grid-cols-[1fr_0.9fr]">
              <div className="space-y-4 text-sm leading-7 text-slate-600">
                <p>
                  Pressure washer flow is often listed in LPM in Australia and
                  GPM in US-based nozzle charts, pump specifications and online
                  calculators. Converting between LPM and GPM helps you compare
                  equipment without mixing flow units.
                </p>

                <p>
                  To convert US GPM to LPM, multiply by 3.78541. To convert LPM
                  to US GPM, multiply by 0.264172. The converter above applies
                  the formula instantly and rounds the displayed result to two
                  decimal places.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <h3 className="text-base font-semibold text-slate-900">
                  Conversion formulas
                </h3>
                <p className="mt-3 text-sm text-slate-600">
                  1 US GPM = 3.78541 LPM
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  1 LPM = 0.264172 US GPM
                </p>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Example: 21 LPM × 0.264172 = 5.55 US GPM when rounded to two
                  decimal places.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Common pressure washer flow conversions
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              Use these common LPM and US GPM conversions when comparing pressure
              washer pumps, machine ratings, nozzle charts and equipment
              specifications. Values are rounded to two decimal places.
            </p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-900">
                        LPM
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-900">
                        GPM (US)
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-900">
                        Common use or context
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {commonFlowConversions.map((row) => (
                      <tr key={`${row.lpm}-${row.gpm}`}>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                          {row.lpm}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {row.gpm}
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
              Practical LPM and GPM examples
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              These are common pressure washer flow conversions operators need
              when matching Australian specifications with US pump data and
              nozzle charts.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {conversionExamples.map((example) => (
                <div
                  key={example.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <h3 className="text-base font-semibold text-slate-900">
                    {example.title}
                  </h3>
                  <p className="mt-2 text-lg font-semibold text-blue-700">
                    {example.result}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {example.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Why flow rate matters for pressure washers
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
              <p>
                Flow rate is the volume of water a pressure washer pump delivers.
                More usable flow generally improves rinsing and cleaning speed,
                especially when moving dirt and debris across larger surfaces.
                Pressure and flow work together, so a higher PSI figure alone does
                not describe the full performance of a setup.
              </p>

              <p>
                Pump flow also affects nozzle size. The nozzle must be matched to
                the available LPM or GPM and the required pressure. A nozzle that
                is too small can overload the pump or force the unloader to bypass,
                while a nozzle that is too large can reduce working pressure at the
                gun.
              </p>

              <p>
                Flow rate also changes hose pressure loss. Pushing more LPM or GPM
                through the same hose length and internal diameter increases the
                pressure lost before the water reaches the gun. That is why flow,
                nozzle size, hose pressure loss and working pressure at the gun
                should be checked together when modelling a pressure washer setup.
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
              A flow conversion is useful for comparing specifications. Use these
              related tools when you need to model nozzle size, hose pressure loss,
              pressure units and working pressure at the gun across the full setup.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                to="/calculator"
                className="rounded-2xl border border-slate-200 bg-slate-900 px-5 py-4 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Full Pressure Washer Setup Calculator
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-300">
                  Model pump flow, hose pressure loss, nozzle size and working
                  pressure at the gun together.
                </span>
              </Link>

              <Link
                to="/nozzle-size-calculator"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              >
                Pressure Washer Nozzle Size Calculator
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                  Match pressure and flow to the correct pressure washer nozzle or
                  nozzle / tip code.
                </span>
              </Link>

              <Link
                to="/hose-pressure-loss-calculator"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              >
                Hose Pressure Loss Calculator
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                  Estimate hose pressure loss from flow, hose length and internal
                  diameter.
                </span>
              </Link>

              <Link
                to="/psi-bar-calculator"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              >
                PSI to BAR Converter
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                  Convert pressure washer ratings between PSI, BAR, MPa and kPa.
                </span>
              </Link>

              <Link
                to="/nozzle-size-chart"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-800 transition hover:bg-slate-100 sm:col-span-2"
              >
                Pressure Washer Nozzle Size Chart
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                  Compare nozzle / tip codes by pressure and flow, including US GPM
                  chart values.
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
