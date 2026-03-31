import { supabase } from "./supabase-browser";
import { barFromPsi, lpmFromGpm, solvePressureCal } from "../pressurecal";
import type { Inputs, SolveResult } from "../pressurecal";

export const SAVED_SETUP_SCHEMA_VERSION = 1;

export type SavedSetupResultSnapshot = Pick<
  SolveResult,
  | "pumpPressurePsi"
  | "requiredPumpPsi"
  | "requiredGunPsi"
  | "gunPressurePsi"
  | "gunFlowGpm"
  | "hoseLossPsi"
  | "hoseLossPct"
  | "isPressureLimited"
  | "bypassFlowGpm"
  | "bypassPct"
  | "selectedNozzleQ4000Gpm"
  | "selectedTipCode"
  | "selectedOrificeMm"
  | "calibratedNozzleQ4000Gpm"
  | "calibratedTipCode"
  | "ratedPQ"
  | "ratedClass"
  | "gunPQ"
  | "gunClass"
  | "status"
  | "statusMessage"
>;

export type SavedSetupSummary = {
  pressureText: string;
  flowText: string;
  hoseText: string;
  nozzleText: string;
  engineText: string;
  sprayMode: Inputs["sprayMode"];
  status: SolveResult["status"];
  statusMessage: string;
  isPressureLimited: boolean;
  gunPressurePsi: number;
  gunPressureBar: number;
  gunFlowGpm: number;
  gunFlowLpm: number;
  hoseLossPsi: number;
  hoseLossBar: number;
  bypassPct: number;
};

export type SavedSetupRecord = {
  id: string;
  userId: string;
  name: string;
  notes: string | null;
  machineLabel: string | null;
  schemaVersion: number;
  rigInputs: Inputs;
  resultSnapshot: SavedSetupResultSnapshot | null;
  summary: SavedSetupSummary;
  createdAt: string;
  updatedAt: string;
};

type SavedSetupRow = {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  machine_label: string | null;
  schema_version: number;
  rig_inputs: Inputs;
  result_snapshot: SavedSetupResultSnapshot | null;
  summary: SavedSetupSummary | null;
  created_at: string;
  updated_at: string;
};

export type SaveSavedSetupInput = {
  name: string;
  notes?: string | null;
  machineLabel?: string | null;
  rigInputs: Inputs;
};

export type SaveSavedSetupWithUserInput = SaveSavedSetupInput & {
  userId: string;
};

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function cloneInputs(inputs: Inputs): Inputs {
  return JSON.parse(JSON.stringify(inputs)) as Inputs;
}

function trimToNull(value: string | null | undefined) {
  const next = value?.trim() ?? "";
  return next ? next : null;
}

function formatScalar(value: number | "", unit: string, decimals = 0) {
  if (value === "" || !Number.isFinite(Number(value))) {
    return `— ${unit}`;
  }

  return `${Number(value).toFixed(decimals)} ${unit}`;
}

function getNozzleText(inputs: Inputs) {
  if (inputs.nozzleMode === "orificeMm") {
    return `${Number(inputs.orificeMm || 0).toFixed(2)} mm orifice`;
  }

  const tip = inputs.nozzleSizeText?.trim() || "—";

  if (inputs.sprayMode === "surfaceCleaner") {
    return `${tip} × ${Math.max(2, Number(inputs.nozzleCount || 2))}`;
  }

  return tip;
}

function buildResultSnapshot(result: SolveResult): SavedSetupResultSnapshot {
  return {
    pumpPressurePsi: result.pumpPressurePsi,
    requiredPumpPsi: result.requiredPumpPsi,
    requiredGunPsi: result.requiredGunPsi,
    gunPressurePsi: result.gunPressurePsi,
    gunFlowGpm: result.gunFlowGpm,
    hoseLossPsi: result.hoseLossPsi,
    hoseLossPct: result.hoseLossPct,
    isPressureLimited: result.isPressureLimited,
    bypassFlowGpm: result.bypassFlowGpm,
    bypassPct: result.bypassPct,
    selectedNozzleQ4000Gpm: result.selectedNozzleQ4000Gpm,
    selectedTipCode: result.selectedTipCode,
    selectedOrificeMm: result.selectedOrificeMm,
    calibratedNozzleQ4000Gpm: result.calibratedNozzleQ4000Gpm,
    calibratedTipCode: result.calibratedTipCode,
    ratedPQ: result.ratedPQ,
    ratedClass: result.ratedClass,
    gunPQ: result.gunPQ,
    gunClass: result.gunClass,
    status: result.status,
    statusMessage: result.statusMessage,
  };
}

export function buildSavedSetupSummary(
  inputs: Inputs,
  result: SolveResult = solvePressureCal(cloneInputs(inputs))
): SavedSetupSummary {
  return {
    pressureText: formatScalar(inputs.pumpPressure, inputs.pumpPressureUnit.toUpperCase(), inputs.pumpPressureUnit === "psi" ? 0 : 1),
    flowText: formatScalar(inputs.pumpFlow, inputs.pumpFlowUnit.toUpperCase(), inputs.pumpFlowUnit === "gpm" ? 2 : 1),
    hoseText: `${formatScalar(inputs.hoseLength, inputs.hoseLengthUnit, inputs.hoseLengthUnit === "ft" ? 0 : 1)} · ${formatScalar(inputs.hoseId, inputs.hoseIdUnit, inputs.hoseIdUnit === "in" ? 2 : 1)}`,
    nozzleText: getNozzleText(inputs),
    engineText: formatScalar(inputs.engineHp, "HP", 1),
    sprayMode: inputs.sprayMode,
    status: result.status,
    statusMessage: result.statusMessage,
    isPressureLimited: result.isPressureLimited,
    gunPressurePsi: result.gunPressurePsi,
    gunPressureBar: barFromPsi(result.gunPressurePsi),
    gunFlowGpm: result.gunFlowGpm,
    gunFlowLpm: lpmFromGpm(result.gunFlowGpm),
    hoseLossPsi: result.hoseLossPsi,
    hoseLossBar: barFromPsi(result.hoseLossPsi),
    bypassPct: result.bypassPct,
  };
}

export function suggestSetupName(inputs: Inputs) {
  const pressureText = inputs.pumpPressure === "" ? "Setup" : `${Number(inputs.pumpPressure || 0).toFixed(inputs.pumpPressureUnit === "psi" ? 0 : 1)} ${inputs.pumpPressureUnit.toUpperCase()}`;
  const flowText = inputs.pumpFlow === "" ? "" : ` / ${Number(inputs.pumpFlow || 0).toFixed(inputs.pumpFlowUnit === "gpm" ? 2 : 1)} ${inputs.pumpFlowUnit.toUpperCase()}`;
  const modeText = inputs.sprayMode === "surfaceCleaner" ? " surface cleaner" : " wand";
  return `${pressureText}${flowText}${modeText}`.trim();
}

export function buildSavedSetupHref(setupId: string) {
  return `/calculator?savedSetup=${encodeURIComponent(setupId)}`;
}

function mapSavedSetupRow(row: SavedSetupRow): SavedSetupRecord {
  const rigInputs = cloneInputs(row.rig_inputs);
  const resultSnapshot = row.result_snapshot;
  const summary = row.summary ?? buildSavedSetupSummary(rigInputs);

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    notes: row.notes,
    machineLabel: row.machine_label,
    schemaVersion: row.schema_version,
    rigInputs,
    resultSnapshot,
    summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildSavedSetupWriteRow(input: SaveSavedSetupWithUserInput) {
  const rigInputs = cloneInputs(input.rigInputs);
  const result = solvePressureCal(rigInputs);

  return {
    user_id: input.userId,
    name: input.name.trim(),
    notes: trimToNull(input.notes),
    machine_label: trimToNull(input.machineLabel),
    schema_version: SAVED_SETUP_SCHEMA_VERSION,
    rig_inputs: rigInputs,
    result_snapshot: buildResultSnapshot(result),
    summary: buildSavedSetupSummary(rigInputs, result),
  };
}

export async function listSavedSetups(userId: string): Promise<SavedSetupRecord[]> {
  const { data, error } = await supabase
    .from("saved_setups")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(toErrorMessage(error, "Unable to load saved setups."));
  }

  return (data ?? []).map((row) => mapSavedSetupRow(row as SavedSetupRow));
}

export async function getSavedSetupById(setupId: string): Promise<SavedSetupRecord | null> {
  const { data, error } = await supabase
    .from("saved_setups")
    .select("*")
    .eq("id", setupId)
    .maybeSingle();

  if (error) {
    throw new Error(toErrorMessage(error, "Unable to load the saved setup."));
  }

  if (!data) {
    return null;
  }

  return mapSavedSetupRow(data as SavedSetupRow);
}

export async function createSavedSetup(
  input: SaveSavedSetupWithUserInput
): Promise<SavedSetupRecord> {
  const row = buildSavedSetupWriteRow(input);

  const { data, error } = await supabase
    .from("saved_setups")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage(error, "Unable to save this setup."));
  }

  return mapSavedSetupRow(data as SavedSetupRow);
}

export async function updateSavedSetup(
  setupId: string,
  input: SaveSavedSetupWithUserInput
): Promise<SavedSetupRecord> {
  const row = buildSavedSetupWriteRow(input);

  const { data, error } = await supabase
    .from("saved_setups")
    .update(row)
    .eq("id", setupId)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage(error, "Unable to update this saved setup."));
  }

  return mapSavedSetupRow(data as SavedSetupRow);
}

export async function deleteSavedSetup(setupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("saved_setups")
    .delete()
    .eq("id", setupId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(toErrorMessage(error, "Unable to delete this saved setup."));
  }
}

export async function duplicateSavedSetup(
  setupId: string,
  userId: string
): Promise<SavedSetupRecord> {
  const source = await getSavedSetupById(setupId);

  if (!source) {
    throw new Error("The saved setup could not be found.");
  }

  return createSavedSetup({
    userId,
    name: source.name.endsWith("(copy)") ? `${source.name} 2` : `${source.name} (copy)`,
    notes: source.notes,
    machineLabel: source.machineLabel,
    rigInputs: source.rigInputs,
  });
}
