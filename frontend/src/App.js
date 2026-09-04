import React, { useState } from "react";
import "@/App.css";
import { AnimatePresence } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { RoleProvider, useRole } from "@/context/RoleContext";
import AppLayout from "@/components/AppLayout";
import { SplashScreen } from "@/components/SplashScreen";
import LoginPage from "@/pages/LoginPage";
import ViewerPage from "@/pages/ViewerPage";
import ObjectsPage from "@/pages/ObjectsPage";
import PhotosPage from "@/pages/PhotosPage";
import ProgressPage from "@/pages/ProgressPage";
import ReportsPage from "@/pages/ReportsPage";
import SplashDemo from "@/pages/SplashDemo";

// Chosen intro presentation. Options: "sequence" | "stack" | "slide" | "zoom"
const SPLASH_VARIANT = "stack";

const GuardedReports = () => {
  const { role } = useRole();
  if (!role) return <Navigate to="/login" replace />;
  return <ReportsPage />;
};

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <RoleProvider>
      <AnimatePresence>
        {showSplash && <SplashScreen variant={SPLASH_VARIANT} onFinish={() => setShowSplash(false)} />}
      </AnimatePresence>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reports" element={<GuardedReports />} />
          <Route path="/splash-demo" element={<SplashDemo />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<ViewerPage />} />
            <Route path="/objects" element={<ObjectsPage />} />
            <Route path="/photos" element={<PhotosPage />} />
            <Route path="/progress" element={<ProgressPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </RoleProvider>
  );
}

export default App;
