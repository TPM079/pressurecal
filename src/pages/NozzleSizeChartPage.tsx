import { useEffect } from "react";
import { Link } from "react-router-dom";
import BackToTopButton from "../components/BackToTopButton";
import { roundTipCodeToFive } from "../pressurecal";

const standardFlowHeaders = [
  { lpm: "7.6", gpm: "2" },
  { lpm: "11.4", gpm: "3" },
  { lpm: "15.1", gpm: "4" },
  { lpm: "18.9", gpm: "5" },
  { lpm: "22.7", gpm: "6" },
  { lpm: "26.5", gpm: "7" },
  { lpm: "30.3", gpm: "8" },
  { lpm: "34.1", gpm: "9" },
  { lpm: "37.9", gpm: "10" },
  { lpm: "45.4", gpm: "12" },
  { lpm: "56.8", gpm: "15" },
];

const highPressureFlowHeaders = [
  { lpm: "10", gpm: "2.6" },
  { lpm: "15", gpm: "4.0" },
  { lpm: "20", gpm: "5.3" },
  { lpm: "25", gpm: "6.6" },
  { lpm: "30", gpm: "7.9" },
  { lpm: "40", gpm: "10.6" },
  { lpm: "50", gpm: "13.2" },
  { lpm: "60", gpm: "15.9" },
];

function tipCodeFromFlowAndPressure(flowGpm: number, pressurePsi: number) {
  if (!(pressurePsi > 0) || !(flowGpm > 0)) return "—";

  const q4000 = flowGpm * Math.sqrt(4000 / pressurePsi);
  const rawTip = Math.round(q4000 * 10)
    .toString()
    .padStart(3, "0");

  return roundTipCodeToFive(rawTip);
}

function buildChartRows(
  pressures: Array<{ psi: number; bar: number }>,
  flows: Array<{ gpm: string; lpm: string }>
) {
  return pressures.map((pressure) => ({
    psi: pressure.psi,
    bar: pressure.bar,
    values: flows.map((flow) =>
      tipCodeFromFlowAndPressure(Number(flow.gpm), pressure.psi)
    ),
  }));
}

const standardPressureRows = [
  { psi: 1000, bar: 69 },
  { psi: 1500, bar: 103 },
  { psi: 2000, bar: 138 },
  { psi: 2500, bar: 172 },
  { psi: 3000, bar: 207 },
  { psi: 3500, bar: 241 },
  { psi: 4000, bar: 276 },
  { psi: 4500, bar: 310 },
  { psi: 5000, bar: 345 },
];

const highPressureRows = [
  { psi: 1450, bar: 100 },
  { psi: 2175, bar: 150 },
  { psi: 2900, bar: 200 },
  { psi: 3625, bar: 250 },
  { psi: 4350, bar: 300 },
  { psi: 5075, bar: 350 },
  { psi: 5800, bar: 400 },
  { psi: 6525, bar: 450 },
  { psi: 7250, bar: 500 },
];

const standardNozzleChart = buildChartRows(
  standardPressureRows,
  standardFlowHeaders
);

const highPressureNozzleChart = buildChartRows(
  highPressureRows,
  highPressureFlowHeaders
);

function ChartTable({
  title,
  subtitle,
  flowHeaders,
  rows,
  minWidthClass = "min-w-[1100px]",
}: {
  title: string;
  subtitle: string;
  flowHeaders: { lpm: string; gpm: string }[];
  rows: { psi: number; bar: number; values: string[] }[];
  minWidthClass?: string;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{subtitle}</p>
        <p className="mt-2 text-xs text-zinc-500">
          Pressure: PSI (BAR) · Flow: LPM (GPM)
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className={`${minWidthClass} w-full border-collapse text-sm`}>
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="sticky left-0 bg-white px-4 py-3 text-left font-semibold text-zinc-700">
                PSI
                <div className="text-xs font-normal text-zinc-500">(BAR)</div>
              </th>
              {flowHeaders.map((flow) => (
                <th
                  key={`${flow.lpm}-${flow.gpm}`}
                  className="px-4 py-3 text-center font-semibold text-zinc-700"
                >
                  {flow.lpm}
                  <div className="text-xs font-normal text-zinc-500">
                    ({flow.gpm})
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.psi}-${row.bar}`}
                className="border-b border-zinc-100 last:border-b-0"
              >
                <td className="sticky left-0 bg-white px-4 py-3 font-semibold text-zinc-900">
                  {row.psi}
                  <div className="text-xs font-normal text-zinc-500">
                    ({row.bar})
                  </div>
                </td>

                {row.values.map((value, idx) => (
                  <td
                    key={`${row.psi}-${idx}`}
                    className="px-4 py-3 text-center font-medium text-zinc-700"
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExampleCard() {
  return (
    <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm md:p-6">
      <h2 className="text-xl font-semibold text-blue-950">Example Setup</h2>
      <div className="mt-4 space-y-1 text-sm text-blue-900">
        <p>
          Machine Pressure: <strong>4000 PSI</strong>
        </p>
        <p>
          Machine Flow: <strong>4 GPM</strong>
        </p>
      </div>

      <div className="mt-5">
        <p className="text-sm text-blue-800">Recommended Nozzle Size</p>
        <p className="text-4xl font-bold tracking-tight text-blue-950">040</p>
      </div>

      <p className="mt-4 text-sm leading-6 text-blue-900">
        Find <strong>4000 (276)</strong> on the left, then move across to{" "}
        <strong>15.1 (4)</strong> in the top row. Where they intersect, the
        chart shows <strong>040</strong>.
      </p>
    </section>
  );
}

function HowToReadSection() {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
        How to Read the Nozzle Size Chart
      </h2>

      <ol className="mt-4 space-y-4 text-sm leading-6 text-zinc-600">
        <li>
          <strong className="text-zinc-900">1. Find your machine pressure.</strong>{" "}
          Look down the left column to locate your machine pressure. Pressure is
          shown as <strong>PSI (BAR)</strong>.
        </li>
        <li>
          <strong className="text-zinc-900">2. Find your machine flow rate.</strong>{" "}
          Look across the top row to locate your flow rate. Flow is shown as{" "}
          <strong>LPM (GPM)</strong>.
        </li>
        <li>
          <strong className="text-zinc-900">3. Read the nozzle size.</strong> The
          value where the pressure row and flow column intersect is the
          recommended nozzle orifice size.
        </li>
      </ol>
    </section>
  );
}

function NozzleColourGuide() {
  const rows = [
    {
      color: "🔴 Red",
      angle: "0°",
      use: "Pencil jet, heavy buildup, stubborn stains",
    },
    {
      color: "🟡 Yellow",
      angle: "15°",
      use: "Heavy cleaning and stripping",
    },
    {
      color: "🟢 Green",
      angle: "25°",
      use: "General purpose cleaning",
    },
    {
      color: "⚪ White",
      angle: "40°",
      use: "Light cleaning, vehicles, delicate surfaces",
    },
    {
      color: "⚫ Black",
      angle: "65°",
      use: "Soap and detergent application",
    },
  ];

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Pressure Washer Nozzle Colour Guide
      </h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Spray tips are commonly colour coded to indicate spray angle. The angle
        affects how concentrated or wide the spray pattern is.
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">
                Colour
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">
                Spray Angle
              </th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">
                Typical Use
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.angle}
                className="border-b border-zinc-100 last:border-b-0"
              >
                <td className="px-4 py-3 text-zinc-900">{row.color}</td>
                <td className="px-4 py-3 text-zinc-700">{row.angle}</td>
                <td className="px-4 py-3 text-zinc-700">{row.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function NozzleSizeChartPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="/" className="inline-flex items-center">
            <img
              src="/PressureCal_primary_logo.png"
              alt="PressureCal"
              className="h-14 w-auto sm:h-16"
            />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <section className="mx-auto max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
            PressureCal Reference Guide
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
            Pressure Washer Nozzle Size Chart
          </h1>

          <p className="mt-4 text-base leading-7 text-zinc-600">
            This pressure washer nozzle size chart helps operators quickly
            determine the correct spray tip based on machine pressure and flow
            rate. Selecting the proper nozzle size helps your pump operate at the
            correct pressure while delivering the expected cleaning performance.
          </p>

          <p className="mt-4 text-base leading-7 text-zinc-600">
            Use the charts below to match your machine’s{" "}
            <strong>pressure (PSI or BAR)</strong> with its{" "}
            <strong>flow rate (LPM or GPM)</strong>. The intersection shows the
            recommended nozzle orifice size.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/nozzle-size-calculator"
              className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Open Nozzle Calculator
            </Link>
            <a
              href="#standard-chart"
              className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Jump to Chart
            </a>
          </div>
        </section>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
          <HowToReadSection />
          <ExampleCard />
        </div>

        <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm md:p-6">
          <h2 className="text-xl font-semibold text-amber-950">
            Important Note for Surface Cleaners and Multi-Nozzle Setups
          </h2>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            Tip sizes shown in these charts are for{" "}
            <strong>single-nozzle systems</strong>. For surface cleaners or
            multi-nozzle setups, divide the total machine flow by the number of
            nozzles before selecting the tip size.
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Example: an <strong>8 GPM</strong> machine using a{" "}
            <strong>2-nozzle</strong> surface cleaner delivers{" "}
            <strong>4 GPM per nozzle</strong>, so you would select tips based on{" "}
            <strong>4 GPM</strong>.
          </p>
        </section>

        <div id="standard-chart" className="mt-10">
          <ChartTable
            title="Standard Pressure Washer Nozzle Chart"
            subtitle="Quick reference chart for standard single-nozzle pressure washer setups from 1000 PSI to 5000 PSI."
            flowHeaders={standardFlowHeaders}
            rows={standardNozzleChart}
            minWidthClass="min-w-[1120px]"
          />
        </div>

        <div className="mt-10">
          <ChartTable
            title="High Pressure / Industrial Nozzle Chart"
            subtitle="Quick reference chart for higher-pressure single-nozzle setups from 100 BAR to 500 BAR."
            flowHeaders={highPressureFlowHeaders}
            rows={highPressureNozzleChart}
            minWidthClass="min-w-[920px]"
          />
        </div>

        <div className="mt-10">
          <NozzleColourGuide />
        </div>

        <section className="mt-10 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Need an Exact Result?
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
            These charts are designed for quick field reference. For custom
            inputs, unusual machine setups, or more exact sizing, use the
            PressureCal nozzle calculator.
          </p>

          <div className="mt-5">
            <Link
              to="/nozzle-size-calculator"
              className="inline-flex rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Go to Nozzle Size Calculator
            </Link>
          </div>
        </section>

        <BackToTopButton />
      </main>
    </>
  );
}