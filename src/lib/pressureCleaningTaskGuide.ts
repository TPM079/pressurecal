import {
  barFromPsi,
  gpmFrom,
  hoseLossPsi as pressureCalHoseLossPsi,
  lpmFromGpm,
  metersFrom,
  mmFrom,
  psiFrom,
} from "../pressurecal";
import type {
  FlowUnit,
  HoseSetupMode,
  Inputs,
  LengthUnit,
  PressureUnit,
} from "../pressurecal";
import { STANDARD_NOZZLE_SIZES, formatTipCode } from "./targetPressureNozzle";
import { buildFullSetupHref } from "./fullSetupShareLinks";
import type {
  FilledStatus,
  InstallationArea,
  JointCondition,
  MaterialFinish,
  PressureCleaningTaskRecord,
  PressureGuidance,
  SealedStatus,
} from "../data/pressureCleaningTaskGuides";

export type AttachmentType = "wand" | "surfaceCleaner";
export type SurfaceCleanerDiameterUnit = "in" | "mm";

export const SURFACE_CLEANER_MIN_NOZZLE_COUNT = 2;
export const TENNIS_COURT_TASK_SLUG = "painted-acrylic-hard-tennis-court";

/** Fan angles exposed by the task-guide UI.
 *
 * Keep this list as the single source of truth for the select, URL parsing,
 * input normalisation and validation. The generic nozzle-code formatter still
 * supports 0-degree codes for other PressureCal tools, but the task guide does
 * not expose a 0-degree option.
 */
export const TASK_GUIDE_FAN_ANGLES = [15, 25, 40] as const;
export type TaskGuideFanAngle = (typeof TASK_GUIDE_FAN_ANGLES)[number];

export function isTaskGuideFanAngle(value: unknown): value is TaskGuideFanAngle {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    (TASK_GUIDE_FAN_ANGLES as readonly number[]).includes(value)
  );
}

export type TaskGuideHoseInput = {
  hoseSetupMode: HoseSetupMode;
  hoseLength?: number;
  hoseLengthUnit: LengthUnit;
  hoseId?: number;
  hoseIdUnit: "mm" | "in";
  mainHoseLength?: number;
  mainHoseId?: number;
  leaderHoseLength?: number;
  leaderHoseId?: number;
};

export type PressureCleaningJobDetails = {
  materialFinish?: MaterialFinish;
  filledStatus?: FilledStatus;
  sealedStatus?: SealedStatus;
  jointCondition?: JointCondition;
  installationArea?: InstallationArea;
  manufacturerOrProduct?: string;
  confirmsSoundSurface?: boolean;
  asbestosMayBePresent?: boolean;
};

export type PressureCleaningTaskGuideInput = {
  taskSlug: string;
  jobName: string;
  machinePressure: number;
  machinePressureUnit: PressureUnit;
  machineFlow: number;
  machineFlowUnit: FlowUnit;
  maxPressure?: number;
  maxPressureUnit: PressureUnit;
  attachmentType: AttachmentType;
  surfaceCleanerDiameter?: number;
  surfaceCleanerDiameterUnit: SurfaceCleanerDiameterUnit;
  nozzleCount: number;
  nozzleSprayAngleDeg: number;
  currentNozzleText: string;
  attachmentMinPressurePsi?: number;
  attachmentMaxPressurePsi?: number;
  attachmentMaxPressureExclusive: boolean;
  attachmentMinFlowLpm?: number;
  attachmentMaxFlowLpm?: number;
  componentLossAllowancePsi?: number;
  hose: TaskGuideHoseInput;
  jobDetails: PressureCleaningJobDetails;
};

export type ParsedNozzleSize =
  | { ok: true; nozzleSize: number; source: "code" | "decimal" }
  | { ok: false; message: string };

export type PressureCleaningNozzleOption = {
  label:
    | "Recommended standard setup"
    | "Exact calculated requirement"
    | "Adjacent larger - gentler"
    | "Adjacent smaller - more aggressive"
    | "Current setup";
  nozzleSize: number;
  totalEffectiveNozzleSize: number;
  setupCode: string;
  fanNozzleCode?: string;
  accessibleLabel: string;
  tipCode: string;
  expectedGunPressurePsi: number;
  expectedGunPressureBar: number;
  requiredPumpPressurePsi: number;
  isWithinSurfaceGuidance: boolean;
  isWithinMachineRating: boolean;
  status:
    | "compatible"
    | "below-working-range"
    | "review"
    | "exceeds-task-limit"
    | "well-above-task-limit";
  statusLabel: string;
  note: string;
};

export type PressureCleaningTaskGuideResult = {
  task: PressureCleaningTaskRecord;
  effectiveGuidance: PressureGuidance;
  taskVariantLabel?: string;
  canCalculate: boolean;
  validationMessages: string[];
  hydraulicCompatibility: "compatible" | "outside-equipment-rating" | "not-calculated";
  taskMethodCompatibility:
    | "suitable"
    | "caution"
    | "confirmation-required"
    | "no-validated-overlap"
    | "prohibited";
  overallRecommendationStatus:
    | "prohibited"
    | "no-validated-overlap"
    | "exceeds-task-limit"
    | "outside-equipment-rating"
    | "confirmation-required"
    | "compatible-with-caution"
    | "suitable-starting-setup";
  overallRecommendationLabel: string;
  targetPressurePsi?: number;
  targetPressureBar?: number;
  targetFlowLpm?: number;
  targetFlowGpm?: number;
  flowPerNozzleLpm?: number;
  exactNozzleSize?: number;
  exactTotalNozzleSize?: number;
  recommendedOption?: PressureCleaningNozzleOption;
  exactOption?: PressureCleaningNozzleOption;
  adjacentLargerGentler?: PressureCleaningNozzleOption | null;
  smallerAggressive?: PressureCleaningNozzleOption | null;
  currentNozzleOption?: PressureCleaningNozzleOption | null;
  currentNozzleParse?: ParsedNozzleSize;
  hoseLossPsi: number;
  hoseLossModelled: boolean;
  componentLossAllowancePsi: number;
  maxMachinePressurePsi: number;
  overlapStatus: "validated-overlap" | "no-validated-overlap" | "not-applicable";
  compatibilityMessages: string[];
  machineMessages: string[];
  guidanceNotes: string[];
  calculatorHref?: string;
  targetPressureCalculatorHref?: string;
  savedSetupsHref: string;
};

const DEFAULT_WATER_DENSITY = 1000;
const DEFAULT_HOSE_ROUGHNESS_MM = 0.0015;

function isPositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function cleanOptionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseCurrentNozzleSize(text: string): ParsedNozzleSize {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, message: "No current nozzle supplied." };

  if (/^\d{3}$/.test(trimmed)) {
    const nozzleSize = Number(trimmed) / 10;
    return nozzleSize > 0
      ? { ok: true, nozzleSize, source: "code" }
      : { ok: false, message: "Nozzle size must be greater than zero." };
  }

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return {
      ok: false,
      message: "Enter an orifice size such as 3.0 or a nozzle code such as 030.",
    };
  }

  const nozzleSize = Number(trimmed);
  return nozzleSize > 0
    ? { ok: true, nozzleSize, source: "decimal" }
    : { ok: false, message: "Nozzle size must be greater than zero." };
}

function pressureForNozzleAtFlowPsi(flowPerNozzleGpm: number, nozzleSize: number) {
  if (!isPositive(flowPerNozzleGpm) || !isPositive(nozzleSize)) return undefined;
  return 4000 * Math.pow(flowPerNozzleGpm / nozzleSize, 2);
}

function standardAtOrAbove(exactNozzleSize: number) {
  return STANDARD_NOZZLE_SIZES.find((size) => size >= exactNozzleSize) ?? null;
}

function standardBelow(exactNozzleSize: number) {
  return [...STANDARD_NOZZLE_SIZES].reverse().find((size) => size < exactNozzleSize) ?? null;
}

type StandardNozzleSelection = {
  recommendedSize: number | null;
  adjacentLargerSize: number | null;
  adjacentSmallerSize: number | null;
};

function isInsideEditorialRange(pressurePsi: number, guidance: PressureGuidance) {
  if (guidance.mode !== "numeric-range") return false;
  const minimum = guidance.editorialRangeMinPsi;
  const maximum = guidance.editorialRangeMaxPsi;
  if (minimum === undefined || maximum === undefined) return false;
  return pressurePsi >= minimum && pressurePsi <= maximum;
}

function selectStandardNozzleSizes(args: {
  exactNozzleSize: number;
  flowPerNozzleGpm: number;
  targetPressurePsi: number;
  guidance: PressureGuidance;
}): StandardNozzleSelection {
  const largerSize = standardAtOrAbove(args.exactNozzleSize);
  const smallerSize = standardBelow(args.exactNozzleSize);

  if (args.guidance.mode !== "numeric-range") {
    return {
      recommendedSize: largerSize,
      adjacentLargerSize: null,
      adjacentSmallerSize: smallerSize,
    };
  }

  const candidates = [largerSize, smallerSize]
    .filter((size): size is number => size !== null)
    .map((size) => ({
      size,
      pressurePsi: pressureForNozzleAtFlowPsi(args.flowPerNozzleGpm, size),
    }))
    .filter(
      (candidate): candidate is { size: number; pressurePsi: number } =>
        candidate.pressurePsi !== undefined
    );

  if (candidates.length === 0) {
    return { recommendedSize: null, adjacentLargerSize: null, adjacentSmallerSize: null };
  }

  const inRange = candidates.filter((candidate) =>
    isInsideEditorialRange(candidate.pressurePsi, args.guidance)
  );
  const pool = inRange.length > 0 ? inRange : candidates;
  const recommended = [...pool].sort((a, b) => {
    const distanceA = Math.abs(a.pressurePsi - args.targetPressurePsi);
    const distanceB = Math.abs(b.pressurePsi - args.targetPressurePsi);
    if (Math.abs(distanceA - distanceB) > 1e-9) return distanceA - distanceB;
    // Equal distance: prefer the larger orifice as the gentler option.
    return b.size - a.size;
  })[0];

  return {
    recommendedSize: recommended.size,
    adjacentLargerSize:
      largerSize !== null && largerSize !== recommended.size ? largerSize : null,
    adjacentSmallerSize:
      smallerSize !== null && smallerSize !== recommended.size ? smallerSize : null,
  };
}

function taskHardMax(guidance: PressureGuidance) {
  return guidance.hardMaximumPsi ?? guidance.sourceSpecificLimitPsi;
}

function maxIsExclusive(guidance: PressureGuidance) {
  return Boolean(guidance.hardMaximumExclusive);
}

function pressurePassesGuidance(pressurePsi: number, guidance: PressureGuidance) {
  if (!Number.isFinite(pressurePsi)) return false;
  const hardMax = taskHardMax(guidance);
  if (hardMax !== undefined) {
    return maxIsExclusive(guidance) ? pressurePsi < hardMax : pressurePsi <= hardMax;
  }

  if (
    guidance.mode === "numeric-range" &&
    guidance.editorialRangeMaxPsi !== undefined
  ) {
    // An editorial range describes a practical working band, not a hard lower
    // safety limit. Pressure below the range may clean less effectively, but it
    // does not exceed the surface guidance.
    return pressurePsi <= guidance.editorialRangeMaxPsi;
  }

  return true;
}

function targetPressureFromGuidance(guidance: PressureGuidance) {
  if (guidance.editorialStartPsi && guidance.editorialStartPsi > 0) {
    return guidance.editorialStartPsi;
  }

  if (guidance.mode === "numeric-range" && guidance.editorialRangeMaxPsi) {
    return guidance.editorialRangeMaxPsi;
  }

  return undefined;
}

export function formatFanNozzleCode(angleDegrees: number, orificeSize: number) {
  if (
    !Number.isFinite(angleDegrees) ||
    !Number.isInteger(angleDegrees) ||
    angleDegrees < 0 ||
    angleDegrees > 99
  ) {
    throw new Error("Invalid nozzle angle");
  }

  if (!Number.isFinite(orificeSize) || orificeSize <= 0) {
    throw new Error("Invalid nozzle orifice size");
  }

  const angleCode = String(angleDegrees).padStart(2, "0");
  const orificeCode = String(Math.round(orificeSize * 10)).padStart(3, "0");
  return `${angleCode}${orificeCode}`;
}

function statusForPressure(args: {
  pressurePsi: number;
  guidance: PressureGuidance;
  machinePasses: boolean;
}) {
  if (pressurePassesGuidance(args.pressurePsi, args.guidance)) {
    return args.machinePasses ? "compatible" : "review";
  }

  const hardMax = taskHardMax(args.guidance);
  if (hardMax !== undefined && args.pressurePsi >= hardMax * 2) {
    return "well-above-task-limit";
  }

  return "exceeds-task-limit";
}

function setupCode(args: {
  label: PressureCleaningNozzleOption["label"];
  nozzleCount: number;
  sprayAngleDeg: number;
  nozzleSize: number;
}) {
  if (args.label === "Exact calculated requirement") {
    return `${args.nozzleCount} × size ${args.nozzleSize.toFixed(2)}`;
  }

  return `${args.nozzleCount} × ${formatFanNozzleCode(args.sprayAngleDeg, args.nozzleSize)}`;
}

export function pressureCleaningStatusLabel(
  status: PressureCleaningNozzleOption["status"]
) {
  if (status === "compatible") return "COMPATIBLE";
  if (status === "below-working-range") return "BELOW WORKING RANGE";
  if (status === "exceeds-task-limit") return "EXCEEDS TASK LIMIT";
  if (status === "well-above-task-limit") return "WELL ABOVE TASK LIMIT";
  return "REVIEW MACHINE RATING";
}

function overallRecommendationLabel(
  status: PressureCleaningTaskGuideResult["overallRecommendationStatus"]
) {
  if (status === "prohibited") return "Prohibited";
  if (status === "no-validated-overlap") return "No validated overlap";
  if (status === "exceeds-task-limit") return "Exceeds task limit";
  if (status === "outside-equipment-rating") return "Outside equipment rating";
  if (status === "confirmation-required") return "Confirmation required";
  if (status === "compatible-with-caution") return "Compatible with caution";
  return "Suitable starting setup";
}

function overallRecommendationStatus(args: {
  guidance: PressureGuidance;
  recommendedOption?: PressureCleaningNozzleOption | null;
  overlapStatus: PressureCleaningTaskGuideResult["overlapStatus"];
  methodHasCaution: boolean;
}): PressureCleaningTaskGuideResult["overallRecommendationStatus"] {
  if (args.guidance.mode === "prohibited") return "prohibited";
  if (args.overlapStatus === "no-validated-overlap") return "no-validated-overlap";
  if (
    args.recommendedOption?.status === "exceeds-task-limit" ||
    args.recommendedOption?.status === "well-above-task-limit"
  ) {
    return "exceeds-task-limit";
  }
  if (args.recommendedOption?.status === "review") return "outside-equipment-rating";
  if (args.recommendedOption?.status === "below-working-range") {
    return "compatible-with-caution";
  }
  if (
    args.guidance.mode === "manufacturer-confirmation-required" ||
    args.guidance.mode === "specialist-only" ||
    args.guidance.mode === "avoid-pressure" ||
    args.guidance.mode === "qualitative"
  ) {
    return "confirmation-required";
  }
  if (args.methodHasCaution) return "compatible-with-caution";
  return "suitable-starting-setup";
}

function accessibleNozzleLabel(args: {
  label: PressureCleaningNozzleOption["label"];
  nozzleCount: number;
  sprayAngleDeg: number;
  nozzleSize: number;
  fanNozzleCode?: string;
}) {
  const countText =
    args.nozzleCount === 1 ? "One" : args.nozzleCount === 2 ? "Two" : `${args.nozzleCount}`;
  if (args.label === "Exact calculated requirement") {
    return `${countText} exact calculated size ${args.nozzleSize.toFixed(2)} nozzles.`;
  }

  return `${countText} ${args.sprayAngleDeg}-degree size ${args.nozzleSize.toFixed(
    1
  )} nozzles, code ${args.fanNozzleCode}.`;
}

function buildOption(args: {
  label: PressureCleaningNozzleOption["label"];
  nozzleSize: number;
  nozzleCount: number;
  sprayAngleDeg: number;
  flowPerNozzleGpm: number;
  hoseLossPsi: number;
  componentLossAllowancePsi: number;
  maxMachinePressurePsi: number;
  guidance: PressureGuidance;
  exactNote?: string;
}): PressureCleaningNozzleOption | null {
  const expectedGunPressurePsi = pressureForNozzleAtFlowPsi(
    args.flowPerNozzleGpm,
    args.nozzleSize
  );
  if (expectedGunPressurePsi === undefined) return null;

  const requiredPumpPressurePsi =
    expectedGunPressurePsi + args.hoseLossPsi + args.componentLossAllowancePsi;
  const isWithinSurfaceGuidance = pressurePassesGuidance(expectedGunPressurePsi, args.guidance);
  const isWithinMachineRating = requiredPumpPressurePsi <= args.maxMachinePressurePsi;
  const belowEditorialRange =
    args.guidance.mode === "numeric-range" &&
    args.guidance.editorialRangeMinPsi !== undefined &&
    expectedGunPressurePsi < args.guidance.editorialRangeMinPsi;
  const baseStatus = statusForPressure({
    pressurePsi: expectedGunPressurePsi,
    guidance: args.guidance,
    machinePasses: isWithinMachineRating,
  });
  const status =
    belowEditorialRange && isWithinMachineRating
      ? "below-working-range"
      : baseStatus;
  const fanNozzleCode =
    args.label === "Exact calculated requirement"
      ? undefined
      : formatFanNozzleCode(args.sprayAngleDeg, args.nozzleSize);

  return {
    label: args.label,
    nozzleSize: args.nozzleSize,
    totalEffectiveNozzleSize: args.nozzleSize * args.nozzleCount,
    setupCode: setupCode({
      label: args.label,
      nozzleCount: args.nozzleCount,
      sprayAngleDeg: args.sprayAngleDeg,
      nozzleSize: args.nozzleSize,
    }),
    fanNozzleCode,
    accessibleLabel: accessibleNozzleLabel({
      label: args.label,
      nozzleCount: args.nozzleCount,
      sprayAngleDeg: args.sprayAngleDeg,
      nozzleSize: args.nozzleSize,
      fanNozzleCode,
    }),
    tipCode: formatTipCode(args.nozzleSize),
    expectedGunPressurePsi,
    expectedGunPressureBar: barFromPsi(expectedGunPressurePsi),
    requiredPumpPressurePsi,
    isWithinSurfaceGuidance,
    isWithinMachineRating,
    status,
    statusLabel: pressureCleaningStatusLabel(status),
    note:
      args.exactNote ??
      (belowEditorialRange
        ? "This setup is below the editorial working range. It may be gentler but may reduce cleaning effectiveness."
        : isWithinSurfaceGuidance
          ? args.guidance.mode === "numeric-range"
            ? "Expected pressure is inside the editorial working range."
            : "Expected pressure is inside the task guidance."
          : "This calculated operating pressure is outside the task guidance and should not be recommended for this surface."),
  };
}

function hoseLoss(input: PressureCleaningTaskGuideInput, machineFlowGpm: number) {
  if (input.hose.hoseSetupMode === "mainLeader") {
    const mainLength = cleanOptionalNumber(input.hose.mainHoseLength);
    const mainId = cleanOptionalNumber(input.hose.mainHoseId);
    const leaderLength = cleanOptionalNumber(input.hose.leaderHoseLength);
    const leaderId = cleanOptionalNumber(input.hose.leaderHoseId);
    const mainLoss =
      mainLength && mainId
        ? pressureCalHoseLossPsi(
            machineFlowGpm,
            metersFrom(mainLength, input.hose.hoseLengthUnit),
            mmFrom(mainId, input.hose.hoseIdUnit),
            DEFAULT_WATER_DENSITY,
            DEFAULT_HOSE_ROUGHNESS_MM
          )
        : 0;
    const leaderLoss =
      leaderLength && leaderId
        ? pressureCalHoseLossPsi(
            machineFlowGpm,
            metersFrom(leaderLength, input.hose.hoseLengthUnit),
            mmFrom(leaderId, input.hose.hoseIdUnit),
            DEFAULT_WATER_DENSITY,
            DEFAULT_HOSE_ROUGHNESS_MM
          )
        : 0;
    return {
      lossPsi: mainLoss + leaderLoss,
      modelled: Boolean((mainLength && mainId) || (leaderLength && leaderId)),
    };
  }

  const hoseLength = cleanOptionalNumber(input.hose.hoseLength);
  const hoseId = cleanOptionalNumber(input.hose.hoseId);
  if (!hoseLength || !hoseId) return { lossPsi: 0, modelled: false };

  return {
    lossPsi: pressureCalHoseLossPsi(
      machineFlowGpm,
      metersFrom(hoseLength, input.hose.hoseLengthUnit),
      mmFrom(hoseId, input.hose.hoseIdUnit),
      DEFAULT_WATER_DENSITY,
      DEFAULT_HOSE_ROUGHNESS_MM
    ),
    modelled: true,
  };
}

function machineInputsForHref(input: PressureCleaningTaskGuideInput, nozzleSize: number): Inputs {
  return {
    pumpPressure: input.machinePressure,
    pumpPressureUnit: input.machinePressureUnit,
    pumpFlow: input.machineFlow,
    pumpFlowUnit: input.machineFlowUnit,
    maxPressure: input.maxPressure ?? input.machinePressure,
    maxPressureUnit: input.maxPressureUnit,
    hoseSetupMode: input.hose.hoseSetupMode,
    hoseLength: input.hose.hoseLength ?? 0,
    hoseLengthUnit: input.hose.hoseLengthUnit,
    hoseId: input.hose.hoseId ?? 0,
    hoseIdUnit: input.hose.hoseIdUnit,
    mainHoseLength: input.hose.mainHoseLength ?? 0,
    mainHoseId: input.hose.mainHoseId ?? 0,
    leaderHoseLength: input.hose.leaderHoseLength ?? 0,
    leaderHoseId: input.hose.leaderHoseId ?? 0,
    engineHp: "",
    sprayMode: input.attachmentType === "surfaceCleaner" ? "surfaceCleaner" : "wand",
    nozzleCount: input.attachmentType === "surfaceCleaner" ? Math.max(2, input.nozzleCount) : 1,
    nozzleMode: "tipSize",
    nozzleSizeText: formatTipCode(nozzleSize),
    orificeMm: 1.2,
    dischargeCoeffCd: 0.62,
    waterDensity: DEFAULT_WATER_DENSITY,
    hoseRoughnessMm: DEFAULT_HOSE_ROUGHNESS_MM,
  };
}

function setOptional(params: URLSearchParams, key: string, value?: number | string | boolean) {
  if (typeof value === "number" && value > 0) params.set(key, String(value));
  if (typeof value === "string" && value.trim()) params.set(key, value);
  if (typeof value === "boolean" && value) params.set(key, "true");
}

function normaliseNozzleCountForAttachment(attachmentType: AttachmentType, nozzleCount: number) {
  const count = Number.isInteger(nozzleCount) ? nozzleCount : Math.floor(nozzleCount);
  if (attachmentType === "surfaceCleaner") {
    return count >= SURFACE_CLEANER_MIN_NOZZLE_COUNT ? count : SURFACE_CLEANER_MIN_NOZZLE_COUNT;
  }
  return count >= 1 ? count : 1;
}

export function normaliseFanNozzleAngle(
  angleDegrees: number,
  fallbackAngleDegrees: number
): TaskGuideFanAngle {
  const parsed = Number(angleDegrees);
  const fallback = isTaskGuideFanAngle(fallbackAngleDegrees)
    ? fallbackAngleDegrees
    : 25;

  return isTaskGuideFanAngle(parsed) ? parsed : fallback;
}

function isValidFanNozzleAngle(angleDegrees: number) {
  return isTaskGuideFanAngle(angleDegrees);
}

export function normalisePressureCleaningTaskGuideInput(
  input: PressureCleaningTaskGuideInput
): PressureCleaningTaskGuideInput {
  return {
    ...input,
    nozzleCount: normaliseNozzleCountForAttachment(input.attachmentType, input.nozzleCount),
    nozzleSprayAngleDeg: normaliseFanNozzleAngle(input.nozzleSprayAngleDeg, 25),
  };
}

export function hasPressureCleaningAdvancedValues(input: PressureCleaningTaskGuideInput) {
  return Boolean(
    input.maxPressure ||
      input.componentLossAllowancePsi ||
      input.attachmentMinPressurePsi ||
      input.attachmentMaxPressurePsi ||
      input.attachmentMinFlowLpm ||
      input.attachmentMaxFlowLpm ||
      input.attachmentMaxPressureExclusive ||
      input.hose.hoseLength ||
      input.hose.hoseId ||
      input.hose.mainHoseLength ||
      input.hose.mainHoseId ||
      input.hose.leaderHoseLength ||
      input.hose.leaderHoseId ||
      input.hose.hoseSetupMode === "mainLeader"
  );
}

export function applyPressureCleaningTaskDefaults(args: {
  current: PressureCleaningTaskGuideInput;
  currentTask?: PressureCleaningTaskRecord | null;
  nextTask: PressureCleaningTaskRecord;
  angleWasExplicit: boolean;
  fallbackAngleDegrees: number;
}) {
  const currentAngleLooksInherited =
    !args.angleWasExplicit ||
    args.current.nozzleSprayAngleDeg ===
      (args.currentTask?.preferredSprayAngleDeg ?? args.fallbackAngleDegrees);
  const nextAngle =
    args.nextTask.preferredSprayAngleDeg && currentAngleLooksInherited
      ? args.nextTask.preferredSprayAngleDeg
      : args.current.nozzleSprayAngleDeg;

  return normalisePressureCleaningTaskGuideInput({
    ...args.current,
    taskSlug: args.nextTask.slug,
    attachmentType: args.nextTask.surfaceCleanerDefault ? "surfaceCleaner" : "wand",
    nozzleCount: args.nextTask.preferredNozzleCount ?? args.current.nozzleCount,
    nozzleSprayAngleDeg: nextAngle,
    surfaceCleanerDiameter:
      args.nextTask.preferredSurfaceCleanerDiameterIn ?? args.current.surfaceCleanerDiameter,
    jobDetails: {
      materialFinish: "unknown",
      filledStatus: "unknown",
      sealedStatus: "unknown",
      jointCondition: "unknown",
      installationArea: args.nextTask.requiredFields?.includes("installationArea") ? "outdoor" : undefined,
    },
  });
}

export function buildPressureCleaningTaskGuideSearchParams(
  input: PressureCleaningTaskGuideInput
) {
  const normalised = normalisePressureCleaningTaskGuideInput(input);
  const params = new URLSearchParams();
  params.set("task", normalised.taskSlug);
  params.set("jobName", normalised.jobName);
  params.set("machinePressure", String(normalised.machinePressure));
  params.set("machinePressureUnit", normalised.machinePressureUnit);
  params.set("machineFlow", String(normalised.machineFlow));
  params.set("machineFlowUnit", normalised.machineFlowUnit);
  setOptional(params, "maxPressure", normalised.maxPressure);
  params.set("maxPressureUnit", normalised.maxPressureUnit);
  params.set("attachment", normalised.attachmentType === "surfaceCleaner" ? "surface-cleaner" : "wand");
  params.set("attachmentType", normalised.attachmentType);
  setOptional(params, "surfaceCleanerDiameter", normalised.surfaceCleanerDiameter);
  params.set("surfaceCleanerDiameterUnit", normalised.surfaceCleanerDiameterUnit);
  params.set("nozzleCount", String(normalised.nozzleCount));
  params.set("nozzleAngle", String(normalised.nozzleSprayAngleDeg));
  params.set("nozzleSprayAngleDeg", String(normalised.nozzleSprayAngleDeg));
  setOptional(params, "currentNozzleSize", normalised.currentNozzleText);
  setOptional(params, "currentNozzleText", normalised.currentNozzleText);
  setOptional(params, "attachmentMinPressurePsi", normalised.attachmentMinPressurePsi);
  setOptional(params, "attachmentMaxPressurePsi", normalised.attachmentMaxPressurePsi);
  setOptional(params, "attachmentMaxPressureExclusive", normalised.attachmentMaxPressureExclusive);
  setOptional(params, "attachmentMinFlowLpm", normalised.attachmentMinFlowLpm);
  setOptional(params, "attachmentMaxFlowLpm", normalised.attachmentMaxFlowLpm);
  setOptional(params, "componentLossAllowancePsi", normalised.componentLossAllowancePsi);
  params.set("hoseSetupMode", normalised.hose.hoseSetupMode);
  params.set("hoseLengthUnit", normalised.hose.hoseLengthUnit);
  params.set("hoseIdUnit", normalised.hose.hoseIdUnit);
  setOptional(params, "hoseLength", normalised.hose.hoseLength);
  setOptional(params, "hoseId", normalised.hose.hoseId);
  setOptional(params, "mainHoseLength", normalised.hose.mainHoseLength);
  setOptional(params, "mainHoseId", normalised.hose.mainHoseId);
  setOptional(params, "leaderHoseLength", normalised.hose.leaderHoseLength);
  setOptional(params, "leaderHoseId", normalised.hose.leaderHoseId);
  setOptional(params, "materialFinish", normalised.jobDetails.materialFinish);
  setOptional(params, "filledStatus", normalised.jobDetails.filledStatus);
  setOptional(params, "sealedStatus", normalised.jobDetails.sealedStatus);
  setOptional(params, "jointCondition", normalised.jobDetails.jointCondition);
  setOptional(params, "installationArea", normalised.jobDetails.installationArea);
  setOptional(params, "manufacturerOrProduct", normalised.jobDetails.manufacturerOrProduct);
  setOptional(params, "confirmsSoundSurface", normalised.jobDetails.confirmsSoundSurface);
  setOptional(params, "asbestosMayBePresent", normalised.jobDetails.asbestosMayBePresent);
  return params;
}

export function parsePressureCleaningTaskGuideSearchParams(
  search: string,
  fallback: PressureCleaningTaskGuideInput
): PressureCleaningTaskGuideInput {
  const params = new URLSearchParams(search);
  const requiredNumber = (key: string, defaultValue: number) => {
    const value = params.get(key);
    if (value === null || value.trim() === "") return defaultValue;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  };
  const optionalNumber = (key: string, defaultValue?: number) =>
    params.has(key) ? cleanOptionalNumber(params.get(key)) : defaultValue;
  const pressureUnit = (key: string, defaultValue: PressureUnit): PressureUnit => {
    const value = params.get(key);
    return value === "bar" || value === "psi" ? value : defaultValue;
  };
  const flowUnit = (key: string, defaultValue: FlowUnit): FlowUnit => {
    const value = params.get(key);
    return value === "gpm" || value === "lpm" ? value : defaultValue;
  };
  const lengthUnit = (key: string, defaultValue: LengthUnit): LengthUnit => {
    const value = params.get(key);
    return value === "ft" || value === "m" ? value : defaultValue;
  };
  const sprayAngle = (defaultValue: number) => {
    const key = params.has("nozzleAngle") ? "nozzleAngle" : "nozzleSprayAngleDeg";
    const parsed = requiredNumber(key, defaultValue);
    return normaliseFanNozzleAngle(parsed, defaultValue);
  };
  const attachmentValue = params.get("attachment") ?? params.get("attachmentType");
  const attachmentType: AttachmentType =
    attachmentValue === "wand"
      ? "wand"
      : attachmentValue === "surface-cleaner" || attachmentValue === "surfaceCleaner"
        ? "surfaceCleaner"
        : fallback.attachmentType;

  return normalisePressureCleaningTaskGuideInput({
    ...fallback,
    taskSlug: params.get("task") ?? fallback.taskSlug,
    jobName: params.get("jobName") ?? fallback.jobName,
    machinePressure: requiredNumber("machinePressure", fallback.machinePressure),
    machinePressureUnit: pressureUnit("machinePressureUnit", fallback.machinePressureUnit),
    machineFlow: requiredNumber("machineFlow", fallback.machineFlow),
    machineFlowUnit: flowUnit("machineFlowUnit", fallback.machineFlowUnit),
    maxPressure: optionalNumber("maxPressure", fallback.maxPressure),
    maxPressureUnit: pressureUnit("maxPressureUnit", fallback.maxPressureUnit),
    attachmentType,
    surfaceCleanerDiameter: optionalNumber(
      "surfaceCleanerDiameter",
      optionalNumber("surfaceCleanerDiameterIn", fallback.surfaceCleanerDiameter)
    ),
    surfaceCleanerDiameterUnit:
      params.get("surfaceCleanerDiameterUnit") === "mm" ? "mm" : fallback.surfaceCleanerDiameterUnit,
    nozzleCount: Math.floor(requiredNumber("nozzleCount", fallback.nozzleCount)),
    nozzleSprayAngleDeg: sprayAngle(fallback.nozzleSprayAngleDeg),
    currentNozzleText:
      params.get("currentNozzleText") ?? params.get("currentNozzleSize") ?? fallback.currentNozzleText,
    attachmentMinPressurePsi: optionalNumber(
      "attachmentMinPressurePsi",
      fallback.attachmentMinPressurePsi
    ),
    attachmentMaxPressurePsi: optionalNumber(
      "attachmentMaxPressurePsi",
      fallback.attachmentMaxPressurePsi
    ),
    attachmentMaxPressureExclusive:
      params.get("attachmentMaxPressureExclusive") === "true" ||
      fallback.attachmentMaxPressureExclusive,
    attachmentMinFlowLpm: optionalNumber("attachmentMinFlowLpm", fallback.attachmentMinFlowLpm),
    attachmentMaxFlowLpm: optionalNumber("attachmentMaxFlowLpm", fallback.attachmentMaxFlowLpm),
    componentLossAllowancePsi: optionalNumber(
      "componentLossAllowancePsi",
      fallback.componentLossAllowancePsi
    ),
    hose: {
      ...fallback.hose,
      hoseSetupMode: params.get("hoseSetupMode") === "mainLeader" ? "mainLeader" : "single",
      hoseLength: optionalNumber("hoseLength", fallback.hose.hoseLength),
      hoseLengthUnit: lengthUnit("hoseLengthUnit", fallback.hose.hoseLengthUnit),
      hoseId: optionalNumber("hoseId", fallback.hose.hoseId),
      hoseIdUnit: params.get("hoseIdUnit") === "in" ? "in" : fallback.hose.hoseIdUnit,
      mainHoseLength: optionalNumber("mainHoseLength", fallback.hose.mainHoseLength),
      mainHoseId: optionalNumber("mainHoseId", fallback.hose.mainHoseId),
      leaderHoseLength: optionalNumber("leaderHoseLength", fallback.hose.leaderHoseLength),
      leaderHoseId: optionalNumber("leaderHoseId", fallback.hose.leaderHoseId),
    },
    jobDetails: {
      materialFinish:
        (params.get("materialFinish") as PressureCleaningJobDetails["materialFinish"]) ??
        fallback.jobDetails.materialFinish,
      filledStatus:
        (params.get("filledStatus") as PressureCleaningJobDetails["filledStatus"]) ??
        fallback.jobDetails.filledStatus,
      sealedStatus:
        (params.get("sealedStatus") as PressureCleaningJobDetails["sealedStatus"]) ??
        fallback.jobDetails.sealedStatus,
      jointCondition:
        (params.get("jointCondition") as PressureCleaningJobDetails["jointCondition"]) ??
        fallback.jobDetails.jointCondition,
      installationArea:
        (params.get("installationArea") as PressureCleaningJobDetails["installationArea"]) ??
        fallback.jobDetails.installationArea,
      manufacturerOrProduct:
        params.get("manufacturerOrProduct") ?? fallback.jobDetails.manufacturerOrProduct,
      confirmsSoundSurface:
        params.get("confirmsSoundSurface") === "true" || fallback.jobDetails.confirmsSoundSurface,
      asbestosMayBePresent:
        params.get("asbestosMayBePresent") === "true" || fallback.jobDetails.asbestosMayBePresent,
    },
  });
}

export function travertineRequiresSoundSurfaceConfirmation(
  details: PressureCleaningJobDetails
) {
  return (
    details.materialFinish === "honed" ||
    details.filledStatus === "filled" ||
    details.filledStatus === "partially-filled" ||
    details.sealedStatus === "sealed" ||
    details.installationArea === "pool-surround"
  );
}

type TaskGuidanceResolution = {
  guidance: PressureGuidance;
  variantLabel?: string;
  blockMessage?: string;
  cautionMessages: string[];
};

function resolveTaskGuidance(
  task: PressureCleaningTaskRecord,
  input: PressureCleaningTaskGuideInput
): TaskGuidanceResolution {
  if (task.slug !== "travertine-pavers") {
    return {
      guidance: task.guidance,
      cautionMessages: [],
    };
  }

  const details = input.jobDetails;
  const base = task.guidance;

  if (details.materialFinish === "polished") {
    return {
      guidance: base,
      variantLabel: "Polished travertine",
      blockMessage:
        "Polished travertine should use pH-neutral cleaner and non-abrasive manual or machine cleaning; no pressure-washer nozzle setup is generated by default.",
      cautionMessages: [],
    };
  }

  if (details.installationArea === "indoor") {
    return {
      guidance: base,
      variantLabel: "Indoor travertine",
      blockMessage:
        "Indoor travertine should use pH-neutral cleaner and a non-abrasive indoor stone-cleaning method; no pressure-washer nozzle setup is generated by default.",
      cautionMessages: [],
    };
  }

  if (details.installationArea === "wall" || details.installationArea === "roof") {
    return {
      guidance: base,
      variantLabel:
        details.installationArea === "wall"
          ? "Travertine wall installation"
          : "Travertine roof installation",
      blockMessage:
        "Travertine wall or roof installations require product-specific and installation-specific guidance before pressure cleaning.",
      cautionMessages: [],
    };
  }

  if (
    details.materialFinish === "unknown" ||
    details.filledStatus === "unknown" ||
    details.sealedStatus === "unknown" ||
    details.jointCondition === "unknown"
  ) {
    return {
      guidance: base,
      variantLabel: "Unconfirmed travertine",
      blockMessage:
        "Confirm the travertine finish, filled status, sealer status and joint condition before calculating a nozzle recommendation.",
      cautionMessages: [],
    };
  }

  if (details.jointCondition === "loose-or-missing") {
    return {
      guidance: base,
      variantLabel: "Travertine with loose or missing joints",
      blockMessage:
        "Loose or missing joints prevent a normal travertine pressure recommendation. Repair or obtain specialist guidance first.",
      cautionMessages: [],
    };
  }

  const sensitiveVariant = travertineRequiresSoundSurfaceConfirmation(details);
  if (sensitiveVariant && !details.confirmsSoundSurface) {
    return {
      guidance: base,
      variantLabel: "Sensitive travertine variant",
      blockMessage:
        "Honed, filled, sealed or pool-surround travertine requires confirmation that the stone, filler, sealer and joints are sound before calculating a conservative setup.",
      cautionMessages: [],
    };
  }

  const jointingSandCaution =
    details.jointCondition === "jointing-sand"
      ? [
          "Jointing sand may be displaced. Keep the fan away from joints, start at the lowest practical impact and plan for joint restoration if needed.",
        ]
      : [];

  if (sensitiveVariant) {
    const sensitiveLabels = [
      details.materialFinish === "honed" ? "honed" : "",
      details.filledStatus === "filled" || details.filledStatus === "partially-filled"
        ? "filled"
        : "",
      details.sealedStatus === "sealed" ? "sealed" : "",
      details.installationArea === "pool-surround" ? "pool-surround" : "",
    ].filter(Boolean);

    return {
      guidance: {
        ...base,
        editorialStartPsi: 600,
        editorialRangeMinPsi: 600,
        editorialRangeMaxPsi: 800,
        advisoryCeilingPsi: 1000,
        advisoryCeilingLabel:
          "PressureCal cautious ceiling for a confirmed sound sensitive travertine variant; supplier, sealer and installer instructions override it",
        displayWording:
          "PressureCal cautious start 600 PSI and editorial range 600-800 PSI for confirmed sound honed, filled, sealed or pool-surround travertine.",
      },
      variantLabel: `${sensitiveLabels.join(", ")} travertine`,
      cautionMessages: [
        "A conservative target at the lower end of the Travertine editorial range is being used because this finish or installation is more sensitive.",
        ...jointingSandCaution,
      ],
    };
  }

  return {
    guidance: base,
    variantLabel: "Sound exterior tumbled or unfilled travertine",
    cautionMessages: jointingSandCaution,
  };
}

export function calculatePressureCleaningTaskGuide(
  task: PressureCleaningTaskRecord,
  rawInput: PressureCleaningTaskGuideInput
): PressureCleaningTaskGuideResult {
  const input = parsePressureCleaningTaskGuideSearchParams(
    buildPressureCleaningTaskGuideSearchParams(rawInput).toString(),
    rawInput
  );
  const validationMessages: string[] = [];
  const compatibilityMessages: string[] = [];
  const machineMessages: string[] = [];
  const guidanceResolution = resolveTaskGuidance(task, input);
  const effectiveGuidance = guidanceResolution.guidance;
  let methodHasCaution = guidanceResolution.cautionMessages.length > 0;
  compatibilityMessages.push(...guidanceResolution.cautionMessages);
  const guidanceNotes = [
    effectiveGuidance.displayWording,
    effectiveGuidance.advisoryCeilingLabel
      ? `${effectiveGuidance.advisoryCeilingLabel}: ${effectiveGuidance.advisoryCeilingPsi} PSI.`
      : "",
    "Spray angle changes spray pattern and impact characteristics; it does not alter the hydraulic pressure calculation.",
  ].filter(Boolean);
  const machinePressurePsi = psiFrom(input.machinePressure, input.machinePressureUnit);
  const machineFlowGpm = gpmFrom(input.machineFlow, input.machineFlowUnit);
  const machineFlowLpm = lpmFromGpm(machineFlowGpm);
  const maxMachinePressurePsi = input.maxPressure
    ? psiFrom(input.maxPressure, input.maxPressureUnit)
    : machinePressurePsi;
  const componentLossAllowancePsi = input.componentLossAllowancePsi ?? 0;
  const nozzleCount = input.nozzleCount;
  const hose = hoseLoss(input, machineFlowGpm);

  if (effectiveGuidance.mode === "prohibited" || input.jobDetails.asbestosMayBePresent) {
    return {
      task,
      effectiveGuidance,
      taskVariantLabel: guidanceResolution.variantLabel,
      canCalculate: false,
      validationMessages: [
        "Pressure cleaning prohibited. High-pressure water must never be used on asbestos-containing material.",
      ],
      hydraulicCompatibility: "not-calculated",
      taskMethodCompatibility: "prohibited",
      overallRecommendationStatus: "prohibited",
      overallRecommendationLabel: overallRecommendationLabel("prohibited"),
      hoseLossPsi: 0,
      hoseLossModelled: false,
      componentLossAllowancePsi: 0,
      maxMachinePressurePsi,
      overlapStatus: "not-applicable",
      compatibilityMessages: [
        "Contact the applicable workplace-safety authority or a licensed asbestos professional.",
      ],
      machineMessages: [],
      guidanceNotes,
      savedSetupsHref: "/saved-setups",
    };
  }

  if (!isPositive(machinePressurePsi)) validationMessages.push("Rated machine pressure must be positive.");
  if (!isPositive(machineFlowGpm)) validationMessages.push("Machine flow must be positive.");
  if (
    input.attachmentType === "surfaceCleaner" &&
    (!Number.isInteger(input.nozzleCount) || input.nozzleCount < SURFACE_CLEANER_MIN_NOZZLE_COUNT)
  ) {
    validationMessages.push("Surface-cleaner nozzle count must be an integer of at least 2.");
  }
  if (input.attachmentType === "wand" && (!Number.isInteger(input.nozzleCount) || input.nozzleCount < 1)) {
    validationMessages.push("Nozzle count must be a positive integer.");
  }
  if (!isValidFanNozzleAngle(input.nozzleSprayAngleDeg)) {
    validationMessages.push("Nozzle spray angle must be one of 15, 25 or 40 degrees.");
  }

  if (guidanceResolution.blockMessage) {
    validationMessages.push(guidanceResolution.blockMessage);
  }

  if (
    effectiveGuidance.mode === "qualitative" ||
    effectiveGuidance.mode === "manufacturer-confirmation-required" ||
    effectiveGuidance.mode === "avoid-pressure" ||
    effectiveGuidance.mode === "specialist-only"
  ) {
    validationMessages.push(effectiveGuidance.displayWording);
  }

  const targetPressurePsi = targetPressureFromGuidance(effectiveGuidance);
  if (!isPositive(targetPressurePsi)) {
    validationMessages.push("No valid numeric pressure target is available for this task.");
  }

  if (input.attachmentType === "surfaceCleaner" && task.surfaceCleanerWarning) {
    methodHasCaution = true;
    compatibilityMessages.push(task.surfaceCleanerWarning);
  }

  if (
    task.slug === "painted-acrylic-hard-tennis-court" &&
    input.attachmentType === "surfaceCleaner" &&
    input.nozzleSprayAngleDeg <= 15
  ) {
    methodHasCaution = true;
    compatibilityMessages.push(
      "A narrow fan produces a more concentrated impact pattern. A wider fan is preferred for painted acrylic court surfaces."
    );
  }

  if (!task.compatibleAttachments.includes(input.attachmentType)) {
    methodHasCaution = true;
    compatibilityMessages.push("Selected attachment is not validated for this task.");
  }

  if (!hose.modelled) {
    machineMessages.push(
      "Hose loss not modelled. Actual attachment pressure should be verified with a gauge."
    );
  }

  if (!input.attachmentMinPressurePsi && !input.attachmentMaxPressurePsi) {
    compatibilityMessages.push(
      "Attachment operating limits not supplied - verify with the manufacturer."
    );
  }

  let overlapStatus: PressureCleaningTaskGuideResult["overlapStatus"] = "not-applicable";
  const hardMax = taskHardMax(effectiveGuidance);
  if (input.attachmentMinPressurePsi && hardMax !== undefined) {
    const overlaps = maxIsExclusive(effectiveGuidance)
      ? input.attachmentMinPressurePsi < hardMax
      : input.attachmentMinPressurePsi <= hardMax;
    overlapStatus = overlaps ? "validated-overlap" : "no-validated-overlap";
    if (!overlaps && task.slug === "painted-acrylic-hard-tennis-court") {
      compatibilityMessages.push(
        "No validated overlap. The attachment requires at least 1500 PSI, while the surface guidance requires operation below 1500 PSI."
      );
    } else if (!overlaps) {
      compatibilityMessages.push("No validated overlap between attachment limits and task guidance.");
    }
  } else if (targetPressurePsi) {
    overlapStatus = "validated-overlap";
  }

  if (input.attachmentMaxPressurePsi && targetPressurePsi) {
    const maxPasses = input.attachmentMaxPressureExclusive
      ? targetPressurePsi < input.attachmentMaxPressurePsi
      : targetPressurePsi <= input.attachmentMaxPressurePsi;
    if (!maxPasses) compatibilityMessages.push("Target pressure exceeds attachment maximum.");
  }

  if (input.attachmentMinFlowLpm && machineFlowLpm < input.attachmentMinFlowLpm) {
    compatibilityMessages.push("Machine flow is below attachment minimum flow.");
  }
  if (input.attachmentMaxFlowLpm && machineFlowLpm > input.attachmentMaxFlowLpm) {
    compatibilityMessages.push("Machine flow exceeds attachment maximum flow.");
  }
  if (task.flowMinimumLpm && machineFlowLpm < task.flowMinimumLpm) {
    compatibilityMessages.push("Machine flow is below the task's preferred minimum.");
  }

  if (validationMessages.length > 0 || !targetPressurePsi) {
    return {
      task,
      effectiveGuidance,
      taskVariantLabel: guidanceResolution.variantLabel,
      canCalculate: false,
      validationMessages,
      hydraulicCompatibility: "not-calculated",
      taskMethodCompatibility:
        overlapStatus === "no-validated-overlap"
          ? "no-validated-overlap"
          : methodHasCaution
            ? "caution"
            : "confirmation-required",
      overallRecommendationStatus:
        overlapStatus === "no-validated-overlap" ? "no-validated-overlap" : "confirmation-required",
      overallRecommendationLabel: overallRecommendationLabel(
        overlapStatus === "no-validated-overlap" ? "no-validated-overlap" : "confirmation-required"
      ),
      hoseLossPsi: hose.lossPsi,
      hoseLossModelled: hose.modelled,
      componentLossAllowancePsi,
      maxMachinePressurePsi,
      overlapStatus,
      compatibilityMessages,
      machineMessages,
      guidanceNotes,
      savedSetupsHref: "/saved-setups",
    };
  }

  const flowPerNozzleGpm = machineFlowGpm / nozzleCount;
  const exactNozzleSize = flowPerNozzleGpm / Math.sqrt(targetPressurePsi / 4000);
  const standardSelection = selectStandardNozzleSizes({
    exactNozzleSize,
    flowPerNozzleGpm,
    targetPressurePsi,
    guidance: effectiveGuidance,
  });
  const { recommendedSize, adjacentLargerSize, adjacentSmallerSize } = standardSelection;

  if (!recommendedSize || !Number.isFinite(exactNozzleSize)) {
    validationMessages.push("No valid nozzle recommendation could be calculated.");
    return {
      task,
      effectiveGuidance,
      taskVariantLabel: guidanceResolution.variantLabel,
      canCalculate: false,
      validationMessages,
      hydraulicCompatibility: "not-calculated",
      taskMethodCompatibility: "confirmation-required",
      overallRecommendationStatus: "confirmation-required",
      overallRecommendationLabel: overallRecommendationLabel("confirmation-required"),
      hoseLossPsi: hose.lossPsi,
      hoseLossModelled: hose.modelled,
      componentLossAllowancePsi,
      maxMachinePressurePsi,
      overlapStatus,
      compatibilityMessages,
      machineMessages,
      guidanceNotes,
      savedSetupsHref: "/saved-setups",
    };
  }

  const recommendedOption = buildOption({
    label: "Recommended standard setup",
    nozzleSize: recommendedSize,
    nozzleCount,
    sprayAngleDeg: input.nozzleSprayAngleDeg,
    flowPerNozzleGpm,
    hoseLossPsi: hose.lossPsi,
    componentLossAllowancePsi,
    maxMachinePressurePsi,
    guidance: effectiveGuidance,
  });
  const exactOption = buildOption({
    label: "Exact calculated requirement",
    nozzleSize: exactNozzleSize,
    nozzleCount,
    sprayAngleDeg: input.nozzleSprayAngleDeg,
    flowPerNozzleGpm,
    hoseLossPsi: hose.lossPsi,
    componentLossAllowancePsi,
    maxMachinePressurePsi,
    guidance: effectiveGuidance,
    exactNote: "Exact calculated size may not correspond to a commercially available nozzle.",
  });
  const adjacentLargerGentler = adjacentLargerSize
    ? buildOption({
        label: "Adjacent larger - gentler",
        nozzleSize: adjacentLargerSize,
        nozzleCount,
        sprayAngleDeg: input.nozzleSprayAngleDeg,
        flowPerNozzleGpm,
        hoseLossPsi: hose.lossPsi,
        componentLossAllowancePsi,
        maxMachinePressurePsi,
        guidance: effectiveGuidance,
      })
    : null;
  const smallerAggressive = adjacentSmallerSize
    ? buildOption({
        label: "Adjacent smaller - more aggressive",
        nozzleSize: adjacentSmallerSize,
        nozzleCount,
        sprayAngleDeg: input.nozzleSprayAngleDeg,
        flowPerNozzleGpm,
        hoseLossPsi: hose.lossPsi,
        componentLossAllowancePsi,
        maxMachinePressurePsi,
        guidance: effectiveGuidance,
      })
    : null;
  const currentNozzleParse = parseCurrentNozzleSize(input.currentNozzleText);
  const currentNozzleOption =
    currentNozzleParse.ok
      ? buildOption({
          label: "Current setup",
          nozzleSize: currentNozzleParse.nozzleSize,
          nozzleCount,
          sprayAngleDeg: input.nozzleSprayAngleDeg,
          flowPerNozzleGpm,
          hoseLossPsi: hose.lossPsi,
          componentLossAllowancePsi,
          maxMachinePressurePsi,
          guidance: effectiveGuidance,
        })
      : null;

  if (recommendedOption && recommendedOption.requiredPumpPressurePsi > maxMachinePressurePsi) {
    machineMessages.push("Recommended setup exceeds available machine pressure after losses.");
  }
  const overallStatus = overallRecommendationStatus({
    guidance: effectiveGuidance,
    recommendedOption,
    overlapStatus,
    methodHasCaution,
  });

  return {
    task,
    effectiveGuidance,
    taskVariantLabel: guidanceResolution.variantLabel,
    canCalculate: true,
    validationMessages,
    hydraulicCompatibility:
      recommendedOption?.isWithinMachineRating ? "compatible" : "outside-equipment-rating",
    taskMethodCompatibility:
      overlapStatus === "no-validated-overlap"
        ? "no-validated-overlap"
        : methodHasCaution
          ? "caution"
          : "suitable",
    overallRecommendationStatus: overallStatus,
    overallRecommendationLabel: overallRecommendationLabel(overallStatus),
    targetPressurePsi,
    targetPressureBar: barFromPsi(targetPressurePsi),
    targetFlowLpm: machineFlowLpm,
    targetFlowGpm: machineFlowGpm,
    flowPerNozzleLpm: machineFlowLpm / nozzleCount,
    exactNozzleSize,
    exactTotalNozzleSize: exactNozzleSize * nozzleCount,
    recommendedOption: recommendedOption ?? undefined,
    exactOption: exactOption ?? undefined,
    adjacentLargerGentler,
    smallerAggressive,
    currentNozzleOption,
    currentNozzleParse,
    hoseLossPsi: hose.lossPsi,
    hoseLossModelled: hose.modelled,
    componentLossAllowancePsi,
    maxMachinePressurePsi,
    overlapStatus,
    compatibilityMessages,
    machineMessages,
    guidanceNotes,
    calculatorHref: recommendedOption
      ? buildFullSetupHref(machineInputsForHref(input, recommendedOption.nozzleSize))
      : undefined,
    targetPressureCalculatorHref: `/target-pressure-nozzle-calculator?pumpFlow=${input.machineFlow}&pumpFlowUnit=${input.machineFlowUnit}&ratedPressure=${input.maxPressure ?? input.machinePressure}&ratedPressureUnit=${input.maxPressureUnit}&targetPressure=${targetPressurePsi.toFixed(0)}&targetPressureUnit=psi&nozzleCount=${nozzleCount}&targetReference=gun`,
    savedSetupsHref: "/saved-setups",
  };
}

export function inputsFromFullCalculatorInputs(
  current: PressureCleaningTaskGuideInput,
  inputs: Inputs
): PressureCleaningTaskGuideInput {
  const hoseSetupMode = inputs.hoseSetupMode === "mainLeader" ? "mainLeader" : "single";
  return {
    ...current,
    machinePressure: Number(inputs.pumpPressure || current.machinePressure),
    machinePressureUnit: inputs.pumpPressureUnit,
    machineFlow: Number(inputs.pumpFlow || current.machineFlow),
    machineFlowUnit: inputs.pumpFlowUnit,
    maxPressure: cleanOptionalNumber(inputs.maxPressure),
    maxPressureUnit: inputs.maxPressureUnit,
    attachmentType: inputs.sprayMode === "surfaceCleaner" ? "surfaceCleaner" : "wand",
    nozzleCount: Math.max(inputs.sprayMode === "surfaceCleaner" ? 2 : 1, Number(inputs.nozzleCount || 1)),
    currentNozzleText: inputs.nozzleSizeText || current.currentNozzleText,
    hose: {
      hoseSetupMode,
      hoseLength: cleanOptionalNumber(inputs.hoseLength),
      hoseLengthUnit: inputs.hoseLengthUnit,
      hoseId: cleanOptionalNumber(inputs.hoseId),
      hoseIdUnit: inputs.hoseIdUnit,
      mainHoseLength: cleanOptionalNumber(inputs.mainHoseLength),
      mainHoseId: cleanOptionalNumber(inputs.mainHoseId),
      leaderHoseLength: cleanOptionalNumber(inputs.leaderHoseLength),
      leaderHoseId: cleanOptionalNumber(inputs.leaderHoseId),
    },
  };
}

export function describeHoseConfiguration(input: PressureCleaningTaskGuideInput) {
  if (input.hose.hoseSetupMode === "mainLeader") {
    const mainLength = cleanOptionalNumber(input.hose.mainHoseLength);
    const mainId = cleanOptionalNumber(input.hose.mainHoseId);
    const leaderLength = cleanOptionalNumber(input.hose.leaderHoseLength);
    const leaderId = cleanOptionalNumber(input.hose.leaderHoseId);
    if (!((mainLength && mainId) || (leaderLength && leaderId))) return "Hose loss not modelled";
    return [
      mainLength && mainId
        ? `Main ${metersFrom(mainLength, input.hose.hoseLengthUnit).toFixed(1)} m / ${mmFrom(mainId, input.hose.hoseIdUnit).toFixed(2)} mm`
        : null,
      leaderLength && leaderId
        ? `Leader ${metersFrom(leaderLength, input.hose.hoseLengthUnit).toFixed(1)} m / ${mmFrom(leaderId, input.hose.hoseIdUnit).toFixed(2)} mm`
        : null,
    ]
      .filter(Boolean)
      .join(", ");
  }

  const hoseLength = cleanOptionalNumber(input.hose.hoseLength);
  const hoseId = cleanOptionalNumber(input.hose.hoseId);
  if (!hoseLength || !hoseId) return "Hose loss not modelled";
  return `${metersFrom(hoseLength, input.hose.hoseLengthUnit).toFixed(1)} m / ${mmFrom(
    hoseId,
    input.hose.hoseIdUnit
  ).toFixed(2)} mm`;
}
