import type { SystemBuilderInputs } from "@/lib/system-builder/types"
import { CardShell } from "../shared/CardShell"

interface Props {
  inputs: SystemBuilderInputs
  onChange: React.Dispatch<React.SetStateAction<SystemBuilderInputs>>
}

function numberOrEmpty(value: string) {
  return value === "" ? "" : Number(value)
}

export function HoseSetupCard({ inputs, onChange }: Props) {
  return (
    <CardShell title="Hose Setup">
      <div className="grid gap-4">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-700">
            Hose length ({inputs.units.length})
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={inputs.hose.hoseLength}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                hose: {
                  ...prev.hose,
                  hoseLength: numberOrEmpty(e.target.value),
                },
              }))
            }
            className="rounded-2xl border border-slate-300 px-3 py-2.5"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-700">Hose ID (inches)</span>
          <select
            value={inputs.hose.hoseIdInches}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                hose: {
                  ...prev.hose,
                  hoseIdInches: Number(e.target.value),
                },
              }))
            }
            className="rounded-2xl border border-slate-300 bg-white px-3 py-2.5"
          >
            <option value={0.25}>1/4"</option>
            <option value={0.3125}>5/16"</option>
            <option value={0.375}>3/8"</option>
            <option value={0.5}>1/2"</option>
          </select>
        </label>
      </div>
    </CardShell>
  )
}