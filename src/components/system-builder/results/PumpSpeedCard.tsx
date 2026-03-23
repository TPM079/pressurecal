import type { DerivedSystemResults } from "@/lib/system-builder/types"
import { formatNumber } from "@/lib/system-builder/format"
import { CardShell } from "../shared/CardShell"

interface Props {
  results: DerivedSystemResults
  ratedRPM: number | ""
}

function toneClass(message: string) {
  if (message.toLowerCase().includes("overspeed")) return "text-red-700 bg-red-50"
  if (message.toLowerCase().includes("below")) return "text-amber-700 bg-amber-50"
  if (message.toLowerCase().includes("ok")) return "text-emerald-700 bg-emerald-50"
  return "text-slate-700 bg-slate-50"
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  )
}

export function PumpSpeedCard({ results, ratedRPM }: Props) {
  return (
    <CardShell title="Pump Speed">
      <div className="grid gap-3">
        <StatRow
          label="Actual pump RPM"
          value={results.actualPumpRPM === null ? "—" : formatNumber(results.actualPumpRPM, 0)}
        />
        <StatRow
          label="Rated pump RPM"
          value={ratedRPM === "" ? "—" : String(ratedRPM)}
        />

        <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${toneClass(results.rpmMessage)}`}>
          {results.rpmMessage}
        </div>
      </div>
    </CardShell>
  )
}