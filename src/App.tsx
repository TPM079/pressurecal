import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import HomePage from "./pages/HomePage";
import FullRigCalculatorPage from "./pages/FullRigCalculator";
import AdminFeedbackPage from "./pages/AdminFeedbackPage";
import NozzleCalculator from "./pages/NozzleCalculator";
import NozzleSizeChartPage from "./pages/NozzleSizeChartPage";
import HosePressureLossCalculator from "./pages/HosePressureLossCalculator";
import PsiBarCalculatorPage from "./pages/PsiBarCalculatorPage";
import GpmLpmCalculatorPage from "./pages/GpmLpmCalculatorPage";

function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      window.scrollTo(0, 0);
      return;
    }

    if (navigationType !== "POP") {
      window.scrollTo(0, 0);
    }
  }, [location, navigationType]);

  return null;
}

export default function App() {
  const location = useLocation();

  return (
    <>
      <ScrollManager />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <HomePage />
              </PageTransition>
            }
          />

          <Route
            path="/calculator"
            element={
              <PageTransition>
                <FullRigCalculatorPage />
              </PageTransition>
            }
          />

          <Route
            path="/admin-feedback"
            element={
              <PageTransition>
                <AdminFeedbackPage />
              </PageTransition>
            }
          />

          <Route path="/nozzle-size-calculator" element={<NozzleCalculator />} />
          <Route path="/nozzle-size-chart" element={<NozzleSizeChartPage />} />
          <Route
            path="/hose-pressure-loss-calculator"
            element={<HosePressureLossCalculator />}
          />
          <Route path="/psi-bar-calculator" element={<PsiBarCalculatorPage />} />
          <Route path="/lpm-gpm-calculator" element={<GpmLpmCalculatorPage />} />

          <Route
            path="/gpm-lpm-calculator"
            element={<Navigate to="/lpm-gpm-calculator" replace />}
          />
        </Routes>
      </AnimatePresence>
    </>
  );
}
