import { hoseLossPsi as pressureCalHoseLossPsi } from '../pressurecal';
export type FlowUnit = 'lpm' | 'gpm';
export type PressureUnit = 'psi' | 'bar';
export type LengthUnit = 'm' | 'ft';
export type HoseIdUnit = 'mm' | 'in';
export type TargetReference = 'pump' | 'gun';

export interface TargetPressureNozzleInput {
  pumpFlow: number;
  pumpFlowUnit: FlowUnit;
  ratedPressure: number;
  ratedPressureUnit: PressureUnit;
  targetPressure: number;
  targetPressureUnit: PressureUnit;
  nozzleCount: number;
  targetReference?: TargetReference;
  hoseLength?: number;
  hoseLengthUnit?: LengthUnit;
  hoseInnerDiameter?: number;
  hoseInnerDiameterUnit?: HoseIdUnit;
  extraLossPsi?: number;
}

export interface NearbyNozzleOption {
  nozzleSize: number;
  tipCode: string;
  estimatedPressurePsi: number;
  estimatedPressureBar: number;
  deltaFromTargetPsi: number;
}

export interface ValidationMessage {
  type: 'error' | 'warning' | 'info';
  message: string;
}

export interface TargetPressureNozzleResult {
  exactNozzleSize: number;
  recommendedNozzleSize: number;
  recommendedTipCode: string;
  ratedPressurePsi: number;
  targetPressurePsi: number;
  totalFlowGpm: number;
  totalFlowLpm: number;
  flowPerNozzleGpm: number;
  flowPerNozzleLpm: number;
  nearbyOptions: NearbyNozzleOption[];
  hoseLossPsi: number;
  extraLossPsi: number;
  requiredPumpPressurePsi: number;
  requiredPumpPressureBar: number;
  maxAchievableGunPressurePsi: number;
  maxAchievableGunPressureBar: number;
  isAchievable: boolean;
  targetReference: TargetReference;
  messages: ValidationMessage[];
}

const PSI_PER_BAR = 14.5038;
const LPM_PER_GPM = 3.78541;
const FT_PER_M = 3.28084;
const MM_PER_IN = 25.4;

/**
 * Common pressure washer nozzle sizes.
 * Kept in 0.5 increments for a practical V1 default.
 */
export const STANDARD_NOZZLE_SIZES: number[] = [
  1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5,
  7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 11.0, 12.0,
];

export function calculateTargetPressureNozzle(
  input: TargetPressureNozzleInput,
): TargetPressureNozzleResult {
  const messages: ValidationMessage[] = [];

  validateInput(input, messages);

  const totalFlowGpm = input.pumpFlowUnit === 'lpm'
    ? input.pumpFlow / LPM_PER_GPM
    : input.pumpFlow;

  const totalFlowLpm = input.pumpFlowUnit === 'gpm'
    ? input.pumpFlow * LPM_PER_GPM
    : input.pumpFlow;

  const ratedPressurePsi = input.ratedPressureUnit === 'bar'
    ? input.ratedPressure * PSI_PER_BAR
    : input.ratedPressure;

  const targetPressurePsi = input.targetPressureUnit === 'bar'
    ? input.targetPressure * PSI_PER_BAR
    : input.targetPressure;

  const nozzleCount = Math.max(1, Math.floor(input.nozzleCount || 1));
  const flowPerNozzleGpm = totalFlowGpm / nozzleCount;
  const flowPerNozzleLpm = totalFlowLpm / nozzleCount;
  const targetReference = input.targetReference ?? 'pump';

  // Exact nozzle size using the standard pressure washer nozzle relationship.
  const exactNozzleSize = flowPerNozzleGpm / Math.sqrt(targetPressurePsi / 4000);

  const recommendedNozzleSize = nearestStandardNozzle(exactNozzleSize);
  const recommendedTipCode = formatTipCode(recommendedNozzleSize);

  const nearbySizes = getNearbyStandardNozzles(exactNozzleSize);
  const nearbyOptions = nearbySizes.map((nozzleSize) => {
    const estimatedPressurePsi = 4000 * Math.pow(flowPerNozzleGpm / nozzleSize, 2);
    return {
      nozzleSize,
      tipCode: formatTipCode(nozzleSize),
      estimatedPressurePsi,
      estimatedPressureBar: estimatedPressurePsi / PSI_PER_BAR,
      deltaFromTargetPsi: estimatedPressurePsi - targetPressurePsi,
    } satisfies NearbyNozzleOption;
  });

  const hoseLengthM =
  input.hoseLength === undefined
    ? 0
    : input.hoseLengthUnit === 'ft'
      ? input.hoseLength / 3.28084
      : input.hoseLength;

const hoseInnerDiameterMm =
  input.hoseInnerDiameter === undefined
    ? 0
    : input.hoseInnerDiameterUnit === 'in'
      ? input.hoseInnerDiameter * 25.4
      : input.hoseInnerDiameter;

const hoseLossPsi =
  hoseLengthM > 0 && hoseInnerDiameterMm > 0
    ? pressureCalHoseLossPsi(totalFlowGpm, hoseLengthM, hoseInnerDiameterMm, 1000, 0.0015)
    : 0;

  const extraLossPsi = Math.max(0, input.extraLossPsi ?? 0);
  const requiredPumpPressurePsi = targetReference === 'gun'
    ? targetPressurePsi + hoseLossPsi + extraLossPsi
    : targetPressurePsi;

  const maxAchievableGunPressurePsi = Math.max(0, ratedPressurePsi - hoseLossPsi - extraLossPsi);
  const isAchievable = targetReference === 'pump'
    ? targetPressurePsi <= ratedPressurePsi
    : requiredPumpPressurePsi <= ratedPressurePsi;

  applyWarnings({
    exactNozzleSize,
    ratedPressurePsi,
    targetPressurePsi,
    targetReference,
    requiredPumpPressurePsi,
    maxAchievableGunPressurePsi,
    hoseLossPsi,
    messages,
  });

  return {
    exactNozzleSize,
    recommendedNozzleSize,
    recommendedTipCode,
    ratedPressurePsi,
    targetPressurePsi,
    totalFlowGpm,
    totalFlowLpm,
    flowPerNozzleGpm,
    flowPerNozzleLpm,
    nearbyOptions,
    hoseLossPsi,
    extraLossPsi,
    requiredPumpPressurePsi,
    requiredPumpPressureBar: requiredPumpPressurePsi / PSI_PER_BAR,
    maxAchievableGunPressurePsi,
    maxAchievableGunPressureBar: maxAchievableGunPressurePsi / PSI_PER_BAR,
    isAchievable,
    targetReference,
    messages,
  };
}

function validateInput(
  input: TargetPressureNozzleInput,
  messages: ValidationMessage[],
): void {
  if (!Number.isFinite(input.pumpFlow) || input.pumpFlow <= 0) {
    messages.push({ type: 'error', message: 'Pump flow must be greater than 0.' });
  }

  if (!Number.isFinite(input.ratedPressure) || input.ratedPressure <= 0) {
    messages.push({ type: 'error', message: 'Rated pump pressure must be greater than 0.' });
  }

  if (!Number.isFinite(input.targetPressure) || input.targetPressure <= 0) {
    messages.push({ type: 'error', message: 'Target pressure must be greater than 0.' });
  }

  if (!Number.isFinite(input.nozzleCount) || input.nozzleCount < 1) {
    messages.push({ type: 'error', message: 'Number of nozzles must be at least 1.' });
  }

  if (input.hoseLength !== undefined && input.hoseLength < 0) {
    messages.push({ type: 'error', message: 'Hose length cannot be negative.' });
  }

  if (input.hoseInnerDiameter !== undefined && input.hoseInnerDiameter <= 0) {
    messages.push({ type: 'error', message: 'Hose ID must be greater than 0.' });
  }
}

function applyWarnings(args: {
  exactNozzleSize: number;
  ratedPressurePsi: number;
  targetPressurePsi: number;
  targetReference: TargetReference;
  requiredPumpPressurePsi: number;
  maxAchievableGunPressurePsi: number;
  hoseLossPsi: number;
  messages: ValidationMessage[];
}): void {
  const {
    exactNozzleSize,
    ratedPressurePsi,
    targetPressurePsi,
    targetReference,
    requiredPumpPressurePsi,
    maxAchievableGunPressurePsi,
    hoseLossPsi,
    messages,
  } = args;

  if (exactNozzleSize < 2.0) {
    messages.push({
      type: 'warning',
      message: 'Calculated nozzle size is very small. Confirm unloader behaviour, tip availability, and safety limits.',
    });
  }

  if (exactNozzleSize > 10.0) {
    messages.push({
      type: 'warning',
      message: 'Calculated nozzle size is very large. Working pressure may be lower or less stable than expected.',
    });
  }

  if (targetReference === 'pump' && targetPressurePsi > ratedPressurePsi) {
    messages.push({
      type: 'warning',
      message: 'Target pressure exceeds rated pump pressure. PressureCal will still calculate a theoretical nozzle, but the target is beyond the machine rating.',
    });
  }

  if (targetReference === 'gun' && requiredPumpPressurePsi > ratedPressurePsi) {
    messages.push({
      type: 'warning',
      message: `Target at-gun pressure is not achievable with this setup. Maximum estimated at-gun pressure is about ${formatNumber(maxAchievableGunPressurePsi, 0)} PSI.`,
    });
  }

  if (targetReference === 'gun' && hoseLossPsi > 0) {
    messages.push({
      type: 'info',
      message: `Estimated hose loss is ${formatNumber(hoseLossPsi, 0)} PSI at rated flow.`,
    });
  }
}

function nearestStandardNozzle(exactSize: number): number {
  return STANDARD_NOZZLE_SIZES.reduce((closest, current) => {
    return Math.abs(current - exactSize) < Math.abs(closest - exactSize) ? current : closest;
  });
}

function getNearbyStandardNozzles(exactSize: number): number[] {
  const ordered = [...STANDARD_NOZZLE_SIZES].sort((a, b) => a - b);
  const nearest = nearestStandardNozzle(exactSize);
  const nearestIndex = ordered.findIndex((value) => value === nearest);

  const indexes = new Set([
    Math.max(0, nearestIndex - 1),
    nearestIndex,
    Math.min(ordered.length - 1, nearestIndex + 1),
  ]);

  return [...indexes].map((index) => ordered[index]);
}

/**
 * Formats a nozzle size to a common pressure washer tip code.
 * 4.0 => 040, 4.5 => 045, 10.0 => 100
 */
export function formatTipCode(nozzleSize: number): string {
  return String(Math.round(nozzleSize * 10)).padStart(3, '0');
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-AU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * PressureCal can swap this function for its exact in-app hose model later.
 *
 * This default implementation uses a practical hydraulic estimate that scales:
 * - linearly with hose length
 * - roughly with flow squared
 * - strongly with smaller hose IDs
 *
 * It is intended as a sensible V1 placeholder so the feature is fully usable,
 * while still keeping the hose-loss model isolated and easy to replace.
 */
export function estimateHoseLossPsi(args: {
  pumpFlowGpm: number;
  hoseLength?: number;
  hoseLengthUnit?: LengthUnit;
  hoseInnerDiameter?: number;
  hoseInnerDiameterUnit?: HoseIdUnit;
}): number {
  const { pumpFlowGpm, hoseLength, hoseLengthUnit, hoseInnerDiameter, hoseInnerDiameterUnit } = args;

  if (!hoseLength || !hoseInnerDiameter || hoseLength <= 0 || hoseInnerDiameter <= 0) {
    return 0;
  }

  const hoseLengthFt = hoseLengthUnit === 'm'
    ? hoseLength * FT_PER_M
    : hoseLength;

  const hoseInnerDiameterIn = hoseInnerDiameterUnit === 'mm'
    ? hoseInnerDiameter / MM_PER_IN
    : hoseInnerDiameter;

  // Anchored so 3/8" hose at 4 GPM loses roughly ~200 PSI over 100 m.
  const basePsiPer100FtAtReference = 8.2;
  const flowFactor = Math.pow(pumpFlowGpm / 4, 2);
  const diameterFactor = Math.pow(0.375 / hoseInnerDiameterIn, 4.8);

  return basePsiPer100FtAtReference * (hoseLengthFt / 100) * flowFactor * diameterFactor;
}
