import { useMemo, useState } from "react";
import { solvePressureCal, barFromPsi, lpmFromGpm } from "./pressurecal";
import type { Inputs, PressureUnit, FlowUnit, LengthUnit, DiameterUnit } from "./pressurecal";

const hosePresets = [
  { label: '1/4" (6.35 mm)', valueMm: 6.35 },
  { label: '5/16" (7.94 mm)', valueMm: 7.94 },
  { label: '3/8" (9.53 mm)', valueMm: 9.53 },
  { label: '1/2" (12.70 mm)', valueMm: 12.7 }
];

function fmt(n: number, dp: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dp);
}

function statusBadge(status: string) {
  if (status === "calibrated") {
    return { text: "Calibrated", cls: "bg-green-50 text-green-800 border-green-200" };
  }
  if (status === "under-calibrated") {
    return { text: "Under-calibrated", cls: "bg-amber-50 text-amber-900 border-amber-200" };
  }
  return { text: "Over-calibrated", cls: "bg-red-50 text-red-800 border-red-200" };
}

export default function App() {
  const [inputs, setInputs] = useState<Inputs>({
    pumpPressure: 4000,
    pumpPressureUnit: "psi",
    pumpFlow: 15,
    pumpFlowUnit: "lpm",

    hoseLength: 15,
    hoseLengthUnit: "m",
    hoseId: 9.53,
    hoseIdUnit: "mm",

    nozzleMode: "tipSize",
    nozzleSizeText: "035",
    orificeMm: 1.2,

    dischargeCoeffCd: 0.62,
    waterDensity: 1000,
    hoseRoughnessMm: 0.0015
  });

  const r = useMemo(() => solvePressureCal(inputs), [inputs]);

  const gunBar = barFromPsi(r.gunPressurePsi);
  const gunLpm = lpmFromGpm(r.gunFlowGpm);
  const lossBar = barFromPsi(r.hoseLossPsi);
  const ratedPsi =
  inputs.pumpPressureUnit === "psi"
    ? inputs.pumpPressure
    : inputs.pumpPressure * 14.5038;

const pressureVariancePct =
  ratedPsi > 0
    ? ((r.gunPressurePsi - ratedPsi) / ratedPsi) * 100
    : 0;
const lossPct = Math.abs(pressureVariancePct);

const efficiencyTier =
  lossPct < 5
    ? "Optimal"
    : lossPct < 10
    ? "Moderate loss"
    : lossPct < 20
    ? "High loss"
    : "Severe loss";

const efficiencyNote =
  lossPct < 5
    ? "Very close to rated performance."
    : lossPct < 10
    ? "Some pressure drop—typically acceptable."
    : lossPct < 20
    ? "Noticeable drop—consider hose length or diameter."
    : "Large drop—hose length/ID is significantly reducing performance.";

  const badge = statusBadge(r.status);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">PressureCal</h1>
            <p className="mt-2 text-slate-600">Field Calibration &amp; Reference Tool</p>
          </div>

          <div className={`mt-1 inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${badge.cls}`}>
            {badge.text}
          </div>
        </header>

        {/* Main grid */}
        <main className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Inputs */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">System Configuration</h2>
            </div>

            <div className="space-y-5 px-5 py-4">
              {/* Rated pressure */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Rated pressure</label>
                <div className="mt-2 flex gap-3">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    type="number"
                    value={inputs.pumpPressure}
                    onChange={(e) => setInputs((s) => ({ ...s, pumpPressure: Number(e.target.value) }))}
                  />
                  <select
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    value={inputs.pumpPressureUnit}
                    onChange={(e) => setInputs((s) => ({ ...s, pumpPressureUnit: e.target.value as PressureUnit }))}
                  >
                    <option value="psi">psi</option>
                    <option value="bar">bar</option>
                  </select>
                </div>
              </div>

              {/* Rated flow */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Rated flow</label>
                <div className="mt-2 flex gap-3">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    type="number"
                    value={inputs.pumpFlow}
                    onChange={(e) => setInputs((s) => ({ ...s, pumpFlow: Number(e.target.value) }))}
                  />
                  <select
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    value={inputs.pumpFlowUnit}
                    onChange={(e) => setInputs((s) => ({ ...s, pumpFlowUnit: e.target.value as FlowUnit }))}
                  >
                    <option value="lpm">L/min</option>
                    <option value="gpm">GPM</option>
                  </select>
                </div>
              </div>

              <div className="h-px bg-slate-200" />

              {/* Hose length */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Hose length (installed)</label>
                <div className="mt-2 flex gap-3">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    type="number"
                    value={inputs.hoseLength}
                    onChange={(e) => setInputs((s) => ({ ...s, hoseLength: Number(e.target.value) }))}
                  />
                  <select
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    value={inputs.hoseLengthUnit}
                    onChange={(e) => setInputs((s) => ({ ...s, hoseLengthUnit: e.target.value as LengthUnit }))}
                  >
                    <option value="m">m</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
              </div>

              {/* Hose ID */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Hose internal diameter</label>
                <div className="mt-2 flex gap-3">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    type="number"
                    value={inputs.hoseId}
                    onChange={(e) => setInputs((s) => ({ ...s, hoseId: Number(e.target.value) }))}
                  />
                  <select
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    value={inputs.hoseIdUnit}
                    onChange={(e) => setInputs((s) => ({ ...s, hoseIdUnit: e.target.value as DiameterUnit }))}
                  >
                    <option value="mm">mm</option>
                    <option value="in">in</option>
                  </select>
                </div>

                <div className="mt-3">
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    value=""
                    onChange={(e) => {
                      const mm = Number(e.target.value);
                      if (Number.isFinite(mm) && mm > 0) setInputs((s) => ({ ...s, hoseId: mm, hoseIdUnit: "mm" }));
                    }}
                  >
                    <option value="">Hose preset (optional)…</option>
                    {hosePresets.map((p) => (
                      <option key={p.valueMm} value={p.valueMm}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="h-px bg-slate-200" />

              {/* Nozzle */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Selected nozzle tip</label>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                  value={inputs.nozzleSizeText}
                  onChange={(e) => setInputs((s) => ({ ...s, nozzleSizeText: e.target.value }))}
                />
              </div>
            </div>
          </section>

          {/* Results */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">Calculated Performance</h2>
            </div>

            <div className="space-y-5 px-5 py-4">
              {/* Primary */}
              <div className="rounded-xl border border-slate-300 bg-slate-100 px-5 py-5">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
                  Estimated operating pressure (at gun)
                </div>
                <div className="mt-2 text-5xl font-semibold tracking-tight text-slate-900">
                  {fmt(r.gunPressurePsi, 0)} <span className="ml-1 text-sm font-medium text-slate-500">PSI</span>
                </div>
                <div className="mt-1 text-sm text-slate-600">({fmt(gunBar, 1)} bar)</div>
              </div>
              <div
  className={`mt-2 text-xs font-medium ${
    Math.abs(pressureVariancePct) > 10
      ? "text-red-600"
      : Math.abs(pressureVariancePct) > 5
      ? "text-amber-600"
      : "text-slate-500"
  }`}
>
  Δ from rated pressure: {fmt(pressureVariancePct, 1)}%
</div>
<div className="pc-delta">
  Efficiency tier: <strong>{efficiencyTier}</strong> — {efficiencyNote}
</div>
              {/* Two-up metrics */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 px-4 py-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-600">Operating flow rate</div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">
                    {fmt(r.gunFlowGpm, 2)} <span className="text-sm font-medium text-slate-600">GPM</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">({fmt(gunLpm, 1)} L/min)</div>
                </div>

                <div className="rounded-xl border border-slate-200 px-4 py-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-600">Hose pressure loss</div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">
                    {fmt(r.hoseLossPsi, 0)} <span className="text-sm font-medium text-slate-600">PSI</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">({fmt(lossBar, 1)} bar)</div>
                  <div className="mt-2 text-xs text-slate-500">{fmt(r.hoseLossPct, 1)}% of rated pressure</div>
                </div>
              </div>

              {/* Status message */}
              <div className="rounded-xl border border-slate-200 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">Configuration status</div>
                  <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badge.cls}`}>
                    {badge.text}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-700">{r.statusMessage}</p>
              </div>

              {/* Nozzles */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 px-4 py-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-600">Selected nozzle tip</div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">{r.selectedTipCode}</div>
                  <div className="mt-1 text-sm text-slate-600">Orifice {fmt(r.selectedOrificeMm, 2)} mm</div>
                </div>

                <div className="rounded-xl border border-slate-200 px-4 py-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Nozzle equivalent for rated pressure
                  </div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">{r.calibratedTipCode}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    ≈ {fmt(r.calibratedNozzleQ4000Gpm, 2)} GPM @ 4000
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Results are calculated estimates based on rated specifications and standardised nozzle rating conventions.
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}