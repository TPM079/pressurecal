import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import { Link } from "react-router-dom";
import BackToTopButton from "../components/BackToTopButton";
import CalculationExplainer from "../components/CalculationExplainer";
import CompactCurrentVsSavedComparePanel from "../components/CompactCurrentVsSavedComparePanel";
import PressureCalLayout from "../components/PressureCalLayout";
import { useProAccess } from "../hooks/useProAccess";
import { useSavedSetups } from "../hooks/useSavedSetups";
import { buildFullRigSearchParams, parseRigSearchParams } from "../lib/rigUrlState";
import { buildFullSetupShareUrl } from "../lib/fullSetupShareLinks";
import {
  copyTextToClipboard,
  createShortShareLink,
  shareUrlWithNavigator,
} from "../lib/shareLinks";
import { trackEvent } from "../lib/analytics";
import { solvePressureCal, barFromPsi, lpmFromGpm, roundTipCodeToFive } from "../pressurecal";
import type { Inputs, PressureUnit, FlowUnit, LengthUnit, HoseSetupMode } from "../pressurecal";

type EnginePowerUnit = "hp" | "kw";

const KW_PER_HP = 0.745699872;
const DEFAULT_PUMP_EFFICIENCY = 0.93;
const DEFAULT_ENGINE_USABLE_FACTOR = 0.85;

const hosePresets = [
  { label: '1/8" (3.18 mm)', valueMm: 3.18 },
  { label: '3/16" (4.76 mm)', valueMm: 4.76 },
  { label: '1/4" (6.35 mm)', valueMm: 6.35 },
  { label: '5/16" (7.94 mm)', valueMm: 7.94 },
  { label: '3/8" (9.53 mm)', valueMm: 9.53 },
  { label: '1/2" (12.70 mm)', valueMm: 12.7 },
  { label: '3/4" (19.05 mm)', valueMm: 19.05 },
  { label: '1" (25.40 mm)', valueMm: 25.4 },
];

const defaultInputs: Inputs = {
  pumpPressure: 4000,
  pumpPressureUnit: "psi",
  pumpFlow: 15,
  pumpFlowUnit: "lpm",
  maxPressure: 4000,
  maxPressureUnit: "psi",
  hoseSetupMode: "single",
  hoseLength: 15,
  hoseLengthUnit: "m",
  hoseId: 9.53,
  hoseIdUnit: "mm",
  mainHoseLength: 50,
  mainHoseId: 9.53,
  leaderHoseLength: 20,
  leaderHoseId: 6.35,
  engineHp: "",
  sprayMode: "wand",
  nozzleCount: 1,
  nozzleMode: "tipSize",
  nozzleSizeText: "040",
  orificeMm: 1.2,
  dischargeCoeffCd: 0.62,
  waterDensity: 1000,
  hoseRoughnessMm: 0.0015,
};

const EXPORT_CARD = {
  width: 1600,
  minHeight: 1040,
  padding: 80,
  radius: 36,
  fontFamily: 'Inter, Arial, sans-serif',
};

function fmt(n: number, dp: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dp);
}

function toPsi(value: number, unit: PressureUnit) {
  return unit === "psi" ? value : value * 14.5037738;
}

function fromPsi(value: number, unit: PressureUnit) {
  return unit === "psi" ? value : value / 14.5037738;
}

function toGpm(value: number, unit: FlowUnit) {
  return unit === "gpm" ? value : value / 3.785411784;
}

function fromGpm(value: number, unit: FlowUnit) {
  return unit === "gpm" ? value : value * 3.785411784;
}

function toMeters(value: number, unit: LengthUnit) {
  return unit === "m" ? value : value / 3.28084;
}

function fromMeters(value: number, unit: LengthUnit) {
  return unit === "m" ? value : value * 3.28084;
}

function roundForUnit(value: number, decimals: number) {
  return Number(value.toFixed(decimals));
}

function hpToKw(valueHp: number) {
  return valueHp * KW_PER_HP;
}

function kwToHp(valueKw: number) {
  return valueKw / KW_PER_HP;
}

function formatEnginePowerFromHp(valueHp: number) {
  if (!Number.isFinite(valueHp) || valueHp <= 0) return "—";
  return `${fmt(valueHp, 1)} HP (${fmt(hpToKw(valueHp), 1)} kW)`;
}

function selectAllOnFocus(e: FocusEvent<HTMLInputElement>) {
  e.target.select();
}

function toNumberOrNull(value: string | number | undefined) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getHoseSetupMode(inputs: Inputs): HoseSetupMode {
  return inputs.hoseSetupMode === "mainLeader" ? "mainLeader" : "single";
}

function formatHoseId(value: number | "" | undefined, unit: Inputs["hoseIdUnit"]) {
  return `${fmt(Number(value || 0), unit === "in" ? 2 : 1)} ${unit}`;
}

function buildHoseSetupSummaryParts(inputs: Inputs) {
  if (getHoseSetupMode(inputs) === "mainLeader") {
    return [
      `Main hose ${fmt(Number(inputs.mainHoseLength || 0), 0)} ${inputs.hoseLengthUnit} / ${formatHoseId(inputs.mainHoseId, inputs.hoseIdUnit)}`,
      `Leader hose ${fmt(Number(inputs.leaderHoseLength || 0), 0)} ${inputs.hoseLengthUnit} / ${formatHoseId(inputs.leaderHoseId, inputs.hoseIdUnit)}`,
    ];
  }

  return [
    `${fmt(Number(inputs.hoseLength || 0), 0)} ${inputs.hoseLengthUnit}`,
    formatHoseId(inputs.hoseId, inputs.hoseIdUnit),
  ];
}

function buildHoseSetupSummaryText(inputs: Inputs) {
  if (getHoseSetupMode(inputs) === "mainLeader") {
    return buildHoseSetupSummaryParts(inputs).join(" · ");
  }

  return `Single hose · ${buildHoseSetupSummaryParts(inputs).join(" · ")}`;
}

function calculateEngineHpRequired(
  pumpOutletPressurePsi: number,
  pumpFlowGpm: number,
  efficiency = DEFAULT_PUMP_EFFICIENCY
) {
  if (
    !Number.isFinite(pumpOutletPressurePsi) ||
    !Number.isFinite(pumpFlowGpm) ||
    pumpOutletPressurePsi <= 0 ||
    pumpFlowGpm <= 0 ||
    efficiency <= 0
  ) {
    return 0;
  }

  return (pumpOutletPressurePsi * pumpFlowGpm) / (1714 * efficiency);
}

function calculateHydraulicHp(pressurePsi: number, flowGpm: number) {
  if (
    !Number.isFinite(pressurePsi) ||
    !Number.isFinite(flowGpm) ||
    pressurePsi <= 0 ||
    flowGpm <= 0
  ) {
    return 0;
  }

  return (pressurePsi * flowGpm) / 1714;
}

function calculateUsableEngineHp(ratedHp: number, factor = DEFAULT_ENGINE_USABLE_FACTOR) {
  return !Number.isFinite(ratedHp) || ratedHp <= 0 ? 0 : ratedHp * factor;
}

function hpStatus(requiredEngineHp: number, usableEngineHp: number) {
  if (usableEngineHp <= 0) {
    return {
      text: "Enter engine HP to evaluate power status.",
      cls: "bg-slate-50 text-slate-700 border-slate-200",
    };
  }

  if (usableEngineHp < requiredEngineHp) {
    return {
      text: "Engine undersized for this setup.",
      cls: "bg-red-50 text-red-800 border-red-200",
    };
  }

  if (usableEngineHp < requiredEngineHp * 1.1) {
    return {
      text: "Operating near engine limit.",
      cls: "bg-amber-50 text-amber-900 border-amber-200",
    };
  }

  return {
    text: "Engine power looks healthy.",
    cls: "bg-green-50 text-green-800 border-green-200",
  };
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

function buildSuggestedSetupName(inputs: Inputs) {
  const pressureValue = Number(inputs.pumpPressure || 0);
  const flowValue = Number(inputs.pumpFlow || 0);
  const pressureUnit = inputs.pumpPressureUnit.toUpperCase();
  const flowUnit = inputs.pumpFlowUnit === "lpm" ? "LPM" : "GPM";
  const nozzleText = (inputs.nozzleSizeText || "").trim();
  const modeText = inputs.sprayMode === "surfaceCleaner" ? "surface cleaner" : "wand";

  const parts = [
    `${fmt(pressureValue, 0)} ${pressureUnit}`,
    `${fmt(flowValue, flowUnit === "LPM" ? 1 : 2)} ${flowUnit}`,
  ];

  if (nozzleText) {
    parts.push(`nozzle ${nozzleText}`);
  }

  parts.push(modeText);
  return parts.join(" · ");
}

function buildShareSummaryText(args: {
  inputs: Inputs;
  gunPressurePsi: number;
  gunPressureBar: number;
  gunFlowLpm: number;
  gunFlowGpm: number;
  hoseLossPsi: number;
  hoseLossBar: number;
  nozzleStatusText: string;
  nozzleStatusMessage: string;
  selectedTipCode: string;
}) {
  const {
    inputs,
    gunPressurePsi,
    gunPressureBar,
    gunFlowLpm,
    gunFlowGpm,
    hoseLossPsi,
    hoseLossBar,
    nozzleStatusText,
    nozzleStatusMessage,
    selectedTipCode,
  } = args;

  const setupLine = [
    `${fmt(Number(inputs.pumpFlow || 0), inputs.pumpFlowUnit === "gpm" ? 2 : 1)} ${inputs.pumpFlowUnit.toUpperCase()}`,
    `${fmt(Number(inputs.pumpPressure || 0), 0)} ${inputs.pumpPressureUnit.toUpperCase()}`,
    ...buildHoseSetupSummaryParts(inputs),
    inputs.sprayMode === "surfaceCleaner"
      ? `Nozzle ${inputs.nozzleSizeText || "—"} × ${inputs.nozzleCount}`
      : `Nozzle ${inputs.nozzleSizeText || "—"}`,
    inputs.engineHp === "" ? "Engine power optional" : `Engine ${formatEnginePowerFromHp(Number(inputs.engineHp || 0))}`,
  ].join(" · ");

  return [
    "PressureCal result",
    "",
    `Setup: ${setupLine}`,
    `At-gun pressure: ${fmt(gunPressurePsi, 0)} PSI (${fmt(gunPressureBar, 1)} bar)`,
    `Flow: ${fmt(gunFlowLpm, 1)} L/min (${fmt(gunFlowGpm, 2)} GPM)`,
    `${getHoseSetupMode(inputs) === "mainLeader" ? "Combined hose pressure loss" : "Hose pressure loss"}: ${fmt(hoseLossPsi, 0)} PSI (${fmt(hoseLossBar, 1)} bar)`,
    `Nozzle status: ${nozzleStatusText}`,
    `Selected nozzle: ${selectedTipCode}`,
    `Note: ${nozzleStatusMessage}`,
  ].join("\n");
}

function buildLiveCompareHref(inputs: Inputs, savedSetupId: string, liveName: string) {
  const params = new URLSearchParams();
  params.set("live", "1");
  params.set("liveName", liveName);
  params.set("b", savedSetupId);

  const rigParams = buildFullRigSearchParams(inputs);
  rigParams.forEach((value, key) => {
    params.set(`live_${key}`, value);
  });

  return `/compare-setups?${params.toString()}`;
}

function buildExportSetupLine(inputs: Inputs) {
  const nozzlePart =
    inputs.sprayMode === "surfaceCleaner"
      ? `Nozzle ${inputs.nozzleSizeText || "—"} × ${inputs.nozzleCount}`
      : `Nozzle ${inputs.nozzleSizeText || "—"}`;

  const enginePart =
    inputs.engineHp === "" ? "Engine power optional" : `Engine ${formatEnginePowerFromHp(Number(inputs.engineHp || 0))}`;

  return [
    `${fmt(Number(inputs.pumpFlow || 0), inputs.pumpFlowUnit === "gpm" ? 2 : 1)} ${inputs.pumpFlowUnit.toUpperCase()}`,
    `${fmt(Number(inputs.pumpPressure || 0), 0)} ${inputs.pumpPressureUnit.toUpperCase()}`,
    ...buildHoseSetupSummaryParts(inputs),
    nozzlePart,
    enginePart,
  ].join(" · ");
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function canvasLinesHeight(lineCount: number, lineHeight: number) {
  return lineCount > 0 ? lineCount * lineHeight : 0;
}

function drawCanvasTextLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number
) {
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });

  return y + canvasLinesHeight(lines.length, lineHeight);
}

function fillRoundedCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
  strokeStyle?: string
) {
  roundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawMetricCard(args: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  value: string;
  secondary: string;
}) {
  const { ctx, x, y, width, height, label, value, secondary } = args;

  fillRoundedCard(ctx, x, y, width, height, 28, "#F8FAFC", "#E2E8F0");

  ctx.fillStyle = "#64748B";
  ctx.font = `600 22px ${EXPORT_CARD.fontFamily}`;
  ctx.textBaseline = "top";
  ctx.fillText(label.toUpperCase(), x + 28, y + 26);

  ctx.fillStyle = "#0F172A";
  ctx.font = `700 50px ${EXPORT_CARD.fontFamily}`;
  ctx.fillText(value, x + 28, y + 74);

  ctx.fillStyle = "#475569";
  ctx.font = `500 24px ${EXPORT_CARD.fontFamily}`;
  ctx.fillText(secondary, x + 28, y + 144);
}

function drawBadge(args: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  text: string;
  variant: "green" | "amber" | "red";
}) {
  const { ctx, x, y, text, variant } = args;

  const styles = {
    green: { bg: "#ECFDF5", border: "#BBF7D0", fg: "#166534" },
    amber: { bg: "#FFFBEB", border: "#FDE68A", fg: "#92400E" },
    red: { bg: "#FEF2F2", border: "#FECACA", fg: "#991B1B" },
  }[variant];

  ctx.font = `700 24px ${EXPORT_CARD.fontFamily}`;
  const width = ctx.measureText(text).width + 40;
  const height = 50;

  fillRoundedCard(ctx, x, y, width, height, 25, styles.bg, styles.border);

  ctx.fillStyle = styles.fg;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 20, y + height / 2);
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create PNG blob"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export default function FullRigCalculatorPage() {
  const [inputs, setInputs] = useState<Inputs>(() => ({
    ...defaultInputs,
    ...parseRigSearchParams(window.location.search),
  }));
  const [enginePowerUnit, setEnginePowerUnit] = useState<EnginePowerUnit>("hp");
  const [copyMessage, setCopyMessage] = useState("");
  const [highlightSetup, setHighlightSetup] = useState(false);
  const [loadedFromLink, setLoadedFromLink] = useState(false);
  const [savePanelOpen, setSavePanelOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveNotes, setSaveNotes] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [pngBusy, setPngBusy] = useState(false);
  const [shortShareUrl, setShortShareUrl] = useState("");
  const [comparePanelOpen, setComparePanelOpen] = useState(false);
  const [compareTargetSetupId, setCompareTargetSetupId] = useState("");
  const [mobileMoreActionsOpen, setMobileMoreActionsOpen] = useState(false);
  const [mobileSystemDetailsOpen, setMobileSystemDetailsOpen] = useState(false);
  const [saveGateVariant, setSaveGateVariant] = useState<"signed_out" | "pro_required" | null>(null);
  const maxWasManuallyEditedRef = useRef(false);
  const sharePanelRef = useRef<HTMLDivElement | null>(null);
  const saveSetupGateRef = useRef<HTMLDivElement | null>(null);
  const lastResultSignatureRef = useRef<string | null>(null);

  const { loading: proAccessLoading, isAuthenticated, isPro, userId } = useProAccess();
  const { setups, isReady: savedSetupsReady, saveSetup } = useSavedSetups(userId);

  const suggestedSetupName = useMemo(() => buildSuggestedSetupName(inputs), [inputs]);

  useEffect(() => {
    const parsed = parseRigSearchParams(window.location.search);
    if (Object.keys(parsed).length > 0) {
      setHighlightSetup(true);
      setLoadedFromLink(true);

      const timer1 = window.setTimeout(() => setHighlightSetup(false), 1600);
      const timer2 = window.setTimeout(() => setLoadedFromLink(false), 2600);

      return () => {
        window.clearTimeout(timer1);
        window.clearTimeout(timer2);
      };
    }
  }, []);

  useEffect(() => {
    const params = buildFullRigSearchParams(inputs);
    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }, [inputs]);

  useEffect(() => {
    if (!savePanelOpen) return;
    setSaveName((current) => (current.trim() ? current : suggestedSetupName));
  }, [savePanelOpen, suggestedSetupName]);

  useEffect(() => {
    if (comparePanelOpen && savedSetupsReady && setups.length > 0 && !compareTargetSetupId) {
      setCompareTargetSetupId(setups[0].id);
    }
  }, [comparePanelOpen, compareTargetSetupId, savedSetupsReady, setups]);

  useEffect(() => {
    if (!comparePanelOpen) return;
    if (compareTargetSetupId && !setups.some((setup) => setup.id === compareTargetSetupId)) {
      setCompareTargetSetupId(setups[0]?.id ?? "");
    }
  }, [comparePanelOpen, compareTargetSetupId, setups]);

  useEffect(() => {
    if (!sharePanelOpen) return;

    const timer = window.setTimeout(() => {
      sharePanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [sharePanelOpen]);

  useEffect(() => {
    if (!savePanelOpen || !saveGateVariant) return;

    const frame = window.requestAnimationFrame(() => {
      const gate = saveSetupGateRef.current;

      if (!gate) {
        return;
      }

      gate.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      gate.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [saveGateVariant, savePanelOpen]);

  useEffect(() => {
    if (sharePanelOpen || savePanelOpen || comparePanelOpen) {
      setMobileMoreActionsOpen(false);
    }
  }, [sharePanelOpen, savePanelOpen, comparePanelOpen]);


  const engineHpValue = Number(inputs.engineHp || 0);

  const safeInputs = {
    ...inputs,
    pumpPressure: Number(inputs.pumpPressure || 0),
    pumpFlow: Number(inputs.pumpFlow || 0),
    maxPressure: Number(inputs.maxPressure || 0),
    hoseLength: Number(inputs.hoseLength || 0),
    hoseId: Number(inputs.hoseId || 0),
    hoseSetupMode: getHoseSetupMode(inputs),
    mainHoseLength: Number(inputs.mainHoseLength || 0),
    mainHoseId: Number(inputs.mainHoseId || 0),
    leaderHoseLength: Number(inputs.leaderHoseLength || 0),
    leaderHoseId: Number(inputs.leaderHoseId || 0),
    engineHp: engineHpValue,
  };

  const r = solvePressureCal(safeInputs);
  const gunBar = barFromPsi(r.gunPressurePsi);
  const gunLpm = lpmFromGpm(r.gunFlowGpm);
  const lossBar = barFromPsi(r.hoseLossPsi);
  const ratedPsi = toPsi(Number(inputs.pumpPressure || 0), inputs.pumpPressureUnit);
  const ratedBar = barFromPsi(ratedPsi);
  const ratedGpm = toGpm(Number(inputs.pumpFlow || 0), inputs.pumpFlowUnit);
  const ratedLpm = lpmFromGpm(ratedGpm);
  const pumpOutletPressurePsi =
    Number(inputs.maxPressure || 0) > 0
      ? toPsi(Number(inputs.maxPressure || 0), inputs.maxPressureUnit)
      : ratedPsi;
  const pumpFlowGpm = ratedGpm;
  const hydraulicHpRequired = calculateHydraulicHp(pumpOutletPressurePsi, pumpFlowGpm);
  const requiredEngineHp = calculateEngineHpRequired(pumpOutletPressurePsi, pumpFlowGpm);
  const usefulHydraulicHpAtGun = calculateHydraulicHp(r.gunPressurePsi, r.gunFlowGpm);
  const hoseLossHydraulicHp = calculateHydraulicHp(r.hoseLossPsi, r.gunFlowGpm);
  const bypassFlowGpm = Math.max(0, pumpFlowGpm - r.gunFlowGpm);
  const bypassHydraulicHp = calculateHydraulicHp(pumpOutletPressurePsi, bypassFlowGpm);
  const usableEngineHp = calculateUsableEngineHp(engineHpValue);
  const enginePowerBadge = hpStatus(requiredEngineHp, usableEngineHp);
  const powerDiagnosticNote = [
    `Pump hydraulic load: ${formatEnginePowerFromHp(hydraulicHpRequired)}`,
    `Useful hydraulic power at gun: ${formatEnginePowerFromHp(usefulHydraulicHpAtGun)}`,
    hoseLossHydraulicHp > 0
      ? `Hose loss hydraulic power: ${formatEnginePowerFromHp(hoseLossHydraulicHp)}`
      : null,
    bypassHydraulicHp > 0.05
      ? `Bypass hydraulic power: ${formatEnginePowerFromHp(bypassHydraulicHp)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const pressureVariancePct = ratedPsi > 0 ? ((r.gunPressurePsi - ratedPsi) / ratedPsi) * 100 : 0;
  const lossPctAbs = Math.abs(pressureVariancePct);
  const efficiencyTier =
    lossPctAbs < 5 ? "Optimal" : lossPctAbs < 10 ? "Moderate loss" : lossPctAbs < 20 ? "High loss" : "Severe loss";
  const efficiencyNote =
    lossPctAbs < 5
      ? "Very close to rated performance."
      : lossPctAbs < 10
        ? "Some pressure drop — typically acceptable."
        : lossPctAbs < 20
          ? "Noticeable drop — consider hose length or diameter."
          : "Large drop — hose length or ID is significantly reducing performance.";
  const badge = statusBadge(r.status);
  const systemBadge = r.isPressureLimited
    ? { text: "Bypass active", cls: "bg-red-50 text-red-800 border-red-200" }
    : badge;
  const pqRated = ratedBar * ratedLpm;
  const pqAtGun = gunBar * gunLpm;
  const pqClassRated = pqRated >= 5600 ? "Class B" : "Class A";
  const pqClassGun = pqAtGun >= 5600 ? "Class B" : "Class A";
  const selectedDisplayTipCode = roundTipCodeToFive(r.selectedTipCode);
  const calibratedDisplayTipCode = roundTipCodeToFive(r.calibratedTipCode);
  const nozzleDisplaySuffix = inputs.sprayMode === "surfaceCleaner" ? " each" : "";
  const enginePowerInputValue =
    inputs.engineHp === ""
      ? ""
      : enginePowerUnit === "hp"
        ? inputs.engineHp
        : roundForUnit(hpToKw(engineHpValue), 2);

  const hoseSetupMode = getHoseSetupMode(inputs);
  const isMainLeaderHose = hoseSetupMode === "mainLeader";
  const totalHoseLengthDisplay = fromMeters(r.totalHoseLengthM, inputs.hoseLengthUnit);
  const mainHoseLossBar = barFromPsi(r.mainHoseLossPsi);
  const leaderHoseLossBar = barFromPsi(r.leaderHoseLossPsi);
  const hoseLossLabel = "Hose pressure loss";
  const mainHoseLengthDisplay = Number(
    inputs.mainHoseLength !== undefined && inputs.mainHoseLength !== ""
      ? inputs.mainHoseLength
      : inputs.hoseLength || 0
  );
  const leaderHoseLengthDisplay = Number(inputs.leaderHoseLength || 0);
  const splitHoseTotalLengthDisplay = mainHoseLengthDisplay + leaderHoseLengthDisplay;
  const hoseSetupDisplay = buildHoseSetupSummaryText(inputs);

  const liveSetupItems = [
    {
      label: "Pressure",
      value: `${fmt(Number(inputs.pumpPressure || 0), 0)} ${inputs.pumpPressureUnit === "psi" ? "PSI" : "BAR"}`,
    },
    {
      label: "Flow",
      value: `${fmt(ratedLpm, 1)} LPM (${fmt(ratedGpm, 2)} GPM)`,
    },
    {
      label: isMainLeaderHose ? "Total hose length" : "Hose length",
      value: `${fmt(isMainLeaderHose ? totalHoseLengthDisplay : Number(inputs.hoseLength || 0), 1)} ${inputs.hoseLengthUnit}`,
    },
    {
      label: "Hose setup",
      value: hoseSetupDisplay,
    },
    {
      label: "Nozzle",
      value:
        inputs.sprayMode === "surfaceCleaner"
          ? `${inputs.nozzleSizeText || "—"} × ${inputs.nozzleCount}`
          : inputs.nozzleSizeText || "—",
    },
    {
      label: "Engine",
      value: inputs.engineHp === "" ? "Optional" : formatEnginePowerFromHp(engineHpValue),
    },
  ];

  const shareUrl = useMemo(() => buildFullSetupShareUrl(inputs), [inputs]);

  const liveCompareHref = useMemo(
    () =>
      compareTargetSetupId
        ? buildLiveCompareHref(inputs, compareTargetSetupId, suggestedSetupName)
        : "",
    [compareTargetSetupId, inputs, suggestedSetupName]
  );

  const shareSummaryText = useMemo(
    () =>
      buildShareSummaryText({
        inputs,
        gunPressurePsi: r.gunPressurePsi,
        gunPressureBar: gunBar,
        gunFlowLpm: gunLpm,
        gunFlowGpm: r.gunFlowGpm,
        hoseLossPsi: r.hoseLossPsi,
        hoseLossBar: lossBar,
        nozzleStatusText: badge.text,
        nozzleStatusMessage: r.statusMessage,
        selectedTipCode: selectedDisplayTipCode,
      }),
    [badge.text, gunBar, gunLpm, inputs, lossBar, r.gunFlowGpm, r.gunPressurePsi, r.hoseLossPsi, r.statusMessage, selectedDisplayTipCode]
  );

  const resultSignature = useMemo(
    () =>
      [
        inputs.pumpPressure,
        inputs.pumpPressureUnit,
        inputs.pumpFlow,
        inputs.pumpFlowUnit,
        inputs.maxPressure,
        inputs.maxPressureUnit,
        inputs.hoseLength,
        inputs.hoseLengthUnit,
        inputs.hoseId,
        inputs.hoseIdUnit,
        inputs.hoseSetupMode,
        inputs.mainHoseLength,
        inputs.mainHoseId,
        inputs.leaderHoseLength,
        inputs.leaderHoseId,
        inputs.sprayMode,
        inputs.nozzleCount,
        inputs.nozzleSizeText,
        r.gunPressurePsi.toFixed(2),
        r.gunFlowGpm.toFixed(3),
        r.hoseLossPsi.toFixed(2),
        r.status,
        r.isPressureLimited,
      ].join("|"),
    [
      inputs.pumpPressure,
      inputs.pumpPressureUnit,
      inputs.pumpFlow,
      inputs.pumpFlowUnit,
      inputs.maxPressure,
      inputs.maxPressureUnit,
      inputs.hoseLength,
      inputs.hoseLengthUnit,
      inputs.hoseId,
      inputs.hoseIdUnit,
      inputs.hoseSetupMode,
      inputs.mainHoseLength,
      inputs.mainHoseId,
      inputs.leaderHoseLength,
      inputs.leaderHoseId,
      inputs.sprayMode,
      inputs.nozzleCount,
      inputs.nozzleSizeText,
      r.gunPressurePsi,
      r.gunFlowGpm,
      r.hoseLossPsi,
      r.status,
      r.isPressureLimited,
    ]
  );

  useEffect(() => {
    if (!Number.isFinite(r.gunPressurePsi) || !Number.isFinite(r.gunFlowGpm)) {
      return;
    }

    if (lastResultSignatureRef.current === resultSignature) {
      return;
    }

    lastResultSignatureRef.current = resultSignature;

    trackEvent("calculator_result_viewed", {
      calculator: "full_setup",
      spray_mode: inputs.sprayMode,
      nozzle_count: Number(inputs.nozzleCount || 1),
      nozzle_status: r.status,
      pressure_limited: r.isPressureLimited,
    });
  }, [
    inputs.nozzleCount,
    inputs.sprayMode,
    r.gunFlowGpm,
    r.gunPressurePsi,
    r.isPressureLimited,
    r.status,
    resultSignature,
  ]);

  const compactCompareSnapshotItems = [
    {
      label: "Pump",
      value: `${inputs.pumpPressure || "—"} ${inputs.pumpPressureUnit.toUpperCase()} · ${inputs.pumpFlow || "—"} ${inputs.pumpFlowUnit.toUpperCase()}`,
    },
    {
      label: "Max pressure",
      value: `${inputs.maxPressure || "—"} ${inputs.maxPressureUnit.toUpperCase()}`,
    },
    {
      label: "Engine",
      value: inputs.engineHp === "" ? "Not provided" : formatEnginePowerFromHp(engineHpValue),
    },
    {
      label: "Hose",
      value: hoseSetupDisplay,
    },
    {
      label: "Spray mode",
      value: inputs.sprayMode === "surfaceCleaner" ? "Surface cleaner" : "Wand",
    },
    {
      label: "Nozzle",
      value: inputs.nozzleSizeText || "—",
    },
  ];

  useEffect(() => {
    setShortShareUrl("");
  }, [shareUrl]);

  function getShareQueryString() {
    const fromShareUrl = shareUrl.includes("?") ? shareUrl.split("?")[1] ?? "" : "";
    return fromShareUrl || window.location.search.replace(/^\?/, "");
  }

  async function copySetupLink() {
    try {
      await copyTextToClipboard(shareUrl);
      setCopyMessage("Setup link copied");
      window.setTimeout(() => setCopyMessage(""), 2000);
    } catch {
      window.prompt("Copy this link:", shareUrl);
    }
  }

  function handleOpenComparePanel() {
    setComparePanelOpen(true);
    setSavePanelOpen(false);
    setMobileMoreActionsOpen(false);
  }

  function handleCloseComparePanel() {
    setComparePanelOpen(false);
    setMobileMoreActionsOpen(false);
  }

  function showSaveSetupGate(reason: "signed_out" | "pro_required") {
    setSaveGateVariant(reason);
    trackEvent("pro_gate_shown", {
      calculator: "full_setup",
      gate: "save_setup",
      reason,
    });
  }

  function handleOpenSavePanel() {
    trackEvent("save_setup_clicked", {
      calculator: "full_setup",
      source: "results_snapshot",
      is_authenticated: isAuthenticated,
      is_pro: isPro,
    });

    setSavePanelOpen(true);
    setComparePanelOpen(false);
    setSaveMessage("");
    setMobileMoreActionsOpen(false);

    if (proAccessLoading) {
      return;
    }

    if (!isAuthenticated || !userId) {
      showSaveSetupGate("signed_out");
      return;
    }

    if (!isPro) {
      showSaveSetupGate("pro_required");
      return;
    }

    setSaveGateVariant(null);
    setSaveName((current) => (current.trim() ? current : suggestedSetupName));
  }

  function handleCloseSavePanel() {
    setSavePanelOpen(false);
    setSaveGateVariant(null);
    setSaveMessage("");
    setMobileMoreActionsOpen(false);
  }

  function handleOpenSharePanel() {
    setSharePanelOpen(true);
    setSavePanelOpen(false);
    setComparePanelOpen(false);
    setShareMessage("");
    setMobileMoreActionsOpen(false);
  }

  function handleCloseSharePanel() {
    setSharePanelOpen(false);
    setShareMessage("");
    setShareBusy(false);
    setPngBusy(false);
    setShortShareUrl("");
    setMobileMoreActionsOpen(false);
  }

  async function getOrCreateShortShareUrl() {
    const cachedUrl = shortShareUrl.trim();
    if (cachedUrl) {
      return cachedUrl;
    }

    const { shortUrl } = await createShortShareLink({
      queryString: getShareQueryString(),
      title: "PressureCal result",
      summary: shareSummaryText,
    });

    setShortShareUrl(shortUrl);
    return shortUrl;
  }

  async function handleCopyShareResultLink() {
    try {
      setShareBusy(true);
      const shortUrl = await getOrCreateShortShareUrl();
      await copyTextToClipboard(shortUrl);
      setShareMessage("Share link copied");
      window.setTimeout(() => setShareMessage(""), 2000);
    } catch {
      window.alert("Unable to create a short share link right now.");
    } finally {
      setShareBusy(false);
    }
  }

  async function handleNativeShareResult() {
    try {
      setShareBusy(true);
      const shortUrl = await getOrCreateShortShareUrl();

      const didShare = await shareUrlWithNavigator({
        url: shortUrl,
        title: "PressureCal result",
        text: shareSummaryText,
      });

      if (!didShare) {
        await copyTextToClipboard(shortUrl);
        setShareMessage("Share link copied");
        window.setTimeout(() => setShareMessage(""), 2000);
      }
    } catch {
      // user cancelled or share failed
    } finally {
      setShareBusy(false);
    }
  }

  async function handleDownloadPng() {
    try {
      setPngBusy(true);

      const measureCanvas = document.createElement("canvas");
      measureCanvas.width = EXPORT_CARD.width;
      const measureCtx = measureCanvas.getContext("2d");
      if (!measureCtx) {
        throw new Error("Unable to create export canvas");
      }

      const cardX = EXPORT_CARD.padding;
      const cardY = EXPORT_CARD.padding;
      const cardWidth = EXPORT_CARD.width - EXPORT_CARD.padding * 2;
      const innerX = cardX + 52;
      const innerY = cardY + 48;
      const innerWidth = cardWidth - 104;

      measureCtx.textBaseline = "top";
      measureCtx.font = `500 28px ${EXPORT_CARD.fontFamily}`;
      const setupLines = wrapCanvasText(measureCtx, suggestedSetupName, innerWidth - 340);
      const setupLineHeight = 36;
      const setupBottom = innerY + 136 + canvasLinesHeight(setupLines.length, setupLineHeight);

      const dividerY = Math.max(innerY + 230, setupBottom + 54);

      measureCtx.font = `500 24px ${EXPORT_CARD.fontFamily}`;
      const exportSetupLine = buildExportSetupLine(inputs);
      const exportSetupLines = wrapCanvasText(measureCtx, exportSetupLine, innerWidth);
      const exportSetupLineHeight = 34;
      const exportSetupBottom = dividerY + 72 + canvasLinesHeight(exportSetupLines.length, exportSetupLineHeight);

      const metricY = exportSetupBottom + 52;
      const metricGap = 24;
      const metricWidth = (innerWidth - metricGap * 2) / 3;
      const metricHeight = 220;

      const detailsY = metricY + metricHeight + 36;
      const detailsInsetX = 24;
      const detailsGap = 72;
      const detailAvailableWidth = innerWidth - detailsInsetX * 2;
      const detailColumnWidth = (detailAvailableWidth - detailsGap) / 2;
      const useStackedDetails = detailColumnWidth < 560;
      const detailTextWidth = useStackedDetails ? detailAvailableWidth : detailColumnWidth;
      const detailLineHeight = 30;
      const detailItemGap = 10;
      const stackedDetailGap = 24;

      const selectedDetailText = `Selected nozzle ${selectedDisplayTipCode}${nozzleDisplaySuffix}`;
      const recommendedDetailText = `Recommended nozzle for rated pump output: ${calibratedDisplayTipCode}${nozzleDisplaySuffix}`;
      const pressureGuideText = `Pressure loss guide: ${efficiencyTier}`;

      measureCtx.font = `700 24px ${EXPORT_CARD.fontFamily}`;
      const selectedDetailLines = wrapCanvasText(measureCtx, selectedDetailText, detailTextWidth);
      const recommendedDetailLines = wrapCanvasText(measureCtx, recommendedDetailText, detailTextWidth);

      measureCtx.font = `600 22px ${EXPORT_CARD.fontFamily}`;
      const pressureGuideLines = wrapCanvasText(measureCtx, pressureGuideText, detailTextWidth);

      measureCtx.font = `500 22px ${EXPORT_CARD.fontFamily}`;
      const pressureNoteLines = wrapCanvasText(measureCtx, efficiencyNote, detailTextWidth);

      const leftDetailHeight =
        canvasLinesHeight(selectedDetailLines.length, detailLineHeight) +
        detailItemGap +
        canvasLinesHeight(recommendedDetailLines.length, detailLineHeight);
      const rightDetailHeight =
        canvasLinesHeight(pressureGuideLines.length, detailLineHeight) +
        detailItemGap +
        canvasLinesHeight(pressureNoteLines.length, detailLineHeight);
      const detailsContentHeight = useStackedDetails
        ? leftDetailHeight + stackedDetailGap + rightDetailHeight
        : Math.max(leftDetailHeight, rightDetailHeight);
      const detailsHeight = 48 + detailsContentHeight + 30;

      const footerY = detailsY + detailsHeight + 36;
      const footerHeight = 64;
      const cardBottom = footerY + footerHeight + 48;
      const canvasHeight = Math.ceil(Math.max(EXPORT_CARD.minHeight, cardBottom + EXPORT_CARD.padding));

      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_CARD.width;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to create export canvas");
      }

      ctx.fillStyle = "#F8FAFC";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.shadowColor = "rgba(15, 23, 42, 0.10)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 18;
      fillRoundedCard(
        ctx,
        cardX,
        cardY,
        cardWidth,
        canvas.height - EXPORT_CARD.padding * 2,
        EXPORT_CARD.radius,
        "#FFFFFF",
        "#E2E8F0"
      );
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.textBaseline = "top";
      ctx.fillStyle = "#183170";
      ctx.font = `700 28px ${EXPORT_CARD.fontFamily}`;
      ctx.fillText("PressureCal", innerX, innerY);

      ctx.fillStyle = "#0F172A";
      ctx.font = `700 56px ${EXPORT_CARD.fontFamily}`;
      ctx.fillText("PressureCal result", innerX, innerY + 56);

      ctx.fillStyle = "#475569";
      ctx.font = `500 28px ${EXPORT_CARD.fontFamily}`;
      drawCanvasTextLines(ctx, setupLines, innerX, innerY + 136, setupLineHeight);

      const badgeVariant =
        badge.text === "Calibrated"
          ? "green"
          : badge.text === "Under-calibrated"
            ? "amber"
            : "red";

      drawBadge({
        ctx,
        x: cardX + cardWidth - 280,
        y: innerY + 8,
        text: badge.text,
        variant: badgeVariant,
      });

      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(innerX, dividerY);
      ctx.lineTo(cardX + cardWidth - 52, dividerY);
      ctx.stroke();

      ctx.fillStyle = "#64748B";
      ctx.font = `600 22px ${EXPORT_CARD.fontFamily}`;
      ctx.fillText("SETUP", innerX, dividerY + 34);

      ctx.fillStyle = "#334155";
      ctx.font = `500 24px ${EXPORT_CARD.fontFamily}`;
      drawCanvasTextLines(ctx, exportSetupLines, innerX, dividerY + 72, exportSetupLineHeight);

      drawMetricCard({
        ctx,
        x: innerX,
        y: metricY,
        width: metricWidth,
        height: metricHeight,
        label: "At-gun pressure",
        value: `${fmt(r.gunPressurePsi, 0)} PSI`,
        secondary: `${fmt(gunBar, 1)} bar`,
      });

      drawMetricCard({
        ctx,
        x: innerX + metricWidth + metricGap,
        y: metricY,
        width: metricWidth,
        height: metricHeight,
        label: "Flow",
        value: `${fmt(gunLpm, 1)} L/min`,
        secondary: `${fmt(r.gunFlowGpm, 2)} GPM`,
      });

      drawMetricCard({
        ctx,
        x: innerX + (metricWidth + metricGap) * 2,
        y: metricY,
        width: metricWidth,
        height: metricHeight,
        label: hoseLossLabel,
        value: `${fmt(r.hoseLossPsi, 0)} PSI`,
        secondary: `${fmt(lossBar, 1)} bar`,
      });

      fillRoundedCard(ctx, innerX, detailsY, innerWidth, detailsHeight, 28, "#F8FAFC", "#E2E8F0");

      ctx.fillStyle = "#64748B";
      ctx.font = `600 20px ${EXPORT_CARD.fontFamily}`;
      ctx.fillText("DETAILS", innerX + detailsInsetX, detailsY + 18);

      const detailsContentX = innerX + detailsInsetX;
      const detailsContentY = detailsY + 48;
      let leftDetailY = detailsContentY;

      ctx.fillStyle = "#0F172A";
      ctx.font = `700 24px ${EXPORT_CARD.fontFamily}`;
      leftDetailY = drawCanvasTextLines(ctx, selectedDetailLines, detailsContentX, leftDetailY, detailLineHeight) + detailItemGap;
      drawCanvasTextLines(ctx, recommendedDetailLines, detailsContentX, leftDetailY, detailLineHeight);

      const rightDetailX = useStackedDetails ? detailsContentX : detailsContentX + detailTextWidth + detailsGap;
      let rightDetailY = useStackedDetails ? detailsContentY + leftDetailHeight + stackedDetailGap : detailsContentY;

      ctx.fillStyle = "#475569";
      ctx.font = `600 22px ${EXPORT_CARD.fontFamily}`;
      rightDetailY = drawCanvasTextLines(ctx, pressureGuideLines, rightDetailX, rightDetailY, detailLineHeight) + detailItemGap;

      ctx.font = `500 22px ${EXPORT_CARD.fontFamily}`;
      drawCanvasTextLines(ctx, pressureNoteLines, rightDetailX, rightDetailY, detailLineHeight);

      ctx.fillStyle = "#475569";
      ctx.font = `600 22px ${EXPORT_CARD.fontFamily}`;
      ctx.fillText("pressurecal.com", innerX, footerY);

      ctx.fillStyle = "#64748B";
      ctx.font = `500 20px ${EXPORT_CARD.fontFamily}`;
      ctx.fillText("Model your machine from pump to gun.", innerX, footerY + 36);

      const blob = await canvasToBlob(canvas);
      downloadBlob(blob, "pressurecal-result.png");

      setShareMessage("PNG downloaded");
      window.setTimeout(() => setShareMessage(""), 2200);
    } catch {
      window.alert("Unable to export PNG right now.");
    } finally {
      setPngBusy(false);
    }
  }

  async function handleCopyResultSummary() {
    try {
      await copyTextToClipboard(shareSummaryText);
      setShareMessage("Result summary copied");
      window.setTimeout(() => setShareMessage(""), 2000);
    } catch {
      window.prompt("Copy this summary:", shareSummaryText);
    }
  }

  async function handleSaveCurrentSetup() {
    if (!isAuthenticated || !userId) {
      showSaveSetupGate("signed_out");
      return;
    }

    if (!isPro) {
      showSaveSetupGate("pro_required");
      return;
    }

    const trimmedName = saveName.trim();
    if (!trimmedName) {
      window.alert("Please enter a setup name.");
      return;
    }

    const nozzleSizeText = (inputs.nozzleSizeText || "").trim() || null;

    try {
      const saved = await saveSetup({
        name: trimmedName,
        notes: saveNotes.trim() || null,

        machinePsi: inputs.pumpPressureUnit === "psi" ? toNumberOrNull(inputs.pumpPressure) : null,
        machineLpm: inputs.pumpFlowUnit === "lpm" ? toNumberOrNull(inputs.pumpFlow) : null,
        hoseLengthM: inputs.hoseLengthUnit === "m" ? toNumberOrNull(inputs.hoseLength) : null,
        hoseIdMm: inputs.hoseIdUnit === "mm" ? toNumberOrNull(inputs.hoseId) : null,
        nozzleSize: nozzleSizeText,

        pumpPressure: toNumberOrNull(inputs.pumpPressure),
        pumpPressureUnit: inputs.pumpPressureUnit,
        pumpFlow: toNumberOrNull(inputs.pumpFlow),
        pumpFlowUnit: inputs.pumpFlowUnit,
        maxPressure: toNumberOrNull(inputs.maxPressure),
        maxPressureUnit: inputs.maxPressureUnit,
        hoseLength: toNumberOrNull(inputs.hoseLength),
        hoseLengthUnit: inputs.hoseLengthUnit,
        hoseId: toNumberOrNull(inputs.hoseId),
        hoseIdUnit: inputs.hoseIdUnit,
        hoseSetupMode,
        mainHoseLength: toNumberOrNull(inputs.mainHoseLength),
        mainHoseId: toNumberOrNull(inputs.mainHoseId),
        leaderHoseLength: toNumberOrNull(inputs.leaderHoseLength),
        leaderHoseId: toNumberOrNull(inputs.leaderHoseId),
        engineHp: toNumberOrNull(inputs.engineHp),
        sprayMode: inputs.sprayMode,
        nozzleCount: Math.max(inputs.sprayMode === "surfaceCleaner" ? 2 : 1, Number(inputs.nozzleCount || 1)),
        nozzleSizeText,
        orificeMm: toNumberOrNull(inputs.orificeMm) ?? 1.2,
        dischargeCoeffCd: toNumberOrNull(inputs.dischargeCoeffCd) ?? 0.62,
        waterDensity: toNumberOrNull(inputs.waterDensity) ?? 1000,
        hoseRoughnessMm: toNumberOrNull(inputs.hoseRoughnessMm) ?? 0.0015,
      });

      trackEvent("saved_setup_created", {
        source: "full_setup_calculator",
        setup_id: saved.id,
        spray_mode: inputs.sprayMode,
        nozzle_count: Number(inputs.nozzleCount || 1),
      });

      setSaveMessage("Setup saved");
      setSavePanelOpen(false);
      setSaveGateVariant(null);
      window.setTimeout(() => setSaveMessage(""), 2500);
    } catch (error) {
      console.error(error);
      window.alert("Unable to save this setup right now.");
    }
  }

  function updateInput<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  function updateHoseSetupMode(nextMode: HoseSetupMode) {
    setInputs((current) => {
      if (nextMode === "mainLeader" && current.hoseSetupMode !== "mainLeader") {
        return {
          ...current,
          hoseSetupMode: nextMode,
          mainHoseLength:
            current.mainHoseLength !== undefined && current.mainHoseLength !== ""
              ? current.mainHoseLength
              : current.hoseLength,
          mainHoseId:
            current.mainHoseId !== undefined && current.mainHoseId !== ""
              ? current.mainHoseId
              : current.hoseId,
          leaderHoseLength:
            current.leaderHoseLength !== undefined ? current.leaderHoseLength : 0,
          leaderHoseId:
            current.leaderHoseId !== undefined && current.leaderHoseId !== ""
              ? current.leaderHoseId
              : current.hoseId,
        };
      }

      return { ...current, hoseSetupMode: nextMode };
    });
  }

  function updateHoseLengthUnit(nextUnit: LengthUnit) {
    setInputs((current) => {
      const currentSingleMeters = toMeters(Number(current.hoseLength || 0), current.hoseLengthUnit);
      const currentMainMeters = toMeters(Number(current.mainHoseLength || 0), current.hoseLengthUnit);
      const currentLeaderMeters = toMeters(Number(current.leaderHoseLength || 0), current.hoseLengthUnit);

      return {
        ...current,
        hoseLengthUnit: nextUnit,
        hoseLength: roundForUnit(fromMeters(currentSingleMeters, nextUnit), 1),
        mainHoseLength: roundForUnit(fromMeters(currentMainMeters, nextUnit), 1),
        leaderHoseLength: roundForUnit(fromMeters(currentLeaderMeters, nextUnit), 1),
      };
    });
  }

  function updateEnginePowerFromDisplay(value: string) {
    if (value === "") {
      updateInput("engineHp", "" as Inputs["engineHp"]);
      return;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;

    const nextHp = enginePowerUnit === "hp" ? parsed : kwToHp(parsed);
    updateInput("engineHp", roundForUnit(nextHp, 2) as Inputs["engineHp"]);
  }

  const calculatedNozzleLabel = `${calibratedDisplayTipCode}${nozzleDisplaySuffix}`;
  const selectedNozzleLabel = `${selectedDisplayTipCode}${nozzleDisplaySuffix}`;
  const sprayModeLabel =
    inputs.sprayMode === "surfaceCleaner"
      ? `Surface cleaner (${inputs.nozzleCount} nozzles)`
      : "Wand (single nozzle)";

  const fullSetupExplainerInputs = [
    {
      label: "Rated pressure",
      value: `${fmt(Number(inputs.pumpPressure || 0), 0)} ${inputs.pumpPressureUnit.toUpperCase()}`,
      note: `${fmt(ratedPsi, 0)} PSI used internally`,
    },
    {
      label: "Rated flow",
      value: `${fmt(ratedLpm, 1)} LPM (${fmt(ratedGpm, 2)} US GPM)`,
      note: "PressureCal uses US gallons per minute for GPM calculations.",
    },
    {
      label: "Max pressure",
      value: `${fmt(Number(inputs.maxPressure || 0), 0)} ${inputs.maxPressureUnit.toUpperCase()}`,
      note: "Used as the modelled pump outlet / unloader pressure for required power, and to flag bypass or pressure-limited behaviour.",
    },
    {
      label: "Hose",
      value: isMainLeaderHose
        ? `Main + Leader Hose · ${fmt(totalHoseLengthDisplay, 1)} ${inputs.hoseLengthUnit} total`
        : `${fmt(Number(inputs.hoseLength || 0), 1)} ${inputs.hoseLengthUnit} · ${formatHoseId(inputs.hoseId, inputs.hoseIdUnit)} ID`,
      note: isMainLeaderHose ? hoseSetupDisplay : undefined,
    },
    {
      label: "Spray mode",
      value: sprayModeLabel,
      note:
        inputs.sprayMode === "surfaceCleaner"
          ? "PressureCal treats the entered nozzle size as the size of each individual nozzle."
          : "PressureCal treats this as a single-nozzle wand setup.",
    },
    {
      label: "Selected nozzle",
      value: selectedNozzleLabel,
    },
    {
      label: "Engine power",
      value: inputs.engineHp === "" ? "Not provided" : formatEnginePowerFromHp(engineHpValue),
      note:
        inputs.engineHp === ""
          ? "Optional. Add engine power as HP or kW to check power headroom."
          : `${formatEnginePowerFromHp(usableEngineHp)} usable guide after allowance factor.`,
    },
  ];

  const fullSetupExplainerResults = [
    {
      label: "At-gun pressure",
      value: `${fmt(r.gunPressurePsi, 0)} PSI (${fmt(gunBar, 1)} bar)`,
    },
    {
      label: "Flow",
      value: `${fmt(gunLpm, 1)} LPM (${fmt(r.gunFlowGpm, 2)} US GPM)`,
    },
    {
      label: hoseLossLabel,
      value: `${fmt(r.hoseLossPsi, 0)} PSI (${fmt(lossBar, 1)} bar)`,
      note: isMainLeaderHose
        ? `Main ${fmt(r.mainHoseLossPsi, 0)} PSI + leader ${fmt(r.leaderHoseLossPsi, 0)} PSI · ${efficiencyTier}`
        : efficiencyTier,
    },
    {
      label: "Nozzle match",
      value: `${badge.text}: selected ${selectedNozzleLabel}, recommended ${calculatedNozzleLabel}`,
      note: r.statusMessage,
    },
    {
      label: "Required power",
      value: formatEnginePowerFromHp(requiredEngineHp),
      note:
        usableEngineHp > 0
          ? `Pump-side engine requirement. Usable engine power guide: ${formatEnginePowerFromHp(usableEngineHp)}. ${powerDiagnosticNote}`
          : `Pump-side engine requirement. Enter engine power to compare available power. ${powerDiagnosticNote}`,
    },
    {
      label: "P × Q reference",
      value: `${fmt(pqAtGun, 0)} at gun (${pqClassGun})`,
      note: `Rated reference: ${fmt(pqRated, 0)} (${pqClassRated})`,
    },
  ];

  return (
    <PressureCalLayout hideFeedbackWidget={sharePanelOpen}>
      <Helmet>
        <title>Pressure Washer Setup Calculator | Pump, Hose & Nozzle | PressureCal</title>
        <meta
          name="description"
          content="Model a complete pressure washer setup from pump specs through hose and nozzle to estimate at-gun pressure, flow, hose loss and required power in HP or kW."
        />
        <link rel="canonical" href="https://www.pressurecal.com/calculator" />
      </Helmet>

      <section className="-mx-4 bg-slate-100 px-4 pb-8 pt-6 sm:pb-10 sm:pt-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 max-w-3xl sm:mb-8">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Full setup calculator
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Pressure Washer Setup Calculator
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Model a complete pressure washer setup from pump specs through hose and nozzle. Estimate hose pressure loss, nozzle match, at-gun pressure, flow and required power in HP or kW in one working view.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/nozzle-size-calculator"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                Only need a nozzle / tip code? Use the pressure washer nozzle size calculator
              </Link>
              <Link
                to="/target-pressure-nozzle-calculator"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                Trying to lower PSI? Use the target pressure nozzle calculator
              </Link>
            </div>
          </div>

          <div
            className={`mb-6 rounded-2xl border px-5 py-4 shadow-sm transition-all duration-700 ${
              highlightSetup ? "border-blue-300 bg-blue-50 shadow-lg" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Current setup snapshot
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    A quick snapshot of the setup PressureCal is modelling, ready to share, save, or compare.
                  </div>

                  {loadedFromLink ? (
                    <div className="mt-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      Shared setup loaded
                    </div>
                  ) : null}

                  {saveMessage ? (
                    <div className="mt-3 inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      {saveMessage}
                    </div>
                  ) : null}
                </div>

                <div className="sm:hidden">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleOpenSharePanel}
                      className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
                    >
                      Share result
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenSavePanel}
                      disabled={proAccessLoading || (isAuthenticated && isPro && !savedSetupsReady)}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Save setup
                    </button>
                  </div>

                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setMobileMoreActionsOpen((current) => !current)}
                      className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      {mobileMoreActionsOpen ? "Close more actions" : "More actions"}
                    </button>

                    {mobileMoreActionsOpen ? (
                      <div className="mt-2 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <button
                          type="button"
                          onClick={handleOpenComparePanel}
                          disabled={proAccessLoading || (isAuthenticated && isPro && !savedSetupsReady)}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Compare to saved
                        </button>

                        <button
                          type="button"
                          onClick={copySetupLink}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          {copyMessage ? "Copied ✓" : "Copy setup link"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="hidden flex-wrap gap-2 sm:flex">
                  <button
                    type="button"
                    onClick={handleOpenSharePanel}
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
                  >
                    Share result
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenSavePanel}
                    disabled={proAccessLoading || (isAuthenticated && isPro && !savedSetupsReady)}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save setup
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenComparePanel}
                    disabled={proAccessLoading || (isAuthenticated && isPro && !savedSetupsReady)}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Compare to saved
                  </button>

                  <button
                    type="button"
                    onClick={copySetupLink}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    {copyMessage ? "Copied ✓" : "Copy setup link"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {liveSetupItems.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-full border px-3 py-1 text-sm transition ${
                      highlightSetup
                        ? "border-blue-300 bg-blue-100 text-slate-900"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="font-medium text-slate-500">{item.label}:</span>{" "}
                    <span className="font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>

              {!proAccessLoading && !isPro && !savePanelOpen ? (
                <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm leading-6 text-slate-700">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">Want to keep this setup?</p>
                      <p className="mt-1">
                        Save your machine, hose, nozzle, and pressure loss calculation with PressureCal Pro.
                      </p>
                    </div>

                    <Link
                      to="/pricing"
                      onClick={() =>
                        trackEvent("pro_bridge_clicked", {
                          source: "save_setup_nudge",
                          calculator: "full_setup",
                        })
                      }
                      className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      Start saving setups
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            {comparePanelOpen ? (
              <div className="mt-5">
                {!proAccessLoading && !isAuthenticated ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-700">Sign in to compare your live calculator against a saved setup.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        to="/account"
                        className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Sign in
                      </Link>
                      <button
                        type="button"
                        onClick={handleCloseComparePanel}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : !proAccessLoading && isAuthenticated && !isPro ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-700">Compare to saved is part of PressureCal Pro.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        to="/pro"
                        className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        View PressureCal Pro
                      </Link>
                      <button
                        type="button"
                        onClick={handleCloseComparePanel}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <CompactCurrentVsSavedComparePanel
                    currentSetupTitle="Current calculator"
                    currentSetupSummary={suggestedSetupName}
                    selectedSavedSetupId={compareTargetSetupId}
                    savedSetupOptions={setups.map((setup) => ({ id: setup.id, label: setup.name }))}
                    onSavedSetupChange={setCompareTargetSetupId}
                    snapshotItems={compactCompareSnapshotItems}
                    onCompare={() => {
                      if (!compareTargetSetupId || !liveCompareHref) return;
                      window.location.href = liveCompareHref;
                    }}
                    onCancel={handleCloseComparePanel}
                    compareDisabled={!compareTargetSetupId}
                  />
                )}
              </div>
            ) : null}

            {savePanelOpen ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                {!proAccessLoading && isAuthenticated && isPro ? (
                  <div className="max-w-xl">
                    <div className="text-sm font-semibold text-slate-900">Save current setup</div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Save the current calculator snapshot directly to Saved Setups.
                    </p>
                  </div>
                ) : null}

                {proAccessLoading ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-700">Checking Pro access…</p>
                  </div>
                ) : saveGateVariant || !isAuthenticated || !isPro ? (
                  <div
                    ref={saveSetupGateRef}
                    tabIndex={-1}
                    className="mt-4 scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-3 outline-none sm:p-4"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      Save this setup with PressureCal Pro
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      Keep your machine, hose, nozzle, and pressure loss calculations in one place so
                      you can come back to them later.
                    </p>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Free users can calculate a setup. Pro users can save, duplicate, and build a working setup library.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        to="/pricing"
                        onClick={() =>
                          trackEvent("pro_bridge_clicked", {
                            source: "save_setup_gate",
                            calculator: "full_setup",
                          })
                        }
                        className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Start saving setups
                      </Link>

                      <button
                        type="button"
                        onClick={handleCloseSavePanel}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Keep calculating
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="text-sm font-semibold text-slate-800">Setup name</span>
                      <input
                        type="text"
                        value={saveName}
                        onChange={(event) => setSaveName(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="text-sm font-semibold text-slate-800">Notes</span>
                      <textarea
                        value={saveNotes}
                        onChange={(event) => setSaveNotes(event.target.value)}
                        rows={4}
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                      />
                    </label>

                    <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleSaveCurrentSetup}
                        disabled={!savedSetupsReady}
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Save setup
                      </button>

                      <button
                        type="button"
                        onClick={handleCloseSavePanel}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {sharePanelOpen ? (
            <div
              ref={sharePanelRef}
              className="mb-6 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Share result
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Share this PressureCal result</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Copy a clean result summary, download a PNG card, or share a short branded link with the exact setup loaded.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseSharePanel}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Export card
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">PressureCal result</p>
                      <p className="mt-1 text-sm text-slate-600">{suggestedSetupName}</p>
                    </div>

                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badge.cls}`}>
                      {badge.text}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">At-gun pressure</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{fmt(r.gunPressurePsi, 0)} PSI</p>
                      <p className="mt-1 text-sm text-slate-600">{fmt(gunBar, 1)} bar</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Flow</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{fmt(gunLpm, 1)} L/min</p>
                      <p className="mt-1 text-sm text-slate-600">{fmt(r.gunFlowGpm, 2)} GPM</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{hoseLossLabel}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{fmt(r.hoseLossPsi, 0)} PSI</p>
                      {isMainLeaderHose ? (
                        <p className="mt-1 text-xs font-medium text-slate-500">Combined from main + leader hose</p>
                      ) : null}
                      <p className="mt-1 text-sm text-slate-600">{fmt(lossBar, 1)} bar</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleNativeShareResult}
                  disabled={shareBusy || pngBusy}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {shareBusy ? "Preparing share link..." : "Share result"}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={pngBusy || shareBusy}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pngBusy ? "Preparing PNG..." : "Download PNG"}
                </button>

                <button
                  type="button"
                  onClick={handleCopyShareResultLink}
                  disabled={shareBusy || pngBusy}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Copy share link
                </button>

                <button
                  type="button"
                  onClick={handleCopyResultSummary}
                  disabled={shareBusy || pngBusy}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Copy result summary
                </button>
              </div>

              {shareMessage ? <p className="mt-3 text-sm font-semibold text-green-700">{shareMessage}</p> : null}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Setup inputs</div>
              </div>

              <div className="grid gap-5 px-5 py-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-800">Rated pressure</label>
                  <div className="mt-2 flex gap-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={inputs.pumpPressure}
                      onFocus={selectAllOnFocus}
                      onChange={(event) => {
                        const nextValue = event.target.value === "" ? "" : Number(event.target.value);
                        updateInput("pumpPressure", nextValue as Inputs["pumpPressure"]);
                        if (!maxWasManuallyEditedRef.current) {
                          updateInput("maxPressure", nextValue as Inputs["maxPressure"]);
                        }
                      }}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    />
                    <select
                      value={inputs.pumpPressureUnit}
                      onChange={(event) => {
                        const nextUnit = event.target.value as PressureUnit;
                        const currentPressurePsi = toPsi(Number(inputs.pumpPressure || 0), inputs.pumpPressureUnit);
                        const currentMaxPsi = toPsi(Number(inputs.maxPressure || 0), inputs.maxPressureUnit);
                        updateInput("pumpPressureUnit", nextUnit);
                        updateInput("pumpPressure", roundForUnit(fromPsi(currentPressurePsi, nextUnit), nextUnit === "psi" ? 0 : 1));
                        updateInput("maxPressureUnit", nextUnit);
                        updateInput("maxPressure", roundForUnit(fromPsi(currentMaxPsi, nextUnit), nextUnit === "psi" ? 0 : 1));
                      }}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    >
                      <option value="psi">PSI</option>
                      <option value="bar">BAR</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800">Rated flow</label>
                  <div className="mt-2 flex gap-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={inputs.pumpFlow}
                      onFocus={selectAllOnFocus}
                      onChange={(event) =>
                        updateInput("pumpFlow", (event.target.value === "" ? "" : Number(event.target.value)) as Inputs["pumpFlow"])
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    />
                    <select
                      value={inputs.pumpFlowUnit}
                      onChange={(event) => {
                        const nextUnit = event.target.value as FlowUnit;
                        const currentFlowGpm = toGpm(Number(inputs.pumpFlow || 0), inputs.pumpFlowUnit);
                        updateInput("pumpFlowUnit", nextUnit);
                        updateInput("pumpFlow", roundForUnit(fromGpm(currentFlowGpm, nextUnit), nextUnit === "gpm" ? 2 : 1));
                      }}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    >
                      <option value="lpm">LPM</option>
                      <option value="gpm">GPM (US)</option>
                    </select>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    GPM in PressureCal means US gallons per minute, matching the convention used by most pressure washer nozzle charts and pump specifications.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800">Max pressure</label>
                  <div className="mt-2 flex gap-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={inputs.maxPressure}
                      onFocus={selectAllOnFocus}
                      onChange={(event) => {
                        maxWasManuallyEditedRef.current = true;
                        updateInput("maxPressure", (event.target.value === "" ? "" : Number(event.target.value)) as Inputs["maxPressure"]);
                      }}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    />
                    <select
                      value={inputs.maxPressureUnit}
                      onChange={(event) => {
                        const nextUnit = event.target.value as PressureUnit;
                        const currentMaxPsi = toPsi(Number(inputs.maxPressure || 0), inputs.maxPressureUnit);
                        updateInput("maxPressureUnit", nextUnit);
                        updateInput("maxPressure", roundForUnit(fromPsi(currentMaxPsi, nextUnit), nextUnit === "psi" ? 0 : 1));
                      }}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    >
                      <option value="psi">PSI</option>
                      <option value="bar">BAR</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    Engine power ({enginePowerUnit === "hp" ? "HP" : "kW"})
                  </label>
                  <div className="mt-2 flex gap-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={enginePowerInputValue}
                      onFocus={selectAllOnFocus}
                      onChange={(event) => updateEnginePowerFromDisplay(event.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    />
                    <select
                      value={enginePowerUnit}
                      onChange={(event) => setEnginePowerUnit(event.target.value as EnginePowerUnit)}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    >
                      <option value="hp">HP</option>
                      <option value="kw">kW</option>
                    </select>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Optional. Enter engine power as horsepower or kilowatts. PressureCal stores this internally as HP for the power check.
                  </p>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-slate-800">Hose setup</label>
                  <select
                    value={hoseSetupMode}
                    onChange={(event) => updateHoseSetupMode(event.target.value as HoseSetupMode)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                  >
                    <option value="single">Single hose</option>
                    <option value="mainLeader">Main + Leader Hose</option>
                  </select>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Use Main + Leader Hose when your setup has a main hose plus a leader hose, whip hose, reel hose or extension hose.
                  </p>
                </div>

                {!isMainLeaderHose ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-800">Hose length</label>
                      <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          value={inputs.hoseLength}
                          onFocus={selectAllOnFocus}
                          onChange={(event) =>
                            updateInput("hoseLength", (event.target.value === "" ? "" : Number(event.target.value)) as Inputs["hoseLength"])
                          }
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                        />
                        <select
                          value={inputs.hoseLengthUnit}
                          onChange={(event) => updateHoseLengthUnit(event.target.value as LengthUnit)}
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950 sm:w-auto"
                        >
                          <option value="m">m</option>
                          <option value="ft">ft</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-800">Hose ID</label>
                      <div className="mt-2 flex gap-3">
                        <select
                          value={String(inputs.hoseId)}
                          onChange={(event) => {
                            updateInput("hoseId", Number(event.target.value) as Inputs["hoseId"]);
                            updateInput("hoseIdUnit", "mm");
                          }}
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                        >
                          {hosePresets.map((preset) => (
                            <option key={preset.label} value={preset.valueMm}>
                              {preset.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Main hose</p>
                        <label className="mt-3 block text-sm font-semibold text-slate-800">Length</label>
                        <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            value={inputs.mainHoseLength ?? ""}
                            onFocus={selectAllOnFocus}
                            onChange={(event) =>
                              updateInput("mainHoseLength", (event.target.value === "" ? "" : Number(event.target.value)) as Inputs["mainHoseLength"])
                            }
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                          />
                          <select
                            value={inputs.hoseLengthUnit}
                            onChange={(event) => updateHoseLengthUnit(event.target.value as LengthUnit)}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950 sm:w-auto"
                          >
                            <option value="m">m</option>
                            <option value="ft">ft</option>
                          </select>
                        </div>

                        <label className="mt-3 block text-sm font-semibold text-slate-800">Internal diameter</label>
                        <select
                          value={String(inputs.mainHoseId ?? inputs.hoseId)}
                          onChange={(event) => {
                            updateInput("mainHoseId", Number(event.target.value) as Inputs["mainHoseId"]);
                            updateInput("hoseIdUnit", "mm");
                          }}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                        >
                          {hosePresets.map((preset) => (
                            <option key={preset.label} value={preset.valueMm}>
                              {preset.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-900">Leader hose / whip hose</p>
                        <label className="mt-3 block text-sm font-semibold text-slate-800">Length</label>
                        <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            value={inputs.leaderHoseLength ?? ""}
                            onFocus={selectAllOnFocus}
                            onChange={(event) =>
                              updateInput("leaderHoseLength", (event.target.value === "" ? "" : Number(event.target.value)) as Inputs["leaderHoseLength"])
                            }
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                          />
                          <select
                            value={inputs.hoseLengthUnit}
                            onChange={(event) => updateHoseLengthUnit(event.target.value as LengthUnit)}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950 sm:w-auto"
                          >
                            <option value="m">m</option>
                            <option value="ft">ft</option>
                          </select>
                        </div>

                        <label className="mt-3 block text-sm font-semibold text-slate-800">Internal diameter</label>
                        <select
                          value={String(inputs.leaderHoseId ?? inputs.hoseId)}
                          onChange={(event) => {
                            updateInput("leaderHoseId", Number(event.target.value) as Inputs["leaderHoseId"]);
                            updateInput("hoseIdUnit", "mm");
                          }}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                        >
                          {hosePresets.map((preset) => (
                            <option key={preset.label} value={preset.valueMm}>
                              {preset.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                      <p>
                        <span className="font-semibold text-slate-900">Total hose length:</span>{" "}
                        {fmt(splitHoseTotalLengthDisplay, 1)} {inputs.hoseLengthUnit}
                      </p>
                      <p className="mt-1 flex flex-col gap-1 sm:block">
                        <span>
                          <span className="font-semibold text-slate-900">Main hose:</span>{" "}
                          {fmt(mainHoseLengthDisplay, 1)} {inputs.hoseLengthUnit}
                        </span>
                        <span className="hidden sm:inline"> · </span>
                        <span>
                          <span className="font-semibold text-slate-900">Leader hose:</span>{" "}
                          {fmt(leaderHoseLengthDisplay, 1)} {inputs.hoseLengthUnit}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-800">Spray mode</label>
                  <select
                    value={inputs.sprayMode}
                    onChange={(event) => {
                      const nextMode = event.target.value as Inputs["sprayMode"];
                      updateInput("sprayMode", nextMode);
                      if (nextMode === "wand") {
                        updateInput("nozzleCount", 1);
                      } else if (Number(inputs.nozzleCount || 1) < 2) {
                        updateInput("nozzleCount", 2);
                      }
                    }}
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                  >
                    <option value="wand">Wand</option>
                    <option value="surfaceCleaner">Surface cleaner</option>
                  </select>
                </div>

                {inputs.sprayMode === "surfaceCleaner" ? (
                  <div>
                    <label className="block text-sm font-semibold text-slate-800">Nozzle count</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[2, 3, 4].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => updateInput("nozzleCount", count as Inputs["nozzleCount"])}
                          className={`inline-flex min-w-[64px] items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                            inputs.nozzleCount === count
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Surface cleaner mode uses 2 or more nozzles. Wand mode stays fixed at 1.
                    </div>
                  </div>
                ) : null}

                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    {inputs.sprayMode === "surfaceCleaner" ? "Nozzle size per nozzle" : "Nozzle size"}
                  </label>
                  <input
                    type="text"
                    value={inputs.nozzleSizeText}
                    onChange={(event) => updateInput("nozzleSizeText", event.target.value as Inputs["nozzleSizeText"])}
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                  />
                  {inputs.sprayMode === "surfaceCleaner" ? (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Enter the size of each individual nozzle. PressureCal multiplies this by the nozzle count.
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${systemBadge.cls}`}>
                    {systemBadge.text}
                  </span>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${enginePowerBadge.cls}`}>
                    {enginePowerBadge.text}
                  </span>
                </div>

                <h2 className="mt-4 text-2xl font-semibold text-slate-900">Setup performance</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  See nozzle match, hose loss, and real at-gun performance in one place.
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">At-gun pressure</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{fmt(r.gunPressurePsi, 0)} PSI</div>
                    <div className="mt-1 text-sm text-slate-600">{fmt(gunBar, 1)} bar</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Flow</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{fmt(gunLpm, 1)} L/min</div>
                    <div className="mt-1 text-sm text-slate-600">{fmt(r.gunFlowGpm, 2)} GPM</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{hoseLossLabel}</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{fmt(r.hoseLossPsi, 0)} PSI</div>
                    {isMainLeaderHose ? (
                      <div className="mt-1 text-xs font-medium text-slate-500">Combined from main + leader hose</div>
                    ) : null}
                    <div className="mt-1 text-sm text-slate-600">{fmt(lossBar, 1)} bar · {efficiencyTier}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Recommended nozzle for rated pump output</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{calibratedDisplayTipCode}{nozzleDisplaySuffix}</div>
                    <div className="mt-1 text-sm text-slate-600">Selected nozzle {selectedDisplayTipCode}{nozzleDisplaySuffix}</div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Recommended size is based on rated pump pressure and flow. At-gun pressure may be lower once hose loss is included.
                    </p>
                  </div>
                </div>

                {isMainLeaderHose ? (
                  <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                      Hose loss breakdown
                    </summary>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Total hose length</div>
                        <div className="mt-2 text-lg font-semibold text-slate-950">
                          {fmt(totalHoseLengthDisplay, 1)} {inputs.hoseLengthUnit}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Main hose pressure loss</div>
                        <div className="mt-2 text-lg font-semibold text-slate-950">{fmt(r.mainHoseLossPsi, 0)} PSI</div>
                        <div className="mt-1 text-sm text-slate-600">{fmt(mainHoseLossBar, 1)} bar</div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Leader hose pressure loss</div>
                        <div className="mt-2 text-lg font-semibold text-slate-950">{fmt(r.leaderHoseLossPsi, 0)} PSI</div>
                        <div className="mt-1 text-sm text-slate-600">{fmt(leaderHoseLossBar, 1)} bar</div>
                      </div>
                    </div>
                  </details>
                ) : null}

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Pressure loss guide</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{efficiencyNote}</p>
                </div>

                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Save this setup when it becomes repeat work
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    You’ve modelled this setup. With PressureCal Pro, you can save it, duplicate it,
                    and build a working library of machine, hose, and nozzle combinations.
                  </p>
                </div>

                <CalculationExplainer
                  className="mt-5"
                  formula={
                    <div className="space-y-2">
                      <p>
                        PressureCal models the setup by converting the rated pressure and flow into
                        PSI/US GPM, applying the selected nozzle relationship, estimating hose loss,
                        then subtracting that loss to estimate at-gun pressure.
                      </p>
                      <p>
                        Hose loss is estimated from flow, hose length, hose ID, water properties,
                        and roughness. Required power is estimated from pump-side outlet pressure and rated pump flow as: HP = (PSI × US GPM) ÷ (1714 × pump efficiency), then also shown in kW.
                      </p>
                      <p>
                        In PressureCal, GPM means US gallons per minute unless otherwise stated.
                      </p>
                    </div>
                  }
                  inputs={fullSetupExplainerInputs}
                  results={fullSetupExplainerResults}
                  explanation={
                    <p>
                      This is intended to show what the complete pressure washer setup is likely
                      doing from pump to gun. The nozzle controls the operating point, the hose
                      removes pressure before the gun, and the engine power check helps flag whether
                      the setup is likely to be short on usable power.
                    </p>
                  }
                  disclaimer={
                    <p>
                      Use this as a setup estimate only. Always confirm with a pressure gauge and
                      check pump, hose, gun, lance, surface cleaner, nozzle, unloader, and engine
                      limits before changing equipment or operating pressure.
                    </p>
                  }
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:hidden">
                <button
                  type="button"
                  onClick={() => setMobileSystemDetailsOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">System details</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Required power, pressure variance, and P × Q reference.
                    </p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg font-semibold text-slate-700">
                    {mobileSystemDetailsOpen ? "−" : "+"}
                  </span>
                </button>

                {mobileSystemDetailsOpen ? (
                  <div className="mt-5 grid gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Required power</div>
                      <div className="mt-2 text-xl font-semibold text-slate-950">{formatEnginePowerFromHp(requiredEngineHp)}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Usable engine power {usableEngineHp > 0 ? formatEnginePowerFromHp(usableEngineHp) : "—"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Pressure variance</div>
                      <div className="mt-2 text-xl font-semibold text-slate-950">{fmt(pressureVariancePct, 1)}%</div>
                      <div className="mt-1 text-sm text-slate-600">{r.statusMessage}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Rated P × Q</div>
                      <div className="mt-2 text-xl font-semibold text-slate-950">{fmt(pqRated, 0)} ({pqClassRated})</div>
                      <div className="mt-1 text-sm text-slate-600">{fmt(ratedBar, 1)} BAR × {fmt(ratedLpm, 1)} LPM</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">At-gun P × Q</div>
                      <div className="mt-2 text-xl font-semibold text-slate-950">{fmt(pqAtGun, 0)} ({pqClassGun})</div>
                      <div className="mt-1 text-sm text-slate-600">{fmt(gunBar, 1)} BAR × {fmt(gunLpm, 1)} LPM</div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:block">
                <h2 className="text-2xl font-semibold text-slate-900">System details</h2>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Required power</div>
                    <div className="mt-2 text-xl font-semibold text-slate-950">{formatEnginePowerFromHp(requiredEngineHp)}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Usable engine power {usableEngineHp > 0 ? formatEnginePowerFromHp(usableEngineHp) : "—"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Pressure variance</div>
                    <div className="mt-2 text-xl font-semibold text-slate-950">{fmt(pressureVariancePct, 1)}%</div>
                    <div className="mt-1 text-sm text-slate-600">{r.statusMessage}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Rated P × Q</div>
                    <div className="mt-2 text-xl font-semibold text-slate-950">{fmt(pqRated, 0)} ({pqClassRated})</div>
                    <div className="mt-1 text-sm text-slate-600">{fmt(ratedBar, 1)} BAR × {fmt(ratedLpm, 1)} LPM</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">At-gun P × Q</div>
                    <div className="mt-2 text-xl font-semibold text-slate-950">{fmt(pqAtGun, 0)} ({pqClassGun})</div>
                    <div className="mt-1 text-sm text-slate-600">{fmt(gunBar, 1)} BAR × {fmt(gunLpm, 1)} LPM</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <div className="max-w-4xl">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                What this full setup calculator checks
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                This full setup calculator is for operators who want to check the whole
                setup in one place, not just one number at a time. It combines machine
                pressure, machine flow, hose length, hose internal diameter, nozzle size,
                and optional engine power in HP or kW so you can estimate the real operating point at
                the gun.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Use this page when a chart or simple converter is not enough — especially
                when the machine feels weak at the gun, hose runs are long, surface cleaner
                nozzle counts change the required nozzle size, or you want to compare rated
                pump pressure with what you are likely to see while working.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/nozzle-size-calculator" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                  Nozzle Size Calculator
                </Link>
                <Link to="/hose-pressure-loss-calculator" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                  Hose Pressure Loss Calculator
                </Link>
                <Link to="/nozzle-size-chart" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                  Nozzle Size Chart
                </Link>
                <Link to="/psi-bar-calculator" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                  PSI ↔ BAR Converter
                </Link>
                <Link to="/lpm-gpm-calculator" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                  LPM ↔ GPM (US) Converter
                </Link>
              </div>
            </div>
          </section>

        </div>
      </section>

      <BackToTopButton />
    </PressureCalLayout>
  );
}

