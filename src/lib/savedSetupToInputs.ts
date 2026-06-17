import type { Inputs } from "../pressurecal";
import type { SavedSetup } from "../hooks/useSavedSetups";

const INPUT_DEFAULTS: Inputs = {
  pumpPressure: 4000,
  pumpPressureUnit: "psi",
  pumpFlow: 15,
  pumpFlowUnit: "lpm",
  maxPressure: 4000,
  maxPressureUnit: "psi",
  hoseSetupMode: "single",
  hoseLength: 15,
  hoseLengthUnit: "m",
  hoseId: 9.53,
  hoseIdUnit: "mm",
  mainHoseLength: 50,
  mainHoseId: 9.53,
  leaderHoseLength: 20,
  leaderHoseId: 6.35,
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

export function savedSetupToInputs(setup: SavedSetup): Inputs {
  const sprayMode = setup.sprayMode ?? INPUT_DEFAULTS.sprayMode;

  return {
    pumpPressure: setup.pumpPressure ?? INPUT_DEFAULTS.pumpPressure,
    pumpPressureUnit: setup.pumpPressureUnit ?? INPUT_DEFAULTS.pumpPressureUnit,
    pumpFlow: setup.pumpFlow ?? INPUT_DEFAULTS.pumpFlow,
    pumpFlowUnit: setup.pumpFlowUnit ?? INPUT_DEFAULTS.pumpFlowUnit,
    maxPressure: setup.maxPressure ?? INPUT_DEFAULTS.maxPressure,
    maxPressureUnit: setup.maxPressureUnit ?? INPUT_DEFAULTS.maxPressureUnit,
    hoseSetupMode: setup.hoseSetupMode === "mainLeader" ? "mainLeader" : "single",
    hoseLength: setup.hoseLength ?? INPUT_DEFAULTS.hoseLength,
    hoseLengthUnit: setup.hoseLengthUnit ?? INPUT_DEFAULTS.hoseLengthUnit,
    hoseId: setup.hoseId ?? INPUT_DEFAULTS.hoseId,
    hoseIdUnit: setup.hoseIdUnit ?? INPUT_DEFAULTS.hoseIdUnit,
    mainHoseLength: setup.mainHoseLength ?? setup.hoseLength ?? INPUT_DEFAULTS.mainHoseLength,
    mainHoseId: setup.mainHoseId ?? setup.hoseId ?? INPUT_DEFAULTS.mainHoseId,
    leaderHoseLength: setup.leaderHoseLength ?? INPUT_DEFAULTS.leaderHoseLength,
    leaderHoseId: setup.leaderHoseId ?? INPUT_DEFAULTS.leaderHoseId,
    engineHp: setup.engineHp ?? INPUT_DEFAULTS.engineHp,
    sprayMode,
    nozzleCount: Math.max(
      sprayMode === "surfaceCleaner" ? 2 : 1,
      setup.nozzleCount ?? INPUT_DEFAULTS.nozzleCount
    ),
    nozzleMode: "tipSize",
    nozzleSizeText: setup.nozzleSizeText ?? INPUT_DEFAULTS.nozzleSizeText,
    orificeMm: setup.orificeMm ?? INPUT_DEFAULTS.orificeMm,
    dischargeCoeffCd: setup.dischargeCoeffCd ?? INPUT_DEFAULTS.dischargeCoeffCd,
    waterDensity: setup.waterDensity ?? INPUT_DEFAULTS.waterDensity,
    hoseRoughnessMm: setup.hoseRoughnessMm ?? INPUT_DEFAULTS.hoseRoughnessMm,
  };
}
