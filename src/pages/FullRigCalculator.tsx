
import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import { Link } from "react-router-dom";
import BackToTopButton from "../components/BackToTopButton";
import PressureCalLayout from "../components/PressureCalLayout";
import { useProAccess } from "../hooks/useProAccess";
import { useSavedSetups } from "../hooks/useSavedSetups";
import { buildFullRigSearchParams, parseRigSearchParams } from "../lib/rigUrlState";
import { solvePressureCal, barFromPsi, lpmFromGpm, roundTipCodeToFive } from "../pressurecal";
import type { Inputs, PressureUnit, FlowUnit, LengthUnit, DiameterUnit } from "../pressurecal";

const hosePresets = [
  { label: '1/4" (6.35 mm)', valueMm: 6.35 },
  { label: '5/16" (7.94 mm)', valueMm: 7.94 },
  { label: '3/8" (9.53 mm)', valueMm: 9.53 },
  { label: '1/2" (12.70 mm)', valueMm: 12.7 },
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

function fmt(n: number, dp: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dp);
}

function toPsi(value: number, unit: PressureUnit) {
  return unit === "psi" ? value : value * 14.5037738;
}

function toGpm(value: number, unit: FlowUnit) {
  return unit === "gpm" ? value : value / 3.785411784;
}

function fromPsi(value: number, unit: PressureUnit) {
  return unit === "psi" ? value : value / 14.5037738;
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

  const parts = [`${fmt(pressureValue, 0)} ${pressureUnit}`, `${fmt(flowValue, flowUnit === "LPM" ? 1 : 2)} ${flowUnit}`];

  if (nozzleText) {
    parts.push(`tip ${nozzleText}`);
  }

  parts.push(modeText);

  return parts.join(" · ");
}

function toNumberOrNull(value: string | number) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
  const { inputs, gunPressurePsi, gunPressureBar, gunFlowLpm, gunFlowGpm, hoseLossPsi, hoseLossBar, nozzleStatusText, nozzleStatusMessage, selectedTipCode } = args;
  const setupLine = [
    `${fmt(Number(inputs.pumpPressure || 0), 0)} ${inputs.pumpPressureUnit.toUpperCase()}`,
    `${fmt(Number(inputs.pumpFlow || 0), inputs.pumpFlowUnit === "gpm" ? 2 : 1)} ${inputs.pumpFlowUnit.toUpperCase()}`,
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
  const [lastSavedSetupId, setLastSavedSetupId] = useState<string | null>(null);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const maxWasManuallyEditedRef = useRef(false);

  const { loading: proAccessLoading, isAuthenticated, isPro, userId } = useProAccess();
  const { isReady: savedSetupsReady, saveSetup } = useSavedSetups(userId);

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
    if (!savePanelOpen) {
      return;
    }

    setSaveName((current) => (current.trim() ? current : suggestedSetupName));
  }, [savePanelOpen, suggestedSetupName]);

  useEffect(() => {
    if (!sharePanelOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSharePanelOpen(false);
        setShareMessage("");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sharePanelOpen]);

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

  async function copySetupLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyMessage("Setup link copied");
      window.setTimeout(() => setCopyMessage(""), 2000);
    } catch {
      window.prompt("Copy this link:", shareUrl);
    }
  }


  async function handleCopyShareResultLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareMessage("Share link copied");
      window.setTimeout(() => setShareMessage(""), 2000);
    } catch {
      window.prompt("Copy this link:", shareUrl);
    }
  }

  async function handleCopyResultSummary() {
    try {
      await navigator.clipboard.writeText(shareSummaryText);
      setShareMessage("Result summary copied");
      window.setTimeout(() => setShareMessage(""), 2000);
    } catch {
      window.prompt("Copy this summary:", shareSummaryText);
    }
  }

  function handleOpenSharePanel() {
    setSharePanelOpen(true);
    setShareMessage("");
  }

  function handleCloseSharePanel() {
    setSharePanelOpen(false);
    setShareMessage("");
  }

  function handleOpenSavePanel() {
    setSavePanelOpen(true);
    setSaveMessage("");
    setSaveName((current) => (current.trim() ? current : suggestedSetupName));
  }

  function handleCloseSavePanel() {
    setSavePanelOpen(false);
    setSaveMessage("");
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

    const saved = saveSetup({
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

    setLastSavedSetupId(saved.id);
    setSaveMessage("Setup saved");
    setSavePanelOpen(false);
    window.setTimeout(() => setSaveMessage(""), 2500);
  }

  return (
    <PressureCalLayout>
      <Helmet>
        <title>Full Setup Calculator | PressureCal</title>
        <meta
          name="description"
          content="Model a real pressure washer setup, including hose loss, nozzle match, at-gun pressure, flow, and power requirement."
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
              Model your real pressure washer setup
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              See how hose length, hose ID, nozzle size, and machine specs affect real-world performance.
            </p>
          </div>

          <div
            className={`mb-6 rounded-2xl border px-5 py-4 shadow-sm transition-all duration-700 ${
              highlightSetup ? "border-blue-300 bg-blue-50 shadow-lg" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Your setup
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Live summary of what PressureCal is modelling right now.
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

              <div className="flex flex-col items-start gap-2 lg:items-end">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copySetupLink}
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 hover:shadow-lg"
                  >
                    {copyMessage ? "Copied ✓" : "Copy setup link"}
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenSharePanel}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
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
                </div>

                <div className="text-xs text-slate-500">
                  {copyMessage
                    ? copyMessage
                    : isAuthenticated && isPro
                      ? "Save this exact rig into your Saved Setups library."
                      : "Share this exact rig setup."}
                </div>
              </div>
            </div>

            {savePanelOpen ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-xl">
                    <div className="text-sm font-semibold text-slate-900">Save current setup</div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Save the current calculator snapshot directly to Saved Setups. Engine HP stays optional and the saved setup will work with open, compare, and share.
                    </p>
                  </div>

                  {lastSavedSetupId ? (
                    <Link
                      to="/saved-setups"
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      View saved setups
                    </Link>
                  ) : null}
                </div>

                {!proAccessLoading && !isAuthenticated ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-700">
                      Sign in to save setups to your PressureCal account.
                    </p>
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
                ) : null}

                {!proAccessLoading && isAuthenticated && !isPro ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-700">
                      Save Setup is part of PressureCal Pro.
                    </p>
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
                ) : null}

                {(!proAccessLoading && isAuthenticated && isPro) ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="text-sm font-semibold text-slate-800">Setup name</span>
                      <input
                        type="text"
                        value={saveName}
                        onChange={(event) => setSaveName(event.target.value)}
                        placeholder="Example: Trailer rig · 4000 PSI · 15 LPM"
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="text-sm font-semibold text-slate-800">Notes</span>
                      <textarea
                        value={saveNotes}
                        onChange={(event) => setSaveNotes(event.target.value)}
                        placeholder="Optional notes about pump, hose, gun, reel, or use case."
                        rows={4}
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                      />
                    </label>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:col-span-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                        Snapshot being saved
                      </div>
                      <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <span className="font-semibold text-slate-900">Pump:</span>{" "}
                          {inputs.pumpPressure || "—"} {inputs.pumpPressureUnit.toUpperCase()} · {inputs.pumpFlow || "—"} {inputs.pumpFlowUnit.toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900">Max pressure:</span>{" "}
                          {inputs.maxPressure || "—"} {inputs.maxPressureUnit.toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900">Engine:</span>{" "}
                          {inputs.engineHp === "" ? "Not provided" : `${inputs.engineHp} HP`}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900">Hose:</span>{" "}
                          {inputs.hoseLength || "—"} {inputs.hoseLengthUnit} · {inputs.hoseId || "—"} {inputs.hoseIdUnit}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900">Spray mode:</span>{" "}
                          {inputs.sprayMode === "surfaceCleaner" ? "Surface cleaner" : "Wand"}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900">Nozzle:</span>{" "}
                          {inputs.nozzleSizeText || "—"}{inputs.sprayMode === "surfaceCleaner" ? ` × ${inputs.nozzleCount}` : ""}
                        </div>
                      </div>
                    </div>

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
                ) : null}
              </div>
            ) : null}
          </div>

          <main className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Setup inputs
                </h2>
              </div>

              <div className="space-y-5 px-5 py-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Rated pressure ({inputs.pumpPressureUnit.toUpperCase()})
                  </label>
                  <div className="mt-2 flex gap-3">
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                      type="number"
                      inputMode="decimal"
                      value={inputs.pumpPressure}
                      onFocus={selectAllOnFocus}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInputs((s) => {
                          const nextState: Inputs = {
                            ...s,
                            pumpPressure: val === "" ? "" : Number(val),
                          };

                          if (!maxWasManuallyEditedRef.current) {
                            nextState.maxPressure = val === "" ? "" : Number(val);
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
                        const nextUnit = e.target.value as PressureUnit;
                        setInputs((s) => {
                          if (s.pumpPressureUnit === nextUnit) return s;

                          const pumpPressurePsi = toPsi(Number(s.pumpPressure || 0), s.pumpPressureUnit);
                          const nextState: Inputs = {
                            ...s,
                            pumpPressure: roundForUnit(fromPsi(pumpPressurePsi, nextUnit), nextUnit === "psi" ? 0 : 1),
                            pumpPressureUnit: nextUnit,
                          };

                          if (!maxWasManuallyEditedRef.current) {
                            nextState.maxPressure = roundForUnit(
                              fromPsi(pumpPressurePsi, nextUnit),
                              nextUnit === "psi" ? 0 : 1
                            );
                            nextState.maxPressureUnit = nextUnit;
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
                  <label className="block text-sm font-medium text-slate-700">
                    Rated flow ({inputs.pumpFlowUnit === "lpm" ? "LPM" : "GPM"})
                  </label>
                  <div className="mt-2 flex gap-3">
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                      type="number"
                      inputMode="decimal"
                      value={inputs.pumpFlow}
                      onFocus={selectAllOnFocus}
                      onChange={(e) =>
                        setInputs((s) => ({
                          ...s,
                          pumpFlow: e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                    />
                    <select
                      className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                      value={inputs.pumpFlowUnit}
                      onChange={(e) =>
                        setInputs((s) => {
                          const nextUnit = e.target.value as FlowUnit;
                          if (s.pumpFlowUnit === nextUnit) return s;

                          const flowGpm = toGpm(Number(s.pumpFlow || 0), s.pumpFlowUnit);
                          return {
                            ...s,
                            pumpFlow: roundForUnit(fromGpm(flowGpm, nextUnit), nextUnit === "gpm" ? 2 : 1),
                            pumpFlowUnit: nextUnit,
                          };
                        })
                      }
                    >
                      <option value="lpm">L/min</option>
                      <option value="gpm">GPM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Max pressure (unloader) ({inputs.maxPressureUnit.toUpperCase()})
                  </label>
                  <div className="mt-2 flex gap-3">
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                      type="number"
                      inputMode="decimal"
                      value={inputs.maxPressure}
                      onFocus={selectAllOnFocus}
                      onChange={(e) => {
                        maxWasManuallyEditedRef.current = true;
                        setInputs((s) => ({
                          ...s,
                          maxPressure: e.target.value === "" ? "" : Number(e.target.value),
                        }));
                      }}
                    />
                    <select
                      className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                      value={inputs.maxPressureUnit}
                      onChange={(e) => {
                        maxWasManuallyEditedRef.current = true;
                        setInputs((s) => {
                          const nextUnit = e.target.value as PressureUnit;
                          if (s.maxPressureUnit === nextUnit) return s;

                          const maxPressurePsi = toPsi(Number(s.maxPressure || 0), s.maxPressureUnit);
                          return {
                            ...s,
                            maxPressure: roundForUnit(fromPsi(maxPressurePsi, nextUnit), nextUnit === "psi" ? 0 : 1),
                            maxPressureUnit: nextUnit,
                          };
                        });
                      }}
                    >
                      <option value="psi">psi</option>
                      <option value="bar">bar</option>
                    </select>
                  </div>
                  {!maxWasManuallyEditedRef.current && (
                    <div className="mt-2 text-xs text-slate-500">
                      Synced to rated pressure. Edit this only if the unloader is intentionally set differently.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Engine HP</label>
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    type="number"
                    inputMode="decimal"
                    value={inputs.engineHp}
                    onFocus={selectAllOnFocus}
                    onChange={(e) =>
                      setInputs((s) => ({
                        ...s,
                        engineHp: e.target.value === "" ? "" : Number(e.target.value),
                      }))
                    }
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Used to estimate whether the machine can realistically support the setup.
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Spray mode</label>
                  <div className="mt-2 flex gap-2">
                    {(["wand", "surfaceCleaner"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          setInputs((s) => ({
                            ...s,
                            sprayMode: mode,
                            nozzleCount: mode === "surfaceCleaner" ? Math.max(2, s.nozzleCount || 2) : 1,
                          }))
                        }
                        className={`rounded-lg px-4 py-2 text-sm font-semibold border ${
                          inputs.sprayMode === mode
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {mode === "wand" ? "Wand" : "Surface Cleaner"}
                      </button>
                    ))}
                  </div>
                </div>

                {inputs.sprayMode === "surfaceCleaner" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Number of nozzles</label>
                    <div className="mt-2 flex gap-2">
                      {[2, 3, 4].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setInputs((s) => ({ ...s, nozzleCount: n }))}
                          className={`rounded-lg px-3 py-2 text-sm font-semibold border ${
                            inputs.nozzleCount === n
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="h-px bg-slate-200" />

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Hose length (installed) ({inputs.hoseLengthUnit})
                  </label>
                  <div className="mt-2 flex gap-3">
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                      type="number"
                      inputMode="decimal"
                      value={inputs.hoseLength}
                      onFocus={selectAllOnFocus}
                      onChange={(e) =>
                        setInputs((s) => ({
                          ...s,
                          hoseLength: e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                    />
                    <select
                      className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                      value={inputs.hoseLengthUnit}
                      onChange={(e) =>
                        setInputs((s) => {
                          const nextUnit = e.target.value as LengthUnit;
                          if (s.hoseLengthUnit === nextUnit) return s;

                          const hoseLengthMeters = toMeters(Number(s.hoseLength || 0), s.hoseLengthUnit);
                          return {
                            ...s,
                            hoseLength: roundForUnit(fromMeters(hoseLengthMeters, nextUnit), 1),
                            hoseLengthUnit: nextUnit,
                          };
                        })
                      }
                    >
                      <option value="m">m</option>
                      <option value="ft">ft</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Hose internal diameter ({inputs.hoseIdUnit})
                  </label>
                  <div className="mt-2 flex gap-3">
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                      type="number"
                      inputMode="decimal"
                      value={inputs.hoseId}
                      onFocus={selectAllOnFocus}
                      onChange={(e) =>
                        setInputs((s) => ({
                          ...s,
                          hoseId: e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
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
                        if (Number.isFinite(mm) && mm > 0) {
                          setInputs((s) => ({ ...s, hoseId: mm, hoseIdUnit: "mm" }));
                        }
                      }}
                    >
                      <option value="">Hose preset (optional)…</option>
                      {hosePresets.map((preset) => (
                        <option key={preset.valueMm} value={preset.valueMm}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="h-px bg-slate-200" />

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    {inputs.sprayMode === "surfaceCleaner"
                      ? "Selected nozzle tip (per nozzle)"
                      : "Selected nozzle tip"}
                  </label>
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                    placeholder="e.g. 040"
                    value={inputs.nozzleSizeText}
                    onFocus={selectAllOnFocus}
                    onChange={(e) => setInputs((s) => ({ ...s, nozzleSizeText: e.target.value }))}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                      Calculated performance
                    </h2>
                    <button
                      type="button"
                      onClick={handleOpenSharePanel}
                      className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Share result
                    </button>
                  </div>
                  <div
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${systemBadge.cls}`}
                  >
                    {systemBadge.text}
                  </div>
                </div>
              </div>

              <div className="space-y-5 px-5 py-4">
                <div className="rounded-2xl border border-slate-300 bg-slate-100 px-5 py-5">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Estimated at-gun pressure
                  </div>
                  <div className="mt-2 text-5xl font-semibold tracking-tight text-slate-900">
                    {fmt(r.gunPressurePsi, 0)}{" "}
                    <span className="ml-1 text-sm font-medium text-slate-500">PSI</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">({fmt(gunBar, 1)} bar)</div>
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
                  Pressure loss guide: <strong>{efficiencyTier}</strong> — {efficiencyNote}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
                      Operating flow rate
                    </div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">
                      {fmt(gunLpm, 1)} <span className="text-sm font-medium text-slate-600">L/min</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">({fmt(r.gunFlowGpm, 2)} GPM)</div>
                  </div>

                  <div className="rounded-xl border border-slate-200 px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
                      Hose pressure loss
                    </div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">
                      {fmt(r.hoseLossPsi, 0)} <span className="text-sm font-medium text-slate-600">PSI</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">({fmt(lossBar, 1)} bar)</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">Engine power check</div>
                    <div
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${enginePowerBadge.cls}`}
                    >
                      {enginePowerBadge.text}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
                        Required HP
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">
                        {fmt(requiredHp, 1)} <span className="text-sm font-medium text-slate-600">HP</span>
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
                        Usable engine HP
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">
                        {fmt(usableEngineHp, 1)} <span className="text-sm font-medium text-slate-600">HP</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                        AS/NZS 4233.01 Reference (P × Q)
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        Uses <strong>Pressure (bar)</strong> × <strong>Flow (L/min)</strong>, threshold 5600.
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        pqClassGun === "Class B"
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {pqClassGun}
                    </span>
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
                        Based on the calculated operating point.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">Nozzle match status</div>
                    <div
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badge.cls}`}
                    >
                      {badge.text}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{r.statusMessage}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
                      {inputs.sprayMode === "surfaceCleaner"
                        ? "Selected nozzle tip (per nozzle)"
                        : "Selected nozzle tip"}
                    </div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">
                      {selectedDisplayTipCode}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      Orifice {fmt(r.selectedOrificeMm, 2)} mm
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
                      {inputs.sprayMode === "surfaceCleaner"
                        ? "Nozzle equivalent for rated pressure (per nozzle)"
                        : "Nozzle equivalent for rated pressure"}
                    </div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">
                      {calibratedDisplayTipCode}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      ≈ {fmt(lpmFromGpm(r.calibratedNozzleQ4000Gpm), 1)} L/min ({fmt(r.calibratedNozzleQ4000Gpm, 2)} GPM @ 4000 PSI)
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </section>


      {sharePanelOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Share result
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Share this PressureCal result
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Copy a clean result summary or share the live calculator link with the exact rig loaded.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseSharePanel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-lg font-semibold text-slate-600 transition hover:bg-slate-100"
                aria-label="Close share result panel"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Export card
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">PressureCal result</div>
                      <div className="mt-1 text-sm text-slate-600">{suggestedSetupName}</div>
                    </div>

                    <div
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badge.cls}`}
                    >
                      {badge.text}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                        At-gun pressure
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-950">
                        {fmt(r.gunPressurePsi, 0)} <span className="text-sm font-medium text-slate-500">PSI</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">{fmt(gunBar, 1)} bar</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                        Flow
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-950">
                        {fmt(gunLpm, 1)} <span className="text-sm font-medium text-slate-500">L/min</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">{fmt(r.gunFlowGpm, 2)} GPM</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                        Hose loss
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-950">
                        {fmt(r.hoseLossPsi, 0)} <span className="text-sm font-medium text-slate-500">PSI</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">{fmt(lossBar, 1)} bar</div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="font-semibold text-slate-900">Pump:</span>{" "}
                      {inputs.pumpPressure || "—"} {inputs.pumpPressureUnit.toUpperCase()} · {inputs.pumpFlow || "—"} {inputs.pumpFlowUnit.toUpperCase()}
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="font-semibold text-slate-900">Hose:</span>{" "}
                      {inputs.hoseLength || "—"} {inputs.hoseLengthUnit} · {inputs.hoseId || "—"} {inputs.hoseIdUnit}
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="font-semibold text-slate-900">Nozzle:</span>{" "}
                      {inputs.nozzleSizeText || "—"}{inputs.sprayMode === "surfaceCleaner" ? ` × ${inputs.nozzleCount}` : ""}
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="font-semibold text-slate-900">Engine:</span>{" "}
                      {inputs.engineHp === "" ? "Optional" : `${fmt(Number(inputs.engineHp || 0), 1)} HP`}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                      Nozzle status
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{badge.text}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{r.statusMessage}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-sm font-semibold text-slate-900">Share actions</div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleCopyShareResultLink}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Copy share link
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyResultSummary}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Copy result summary
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseSharePanel}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  {shareMessage || "Copy the live link or a clean text summary for messages, quotes, or job notes."}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <BackToTopButton />
    </PressureCalLayout>
  );
}
