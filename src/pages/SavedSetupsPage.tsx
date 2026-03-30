import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PressureCalLayout from "../components/PressureCalLayout";
import BackToTopButton from "../components/BackToTopButton";
import RequirePro from "../components/RequirePro";
import { supabase } from "../lib/supabase-browser";
import { useSavedSetups } from "../hooks/useSavedSetups";

type SetupFormState = {
  name: string;
  notes: string;
  machinePsi: string;
  machineLpm: string;
  hoseLengthM: string;
  hoseIdMm: string;
  nozzleSize: string;
};

const EMPTY_FORM: SetupFormState = {
  name: "",
  notes: "",
  machinePsi: "",
  machineLpm: "",
  hoseLengthM: "",
  hoseIdMm: "",
  nozzleSize: "",
};

export default function SavedSetupsPage() {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedSetupId, setSelectedSetupId] = useState<string | null>(null);
  const [form, setForm] = useState<SetupFormState>(EMPTY_FORM);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (error) {
        console.error(error);
        setAuthUserId(null);
      } else {
        setAuthUserId(data.user?.id ?? null);
      }

      setAuthLoading(false);
    }

    void loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  const {
    setups,
    isReady,
    saveSetup,
    deleteSetup,
    duplicateSetup,
    getSetupById,
  } = useSavedSetups(authUserId);

  const editingSetup = useMemo(() => {
    return selectedSetupId ? getSetupById(selectedSetupId) : null;
  }, [getSetupById, selectedSetupId]);

  useEffect(() => {
    if (!editingSetup) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      name: editingSetup.name,
      notes: editingSetup.notes ?? "",
      machinePsi: editingSetup.machinePsi ? String(editingSetup.machinePsi) : "",
      machineLpm: editingSetup.machineLpm ? String(editingSetup.machineLpm) : "",
      hoseLengthM: editingSetup.hoseLengthM ? String(editingSetup.hoseLengthM) : "",
      hoseIdMm: editingSetup.hoseIdMm ? String(editingSetup.hoseIdMm) : "",
      nozzleSize: editingSetup.nozzleSize ?? "",
    });
  }, [editingSetup]);

  function updateField<K extends keyof SetupFormState>(field: K, value: SetupFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setSelectedSetupId(null);
    setForm(EMPTY_FORM);
  }

  function toNumberOrNull(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function handleSave() {
    if (!authUserId) {
      window.alert("Please sign in before saving setups.");
      return;
    }

    const name = form.name.trim();

    if (!name) {
      window.alert("Please enter a setup name.");
      return;
    }

    const saved = saveSetup({
      id: selectedSetupId ?? undefined,
      name,
      notes: form.notes.trim() || null,
      machinePsi: toNumberOrNull(form.machinePsi),
      machineLpm: toNumberOrNull(form.machineLpm),
      hoseLengthM: toNumberOrNull(form.hoseLengthM),
      hoseIdMm: toNumberOrNull(form.hoseIdMm),
      nozzleSize: form.nozzleSize.trim() || null,
    });

    setSelectedSetupId(saved.id);
  }

  function handleEdit(setupId: string) {
    setSelectedSetupId(setupId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <PressureCalLayout>
      <Helmet>
        <title>Saved Setups | PressureCal Pro</title>
        <meta
          name="description"
          content="Save, organise, and reuse your common machine and nozzle setups with PressureCal Pro."
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
              Save your common machine and hose setups so you can come back to them
              quickly instead of rebuilding them from scratch every time.
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
                    to="/pro"
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
                  Your billing foundation is ready, and this page is the first real Pro-only area.
                  Upgrade to PressureCal Pro to unlock saved setups.
                </p>
                <div className="mt-6">
                  <Link
                    to="/pro"
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    View PressureCal Pro plans
                  </Link>
                </div>
              </div>
            </div>
          </section>
        }
      >
        <section className="bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950">
                      {selectedSetupId ? "Edit setup" : "Create a saved setup"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      This starter version stores setups per signed-in user in the browser so you can prove the Pro flow before wiring in cloud sync.
                    </p>
                  </div>

                  {selectedSetupId ? (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      New setup
                    </button>
                  ) : null}
                </div>

                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-semibold text-slate-800">Setup name</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      placeholder="Example: 21 LPM trailer rig"
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">Machine PSI</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={form.machinePsi}
                      onChange={(event) => updateField("machinePsi", event.target.value)}
                      placeholder="4000"
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">Machine LPM</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={form.machineLpm}
                      onChange={(event) => updateField("machineLpm", event.target.value)}
                      placeholder="15"
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">Hose length (m)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={form.hoseLengthM}
                      onChange={(event) => updateField("hoseLengthM", event.target.value)}
                      placeholder="30"
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">Hose ID (mm)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={form.hoseIdMm}
                      onChange={(event) => updateField("hoseIdMm", event.target.value)}
                      placeholder="8"
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-sm font-semibold text-slate-800">Nozzle size</span>
                    <input
                      type="text"
                      value={form.nozzleSize}
                      onChange={(event) => updateField("nozzleSize", event.target.value)}
                      placeholder="Example: 045"
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-sm font-semibold text-slate-800">Notes</span>
                    <textarea
                      value={form.notes}
                      onChange={(event) => updateField("notes", event.target.value)}
                      placeholder="Pump, reel, gun, use case, favourite combo, or anything else you want to remember."
                      rows={4}
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    />
                  </label>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={authLoading || !isReady}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {selectedSetupId ? "Update saved setup" : "Save setup"}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Clear form
                  </button>
                </div>
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

                {!isReady ? (
                  <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                    Loading saved setups...
                  </div>
                ) : setups.length === 0 ? (
                  <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                    <p className="text-sm font-semibold text-slate-900">No saved setups yet</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Create your first setup on the left to start building your Pro library.
                    </p>
                  </div>
                ) : (
                  <div className="mt-8 space-y-4">
                    {setups.map((setup) => (
                      <article key={setup.id} className="rounded-2xl border border-slate-200 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-950">{setup.name}</h3>
                            <p className="mt-1 text-xs uppercase tracking-[0.15em] text-slate-400">
                              Updated {new Date(setup.updatedAt).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(setup.id)}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicateSetup(setup.id)}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Duplicate
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const confirmed = window.confirm(`Delete \"${setup.name}\"?`);
                                if (confirmed) {
                                  deleteSetup(setup.id);
                                  if (selectedSetupId === setup.id) {
                                    resetForm();
                                  }
                                }
                              }}
                              className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Machine</dt>
                            <dd className="mt-1">{setup.machinePsi ?? "—"} PSI · {setup.machineLpm ?? "—"} LPM</dd>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Hose</dt>
                            <dd className="mt-1">{setup.hoseLengthM ?? "—"} m · {setup.hoseIdMm ?? "—"} mm</dd>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-3 sm:col-span-2">
                            <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Nozzle</dt>
                            <dd className="mt-1">{setup.nozzleSize ?? "—"}</dd>
                          </div>
                        </dl>

                        {setup.notes ? (
                          <p className="mt-4 text-sm leading-6 text-slate-600">{setup.notes}</p>
                        ) : null}
                      </article>
                    ))}
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
