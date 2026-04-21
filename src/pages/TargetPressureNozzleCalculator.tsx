import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type PressureUnit = "psi" | "bar";
type FlowUnit = "gpm" | "lpm";
type LengthUnit = "m" | "ft";
type HoseIdUnit = "mm" | "in";
type TargetReference = "pump" | "gun";
type Mode = "quick" | "realWorld";
type MessageType = "error" | "warning" | "info";

interface TargetPressureNozzleInput {
  pumpFlow: number;
  pumpFlowUnit: FlowUnit;
  ratedPressure: number;
  ratedPressureUnit: PressureUnit;
  targetPressure: number;
  targetPressureUnit: PressureUnit;
  nozzleCount: number;
  hoseLength?: number;
  hoseLengthUnit?: LengthUnit;
  hoseInnerDiameter?: number;
  hoseInnerDiameterUnit?: HoseIdUnit;
  extraLossPsi?: number;
  targetReference: TargetReference;
}

interface NearbyOption {
  tipCode: string;
  nozzleSize: number;
  estimatedPressurePsi: number;
  deltaFromTargetPsi: number;
}

interface CalcMessage {
  type: MessageType;
  message: string;
}

interface CalculationResult {
  recommendedTipCode: string;
  exactNozzleSize: number;
  recommendedNozzleSize: number;
  flowPerNozzleLpm: number;
  totalFlowLpm: number;
  ratedPressurePsi: number;
  ratedPressureBar: number;
  targetPressurePsi: number;
  targetPressureBar: number;
  isAchievable: boolean;
  nearbyOptions: NearbyOption[];
  hoseLossPsi: number;
  requiredPumpPressurePsi: number;
  requiredPumpPressureBar: number;
  maxAchievableGunPressurePsi: number;
  maxAchievableGunPressureBar: number;
  messages: CalcMessage[];
}

interface FormState {
  pumpFlow: number;
  pumpFlowUnit: FlowUnit;
  ratedPressure: number;
  ratedPressureUnit: PressureUnit;
  targetPressure: number;
  targetPressureUnit: PressureUnit;
  nozzleCount: number;
  hoseLength: number;
  hoseLengthUnit: LengthUnit;
  hoseInnerDiameter: number;
  hoseInnerDiameterUnit: HoseIdUnit;
  extraLossPsi: number;
  targetReference: TargetReference;
}

const PSI_PER_BAR = 14.5037738;
const LPM_PER_GPM = 3.785411784;
const FT_PER_M = 3.280839895;
const MM_PER_IN = 25.4;

const DEFAULT_FORM: FormState = {
  pumpFlow: 15,
  pumpFlowUnit: "lpm",
  ratedPressure: 4000,
  ratedPressureUnit: "psi",
  targetPressure: 3000,
  targetPressureUnit: "psi",
  nozzleCount: 1,
  hoseLength: 30,
  hoseLengthUnit: "m",
  hoseInnerDiameter: 9.53,
  hoseInnerDiameterUnit: "mm",
  extraLossPsi: 0,
  targetReference: "pump",
};

const hosePresets = [
  { label: '6.35 mm (1/4")', value: 6.35 },
  { label: '7.94 mm (5/16")', value: 7.94 },
  { label: '9.53 mm (3/8")', value: 9.53 },
  { label: '12.70 mm (1/2")', value: 12.7 },
];

function formatNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(decimals);
}

function toPsi(value: number, unit: PressureUnit): number {
  return unit === "psi" ? value : value * PSI_PER_BAR;
}

function toGpm(value: number, unit: FlowUnit): number {
  return unit === "gpm" ? value : value / LPM_PER_GPM;
}

function toMetres(value: number, unit: LengthUnit): number {
  return unit === "m" ? value : value / FT_PER_M;
}

function toMm(value: number, unit: HoseIdUnit): number {
  return unit === "mm" ? value : value * MM_PER_IN;
}

function hoseLossEstimatePsi(flowGpm: number, lengthM: number, hoseIdMm: number): number {
  const rho = 1000;
  const mu = 0.001;
  const roughnessM = 0.0000015;

  if (!(flowGpm > 0) || !(lengthM > 0) || !(hoseIdMm > 0)) return 0;

  const q = (flowGpm * 0.003785411784) / 60;
  const d = hoseIdMm / 1000;
  const area = (Math.PI * d * d) / 4;
  const velocity = q / area;
  const re = (rho * velocity * d) / mu;
  if (!(re > 0)) return 0;

  const relRoughness = roughnessM / d;
  let frictionFactor = 0;

  if (re < 2300) {
    frictionFactor = 64 / re;
  } else {
    const a = relRoughness / 3.7;
    const b = 5.74 / Math.pow(re, 0.9);
    frictionFactor = 0.25 / Math.pow(Math.log10(a + b), 2);
  }

  const dpPa =
    frictionFactor * (lengthM / d) * ((rho * velocity * velocity) / 2);

  return Math.max(dpPa / 6894.757293168, 0);
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function tipCodeFromNozzleSize(nozzleSize: number): string {
  return String(Math.round(nozzleSize * 10)).padStart(3, "0");
}

function estimatedPressurePsi(flowPerNozzleGpm: number, nozzleSize: number): number {
  if (!(flowPerNozzleGpm > 0) || !(nozzleSize > 0)) return 0;
  return 4000 * Math.pow(flowPerNozzleGpm / nozzleSize, 2);
}

function calculateTargetPressureNozzle(input: TargetPressureNozzleInput): CalculationResult {
  const messages: CalcMessage[] = [];

  const totalFlowGpm = toGpm(input.pumpFlow, input.pumpFlowUnit);
  const totalFlowLpm = totalFlowGpm * LPM_PER_GPM;
  const ratedPressurePsi = toPsi(input.ratedPressure, input.ratedPressureUnit);
  const targetPressurePsi = toPsi(input.targetPressure, input.targetPressureUnit);
  const nozzleCount = Math.max(1, Math.round(input.nozzleCount || 1));
  const flowPerNozzleGpm = totalFlowGpm / nozzleCount;
  const flowPerNozzleLpm = totalFlowLpm / nozzleCount;

  const hoseLossPsi =
    input.hoseLength && input.hoseInnerDiameter
      ? hoseLossEstimatePsi(
          totalFlowGpm,
          toMetres(input.hoseLength, input.hoseLengthUnit ?? "m"),
          toMm(input.hoseInnerDiameter, input.hoseInnerDiameterUnit ?? "mm")
        )
      : 0;

  const extraLossPsi = Math.max(0, input.extraLossPsi ?? 0);

  let effectiveTargetPressurePsi = targetPressurePsi;
  let requiredPumpPressurePsi = targetPressurePsi;

  if (input.targetReference === "gun") {
    requiredPumpPressurePsi = targetPressurePsi + hoseLossPsi + extraLossPsi;
    effectiveTargetPressurePsi = targetPressurePsi;
  } else {
    requiredPumpPressurePsi = targetPressurePsi;
  }

  const exactNozzleSize =
    effectiveTargetPressurePsi > 0
      ? flowPerNozzleGpm * Math.sqrt(4000 / effectiveTargetPressurePsi)
      : 0;

  const recommendedNozzleSize = roundToHalf(exactNozzleSize);
  const recommendedTipCode = tipCodeFromNozzleSize(recommendedNozzleSize);

  const nearbySteps = [-0.5, 0, 0.5];
  const nearbyOptions: NearbyOption[] = nearbySteps
    .map((step) => Math.max(0.5, recommendedNozzleSize + step))
    .map((nozzleSize) => {
      const pumpPressure = estimatedPressurePsi(flowPerNozzleGpm, nozzleSize);
      const atGunPressure = Math.max(pumpPressure - hoseLossPsi - extraLossPsi, 0);
      const comparePressure =
        input.targetReference === "gun" ? atGunPressure : pumpPressure;

      return {
        tipCode: tipCodeFromNozzleSize(nozzleSize),
        nozzleSize,
        estimatedPressurePsi: comparePressure,
        deltaFromTargetPsi: comparePressure - targetPressurePsi,
      };
    });

  const maxAchievableGunPressurePsi = Math.max(
    ratedPressurePsi - hoseLossPsi - extraLossPsi,
    0
  );

  const isAchievable =
    input.targetReference === "gun"
      ? requiredPumpPressurePsi <= ratedPressurePsi
      : targetPressurePsi <= ratedPressurePsi;

  if (!(input.pumpFlow > 0)) {
    messages.push({
      type: "error",
      message: "Pump flow must be greater than zero.",
    });
  }

  if (!(input.targetPressure > 0)) {
    messages.push({
      type: "error",
      message: "Target pressure must be greater than zero.",
    });
  }

  if (targetPressurePsi >= ratedPressurePsi) {
    messages.push({
      type: "warning",
      message:
        "Your target pressure is at or above rated pump pressure. Double-check whether that target is realistic for the setup.",
    });
  }

  if (input.targetReference === "gun" && hoseLossPsi > 0) {
    messages.push({
      type: "info",
      message: `Estimated hose loss is ${formatNumber(
        hoseLossPsi,
        0
      )} PSI before any extra fixed losses.`,
    });
  }

  if (!isAchievable) {
    messages.push({
      type: "warning",
      message:
        input.targetReference === "gun"
          ? "Rated pump pressure may not be enough to achieve that target at the gun once hose loss is included."
          : "Rated pump pressure may not be enough to achieve that target at the pump.",
    });
  }

  if (nozzleCount > 1) {
    messages.push({
      type: "info",
      message: `PressureCal is calculating on a per-nozzle basis using ${formatNumber(
        flowPerNozzleLpm,
        1
      )} LPM per nozzle.`,
    });
  }

  return {
    recommendedTipCode,
    exactNozzleSize,
    recommendedNozzleSize,
    flowPerNozzleLpm,
    totalFlowLpm,
    ratedPressurePsi,
    ratedPressureBar: ratedPressurePsi / PSI_PER_BAR,
    targetPressurePsi,
    targetPressureBar: targetPressurePsi / PSI_PER_BAR,
    isAchievable,
    nearbyOptions,
    hoseLossPsi,
    requiredPumpPressurePsi,
    requiredPumpPressureBar: requiredPumpPressurePsi / PSI_PER_BAR,
    maxAchievableGunPressurePsi,
    maxAchievableGunPressureBar: maxAchievableGunPressurePsi / PSI_PER_BAR,
    messages,
  };
}

export default function TargetPressureNozzleCalculator() {
  const [mode, setMode] = useState<Mode>("quick");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("mode");
    if (q === "realWorld") setMode("realWorld");
  }, []);

  const input: TargetPressureNozzleInput = useMemo(
    () => ({
      pumpFlow: form.pumpFlow,
      pumpFlowUnit: form.pumpFlowUnit,
      ratedPressure: form.ratedPressure,
      ratedPressureUnit: form.ratedPressureUnit,
      targetPressure: form.targetPressure,
      targetPressureUnit: form.targetPressureUnit,
      nozzleCount: form.nozzleCount,
      targetReference: mode === "realWorld" ? form.targetReference : "pump",
      hoseLength: mode === "realWorld" ? form.hoseLength : undefined,
      hoseLengthUnit: mode === "realWorld" ? form.hoseLengthUnit : undefined,
      hoseInnerDiameter: mode === "realWorld" ? form.hoseInnerDiameter : undefined,
      hoseInnerDiameterUnit:
        mode === "realWorld" ? form.hoseInnerDiameterUnit : undefined,
      extraLossPsi: mode === "realWorld" ? form.extraLossPsi : undefined,
    }),
    [form, mode]
  );

  const result = useMemo(() => calculateTargetPressureNozzle(input), [input]);
  const hasErrors = result.messages.some((message: CalcMessage) => message.type === "error");

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              Target Pressure Nozzle
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Target Pressure Nozzle Calculator
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Work backwards from the pressure you want to run and find the nozzle
              size that best matches your setup.
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              PressureCal keeps PSI and LPM first. Smaller nozzle means higher
              pressure. Larger nozzle means lower pressure.
            </p>
          </div>

          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
            <ModeButton active={mode === "quick"} onClick={() => setMode("quick")}>
              Quick
            </ModeButton>
            <ModeButton
              active={mode === "realWorld"}
              onClick={() => setMode("realWorld")}
            >
              Real-world
            </ModeButton>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Inputs</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {mode === "quick"
                  ? "Use Quick mode for fast pump-pressure nozzle matching."
                  : "Use Real-world mode to check whether your target is still achievable once hose loss is included."}
              </p>
            </div>

            <div className="space-y-5">
              <NumberField
                label="Pump flow"
                value={form.pumpFlow}
                onChange={(value) => updateField(setForm, "pumpFlow", value)}
                unit={form.pumpFlowUnit}
                unitOptions={[
                  { label: "LPM", value: "lpm" },
                  { label: "GPM", value: "gpm" },
                ]}
                onUnitChange={(value) =>
                  updateField(setForm, "pumpFlowUnit", value as FlowUnit)
                }
              />

              <NumberField
                label="Rated pump pressure"
                value={form.ratedPressure}
                onChange={(value) => updateField(setForm, "ratedPressure", value)}
                unit={form.ratedPressureUnit}
                unitOptions={[
                  { label: "PSI", value: "psi" },
                  { label: "BAR", value: "bar" },
                ]}
                onUnitChange={(value) =>
                  updateField(setForm, "ratedPressureUnit", value as PressureUnit)
                }
              />

              <NumberField
                label={
                  mode === "realWorld" && form.targetReference === "gun"
                    ? "Target at-gun pressure"
                    : "Target pressure"
                }
                value={form.targetPressure}
                onChange={(value) => updateField(setForm, "targetPressure", value)}
                unit={form.targetPressureUnit}
                unitOptions={[
                  { label: "PSI", value: "psi" },
                  { label: "BAR", value: "bar" },
                ]}
                onUnitChange={(value) =>
                  updateField(setForm, "targetPressureUnit", value as PressureUnit)
                }
                helper="Choose the pressure you want to run. PressureCal will work out the nozzle size that gets you closest."
              />

              <SimpleNumberField
                label="Number of nozzles"
                value={form.nozzleCount}
                min={1}
                step={1}
                onChange={(value) =>
                  updateField(setForm, "nozzleCount", Math.max(1, Math.round(value)))
                }
              />

              {mode === "realWorld" && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Target pressure reference
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <PillButton
                        active={form.targetReference === "pump"}
                        onClick={() => updateField(setForm, "targetReference", "pump")}
                      >
                        Pump pressure
                      </PillButton>
                      <PillButton
                        active={form.targetReference === "gun"}
                        onClick={() => updateField(setForm, "targetReference", "gun")}
                      >
                        At-gun pressure
                      </PillButton>
                    </div>
                  </div>

                  <NumberField
                    label="Hose length"
                    value={form.hoseLength}
                    onChange={(value) => updateField(setForm, "hoseLength", value)}
                    unit={form.hoseLengthUnit}
                    unitOptions={[
                      { label: "Metres", value: "m" },
                      { label: "Feet", value: "ft" },
                    ]}
                    onUnitChange={(value) =>
                      updateField(setForm, "hoseLengthUnit", value as LengthUnit)
                    }
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Common hose IDs
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {hosePresets.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            updateField(setForm, "hoseInnerDiameter", preset.value);
                            updateField(setForm, "hoseInnerDiameterUnit", "mm");
                          }}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <NumberField
                    label="Hose inner diameter"
                    value={form.hoseInnerDiameter}
                    onChange={(value) =>
                      updateField(setForm, "hoseInnerDiameter", value)
                    }
                    unit={form.hoseInnerDiameterUnit}
                    unitOptions={[
                      { label: "mm", value: "mm" },
                      { label: "in", value: "in" },
                    ]}
                    onUnitChange={(value) =>
                      updateField(
                        setForm,
                        "hoseInnerDiameterUnit",
                        value as HoseIdUnit
                      )
                    }
                  />

                  <SimpleNumberField
                    label="Extra fixed losses (PSI)"
                    value={form.extraLossPsi}
                    min={0}
                    step={10}
                    onChange={(value) =>
                      updateField(setForm, "extraLossPsi", Math.max(0, value))
                    }
                    helper="Optional allowance for fittings, guns, reels, or conservative margin."
                  />
                </>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    Recommended nozzle / tip code
                  </p>

                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div className="rounded-2xl bg-blue-600 px-4 py-3 text-white shadow-sm">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">
                        Tip code
                      </div>
                      <div className="mt-1 text-4xl font-bold tracking-tight">
                        {result.recommendedTipCode}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                      Nearest standard nozzle size{" "}
                      <span className="font-semibold text-slate-900">
                        {formatNumber(result.recommendedNozzleSize, 1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <MetricCard
                    title="Exact nozzle size"
                    value={formatNumber(result.exactNozzleSize, 2)}
                    subtext={`Per-nozzle flow ${formatNumber(
                      result.flowPerNozzleLpm,
                      1
                    )} LPM`}
                  />
                  <MetricCard
                    title="Target check"
                    value={result.isAchievable ? "Yes" : "No"}
                    subtext={
                      result.isAchievable
                        ? "Current setup can support the target."
                        : "Review nearby options and warnings below."
                    }
                    tone={result.isAchievable ? "positive" : "warning"}
                  />
                  <MetricCard
                    title="Target pressure"
                    value={`${formatNumber(result.targetPressurePsi, 0)} PSI`}
                    subtext={`${formatNumber(result.targetPressureBar, 1)} BAR`}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Nearby standard nozzle options
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use this to see what happens if you go one size smaller or larger
                than the recommended tip.
              </p>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-600">Tip</th>
                      <th className="px-4 py-3 font-medium text-slate-600">
                        Nozzle size
                      </th>
                      <th className="px-4 py-3 font-medium text-slate-600">
                        Estimated pressure
                      </th>
                      <th className="px-4 py-3 font-medium text-slate-600">
                        Difference vs target
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {result.nearbyOptions.map((option: NearbyOption) => (
                      <tr key={option.tipCode}>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {option.tipCode}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatNumber(option.nozzleSize, 1)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatNumber(option.estimatedPressurePsi, 0)} PSI
                        </td>
                        <td
                          className={`px-4 py-3 font-medium ${
                            option.deltaFromTargetPsi >= 0
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }`}
                        >
                          {option.deltaFromTargetPsi >= 0 ? "+" : ""}
                          {formatNumber(option.deltaFromTargetPsi, 0)} PSI
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {mode === "realWorld" && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <MetricCard
                  title="Estimated hose loss"
                  value={`${formatNumber(result.hoseLossPsi, 0)} PSI`}
                  subtext="At rated flow"
                />
                <MetricCard
                  title="Required pump pressure"
                  value={`${formatNumber(result.requiredPumpPressurePsi, 0)} PSI`}
                  subtext={`${formatNumber(result.requiredPumpPressureBar, 1)} BAR`}
                />
                <MetricCard
                  title="Max achievable at-gun pressure"
                  value={`${formatNumber(
                    result.maxAchievableGunPressurePsi,
                    0
                  )} PSI`}
                  subtext={`${formatNumber(
                    result.maxAchievableGunPressureBar,
                    1
                  )} BAR`}
                />
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                System summary
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryItem
                  label="Total flow"
                  value={`${formatNumber(result.totalFlowLpm, 1)} LPM`}
                />
                <SummaryItem
                  label="Flow per nozzle"
                  value={`${formatNumber(result.flowPerNozzleLpm, 1)} LPM`}
                />
                <SummaryItem
                  label="Rated pressure"
                  value={`${formatNumber(result.ratedPressurePsi, 0)} PSI`}
                />
                <SummaryItem
                  label="Target pressure"
                  value={`${formatNumber(result.targetPressurePsi, 0)} PSI`}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Checks and notes
              </h2>
              <div className="mt-4 space-y-3">
                {hasErrors ? (
                  result.messages.map((message: CalcMessage, index: number) => (
                    <MessageRow key={`${message.type}-${index}`} type={message.type}>
                      {message.message}
                    </MessageRow>
                  ))
                ) : result.messages.length > 0 ? (
                  result.messages.map((message: CalcMessage, index: number) => (
                    <MessageRow key={`${message.type}-${index}`} type={message.type}>
                      {message.message}
                    </MessageRow>
                  ))
                ) : (
                  <MessageRow type="info">
                    PressureCal is using pump flow as the fixed input and solving for
                    the nozzle that gets closest to your target pressure.
                  </MessageRow>
                )}
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function updateField<T extends keyof FormState>(
  setForm: Dispatch<SetStateAction<FormState>>,
  key: T,
  value: FormState[T]
): void {
  setForm((current) => ({ ...current, [key]: value }));
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-white text-slate-950 shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function PillButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function MetricCard({
  title,
  value,
  subtext,
  tone = "default",
}: {
  title: string;
  value: string;
  subtext: string;
  tone?: "default" | "positive" | "warning";
}) {
  const toneClass =
    tone === "positive"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : "border-slate-200 bg-white";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{subtext}</p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MessageRow({
  type,
  children,
}: {
  type: MessageType;
  children: ReactNode;
}) {
  const toneClass =
    type === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : type === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-sky-200 bg-sky-50 text-sky-800";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${toneClass}`}>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  unit,
  unitOptions,
  onUnitChange,
  helper,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  unitOptions: { label: string; value: string }[];
  onUnitChange: (value: string) => void;
  helper?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <div className="grid grid-cols-[1fr_104px] gap-2">
        <input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
        <select
          value={unit}
          onChange={(event) => onUnitChange(event.target.value)}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          {unitOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p> : null}
    </div>
  );
}

function SimpleNumberField({
  label,
  value,
  onChange,
  min,
  step,
  helper,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  helper?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="number"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p> : null}
    </div>
  );
}
