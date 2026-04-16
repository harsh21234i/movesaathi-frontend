import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { BookingDetailPage } from "./pages/BookingDetailPage";
import { ChatPage } from "./pages/ChatPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DriverRideManagementPage } from "./pages/DriverRideManagementPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { PassengerTripsPage } from "./pages/PassengerTripsPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { RideDetailPage } from "./pages/RideDetailPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";

export default function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={token ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="/forgot-password" element={token ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />
      <Route path="/reset-password" element={token ? <Navigate to="/" replace /> : <ResetPasswordPage />} />
      <Route path="/verify-email" element={token ? <Navigate to="/" replace /> : <VerifyEmailPage />} />
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
        <Route path="bookings/:bookingId" element={<BookingDetailPage />} />
        <Route path="chat/:bookingId" element={<ChatPage />} />
        <Route path="driver/rides" element={<DriverRideManagementPage />} />
        <Route path="trips" element={<PassengerTripsPage />} />
      </Route>
    </Routes>
  );
}
