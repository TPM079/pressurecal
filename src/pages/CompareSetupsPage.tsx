import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import BackToTopButton from "../components/BackToTopButton";
import PressureCalLayout from "../components/PressureCalLayout";
import RequirePro from "../components/RequirePro";
import { useSavedSetups } from "../hooks/useSavedSetups";
import { compareCurrentInputs, compareSavedSetup, type ComparedSetup } from "../lib/compareSetups";
import { buildFullRigSearchParams, parseRigSearchParams } from "../lib/rigUrlState";
import { savedSetupToInputs } from "../lib/savedSetupToInputs";
import { supabase } from "../lib/supabase-browser";
import type { Inputs } from "../pressurecal";

function fmt(value: number, decimals: number) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(decimals);
}

function metricWinner(
  a: ComparedSetup,
  b: ComparedSetup,
  accessor: (item: ComparedSetup) => number,
  direction: "higher" | "lower"
) {
  const aValue = accessor(a);
  const bValue = accessor(b);

  if (!Number.isFinite(aValue) || !Number.isFinite(bValue)) {
    return "Tie";
  }

  if (Math.abs(aValue - bValue) < 0.0001) {
    return "Tie";
  }

  const aWins = direction === "higher" ? aValue > bValue : aValue < bValue;
  return aWins ? a.setup.name : b.setup.name;
}

function verdictRows(a: ComparedSetup, b: ComparedSetup) {
  const rows = [
    {
      label: "Higher pressure",
      winner: metricWinner(a, b, (item) => item.atGunPressurePsi, "higher"),
      detail: `${a.setup.name}: ${fmt(a.atGunPressurePsi, 0)} PSI · ${b.setup.name}: ${fmt(b.atGunPressurePsi, 0)} PSI`,
    },
    {
      label: "Lower hose loss",
      winner: metricWinner(a, b, (item) => item.hoseLossPsi, "lower"),
      detail: `${a.setup.name}: ${fmt(a.hoseLossPsi, 0)} PSI · ${b.setup.name}: ${fmt(b.hoseLossPsi, 0)} PSI`,
    },
    {
      label: "Better efficiency",
      winner: metricWinner(a, b, (item) => Math.abs(item.pressureVariancePct), "lower"),
      detail: `${a.setup.name}: ${fmt(Math.abs(a.pressureVariancePct), 1)}% variance · ${b.setup.name}: ${fmt(Math.abs(b.pressureVariancePct), 1)}% variance`,
    },
  ];

  if (a.hasEngineHp && b.hasEngineHp) {
    rows.push({
      label: "Safer engine load",
      winner: metricWinner(
        a,
        b,
        (item) => (item.usableEngineHp ?? 0) - item.requiredHp,
        "higher"
      ),
      detail: `${a.setup.name}: ${fmt((a.usableEngineHp ?? 0) - a.requiredHp, 1)} HP headroom · ${b.setup.name}: ${fmt((b.usableEngineHp ?? 0) - b.requiredHp, 1)} HP headroom`,
    });
  }

  return rows;
}

function openCalculatorHref(setup: ComparedSetup) {
  const params = buildFullRigSearchParams(savedSetupToInputs(setup.setup));
  const search = params.toString();
  return search ? `/calculator?${search}` : "/calculator";
}

function valueClass(
  a: ComparedSetup,
  b: ComparedSetup,
  accessor: (item: ComparedSetup) => number,
  target: "higher" | "lower",
  current: "a" | "b"
) {
  const aValue = accessor(a);
  const bValue = accessor(b);

  if (!Number.isFinite(aValue) || !Number.isFinite(bValue) || Math.abs(aValue - bValue) < 0.0001) {
    return "text-slate-900";
  }

  const aWins = target === "higher" ? aValue > bValue : aValue < bValue;

  if ((current === "a" && aWins) || (current === "b" && !aWins)) {
    return "text-green-700";
  }

  return "text-slate-900";
}

function parseLiveInputsFromSearchParams(searchParams: URLSearchParams): Partial<Inputs> {
  const rigParams = new URLSearchParams();

  const keys = [
    "pumpPressure",
    "pumpPressureUnit",
    "pumpFlow",
    "pumpFlowUnit",
    "maxPressure",
    "maxPressureUnit",
    "hoseLength",
    "hoseLengthUnit",
    "hoseId",
    "hoseIdUnit",
    "engineHp",
    "sprayMode",
    "nozzleCount",
    "nozzleSizeText",
  ];

  keys.forEach((key) => {
    const value = searchParams.get(`live_${key}`);
    if (value !== null && value !== "") {
      rigParams.set(key, value);
    }
  });

  return parseRigSearchParams(rigParams.toString());
}

export default function CompareSetupsPage() {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [copiedCompareLink, setCopiedCompareLink] = useState(false);

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

  const { setups, isReady, getSetupById } = useSavedSetups(authUserId);

  const liveMode = searchParams.get("live") === "1";
  const liveName = (searchParams.get("liveName") || "").trim() || "Current calculator";
  const liveInputs = useMemo(
    () => (liveMode ? parseLiveInputsFromSearchParams(searchParams) : null),
    [liveMode, searchParams]
  );

  const setupAId = searchParams.get("a") ?? "";
  const setupBId = searchParams.get("b") ?? "";

  useEffect(() => {
    if (!isReady || setups.length === 0) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    let changed = false;

    if (!liveMode && !setupAId) {
      next.set("a", setups[0].id);
      changed = true;
    }

    if (!setupBId) {
      const fallbackB = liveMode
        ? setups[0]
        : setups.find((setup) => setup.id !== (next.get("a") ?? "")) ?? setups[1];

      if (fallbackB) {
        next.set("b", fallbackB.id);
        changed = true;
      }
    }

    if (changed) {
      setSearchParams(next, { replace: true });
    }
  }, [isReady, liveMode, searchParams, setSearchParams, setupAId, setupBId, setups]);

  const setupA = useMemo(
    () => (!liveMode && setupAId ? getSetupById(setupAId) : null),
    [getSetupById, liveMode, setupAId]
  );

  const setupB = useMemo(
    () => (setupBId ? getSetupById(setupBId) : null),
    [getSetupById, setupBId]
  );

  const comparedA = useMemo(() => {
    if (liveMode && liveInputs) {
      return compareCurrentInputs(liveInputs, liveName);
    }

    return setupA ? compareSavedSetup(setupA) : null;
  }, [liveInputs, liveMode, liveName, setupA]);

  const comparedB = useMemo(() => (setupB ? compareSavedSetup(setupB) : null), [setupB]);

  const verdicts = useMemo(
    () => (comparedA && comparedB ? verdictRows(comparedA, comparedB) : []),
    [comparedA, comparedB]
  );

  function updateSelection(key: "a" | "b", value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next);
  }

  function swapSetups() {
    if (liveMode) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set("a", setupBId);
    next.set("b", setupAId);
    setSearchParams(next);
  }

  async function copyCompareLink() {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCompareLink(true);
      window.setTimeout(() => setCopiedCompareLink(false), 1800);
    } catch {
      window.prompt("Copy this compare link:", url);
    }
  }

  const comparisonRows =
    comparedA && comparedB
      ? [
          {
            label: "Machine PSI",
            aValue: `${comparedA.setup.machinePsi ?? "—"} PSI`,
            bValue: `${comparedB.setup.machinePsi ?? "—"} PSI`,
            aClass: valueClass(comparedA, comparedB, (item) => item.setup.machinePsi ?? 0, "higher", "a"),
            bClass: valueClass(comparedA, comparedB, (item) => item.setup.machinePsi ?? 0, "higher", "b"),
          },
          {
            label: "Machine LPM",
            aValue: `${comparedA.setup.machineLpm ?? "—"} LPM`,
            bValue: `${comparedB.setup.machineLpm ?? "—"} LPM`,
            aClass: valueClass(comparedA, comparedB, (item) => item.setup.machineLpm ?? 0, "higher", "a"),
            bClass: valueClass(comparedA, comparedB, (item) => item.setup.machineLpm ?? 0, "higher", "b"),
          },
          {
            label: "Hose length",
            aValue: `${comparedA.setup.hoseLengthM ?? "—"} m`,
            bValue: `${comparedB.setup.hoseLengthM ?? "—"} m`,
            aClass: valueClass(comparedA, comparedB, (item) => item.setup.hoseLengthM ?? 0, "lower", "a"),
            bClass: valueClass(comparedA, comparedB, (item) => item.setup.hoseLengthM ?? 0, "lower", "b"),
          },
          {
            label: "Hose ID",
            aValue: `${comparedA.setup.hoseIdMm ?? "—"} mm`,
            bValue: `${comparedB.setup.hoseIdMm ?? "—"} mm`,
            aClass: valueClass(comparedA, comparedB, (item) => item.setup.hoseIdMm ?? 0, "higher", "a"),
            bClass: valueClass(comparedA, comparedB, (item) => item.setup.hoseIdMm ?? 0, "higher", "b"),
          },
          {
            label: "Nozzle size",
            aValue: comparedA.setup.nozzleSize ?? "—",
            bValue: comparedB.setup.nozzleSize ?? "—",
            aClass: "text-slate-900",
            bClass: "text-slate-900",
          },
          {
            label: "At-gun pressure",
            aValue: `${fmt(comparedA.atGunPressurePsi, 0)} PSI (${fmt(comparedA.atGunPressureBar, 1)} bar)`,
            bValue: `${fmt(comparedB.atGunPressurePsi, 0)} PSI (${fmt(comparedB.atGunPressureBar, 1)} bar)`,
            aClass: valueClass(comparedA, comparedB, (item) => item.atGunPressurePsi, "higher", "a"),
            bClass: valueClass(comparedA, comparedB, (item) => item.atGunPressurePsi, "higher", "b"),
          },
          {
            label: "Operating flow",
            aValue: `${fmt(comparedA.operatingFlowLpm, 1)} LPM`,
            bValue: `${fmt(comparedB.operatingFlowLpm, 1)} LPM`,
            aClass: valueClass(comparedA, comparedB, (item) => item.operatingFlowLpm, "higher", "a"),
            bClass: valueClass(comparedA, comparedB, (item) => item.operatingFlowLpm, "higher", "b"),
          },
          {
            label: "Hose pressure loss",
            aValue: `${fmt(comparedA.hoseLossPsi, 0)} PSI (${fmt(comparedA.hoseLossBar, 1)} bar)`,
            bValue: `${fmt(comparedB.hoseLossPsi, 0)} PSI (${fmt(comparedB.hoseLossBar, 1)} bar)`,
            aClass: valueClass(comparedA, comparedB, (item) => item.hoseLossPsi, "lower", "a"),
            bClass: valueClass(comparedA, comparedB, (item) => item.hoseLossPsi, "lower", "b"),
          },
          {
            label: "Pressure variance",
            aValue: `${fmt(comparedA.pressureVariancePct, 1)}%`,
            bValue: `${fmt(comparedB.pressureVariancePct, 1)}%`,
            aClass: valueClass(comparedA, comparedB, (item) => Math.abs(item.pressureVariancePct), "lower", "a"),
            bClass: valueClass(comparedA, comparedB, (item) => Math.abs(item.pressureVariancePct), "lower", "b"),
          },
          {
            label: "Selected tip",
            aValue: comparedA.selectedTipCode,
            bValue: comparedB.selectedTipCode,
            aClass: "text-slate-900",
            bClass: "text-slate-900",
          },
          {
            label: "Calibrated tip",
            aValue: comparedA.calibratedTipCode,
            bValue: comparedB.calibratedTipCode,
            aClass: "text-slate-900",
            bClass: "text-slate-900",
          },
          {
            label: "Required HP",
            aValue: `${fmt(comparedA.requiredHp, 1)} HP`,
            bValue: `${fmt(comparedB.requiredHp, 1)} HP`,
            aClass: valueClass(comparedA, comparedB, (item) => item.requiredHp, "lower", "a"),
            bClass: valueClass(comparedA, comparedB, (item) => item.requiredHp, "lower", "b"),
          },
          {
            label: "Usable engine HP",
            aValue: comparedA.hasEngineHp ? `${fmt(comparedA.usableEngineHp ?? 0, 1)} HP` : "—",
            bValue: comparedB.hasEngineHp ? `${fmt(comparedB.usableEngineHp ?? 0, 1)} HP` : "—",
            aClass:
              comparedA.hasEngineHp && comparedB.hasEngineHp
                ? valueClass(comparedA, comparedB, (item) => item.usableEngineHp ?? 0, "higher", "a")
                : "text-slate-900",
            bClass:
              comparedA.hasEngineHp && comparedB.hasEngineHp
                ? valueClass(comparedA, comparedB, (item) => item.usableEngineHp ?? 0, "higher", "b")
                : "text-slate-900",
          },
          {
            label: "Engine status",
            aValue: comparedA.engineStatus,
            bValue: comparedB.engineStatus,
            aClass: "text-slate-900",
            bClass: "text-slate-900",
          },
          {
            label: "Nozzle status",
            aValue: comparedA.nozzleStatus,
            bValue: comparedB.nozzleStatus,
            aClass: "text-slate-900",
            bClass: "text-slate-900",
          },
          {
            label: "At-gun P × Q class",
            aValue: `${fmt(comparedA.gunPQ, 0)} · ${comparedA.gunClass}`,
            bValue: `${fmt(comparedB.gunPQ, 0)} · ${comparedB.gunClass}`,
            aClass: "text-slate-900",
            bClass: "text-slate-900",
          },
        ]
      : [];

  return (
    <PressureCalLayout>
      <Helmet>
        <title>Compare Setups | PressureCal Pro</title>
        <meta
          name="description"
          content="Compare two pressure washer setups side by side with PressureCal Pro."
        />
      </Helmet>

      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              PressureCal Pro
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Compare Setups
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Compare a live calculator snapshot against a saved setup, or compare two saved setups side by side.
            </p>
          </div>
        </div>
      </section>

      <RequirePro
        signedOutFallback={
          <section className="bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-16">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-950">Sign in to compare setups</h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Compare Setups are linked to your PressureCal account. Sign in to access your saved setups and Pro tools.
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
                <h2 className="text-2xl font-bold text-slate-950">Compare Setups is a Pro feature</h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Upgrade to PressureCal Pro to compare saved setups side by side.
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
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="grid flex-1 gap-5 md:grid-cols-2">
                  {liveMode ? (
                    <div className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4">
                      <span className="text-sm font-semibold text-slate-800">Setup A</span>
                      <div className="mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="text-sm font-semibold text-slate-950">{liveName}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          Live calculator snapshot loaded from the compare link.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-800">Setup A</span>
                      <select
                        value={setupAId}
                        onChange={(event) => updateSelection("a", event.target.value)}
                        disabled={authLoading || !isReady || setups.length === 0}
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                      >
                        <option value="">Select setup A</option>
                        {setups.map((setup) => (
                          <option key={setup.id} value={setup.id}>
                            {setup.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">
                      {liveMode ? "Saved setup" : "Setup B"}
                    </span>
                    <select
                      value={setupBId}
                      onChange={(event) => updateSelection("b", event.target.value)}
                      disabled={authLoading || !isReady || setups.length === 0}
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                    >
                      <option value="">{liveMode ? "Select saved setup" : "Select setup B"}</option>
                      {setups.map((setup) => (
                        <option key={setup.id} value={setup.id}>
                          {setup.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  {!liveMode ? (
                    <button
                      type="button"
                      onClick={swapSetups}
                      disabled={!setupAId || !setupBId}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Swap setups
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={copyCompareLink}
                    disabled={liveMode ? !setupBId : !setupAId || !setupBId}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copiedCompareLink ? "Copied ✓" : "Copy compare link"}
                  </button>
                  <Link
                    to={liveMode ? "/calculator" : "/saved-setups"}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {liveMode ? "Back to calculator" : "Back to Saved Setups"}
                  </Link>
                </div>
              </div>

              {liveMode ? (
                <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-900">Live compare mode</p>
                  <p className="mt-2 text-sm leading-6 text-blue-800">
                    Setup A is your current calculator state. Choose one saved setup to compare it against.
                  </p>
                </div>
              ) : null}

              {isReady && setups.length < (liveMode ? 1 : 2) ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                  <p className="text-sm font-semibold text-slate-900">
                    {liveMode ? "You need at least one saved setup" : "You need at least two saved setups"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Save {liveMode ? "a" : "another"} setup first, then come back to compare.
                  </p>
                </div>
              ) : null}
            </div>

            {comparedA && comparedB ? (
              <>
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  {[comparedA, comparedB].map((item, index) => (
                    <article
                      key={`${item.setup.id}-${index}`}
                      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Setup {index === 0 ? "A" : "B"}
                          </p>
                          <h2 className="mt-2 text-2xl font-bold text-slate-950">{item.setup.name}</h2>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {item.setup.notes || "No notes saved for this setup yet."}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={openCalculatorHref(item)}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            Open in calculator
                          </Link>
                        </div>
                      </div>

                      <dl className="mt-6 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                            Machine
                          </dt>
                          <dd className="mt-1">
                            {item.setup.machinePsi ?? "—"} PSI · {item.setup.machineLpm ?? "—"} LPM
                          </dd>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                            Hose
                          </dt>
                          <dd className="mt-1">
                            {item.setup.hoseLengthM ?? "—"} m · {item.setup.hoseIdMm ?? "—"} mm
                          </dd>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 sm:col-span-2">
                          <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                            Nozzle
                          </dt>
                          <dd className="mt-1">{item.setup.nozzleSize ?? "—"}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>

                <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-950">Quick verdict</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        A simple summary of which setup wins on the main decision points.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {verdicts.map((verdict) => (
                      <div
                        key={verdict.label}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          {verdict.label}
                        </p>
                        <p className="mt-2 text-lg font-bold text-slate-950">{verdict.winner}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{verdict.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950">Side-by-side comparison</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Green values indicate the stronger result for that row where a clear winner exists.
                    </p>
                  </div>

                  <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-slate-200">
                      <thead className="bg-slate-950 text-white">
                        <tr>
                          <th className="px-4 py-4 text-left text-sm font-semibold">Metric</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            {comparedA.setup.name}
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-semibold">
                            {comparedB.setup.name}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonRows.map((row, index) => (
                          <tr key={row.label} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                            <td className="border-t border-slate-200 px-4 py-4 text-sm font-semibold text-slate-800">
                              {row.label}
                            </td>
                            <td className={`border-t border-slate-200 px-4 py-4 text-sm font-semibold ${row.aClass}`}>
                              {row.aValue}
                            </td>
                            <td className={`border-t border-slate-200 px-4 py-4 text-sm font-semibold ${row.bClass}`}>
                              {row.bValue}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-5">
                      <p className="text-sm font-semibold text-slate-950">{comparedA.setup.name}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{comparedA.statusText}</p>
                      {comparedA.isPressureLimited ? (
                        <div className="mt-3 inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          Pressure limited
                        </div>
                      ) : null}
                      {!comparedA.hasEngineHp ? (
                        <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                          Engine HP not provided
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-5">
                      <p className="text-sm font-semibold text-slate-950">{comparedB.setup.name}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{comparedB.statusText}</p>
                      {comparedB.isPressureLimited ? (
                        <div className="mt-3 inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          Pressure limited
                        </div>
                      ) : null}
                      {!comparedB.hasEngineHp ? (
                        <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                          Engine HP not provided
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <h2 className="text-2xl font-bold text-slate-950">
                  {liveMode ? "Select a saved setup to compare" : "Select two setups to compare"}
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {liveMode
                    ? "Choose one saved setup above and PressureCal will compare it against your current calculator snapshot."
                    : "Pick a setup in both dropdowns above and PressureCal will generate a side-by-side comparison."}
                </p>
              </div>
            )}
          </div>
        </section>
      </RequirePro>

      <BackToTopButton />
    </PressureCalLayout>
  );
}
