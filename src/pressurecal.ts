/**
 * PressureCal V1 core
 */

export type PressureUnit = "psi" | "bar";
export type FlowUnit = "lpm" | "gpm";
export type LengthUnit = "m" | "ft";
export type DiameterUnit = "mm" | "in";
export type NozzleInputMode = "tipSize" | "orificeMm";

export interface Inputs {
  pumpPressure: number;
  pumpPressureUnit: PressureUnit;
  pumpFlow: number;
  pumpFlowUnit: FlowUnit;

  hoseLength: number;
  hoseLengthUnit: LengthUnit;
  hoseId: number;
  hoseIdUnit: DiameterUnit;

  nozzleMode: NozzleInputMode;
  nozzleSizeText: string;
  orificeMm: number;

  dischargeCoeffCd: number;
  waterDensity: number;
  hoseRoughnessMm: number;
}

export interface SolveResult {
  gunPressurePsi: number;
  gunFlowGpm: number;
  hoseLossPsi: number;
  hoseLossPct: number;

  selectedNozzleQ4000Gpm: number;
  selectedTipCode: string;
  selectedOrificeMm: number;

  calibratedNozzleQ4000Gpm: number;
  calibratedTipCode: string;

  status: "calibrated" | "under-calibrated" | "over-calibrated";
  statusMessage: string;
}

export const PSI_PER_BAR = 14.5037738;

export function psiFrom(value: number, unit: PressureUnit): number {
  return unit === "psi" ? value : value * PSI_PER_BAR;
}
export function barFromPsi(psi: number): number {
  return psi / PSI_PER_BAR;
}

export function gpmFrom(value: number, unit: FlowUnit): number {
  return unit === "gpm" ? value : value / 3.785411784;
}
export function lpmFromGpm(gpm: number): number {
  return gpm * 3.785411784;
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

export function parseTipToQ4000Gpm(text: string): number | null {
  const t = text.trim().replace(/[^0-9.]/g, "");
  if (!t) return null;

  if (t.includes(".")) return Number(t);

  const n = Number(t);
  if (!Number.isFinite(n)) return null;

  return t.length >= 2 ? n / 10 : n;
}

export function q4000ToTipCode(q4000Gpm: number): string {
  const code = Math.round(q4000Gpm * 10);
  return code.toString().padStart(3, "0");
}

export function flowAtPressureFromQ4000(q4000Gpm: number, pressurePsi: number): number {
  return q4000Gpm * Math.sqrt(clampPos(pressurePsi) / 4000);
}

export function q4000FromFlowAtPressure(flowGpm: number, pressurePsi: number): number {
  const p = clampPos(pressurePsi);
  if (p <= 0) return 0;
  return flowGpm / Math.sqrt(p / 4000);
}

function gpmToM3s(gpm: number): number {
  return gpm * 0.003785411784 / 60;
}
function m3sToGpm(m3s: number): number {
  return m3s * 60 / 0.003785411784;
}

function psiToPa(psi: number): number {
  return psi * 6894.757293168;
}
function paToPsi(pa: number): number {
  return pa / 6894.757293168;
}

export function qFromOrificeMmAndP(orificeMm: number, pressurePsi: number, Cd: number, rho: number): number {
  const d = orificeMm / 1000;
  const A = Math.PI * d * d / 4;
  const dP = psiToPa(pressurePsi);
  const v = Math.sqrt((2 * dP) / rho);
  const Q = Cd * A * v;
  return m3sToGpm(Q);
}

export function orificeMmFromQandP(qGpm: number, pressurePsi: number, Cd: number, rho: number): number {
  const Q = gpmToM3s(qGpm);
  const dP = psiToPa(pressurePsi);
  const term = Math.sqrt((2 * dP) / rho);
  const A = Q / (Cd * term);
  const d = Math.sqrt((4 * A) / Math.PI);
  return d * 1000;
}

export function hoseLossPsi(flowGpm: number, lengthM: number, idMm: number, rho: number, roughnessMm: number): number {
  const mu = 0.001;
  const Q = gpmToM3s(flowGpm);
  const D = idMm / 1000;
  const A = Math.PI * D * D / 4;
  const v = Q / A;

  const Re = (rho * v * D) / mu;
  const eps = roughnessMm / 1000;
  const rel = eps / D;

  const f = 0.25 / Math.pow(Math.log10(rel / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
  const dP = f * (lengthM / D) * (rho * v * v / 2);

  return paToPsi(dP);
}

export function solvePressureCal(inputs: Inputs): SolveResult {
  const pumpPsiRated = psiFrom(inputs.pumpPressure, inputs.pumpPressureUnit);
  const pumpGpm = gpmFrom(inputs.pumpFlow, inputs.pumpFlowUnit);

  const Lm = metersFrom(inputs.hoseLength, inputs.hoseLengthUnit);
  const idMm = mmFrom(inputs.hoseId, inputs.hoseIdUnit);

  // Calibrated nozzle for rated pump point (i.e., what tip matches the rated point)
  const calibratedQ4000 = q4000FromFlowAtPressure(pumpGpm, pumpPsiRated);
  const calibratedCode = q4000ToTipCode(calibratedQ4000);

  // Selected nozzle -> derive Q4000 + equivalent orifice mm
  let selectedQ4000: number;
  let selectedOrificeMm: number;

  if (inputs.nozzleMode === "tipSize") {
    const q = parseTipToQ4000Gpm(inputs.nozzleSizeText);
    selectedQ4000 = q ?? calibratedQ4000;
    selectedOrificeMm = orificeMmFromQandP(selectedQ4000, 4000, inputs.dischargeCoeffCd, inputs.waterDensity);
  } else {
    selectedOrificeMm = clampPos(inputs.orificeMm);
    selectedQ4000 = qFromOrificeMmAndP(selectedOrificeMm, 4000, inputs.dischargeCoeffCd, inputs.waterDensity);
  }

  const selectedTipCode = q4000ToTipCode(selectedQ4000);

  // Hose loss at (approximately) pump flow
  const lossPsi = hoseLossPsi(pumpGpm, Lm, idMm, inputs.waterDensity, inputs.hoseRoughnessMm);

  // Determine gun pressure such that nozzle flow == pump flow
  let gunPsi = 0;

  if (inputs.nozzleMode === "tipSize") {
    // Q = Q4000 * sqrt(P/4000)  =>  P = 4000 * (Q/Q4000)^2
    const q4000 = Math.max(selectedQ4000, 1e-9);
    gunPsi = 4000 * Math.pow(pumpGpm / q4000, 2);
  } else {
    // Invert orifice equation: Q = Cd*A*sqrt(2*ΔP/ρ)
    // ΔP = ( (Q/(Cd*A))^2 ) * (ρ/2)
    const d = Math.max(selectedOrificeMm, 1e-9) / 1000; // m
    const A = Math.PI * (d * d) / 4;
    const Q = gpmToM3s(pumpGpm);
    const Cd = Math.max(inputs.dischargeCoeffCd, 1e-6);
    const rho = Math.max(inputs.waterDensity, 1e-9);

    const term = Q / (Cd * Math.max(A, 1e-12));
    const dP_pa = (term * term) * (rho / 2);
    gunPsi = paToPsi(dP_pa);
  }

  // Pump operating pressure = gun + hose loss
  const pumpPsiOperating = gunPsi + lossPsi;

  // Optional: cap at rated pressure (simple model)
  // If cap triggers, flow would drop below rated; we'll keep V1 simple and just cap pressure.
  const pumpPsi = Math.min(pumpPsiOperating, pumpPsiRated);
  const gunPressurePsi = Math.max(pumpPsi - lossPsi, 0);

  const lossPct = pumpPsiRated > 0 ? (lossPsi / pumpPsiRated) * 100 : 0;

  // Status vs calibrated nozzle
  const ratio = selectedQ4000 / Math.max(calibratedQ4000, 1e-9);
  const tol = 0.05;

  let status: SolveResult["status"] = "calibrated";
  let statusMessage = "Configuration is aligned with the rated pump operating point.";

  if (ratio < 1 - tol) {
    status = "under-calibrated";
    statusMessage =
      "Selected nozzle is smaller than the calibrated requirement. Pressure may rise above the intended point (unloader/bypass likely).";
  } else if (ratio > 1 + tol) {
    status = "over-calibrated";
    statusMessage =
      "Selected nozzle is larger than the calibrated requirement. Pressure will likely drop below the rated point.";
  }

  return {
    gunPressurePsi: clampPos(gunPressurePsi),
    gunFlowGpm: clampPos(pumpGpm), // flow-limited model

    hoseLossPsi: clampPos(lossPsi),
    hoseLossPct: clampPos(lossPct),

    selectedNozzleQ4000Gpm: clampPos(selectedQ4000),
    selectedTipCode,
    selectedOrificeMm: clampPos(selectedOrificeMm),

    calibratedNozzleQ4000Gpm: clampPos(calibratedQ4000),
    calibratedTipCode: calibratedCode,

    status,
    statusMessage
  };
}