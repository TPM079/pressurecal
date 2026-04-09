import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BackToTopButton from "../components/BackToTopButton";
import PressureCalLayout from "../components/PressureCalLayout";
import RequirePro from "../components/RequirePro";
import { useSavedSetups } from "../hooks/useSavedSetups";
import { buildFullRigSearchParams } from "../lib/rigUrlState";
import { savedSetupToInputs } from "../lib/savedSetupToInputs";
import { supabase } from "../lib/supabase-browser";

type SetupFormState = {
  name: string;
  notes: string;
  pumpPressure: string;
  pumpPressureUnit: "psi" | "bar";
  pumpFlow: string;
  pumpFlowUnit: "lpm" | "gpm";
  maxPressure: string;
  maxPressureUnit: "psi" | "bar";
  hoseLength: string;
  hoseLengthUnit: "m" | "ft";
  hoseId: string;
  hoseIdUnit: "mm" | "in";
  engineHp: string;
  sprayMode: "wand" | "surfaceCleaner";
  nozzleCount: string;
  nozzleSizeText: string;
};

const EMPTY_FORM: SetupFormState = {
  name: "",
  notes: "",
  pumpPressure: "4000",
  pumpPressureUnit: "psi",
  pumpFlow: "15",
  pumpFlowUnit: "lpm",
  maxPressure: "4000",
  maxPressureUnit: "psi",
  hoseLength: "15",
  hoseLengthUnit: "m",
  hoseId: "9.53",
  hoseIdUnit: "mm",
  engineHp: "",
  sprayMode: "wand",
  nozzleCount: "1",
  nozzleSizeText: "040",
};

export default function SavedSetupsPage() {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedSetupId, setSelectedSetupId] = useState<string | null>(null);
  const [form, setForm] = useState<SetupFormState>(EMPTY_FORM);
  const [copiedSetupId, setCopiedSetupId] = useState<string | null>(null);

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
      pumpPressure: editingSetup.pumpPressure != null ? String(editingSetup.pumpPressure) : "",
      pumpPressureUnit: editingSetup.pumpPressureUnit,
      pumpFlow: editingSetup.pumpFlow != null ? String(editingSetup.pumpFlow) : "",
      pumpFlowUnit: editingSetup.pumpFlowUnit,
      maxPressure: editingSetup.maxPressure != null ? String(editingSetup.maxPressure) : "",
      maxPressureUnit: editingSetup.maxPressureUnit,
      hoseLength: editingSetup.hoseLength != null ? String(editingSetup.hoseLength) : "",
      hoseLengthUnit: editingSetup.hoseLengthUnit,
      hoseId: editingSetup.hoseId != null ? String(editingSetup.hoseId) : "",
      hoseIdUnit: editingSetup.hoseIdUnit,
      engineHp: editingSetup.engineHp != null ? String(editingSetup.engineHp) : "",
      sprayMode: editingSetup.sprayMode,
      nozzleCount: String(editingSetup.nozzleCount),
      nozzleSizeText: editingSetup.nozzleSizeText ?? "",
    });
  }, [editingSetup]);

  function updateField<K extends keyof SetupFormState>(field: K, value: SetupFormState[K]) {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "pumpPressure" && current.maxPressure === current.pumpPressure) {
        next.maxPressure = value as string;
      }

      if (field === "pumpPressureUnit" && current.maxPressureUnit === current.pumpPressureUnit) {
        next.maxPressureUnit = value as "psi" | "bar";
      }

      if (field === "sprayMode" && value === "wand") {
        next.nozzleCount = "1";
      }

      if (field === "sprayMode" && value === "surfaceCleaner" && Number(next.nozzleCount) < 2) {
        next.nozzleCount = "2";
      }

      return next;
    });
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

    const hoseLength = toNumberOrNull(form.hoseLength);
    const hoseId = toNumberOrNull(form.hoseId);
    const pumpPressure = toNumberOrNull(form.pumpPressure);
    const pumpFlow = toNumberOrNull(form.pumpFlow);
    const nozzleSizeText = form.nozzleSizeText.trim() || null;

    const saved = saveSetup({
      id: selectedSetupId ?? undefined,
      name,
      notes: form.notes.trim() || null,

      machinePsi: form.pumpPressureUnit === "psi" ? pumpPressure : null,
      machineLpm: form.pumpFlowUnit === "lpm" ? pumpFlow : null,
      hoseLengthM: form.hoseLengthUnit === "m" ? hoseLength : null,
      hoseIdMm: form.hoseIdUnit === "mm" ? hoseId : null,
      nozzleSize: nozzleSizeText,

      pumpPressure,
      pumpPressureUnit: form.pumpPressureUnit,
      pumpFlow,
      pumpFlowUnit: form.pumpFlowUnit,
      maxPressure: toNumberOrNull(form.maxPressure),
      maxPressureUnit: form.maxPressureUnit,
      hoseLength,
      hoseLengthUnit: form.hoseLengthUnit,
      hoseId,
      hoseIdUnit: form.hoseIdUnit,
      engineHp: toNumberOrNull(form.engineHp),
      sprayMode: form.sprayMode,
      nozzleCount: Math.max(
        form.sprayMode === "surfaceCleaner" ? 2 : 1,
        Number(form.nozzleCount || "1")
      ),
      nozzleSizeText,
      orificeMm: 1.2,
      dischargeCoeffCd: 0.62,
      waterDensity: 1000,
      hoseRoughnessMm: 0.0015,
    });

    setSelectedSetupId(saved.id);
  }

  function handleEdit(setupId: string) {
    setSelectedSetupId(setupId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openInCalculatorHref(setupId: string) {
    const setup = getSetupById(setupId);

    if (!setup) {
      return "/calculator";
    }

    const params = buildFullRigSearchParams(savedSetupToInputs(setup));
    const search = params.toString();

    return search ? `/calculator?${search}` : "/calculator";
  }

  function compareHref(setupId: string) {
    const alternate = setups.find((setup) => setup.id !== setupId);
    const search = new URLSearchParams();

    search.set("a", setupId);

    if (alternate) {
      search.set("b", alternate.id);
    }

    return `/compare-setups?${search.toString()}`;
  }

  async function copyShareLink(setupId: string) {
    const setup = getSetupById(setupId);

    if (!setup) {
      return;
    }

    const params = buildFullRigSearchParams(savedSetupToInputs(setup));
    const search = params.toString();
    const url = `${window.location.origin}/calculator${search ? `?${search}` : ""}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedSetupId(setupId);
      window.setTimeout(() => {
        setCopiedSetupId((current) => (current === setupId ? null : current));
      }, 1800);
    } catch {
      window.prompt("Copy this setup link:", url);
    }
  }

  return (
    <PressureCalLayout>
      <Helmet>
        <title>Saved Setups | PressureCal Pro</title>
        <meta
          name="description"
          content="Save, organise, and reuse the setups you trust with PressureCal Pro."
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
              Save your pressure, flow, hose, engine, nozzle, and spray-mode assumptions in one place so you can reopen, compare, and reuse setups without re-entering everything.
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
                  Saved Setups are linked to your PressureCal account. Sign in to access your saved setups and Pro tools.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/account"
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/pro"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    View PressureCal Pro
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
                  Upgrade to PressureCal Pro to save full setups and compare them accurately.
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
                      {selectedSetupId ? "Edit saved setup" : "Create saved setup"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Engine HP is optional. Leave it blank if you do not want engine-load checks.
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
                      placeholder="Example: 21 LPM trailer setup"
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">Pump pressure</span>
                    <div className="mt-2 flex gap-3">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={form.pumpPressure}
                        onChange={(event) => updateField("pumpPressure", event.target.value)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                      />
                      <select
                        value={form.pumpPressureUnit}
                        onChange={(event) =>
                          updateField("pumpPressureUnit", event.target.value as "psi" | "bar")
                        }
                        className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                      >
                        <option value="psi">PSI</option>
                        <option value="bar">BAR</option>
                      </select>
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">Pump flow</span>
                    <div className="mt-2 flex gap-3">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={form.pumpFlow}
                        onChange={(event) => updateField("pumpFlow", event.target.value)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                      />
                      <select
                        value={form.pumpFlowUnit}
                        onChange={(event) =>
                          updateField("pumpFlowUnit", event.target.value as "lpm" | "gpm")
                        }
                        className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                      >
                        <option value="lpm">LPM</option>
                        <option value="gpm">GPM</option>
                      </select>
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">Max pressure (unloader)</span>
                    <div className="mt-2 flex gap-3">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={form.maxPressure}
                        onChange={(event) => updateField("maxPressure", event.target.value)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                      />
                      <select
                        value={form.maxPressureUnit}
                        onChange={(event) =>
                          updateField("maxPressureUnit", event.target.value as "psi" | "bar")
                        }
                        className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                      >
                        <option value="psi">PSI</option>
                        <option value="bar">BAR</option>
                      </select>
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">Engine HP</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={form.engineHp}
                      onChange={(event) => updateField("engineHp", event.target.value)}
                      placeholder="Optional"
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">Hose length</span>
                    <div className="mt-2 flex gap-3">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={form.hoseLength}
                        onChange={(event) => updateField("hoseLength", event.target.value)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                      />
                      <select
                        value={form.hoseLengthUnit}
                        onChange={(event) =>
                          updateField("hoseLengthUnit", event.target.value as "m" | "ft")
                        }
                        className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                      >
                        <option value="m">m</option>
                        <option value="ft">ft</option>
                      </select>
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">Hose ID</span>
                    <div className="mt-2 flex gap-3">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={form.hoseId}
                        onChange={(event) => updateField("hoseId", event.target.value)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                      />
                      <select
                        value={form.hoseIdUnit}
                        onChange={(event) =>
                          updateField("hoseIdUnit", event.target.value as "mm" | "in")
                        }
                        className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                      >
                        <option value="mm">mm</option>
                        <option value="in">in</option>
                      </select>
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">Spray mode</span>
                    <select
                      value={form.sprayMode}
                      onChange={(event) =>
                        updateField("sprayMode", event.target.value as "wand" | "surfaceCleaner")
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    >
                      <option value="wand">Wand</option>
                      <option value="surfaceCleaner">Surface cleaner</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">Nozzle count</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={form.sprayMode === "surfaceCleaner" ? 2 : 1}
                      value={form.nozzleCount}
                      onChange={(event) => updateField("nozzleCount", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-sm font-semibold text-slate-800">Nozzle size</span>
                    <input
                      type="text"
                      value={form.nozzleSizeText}
                      onChange={(event) => updateField("nozzleSizeText", event.target.value)}
                      placeholder="Example: 040"
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

                  {setups.length >= 2 ? (
                    <Link
                      to={`/compare-setups?a=${setups[0].id}&b=${setups[1].id}`}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Compare setups
                    </Link>
                  ) : null}
                </div>

                {!isReady ? (
                  <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                    Loading saved setups...
                  </div>
                ) : setups.length === 0 ? (
                  <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                    <p className="text-sm font-semibold text-slate-900">No saved setups yet</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Create your first saved setup on the left to start building your Pro library.
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
                            <Link
                              to={openInCalculatorHref(setup.id)}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Open in calculator
                            </Link>
                            <button
                              type="button"
                              onClick={() => copyShareLink(setup.id)}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              {copiedSetupId === setup.id ? "Copied ✓" : "Copy setup link"}
                            </button>
                            <Link
                              to={compareHref(setup.id)}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Compare
                            </Link>
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
                                const confirmed = window.confirm(`Delete "${setup.name}"?`);
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
                            <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Pump</dt>
                            <dd className="mt-1">
                              {setup.pumpPressure ?? "—"} {setup.pumpPressureUnit.toUpperCase()} · {setup.pumpFlow ?? "—"} {setup.pumpFlowUnit.toUpperCase()}
                            </dd>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Hose</dt>
                            <dd className="mt-1">
                              {setup.hoseLength ?? "—"} {setup.hoseLengthUnit} · {setup.hoseId ?? "—"} {setup.hoseIdUnit}
                            </dd>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Engine</dt>
                            <dd className="mt-1">{setup.engineHp ?? "Not provided"}</dd>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Spray</dt>
                            <dd className="mt-1">
                              {setup.sprayMode === "surfaceCleaner" ? "Surface cleaner" : "Wand"} · {setup.nozzleCount} nozzle{setup.nozzleCount === 1 ? "" : "s"}
                            </dd>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-3 sm:col-span-2">
                            <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Nozzle</dt>
                            <dd className="mt-1">{setup.nozzleSizeText ?? "—"}</dd>
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
