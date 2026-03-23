import type { SystemBuilderInputs } from "@/lib/system-builder/types"
import {
  switchFlowUnit,
  switchLengthUnit,
  switchPressureUnit,
} from "@/lib/system-builder/unit-switchers"
import { CardShell } from "../shared/CardShell"

interface Props {
  inputs: SystemBuilderInputs
  onChange: React.Dispatch<React.SetStateAction<SystemBuilderInputs>>
}

function ToggleButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

export function UnitsCard({ inputs, onChange }: Props) {
  return (
    <CardShell title="Units" subtitle="PSI + LPM + metres is the default for Australian operators.">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Pressure</p>
          <div className="flex gap-2">
            <ToggleButton
              active={inputs.units.pressure === "psi"}
              onClick={() => onChange((prev) => switchPressureUnit(prev, "psi"))}
            >
              PSI
            </ToggleButton>
            <ToggleButton
              active={inputs.units.pressure === "bar"}
              onClick={() => onChange((prev) => switchPressureUnit(prev, "bar"))}
            >
              BAR
            </ToggleButton>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Flow</p>
          <div className="flex gap-2">
            <ToggleButton
              active={inputs.units.flow === "lpm"}
              onClick={() => onChange((prev) => switchFlowUnit(prev, "lpm"))}
            >
              LPM
            </ToggleButton>
            <ToggleButton
              active={inputs.units.flow === "gpm"}
              onClick={() => onChange((prev) => switchFlowUnit(prev, "gpm"))}
            >
              GPM
            </ToggleButton>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Hose length</p>
          <div className="flex gap-2">
            <ToggleButton
              active={inputs.units.length === "m"}
              onClick={() => onChange((prev) => switchLengthUnit(prev, "m"))}
            >
              metres
            </ToggleButton>
            <ToggleButton
              active={inputs.units.length === "ft"}
              onClick={() => onChange((prev) => switchLengthUnit(prev, "ft"))}
            >
              feet
            </ToggleButton>
          </div>
        </div>
      </div>
    </CardShell>
  )
}