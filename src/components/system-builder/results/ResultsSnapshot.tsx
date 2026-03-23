import type { DerivedSystemResults, SystemBuilderInputs } from "@/lib/system-builder/types"
import { formatFlow, formatPressure } from "@/lib/system-builder/format"
import { CardShell } from "../shared/CardShell"

interface Props {
  inputs: SystemBuilderInputs
  results: DerivedSystemResults
}

function SnapshotItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

export function ResultsSnapshot({ inputs, results }: Props) {
  return (
    <CardShell title="Key Results">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SnapshotItem
          label="Pressure at nozzle"
          value={formatPressure(results.pressureAtNozzlePsi, inputs.units.pressure)}
        />
        <SnapshotItem
          label="Hose loss"
          value={formatPressure(results.hoseLossPsi, inputs.units.pressure)}
        />
        <SnapshotItem
          label="Actual flow"
          value={formatFlow(results.actualFlowGpm, inputs.units.flow)}
        />
        <SnapshotItem
          label="Required HP"
          value={results.requiredHP === null ? "—" : `${results.requiredHP.toFixed(1)} HP`}
        />
      </div>
    </CardShell>
  )
}