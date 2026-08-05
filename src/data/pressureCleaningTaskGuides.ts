import type { PressureCleaningSourceId } from "./pressureCleaningTaskGuideSources";

export type PressureGuidanceMode =
  | "numeric-range"
  | "maximum-only"
  | "qualitative"
  | "manufacturer-confirmation-required"
  | "avoid-pressure"
  | "specialist-only"
  | "prohibited";

export type MaterialFinish =
  | "polished"
  | "honed"
  | "tumbled"
  | "sandblasted"
  | "textured"
  | "smooth"
  | "unknown";
export type FilledStatus = "filled" | "unfilled" | "partially-filled" | "unknown";
export type SealedStatus = "sealed" | "unsealed" | "unknown";
export type JointCondition =
  | "sound-grout"
  | "sound-mortar"
  | "jointing-sand"
  | "loose-or-missing"
  | "unknown";
export type InstallationArea = "indoor" | "outdoor" | "pool-surround" | "wall" | "roof";

export type PressureGuidance = {
  mode: PressureGuidanceMode;
  editorialStartPsi?: number;
  editorialRangeMinPsi?: number;
  editorialRangeMaxPsi?: number;
  hardMaximumPsi?: number;
  hardMaximumExclusive?: boolean;
  sourceSpecificLimitPsi?: number;
  advisoryCeilingPsi?: number;
  advisoryCeilingLabel?: string;
  sourceSupportsExactRange?: boolean;
  displayWording: string;
};

export type ConditionalField =
  | "materialFinish"
  | "filledStatus"
  | "sealedStatus"
  | "jointCondition"
  | "installationArea"
  | "manufacturerOrProduct"
  | "asbestosMayBePresent";

export type PressureCleaningTaskRecord = {
  schemaVersion: 2;
  slug: string;
  title: string;
  published: boolean;
  status: "published" | "draft" | "prohibited";
  category: PressureCleaningTaskCategory;
  searchTerms: string[];
  summary: string;
  surface: string;
  guidance: PressureGuidance;
  requiredFields?: ConditionalField[];
  preferredNozzleCount?: number;
  preferredSurfaceCleanerDiameterIn?: number;
  preferredSprayAngleDeg?: number;
  preferredMethod: string;
  minimumStandoffMm?: number;
  surfaceCleanerDefault?: boolean;
  surfaceCleanerWarning?: string;
  turboNozzleAllowed?: boolean;
  zeroDegreeAllowed?: boolean;
  requiresTestArea?: boolean;
  requiresSoundSurface?: boolean;
  compatibleAttachments: Array<"wand" | "surfaceCleaner">;
  flowMinimumLpm?: number;
  warnings: string[];
  preparation: string[];
  method: string[];
  sourceIds: PressureCleaningSourceId[];
};

export const PRESSURE_CLEANING_TASK_SCHEMA_VERSION = 2;

export const PRESSURE_CLEANING_TASK_CATEGORIES = [
  "Concrete and masonry",
  "Natural stone and tile",
  "Timber and composite",
  "Walls and cladding",
  "Sports and recreation",
  "Vehicles and equipment",
  "Specialist and prohibited surfaces",
] as const;

export type PressureCleaningTaskCategory = (typeof PRESSURE_CLEANING_TASK_CATEGORIES)[number];

function categoryFromSurface(surface: string, mode?: PressureGuidanceMode): PressureCleaningTaskCategory {
  const value = surface.toLowerCase();
  if (mode === "specialist-only" || mode === "prohibited" || value.includes("asbestos") || value.includes("roof")) {
    return "Specialist and prohibited surfaces";
  }
  if (value.includes("stone") || value.includes("travertine") || value.includes("tile") || value.includes("pool")) {
    return "Natural stone and tile";
  }
  if (value.includes("timber") || value.includes("composite")) return "Timber and composite";
  if (value.includes("wall") || value.includes("cladding") || value.includes("render") || value.includes("coating")) {
    return "Walls and cladding";
  }
  if (value.includes("court") || value.includes("sports") || value.includes("synthetic") || value.includes("playground")) {
    return "Sports and recreation";
  }
  if (value.includes("vehicle") || value.includes("equipment") || value.includes("marine")) {
    return "Vehicles and equipment";
  }
  return "Concrete and masonry";
}

const commonCalcSources = [
  "pressurecal-nozzle-equation",
  "pressurecal-hose-loss-model",
  "pressurecal-editorial-assumptions",
] as const;

function qualitativeRecord(args: {
  slug: string;
  title: string;
  surface: string;
  summary: string;
  mode?: PressureGuidanceMode;
  warning?: string;
  sourceIds?: PressureCleaningSourceId[];
  installationArea?: InstallationArea;
  requiredFields?: ConditionalField[];
  category?: PressureCleaningTaskCategory;
  searchTerms?: string[];
}): PressureCleaningTaskRecord {
  return {
    schemaVersion: PRESSURE_CLEANING_TASK_SCHEMA_VERSION,
    slug: args.slug,
    title: args.title,
    published: false,
    status: args.mode === "prohibited" ? "prohibited" : "draft",
    category: args.category ?? categoryFromSurface(args.surface, args.mode),
    searchTerms: args.searchTerms ?? [args.title, args.surface],
    summary: args.summary,
    surface: args.surface,
    guidance: {
      mode: args.mode ?? "qualitative",
      displayWording:
        args.mode === "manufacturer-confirmation-required"
          ? "Manufacturer or product-specific confirmation required before calculating pressure."
          : args.mode === "avoid-pressure"
            ? "Avoid pressure washing by default; use an alternative cleaning method."
            : args.mode === "specialist-only"
              ? "Specialist assessment required before pressure cleaning."
              : "Qualitative guidance only; no source-backed PSI range is published for this record yet.",
    },
    requiredFields:
      args.requiredFields ?? (args.installationArea ? ["installationArea"] : undefined),
    preferredMethod: "Confirm surface-specific guidance before pressure cleaning.",
    preferredSprayAngleDeg: 40,
    compatibleAttachments: ["wand"],
    warnings: [args.warning ?? "Do not invent a pressure target without defensible source-backed guidance."],
    preparation: ["Identify material, coating or sealer condition, joints, and drainage before cleaning."],
    method: ["Use the least aggressive verified method and complete a test area where pressure cleaning is allowed."],
    sourceIds: args.sourceIds ?? ["pressurecal-nozzle-equation", "pressurecal-hose-loss-model"],
  };
}

export const pressureCleaningTaskRecords: PressureCleaningTaskRecord[] = [
  {
    schemaVersion: PRESSURE_CLEANING_TASK_SCHEMA_VERSION,
    slug: "painted-acrylic-hard-tennis-court",
    title: "Painted acrylic hard tennis court",
    published: true,
    status: "published",
    category: "Sports and recreation",
    searchTerms: ["tennis", "court", "painted acrylic", "sports surface", "hard court"],
    summary:
      "A maximum-only hard-court setup using a conservative PressureCal starting target below the hard maximum.",
    surface: "Painted acrylic sports surface",
    guidance: {
      mode: "maximum-only",
      editorialStartPsi: 1250,
      hardMaximumPsi: 1500,
      hardMaximumExclusive: true,
      sourceSupportsExactRange: false,
      displayWording:
        "Professionally pressure wash below 1500 PSI. PressureCal uses 1250 PSI as a conservative editorial starting target.",
    },
    preferredNozzleCount: 2,
    preferredSurfaceCleanerDiameterIn: 20,
    preferredSprayAngleDeg: 25,
    preferredMethod: "Surface cleaner or controlled fan-tip cleaning below the hard maximum.",
    surfaceCleanerDefault: true,
    compatibleAttachments: ["surfaceCleaner", "wand"],
    flowMinimumLpm: 15,
    warnings: [
      "Do not cut into delaminated, blistered, or chalking acrylic coating.",
      "Use fan nozzles and keep the surface cleaner moving to avoid striping.",
      "A calculated pressure of 1500 PSI or higher fails this task guidance.",
    ],
    preparation: [
      "Inspect coating adhesion, cracks, line marking edges, drains, and fence edges.",
      "Remove loose debris before wetting the court.",
      "Complete a small test area outside the primary playing line before committing to the full court.",
    ],
    method: [
      "Work in straight overlapping lanes and avoid dwelling over painted line edges.",
      "Rinse toward existing drainage without forcing water under lifted coating.",
      "Re-check slip, visible striping, and coating disturbance before handover.",
    ],
    sourceIds: [
      "tennis-australia-hard-court-maintenance",
      ...commonCalcSources,
      "painted-surface-soft-wash-practice",
    ],
  },
  {
    schemaVersion: PRESSURE_CLEANING_TASK_SCHEMA_VERSION,
    slug: "trex-composite-decking",
    title: "Trex composite decking",
    published: true,
    status: "published",
    category: "Timber and composite",
    searchTerms: ["trex", "composite", "deck", "decking", "boards"],
    summary: "Low-pressure composite-decking guidance for a fan-tip setup.",
    surface: "Composite decking",
    guidance: {
      mode: "numeric-range",
      editorialStartPsi: 1000,
      editorialRangeMinPsi: 800,
      editorialRangeMaxPsi: 1500,
      displayWording: "PressureCal editorial working range 800-1500 PSI; verify exact product care instructions.",
    },
    preferredNozzleCount: 1,
    preferredSprayAngleDeg: 40,
    preferredMethod: "Wide fan-tip rinse with manufacturer-approved cleaner.",
    compatibleAttachments: ["wand"],
    flowMinimumLpm: 10,
    warnings: [
      "Avoid narrow tips and aggressive rotary attachments on composite boards.",
      "Clean with the board direction and check manufacturer care requirements for the exact product line.",
    ],
    preparation: ["Sweep the deck and remove furniture, mats, and grit.", "Test an inconspicuous board first."],
    method: ["Apply approved detergent if needed, then rinse with a wide fan pattern.", "Clean along the board direction."],
    sourceIds: ["composite-decking-manufacturer-care", ...commonCalcSources],
  },
  {
    schemaVersion: PRESSURE_CLEANING_TASK_SCHEMA_VERSION,
    slug: "generic-timber-deck",
    title: "Generic timber deck",
    published: true,
    status: "published",
    category: "Timber and composite",
    searchTerms: ["timber", "wood", "deck", "decking", "softwood", "hardwood"],
    summary: "Deck-cleaning guidance for timber where fibre damage is the main pressure risk.",
    surface: "Timber decking",
    guidance: {
      mode: "numeric-range",
      editorialStartPsi: 900,
      editorialRangeMinPsi: 800,
      editorialRangeMaxPsi: 1200,
      displayWording: "PressureCal editorial working range 800-1200 PSI for sound timber after a test patch.",
    },
    preferredNozzleCount: 1,
    preferredSprayAngleDeg: 40,
    preferredMethod: "Wide fan-tip cleaning with the grain.",
    compatibleAttachments: ["wand"],
    flowMinimumLpm: 10,
    warnings: ["High pressure can raise fibres, gouge softwood, and damage old coatings."],
    preparation: ["Identify timber species, coating condition, loose fasteners, and soft boards."],
    method: ["Clean with the grain using long, even passes.", "Allow to dry before assessing sanding or recoating needs."],
    sourceIds: ["timber-deck-field-practice", ...commonCalcSources],
  },
  {
    schemaVersion: PRESSURE_CLEANING_TASK_SCHEMA_VERSION,
    slug: "sound-uncoated-concrete",
    title: "Sound uncoated concrete",
    published: true,
    status: "published",
    category: "Concrete and masonry",
    searchTerms: ["concrete", "uncoated", "driveway", "slab", "path"],
    summary: "Higher-pressure concrete guidance for sound uncoated slabs.",
    surface: "Uncoated concrete",
    guidance: {
      mode: "numeric-range",
      editorialStartPsi: 3000,
      editorialRangeMinPsi: 2500,
      editorialRangeMaxPsi: 4000,
      displayWording: "PressureCal editorial working range 2500-4000 PSI for sound uncoated concrete.",
    },
    preferredNozzleCount: 2,
    preferredSurfaceCleanerDiameterIn: 20,
    preferredSprayAngleDeg: 25,
    preferredMethod: "Surface cleaner for open slab areas and fan-tip edge detailing.",
    surfaceCleanerDefault: true,
    compatibleAttachments: ["surfaceCleaner", "wand"],
    flowMinimumLpm: 15,
    warnings: ["Do not use this task record for sealed, painted, weak, dusty, or spalling concrete."],
    preparation: ["Confirm the concrete is sound, uncoated, and suitable for pressure cleaning."],
    method: ["Maintain overlapping passes and avoid stopping the jets over one spot."],
    sourceIds: ["sound-concrete-field-practice", ...commonCalcSources],
  },
  {
    schemaVersion: PRESSURE_CLEANING_TASK_SCHEMA_VERSION,
    slug: "painted-or-coated-surface",
    title: "Painted or coated surface",
    published: true,
    status: "published",
    category: "Walls and cladding",
    searchTerms: ["painted", "coated", "coating", "paint", "surface"],
    summary: "General low-pressure guidance when a surface coating may lift, chalk, or water-track.",
    surface: "Painted or coated surface",
    guidance: {
      mode: "maximum-only",
      editorialStartPsi: 800,
      hardMaximumPsi: 1200,
      hardMaximumExclusive: true,
      displayWording: "PressureCal editorial starting target 800 PSI with operation below 1200 PSI unless product guidance says otherwise.",
    },
    preferredNozzleCount: 1,
    preferredSprayAngleDeg: 40,
    preferredMethod: "Wide fan-tip rinse or soft-wash method after a test patch.",
    compatibleAttachments: ["wand"],
    flowMinimumLpm: 8,
    warnings: ["Treat unknown coating adhesion as fragile until tested."],
    preparation: ["Inspect coating age, chalking, peeling, failed caulk, vents, and electrical penetrations."],
    method: ["Use a wide fan pattern and rinse downward where water ingress is possible."],
    sourceIds: ["painted-surface-soft-wash-practice", ...commonCalcSources],
  },
  {
    schemaVersion: PRESSURE_CLEANING_TASK_SCHEMA_VERSION,
    slug: "travertine-pavers",
    title: "Travertine pavers",
    published: true,
    status: "published",
    category: "Natural stone and tile",
    searchTerms: ["travertine", "natural stone", "pavers", "limestone", "tumbled stone"],
    summary: "Travertine family guidance that changes by finish, filler, sealer, joint condition, and area.",
    surface: "Travertine",
    guidance: {
      mode: "numeric-range",
      editorialStartPsi: 800,
      editorialRangeMinPsi: 600,
      editorialRangeMaxPsi: 1000,
      advisoryCeilingPsi: 1200,
      advisoryCeilingLabel:
        "Australian supplier advisory ceiling for some outdoor travertine, not a universal hard maximum.",
      sourceSupportsExactRange: false,
      displayWording:
        "PressureCal editorial start 800 PSI and working range 600-1000 PSI for sound exterior tumbled or unfilled travertine.",
    },
    requiredFields: [
      "materialFinish",
      "filledStatus",
      "sealedStatus",
      "jointCondition",
      "installationArea",
      "manufacturerOrProduct",
    ],
    preferredNozzleCount: 1,
    preferredSprayAngleDeg: 40,
    preferredMethod: "Lance or controlled low-pressure rinse with pH-neutral stone cleaner.",
    minimumStandoffMm: 300,
    surfaceCleanerDefault: false,
    surfaceCleanerWarning:
      "Do not automatically transfer lance guidance to a surface cleaner; jets operate much closer to travertine.",
    turboNozzleAllowed: false,
    zeroDegreeAllowed: false,
    requiresTestArea: true,
    requiresSoundSurface: true,
    compatibleAttachments: ["wand", "surfaceCleaner"],
    flowMinimumLpm: 8,
    warnings: [
      "Use a pH-neutral stone cleaner; do not use acid cleaners on travertine.",
      "Stop if stone, filler, grout, sealer or jointing material lifts.",
      "Loose or missing joints prevent a normal travertine recommendation.",
      "Polished, indoor, wall, roof or unknown travertine does not receive a normal pressure-washer setup.",
      "Confirmed honed, filled, sealed or pool-surround variants use a more conservative PressureCal target and remain caution-only.",
    ],
    preparation: [
      "Confirm finish, filler, sealer, joints, installation area and any available supplier or sealer instructions.",
      "Require sound stone and joints and complete a test area.",
    ],
    method: [
      "Start low, keep at least 300 mm standoff, and use a 40-degree fan pattern.",
      "Use pH-neutral stone cleaner and rinse without forcing water into voids or joints.",
    ],
    sourceIds: [
      "natural-stone-institute-care",
      "natural-stone-institute-travertine",
      "travertine-tiles-pavers-australia-care",
      "australian-travertine-pressure-advisory",
      ...commonCalcSources,
    ],
  },
  {
    schemaVersion: PRESSURE_CLEANING_TASK_SCHEMA_VERSION,
    slug: "suspected-or-confirmed-asbestos",
    title: "Suspected or confirmed asbestos",
    published: true,
    status: "prohibited",
    category: "Specialist and prohibited surfaces",
    searchTerms: ["asbestos", "fibro", "fibre cement", "prohibited", "unsafe material"],
    summary: "Pressure cleaning is prohibited for asbestos-containing or suspected asbestos-containing material.",
    surface: "Asbestos-containing material",
    guidance: {
      mode: "prohibited",
      displayWording:
        "Pressure cleaning prohibited. High-pressure water must never be used on asbestos-containing material.",
    },
    requiredFields: ["asbestosMayBePresent"],
    preferredMethod: "Contact the applicable workplace-safety authority or a licensed asbestos professional.",
    compatibleAttachments: [],
    warnings: [
      "Do not calculate pressure, nozzle sizes or operating instructions for suspected or confirmed asbestos.",
      "Older fibre-cement roofs, fences, soffits, walls or cladding must be confirmed asbestos-free before pressure cleaning is considered.",
    ],
    preparation: ["Stop work and seek licensed asbestos advice."],
    method: ["No pressure-cleaning method is provided."],
    sourceIds: ["safework-nsw-asbestos"],
  },
  qualitativeRecord({ slug: "new-or-uncured-concrete", title: "New or uncured concrete", surface: "Concrete", summary: "Young concrete can be damaged by pressure cleaning.", mode: "manufacturer-confirmation-required" }),
  qualitativeRecord({ slug: "coloured-concrete", title: "Coloured concrete", surface: "Concrete", summary: "Colour hardeners, oxides and coatings require product-specific confirmation.", mode: "manufacturer-confirmation-required" }),
  qualitativeRecord({ slug: "sealed-concrete", title: "Sealed concrete", surface: "Concrete", summary: "Sealer condition controls whether pressure cleaning is suitable.", mode: "manufacturer-confirmation-required" }),
  qualitativeRecord({ slug: "painted-concrete", title: "Painted concrete", surface: "Concrete", summary: "Paint adhesion must be checked before any pressure cleaning.", mode: "qualitative" }),
  qualitativeRecord({ slug: "exposed-aggregate", title: "Exposed aggregate", surface: "Concrete", summary: "Avoid loosening exposed aggregate or failed sealers." }),
  qualitativeRecord({ slug: "concrete-pavers", title: "Concrete pavers", surface: "Pavers", summary: "Protect jointing sand and coatings." }),
  qualitativeRecord({ slug: "clay-pavers", title: "Clay pavers", surface: "Pavers", summary: "Protect old clay faces and mortar or sand joints." }),
  qualitativeRecord({ slug: "permeable-pavers", title: "Permeable pavers", surface: "Pavers", summary: "Specialist cleaning may be required to preserve drainage performance.", mode: "specialist-only" }),
  qualitativeRecord({ slug: "limestone", title: "Limestone", surface: "Natural stone", summary: "Use neutral cleaners and avoid acids.", sourceIds: ["natural-stone-institute-care", "natural-stone-institute-travertine"] }),
  qualitativeRecord({ slug: "marble", title: "Marble", surface: "Natural stone", summary: "Polished or honed marble is pressure-sensitive.", mode: "avoid-pressure", sourceIds: ["natural-stone-institute-care"] }),
  qualitativeRecord({ slug: "sandstone", title: "Sandstone", surface: "Natural stone", summary: "Soft or friable sandstone requires specialist assessment.", mode: "specialist-only", sourceIds: ["natural-stone-institute-care"] }),
  qualitativeRecord({ slug: "granite-basalt-bluestone", title: "Granite, basalt or bluestone", surface: "Natural stone", summary: "Dense stone still requires sealer and joint checks.", sourceIds: ["natural-stone-institute-care"] }),
  qualitativeRecord({ slug: "slate", title: "Slate", surface: "Natural stone", summary: "Layered stone can delaminate under pressure.", mode: "qualitative", sourceIds: ["natural-stone-institute-care"] }),
  qualitativeRecord({ slug: "porcelain-outdoor-tiles", title: "Porcelain outdoor tiles", surface: "Tile", summary: "Tile and grout ratings should be confirmed." }),
  qualitativeRecord({ slug: "ceramic-tiles-and-grout", title: "Ceramic tiles and grout", surface: "Tile", summary: "Grout condition controls suitable pressure." }),
  qualitativeRecord({ slug: "pool-coping-and-surrounds", title: "Pool coping and surrounds", surface: "Pool surrounds", summary: "Confirm stone, sealer, joints and pool-water chemistry.", mode: "manufacturer-confirmation-required", installationArea: "pool-surround", sourceIds: ["natural-stone-institute-care"] }),
  qualitativeRecord({ slug: "uncoated-timber-decking", title: "Uncoated timber decking", surface: "Timber", summary: "Use timber deck guidance and test for fibre raising.", sourceIds: ["timber-deck-field-practice"] }),
  qualitativeRecord({ slug: "oiled-or-stained-timber", title: "Oiled or stained timber", surface: "Timber", summary: "Coating condition controls pressure suitability." }),
  qualitativeRecord({ slug: "painted-timber", title: "Painted timber", surface: "Timber", summary: "Painted timber is coating-sensitive." }),
  qualitativeRecord({ slug: "generic-composite-decking", title: "Generic composite decking", surface: "Composite", summary: "Confirm exact product care guidance.", mode: "manufacturer-confirmation-required", sourceIds: ["composite-decking-manufacturer-care"] }),
  qualitativeRecord({ slug: "timber-fencing", title: "Timber fencing", surface: "Timber", summary: "Older fencing can splinter or raise grain." }),
  qualitativeRecord({ slug: "timber-weatherboards", title: "Timber weatherboards", surface: "Timber", summary: "Avoid forcing water behind cladding.", mode: "qualitative" }),
  qualitativeRecord({ slug: "face-brick", title: "Face brick", surface: "Masonry", summary: "Protect mortar joints and soft brick faces." }),
  qualitativeRecord({ slug: "painted-brick", title: "Painted brick", surface: "Masonry", summary: "Paint adhesion controls suitability." }),
  qualitativeRecord({ slug: "cement-render", title: "Cement render", surface: "Render", summary: "Avoid water ingress and coating damage." }),
  qualitativeRecord({ slug: "acrylic-texture-coating", title: "Acrylic texture coating", surface: "Coating", summary: "Texture coatings require low-pressure confirmation.", mode: "manufacturer-confirmation-required" }),
  qualitativeRecord({ slug: "fibre-cement-cladding", title: "Fibre-cement cladding", surface: "Cladding", summary: "Confirm asbestos-free status before any pressure cleaning.", mode: "manufacturer-confirmation-required", requiredFields: ["asbestosMayBePresent"] }),
  qualitativeRecord({ slug: "painted-exterior-walls", title: "Painted exterior walls", surface: "Walls", summary: "Use low-pressure coated-surface guidance." }),
  qualitativeRecord({ slug: "colorbond-fencing-cladding", title: "COLORBOND fencing and cladding", surface: "Metal coating", summary: "Confirm coating and manufacturer care guidance.", mode: "manufacturer-confirmation-required" }),
  qualitativeRecord({ slug: "painted-basketball-netball-court", title: "Painted basketball or netball court", surface: "Sports coating", summary: "Use product-specific sports-surface guidance.", mode: "manufacturer-confirmation-required" }),
  qualitativeRecord({ slug: "synthetic-tennis-court", title: "Synthetic tennis court", surface: "Synthetic sports surface", summary: "Synthetic systems require product-specific maintenance guidance.", mode: "manufacturer-confirmation-required" }),
  qualitativeRecord({ slug: "artificial-turf", title: "Artificial turf", surface: "Synthetic turf", summary: "Avoid damaging infill and backing.", mode: "avoid-pressure" }),
  qualitativeRecord({ slug: "rubber-playground-surfacing", title: "Rubber playground surfacing", surface: "Rubber surface", summary: "Confirm product cleaning instructions.", mode: "manufacturer-confirmation-required" }),
  qualitativeRecord({ slug: "automotive-paint", title: "Automotive paint", surface: "Vehicle", summary: "Use automotive-safe low-pressure washing.", mode: "qualitative" }),
  qualitativeRecord({ slug: "trucks-heavy-machinery", title: "Trucks and heavy machinery", surface: "Equipment", summary: "Protect bearings, electrics and decals." }),
  qualitativeRecord({ slug: "agricultural-machinery", title: "Agricultural machinery", surface: "Equipment", summary: "Manage biosecurity, electrics and grease runoff." }),
  qualitativeRecord({ slug: "boats-and-gelcoat", title: "Boats and gelcoat", surface: "Marine", summary: "Protect gelcoat, fittings and decals.", mode: "qualitative" }),
  qualitativeRecord({ slug: "caravans-and-motorhomes", title: "Caravans and motorhomes", surface: "Vehicle", summary: "Avoid seals, vents and decals.", mode: "qualitative" }),
  qualitativeRecord({ slug: "decals-and-vehicle-wraps", title: "Decals and vehicle wraps", surface: "Vehicle wrap", summary: "Avoid pressure on decal edges.", mode: "avoid-pressure" }),
  qualitativeRecord({ slug: "engine-bays", title: "Engine bays", surface: "Vehicle", summary: "Electrical and contamination risks require specialist judgement.", mode: "specialist-only" }),
  qualitativeRecord({ slug: "concrete-roof-tiles", title: "Concrete roof tiles", surface: "Roof", summary: "Roof work requires specialist roof and fall-risk controls.", mode: "specialist-only", installationArea: "roof" }),
  qualitativeRecord({ slug: "terracotta-roof-tiles", title: "Terracotta roof tiles", surface: "Roof", summary: "Terracotta roof tiles can be fragile and porous.", mode: "specialist-only", installationArea: "roof" }),
  qualitativeRecord({ slug: "metal-roofs", title: "Metal roofs", surface: "Roof", summary: "Roof coating, laps, penetrations and fall risk require specialist assessment.", mode: "specialist-only", installationArea: "roof" }),
  qualitativeRecord({ slug: "solar-panels", title: "Solar panels", surface: "Solar glass", summary: "Do not pressure wash solar panels unless manufacturer permits.", mode: "manufacturer-confirmation-required" }),
  qualitativeRecord({ slug: "heritage-masonry", title: "Heritage masonry", surface: "Masonry", summary: "Heritage masonry requires specialist conservation guidance.", mode: "specialist-only" }),
  qualitativeRecord({ slug: "damaged-crumbling-masonry", title: "Damaged or crumbling masonry", surface: "Masonry", summary: "Damaged masonry should not receive normal pressure cleaning.", mode: "specialist-only" }),
];

export type PressureCleaningTaskSlug = (typeof pressureCleaningTaskRecords)[number]["slug"];

export function getPressureCleaningTaskBySlug(slug: string) {
  return pressureCleaningTaskRecords.find((task) => task.slug === slug) ?? null;
}

export function getVisiblePressureCleaningTasks(includeDrafts: boolean) {
  return pressureCleaningTaskRecords.filter((task) => task.published || includeDrafts);
}

export function searchPressureCleaningTasks(
  tasks: PressureCleaningTaskRecord[],
  query: string
) {
  const normalisedQuery = query.trim().toLowerCase();
  if (!normalisedQuery) return tasks;

  return tasks.filter((task) =>
    [task.title, task.surface, task.summary, ...task.searchTerms].some((value) =>
      value.toLowerCase().includes(normalisedQuery)
    )
  );
}
