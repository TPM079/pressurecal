import type { Inputs } from "../pressurecal";
import type { SavedSetup } from "../hooks/useSavedSetups";

const DEFAULT_COMPARE_INPUTS: Inputs = {
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
  engineHp: 13,
  sprayMode: "wand",
  nozzleCount: 1,
  nozzleMode: "tipSize",
  nozzleSizeText: "040",
  orificeMm: 1.2,
  dischargeCoeffCd: 0.62,
  waterDensity: 1000,
  hoseRoughnessMm: 0.0015,
};

export function savedSetupToInputs(setup: SavedSetup): Inputs {
  return {
    pumpPressure: setup.pumpPressure ?? DEFAULT_COMPARE_INPUTS.pumpPressure,
    pumpPressureUnit: setup.pumpPressureUnit ?? DEFAULT_COMPARE_INPUTS.pumpPressureUnit,
    pumpFlow: setup.pumpFlow ?? DEFAULT_COMPARE_INPUTS.pumpFlow,
    pumpFlowUnit: setup.pumpFlowUnit ?? DEFAULT_COMPARE_INPUTS.pumpFlowUnit,
    maxPressure: setup.maxPressure ?? DEFAULT_COMPARE_INPUTS.maxPressure,
    maxPressureUnit: setup.maxPressureUnit ?? DEFAULT_COMPARE_INPUTS.maxPressureUnit,
    hoseLength: setup.hoseLength ?? DEFAULT_COMPARE_INPUTS.hoseLength,
    hoseLengthUnit: setup.hoseLengthUnit ?? DEFAULT_COMPARE_INPUTS.hoseLengthUnit,
    hoseId: setup.hoseId ?? DEFAULT_COMPARE_INPUTS.hoseId,
    hoseIdUnit: setup.hoseIdUnit ?? DEFAULT_COMPARE_INPUTS.hoseIdUnit,
    engineHp: setup.engineHp ?? DEFAULT_COMPARE_INPUTS.engineHp,
    sprayMode: setup.sprayMode ?? DEFAULT_COMPARE_INPUTS.sprayMode,
    nozzleCount: setup.nozzleCount ?? DEFAULT_COMPARE_INPUTS.nozzleCount,
    nozzleMode: "tipSize",
    nozzleSizeText: setup.nozzleSizeText ?? DEFAULT_COMPARE_INPUTS.nozzleSizeText,
    orificeMm: setup.orificeMm ?? DEFAULT_COMPARE_INPUTS.orificeMm,
    dischargeCoeffCd: setup.dischargeCoeffCd ?? DEFAULT_COMPARE_INPUTS.dischargeCoeffCd,
    waterDensity: setup.waterDensity ?? DEFAULT_COMPARE_INPUTS.waterDensity,
    hoseRoughnessMm: setup.hoseRoughnessMm ?? DEFAULT_COMPARE_INPUTS.hoseRoughnessMm,
  };
}
