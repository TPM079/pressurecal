import type { DerivedSystemResults, SystemBuilderInputs } from "@/lib/system-builder/types"
import { formatNumber } from "@/lib/system-builder/format"
import { CardShell } from "../shared/CardShell"

interface Props {
  inputs: SystemBuilderInputs
  results: DerivedSystemResults
}

function toneClass(message: string) {
  if (message.toLowerCase().includes("undersized")) return "text-amber-700 bg-amber-50"
  if (message.toLowerCase().includes("oversized")) return "text-amber-700 bg-amber-50"
  if (message.toLowerCase().includes("well matched")) return "text-emerald-700 bg-emerald-50"
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

export function NozzleAnalysisCard({ inputs, results }: Props) {
  return (
    <CardShell title="Nozzle Analysis">
      <div className="grid gap-3">
        <StatRow
          label="Current nozzle"
          value={inputs.nozzle.nozzleSize === "" ? "—" : String(inputs.nozzle.nozzleSize)}
        />
        <StatRow
          label="Recommended nozzle"
          value={
            results.recommendedNozzleSize === null
              ? "—"
              : formatNumber(results.recommendedNozzleSize, 1)
          }
        />

        {inputs.nozzle.isSurfaceCleaner ? (
          <StatRow
            label="Number of nozzles"
            value={String(inputs.nozzle.numberOfNozzles)}
          />
        ) : null}

        <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${toneClass(results.nozzleMessage)}`}>
          {results.nozzleMessage}
        </div>
      </div>
    </CardShell>
  )
}