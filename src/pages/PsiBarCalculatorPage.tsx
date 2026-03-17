import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import PressureCalLayout from "../components/PressureCalLayout";

const PSI_TO_BAR = 0.0689476;
const BAR_TO_PSI = 14.5038;

function formatNumber(value: number, maxDecimals = 4) {
  if (!Number.isFinite(value)) return "";
  return parseFloat(value.toFixed(maxDecimals)).toString();
}

export default function PsiBarCalculatorPage() {
  const [psiInput, setPsiInput] = useState("");
  const [barInput, setBarInput] = useState("");
  const [lastEdited, setLastEdited] = useState<"psi" | "bar">("psi");
  const [copied, setCopied] = useState(false);

  const psiInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.title = "PSI to BAR Calculator | PressureCal";
  }, []);

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
  }

  function handleBarChange(value: string) {
    setLastEdited("bar");
    setBarInput(value);
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
      return;
    }

    setPsiInput(result.psi);
    setBarInput(result.bar);
    setLastEdited("psi");
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
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Pressure Conversion
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              PSI ↔ BAR Calculator
            </h1>
            <p className="mt-3 text-base text-slate-600">
              Convert pressure instantly between PSI and BAR for pressure
              washing, pump setup, machine specifications, and equipment
              calibration.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
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
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
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
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Result
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {result.psi} PSI = {result.bar} BAR
              </p>
            </div>
          )}

          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-slate-700">
              Quick PSI presets
            </p>
            <div className="flex flex-wrap gap-2">
              {[1000, 2000, 3000, 4000, 5000].map((value) => {
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

          <div className="mt-4">
            <p className="mb-3 text-sm font-medium text-slate-700">
              Quick BAR presets
            </p>
            <div className="flex flex-wrap gap-2">
              {[70, 100, 150, 200, 250].map((value) => {
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

          <div className="mt-8 rounded-2xl bg-slate-50 p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Conversion formulas
            </h2>
            <p className="mt-2 text-sm text-slate-600">BAR = PSI × 0.0689476</p>
            <p className="text-sm text-slate-600">PSI = BAR × 14.5038</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Example
              </p>
              <p className="mt-2 text-sm text-slate-700">1000 PSI = 68.95 BAR</p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Example
              </p>
              <p className="mt-2 text-sm text-slate-700">3000 PSI = 206.84 BAR</p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Example
              </p>
              <p className="mt-2 text-sm text-slate-700">250 BAR = 3626 PSI</p>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-lg font-semibold text-slate-900">
            PSI to BAR Conversion
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            PSI and BAR are common pressure units used across pressure washing
            equipment, pumps, unloaders, gauges, and industrial systems. This
            calculator helps operators and equipment builders quickly convert
            between PSI and BAR for setup, troubleshooting, and accurate machine
            calibration.
          </p>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">
              Related Calculators
            </h3>
            <div className="mt-3 flex flex-wrap gap-3">
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
    </PressureCalLayout>
  );
}