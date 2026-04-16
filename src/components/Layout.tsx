import { Link, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="eyebrow">Operations cockpit</span>
          <h1>MooveSaathi</h1>
          <p>Ride-sharing for reliable city-to-city travel with production-grade auth and recovery flows.</p>
        </div>
        <nav className="nav-links">
          <Link to="/">Dashboard</Link>
        </nav>
        <div className="profile-card">
          <strong>{user?.full_name}</strong>
          <span>{user?.email}</span>
          <span>{user?.email_verified ? "Email verified" : "Email verification pending"}</span>
          <span>Rating: {user?.rating?.toFixed(1)}</span>
          <button className="ghost-button" onClick={() => void logout()}>
            Logout
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
