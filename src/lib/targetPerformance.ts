import {
  barFromPsi,
  gpmFrom,
  hoseLossPsi,
  lpmFromGpm,
  metersFrom,
  mmFrom,
  psiFrom,
  q4000FromFlowAtPressure,
} from "../pressurecal";
import type {
  DiameterUnit,
  FlowUnit,
  HoseSetupMode,
  LengthUnit,
  PressureUnit,
} from "../pressurecal";
import {
  STANDARD_NOZZLE_SIZES,
  formatTipCode,
} from "./targetPressureNozzle";

export type TargetHoseSectionInput = {
  length: number;
  lengthUnit: LengthUnit;
  internalDiameter: number;
  diameterUnit: DiameterUnit;
};

export type TargetPerformanceInput = {
  targetPressure: number;
  targetPressureUnit: PressureUnit;
  targetFlow: number;
  targetFlowUnit: FlowUnit;
  hoseSetupMode: HoseSetupMode;
  singleHose: TargetHoseSectionInput;
  mainHose: TargetHoseSectionInput;
  leaderHose: TargetHoseSectionInput;
  componentLossAllowancePsi: number;
  pumpPressureHeadroomPercent: number;
  pumpEfficiencyPercent: number;
  driveEfficiencyPercent: number;
  waterDensity?: number;
  hoseRoughnessMm?: number;
};

export type PracticalNozzleOption = {
  relationship: "smaller" | "closest" | "larger";
  nozzleSize: number;
  nozzleCode: string;
  estimatedGunPressurePsi: number;
  requiredPumpPressurePsi: number;
  exceedsPracticalPumpRating: boolean;
};

export type TargetPerformanceResult = {
  targetPressurePsi: number;
  targetFlowGpm: number;
  targetFlowLpm: number;
  mainHoseLossPsi: number;
  leaderHoseLossPsi: number;
  totalHoseLossPsi: number;
  hoseLossPercentOfTarget: number;
  componentLossAllowancePsi: number;
  totalPressureAboveTargetPsi: number;
  minimumPumpOperatingPressurePsi: number;
  recommendedPumpPressureRatingPsi: number;
  practicalPumpPressureRatingPsi: number;
  requiredPumpFlowGpm: number;
  requiredPumpFlowLpm: number;
  idealNozzleSize: number;
  idealNozzleCode: string;
  closestPracticalNozzle: PracticalNozzleOption;
  practicalNozzleOptions: PracticalNozzleOption[];
  hydraulicPowerKw: number;
  estimatedInputPowerKw: number;
  estimatedInputPowerHp: number;
  warnings: string[];
};

export type TargetPerformanceCalculation = {
  errors: string[];
  result: TargetPerformanceResult | null;
};

const DEFAULT_WATER_DENSITY = 1000;
const DEFAULT_HOSE_ROUGHNESS_MM = 0.0015;
const KW_PER_HP = 0.745699872;

function isFinitePositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

function validateHoseSection(
  label: string,
  section: TargetHoseSectionInput,
  errors: string[]
) {
  if (!Number.isFinite(section.length) || section.length < 0) {
    errors.push(`${label} length cannot be negative.`);
  }

  if (section.length > 0 && !isFinitePositive(section.internalDiameter)) {
    errors.push(`${label} internal diameter must be greater than zero.`);
  }
}

function calculateSectionLossPsi(
  section: TargetHoseSectionInput,
  flowGpm: number,
  waterDensity: number,
  hoseRoughnessMm: number
) {
  const lengthM = metersFrom(section.length, section.lengthUnit);
  const internalDiameterMm = mmFrom(section.internalDiameter, section.diameterUnit);

  return hoseLossPsi(
    flowGpm,
    lengthM,
    internalDiameterMm,
    waterDensity,
    hoseRoughnessMm
  );
}

function pressureForNozzleAtFlowPsi(flowGpm: number, nozzleSize: number) {
  if (!isFinitePositive(flowGpm) || !isFinitePositive(nozzleSize)) return 0;
  return 4000 * Math.pow(flowGpm / nozzleSize, 2);
}

function nearestStandardNozzle(exactSize: number) {
  return STANDARD_NOZZLE_SIZES.reduce((closest, current) =>
    Math.abs(current - exactSize) < Math.abs(closest - exactSize)
      ? current
      : closest
  );
}

function buildPracticalNozzleOptions(args: {
  idealNozzleSize: number;
  targetFlowGpm: number;
  totalHoseLossPsi: number;
  componentLossAllowancePsi: number;
  practicalPumpPressureRatingPsi: number;
}): PracticalNozzleOption[] {
  const ordered = [...STANDARD_NOZZLE_SIZES].sort((a, b) => a - b);
  const closestSize = nearestStandardNozzle(args.idealNozzleSize);
  const smallerSize = [...ordered]
    .reverse()
    .find((size) => size < args.idealNozzleSize);
  const largerSize = ordered.find((size) => size > args.idealNozzleSize);

  const candidates: Array<{
    relationship: PracticalNozzleOption["relationship"];
    nozzleSize: number | undefined;
  }> = [
    { relationship: "smaller", nozzleSize: smallerSize },
    { relationship: "closest", nozzleSize: closestSize },
    { relationship: "larger", nozzleSize: largerSize },
  ];

  const seen = new Set<number>();

  return candidates.flatMap(({ relationship, nozzleSize }) => {
    if (!nozzleSize || seen.has(nozzleSize)) return [];
    seen.add(nozzleSize);

    const estimatedGunPressurePsi = pressureForNozzleAtFlowPsi(
      args.targetFlowGpm,
      nozzleSize
    );
    const requiredPumpPressurePsi =
      estimatedGunPressurePsi +
      args.totalHoseLossPsi +
      args.componentLossAllowancePsi;

    return [
      {
        relationship,
        nozzleSize,
        nozzleCode: formatTipCode(nozzleSize),
        estimatedGunPressurePsi,
        requiredPumpPressurePsi,
        exceedsPracticalPumpRating:
          requiredPumpPressurePsi > args.practicalPumpPressureRatingPsi,
      },
    ];
  });
}

/**
 * Designs a basic series pressure-washer setup around a required at-gun duty.
 * Hose sections carry the same flow and are calculated independently.
 */
export function calculateTargetPerformance(
  input: TargetPerformanceInput
): TargetPerformanceCalculation {
  const errors: string[] = [];

  if (!isFinitePositive(input.targetPressure)) {
    errors.push("Target working pressure at the gun must be greater than zero.");
  }

  if (!isFinitePositive(input.targetFlow)) {
    errors.push("Target flow at the gun must be greater than zero.");
  }

  if (
    !Number.isFinite(input.componentLossAllowancePsi) ||
    input.componentLossAllowancePsi < 0
  ) {
    errors.push("Gun and fittings allowance cannot be negative.");
  }

  if (
    !Number.isFinite(input.pumpPressureHeadroomPercent) ||
    input.pumpPressureHeadroomPercent < 0
  ) {
    errors.push("Pump pressure headroom cannot be negative.");
  }

  if (
    !isFinitePositive(input.pumpEfficiencyPercent) ||
    input.pumpEfficiencyPercent > 100
  ) {
    errors.push("Pump efficiency must be greater than zero and no more than 100%.");
  }

  if (
    !isFinitePositive(input.driveEfficiencyPercent) ||
    input.driveEfficiencyPercent > 100
  ) {
    errors.push("Drive efficiency must be greater than zero and no more than 100%.");
  }

  if (input.hoseSetupMode === "mainLeader") {
    validateHoseSection("Main hose", input.mainHose, errors);
    validateHoseSection("Leader hose", input.leaderHose, errors);
  } else {
    validateHoseSection("Hose", input.singleHose, errors);
  }

  if (errors.length > 0) {
    return { errors, result: null };
  }

  const targetPressurePsi = psiFrom(
    input.targetPressure,
    input.targetPressureUnit
  );
  const targetFlowGpm = gpmFrom(input.targetFlow, input.targetFlowUnit);
  const targetFlowLpm = lpmFromGpm(targetFlowGpm);
  const waterDensity = input.waterDensity ?? DEFAULT_WATER_DENSITY;
  const hoseRoughnessMm =
    input.hoseRoughnessMm ?? DEFAULT_HOSE_ROUGHNESS_MM;

  const mainHoseLossPsi =
    input.hoseSetupMode === "mainLeader"
      ? calculateSectionLossPsi(
          input.mainHose,
          targetFlowGpm,
          waterDensity,
          hoseRoughnessMm
        )
      : calculateSectionLossPsi(
          input.singleHose,
          targetFlowGpm,
          waterDensity,
          hoseRoughnessMm
        );

  const leaderHoseLossPsi =
    input.hoseSetupMode === "mainLeader" && input.leaderHose.length > 0
      ? calculateSectionLossPsi(
          input.leaderHose,
          targetFlowGpm,
          waterDensity,
          hoseRoughnessMm
        )
      : 0;

  const totalHoseLossPsi = mainHoseLossPsi + leaderHoseLossPsi;
  const componentLossAllowancePsi = Math.max(
    0,
    input.componentLossAllowancePsi
  );
  const totalPressureAboveTargetPsi =
    totalHoseLossPsi + componentLossAllowancePsi;
  const minimumPumpOperatingPressurePsi =
    targetPressurePsi + totalPressureAboveTargetPsi;
  const recommendedPumpPressureRatingPsi =
    minimumPumpOperatingPressurePsi *
    (1 + input.pumpPressureHeadroomPercent / 100);
  const practicalPumpPressureRatingPsi =
    Math.ceil(recommendedPumpPressureRatingPsi / 100) * 100;

  const idealNozzleSize = q4000FromFlowAtPressure(
    targetFlowGpm,
    targetPressurePsi
  );
  const idealNozzleCode = formatTipCode(idealNozzleSize);

  const practicalNozzleOptions = buildPracticalNozzleOptions({
    idealNozzleSize,
    targetFlowGpm,
    totalHoseLossPsi,
    componentLossAllowancePsi,
    practicalPumpPressureRatingPsi,
  });
  const closestPracticalNozzle =
    practicalNozzleOptions.find((option) => option.relationship === "closest") ??
    practicalNozzleOptions[0];

  const hydraulicPowerKw =
    (barFromPsi(minimumPumpOperatingPressurePsi) * targetFlowLpm) / 600;
  const estimatedInputPowerKw =
    hydraulicPowerKw /
    (input.pumpEfficiencyPercent / 100) /
    (input.driveEfficiencyPercent / 100);
  const estimatedInputPowerHp = estimatedInputPowerKw / KW_PER_HP;
  const hoseLossPercentOfTarget =
    targetPressurePsi > 0 ? (totalHoseLossPsi / targetPressurePsi) * 100 : 0;

  const warnings: string[] = [];

  if (input.pumpPressureHeadroomPercent === 0) {
    warnings.push(
      "This setup leaves no pump pressure headroom. Actual at-gun performance may be lower due to component condition, hose construction and other restrictions."
    );
  }

  if (hoseLossPercentOfTarget > 10) {
    warnings.push(
      "Hose pressure loss is more than 10% of the target pressure. Consider a shorter hose or larger internal diameter."
    );
  } else if (hoseLossPercentOfTarget > 5) {
    warnings.push(
      "Hose pressure loss is more than 5% of the target pressure. Review hose length and internal diameter before selecting the pump."
    );
  }

  if (closestPracticalNozzle?.exceedsPracticalPumpRating) {
    warnings.push(
      "The closest practical nozzle would require more pressure at the target flow than the rounded recommended pump rating. Select a larger nozzle or a suitably rated pump."
    );
  }

  return {
    errors,
    result: {
      targetPressurePsi,
      targetFlowGpm,
      targetFlowLpm,
      mainHoseLossPsi,
      leaderHoseLossPsi,
      totalHoseLossPsi,
      hoseLossPercentOfTarget,
      componentLossAllowancePsi,
      totalPressureAboveTargetPsi,
      minimumPumpOperatingPressurePsi,
      recommendedPumpPressureRatingPsi,
      practicalPumpPressureRatingPsi,
      requiredPumpFlowGpm: targetFlowGpm,
      requiredPumpFlowLpm: targetFlowLpm,
      idealNozzleSize,
      idealNozzleCode,
      closestPracticalNozzle,
      practicalNozzleOptions,
      hydraulicPowerKw,
      estimatedInputPowerKw,
      estimatedInputPowerHp,
      warnings,
    },
  };
}
