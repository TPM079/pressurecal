import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import { Link } from "react-router-dom";
import BackToTopButton from "../components/BackToTopButton";
import CompactCurrentVsSavedComparePanel from "../components/CompactCurrentVsSavedComparePanel";
import PressureCalLayout from "../components/PressureCalLayout";
import { useProAccess } from "../hooks/useProAccess";
import { useSavedSetups } from "../hooks/useSavedSetups";
import { buildFullRigSearchParams, parseRigSearchParams } from "../lib/rigUrlState";
import {
  copyTextToClipboard,
  createShortShareLink,
  shareUrlWithNavigator,
} from "../lib/shareLinks";
import { solvePressureCal, barFromPsi, lpmFromGpm, roundTipCodeToFive } from "../pressurecal";
import type { Inputs, PressureUnit, FlowUnit, LengthUnit } from "../pressurecal";

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
  hoseLength: 15,
  hoseLengthUnit: "m",
  hoseId: 9.53,
  hoseIdUnit: "mm",
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
  height: 1040,
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

function selectAllOnFocus(e: FocusEvent<HTMLInputElement>) {
  e.target.select();
}

function toNumberOrNull(value: string | number) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateRequiredHp(pressurePsi: number, flowGpm: number, efficiency = 0.9) {
  if (!Number.isFinite(pressurePsi) || !Number.isFinite(flowGpm) || efficiency <= 0) return 0;
  return (pressurePsi * flowGpm) / (1714 * efficiency);
}

function calculateUsableEngineHp(ratedHp: number, factor = 0.85) {
  return !Number.isFinite(ratedHp) || ratedHp <= 0 ? 0 : ratedHp * factor;
}

function hpStatus(requiredHp: number, usableHp: number) {
  if (usableHp <= 0) {
    return {
      text: "Enter engine HP to evaluate power status.",
      cls: "bg-slate-50 text-slate-700 border-slate-200",
    };
  }

  if (usableHp < requiredHp) {
    return {
      text: "Engine undersized for this setup.",
      cls: "bg-red-50 text-red-800 border-red-200",
    };
  }

  if (usableHp < requiredHp * 1.1) {
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
    `${fmt(Number(inputs.hoseLength || 0), 0)} ${inputs.hoseLengthUnit}`,
    `${fmt(Number(inputs.hoseId || 0), inputs.hoseIdUnit === "in" ? 2 : 1)} ${inputs.hoseIdUnit}`,
    inputs.sprayMode === "surfaceCleaner"
      ? `Nozzle ${inputs.nozzleSizeText || "—"} × ${inputs.nozzleCount}`
      : `Nozzle ${inputs.nozzleSizeText || "—"}`,
    inputs.engineHp === "" ? "Engine HP optional" : `Engine ${fmt(Number(inputs.engineHp || 0), 1)} HP`,
  ].join(" · ");

  return [
    "PressureCal result",
    "",
    `Setup: ${setupLine}`,
    `At-gun pressure: ${fmt(gunPressurePsi, 0)} PSI (${fmt(gunPressureBar, 1)} bar)`,
    `Flow: ${fmt(gunFlowLpm, 1)} L/min (${fmt(gunFlowGpm, 2)} GPM)`,
    `Hose loss: ${fmt(hoseLossPsi, 0)} PSI (${fmt(hoseLossBar, 1)} bar)`,
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
    inputs.engineHp === "" ? "Engine HP optional" : `Engine ${fmt(Number(inputs.engineHp || 0), 1)} HP`;

  return [
    `${fmt(Number(inputs.pumpFlow || 0), inputs.pumpFlowUnit === "gpm" ? 2 : 1)} ${inputs.pumpFlowUnit.toUpperCase()}`,
    `${fmt(Number(inputs.pumpPressure || 0), 0)} ${inputs.pumpPressureUnit.toUpperCase()}`,
    `${fmt(Number(inputs.hoseLength || 0), 0)} ${inputs.hoseLengthUnit}`,
    `${fmt(Number(inputs.hoseId || 0), inputs.hoseIdUnit === "in" ? 2 : 1)} ${inputs.hoseIdUnit}`,
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
  const maxWasManuallyEditedRef = useRef(false);
  const sharePanelRef = useRef<HTMLDivElement | null>(null);

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
    if (sharePanelOpen || savePanelOpen || comparePanelOpen) {
      setMobileMoreActionsOpen(false);
    }
  }, [sharePanelOpen, savePanelOpen, comparePanelOpen]);


  const safeInputs = {
    ...inputs,
    pumpPressure: Number(inputs.pumpPressure || 0),
    pumpFlow: Number(inputs.pumpFlow || 0),
    maxPressure: Number(inputs.maxPressure || 0),
    hoseLength: Number(inputs.hoseLength || 0),
    hoseId: Number(inputs.hoseId || 0),
    engineHp: Number(inputs.engineHp || 0),
  };

  const r = solvePressureCal(safeInputs);
  const gunBar = barFromPsi(r.gunPressurePsi);
  const gunLpm = lpmFromGpm(r.gunFlowGpm);
  const lossBar = barFromPsi(r.hoseLossPsi);
  const requiredHp = calculateRequiredHp(r.gunPressurePsi, r.gunFlowGpm, 0.9);
  const usableEngineHp = calculateUsableEngineHp(Number(inputs.engineHp || 0), 0.85);
  const enginePowerBadge = hpStatus(requiredHp, usableEngineHp);
  const ratedPsi = toPsi(Number(inputs.pumpPressure || 0), inputs.pumpPressureUnit);
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
  const ratedBar = barFromPsi(ratedPsi);
  const ratedGpm = toGpm(Number(inputs.pumpFlow || 0), inputs.pumpFlowUnit);
  const ratedLpm = lpmFromGpm(ratedGpm);
  const pqRated = ratedBar * ratedLpm;
  const pqAtGun = gunBar * gunLpm;
  const pqClassRated = pqRated >= 5600 ? "Class B" : "Class A";
  const pqClassGun = pqAtGun >= 5600 ? "Class B" : "Class A";
  const selectedDisplayTipCode = roundTipCodeToFive(r.selectedTipCode);
  const calibratedDisplayTipCode = roundTipCodeToFive(r.calibratedTipCode);

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
      label: "Hose length",
      value: `${fmt(Number(inputs.hoseLength || 0), 0)} ${inputs.hoseLengthUnit}`,
    },
    {
      label: "Hose ID",
      value: `${fmt(Number(inputs.hoseId || 0), inputs.hoseIdUnit === "in" ? 2 : 1)} ${inputs.hoseIdUnit}`,
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
      value: inputs.engineHp === "" ? "Optional" : `${fmt(Number(inputs.engineHp || 0), 1)} HP`,
    },
  ];

  const shareUrl = useMemo(() => {
    const params = buildFullRigSearchParams(inputs);
    const qs = params.toString();
    return `${window.location.origin}/calculator${qs ? `?${qs}` : ""}`;
  }, [inputs]);

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
      value: inputs.engineHp === "" ? "Not provided" : `${inputs.engineHp} HP`,
    },
    {
      label: "Hose",
      value: `${inputs.hoseLength || "—"} ${inputs.hoseLengthUnit} · ${inputs.hoseId || "—"} ${inputs.hoseIdUnit}`,
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

  function handleOpenSavePanel() {
    setSavePanelOpen(true);
    setComparePanelOpen(false);
    setSaveMessage("");
    setSaveName((current) => (current.trim() ? current : suggestedSetupName));
    setMobileMoreActionsOpen(false);
  }

  function handleCloseSavePanel() {
    setSavePanelOpen(false);
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

      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_CARD.width;
      canvas.height = EXPORT_CARD.height;

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
        EXPORT_CARD.padding,
        EXPORT_CARD.padding,
        canvas.width - EXPORT_CARD.padding * 2,
        canvas.height - EXPORT_CARD.padding * 2,
        EXPORT_CARD.radius,
        "#FFFFFF",
        "#E2E8F0"
      );
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      const cardX = EXPORT_CARD.padding;
      const cardY = EXPORT_CARD.padding;
      const cardWidth = canvas.width - EXPORT_CARD.padding * 2;
      const innerX = cardX + 52;
      const innerY = cardY + 48;
      const innerWidth = cardWidth - 104;

      ctx.textBaseline = "top";
      ctx.fillStyle = "#183170";
      ctx.font = `700 28px ${EXPORT_CARD.fontFamily}`;
      ctx.fillText("PressureCal", innerX, innerY);

      ctx.fillStyle = "#0F172A";
      ctx.font = `700 56px ${EXPORT_CARD.fontFamily}`;
      ctx.fillText("PressureCal result", innerX, innerY + 56);

      ctx.fillStyle = "#475569";
      ctx.font = `500 28px ${EXPORT_CARD.fontFamily}`;
      const setupLines = wrapCanvasText(ctx, suggestedSetupName, innerWidth - 340);
      let setupY = innerY + 136;
      for (const line of setupLines.slice(0, 2)) {
        ctx.fillText(line, innerX, setupY);
        setupY += 36;
      }

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

      const dividerY = innerY + 230;
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
      const exportSetupLine = buildExportSetupLine(inputs);
      const exportSetupLines = wrapCanvasText(ctx, exportSetupLine, innerWidth);
      let exportSetupY = dividerY + 72;
      for (const line of exportSetupLines.slice(0, 2)) {
        ctx.fillText(line, innerX, exportSetupY);
        exportSetupY += 34;
      }

      const metricY = dividerY + 168;
      const metricGap = 24;
      const metricWidth = (innerWidth - metricGap * 2) / 3;
      const metricHeight = 220;

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
        label: "Hose loss",
        value: `${fmt(r.hoseLossPsi, 0)} PSI`,
        secondary: `${fmt(lossBar, 1)} bar`,
      });

      const footerY = metricY + metricHeight + 20;
      const footerCardHeight = 108;

      fillRoundedCard(ctx, innerX, footerY, innerWidth, footerCardHeight, 28, "#F8FAFC", "#E2E8F0");

      ctx.fillStyle = "#64748B";
      ctx.font = `600 20px ${EXPORT_CARD.fontFamily}`;
      ctx.fillText("DETAILS", innerX + 24, footerY + 18);

      ctx.fillStyle = "#0F172A";
      ctx.font = `700 24px ${EXPORT_CARD.fontFamily}`;
      ctx.fillText(`Selected nozzle ${selectedDisplayTipCode}`, innerX + 24, footerY + 48);
      ctx.fillText(`Recommended nozzle ${calibratedDisplayTipCode}`, innerX + 24, footerY + 80);

      ctx.fillStyle = "#475569";
      ctx.font = `500 22px ${EXPORT_CARD.fontFamily}`;
      ctx.fillText(`Pressure loss guide: ${efficiencyTier}`, innerX + 520, footerY + 48);

      const noteLines = wrapCanvasText(ctx, efficiencyNote, innerWidth - 560);
      let noteY = footerY + 80;
      for (const line of noteLines.slice(0, 1)) {
        ctx.fillText(line, innerX + 520, noteY);
        noteY += 28;
      }

      ctx.fillStyle = "#475569";
      ctx.font = `600 22px ${EXPORT_CARD.fontFamily}`;
      ctx.fillText("pressurecal.com", innerX, canvas.height - 150);

      ctx.fillStyle = "#64748B";
      ctx.font = `500 20px ${EXPORT_CARD.fontFamily}`;
      ctx.fillText("Model your machine from pump to gun.", innerX, canvas.height - 114);

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

  function handleSaveCurrentSetup() {
    if (!isAuthenticated || !userId) {
      window.alert("Please sign in before saving setups.");
      return;
    }

    if (!isPro) {
      window.alert("Save Setup is available on PressureCal Pro.");
      return;
    }

    const trimmedName = saveName.trim();
    if (!trimmedName) {
      window.alert("Please enter a setup name.");
      return;
    }

    const nozzleSizeText = (inputs.nozzleSizeText || "").trim() || null;

    saveSetup({
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
      engineHp: toNumberOrNull(inputs.engineHp),
      sprayMode: inputs.sprayMode,
      nozzleCount: Math.max(inputs.sprayMode === "surfaceCleaner" ? 2 : 1, Number(inputs.nozzleCount || 1)),
      nozzleSizeText,
      orificeMm: toNumberOrNull(inputs.orificeMm) ?? 1.2,
      dischargeCoeffCd: toNumberOrNull(inputs.dischargeCoeffCd) ?? 0.62,
      waterDensity: toNumberOrNull(inputs.waterDensity) ?? 1000,
      hoseRoughnessMm: toNumberOrNull(inputs.hoseRoughnessMm) ?? 0.0015,
    });

    setSaveMessage("Setup saved");
    setSavePanelOpen(false);
    window.setTimeout(() => setSaveMessage(""), 2500);
  }

  function updateInput<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  return (
    <PressureCalLayout hideFeedbackWidget={sharePanelOpen}>
      <Helmet>
        <title>Full Setup Calculator | Hose Loss, Nozzle Match & At-Gun Pressure</title>
        <meta
          name="description"
          content="Model hose loss, nozzle match, at-gun pressure, flow, and power requirement in one full pressure washer setup calculator."
        />
        <link rel="canonical" href="https://www.pressurecal.com/calculator" />
      </Helmet>

      <section className="-mx-4 bg-slate-100 px-4 pb-8 pt-12 sm:pb-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Full setup calculator
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Full Setup Calculator
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Model nozzle match, hose loss, at-gun pressure, flow, and power requirement in one working view.
            </p>
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
                    Everything PressureCal is modelling right now, ready to share, save, or compare.
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

              <div className="text-xs text-slate-500">
                {isAuthenticated && isPro
                  ? "Share this exact setup, or save and compare it once it becomes a repeat-job setup."
                  : "Share this exact setup, then save or compare it later if it becomes repeat work."}
              </div>
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
                <div className="max-w-xl">
                  <div className="text-sm font-semibold text-slate-900">Save current setup</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Save the current calculator snapshot directly to Saved Setups.
                  </p>
                </div>

                {!proAccessLoading && !isAuthenticated ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-700">Sign in to save setups to your PressureCal account.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        to="/account"
                        className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Sign in
                      </Link>
                      <button
                        type="button"
                        onClick={handleCloseSavePanel}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : !proAccessLoading && isAuthenticated && !isPro ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-700">Save Setup is part of PressureCal Pro.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        to="/pro"
                        className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        View PressureCal Pro
                      </Link>
                      <button
                        type="button"
                        onClick={handleCloseSavePanel}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Cancel
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
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Hose loss</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{fmt(r.hoseLossPsi, 0)} PSI</p>
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
                      <option value="gpm">GPM</option>
                    </select>
                  </div>
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
                  <label className="block text-sm font-semibold text-slate-800">Engine HP</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={inputs.engineHp}
                    onFocus={selectAllOnFocus}
                    onChange={(event) => updateInput("engineHp", (event.target.value === "" ? "" : Number(event.target.value)) as Inputs["engineHp"])}
                    placeholder="Optional"
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800">Hose length</label>
                  <div className="mt-2 flex gap-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={inputs.hoseLength}
                      onFocus={selectAllOnFocus}
                      onChange={(event) =>
                        updateInput("hoseLength", (event.target.value === "" ? "" : Number(event.target.value)) as Inputs["hoseLength"])
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    />
                    <select
                      value={inputs.hoseLengthUnit}
                      onChange={(event) => {
                        const nextUnit = event.target.value as LengthUnit;
                        const currentMeters = toMeters(Number(inputs.hoseLength || 0), inputs.hoseLengthUnit);
                        updateInput("hoseLengthUnit", nextUnit);
                        updateInput("hoseLength", roundForUnit(fromMeters(currentMeters, nextUnit), 1));
                      }}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
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
                  <label className="block text-sm font-semibold text-slate-800">Nozzle size</label>
                  <input
                    type="text"
                    value={inputs.nozzleSizeText}
                    onChange={(event) => updateInput("nozzleSizeText", event.target.value as Inputs["nozzleSizeText"])}
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                  />
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

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
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
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Hose loss</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{fmt(r.hoseLossPsi, 0)} PSI</div>
                    <div className="mt-1 text-sm text-slate-600">{fmt(lossBar, 1)} bar · {efficiencyTier}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Recommended nozzle</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{calibratedDisplayTipCode}</div>
                    <div className="mt-1 text-sm text-slate-600">Selected nozzle {selectedDisplayTipCode}</div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Pressure loss guide</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{efficiencyNote}</p>
                </div>
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
                      Required HP, pressure variance, and P × Q reference.
                    </p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg font-semibold text-slate-700">
                    {mobileSystemDetailsOpen ? "−" : "+"}
                  </span>
                </button>

                {mobileSystemDetailsOpen ? (
                  <div className="mt-5 grid gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Required HP</div>
                      <div className="mt-2 text-xl font-semibold text-slate-950">{fmt(requiredHp, 1)} HP</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Usable engine HP {usableEngineHp > 0 ? fmt(usableEngineHp, 1) : "—"}
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

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Required HP</div>
                    <div className="mt-2 text-xl font-semibold text-slate-950">{fmt(requiredHp, 1)} HP</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Usable engine HP {usableEngineHp > 0 ? fmt(usableEngineHp, 1) : "—"}
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
                and optional engine power so you can estimate the real operating point at
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
                  LPM ↔ GPM Converter
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

