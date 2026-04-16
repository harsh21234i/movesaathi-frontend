import { Link, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function getInitials(name?: string | null) {
  if (!name) {
    return "MS";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isDashboard = location.pathname === "/";

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className="sidebar" aria-label="Sidebar">
        <div className="brand-block">
          <span className="eyebrow">Shared mobility platform</span>
          <h1>MooveSaathi</h1>
          <p>Plan rides, publish seats, and move passengers from discovery to chat without friction.</p>
        </div>

        <div className="profile-card profile-card-highlight">
          <div className="profile-identity">
            <div className="profile-avatar">{getInitials(user?.full_name)}</div>
            <div>
              <strong>{user?.full_name}</strong>
              <span>{user?.email}</span>
            </div>
          </div>

          <div className="profile-tags">
            <span className={user?.email_verified ? "status-pill success" : "status-pill warning"}>
              {user?.email_verified ? "Verified account" : "Verification pending"}
            </span>
            <span className="status-pill neutral">Rating {user?.rating?.toFixed(1) ?? "New"}</span>
          </div>

          <div className="profile-meta">
            <div>
              <span>Phone</span>
              <strong>{user?.phone_number || "Add on next profile pass"}</strong>
            </div>
            <div>
              <span>Bio</span>
              <strong>{user?.bio || "No driver note added yet"}</strong>
            </div>
          </div>
        </div>

        <nav className="nav-links" aria-label="Primary">
          <Link className={isDashboard ? "nav-link active" : "nav-link"} to="/">
            <span>Dashboard</span>
            <small>Ride board and publish flow</small>
          </Link>
        </nav>

        <div className="sidebar-note">
          <span className="eyebrow">Daily rhythm</span>
          <p>Keep at least one live ride updated, answer booking chats quickly, and use notes to reduce passenger uncertainty.</p>
        </div>

        <button className="ghost-button sidebar-logout" onClick={() => void logout()}>
          Logout
        </button>
      </aside>

      <main className="content" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
