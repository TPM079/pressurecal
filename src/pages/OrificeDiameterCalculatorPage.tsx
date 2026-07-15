import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import PressureCalLayout from "../components/PressureCalLayout";
import BackToTopButton from "../components/BackToTopButton";

/**
 * Orifice Diameter to Nozzle Code Calculator
 *
 * Drop-in React + TypeScript + Tailwind page for PressureCal.
 *
 * It converts a measured orifice diameter into:
 * - equivalent nozzle / tip code
 * - flow at the selected reference pressure
 * - closest common nozzle / tip codes
 *
 * Notes:
 * - Uses the same plain orifice equation style as PressureCal:
 *   Q = Cd × A × sqrt(2 × ΔP / rho)
 * - Default Cd is 0.62.
 * - Default reference pressure is 4000 PSI because pressure washer nozzle
 *   codes are commonly expressed as GPM at 4000 PSI × 10.
 */

type DiameterUnit = "mm" | "in";
type FlowUnit = "lpm" | "gpm";

type ClosestNozzle = {
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

function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatNozzleCode(code: number): string {
  const rounded = Math.round(code);
  return String(rounded).padStart(3, "0");
}

function diameterToMm(value: number, unit: DiameterUnit): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return unit === "mm" ? value : value * IN_TO_MM;
}

function mmToIn(valueMm: number): number {
  return valueMm / IN_TO_MM;
}

function flowGpmFromOrificeDiameter(
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
  const areaM2 = (Math.PI * diameterM * diameterM) / 4;
  const pressurePa = pressurePsi * PSI_TO_PA;
  const flowM3S = cd * areaM2 * Math.sqrt((2 * pressurePa) / WATER_DENSITY_KG_M3);
  const litresPerMinute = flowM3S * 1000 * 60;

  return litresPerMinute / US_GAL_TO_L;
}

function nozzleCodeFromDiameter(
  diameterMm: number,
  referencePressurePsi = 4000,
  cd = DEFAULT_CD
): number {
  const gpm = flowGpmFromOrificeDiameter(diameterMm, referencePressurePsi, cd);
  return gpm * 10;
}

function diameterMmFromNozzleCode(
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

function getClosestNozzleCodes(
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

export default function OrificeDiameterCalculatorPage() {
  const [diameterInput, setDiameterInput] = useState("1.48");
  const [diameterUnit, setDiameterUnit] = useState<DiameterUnit>("mm");
  const [referencePressurePsi, setReferencePressurePsi] = useState("4000");
  const [flowUnit, setFlowUnit] = useState<FlowUnit>("lpm");

  const result = useMemo(() => {
    const diameterValue = Number(diameterInput);
    const pressurePsi = Number(referencePressurePsi);

    const diameterMm = diameterToMm(diameterValue, diameterUnit);
    const diameterIn = mmToIn(diameterMm);
    const gpm = flowGpmFromOrificeDiameter(diameterMm, pressurePsi);
    const lpm = gpm * US_GAL_TO_L;
    const nozzleCode = nozzleCodeFromDiameter(diameterMm, pressurePsi);
    const closestNozzles = getClosestNozzleCodes(nozzleCode, pressurePsi);

    return {
      isValid:
        Number.isFinite(diameterValue) &&
        Number.isFinite(pressurePsi) &&
        diameterValue > 0 &&
        pressurePsi > 0,
      diameterMm,
      diameterIn,
      gpm,
      lpm,
      nozzleCode,
      roundedNozzleCode: formatNozzleCode(nozzleCode),
      closestNozzles,
    };
  }, [diameterInput, diameterUnit, referencePressurePsi]);

  const flowValue =
    flowUnit === "lpm"
      ? `${roundTo(result.lpm, 1)} LPM`
      : `${roundTo(result.gpm, 2)} GPM`;

  const secondaryFlowValue =
    flowUnit === "lpm"
      ? `${roundTo(result.gpm, 2)} GPM`
      : `${roundTo(result.lpm, 1)} LPM`;

  return (
    <PressureCalLayout>
      <Helmet>
        <title>Orifice Diameter to Nozzle Size Calculator | PressureCal</title>
        <meta
          name="description"
          content="Measure a pressure washer nozzle orifice diameter and estimate the equivalent nozzle / tip code, flow rate, and closest common nozzle size."
        />
        <link
          rel="canonical"
          href="https://www.pressurecal.com/orifice-diameter-calculator"
        />
      </Helmet>

      <section className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
            PressureCal calculator
          </p>
          <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
            Orifice Diameter to Nozzle Size Calculator
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Measure an orifice diameter and estimate the equivalent pressure washer
            nozzle / tip code. Useful for checking unmarked nozzles, worn nozzles, or
            matching a replacement before buying.
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-[1.5rem] border border-blue-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-950">Enter orifice diameter</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use calipers where possible. Small diameter changes can move the equivalent
              nozzle / tip code quickly.
            </p>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Orifice diameter
                </span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
                  <input
                    value={diameterInput}
                    onChange={(event) => setDiameterInput(event.target.value)}
                    inputMode="decimal"
                    className="min-w-0 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-lg font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="1.48"
                  />
                  <select
                    value={diameterUnit}
                    onChange={(event) =>
                      setDiameterUnit(event.target.value as DiameterUnit)
                    }
                    className="min-w-0 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="mm">mm</option>
                    <option value="in">in</option>
                  </select>
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Reference pressure
                </span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
                  <input
                    value={referencePressurePsi}
                    onChange={(event) => setReferencePressurePsi(event.target.value)}
                    inputMode="decimal"
                    className="min-w-0 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-lg font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="4000"
                  />
                  <div className="flex min-w-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-600">
                    PSI
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Keep this at 4000 PSI for standard nozzle / tip code matching, or change
                  it to estimate flow at another pressure.
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Preferred flow unit
                </span>
                <select
                  value={flowUnit}
                  onChange={(event) => setFlowUnit(event.target.value as FlowUnit)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="lpm">LPM first</option>
                  <option value="gpm">GPM first</option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-4 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
              Equivalent nozzle / tip code
            </p>

            {!result.isValid ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
                Enter a positive orifice diameter and reference pressure to calculate
                an equivalent nozzle / tip code.
              </div>
            ) : (
              <>
                <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-end">
                  <div className="rounded-2xl bg-blue-600 px-6 py-5 text-white shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                      Nozzle / tip code
                    </div>
                    <div className="mt-2 text-5xl font-black tracking-tight">
                      {result.roundedNozzleCode}
                    </div>
                  </div>

                  <div className="pb-2">
                    <div className="text-sm font-semibold text-slate-500">
                      Exact equivalent
                    </div>
                    <div className="mt-1 text-2xl font-black text-slate-950">
                      {roundTo(result.nozzleCode, 1)}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-blue-200 bg-white p-4 text-sm leading-6 text-slate-700">
                  This estimates the nozzle / tip code from measured orifice diameter using
                  a plain orifice calculation. Actual flow can vary with nozzle design,
                  wear, spray angle, and manufacturer.
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Diameter
                    </div>
                    <div className="mt-2 text-xl font-black text-slate-950">
                      {roundTo(result.diameterMm, 3)} mm
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-500">
                      {roundTo(result.diameterIn, 4)} in
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Estimated flow
                    </div>
                    <div className="mt-2 text-xl font-black text-slate-950">
                      {flowValue}
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-500">
                      {secondaryFlowValue} @ {Number(referencePressurePsi) || 0} PSI
                    </div>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h2 className="text-sm font-black text-slate-950">
                      Closest nozzle / tip codes
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Based on common pressure washer nozzle sizing.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100 sm:hidden">
                    {result.closestNozzles.map((item) => (
                      <div key={item.code} className="grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)] gap-3 px-4 py-3">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            Nozzle / tip code
                          </div>
                          <div className="mt-1 text-lg font-black text-slate-950">
                            {item.code}
                          </div>
                        </div>

                        <div className="grid min-w-0 grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                              Diameter
                            </div>
                            <div className="mt-1 font-semibold text-slate-800">
                              {roundTo(item.diameterMm, 3)} mm
                            </div>
                            <div className="text-xs text-slate-500">
                              {roundTo(item.diameterIn, 4)} in
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                              Flow
                            </div>
                            <div className="mt-1 font-semibold text-slate-800">
                              {roundTo(item.lpmAtReferencePressure, 1)} LPM
                            </div>
                            <div className="text-xs text-slate-500">
                              {roundTo(item.gpmAtReferencePressure, 2)} GPM
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-bold">Nozzle / tip code</th>
                          <th className="px-4 py-3 font-bold">Diameter</th>
                          <th className="px-4 py-3 font-bold">Flow</th>
                          <th className="px-4 py-3 font-bold">Difference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.closestNozzles.map((item) => (
                          <tr key={item.code}>
                            <td className="px-4 py-3 font-black text-slate-950">
                              {item.code}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {roundTo(item.diameterMm, 3)} mm
                              <span className="block text-xs text-slate-500">
                                {roundTo(item.diameterIn, 4)} in
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {roundTo(item.lpmAtReferencePressure, 1)} LPM
                              <span className="block text-xs text-slate-500">
                                {roundTo(item.gpmAtReferencePressure, 2)} GPM
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {roundTo(item.difference, 1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <details className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-black text-slate-950">
                    How this result is calculated
                  </summary>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    <p>
                      The calculator converts the orifice diameter into area, then
                      estimates flow using:
                    </p>
                    <p className="rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-700">
                      Q = Cd × A × √(2 × pressure ÷ water density)
                    </p>
                    <p>
                      The equivalent nozzle / tip code is then calculated as:
                    </p>
                    <p className="rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-700">
                      nozzle / tip code = GPM at reference pressure × 10
                    </p>
                  </div>
                </details>
              </>
            )}
          </div>
        </div>
      </section>

      <BackToTopButton />
    </PressureCalLayout>
  );
}

export {
  flowGpmFromOrificeDiameter,
  nozzleCodeFromDiameter,
  diameterMmFromNozzleCode,
  getClosestNozzleCodes,
};
