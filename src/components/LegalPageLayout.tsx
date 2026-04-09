import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import PressureCalLayout from "./PressureCalLayout";

type LegalPageLayoutProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

export default function LegalPageLayout({
  eyebrow,
  title,
  intro,
  children,
}: LegalPageLayoutProps) {
  return (
    <PressureCalLayout>
      <section className="-mx-4 border-b border-slate-200 bg-slate-100 px-4">
        <div className="mx-auto max-w-5xl py-14 sm:py-16">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              {eyebrow}
            </p>

            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {title}
            </h1>

            <p className="mt-5 text-base leading-7 text-slate-700 sm:text-lg">
              {intro}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/"
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Back to home
              </Link>

              <Link
                to="/terms"
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Terms
              </Link>

              <Link
                to="/privacy"
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="-mx-4 bg-white px-4">
        <div className="mx-auto max-w-5xl py-12 sm:py-16">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
            <div
              className="
                prose prose-slate max-w-none
                prose-headings:scroll-mt-24 prose-headings:font-semibold prose-headings:text-slate-950
                prose-p:text-slate-700
                prose-strong:text-slate-950
                prose-a:text-sky-700 hover:prose-a:text-sky-800
                prose-ul:my-5 prose-ul:ml-6 prose-ul:list-disc
                prose-ol:my-5 prose-ol:ml-6 prose-ol:list-decimal
                prose-li:my-2 prose-li:text-slate-700
                prose-li:[display:list-item]
                prose-ul:[list-style-type:disc]
                prose-ol:[list-style-type:decimal]
              "
            >
              {children}
            </div>
          </div>
        </div>
      </section>
    </PressureCalLayout>
  );
}
