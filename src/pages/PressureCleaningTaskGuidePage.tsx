import { Helmet } from "react-helmet-async";
import { Link, Navigate, useParams } from "react-router-dom";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import PressureCalLayout from "../components/PressureCalLayout";
import { useProAccess } from "../hooks/useProAccess";
import { useSavedSetups } from "../hooks/useSavedSetups";
import { savedSetupToInputs } from "../lib/savedSetupToInputs";
import { trackEvent } from "../lib/analytics";
import {
  buildPressureCleaningTaskGuideSearchParams,
  calculatePressureCleaningTaskGuide,
  describeHoseConfiguration,
  hasPressureCleaningAdvancedValues,
  applyPressureCleaningTaskDefaults,
  inputsFromFullCalculatorInputs,
  normalisePressureCleaningTaskGuideInput,
  parsePressureCleaningTaskGuideSearchParams,
  SURFACE_CLEANER_MIN_NOZZLE_COUNT,
  TASK_GUIDE_FAN_ANGLES,
  travertineCanShowSoundSurfaceConfirmation,
  type PressureCleaningNozzleOption,
  type PressureCleaningTaskGuideInput,
  type PressureCleaningTaskGuideResult,
} from "../lib/pressureCleaningTaskGuide";
import {
  getPressureCleaningTaskBySlug,
  getVisiblePressureCleaningTasks,
  PRESSURE_CLEANING_TASK_CATEGORIES,
  pressureCleaningTaskRecords,
  searchPressureCleaningTasks,
  type ConditionalField,
  type PressureCleaningTaskRecord,
} from "../data/pressureCleaningTaskGuides";
import { getPressureCleaningSource } from "../data/pressureCleaningTaskGuideSources";

const SITE_URL = "https://www.pressurecal.com";

const DEFAULT_INPUT: PressureCleaningTaskGuideInput = {
  taskSlug: "painted-acrylic-hard-tennis-court",
  jobName: "Court clean",
  machinePressure: 4000,
  machinePressureUnit: "psi",
  machineFlow: 21,
  machineFlowUnit: "lpm",
  maxPressureUnit: "psi",
  attachmentType: "surfaceCleaner",
  surfaceCleanerDiameter: 20,
  surfaceCleanerDiameterUnit: "in",
  nozzleCount: 2,
  nozzleSprayAngleDeg: 25,
  currentNozzleText: "030",
  attachmentMaxPressureExclusive: false,
  hose: {
    hoseSetupMode: "single",
    hoseLengthUnit: "m",
    hoseIdUnit: "mm",
  },
  jobDetails: {
    materialFinish: "unknown",
    filledStatus: "unknown",
    sealedStatus: "unknown",
    jointCondition: "unknown",
    installationArea: "outdoor",
  },
};

function taskPath(task: PressureCleaningTaskRecord) {
  return `/pressure-cleaning-task-guide/${task.slug}`;
}

function num(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNum(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function valueText(value?: number) {
  return value === undefined ? "" : String(value);
}

function fmt(value?: number, decimals = 0) {
  return value !== undefined && Number.isFinite(value) ? value.toFixed(decimals) : "-";
}

function optionClass(option: PressureCleaningNozzleOption) {
  if (
    option.status === "exceeds-task-limit" ||
    option.status === "well-above-task-limit"
  ) {
    return "border-red-200 bg-red-50";
  }
  if (option.status === "review" || option.status === "below-working-range") {
    return "border-amber-200 bg-amber-50";
  }
  return "border-emerald-200 bg-emerald-50";
}

function hydraulicLabel(result: ReturnType<typeof calculatePressureCleaningTaskGuide>) {
  if (result.hydraulicCompatibility === "compatible") return "Hydraulically compatible";
  if (result.hydraulicCompatibility === "outside-equipment-rating") return "Outside equipment rating";
  return "Not calculated";
}

function taskMethodLabel(result: ReturnType<typeof calculatePressureCleaningTaskGuide>) {
  if (result.taskMethodCompatibility === "suitable") return "Task method suitable";
  if (result.taskMethodCompatibility === "caution") return "Compatible with caution";
  if (result.taskMethodCompatibility === "avoid-pressure") return "Avoid pressure cleaning";
  if (result.taskMethodCompatibility === "no-validated-overlap") return "No validated overlap";
  if (result.taskMethodCompatibility === "prohibited") return "Prohibited";
  return "Confirmation required";
}

function guidanceModeLabel(mode: PressureCleaningTaskGuideResult["effectiveGuidance"]["mode"]) {
  if (mode === "maximum-only") return "Maximum-only guidance";
  if (mode === "numeric-range") return "Editorial working range";
  if (mode === "manufacturer-confirmation-required") return "Manufacturer confirmation";
  if (mode === "avoid-pressure") return "Avoid pressure washing";
  if (mode === "specialist-only") return "Specialist guidance";
  if (mode === "prohibited") return "Prohibited";
  return "Qualitative guidance";
}

function pressureSummary(value?: number) {
  return value !== undefined && Number.isFinite(value) ? `${fmt(value)} PSI` : "—";
}

function overlapLabel(status: PressureCleaningTaskGuideResult["overlapStatus"]) {
  if (status === "validated-overlap") return "Validated overlap";
  if (status === "no-validated-overlap") return "No validated overlap";
  return "Not applicable";
}

function overallStatusClass(result: PressureCleaningTaskGuideResult) {
  if (result.overallRecommendationStatus === "suitable-starting-setup") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (
    result.overallRecommendationStatus === "pressure-cleaning-not-recommended" ||
    result.overallRecommendationStatus === "prohibited" ||
    result.overallRecommendationStatus === "exceeds-task-limit"
  ) {
    return "bg-red-50 text-red-700";
  }
  return "bg-amber-50 text-amber-800";
}

function validationPanelClass(result: PressureCleaningTaskGuideResult) {
  return result.overallRecommendationStatus === "pressure-cleaning-not-recommended" ||
    result.overallRecommendationStatus === "prohibited"
    ? "border-red-200 bg-red-50 text-red-950"
    : "border-amber-200 bg-amber-50 text-amber-950";
}

function attachmentInputState(
  current: PressureCleaningTaskGuideInput,
  attachmentType: PressureCleaningTaskGuideInput["attachmentType"]
) {
  if (attachmentType === "surfaceCleaner") {
    return {
      ...current,
      attachmentType,
      nozzleCount:
        Number.isInteger(current.nozzleCount) && current.nozzleCount >= SURFACE_CLEANER_MIN_NOZZLE_COUNT
          ? current.nozzleCount
          : SURFACE_CLEANER_MIN_NOZZLE_COUNT,
    };
  }

  return {
    ...current,
    attachmentType,
    nozzleCount:
      !Number.isInteger(current.nozzleCount) || current.nozzleCount === SURFACE_CLEANER_MIN_NOZZLE_COUNT
        ? 1
        : current.nozzleCount,
  };
}

function OptionCard({ option, prominent = false }: { option: PressureCleaningNozzleOption; prominent?: boolean }) {
  return (
    <article className={`rounded-2xl border p-5 ${optionClass(option)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{option.label}</p>
          <p
            aria-label={option.accessibleLabel}
            className={prominent ? "mt-2 text-4xl font-black text-slate-950" : "mt-2 text-3xl font-bold text-slate-950"}
          >
            {option.setupCode}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-slate-700">
          {option.statusLabel}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Per nozzle</dt>
          <dd className="font-bold text-slate-950">Size {fmt(option.nozzleSize, 2)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Total effective</dt>
          <dd className="font-bold text-slate-950">Size {fmt(option.totalEffectiveNozzleSize, 2)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Expected pressure</dt>
          <dd className="font-bold text-slate-950">
            {fmt(option.expectedGunPressurePsi)} PSI
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-sm leading-6 text-slate-700">{option.note}</p>
    </article>
  );
}

function hasField(task: PressureCleaningTaskRecord, field: ConditionalField) {
  return task.requiredFields?.includes(field) ?? false;
}

export default function PressureCleaningTaskGuidePage() {
  const params = useParams();
  const allowDraftPreview = import.meta.env.DEV;
  const visibleTasks = useMemo(() => getVisiblePressureCleaningTasks(allowDraftPreview), [allowDraftPreview]);
  const routeTaskCandidate = params.slug ? getPressureCleaningTaskBySlug(params.slug) : null;
  const routeTask =
    routeTaskCandidate && (routeTaskCandidate.published || allowDraftPreview) ? routeTaskCandidate : null;
  const queryTaskCandidate = getPressureCleaningTaskBySlug(new URLSearchParams(window.location.search).get("task") ?? "");
  const queryTask =
    queryTaskCandidate && (queryTaskCandidate.published || allowDraftPreview) ? queryTaskCandidate : null;
  const initialTask = routeTask ?? queryTask ?? visibleTasks[0] ?? pressureCleaningTaskRecords[0];
  const taskComboboxId = useId();
  const taskListboxId = `${taskComboboxId}-listbox`;
  const [input, setInput] = useState<PressureCleaningTaskGuideInput>(() =>
    normalisePressureCleaningTaskGuideInput(
      parsePressureCleaningTaskGuideSearchParams(window.location.search, {
        ...DEFAULT_INPUT,
        taskSlug: initialTask.slug,
        nozzleCount: initialTask.preferredNozzleCount ?? DEFAULT_INPUT.nozzleCount,
        nozzleSprayAngleDeg: initialTask.preferredSprayAngleDeg ?? DEFAULT_INPUT.nozzleSprayAngleDeg,
        surfaceCleanerDiameter:
          initialTask.preferredSurfaceCleanerDiameterIn ?? DEFAULT_INPUT.surfaceCleanerDiameter,
        attachmentType: initialTask.surfaceCleanerDefault ? "surfaceCleaner" : "wand",
      })
    )
  );
  const [advancedOpen, setAdvancedOpen] = useState(() => hasPressureCleaningAdvancedValues(input));
  const [taskMenuOpen, setTaskMenuOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [selectedSavedSetupId, setSelectedSavedSetupId] = useState("");
  const trackedRef = useRef<string | null>(null);
  const angleWasExplicitRef = useRef(
    new URLSearchParams(window.location.search).has("nozzleAngle") ||
      new URLSearchParams(window.location.search).has("nozzleSprayAngleDeg")
  );
  const { userId, isAuthenticated } = useProAccess();
  const { setups, isReady: savedSetupsReady } = useSavedSetups(userId);
  const selectedTaskCandidate = getPressureCleaningTaskBySlug(input.taskSlug);
  const task =
    selectedTaskCandidate && (selectedTaskCandidate.published || allowDraftPreview)
      ? selectedTaskCandidate
      : initialTask;
  const result = useMemo(() => calculatePressureCleaningTaskGuide(task, input), [input, task]);
  const travertineNeedsSoundConfirmation =
    task.slug === "travertine-pavers" &&
    travertineCanShowSoundSurfaceConfirmation(input.jobDetails);
  const installationAreaOptions =
    task.slug === "travertine-pavers"
      ? [
          ["outdoor", "Outdoor paving"],
          ["indoor", "Indoor"],
          ["pool-surround", "Pool surround"],
          ["wall", "Wall installation"],
        ]
      : [
          ["outdoor", "Outdoor"],
          ["indoor", "Indoor"],
          ["pool-surround", "Pool surround"],
          ["wall", "Wall"],
          ["roof", "Roof"],
        ];
  const filteredTasks = useMemo(
    () => searchPressureCleaningTasks(visibleTasks, taskSearch),
    [taskSearch, visibleTasks]
  );
  const activeTask = filteredTasks[Math.min(activeTaskIndex, Math.max(filteredTasks.length - 1, 0))];
  const nozzleCountError =
    input.attachmentType === "surfaceCleaner" &&
    (!Number.isInteger(input.nozzleCount) || input.nozzleCount < SURFACE_CLEANER_MIN_NOZZLE_COUNT)
      ? "Surface-cleaner nozzle count must be an integer of at least 2."
      : "";
  const sources = task.sourceIds
    .map((sourceId) => getPressureCleaningSource(sourceId))
    .filter((source): source is NonNullable<typeof source> => Boolean(source));
  const guidanceSources = sources.filter((source) => source.category === "guidance");
  const methodologySources = sources.filter((source) => source.category === "methodology");
  const pageTitle = params.slug
    ? `${task.title} Pressure Cleaning Task Guide | PressureCal`
    : "Pressure Cleaning Task Guide | PressureCal";

  useEffect(() => {
    const queryString = buildPressureCleaningTaskGuideSearchParams(input).toString();
    window.history.replaceState({}, "", `${window.location.pathname}${queryString ? `?${queryString}` : ""}`);
  }, [input]);

  useEffect(() => {
    const signature = `${task.slug}|${result.canCalculate}|${result.recommendedOption?.setupCode ?? "none"}`;
    if (trackedRef.current === signature) return;
    trackedRef.current = signature;
    trackEvent("task_guide_calculation_completed", {
      task_slug: task.slug,
      can_calculate: result.canCalculate,
      guidance_mode: result.effectiveGuidance.mode,
      recommended_setup: result.recommendedOption?.setupCode ?? null,
    });
  }, [result.canCalculate, result.effectiveGuidance.mode, result.recommendedOption?.setupCode, task.slug]);

  if (params.slug && !routeTask) return <Navigate to="/pressure-cleaning-task-guide" replace />;

  function update<K extends keyof PressureCleaningTaskGuideInput>(
    key: K,
    value: PressureCleaningTaskGuideInput[K]
  ) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function updateHose<K extends keyof PressureCleaningTaskGuideInput["hose"]>(
    key: K,
    value: PressureCleaningTaskGuideInput["hose"][K]
  ) {
    setInput((current) => ({ ...current, hose: { ...current.hose, [key]: value } }));
  }

  function updateJobDetail<K extends keyof PressureCleaningTaskGuideInput["jobDetails"]>(
    key: K,
    value: PressureCleaningTaskGuideInput["jobDetails"][K]
  ) {
    setInput((current) => ({
      ...current,
      jobDetails: { ...current.jobDetails, [key]: value },
    }));
  }

  function updateTravertineDetail<
    K extends "materialFinish" | "filledStatus" | "sealedStatus" | "jointCondition" | "installationArea"
  >(
    key: K,
    value: PressureCleaningTaskGuideInput["jobDetails"][K]
  ) {
    setInput((current) => ({
      ...current,
      jobDetails: {
        ...current.jobDetails,
        [key]: value,
        confirmsSoundSurface: false,
      },
    }));
  }

  function selectTask(slug: string) {
    const nextTask = getPressureCleaningTaskBySlug(slug);
    if (!nextTask || (!nextTask.published && !allowDraftPreview)) return;
    setInput((current) => {
      const currentTask = getPressureCleaningTaskBySlug(current.taskSlug);
      return applyPressureCleaningTaskDefaults({
        current,
        currentTask,
        nextTask,
        angleWasExplicit: angleWasExplicitRef.current,
        fallbackAngleDegrees: DEFAULT_INPUT.nozzleSprayAngleDeg,
      });
    });
    setTaskMenuOpen(false);
    setTaskSearch("");
    setActiveTaskIndex(0);
  }

  function loadSavedSetup() {
    const setup = setups.find((item) => item.id === selectedSavedSetupId);
    if (!setup) return;
    setInput((current) =>
      normalisePressureCleaningTaskGuideInput(inputsFromFullCalculatorInputs(current, savedSetupToInputs(setup)))
    );
    setAdvancedOpen(true);
    trackEvent("task_guide_saved_setup_loaded", { task_slug: task.slug, setup_id: setup.id });
  }

  return (
    <PressureCalLayout>
      <Helmet>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content="Choose a pressure cleaning task, enter machine and attachment details, then calculate source-backed PressureCal recommendations."
        />
        <link
          rel="canonical"
          href={`${SITE_URL}${params.slug ? taskPath(task) : "/pressure-cleaning-task-guide"}`}
        />
        {!task.published ? <meta name="robots" content="noindex,nofollow" /> : null}
      </Helmet>

      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">PressureCal task workflow</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 sm:text-4xl">
            Pressure Cleaning Task Guide
          </h1>
          <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">
            Choose a task and enter your equipment to get a calculated pressure and nozzle recommendation.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">1. Choose the task</h2>
              <div className="relative mt-4">
                <label htmlFor={taskComboboxId} className="sr-only">Search pressure cleaning surfaces</label>
                <input
                  id={taskComboboxId}
                  role="combobox"
                  aria-expanded={taskMenuOpen}
                  aria-controls={taskListboxId}
                  aria-activedescendant={taskMenuOpen && activeTask ? `${taskComboboxId}-${activeTask.slug}` : undefined}
                  aria-autocomplete="list"
                  value={taskMenuOpen ? taskSearch : task.title}
                  onFocus={() => {
                    setTaskMenuOpen(true);
                    setTaskSearch("");
                    setActiveTaskIndex(0);
                  }}
                  onChange={(event) => {
                    setTaskSearch(event.target.value);
                    setTaskMenuOpen(true);
                    setActiveTaskIndex(0);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setTaskMenuOpen(false);
                      setTaskSearch("");
                      return;
                    }
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setTaskMenuOpen(true);
                      setActiveTaskIndex((current) => Math.min(current + 1, Math.max(filteredTasks.length - 1, 0)));
                      return;
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setActiveTaskIndex((current) => Math.max(current - 1, 0));
                      return;
                    }
                    if (event.key === "Enter" && taskMenuOpen && activeTask) {
                      event.preventDefault();
                      selectTask(activeTask.slug);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
                />
                {taskMenuOpen ? (
                  <p className="mt-2 text-xs text-slate-500" aria-live="polite">
                    {filteredTasks.length} matching surface{filteredTasks.length === 1 ? "" : "s"}
                  </p>
                ) : null}
                {taskMenuOpen ? (
                  <div
                    id={taskListboxId}
                    role="listbox"
                    className="absolute z-20 mt-2 max-h-96 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg"
                  >
                    {filteredTasks.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-slate-600">No matching surfaces</p>
                    ) : (
                      PRESSURE_CLEANING_TASK_CATEGORIES.map((category) => {
                        const categoryTasks = filteredTasks.filter((item) => item.category === category);
                        if (categoryTasks.length === 0) return null;
                        return (
                          <div key={category}>
                            <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                              {category}
                            </p>
                            {categoryTasks.map((item) => {
                              const optionIndex = filteredTasks.findIndex((candidate) => candidate.slug === item.slug);
                              const isActive = optionIndex === activeTaskIndex;
                              return (
                                <button
                                  id={`${taskComboboxId}-${item.slug}`}
                                  key={item.slug}
                                  type="button"
                                  role="option"
                                  aria-selected={item.slug === task.slug}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => selectTask(item.slug)}
                                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 ${
                                    isActive ? "bg-cyan-50 text-cyan-950" : "text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <span>{item.title}</span>
                                  {!item.published && allowDraftPreview ? (
                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold uppercase text-amber-800">
                                      Draft
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>
              <Link className="mt-3 inline-flex text-sm font-semibold text-cyan-700" to={taskPath(task)}>
                Open task detail URL
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">2. Describe the job</h2>
              <label className="mt-4 block text-sm font-semibold text-slate-700">
                Job name
                <input
                  value={input.jobName}
                  onChange={(event) => update("jobName", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Attachment
                  <select
                    value={input.attachmentType}
                    onChange={(event) =>
                      setInput((current) =>
                        attachmentInputState(
                          current,
                          event.target.value === "wand" ? "wand" : "surfaceCleaner"
                        )
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="wand">Wand</option>
                    <option value="surfaceCleaner">Surface cleaner</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Nozzle count
                  <input
                    type="number"
                    min={input.attachmentType === "surfaceCleaner" ? SURFACE_CLEANER_MIN_NOZZLE_COUNT : 1}
                    step="1"
                    value={input.nozzleCount}
                    onChange={(event) => update("nozzleCount", Math.floor(num(event.target.value)))}
                    aria-invalid={Boolean(nozzleCountError)}
                    aria-describedby={nozzleCountError ? "task-guide-nozzle-count-error" : undefined}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  {nozzleCountError ? (
                    <span id="task-guide-nozzle-count-error" className="mt-1 block text-xs font-semibold text-amber-800">
                      {nozzleCountError}
                    </span>
                  ) : null}
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Surface-cleaner diameter
                  <input
                    type="number"
                    value={valueText(input.surfaceCleanerDiameter)}
                    onChange={(event) => update("surfaceCleanerDiameter", optionalNum(event.target.value))}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Diameter unit
                  <select
                    value={input.surfaceCleanerDiameterUnit}
                    onChange={(event) => update("surfaceCleanerDiameterUnit", event.target.value === "mm" ? "mm" : "in")}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="in">in</option>
                    <option value="mm">mm</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Nozzle spray angle
                  <select
                    value={input.nozzleSprayAngleDeg}
                    onChange={(event) => {
                      angleWasExplicitRef.current = true;
                      update("nozzleSprayAngleDeg", num(event.target.value));
                    }}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {TASK_GUIDE_FAN_ANGLES.map((angle) => (
                      <option key={angle} value={angle}>{angle} degrees</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Current orifice size per nozzle
                  <input
                    value={input.currentNozzleText}
                    onChange={(event) => update("currentNozzleText", event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Enter an orifice size such as 3.0 or a nozzle code such as 030. Spray angle changes spray pattern and impact, not hydraulic pressure. Surface-cleaner diameter is recorded for reference and does not alter the hydraulic nozzle-pressure calculation.
              </p>

              {hasField(task, "materialFinish") ? (
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Material finish
                  <select
                    value={input.jobDetails.materialFinish ?? "unknown"}
                    onChange={(event) => updateTravertineDetail("materialFinish", event.target.value as PressureCleaningTaskGuideInput["jobDetails"]["materialFinish"])}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {["polished", "honed", "tumbled", "sandblasted", "textured", "smooth", "unknown"].map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              ) : null}

              {hasField(task, "filledStatus") ? (
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Filled status
                  <select
                    value={input.jobDetails.filledStatus ?? "unknown"}
                    onChange={(event) => updateTravertineDetail("filledStatus", event.target.value as PressureCleaningTaskGuideInput["jobDetails"]["filledStatus"])}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {["filled", "unfilled", "partially-filled", "unknown"].map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              ) : null}

              {hasField(task, "sealedStatus") ? (
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Sealed status
                  <select
                    value={input.jobDetails.sealedStatus ?? "unknown"}
                    onChange={(event) => updateTravertineDetail("sealedStatus", event.target.value as PressureCleaningTaskGuideInput["jobDetails"]["sealedStatus"])}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {["sealed", "unsealed", "unknown"].map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              ) : null}

              {hasField(task, "jointCondition") ? (
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Joint condition
                  <select
                    value={input.jobDetails.jointCondition ?? "unknown"}
                    onChange={(event) => updateTravertineDetail("jointCondition", event.target.value as PressureCleaningTaskGuideInput["jobDetails"]["jointCondition"])}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {["sound-grout", "sound-mortar", "jointing-sand", "loose-or-missing", "unknown"].map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              ) : null}

              {hasField(task, "installationArea") ? (
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Installation area
                  <select
                    value={input.jobDetails.installationArea ?? "outdoor"}
                    onChange={(event) =>
                      updateTravertineDetail(
                        "installationArea",
                        event.target.value as PressureCleaningTaskGuideInput["jobDetails"]["installationArea"]
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {installationAreaOptions.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {hasField(task, "manufacturerOrProduct") ? (
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Manufacturer, sealer or product (optional)
                  <input
                    type="text"
                    value={input.jobDetails.manufacturerOrProduct ?? ""}
                    onChange={(event) => updateJobDetail("manufacturerOrProduct", event.target.value)}
                    placeholder="For example, stone supplier or sealer brand"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              ) : null}

              {travertineNeedsSoundConfirmation ? (
                <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950">
                  <input
                    type="checkbox"
                    checked={Boolean(input.jobDetails.confirmsSoundSurface)}
                    onChange={(event) => updateJobDetail("confirmsSoundSurface", event.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    I have inspected and confirmed that the travertine, filler, sealer and joints are sound, and that product instructions do not prohibit pressure cleaning.
                  </span>
                </label>
              ) : null}

              {hasField(task, "asbestosMayBePresent") ? (
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Could this material contain asbestos?
                  <select
                    value={input.jobDetails.asbestosMayBePresent === false ? "confirmed-free" : "not-confirmed"}
                    onChange={(event) =>
                      updateJobDetail("asbestosMayBePresent", event.target.value !== "confirmed-free")
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="not-confirmed">Yes or unsure</option>
                    <option value="confirmed-free">No — confirmed asbestos-free</option>
                  </select>
                </label>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Equipment</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Rated pressure
                  <input type="number" value={input.machinePressure} onChange={(event) => update("machinePressure", num(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Pressure unit
                  <select value={input.machinePressureUnit} onChange={(event) => update("machinePressureUnit", event.target.value === "bar" ? "bar" : "psi")} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    <option value="psi">PSI</option><option value="bar">bar</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Flow
                  <input type="number" value={input.machineFlow} onChange={(event) => update("machineFlow", num(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Flow unit
                  <select value={input.machineFlowUnit} onChange={(event) => update("machineFlowUnit", event.target.value === "gpm" ? "gpm" : "lpm")} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    <option value="lpm">LPM</option><option value="gpm">GPM</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <button
                type="button"
                aria-expanded={advancedOpen}
                aria-controls="task-guide-advanced-controls"
                onClick={() => setAdvancedOpen((current) => !current)}
                className="flex w-full items-center justify-between gap-3 rounded-xl text-left text-lg font-bold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
              >
                <span>Advanced equipment and hose limits</span>
                <span aria-hidden="true">{advancedOpen ? "−" : "+"}</span>
              </button>
              {advancedOpen ? (
                <div id="task-guide-advanced-controls" className="mt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Lower maximum-pressure override
                      <input type="number" value={valueText(input.maxPressure)} onChange={(event) => update("maxPressure", optionalNum(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                      Component-loss allowance
                      <input type="number" value={valueText(input.componentLossAllowancePsi)} onChange={(event) => update("componentLossAllowancePsi", optionalNum(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    </label>
                    {[
                      ["attachmentMinPressurePsi", "Attachment minimum pressure"],
                      ["attachmentMaxPressurePsi", "Attachment maximum pressure"],
                      ["attachmentMinFlowLpm", "Attachment minimum flow"],
                      ["attachmentMaxFlowLpm", "Attachment maximum flow"],
                    ].map(([key, label]) => (
                      <label key={key} className="text-sm font-semibold text-slate-700">
                        {label}
                        <input
                          type="number"
                          value={valueText(input[key as keyof PressureCleaningTaskGuideInput] as number | undefined)}
                          onChange={(event) => update(key as keyof PressureCleaningTaskGuideInput, optionalNum(event.target.value) as never)}
                          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={input.attachmentMaxPressureExclusive} onChange={(event) => update("attachmentMaxPressureExclusive", event.target.checked)} />
                    Treat attachment max pressure as exclusive
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Hose setup
                      <select value={input.hose.hoseSetupMode} onChange={(event) => updateHose("hoseSetupMode", event.target.value === "mainLeader" ? "mainLeader" : "single")} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                        <option value="single">Single hose</option><option value="mainLeader">Main plus leader</option>
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                      Hose ID unit
                      <select value={input.hose.hoseIdUnit} onChange={(event) => updateHose("hoseIdUnit", event.target.value === "in" ? "in" : "mm")} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                        <option value="mm">mm</option><option value="in">inch</option>
                      </select>
                    </label>
                    {[
                      ["hoseLength", "Hose length"],
                      ["hoseId", "Hose ID"],
                      ["mainHoseLength", "Main hose length"],
                      ["mainHoseId", "Main hose ID"],
                      ["leaderHoseLength", "Leader length"],
                      ["leaderHoseId", "Leader ID"],
                    ].map(([key, label]) => (
                      <label key={key} className="text-sm font-semibold text-slate-700">
                        {label}
                        <input type="number" value={valueText(input.hose[key as keyof PressureCleaningTaskGuideInput["hose"]] as number | undefined)} onChange={(event) => updateHose(key as keyof PressureCleaningTaskGuideInput["hose"], optionalNum(event.target.value) as never)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Saved setups</h2>
              {isAuthenticated ? (
                <div className="mt-4 flex gap-2">
                  <select value={selectedSavedSetupId} onChange={(event) => setSelectedSavedSetupId(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    <option value="">{savedSetupsReady ? "Choose saved setup" : "Loading saved setups"}</option>
                    {setups.map((setup) => <option key={setup.id} value={setup.id}>{setup.name}</option>)}
                  </select>
                  <button type="button" onClick={loadSavedSetup} disabled={!selectedSavedSetupId} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Load</button>
                </div>
              ) : <p className="mt-3 text-sm text-slate-600">Sign in to load saved setups into this guide.</p>}
              <Link to={result.savedSetupsHref} className="mt-4 inline-flex text-sm font-semibold text-cyan-700">Open saved setups</Link>
            </div>
          </aside>

          <main className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">3. Calculate and show the recommendation</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">{task.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{task.summary}</p>
                  {result.taskVariantLabel ? (
                    <p className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {result.taskVariantLabel}
                    </p>
                  ) : null}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${overallStatusClass(result)}`}>
                  {result.overallRecommendationLabel}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Task target</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{pressureSummary(result.targetPressurePsi)}</p>
                  <p className="text-sm text-slate-500">{guidanceModeLabel(result.effectiveGuidance.mode)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Expected pressure</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{pressureSummary(result.recommendedOption?.expectedGunPressurePsi)}</p>
                  <p className="text-sm text-slate-500">{result.canCalculate ? "recommended setup" : "no setup provided"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Compatibility</p>
                  <p className="mt-2 text-xl font-black text-slate-950">{result.overallRecommendationLabel}</p>
                  <p className="text-sm text-slate-500">overall status</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Machine max</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{fmt(result.maxMachinePressurePsi)} PSI</p>
                  <p className="text-sm text-slate-500">rated unless overridden</p>
                </div>
              </div>

              {result.validationMessages.length > 0 ? (
                <div className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${validationPanelClass(result)}`}>
                  {result.validationMessages.map((message) => <p key={message}>{message}</p>)}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Hydraulic compatibility</p>
                  <p className="mt-2 text-sm font-bold text-slate-950">{hydraulicLabel(result)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Task-method compatibility</p>
                  <p className="mt-2 text-sm font-bold text-slate-950">{taskMethodLabel(result)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Validated overlap</p>
                  <p className="mt-2 text-sm font-bold text-slate-950">{overlapLabel(result.overlapStatus)}</p>
                </div>
              </div>

              {result.canCalculate ? (
                <div className="mt-6 grid gap-4">
                  {result.recommendedOption ? <OptionCard option={result.recommendedOption} prominent /> : null}
                  {result.exactOption ? <OptionCard option={result.exactOption} /> : null}
                  {result.adjacentLargerGentler ? <OptionCard option={result.adjacentLargerGentler} /> : null}
                  {result.smallerAggressive ? <OptionCard option={result.smallerAggressive} /> : null}
                  {result.currentNozzleOption ? <OptionCard option={result.currentNozzleOption} /> : null}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                {result.calculatorHref ? <Link to={result.calculatorHref} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Open in full calculator</Link> : null}
                {result.targetPressureCalculatorHref ? <Link to={result.targetPressureCalculatorHref} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Target Pressure Calculator</Link> : null}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Compatibility checks</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {(result.compatibilityMessages.length ? result.compatibilityMessages : ["No compatibility warnings for the current inputs."]).map((message) => <li key={message}>{message}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Machine and loss checks</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>Hose configuration: {describeHoseConfiguration(input)}</li>
                  <li>{result.hoseLossModelled ? `Hose pressure loss: ${fmt(result.hoseLossPsi)} PSI` : "Hose loss not modelled"}</li>
                  <li>Component allowance: {fmt(result.componentLossAllowancePsi)} PSI</li>
                  <li>Max machine pressure: {fmt(result.maxMachinePressurePsi)} PSI</li>
                  {result.machineMessages.map((message) => <li key={message}>{message}</li>)}
                </ul>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Guidance notes</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                {result.guidanceNotes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Task record</h2>
              <div className="mt-4 grid gap-5 lg:grid-cols-3">
                {[["Preparation", task.preparation], ["Method", task.method], ["Warnings", task.warnings]].map(([heading, items]) => (
                  <div key={heading as string}>
                    <h3 className="text-sm font-bold text-slate-900">{heading as string}</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                      {(items as string[]).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Guidance sources</h2>
              <div className="mt-4 grid gap-3">
                {guidanceSources.map((source) => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
                  >
                    <p className="font-semibold text-slate-950">{source.title}</p>
                    <p className="mt-1 text-sm text-slate-600">Relevance: {source.note}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Publisher: {source.publisher} · Evidence level: {source.evidenceLevel} · Last reviewed: {source.lastReviewed}
                    </p>
                    <span className="mt-3 inline-flex text-sm font-bold text-cyan-700">View source ↗</span>
                  </a>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">PressureCal methodology</h2>
              <div className="mt-4 grid gap-3">
                {methodologySources.map((source) => (
                  <div key={source.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-semibold text-slate-950">{source.title}</p>
                    <p className="mt-1 text-sm text-slate-600">Relevance: {source.note}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Publisher: {source.publisher} · Evidence level: {source.evidenceLevel} · Last reviewed: {source.lastReviewed}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </PressureCalLayout>
  );
}
