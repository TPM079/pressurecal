/**
 * Orifice/nozzle conversion helpers for PressureCal.
 *
 * These functions are framework-agnostic and can be moved into your existing
 * pressurecal.ts calculation engine if you prefer keeping all formulas together.
 */

export type DiameterUnit = "mm" | "in";

export type ClosestNozzle = {
  code: string;
  numericCode: number;
  diameterMm: number;
  diameterIn: number;
  gpmAtReferencePressure: number;
  lpmAtReferencePressure: number;
  difference: number;
};

const PSI_TO_PA = 6894.757293168;
const IN_TO_MM = 25.4;
const US_GAL_TO_L = 3.785411784;
const DEFAULT_CD = 0.62;
const WATER_DENSITY_KG_M3 = 1000;

const COMMON_NOZZLE_CODES = [
  15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 100,
  120, 150, 200,
];

export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatNozzleCode(code: number): string {
  const rounded = Math.round(code);
  return String(rounded).padStart(3, "0");
}

export function diameterToMm(value: number, unit: DiameterUnit): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return unit === "mm" ? value : value * IN_TO_MM;
}

export function mmToIn(valueMm: number): number {
  return valueMm / IN_TO_MM;
}

export function flowGpmFromOrificeDiameter(
  diameterMm: number,
  pressurePsi: number,
  cd = DEFAULT_CD
): number {
  if (
    !Number.isFinite(diameterMm) ||
    !Number.isFinite(pressurePsi) ||
    !Number.isFinite(cd) ||
    diameterMm <= 0 ||
    pressurePsi <= 0 ||
    cd <= 0
  ) {
    return 0;
  }

  const diameterM = diameterMm / 1000;
  const areaM2 = Math.PI * diameterM * diameterM / 4;
  const pressurePa = pressurePsi * PSI_TO_PA;
  const flowM3S = cd * areaM2 * Math.sqrt((2 * pressurePa) / WATER_DENSITY_KG_M3);
  const litresPerMinute = flowM3S * 1000 * 60;

  return litresPerMinute / US_GAL_TO_L;
}

export function nozzleCodeFromDiameter(
  diameterMm: number,
  referencePressurePsi = 4000,
  cd = DEFAULT_CD
): number {
  const gpm = flowGpmFromOrificeDiameter(diameterMm, referencePressurePsi, cd);
  return gpm * 10;
}

export function diameterMmFromNozzleCode(
  nozzleCode: number,
  referencePressurePsi = 4000,
  cd = DEFAULT_CD
): number {
  if (
    !Number.isFinite(nozzleCode) ||
    !Number.isFinite(referencePressurePsi) ||
    !Number.isFinite(cd) ||
    nozzleCode <= 0 ||
    referencePressurePsi <= 0 ||
    cd <= 0
  ) {
    return 0;
  }

  const targetGpm = nozzleCode / 10;
  const targetLpm = targetGpm * US_GAL_TO_L;
  const targetM3S = targetLpm / 1000 / 60;
  const pressurePa = referencePressurePsi * PSI_TO_PA;
  const areaM2 = targetM3S / (cd * Math.sqrt((2 * pressurePa) / WATER_DENSITY_KG_M3));
  const diameterM = Math.sqrt((4 * areaM2) / Math.PI);

  return diameterM * 1000;
}

export function getClosestNozzleCodes(
  targetCode: number,
  referencePressurePsi: number,
  cd = DEFAULT_CD
): ClosestNozzle[] {
  if (!Number.isFinite(targetCode) || targetCode <= 0) return [];

  return COMMON_NOZZLE_CODES
    .map((numericCode) => {
      const diameterMm = diameterMmFromNozzleCode(numericCode, referencePressurePsi, cd);
      const gpm = numericCode / 10;

      return {
        code: formatNozzleCode(numericCode),
        numericCode,
        diameterMm,
        diameterIn: mmToIn(diameterMm),
        gpmAtReferencePressure: gpm,
        lpmAtReferencePressure: gpm * US_GAL_TO_L,
        difference: Math.abs(numericCode - targetCode),
      };
    })
    .sort((a, b) => a.difference - b.difference)
    .slice(0, 5);
}
