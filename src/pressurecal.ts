/**
 * PressureCal core (V1.2)
 * Adds realistic unloader/max-pressure behaviour:
 * - If a restrictive tip would require pressure above max,
 *   pressure is clamped and flow at the gun drops.
 * - The difference becomes bypass flow (unloader bypass).
 *
 * Adds AS/NZS 4233.01 reference classification:
 * - Uses P(bar) × Q(L/min) threshold of 5600 to indicate Class A / Class B
 * - Provides both rated (maximum output reference) and at-gun (indicative) values
 */

export type PressureUnit = "psi" | "bar";
export type FlowUnit = "lpm" | "gpm";
export type LengthUnit = "m" | "ft";
export type DiameterUnit = "mm" | "in";
export type NozzleInputMode = "tipSize" | "orificeMm";
export type ANZSClass = "Class A" | "Class B";

export interface Inputs {
  pumpPressure: number;
  pumpPressureUnit: PressureUnit;
  pumpFlow: number;
  pumpFlowUnit: FlowUnit;

  /** Unloader / maximum system pressure (usually same as rated) */
  maxPressure: number;
  maxPressureUnit: PressureUnit;

  hoseLength: number;
  hoseLengthUnit: LengthUnit;
  hoseId: number;
  hoseIdUnit: DiameterUnit;
  engineHp: number;

  sprayMode: "wand" | "surfaceCleaner";
  nozzleCount: number;

  nozzleMode: NozzleInputMode;
  nozzleSizeText: string;
  orificeMm: number;

  dischargeCoeffCd: number;
  waterDensity: number;
  hoseRoughnessMm: number;
}

export interface SolveResult {
  /** Actual operating values */
  pumpPressurePsi: number; // after unloader clamp
  gunPressurePsi: number; // after hose loss
  gunFlowGpm: number; // nozzle flow at gun pressure

  /** What it would take to push full pump flow through nozzle */
  requiredPumpPsi: number;
  requiredGunPsi: number;

  /** Hose */
  hoseLossPsi: number;
  hoseLossPct: number;

  /** Bypass (unloader) */
  isPressureLimited: boolean;
  bypassFlowGpm: number;
  bypassPct: number;

  /** Nozzle selection (selected) */
  selectedNozzleQ4000Gpm: number;
  selectedTipCode: string;
  selectedOrificeMm: number;

  /** Nozzle equivalent (calibrated to rated point) */
  calibratedNozzleQ4000Gpm: number;
  calibratedTipCode: string;

  /** AS/NZS 4233.01 reference (P×Q) */
  ratedPQ: number; // bar·L/min using rated specs (maximum output reference)
  ratedClass: ANZSClass;

  gunPQ: number; // bar·L/min using calculated operating point (indicative)
  gunClass: ANZSClass;

  status: "calibrated" | "under-calibrated" | "over-calibrated";
  statusMessage: string;
}

export const PSI_PER_BAR = 14.5037738;
const LPM_PER_GPM = 3.785411784;

// AS/NZS 4233.01 reference threshold (bar·L/min)
const PQ_THRESHOLD = 5600;

export function psiFrom(value: number, unit: PressureUnit): number {
  return unit === "psi" ? value : value * PSI_PER_BAR;
}
export function barFromPsi(psi: number): number {
  return psi / PSI_PER_BAR;
}

export function gpmFrom(value: number, unit: FlowUnit): number {
  return unit === "gpm" ? value : value / LPM_PER_GPM;
}
export function lpmFromGpm(gpm: number): number {
  return gpm * LPM_PER_GPM;
}

export function metersFrom(value: number, unit: LengthUnit): number {
  return unit === "m" ? value : value * 0.3048;
}
export function mmFrom(value: number, unit: DiameterUnit): number {
  return unit === "mm" ? value : value * 25.4;
}

function clampPos(n: number, min = 0): number {
  return Number.isFinite(n) ? Math.max(n, min) : min;
}

/**
 * Parse tip text into Q@4000 (GPM @ 4000 PSI).
 * - "040" => 4.0
 * - "4.0" => 4.0
 * - "40"  => 4.0
 */
export function parseTipToQ4000Gpm(text: string): number | null {
  const t = text.trim().replace(/[^0-9.]/g, "");
  if (!t) return null;

  if (t.includes(".")) {
    const v = Number(t);
    return Number.isFinite(v) ? v : null;
  }

  const n = Number(t);
  if (!Number.isFinite(n)) return null;

  // convention: 2+ digits implies tenths (e.g., "40" => 4.0)
  return t.length >= 2 ? n / 10 : n;
}

export function q4000ToTipCode(q4000Gpm: number): string {
  const code = Math.round(q4000Gpm * 10);
  return code.toString().padStart(3, "0");
}

export function roundTipCodeToFive(tipCode: string): string {
  const n = Number(tipCode);
  if (!Number.isFinite(n)) return tipCode;

  const rounded = Math.round(n / 5) * 5;
  return rounded.toString().padStart(3, "0");
}

export function q4000ToDisplayTipCode(q4000Gpm: number): string {
  return roundTipCodeToFive(q4000ToTipCode(q4000Gpm));
}

/** Nozzle flow model: Q = Q4000 * sqrt(P / 4000) */
export function flowAtPressureFromQ4000(q4000Gpm: number, pressurePsi: number): number {
  return q4000Gpm * Math.sqrt(clampPos(pressurePsi) / 4000);
}

/** Inverse: Q4000 = Q / sqrt(P / 4000) */
export function q4000FromFlowAtPressure(flowGpm: number, pressurePsi: number): number {
  const p = clampPos(pressurePsi);
  if (p <= 0) return 0;
  return flowGpm / Math.sqrt(p / 4000);
}

function gpmToM3s(gpm: number): number {
  return (gpm * 0.003785411784) / 60;
}
function m3sToGpm(m3s: number): number {
  return (m3s * 60) / 0.003785411784;
}

function psiToPa(psi: number): number {
  return psi * 6894.757293168;
}
function paToPsi(pa: number): number {
  return pa / 6894.757293168;
}

/**
 * Orifice equation (incompressible):
 * Q = Cd * A * sqrt(2 * ΔP / ρ)
 * Here ΔP ~ pressurePsi converted to Pa
 */
export function qFromOrificeMmAndP(orificeMm: number, pressurePsi: number, Cd: number, rho: number): number {
  const d = clampPos(orificeMm) / 1000; // m
  const A = Math.PI * d * d / 4;
  const dP = psiToPa(clampPos(pressurePsi));
  const v = Math.sqrt((2 * dP) / Math.max(rho, 1e-9));
  const Q = Math.max(Cd, 0) * A * v;
  return m3sToGpm(Q);
}

export function orificeMmFromQandP(qGpm: number, pressurePsi: number, Cd: number, rho: number): number {
  const Q = gpmToM3s(clampPos(qGpm));
  const dP = psiToPa(clampPos(pressurePsi));
  const term = Math.sqrt((2 * dP) / Math.max(rho, 1e-9));
  const A = Q / (Math.max(Cd, 1e-9) * Math.max(term, 1e-12));
  const d = Math.sqrt((4 * A) / Math.PI);
  return d * 1000;
}

/**
 * Hose loss using Darcy–Weisbach with a Swamee–Jain-type friction factor.
 * This function is used with the current operating flow, not just rated pump flow.
 */
export function hoseLossPsi(
  flowGpm: number,
  lengthM: number,
  idMm: number,
  rho: number,
  roughnessMm: number
): number {
  const mu = 0.001; // Pa*s (approx water at ~20°C)
  const Q = gpmToM3s(clampPos(flowGpm));
  const D = Math.max(clampPos(idMm), 1e-9) / 1000;
  const A = Math.PI * D * D / 4;
  const v = Q / Math.max(A, 1e-12);

  const Re = (Math.max(rho, 1e-9) * v * D) / Math.max(mu, 1e-12);

  const eps = clampPos(roughnessMm) / 1000;
  const rel = eps / D;

  // friction factor (turbulent approximation)
  const f =
    Re <= 0
      ? 0
      : 0.25 / Math.pow(Math.log10(rel / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);

  const dP = f * (clampPos(lengthM) / D) * (Math.max(rho, 1e-9) * v * v / 2);
  return paToPsi(dP);
}

function anzsClassFromPQ(pq: number): ANZSClass {
  return pq >= PQ_THRESHOLD ? "Class B" : "Class A";
}

export function solvePressureCal(inputs: Inputs): SolveResult {
  // Rated pump point
  const pumpPsiRated = psiFrom(inputs.pumpPressure, inputs.pumpPressureUnit);
  const pumpGpmRated = gpmFrom(inputs.pumpFlow, inputs.pumpFlowUnit);

  // --- AS/NZS 4233.01 reference classification (P × Q) ---
  // Rated/maximum output reference (nameplate values)
  const ratedBar = barFromPsi(pumpPsiRated);
  const ratedLpm = lpmFromGpm(pumpGpmRated);
  const ratedPQ = ratedBar * ratedLpm;
  const ratedClass = anzsClassFromPQ(ratedPQ);

  // Unloader / max pressure
  const maxPumpPsi = psiFrom(inputs.maxPressure, inputs.maxPressureUnit);

  // Hose
  const Lm = metersFrom(inputs.hoseLength, inputs.hoseLengthUnit);
  const idMm = mmFrom(inputs.hoseId, inputs.hoseIdUnit);

  // Calibrated nozzle (tip) that matches rated pump point
  const nozzleCount =
    inputs.sprayMode === "surfaceCleaner"
      ? Math.max(2, Number(inputs.nozzleCount || 2))
      : 1;

  const calibratedSystemQ4000 = q4000FromFlowAtPressure(pumpGpmRated, pumpPsiRated);
  const calibratedQ4000 = calibratedSystemQ4000 / nozzleCount;
  const calibratedCode = q4000ToTipCode(calibratedQ4000);

  // Selected nozzle -> derive per-nozzle Q4000 + system Q4000 + equivalent orifice
  let selectedPerNozzleQ4000: number;
  let selectedSystemQ4000: number;
  let selectedOrificeMm: number;

  if (inputs.nozzleMode === "tipSize") {
    const q = parseTipToQ4000Gpm(inputs.nozzleSizeText);
    selectedPerNozzleQ4000 = q ?? calibratedQ4000;
    selectedSystemQ4000 = selectedPerNozzleQ4000 * nozzleCount;
    selectedOrificeMm = orificeMmFromQandP(
      selectedPerNozzleQ4000,
      4000,
      inputs.dischargeCoeffCd,
      inputs.waterDensity
    );
  } else {
    selectedOrificeMm = clampPos(inputs.orificeMm);
    selectedPerNozzleQ4000 = qFromOrificeMmAndP(
      selectedOrificeMm,
      4000,
      inputs.dischargeCoeffCd,
      inputs.waterDensity
    );
    selectedSystemQ4000 = selectedPerNozzleQ4000 * nozzleCount;
  }

  const selectedTipCode = q4000ToTipCode(selectedPerNozzleQ4000);

  // Required gun pressure to push rated pump flow through nozzle
  let requiredGunPsi = 0;

  if (inputs.nozzleMode === "tipSize") {
    const q4000 = Math.max(selectedSystemQ4000, 1e-9);
    requiredGunPsi = 4000 * Math.pow(pumpGpmRated / q4000, 2);
  } else {
    const d = Math.max(selectedOrificeMm, 1e-9) / 1000;
    const A = Math.PI * (d * d) / 4;

    const Q = gpmToM3s(pumpGpmRated);
    const Cd = Math.max(inputs.dischargeCoeffCd, 1e-9);
    const rho = Math.max(inputs.waterDensity, 1e-9);

    const term = Q / (Cd * Math.max(A, 1e-12));
    const dP_pa = (term * term) * (rho / 2);
    requiredGunPsi = paToPsi(dP_pa);
  }

  // This is the pressure the pump would need to maintain full rated flow
  // through the selected nozzle and hose.
  const requiredPumpPsi =
    requiredGunPsi +
    hoseLossPsi(
      pumpGpmRated,
      Lm,
      idMm,
      inputs.waterDensity,
      inputs.hoseRoughnessMm
    );

  // Unloader clamp
  const isPressureLimited = requiredPumpPsi > maxPumpPsi;
  const pumpPsi = Math.min(requiredPumpPsi, maxPumpPsi);

  // Solve actual operating flow iteratively using the pressure-limited pump pressure
  let gunFlowGpm = pumpGpmRated;
  let lossPsi = 0;
  let gunPressurePsi = 0;

  for (let i = 0; i < 20; i++) {
    lossPsi = hoseLossPsi(
      gunFlowGpm,
      Lm,
      idMm,
      inputs.waterDensity,
      inputs.hoseRoughnessMm
    );

    gunPressurePsi = Math.max(pumpPsi - lossPsi, 0);

    let nextGunFlowGpm = 0;

    if (inputs.nozzleMode === "tipSize") {
      nextGunFlowGpm = flowAtPressureFromQ4000(selectedSystemQ4000, gunPressurePsi);
    } else {
      nextGunFlowGpm = qFromOrificeMmAndP(
        selectedOrificeMm,
        gunPressurePsi,
        inputs.dischargeCoeffCd,
        inputs.waterDensity
      );
    }

    if (Math.abs(nextGunFlowGpm - gunFlowGpm) < 0.0001) {
      gunFlowGpm = nextGunFlowGpm;
      break;
    }

    gunFlowGpm = nextGunFlowGpm;
  }

  // Final recompute using converged flow
  lossPsi = hoseLossPsi(
    gunFlowGpm,
    Lm,
    idMm,
    inputs.waterDensity,
    inputs.hoseRoughnessMm
  );

  gunPressurePsi = Math.max(pumpPsi - lossPsi, 0);

  // --- Indicative at-gun AS/NZS energy (education) ---
  const gunBar = barFromPsi(gunPressurePsi);
  const gunLpm = lpmFromGpm(gunFlowGpm);
  const gunPQ = gunBar * gunLpm;
  const gunClass = anzsClassFromPQ(gunPQ);

  const bypassFlowGpm = Math.max(pumpGpmRated - gunFlowGpm, 0);
  const bypassPct = pumpGpmRated > 0 ? (bypassFlowGpm / pumpGpmRated) * 100 : 0;

  // Hose loss percentage (vs rated pressure)
  const lossPct = pumpPsiRated > 0 ? (lossPsi / pumpPsiRated) * 100 : 0;

  // Calibration status vs calibrated nozzle size at rated point
  const ratio = selectedSystemQ4000 / Math.max(calibratedSystemQ4000, 1e-9);
  const tol = 0.05;

  let status: SolveResult["status"] = "calibrated";
  let statusMessage = "Selected nozzle matches the rated pump operating point.";

  if (ratio < 1 - tol) {
    status = "under-calibrated";

    if (isPressureLimited) {
      statusMessage =
        `Tip is restrictive. System is pressure-limited (unloader bypass likely). ` +
        `Approx bypass: ${bypassPct.toFixed(0)}% (${bypassFlowGpm.toFixed(2)} GPM). ` +
        `Without the limit, required pressure would be ~${requiredPumpPsi.toFixed(0)} PSI.`;
    } else {
      statusMessage =
        "Selected nozzle is smaller than the calibrated requirement. Pressure may rise above the intended point (unloader/bypass likely).";
    }
  } else if (ratio > 1 + tol) {
    status = "over-calibrated";
    statusMessage =
      "Selected nozzle is larger than the calibrated requirement. Pressure will likely drop below the rated point.";
  }

  return {
    pumpPressurePsi: clampPos(pumpPsi),
    requiredPumpPsi: clampPos(requiredPumpPsi),
    requiredGunPsi: clampPos(requiredGunPsi),
    isPressureLimited,

    gunPressurePsi: clampPos(gunPressurePsi),
    gunFlowGpm: clampPos(gunFlowGpm),

    hoseLossPsi: clampPos(lossPsi),
    hoseLossPct: clampPos(lossPct),

    bypassFlowGpm: clampPos(bypassFlowGpm),
    bypassPct: clampPos(bypassPct),

    selectedNozzleQ4000Gpm: clampPos(selectedPerNozzleQ4000),
    selectedTipCode,
    selectedOrificeMm: clampPos(selectedOrificeMm),

    calibratedNozzleQ4000Gpm: clampPos(calibratedQ4000),
    calibratedTipCode: calibratedCode,

    ratedPQ: clampPos(ratedPQ),
    ratedClass,

    gunPQ: clampPos(gunPQ),
    gunClass,

    status,
    statusMessage
  };
}