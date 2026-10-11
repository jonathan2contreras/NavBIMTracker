import React from "react";
import "@/App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { RoleProvider } from "@/context/RoleContext";
import AppLayout from "@/components/AppLayout";
import ViewerPage from "@/pages/ViewerPage";

// Secondary pages load on demand; the 3D viewer (landing page) stays in the main bundle.
const ObjectsPage = React.lazy(() => import("@/pages/ObjectsPage"));
const PhotosPage = React.lazy(() => import("@/pages/PhotosPage"));
const ProgressPage = React.lazy(() => import("@/pages/ProgressPage"));
const ReportsPage = React.lazy(() => import("@/pages/ReportsPage"));
const TeamsPage = React.lazy(() => import("@/pages/TeamsPage"));

function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/reports" element={<React.Suspense fallback={null}><ReportsPage /></React.Suspense>} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<ViewerPage />} />
            <Route path="/objects" element={<ObjectsPage />} />
            <Route path="/photos" element={<PhotosPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/teams" element={<TeamsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </RoleProvider>
  );
}

export default App;
