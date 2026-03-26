import type {
  Inputs,
  PressureUnit,
  FlowUnit,
  LengthUnit,
  DiameterUnit,
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

function asSprayMode(value: string | null): Inputs["sprayMode"] | undefined {
  return value === "wand" || value === "surfaceCleaner" ? value : undefined;
}

export function buildRigSearchParams(inputs: PartialInputs): URLSearchParams {
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

  if (inputs.hoseId !== undefined && inputs.hoseId !== "") {
    params.set("hoseId", String(inputs.hoseId));
  }
  if (inputs.hoseIdUnit) {
    params.set("hoseIdUnit", inputs.hoseIdUnit);
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

  const hoseLength = asNumber(params.get("hoseLength"));
  if (hoseLength !== undefined) parsed.hoseLength = hoseLength;

  const hoseLengthUnit = asLengthUnit(params.get("hoseLengthUnit"));
  if (hoseLengthUnit) parsed.hoseLengthUnit = hoseLengthUnit;

  const hoseId = asNumber(params.get("hoseId"));
  if (hoseId !== undefined) parsed.hoseId = hoseId;

  const hoseIdUnit = asDiameterUnit(params.get("hoseIdUnit"));
  if (hoseIdUnit) parsed.hoseIdUnit = hoseIdUnit;

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