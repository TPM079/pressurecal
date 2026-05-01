import type { ReactNode } from "react";

type CalculationExplainerRow = {
  label: string;
  value: ReactNode;
  note?: ReactNode;
};

type CalculationExplainerProps = {
  title?: string;
  formula: ReactNode;
  inputs?: CalculationExplainerRow[];
  results?: CalculationExplainerRow[];
  explanation: ReactNode;
  disclaimer?: ReactNode;
  className?: string;
  defaultOpen?: boolean;
};

function RowList({ rows }: { rows: CalculationExplainerRow[] }) {
  return (
    <dl className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[0.9fr_1.1fr] sm:gap-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {row.label}
          </dt>
          <dd className="text-sm font-medium text-slate-900">
            {row.value}
            {row.note ? <div className="mt-1 text-xs font-normal leading-5 text-slate-500">{row.note}</div> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function CalculationExplainer({
  title = "How this result is calculated",
  formula,
  inputs = [],
  results = [],
  explanation,
  disclaimer,
  className = "",
  defaultOpen = false,
}: CalculationExplainerProps) {
  return (
    <details
      className={`group rounded-2xl border border-slate-200 bg-slate-50/80 text-left shadow-sm ${className}`}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-slate-900 marker:hidden sm:px-5">
        <span>{title}</span>
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition group-open:rotate-180">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </summary>

      <div className="border-t border-slate-200 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              Formula / method
            </p>
            <div className="mt-2 text-sm leading-6 text-slate-700">{formula}</div>
          </div>

          {inputs.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Inputs used
              </p>
              <RowList rows={inputs} />
            </div>
          ) : null}

          {results.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Result shown
              </p>
              <RowList rows={results} />
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
            {explanation}
          </div>

          {disclaimer ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
              {disclaimer}
            </div>
          ) : null}
        </div>
      </div>
    </details>
  );
}
