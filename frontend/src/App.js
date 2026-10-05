import React from "react";
import "@/App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { RoleProvider } from "@/context/RoleContext";
import AppLayout from "@/components/AppLayout";
import ViewerPage from "@/pages/ViewerPage";
import ObjectsPage from "@/pages/ObjectsPage";
import PhotosPage from "@/pages/PhotosPage";
import ProgressPage from "@/pages/ProgressPage";
import ReportsPage from "@/pages/ReportsPage";
import TeamsPage from "@/pages/TeamsPage";

function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/reports" element={<ReportsPage />} />
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
