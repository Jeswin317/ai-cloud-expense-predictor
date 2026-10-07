import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "./AppContext";
import Layout from "./components/Layout";
import Analytics from "./pages/Analytics";
import Anomalies from "./pages/Anomalies";
import Dashboard from "./pages/Dashboard";
import Predictions from "./pages/Predictions";
import SettingsPage from "./pages/Settings";
import UploadPage from "./pages/Upload";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/anomalies" element={<Anomalies />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>,
);
