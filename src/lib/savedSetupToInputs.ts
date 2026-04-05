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
    ...DEFAULT_COMPARE_INPUTS,
    pumpPressure: setup.machinePsi ?? DEFAULT_COMPARE_INPUTS.pumpPressure,
    maxPressure: setup.machinePsi ?? DEFAULT_COMPARE_INPUTS.maxPressure,
    pumpFlow: setup.machineLpm ?? DEFAULT_COMPARE_INPUTS.pumpFlow,
    hoseLength: setup.hoseLengthM ?? DEFAULT_COMPARE_INPUTS.hoseLength,
    hoseId: setup.hoseIdMm ?? DEFAULT_COMPARE_INPUTS.hoseId,
    nozzleSizeText: setup.nozzleSize ?? DEFAULT_COMPARE_INPUTS.nozzleSizeText,
  };
}
