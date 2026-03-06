import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App";
import NozzleCalculator from "./pages/NozzleCalculator";
import HosePressureLossCalculator from "./pages/HosePressureLossCalculator";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>

      <Routes>
        <Route path="/" element={<App />} />

        <Route
          path="/nozzle-size-calculator"
          element={<NozzleCalculator />}
        />

        <Route
          path="/hose-pressure-loss-calculator"
          element={<HosePressureLossCalculator />}
        />

      </Routes>

    </BrowserRouter>
  </React.StrictMode>
);