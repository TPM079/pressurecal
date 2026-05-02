import { Helmet } from "react-helmet-async";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import BackToTopButton from "../components/BackToTopButton";
import PressureCalLayout from "../components/PressureCalLayout";
import RequirePro from "../components/RequirePro";
import {
  useEquipmentLibrary,
  type EquipmentItem,
  type EquipmentSpecs,
  type EquipmentType,
} from "../hooks/useEquipmentLibrary";

type PressureUnit = "psi" | "bar";
type FlowUnit = "lpm" | "gpm";
type LengthUnit = "m" | "ft";
type HoseIdUnit = "mm" | "inch";

type EquipmentFormState = {
  equipmentType: EquipmentType;
  name: string;
  notes: string;
  pressurePsi: string;
  pressureUnit: PressureUnit;
  flowLpm: string;
  flowUnit: FlowUnit;
  maxPressurePsi: string;
  maxPressureUnit: PressureUnit;
  engineHp: string;
  hoseLengthM: string;
  hoseLengthUnit: LengthUnit;
  hoseIdMm: string;
  hoseIdUnit: HoseIdUnit;
  nozzleCode: string;
  nozzleCount: string;
  sprayMode: "wand" | "surfaceCleaner";
  surfaceCleanerDiameter: string;
  pressureRatingPsi: string;
  pressureRatingUnit: PressureUnit;
};

type EquipmentTypeOption = {
  value: EquipmentType;
  label: string;
  description: string;
};

const EQUIPMENT_TYPE_OPTIONS: EquipmentTypeOption[] = [
  {
    value: "machine",
    label: "Machine / pump",
    description: "Rated pressure, flow, max pressure, and engine HP.",
  },
  {
    value: "hose",
    label: "Hose",
    description: "Common hose lengths and internal diameters.",
  },
  {
    value: "nozzle",
    label: "Nozzle",
    description: "Nozzle / tip code, spray mode, and nozzle count.",
  },
  {
    value: "surface_cleaner",
    label: "Surface cleaner",
    description: "Cleaner size, nozzle count, and common nozzle code.",
  },
  {
    value: "gun_lance",
    label: "Gun / lance",
    description: "Rated pressure and operator notes for common hardware.",
  },
];

const EMPTY_FORM: EquipmentFormState = {
  equipmentType: "machine",
  name: "",
  notes: "",
  pressurePsi: "4000",
  pressureUnit: "psi",
  flowLpm: "15",
  flowUnit: "lpm",
  maxPressurePsi: "4000",
  maxPressureUnit: "psi",
  engineHp: "",
  hoseLengthM: "15",
  hoseLengthUnit: "m",
  hoseIdMm: "9.53",
  hoseIdUnit: "mm",
  nozzleCode: "040",
  nozzleCount: "1",
  sprayMode: "wand",
  surfaceCleanerDiameter: "20",
  pressureRatingPsi: "5000",
  pressureRatingUnit: "psi",
};

const NOTES_MAX_CHARS = 600;

const PSI_PER_BAR = 14.5037738;
const LPM_PER_GPM = 3.785411784;
const METRES_PER_FOOT = 0.3048;
const MM_PER_INCH = 25.4;

const HOSE_ID_OPTIONS = [
  { label: '1/8"', inch: 0.125 },
  { label: '3/16"', inch: 0.1875 },
  { label: '1/4"', inch: 0.25 },
  { label: '5/16"', inch: 0.3125 },
  { label: '3/8"', inch: 0.375 },
  { label: '1/2"', inch: 0.5 },
  { label: '3/4"', inch: 0.75 },
  { label: '1"', inch: 1 },
];

function toPsi(value: number, unit: PressureUnit) {
  return unit === "psi" ? value : value * PSI_PER_BAR;
}

function fromPsi(value: number, unit: PressureUnit) {
  return unit === "psi" ? value : value / PSI_PER_BAR;
}

function toLpm(value: number, unit: FlowUnit) {
  return unit === "lpm" ? value : value * LPM_PER_GPM;
}

function fromLpm(value: number, unit: FlowUnit) {
  return unit === "lpm" ? value : value / LPM_PER_GPM;
}

function toMetres(value: number, unit: LengthUnit) {
  return unit === "m" ? value : value * METRES_PER_FOOT;
}

function fromMetres(value: number, unit: LengthUnit) {
  return unit === "m" ? value : value / METRES_PER_FOOT;
}

function toMm(value: number, unit: HoseIdUnit) {
  return unit === "mm" ? value : value * MM_PER_INCH;
}

function fromMm(value: number, unit: HoseIdUnit) {
  return unit === "mm" ? value : value / MM_PER_INCH;
}

function equipmentTypeLabel(type: EquipmentType) {
  return EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? "Equipment";
}

function normalizeNozzleCode(value: string) {
  const cleaned = value.trim().replace(/[^0-9]/g, "");
  return cleaned ? cleaned.padStart(3, "0").slice(-3) : "";
}

function numberOrNull(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function numberFromSpec(value: EquipmentSpecs[string]) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readPressureUnit(value: EquipmentSpecs[string], fallback: PressureUnit): PressureUnit {
  return value === "bar" || value === "psi" ? value : fallback;
}

function readFlowUnit(value: EquipmentSpecs[string], fallback: FlowUnit): FlowUnit {
  return value === "gpm" || value === "lpm" ? value : fallback;
}

function readLengthUnit(value: EquipmentSpecs[string], fallback: LengthUnit): LengthUnit {
  return value === "ft" || value === "m" ? value : fallback;
}

function readHoseIdUnit(value: EquipmentSpecs[string], fallback: HoseIdUnit): HoseIdUnit {
  return value === "inch" || value === "mm" ? value : fallback;
}

function formatInputNumber(value: number | null, decimals: number) {
  if (value === null || !Number.isFinite(value)) {
    return "";
  }

  return Number(value.toFixed(decimals)).toString();
}

function formatUnitInput(
  canonicalValue: EquipmentSpecs[string],
  unit: PressureUnit,
  decimals: number
): string;
function formatUnitInput(
  canonicalValue: EquipmentSpecs[string],
  unit: FlowUnit,
  decimals: number
): string;
function formatUnitInput(
  canonicalValue: EquipmentSpecs[string],
  unit: LengthUnit,
  decimals: number
): string;
function formatUnitInput(
  canonicalValue: EquipmentSpecs[string],
  unit: HoseIdUnit,
  decimals: number
): string;
function formatUnitInput(
  canonicalValue: EquipmentSpecs[string],
  unit: PressureUnit | FlowUnit | LengthUnit | HoseIdUnit,
  decimals: number
) {
  const value = numberFromSpec(canonicalValue);

  if (value === null) {
    return "";
  }

  if (unit === "psi" || unit === "bar") {
    return formatInputNumber(fromPsi(value, unit), decimals);
  }

  if (unit === "lpm" || unit === "gpm") {
    return formatInputNumber(fromLpm(value, unit), decimals);
  }

  if (unit === "m" || unit === "ft") {
    return formatInputNumber(fromMetres(value, unit), decimals);
  }

  return formatInputNumber(fromMm(value, unit), decimals);
}

function truncate(value: string, maxChars: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars).trimEnd()}…`;
}

function buildSpecsFromForm(form: EquipmentFormState): EquipmentSpecs {
  switch (form.equipmentType) {
    case "machine": {
      const pressureValue = numberOrNull(form.pressurePsi);
      const flowValue = numberOrNull(form.flowLpm);
      const maxPressureValue = numberOrNull(form.maxPressurePsi);

      return {
        pressurePsi: pressureValue === null ? null : toPsi(pressureValue, form.pressureUnit),
        pressureUnit: form.pressureUnit,
        flowLpm: flowValue === null ? null : toLpm(flowValue, form.flowUnit),
        flowUnit: form.flowUnit,
        maxPressurePsi:
          maxPressureValue === null ? null : toPsi(maxPressureValue, form.maxPressureUnit),
        maxPressureUnit: form.maxPressureUnit,
        engineHp: numberOrNull(form.engineHp),
      };
    }
    case "hose": {
      const hoseLengthValue = numberOrNull(form.hoseLengthM);
      const hoseIdValue = numberOrNull(form.hoseIdMm);

      return {
        hoseLengthM:
          hoseLengthValue === null ? null : toMetres(hoseLengthValue, form.hoseLengthUnit),
        hoseLengthUnit: form.hoseLengthUnit,
        hoseIdMm: hoseIdValue === null ? null : toMm(hoseIdValue, form.hoseIdUnit),
        hoseIdUnit: form.hoseIdUnit,
      };
    }
    case "nozzle":
      return {
        nozzleCode: normalizeNozzleCode(form.nozzleCode),
        nozzleCount: numberOrNull(form.nozzleCount),
        sprayMode: form.sprayMode,
      };
    case "surface_cleaner":
      return {
        surfaceCleanerDiameter: numberOrNull(form.surfaceCleanerDiameter),
        nozzleCode: normalizeNozzleCode(form.nozzleCode),
        nozzleCount: numberOrNull(form.nozzleCount),
        sprayMode: "surfaceCleaner",
      };
    case "gun_lance": {
      const ratingValue = numberOrNull(form.pressureRatingPsi);

      return {
        pressureRatingPsi:
          ratingValue === null ? null : toPsi(ratingValue, form.pressureRatingUnit),
        pressureRatingUnit: form.pressureRatingUnit,
      };
    }
    default:
      return {};
  }
}
function specsToFormValues(item: EquipmentItem): EquipmentFormState {
  const pressureUnit = readPressureUnit(item.specs.pressureUnit, EMPTY_FORM.pressureUnit);
  const flowUnit = readFlowUnit(item.specs.flowUnit, EMPTY_FORM.flowUnit);
  const maxPressureUnit = readPressureUnit(item.specs.maxPressureUnit, EMPTY_FORM.maxPressureUnit);
  const hoseLengthUnit = readLengthUnit(item.specs.hoseLengthUnit, EMPTY_FORM.hoseLengthUnit);
  const hoseIdUnit = readHoseIdUnit(item.specs.hoseIdUnit, EMPTY_FORM.hoseIdUnit);
  const pressureRatingUnit = readPressureUnit(
    item.specs.pressureRatingUnit,
    EMPTY_FORM.pressureRatingUnit
  );

  return {
    ...EMPTY_FORM,
    equipmentType: item.equipmentType,
    name: item.name,
    notes: item.notes,
    pressurePsi:
      formatUnitInput(item.specs.pressurePsi, pressureUnit, pressureUnit === "psi" ? 0 : 1) ||
      EMPTY_FORM.pressurePsi,
    pressureUnit,
    flowLpm:
      formatUnitInput(item.specs.flowLpm, flowUnit, flowUnit === "lpm" ? 1 : 2) ||
      EMPTY_FORM.flowLpm,
    flowUnit,
    maxPressurePsi:
      formatUnitInput(
        item.specs.maxPressurePsi,
        maxPressureUnit,
        maxPressureUnit === "psi" ? 0 : 1
      ) || EMPTY_FORM.maxPressurePsi,
    maxPressureUnit,
    engineHp: String(item.specs.engineHp ?? ""),
    hoseLengthM:
      formatUnitInput(item.specs.hoseLengthM, hoseLengthUnit, hoseLengthUnit === "m" ? 1 : 1) ||
      EMPTY_FORM.hoseLengthM,
    hoseLengthUnit,
    hoseIdMm:
      formatUnitInput(item.specs.hoseIdMm, hoseIdUnit, hoseIdUnit === "mm" ? 2 : 3) ||
      EMPTY_FORM.hoseIdMm,
    hoseIdUnit,
    nozzleCode: String(item.specs.nozzleCode ?? EMPTY_FORM.nozzleCode),
    nozzleCount: String(item.specs.nozzleCount ?? EMPTY_FORM.nozzleCount),
    sprayMode:
      item.specs.sprayMode === "surfaceCleaner" ? "surfaceCleaner" : "wand",
    surfaceCleanerDiameter: String(
      item.specs.surfaceCleanerDiameter ?? EMPTY_FORM.surfaceCleanerDiameter
    ),
    pressureRatingPsi:
      formatUnitInput(
        item.specs.pressureRatingPsi,
        pressureRatingUnit,
        pressureRatingUnit === "psi" ? 0 : 1
      ) || EMPTY_FORM.pressureRatingPsi,
    pressureRatingUnit,
  };
}
function formatNumber(value: EquipmentSpecs[string], decimals = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

function formatNumericValue(value: number, decimals = 0) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

function formatPressure(value: EquipmentSpecs[string]) {
  const psi = numberFromSpec(value);

  if (psi === null) {
    return "—";
  }

  return `${formatNumericValue(psi, 0)} PSI / ${formatNumericValue(fromPsi(psi, "bar"), 1)} BAR`;
}

function formatFlow(value: EquipmentSpecs[string]) {
  const lpm = numberFromSpec(value);

  if (lpm === null) {
    return "—";
  }

  return `${formatNumericValue(lpm, 1)} LPM / ${formatNumericValue(fromLpm(lpm, "gpm"), 2)} GPM (US)`;
}

function formatLength(value: EquipmentSpecs[string]) {
  const metres = numberFromSpec(value);

  if (metres === null) {
    return "—";
  }

  return `${formatNumericValue(metres, 1)} m / ${formatNumericValue(fromMetres(metres, "ft"), 1)} ft`;
}

function formatHoseId(value: EquipmentSpecs[string]) {
  const mm = numberFromSpec(value);

  if (mm === null) {
    return "—";
  }

  const inches = fromMm(mm, "inch");
  const common = HOSE_ID_OPTIONS.find((option) => Math.abs(option.inch - inches) < 0.004);
  const inchLabel = common?.label ?? `${formatNumericValue(inches, 3)}"`;

  return `${formatNumericValue(mm, 2)} mm / ${inchLabel}`;
}

function buildSpecsSummary(item: EquipmentItem) {
  switch (item.equipmentType) {
    case "machine":
      return [
        { label: "Pressure", value: formatPressure(item.specs.pressurePsi) },
        { label: "Flow", value: formatFlow(item.specs.flowLpm) },
        { label: "Max pressure", value: formatPressure(item.specs.maxPressurePsi) },
        { label: "Engine", value: item.specs.engineHp ? `${formatNumber(item.specs.engineHp, 1)} HP` : "Not saved" },
      ];
    case "hose":
      return [
        { label: "Length", value: formatLength(item.specs.hoseLengthM) },
        { label: "Hose ID", value: formatHoseId(item.specs.hoseIdMm) },
      ];
    case "nozzle":
      return [
        { label: "Nozzle / tip", value: String(item.specs.nozzleCode ?? "—") },
        { label: "Count", value: `${formatNumber(item.specs.nozzleCount)} nozzle${item.specs.nozzleCount === 1 ? "" : "s"}` },
        { label: "Spray mode", value: item.specs.sprayMode === "surfaceCleaner" ? "Surface cleaner" : "Wand" },
      ];
    case "surface_cleaner":
      return [
        { label: "Diameter", value: `${formatNumber(item.specs.surfaceCleanerDiameter)} in` },
        { label: "Nozzle / tip", value: String(item.specs.nozzleCode ?? "—") },
        { label: "Nozzle count", value: `${formatNumber(item.specs.nozzleCount)} nozzles` },
      ];
    case "gun_lance":
      return [
        { label: "Pressure rating", value: formatPressure(item.specs.pressureRatingPsi) },
      ];
    default:
      return [];
  }
}
function getDefaultName(type: EquipmentType) {
  switch (type) {
    case "machine":
      return "4000 PSI / 15 LPM machine";
    case "hose":
      return "15 m 3/8 hose";
    case "nozzle":
      return "040 nozzle";
    case "surface_cleaner":
      return "20 inch surface cleaner";
    case "gun_lance":
      return "Gun and lance set";
    default:
      return "Equipment item";
  }
}

function FormField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </label>
  );
}

export default function EquipmentLibraryPage() {
  const {
    items,
    countsByType,
    isReady,
    isWorking,
    error,
    saveItem,
    deleteItem,
    duplicateItem,
  } = useEquipmentLibrary();

  const [form, setForm] = useState<EquipmentFormState>(EMPTY_FORM);
  const [selectedType, setSelectedType] = useState<EquipmentType | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const visibleItems = useMemo(
    () =>
      selectedType === "all"
        ? items
        : items.filter((item) => item.equipmentType === selectedType),
    [items, selectedType]
  );

  function updateForm<K extends keyof EquipmentFormState>(key: K, value: EquipmentFormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function changePressureInputUnit(
    valueKey: "pressurePsi" | "maxPressurePsi" | "pressureRatingPsi",
    unitKey: "pressureUnit" | "maxPressureUnit" | "pressureRatingUnit",
    nextUnit: PressureUnit
  ) {
    setForm((current) => {
      const currentValue = numberOrNull(current[valueKey]);
      const currentUnit = current[unitKey];
      const psiValue = currentValue === null ? null : toPsi(currentValue, currentUnit);

      return {
        ...current,
        [valueKey]:
          psiValue === null
            ? ""
            : formatInputNumber(fromPsi(psiValue, nextUnit), nextUnit === "psi" ? 0 : 1),
        [unitKey]: nextUnit,
      } as EquipmentFormState;
    });
  }

  function changeFlowInputUnit(nextUnit: FlowUnit) {
    setForm((current) => {
      const currentValue = numberOrNull(current.flowLpm);
      const lpmValue = currentValue === null ? null : toLpm(currentValue, current.flowUnit);

      return {
        ...current,
        flowLpm:
          lpmValue === null
            ? ""
            : formatInputNumber(fromLpm(lpmValue, nextUnit), nextUnit === "lpm" ? 1 : 2),
        flowUnit: nextUnit,
      };
    });
  }

  function changeHoseLengthUnit(nextUnit: LengthUnit) {
    setForm((current) => {
      const currentValue = numberOrNull(current.hoseLengthM);
      const metresValue =
        currentValue === null ? null : toMetres(currentValue, current.hoseLengthUnit);

      return {
        ...current,
        hoseLengthM:
          metresValue === null
            ? ""
            : formatInputNumber(fromMetres(metresValue, nextUnit), 1),
        hoseLengthUnit: nextUnit,
      };
    });
  }

  function changeHoseIdUnit(nextUnit: HoseIdUnit) {
    setForm((current) => {
      const currentValue = numberOrNull(current.hoseIdMm);
      const mmValue = currentValue === null ? null : toMm(currentValue, current.hoseIdUnit);

      return {
        ...current,
        hoseIdMm:
          mmValue === null
            ? ""
            : formatInputNumber(fromMm(mmValue, nextUnit), nextUnit === "mm" ? 2 : 3),
        hoseIdUnit: nextUnit,
      };
    });
  }

  function applyHoseIdPreset(inchValue: string) {
    const parsed = Number(inchValue);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    setForm((current) => ({
      ...current,
      hoseIdMm: formatInputNumber(parsed, 4),
      hoseIdUnit: "inch",
    }));
  }

  function changeEquipmentType(type: EquipmentType) {
    setForm((current) => ({
      ...EMPTY_FORM,
      equipmentType: type,
      name: current.name.trim() ? current.name : getDefaultName(type),
      notes: current.notes,
    }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setLocalError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    try {
      await saveItem(
        {
          equipmentType: form.equipmentType,
          name: form.name,
          specs: buildSpecsFromForm(form),
          notes: form.notes.slice(0, NOTES_MAX_CHARS),
        },
        editingId
      );

      setSuccessMessage(editingId ? "Equipment item updated." : "Equipment item saved.");
      resetForm();
    } catch (saveError) {
      setLocalError(
        saveError instanceof Error ? saveError.message : "Unable to save this equipment item."
      );
    }
  }

  function startEditing(item: EquipmentItem) {
    setForm(specsToFormValues(item));
    setEditingId(item.id);
    setLocalError(null);
    setSuccessMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(item: EquipmentItem) {
    const confirmed = window.confirm(`Delete ${item.name}?`);

    if (!confirmed) {
      return;
    }

    setLocalError(null);
    setSuccessMessage(null);

    try {
      await deleteItem(item.id);
      setSuccessMessage("Equipment item deleted.");

      if (editingId === item.id) {
        resetForm();
      }
    } catch (deleteError) {
      setLocalError(
        deleteError instanceof Error ? deleteError.message : "Unable to delete this equipment item."
      );
    }
  }

  async function handleDuplicate(item: EquipmentItem) {
    setLocalError(null);
    setSuccessMessage(null);

    try {
      await duplicateItem(item.id);
      setSuccessMessage("Equipment item duplicated.");
    } catch (duplicateError) {
      setLocalError(
        duplicateError instanceof Error
          ? duplicateError.message
          : "Unable to duplicate this equipment item."
      );
    }
  }

  const signedOutFallback = (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
        PressureCal Pro
      </div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        Sign in to use Equipment Library
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
        Save machines, hoses, nozzles, surface cleaners, and common hardware under your PressureCal account.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/account"
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Sign In
        </Link>
        <Link
          to="/pro"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View PressureCal Pro
        </Link>
      </div>
    </div>
  );

  const nonProFallback = (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
        PressureCal Pro
      </div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        Equipment Library is a Pro feature
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
        Upgrade to PressureCal Pro to save common gear and build repeat setups faster.
      </p>
      <div className="mt-6">
        <Link
          to="/pro"
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          View PressureCal Pro Plans
        </Link>
      </div>
    </div>
  );

  return (
    <PressureCalLayout>
      <Helmet>
        <title>Equipment Library | PressureCal Pro</title>
        <meta
          name="description"
          content="Save common machines, hoses, nozzles, and setup components with PressureCal Pro."
        />
      </Helmet>

      <div className="-mx-4 min-h-screen bg-slate-50 px-4 py-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  PressureCal Pro
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Equipment Library
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                  Save the machines, hoses, nozzles, surface cleaners, guns, and lances you use often. This is the first step toward building setups from saved gear instead of typing the same values again.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/saved-setups"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Saved Setups
                </Link>
                <Link
                  to="/calculator"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Open Calculator
                </Link>
              </div>
            </div>
          </section>

          <RequirePro
            signedOutFallback={signedOutFallback}
            nonProFallback={nonProFallback}
            loadingFallback={
              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                Checking your Pro access...
              </div>
            }
          >
            <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {editingId ? "Edit equipment item" : "Save equipment item"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Start simple. Save the values you reuse often; setup-building from the library can come next.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  <FormField label="Equipment type">
                    <select
                      value={form.equipmentType}
                      onChange={(event) => changeEquipmentType(event.target.value as EquipmentType)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-500"
                    >
                      {EQUIPMENT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Name">
                    <input
                      value={form.name}
                      onChange={(event) => updateForm("name", event.target.value)}
                      maxLength={120}
                      placeholder={getDefaultName(form.equipmentType)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                    />
                  </FormField>

                  {form.equipmentType === "machine" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Rated pressure">
                        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
                          <input
                            value={form.pressurePsi}
                            onChange={(event) => updateForm("pressurePsi", event.target.value)}
                            inputMode="decimal"
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                          <select
                            value={form.pressureUnit}
                            onChange={(event) =>
                              changePressureInputUnit(
                                "pressurePsi",
                                "pressureUnit",
                                event.target.value as PressureUnit
                              )
                            }
                            className="rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-500"
                          >
                            <option value="psi">PSI</option>
                            <option value="bar">BAR</option>
                          </select>
                        </div>
                      </FormField>
                      <FormField label="Rated flow">
                        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
                          <input
                            value={form.flowLpm}
                            onChange={(event) => updateForm("flowLpm", event.target.value)}
                            inputMode="decimal"
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                          <select
                            value={form.flowUnit}
                            onChange={(event) => changeFlowInputUnit(event.target.value as FlowUnit)}
                            className="rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-500"
                          >
                            <option value="lpm">LPM</option>
                            <option value="gpm">GPM (US)</option>
                          </select>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">GPM uses US gallons.</p>
                      </FormField>
                      <FormField label="Max pressure / unloader">
                        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
                          <input
                            value={form.maxPressurePsi}
                            onChange={(event) => updateForm("maxPressurePsi", event.target.value)}
                            inputMode="decimal"
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                          <select
                            value={form.maxPressureUnit}
                            onChange={(event) =>
                              changePressureInputUnit(
                                "maxPressurePsi",
                                "maxPressureUnit",
                                event.target.value as PressureUnit
                              )
                            }
                            className="rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-500"
                          >
                            <option value="psi">PSI</option>
                            <option value="bar">BAR</option>
                          </select>
                        </div>
                      </FormField>
                      <FormField label="Engine HP" hint="Optional. Leave blank if you do not want engine-load checks.">
                        <input
                          value={form.engineHp}
                          onChange={(event) => updateForm("engineHp", event.target.value)}
                          inputMode="decimal"
                          placeholder="Optional"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                        />
                      </FormField>
                    </div>
                  ) : null}

                  {form.equipmentType === "hose" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Hose length">
                        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                          <input
                            value={form.hoseLengthM}
                            onChange={(event) => updateForm("hoseLengthM", event.target.value)}
                            inputMode="decimal"
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                          <select
                            value={form.hoseLengthUnit}
                            onChange={(event) => changeHoseLengthUnit(event.target.value as LengthUnit)}
                            className="rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-500"
                          >
                            <option value="m">Metres</option>
                            <option value="ft">Feet</option>
                          </select>
                        </div>
                      </FormField>
                      <FormField label="Hose ID">
                        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
                          <input
                            value={form.hoseIdMm}
                            onChange={(event) => updateForm("hoseIdMm", event.target.value)}
                            inputMode="decimal"
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                          <select
                            value={form.hoseIdUnit}
                            onChange={(event) => changeHoseIdUnit(event.target.value as HoseIdUnit)}
                            className="rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-500"
                          >
                            <option value="mm">mm</option>
                            <option value="inch">inch</option>
                          </select>
                        </div>

                        <select
                          defaultValue=""
                          onChange={(event) => {
                            applyHoseIdPreset(event.target.value);
                            event.currentTarget.value = "";
                          }}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-500"
                        >
                          <option value="">Common hose ID sizes</option>
                          {HOSE_ID_OPTIONS.map((option) => (
                            <option key={option.label} value={option.inch}>
                              {option.label} ({formatNumericValue(toMm(option.inch, "inch"), 2)} mm)
                            </option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                  ) : null}

                  {form.equipmentType === "nozzle" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Nozzle / tip code">
                        <input
                          value={form.nozzleCode}
                          onChange={(event) => updateForm("nozzleCode", event.target.value)}
                          inputMode="numeric"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                        />
                      </FormField>
                      <FormField label="Nozzle count">
                        <input
                          value={form.nozzleCount}
                          onChange={(event) => updateForm("nozzleCount", event.target.value)}
                          inputMode="numeric"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                        />
                      </FormField>
                      <FormField label="Spray mode">
                        <select
                          value={form.sprayMode}
                          onChange={(event) => updateForm("sprayMode", event.target.value as EquipmentFormState["sprayMode"])}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-500"
                        >
                          <option value="wand">Wand</option>
                          <option value="surfaceCleaner">Surface cleaner</option>
                        </select>
                      </FormField>
                    </div>
                  ) : null}

                  {form.equipmentType === "surface_cleaner" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Cleaner diameter">
                        <input
                          value={form.surfaceCleanerDiameter}
                          onChange={(event) => updateForm("surfaceCleanerDiameter", event.target.value)}
                          inputMode="decimal"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                        />
                        <p className="mt-2 text-xs text-slate-500">inches</p>
                      </FormField>
                      <FormField label="Nozzle / tip code">
                        <input
                          value={form.nozzleCode}
                          onChange={(event) => updateForm("nozzleCode", event.target.value)}
                          inputMode="numeric"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                        />
                      </FormField>
                      <FormField label="Nozzle count">
                        <input
                          value={form.nozzleCount}
                          onChange={(event) => updateForm("nozzleCount", event.target.value)}
                          inputMode="numeric"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                        />
                      </FormField>
                    </div>
                  ) : null}

                  {form.equipmentType === "gun_lance" ? (
                    <FormField label="Pressure rating">
                      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
                        <input
                          value={form.pressureRatingPsi}
                          onChange={(event) => updateForm("pressureRatingPsi", event.target.value)}
                          inputMode="decimal"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                        />
                        <select
                          value={form.pressureRatingUnit}
                          onChange={(event) =>
                            changePressureInputUnit(
                              "pressureRatingPsi",
                              "pressureRatingUnit",
                              event.target.value as PressureUnit
                            )
                          }
                          className="rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-500"
                        >
                          <option value="psi">PSI</option>
                          <option value="bar">BAR</option>
                        </select>
                      </div>
                    </FormField>
                  ) : null}

                  <FormField
                    label="Equipment notes"
                    hint="Use for nozzle wear, customer preferences, hose condition, fittings, or reminders."
                  >
                    <textarea
                      value={form.notes}
                      onChange={(event) => updateForm("notes", event.target.value.slice(0, NOTES_MAX_CHARS))}
                      rows={4}
                      maxLength={NOTES_MAX_CHARS}
                      className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-slate-500"
                    />
                    <p className="mt-2 text-right text-xs text-slate-500">
                      {form.notes.length}/{NOTES_MAX_CHARS}
                    </p>
                  </FormField>

                  {(localError || error) ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                      {localError ?? error}
                    </div>
                  ) : null}

                  {successMessage ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800">
                      {successMessage}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={isWorking}
                      className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isWorking ? "Saving..." : editingId ? "Update Item" : "Save Item"}
                    </button>

                    <button
                      type="button"
                      onClick={resetForm}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Clear Form
                    </button>
                  </div>
                </form>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                      Your equipment
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {items.length} {items.length === 1 ? "item" : "items"} saved
                    </p>
                  </div>

                  <select
                    value={selectedType}
                    onChange={(event) => setSelectedType(event.target.value as EquipmentType | "all")}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-500"
                  >
                    <option value="all">All equipment</option>
                    {EQUIPMENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({countsByType[option.value]})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {EQUIPMENT_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedType(option.value)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        selectedType === option.value
                          ? "border-slate-900 bg-slate-950 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
                        {option.label}
                      </p>
                      <p className="mt-1 text-xl font-semibold">{countsByType[option.value]}</p>
                    </button>
                  ))}
                </div>

                {!isReady ? (
                  <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                    Loading equipment library...
                  </div>
                ) : visibleItems.length === 0 ? (
                  <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                    <p className="text-sm font-semibold text-slate-900">No equipment saved here yet</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Save your first machine, hose, nozzle, surface cleaner, or gun/lance item to start building your Pro library.
                    </p>
                  </div>
                ) : (
                  <div className="mt-8 space-y-4">
                    {visibleItems.map((item) => (
                      <article key={item.id} className="rounded-2xl border border-slate-200 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {equipmentTypeLabel(item.equipmentType)}
                            </p>
                            <h3 className="mt-2 break-words text-lg font-semibold text-slate-950 [overflow-wrap:anywhere]">
                              {item.name}
                            </h3>
                            <p className="mt-1 text-xs uppercase tracking-[0.15em] text-slate-400">
                              Updated {new Date(item.updatedAt).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(item)}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicate(item)}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Duplicate
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          {buildSpecsSummary(item).map((spec) => (
                            <div key={`${item.id}-${spec.label}`} className="rounded-2xl bg-slate-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                {spec.label}
                              </p>
                              <p className="mt-1 break-words text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">
                                {spec.value}
                              </p>
                            </div>
                          ))}
                        </div>

                        {item.notes ? (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              Equipment notes
                            </p>
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">
                              {truncate(item.notes, 220)}
                            </p>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </RequirePro>

          <BackToTopButton />
        </div>
      </div>
    </PressureCalLayout>
  );
}
