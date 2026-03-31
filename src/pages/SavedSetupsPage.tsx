import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BackToTopButton from "../components/BackToTopButton";
import PressureCalLayout from "../components/PressureCalLayout";
import RequirePro from "../components/RequirePro";
import { useProAccess } from "../hooks/useProAccess";
import { useSavedSetups } from "../hooks/useSavedSetups";
import { buildSavedSetupHref } from "../lib/savedSetups";

type MetadataFormState = {
  name: string;
  machineLabel: string;
  notes: string;
};

const EMPTY_FORM: MetadataFormState = {
  name: "",
  machineLabel: "",
  notes: "",
};

function statusBadgeClass(status: string, isPressureLimited: boolean) {
  if (isPressureLimited) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (status === "calibrated") {
    return "border-green-200 bg-green-50 text-green-800";
  }

  if (status === "under-calibrated") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-red-200 bg-red-50 text-red-800";
}

function statusBadgeText(status: string, isPressureLimited: boolean) {
  if (isPressureLimited) {
    return "Bypass active";
  }

  if (status === "calibrated") {
    return "Calibrated";
  }

  if (status === "under-calibrated") {
    return "Under-calibrated";
  }

  return "Over-calibrated";
}

export default function SavedSetupsPage() {
  const { userId } = useProAccess();
  const {
    setups,
    isLoading,
    isMutating,
    error,
    refresh,
    saveSetup,
    deleteSetup,
    duplicateSetup,
    getSetupById,
  } = useSavedSetups(userId);
  const [selectedSetupId, setSelectedSetupId] = useState<string | null>(null);
  const [form, setForm] = useState<MetadataFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const selectedSetup = useMemo(() => {
    return selectedSetupId ? getSetupById(selectedSetupId) : null;
  }, [getSetupById, selectedSetupId]);

  useEffect(() => {
    if (setups.length === 0) {
      setSelectedSetupId(null);
      return;
    }

    if (!selectedSetupId || !getSetupById(selectedSetupId)) {
      setSelectedSetupId(setups[0].id);
    }
  }, [getSetupById, selectedSetupId, setups]);

  useEffect(() => {
    if (!selectedSetup) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      name: selectedSetup.name,
      machineLabel: selectedSetup.machineLabel ?? "",
      notes: selectedSetup.notes ?? "",
    });
    setFormError(null);
    setFormMessage(null);
  }, [selectedSetup?.id]);

  function updateField<K extends keyof MetadataFormState>(field: K, value: MetadataFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleMetadataSave() {
    if (!selectedSetup) {
      return;
    }

    const nextName = form.name.trim();

    if (!nextName) {
      setFormError("Please enter a setup name.");
      setFormMessage(null);
      return;
    }

    setFormError(null);
    setFormMessage(null);

    try {
      await saveSetup({
        id: selectedSetup.id,
        name: nextName,
        machineLabel: form.machineLabel.trim() || null,
        notes: form.notes.trim() || null,
        rigInputs: selectedSetup.rigInputs,
      });
      setFormMessage("Saved setup details updated.");
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : "Unable to update this setup.");
    }
  }

  async function handleDuplicate(setupId: string) {
    try {
      const duplicate = await duplicateSetup(setupId);
      setSelectedSetupId(duplicate.id);
    } catch (duplicateError) {
      setFormError(
        duplicateError instanceof Error
          ? duplicateError.message
          : "Unable to duplicate this setup."
      );
    }
  }

  async function handleDelete(setupId: string) {
    const setup = getSetupById(setupId);

    if (!setup) {
      return;
    }

    const confirmed = window.confirm(`Delete "${setup.name}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteSetup(setupId);
      if (selectedSetupId === setupId) {
        setSelectedSetupId(null);
      }
    } catch (deleteError) {
      setFormError(deleteError instanceof Error ? deleteError.message : "Unable to delete this setup.");
    }
  }

  return (
    <PressureCalLayout>
      <Helmet>
        <title>Saved Setups | PressureCal Pro</title>
        <meta
          name="description"
          content="Manage your PressureCal Pro saved setups, reopen full rigs, and keep your favourite configurations synced across devices."
        />
      </Helmet>

      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              PressureCal Pro
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Saved Setups
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Build your rig in the calculator, then manage your saved library here. Each saved setup now stores the full rig inputs so it can be reopened properly across devices.
            </p>
          </div>
        </div>
      </section>

      <RequirePro
        signedOutFallback={
          <section className="bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-16">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-950">Sign in to use Saved Setups</h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Saved Setups are linked to your PressureCal account, so you need to be signed in first.
                </p>
                <div className="mt-6">
                  <Link
                    to="/pricing"
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Back to PressureCal Pro
                  </Link>
                </div>
              </div>
            </div>
          </section>
        }
        nonProFallback={
          <section className="bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-16">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-950">Saved Setups is a Pro feature</h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Upgrade to PressureCal Pro to save full rigs to the cloud, reopen them later, and build a real setup library.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/pricing"
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    View PressureCal Pro plans
                  </Link>
                  <Link
                    to="/calculator"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Use the free calculator
                  </Link>
                </div>
              </div>
            </div>
          </section>
        }
      >
        <section className="bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
            {error ? (
              <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-5 text-sm text-amber-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">We could not load your saved setups</p>
                    <p className="mt-1 leading-6">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refresh()}
                    className="inline-flex items-center justify-center rounded-2xl border border-amber-300 bg-white px-5 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950">
                      {selectedSetup ? "Setup details" : "Build and save from the calculator"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {selectedSetup
                        ? "Edit the saved setup name, machine label, and notes here. To change the rig itself, open it in the calculator and update it there."
                        : "Saved Setups now works as a real Pro library. Create new entries from the full rig calculator so the whole model is preserved."}
                    </p>
                  </div>

                  <Link
                    to="/calculator"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Open calculator
                  </Link>
                </div>

                {!selectedSetup ? (
                  <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
                    <p className="text-sm font-semibold text-slate-900">No saved setup selected</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Use the full rig calculator to save a complete setup, then come back here to organise your library.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mt-8 grid gap-5 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="text-sm font-semibold text-slate-800">Setup name</span>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(event) => updateField("name", event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                        />
                      </label>

                      <label className="block sm:col-span-2">
                        <span className="text-sm font-semibold text-slate-800">Machine label</span>
                        <input
                          type="text"
                          value={form.machineLabel}
                          onChange={(event) => updateField("machineLabel", event.target.value)}
                          placeholder="Optional: trailer rig, GX390 skid, van unit, favourite reel setup"
                          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                        />
                      </label>

                      <label className="block sm:col-span-2">
                        <span className="text-sm font-semibold text-slate-800">Notes</span>
                        <textarea
                          value={form.notes}
                          onChange={(event) => updateField("notes", event.target.value)}
                          rows={5}
                          placeholder="Use notes for gun choice, reel notes, favourite nozzle combo, job type, operator reminders, or anything else worth remembering."
                          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                        />
                      </label>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        to={buildSavedSetupHref(selectedSetup.id)}
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Open in calculator
                      </Link>

                      <button
                        type="button"
                        onClick={() => void handleMetadataSave()}
                        disabled={isMutating}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isMutating ? "Saving…" : "Save details"}
                      </button>
                    </div>

                    {formError ? (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                        {formError}
                      </div>
                    ) : null}

                    {formMessage ? (
                      <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-900">
                        {formMessage}
                      </div>
                    ) : null}

                    <div className="mt-8 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Pressure</dt>
                        <dd className="mt-1 font-medium text-slate-900">{selectedSetup.summary.pressureText}</dd>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Flow</dt>
                        <dd className="mt-1 font-medium text-slate-900">{selectedSetup.summary.flowText}</dd>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Hose</dt>
                        <dd className="mt-1 font-medium text-slate-900">{selectedSetup.summary.hoseText}</dd>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Nozzle</dt>
                        <dd className="mt-1 font-medium text-slate-900">{selectedSetup.summary.nozzleText}</dd>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950">Your saved setups</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {setups.length} {setups.length === 1 ? "setup" : "setups"} saved
                    </p>
                  </div>
                </div>

                {isLoading ? (
                  <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                    Loading saved setups...
                  </div>
                ) : setups.length === 0 ? (
                  <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                    <p className="text-sm font-semibold text-slate-900">No saved setups yet</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Open the full rig calculator, model a machine, and save your first setup to start building your Pro library.
                    </p>
                    <Link
                      to="/calculator"
                      className="mt-5 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Open full rig calculator
                    </Link>
                  </div>
                ) : (
                  <div className="mt-8 space-y-4">
                    {setups.map((setup) => {
                      const isSelected = selectedSetupId === setup.id;

                      return (
                        <article
                          key={setup.id}
                          className={`rounded-2xl border p-5 transition ${
                            isSelected
                              ? "border-slate-950 bg-slate-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold text-slate-950">{setup.name}</h3>
                                <span
                                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                                    setup.summary.status,
                                    setup.summary.isPressureLimited
                                  )}`}
                                >
                                  {statusBadgeText(setup.summary.status, setup.summary.isPressureLimited)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs uppercase tracking-[0.15em] text-slate-400">
                                Updated {new Date(setup.updatedAt).toLocaleString()}
                              </p>
                              {setup.machineLabel ? (
                                <p className="mt-2 text-sm font-medium text-slate-700">{setup.machineLabel}</p>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Link
                                to={buildSavedSetupHref(setup.id)}
                                className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                              >
                                Open
                              </Link>
                              <button
                                type="button"
                                onClick={() => setSelectedSetupId(setup.id)}
                                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                Details
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDuplicate(setup.id)}
                                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                Duplicate
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(setup.id)}
                                className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50 px-4 py-3">
                              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Machine</dt>
                              <dd className="mt-1 font-medium text-slate-900">
                                {setup.summary.pressureText} · {setup.summary.flowText}
                              </dd>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3">
                              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Hose</dt>
                              <dd className="mt-1 font-medium text-slate-900">{setup.summary.hoseText}</dd>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3">
                              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Nozzle</dt>
                              <dd className="mt-1 font-medium text-slate-900">{setup.summary.nozzleText}</dd>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3">
                              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">At gun</dt>
                              <dd className="mt-1 font-medium text-slate-900">
                                {Math.round(setup.summary.gunPressurePsi)} PSI · {setup.summary.gunFlowGpm.toFixed(2)} GPM
                              </dd>
                            </div>
                          </dl>

                          {setup.notes ? (
                            <p className="mt-4 text-sm leading-6 text-slate-600">{setup.notes}</p>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </RequirePro>

      <BackToTopButton />
    </PressureCalLayout>
  );
}
