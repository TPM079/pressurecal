import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DiameterUnit,
  FlowUnit,
  Inputs,
  LengthUnit,
  PressureUnit,
} from "../pressurecal";
import { supabase } from "../lib/supabase-browser";

export type SavedSetup = {
  id: string;
  userId: string;
  name: string;
  notes: string | null;

  machinePsi: number | null;
  machineLpm: number | null;
  hoseLengthM: number | null;
  hoseIdMm: number | null;
  nozzleSize: string | null;

  pumpPressure: number | null;
  pumpPressureUnit: PressureUnit;
  pumpFlow: number | null;
  pumpFlowUnit: FlowUnit;
  maxPressure: number | null;
  maxPressureUnit: PressureUnit;
  hoseLength: number | null;
  hoseLengthUnit: LengthUnit;
  hoseId: number | null;
  hoseIdUnit: DiameterUnit;
  engineHp: number | null;
  sprayMode: "wand" | "surfaceCleaner";
  nozzleCount: number;
  nozzleMode: "tipSize";
  nozzleSizeText: string | null;
  orificeMm: number | null;
  dischargeCoeffCd: number | null;
  waterDensity: number | null;
  hoseRoughnessMm: number | null;

  createdAt: string;
  updatedAt: string;
};

type SaveSetupInput = {
  id?: string;
  name: string;
  notes?: string | null;

  machinePsi?: number | null;
  machineLpm?: number | null;
  hoseLengthM?: number | null;
  hoseIdMm?: number | null;
  nozzleSize?: string | null;

  pumpPressure?: number | null;
  pumpPressureUnit?: PressureUnit;
  pumpFlow?: number | null;
  pumpFlowUnit?: FlowUnit;
  maxPressure?: number | null;
  maxPressureUnit?: PressureUnit;
  hoseLength?: number | null;
  hoseLengthUnit?: LengthUnit;
  hoseId?: number | null;
  hoseIdUnit?: DiameterUnit;
  engineHp?: number | null;
  sprayMode?: "wand" | "surfaceCleaner";
  nozzleCount?: number;
  nozzleMode?: "tipSize";
  nozzleSizeText?: string | null;
  orificeMm?: number | null;
  dischargeCoeffCd?: number | null;
  waterDensity?: number | null;
  hoseRoughnessMm?: number | null;
};

type SavedSetupRow = {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_SNAPSHOT = {
  machinePsi: 4000,
  machineLpm: 15,
  hoseLengthM: 15,
  hoseIdMm: 9.53,
  nozzleSize: "040",

  pumpPressure: 4000,
  pumpPressureUnit: "psi" as PressureUnit,
  pumpFlow: 15,
  pumpFlowUnit: "lpm" as FlowUnit,
  maxPressure: 4000,
  maxPressureUnit: "psi" as PressureUnit,
  hoseLength: 15,
  hoseLengthUnit: "m" as LengthUnit,
  hoseId: 9.53,
  hoseIdUnit: "mm" as DiameterUnit,
  engineHp: null as number | null,
  sprayMode: "wand" as const,
  nozzleCount: 1,
  nozzleMode: "tipSize" as const,
  nozzleSizeText: "040",
  orificeMm: 1.2,
  dischargeCoeffCd: 0.62,
  waterDensity: 1000,
  hoseRoughnessMm: 0.0015,
};

const INPUT_DEFAULTS: Inputs = {
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

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `setup_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function toNullableNumber(value: unknown, fallback: number | null) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPressureUnit(value: unknown, fallback: PressureUnit): PressureUnit {
  return value === "psi" || value === "bar" ? value : fallback;
}

function toFlowUnit(value: unknown, fallback: FlowUnit): FlowUnit {
  return value === "lpm" || value === "gpm" ? value : fallback;
}

function toLengthUnit(value: unknown, fallback: LengthUnit): LengthUnit {
  return value === "m" || value === "ft" ? value : fallback;
}

function toDiameterUnit(value: unknown, fallback: DiameterUnit): DiameterUnit {
  return value === "mm" || value === "in" ? value : fallback;
}

function toSprayMode(
  value: unknown,
  fallback: "wand" | "surfaceCleaner"
): "wand" | "surfaceCleaner" {
  return value === "wand" || value === "surfaceCleaner" ? value : fallback;
}

function normalizeSavedSetup(
  raw: Partial<SavedSetup> & {
    id?: string;
    userId?: string;
    name?: string;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
  },
  userId: string
): SavedSetup {
  const now = new Date().toISOString();

  const machinePsi = toNullableNumber(raw.machinePsi, DEFAULT_SNAPSHOT.machinePsi);
  const machineLpm = toNullableNumber(raw.machineLpm, DEFAULT_SNAPSHOT.machineLpm);
  const hoseLengthM = toNullableNumber(raw.hoseLengthM, DEFAULT_SNAPSHOT.hoseLengthM);
  const hoseIdMm = toNullableNumber(raw.hoseIdMm, DEFAULT_SNAPSHOT.hoseIdMm);
  const nozzleSize =
    typeof raw.nozzleSize === "string" && raw.nozzleSize.trim()
      ? raw.nozzleSize.trim()
      : DEFAULT_SNAPSHOT.nozzleSize;

  const pumpPressure = toNullableNumber(
    raw.pumpPressure,
    machinePsi ?? DEFAULT_SNAPSHOT.pumpPressure
  );
  const pumpPressureUnit = toPressureUnit(
    raw.pumpPressureUnit,
    DEFAULT_SNAPSHOT.pumpPressureUnit
  );
  const pumpFlow = toNullableNumber(
    raw.pumpFlow,
    machineLpm ?? DEFAULT_SNAPSHOT.pumpFlow
  );
  const pumpFlowUnit = toFlowUnit(raw.pumpFlowUnit, DEFAULT_SNAPSHOT.pumpFlowUnit);
  const maxPressure = toNullableNumber(
    raw.maxPressure,
    pumpPressure ?? DEFAULT_SNAPSHOT.maxPressure
  );
  const maxPressureUnit = toPressureUnit(raw.maxPressureUnit, pumpPressureUnit);
  const hoseLength = toNullableNumber(
    raw.hoseLength,
    hoseLengthM ?? DEFAULT_SNAPSHOT.hoseLength
  );
  const hoseLengthUnit = toLengthUnit(raw.hoseLengthUnit, DEFAULT_SNAPSHOT.hoseLengthUnit);
  const hoseId = toNullableNumber(raw.hoseId, hoseIdMm ?? DEFAULT_SNAPSHOT.hoseId);
  const hoseIdUnit = toDiameterUnit(raw.hoseIdUnit, DEFAULT_SNAPSHOT.hoseIdUnit);
  const engineHp = toNullableNumber(raw.engineHp, DEFAULT_SNAPSHOT.engineHp);
  const sprayMode = toSprayMode(raw.sprayMode, DEFAULT_SNAPSHOT.sprayMode);
  const nozzleCount = Math.max(
    sprayMode === "surfaceCleaner" ? 2 : 1,
    toNullableNumber(raw.nozzleCount, DEFAULT_SNAPSHOT.nozzleCount) ??
      DEFAULT_SNAPSHOT.nozzleCount
  );
  const nozzleSizeText =
    typeof raw.nozzleSizeText === "string" && raw.nozzleSizeText.trim()
      ? raw.nozzleSizeText.trim()
      : nozzleSize ?? DEFAULT_SNAPSHOT.nozzleSizeText;

  return {
    id: raw.id || makeId(),
    userId,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Untitled setup",
    notes: typeof raw.notes === "string" ? raw.notes : null,

    machinePsi,
    machineLpm,
    hoseLengthM,
    hoseIdMm,
    nozzleSize,

    pumpPressure,
    pumpPressureUnit,
    pumpFlow,
    pumpFlowUnit,
    maxPressure,
    maxPressureUnit,
    hoseLength,
    hoseLengthUnit,
    hoseId,
    hoseIdUnit,
    engineHp,
    sprayMode,
    nozzleCount,
    nozzleMode: "tipSize",
    nozzleSizeText,
    orificeMm: toNullableNumber(raw.orificeMm, DEFAULT_SNAPSHOT.orificeMm),
    dischargeCoeffCd: toNullableNumber(raw.dischargeCoeffCd, DEFAULT_SNAPSHOT.dischargeCoeffCd),
    waterDensity: toNullableNumber(raw.waterDensity, DEFAULT_SNAPSHOT.waterDensity),
    hoseRoughnessMm: toNullableNumber(raw.hoseRoughnessMm, DEFAULT_SNAPSHOT.hoseRoughnessMm),

    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
  };
}

function rowToSavedSetup(row: SavedSetupRow): SavedSetup {
  const payload = row.payload ?? {};
  return normalizeSavedSetup(
    {
      ...(payload as Partial<SavedSetup>),
      id: row.id,
      userId: row.user_id,
      name: row.name,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    row.user_id
  );
}

function savedSetupToRow(setup: SavedSetup): SavedSetupRow {
  return {
    id: setup.id,
    user_id: setup.userId,
    name: setup.name,
    notes: setup.notes,
    payload: {
      machinePsi: setup.machinePsi,
      machineLpm: setup.machineLpm,
      hoseLengthM: setup.hoseLengthM,
      hoseIdMm: setup.hoseIdMm,
      nozzleSize: setup.nozzleSize,

      pumpPressure: setup.pumpPressure,
      pumpPressureUnit: setup.pumpPressureUnit,
      pumpFlow: setup.pumpFlow,
      pumpFlowUnit: setup.pumpFlowUnit,
      maxPressure: setup.maxPressure,
      maxPressureUnit: setup.maxPressureUnit,
      hoseLength: setup.hoseLength,
      hoseLengthUnit: setup.hoseLengthUnit,
      hoseId: setup.hoseId,
      hoseIdUnit: setup.hoseIdUnit,
      engineHp: setup.engineHp,
      sprayMode: setup.sprayMode,
      nozzleCount: setup.nozzleCount,
      nozzleMode: setup.nozzleMode,
      nozzleSizeText: setup.nozzleSizeText,
      orificeMm: setup.orificeMm,
      dischargeCoeffCd: setup.dischargeCoeffCd,
      waterDensity: setup.waterDensity,
      hoseRoughnessMm: setup.hoseRoughnessMm,
    },
    created_at: setup.createdAt,
    updated_at: setup.updatedAt,
  };
}

async function fetchSavedSetupsFromSupabase(userId: string): Promise<SavedSetup[]> {
  const { data, error } = await supabase
    .from("saved_setups")
    .select("id,user_id,name,notes,payload,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as SavedSetupRow[]).map(rowToSavedSetup);
}

async function upsertSavedSetupToSupabase(setup: SavedSetup) {
  const row = savedSetupToRow(setup);

  const { error } = await supabase.from("saved_setups").upsert(row, {
    onConflict: "id",
  });

  if (error) {
    throw error;
  }
}

async function deleteSavedSetupFromSupabase(setupId: string) {
  const { error } = await supabase.from("saved_setups").delete().eq("id", setupId);

  if (error) {
    throw error;
  }
}

export function inputsFromSavedSetup(setup: SavedSetup): Inputs {
  return {
    pumpPressure: setup.pumpPressure ?? INPUT_DEFAULTS.pumpPressure,
    pumpPressureUnit: setup.pumpPressureUnit,
    pumpFlow: setup.pumpFlow ?? INPUT_DEFAULTS.pumpFlow,
    pumpFlowUnit: setup.pumpFlowUnit,
    maxPressure: setup.maxPressure ?? INPUT_DEFAULTS.maxPressure,
    maxPressureUnit: setup.maxPressureUnit,
    hoseLength: setup.hoseLength ?? INPUT_DEFAULTS.hoseLength,
    hoseLengthUnit: setup.hoseLengthUnit,
    hoseId: setup.hoseId ?? INPUT_DEFAULTS.hoseId,
    hoseIdUnit: setup.hoseIdUnit,
    engineHp: setup.engineHp ?? INPUT_DEFAULTS.engineHp,
    sprayMode: setup.sprayMode,
    nozzleCount: setup.nozzleCount,
    nozzleMode: "tipSize",
    nozzleSizeText: setup.nozzleSizeText ?? INPUT_DEFAULTS.nozzleSizeText,
    orificeMm: setup.orificeMm ?? INPUT_DEFAULTS.orificeMm,
    dischargeCoeffCd: setup.dischargeCoeffCd ?? INPUT_DEFAULTS.dischargeCoeffCd,
    waterDensity: setup.waterDensity ?? INPUT_DEFAULTS.waterDensity,
    hoseRoughnessMm: setup.hoseRoughnessMm ?? INPUT_DEFAULTS.hoseRoughnessMm,
  };
}

export function useSavedSetups(userId: string | null) {
  const [setups, setSetups] = useState<SavedSetup[]>([]);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setSetups([]);
      setIsReady(true);
      return;
    }

    setIsReady(false);

    try {
      const nextSetups = await fetchSavedSetupsFromSupabase(userId);
      setSetups(nextSetups);
    } catch (error) {
      console.error("Failed to load saved setups from Supabase", error);
      setSetups([]);
    } finally {
      setIsReady(true);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveSetup = useCallback(
    (input: SaveSetupInput) => {
      if (!userId) {
        throw new Error("Cannot save setup without a signed-in user.");
      }

      const timestamp = new Date().toISOString();
      const existing = input.id ? setups.find((setup) => setup.id === input.id) : null;

      const nextSetup = normalizeSavedSetup(
        {
          id: existing?.id ?? input.id ?? makeId(),
          userId,
          name: input.name,
          notes: input.notes ?? null,

          machinePsi: input.machinePsi ?? existing?.machinePsi ?? DEFAULT_SNAPSHOT.machinePsi,
          machineLpm: input.machineLpm ?? existing?.machineLpm ?? DEFAULT_SNAPSHOT.machineLpm,
          hoseLengthM: input.hoseLengthM ?? existing?.hoseLengthM ?? DEFAULT_SNAPSHOT.hoseLengthM,
          hoseIdMm: input.hoseIdMm ?? existing?.hoseIdMm ?? DEFAULT_SNAPSHOT.hoseIdMm,
          nozzleSize: input.nozzleSize ?? existing?.nozzleSize ?? DEFAULT_SNAPSHOT.nozzleSize,

          pumpPressure: input.pumpPressure ?? existing?.pumpPressure ?? DEFAULT_SNAPSHOT.pumpPressure,
          pumpPressureUnit:
            input.pumpPressureUnit ??
            existing?.pumpPressureUnit ??
            DEFAULT_SNAPSHOT.pumpPressureUnit,
          pumpFlow: input.pumpFlow ?? existing?.pumpFlow ?? DEFAULT_SNAPSHOT.pumpFlow,
          pumpFlowUnit:
            input.pumpFlowUnit ?? existing?.pumpFlowUnit ?? DEFAULT_SNAPSHOT.pumpFlowUnit,
          maxPressure: input.maxPressure ?? existing?.maxPressure ?? DEFAULT_SNAPSHOT.maxPressure,
          maxPressureUnit:
            input.maxPressureUnit ??
            existing?.maxPressureUnit ??
            DEFAULT_SNAPSHOT.maxPressureUnit,
          hoseLength: input.hoseLength ?? existing?.hoseLength ?? DEFAULT_SNAPSHOT.hoseLength,
          hoseLengthUnit:
            input.hoseLengthUnit ??
            existing?.hoseLengthUnit ??
            DEFAULT_SNAPSHOT.hoseLengthUnit,
          hoseId: input.hoseId ?? existing?.hoseId ?? DEFAULT_SNAPSHOT.hoseId,
          hoseIdUnit:
            input.hoseIdUnit ?? existing?.hoseIdUnit ?? DEFAULT_SNAPSHOT.hoseIdUnit,
          engineHp: input.engineHp ?? existing?.engineHp ?? null,
          sprayMode: input.sprayMode ?? existing?.sprayMode ?? DEFAULT_SNAPSHOT.sprayMode,
          nozzleCount: input.nozzleCount ?? existing?.nozzleCount ?? DEFAULT_SNAPSHOT.nozzleCount,
          nozzleMode: "tipSize",
          nozzleSizeText:
            input.nozzleSizeText ??
            existing?.nozzleSizeText ??
            DEFAULT_SNAPSHOT.nozzleSizeText,
          orificeMm: input.orificeMm ?? existing?.orificeMm ?? DEFAULT_SNAPSHOT.orificeMm,
          dischargeCoeffCd:
            input.dischargeCoeffCd ??
            existing?.dischargeCoeffCd ??
            DEFAULT_SNAPSHOT.dischargeCoeffCd,
          waterDensity:
            input.waterDensity ?? existing?.waterDensity ?? DEFAULT_SNAPSHOT.waterDensity,
          hoseRoughnessMm:
            input.hoseRoughnessMm ??
            existing?.hoseRoughnessMm ??
            DEFAULT_SNAPSHOT.hoseRoughnessMm,

          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
        },
        userId
      );

      setSetups((current) =>
        existing
          ? current.map((setup) => (setup.id === existing.id ? nextSetup : setup))
          : [nextSetup, ...current]
      );

      void upsertSavedSetupToSupabase(nextSetup).catch((error) => {
        console.error("Failed to save setup to Supabase", error);
        void refresh();
      });

      return nextSetup;
    },
    [refresh, setups, userId]
  );

  const deleteSetup = useCallback(
    (setupId: string) => {
      const previous = setups;
      setSetups((current) => current.filter((setup) => setup.id !== setupId));

      void deleteSavedSetupFromSupabase(setupId).catch((error) => {
        console.error("Failed to delete setup from Supabase", error);
        setSetups(previous);
      });
    },
    [setups]
  );

  const duplicateSetup = useCallback(
    (setupId: string) => {
      const source = setups.find((setup) => setup.id === setupId);

      if (!source || !userId) {
        return null;
      }

      const timestamp = new Date().toISOString();
      const copy = normalizeSavedSetup(
        {
          ...source,
          id: makeId(),
          name: `${source.name} (copy)`,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        userId
      );

      setSetups((current) => [copy, ...current]);

      void upsertSavedSetupToSupabase(copy).catch((error) => {
        console.error("Failed to duplicate setup in Supabase", error);
        void refresh();
      });

      return copy;
    },
    [refresh, setups, userId]
  );

  const getSetupById = useCallback(
    (setupId: string) => setups.find((setup) => setup.id === setupId) ?? null,
    [setups]
  );

  return useMemo(
    () => ({
      setups,
      isReady,
      saveSetup,
      deleteSetup,
      duplicateSetup,
      getSetupById,
      refresh,
    }),
    [deleteSetup, duplicateSetup, getSetupById, isReady, refresh, saveSetup, setups]
  );
}
