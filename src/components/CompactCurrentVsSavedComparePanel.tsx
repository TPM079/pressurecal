import type { ReactNode } from "react";

type SavedSetupOption = {
  id: string;
  label: string;
};

type SnapshotItem = {
  label: string;
  value: ReactNode;
};

type CompactCurrentVsSavedComparePanelProps = {
  currentSetupTitle?: string;
  currentSetupSummary: string;
  selectedSavedSetupId: string;
  savedSetupOptions: SavedSetupOption[];
  onSavedSetupChange: (nextId: string) => void;
  snapshotItems: SnapshotItem[];
  onCompare: () => void;
  onCancel: () => void;
  compareDisabled?: boolean;
  compareButtonLabel?: string;
  cancelButtonLabel?: string;
};

export default function CompactCurrentVsSavedComparePanel({
  currentSetupTitle = "Current calculator",
  currentSetupSummary,
  selectedSavedSetupId,
  savedSetupOptions,
  onSavedSetupChange,
  snapshotItems,
  onCompare,
  onCancel,
  compareDisabled = false,
  compareButtonLabel = "Compare now",
  cancelButtonLabel = "Cancel",
}: CompactCurrentVsSavedComparePanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="max-w-2xl">
        <h3 className="text-xl font-semibold text-slate-950 sm:text-2xl">
          Compare current calculator vs saved setup
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Use your live calculator state as Setup A and one saved setup as Setup B.
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Setup A
          </p>
          <p className="mt-2 text-base font-semibold text-slate-950">{currentSetupTitle}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{currentSetupSummary}</p>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-slate-900">
            Saved setup to compare against
          </span>
          <select
            value={selectedSavedSetupId}
            onChange={(event) => onSavedSetupChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
          >
            <option value="">Select saved setup</option>
            {savedSetupOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Live snapshot
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {snapshotItems.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onCompare}
          disabled={compareDisabled}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {compareButtonLabel}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          {cancelButtonLabel}
        </button>
      </div>
    </section>
  );
}
