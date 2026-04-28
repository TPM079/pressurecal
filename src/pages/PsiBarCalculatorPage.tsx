import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import PressureCalLayout from "../components/PressureCalLayout";
import BackToTopButton from "../components/BackToTopButton";

const PSI_TO_BAR = 0.0689476;
const BAR_TO_PSI = 14.5038;

const PAGE_URL = "https://www.pressurecal.com/psi-bar-calculator";
const SEO_TITLE = "4000 PSI to BAR Converter | PSI ↔ BAR | PressureCal";
const SEO_DESCRIPTION =
  "4000 PSI = 275.79 BAR. Convert any PSI or BAR rating for pressure washer pumps, gauges, nozzles, unloaders and machine specs.";

function formatNumber(value: number, maxDecimals = 4) {
  if (!Number.isFinite(value)) return "";
  return parseFloat(value.toFixed(maxDecimals)).toString();
}

function formatPsiToBar(psi: number, maxDecimals = 2) {
  return formatNumber(psi * PSI_TO_BAR, maxDecimals);
}

type ConversionRow = {
  psi: number;
  context: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

const quickPsiExamples = [1000, 3000, 4000, 5000];
const quickBarExamples = [100, 200, 250, 300];

const popularPsiConversions: ConversionRow[] = [
  {
    psi: 1000,
    context: "Low pressure checks, rinsing, and light-duty references",
  },
  {
    psi: 1500,
    context: "Common small electric pressure washer range",
  },
  {
    psi: 2000,
    context: "Light commercial and general cleaning references",
  },
  {
    psi: 2500,
    context: "General pressure cleaner comparisons",
  },
  {
    psi: 3000,
    context: "Common petrol pressure washer rating",
  },
  {
    psi: 3200,
    context: "Popular contractor and trade machine rating",
  },
  {
    psi: 3500,
    context: "Commercial pressure cleaner reference point",
  },
  {
    psi: 4000,
    context: "Common contractor pressure washer rating",
  },
  {
    psi: 4200,
    context: "High-pressure contractor machine comparison",
  },
  {
    psi: 5000,
    context: "High-pressure specialist equipment reference",
  },
  {
    psi: 6000,
    context: "Industrial pressure system comparison",
  },
  {
    psi: 7300,
    context: "Approximate 500 BAR reference",
  },
];

const faqs: FaqItem[] = [
  {
    question: "What is 4000 PSI in BAR?",
    answer:
      "4000 PSI is approximately 275.79 BAR. For pressure washer work, that is commonly rounded to 276 BAR when comparing machine ratings, pumps, gauges, nozzles, and manuals.",
  },
  {
    question: "How do you convert PSI to BAR?",
    answer:
      "Multiply the PSI value by 0.0689476. For example, 4000 PSI × 0.0689476 = 275.7904 BAR, which rounds to 275.79 BAR.",
  },
  {
    question: "How do you convert BAR to PSI?",
    answer:
      "Multiply the BAR value by 14.5038. For example, 250 BAR × 14.5038 = 3625.95 PSI, which is usually rounded to 3626 PSI.",
  },
  {
    question: "Is 4000 PSI the same as 275 BAR?",
    answer:
      "4000 PSI is slightly higher than 275 BAR. The exact conversion is 275.79 BAR, but 275 BAR is often close enough for quick pressure washer spec comparisons.",
  },
  {
    question: "Why do pressure washers use both PSI and BAR?",
    answer:
      "It depends on the brand, market, gauge, manual, or component. Many operators talk in PSI, while European equipment, pump data plates, and some manuals often use BAR.",
  },
  {
    question: "Should I use rated pressure or working pressure?",
    answer:
      "Use rated pressure for a quick spec comparison, but use measured working pressure when checking real machine performance. Hose length, hose ID, fittings, nozzle size, unloader setting, and nozzle wear can all change what you actually see at the gun.",
  },
  {
    question: "Does converting PSI to BAR tell me cleaning performance?",
    answer:
      "Not by itself. Pressure is only one part of a pressure washer setup. Flow rate, nozzle size, hose pressure loss, surface cleaner size, and at-gun pressure all affect real-world performance.",
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
        "pressure washer pressure ratings",
        "pressure washer calculators",
      ],
    },
    {
      "@type": "WebApplication",
      "@id": `${PAGE_URL}#app`,
      name: "PSI to BAR Converter",
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
          name: "PSI to BAR Calculator",
          item: PAGE_URL,
        },
      ],
    },
  ],
};

export default function PsiBarCalculatorPage() {
  const [psiInput, setPsiInput] = useState("4000");
  const [barInput, setBarInput] = useState("");
  const [lastEdited, setLastEdited] = useState<"psi" | "bar">("psi");
  const [copied, setCopied] = useState(false);

  const psiInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [copied]);

  const result = useMemo(() => {
    if (lastEdited === "psi") {
      const psi = parseFloat(psiInput);

      if (!Number.isFinite(psi)) {
        return { psi: psiInput, bar: "" };
      }

      return {
        psi: psiInput,
        bar: formatNumber(psi * PSI_TO_BAR, 4),
      };
    }

    const bar = parseFloat(barInput);

    if (!Number.isFinite(bar)) {
      return { psi: "", bar: barInput };
    }

    return {
      psi: formatNumber(bar * BAR_TO_PSI, 2),
      bar: barInput,
    };
  }, [psiInput, barInput, lastEdited]);

  const hasValidResult =
    result.psi !== "" &&
    result.bar !== "" &&
    Number.isFinite(parseFloat(result.psi)) &&
    Number.isFinite(parseFloat(result.bar));

  function handlePsiChange(value: string) {
    setLastEdited("psi");
    setPsiInput(value);
    setCopied(false);
  }

  function handleBarChange(value: string) {
    setLastEdited("bar");
    setBarInput(value);
    setCopied(false);
  }

  function handleClear() {
    setPsiInput("");
    setBarInput("");
    setLastEdited("psi");
    setCopied(false);
    psiInputRef.current?.focus();
  }

  function setPsiPreset(value: number) {
    setLastEdited("psi");
    setPsiInput(String(value));
    setCopied(false);
  }

  function setBarPreset(value: number) {
    setLastEdited("bar");
    setBarInput(String(value));
    setCopied(false);
  }

  function handleSwap() {
    if (!hasValidResult) return;

    if (lastEdited === "psi") {
      setBarInput(result.bar);
      setPsiInput(result.psi);
      setLastEdited("bar");
      setCopied(false);
      return;
    }

    setPsiInput(result.psi);
    setBarInput(result.bar);
    setLastEdited("psi");
    setCopied(false);
  }

  async function handleCopyResult() {
    if (!hasValidResult) return;

    try {
      await navigator.clipboard.writeText(
        `${result.psi} PSI = ${result.bar} BAR`
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
                PSI to BAR Converter
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Convert PSI to BAR or BAR to PSI for pressure washer pumps,
                gauges, nozzles, unloaders, manuals, and machine ratings.
              </p>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Built for operators who need quick pressure conversions without
                losing the pressure-washing context. Useful when a machine,
                pump, gauge, or parts manual lists pressure in a different unit.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="psi"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  PSI
                </label>
                <input
                  ref={psiInputRef}
                  id="psi"
                  type="number"
                  inputMode="decimal"
                  autoFocus
                  value={lastEdited === "psi" ? psiInput : result.psi}
                  onChange={(e) => handlePsiChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  placeholder="Enter PSI"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="bar"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  BAR
                </label>
                <input
                  id="bar"
                  type="number"
                  inputMode="decimal"
                  value={lastEdited === "bar" ? barInput : result.bar}
                  onChange={(e) => handleBarChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  placeholder="Enter BAR"
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
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600 md:max-w-xs">
                    Use this as a pressure rating conversion. For real at-gun
                    performance, also check hose loss, nozzle size, and flow.
                  </div>
                </div>
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
                      lastEdited === "psi" && psiInput === String(value);

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPsiPreset(value)}
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
                      lastEdited === "bar" && barInput === String(value);

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setBarPreset(value)}
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
                  4000 PSI to BAR: 4000 PSI = 275.79 BAR
                </h2>

                <p className="mt-4 text-sm leading-7 text-slate-700">
                  If you are comparing a 4000 PSI pressure washer against a
                  pump, gauge, unloader, or manual listed in BAR, the direct
                  conversion is 275.79 BAR. In the field, this is often rounded
                  to about 276 BAR.
                </p>

                <p className="mt-3 text-sm leading-7 text-slate-700">
                  Formula: 4000 × 0.0689476 = 275.7904 BAR.
                </p>
              </div>

              <div className="rounded-3xl border border-blue-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">
                  4000 PSI conversion card
                </div>

                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      PSI
                    </div>
                    <div className="mt-1 text-3xl font-bold text-slate-900">
                      4000
                    </div>
                  </div>

                  <div className="text-xl font-semibold text-slate-400">=</div>

                  <div className="rounded-2xl bg-blue-600 p-4 text-center text-white">
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                      BAR
                    </div>
                    <div className="mt-1 text-3xl font-bold">275.79</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPsiPreset(4000)}
                  className="mt-4 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 active:scale-[0.98]"
                >
                  Load 4000 PSI in calculator
                </button>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Popular PSI to BAR conversions
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              These common pressure washer pressure ratings are useful for
              comparing machine labels, pump data plates, gauges, manuals, and
              component specs. Treat the context column as a guide only and
              always stay within manufacturer limits.
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
                        Pressure washer context
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {popularPsiConversions.map((row) => (
                      <tr key={row.psi}>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                          {row.psi} PSI
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {formatPsiToBar(row.psi)} BAR
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
              PSI, BAR, and real pressure washer setup checks
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
              <p>
                PSI and BAR both describe pressure, but a pressure washer setup
                is more than one pressure number. A machine can be advertised at
                4000 PSI, a pump manual may list 275 BAR, and a gauge may show a
                slightly different working pressure once the hose, gun, lance,
                nozzle, and unloader are all in the system.
              </p>

              <p>
                Australian operators often talk in PSI and LPM. Many European
                pumps, unloaders, gauges, and technical sheets use BAR and
                L/min. This page helps bridge those specs so you can compare
                parts and ratings without doing the maths manually.
              </p>

              <p>
                For a quick pressure rating check, this converter is enough. For
                actual setup behaviour, use the related PressureCal tools to
                model nozzle size, hose pressure loss, flow, and at-gun
                pressure together.
              </p>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <h3 className="text-base font-semibold text-slate-900">
                Conversion formulas
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                BAR = PSI × 0.0689476
              </p>
              <p className="text-sm text-slate-600">PSI = BAR × 14.5038</p>
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
              Pressure conversion is only the first check. Use these tools when
              you need to understand what the full pressure washer setup is
              actually doing.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                to="/lpm-gpm-calculator"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              >
                LPM ↔ GPM Calculator
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                  Convert flow ratings between Australian-style LPM and GPM.
                </span>
              </Link>

              <Link
                to="/nozzle-size-calculator"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              >
                Nozzle Size Calculator
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                  Match pressure and flow to the correct pressure washer nozzle.
                </span>
              </Link>

              <Link
                to="/hose-pressure-loss-calculator"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              >
                Hose Pressure Loss Calculator
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                  Estimate pressure drop through hose length and hose ID.
                </span>
              </Link>

              <Link
                to="/calculator"
                className="rounded-2xl border border-slate-200 bg-slate-900 px-5 py-4 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Full Pressure Washer Setup Calculator
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-300">
                  Model pump, hose, nozzle, flow, and at-gun pressure together.
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
