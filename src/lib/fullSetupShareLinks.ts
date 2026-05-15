import type { Inputs } from "../pressurecal";
import { buildFullRigSearchParams } from "./rigUrlState";

export const FULL_SETUP_CALCULATOR_PATH = "/calculator";

export const FULL_SETUP_QUERY_PARAM_KEYS = [
  "pumpPressure",
  "pumpPressureUnit",
  "pumpFlow",
  "pumpFlowUnit",
  "maxPressure",
  "maxPressureUnit",
  "hoseLength",
  "hoseLengthUnit",
  "hoseId",
  "hoseIdUnit",
  "engineHp",
  "sprayMode",
  "nozzleCount",
  "nozzleMode",
  "nozzleSizeText",
  "orificeMm",
  "dischargeCoeffCd",
  "waterDensity",
  "hoseRoughnessMm",
] as const;

export type FullSetupQueryParamKey = typeof FULL_SETUP_QUERY_PARAM_KEYS[number];

export function hasFullSetupQueryParams(
  search: string | URLSearchParams,
): boolean {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;

  return FULL_SETUP_QUERY_PARAM_KEYS.some((key) => params.has(key));
}

export function buildCalculatorPathWithSearch(search: string): string {
  if (!search) return FULL_SETUP_CALCULATOR_PATH;

  return `${FULL_SETUP_CALCULATOR_PATH}${
    search.startsWith("?") ? search : `?${search}`
  }`;
}

export function buildFullSetupHref(inputs: Inputs): string {
  const params = buildFullRigSearchParams(inputs);
  const queryString = params.toString();

  return `${FULL_SETUP_CALCULATOR_PATH}${queryString ? `?${queryString}` : ""}`;
}

export function buildFullSetupShareUrl(
  inputs: Inputs,
  origin?: string,
): string {
  const resolvedOrigin =
    origin ??
    (typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "");

  return `${resolvedOrigin}${buildFullSetupHref(inputs)}`;
}
