import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import PressureCalLayout from "../components/PressureCalLayout";
import BackToTopButton from "../components/BackToTopButton";

const GPM_TO_LPM = 3.78541;
const LPM_TO_GPM = 0.264172;

function formatNumber(value: number, maxDecimals = 4) {
  if (!Number.isFinite(value)) return "";
  return parseFloat(value.toFixed(maxDecimals)).toString();
}

function formatLpmFromGpm(gpm: number) {
  return formatNumber(gpm * GPM_TO_LPM, 2);
}

function formatGpmFromLpm(lpm: number) {
  return formatNumber(lpm * LPM_TO_GPM, 2);
}

export default function GpmLpmCalculatorPage() {
  const [gpmInput, setGpmInput] = useState("");
  const [lpmInput, setLpmInput] = useState("");
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
        lpm: formatNumber(gpm * GPM_TO_LPM, 4),
      };
    }

    const lpm = parseFloat(lpmInput);

    if (!Number.isFinite(lpm)) {
      return { gpm: "", lpm: lpmInput };
    }

    return {
      gpm: formatNumber(lpm * LPM_TO_GPM, 4),
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
        `${result.lpm} LPM = ${result.gpm} GPM`
      );
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const quickLpmExamples = [8, 15, 21, 30];
  const quickGpmExamples = [2, 4, 5.5, 8];

  return (
    <PressureCalLayout>
      <Helmet>
        <title>LPM to GPM Converter for Pressure Washers | PressureCal</title>
        <meta
          name="description"
          content="Convert LPM to GPM and GPM to LPM for pressure washer setups, pumps, nozzles, and machine specs. Useful for comparing Australian and overseas flow ratings."
        />
        <link
          rel="canonical"
          href="https://www.pressurecal.com/lpm-gpm-calculator"
        />
        <meta
          property="og:title"
          content="LPM to GPM Converter for Pressure Washers | PressureCal"
        />
        <meta
          property="og:description"
          content="Convert LPM to GPM and GPM to LPM for pressure washer setups, pumps, nozzles, and machine specs. Useful for comparing Australian and overseas flow ratings."
        />
        <meta
          property="og:url"
          content="https://www.pressurecal.com/lpm-gpm-calculator"
        />
        <meta property="og:type" content="website" />
        <meta
          name="twitter:title"
          content="LPM to GPM Converter for Pressure Washers | PressureCal"
        />
        <meta
          name="twitter:description"
          content="Convert LPM to GPM and GPM to LPM for pressure washer setups, pumps, nozzles, and machine specs. Useful for comparing Australian and overseas flow ratings."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "LPM to GPM Converter",
            url: "https://www.pressurecal.com/lpm-gpm-calculator",
            applicationCategory: "Converter",
            operatingSystem: "Web",
            description:
              "Convert LPM to GPM and GPM to LPM for pressure washer setups, pumps, nozzles, and machine specs. Useful for comparing Australian and overseas flow ratings.",
          })}
        </script>
      </Helmet>

      <div className="-mx-4 -my-8 bg-slate-100 px-4 py-8 sm:-my-10 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                Flow Conversion
              </div>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                LPM to GPM Converter
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Convert LPM to GPM and GPM to LPM for pressure washer setups,
                pumps, nozzles, and machine specifications.
              </p>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Useful for comparing Australian and overseas flow ratings,
                checking machine specs, and matching nozzles and setup changes
                across mixed-unit equipment.
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
                  GPM
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
                  placeholder="Enter GPM"
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
                          GPM
                        </div>
                        <div className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                          {result.gpm}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600 md:max-w-xs">
                    Useful for comparing pumps, machine specs, nozzle matching,
                    and mixed-unit flow ratings.
                  </div>
                </div>
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
                  Quick GPM presets
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

            <div className="mt-8 rounded-2xl bg-slate-50 p-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Conversion formulas
              </h2>
              <p className="mt-2 text-sm text-slate-600">LPM = GPM × 3.78541</p>
              <p className="text-sm text-slate-600">GPM = LPM × 0.264172</p>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold text-slate-900">
                Common flow conversions
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {quickGpmExamples.map((value) => (
                  <div
                    key={`gpm-${value}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      GPM to LPM
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {value} GPM = {formatLpmFromGpm(value)} LPM
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {quickLpmExamples.map((value) => (
                  <div
                    key={`lpm-${value}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      LPM to GPM
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {value} LPM = {formatGpmFromLpm(value)} GPM
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Why LPM and GPM both matter
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
              <p>
                LPM and GPM are both common flow-rate units in the pressure
                washing industry. Pumps, nozzles, machines, and manuals may use
                one or the other depending on the brand, market, or country of
                origin.
              </p>

              <p>
                This converter is useful when you need to compare mixed-spec
                equipment, cross-check machine ratings, or move between
                Australian and overseas flow references.
              </p>

              <p>
                For PressureCal, LPM comes first because that matches how many
                operators think about machine flow in practice, while GPM is
                still important for manuals, parts, and overseas specs.
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
                  What is 4 GPM in LPM?
                </h3>
                <p className="mt-2">
                  4 GPM is approximately {formatLpmFromGpm(4)} LPM.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  What is 5.5 GPM in LPM?
                </h3>
                <p className="mt-2">
                  5.5 GPM is approximately {formatLpmFromGpm(5.5)} LPM.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  What is 21 LPM in GPM?
                </h3>
                <p className="mt-2">
                  21 LPM is approximately {formatGpmFromLpm(21)} GPM.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  When should I use this instead of the main calculator?
                </h3>
                <p className="mt-2">
                  Use this page when you only need a quick flow conversion. If
                  you need nozzle sizing, hose loss, or full setup behaviour,
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
                to="/psi-bar-calculator"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                PSI ↔ BAR Calculator
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
