import { useMemo, useState } from "react";
import { solvePressureCal, barFromPsi, lpmFromGpm } from "./pressurecal";
import type {
  Inputs,
  PressureUnit,
  FlowUnit,
  LengthUnit,
  DiameterUnit
} from "./pressurecal";

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

  const badgeClass =
    r.status === "calibrated" ? "ok" : r.status === "under-calibrated" ? "risk" : "warn";
  const badgeText =
    r.status === "calibrated" ? "Calibrated" : r.status === "under-calibrated" ? "Under-calibrated" : "Over-calibrated";

  return (
  <div className="pc-page">
    <header className="pc-header">
      <div>
        <h1 className="pc-title">PressureCal</h1>
        <p className="pc-subtitle">Field Calibration & Reference Tool</p>
      </div>
    </header>

    <main className="pc-grid">
      {/* LEFT: Inputs */}
      <section className="pc-panel">
        <div className="pc-panel-title">System Configuration</div>
        <div className="pc-panel-body pc-form">
          <label className="pc-label">Rated pressure</label>
          <div className="pc-row">
            <input
              className="pc-input"
              type="number"
              value={inputs.pumpPressure}
              onChange={(e) => setInputs((s) => ({ ...s, pumpPressure: Number(e.target.value) }))}
            />
            <select
              className="pc-select"
              value={inputs.pumpPressureUnit}
              onChange={(e) => setInputs((s) => ({ ...s, pumpPressureUnit: e.target.value as PressureUnit }))}
            >
              <option value="psi">psi</option>
              <option value="bar">bar</option>
            </select>
          </div>

          <div className="pc-spacer" />

          <label className="pc-label">Rated flow</label>
          <div className="pc-row">
            <input
              className="pc-input"
              type="number"
              value={inputs.pumpFlow}
              onChange={(e) => setInputs((s) => ({ ...s, pumpFlow: Number(e.target.value) }))}
            />
            <select
              className="pc-select"
              value={inputs.pumpFlowUnit}
              onChange={(e) => setInputs((s) => ({ ...s, pumpFlowUnit: e.target.value as FlowUnit }))}
            >
              <option value="lpm">L/min</option>
              <option value="gpm">GPM</option>
            </select>
          </div>

          <hr className="pc-hr" />

          <label className="pc-label">Hose length (installed)</label>
          <div className="pc-row">
            <input
              className="pc-input"
              type="number"
              value={inputs.hoseLength}
              onChange={(e) => setInputs((s) => ({ ...s, hoseLength: Number(e.target.value) }))}
            />
            <select
              className="pc-select"
              value={inputs.hoseLengthUnit}
              onChange={(e) => setInputs((s) => ({ ...s, hoseLengthUnit: e.target.value as LengthUnit }))}
            >
              <option value="m">m</option>
              <option value="ft">ft</option>
            </select>
          </div>

          <div className="pc-spacer" />

          <label className="pc-label">Hose internal diameter</label>
          <div className="pc-row">
            <input
              className="pc-input"
              type="number"
              value={inputs.hoseId}
              onChange={(e) => setInputs((s) => ({ ...s, hoseId: Number(e.target.value) }))}
            />
            <select
              className="pc-select"
              value={inputs.hoseIdUnit}
              onChange={(e) => setInputs((s) => ({ ...s, hoseIdUnit: e.target.value as DiameterUnit }))}
            >
              <option value="mm">mm</option>
              <option value="in">in</option>
            </select>
          </div>

          <div className="pc-spacer" />

          <select
            className="pc-select pc-select-full"
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

          <hr className="pc-hr" />

          <label className="pc-label">Selected nozzle tip</label>
          <input
            className="pc-input pc-input-full"
            value={inputs.nozzleSizeText}
            onChange={(e) => setInputs((s) => ({ ...s, nozzleSizeText: e.target.value }))}
          />
        </div>
      </section>

      {/* RIGHT: Results */}
      <section className="pc-panel">
        <div className="pc-panel-title">Calculated Performance</div>

        <div className="pc-panel-body">
          <div className="pc-metric pc-metric-primary">
            <div className="pc-metric-label">Estimated operating pressure (at gun)</div>
            <div className="pc-metric-value">
              {fmt(r.gunPressurePsi, 0)} PSI <span className="pc-metric-sub">({fmt(gunBar, 1)} bar)</span>
            </div>
          </div>

          <div className="pc-metric-row">
            <div className="pc-metric">
              <div className="pc-metric-label">Operating flow rate</div>
              <div className="pc-metric-value">
                {fmt(r.gunFlowGpm, 2)} GPM <span className="pc-metric-sub">({fmt(gunLpm, 1)} L/min)</span>
              </div>
            </div>

            <div className="pc-metric">
              <div className="pc-metric-label">Hose pressure loss</div>
              <div className="pc-metric-value">
                {fmt(r.hoseLossPsi, 0)} PSI <span className="pc-metric-sub">({fmt(lossBar, 1)} bar)</span>
              </div>
              <div className="pc-metric-meta">{fmt(r.hoseLossPct, 1)}% of rated pressure</div>
            </div>
          </div>

          <div className="pc-status">
            <div className="pc-status-title">Configuration status</div>
            <div className="pc-status-badge pc-badge">
              {badgeText}
            </div>
            <div className="pc-status-line">{r.statusMessage}</div>
            {/* We’ll add Pressure Variance % here next */}
          </div>

          <div className="pc-metric-row">
            <div className="pc-metric">
              <div className="pc-metric-label">Selected nozzle tip</div>
              <div className="pc-metric-value">
                {r.selectedTipCode} <span className="pc-metric-sub">(Orifice {fmt(r.selectedOrificeMm, 2)} mm)</span>
              </div>
            </div>
            <div className="pc-metric">
              <div className="pc-metric-label">Nozzle equivalent for rated pressure</div>
              <div className="pc-metric-value">
                {r.calibratedTipCode} <span className="pc-metric-sub">(≈ {fmt(r.calibratedNozzleQ4000Gpm, 2)} GPM @ 4000)</span>
              </div>
            </div>
          </div>

          <div className="pc-footnote">
            Results are calculated estimates based on rated specifications and standardised nozzle rating conventions.
          </div>
        </div>
      </section>
    </main>
  </div>
);