import type { DerivedSystemResults } from "@/lib/system-builder/types"
import { formatNumber } from "@/lib/system-builder/format"
import { CardShell } from "../shared/CardShell"

interface Props {
  results: DerivedSystemResults
}

function toneClass(message: string) {
  if (message.toLowerCase().includes("undersized")) return "text-red-700 bg-red-50"
  if (message.toLowerCase().includes("limit")) return "text-amber-700 bg-amber-50"
  if (message.toLowerCase().includes("safe")) return "text-emerald-700 bg-emerald-50"
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

export function PowerRequirementCard({ results }: Props) {
  return (
    <CardShell title="Power Requirement">
      <div className="grid gap-3">
        <StatRow label="Required HP" value={results.requiredHP === null ? "—" : `${formatNumber(results.requiredHP, 1)} HP`} />
        <StatRow label="Estimated usable HP" value={results.usableHP === null ? "—" : `${formatNumber(results.usableHP, 1)} HP`} />

        <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${toneClass(results.powerMessage)}`}>
          {results.powerMessage}
        </div>

        <p className="text-xs text-slate-500">
          Usable horsepower is estimated at 85% of rated engine HP.
        </p>
      </div>
    </CardShell>
  )
}