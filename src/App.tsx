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
import TargetPressureNozzleCalculatorPage from "./pages/TargetPressureNozzleCalculatorPage";
import AboutPage from "./pages/AboutPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import PressureCalProPage from "./pages/PressureCalProPage";
import SavedSetupsPage from "./pages/SavedSetupsPage";
import CompareSetupsPage from "./pages/CompareSetupsPage";
import AccountPage from "./pages/AccountPage";
import UpdatePasswordPage from "./pages/UpdatePasswordPage";
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
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

          <Route
            path="/pricing"
            element={
              <PageTransition>
                <PressureCalProPage />
              </PageTransition>
            }
          />

          <Route path="/pro" element={<Navigate to="/pricing" replace />} />

          <Route
            path="/account"
            element={
              <PageTransition>
                <AccountPage />
              </PageTransition>
            }
          />

          <Route
            path="/reset-password"
            element={
              <PageTransition>
                <UpdatePasswordPage />
              </PageTransition>
            }
          />

          <Route
            path="/saved-setups"
            element={
              <PageTransition>
                <SavedSetupsPage />
              </PageTransition>
            }
          />

          <Route
            path="/compare-setups"
            element={
              <PageTransition>
                <CompareSetupsPage />
              </PageTransition>
            }
          />

          <Route
            path="/nozzle-size-calculator"
            element={
              <PageTransition>
                <NozzleCalculator />
              </PageTransition>
            }
          />

          <Route
            path="/target-pressure-nozzle-calculator"
            element={
              <PageTransition>
                <TargetPressureNozzleCalculatorPage />
              </PageTransition>
            }
          />

          <Route
            path="/nozzle-size-chart"
            element={
              <PageTransition>
                <NozzleSizeChartPage />
              </PageTransition>
            }
          />

          <Route
            path="/hose-pressure-loss-calculator"
            element={
              <PageTransition>
                <HosePressureLossCalculator />
              </PageTransition>
            }
          />

          <Route
            path="/psi-bar-calculator"
            element={
              <PageTransition>
                <PsiBarCalculatorPage />
              </PageTransition>
            }
          />

          <Route
            path="/lpm-gpm-calculator"
            element={
              <PageTransition>
                <GpmLpmCalculatorPage />
              </PageTransition>
            }
          />

          <Route
            path="/gpm-lpm-calculator"
            element={<Navigate to="/lpm-gpm-calculator" replace />}
          />

          <Route
            path="/about"
            element={
              <PageTransition>
                <AboutPage />
              </PageTransition>
            }
          />

          <Route
            path="/privacy"
            element={
              <PageTransition>
                <PrivacyPolicyPage />
              </PageTransition>
            }
          />

          <Route
            path="/terms"
            element={
              <PageTransition>
                <TermsOfServicePage />
              </PageTransition>
            }
          />
        </Routes>
      </AnimatePresence>
    </div>
  );
}
