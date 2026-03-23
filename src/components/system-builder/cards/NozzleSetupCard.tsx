import type { SystemBuilderInputs } from "@/lib/system-builder/types"
import { CardShell } from "../shared/CardShell"

interface Props {
  inputs: SystemBuilderInputs
  onChange: React.Dispatch<React.SetStateAction<SystemBuilderInputs>>
}

function numberOrEmpty(value: string) {
  return value === "" ? "" : Number(value)
}

export function NozzleSetupCard({ inputs, onChange }: Props) {
  return (
    <CardShell title="Nozzle Setup">
      <div className="grid gap-4">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-700">Nozzle size</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={inputs.nozzle.nozzleSize}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                nozzle: {
                  ...prev.nozzle,
                  nozzleSize: numberOrEmpty(e.target.value),
                },
              }))
            }
            className="rounded-2xl border border-slate-300 px-3 py-2.5"
          />
        </label>

        <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
          <span className="text-sm font-medium text-slate-700">Surface cleaner mode</span>
          <input
            type="checkbox"
            checked={inputs.nozzle.isSurfaceCleaner}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                nozzle: {
                  ...prev.nozzle,
                  isSurfaceCleaner: e.target.checked,
                  numberOfNozzles: e.target.checked
                    ? Math.max(prev.nozzle.numberOfNozzles, 2)
                    : 1,
                },
              }))
            }
            className="h-4 w-4 rounded border-slate-300"
          />
        </label>

        {inputs.nozzle.isSurfaceCleaner ? (
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">Number of nozzles</span>
            <input
              type="number"
              min={1}
              step={1}
              value={inputs.nozzle.numberOfNozzles}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  nozzle: {
                    ...prev.nozzle,
                    numberOfNozzles: Math.max(1, Number(e.target.value) || 1),
                  },
                }))
              }
              className="rounded-2xl border border-slate-300 px-3 py-2.5"
            />
          </label>
        ) : null}

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-700">
            Target pressure ({inputs.units.pressure.toUpperCase()})
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={inputs.nozzle.targetPressure}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                nozzle: {
                  ...prev.nozzle,
                  targetPressure: numberOrEmpty(e.target.value),
                },
              }))
            }
            className="rounded-2xl border border-slate-300 px-3 py-2.5"
          />
        </label>
      </div>
    </CardShell>
  )
}