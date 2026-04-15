import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import {
  calculateTargetPressureNozzle,
  type FlowUnit,
  type HoseIdUnit,
  type LengthUnit,
  type PressureUnit,
  type TargetPressureNozzleInput,
  type TargetReference,
  formatNumber,
} from '../lib/targetPressureNozzle';

type Mode = 'quick' | 'realWorld';

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

const DEFAULT_FORM: FormState = {
  pumpFlow: 15,
  pumpFlowUnit: 'lpm',
  ratedPressure: 4000,
  ratedPressureUnit: 'psi',
  targetPressure: 3000,
  targetPressureUnit: 'psi',
  nozzleCount: 1,
  hoseLength: 30,
  hoseLengthUnit: 'm',
  hoseInnerDiameter: 9.53,
  hoseInnerDiameterUnit: 'mm',
  extraLossPsi: 0,
  targetReference: 'pump',
};

const hosePresets = [
  { label: '6.35 mm (1/4")', value: 6.35 },
  { label: '7.94 mm (5/16")', value: 7.94 },
  { label: '9.53 mm (3/8")', value: 9.53 },
  { label: '12.70 mm (1/2")', value: 12.7 },
];

export default function TargetPressureNozzleCalculator() {
  const [mode, setMode] = useState<Mode>('quick');
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const input: TargetPressureNozzleInput = useMemo(() => ({
    pumpFlow: form.pumpFlow,
    pumpFlowUnit: form.pumpFlowUnit,
    ratedPressure: form.ratedPressure,
    ratedPressureUnit: form.ratedPressureUnit,
    targetPressure: form.targetPressure,
    targetPressureUnit: form.targetPressureUnit,
    nozzleCount: form.nozzleCount,
    targetReference: mode === 'realWorld' ? form.targetReference : 'pump',
    hoseLength: mode === 'realWorld' ? form.hoseLength : undefined,
    hoseLengthUnit: mode === 'realWorld' ? form.hoseLengthUnit : undefined,
    hoseInnerDiameter: mode === 'realWorld' ? form.hoseInnerDiameter : undefined,
    hoseInnerDiameterUnit: mode === 'realWorld' ? form.hoseInnerDiameterUnit : undefined,
    extraLossPsi: mode === 'realWorld' ? form.extraLossPsi : undefined,
  }), [form, mode]);

  const result = useMemo(() => calculateTargetPressureNozzle(input), [input]);
  const hasErrors = result.messages.some((message) => message.type === 'error');

  return (
    <div className="text-slate-900">
  <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                PressureCal
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Target Pressure Nozzle Calculator
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Enter your pump specs and desired pressure to find the nozzle size that best matches your setup.
                Smaller nozzle = higher pressure. Larger nozzle = lower pressure.
              </p>
            </div>

            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
              <ModeButton active={mode === 'quick'} onClick={() => setMode('quick')}>
                Quick
              </ModeButton>
              <ModeButton active={mode === 'realWorld'} onClick={() => setMode('realWorld')}>
                Real-world
              </ModeButton>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Inputs</h2>
            <p className="mt-2 text-sm text-slate-600">
              {mode === 'quick'
                ? 'Use Quick mode for fast pump-pressure nozzle matching.'
                : 'Use Real-world mode to check whether your target pressure is achievable once hose loss is included.'}
            </p>

            <div className="mt-6 space-y-5">
              <NumberField
                label="Pump flow"
                value={form.pumpFlow}
                onChange={(value) => updateField(setForm, 'pumpFlow', value)}
                unit={form.pumpFlowUnit}
                unitOptions={[
                  { label: 'LPM', value: 'lpm' },
                  { label: 'GPM', value: 'gpm' },
                ]}
                onUnitChange={(value) => updateField(setForm, 'pumpFlowUnit', value as FlowUnit)}
              />

              <NumberField
                label="Rated pump pressure"
                value={form.ratedPressure}
                onChange={(value) => updateField(setForm, 'ratedPressure', value)}
                unit={form.ratedPressureUnit}
                unitOptions={[
                  { label: 'PSI', value: 'psi' },
                  { label: 'BAR', value: 'bar' },
                ]}
                onUnitChange={(value) => updateField(setForm, 'ratedPressureUnit', value as PressureUnit)}
              />

              <NumberField
                label={mode === 'realWorld' && form.targetReference === 'gun' ? 'Target at-gun pressure' : 'Target pressure'}
                value={form.targetPressure}
                onChange={(value) => updateField(setForm, 'targetPressure', value)}
                unit={form.targetPressureUnit}
                unitOptions={[
                  { label: 'PSI', value: 'psi' },
                  { label: 'BAR', value: 'bar' },
                ]}
                onUnitChange={(value) => updateField(setForm, 'targetPressureUnit', value as PressureUnit)}
                helper="Choose the pressure you want to run. PressureCal will work out the nozzle size that gets you closest."
              />

              <SimpleNumberField
                label="Number of nozzles"
                value={form.nozzleCount}
                min={1}
                step={1}
                onChange={(value) => updateField(setForm, 'nozzleCount', Math.max(1, Math.round(value)))}
              />

              {mode === 'realWorld' && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-800">
                      Target pressure reference
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <PillButton
                        active={form.targetReference === 'pump'}
                        onClick={() => updateField(setForm, 'targetReference', 'pump')}
                      >
                        Pump pressure
                      </PillButton>
                      <PillButton
                        active={form.targetReference === 'gun'}
                        onClick={() => updateField(setForm, 'targetReference', 'gun')}
                      >
                        At-gun pressure
                      </PillButton>
                    </div>
                  </div>

                  <NumberField
                    label="Hose length"
                    value={form.hoseLength}
                    onChange={(value) => updateField(setForm, 'hoseLength', value)}
                    unit={form.hoseLengthUnit}
                    unitOptions={[
                      { label: 'm', value: 'm' },
                      { label: 'ft', value: 'ft' },
                    ]}
                    onUnitChange={(value) => updateField(setForm, 'hoseLengthUnit', value as LengthUnit)}
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-800">Hose ID preset</label>
                    <div className="grid grid-cols-2 gap-2">
                      {hosePresets.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            updateField(setForm, 'hoseInnerDiameter', preset.value);
                            updateField(setForm, 'hoseInnerDiameterUnit', 'mm');
                          }}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <NumberField
                    label="Hose inner diameter"
                    value={form.hoseInnerDiameter}
                    onChange={(value) => updateField(setForm, 'hoseInnerDiameter', value)}
                    unit={form.hoseInnerDiameterUnit}
                    unitOptions={[
                      { label: 'mm', value: 'mm' },
                      { label: 'in', value: 'in' },
                    ]}
                    onUnitChange={(value) => updateField(setForm, 'hoseInnerDiameterUnit', value as HoseIdUnit)}
                  />

                  <SimpleNumberField
                    label="Extra fixed losses (PSI)"
                    value={form.extraLossPsi}
                    min={0}
                    step={10}
                    onChange={(value) => updateField(setForm, 'extraLossPsi', Math.max(0, value))}
                    helper="Optional allowance for fittings, guns, reels, or conservative margin."
                  />
                </>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                title="Recommended tip"
                value={result.recommendedTipCode}
                subtext={`Nearest standard size ${formatNumber(result.recommendedNozzleSize, 1)}`}
              />
              <MetricCard
                title="Exact nozzle size"
                value={formatNumber(result.exactNozzleSize, 2)}
                subtext={`Per-nozzle flow ${formatNumber(result.flowPerNozzleLpm, 1)} LPM`}
              />
              <MetricCard
                title={mode === 'realWorld' && form.targetReference === 'gun' ? 'Target achievable?' : 'Within machine rating?'}
                value={result.isAchievable ? 'Yes' : 'No'}
                subtext={result.isAchievable ? 'Current setup can support the target.' : 'Review nearby options and warnings below.'}
                tone={result.isAchievable ? 'positive' : 'warning'}
              />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Nearby standard nozzle options</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Use this to see what happens if you go one size smaller or larger than the recommended tip.
                  </p>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-600">Tip</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Nozzle size</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Estimated pressure</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Difference vs target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {result.nearbyOptions.map((option) => (
                      <tr key={option.tipCode}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{option.tipCode}</td>
                        <td className="px-4 py-3 text-slate-700">{formatNumber(option.nozzleSize, 1)}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatNumber(option.estimatedPressurePsi, 0)} PSI
                        </td>
                        <td className={`px-4 py-3 font-medium ${option.deltaFromTargetPsi >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {option.deltaFromTargetPsi >= 0 ? '+' : ''}
                          {formatNumber(option.deltaFromTargetPsi, 0)} PSI
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {mode === 'realWorld' && (
              <div className="grid gap-4 md:grid-cols-3">
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
                  value={`${formatNumber(result.maxAchievableGunPressurePsi, 0)} PSI`}
                  subtext={`${formatNumber(result.maxAchievableGunPressureBar, 1)} BAR`}
                />
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">System summary</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryItem label="Total flow" value={`${formatNumber(result.totalFlowLpm, 1)} LPM`} />
                <SummaryItem label="Flow per nozzle" value={`${formatNumber(result.flowPerNozzleLpm, 1)} LPM`} />
                <SummaryItem label="Rated pressure" value={`${formatNumber(result.ratedPressurePsi, 0)} PSI`} />
                <SummaryItem label="Target pressure" value={`${formatNumber(result.targetPressurePsi, 0)} PSI`} />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Checks and notes</h2>
              <div className="mt-4 space-y-3">
                {hasErrors ? (
                  result.messages.map((message, index) => (
                    <MessageRow key={`${message.type}-${index}`} type={message.type}>
                      {message.message}
                    </MessageRow>
                  ))
                ) : result.messages.length > 0 ? (
                  result.messages.map((message, index) => (
                    <MessageRow key={`${message.type}-${index}`} type={message.type}>
                      {message.message}
                    </MessageRow>
                  ))
                ) : (
                  <MessageRow type="info">
                    PressureCal is using pump flow as the fixed input and solving for the nozzle that gets closest to your target pressure.
                  </MessageRow>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function updateField<T extends keyof FormState>(
  setForm: Dispatch<SetStateAction<FormState>>,
  key: T,
  value: FormState[T],
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
          ? 'bg-white text-slate-950 shadow-sm'
          : 'text-slate-600 hover:text-slate-900'
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
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
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
  tone = 'default',
}: {
  title: string;
  value: string;
  subtext: string;
  tone?: 'default' | 'positive' | 'warning';
}) {
  const toneClass = tone === 'positive'
    ? 'border-emerald-200 bg-emerald-50'
    : tone === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : 'border-slate-200 bg-white';

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{subtext}</p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MessageRow({
  type,
  children,
}: {
  type: 'error' | 'warning' | 'info';
  children: ReactNode;
}) {
  const toneClass = type === 'error'
    ? 'border-red-200 bg-red-50 text-red-800'
    : type === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-sky-200 bg-sky-50 text-sky-800';

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClass}`}>
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
      <label className="mb-2 block text-sm font-medium text-slate-800">{label}</label>
      <div className="grid grid-cols-[1fr_104px] gap-2">
        <input
          type="number"
          value={Number.isFinite(value) ? value : ''}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
        />
        <select
          value={unit}
          onChange={(event) => onUnitChange(event.target.value)}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
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
      <label className="mb-2 block text-sm font-medium text-slate-800">{label}</label>
      <input
        type="number"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : ''}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
      />
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p> : null}
    </div>
  );
}
