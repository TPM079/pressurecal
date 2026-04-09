import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import PressureCalLayout from "../components/PressureCalLayout";

const GPM_TO_LPM = 3.78541;
const LPM_TO_GPM = 0.264172;

function formatNumber(value: number, maxDecimals = 4) {
  if (!Number.isFinite(value)) return "";
  return parseFloat(value.toFixed(maxDecimals)).toString();
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
  }

  function handleLpmChange(value: string) {
    setLastEdited("lpm");
    setLpmInput(value);
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
      return;
    }

    setGpmInput(result.gpm);
    setLpmInput(result.lpm);
    setLastEdited("gpm");
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

  return (
    <PressureCalLayout>
      <>
        <Helmet>
          <title>LPM ↔ GPM Converter | PressureCal</title>
          <meta
            name="description"
            content="Convert LPM to GPM and GPM to LPM instantly. Accurate flow conversion for pressure washers, pumps, and equipment sizing."
          />
          <link
            rel="canonical"
            href="https://www.pressurecal.com/lpm-gpm-calculator"
          />
          <meta
            property="og:title"
            content="LPM ↔ GPM Converter | PressureCal"
          />
          <meta
            property="og:description"
            content="Convert LPM to GPM and GPM to LPM instantly. Accurate flow conversion for pressure washers, pumps, and equipment sizing."
          />
          <meta
            property="og:url"
            content="https://www.pressurecal.com/lpm-gpm-calculator"
          />
          <meta property="og:type" content="website" />
          <meta
            name="twitter:title"
            content="LPM ↔ GPM Converter | PressureCal"
          />
          <meta
            name="twitter:description"
            content="Convert LPM to GPM and GPM to LPM instantly. Accurate flow conversion for pressure washers, pumps, and equipment sizing."
          />
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "LPM ↔ GPM Converter",
              url: "https://www.pressurecal.com/lpm-gpm-calculator",
              applicationCategory: "Converter",
              operatingSystem: "Web",
              description:
                "Convert LPM to GPM and GPM to LPM instantly. Accurate flow conversion for pressure washers, pumps, and equipment sizing.",
            })}
          </script>
        </Helmet>

        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Flow Conversion
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                LPM ↔ GPM Converter
              </h1>
              <p className="mt-3 text-base text-slate-600">
                Convert flow instantly between LPM and GPM for pressure washing,
                pump sizing, machine specifications, and system setup.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
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
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
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
              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Result
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {result.lpm} LPM = {result.gpm} GPM
                </p>
              </div>
            )}

            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-slate-700">
                Quick LPM presets
              </p>
              <div className="flex flex-wrap gap-2">
                {[8, 15, 21, 30, 40].map((value) => {
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

            <div className="mt-4">
              <p className="mb-3 text-sm font-medium text-slate-700">
                Quick GPM presets
              </p>
              <div className="flex flex-wrap gap-2">
                {[2, 4, 5.5, 8, 10].map((value) => {
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

            <div className="mt-8 rounded-2xl bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Conversion formulas
              </h2>
              <p className="mt-2 text-sm text-slate-600">LPM = GPM × 3.78541</p>
              <p className="text-sm text-slate-600">GPM = LPM × 0.264172</p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Example
                </p>
                <p className="mt-2 text-sm text-slate-700">4 GPM = 15.14 LPM</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Example
                </p>
                <p className="mt-2 text-sm text-slate-700">8 GPM = 30.28 LPM</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Example
                </p>
                <p className="mt-2 text-sm text-slate-700">21 LPM = 5.55 GPM</p>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-lg font-semibold text-slate-900">
              LPM to GPM Conversion
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              LPM and GPM are common flow rate units used in pressure washing
              systems, pumps, nozzles, and equipment specifications. This
              calculator helps operators and equipment builders quickly convert
              between LPM and GPM for setup, troubleshooting, and accurate
              machine matching.
            </p>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-900">
                Related Calculators
              </h3>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  to="/psi-bar-calculator"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]"
                >
                  PSI ↔ BAR Calculator
                </Link>

                <Link
                  to="/nozzle-size-calculator"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]"
                >
                  Nozzle Size Calculator
                </Link>

                <Link
                  to="/hose-pressure-loss-calculator"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]"
                >
                  Hose Pressure Loss Calculator
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    </PressureCalLayout>
  );
}
