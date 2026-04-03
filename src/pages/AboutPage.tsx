import { Link } from "react-router-dom";

const differentiators = [
  {
    title: "Built for real operator decisions",
    body:
      "PressureCal is designed around practical setup questions operators actually ask in the field — nozzle size, hose loss, and what pressure and flow you are likely to see at the gun.",
  },
  {
    title: "More than a simple converter",
    body:
      "Basic calculators usually stop at PSI, BAR, GPM, or L/min conversions. PressureCal is built to model how those values interact across the system so users can make better setup decisions with more context.",
  },
  {
    title: "Clear outputs, not unnecessary complexity",
    body:
      "The goal is not to drown users in engineering jargon. The goal is to give pressure washing operators practical, readable outputs that help them work more confidently and verify their setup faster.",
  },
];

const audiences = [
  "Pressure washing operators",
  "Contractors and small business owners",
  "Technicians building or checking rigs",
  "Dealers and equipment specialists",
  "Anyone who wants a clearer picture of real-world setup performance",
];

export default function AboutPage() {
  return (
    <div className="bg-slate-950 text-slate-100">
      <section className="border-b border-white/10 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="max-w-3xl">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
                About PressureCal
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
                A pressure washer calculator built for real operators.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-300">
                PressureCal is a practical pressure washing calculator and modelling tool
                built to help users estimate nozzle sizing, hose pressure loss, and
                real at-gun performance more clearly.
              </p>
              <p className="mt-4 text-base leading-7 text-slate-300">
                It exists because too many setup decisions are still made with rough
                guesses, incomplete charts, or basic unit converters that do not reflect
                what happens across a real system. PressureCal is built to bridge that
                gap with more useful field-focused modelling and cleaner outputs.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/"
                  className="inline-flex items-center rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                >
                  Open PressureCal
                </Link>
                <Link
                  to="/terms"
                  className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/10"
                >
                  Read terms
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-400">Primary use</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Pressure washer modelling
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-400">Built for</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Practical field use
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-400">Core focus</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Nozzles, hose loss, at-gun performance
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-400">Approach</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Clear outputs with credible assumptions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:px-8 md:py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {differentiators.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-black/10"
            >
              <h2 className="text-xl font-semibold text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:px-8 md:py-20 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
              Why it exists
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              Better setup decisions start with better visibility.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-300">
              PressureCal was created to make pressure washing calculations more useful,
              more understandable, and more relevant to real operating conditions.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Instead of treating pressure washing as a few disconnected numbers,
              PressureCal is built around the idea that the system matters. The pump,
              hose, restriction, and nozzle all influence the result. That is the gap
              PressureCal is intended to help users understand more clearly.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-300">
              The platform starts with Australian operators in mind, including the way
              many users actually reference machine performance in the field. Over time,
              it is intended to support a broader international audience as well.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Who it is for
            </p>
            <ul className="mt-5 space-y-3">
              {audiences.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:px-8 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-semibold text-white">Free and Pro</h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              PressureCal is designed to offer a useful free experience while also
              supporting a PressureCal Pro subscription for users who want additional
              features such as saved setups, more advanced workflows, or future
              pro-level functionality.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-300">
              The aim is to keep the platform practical and trustworthy first — with
              paid features built around convenience, workflow, and depth rather than
              artificially restricting core understanding.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-semibold text-white">A sensible note on outputs</h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              PressureCal is intended as an estimation and modelling tool. Its outputs
              can help users understand likely setup behaviour, but they do not replace
              equipment inspection, gauge verification, manufacturer guidance, safe
              operating practices, or trained technical judgment.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-300">
              That balance matters. A good calculator should be useful without pretending
              to remove responsibility from the operator.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
