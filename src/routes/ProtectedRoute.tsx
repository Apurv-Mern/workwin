import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "../types/Auth";
import { useAppSelector } from "../hooks/reduxHooks";

interface ProtectedRouteProps {
  requiredRole?: UserRole;
  requiredPermissions?: string[];
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Check if user has required role
  // if (requiredRole && !hasRole(user, requiredRole)) {
  //   return <Navigate to="/unauthorized" />;
  // }

  // Check permissions if needed
  // if (requiredPermissions.length > 0 && !hasPermissions(user, requiredPermissions)) {
  //   return <Navigate to="/unauthorized" />;
  // }

  // Return children if provided, otherwise render Outlet for nested routes
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
