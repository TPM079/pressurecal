import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useMemo, useRef, useState, useEffect } from "react";
import PressureCalLayout from "../components/PressureCalLayout";
import BackToTopButton from "../components/BackToTopButton";

const PSI_TO_BAR = 0.0689476;
const BAR_TO_PSI = 14.5038;

function formatNumber(value: number, maxDecimals = 4) {
  if (!Number.isFinite(value)) return "";
  return parseFloat(value.toFixed(maxDecimals)).toString();
}

function formatPsiToBar(psi: number) {
  return formatNumber(psi * PSI_TO_BAR, 2);
}

function formatBarToPsi(bar: number) {
  return formatNumber(bar * BAR_TO_PSI, 0);
}

export default function PsiBarCalculatorPage() {
  const [psiInput, setPsiInput] = useState("");
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

  const quickPsiExamples = [1000, 3000, 4000, 5000];
  const quickBarExamples = [100, 200, 250, 300];

  return (
    <PressureCalLayout>
      <Helmet>
        <title>PSI to BAR Converter for Pressure Washers | PressureCal</title>
        <meta
          name="description"
          content="Convert PSI to BAR and BAR to PSI for pressure washer setups, pumps, gauges, and machine specs. Useful for comparing manuals, nozzles, and pressure ratings."
        />
        <link
          rel="canonical"
          href="https://www.pressurecal.com/psi-bar-calculator"
        />
        <meta
          property="og:title"
          content="PSI to BAR Converter for Pressure Washers | PressureCal"
        />
        <meta
          property="og:description"
          content="Convert PSI to BAR and BAR to PSI for pressure washer setups, pumps, gauges, and machine specs. Useful for comparing manuals, nozzles, and pressure ratings."
        />
        <meta
          property="og:url"
          content="https://www.pressurecal.com/psi-bar-calculator"
        />
        <meta property="og:type" content="website" />
        <meta
          name="twitter:title"
          content="PSI to BAR Converter for Pressure Washers | PressureCal"
        />
        <meta
          name="twitter:description"
          content="Convert PSI to BAR and BAR to PSI for pressure washer setups, pumps, gauges, and machine specs. Useful for comparing manuals, nozzles, and pressure ratings."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "PSI to BAR Converter",
            url: "https://www.pressurecal.com/psi-bar-calculator",
            applicationCategory: "Converter",
            operatingSystem: "Web",
            description:
              "Convert PSI to BAR and BAR to PSI for pressure washer setups, pumps, gauges, and machine specs. Useful for comparing manuals, nozzles, and pressure ratings.",
          })}
        </script>
      </Helmet>

      <div className="-mx-4 -my-8 bg-slate-100 px-4 py-8 sm:-my-10 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                Pressure Conversion
              </div>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                PSI to BAR Converter
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Convert PSI to BAR and BAR to PSI for pressure washer setups,
                pumps, gauges, and machine specifications.
              </p>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Useful for comparing Australian and overseas pressure ratings,
                checking machine specs, and cross-referencing manuals, nozzles,
                and component data.
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
                    Useful for comparing machine specs, gauges, manuals, and mixed-unit equipment.
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

            <div className="mt-8 rounded-2xl bg-slate-50 p-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Conversion formulas
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                BAR = PSI × 0.0689476
              </p>
              <p className="text-sm text-slate-600">PSI = BAR × 14.5038</p>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold text-slate-900">
                Common pressure conversions
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {quickPsiExamples.map((value) => (
                  <div
                    key={`psi-${value}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      PSI to BAR
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {value} PSI = {formatPsiToBar(value)} BAR
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {quickBarExamples.map((value) => (
                  <div
                    key={`bar-${value}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      BAR to PSI
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {value} BAR = {formatBarToPsi(value)} PSI
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Why PSI and BAR both matter
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
              <p>
                PSI and BAR are both common pressure units in the pressure
                washing industry. Machines, pumps, unloaders, gauges, and
                manuals may use one or the other depending on the brand,
                market, or country of origin.
              </p>

              <p>
                This converter is useful when you need to compare mixed-spec
                equipment, cross-check machine ratings, or move between
                Australian and overseas pressure references.
              </p>

              <p>
                For PressureCal, PSI comes first because that matches how many
                operators talk about machine pressure in practice, while BAR is
                still important for manuals, parts, and international specs.
              </p>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              FAQ
            </h2>

            <div className="mt-5 space-y-5 text-sm leading-7 text-slate-600">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  What is 4000 PSI in BAR?
                </h3>
                <p className="mt-2">
                  4000 PSI is approximately {formatPsiToBar(4000)} BAR.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  What is 250 BAR in PSI?
                </h3>
                <p className="mt-2">
                  250 BAR is approximately {formatBarToPsi(250)} PSI.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Why do some pressure washers use PSI and others use BAR?
                </h3>
                <p className="mt-2">
                  It usually depends on the market, brand, or source material.
                  PSI is common in many pressure washing conversations, while
                  BAR is common on European equipment and technical documents.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  When should I use this instead of the main calculator?
                </h3>
                <p className="mt-2">
                  Use this page when you only need a quick pressure conversion.
                  If you need nozzle sizing, hose loss, or full setup behaviour,
                  use the main PressureCal tools.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Related tools
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              Need more than a quick conversion? Move into the live tools:
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/lpm-gpm-calculator"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                LPM ↔ GPM Calculator
              </Link>

              <Link
                to="/nozzle-size-calculator"
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Nozzle Size Calculator
              </Link>

              <Link
                to="/hose-pressure-loss-calculator"
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Hose Pressure Loss Calculator
              </Link>

              <Link
                to="/calculator"
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Full Setup Calculator
              </Link>
            </div>
          </section>

          <BackToTopButton />
        </div>
      </div>
    </PressureCalLayout>
  );
}
