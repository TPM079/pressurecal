import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import BackToTopButton from "../components/BackToTopButton";
import PressureCalLayout from "../components/PressureCalLayout";
import TargetPressureNozzleCalculator from "../components/TargetPressureNozzleCalculator";

export default function TargetPressureNozzleCalculatorPage() {
  return (
    <>
      <Helmet>
        <title>
          Target Pressure Nozzle Calculator | Find Nozzle Size from PSI & LPM | PressureCal
        </title>
        <meta
          name="description"
          content="Enter your pump flow and target pressure to find the nozzle size that best matches your setup. Useful for working backwards from your target PSI before changing nozzle size."
        />
        <link
          rel="canonical"
          href="https://www.pressurecal.com/target-pressure-nozzle-calculator"
        />
        <meta
          property="og:title"
          content="Target Pressure Nozzle Calculator | Find Nozzle Size from PSI & LPM | PressureCal"
        />
        <meta
          property="og:description"
          content="Enter your pump flow and target pressure to find the nozzle size that best matches your setup. Useful for working backwards from your target PSI before changing nozzle size."
        />
        <meta
          property="og:url"
          content="https://www.pressurecal.com/target-pressure-nozzle-calculator"
        />
        <meta property="og:type" content="website" />
        <meta
          name="twitter:title"
          content="Target Pressure Nozzle Calculator | Find Nozzle Size from PSI & LPM | PressureCal"
        />
        <meta
          name="twitter:description"
          content="Enter your pump flow and target pressure to find the nozzle size that best matches your setup. Useful for working backwards from your target PSI before changing nozzle size."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Target Pressure Nozzle Calculator",
            url: "https://www.pressurecal.com/target-pressure-nozzle-calculator",
            applicationCategory: "Calculator",
            operatingSystem: "Web",
            description:
              "Enter your pump flow and target pressure to find the nozzle size that best matches your setup. Useful for working backwards from your target PSI before changing nozzle size.",
          })}
        </script>
      </Helmet>

      <PressureCalLayout>
        <div className="-mx-4 -my-8 bg-slate-100 px-4 py-8 sm:-my-10 sm:py-10">
          <div className="mx-auto max-w-5xl space-y-8">
            <TargetPressureNozzleCalculator />

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Why use a target pressure nozzle calculator?
              </h2>

              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
                <p>
                  This tool works backwards from the pressure you want to run and the flow
                  your machine can deliver. Instead of only checking what a nozzle does to
                  the machine, it helps you start with the operating pressure you are aiming
                  for and then find the nozzle size that best matches it.
                </p>

                <p>
                  That makes it useful when you are trying to calm a setup down, reduce
                  pressure for a particular job, or compare nozzle options before buying
                  parts. It is also a practical way to check whether a pressure target is
                  realistic for the flow your machine is actually producing.
                </p>

                <p>
                  PressureCal keeps PSI and LPM first, with BAR and GPM still available
                  when you need to compare mixed-spec pumps, manuals, or overseas parts.
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Common use case
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Pump flow
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">15 LPM</p>
                  <p className="mt-1 text-sm text-slate-500">(3.96 GPM)</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Target pressure
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">3000 PSI</p>
                  <p className="mt-1 text-sm text-slate-500">(207 BAR)</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-800">
                  What this tool helps with
                </p>
                <p className="mt-3 text-sm leading-6 text-blue-900">
                  If a 15 LPM machine needs to run closer to 3000 PSI instead of full rated
                  pressure, this calculator helps you work back to the nozzle size that best
                  matches that target. It is a faster way to compare options before changing
                  nozzles in the field.
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                FAQ
              </h2>

              <div className="mt-5 space-y-5 text-sm leading-7 text-slate-600">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    When should I use this instead of the standard nozzle size calculator?
                  </h3>
                  <p className="mt-2">
                    Use this page when you already know the pressure you want to run and
                    need to work backwards to a nozzle size. Use the standard nozzle size
                    calculator when you want to match a nozzle directly to machine pressure
                    and flow.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Can I use this to reduce pressure for a softer application?
                  </h3>
                  <p className="mt-2">
                    Yes. This is one of the clearest use cases for the tool. You can enter
                    your machine flow and target a lower operating pressure to see which
                    nozzle size moves you closer to that result.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Is nozzle size the only thing that affects real pressure?
                  </h3>
                  <p className="mt-2">
                    No. Hose length, hose ID, fittings, unloaders, and the rest of the setup
                    still affect real operating pressure at the gun. This tool gives you a
                    nozzle target, but the full setup still matters.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    What should I use after I get a nozzle result?
                  </h3>
                  <p className="mt-2">
                    If you want to confirm hose loss, at-gun pressure, and full setup
                    behaviour, move into the related PressureCal tools below.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Related tools
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                Need more than a target-pressure answer? Move into the live tools:
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/nozzle-size-calculator"
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Nozzle Size Calculator
                </Link>

                <Link
                  to="/hose-pressure-loss-calculator"
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Hose Pressure Loss Calculator
                </Link>

                <Link
                  to="/nozzle-size-chart"
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Nozzle Size Chart
                </Link>

                <Link
                  to="/calculator"
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Full Setup Calculator
                </Link>
              </div>
            </section>
          </div>

          <BackToTopButton />
        </div>
      </PressureCalLayout>
    </>
  );
}
