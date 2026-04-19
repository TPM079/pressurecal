import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import BackToTopButton from "../components/BackToTopButton";
import PressureCalLayout from "../components/PressureCalLayout";
import { roundTipCodeToFive } from "../pressurecal";

const flowHeaders = [
  { lpm: "7.6", gpm: "2" },
  { lpm: "9.5", gpm: "2.5" },
  { lpm: "11.4", gpm: "3" },
  { lpm: "13.2", gpm: "3.5" },
  { lpm: "15.1", gpm: "4" },
  { lpm: "17.0", gpm: "4.5" },
  { lpm: "18.9", gpm: "5" },
  { lpm: "20.8", gpm: "5.5" },
  { lpm: "22.7", gpm: "6" },
  { lpm: "24.6", gpm: "6.5" },
  { lpm: "26.5", gpm: "7" },
  { lpm: "28.4", gpm: "7.5" },
  { lpm: "30.3", gpm: "8" },
  { lpm: "34.1", gpm: "9" },
  { lpm: "37.9", gpm: "10" },
  { lpm: "45.4", gpm: "12" },
  { lpm: "56.8", gpm: "15" },
];

const examplePresets = [
  { label: "4000 PSI / 15 LPM", pressure: 276, flow: "15.1" },
  { label: "3000 PSI / 21 LPM", pressure: 207, flow: "20.8" },
  { label: "200 BAR / 15 LPM", pressure: 200, flow: "15.0" },
  { label: "250 BAR / 21 LPM", pressure: 250, flow: "20.8" },
  { label: "500 BAR / 30 LPM", pressure: 500, flow: "30.0" },
];

type FlowHeader = (typeof flowHeaders)[number];
type ChartRow = { psi: number; bar: number; values: string[] };
type FlowUnit = "lpm" | "gpm";
type PressureUnit = "bar" | "psi";

function psiFromBar(bar: number) {
  return Math.round(bar * 14.5037738);
}

function barFromPsi(psi: number) {
  return psi / 14.5037738;
}

function buildPressureRows(startBar: number, endBar: number, stepBar = 10) {
  const rows: Array<{ bar: number; psi: number }> = [];

  for (let bar = startBar; bar <= endBar; bar += stepBar) {
    rows.push({
      bar,
      psi: psiFromBar(bar),
    });
  }

  return rows;
}

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
): ChartRow[] {
  return pressures.map((pressure) => ({
    psi: pressure.psi,
    bar: pressure.bar,
    values: flows.map((flow) =>
      tipCodeFromFlowAndPressure(Number(flow.gpm), pressure.psi)
    ),
  }));
}

function buildCalculatorHref(pressureBar: number, flowLpm: string) {
  const params = new URLSearchParams({
    p: String(pressureBar),
    pu: "bar",
    f: flowLpm,
    fu: "lpm",
  });

  return `/nozzle-size-calculator?${params.toString()}`;
}

function buildChartHref(pressureBar: number, flowLpm: string) {
  const params = new URLSearchParams({
    p: String(pressureBar),
    pu: "bar",
    f: flowLpm,
    fu: "lpm",
  });

  const hash = pressureBar <= 350 ? "standard-chart" : "high-chart";
  return `/nozzle-size-chart?${params.toString()}#${hash}`;
}

function parsePositiveNumber(value: string | null) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toBar(value: number, unit: "psi" | "bar") {
  return unit === "bar" ? value : value / 14.5037738;
}

function toLpm(value: number, unit: "gpm" | "lpm") {
  return unit === "lpm" ? value : value * 3.785411784;
}

function toGpm(value: number, unit: FlowUnit) {
  return unit === "gpm" ? value : value / 3.785411784;
}

function formatNumber(value: number, dp = 1) {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(dp);
}

function formatRoundedLpm(value: number | string) {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

function nearestFlowHeaderLpm(flowLpm: number) {
  let closest = flowHeaders[0];
  let minDiff = Math.abs(Number(flowHeaders[0].lpm) - flowLpm);

  for (const header of flowHeaders) {
    const diff = Math.abs(Number(header.lpm) - flowLpm);
    if (diff < minDiff) {
      minDiff = diff;
      closest = header;
    }
  }

  return closest;
}

const standardPressureRows = buildPressureRows(70, 350, 10);
const highPressureRows = buildPressureRows(360, 500, 10);

const standardNozzleChart = buildChartRows(standardPressureRows, flowHeaders);
const highPressureNozzleChart = buildChartRows(highPressureRows, flowHeaders);

function ReferenceTable({
  title,
  subtitle,
  flowHeaders,
  rows,
  minWidthClass = "min-w-[1150px]",
  selectedRowIndex = null,
  selectedColIndex = null,
  copiedTipCode,
  onCopyTipCode,
  tableId,
}: {
  title: string;
  subtitle: string;
  flowHeaders: FlowHeader[];
  rows: ChartRow[];
  minWidthClass?: string;
  selectedRowIndex?: number | null;
  selectedColIndex?: number | null;
  copiedTipCode: string;
  onCopyTipCode: (tipCode: string) => void;
  tableId: string;
}) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [flashSelectedCell, setFlashSelectedCell] = useState(false);

  const selectedCellRef = useRef<HTMLTableCellElement | null>(null);

  useEffect(() => {
    if (
      selectedRowIndex !== null &&
      selectedColIndex !== null &&
      selectedCellRef.current
    ) {
      selectedCellRef.current.scrollIntoView({
        block: "center",
        inline: "center",
        behavior: "smooth",
      });

      setFlashSelectedCell(true);

      const timer = window.setTimeout(() => {
        setFlashSelectedCell(false);
      }, 1200);

      return () => window.clearTimeout(timer);
    }
  }, [selectedRowIndex, selectedColIndex]);

  return (
    <section
      id={tableId}
      className="rounded-3xl border border-slate-300 bg-white shadow-sm print:rounded-none print:border print:border-slate-300 print:shadow-none"
    >
      <div className="border-b border-slate-300 px-5 py-4 md:px-6 print:px-4 print:py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              PressureCal Technical Reference
            </div>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 print:text-xl">
              {title}
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 print:max-w-none print:text-xs print:leading-5">
              {subtitle}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 print:hidden">
            <div>
              <span className="font-semibold text-slate-800">Pressure:</span>{" "}
              PSI (BAR)
            </div>
            <div>
              <span className="font-semibold text-slate-800">Flow:</span> LPM
              (GPM)
            </div>
            <div>
              <span className="font-semibold text-slate-800">Output:</span>{" "}
              Tip code
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <table className={`${minWidthClass} w-full border-collapse print:min-w-0`}>
          <thead className="sticky top-0 z-30 print:static">
            <tr className="border-b border-slate-300 bg-slate-100">
              <th className="sticky left-0 z-30 border-r border-slate-300 bg-slate-100 px-4 py-4 text-left align-bottom print:static print:px-2 print:py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Pressure
                </div>
                <div className="mt-1 text-xs text-slate-500">PSI (BAR)</div>
              </th>

              {flowHeaders.map((flow, colIndex) => {
                const isColHovered = hoveredCol === colIndex;
                const isColSelected = selectedColIndex === colIndex;

                return (
                  <th
                    key={`${formatRoundedLpm(flow.lpm)}-${flow.gpm}`}
                    className={`border-r border-slate-200 px-2 py-3 text-center transition-colors last:border-r-0 print:px-1.5 print:py-2 ${
                      isColSelected
                        ? "bg-blue-200"
                        : isColHovered
                        ? "bg-blue-100"
                        : "bg-slate-100"
                    }`}
                    onMouseEnter={() => setHoveredCol(colIndex)}
                    onMouseLeave={() => setHoveredCol(null)}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-700 print:text-[10px]">
                      Flow Rate
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 print:text-xs">
                      {formatRoundedLpm(flow.lpm)}
                    </div>
                    <div className="text-xs text-slate-500 print:text-[10px]">
                      ({flow.gpm})
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => {
              const baseRowBg =
                rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60";
              const isRowHovered = hoveredRow === rowIndex;
              const isRowSelected = selectedRowIndex === rowIndex;

              return (
                <tr
                  key={`${row.psi}-${row.bar}`}
                  className={`${baseRowBg} transition-colors ${
                    isRowSelected
                      ? "bg-blue-100/70"
                      : isRowHovered
                      ? "bg-blue-50"
                      : ""
                  }`}
                  onMouseEnter={() => setHoveredRow(rowIndex)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td
                    className={`sticky left-0 z-10 border-r border-b border-slate-300 px-3 py-3 transition-colors print:static print:px-2 print:py-2 ${
                      isRowSelected
                        ? "bg-blue-200"
                        : isRowHovered
                        ? "bg-blue-100"
                        : "bg-slate-100"
                    }`}
                  >
                    <div
                      className={`font-mono text-sm ${
                        isRowSelected
                          ? "font-bold text-slate-900"
                          : "font-semibold text-slate-900"
                      } print:text-xs`}
                    >
                      {row.psi}
                    </div>
                    <div className="text-xs text-slate-500 print:text-[10px]">
                      ({row.bar})
                    </div>
                  </td>

                  {row.values.map((value, colIndex) => {
                    const isColHovered = hoveredCol === colIndex;
                    const isColSelected = selectedColIndex === colIndex;
                    const isCellHovered = isRowHovered && isColHovered;
                    const isCellSelected =
                      selectedRowIndex === rowIndex &&
                      selectedColIndex === colIndex;
                    const isCopied = copiedTipCode === value;

                    const calculatorHref = buildCalculatorHref(
                      row.bar,
                      flowHeaders[colIndex].lpm
                    );

                    return (
                      <td
                        key={`${row.psi}-${colIndex}`}
                        ref={isCellSelected ? selectedCellRef : null}
                        className={`relative border-b border-r border-slate-300 text-center font-mono text-sm font-semibold transition-colors last:border-r-0 print:px-1.5 print:py-1.5 print:text-xs ${
                          isCellSelected
                            ? `bg-blue-500 text-white ring-2 ring-blue-700 shadow-lg ${
                                flashSelectedCell ? "pressurecal-cell-flash" : ""
                              }`
                            : isCellHovered
                            ? "bg-blue-200 text-slate-900"
                            : isRowSelected || isColSelected
                            ? "bg-blue-100 text-slate-900"
                            : isRowHovered || isColHovered
                            ? "bg-blue-50 text-slate-900"
                            : "text-slate-900"
                        }`}
                        onMouseEnter={() => {
                          setHoveredRow(rowIndex);
                          setHoveredCol(colIndex);
                        }}
                        onMouseLeave={() => {
                          setHoveredRow(null);
                          setHoveredCol(null);
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onCopyTipCode(value);
                            window.open(
                              calculatorHref,
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }}
                          className="w-full px-2 py-2"
                          title="Copy tip code and open calculator"
                        >
                          {value}
                        </button>

                        {isCopied && (
                          <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow print:hidden">
                            Copied
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-300 bg-slate-50 px-5 py-4 md:px-6 print:px-4 print:py-3">
        <div className="grid gap-3 text-xs leading-5 text-slate-600 md:grid-cols-2 print:grid-cols-1">
          <p>
            <span className="font-semibold text-slate-800">
              Reference basis:
            </span>{" "}
            Tip codes are generated using the same PressureCal sizing logic as
            the live nozzle calculator.
          </p>
          <p>
            <span className="font-semibold text-slate-800">
              Tip code convention:
            </span>{" "}
            PressureCal displays tip size using the common pressure-washer
            nozzle code style.
          </p>
        </div>
      </div>
    </section>
  );
}

function TechnicalNotesPanel() {
  return (
    <section className="rounded-3xl border border-slate-300 bg-white shadow-sm">
      <div className="border-b border-slate-300 px-5 py-4 md:px-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Notes
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
          How to Use This Chart
        </h2>
      </div>

      <div className="space-y-4 px-5 py-5 text-sm leading-6 text-slate-600 md:px-6">
        <p>
          Use this chart as a <strong className="text-slate-900">quick field reference</strong>
          {" "}for single-nozzle pressure washer setups. Match your machine pressure on the
          left, then move across to your flow column to find the recommended tip code.
        </p>

        <p>
          PressureCal shows <strong className="text-slate-900">PSI and LPM first</strong>,
          with BAR and GPM still visible for cross-checking mixed-spec equipment, manuals,
          and parts lists.
        </p>

        <p>
          If you are working with a <strong className="text-slate-900">surface cleaner or other
          multi-nozzle tool</strong>, divide total machine flow by the number of nozzles first.
          The chart should be used on a <strong className="text-slate-900">per-nozzle basis</strong>,
          not on total machine flow.
        </p>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <span className="font-semibold">Example:</span> A 30 LPM machine with a
          2-nozzle surface cleaner delivers 15 LPM per nozzle, so each nozzle should
          be selected from the 15 LPM column.
        </div>

        <p className="text-xs text-slate-500">
          These values are intended as a fast technical reference. Real-world operating
          pressure can still vary due to hose length, hose ID, fittings, unloader setting,
          wear, and water supply conditions.
        </p>
      </div>
    </section>
  );
}

function ExamplePanel() {
  return (
    <section className="rounded-3xl border border-slate-300 bg-white shadow-sm">
      <div className="border-b border-slate-300 px-5 py-4 md:px-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Worked Example
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
          Example Lookup
        </h2>
      </div>

      <div className="space-y-5 px-5 py-5 md:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Machine Pressure
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              4000 PSI
            </div>
            <div className="mt-1 text-sm text-slate-500">(276 BAR)</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Machine Flow
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              15.1 LPM
            </div>
            <div className="mt-1 text-sm text-slate-500">(4 GPM)</div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-800">
            Recommended Tip Code
          </div>
          <div className="mt-2 text-4xl font-bold tracking-tight text-blue-950">
            040
          </div>
          <p className="mt-3 text-sm leading-6 text-blue-900">
            Locate <strong>4000 PSI (276 BAR)</strong> on the left-hand pressure column,
            then move across to <strong>15 LPM (4 GPM)</strong>. The intersection
            gives a recommended tip code of <strong>040</strong>.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/nozzle-size-calculator?p=276&pu=bar&f=15.1&fu=lpm"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Open in Calculator
            </Link>
            <Link
              to={buildChartHref(276, "15.1")}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Highlight in Chart
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function PresetExamples() {
  return (
    <section className="rounded-3xl border border-slate-300 bg-white shadow-sm print:hidden">
      <div className="border-b border-slate-300 px-5 py-4 md:px-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Quick Examples
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
          Popular Setup Shortcuts
        </h2>
      </div>

      <div className="px-5 py-5 md:px-6">
        <p className="mb-4 text-sm leading-6 text-slate-600">
          Use these presets to jump straight to common machine pressure and flow combinations. PressureCal keeps PSI and LPM first, with BAR and GPM still available for reference.
        </p>

        <div className="flex flex-wrap gap-3">
          {examplePresets.map((preset) => (
            <Link
              key={preset.label}
              to={buildChartHref(preset.pressure, preset.flow)}
              className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
            >
              {preset.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function SurfaceCleanerHelper() {
  const [pressure, setPressure] = useState<number>(4000);
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>("psi");
  const [totalFlow, setTotalFlow] = useState<number>(30.3);
  const [flowUnit, setFlowUnit] = useState<FlowUnit>("lpm");
  const [nozzleCount, setNozzleCount] = useState<number>(2);

  const pressureBar = useMemo(() => {
    if (!(pressure > 0)) return 0;
    return pressureUnit === "bar" ? pressure : barFromPsi(pressure);
  }, [pressure, pressureUnit]);

  const pressurePsi = useMemo(() => {
    if (!(pressure > 0)) return 0;
    return pressureUnit === "psi" ? pressure : psiFromBar(pressure);
  }, [pressure, pressureUnit]);

  const totalFlowLpm = useMemo(
    () => toLpm(totalFlow, flowUnit),
    [totalFlow, flowUnit]
  );

  const totalFlowGpm = useMemo(
    () => toGpm(totalFlow, flowUnit),
    [totalFlow, flowUnit]
  );

  const perNozzleLpm = useMemo(() => {
    if (!(nozzleCount > 0)) return 0;
    return totalFlowLpm / nozzleCount;
  }, [totalFlowLpm, nozzleCount]);

  const perNozzleGpm = useMemo(() => {
    if (!(nozzleCount > 0)) return 0;
    return totalFlowGpm / nozzleCount;
  }, [totalFlowGpm, nozzleCount]);

  const nearestFlow = useMemo(
    () => nearestFlowHeaderLpm(perNozzleLpm),
    [perNozzleLpm]
  );

  const roundedPressureBar = useMemo(() => {
    if (!(pressureBar > 0)) return 0;
    return Math.round(pressureBar / 10) * 10;
  }, [pressureBar]);

  const pressureRoundingNote = useMemo(() => {
    if (!(pressure > 0) || !(pressureBar > 0)) return "";

    const sourceText =
      pressureUnit === "psi"
        ? `${formatNumber(pressure, 0)} PSI (${formatNumber(
            pressureBar,
            1
          )} BAR)`
        : `${Math.round(psiFromBar(pressure))} PSI (${formatNumber(pressure, 1)} BAR)`;

    if (Math.abs(roundedPressureBar - pressureBar) < 0.05) {
      return `${sourceText}, using ${Math.round(pressurePsi)} PSI (${roundedPressureBar} BAR) chart row.`;
    }

    return `${sourceText}, rounded to ${Math.round(pressurePsi)} PSI (${roundedPressureBar} BAR) chart row.`;
  }, [pressure, pressureUnit, pressureBar, roundedPressureBar]);

  const highlightedChartHref = useMemo(
    () => buildChartHref(roundedPressureBar, nearestFlow.lpm),
    [roundedPressureBar, nearestFlow.lpm]
  );

  const calculatorHref = useMemo(
    () => buildCalculatorHref(roundedPressureBar, nearestFlow.lpm),
    [roundedPressureBar, nearestFlow.lpm]
  );

  const estimatedTipCode = useMemo(() => {
    if (!(pressurePsi > 0) || !(perNozzleGpm > 0)) return "—";
    return tipCodeFromFlowAndPressure(perNozzleGpm, pressurePsi);
  }, [pressurePsi, perNozzleGpm]);

  return (
    <section className="rounded-3xl border border-slate-300 bg-white shadow-sm print:hidden">
      <div className="border-b border-slate-300 px-5 py-4 md:px-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Surface Cleaner Helper
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
          Surface Cleaner Per-Nozzle Helper
        </h2>
      </div>

      <div className="space-y-6 px-5 py-5 md:px-6">
        <p className="text-sm leading-6 text-slate-600">
          For surface cleaners and other multi-nozzle tools, divide total machine flow by the number of nozzles first. PressureCal then uses per-nozzle flow to point you to the closest chart column and recommended tip code.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Machine Pressure
            </label>
            <div className="mt-2 flex gap-3">
              <input
                type="number"
                value={pressure}
                onChange={(e) => setPressure(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
              />
              <select
                value={pressureUnit}
                onChange={(e) =>
                  setPressureUnit(e.target.value as PressureUnit)
                }
                className="rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
              >
                <option value="psi">PSI</option>
                <option value="bar">BAR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Total Machine Flow
            </label>
            <div className="mt-2 flex gap-3">
              <input
                type="number"
                step="0.1"
                value={totalFlow}
                onChange={(e) => setTotalFlow(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
              />
              <select
                value={flowUnit}
                onChange={(e) => setFlowUnit(e.target.value as FlowUnit)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
              >
                <option value="lpm">LPM</option>
                <option value="gpm">GPM</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Number of Nozzles
            </label>
            <div className="mt-2">
              <input
                type="number"
                min="1"
                step="1"
                value={nozzleCount}
                onChange={(e) => setNozzleCount(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Per-Nozzle Result
            </div>

            <div className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              {formatRoundedLpm(perNozzleLpm)} LPM
            </div>

            <div className="mt-2 text-sm text-slate-600">
              ({formatNumber(perNozzleGpm, 2)} GPM) per nozzle
            </div>

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                Estimated Tip Code
              </div>
              <div className="mt-2 text-3xl font-bold tracking-tight text-blue-950">
                {estimatedTipCode}
              </div>
              <p className="mt-2 text-sm leading-6 text-blue-900">
                Chart uses nearest available column:{" "}
                <strong>{formatRoundedLpm(nearestFlow.lpm)} LPM</strong> ({nearestFlow.gpm} GPM)
              </p>
              <p className="mt-2 text-sm leading-6 text-blue-900">
                Nearest chart row: <strong>{Math.round(pressurePsi)} PSI</strong> ({roundedPressureBar} BAR)
              </p>
              <p className="mt-2 text-sm leading-6 text-blue-900">
                {pressureRoundingNote}
              </p>
              <p className="mt-2 text-sm leading-6 text-blue-900">
                Chart lookup pair: <strong>{Math.round(pressurePsi)} PSI ({roundedPressureBar} BAR)</strong> ×{" "}
                <strong>{formatRoundedLpm(nearestFlow.lpm)} LPM</strong> →{" "}
                <strong>{estimatedTipCode}</strong>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Quick Actions
            </div>

            <div className="mt-4 space-y-3">
              <Link
                to={highlightedChartHref}
                className="flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Highlight in Chart
              </Link>

              <Link
                to={calculatorHref}
                className="flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open in Calculator
              </Link>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Example: a machine delivering{" "}
              <strong>{formatRoundedLpm(totalFlowLpm)} LPM</strong> through{" "}
              <strong>{nozzleCount}</strong> nozzles gives{" "}
              <strong>{formatRoundedLpm(perNozzleLpm)} LPM</strong> per nozzle.
            </p>
          </div>
        </div>
      </div>
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
    <section className="rounded-3xl border border-slate-300 bg-white shadow-sm">
      <div className="border-b border-slate-300 px-5 py-4 md:px-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Spray Pattern Reference
        </div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Pressure Washer Nozzle Colour Guide
        </h2>
      </div>

      <div className="px-5 py-5 md:px-6">
        <p className="mb-5 text-sm leading-6 text-slate-600">
          Spray tips are commonly colour coded to indicate spray angle. The
          angle influences impact concentration and coverage width.
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Colour
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Spray Angle
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Typical Use
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.angle}
                  className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                >
                  <td className="border-b border-slate-200 px-4 py-3 text-slate-900">
                    {row.color}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-3 text-slate-700">
                    {row.angle}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-3 text-slate-700">
                    {row.use}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function SEOContentBlocks() {
  return (
    <section className="space-y-8 print:hidden">
      <section className="rounded-3xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-300 px-5 py-4 md:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Why this nozzle size chart is useful
          </h2>
        </div>

        <div className="space-y-4 px-5 py-5 text-sm leading-7 text-slate-600 md:px-6">
          <p>
            This pressure washer nozzle size chart is built for fast field lookup.
            If you already know your machine pressure and flow, you can use it to
            match a nozzle tip code in seconds without guessing.
          </p>

          <p>
            PressureCal shows <strong>PSI and LPM first</strong>, with BAR and GPM
            still visible for cross-checking equipment that uses mixed specs. That
            makes it easier to compare machines, manuals, pumps, and nozzle data
            without constantly converting units.
          </p>

          <p>
            The chart uses the same sizing logic as the live PressureCal nozzle
            calculator, so it works as a proper reference page rather than a generic
            static table.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-300 px-5 py-4 md:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            How to use the chart
          </h2>
        </div>

        <div className="space-y-4 px-5 py-5 text-sm leading-7 text-slate-600 md:px-6">
          <p>
            Start with your machine pressure on the left-hand column, then move across
            to your flow column. The intersecting value is the recommended tip code for
            a single-nozzle setup.
          </p>

          <p>
            If you are using a surface cleaner, dual lance, or another multi-nozzle tool,
            divide total machine flow by the number of nozzles first. The chart should be
            read using <strong>per-nozzle flow</strong>, not total machine flow.
          </p>

          <p>
            When in doubt, use the chart for the quick answer and the live calculator for
            the more exact answer.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-300 px-5 py-4 md:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Common example
          </h2>
        </div>

        <div className="space-y-4 px-5 py-5 text-sm leading-7 text-slate-600 md:px-6">
          <p>
            A common professional setup is <strong>4000 PSI and 15 LPM</strong>.
            In the chart, that lands on a <strong>040</strong> tip code.
          </p>

          <p>
            That is why 4000 PSI / 15 LPM is such a useful reference point for
            operators comparing machines, nozzles, and setup changes.
          </p>

          <div>
            <Link
              to="/nozzle-size-calculator?p=276&pu=bar&f=15.1&fu=lpm"
              className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Open 4000 PSI / 15.1 LPM in Calculator
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-300 px-5 py-4 md:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            FAQ
          </h2>
        </div>

        <div className="space-y-4 px-5 py-5 text-sm leading-7 text-slate-600 md:px-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              How do I choose the right pressure washer nozzle size?
            </h3>
            <p className="mt-2">
              Match both machine pressure and machine flow. Choosing a nozzle based
              on only one number can lead to poor cleaning performance or the wrong
              operating pressure.
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-900">
              What if my machine uses BAR and LPM instead of PSI and GPM?
            </h3>
            <p className="mt-2">
              That is fine. PressureCal still shows BAR and GPM, but keeps PSI and
              LPM clearly visible so operators can compare across different specs.
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Is this chart enough for every setup?
            </h3>
            <p className="mt-2">
              Not always. The chart is best for quick nozzle selection. If you also
              need to account for hose loss, at-gun pressure, or full setup behaviour,
              use the live PressureCal calculators.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-300 px-5 py-4 md:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Related tools
          </h2>
        </div>

        <div className="space-y-4 px-5 py-5 text-sm leading-7 text-slate-600 md:px-6">
          <p>
            Need a more exact answer? Move from quick reference into the live tools:
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/nozzle-size-calculator"
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Nozzle Size Calculator
            </Link>
            <Link
              to="/hose-pressure-loss-calculator"
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Hose Pressure Loss Calculator
            </Link>
            <Link
              to="/calculator"
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Full Setup Calculator
            </Link>
          </div>
        </div>
      </section>
    </section>
  );
}

export default function NozzleSizeChartPage() {
  const location = useLocation();
  const [copiedTipCode, setCopiedTipCode] = useState("");
  const copiedTimerRef = useRef<number | null>(null);

  const selectedCell = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const pressureValue = parsePositiveNumber(params.get("p"));
    const flowValue = parsePositiveNumber(params.get("f"));
    const pressureUnit = params.get("pu") === "psi" ? "psi" : "bar";
    const flowUnit = params.get("fu") === "gpm" ? "gpm" : "lpm";

    if (!pressureValue || !flowValue) return null;

    const pressureBar = toBar(pressureValue, pressureUnit);
    const flowLpm = toLpm(flowValue, flowUnit);

    const roundedBar = Math.round(pressureBar / 10) * 10;

    const rowSource =
      roundedBar <= 350 ? standardPressureRows : highPressureRows;
    const rowIndex = rowSource.findIndex((row) => row.bar === roundedBar);

    const roundedFlowLpm = Math.round(flowLpm * 10) / 10;
    const colIndex = flowHeaders.findIndex(
      (flow) => Math.abs(Number(flow.lpm) - roundedFlowLpm) < 0.2
    );

    if (rowIndex < 0 || colIndex < 0) return null;

    return {
      table: roundedBar <= 350 ? "standard" : "high",
      rowIndex,
      colIndex,
      pressureBar: roundedBar,
      flowLpm: roundedFlowLpm,
    };
  }, [location.search]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  function handlePrint() {
    window.print();
  }

  async function handleCopyTipCode(tipCode: string) {
    try {
      await navigator.clipboard.writeText(tipCode);
      setCopiedTipCode(tipCode);

      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }

      copiedTimerRef.current = window.setTimeout(() => {
        setCopiedTipCode("");
      }, 1600);
    } catch {
      window.prompt("Copy this tip code:", tipCode);
    }
  }

  return (
    <>
      <Helmet>
  <title>Pressure Washer Nozzle Size Chart | PSI, LPM, BAR & GPM | PressureCal</title>
  <meta
    name="description"
    content="Use this pressure washer nozzle size chart to match nozzle tips to PSI and LPM, compare common sizes, and choose a suitable nozzle for your pressure washer setup."
  />
  <link
    rel="canonical"
    href="https://www.pressurecal.com/nozzle-size-chart"
  />
  <meta
    property="og:title"
    content="Pressure Washer Nozzle Size Chart | PSI, LPM, BAR & GPM | PressureCal"
  />
  <meta
    property="og:description"
    content="Use this pressure washer nozzle size chart to match nozzle tips to PSI and LPM, compare common sizes, and choose a suitable nozzle for your pressure washer setup."
  />
  <meta
    property="og:url"
    content="https://www.pressurecal.com/nozzle-size-chart"
  />
  <meta property="og:type" content="website" />
  <meta
    name="twitter:title"
    content="Pressure Washer Nozzle Size Chart | PSI, LPM, BAR & GPM | PressureCal"
  />
  <meta
    name="twitter:description"
    content="Use this pressure washer nozzle size chart to match nozzle tips to PSI and LPM, compare common sizes, and choose a suitable nozzle for your pressure washer setup."
  />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Pressure Washer Nozzle Size Chart",
      url: "https://www.pressurecal.com/nozzle-size-chart",
      description:
        "Pressure washer nozzle size chart for matching nozzle tips to PSI and LPM, comparing common sizes, and choosing a suitable nozzle for your pressure washer setup.",
    })}
  </script>
</Helmet>

      <PressureCalLayout>
        <main className="-mx-4 -my-8 bg-slate-100 print:bg-white sm:-my-10">
          <section className="border-b border-slate-200 bg-white print:hidden">
            <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-12">
              <div className="max-w-4xl">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  PressureCal Quick Reference
                </div>

                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
  Pressure Washer Nozzle Size Chart
</h1>

<p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
  Use this pressure washer nozzle size chart to match nozzle tips to PSI and LPM first, compare common sizes, and move into the live calculator when you need a more exact answer.
</p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/nozzle-size-calculator"
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Open Nozzle Calculator
                  </Link>
                  <a
                    href="#standard-chart"
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Jump to Chart
                  </a>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Print / Save PDF
                  </button>
                </div>

                {selectedCell && (
                  <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
                    Highlighted from your link:{" "}
                    <strong>{selectedCell.pressureBar} BAR</strong> and{" "}
                    <strong>{formatRoundedLpm(selectedCell.flowLpm)} LPM</strong>.
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10 print:max-w-none print:px-0 print:py-0">
            <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr] print:hidden">
              <TechnicalNotesPanel />
              <ExamplePanel />
            </div>

            <div className="mt-8 print:hidden">
              <PresetExamples />
            </div>

            <div className="mt-8 print:hidden">
              <SurfaceCleanerHelper />
            </div>

            <div id="standard-chart" className="mt-8 print:mt-0">
              <ReferenceTable
                title="Standard Pressure Washer Nozzle Reference Table"
                subtitle="Quick reference chart for standard single-nozzle pressure washer setups from 70 BAR to 350 BAR, with pressure shown as PSI (BAR) and flow shown as LPM (GPM)."
                flowHeaders={flowHeaders}
                rows={standardNozzleChart}
                minWidthClass="min-w-[1150px]"
                selectedRowIndex={
                  selectedCell?.table === "standard" ? selectedCell.rowIndex : null
                }
                selectedColIndex={
                  selectedCell?.table === "standard" ? selectedCell.colIndex : null
                }
                copiedTipCode={copiedTipCode}
                onCopyTipCode={handleCopyTipCode}
                tableId="standard-reference-table"
              />
            </div>

            <div id="high-chart" className="mt-8 print:mt-6">
              <ReferenceTable
                title="High Pressure / Industrial Nozzle Reference Table"
                subtitle="Quick reference chart for higher-pressure single-nozzle setups from 360 BAR to 500 BAR, with pressure shown as PSI (BAR) and flow shown as LPM (GPM)."
                flowHeaders={flowHeaders}
                rows={highPressureNozzleChart}
                minWidthClass="min-w-[1150px]"
                selectedRowIndex={
                  selectedCell?.table === "high" ? selectedCell.rowIndex : null
                }
                selectedColIndex={
                  selectedCell?.table === "high" ? selectedCell.colIndex : null
                }
                copiedTipCode={copiedTipCode}
                onCopyTipCode={handleCopyTipCode}
                tableId="high-reference-table"
              />
            </div>

            <div className="mt-8 print:hidden">
              <NozzleColourGuide />
            </div>

            <div className="mt-8 print:hidden">
              <SEOContentBlocks />
            </div>

            <section className="mt-8 rounded-3xl border border-slate-300 bg-white shadow-sm print:hidden">
              <div className="border-b border-slate-300 px-5 py-4 md:px-6">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Calculator
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  Need a more exact answer?
                </h2>
              </div>

              <div className="px-5 py-5 md:px-6">
                <p className="max-w-3xl text-sm leading-6 text-slate-600">
                  These tables are built for fast field reference. For custom inputs, unusual machine setups, or direct link sharing, use the PressureCal nozzle size calculator.
                </p>

                <div className="mt-5">
                  <Link
                    to="/nozzle-size-calculator"
                    className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Go to Nozzle Size Calculator
                  </Link>
                </div>
              </div>
            </section>
          </div>

          <div className="print:hidden">
            <BackToTopButton />
          </div>
        </main>
      </PressureCalLayout>
    </>
  );
}

