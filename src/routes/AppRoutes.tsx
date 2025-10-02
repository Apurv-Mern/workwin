import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

// Lazy load the components
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Login = lazy(() => import("../pages/Login"));
const Users = lazy(() => import("../pages/Users"));
const RoleManagement = lazy(() => import("../pages/RoleManagement"));
const XpSystem = lazy(() => import("../pages/XpSystem"));
const LeaderBoard = lazy(() => import("../pages/LeaderBoard"));
const Reward = lazy(() => import("../pages/Reward"));
const MiniSpinWheel = lazy(() => import("../pages/MiniSpinWheel"));
const BigSpinWheel = lazy(() => import("../pages/BigSpinWheel"));
const BonusSeason = lazy(() => import("../pages/BonusSeason"));
const XpThresholds = lazy(() => import("../pages/XpThresholds"));

// Loading fallback
const LoadingFallback = () => (
  <div className="d-flex justify-content-center align-items-center vh-100">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Protected routes with AdminLayout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="role/management" element={<RoleManagement />} />
          <Route path="xp-system" element={<XpSystem />} />
          <Route path="leaderboard" element={<LeaderBoard />} />
          <Route path="reward" element={<Reward />} />
          <Route path="mini-spin-wheel" element={<MiniSpinWheel />} />
          <Route path="big-spin-wheel" element={<BigSpinWheel />} />
          <Route path="bonus-season" element={<BonusSeason />} />
          <Route path="xp-thresholds" element={<XpThresholds />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
