export type PressureCleaningEvidenceLevel =
  | "governing-body"
  | "manufacturer"
  | "supplier"
  | "industry-standard"
  | "field-practice"
  | "engineering-model"
  | "workplace-safety-authority";

export type PressureCleaningSource = {
  id: string;
  title: string;
  publisher: string;
  evidenceLevel: PressureCleaningEvidenceLevel;
  category: "guidance" | "methodology";
  lastReviewed: string;
  url?: string;
  note: string;
};

export const PRESSURE_CLEANING_SOURCE_SCHEMA_VERSION = 2;

export const pressureCleaningTaskGuideSources = [
  {
    id: "pressurecal-nozzle-equation",
    title: "PressureCal nozzle flow equation",
    publisher: "PressureCal",
    evidenceLevel: "engineering-model",
    category: "methodology",
    lastReviewed: "2026-08-05",
    note: "Uses the standard pressure washer nozzle relationship Q = nozzle size x sqrt(PSI / 4000).",
  },
  {
    id: "pressurecal-hose-loss-model",
    title: "PressureCal hose pressure-loss model",
    publisher: "PressureCal",
    evidenceLevel: "engineering-model",
    category: "methodology",
    lastReviewed: "2026-08-05",
    note: "Uses the existing Darcy-Weisbach hose-loss calculation in the full setup calculator.",
  },
  {
    id: "pressurecal-editorial-assumptions",
    title: "PressureCal editorial assumptions",
    publisher: "PressureCal",
    evidenceLevel: "field-practice",
    category: "methodology",
    lastReviewed: "2026-08-05",
    note: "Documents conservative start pressures, test-area requirements, and task-specific assumptions used when sources provide limits rather than exact nozzle setups.",
  },
  {
    id: "tennis-australia-hard-court-maintenance",
    title: "Hard-court maintenance guidance",
    publisher: "Tennis Australia",
    evidenceLevel: "governing-body",
    category: "guidance",
    lastReviewed: "2026-08-05",
    url: "https://www.tennis.com.au/",
    note: "Governing-body hard-court maintenance guidance supports professionally pressure washing painted acrylic courts below 1500 PSI.",
  },
  {
    id: "painted-surface-soft-wash-practice",
    title: "Painted and coated surface pressure cleaning practice",
    publisher: "PressureCal task guide review",
    evidenceLevel: "field-practice",
    category: "methodology",
    lastReviewed: "2026-08-05",
    note: "Supplementary PressureCal editorial guidance for coating adhesion, test patches, and conservative starting pressure.",
  },
  {
    id: "composite-decking-manufacturer-care",
    title: "Composite decking cleaning pressure limits",
    publisher: "Manufacturer care guidance review",
    evidenceLevel: "manufacturer",
    category: "guidance",
    lastReviewed: "2026-08-05",
    url: "https://www.trex.com/customer-support/care-cleaning/",
    note: "Composite decking is treated as pressure-sensitive; low pressure and fan tips are preferred.",
  },
  {
    id: "timber-deck-field-practice",
    title: "Timber deck pressure cleaning practice",
    publisher: "PressureCal task guide review",
    evidenceLevel: "field-practice",
    category: "methodology",
    lastReviewed: "2026-08-05",
    note: "Timber recommendations prioritise fibre protection, wide fan tips, and test patches.",
  },
  {
    id: "sound-concrete-field-practice",
    title: "Sound uncoated concrete pressure cleaning practice",
    publisher: "PressureCal task guide review",
    evidenceLevel: "field-practice",
    category: "methodology",
    lastReviewed: "2026-08-05",
    note: "Concrete recommendations assume sound, unsealed, uncoated concrete in serviceable condition.",
  },
  {
    id: "natural-stone-institute-care",
    title: "Natural stone care and cleaning guidance",
    publisher: "Natural Stone Institute",
    evidenceLevel: "industry-standard",
    category: "guidance",
    lastReviewed: "2026-08-05",
    url: "https://www.naturalstoneinstitute.org/",
    note: "Natural-stone care guidance supports pH-neutral cleaning and caution with acids, abrasives, sealers, and stone condition.",
  },
  {
    id: "natural-stone-institute-travertine",
    title: "Travertine and limestone stone classification",
    publisher: "Natural Stone Institute",
    evidenceLevel: "industry-standard",
    category: "guidance",
    lastReviewed: "2026-08-05",
    url: "https://www.naturalstoneinstitute.org/",
    note: "Classifies travertine with limestone-family considerations, including porosity, voids, and finish sensitivity.",
  },
  {
    id: "travertine-tiles-pavers-australia-care",
    title: "Travertine care and maintenance",
    publisher: "Travertine Tiles and Pavers Australia",
    evidenceLevel: "supplier",
    category: "guidance",
    lastReviewed: "2026-08-05",
    url: "https://www.travertinetilesandpavers.com.au/",
    note: "Supplier care guidance supports neutral stone cleaners, avoiding acids, and checking sealer, grout, filler, and joint condition.",
  },
  {
    id: "australian-travertine-pressure-advisory",
    title: "Australian travertine pressure-cleaning advisory",
    publisher: "Australian travertine supplier guidance review",
    evidenceLevel: "supplier",
    category: "guidance",
    lastReviewed: "2026-08-05",
    url: "https://www.travertinetilesandpavers.com.au/",
    note: "Supports treating 1200 PSI as an advisory ceiling for some outdoor travertine, not a universal hard maximum.",
  },
  {
    id: "safework-nsw-asbestos",
    title: "Asbestos safety guidance",
    publisher: "SafeWork NSW",
    evidenceLevel: "workplace-safety-authority",
    category: "guidance",
    lastReviewed: "2026-08-05",
    url: "https://www.safework.nsw.gov.au/",
    note: "High-pressure water must never be used on asbestos-containing material; use licensed asbestos professionals and applicable workplace-safety authority guidance.",
  },
] as const satisfies PressureCleaningSource[];

export type PressureCleaningSourceId =
  (typeof pressureCleaningTaskGuideSources)[number]["id"];

export function getPressureCleaningSource(id: PressureCleaningSourceId) {
  return pressureCleaningTaskGuideSources.find((source) => source.id === id);
}
