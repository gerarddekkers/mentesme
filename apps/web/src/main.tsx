import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./globals.css";

import { isAuthenticated } from "./lib/auth";
import { isConfigured } from "./lib/config";

import Login from "./pages/Login";
import Callback from "./pages/Callback";
import Setup from "./pages/Setup";
import Clienten from "./pages/Clienten";
import Dossier from "./pages/Dossier";
import Section from "./pages/Section";
import Verslag from "./pages/Verslag";

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isConfigured()) return <Navigate to="/setup" replace />;
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<Callback />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/" element={<Navigate to="/clienten" replace />} />
        <Route path="/clienten" element={<RequireAuth><Clienten /></RequireAuth>} />
        <Route path="/clienten/:id" element={<RequireAuth><Dossier /></RequireAuth>} />
        <Route path="/clienten/:id/verslag" element={<RequireAuth><Verslag /></RequireAuth>} />
        <Route path="/clienten/:id/:section" element={<RequireAuth><Section /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/clienten" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
