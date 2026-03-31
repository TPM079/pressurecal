import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProAccess } from "../hooks/useProAccess";
import {
  createSavedSetup,
  suggestSetupName,
  updateSavedSetup,
  type SavedSetupRecord,
} from "../lib/savedSetups";
import type { Inputs, SolveResult } from "../pressurecal";

type SaveCurrentSetupCardProps = {
  inputs: Inputs;
  result: SolveResult;
  currentSavedSetup: SavedSetupRecord | null;
  onSaveSuccess: (savedSetup: SavedSetupRecord) => void;
};

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function SaveCurrentSetupCard({
  inputs,
  result,
  currentSavedSetup,
  onSaveSuccess,
}: SaveCurrentSetupCardProps) {
  const { loading, isAuthenticated, isPro, userId } = useProAccess();
  const [name, setName] = useState(currentSavedSetup?.name ?? suggestSetupName(inputs));
  const [machineLabel, setMachineLabel] = useState(currentSavedSetup?.machineLabel ?? "");
  const [notes, setNotes] = useState(currentSavedSetup?.notes ?? "");
  const [busyMode, setBusyMode] = useState<"create" | "update" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(currentSavedSetup?.name ?? suggestSetupName(inputs));
    setMachineLabel(currentSavedSetup?.machineLabel ?? "");
    setNotes(currentSavedSetup?.notes ?? "");
    setError(null);
    setMessage(null);
  }, [currentSavedSetup?.id]);

  async function handleSave(mode: "create" | "update") {
    if (!userId) {
      setError("Please sign in before saving setups.");
      return;
    }

    const nextName = name.trim();

    if (!nextName) {
      setError("Please enter a setup name.");
      return;
    }

    setBusyMode(mode);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        userId,
        name: nextName,
        machineLabel: machineLabel.trim() || null,
        notes: notes.trim() || null,
        rigInputs: inputs,
      };

      const saved =
        mode === "update" && currentSavedSetup
          ? await updateSavedSetup(currentSavedSetup.id, payload)
          : await createSavedSetup(payload);

      setMessage(
        mode === "update"
          ? "Saved setup updated across your Pro library."
          : "Current rig saved to your Pro library."
      );
      onSaveSuccess(saved);
    } catch (saveError) {
      setError(toErrorMessage(saveError, "Unable to save this setup."));
    } finally {
      setBusyMode(null);
    }
  }

  if (loading) {
    return (
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <p className="text-sm text-slate-600">Checking Pro access for Saved Setups…</p>
      </section>
    );
  }

  if (!isAuthenticated || !isPro) {
    return (
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              PressureCal Pro
            </div>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Save this rig across devices</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Saved Setups is now designed as a cloud-backed Pro feature so your rigs can move with you,
              not stay trapped in one browser.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Unlock Saved Setups
            </Link>
            <Link
              to="/saved-setups"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Saved Setups
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {currentSavedSetup ? "Update this saved setup" : "Save this rig to your Pro library"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Store the full rig inputs behind this model so you can reopen the setup later, sync across devices,
            and keep building a real PressureCal library.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              {Math.round(result.gunPressurePsi)} PSI at gun
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              {result.gunFlowGpm.toFixed(2)} GPM at gun
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              {result.status === "calibrated"
                ? "Calibrated"
                : result.status === "under-calibrated"
                  ? "Under-calibrated"
                  : "Over-calibrated"}
            </span>
          </div>
        </div>

        <Link
          to="/saved-setups"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Open Saved Setups
        </Link>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">Setup name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Example: 21 LPM trailer rig"
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-800">Machine label</span>
          <input
            type="text"
            value={machineLabel}
            onChange={(event) => setMachineLabel(event.target.value)}
            placeholder="Optional: GX390 trailer rig"
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
          />
        </label>

        <label className="block lg:col-span-2">
          <span className="text-sm font-semibold text-slate-800">Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes about the reel, gun, use case, favourite combo, or operator context."
            rows={3}
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
          />
        </label>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-900">
          {message}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => void handleSave(currentSavedSetup ? "update" : "create")}
          disabled={busyMode !== null}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyMode === "update"
            ? "Updating saved setup…"
            : busyMode === "create"
              ? "Saving setup…"
              : currentSavedSetup
                ? "Update saved setup"
                : "Save setup"}
        </button>

        {currentSavedSetup ? (
          <button
            type="button"
            onClick={() => void handleSave("create")}
            disabled={busyMode !== null}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyMode === "create" ? "Saving new copy…" : "Save as new setup"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
