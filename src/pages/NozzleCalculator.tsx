import { useState } from "react";

export default function NozzleCalculator() {

  const [pressure, setPressure] = useState(4000);
  const [pressureUnit, setPressureUnit] = useState("psi");

  const [flow, setFlow] = useState(4);
  const [flowUnit, setFlowUnit] = useState("gpm");

  function psiFromInput() {
    return pressureUnit === "psi"
      ? pressure
      : pressure * 14.5038;
  }

  function gpmFromInput() {
    return flowUnit === "gpm"
      ? flow
      : flow * 0.264172;
  }

  function calculateNozzle() {

    const psi = psiFromInput();
    const gpm = gpmFromInput();

    if (!psi || !gpm) return "—";

    const q4000 = gpm * Math.sqrt(4000 / psi);
    const tip = Math.round(q4000 * 10);

    return tip.toString().padStart(3, "0");
  }

  const nozzle = calculateNozzle();

  return (
    <div className="min-h-screen bg-slate-100">

      <div className="mx-auto max-w-3xl px-4 py-16">

        <h1 className="text-4xl font-semibold text-slate-900">
          Pressure Washer Nozzle Size Calculator
        </h1>

        <p className="mt-4 text-slate-600">
          Calculate the correct pressure washer nozzle size based on pump
          pressure and flow rate.
        </p>

        <div className="mt-8 rounded-xl border bg-white p-6">

          {/* PRESSURE */}

          <label className="block text-sm font-medium text-slate-700">
            Pump Pressure
          </label>

          <div className="mt-2 flex gap-3">

            <input
              type="number"
              value={pressure}
              onChange={(e) => setPressure(Number(e.target.value))}
              className="w-full rounded-lg border px-3 py-2"
            />

            <select
              value={pressureUnit}
              onChange={(e) => setPressureUnit(e.target.value)}
              className="rounded-lg border px-3 py-2"
            >
              <option value="psi">PSI</option>
              <option value="bar">BAR</option>
            </select>

          </div>


          {/* FLOW */}

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Pump Flow
          </label>

          <div className="mt-2 flex gap-3">

            <input
              type="number"
              value={flow}
              onChange={(e) => setFlow(Number(e.target.value))}
              className="w-full rounded-lg border px-3 py-2"
            />

            <select
              value={flowUnit}
              onChange={(e) => setFlowUnit(e.target.value)}
              className="rounded-lg border px-3 py-2"
            >
              <option value="gpm">GPM</option>
              <option value="lpm">L/min</option>
            </select>

          </div>


          {/* RESULT */}

          <div className="mt-6 rounded-lg bg-slate-100 p-4">

            <div className="text-sm text-slate-600">
              Recommended Nozzle Size
            </div>

            <div className="mt-2 text-4xl font-semibold text-slate-900">
              {nozzle}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}