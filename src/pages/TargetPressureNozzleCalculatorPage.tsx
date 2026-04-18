import { Helmet } from "react-helmet-async";
import BackToTopButton from "../components/BackToTopButton";
import PressureCalLayout from "../components/PressureCalLayout";
import TargetPressureNozzleCalculator from "../components/TargetPressureNozzleCalculator";

export default function TargetPressureNozzleCalculatorPage() {
  return (
    <>
      <Helmet>
        <title>Target Pressure Nozzle Calculator | PressureCal</title>
        <meta
          name="description"
          content="Enter your pump flow and target pressure to find the nozzle size that best matches your setup."
        />
        <link
          rel="canonical"
          href="https://pressurecal.com/target-pressure-nozzle-calculator"
        />
        <meta
          property="og:title"
          content="Target Pressure Nozzle Calculator | PressureCal"
        />
        <meta
          property="og:description"
          content="Enter your pump flow and target pressure to find the nozzle size that best matches your setup."
        />
        <meta
          property="og:url"
          content="https://pressurecal.com/target-pressure-nozzle-calculator"
        />
        <meta property="og:type" content="website" />
        <meta
          name="twitter:title"
          content="Target Pressure Nozzle Calculator | PressureCal"
        />
        <meta
          name="twitter:description"
          content="Enter your pump flow and target pressure to find the nozzle size that best matches your setup."
        />
      </Helmet>

      <PressureCalLayout>
        <div className="-mx-4 -my-8 bg-slate-100 px-4 py-8 sm:-my-10 sm:py-10">
          <TargetPressureNozzleCalculator />
          <BackToTopButton />
        </div>
      </PressureCalLayout>
    </>
  );
}