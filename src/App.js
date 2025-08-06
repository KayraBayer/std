import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {AuthProvider} from "./jss/context/authContext"
import Login          from "./jss/login";
import AdminDashboard from "./jss/adminDashboard";
import UserDashboard  from "./jss/userDashboard";
import RequireAuth    from "./jss/context/requireAuth";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <main className="min-h-screen bg-[#0d0d0d]">
          <Suspense fallback={null}>
            <Routes>
              {/* giriş */}
              <Route path="/" element={<Login />} />

              {/* korumalı sayfalar */}
              <Route
                path="/admin"
                element={
                  <RequireAuth role="admin">
                    <AdminDashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth role="user">
                    <UserDashboard />
                  </RequireAuth>
                }
              />

              {/* eşleşmeyen rota */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
