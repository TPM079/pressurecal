import {
  getVisiblePressureCleaningTasks,
  PRESSURE_CLEANING_TASK_CATEGORIES,
  pressureCleaningTaskRecords,
  searchPressureCleaningTasks,
} from "../data/pressureCleaningTaskGuides";
import { getPressureCleaningSource } from "../data/pressureCleaningTaskGuideSources";
import {
  buildPressureCleaningTaskGuideSearchParams,
  calculatePressureCleaningTaskGuide,
  applyPressureCleaningTaskDefaults,
  formatFanNozzleCode,
  hasPressureCleaningAdvancedValues,
  normalisePressureCleaningTaskGuideInput,
  parseCurrentNozzleSize,
  parsePressureCleaningTaskGuideSearchParams,
  type PressureCleaningTaskGuideInput,
} from "./pressureCleaningTaskGuide";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function near(actual: number | undefined, expected: number, tolerance: number) {
  return actual !== undefined && Math.abs(actual - expected) <= tolerance;
}

function task(slug: string) {
  const found = pressureCleaningTaskRecords.find((item) => item.slug === slug);
  assert(Boolean(found), `Missing task ${slug}.`);
  return found!;
}

const baseInput: PressureCleaningTaskGuideInput = {
  taskSlug: "painted-acrylic-hard-tennis-court",
  jobName: "Acceptance example",
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

export function runPressureCleaningTaskGuideAcceptanceChecks() {
  const parsed030 = parseCurrentNozzleSize("030");
  const parsed045 = parseCurrentNozzleSize("045");
  const parsed120 = parseCurrentNozzleSize("120");
  const parsedDecimal = parseCurrentNozzleSize("3.0");
  assert(parsed030.ok && parsed030.nozzleSize === 3, "030 parses as 3.0.");
  assert(parsed045.ok && parsed045.nozzleSize === 4.5, "045 parses as 4.5.");
  assert(parsed120.ok && parsed120.nozzleSize === 12, "120 parses as 12.0.");
  assert(parsedDecimal.ok && parsedDecimal.nozzleSize === 3, "3.0 parses as 3.0.");
  assert(!parseCurrentNozzleSize("0").ok, "Zero nozzle is rejected.");
  assert(formatFanNozzleCode(15, 5.0) === "15050", "15 degrees and size 5.0 formats as 15050.");
  assert(formatFanNozzleCode(15, 4.5) === "15045", "15 degrees and size 4.5 formats as 15045.");
  assert(formatFanNozzleCode(15, 3.0) === "15030", "15 degrees and size 3.0 formats as 15030.");
  assert(formatFanNozzleCode(25, 5.0) === "25050", "25 degrees and size 5.0 formats as 25050.");
  assert(formatFanNozzleCode(40, 5.0) === "40050", "40 degrees and size 5.0 formats as 40050.");
  assert(formatFanNozzleCode(25, 4.5) === "25045", "25 degrees and size 4.5 formats as 25045.");
  assert(formatFanNozzleCode(25, 3.0) === "25030", "25 degrees and size 3.0 formats as 25030.");
  assert(formatFanNozzleCode(0, 3.0) === "00030", "0 degrees and size 3.0 formats as 00030.");
  assert(
    [formatFanNozzleCode(15, 5), formatFanNozzleCode(25, 4.5), formatFanNozzleCode(0, 3)].every(
      (code) => code.length === 5
    ),
    "No conventional nozzle code contains more or fewer than five digits."
  );

  const tennis = task("painted-acrylic-hard-tennis-court");
  assert(tennis.guidance.mode === "maximum-only", "Tennis court uses maximum-only guidance.");
  assert(tennis.guidance.editorialStartPsi === 1250, "Tennis court starts at 1250 PSI.");
  assert(tennis.guidance.hardMaximumPsi === 1500, "Tennis court hard maximum is 1500 PSI.");
  assert(tennis.guidance.hardMaximumExclusive === true, "Tennis court hard maximum is exclusive.");

  const parsed = parsePressureCleaningTaskGuideSearchParams(
    "?attachmentMinPressurePsi=0&attachmentMaxPressurePsi=0&componentLossAllowancePsi=0&hoseLength=0&hoseId=0&maxPressure=0",
    baseInput
  );
  assert(parsed.attachmentMinPressurePsi === undefined, "Zero attachment min normalises to undefined.");
  assert(parsed.attachmentMaxPressurePsi === undefined, "Zero attachment max normalises to undefined.");
  assert(parsed.componentLossAllowancePsi === undefined, "Zero component loss normalises to undefined.");
  assert(parsed.hose.hoseLength === undefined, "Zero hose length normalises to undefined.");
  assert(parsed.hose.hoseId === undefined, "Zero hose ID normalises to undefined.");
  assert(parsed.maxPressure === undefined, "Zero max-pressure override normalises to undefined.");

  const params = buildPressureCleaningTaskGuideSearchParams(parsed);
  assert(!params.has("attachmentMinPressurePsi"), "Unset attachment min is not serialised.");
  assert(!params.has("hoseLength"), "Unset hose length is not serialised.");
  assert(params.get("nozzleCount") === "2", "The URL saves nozzleCount=2.");
  assert(params.get("attachment") === "surface-cleaner", "The URL saves attachment=surface-cleaner.");
  assert(params.get("nozzleAngle") === "25", "The URL saves nozzleAngle=25.");
  assert(params.get("currentNozzleSize") === "030", "The URL saves currentNozzleSize=030.");

  const restoredDefaultAngle = parsePressureCleaningTaskGuideSearchParams(
    "?task=painted-acrylic-hard-tennis-court&attachment=surface-cleaner&nozzleCount=2",
    baseInput
  );
  assert(restoredDefaultAngle.nozzleSprayAngleDeg === 25, "Tennis-court surface-cleaner mode defaults to 25 degrees when no angle is supplied.");
  assert(
    buildPressureCleaningTaskGuideSearchParams(restoredDefaultAngle).get("nozzleAngle") ===
      String(restoredDefaultAngle.nozzleSprayAngleDeg),
    "The generated URL contains the same numeric angle displayed and used by the formatter."
  );
  const restoredExplicitAngle = parsePressureCleaningTaskGuideSearchParams(
    "?task=painted-acrylic-hard-tennis-court&attachment=surface-cleaner&nozzleCount=2&nozzleAngle=15",
    baseInput
  );
  assert(restoredExplicitAngle.nozzleSprayAngleDeg === 15, "An explicit URL angle of 15 is preserved.");
  const restoredZeroAngle = parsePressureCleaningTaskGuideSearchParams(
    "?task=painted-acrylic-hard-tennis-court&attachment=surface-cleaner&nozzleCount=2&nozzleAngle=0",
    baseInput
  );
  assert(
    restoredZeroAngle.nozzleSprayAngleDeg === 25,
    "Unsupported zero-degree task-guide angle normalises to the 25-degree task default."
  );
  assert(
    calculatePressureCleaningTaskGuide(tennis, restoredZeroAngle).recommendedOption?.setupCode ===
      "2 × 25050",
    "A hidden zero-degree value cannot produce a 00050 recommendation."
  );

  const restoredInvalidAngle = parsePressureCleaningTaskGuideSearchParams(
    "?task=painted-acrylic-hard-tennis-court&attachment=surface-cleaner&nozzleCount=2&nozzleAngle=not-valid",
    baseInput
  );
  assert(restoredInvalidAngle.nozzleSprayAngleDeg === 25, "An invalid URL angle normalises to the task default.");
  assert(
    calculatePressureCleaningTaskGuide(tennis, restoredInvalidAngle).recommendedOption?.setupCode !== "2 × 00050",
    "An invalid angle never silently formats as a zero-degree nozzle."
  );
  assert(
    (() => {
      try {
        formatFanNozzleCode(Number.NaN, 5);
        return false;
      } catch {
        return true;
      }
    })(),
    "The fan-nozzle formatter rejects invalid angles instead of falling back to zero."
  );
  const restoredInvalidCount = parsePressureCleaningTaskGuideSearchParams(
    "?task=painted-acrylic-hard-tennis-court&attachment=surface-cleaner&nozzleCount=1",
    baseInput
  );
  assert(restoredInvalidCount.nozzleCount === 2, "Restoring an invalid surface-cleaner count normalises state to 2.");
  assert(
    buildPressureCleaningTaskGuideSearchParams(restoredInvalidCount).get("nozzleCount") === "2",
    "Restoring an invalid surface-cleaner count normalises the URL to 2."
  );
  assert(
    normalisePressureCleaningTaskGuideInput({ ...baseInput, attachmentType: "surfaceCleaner", nozzleCount: 1 })
      .nozzleCount === 2,
    "Switching from lance count 1 to surface cleaner changes state to 2."
  );
  assert(
    normalisePressureCleaningTaskGuideInput({ ...baseInput, nozzleSprayAngleDeg: 0 })
      .nozzleSprayAngleDeg === 25,
    "A task-guide input angle that is not exposed by the UI cannot remain hidden in state."
  );
  assert(!hasPressureCleaningAdvancedValues(baseInput), "Advanced controls are collapsed by default.");

  const tennisResult = calculatePressureCleaningTaskGuide(tennis, baseInput);
  assert(tennisResult.canCalculate, "Tennis court example calculates.");
  assert(Boolean(tennisResult.recommendedOption), "Tennis court example has a recommended option.");
  assert(baseInput.nozzleCount === 2, "Surface-cleaner mode visibly defaults to nozzle count 2.");
  assert(near(tennisResult.targetFlowGpm, 5.55, 0.02), "21 LPM is about 5.55 GPM.");
  assert(near(tennisResult.exactTotalNozzleSize, 9.92, 0.05), "Exact total size is about 9.92.");
  assert(near(tennisResult.exactNozzleSize, 4.96, 0.03), "Exact per-nozzle size is about 4.96.");
  assert(tennis.preferredSprayAngleDeg === 25, "Tennis-court surface-cleaner mode defaults to 25 degrees.");
  assert(tennisResult.recommendedOption?.setupCode === "2 × 25050", "Recommended setup is 2 × 25050.");
  assert(
    tennisResult.adjacentLargerGentler == null,
    "Maximum-only tennis-court guidance keeps conservative upward rounding without an adjacent-larger card."
  );
  assert(
    tennisResult.recommendedOption?.accessibleLabel === "Two 25-degree size 5.0 nozzles, code 25050.",
    "Accessible labels use the same canonical selected 25-degree angle."
  );
  const recommendedOption = tennisResult.recommendedOption!;
  assert(
    recommendedOption.totalEffectiveNozzleSize === recommendedOption.nozzleSize * baseInput.nozzleCount,
    "Surface-cleaner calculations use the same count shown in the input."
  );
  assert(near(tennisResult.recommendedOption?.expectedGunPressurePsi, 1231, 5), "Two 5.0 nozzles produce about 1231 PSI.");
  assert(tennisResult.recommendedOption?.statusLabel === "COMPATIBLE", "The compatible 1231 PSI setup is labelled COMPATIBLE.");
  assert(tennisResult.smallerAggressive?.setupCode === "2 × 25045", "Adjacent smaller is 2 × 25045.");
  assert(near(tennisResult.smallerAggressive?.expectedGunPressurePsi, 1520, 5), "Two 4.5 nozzles produce about 1520 PSI.");
  assert(tennisResult.smallerAggressive?.isWithinSurfaceGuidance === false, "Two 4.5 nozzles fail court limit.");
  assert(tennisResult.smallerAggressive?.statusLabel === "EXCEEDS TASK LIMIT", "1520 PSI is labelled EXCEEDS TASK LIMIT.");
  assert(tennisResult.currentNozzleOption?.setupCode === "2 × 25030", "Current setup displays 2 × 25030.");
  assert(near(tennisResult.currentNozzleOption?.expectedGunPressurePsi, 3420, 10), "Two 3.0 nozzles produce about 3420 PSI.");
  assert(tennisResult.currentNozzleOption?.statusLabel === "WELL ABOVE TASK LIMIT", "3420 PSI is labelled WELL ABOVE TASK LIMIT.");
  assert(tennisResult.exactOption?.setupCode === "2 × size 4.96", "The exact 4.96 card does not display a standard nozzle code.");
  assert(!/\b\d{5}\b/.test(tennisResult.exactOption?.setupCode ?? ""), "Exact card contains no conventional fan-nozzle code.");
  assert(tennisResult.maxMachinePressurePsi === 4000, "Machine max remains rated pressure when override is unset.");
  assert(
    tennisResult.compatibilityMessages.some((message) => message.includes("Attachment operating limits not supplied")),
    "Blank attachment limits do not create a no-overlap state."
  );
  const invalidDisplayedCount = normalisePressureCleaningTaskGuideInput({
    ...baseInput,
    nozzleCount: 1,
  });
  assert(invalidDisplayedCount.nozzleCount === 2, "A displayed count of 1 is normalised before result cards can show 2 ×.");

  const noOverlap = calculatePressureCleaningTaskGuide(tennis, {
    ...baseInput,
    attachmentMinPressurePsi: 1500,
  });
  assert(noOverlap.overlapStatus === "no-validated-overlap", "Attachment min 1500 creates no overlap.");

  const fifteenDegree = calculatePressureCleaningTaskGuide(tennis, {
    ...baseInput,
    nozzleSprayAngleDeg: 15,
  });
  assert(fifteenDegree.recommendedOption?.setupCode === "2 × 15050", "15-degree recommended setup displays 2 × 15050.");
  assert(fifteenDegree.smallerAggressive?.setupCode === "2 × 15045", "15-degree adjacent smaller displays 2 × 15045.");
  assert(fifteenDegree.currentNozzleOption?.setupCode === "2 × 15030", "15-degree current setup displays 2 × 15030.");
  assert(
    [
      fifteenDegree.recommendedOption?.setupCode,
      fifteenDegree.smallerAggressive?.setupCode,
      fifteenDegree.currentNozzleOption?.setupCode,
    ].every((code) => code?.startsWith("2 × 15")),
    "The adjacent and current cards use the same selected angle as the recommended card."
  );
  assert(
    fifteenDegree.recommendedOption?.accessibleLabel === "Two 15-degree size 5.0 nozzles, code 15050.",
    "Accessible labels use the same canonical selected 15-degree angle."
  );
  assert(
    near(
      fifteenDegree.recommendedOption?.expectedGunPressurePsi,
      tennisResult.recommendedOption?.expectedGunPressurePsi ?? 0,
      0.001
    ),
    "Spray-angle changes do not alter expected hydraulic pressure."
  );
  assert(
    fifteenDegree.compatibilityMessages.some((message) => message.includes("A narrow fan produces")),
    "An explicitly restored 15-degree angle is retained and generates the warning."
  );
  assert(
    fifteenDegree.hydraulicCompatibility === "compatible" &&
      fifteenDegree.taskMethodCompatibility === "caution" &&
      fifteenDegree.overallRecommendationStatus === "compatible-with-caution",
    "A narrow fan changes the overall result to Compatible with caution while preserving hydraulic compatibility."
  );
  const fortyDegree = calculatePressureCleaningTaskGuide(tennis, {
    ...baseInput,
    nozzleSprayAngleDeg: 40,
  });
  assert(fortyDegree.recommendedOption?.setupCode === "2 × 40050", "Selecting 40 degrees produces 40050.");
  assert(
    tennisResult.canCalculate && tennisResult.overallRecommendationStatus === "suitable-starting-setup",
    "The page-level successful state reads SUITABLE STARTING SETUP."
  );

  const zeroPressure = calculatePressureCleaningTaskGuide(tennis, {
    ...baseInput,
    machinePressure: 0,
  });
  assert(!zeroPressure.canCalculate, "Zero machine pressure cannot reach nozzle formula.");

  const visible = JSON.stringify(tennisResult);
  assert(!visible.includes("Infinity") && !visible.includes("NaN"), "No visible result contains Infinity or NaN.");

  const travertine = task("travertine-pavers");
  assert(
    travertine.guidance.advisoryCeilingPsi === 1200 && !travertine.guidance.hardMaximumPsi,
    "Travertine advisory ceiling is not treated as a hard maximum."
  );
  assert(
    travertine.guidance.displayWording.includes("PressureCal editorial"),
    "Travertine editorial values are labelled as PressureCal guidance."
  );

  const polishedTravertine = calculatePressureCleaningTaskGuide(travertine, {
    ...baseInput,
    taskSlug: "travertine-pavers",
    attachmentType: "wand",
    nozzleCount: 1,
    currentNozzleText: "",
    jobDetails: {
      materialFinish: "polished",
      filledStatus: "filled",
      sealedStatus: "sealed",
      jointCondition: "sound-grout",
      installationArea: "outdoor",
    },
  });
  assert(!polishedTravertine.canCalculate, "Polished travertine does not generate a nozzle recommendation.");

  const unknownTravertine = calculatePressureCleaningTaskGuide(travertine, {
    ...baseInput,
    taskSlug: "travertine-pavers",
    attachmentType: "wand",
    nozzleCount: 1,
    currentNozzleText: "",
  });
  assert(!unknownTravertine.canCalculate, "Unknown travertine requires confirmation.");

  const surfaceCleanerTravertine = calculatePressureCleaningTaskGuide(travertine, {
    ...baseInput,
    taskSlug: "travertine-pavers",
    jobDetails: {
      materialFinish: "tumbled",
      filledStatus: "unfilled",
      sealedStatus: "unsealed",
      jointCondition: "sound-grout",
      installationArea: "outdoor",
    },
  });
  assert(
    surfaceCleanerTravertine.compatibilityMessages.some((message) => message.includes("jets operate much closer")),
    "Surface-cleaner mode produces an additional travertine warning."
  );
  assert(
    travertine.warnings.some((warning) => warning.includes("acid")),
    "Acid-cleaner warning appears for travertine."
  );
  const confirmedSensitiveTravertine = calculatePressureCleaningTaskGuide(travertine, {
    ...baseInput,
    taskSlug: "travertine-pavers",
    attachmentType: "wand",
    nozzleCount: 1,
    currentNozzleText: "",
    jobDetails: {
      materialFinish: "honed",
      filledStatus: "filled",
      sealedStatus: "sealed",
      jointCondition: "sound-grout",
      installationArea: "outdoor",
      confirmsSoundSurface: true,
    },
  });
  assert(
    confirmedSensitiveTravertine.canCalculate,
    "A sensitive Travertine variant can proceed only after explicit sound-surface confirmation."
  );
  assert(
    confirmedSensitiveTravertine.targetPressurePsi === 600 &&
      confirmedSensitiveTravertine.effectiveGuidance.editorialRangeMaxPsi === 800,
    "Confirmed sensitive Travertine uses the reduced 600 PSI start and 600-800 PSI editorial range."
  );
  assert(
    confirmedSensitiveTravertine.overallRecommendationStatus === "compatible-with-caution",
    "Confirmed sensitive Travertine remains a caution-only recommendation."
  );

  const sensitiveSurfaceCleanerTravertine = calculatePressureCleaningTaskGuide(travertine, {
    ...baseInput,
    taskSlug: "travertine-pavers",
    attachmentType: "surfaceCleaner",
    nozzleCount: 2,
    nozzleSprayAngleDeg: 15,
    currentNozzleText: "030",
    jobDetails: {
      materialFinish: "honed",
      filledStatus: "partially-filled",
      sealedStatus: "unsealed",
      jointCondition: "jointing-sand",
      installationArea: "outdoor",
      confirmsSoundSurface: true,
    },
  });
  assert(
    sensitiveSurfaceCleanerTravertine.recommendedOption?.setupCode === "2 × 15070",
    "The 600 PSI Travertine example recommends the in-range 2 × 15070 setup."
  );
  assert(
    near(sensitiveSurfaceCleanerTravertine.recommendedOption?.expectedGunPressurePsi, 628, 5),
    "Two size-7.0 nozzles produce approximately 628 PSI."
  );
  assert(
    sensitiveSurfaceCleanerTravertine.adjacentLargerGentler?.setupCode === "2 × 15075",
    "The size-7.5 option is shown as the adjacent larger, gentler setup."
  );
  assert(
    near(sensitiveSurfaceCleanerTravertine.adjacentLargerGentler?.expectedGunPressurePsi, 547, 5),
    "Two size-7.5 nozzles produce approximately 547 PSI."
  );
  assert(
    sensitiveSurfaceCleanerTravertine.adjacentLargerGentler?.statusLabel ===
      "BELOW WORKING RANGE",
    "The 547 PSI option is labelled below the editorial working range."
  );
  assert(
    Boolean(
      sensitiveSurfaceCleanerTravertine.adjacentLargerGentler?.note.includes(
        "may reduce cleaning effectiveness"
      )
    ),
    "The gentler option explains the possible loss of cleaning effectiveness."
  );
  assert(
    sensitiveSurfaceCleanerTravertine.smallerAggressive === null,
    "The in-range smaller standard size becomes the recommendation rather than a secondary option."
  );
  assert(
    Boolean(confirmedSensitiveTravertine.taskVariantLabel?.includes("honed")) &&
      Boolean(confirmedSensitiveTravertine.taskVariantLabel?.includes("sealed")),
    "The resolved Travertine variant is visible in the result."
  );

  const baseTravertine = calculatePressureCleaningTaskGuide(travertine, {
    ...baseInput,
    taskSlug: "travertine-pavers",
    attachmentType: "wand",
    nozzleCount: 1,
    nozzleSprayAngleDeg: 40,
    currentNozzleText: "",
    jobDetails: {
      materialFinish: "tumbled",
      filledStatus: "unfilled",
      sealedStatus: "unsealed",
      jointCondition: "sound-grout",
      installationArea: "outdoor",
    },
  });
  assert(
    baseTravertine.canCalculate &&
      baseTravertine.targetPressurePsi === 800 &&
      baseTravertine.overallRecommendationStatus === "suitable-starting-setup",
    "Sound exterior tumbled or unfilled Travertine uses the normal 800 PSI starting target."
  );

  const unconfirmedSensitiveTravertine = calculatePressureCleaningTaskGuide(travertine, {
    ...baseInput,
    taskSlug: "travertine-pavers",
    attachmentType: "wand",
    nozzleCount: 1,
    currentNozzleText: "",
    jobDetails: {
      materialFinish: "honed",
      filledStatus: "filled",
      sealedStatus: "sealed",
      jointCondition: "sound-grout",
      installationArea: "outdoor",
      confirmsSoundSurface: false,
    },
  });
  assert(
    !unconfirmedSensitiveTravertine.canCalculate,
    "Sensitive Travertine remains blocked until sound-surface confirmation is supplied."
  );

  const poolTravertine = calculatePressureCleaningTaskGuide(travertine, {
    ...baseInput,
    taskSlug: "travertine-pavers",
    attachmentType: "wand",
    nozzleCount: 1,
    currentNozzleText: "",
    jobDetails: {
      materialFinish: "tumbled",
      filledStatus: "unfilled",
      sealedStatus: "unsealed",
      jointCondition: "sound-grout",
      installationArea: "pool-surround",
      confirmsSoundSurface: true,
    },
  });
  assert(
    poolTravertine.canCalculate &&
      poolTravertine.targetPressurePsi === 600 &&
      poolTravertine.overallRecommendationStatus === "compatible-with-caution",
    "Confirmed pool-surround Travertine uses the reduced target and caution status."
  );

  const jointingSandTravertine = calculatePressureCleaningTaskGuide(travertine, {
    ...baseInput,
    taskSlug: "travertine-pavers",
    attachmentType: "wand",
    nozzleCount: 1,
    currentNozzleText: "",
    jobDetails: {
      materialFinish: "tumbled",
      filledStatus: "unfilled",
      sealedStatus: "unsealed",
      jointCondition: "jointing-sand",
      installationArea: "outdoor",
    },
  });
  assert(
    jointingSandTravertine.canCalculate &&
      jointingSandTravertine.overallRecommendationStatus === "compatible-with-caution" &&
      jointingSandTravertine.compatibilityMessages.some((message) => message.includes("Jointing sand")),
    "Travertine with jointing sand calculates only with a displacement caution."
  );

  const wallTravertine = calculatePressureCleaningTaskGuide(travertine, {
    ...baseInput,
    taskSlug: "travertine-pavers",
    attachmentType: "wand",
    nozzleCount: 1,
    currentNozzleText: "",
    jobDetails: {
      materialFinish: "tumbled",
      filledStatus: "unfilled",
      sealedStatus: "unsealed",
      jointCondition: "sound-mortar",
      installationArea: "wall",
    },
  });
  assert(!wallTravertine.canCalculate, "Travertine wall installations require product-specific guidance.");

  const looseJointTravertine = calculatePressureCleaningTaskGuide(travertine, {
    ...baseInput,
    taskSlug: "travertine-pavers",
    attachmentType: "wand",
    nozzleCount: 1,
    currentNozzleText: "",
    jobDetails: {
      materialFinish: "tumbled",
      filledStatus: "unfilled",
      sealedStatus: "unsealed",
      jointCondition: "loose-or-missing",
      installationArea: "outdoor",
    },
  });
  assert(!looseJointTravertine.canCalculate, "Loose or missing Travertine joints block calculation.");
  assert(
    task("limestone").sourceIds.includes("natural-stone-institute-care"),
    "Limestone has natural-stone care source."
  );
  const tennisSources = tennis.sourceIds
    .map((sourceId) => getPressureCleaningSource(sourceId))
    .filter((source): source is NonNullable<typeof source> => Boolean(source));
  assert(
    tennisSources.some((source) => source.category === "guidance") &&
      tennisSources.some((source) => source.category === "methodology"),
    "Guidance sources and PressureCal methodology render under separate headings."
  );
  const tennisAustralia = getPressureCleaningSource("tennis-australia-hard-court-maintenance");
  assert(
    tennisAustralia?.category === "guidance" && Boolean(tennisAustralia.url),
    "Tennis Australia displays a visible accessible View source link."
  );
  assert(
    task("concrete-roof-tiles").guidance.mode === "specialist-only",
    "Roof-tile records return specialist guidance."
  );

  const asbestos = calculatePressureCleaningTaskGuide(task("suspected-or-confirmed-asbestos"), {
    ...baseInput,
    taskSlug: "suspected-or-confirmed-asbestos",
  });
  assert(!asbestos.canCalculate, "Suspected asbestos blocks every pressure and nozzle calculation.");
  assert(!JSON.stringify(asbestos).includes("setupCode"), "Prohibited task does not display nozzle setup.");

  const productionTasks = getVisiblePressureCleaningTasks(false);
  const developmentTasks = getVisiblePressureCleaningTasks(true);
  assert(
    productionTasks.every((item) => item.published),
    "Production task selection excludes all draft tasks."
  );
  assert(
    developmentTasks.some((item) => !item.published && item.status === "draft"),
    "Development preview can display clearly labelled drafts."
  );
  assert(task("limestone").published === false, "Draft task pages are noindex in preview and unavailable in production.");
  assert(
    searchPressureCleaningTasks(productionTasks, "travertine")[0]?.slug === "travertine-pavers",
    "Task search finds Travertine pavers before generic natural-stone records."
  );
  assert(
    searchPressureCleaningTasks(productionTasks, "court").some((item) => item.slug === "painted-acrylic-hard-tennis-court"),
    "Task search finds painted acrylic tennis court."
  );
  assert(
    ["generic-timber-deck", "trex-composite-decking"].every((slug) =>
      searchPressureCleaningTasks(productionTasks, "deck").some((item) => item.slug === slug)
    ),
    "Task search finds timber, Trex and composite deck records."
  );
  assert(
    searchPressureCleaningTasks(productionTasks, "asbestos").some((item) => item.slug === "suspected-or-confirmed-asbestos"),
    "Task search finds asbestos records."
  );
  assert(
    PRESSURE_CLEANING_TASK_CATEGORIES.every((category) =>
      developmentTasks.some((item) => item.category === category)
    ),
    "Categories render correctly."
  );
  assert(
    productionTasks.some((item) => item.category === "Natural stone and tile" && item.slug === "travertine-pavers"),
    "Travertine remains a published material-specific natural-stone task."
  );

  const changedToTrex = applyPressureCleaningTaskDefaults({
    current: baseInput,
    currentTask: tennis,
    nextTask: task("trex-composite-decking"),
    angleWasExplicit: false,
    fallbackAngleDegrees: 25,
  });
  assert(
    changedToTrex.machinePressure === baseInput.machinePressure &&
      changedToTrex.machineFlow === baseInput.machineFlow,
    "Changing tasks preserves machine pressure and flow."
  );
  assert(
    changedToTrex.nozzleSprayAngleDeg === 40,
    "Changing tasks re-evaluates inherited task-specific angle defaults."
  );
  const explicitAngleOnTaskChange = applyPressureCleaningTaskDefaults({
    current: { ...baseInput, nozzleSprayAngleDeg: 15 },
    currentTask: tennis,
    nextTask: task("trex-composite-decking"),
    angleWasExplicit: true,
    fallbackAngleDegrees: 25,
  });
  assert(explicitAngleOnTaskChange.nozzleSprayAngleDeg === 15, "Changing tasks preserves an explicit selected angle.");
  const concreteFromCurrentNozzle = calculatePressureCleaningTaskGuide(task("sound-uncoated-concrete"), {
    ...baseInput,
    taskSlug: "sound-uncoated-concrete",
  });
  assert(
    concreteFromCurrentNozzle.currentNozzleOption?.statusLabel !==
      tennisResult.currentNozzleOption?.statusLabel,
    "Current nozzle pressure is reassessed against the newly selected task."
  );

  return {
    tennisRecommended: tennisResult.recommendedOption?.setupCode,
    tennisCurrentPressurePsi: tennisResult.currentNozzleOption?.expectedGunPressurePsi,
    travertineMode: travertine.guidance.mode,
    asbestosCanCalculate: asbestos.canCalculate,
  };
}
