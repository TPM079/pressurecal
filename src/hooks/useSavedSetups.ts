import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase-browser";
import {
  barFromPsi,
  lpmFromGpm,
  roundTipCodeToFive,
  solvePressureCal,
} from "../pressurecal";
import type {
  ANZSClass,
  DiameterUnit,
  FlowUnit,
  Inputs,
  LengthUnit,
  PressureUnit,
} from "../pressurecal";

export type SavedSetupHealthLevel = "excellent" | "good" | "review" | "warning";

export type SavedSetupHealth = {
  level: SavedSetupHealthLevel;
  label: string;
  score: number;
  summary: string;
  reasons: string[];
};

export type SavedSetupCalculatedResult = {
  schemaVersion: 1;
  atGunPressurePsi: number;
  atGunPressureBar: number;
  hoseLossPsi: number;
  hoseLossBar: number;
  hoseLossPercent: number;
  operatingFlowLpm: number;
  operatingFlowGpm: number;
  selectedTipCode: string;
  calibratedTipCode: string;
  selectedOrificeMm: number;
  requiredHp: number;
  usableEngineHp: number | null;
  engineStatus: "Not provided" | "Undersized" | "Near limit" | "Healthy";
  ratedPQ: number;
  ratedClass: ANZSClass;
  gunPQ: number;
  gunClass: ANZSClass;
  nozzleStatus: "Calibrated" | "Under-calibrated" | "Over-calibrated";
  statusMessage: string;
  pressureLimited: boolean;
  bypassFlowGpm: number;
  bypassPercent: number;
  resultSummary: string;
  warnings: string[];
  setupHealth?: SavedSetupHealth | null;
  calculatedAt: string;
};

export type SavedSetup = {
  id: string;
  userId: string;
  name: string;
  notes: string | null;

  machinePsi: number | null;
  machineLpm: number | null;
  hoseLengthM: number | null;
  hoseIdMm: number | null;
  nozzleSize: string | null;

  pumpPressure: number | null;
  pumpPressureUnit: PressureUnit;
  pumpFlow: number | null;
  pumpFlowUnit: FlowUnit;
  maxPressure: number | null;
  maxPressureUnit: PressureUnit;
  hoseLength: number | null;
  hoseLengthUnit: LengthUnit;
  hoseId: number | null;
  hoseIdUnit: DiameterUnit;
  engineHp: number | null;
  sprayMode: "wand" | "surfaceCleaner";
  nozzleCount: number;
  nozzleMode: "tipSize";
  nozzleSizeText: string | null;
  orificeMm: number | null;
  dischargeCoeffCd: number | null;
  waterDensity: number | null;
  hoseRoughnessMm: number | null;
  calculatedResult?: SavedSetupCalculatedResult | null;

  createdAt: string;
  updatedAt: string;
};

type SaveSetupInput = {
  id?: string;
  name: string;
  notes?: string | null;

  machinePsi?: number | null;
  machineLpm?: number | null;
  hoseLengthM?: number | null;
  hoseIdMm?: number | null;
  nozzleSize?: string | null;

  pumpPressure?: number | null;
  pumpPressureUnit?: PressureUnit;
  pumpFlow?: number | null;
  pumpFlowUnit?: FlowUnit;
  maxPressure?: number | null;
  maxPressureUnit?: PressureUnit;
  hoseLength?: number | null;
  hoseLengthUnit?: LengthUnit;
  hoseId?: number | null;
  hoseIdUnit?: DiameterUnit;
  engineHp?: number | null;
  sprayMode?: "wand" | "surfaceCleaner";
  nozzleCount?: number;
  nozzleMode?: "tipSize";
  nozzleSizeText?: string | null;
  orificeMm?: number | null;
  dischargeCoeffCd?: number | null;
  waterDensity?: number | null;
  hoseRoughnessMm?: number | null;
  calculatedResult?: SavedSetupCalculatedResult | null;
};

const DEFAULT_SNAPSHOT = {
  machinePsi: 4000,
  machineLpm: 15,
  hoseLengthM: 15,
  hoseIdMm: 9.53,
  nozzleSize: "040",

  pumpPressure: 4000,
  pumpPressureUnit: "psi" as PressureUnit,
  pumpFlow: 15,
  pumpFlowUnit: "lpm" as FlowUnit,
  maxPressure: 4000,
  maxPressureUnit: "psi" as PressureUnit,
  hoseLength: 15,
  hoseLengthUnit: "m" as LengthUnit,
  hoseId: 9.53,
  hoseIdUnit: "mm" as DiameterUnit,
  engineHp: null as number | null,
  sprayMode: "wand" as const,
  nozzleCount: 1,
  nozzleMode: "tipSize" as const,
  nozzleSizeText: "040",
  orificeMm: 1.2,
  dischargeCoeffCd: 0.62,
  waterDensity: 1000,
  hoseRoughnessMm: 0.0015,
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

function buildStorageKey(userId: string) {
  return `pressurecal:saved-setups:${userId}`;
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const segment = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  const variant = (8 + Math.floor(Math.random() * 4)).toString(16);

  return `${segment()}${segment()}-${segment()}-4${segment().slice(1)}-${variant}${segment().slice(1)}-${segment()}${segment()}${segment()}`;
}

function toNullableNumber(value: unknown, fallback: number | null) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toRequiredNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundNumber(value: number, decimals: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(decimals));
}

function toPressureUnit(value: unknown, fallback: PressureUnit): PressureUnit {
  return value === "psi" || value === "bar" ? value : fallback;
}

function toFlowUnit(value: unknown, fallback: FlowUnit): FlowUnit {
  return value === "lpm" || value === "gpm" ? value : fallback;
}

function toLengthUnit(value: unknown, fallback: LengthUnit): LengthUnit {
  return value === "m" || value === "ft" ? value : fallback;
}

function toDiameterUnit(value: unknown, fallback: DiameterUnit): DiameterUnit {
  return value === "mm" || value === "in" ? value : fallback;
}

function toSprayMode(
  value: unknown,
  fallback: "wand" | "surfaceCleaner"
): "wand" | "surfaceCleaner" {
  return value === "wand" || value === "surfaceCleaner" ? value : fallback;
}

function toANZSClass(value: unknown, fallback: ANZSClass): ANZSClass {
  return value === "Class A" || value === "Class B" ? value : fallback;
}

function calculateRequiredHp(pressurePsi: number, flowGpm: number, efficiency = 0.9) {
  if (!Number.isFinite(pressurePsi) || !Number.isFinite(flowGpm) || efficiency <= 0) {
    return 0;
  }

  return (pressurePsi * flowGpm) / (1714 * efficiency);
}

function calculateUsableEngineHp(ratedHp: number, factor = 0.85) {
  return !Number.isFinite(ratedHp) || ratedHp <= 0 ? null : ratedHp * factor;
}

function getEngineStatus(
  requiredHp: number,
  usableHp: number | null
): SavedSetupCalculatedResult["engineStatus"] {
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

function getNozzleStatusLabel(
  status: "calibrated" | "under-calibrated" | "over-calibrated"
): SavedSetupCalculatedResult["nozzleStatus"] {
  if (status === "calibrated") {
    return "Calibrated";
  }

  if (status === "under-calibrated") {
    return "Under-calibrated";
  }

  return "Over-calibrated";
}

function buildResultSummary(args: {
  atGunPressurePsi: number;
  operatingFlowLpm: number;
  hoseLossPsi: number;
  selectedTipCode: string;
  nozzleStatus: SavedSetupCalculatedResult["nozzleStatus"];
}) {
  const {
    atGunPressurePsi,
    operatingFlowLpm,
    hoseLossPsi,
    selectedTipCode,
    nozzleStatus,
  } = args;

  return `${roundNumber(atGunPressurePsi, 0)} PSI at gun · ${roundNumber(
    operatingFlowLpm,
    1
  )} LPM · ${roundNumber(hoseLossPsi, 0)} PSI hose loss · nozzle ${selectedTipCode} · ${nozzleStatus}`;
}

const NEGLIGIBLE_BYPASS_PERCENT = 2;
const MEASURABLE_BYPASS_PERCENT = 10;

function hasNegligibleBypass(bypassPercent: number) {
  return !Number.isFinite(bypassPercent) || bypassPercent < NEGLIGIBLE_BYPASS_PERCENT;
}

function buildNearMaxPressureNote(args: {
  bypassPercent: number;
  nozzleStatus: SavedSetupCalculatedResult["nozzleStatus"];
}) {
  if (args.nozzleStatus === "Calibrated" && hasNegligibleBypass(args.bypassPercent)) {
    return "Nozzle is closely matched. Confirm actual pressure with a gauge during field testing.";
  }

  if (hasNegligibleBypass(args.bypassPercent)) {
    return "Operating near max pressure — confirm actual pressure with a gauge during field testing.";
  }

  return "Operating near max pressure — confirm with a gauge if the unloader cycles.";
}

function buildWarnings(args: {
  hoseLossPercent: number;
  pressureLimited: boolean;
  bypassPercent: number;
  nozzleStatus: SavedSetupCalculatedResult["nozzleStatus"];
  engineStatus: SavedSetupCalculatedResult["engineStatus"];
}) {
  const warnings: string[] = [];

  if (args.hoseLossPercent >= 20) {
    warnings.push("Severe hose loss — check hose ID, length, or flow.");
  } else if (args.hoseLossPercent >= 10) {
    warnings.push("High hose loss — consider a larger hose ID or shorter hose run.");
  }

  if (args.pressureLimited) {
    warnings.push(
      buildNearMaxPressureNote({
        bypassPercent: args.bypassPercent,
        nozzleStatus: args.nozzleStatus,
      })
    );
  }

  if (args.nozzleStatus !== "Calibrated") {
    warnings.push(`Nozzle status: ${args.nozzleStatus}.`);
  }

  if (args.engineStatus === "Undersized") {
    warnings.push("Engine appears undersized for the calculated operating point.");
  } else if (args.engineStatus === "Near limit") {
    warnings.push("Engine is operating near the calculated requirement.");
  } else if (args.engineStatus === "Not provided") {
    warnings.push("Engine HP not provided — power status was not checked.");
  }

  return warnings;
}

function buildSetupHealth(args: {
  hoseLossPercent: number;
  pressureLimited: boolean;
  bypassPercent: number;
  nozzleStatus: SavedSetupCalculatedResult["nozzleStatus"];
  engineStatus: SavedSetupCalculatedResult["engineStatus"];
}): SavedSetupHealth {
  const reasons: string[] = [];
  let score = 100;

  if (args.hoseLossPercent >= 20) {
    score -= 30;
    reasons.push("Severe hose loss.");
  } else if (args.hoseLossPercent >= 10) {
    score -= 20;
    reasons.push("High hose loss.");
  } else if (args.hoseLossPercent >= 5) {
    score -= 8;
    reasons.push("Moderate hose loss.");
  }

  if (args.pressureLimited) {
    if (hasNegligibleBypass(args.bypassPercent) && args.nozzleStatus === "Calibrated") {
      score -= 12;
      reasons.push("Operating near max pressure with negligible calculated bypass.");
    } else if (hasNegligibleBypass(args.bypassPercent)) {
      score -= 15;
      reasons.push("Operating near max pressure. Confirm actual pressure with a gauge.");
    } else if (args.bypassPercent >= MEASURABLE_BYPASS_PERCENT) {
      score -= 18;
      reasons.push("Operating near max pressure with measurable bypass. Confirm with a gauge if the unloader cycles.");
    } else {
      score -= 15;
      reasons.push("Operating near max pressure. Confirm with a gauge if the unloader cycles.");
    }
  }

  if (args.nozzleStatus !== "Calibrated") {
    score -= 15;
    reasons.push(`Nozzle is ${args.nozzleStatus.toLowerCase()}.`);
  }

  if (args.engineStatus === "Undersized") {
    score -= 30;
    reasons.push("Engine appears undersized.");
  } else if (args.engineStatus === "Near limit") {
    score -= 15;
    reasons.push("Engine is near the calculated requirement.");
  } else if (args.engineStatus === "Not provided") {
    score -= 5;
    reasons.push("Engine HP has not been checked.");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score >= 90 && !args.pressureLimited && args.nozzleStatus === "Calibrated") {
    return {
      level: "excellent",
      label: "Excellent match",
      score,
      summary: "Low loss and setup match look strong.",
      reasons: reasons.length > 0 ? reasons : ["No major setup issues detected."],
    };
  }

  if (score >= 75) {
    return {
      level: "good",
      label: "Good working setup",
      score,
      summary: "Useful working setup with minor items to keep an eye on.",
      reasons: reasons.length > 0 ? reasons : ["No major setup issues detected."],
    };
  }

  if (score >= 55) {
    return {
      level: "review",
      label: "Review setup",
      score,
      summary: "Check the notes below before treating this as a known-good setup.",
      reasons,
    };
  }

  return {
    level: "warning",
    label: "Check setup",
    score,
    summary: "This setup needs attention before being treated as known-good.",
    reasons,
  };
}

function buildDisplayArgsFromResult(result: SavedSetupCalculatedResult) {
  return {
    hoseLossPercent: result.hoseLossPercent,
    pressureLimited: result.pressureLimited,
    bypassPercent: result.bypassPercent,
    nozzleStatus: result.nozzleStatus,
    engineStatus: result.engineStatus,
  };
}

export function getDisplaySetupHealth(result: SavedSetupCalculatedResult): SavedSetupHealth {
  return buildSetupHealth(buildDisplayArgsFromResult(result));
}

export function getDisplayReviewNotes(result: SavedSetupCalculatedResult) {
  const notes = buildWarnings(buildDisplayArgsFromResult(result)).filter(
    (warning) => warning.length > 0
  );

  return Array.from(new Set(notes));
}

export function buildCalculatedResultFromInputs(
  inputs: Inputs,
  calculatedAt = new Date().toISOString()
): SavedSetupCalculatedResult {
  const safeInputs: Inputs = {
    ...INPUT_DEFAULTS,
    ...inputs,
    pumpPressure: Number(inputs.pumpPressure || 0),
    pumpFlow: Number(inputs.pumpFlow || 0),
    maxPressure: Number(inputs.maxPressure || 0),
    hoseLength: Number(inputs.hoseLength || 0),
    hoseId: Number(inputs.hoseId || 0),
    engineHp: inputs.engineHp === "" ? "" : Number(inputs.engineHp || 0),
    nozzleCount: Math.max(
      inputs.sprayMode === "surfaceCleaner" ? 2 : 1,
      Number(inputs.nozzleCount || 1)
    ),
    orificeMm: Number(inputs.orificeMm || INPUT_DEFAULTS.orificeMm),
    dischargeCoeffCd: Number(inputs.dischargeCoeffCd || INPUT_DEFAULTS.dischargeCoeffCd),
    waterDensity: Number(inputs.waterDensity || INPUT_DEFAULTS.waterDensity),
    hoseRoughnessMm: Number(inputs.hoseRoughnessMm || INPUT_DEFAULTS.hoseRoughnessMm),
  };

  const result = solvePressureCal(safeInputs);
  const atGunPressureBar = barFromPsi(result.gunPressurePsi);
  const hoseLossBar = barFromPsi(result.hoseLossPsi);
  const operatingFlowLpm = lpmFromGpm(result.gunFlowGpm);
  const requiredHp = calculateRequiredHp(result.gunPressurePsi, result.gunFlowGpm, 0.9);
  const rawEngineHp = safeInputs.engineHp === "" ? null : Number(safeInputs.engineHp);
  const usableEngineHp = calculateUsableEngineHp(rawEngineHp ?? NaN, 0.85);
  const engineStatus = getEngineStatus(requiredHp, usableEngineHp);
  const nozzleStatus = getNozzleStatusLabel(result.status);
  const selectedTipCode = roundTipCodeToFive(result.selectedTipCode);
  const calibratedTipCode = roundTipCodeToFive(result.calibratedTipCode);
  const hoseLossPercent = roundNumber(result.hoseLossPct, 1);
  const bypassPercent = roundNumber(result.bypassPct, 1);
  const pressureLimited = result.isPressureLimited;

  const summary = buildResultSummary({
    atGunPressurePsi: result.gunPressurePsi,
    operatingFlowLpm,
    hoseLossPsi: result.hoseLossPsi,
    selectedTipCode,
    nozzleStatus,
  });
  const warnings = buildWarnings({
    hoseLossPercent,
    pressureLimited,
    bypassPercent,
    nozzleStatus,
    engineStatus,
  });
  const setupHealth = buildSetupHealth({
    hoseLossPercent,
    pressureLimited,
    bypassPercent,
    nozzleStatus,
    engineStatus,
  });

  return {
    schemaVersion: 1,
    atGunPressurePsi: roundNumber(result.gunPressurePsi, 0),
    atGunPressureBar: roundNumber(atGunPressureBar, 1),
    hoseLossPsi: roundNumber(result.hoseLossPsi, 0),
    hoseLossBar: roundNumber(hoseLossBar, 1),
    hoseLossPercent,
    operatingFlowLpm: roundNumber(operatingFlowLpm, 1),
    operatingFlowGpm: roundNumber(result.gunFlowGpm, 2),
    selectedTipCode,
    calibratedTipCode,
    selectedOrificeMm: roundNumber(result.selectedOrificeMm, 2),
    requiredHp: roundNumber(requiredHp, 1),
    usableEngineHp: usableEngineHp === null ? null : roundNumber(usableEngineHp, 1),
    engineStatus,
    ratedPQ: roundNumber(result.ratedPQ, 0),
    ratedClass: result.ratedClass,
    gunPQ: roundNumber(result.gunPQ, 0),
    gunClass: result.gunClass,
    nozzleStatus,
    statusMessage: result.statusMessage,
    pressureLimited,
    bypassFlowGpm: roundNumber(result.bypassFlowGpm, 2),
    bypassPercent,
    resultSummary: summary,
    warnings,
    setupHealth,
    calculatedAt,
  };
}

function normalizeCalculatedResult(raw: unknown): SavedSetupCalculatedResult | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const item = raw as Record<string, unknown>;
  const atGunPressurePsi = toRequiredNumber(item.atGunPressurePsi, NaN);
  const hoseLossPsi = toRequiredNumber(item.hoseLossPsi, NaN);
  const operatingFlowLpm = toRequiredNumber(item.operatingFlowLpm, NaN);

  if (
    !Number.isFinite(atGunPressurePsi) ||
    !Number.isFinite(hoseLossPsi) ||
    !Number.isFinite(operatingFlowLpm)
  ) {
    return null;
  }

  const nozzleStatus =
    item.nozzleStatus === "Calibrated" ||
    item.nozzleStatus === "Under-calibrated" ||
    item.nozzleStatus === "Over-calibrated"
      ? item.nozzleStatus
      : "Calibrated";

  const engineStatus =
    item.engineStatus === "Undersized" ||
    item.engineStatus === "Near limit" ||
    item.engineStatus === "Healthy" ||
    item.engineStatus === "Not provided"
      ? item.engineStatus
      : "Not provided";

  const hoseLossPercent = roundNumber(toRequiredNumber(item.hoseLossPercent, 0), 1);
  const pressureLimited = Boolean(item.pressureLimited);
  const bypassPercent = roundNumber(toRequiredNumber(item.bypassPercent, 0), 1);
  const warnings = buildWarnings({
    hoseLossPercent,
    pressureLimited,
    bypassPercent,
    nozzleStatus,
    engineStatus,
  });
  const setupHealth = buildSetupHealth({
    hoseLossPercent,
    pressureLimited,
    bypassPercent,
    nozzleStatus,
    engineStatus,
  });

  return {
    schemaVersion: 1,
    atGunPressurePsi: roundNumber(atGunPressurePsi, 0),
    atGunPressureBar: roundNumber(toRequiredNumber(item.atGunPressureBar, barFromPsi(atGunPressurePsi)), 1),
    hoseLossPsi: roundNumber(hoseLossPsi, 0),
    hoseLossBar: roundNumber(toRequiredNumber(item.hoseLossBar, barFromPsi(hoseLossPsi)), 1),
    hoseLossPercent,
    operatingFlowLpm: roundNumber(operatingFlowLpm, 1),
    operatingFlowGpm: roundNumber(toRequiredNumber(item.operatingFlowGpm, 0), 2),
    selectedTipCode:
      typeof item.selectedTipCode === "string" && item.selectedTipCode.trim()
        ? item.selectedTipCode.trim()
        : "—",
    calibratedTipCode:
      typeof item.calibratedTipCode === "string" && item.calibratedTipCode.trim()
        ? item.calibratedTipCode.trim()
        : "—",
    selectedOrificeMm: roundNumber(toRequiredNumber(item.selectedOrificeMm, 0), 2),
    requiredHp: roundNumber(toRequiredNumber(item.requiredHp, 0), 1),
    usableEngineHp:
      item.usableEngineHp === null || item.usableEngineHp === undefined
        ? null
        : roundNumber(toRequiredNumber(item.usableEngineHp, 0), 1),
    engineStatus,
    ratedPQ: roundNumber(toRequiredNumber(item.ratedPQ, 0), 0),
    ratedClass: toANZSClass(item.ratedClass, "Class A"),
    gunPQ: roundNumber(toRequiredNumber(item.gunPQ, 0), 0),
    gunClass: toANZSClass(item.gunClass, "Class A"),
    nozzleStatus,
    statusMessage:
      typeof item.statusMessage === "string" && item.statusMessage.trim()
        ? item.statusMessage.trim()
        : "Calculated result saved with this setup.",
    pressureLimited,
    bypassFlowGpm: roundNumber(toRequiredNumber(item.bypassFlowGpm, 0), 2),
    bypassPercent,
    resultSummary:
      typeof item.resultSummary === "string" && item.resultSummary.trim()
        ? item.resultSummary.trim()
        : buildResultSummary({
            atGunPressurePsi,
            operatingFlowLpm,
            hoseLossPsi,
            selectedTipCode:
              typeof item.selectedTipCode === "string" ? item.selectedTipCode : "—",
            nozzleStatus,
          }),
    warnings,
    setupHealth,
    calculatedAt:
      typeof item.calculatedAt === "string" && item.calculatedAt
        ? item.calculatedAt
        : new Date().toISOString(),
  };
}

function normalizeSavedSetup(raw: unknown, userId: string): SavedSetup | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const item = raw as Record<string, unknown>;
  const now = new Date().toISOString();

  const machinePsi = toNullableNumber(item.machinePsi, DEFAULT_SNAPSHOT.machinePsi);
  const machineLpm = toNullableNumber(item.machineLpm, DEFAULT_SNAPSHOT.machineLpm);
  const hoseLengthM = toNullableNumber(item.hoseLengthM, DEFAULT_SNAPSHOT.hoseLengthM);
  const hoseIdMm = toNullableNumber(item.hoseIdMm, DEFAULT_SNAPSHOT.hoseIdMm);
  const nozzleSize =
    typeof item.nozzleSize === "string" && item.nozzleSize.trim()
      ? item.nozzleSize.trim()
      : DEFAULT_SNAPSHOT.nozzleSize;

  const pumpPressure = toNullableNumber(
    item.pumpPressure,
    machinePsi ?? DEFAULT_SNAPSHOT.pumpPressure
  );
  const pumpPressureUnit = toPressureUnit(
    item.pumpPressureUnit,
    DEFAULT_SNAPSHOT.pumpPressureUnit
  );
  const pumpFlow = toNullableNumber(
    item.pumpFlow,
    machineLpm ?? DEFAULT_SNAPSHOT.pumpFlow
  );
  const pumpFlowUnit = toFlowUnit(item.pumpFlowUnit, DEFAULT_SNAPSHOT.pumpFlowUnit);
  const maxPressure = toNullableNumber(
    item.maxPressure,
    pumpPressure ?? DEFAULT_SNAPSHOT.maxPressure
  );
  const maxPressureUnit = toPressureUnit(item.maxPressureUnit, pumpPressureUnit);
  const hoseLength = toNullableNumber(
    item.hoseLength,
    hoseLengthM ?? DEFAULT_SNAPSHOT.hoseLength
  );
  const hoseLengthUnit = toLengthUnit(item.hoseLengthUnit, DEFAULT_SNAPSHOT.hoseLengthUnit);
  const hoseId = toNullableNumber(item.hoseId, hoseIdMm ?? DEFAULT_SNAPSHOT.hoseId);
  const hoseIdUnit = toDiameterUnit(item.hoseIdUnit, DEFAULT_SNAPSHOT.hoseIdUnit);
  const engineHp = toNullableNumber(item.engineHp, DEFAULT_SNAPSHOT.engineHp);
  const sprayMode = toSprayMode(item.sprayMode, DEFAULT_SNAPSHOT.sprayMode);
  const nozzleCount = Math.max(
    sprayMode === "surfaceCleaner" ? 2 : 1,
    toNullableNumber(item.nozzleCount, DEFAULT_SNAPSHOT.nozzleCount) ?? DEFAULT_SNAPSHOT.nozzleCount
  );

  const nozzleSizeText =
    typeof item.nozzleSizeText === "string" && item.nozzleSizeText.trim()
      ? item.nozzleSizeText.trim()
      : nozzleSize ?? DEFAULT_SNAPSHOT.nozzleSizeText;

  const setup: SavedSetup = {
    id: typeof item.id === "string" && item.id ? item.id : makeId(),
    userId,
    name:
      typeof item.name === "string" && item.name.trim()
        ? item.name.trim()
        : "Untitled setup",
    notes: typeof item.notes === "string" ? item.notes : null,

    machinePsi,
    machineLpm,
    hoseLengthM,
    hoseIdMm,
    nozzleSize,

    pumpPressure,
    pumpPressureUnit,
    pumpFlow,
    pumpFlowUnit,
    maxPressure,
    maxPressureUnit,
    hoseLength,
    hoseLengthUnit,
    hoseId,
    hoseIdUnit,
    engineHp,
    sprayMode,
    nozzleCount,
    nozzleMode: "tipSize",
    nozzleSizeText,
    orificeMm: toNullableNumber(item.orificeMm, DEFAULT_SNAPSHOT.orificeMm),
    dischargeCoeffCd: toNullableNumber(
      item.dischargeCoeffCd,
      DEFAULT_SNAPSHOT.dischargeCoeffCd
    ),
    waterDensity: toNullableNumber(item.waterDensity, DEFAULT_SNAPSHOT.waterDensity),
    hoseRoughnessMm: toNullableNumber(
      item.hoseRoughnessMm,
      DEFAULT_SNAPSHOT.hoseRoughnessMm
    ),

    createdAt:
      typeof item.createdAt === "string" && item.createdAt ? item.createdAt : now,
    updatedAt:
      typeof item.updatedAt === "string" && item.updatedAt ? item.updatedAt : now,
  };

  setup.calculatedResult =
    normalizeCalculatedResult(item.calculatedResult ?? item.calculated_result) ??
    buildCalculatedResultFromInputs(inputsFromSavedSetup(setup), setup.updatedAt);

  return setup;
}

export function inputsFromSavedSetup(setup: SavedSetup): Inputs {
  return {
    pumpPressure: setup.pumpPressure ?? INPUT_DEFAULTS.pumpPressure,
    pumpPressureUnit: setup.pumpPressureUnit,
    pumpFlow: setup.pumpFlow ?? INPUT_DEFAULTS.pumpFlow,
    pumpFlowUnit: setup.pumpFlowUnit,
    maxPressure: setup.maxPressure ?? INPUT_DEFAULTS.maxPressure,
    maxPressureUnit: setup.maxPressureUnit,
    hoseLength: setup.hoseLength ?? INPUT_DEFAULTS.hoseLength,
    hoseLengthUnit: setup.hoseLengthUnit,
    hoseId: setup.hoseId ?? INPUT_DEFAULTS.hoseId,
    hoseIdUnit: setup.hoseIdUnit,
    engineHp: setup.engineHp ?? INPUT_DEFAULTS.engineHp,
    sprayMode: setup.sprayMode,
    nozzleCount: setup.nozzleCount,
    nozzleMode: "tipSize",
    nozzleSizeText: setup.nozzleSizeText ?? INPUT_DEFAULTS.nozzleSizeText,
    orificeMm: setup.orificeMm ?? INPUT_DEFAULTS.orificeMm,
    dischargeCoeffCd: setup.dischargeCoeffCd ?? INPUT_DEFAULTS.dischargeCoeffCd,
    waterDensity: setup.waterDensity ?? INPUT_DEFAULTS.waterDensity,
    hoseRoughnessMm: setup.hoseRoughnessMm ?? INPUT_DEFAULTS.hoseRoughnessMm,
  };
}

type SavedSetupRow = {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  machine_label: string | null;
  schema_version: number;
  rig_inputs: Record<string, unknown>;
  result_snapshot: Record<string, unknown> | null;
  summary: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type SavedSetupDatabasePayload = {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  machine_label: string | null;
  schema_version: number;
  rig_inputs: Inputs;
  result_snapshot: SavedSetupCalculatedResult | null;
  summary: Record<string, unknown>;
};

function buildMigrationKey(userId: string) {
  return `pressurecal:saved-setups:supabase-imported:${userId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (isRecord(error) && typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }

  return "Saved setups could not be updated. Please try again.";
}

function buildSavedSetupFromInput(args: {
  input: SaveSetupInput;
  userId: string;
  existing?: SavedSetup | null;
  timestamp: string;
}) {
  const { input, userId, existing, timestamp } = args;

  const nextSetup: SavedSetup = {
    id: existing?.id ?? input.id ?? makeId(),
    userId,
    name: input.name.trim() || existing?.name || "Untitled setup",
    notes:
      typeof input.notes === "string" && input.notes.trim()
        ? input.notes.trim()
        : null,

    machinePsi: input.machinePsi ?? existing?.machinePsi ?? DEFAULT_SNAPSHOT.machinePsi,
    machineLpm: input.machineLpm ?? existing?.machineLpm ?? DEFAULT_SNAPSHOT.machineLpm,
    hoseLengthM:
      input.hoseLengthM ?? existing?.hoseLengthM ?? DEFAULT_SNAPSHOT.hoseLengthM,
    hoseIdMm: input.hoseIdMm ?? existing?.hoseIdMm ?? DEFAULT_SNAPSHOT.hoseIdMm,
    nozzleSize: input.nozzleSize ?? existing?.nozzleSize ?? DEFAULT_SNAPSHOT.nozzleSize,

    pumpPressure:
      input.pumpPressure ?? existing?.pumpPressure ?? DEFAULT_SNAPSHOT.pumpPressure,
    pumpPressureUnit:
      input.pumpPressureUnit ??
      existing?.pumpPressureUnit ??
      DEFAULT_SNAPSHOT.pumpPressureUnit,
    pumpFlow: input.pumpFlow ?? existing?.pumpFlow ?? DEFAULT_SNAPSHOT.pumpFlow,
    pumpFlowUnit:
      input.pumpFlowUnit ?? existing?.pumpFlowUnit ?? DEFAULT_SNAPSHOT.pumpFlowUnit,
    maxPressure:
      input.maxPressure ?? existing?.maxPressure ?? DEFAULT_SNAPSHOT.maxPressure,
    maxPressureUnit:
      input.maxPressureUnit ??
      existing?.maxPressureUnit ??
      DEFAULT_SNAPSHOT.maxPressureUnit,
    hoseLength:
      input.hoseLength ?? existing?.hoseLength ?? DEFAULT_SNAPSHOT.hoseLength,
    hoseLengthUnit:
      input.hoseLengthUnit ?? existing?.hoseLengthUnit ?? DEFAULT_SNAPSHOT.hoseLengthUnit,
    hoseId: input.hoseId ?? existing?.hoseId ?? DEFAULT_SNAPSHOT.hoseId,
    hoseIdUnit:
      input.hoseIdUnit ?? existing?.hoseIdUnit ?? DEFAULT_SNAPSHOT.hoseIdUnit,
    engineHp: input.engineHp ?? existing?.engineHp ?? null,
    sprayMode: input.sprayMode ?? existing?.sprayMode ?? DEFAULT_SNAPSHOT.sprayMode,
    nozzleCount:
      input.nozzleCount ?? existing?.nozzleCount ?? DEFAULT_SNAPSHOT.nozzleCount,
    nozzleMode: "tipSize",
    nozzleSizeText:
      input.nozzleSizeText ?? existing?.nozzleSizeText ?? DEFAULT_SNAPSHOT.nozzleSizeText,
    orificeMm: input.orificeMm ?? existing?.orificeMm ?? DEFAULT_SNAPSHOT.orificeMm,
    dischargeCoeffCd:
      input.dischargeCoeffCd ??
      existing?.dischargeCoeffCd ??
      DEFAULT_SNAPSHOT.dischargeCoeffCd,
    waterDensity:
      input.waterDensity ?? existing?.waterDensity ?? DEFAULT_SNAPSHOT.waterDensity,
    hoseRoughnessMm:
      input.hoseRoughnessMm ??
      existing?.hoseRoughnessMm ??
      DEFAULT_SNAPSHOT.hoseRoughnessMm,

    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  nextSetup.calculatedResult =
    input.calculatedResult ??
    buildCalculatedResultFromInputs(inputsFromSavedSetup(nextSetup), timestamp);

  return nextSetup;
}

function buildSummary(setup: SavedSetup): Record<string, unknown> {
  return {
    machinePsi: setup.machinePsi,
    machineLpm: setup.machineLpm,
    hoseLengthM: setup.hoseLengthM,
    hoseIdMm: setup.hoseIdMm,
    nozzleSize: setup.nozzleSize,
    resultSummary: setup.calculatedResult?.resultSummary ?? null,
    setupHealth: setup.calculatedResult?.setupHealth ?? null,
  };
}

function savedSetupToDatabasePayload(setup: SavedSetup): SavedSetupDatabasePayload {
  return {
    id: setup.id,
    user_id: setup.userId,
    name: setup.name,
    notes: setup.notes,
    machine_label: null,
    schema_version: 1,
    rig_inputs: inputsFromSavedSetup(setup),
    result_snapshot: setup.calculatedResult ?? null,
    summary: buildSummary(setup),
  };
}

function normalizeSupabaseRow(row: SavedSetupRow, userId: string): SavedSetup | null {
  const rigInputs = isRecord(row.rig_inputs) ? row.rig_inputs : {};
  const summary = isRecord(row.summary) ? row.summary : {};

  return normalizeSavedSetup(
    {
      id: row.id,
      name: row.name,
      notes: row.notes,
      machinePsi: summary.machinePsi ?? rigInputs.machinePsi,
      machineLpm: summary.machineLpm ?? rigInputs.machineLpm,
      hoseLengthM: summary.hoseLengthM ?? rigInputs.hoseLengthM,
      hoseIdMm: summary.hoseIdMm ?? rigInputs.hoseIdMm,
      nozzleSize: summary.nozzleSize ?? rigInputs.nozzleSize ?? rigInputs.nozzleSizeText,
      pumpPressure: rigInputs.pumpPressure,
      pumpPressureUnit: rigInputs.pumpPressureUnit,
      pumpFlow: rigInputs.pumpFlow,
      pumpFlowUnit: rigInputs.pumpFlowUnit,
      maxPressure: rigInputs.maxPressure,
      maxPressureUnit: rigInputs.maxPressureUnit,
      hoseLength: rigInputs.hoseLength,
      hoseLengthUnit: rigInputs.hoseLengthUnit,
      hoseId: rigInputs.hoseId,
      hoseIdUnit: rigInputs.hoseIdUnit,
      engineHp: rigInputs.engineHp,
      sprayMode: rigInputs.sprayMode,
      nozzleCount: rigInputs.nozzleCount,
      nozzleSizeText: rigInputs.nozzleSizeText,
      orificeMm: rigInputs.orificeMm,
      dischargeCoeffCd: rigInputs.dischargeCoeffCd,
      waterDensity: rigInputs.waterDensity,
      hoseRoughnessMm: rigInputs.hoseRoughnessMm,
      calculatedResult: row.result_snapshot,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    userId
  );
}

async function fetchSavedSetups(userId: string) {
  const { data, error } = await supabase
    .from("saved_setups")
    .select(
      "id,user_id,name,notes,machine_label,schema_version,rig_inputs,result_snapshot,summary,created_at,updated_at"
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => normalizeSupabaseRow(row as SavedSetupRow, userId))
    .filter((setup): setup is SavedSetup => setup !== null);
}

function readLegacyLocalSetups(userId: string) {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(buildStorageKey(userId));
  const parsed = raw ? (JSON.parse(raw) as unknown) : [];

  return Array.isArray(parsed)
    ? parsed
        .map((item) => normalizeSavedSetup(item, userId))
        .filter((item): item is SavedSetup => item !== null)
    : [];
}

async function importLegacyLocalSetups(userId: string) {
  if (typeof window === "undefined") {
    return [];
  }

  const migrationKey = buildMigrationKey(userId);

  if (window.localStorage.getItem(migrationKey) === "done") {
    return [];
  }

  const legacySetups = readLegacyLocalSetups(userId);

  if (legacySetups.length === 0) {
    window.localStorage.setItem(migrationKey, "done");
    return [];
  }

  const { data, error } = await supabase
    .from("saved_setups")
    .upsert(legacySetups.map(savedSetupToDatabasePayload), { onConflict: "id" })
    .select(
      "id,user_id,name,notes,machine_label,schema_version,rig_inputs,result_snapshot,summary,created_at,updated_at"
    );

  if (error) {
    throw error;
  }

  window.localStorage.setItem(migrationKey, "done");

  return (data ?? [])
    .map((row) => normalizeSupabaseRow(row as SavedSetupRow, userId))
    .filter((setup): setup is SavedSetup => setup !== null);
}

function replaceSetup(current: SavedSetup[], setup: SavedSetup) {
  const withoutExisting = current.filter((item) => item.id !== setup.id);
  return [setup, ...withoutExisting].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function useSavedSetups(userId: string | null) {
  const [setups, setSetups] = useState<SavedSetup[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSetups = useCallback(async () => {
    if (!userId) {
      setSetups([]);
      setIsReady(true);
      setError(null);
      return [];
    }

    setIsReady(false);
    setError(null);

    try {
      let nextSetups = await fetchSavedSetups(userId);

      if (nextSetups.length === 0) {
        try {
          const importedSetups = await importLegacyLocalSetups(userId);
          if (importedSetups.length > 0) {
            nextSetups = importedSetups;
          }
        } catch (legacyImportError) {
          console.error("Could not import local saved setups", legacyImportError);
        }
      }

      setSetups(nextSetups);
      return nextSetups;
    } catch (loadError) {
      const message = getErrorMessage(loadError);
      console.error(loadError);
      setError(message);
      setSetups([]);
      return [];
    } finally {
      setIsReady(true);
    }
  }, [userId]);

  useEffect(() => {
    void refreshSetups();
  }, [refreshSetups]);

  const saveSetup = useCallback(
    async (input: SaveSetupInput) => {
      if (!userId) {
        throw new Error("Cannot save setup without a signed-in user.");
      }

      const timestamp = new Date().toISOString();
      const existing = input.id ? setups.find((setup) => setup.id === input.id) : null;
      const nextSetup = buildSavedSetupFromInput({
        input,
        userId,
        existing,
        timestamp,
      });
      const previousSetups = setups;

      setError(null);
      setIsMutating(true);
      setSetups((current) => replaceSetup(current, nextSetup));

      try {
        const { data, error: saveError } = await supabase
          .from("saved_setups")
          .upsert(savedSetupToDatabasePayload(nextSetup), { onConflict: "id" })
          .select(
            "id,user_id,name,notes,machine_label,schema_version,rig_inputs,result_snapshot,summary,created_at,updated_at"
          )
          .single();

        if (saveError) {
          throw saveError;
        }

        const savedSetup = normalizeSupabaseRow(data as SavedSetupRow, userId) ?? nextSetup;
        setSetups((current) => replaceSetup(current, savedSetup));
        return savedSetup;
      } catch (saveError) {
        const message = getErrorMessage(saveError);
        console.error(saveError);
        setError(message);
        setSetups(previousSetups);
        throw saveError;
      } finally {
        setIsMutating(false);
      }
    },
    [setups, userId]
  );

  const deleteSetup = useCallback(
    async (setupId: string) => {
      if (!userId) {
        throw new Error("Cannot delete setup without a signed-in user.");
      }

      const previousSetups = setups;

      setError(null);
      setIsMutating(true);
      setSetups((current) => current.filter((setup) => setup.id !== setupId));

      try {
        const { error: deleteError } = await supabase
          .from("saved_setups")
          .delete()
          .eq("id", setupId)
          .eq("user_id", userId);

        if (deleteError) {
          throw deleteError;
        }
      } catch (deleteError) {
        const message = getErrorMessage(deleteError);
        console.error(deleteError);
        setError(message);
        setSetups(previousSetups);
        throw deleteError;
      } finally {
        setIsMutating(false);
      }
    },
    [setups, userId]
  );

  const duplicateSetup = useCallback(
    async (setupId: string) => {
      const source = setups.find((setup) => setup.id === setupId);

      if (!source || !userId) {
        return null;
      }

      const timestamp = new Date().toISOString();
      const copy: SavedSetup = {
        ...source,
        id: makeId(),
        name: `${source.name} (copy)`,
        createdAt: timestamp,
        updatedAt: timestamp,
        calculatedResult:
          source.calculatedResult ?? buildCalculatedResultFromInputs(inputsFromSavedSetup(source), timestamp),
      };
      const previousSetups = setups;

      setError(null);
      setIsMutating(true);
      setSetups((current) => replaceSetup(current, copy));

      try {
        const { data, error: duplicateError } = await supabase
          .from("saved_setups")
          .insert(savedSetupToDatabasePayload(copy))
          .select(
            "id,user_id,name,notes,machine_label,schema_version,rig_inputs,result_snapshot,summary,created_at,updated_at"
          )
          .single();

        if (duplicateError) {
          throw duplicateError;
        }

        const savedCopy = normalizeSupabaseRow(data as SavedSetupRow, userId) ?? copy;
        setSetups((current) => replaceSetup(current, savedCopy));
        return savedCopy;
      } catch (duplicateError) {
        const message = getErrorMessage(duplicateError);
        console.error(duplicateError);
        setError(message);
        setSetups(previousSetups);
        throw duplicateError;
      } finally {
        setIsMutating(false);
      }
    },
    [setups, userId]
  );

  const getSetupById = useCallback(
    (setupId: string) => setups.find((setup) => setup.id === setupId) ?? null,
    [setups]
  );

  return useMemo(
    () => ({
      setups,
      isReady,
      isMutating,
      error,
      saveSetup,
      deleteSetup,
      duplicateSetup,
      getSetupById,
      refreshSetups,
    }),
    [
      deleteSetup,
      duplicateSetup,
      error,
      getSetupById,
      isMutating,
      isReady,
      refreshSetups,
      saveSetup,
      setups,
    ]
  );
}
