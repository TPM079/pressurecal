import { Helmet } from "react-helmet-async";
import { useEffect, useRef, useState, type FocusEvent } from "react";
import BackToTopButton from "../components/BackToTopButton";
import PressureCalLayout from "../components/PressureCalLayout";
import { buildFullRigSearchParams, parseRigSearchParams } from "../lib/rigUrlState";
import { solvePressureCal, barFromPsi, lpmFromGpm, roundTipCodeToFive } from "../pressurecal";
import type { Inputs, PressureUnit, FlowUnit, LengthUnit, DiameterUnit } from "../pressurecal";

const hosePresets = [
  { label: '1/4" (6.35 mm)', valueMm: 6.35 },
  { label: '5/16" (7.94 mm)', valueMm: 7.94 },
  { label: '3/8" (9.53 mm)', valueMm: 9.53 },
  { label: '1/2" (12.70 mm)', valueMm: 12.7 },
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

function fmt(n: number, dp: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dp);
}
function toPsi(value: number, unit: PressureUnit) { return unit === "psi" ? value : value * 14.5037738; }
function toGpm(value: number, unit: FlowUnit) { return unit === "gpm" ? value : value / 3.785411784; }
function fromPsi(value: number, unit: PressureUnit) { return unit === "psi" ? value : value / 14.5037738; }
function fromGpm(value: number, unit: FlowUnit) { return unit === "gpm" ? value : value * 3.785411784; }
function toMeters(value: number, unit: LengthUnit) { return unit === "m" ? value : value / 3.28084; }
function fromMeters(value: number, unit: LengthUnit) { return unit === "m" ? value : value * 3.28084; }
function roundForUnit(value: number, decimals: number) { return Number(value.toFixed(decimals)); }
function selectAllOnFocus(e: FocusEvent<HTMLInputElement>) { e.target.select(); }
function calculateRequiredHp(pressurePsi: number, flowGpm: number, efficiency = 0.9) {
  if (!Number.isFinite(pressurePsi) || !Number.isFinite(flowGpm) || efficiency <= 0) return 0;
  return (pressurePsi * flowGpm) / (1714 * efficiency);
}
function calculateUsableEngineHp(ratedHp: number, factor = 0.85) { return !Number.isFinite(ratedHp) || ratedHp <= 0 ? 0 : ratedHp * factor; }
function hpStatus(requiredHp: number, usableHp: number) {
  if (usableHp <= 0) return { text: "Enter engine HP to evaluate power status.", cls: "bg-slate-50 text-slate-700 border-slate-200" };
  if (usableHp < requiredHp) return { text: "Engine undersized for this setup.", cls: "bg-red-50 text-red-800 border-red-200" };
  if (usableHp < requiredHp * 1.1) return { text: "Operating near engine limit.", cls: "bg-amber-50 text-amber-900 border-amber-200" };
  return { text: "Engine power looks healthy.", cls: "bg-green-50 text-green-800 border-green-200" };
}
function statusBadge(status: string) {
  if (status === "calibrated") return { text: "Calibrated", cls: "bg-green-50 text-green-800 border-green-200" };
  if (status === "under-calibrated") return { text: "Under-calibrated", cls: "bg-amber-50 text-amber-900 border-amber-200" };
  return { text: "Over-calibrated", cls: "bg-red-50 text-red-800 border-red-200" };
}

export default function FullRigCalculatorPage() {
  const [inputs, setInputs] = useState<Inputs>(() => ({
    ...defaultInputs,
    ...parseRigSearchParams(window.location.search),
  }));
  const [copyMessage, setCopyMessage] = useState("");
  const [highlightSetup, setHighlightSetup] = useState(false);
  const [loadedFromLink, setLoadedFromLink] = useState(false);
  const maxWasManuallyEditedRef = useRef(false);

  useEffect(() => {
    const parsed = parseRigSearchParams(window.location.search);
    if (Object.keys(parsed).length > 0) {
      setHighlightSetup(true);
      setLoadedFromLink(true);

      const timer1 = window.setTimeout(() => setHighlightSetup(false), 1600);
      const timer2 = window.setTimeout(() => setLoadedFromLink(false), 2600);

      return () => {
        window.clearTimeout(timer1);
        window.clearTimeout(timer2);
      };
    }
  }, []);

  useEffect(() => {
    const params = buildFullRigSearchParams(inputs);
    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }, [inputs]);

  const safeInputs = {
    ...inputs,
    pumpPressure: Number(inputs.pumpPressure || 0),
    pumpFlow: Number(inputs.pumpFlow || 0),
    maxPressure: Number(inputs.maxPressure || 0),
    hoseLength: Number(inputs.hoseLength || 0),
    hoseId: Number(inputs.hoseId || 0),
    engineHp: Number(inputs.engineHp || 0),
  };
  const r = solvePressureCal(safeInputs);
  const gunBar = barFromPsi(r.gunPressurePsi);
  
  const gunLpm = lpmFromGpm(r.gunFlowGpm);
  const lossBar = barFromPsi(r.hoseLossPsi);
  const requiredHp = calculateRequiredHp(r.gunPressurePsi, r.gunFlowGpm, 0.9);
  const usableEngineHp = calculateUsableEngineHp(Number(inputs.engineHp || 0), 0.85);
  const enginePowerBadge = hpStatus(requiredHp, usableEngineHp);
  const ratedPsi = toPsi(Number(inputs.pumpPressure || 0), inputs.pumpPressureUnit);
  const pressureVariancePct = ratedPsi > 0 ? ((r.gunPressurePsi - ratedPsi) / ratedPsi) * 100 : 0;
  const lossPctAbs = Math.abs(pressureVariancePct);
  const efficiencyTier = lossPctAbs < 5 ? "Optimal" : lossPctAbs < 10 ? "Moderate loss" : lossPctAbs < 20 ? "High loss" : "Severe loss";
  const efficiencyNote = lossPctAbs < 5 ? "Very close to rated performance." : lossPctAbs < 10 ? "Some pressure drop—typically acceptable." : lossPctAbs < 20 ? "Noticeable drop—consider hose length or diameter." : "Large drop—hose length or ID is significantly reducing performance.";
  const badge = statusBadge(r.status);
  const systemBadge = r.isPressureLimited ? { text: "Bypass active", cls: "bg-red-50 text-red-800 border-red-200" } : badge;
  const ratedBar = barFromPsi(ratedPsi);
  const ratedGpm = toGpm(Number(inputs.pumpFlow || 0), inputs.pumpFlowUnit);
  const ratedLpm = lpmFromGpm(ratedGpm);
  const pqRated = ratedBar * ratedLpm;
  const pqAtGun = gunBar * gunLpm;
  const pqClassRated = pqRated >= 5600 ? "Class B" : "Class A";
  const pqClassGun = pqAtGun >= 5600 ? "Class B" : "Class A";
  const selectedDisplayTipCode = roundTipCodeToFive(r.selectedTipCode);
  const calibratedDisplayTipCode = roundTipCodeToFive(r.calibratedTipCode);

  const liveSetupItems = [
    { label: "Pressure", value: `${fmt(Number(inputs.pumpPressure || 0), 0)} ${inputs.pumpPressureUnit === "psi" ? "PSI" : "BAR"}` },
    { label: "Flow", value: `${fmt(ratedLpm, 1)} LPM (${fmt(ratedGpm, 2)} GPM)` },
    { label: "Hose length", value: `${fmt(Number(inputs.hoseLength || 0), 0)} ${inputs.hoseLengthUnit}` },
    { label: "Hose ID", value: `${fmt(Number(inputs.hoseId || 0), inputs.hoseIdUnit === "in" ? 2 : 1)} ${inputs.hoseIdUnit}` },
    { label: "Nozzle", value: inputs.sprayMode === "surfaceCleaner" ? `${inputs.nozzleSizeText || "—"} × ${inputs.nozzleCount}` : inputs.nozzleSizeText || "—" },
    { label: "Engine", value: `${fmt(Number(inputs.engineHp || 0), 1)} HP` },
  ];

  async function copySetupLink() {
    const params = buildFullRigSearchParams(inputs);
    const qs = params.toString();
    const url = `${window.location.origin}/calculator${qs ? `?${qs}` : ""}`;

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
        <title>Full Rig Calculator | PressureCal</title>
        <meta name="description" content="Full rig calculator for pressure washer setup, including hose loss, nozzle calibration, operating pressure, and power requirement." />
        <link rel="canonical" href="https://www.pressurecal.com/calculator" />
      </Helmet>

      <section className="-mx-4 bg-slate-100 px-4 pb-8 pt-12 sm:pb-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Full rig calculator</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Model your pressure washer setup</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Engineering-based modelling for hose loss, nozzle calibration, and unloader-limited systems.</p>
          </div>

          <div className={`mb-6 rounded-2xl border px-5 py-4 shadow-sm transition-all duration-700 ${highlightSetup ? "border-blue-300 bg-blue-50 shadow-lg" : "border-slate-200 bg-white"}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Your setup</div>
                <div className="mt-1 text-sm text-slate-600">Live summary of the inputs currently being modelled.</div>

                {loadedFromLink ? (
                  <div className="mt-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    Shared setup loaded
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {liveSetupItems.map((item) => (
                  <div key={item.label} className={`rounded-full border px-3 py-1 text-sm transition ${highlightSetup ? "border-blue-300 bg-blue-100 text-slate-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                    <span className="font-medium text-slate-500">{item.label}:</span> <span className="font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-start gap-2 lg:items-end">
                <button type="button" onClick={copySetupLink} className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 hover:shadow-lg">{copyMessage ? "Copied ✓" : "Copy Setup Link"}</button>
                <div className="text-xs text-slate-500">{copyMessage || "Share this exact rig setup."}</div>
              </div>
            </div>
          </div>

          <main className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">System Configuration</h2></div>

              <div className="space-y-5 px-5 py-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Rated pressure ({inputs.pumpPressureUnit.toUpperCase()})</label>
                  <div className="mt-2 flex gap-3">
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400" type="number" inputMode="decimal" value={inputs.pumpPressure} onFocus={selectAllOnFocus} onChange={(e) => {
                      const val = e.target.value;
                      setInputs((s) => {
                        const nextState: Inputs = { ...s, pumpPressure: val === "" ? "" : Number(val) };
                        if (!maxWasManuallyEditedRef.current) {
                          nextState.maxPressure = val === "" ? "" : Number(val);
                          nextState.maxPressureUnit = s.pumpPressureUnit;
                        }
                        return nextState;
                      });
                    }} />
                    <select className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400" value={inputs.pumpPressureUnit} onChange={(e) => {
                      const nextUnit = e.target.value as PressureUnit;
                      setInputs((s) => {
                        if (s.pumpPressureUnit === nextUnit) return s;
                        const pumpPressurePsi = toPsi(Number(s.pumpPressure || 0), s.pumpPressureUnit);
                        const nextState: Inputs = { ...s, pumpPressure: roundForUnit(fromPsi(pumpPressurePsi, nextUnit), nextUnit === "psi" ? 0 : 1), pumpPressureUnit: nextUnit };
                        if (!maxWasManuallyEditedRef.current) {
                          nextState.maxPressure = roundForUnit(fromPsi(pumpPressurePsi, nextUnit), nextUnit === "psi" ? 0 : 1);
                          nextState.maxPressureUnit = nextUnit;
                        }
                        return nextState;
                      });
                    }}>
                      <option value="psi">psi</option><option value="bar">bar</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Rated flow ({inputs.pumpFlowUnit === "lpm" ? "LPM" : "GPM"})</label>
                  <div className="mt-2 flex gap-3">
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400" type="number" inputMode="decimal" value={inputs.pumpFlow} onFocus={selectAllOnFocus} onChange={(e) => setInputs((s) => ({ ...s, pumpFlow: e.target.value === "" ? "" : Number(e.target.value) }))} />
                    <select className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400" value={inputs.pumpFlowUnit} onChange={(e) => setInputs((s) => {
                      const nextUnit = e.target.value as FlowUnit;
                      if (s.pumpFlowUnit === nextUnit) return s;
                      const flowGpm = toGpm(Number(s.pumpFlow || 0), s.pumpFlowUnit);
                      return { ...s, pumpFlow: roundForUnit(fromGpm(flowGpm, nextUnit), nextUnit === "gpm" ? 2 : 1), pumpFlowUnit: nextUnit };
                    })}>
                      <option value="lpm">L/min</option><option value="gpm">GPM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Max pressure (unloader) ({inputs.maxPressureUnit.toUpperCase()})</label>
                  <div className="mt-2 flex gap-3">
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400" type="number" inputMode="decimal" value={inputs.maxPressure} onFocus={selectAllOnFocus} onChange={(e) => {
                      maxWasManuallyEditedRef.current = true;
                      setInputs((s) => ({ ...s, maxPressure: e.target.value === "" ? "" : Number(e.target.value) }));
                    }} />
                    <select className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400" value={inputs.maxPressureUnit} onChange={(e) => {
                      maxWasManuallyEditedRef.current = true;
                      setInputs((s) => {
                        const nextUnit = e.target.value as PressureUnit;
                        if (s.maxPressureUnit === nextUnit) return s;
                        const maxPressurePsi = toPsi(Number(s.maxPressure || 0), s.maxPressureUnit);
                        return { ...s, maxPressure: roundForUnit(fromPsi(maxPressurePsi, nextUnit), nextUnit === "psi" ? 0 : 1), maxPressureUnit: nextUnit };
                      });
                    }}>
                      <option value="psi">psi</option><option value="bar">bar</option>
                    </select>
                  </div>
                  {!maxWasManuallyEditedRef.current && <div className="mt-2 text-xs text-slate-500">Synced to rated pressure. Edit to override.</div>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Engine HP</label>
                  <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400" type="number" inputMode="decimal" value={inputs.engineHp} onFocus={selectAllOnFocus} onChange={(e) => setInputs((s) => ({ ...s, engineHp: e.target.value === "" ? "" : Number(e.target.value) }))} />
                  <div className="mt-2 text-xs text-slate-500">Used to estimate whether the machine can support the setup.</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Spray mode</label>
                  <div className="mt-2 flex gap-2">
                    {(["wand", "surfaceCleaner"] as const).map((mode) => (
                      <button key={mode} type="button" onClick={() => setInputs((s) => ({ ...s, sprayMode: mode, nozzleCount: mode === "surfaceCleaner" ? Math.max(2, s.nozzleCount || 2) : 1 }))} className={`rounded-lg px-4 py-2 text-sm font-semibold border ${inputs.sprayMode === mode ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}>
                        {mode === "wand" ? "Wand" : "Surface Cleaner"}
                      </button>
                    ))}
                  </div>
                </div>

                {inputs.sprayMode === "surfaceCleaner" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Number of nozzles</label>
                    <div className="mt-2 flex gap-2">
                      {[2, 3, 4].map((n) => (
                        <button key={n} type="button" onClick={() => setInputs((s) => ({ ...s, nozzleCount: n }))} className={`rounded-lg px-3 py-2 text-sm font-semibold border ${inputs.nozzleCount === n ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}>{n}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="h-px bg-slate-200" />

                <div>
                  <label className="block text-sm font-medium text-slate-700">Hose length (installed) ({inputs.hoseLengthUnit})</label>
                  <div className="mt-2 flex gap-3">
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400" type="number" inputMode="decimal" value={inputs.hoseLength} onFocus={selectAllOnFocus} onChange={(e) => setInputs((s) => ({ ...s, hoseLength: e.target.value === "" ? "" : Number(e.target.value) }))} />
                    <select className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400" value={inputs.hoseLengthUnit} onChange={(e) => setInputs((s) => {
                      const nextUnit = e.target.value as LengthUnit;
                      if (s.hoseLengthUnit === nextUnit) return s;
                      const hoseLengthMeters = toMeters(Number(s.hoseLength || 0), s.hoseLengthUnit);
                      return { ...s, hoseLength: roundForUnit(fromMeters(hoseLengthMeters, nextUnit), 1), hoseLengthUnit: nextUnit };
                    })}>
                      <option value="m">m</option><option value="ft">ft</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Hose internal diameter ({inputs.hoseIdUnit})</label>
                  <div className="mt-2 flex gap-3">
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400" type="number" inputMode="decimal" value={inputs.hoseId} onFocus={selectAllOnFocus} onChange={(e) => setInputs((s) => ({ ...s, hoseId: e.target.value === "" ? "" : Number(e.target.value) }))} />
                    <select className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400" value={inputs.hoseIdUnit} onChange={(e) => setInputs((s) => ({ ...s, hoseIdUnit: e.target.value as DiameterUnit }))}>
                      <option value="mm">mm</option><option value="in">in</option>
                    </select>
                  </div>
                  <div className="mt-3">
                    <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400" value="" onChange={(e) => {
                      const mm = Number(e.target.value);
                      if (Number.isFinite(mm) && mm > 0) setInputs((s) => ({ ...s, hoseId: mm, hoseIdUnit: "mm" }));
                    }}>
                      <option value="">Hose preset (optional)…</option>
                      {hosePresets.map((preset) => <option key={preset.valueMm} value={preset.valueMm}>{preset.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="h-px bg-slate-200" />

                <div>
                  <label className="block text-sm font-medium text-slate-700">{inputs.sprayMode === "surfaceCleaner" ? "Selected nozzle tip (per nozzle)" : "Selected nozzle tip"}</label>
                  <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400" placeholder="e.g. 040" value={inputs.nozzleSizeText} onFocus={selectAllOnFocus} onChange={(e) => setInputs((s) => ({ ...s, nozzleSizeText: e.target.value }))} />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">Calculated Performance</h2>
                  <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${systemBadge.cls}`}>{systemBadge.text}</div>
                </div>
              </div>
              <div className="space-y-5 px-5 py-4">
                <div className="rounded-2xl border border-slate-300 bg-slate-100 px-5 py-5">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-600">Estimated operating pressure (at gun)</div>
                  <div className="mt-2 text-5xl font-semibold tracking-tight text-slate-900">{fmt(r.gunPressurePsi, 0)} <span className="ml-1 text-sm font-medium text-slate-500">PSI</span></div>
                  <div className="mt-1 text-sm text-slate-600">({fmt(gunBar, 1)} bar)</div>
                </div>

                <div className={`text-xs font-medium ${Math.abs(pressureVariancePct) > 10 ? "text-red-600" : Math.abs(pressureVariancePct) > 5 ? "text-amber-600" : "text-slate-500"}`}>Δ from rated pressure: {fmt(pressureVariancePct, 1)}%</div>
                <div className="text-sm text-slate-700">Efficiency tier: <strong>{efficiencyTier}</strong> — {efficiencyNote}</div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-600">Operating flow rate</div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">{fmt(gunLpm, 1)} <span className="text-sm font-medium text-slate-600">L/min</span></div>
                    <div className="mt-1 text-sm text-slate-600">({fmt(r.gunFlowGpm, 2)} GPM)</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-600">Hose pressure loss</div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">{fmt(r.hoseLossPsi, 0)} <span className="text-sm font-medium text-slate-600">PSI</span></div>
                    <div className="mt-1 text-sm text-slate-600">({fmt(lossBar, 1)} bar)</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">Power requirement</div>
                    <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${enginePowerBadge.cls}`}>{enginePowerBadge.text}</div>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-600">Required HP</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{fmt(requiredHp, 1)} <span className="text-sm font-medium text-slate-600">HP</span></div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-600">Usable engine HP</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{fmt(usableEngineHp, 1)} <span className="text-sm font-medium text-slate-600">HP</span></div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">AS/NZS 4233.01 Reference (P × Q)</div>
                      <div className="mt-1 text-sm text-slate-600">Uses <strong>Pressure (bar)</strong> × <strong>Flow (L/min)</strong>, threshold 5600.</div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${pqClassGun === "Class B" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}>{pqClassGun}</span>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-600">Rated (maximum output)</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{fmt(pqRated, 0)} <span className="text-sm font-medium text-slate-600">bar·L/min</span></div>
                      <div className="mt-1 text-xs text-slate-500">Uses rated pump pressure &amp; rated pump flow. ({pqClassRated})</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-600">At gun (indicative)</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{fmt(pqAtGun, 0)} <span className="text-sm font-medium text-slate-600">bar·L/min</span></div>
                      <div className="mt-1 text-xs text-slate-500">Based on calculated operating point.</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">Nozzle calibration status</div>
                    <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badge.cls}`}>{badge.text}</div>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{r.statusMessage}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-600">{inputs.sprayMode === "surfaceCleaner" ? "Selected nozzle tip (per nozzle)" : "Selected nozzle tip"}</div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">{selectedDisplayTipCode}</div>
                    <div className="mt-1 text-sm text-slate-600">Orifice {fmt(r.selectedOrificeMm, 2)} mm</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-600">{inputs.sprayMode === "surfaceCleaner" ? "Nozzle equivalent for rated pressure (per nozzle)" : "Nozzle equivalent for rated pressure"}</div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">{calibratedDisplayTipCode}</div>
                    <div className="mt-1 text-sm text-slate-600">≈ {fmt(lpmFromGpm(r.calibratedNozzleQ4000Gpm), 1)} L/min ({fmt(r.calibratedNozzleQ4000Gpm, 2)} GPM @ 4000 PSI)</div>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </section>

      <BackToTopButton />
    </PressureCalLayout>
  );
}
