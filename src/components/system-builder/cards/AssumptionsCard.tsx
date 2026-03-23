import type { SystemBuilderInputs } from "@/lib/system-builder/types"
import { CardShell } from "../shared/CardShell"

interface Props {
  inputs: SystemBuilderInputs
  onChange: React.Dispatch<React.SetStateAction<SystemBuilderInputs>>
}

export function AssumptionsCard({ inputs, onChange }: Props) {
  return (
    <CardShell title="Assumptions" subtitle="Used for horsepower calculations.">
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-slate-700">
          Pump efficiency ({Math.round(inputs.assumptions.pumpEfficiency * 100)}%)
        </label>

        <input
          type="range"
          min={0.8}
          max={0.95}
          step={0.01}
          value={inputs.assumptions.pumpEfficiency}
          onChange={(e) =>
            onChange((prev) => ({
              ...prev,
              assumptions: {
                ...prev.assumptions,
                pumpEfficiency: Number(e.target.value),
              },
            }))
          }
          className="w-full"
        />

        <div className="flex justify-between text-xs text-slate-500">
          <span>80%</span>
          <span>90%</span>
          <span>95%</span>
        </div>
      </div>
    </CardShell>
  )
}