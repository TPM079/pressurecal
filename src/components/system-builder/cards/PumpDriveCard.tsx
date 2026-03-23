import type { SystemBuilderInputs } from "@/lib/system-builder/types"
import { CardShell } from "../shared/CardShell"

interface Props {
  inputs: SystemBuilderInputs
  onChange: React.Dispatch<React.SetStateAction<SystemBuilderInputs>>
}

function numberOrEmpty(value: string) {
  return value === "" ? "" : Number(value)
}

function ModeButton({
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

export function PumpDriveCard({ inputs, onChange }: Props) {
  return (
    <CardShell title="Pump Drive" subtitle="Enter pump RPM directly or calculate it from pulley sizes.">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Drive mode</p>
          <div className="flex gap-2">
            <ModeButton
              active={inputs.drive.mode === "direct"}
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  drive: {
                    ...prev.drive,
                    mode: "direct",
                  },
                }))
              }
            >
              Direct RPM
            </ModeButton>

            <ModeButton
              active={inputs.drive.mode === "pulley"}
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  drive: {
                    ...prev.drive,
                    mode: "pulley",
                  },
                }))
              }
            >
              Pulley ratio
            </ModeButton>
          </div>
        </div>

        {inputs.drive.mode === "direct" ? (
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">Actual pump RPM</span>
            <input
              type="number"
              inputMode="decimal"
              value={inputs.drive.actualPumpRPM}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  drive: {
                    ...prev.drive,
                    actualPumpRPM: numberOrEmpty(e.target.value),
                  },
                }))
              }
              className="rounded-2xl border border-slate-300 px-3 py-2.5"
            />
          </label>
        ) : (
          <div className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-700">Engine RPM</span>
              <input
                type="number"
                inputMode="decimal"
                value={inputs.drive.engineRPM}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    drive: {
                      ...prev.drive,
                      engineRPM: numberOrEmpty(e.target.value),
                    },
                  }))
                }
                className="rounded-2xl border border-slate-300 px-3 py-2.5"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-700">Engine pulley diameter</span>
              <input
                type="number"
                inputMode="decimal"
                value={inputs.drive.enginePulleyDiameter}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    drive: {
                      ...prev.drive,
                      enginePulleyDiameter: numberOrEmpty(e.target.value),
                    },
                  }))
                }
                className="rounded-2xl border border-slate-300 px-3 py-2.5"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-700">Pump pulley diameter</span>
              <input
                type="number"
                inputMode="decimal"
                value={inputs.drive.pumpPulleyDiameter}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    drive: {
                      ...prev.drive,
                      pumpPulleyDiameter: numberOrEmpty(e.target.value),
                    },
                  }))
                }
                className="rounded-2xl border border-slate-300 px-3 py-2.5"
              />
            </label>
          </div>
        )}
      </div>
    </CardShell>
  )
}