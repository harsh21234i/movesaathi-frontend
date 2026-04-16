import { DriverDashboardPage } from "./DriverDashboardPage";
import { PassengerDashboardPage } from "./PassengerDashboardPage";
import { useAuth } from "../context/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === "driver") {
    return <DriverDashboardPage />;
  }

  return <PassengerDashboardPage />;
}
