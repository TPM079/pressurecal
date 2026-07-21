import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import BackToTopButton from "../components/BackToTopButton";
import PressureCalLayout from "../components/PressureCalLayout";
import { trackEvent } from "../lib/analytics";
import {
  calculateTargetPerformance,
  type PracticalNozzleOption,
  type TargetPerformanceInput,
} from "../lib/targetPerformance";
import type {
  DiameterUnit,
  FlowUnit,
  HoseSetupMode,
  LengthUnit,
  PressureUnit,
} from "../pressurecal";

const PSI_PER_BAR = 14.5037738;
const LPM_PER_GPM = 3.785411784;
const FT_PER_M = 3.280839895;
const MM_PER_IN = 25.4;
const KW_PER_HP = 0.745699872;

const hosePresets = [
  { label: '1/4" (6.35 mm)', mm: 6.35, friendly: '1/4-inch' },
  { label: '5/16" (7.94 mm)', mm: 7.94, friendly: '5/16-inch' },
  { label: '3/8" (9.53 mm)', mm: 9.53, friendly: '3/8-inch' },
  { label: '1/2" (12.70 mm)', mm: 12.7, friendly: '1/2-inch' },
];

const practicalDriveSizes = [
  { hp: 6.5, kw: 4.8 },
  { hp: 9, kw: 6.7 },
  { hp: 13, kw: 9.5 },
  { hp: 15, kw: 11 },
  { hp: 18, kw: 13.4 },
  { hp: 20, kw: 15 },
  { hp: 23, kw: 17 },
  { hp: 25, kw: 18.5 },
  { hp: 27, kw: 20 },
  { hp: 35, kw: 26 },
  { hp: 37, kw: 27.5 },
  { hp: 40, kw: 30 },
];

type FormState = {
  targetPressure: number;
  targetPressureUnit: PressureUnit;
  targetFlow: number;
  targetFlowUnit: FlowUnit;
  hoseSetupMode: HoseSetupMode;
  hoseLength: number;
  hoseLengthUnit: LengthUnit;
  hoseId: number;
  hoseIdUnit: DiameterUnit;
  mainHoseLength: number;
  mainHoseId: number;
  leaderHoseLength: number;
  leaderHoseId: number;
  componentLossAllowancePsi: number;
  pumpPressureHeadroomPercent: number;
  pumpEfficiencyPercent: number;
  driveEfficiencyPercent: number;
};

const defaultState: FormState = {
  targetPressure: 3800,
  targetPressureUnit: "psi",
  targetFlow: 15,
  targetFlowUnit: "lpm",
  hoseSetupMode: "single",
  hoseLength: 15,
  hoseLengthUnit: "m",
  hoseId: 9.53,
  hoseIdUnit: "mm",
  mainHoseLength: 50,
  mainHoseId: 9.53,
  leaderHoseLength: 20,
  leaderHoseId: 6.35,
  componentLossAllowancePsi: 75,
  pumpPressureHeadroomPercent: 5,
  pumpEfficiencyPercent: 85,
  driveEfficiencyPercent: 95,
};

function numberParam(params: URLSearchParams, key: string, fallback: number) {
  const rawValue = params.get(key);

  if (rawValue === null || rawValue.trim() === "") {
    return fallback;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseInitialState(): FormState {
  const params = new URLSearchParams(window.location.search);
  const targetPressureUnit =
    params.get("targetPressureUnit") === "bar" ||
    params.get("pumpPressureUnit") === "bar"
      ? "bar"
      : "psi";
  const targetFlowUnit =
    params.get("targetFlowUnit") === "gpm" ||
    params.get("pumpFlowUnit") === "gpm"
      ? "gpm"
      : "lpm";

  return {
    ...defaultState,
    targetPressure: numberParam(
      params,
      "targetPressure",
      numberParam(params, "pumpPressure", defaultState.targetPressure)
    ),
    targetPressureUnit,
    targetFlow: numberParam(
      params,
      "targetFlow",
      numberParam(params, "pumpFlow", defaultState.targetFlow)
    ),
    targetFlowUnit,
    hoseSetupMode:
      params.get("hoseSetupMode") === "mainLeader" ? "mainLeader" : "single",
    hoseLength: Math.max(
      0,
      numberParam(params, "hoseLength", defaultState.hoseLength)
    ),
    hoseLengthUnit: params.get("hoseLengthUnit") === "ft" ? "ft" : "m",
    hoseId: numberParam(params, "hoseId", defaultState.hoseId),
    hoseIdUnit: params.get("hoseIdUnit") === "in" ? "in" : "mm",
    mainHoseLength: Math.max(
      0,
      numberParam(params, "mainHoseLength", defaultState.mainHoseLength)
    ),
    mainHoseId: numberParam(params, "mainHoseId", defaultState.mainHoseId),
    leaderHoseLength: Math.max(
      0,
      numberParam(params, "leaderHoseLength", defaultState.leaderHoseLength)
    ),
    leaderHoseId: numberParam(params, "leaderHoseId", defaultState.leaderHoseId),
    componentLossAllowancePsi: Math.max(
      0,
      numberParam(
        params,
        "componentLossAllowancePsi",
        defaultState.componentLossAllowancePsi
      )
    ),
    pumpPressureHeadroomPercent: Math.max(
      0,
      numberParam(
        params,
        "pumpPressureHeadroomPercent",
        defaultState.pumpPressureHeadroomPercent
      )
    ),
    pumpEfficiencyPercent: numberParam(
      params,
      "pumpEfficiencyPercent",
      defaultState.pumpEfficiencyPercent
    ),
    driveEfficiencyPercent: numberParam(
      params,
      "driveEfficiencyPercent",
      defaultState.driveEfficiencyPercent
    ),
  };
}

function toPsi(value: number, unit: PressureUnit) {
  return unit === "psi" ? value : value * PSI_PER_BAR;
}

function fromPsi(value: number, unit: PressureUnit) {
  return unit === "psi" ? value : value / PSI_PER_BAR;
}

function toGpm(value: number, unit: FlowUnit) {
  return unit === "gpm" ? value : value / LPM_PER_GPM;
}

function fromGpm(value: number, unit: FlowUnit) {
  return unit === "gpm" ? value : value * LPM_PER_GPM;
}

function toMeters(value: number, unit: LengthUnit) {
  return unit === "m" ? value : value / FT_PER_M;
}

function fromMeters(value: number, unit: LengthUnit) {
  return unit === "m" ? value : value * FT_PER_M;
}

function toMm(value: number, unit: DiameterUnit) {
  return unit === "mm" ? value : value * MM_PER_IN;
}

function fromMm(value: number, unit: DiameterUnit) {
  return unit === "mm" ? value : value / MM_PER_IN;
}

function rounded(value: number, decimals = 1) {
  return Number(value.toFixed(decimals));
}

function formatPressure(psi: number, unit: PressureUnit, decimals = 0) {
  const value = fromPsi(psi, unit);
  return `${value.toFixed(unit === "psi" ? decimals : Math.max(1, decimals))} ${
    unit === "psi" ? "PSI" : "BAR"
  }`;
}

function formatFlow(gpm: number, unit: FlowUnit) {
  const value = fromGpm(gpm, unit);
  const compactValue = Number(value.toFixed(unit === "lpm" ? 1 : 2));
  return `${compactValue} ${unit.toUpperCase()}`;
}

function formatNozzleCode(value: string | number) {
  const rawValue = String(value).trim();
  const numeric = Number(rawValue);

  if (!Number.isFinite(numeric)) {
    return rawValue.padStart(3, "0");
  }

  if (typeof value === "number") {
    const code = value < 20 ? Math.round(value * 10) : Math.round(value);
    return String(code).padStart(3, "0");
  }

  if (/^\d{3}$/.test(rawValue)) {
    return rawValue;
  }

  const code = rawValue.includes(".") || rawValue.length === 1
    ? Math.round(numeric * 10)
    : Math.round(numeric);

  return String(code).padStart(3, "0");
}

function formatDisplayNumber(value: number, decimals = 1) {
  const fixed = value.toFixed(decimals);
  return fixed.replace(/\.0+$/, "");
}

function friendlyHoseDiameter(value: number, unit: DiameterUnit) {
  const valueMm = toMm(value, unit);
  const preset = hosePresets.find((item) => Math.abs(item.mm - valueMm) < 0.03);

  if (preset) return preset.friendly;

  return unit === "mm"
    ? `${formatDisplayNumber(value, 2)} mm ID`
    : `${formatDisplayNumber(value, 3)} in ID`;
}

function buildHoseDescription(state: FormState) {
  const lengthUnitLabel = state.hoseLengthUnit === "m" ? "m" : "ft";

  if (state.hoseSetupMode === "mainLeader") {
    return `${formatDisplayNumber(state.mainHoseLength)} ${lengthUnitLabel} of ${friendlyHoseDiameter(
      state.mainHoseId,
      state.hoseIdUnit
    )} main hose plus ${formatDisplayNumber(
      state.leaderHoseLength
    )} ${lengthUnitLabel} of ${friendlyHoseDiameter(
      state.leaderHoseId,
      state.hoseIdUnit
    )} leader hose`;
  }

  return `${formatDisplayNumber(state.hoseLength)} ${lengthUnitLabel} of ${friendlyHoseDiameter(
    state.hoseId,
    state.hoseIdUnit
  )} hose`;
}

function selectRecommendedDrive(minimumInputHp: number, minimumInputKw: number) {
  const standard = practicalDriveSizes.find(
    (size) => size.hp >= minimumInputHp && size.kw >= minimumInputKw
  );

  if (standard) return standard;

  const hp = Math.ceil(minimumInputHp);
  const kw = Math.max(Math.ceil(minimumInputKw * 2) / 2, rounded(hp * KW_PER_HP, 1));
  return { hp, kw };
}

function nozzleRelationshipLabel(option: PracticalNozzleOption) {
  if (option.relationship === "smaller") return "Closest smaller standard nozzle";
  if (option.relationship === "larger") return "Closest larger standard nozzle";
  return "Closest standard nozzle";
}

const commonMachinePressureRatingsPsi = [
  1000, 1500, 2000, 2500, 3000, 3500, 4000, 4200, 5000, 6000, 7000, 8000,
];

function commonMachineWarning(
  minimumPumpPressurePsi: number,
  practicalPumpPressureRatingPsi: number,
  pressureUnit: PressureUnit
) {
  if (
    !Number.isFinite(minimumPumpPressurePsi) ||
    !Number.isFinite(practicalPumpPressureRatingPsi) ||
    minimumPumpPressurePsi <= 0 ||
    practicalPumpPressureRatingPsi <= 0
  ) {
    return null;
  }

  const maximumSmallMarginPsi = Math.max(100, minimumPumpPressurePsi * 0.03);
  const exactPracticalRatingPsi = commonMachinePressureRatingsPsi.find(
    (ratingPsi) => Math.abs(ratingPsi - practicalPumpPressureRatingPsi) < 1
  );
  const lowerNearbyRatingPsi = [...commonMachinePressureRatingsPsi]
    .reverse()
    .find((ratingPsi) => ratingPsi < practicalPumpPressureRatingPsi);
  const exactPracticalMarginPsi = exactPracticalRatingPsi
    ? exactPracticalRatingPsi - minimumPumpPressurePsi
    : Number.POSITIVE_INFINITY;
  const nearbyRatingPsi =
    exactPracticalRatingPsi &&
    exactPracticalMarginPsi >= 0 &&
    exactPracticalMarginPsi <= maximumSmallMarginPsi
      ? exactPracticalRatingPsi
      : lowerNearbyRatingPsi;

  if (!nearbyRatingPsi) return null;

  const operatingMarginPsi = nearbyRatingPsi - minimumPumpPressurePsi;
  const closeRatingGapPsi = practicalPumpPressureRatingPsi - nearbyRatingPsi;
  const maximumNearbyGapPsi = Math.max(250, practicalPumpPressureRatingPsi * 0.08);
  const maximumSmallShortfallPsi = Math.max(150, minimumPumpPressurePsi * 0.05);

  const isNearbyCommonRating = closeRatingGapPsi <= maximumNearbyGapPsi;
  const hasAlmostNoPositiveMargin =
    operatingMarginPsi >= 0 && operatingMarginPsi <= maximumSmallMarginPsi;
  const hasSmallPressureShortfall =
    operatingMarginPsi < 0 &&
    Math.abs(operatingMarginPsi) <= maximumSmallShortfallPsi;

  if (
    isNearbyCommonRating &&
    (hasAlmostNoPositiveMargin || hasSmallPressureShortfall)
  ) {
    return `A ${formatPressure(
      nearbyRatingPsi,
      pressureUnit
    )} machine leaves almost no margin and may not reliably achieve the target at the gun.`;
  }

  return null;
}

const inputClass =
  "mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const labelClass = "block text-sm font-semibold text-slate-800";
const detailClass =
  "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm open:shadow-md sm:p-6";
const summaryClass =
  "flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-slate-900 marker:hidden";

export default function TargetPerformanceCalculatorPage() {
  const initialState = useMemo(parseInitialState, []);
  const [state, setState] = useState<FormState>(initialState);
  const [allowanceSelection, setAllowanceSelection] = useState<
    "0" | "50" | "75" | "100" | "custom"
  >(() => {
    const initial = initialState.componentLossAllowancePsi;
    return [0, 50, 75, 100].includes(initial)
      ? (String(initial) as "0" | "50" | "75" | "100")
      : "custom";
  });
  const [headroomSelection, setHeadroomSelection] = useState<
    "0" | "5" | "10" | "custom"
  >(() => {
    const initial = initialState.pumpPressureHeadroomPercent;
    return [0, 5, 10].includes(initial)
      ? (String(initial) as "0" | "5" | "10")
      : "custom";
  });
  const [copyMessage, setCopyMessage] = useState("");
  const lastResultSignatureRef = useRef<string | null>(null);

  const calculationInput = useMemo<TargetPerformanceInput>(
    () => ({
      targetPressure: state.targetPressure,
      targetPressureUnit: state.targetPressureUnit,
      targetFlow: state.targetFlow,
      targetFlowUnit: state.targetFlowUnit,
      hoseSetupMode: state.hoseSetupMode,
      singleHose: {
        length: state.hoseLength,
        lengthUnit: state.hoseLengthUnit,
        internalDiameter: state.hoseId,
        diameterUnit: state.hoseIdUnit,
      },
      mainHose: {
        length: state.mainHoseLength,
        lengthUnit: state.hoseLengthUnit,
        internalDiameter: state.mainHoseId,
        diameterUnit: state.hoseIdUnit,
      },
      leaderHose: {
        length: state.leaderHoseLength,
        lengthUnit: state.hoseLengthUnit,
        internalDiameter: state.leaderHoseId,
        diameterUnit: state.hoseIdUnit,
      },
      componentLossAllowancePsi: state.componentLossAllowancePsi,
      pumpPressureHeadroomPercent: state.pumpPressureHeadroomPercent,
      pumpEfficiencyPercent: state.pumpEfficiencyPercent,
      driveEfficiencyPercent: state.driveEfficiencyPercent,
    }),
    [state]
  );

  const calculation = useMemo(
    () => calculateTargetPerformance(calculationInput),
    [calculationInput]
  );
  const result = calculation.result;

  const recommendedDrive = useMemo(
    () =>
      result
        ? selectRecommendedDrive(
            result.estimatedInputPowerHp,
            result.estimatedInputPowerKw
          )
        : null,
    [result]
  );

  const hoseDescription = useMemo(() => buildHoseDescription(state), [state]);
  const suitabilityWarning = result
    ? commonMachineWarning(
        result.minimumPumpOperatingPressurePsi,
        result.practicalPumpPressureRatingPsi,
        state.targetPressureUnit
      )
    : null;

  useEffect(() => {
    trackEvent("target_calculator_viewed", {
      calculator: "target_performance",
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("calculationMode", "target");
    params.set("targetPressure", String(state.targetPressure));
    params.set("targetPressureUnit", state.targetPressureUnit);
    params.set("targetFlow", String(state.targetFlow));
    params.set("targetFlowUnit", state.targetFlowUnit);
    params.set("hoseSetupMode", state.hoseSetupMode);
    params.set("hoseLengthUnit", state.hoseLengthUnit);
    params.set("hoseIdUnit", state.hoseIdUnit);
    params.set("componentLossAllowancePsi", String(state.componentLossAllowancePsi));
    params.set(
      "pumpPressureHeadroomPercent",
      String(state.pumpPressureHeadroomPercent)
    );
    params.set("pumpEfficiencyPercent", String(state.pumpEfficiencyPercent));
    params.set("driveEfficiencyPercent", String(state.driveEfficiencyPercent));

    if (state.hoseSetupMode === "mainLeader") {
      params.set("mainHoseLength", String(state.mainHoseLength));
      params.set("mainHoseId", String(state.mainHoseId));
      params.set("leaderHoseLength", String(state.leaderHoseLength));
      params.set("leaderHoseId", String(state.leaderHoseId));
    } else {
      params.set("hoseLength", String(state.hoseLength));
      params.set("hoseId", String(state.hoseId));
    }

    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`
    );
  }, [state]);

  useEffect(() => {
    if (!result) return;

    const signature = [
      result.targetPressurePsi.toFixed(2),
      result.targetFlowGpm.toFixed(3),
      result.totalHoseLossPsi.toFixed(2),
      result.minimumPumpOperatingPressurePsi.toFixed(2),
      result.idealNozzleSize.toFixed(3),
    ].join("|");

    if (lastResultSignatureRef.current === signature) return;
    lastResultSignatureRef.current = signature;

    trackEvent("target_calculation_completed", {
      calculator: "target_performance",
      hose_setup_mode: state.hoseSetupMode,
      headroom_percent: state.pumpPressureHeadroomPercent,
    });
  }, [result, state.hoseSetupMode, state.pumpPressureHeadroomPercent]);

  function patchState(patch: Partial<FormState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  function updatePressureUnit(nextUnit: PressureUnit) {
    setState((current) => ({
      ...current,
      targetPressure: rounded(
        fromPsi(toPsi(current.targetPressure, current.targetPressureUnit), nextUnit),
        nextUnit === "psi" ? 0 : 1
      ),
      targetPressureUnit: nextUnit,
    }));
  }

  function updateFlowUnit(nextUnit: FlowUnit) {
    setState((current) => ({
      ...current,
      targetFlow: rounded(
        fromGpm(toGpm(current.targetFlow, current.targetFlowUnit), nextUnit),
        nextUnit === "lpm" ? 1 : 2
      ),
      targetFlowUnit: nextUnit,
    }));
  }

  function updateLengthUnit(nextUnit: LengthUnit) {
    setState((current) => ({
      ...current,
      hoseLength: rounded(
        fromMeters(toMeters(current.hoseLength, current.hoseLengthUnit), nextUnit),
        1
      ),
      mainHoseLength: rounded(
        fromMeters(
          toMeters(current.mainHoseLength, current.hoseLengthUnit),
          nextUnit
        ),
        1
      ),
      leaderHoseLength: rounded(
        fromMeters(
          toMeters(current.leaderHoseLength, current.hoseLengthUnit),
          nextUnit
        ),
        1
      ),
      hoseLengthUnit: nextUnit,
    }));
  }

  function updateDiameterUnit(nextUnit: DiameterUnit) {
    setState((current) => ({
      ...current,
      hoseId: rounded(
        fromMm(toMm(current.hoseId, current.hoseIdUnit), nextUnit),
        nextUnit === "mm" ? 2 : 3
      ),
      mainHoseId: rounded(
        fromMm(toMm(current.mainHoseId, current.hoseIdUnit), nextUnit),
        nextUnit === "mm" ? 2 : 3
      ),
      leaderHoseId: rounded(
        fromMm(toMm(current.leaderHoseId, current.hoseIdUnit), nextUnit),
        nextUnit === "mm" ? 2 : 3
      ),
      hoseIdUnit: nextUnit,
    }));
  }

  function setHosePreset(
    key: "hoseId" | "mainHoseId" | "leaderHoseId",
    mm: number
  ) {
    setState((current) => ({
      ...current,
      [key]: rounded(
        fromMm(mm, current.hoseIdUnit),
        current.hoseIdUnit === "mm" ? 2 : 3
      ),
    }));
  }

  async function copyResultLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyMessage("Setup link copied");
      window.setTimeout(() => setCopyMessage(""), 2000);
      trackEvent("target_setup_shared", {
        calculator: "target_performance",
        method: "copy_link",
      });
    } catch {
      window.prompt("Copy this link:", window.location.href);
    }
  }

  return (
    <>
      <Helmet>
        <title>Target Pressure Washer Performance Calculator | PressureCal</title>
        <meta
          name="description"
          content="Enter the pressure and flow you need at the gun. Calculate the pump pressure, nozzle size, hose pressure loss and power required for your pressure washer setup."
        />
        <link
          rel="canonical"
          href="https://www.pressurecal.com/target-performance-calculator"
        />
      </Helmet>

      <PressureCalLayout>
        <section className="-mx-4 bg-slate-100 px-4 pb-10 pt-6 sm:pt-10">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Design for a target
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Target Performance Calculator
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Enter the pressure and flow required at the gun, then add the hose setup.
                PressureCal will show the pump, nozzle / tip code and drive power required.
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)] lg:items-start">
              <div className="space-y-5">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Target performance
                  </h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className={labelClass}>
                      Target working pressure at the gun
                      <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          inputMode="decimal"
                          value={state.targetPressure}
                          onChange={(event) =>
                            patchState({ targetPressure: Number(event.target.value) })
                          }
                        />
                        <select
                          className={inputClass}
                          aria-label="Target pressure unit"
                          value={state.targetPressureUnit}
                          onChange={(event) =>
                            updatePressureUnit(event.target.value as PressureUnit)
                          }
                        >
                          <option value="psi">PSI</option>
                          <option value="bar">BAR</option>
                        </select>
                      </div>
                    </label>

                    <label className={labelClass}>
                      Target flow at the gun
                      <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          step="0.1"
                          inputMode="decimal"
                          value={state.targetFlow}
                          onChange={(event) =>
                            patchState({ targetFlow: Number(event.target.value) })
                          }
                        />
                        <select
                          className={inputClass}
                          aria-label="Target flow unit"
                          value={state.targetFlowUnit}
                          onChange={(event) =>
                            updateFlowUnit(event.target.value as FlowUnit)
                          }
                        >
                          <option value="lpm">LPM</option>
                          <option value="gpm">GPM</option>
                        </select>
                      </div>
                    </label>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-xl font-semibold text-slate-900">Hose setup</h2>
                  <div
                    className="mt-5 grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-1"
                    role="radiogroup"
                    aria-label="Hose setup"
                  >
                    {([
                      ["single", "Single hose"],
                      ["mainLeader", "Main + Leader Hose"],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={state.hoseSetupMode === value}
                        onClick={() => patchState({ hoseSetupMode: value })}
                        className={`min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          state.hoseSetupMode === value
                            ? "bg-white text-slate-950 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className={labelClass}>
                      Hose length unit
                      <select
                        className={inputClass}
                        value={state.hoseLengthUnit}
                        onChange={(event) =>
                          updateLengthUnit(event.target.value as LengthUnit)
                        }
                      >
                        <option value="m">Metres</option>
                        <option value="ft">Feet</option>
                      </select>
                    </label>
                    <label className={labelClass}>
                      Hose diameter unit
                      <select
                        className={inputClass}
                        value={state.hoseIdUnit}
                        onChange={(event) =>
                          updateDiameterUnit(event.target.value as DiameterUnit)
                        }
                      >
                        <option value="mm">Millimetres</option>
                        <option value="in">Inches</option>
                      </select>
                    </label>
                  </div>

                  {state.hoseSetupMode === "single" ? (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <label className={labelClass}>
                        Hose length
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          step="0.1"
                          value={state.hoseLength}
                          onChange={(event) =>
                            patchState({ hoseLength: Number(event.target.value) })
                          }
                        />
                      </label>
                      <label className={labelClass}>
                        Hose internal diameter
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          step="0.01"
                          value={state.hoseId}
                          onChange={(event) =>
                            patchState({ hoseId: Number(event.target.value) })
                          }
                        />
                        <select
                          className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                          value=""
                          aria-label="Choose a common hose internal diameter"
                          onChange={(event) => {
                            if (event.target.value) {
                              setHosePreset("hoseId", Number(event.target.value));
                            }
                          }}
                        >
                          <option value="">Choose common size</option>
                          {hosePresets.map((preset) => (
                            <option key={preset.mm} value={preset.mm}>
                              {preset.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-5">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="font-semibold text-slate-900">Main hose</h3>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                          <label className={labelClass}>
                            Length
                            <input
                              className={inputClass}
                              type="number"
                              min="0"
                              step="0.1"
                              value={state.mainHoseLength}
                              onChange={(event) =>
                                patchState({
                                  mainHoseLength: Number(event.target.value),
                                })
                              }
                            />
                          </label>
                          <label className={labelClass}>
                            Internal diameter
                            <input
                              className={inputClass}
                              type="number"
                              min="0"
                              step="0.01"
                              value={state.mainHoseId}
                              onChange={(event) =>
                                patchState({ mainHoseId: Number(event.target.value) })
                              }
                            />
                            <select
                              className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                              value=""
                              aria-label="Choose a common main hose internal diameter"
                              onChange={(event) => {
                                if (event.target.value) {
                                  setHosePreset(
                                    "mainHoseId",
                                    Number(event.target.value)
                                  );
                                }
                              }}
                            >
                              <option value="">Choose common size</option>
                              {hosePresets.map((preset) => (
                                <option key={preset.mm} value={preset.mm}>
                                  {preset.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="font-semibold text-slate-900">
                          Leader hose / whip hose
                        </h3>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                          <label className={labelClass}>
                            Length
                            <input
                              className={inputClass}
                              type="number"
                              min="0"
                              step="0.1"
                              value={state.leaderHoseLength}
                              onChange={(event) =>
                                patchState({
                                  leaderHoseLength: Number(event.target.value),
                                })
                              }
                            />
                          </label>
                          <label className={labelClass}>
                            Internal diameter
                            <input
                              className={inputClass}
                              type="number"
                              min="0"
                              step="0.01"
                              value={state.leaderHoseId}
                              onChange={(event) =>
                                patchState({
                                  leaderHoseId: Number(event.target.value),
                                })
                              }
                            />
                            <select
                              className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                              value=""
                              aria-label="Choose a common leader hose internal diameter"
                              onChange={(event) => {
                                if (event.target.value) {
                                  setHosePreset(
                                    "leaderHoseId",
                                    Number(event.target.value)
                                  );
                                }
                              }}
                            >
                              <option value="">Choose common size</option>
                              {hosePresets.map((preset) => (
                                <option key={preset.mm} value={preset.mm}>
                                  {preset.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                <details className={detailClass}>
                  <summary className={summaryClass}>
                    <span>Advanced settings</span>
                    <span aria-hidden="true" className="text-slate-400">
                      +
                    </span>
                  </summary>

                  <div className="mt-5 space-y-5 border-t border-slate-200 pt-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className={labelClass}>
                        Component allowance
                        <select
                          className={inputClass}
                          value={allowanceSelection}
                          onChange={(event) => {
                            const next = event.target.value as
                              | "0"
                              | "50"
                              | "75"
                              | "100"
                              | "custom";
                            setAllowanceSelection(next);
                            if (next !== "custom") {
                              patchState({
                                componentLossAllowancePsi: Number(next),
                              });
                            }
                          }}
                        >
                          {[0, 50, 75, 100].map((psi) => (
                            <option key={psi} value={psi}>
                              {formatPressure(psi, state.targetPressureUnit, 0)}
                            </option>
                          ))}
                          <option value="custom">Custom</option>
                        </select>
                        {allowanceSelection === "custom" ? (
                          <input
                            className={inputClass}
                            type="number"
                            min="0"
                            step="0.1"
                            aria-label="Custom component allowance"
                            value={rounded(
                              fromPsi(
                                state.componentLossAllowancePsi,
                                state.targetPressureUnit
                              ),
                              1
                            )}
                            onChange={(event) =>
                              patchState({
                                componentLossAllowancePsi: Math.max(
                                  0,
                                  toPsi(
                                    Number(event.target.value),
                                    state.targetPressureUnit
                                  )
                                ),
                              })
                            }
                          />
                        ) : null}
                        <span className="mt-2 block text-xs leading-5 text-slate-500">
                          Estimated loss through the gun, lance, couplings, swivel and
                          other components.
                        </span>
                      </label>

                      <label className={labelClass}>
                        Pressure safety margin
                        <select
                          className={inputClass}
                          value={headroomSelection}
                          onChange={(event) => {
                            const next = event.target.value as
                              | "0"
                              | "5"
                              | "10"
                              | "custom";
                            setHeadroomSelection(next);
                            if (next !== "custom") {
                              patchState({
                                pumpPressureHeadroomPercent: Number(next),
                              });
                            }
                          }}
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="10">10%</option>
                          <option value="custom">Custom</option>
                        </select>
                        {headroomSelection === "custom" ? (
                          <input
                            className={inputClass}
                            type="number"
                            min="0"
                            step="0.1"
                            aria-label="Custom pressure safety margin"
                            value={state.pumpPressureHeadroomPercent}
                            onChange={(event) =>
                              patchState({
                                pumpPressureHeadroomPercent: Number(
                                  event.target.value
                                ),
                              })
                            }
                          />
                        ) : null}
                        <span className="mt-2 block text-xs leading-5 text-slate-500">
                          Adds capacity to the recommended pump rating without changing
                          the target at the gun.
                        </span>
                      </label>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Power calculation assumptions
                      </h3>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className={labelClass}>
                          Pump efficiency (%)
                          <input
                            className={inputClass}
                            type="number"
                            min="0.1"
                            max="100"
                            step="0.1"
                            value={state.pumpEfficiencyPercent}
                            onChange={(event) =>
                              patchState({
                                pumpEfficiencyPercent: Number(event.target.value),
                              })
                            }
                          />
                        </label>
                        <label className={labelClass}>
                          Drive efficiency (%)
                          <input
                            className={inputClass}
                            type="number"
                            min="0.1"
                            max="100"
                            step="0.1"
                            value={state.driveEfficiencyPercent}
                            onChange={(event) =>
                              patchState({
                                driveEfficiencyPercent: Number(event.target.value),
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </details>
              </div>

              <aside className="space-y-5 lg:sticky lg:top-24">
                {calculation.errors.length > 0 ? (
                  <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-900 shadow-sm">
                    <h2 className="font-semibold">Check these inputs</h2>
                    <ul className="mt-3 space-y-2 text-sm">
                      {calculation.errors.map((error) => (
                        <li key={error}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {result && recommendedDrive ? (
                  <>
                    <section className="rounded-3xl border-2 border-blue-300 bg-white p-5 shadow-md sm:p-6">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                        Recommended setup
                      </div>

                      <div className="mt-5 space-y-4">
                        <div className="rounded-2xl bg-slate-950 p-5 text-white">
                          <div className="text-sm font-medium text-slate-300">
                            Recommended machine / pump
                          </div>
                          <div className="mt-2 text-[1.65rem] font-semibold leading-[1.08] tracking-tight text-white sm:flex sm:flex-nowrap sm:items-baseline sm:gap-x-2 sm:text-[1.55rem] md:text-[1.85rem] xl:text-[2rem]">
                            <span className="block whitespace-nowrap">
                              {formatPressure(
                                result.practicalPumpPressureRatingPsi,
                                state.targetPressureUnit
                              )}{" "}
                              @ {formatFlow(result.requiredPumpFlowGpm, state.targetFlowUnit)}
                            </span>
                            <span className="mt-1 block whitespace-nowrap text-blue-300 sm:mt-0">
                              minimum
                            </span>
                          </div>
                        </div>

                        <div className="grid auto-rows-fr items-stretch gap-3 sm:grid-cols-2">
                          <div className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:min-h-[10.75rem]">
                            <div className="min-h-[2.75rem] text-[13px] font-medium leading-5 text-slate-600 sm:text-sm">
                              Recommended nozzle / tip code
                            </div>
                            <div className="mt-2 text-[2.75rem] font-semibold leading-none tracking-tight text-slate-950 sm:text-5xl">
                              {formatNozzleCode(
                                result.closestPracticalNozzle.nozzleCode
                              )}
                            </div>
                          </div>

                          <div className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:min-h-[10.75rem]">
                            <div className="min-h-[2.75rem] text-[13px] font-medium leading-5 text-slate-600 sm:text-sm">
                              Recommended engine / motor size
                            </div>
                            <div className="mt-2 whitespace-nowrap text-xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-[1.4rem]">
                              {formatDisplayNumber(recommendedDrive.hp)} HP ·{" "}
                              {formatDisplayNumber(recommendedDrive.kw)} kW
                            </div>
                            <div className="mt-auto pt-3 text-sm leading-6 text-slate-500">
                              Calculated minimum input:{" "}
                              <span className="whitespace-nowrap">
                                {result.estimatedInputPowerHp.toFixed(1)} HP ·{" "}
                                {result.estimatedInputPowerKw.toFixed(1)} kW
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-200 pt-5">
                        <p className="text-sm leading-6 text-slate-700">
                          For approximately{" "}
                          {formatPressure(
                            result.targetPressurePsi,
                            state.targetPressureUnit
                          )}{" "}
                          at {formatFlow(result.targetFlowGpm, state.targetFlowUnit)} at
                          the gun, use a machine rated for at least{" "}
                          {formatPressure(
                            result.practicalPumpPressureRatingPsi,
                            state.targetPressureUnit
                          )}{" "}
                          at {formatFlow(result.requiredPumpFlowGpm, state.targetFlowUnit)},
                          nozzle / tip code{" "}
                          {formatNozzleCode(
                            result.closestPracticalNozzle.nozzleCode
                          )}, and a minimum {formatDisplayNumber(recommendedDrive.hp)} HP /{" "}
                          {formatDisplayNumber(recommendedDrive.kw)} kW engine or motor.
                        </p>
                        <p className="mt-2 text-[13px] leading-5 text-slate-500">
                          Based on {hoseDescription} and the selected allowances.
                        </p>
                        <p className="mt-3 text-xs leading-5 text-slate-500">
                          Actual engine or motor selection should allow for manufacturer
                          requirements, operating conditions and service factor.
                        </p>
                      </div>
                    </section>

                    {suitabilityWarning ? (
                      <section className="rounded-3xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm">
                        <h2 className="font-semibold">Important suitability warning</h2>
                        <p className="mt-2 text-sm leading-6">{suitabilityWarning}</p>
                      </section>
                    ) : null}

                    <button
                      type="button"
                      onClick={copyResultLink}
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                    >
                      {copyMessage || "Copy setup link"}
                    </button>

                    <details className={detailClass}>
                      <summary className={summaryClass}>
                        <span>Compare nearby nozzle sizes</span>
                        <span aria-hidden="true" className="text-slate-400">
                          +
                        </span>
                      </summary>

                      <div className="mt-5 space-y-3 border-t border-slate-200 pt-5">
                        {result.practicalNozzleOptions
                          .filter((option) => option.relationship !== "closest")
                          .map((option) => (
                            <div
                              key={`${option.relationship}-${option.nozzleSize}`}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    {nozzleRelationshipLabel(option)}
                                  </div>
                                  <div className="mt-1 text-lg font-semibold text-slate-900">
                                    Nozzle / tip code {formatNozzleCode(option.nozzleCode)}
                                  </div>
                                </div>
                                {option.exceedsPracticalPumpRating ? (
                                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                                    Check pump rating
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-3 text-sm font-medium text-slate-700">
                                Pressure required to pass{" "}
                                {formatFlow(result.targetFlowGpm, state.targetFlowUnit)}:{" "}
                                {formatPressure(
                                  option.estimatedGunPressurePsi,
                                  state.targetPressureUnit
                                )}
                              </div>
                            </div>
                          ))}

                        <p className="text-xs leading-5 text-slate-500">
                          A smaller nozzle requires more pressure to pass the same flow. A
                          larger nozzle requires less pressure. Never operate a pump above
                          its manufacturer-rated pressure.
                        </p>
                      </div>
                    </details>

                    <details className={detailClass}>
                      <summary className={summaryClass}>
                        <span>How this was calculated</span>
                        <span aria-hidden="true" className="text-slate-400">
                          +
                        </span>
                      </summary>

                      <dl className="mt-5 space-y-3 border-t border-slate-200 pt-5 text-sm">
                        <div className="flex flex-wrap justify-between gap-3">
                          <dt className="text-slate-600">
                            Target working pressure at the gun
                          </dt>
                          <dd className="font-semibold text-slate-900">
                            {formatPressure(
                              result.targetPressurePsi,
                              state.targetPressureUnit
                            )}
                          </dd>
                        </div>
                        {state.hoseSetupMode === "mainLeader" ? (
                          <>
                            <div className="flex flex-wrap justify-between gap-3">
                              <dt className="text-slate-600">
                                Main hose pressure loss
                              </dt>
                              <dd className="font-semibold text-slate-900">
                                {formatPressure(
                                  result.mainHoseLossPsi,
                                  state.targetPressureUnit
                                )}
                              </dd>
                            </div>
                            <div className="flex flex-wrap justify-between gap-3">
                              <dt className="text-slate-600">
                                Leader hose pressure loss
                              </dt>
                              <dd className="font-semibold text-slate-900">
                                {formatPressure(
                                  result.leaderHoseLossPsi,
                                  state.targetPressureUnit
                                )}
                              </dd>
                            </div>
                          </>
                        ) : null}
                        <div className="flex flex-wrap justify-between gap-3">
                          <dt className="text-slate-600">Hose pressure loss</dt>
                          <dd className="font-semibold text-slate-900">
                            {formatPressure(
                              result.totalHoseLossPsi,
                              state.targetPressureUnit
                            )}
                          </dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-3">
                          <dt className="text-slate-600">Component allowance</dt>
                          <dd className="font-semibold text-slate-900">
                            {formatPressure(
                              result.componentLossAllowancePsi,
                              state.targetPressureUnit
                            )}
                          </dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-3">
                          <dt className="font-semibold text-slate-700">
                            Total pressure above target
                          </dt>
                          <dd className="font-semibold text-slate-950">
                            {formatPressure(
                              result.totalPressureAboveTargetPsi,
                              state.targetPressureUnit
                            )}
                          </dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-3">
                          <dt className="text-slate-600">
                            Minimum pump operating pressure
                          </dt>
                          <dd className="font-semibold text-slate-900">
                            {formatPressure(
                              result.minimumPumpOperatingPressurePsi,
                              state.targetPressureUnit
                            )}
                          </dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-3">
                          <dt className="text-slate-600">Pressure safety margin</dt>
                          <dd className="font-semibold text-slate-900">
                            {formatDisplayNumber(
                              state.pumpPressureHeadroomPercent
                            )}%
                          </dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-3">
                          <dt className="text-slate-600">
                            Exact recommended pump pressure
                          </dt>
                          <dd className="font-semibold text-slate-900">
                            {formatPressure(
                              result.recommendedPumpPressureRatingPsi,
                              state.targetPressureUnit
                            )}
                          </dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-3">
                          <dt className="text-slate-600">
                            Ideal calculated nozzle size
                          </dt>
                          <dd className="font-semibold text-slate-900">
                            #{result.idealNozzleSize.toFixed(2)}
                          </dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-3">
                          <dt className="text-slate-600">Hydraulic power</dt>
                          <dd className="font-semibold text-slate-900">
                            {result.hydraulicPowerKw.toFixed(1)} kW
                          </dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-3">
                          <dt className="text-slate-600">
                            Calculated minimum input power
                          </dt>
                          <dd className="text-right font-semibold text-slate-900">
                            {result.estimatedInputPowerHp.toFixed(1)} HP ·{" "}
                            {result.estimatedInputPowerKw.toFixed(1)} kW
                          </dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-3">
                          <dt className="text-slate-600">Pump efficiency</dt>
                          <dd className="font-semibold text-slate-900">
                            {formatDisplayNumber(state.pumpEfficiencyPercent)}%
                          </dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-3">
                          <dt className="text-slate-600">Drive efficiency</dt>
                          <dd className="font-semibold text-slate-900">
                            {formatDisplayNumber(state.driveEfficiencyPercent)}%
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
                        <p>
                          <strong className="text-slate-800">Hydraulic power</strong> is
                          the power delivered to the water by the pump.
                        </p>
                        <p>
                          <strong className="text-slate-800">
                            Calculated minimum input power
                          </strong>{" "}
                          allows for the selected pump and drive efficiency losses.
                        </p>
                        <p>
                          <strong className="text-slate-800">
                            Recommended engine / motor size
                          </strong>{" "}
                          rounds up to a practical engine or motor requirement and never
                          rounds below the calculated minimum input.
                        </p>
                      </div>
                    </details>

                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                      <h2 className="font-semibold text-slate-900">Guidance</h2>
                      <ul className="mt-4 space-y-3 text-[15px] leading-7 text-slate-600">
                        {result.warnings.map((warning) => (
                          <li key={warning}>• {warning}</li>
                        ))}
                        <li>
                          • Do not operate a pump above its manufacturer-rated pressure.
                        </li>
                        <li>• Component pressure loss is an estimate.</li>
                        <li>
                          • Verify the completed setup with a suitable pressure gauge while
                          the trigger is open and water is flowing.
                        </li>
                      </ul>
                    </section>
                  </>
                ) : null}
              </aside>
            </div>
          </div>
        </section>
        <BackToTopButton />
      </PressureCalLayout>
    </>
  );
}
