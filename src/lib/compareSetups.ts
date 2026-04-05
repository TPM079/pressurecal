import {
  barFromPsi,
  lpmFromGpm,
  roundTipCodeToFive,
  solvePressureCal,
} from "../pressurecal";
import type { SavedSetup } from "../hooks/useSavedSetups";
import { savedSetupToInputs } from "./savedSetupToInputs";

export type ComparedSetup = {
  setup: SavedSetup;
  atGunPressurePsi: number;
  atGunPressureBar: number;
  hoseLossPsi: number;
  hoseLossBar: number;
  pressureVariancePct: number;
  operatingFlowLpm: number;
  operatingFlowGpm: number;
  selectedTipCode: string;
  calibratedTipCode: string;
  requiredHp: number;
  usableEngineHp: number | null;
  hasEngineHp: boolean;
  engineStatus: string;
  ratedPQ: number;
  ratedClass: string;
  gunPQ: number;
  gunClass: string;
  statusText: string;
  nozzleStatus: string;
  isPressureLimited: boolean;
};

function calculateRequiredHp(pressurePsi: number, flowGpm: number, efficiency = 0.9) {
  if (!Number.isFinite(pressurePsi) || !Number.isFinite(flowGpm) || efficiency <= 0) {
    return 0;
  }

  return (pressurePsi * flowGpm) / (1714 * efficiency);
}

function calculateUsableEngineHp(ratedHp: number, factor = 0.85) {
  return !Number.isFinite(ratedHp) || ratedHp <= 0 ? null : ratedHp * factor;
}

function getEngineStatus(requiredHp: number, usableHp: number | null) {
  if (usableHp === null) {
    return "Not provided";
  }

  if (usableHp < requiredHp) {
    return "Undersized";
  }

  if (usableHp < requiredHp * 1.1) {
    return "Near limit";
  }

  return "Healthy";
}

function getNozzleStatusLabel(status: "calibrated" | "under-calibrated" | "over-calibrated") {
  if (status === "calibrated") {
    return "Calibrated";
  }

  if (status === "under-calibrated") {
    return "Under-calibrated";
  }

  return "Over-calibrated";
}

export function compareSavedSetup(setup: SavedSetup): ComparedSetup {
  const inputs = savedSetupToInputs(setup);
  const result = solvePressureCal(inputs);
  const ratedPsi = Number(inputs.pumpPressure || 0);
  const pressureVariancePct =
    ratedPsi > 0 ? ((result.gunPressurePsi - ratedPsi) / ratedPsi) * 100 : 0;
  const requiredHp = calculateRequiredHp(result.gunPressurePsi, result.gunFlowGpm, 0.9);
  const rawEngineHp = inputs.engineHp === "" ? null : Number(inputs.engineHp);
  const usableEngineHp = calculateUsableEngineHp(rawEngineHp ?? NaN, 0.85);

  return {
    setup,
    atGunPressurePsi: result.gunPressurePsi,
    atGunPressureBar: barFromPsi(result.gunPressurePsi),
    hoseLossPsi: result.hoseLossPsi,
    hoseLossBar: barFromPsi(result.hoseLossPsi),
    pressureVariancePct,
    operatingFlowLpm: lpmFromGpm(result.gunFlowGpm),
    operatingFlowGpm: result.gunFlowGpm,
    selectedTipCode: roundTipCodeToFive(result.selectedTipCode),
    calibratedTipCode: roundTipCodeToFive(result.calibratedTipCode),
    requiredHp,
    usableEngineHp,
    hasEngineHp: usableEngineHp !== null,
    engineStatus: getEngineStatus(requiredHp, usableEngineHp),
    ratedPQ: result.ratedPQ,
    ratedClass: result.ratedClass,
    gunPQ: result.gunPQ,
    gunClass: result.gunClass,
    statusText: result.statusMessage,
    nozzleStatus: getNozzleStatusLabel(result.status),
    isPressureLimited: result.isPressureLimited,
  };
}
