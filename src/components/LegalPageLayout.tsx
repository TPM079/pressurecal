import type { ReactNode } from "react";
import { Link } from "react-router-dom";

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
    <div className="bg-slate-950 text-slate-100">
      <section className="border-b border-white/10 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
        <div className="mx-auto max-w-5xl px-6 py-16 md:px-8 md:py-20">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
              {eyebrow}
            </p>

            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
              {title}
            </h1>

            <p className="mt-5 text-base leading-7 text-slate-300 md:text-lg">
              {intro}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/"
                className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/10"
              >
                Back to home
              </Link>

              <Link
                to="/terms"
                className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
              >
                Terms
              </Link>

              <Link
                to="/privacy"
                className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-16">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20 backdrop-blur md:p-10">
            <div
              className="
                prose prose-invert prose-slate max-w-none
                prose-headings:scroll-mt-24 prose-headings:font-semibold
                prose-p:text-slate-300
                prose-strong:text-white
                prose-a:text-sky-300 hover:prose-a:text-sky-200
                prose-ul:my-5 prose-ul:ml-6 prose-ul:list-disc
                prose-ol:my-5 prose-ol:ml-6 prose-ol:list-decimal
                prose-li:my-2 prose-li:text-slate-300
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
    </div>
  );
}
