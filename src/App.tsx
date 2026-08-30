import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { useAuth } from "./context/AuthContext";

const AccountPage = lazy(() => import("./pages/AccountPage").then((module) => ({ default: module.AccountPage })));
const AIHubPage = lazy(() => import("./pages/AIHubPage").then((module) => ({ default: module.AIHubPage })));
const BookingDetailPage = lazy(() => import("./pages/BookingDetailPage").then((module) => ({ default: module.BookingDetailPage })));
const ChatPage = lazy(() => import("./pages/ChatPage").then((module) => ({ default: module.ChatPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const DriverRideManagementPage = lazy(() =>
  import("./pages/DriverRideManagementPage").then((module) => ({ default: module.DriverRideManagementPage })),
);
const DriverRequestsPage = lazy(() => import("./pages/DriverRequestsPage").then((module) => ({ default: module.DriverRequestsPage })));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage").then((module) => ({ default: module.ForgotPasswordPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then((module) => ({ default: module.NotificationsPage })));
const OperationsPage = lazy(() => import("./pages/OperationsPage").then((module) => ({ default: module.OperationsPage })));
const PassengerRequestPage = lazy(() => import("./pages/PassengerRequestPage").then((module) => ({ default: module.PassengerRequestPage })));
const PassengerTripsPage = lazy(() => import("./pages/PassengerTripsPage").then((module) => ({ default: module.PassengerTripsPage })));
const PublicTripPage = lazy(() => import("./pages/PublicTripPage").then((module) => ({ default: module.PublicTripPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage").then((module) => ({ default: module.ResetPasswordPage })));
const RideDetailPage = lazy(() => import("./pages/RideDetailPage").then((module) => ({ default: module.RideDetailPage })));
const SessionsPage = lazy(() => import("./pages/SessionsPage").then((module) => ({ default: module.SessionsPage })));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage").then((module) => ({ default: module.VerifyEmailPage })));

function RouteFallback() {
  return (
    <div className="screen-state">
      <div className="state-card">
        <span className="eyebrow">Loading route</span>
        <h2>Preparing this workspace</h2>
        <p>MooveSaathi is loading only the code needed for this screen.</p>
      </div>
    </div>
  );
}

export default function App() {
  const { token } = useAuth();

  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/register" element={token ? <Navigate to="/" replace /> : <RegisterPage />} />
          <Route path="/forgot-password" element={token ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />
          <Route path="/reset-password" element={token ? <Navigate to="/" replace /> : <ResetPasswordPage />} />
          <Route path="/verify-email" element={token ? <Navigate to="/" replace /> : <VerifyEmailPage />} />
          <Route path="/share/:shareToken" element={<PublicTripPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="rides/:rideId" element={<RideDetailPage />} />
            <Route path="ai" element={<AIHubPage />} />
            <Route path="bookings/:bookingId" element={<BookingDetailPage />} />
            <Route path="chat/:bookingId" element={<ChatPage />} />
            <Route path="request-ride" element={<PassengerRequestPage />} />
            <Route path="driver/rides" element={<DriverRideManagementPage />} />
            <Route path="driver/requests" element={<DriverRequestsPage />} />
            <Route path="trips" element={<PassengerTripsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="ops" element={<OperationsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}
