import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { solvePressureCal, barFromPsi, lpmFromGpm } from "./pressurecal";
import type { Inputs, PressureUnit, FlowUnit, LengthUnit, DiameterUnit } from "./pressurecal";

const hosePresets = [
  { label: '1/4" (6.35 mm)', valueMm: 6.35 },
  { label: '5/16" (7.94 mm)', valueMm: 7.94 },
  { label: '3/8" (9.53 mm)', valueMm: 9.53 },
  { label: '1/2" (12.70 mm)', valueMm: 12.7 }
];

function fmt(n: number, dp: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dp);
}

function statusBadge(status: string) {
  if (status === "calibrated") {
    return { text: "Calibrated", cls: "bg-green-50 text-green-800 border-green-200" };
  }
  if (status === "under-calibrated") {
    return { text: "Under-calibrated", cls: "bg-amber-50 text-amber-900 border-amber-200" };
  }
  return { text: "Over-calibrated", cls: "bg-red-50 text-red-800 border-red-200" };
}

function toPsi(value: number, unit: PressureUnit) {
  return unit === "psi" ? value : value * 14.5037738;
}

function toGpm(value: number, unit: FlowUnit) {
  return unit === "gpm" ? value : value / 3.785411784;
}

export default function App() {
  const [inputs, setInputs] = useState<Inputs>({
    pumpPressure: 4000,
    pumpPressureUnit: "psi",
    pumpFlow: 15,
    pumpFlowUnit: "lpm",

    maxPressure: 4000,
    maxPressureUnit: "psi",

    hoseLength: 15,
    hoseLengthUnit: "m",
    hoseId: 9.53,
    hoseIdUnit: "mm",

    nozzleMode: "tipSize",
    nozzleSizeText: "035",
    orificeMm: 1.2,

    dischargeCoeffCd: 0.62,
    waterDensity: 1000,
    hoseRoughnessMm: 0.0015
  });

  const maxWasManuallyEditedRef = useRef(false);

  const r = useMemo(() => solvePressureCal(inputs), [inputs]);

  const gunBar = barFromPsi(r.gunPressurePsi);
  const pumpBar = barFromPsi(r.pumpPressurePsi);
  const reqPumpBar = barFromPsi(r.requiredPumpPsi);

  const gunLpm = lpmFromGpm(r.gunFlowGpm);
  const lossBar = barFromPsi(r.hoseLossPsi);
  const bypassLpm = lpmFromGpm(r.bypassFlowGpm);

  const ratedPsi = toPsi(inputs.pumpPressure, inputs.pumpPressureUnit);
  const pressureVariancePct = ratedPsi > 0 ? ((r.gunPressurePsi - ratedPsi) / ratedPsi) * 100 : 0;
  const lossPctAbs = Math.abs(pressureVariancePct);

  const efficiencyTier =
    lossPctAbs < 5 ? "Optimal" :
    lossPctAbs < 10 ? "Moderate loss" :
    lossPctAbs < 20 ? "High loss" :
    "Severe loss";

  const efficiencyNote =
    lossPctAbs < 5 ? "Very close to rated performance." :
    lossPctAbs < 10 ? "Some pressure drop—typically acceptable." :
    lossPctAbs < 20 ? "Noticeable drop—consider hose length or diameter." :
    "Large drop—hose length/ID is significantly reducing performance.";

  const badge = statusBadge(r.status);

  const systemBadge = r.isPressureLimited
    ? { text: "Pressure-limited (bypass)", cls: "bg-red-50 text-red-800 border-red-200" }
    : badge;

  // AS/NZS 4233.01 P×Q reference
  const ratedBar = barFromPsi(ratedPsi);
  const ratedGpm = toGpm(inputs.pumpFlow, inputs.pumpFlowUnit);
  const ratedLpm = lpmFromGpm(ratedGpm);

  const pqRated = ratedBar * ratedLpm;
  const pqAtGun = gunBar * gunLpm;

  const PQ_THRESHOLD = 5600;
  const pqClassRated = pqRated >= PQ_THRESHOLD ? "Class B" : "Class A";
  const pqClassGun = pqAtGun >= PQ_THRESHOLD ? "Class B" : "Class A";

  return (
    <div className="min-h-screen bg-slate-100">
      {/* HERO */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                PressureCal — Pressure Washer Calculator
              </h1>

              <p className="mt-5 text-lg text-slate-600">
                Model nozzle size, hose pressure loss, and real at-gun performance.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#calculator"
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Model Your Rig
                </a>
                <a
                  href="#about"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  What is this?
                </a>
              </div>

              <p className="mt-6 text-sm text-slate-500">
                Practical field modelling — not a simple unit converter.
              </p>
            </div>

            <div
              className={`mt-1 hidden shrink-0 items-center rounded-full border px-3 py-1 text-sm font-medium lg:inline-flex ${systemBadge.cls}`}
            >
              {systemBadge.text}
            </div>
          </div>
        </div>
      </section>

      {/* VALUE */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-900">Real hose pressure loss</div>
              <p className="mt-2 text-sm text-slate-600">
                Quantify the pressure drop from hose length and internal diameter — not guesswork.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-900">Nozzle match to your pump</div>
              <p className="mt-2 text-sm text-slate-600">
                Instantly see if your tip is aligned, restrictive, or oversized vs your rated specs.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-900">Unloader / bypass behaviour</div>
              <p className="mt-2 text-sm text-slate-600">
                If pressure is limited, see estimated bypass flow and how much performance is being diverted.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-900">AS/NZS reference</div>
              <p className="mt-2 text-sm text-slate-600">
                P×Q reference classification (AS/NZS 4233.01) shown using both rated and at-gun values.
              </p>
            </div>
          </div>

          <div className="mt-10 rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-700">
              Built for operators who want to understand their rig — not guess.
            </p>
          </div>
        </div>
      </section>

      {/* FREE CALCULATORS */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Free Pressure Washing Calculators
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Quick, practical tools for operators — built to be shared on jobs and in group chats.
              </p>
            </div>

            <a
              href="#calculator"
              className="hidden rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 sm:inline-flex"
            >
              Model Your Rig
            </a>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              to="/nozzle-size-calculator"
              className="group rounded-xl border border-slate-200 bg-slate-50 p-5 hover:border-slate-300 hover:bg-white"
            >
              <div className="text-sm font-semibold text-slate-900 group-hover:underline">
                Nozzle Size Calculator
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Find the right tip size from pressure + flow. Includes orifice diameter and a shareable setup link.
              </p>
              <div className="mt-3 text-xs font-semibold text-slate-700">Open tool →</div>
            </Link>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 opacity-80">
              <div className="text-sm font-semibold text-slate-900">
                Hose Pressure Loss Calculator
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Estimate pressure drop based on hose length and internal diameter — and see real at-gun pressure.
              </p>
              <div className="mt-3 text-xs font-semibold text-slate-500">Open tool →</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 opacity-80">
              <div className="text-sm font-semibold text-slate-900">
                PSI ↔ BAR Converter
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Instant unit conversion for pump specs, machine stickers and compliance docs.
              </p>
              <div className="mt-3 text-xs font-semibold text-slate-500">Coming soon</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 opacity-80">
              <div className="text-sm font-semibold text-slate-900">
                GPM ↔ LPM Converter
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Convert flow rates for nozzle charts, injector sizing and hose loss calculations.
              </p>
              <div className="mt-3 text-xs font-semibold text-slate-500">Coming soon</div>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-700">
              Want the full picture? Use <strong>Model Your Rig</strong> to include hose loss, nozzle calibration and bypass behaviour.
            </p>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
            About PressureCal
          </h2>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            PressureCal was built by a pressure equipment professional working within the Australian high-pressure cleaning industry.
            It was created to model real-world hose loss, nozzle calibration and unloader behaviour — using engineering-based flow
            relationships rather than guesswork.
          </p>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            Too often, rigs are adjusted by feel. PressureCal helps operators understand what’s actually happening between pump
            and nozzle so decisions can be made with clarity.
          </p>

          <p className="mt-4 max-w-3xl text-xs text-slate-500">
            Calculations are based on standardised nozzle flow relationships and Darcy–Weisbach friction modelling. Results are indicative.
          </p>
        </div>
      </section>

      {/* TOOL */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className={`mb-4 inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium lg:hidden ${systemBadge.cls}`}>
          {systemBadge.text}
        </div>

        <main id="calculator" className="grid gap-6 lg:grid-cols-2">
          {/* Inputs */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">System Configuration</h2>
            </div>

            <div className="space-y-5 px-5 py-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Rated pressure</label>
                <div className="mt-2 flex gap-3">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    type="number"
                    value={inputs.pumpPressure}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setInputs((s) => {
                        const nextState: Inputs = { ...s, pumpPressure: next };
                        if (!maxWasManuallyEditedRef.current) {
                          nextState.maxPressure = next;
                          nextState.maxPressureUnit = s.pumpPressureUnit;
                        }
                        return nextState;
                      });
                    }}
                  />
                  <select
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    value={inputs.pumpPressureUnit}
                    onChange={(e) => {
                      const u = e.target.value as PressureUnit;
                      setInputs((s) => {
                        const nextState: Inputs = { ...s, pumpPressureUnit: u };
                        if (!maxWasManuallyEditedRef.current) {
                          nextState.maxPressureUnit = u;
                          nextState.maxPressure = s.pumpPressure;
                        }
                        return nextState;
                      });
                    }}
                  >
                    <option value="psi">psi</option>
                    <option value="bar">bar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Rated flow</label>
                <div className="mt-2 flex gap-3">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    type="number"
                    value={inputs.pumpFlow}
                    onChange={(e) => setInputs((s) => ({ ...s, pumpFlow: Number(e.target.value) }))}
                  />
                  <select
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    value={inputs.pumpFlowUnit}
                    onChange={(e) => setInputs((s) => ({ ...s, pumpFlowUnit: e.target.value as FlowUnit }))}
                  >
                    <option value="lpm">L/min</option>
                    <option value="gpm">GPM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Max pressure (unloader)</label>
                <div className="mt-2 flex gap-3">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    type="number"
                    value={inputs.maxPressure}
                    onChange={(e) => {
                      maxWasManuallyEditedRef.current = true;
                      setInputs((s) => ({ ...s, maxPressure: Number(e.target.value) }));
                    }}
                  />
                  <select
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    value={inputs.maxPressureUnit}
                    onChange={(e) => {
                      maxWasManuallyEditedRef.current = true;
                      setInputs((s) => ({ ...s, maxPressureUnit: e.target.value as PressureUnit }));
                    }}
                  >
                    <option value="psi">psi</option>
                    <option value="bar">bar</option>
                  </select>
                </div>

                {!maxWasManuallyEditedRef.current && (
                  <div className="mt-2 text-xs text-slate-500">Synced to rated pressure. Edit to override.</div>
                )}
              </div>

              <div className="h-px bg-slate-200" />

              <div>
                <label className="block text-sm font-medium text-slate-700">Hose length (installed)</label>
                <div className="mt-2 flex gap-3">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    type="number"
                    value={inputs.hoseLength}
                    onChange={(e) => setInputs((s) => ({ ...s, hoseLength: Number(e.target.value) }))}
                  />
                  <select
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    value={inputs.hoseLengthUnit}
                    onChange={(e) => setInputs((s) => ({ ...s, hoseLengthUnit: e.target.value as LengthUnit }))}
                  >
                    <option value="m">m</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Hose internal diameter</label>
                <div className="mt-2 flex gap-3">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    type="number"
                    value={inputs.hoseId}
                    onChange={(e) => setInputs((s) => ({ ...s, hoseId: Number(e.target.value) }))}
                  />
                  <select
                    className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    value={inputs.hoseIdUnit}
                    onChange={(e) => setInputs((s) => ({ ...s, hoseIdUnit: e.target.value as DiameterUnit }))}
                  >
                    <option value="mm">mm</option>
                    <option value="in">in</option>
                  </select>
                </div>

                <div className="mt-3">
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    value=""
                    onChange={(e) => {
                      const mm = Number(e.target.value);
                      if (Number.isFinite(mm) && mm > 0) setInputs((s) => ({ ...s, hoseId: mm, hoseIdUnit: "mm" }));
                    }}
                  >
                    <option value="">Hose preset (optional)…</option>
                    {hosePresets.map((p) => (
                      <option key={p.valueMm} value={p.valueMm}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="h-px bg-slate-200" />

              <div>
                <label className="block text-sm font-medium text-slate-700">Selected nozzle tip</label>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                  value={inputs.nozzleSizeText}
                  onChange={(e) => setInputs((s) => ({ ...s, nozzleSizeText: e.target.value }))}
                />
              </div>
            </div>
          </section>

          {/* Results */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">Calculated Performance</h2>
            </div>

            <div className="space-y-5 px-5 py-4">
              <div className="rounded-xl border border-slate-300 bg-slate-100 px-5 py-5">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
                  Estimated operating pressure (at gun)
                </div>
                <div className="mt-2 text-5xl font-semibold tracking-tight text-slate-900">
                  {fmt(r.gunPressurePsi, 0)} <span className="ml-1 text-sm font-medium text-slate-500">PSI</span>
                </div>
                <div className="mt-1 text-sm text-slate-600">({fmt(gunBar, 1)} bar)</div>

                {r.isPressureLimited && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                    Pressure limited by unloader. Pump clamped at {fmt(r.pumpPressurePsi, 0)} PSI ({fmt(pumpBar, 1)} bar).
                    <br />
                    Required (no limit): {fmt(r.requiredPumpPsi, 0)} PSI ({fmt(reqPumpBar, 1)} bar).
                  </div>
                )}
              </div>

              <div
                className={`text-xs font-medium ${
                  Math.abs(pressureVariancePct) > 10
                    ? "text-red-600"
                    : Math.abs(pressureVariancePct) > 5
                    ? "text-amber-600"
                    : "text-slate-500"
                }`}
              >
                Δ from rated pressure: {fmt(pressureVariancePct, 1)}%
              </div>

              <div className="text-sm text-slate-700">
                Efficiency tier: <strong>{efficiencyTier}</strong> — {efficiencyNote}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 px-4 py-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-600">Operating flow rate</div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">
                    {fmt(r.gunFlowGpm, 2)} <span className="text-sm font-medium text-slate-600">GPM</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">({fmt(gunLpm, 1)} L/min)</div>
                </div>

                <div className="rounded-xl border border-slate-200 px-4 py-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-600">Hose pressure loss</div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">
                    {fmt(r.hoseLossPsi, 0)} <span className="text-sm font-medium text-slate-600">PSI</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">({fmt(lossBar, 1)} bar)</div>
                  <div className="mt-2 text-xs text-slate-500">{fmt(r.hoseLossPct, 1)}% of rated pressure</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                      AS/NZS 4233.01 Reference (P × Q)
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      Uses <strong>Pressure (bar)</strong> × <strong>Flow (L/min)</strong>, threshold {PQ_THRESHOLD}.
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        pqClassGun === "Class B"
                          ? "bg-amber-50 text-amber-900 border-amber-200"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                      title="Indicator only"
                    >
                      {pqClassGun}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
                      Rated (maximum output)
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {fmt(pqRated, 0)} <span className="text-sm font-medium text-slate-600">bar·L/min</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Uses rated pump pressure &amp; rated pump flow. ({pqClassRated})
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
                      At gun (indicative)
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {fmt(pqAtGun, 0)} <span className="text-sm font-medium text-slate-600">bar·L/min</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Based on calculated operating point (hose + nozzle + unloader effects).
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Note: This is a reference indicator only. Formal safety requirements depend on the standard and site procedures.
                </div>
              </div>

              {r.isPressureLimited && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-600">Bypass flow (unloader)</div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">
                      {fmt(r.bypassFlowGpm, 2)} <span className="text-sm font-medium text-slate-600">GPM</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">({fmt(bypassLpm, 1)} L/min)</div>
                  </div>

                  <div className="rounded-xl border border-slate-200 px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-600">Bypass percentage</div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">
                      {fmt(r.bypassPct, 0)} <span className="text-sm font-medium text-slate-600">%</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">Portion of rated pump flow diverted to bypass.</div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">Configuration status</div>
                  <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badge.cls}`}>
                    {badge.text}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-700">{r.statusMessage}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 px-4 py-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-600">Selected nozzle tip</div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">{r.selectedTipCode}</div>
                  <div className="mt-1 text-sm text-slate-600">Orifice {fmt(r.selectedOrificeMm, 2)} mm</div>
                </div>

                <div className="rounded-xl border border-slate-200 px-4 py-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Nozzle equivalent for rated pressure
                  </div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">{r.calibratedTipCode}</div>
                  <div className="mt-1 text-sm text-slate-600">≈ {fmt(r.calibratedNozzleQ4000Gpm, 2)} GPM @ 4000</div>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Results are calculated estimates based on rated specifications and standardised nozzle rating conventions.
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} PressureCal. Built as a practical field reference tool.
        </footer>
      </div>
    </div>
  );
}