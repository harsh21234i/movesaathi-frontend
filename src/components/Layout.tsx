import { Link, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <h1>MooveSaathi</h1>
          <p>Ride-sharing for reliable city-to-city travel.</p>
        </div>
        <nav className="nav-links">
          <Link to="/">Dashboard</Link>
        </nav>
        <div className="profile-card">
          <strong>{user?.full_name}</strong>
          <span>{user?.email}</span>
          <span>Rating: {user?.rating?.toFixed(1)}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
