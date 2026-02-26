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
    <div style={{ padding: 20, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>PressureCal</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.8 }}>Output calibration (rated pump → estimated gun output)</p>
        </div>
        <span
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #ddd",
            background: badgeClass === "ok" ? "#eaffea" : badgeClass === "risk" ? "#ffecec" : "#fff7e6",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
          }}
        >
          {badgeText}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>Inputs</h2>

          <label>Rated pressure</label>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="number"
              value={inputs.pumpPressure}
              onChange={(e) => setInputs((s) => ({ ...s, pumpPressure: Number(e.target.value) }))}
              style={{ flex: 1 }}
            />
            <select
              value={inputs.pumpPressureUnit}
              onChange={(e) => setInputs((s) => ({ ...s, pumpPressureUnit: e.target.value as PressureUnit }))}
            >
              <option value="psi">psi</option>
              <option value="bar">bar</option>
            </select>
          </div>

          <div style={{ height: 10 }} />

          <label>Rated flow</label>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="number"
              value={inputs.pumpFlow}
              onChange={(e) => setInputs((s) => ({ ...s, pumpFlow: Number(e.target.value) }))}
              style={{ flex: 1 }}
            />
            <select
              value={inputs.pumpFlowUnit}
              onChange={(e) => setInputs((s) => ({ ...s, pumpFlowUnit: e.target.value as FlowUnit }))}
            >
              <option value="lpm">L/min</option>
              <option value="gpm">gpm</option>
            </select>
          </div>

          <hr style={{ margin: "14px 0" }} />

          <label>Hose length</label>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="number"
              value={inputs.hoseLength}
              onChange={(e) => setInputs((s) => ({ ...s, hoseLength: Number(e.target.value) }))}
              style={{ flex: 1 }}
            />
            <select
              value={inputs.hoseLengthUnit}
              onChange={(e) => setInputs((s) => ({ ...s, hoseLengthUnit: e.target.value as LengthUnit }))}
            >
              <option value="m">m</option>
              <option value="ft">ft</option>
            </select>
          </div>

          <div style={{ height: 10 }} />

          <label>Hose ID</label>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="number"
              value={inputs.hoseId}
              onChange={(e) => setInputs((s) => ({ ...s, hoseId: Number(e.target.value) }))}
              style={{ flex: 1 }}
            />
            <select
              value={inputs.hoseIdUnit}
              onChange={(e) => setInputs((s) => ({ ...s, hoseIdUnit: e.target.value as DiameterUnit }))}
            >
              <option value="mm">mm</option>
              <option value="in">in</option>
            </select>
          </div>

          <div style={{ height: 10 }} />

          <select
            value=""
            onChange={(e) => {
              const mm = Number(e.target.value);
              if (Number.isFinite(mm) && mm > 0) setInputs((s) => ({ ...s, hoseId: mm, hoseIdUnit: "mm" }));
            }}
          >
            <option value="">Hose preset…</option>
            {hosePresets.map((p) => (
              <option key={p.valueMm} value={p.valueMm}>
                {p.label}
              </option>
            ))}
          </select>

          <hr style={{ margin: "14px 0" }} />

          <label>Nozzle tip (e.g. 035)</label>
          <input
            value={inputs.nozzleSizeText}
            onChange={(e) => setInputs((s) => ({ ...s, nozzleSizeText: e.target.value }))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>Results</h2>

          <p><strong>At-gun pressure:</strong> {fmt(r.gunPressurePsi, 0)} psi ({fmt(gunBar, 1)} bar)</p>
          <p><strong>At-gun flow:</strong> {fmt(r.gunFlowGpm, 2)} gpm ({fmt(gunLpm, 1)} L/min)</p>
          <p><strong>Hose loss:</strong> {fmt(r.hoseLossPsi, 0)} psi ({fmt(lossBar, 1)} bar) — {fmt(r.hoseLossPct, 1)}%</p>

          <hr style={{ margin: "14px 0" }} />

          <p><strong>Selected nozzle:</strong> {r.selectedTipCode} (≈ {fmt(r.selectedOrificeMm, 2)} mm)</p>
          <p><strong>Calibrated nozzle:</strong> {r.calibratedTipCode} (≈ {fmt(r.calibratedNozzleQ4000Gpm, 2)} gpm @ 4000psi)</p>

          <hr style={{ margin: "14px 0" }} />

          <p style={{ opacity: 0.85 }}>{r.statusMessage}</p>
        </div>
      </div>
    </div>
  );
}