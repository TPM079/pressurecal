import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import PressureCalLayout from "../components/PressureCalLayout";

const differentiators = [
  {
    title: "Built for pressure washing operators",
    body:
      "PressureCal is designed around practical setup questions pressure washing operators actually ask in the field — nozzle size, hose loss, and what pressure and flow you are likely to see at the gun.",
  },
  {
    title: "More than a simple converter",
    body:
      "Basic tools usually stop at PSI, BAR, GPM, or LPM conversions. PressureCal is built to model how those values interact across the setup so users can make better decisions with more context.",
  },
  {
    title: "Clear outputs, not unnecessary complexity",
    body:
      "The goal is not to drown users in engineering jargon. The goal is to give pressure washing operators practical, readable outputs that help them work more confidently and check their setup faster.",
  },
];

const audiences = [
  "Pressure washing operators",
  "Contractors and small business owners",
  "Technicians building or checking setups",
  "Dealers and equipment specialists",
  "Anyone who wants a clearer picture of real-world setup performance",
];

export default function AboutPage() {
  return (
    <PressureCalLayout>
      <Helmet>
        <title>About PressureCal</title>
        <meta
          name="description"
          content="Learn what PressureCal is, who it is for, and why it exists. PressureCal is a practical pressure washer setup tool built for pressure washing operators."
        />
        <link rel="canonical" href="https://www.pressurecal.com/about" />
      </Helmet>

      <section className="-mx-4 border-b border-slate-200 bg-slate-100 px-4">
        <div className="mx-auto max-w-6xl py-14 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
                About PressureCal
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Pressure washer setup modelling built for pressure washing operators.
              </h1>

              <p className="mt-6 text-lg leading-8 text-slate-700">
                PressureCal is a practical pressure washer setup tool built to help users
                check nozzle sizing, hose pressure loss, and real at-gun performance more clearly.
              </p>

              <p className="mt-4 text-base leading-7 text-slate-600">
                It exists because too many setup decisions are still made with rough guesses,
                incomplete charts, or basic unit converters that do not reflect what happens
                across a real system. PressureCal is built to bridge that gap with more useful
                field-focused modelling and cleaner outputs.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/calculator"
                  className="inline-flex items-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open Full Setup Calculator
                </Link>
                <Link
                  to="/terms"
                  className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Read terms
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Primary use</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    Pressure washer setup modelling
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Built for</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    Pressure washing operators
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Core focus</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    Nozzle sizing, hose loss, at-gun performance
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Approach</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    Clear outputs with credible assumptions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="-mx-4 bg-white px-4">
        <div className="mx-auto max-w-6xl py-12 sm:py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {differentiators.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-xl font-semibold text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="-mx-4 border-y border-slate-200 bg-slate-50 px-4">
        <div className="mx-auto grid max-w-6xl gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              Why it exists
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              Better setup decisions start with better visibility.
            </h2>

            <p className="mt-5 text-base leading-7 text-slate-600">
              PressureCal was created to make pressure washer setup checks more useful,
              more understandable, and more relevant to real operating conditions.
            </p>

            <p className="mt-4 text-base leading-7 text-slate-600">
              Instead of treating pressure washing as a few disconnected numbers,
              PressureCal is built around the idea that the system matters. The pump,
              hose, restriction, and nozzle all influence the result. That is the gap
              PressureCal is intended to help users understand more clearly.
            </p>

            <p className="mt-4 text-base leading-7 text-slate-600">
              The platform starts with Australian operators in mind, including the way
              many users actually reference machine performance in the field. Over time,
              it is intended to support a broader international audience as well.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Who it is for
            </p>

            <ul className="mt-5 space-y-3">
              {audiences.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="-mx-4 bg-white px-4">
        <div className="mx-auto max-w-6xl py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-950">Free and Pro</h2>

              <p className="mt-4 text-base leading-7 text-slate-600">
                PressureCal is designed to offer a useful free experience while also
                supporting PressureCal Pro for users who want saved setups, stronger
                workflow tools, and more repeat-use convenience.
              </p>

              <p className="mt-4 text-base leading-7 text-slate-600">
                The aim is to keep the platform practical and trustworthy first — with
                paid features built around convenience, workflow, and depth rather than
                artificially restricting core understanding.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-950">A sensible note on outputs</h2>

              <p className="mt-4 text-base leading-7 text-slate-600">
                PressureCal is intended as an estimation and modelling tool. Its outputs
                can help users understand likely setup behaviour, but they do not replace
                equipment inspection, gauge verification, manufacturer guidance, safe
                operating practices, or trained technical judgment.
              </p>

              <p className="mt-4 text-base leading-7 text-slate-600">
                That balance matters. A good setup tool should be useful without pretending
                to remove responsibility from the operator.
              </p>
            </div>
          </div>
        </div>
      </section>
    </PressureCalLayout>
  );
}

