import type {
  Inputs,
  PressureUnit,
  FlowUnit,
  LengthUnit,
  DiameterUnit,
  HoseSetupMode,
} from "../pressurecal";

type PartialInputs = Partial<Inputs>;

function asNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function asPressureUnit(value: string | null): PressureUnit | undefined {
  return value === "psi" || value === "bar" ? value : undefined;
}

function asFlowUnit(value: string | null): FlowUnit | undefined {
  return value === "gpm" || value === "lpm" ? value : undefined;
}

function asLengthUnit(value: string | null): LengthUnit | undefined {
  return value === "m" || value === "ft" ? value : undefined;
}

function asDiameterUnit(value: string | null): DiameterUnit | undefined {
  return value === "mm" || value === "in" ? value : undefined;
}

function asHoseSetupMode(value: string | null): HoseSetupMode | undefined {
  return value === "single" || value === "mainLeader" ? value : undefined;
}

function asSprayMode(value: string | null): Inputs["sprayMode"] | undefined {
  return value === "wand" || value === "surfaceCleaner" ? value : undefined;
}

export function buildRigSearchParams(inputs: PartialInputs): URLSearchParams {
  const params = new URLSearchParams();
  const hoseSetupMode: HoseSetupMode =
    inputs.hoseSetupMode === "mainLeader" ? "mainLeader" : "single";

  if (inputs.pumpPressure !== undefined && inputs.pumpPressure !== "") {
    params.set("pumpPressure", String(inputs.pumpPressure));
  }
  if (inputs.pumpPressureUnit) {
    params.set("pumpPressureUnit", inputs.pumpPressureUnit);
  }

  if (inputs.pumpFlow !== undefined && inputs.pumpFlow !== "") {
    params.set("pumpFlow", String(inputs.pumpFlow));
  }
  if (inputs.pumpFlowUnit) {
    params.set("pumpFlowUnit", inputs.pumpFlowUnit);
  }

  if (inputs.maxPressure !== undefined && inputs.maxPressure !== "") {
    params.set("maxPressure", String(inputs.maxPressure));
  }
  if (inputs.maxPressureUnit) {
    params.set("maxPressureUnit", inputs.maxPressureUnit);
  }

  params.set("hoseSetupMode", hoseSetupMode);

  if (inputs.hoseLengthUnit) {
    params.set("hoseLengthUnit", inputs.hoseLengthUnit);
  }

  if (inputs.hoseIdUnit) {
    params.set("hoseIdUnit", inputs.hoseIdUnit);
  }

  if (hoseSetupMode === "mainLeader") {
    if (inputs.mainHoseLength !== undefined && inputs.mainHoseLength !== "") {
      params.set("mainHoseLength", String(inputs.mainHoseLength));
    }

    if (inputs.mainHoseId !== undefined && inputs.mainHoseId !== "") {
      params.set("mainHoseId", String(inputs.mainHoseId));
    }

    if (inputs.leaderHoseLength !== undefined && inputs.leaderHoseLength !== "") {
      params.set("leaderHoseLength", String(inputs.leaderHoseLength));
    }

    if (inputs.leaderHoseId !== undefined && inputs.leaderHoseId !== "") {
      params.set("leaderHoseId", String(inputs.leaderHoseId));
    }
  } else {
    if (inputs.hoseLength !== undefined && inputs.hoseLength !== "") {
      params.set("hoseLength", String(inputs.hoseLength));
    }

    if (inputs.hoseId !== undefined && inputs.hoseId !== "") {
      params.set("hoseId", String(inputs.hoseId));
    }
  }

  if (inputs.engineHp !== undefined && inputs.engineHp !== "") {
    params.set("engineHp", String(inputs.engineHp));
  }

  if (inputs.sprayMode) {
    params.set("sprayMode", inputs.sprayMode);
  }

  if (inputs.nozzleCount !== undefined) {
    params.set("nozzleCount", String(inputs.nozzleCount));
  }

  if (inputs.nozzleSizeText) {
    params.set("nozzleSizeText", inputs.nozzleSizeText);
  }

  return params;
}

export function buildLiteRigSearchParams(
  inputs: PartialInputs
): URLSearchParams {
  const params = new URLSearchParams();

  if (inputs.pumpPressure !== undefined && inputs.pumpPressure !== "") {
    params.set("pumpPressure", String(inputs.pumpPressure));
  }
  if (inputs.pumpPressureUnit) {
    params.set("pumpPressureUnit", inputs.pumpPressureUnit);
  }

  if (inputs.pumpFlow !== undefined && inputs.pumpFlow !== "") {
    params.set("pumpFlow", String(inputs.pumpFlow));
  }
  if (inputs.pumpFlowUnit) {
    params.set("pumpFlowUnit", inputs.pumpFlowUnit);
  }

  if (inputs.maxPressure !== undefined && inputs.maxPressure !== "") {
    params.set("maxPressure", String(inputs.maxPressure));
  }
  if (inputs.maxPressureUnit) {
    params.set("maxPressureUnit", inputs.maxPressureUnit);
  }

  if (inputs.hoseLength !== undefined && inputs.hoseLength !== "") {
    params.set("hoseLength", String(inputs.hoseLength));
  }
  if (inputs.hoseLengthUnit) {
    params.set("hoseLengthUnit", inputs.hoseLengthUnit);
  }

  if (inputs.nozzleSizeText) {
    params.set("nozzleSizeText", inputs.nozzleSizeText);
  }

  return params;
}

export function buildFullRigSearchParams(
  inputs: PartialInputs
): URLSearchParams {
  return buildRigSearchParams(inputs);
}

export function parseRigSearchParams(search: string): PartialInputs {
  const params = new URLSearchParams(search);
  const parsed: PartialInputs = {};

  const pumpPressure = asNumber(params.get("pumpPressure"));
  if (pumpPressure !== undefined) parsed.pumpPressure = pumpPressure;

  const pumpPressureUnit = asPressureUnit(params.get("pumpPressureUnit"));
  if (pumpPressureUnit) parsed.pumpPressureUnit = pumpPressureUnit;

  const pumpFlow = asNumber(params.get("pumpFlow"));
  if (pumpFlow !== undefined) parsed.pumpFlow = pumpFlow;

  const pumpFlowUnit = asFlowUnit(params.get("pumpFlowUnit"));
  if (pumpFlowUnit) parsed.pumpFlowUnit = pumpFlowUnit;

  const maxPressure = asNumber(params.get("maxPressure"));
  if (maxPressure !== undefined) parsed.maxPressure = maxPressure;

  const maxPressureUnit = asPressureUnit(params.get("maxPressureUnit"));
  if (maxPressureUnit) parsed.maxPressureUnit = maxPressureUnit;

  const hoseSetupMode = asHoseSetupMode(params.get("hoseSetupMode"));
  if (hoseSetupMode) parsed.hoseSetupMode = hoseSetupMode;

  const hoseLengthUnit = asLengthUnit(params.get("hoseLengthUnit"));
  if (hoseLengthUnit) parsed.hoseLengthUnit = hoseLengthUnit;

  const hoseIdUnit = asDiameterUnit(params.get("hoseIdUnit"));
  if (hoseIdUnit) parsed.hoseIdUnit = hoseIdUnit;

  if (hoseSetupMode !== "mainLeader") {
    const hoseLength = asNumber(params.get("hoseLength"));
    if (hoseLength !== undefined) parsed.hoseLength = Math.max(0, hoseLength);

    const hoseId = asNumber(params.get("hoseId"));
    if (hoseId !== undefined) parsed.hoseId = hoseId;
  }

  const mainHoseLength = asNumber(params.get("mainHoseLength"));
  if (mainHoseLength !== undefined) parsed.mainHoseLength = Math.max(0, mainHoseLength);

  const mainHoseId = asNumber(params.get("mainHoseId"));
  if (mainHoseId !== undefined) parsed.mainHoseId = mainHoseId;

  const leaderHoseLength = asNumber(params.get("leaderHoseLength"));
  if (leaderHoseLength !== undefined) parsed.leaderHoseLength = Math.max(0, leaderHoseLength);

  const leaderHoseId = asNumber(params.get("leaderHoseId"));
  if (leaderHoseId !== undefined) parsed.leaderHoseId = leaderHoseId;

  const engineHp = asNumber(params.get("engineHp"));
  if (engineHp !== undefined) parsed.engineHp = engineHp;

  const sprayMode = asSprayMode(params.get("sprayMode"));
  if (sprayMode) parsed.sprayMode = sprayMode;

  const nozzleCount = asNumber(params.get("nozzleCount"));
  if (nozzleCount !== undefined) parsed.nozzleCount = Math.max(1, nozzleCount);

  const nozzleSizeText = params.get("nozzleSizeText");
  if (nozzleSizeText) parsed.nozzleSizeText = nozzleSizeText;

  return parsed;
}