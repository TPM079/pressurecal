export default function PressureCalHeroPreview() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
      <div className="text-center">

        <div className="text-sm font-semibold text-slate-700">
Rig Model Example
</div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-left">

          <Spec label="Rated Pressure" value="3000 PSI" />
          <Spec label="Flow Rate" value="15 LPM" />
          <Spec label="Hose Length" value="30 m" />
          <Spec label="Hose ID" value='3/8"' />
          <Spec label="Selected Tip" value="045" />
          <Spec label="At Gun Pressure" value="2650 PSI" highlight />

        </div>

      </div>
    </div>
  );
}

function Spec({
  label,
  value,
  highlight = false
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">

      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className={`font-semibold ${
        highlight ? "text-blue-600" : "text-slate-900"
      }`}>
        {value}
      </div>

    </div>
  )
}