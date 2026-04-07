import {
  barFromPsi,
  lpmFromGpm,
  roundTipCodeToFive,
  solvePressureCal,
} from "../pressurecal";
import type { SavedSetup } from "../hooks/useSavedSetups";
import type {
  DiameterUnit,
  FlowUnit,
  Inputs,
  LengthUnit,
  PressureUnit,
} from "../pressurecal";
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

const INPUT_DEFAULTS: Inputs = {
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
  engineHp: "",
  sprayMode: "wand",
  nozzleCount: 1,
  nozzleMode: "tipSize",
  nozzleSizeText: "040",
  orificeMm: 1.2,
  dischargeCoeffCd: 0.62,
  waterDensity: 1000,
  hoseRoughnessMm: 0.0015,
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

function toPsi(value: number, unit: PressureUnit) {
  return unit === "psi" ? value : value * 14.5037738;
}

function toLpm(value: number, unit: FlowUnit) {
  return unit === "lpm" ? value : value * 3.785411784;
}

function toMeters(value: number, unit: LengthUnit) {
  return unit === "m" ? value : value / 3.28084;
}

function toMillimetres(value: number, unit: DiameterUnit) {
  return unit === "mm" ? value : value * 25.4;
}

function toNullableNumber(value: number | string | null | undefined) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildSyntheticSavedSetup(inputs: Inputs, name: string, notes?: string | null): SavedSetup {
  const pumpPressure = toNullableNumber(inputs.pumpPressure);
  const pumpFlow = toNullableNumber(inputs.pumpFlow);
  const maxPressure = toNullableNumber(inputs.maxPressure);
  const hoseLength = toNullableNumber(inputs.hoseLength);
  const hoseId = toNullableNumber(inputs.hoseId);
  const engineHp = toNullableNumber(inputs.engineHp);
  const nozzleSizeText = (inputs.nozzleSizeText || "").trim() || null;

  return {
    id: "__current_calculator__",
    userId: "",
    name,
    notes: typeof notes === "string" ? notes : null,

    machinePsi: pumpPressure === null ? null : toPsi(pumpPressure, inputs.pumpPressureUnit),
    machineLpm: pumpFlow === null ? null : toLpm(pumpFlow, inputs.pumpFlowUnit),
    hoseLengthM: hoseLength === null ? null : toMeters(hoseLength, inputs.hoseLengthUnit),
    hoseIdMm: hoseId === null ? null : toMillimetres(hoseId, inputs.hoseIdUnit),
    nozzleSize: nozzleSizeText,

    pumpPressure,
    pumpPressureUnit: inputs.pumpPressureUnit,
    pumpFlow,
    pumpFlowUnit: inputs.pumpFlowUnit,
    maxPressure,
    maxPressureUnit: inputs.maxPressureUnit,
    hoseLength,
    hoseLengthUnit: inputs.hoseLengthUnit,
    hoseId,
    hoseIdUnit: inputs.hoseIdUnit,
    engineHp,
    sprayMode: inputs.sprayMode,
    nozzleCount: Math.max(inputs.sprayMode === "surfaceCleaner" ? 2 : 1, Number(inputs.nozzleCount || 1)),
    nozzleMode: "tipSize",
    nozzleSizeText,
    orificeMm: toNullableNumber(inputs.orificeMm),
    dischargeCoeffCd: toNullableNumber(inputs.dischargeCoeffCd),
    waterDensity: toNullableNumber(inputs.waterDensity),
    hoseRoughnessMm: toNullableNumber(inputs.hoseRoughnessMm),

    createdAt: new Date(0).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function compareInputsCore(setup: SavedSetup, inputs: Inputs): ComparedSetup {
  const result = solvePressureCal(inputs);
  const ratedPsi = toPsi(Number(inputs.pumpPressure || 0), inputs.pumpPressureUnit);
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

export function compareSavedSetup(setup: SavedSetup): ComparedSetup {
  const inputs = savedSetupToInputs(setup);
  return compareInputsCore(setup, inputs);
}

export function compareCurrentInputs(
  partialInputs: Partial<Inputs>,
  name = "Current calculator",
  notes: string | null = "Live calculator snapshot"
): ComparedSetup {
  const inputs: Inputs = {
    ...INPUT_DEFAULTS,
    ...partialInputs,
    engineHp: partialInputs.engineHp ?? INPUT_DEFAULTS.engineHp,
    nozzleMode: "tipSize",
    sprayMode: partialInputs.sprayMode ?? INPUT_DEFAULTS.sprayMode,
    nozzleCount:
      partialInputs.nozzleCount ??
      (partialInputs.sprayMode === "surfaceCleaner" ? 2 : INPUT_DEFAULTS.nozzleCount),
  };

  if (inputs.sprayMode === "wand") {
    inputs.nozzleCount = 1;
  } else {
    inputs.nozzleCount = Math.max(2, Number(inputs.nozzleCount || 2));
  }

  const setup = buildSyntheticSavedSetup(inputs, name, notes);
  return compareInputsCore(setup, inputs);
}
