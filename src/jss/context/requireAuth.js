import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./authContext";

const ADMIN_EMAIL = "admin@mail.com";

export default function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();     // ✔️ doğru isimler

  if (loading) return null;                // hâlâ kontrol ediliyor

  if (!user) return <Navigate to="/" replace />;

  const isAdmin = user.email === ADMIN_EMAIL;

  if (role === "admin" && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (role === "user"  &&  isAdmin) return <Navigate to="/admin"     replace />;

  return children;
}
