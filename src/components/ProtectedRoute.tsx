import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, isReady } = useAuth();
  if (!isReady) {
    return (
      <div className="screen-state">
        <div className="state-card">
          <span className="eyebrow">Session restore</span>
          <h2>Loading your account</h2>
          <p>The frontend is checking your backend session and refreshing tokens if needed.</p>
        </div>
      </div>
    );
  }
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}
