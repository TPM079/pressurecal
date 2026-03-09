export default function PressureCalHeroPreview() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              PressureCal Preview
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              Model Your Rig
            </h3>
          </div>

          <div className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">
            Calibrated
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Spec label="Rated pressure" value="3000 PSI" />
          <Spec label="Rated flow" value="15 L/min" />
          <Spec label="Hose length" value="30 m" />
          <Spec label='Hose ID' value='3/8"' />
          <Spec label="Selected tip" value="045" />
          <Spec label="At-gun pressure" value="2650 PSI" emphasis />
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Hose pressure loss
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                350 <span className="text-sm font-medium text-slate-500">PSI</span>
              </p>
            </div>

            <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              Moderate loss
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-[68%] rounded-full bg-slate-900" />
          </div>

          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>Pump</span>
            <span>Gun</span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ResultCard
            label="Nozzle match"
            value="Aligned"
            tone="green"
            note="Selected tip is close to rated performance."
          />
          <ResultCard
            label="AS/NZS reference"
            value="Class A"
            tone="slate"
            note="Indicative P×Q reference only."
          />
        </div>
      </div>
    </div>
  );
}

function Spec({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 ${
          emphasis
            ? "text-xl font-semibold text-slate-900"
            : "text-sm font-semibold text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ResultCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: "green" | "slate";
}) {
  const toneClass =
    tone === "green"
      ? "border-green-200 bg-green-50 text-green-900"
      : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <div className={`rounded-xl border px-4 py-4 ${toneClass}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      <p className="mt-2 text-xs opacity-80">{note}</p>
    </div>
  );
}