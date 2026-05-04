import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import RequirePro from "../components/RequirePro";
import {
  useSavedSetups,
  type SavedSetupCalculatedResult,
  type SavedSetupHealth,
} from "../hooks/useSavedSetups";
import { buildFullRigSearchParams } from "../lib/rigUrlState";
import { savedSetupToInputs } from "../lib/savedSetupToInputs";
import { supabase } from "../lib/supabase-browser";

function formatNumber(value: number | null | undefined, decimals = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNearMaxPressureReviewNote(result: SavedSetupCalculatedResult) {
  const bypassIsNegligible = !Number.isFinite(result.bypassPercent) || result.bypassPercent < 2;

  if (result.nozzleStatus === "Calibrated" && bypassIsNegligible) {
    return "Nozzle is closely matched. Confirm actual pressure with a gauge during field testing.";
  }

  if (bypassIsNegligible) {
    return "Operating near max pressure — confirm actual pressure with a gauge during field testing.";
  }

  return "Operating near max pressure — confirm with a gauge if the unloader cycles.";
}

function cleanSetupReviewText(value: string, result: SavedSetupCalculatedResult) {
  const trimmed = value.trim();

  if (
    trimmed === "Pressure-limited setup — unloader bypass is likely." ||
    trimmed === "Pressure-limited setup / unloader bypass likely."
  ) {
    return getNearMaxPressureReviewNote(result);
  }

  return trimmed;
}

function getDisplayReviewNotes(result: SavedSetupCalculatedResult) {
  const notes = result.warnings
    .map((warning) => cleanSetupReviewText(warning, result))
    .filter((warning) => warning.length > 0);

  if (notes.length > 0) {
    return Array.from(new Set(notes));
  }

  if (result.pressureLimited) {
    return [getNearMaxPressureReviewNote(result)];
  }

  return [];
}

function buildReportRecommendations(result: SavedSetupCalculatedResult, reviewNotes: string[]) {
  const recommendations: string[] = [];
  const reviewText = reviewNotes.join(" ").toLowerCase();
  const reviewAlreadyMentionsGauge =
    reviewText.includes("gauge") || reviewText.includes("actual pressure");

  if (result.nozzleStatus === "Calibrated") {
    recommendations.push("Use this as a baseline setup for this pump, nozzle, and hose combination.");
  } else if (result.nozzleStatus === "Under-calibrated") {
    recommendations.push("Fit the rated-match nozzle or verify the selected smaller nozzle under real load.");
  } else {
    recommendations.push("Use the rated-match nozzle if the job needs pressure closer to the pump rating.");
  }

  if (result.hoseLossPercent < 5) {
    recommendations.push("Keep this hose ID and length as the preferred run for similar jobs.");
  } else if (result.hoseLossPercent >= 10) {
    recommendations.push("Shorten the hose run or step up hose ID before using this as a repeat-job reference.");
  }

  if (result.pressureLimited) {
    recommendations.push(
      reviewAlreadyMentionsGauge
        ? "Record the confirmed gauge reading as the field reference for this setup."
        : "Confirm actual pressure with a gauge if the unloader cycles."
    );
  }

  if (result.engineStatus === "Healthy") {
    recommendations.push("Engine power is adequate for this calculated operating point.");
  } else if (result.engineStatus === "Near limit") {
    recommendations.push("Check engine load in the field before treating this as a repeat setup.");
  } else if (result.engineStatus === "Undersized") {
    recommendations.push("Increase available engine power or reduce the operating load before use.");
  } else if (result.engineStatus === "Not provided") {
    recommendations.push("Add engine HP to include a power check in future reports.");
  }

  return Array.from(new Set(recommendations)).slice(0, 3);
}

function getDisplaySetupHealth(result: SavedSetupCalculatedResult): SavedSetupHealth {
  if (result.setupHealth) {
    return {
      ...result.setupHealth,
      reasons: result.setupHealth.reasons.map((reason) => cleanSetupReviewText(reason, result)),
    };
  }

  const reasons = getDisplayReviewNotes(result);
  const hasHighRiskIssue =
    result.engineStatus === "Undersized" || result.hoseLossPercent >= 20;
  const hasReviewIssue =
    result.nozzleStatus !== "Calibrated" ||
    result.engineStatus === "Near limit" ||
    result.hoseLossPercent >= 10;

  if (hasHighRiskIssue) {
    return {
      level: "warning",
      label: "Check setup",
      score: 50,
      summary: "This setup needs attention before being treated as known-good.",
      reasons,
    };
  }

  if (hasReviewIssue) {
    return {
      level: "review",
      label: "Review setup",
      score: 70,
      summary: "Check the notes below before treating this as a known-good setup.",
      reasons,
    };
  }

  if (result.pressureLimited) {
    return {
      level: "good",
      label: "Good working setup",
      score: result.nozzleStatus === "Calibrated" ? 88 : 85,
      summary: "Useful working setup with minor items to keep an eye on.",
      reasons,
    };
  }

  if (result.hoseLossPercent < 5) {
    return {
      level: "excellent",
      label: "Excellent match",
      score: 95,
      summary: "Low loss and setup match look strong.",
      reasons: reasons.length > 0 ? reasons : ["No major setup issues detected."],
    };
  }

  return {
    level: "good",
    label: "Good working setup",
    score: 85,
    summary: "Useful working setup with minor items to keep an eye on.",
    reasons: reasons.length > 0 ? reasons : ["No major setup issues detected."],
  };
}

function healthClass(level: SavedSetupHealth["level"]) {
  if (level === "excellent") {
    return "border-green-200 bg-green-50 text-green-800";
  }

  if (level === "good") {
    return "border-blue-200 bg-blue-50 text-blue-900";
  }

  if (level === "review") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-red-200 bg-red-50 text-red-800";
}

const REPORT_OPERATOR_NOTES_MAX_CHARS = 360;

function compactReportText(value: string, maxChars: number) {
  const trimmed = value.trim();

  if (trimmed.length <= maxChars) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxChars).trimEnd()}…`;
}


type ReportMetricProps = {
  label: string;
  value: string;
  detail?: string;
};

function ReportMetric({ label, value, detail }: ReportMetricProps) {
  return (
    <div className="report-metric rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold text-slate-950">{value}</dd>
      {detail ? <dd className="mt-1 text-xs leading-5 text-slate-500">{detail}</dd> : null}
    </div>
  );
}

function ReportSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "report-section rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h2 className="report-section-title text-lg font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
      <div className="report-section-content mt-4">{children}</div>
    </section>
  );
}

function PressureCalReportLogo() {
  return (
    <img
      src="/pressurecal-logo-primary.png"
      alt="PressureCal"
      className="h-12 w-auto object-contain sm:h-14"
    />
  );
}

export default function SavedSetupReportPage() {
  const { setupId } = useParams<{ setupId: string }>();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [generatedAt] = useState(() => new Date());
  const [copiedReportLink, setCopiedReportLink] = useState(false);

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

  const { isReady, error: savedSetupsError, getSetupById } = useSavedSetups(authUserId);

  const setup = useMemo(() => {
    return setupId ? getSetupById(setupId) : null;
  }, [getSetupById, setupId]);

  const calculatorHref = useMemo(() => {
    if (!setup) {
      return "/calculator";
    }

    const params = buildFullRigSearchParams(savedSetupToInputs(setup));
    const search = params.toString();
    return search ? `/calculator?${search}` : "/calculator";
  }, [setup]);

  const result = setup?.calculatedResult ?? null;
  const health = result ? getDisplaySetupHealth(result) : null;
  const reportReviewNotes = result ? getDisplayReviewNotes(result) : [];
  const reportRecommendations = result ? buildReportRecommendations(result, reportReviewNotes) : [];
  const reportOperatorNotes = setup?.notes
    ? compactReportText(setup.notes, REPORT_OPERATOR_NOTES_MAX_CHARS)
    : "";
  const reportOperatorNotesWereTrimmed = Boolean(
    setup?.notes && setup.notes.trim().length > REPORT_OPERATOR_NOTES_MAX_CHARS
  );

  async function copyReportLink() {
    const url = window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedReportLink(true);
      window.setTimeout(() => setCopiedReportLink(false), 1800);
    } catch {
      window.prompt("Copy this report link:", url);
    }
  }

  const signedOutFallback = (
    <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          PressureCal Pro
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in to view this setup report</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Setup reports are linked to your PressureCal account and require active Pro access.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/account"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Sign In
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View PressureCal Pro
          </Link>
        </div>
      </div>
    </div>
  );

  const nonProFallback = (
    <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          PressureCal Pro
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Setup reports are a Pro feature</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Upgrade to PressureCal Pro to print setup reports for quoting, job records, dealer support, and customer explanations.
        </p>
        <div className="mt-6">
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            View PressureCal Pro
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{setup ? `${setup.name} Setup Report | PressureCal` : "Setup Report | PressureCal"}</title>
        <meta
          name="description"
          content="Printable PressureCal Pro setup report for pressure washer setup records, quoting, and support."
        />
      </Helmet>

      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }

          html,
          body,
          #root {
            width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * {
            visibility: hidden !important;
          }

          .report-shell,
          .report-shell * {
            visibility: visible !important;
          }

          body > *:not(#root),
          footer,
          [role="contentinfo"],
          .site-footer,
          .app-footer,
          .feedback-widget,
          .feedback-button {
            display: none !important;
          }

          .report-no-print,
          .report-no-print * {
            display: none !important;
            visibility: hidden !important;
          }

          .report-shell {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }

          .report-shell::before,
          .report-shell::after,
          .report-paper::before,
          .report-paper::after {
            display: none !important;
            content: none !important;
          }

          .report-paper {
            box-shadow: none !important;
            border: 0 !important;
            max-width: none !important;
            width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }

          .report-paper > .space-y-6 {
            display: block !important;
            column-count: 2 !important;
            column-gap: 5px !important;
            column-fill: auto !important;
          }

          .report-paper > .space-y-6 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 0 !important;
          }

          .report-header,
          .report-section,
          .report-disclaimer {
            display: block !important;
            width: 100% !important;
            margin: 0 0 5px 0 !important;
          }

          .report-results {
            break-before: column !important;
          }

          .report-header,
          .report-section,
          .report-disclaimer {
            break-inside: avoid;
            page-break-inside: avoid;
            box-shadow: none !important;
          }

          .report-header {
            grid-column: 1 !important;
            grid-row: 1 !important;
            padding: 7px 8px !important;
            border-radius: 10px !important;
          }

          .report-header > div {
            gap: 8px !important;
          }

          .report-header img {
            height: 34px !important;
            max-width: 180px !important;
          }

          .report-header h1 {
            margin-top: 5px !important;
            font-size: 20px !important;
            line-height: 1.05 !important;
          }

          .report-header h1 + p {
            margin-top: 3px !important;
            font-size: 12px !important;
            line-height: 1.2 !important;
          }

          .report-header p {
            font-size: 9.5px !important;
            line-height: 1.25 !important;
          }

          .report-header p.mt-3 {
            display: none !important;
          }

          .report-header .rounded-2xl {
            min-width: 0 !important;
            padding: 6px 7px !important;
            border-radius: 9px !important;
            font-size: 9.5px !important;
            line-height: 1.2 !important;
          }

          .report-header dl {
            margin-top: 4px !important;
          }

          .report-header dl > div {
            gap: 6px !important;
          }

          .report-health,
          .report-inputs,
          .report-assumptions,
          .report-results,
          .report-notes,
          .report-disclaimer {
            grid-column: auto !important;
            grid-row: auto !important;
          }

          .report-section {
            padding: 7px 8px !important;
            border-radius: 10px !important;
          }

          .report-section-title {
            break-after: avoid;
            page-break-after: avoid;
            font-size: 12px !important;
            line-height: 1.1 !important;
          }

          .report-section-content {
            break-before: avoid;
            page-break-before: avoid;
            margin-top: 5px !important;
          }

          .report-section dl {
            gap: 4px !important;
          }

          .report-section dt {
            letter-spacing: 0.06em !important;
          }

          .report-section dd {
            margin-top: 0 !important;
          }

          .report-inputs dl {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }

          .report-assumptions dl {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }

          .report-result-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }

          .report-metric {
            break-inside: avoid;
            page-break-inside: avoid;
            padding: 4px 5px !important;
            border-radius: 7px !important;
          }

          .report-metric dt {
            font-size: 7.4px !important;
            line-height: 1.1 !important;
          }

          .report-metric dd {
            font-size: 10px !important;
            line-height: 1.15 !important;
          }

          .report-metric dd.mt-1.text-xs,
          .report-metric dd.text-xs {
            font-size: 8.3px !important;
            line-height: 1.15 !important;
          }

          .report-compact-box {
            padding: 5px 6px !important;
            border-radius: 8px !important;
          }

          .report-compact-text {
            font-size: 9px !important;
            line-height: 1.2 !important;
          }

          .report-results .report-compact-box.mb-4 {
            margin-bottom: 5px !important;
          }

          .report-results .mt-3 {
            margin-top: 5px !important;
          }

          .report-health .rounded-2xl {
            padding: 5px 6px !important;
            border-radius: 8px !important;
          }

          .report-health .uppercase {
            display: none !important;
          }

          .report-health .text-xl {
            margin-top: 0 !important;
            font-size: 12px !important;
            line-height: 1.1 !important;
          }

          .report-health p.mt-2 {
            margin-top: 3px !important;
            font-size: 9px !important;
            line-height: 1.25 !important;
          }

          .report-health ul {
            margin-top: 4px !important;
            padding-left: 14px !important;
            font-size: 8.8px !important;
            line-height: 1.2 !important;
          }

          .report-health ul > li + li {
            margin-top: 1px !important;
          }

          .report-notes p {
            padding: 5px 6px !important;
            border-radius: 8px !important;
            font-size: 9px !important;
            line-height: 1.2 !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }

          .report-notes-trimmed {
            margin-top: 3px !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            font-size: 7.8px !important;
            line-height: 1.15 !important;
          }

          .report-disclaimer {
            padding: 6px 8px !important;
            border-radius: 10px !important;
          }

          .report-disclaimer h2 {
            font-size: 11px !important;
            line-height: 1.1 !important;
          }

          .report-disclaimer p {
            margin-top: 3px !important;
            font-size: 8.4px !important;
            line-height: 1.2 !important;
          }

          .report-print-page-start {
            break-before: auto !important;
            page-break-before: auto !important;
          }

          .report-allow-split {
            break-inside: auto;
            page-break-inside: auto;
          }
        }
      `}</style>

      <RequirePro
        signedOutFallback={signedOutFallback}
        nonProFallback={nonProFallback}
        loadingFallback={
          <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
            <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              Checking your PressureCal Pro access...
            </div>
          </div>
        }
      >
        <main className="report-shell min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
          <div className="report-paper mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="report-no-print mb-6 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Setup report
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Print this page or save it as PDF from your browser print dialog.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/saved-setups"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Back to Saved Setups
                </Link>
                <button
                  type="button"
                  onClick={copyReportLink}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  {copiedReportLink ? "Copied ✓" : "Copy Report Link"}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Print / Save PDF
                </button>
              </div>
            </div>

            {authLoading || !isReady ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                Loading setup report...
              </div>
            ) : savedSetupsError ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
                {savedSetupsError}
              </div>
            ) : !setup ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Setup report not found
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  This setup may have been deleted, or it may not belong to the currently signed-in Pro account.
                </p>
                <Link
                  to="/saved-setups"
                  className="mt-6 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Back to Saved Setups
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <header className="report-header rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <PressureCalReportLogo />
                      <p className="mt-4 text-xs font-semibold tracking-[0.08em] text-blue-700">
                        pressurecal.com
                      </p>
                      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                        Setup Report
                      </h1>
                      <p className="mt-2 text-lg font-semibold text-slate-800">{setup.name}</p>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                        Practical pressure washer setup record for quoting, job planning, customer explanation, or dealer support.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:min-w-64">
                      <p className="font-semibold text-slate-950">Report details</p>
                      <dl className="mt-3 space-y-2">
                        <div className="flex justify-between gap-4">
                          <dt>Generated</dt>
                          <dd className="text-right font-medium">{formatDateTime(generatedAt)}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>Saved</dt>
                          <dd className="text-right font-medium">{formatDateTime(setup.createdAt)}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>Updated</dt>
                          <dd className="text-right font-medium">{formatDateTime(setup.updatedAt)}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </header>

                {result && health ? (
                  <ReportSection title="Setup health" className="report-health">
                    <div className={["rounded-2xl border px-4 py-3", healthClass(health.level)].join(" ")}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.15em] opacity-70">
                            PressureCal setup check
                          </p>
                          <p className="mt-1 text-xl font-semibold">{health.label}</p>
                        </div>
                        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">
                          {health.score}/100
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6">{health.summary}</p>
                    </div>

                    {health.reasons.length > 0 ? (
                      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
                        {health.reasons.map((reason, index) => (
                          <li key={`${reason}-${index}`}>{reason}</li>
                        ))}
                      </ul>
                    ) : null}
                  </ReportSection>
                ) : null}

                <ReportSection title="Setup inputs" className="report-inputs">
                  <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <ReportMetric
                      label="Pump pressure"
                      value={`${formatNumber(setup.pumpPressure)} ${setup.pumpPressureUnit.toUpperCase()}`}
                    />
                    <ReportMetric
                      label="Pump flow"
                      value={`${formatNumber(setup.pumpFlow, 1)} ${setup.pumpFlowUnit.toUpperCase()}`}
                    />
                    <ReportMetric
                      label="Max pressure"
                      value={`${formatNumber(setup.maxPressure)} ${setup.maxPressureUnit.toUpperCase()}`}
                      detail="Unloader / rated max pressure setting"
                    />
                    <ReportMetric
                      label="Hose length"
                      value={`${formatNumber(setup.hoseLength, 1)} ${setup.hoseLengthUnit}`}
                    />
                    <ReportMetric
                      label="Hose ID"
                      value={`${formatNumber(setup.hoseId, 2)} ${setup.hoseIdUnit}`}
                    />
                    <ReportMetric
                      label="Engine HP"
                      value={setup.engineHp === null ? "Not provided" : `${formatNumber(setup.engineHp, 1)} HP`}
                    />
                    <ReportMetric
                      label="Spray mode"
                      value={setup.sprayMode === "surfaceCleaner" ? "Surface cleaner" : "Wand"}
                    />
                    <ReportMetric
                      label="Nozzle count"
                      value={`${setup.nozzleCount} nozzle${setup.nozzleCount === 1 ? "" : "s"}`}
                    />
                    <ReportMetric
                      label="Nozzle / tip code"
                      value={setup.nozzleSizeText ?? setup.nozzleSize ?? "—"}
                    />
                  </dl>
                </ReportSection>

                

                <ReportSection title="Calculation assumptions" className="report-assumptions">
                  <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <ReportMetric
                      label="Discharge coefficient"
                      value={formatNumber(setup.dischargeCoeffCd, 2)}
                    />
                    <ReportMetric
                      label="Water density"
                      value={`${formatNumber(setup.waterDensity)} kg/m³`}
                    />
                    <ReportMetric
                      label="Hose roughness"
                      value={`${formatNumber(setup.hoseRoughnessMm, 4)} mm`}
                    />
                    <ReportMetric
                      label="Schema version"
                      value="1"
                    />
                  </dl>
                </ReportSection>

                {result ? (
                  <ReportSection title="Calculated results" className="report-results">
                    <div className="report-compact-box mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="report-compact-text text-sm font-medium leading-6 text-slate-700">
                        {result.resultSummary}
                      </p>
                    </div>

                    <dl className="report-result-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <ReportMetric
                        label="At-gun pressure"
                        value={`${formatNumber(result.atGunPressurePsi)} PSI`}
                        detail={`${formatNumber(result.atGunPressureBar, 1)} bar`}
                      />
                      <ReportMetric
                        label="Operating flow"
                        value={`${formatNumber(result.operatingFlowLpm, 1)} LPM`}
                        detail={`${formatNumber(result.operatingFlowGpm, 2)} GPM (US)`}
                      />
                      <ReportMetric
                        label="Hose pressure loss"
                        value={`${formatNumber(result.hoseLossPsi)} PSI`}
                        detail={`${formatNumber(result.hoseLossBar, 1)} bar · ${formatNumber(result.hoseLossPercent, 1)}%`}
                      />
                      <ReportMetric
                        label="Selected nozzle"
                        value={result.selectedTipCode}
                        detail={`Orifice estimate ${formatNumber(result.selectedOrificeMm, 2)} mm`}
                      />
                      <ReportMetric
                        label="Rated match"
                        value={result.calibratedTipCode}
                      />
                      <ReportMetric
                        label="Required HP"
                        value={`${formatNumber(result.requiredHp, 1)} HP`}
                        detail={
                          result.usableEngineHp === null
                            ? "Engine HP not provided"
                            : `Usable engine estimate ${formatNumber(result.usableEngineHp, 1)} HP`
                        }
                      />
                      <ReportMetric
                        label="Engine status"
                        value={result.engineStatus}
                      />
                      <ReportMetric
                        label="Rated P × Q"
                        value={`${formatNumber(result.ratedPQ)} · ${result.ratedClass}`}
                      />
                      <ReportMetric
                        label="At-gun P × Q"
                        value={`${formatNumber(result.gunPQ)} · ${result.gunClass}`}
                      />
                      <ReportMetric
                        label="Bypass estimate"
                        value={`${formatNumber(result.bypassPercent, 1)}%`}
                        detail={`${formatNumber(result.bypassFlowGpm, 2)} GPM bypass`}
                      />
                      <ReportMetric
                        label="Near max pressure"
                        value={result.pressureLimited ? "Yes" : "No"}
                      />
                      <ReportMetric
                        label="Calculated"
                        value={formatDateTime(result.calculatedAt)}
                      />
                    </dl>

                    {reportReviewNotes.length > 0 ? (
                      <div className="report-compact-box mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <p className="font-semibold">Review notes</p>
                        <ul className="report-compact-text mt-1 list-disc space-y-1 pl-5">
                          {reportReviewNotes.map((warning, index) => (
                            <li key={`${warning}-${index}`}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {reportRecommendations.length > 0 ? (
                      <div className="report-compact-box mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
                        <p className="font-semibold">Recommendations</p>
                        <ul className="report-compact-text mt-1 list-disc space-y-1 pl-5">
                          {reportRecommendations.map((recommendation, index) => (
                            <li key={`${recommendation}-${index}`}>{recommendation}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </ReportSection>
                ) : (
                  <ReportSection title="Calculated results" className="report-results">
                    <p className="text-sm leading-6 text-slate-600">
                      No calculated result snapshot was saved with this setup. Open the setup in the calculator and save it again to include report results.
                    </p>
                  </ReportSection>
                )}

                <ReportSection title="Operator notes" className="report-notes">
                  {setup.notes ? (
                    <>
                      <p className="report-compact-box report-compact-text whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">
                        {reportOperatorNotes}
                      </p>
                      {reportOperatorNotesWereTrimmed ? (
                        <p className="report-notes-trimmed text-xs font-medium text-slate-500">
                          Note shortened for the one-page PDF layout. Open the saved setup to view the full note.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="report-compact-box report-compact-text rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
                      No operator notes saved for this setup.
                    </p>
                  )}
                </ReportSection>
                <section className="report-section report-disclaimer rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600 sm:p-6">
                  <h2 className="text-base font-semibold text-slate-950">Disclaimer</h2>
                  <p className="mt-3">
                    PressureCal reports are useful estimates for setup planning, quoting, and field checks. They do not replace pressure gauge testing, manufacturer limits, site-specific risk assessment, or operator judgement. Always confirm equipment ratings, nozzle condition, hose condition, unloader settings, and safe operating limits before use.
                  </p>
                </section>

                <div className="report-no-print flex flex-wrap gap-3 pt-2">
                  <Link
                    to={calculatorHref}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Open in Calculator
                  </Link>
                  <Link
                    to="/saved-setups"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Back to Saved Setups
                  </Link>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Print / Save PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </RequirePro>
    </>
  );
}
