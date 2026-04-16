import { Link, Outlet, useLocation } from "react-router-dom";

import { ToastViewport } from "./ToastViewport";
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

  const navItems =
    user?.role === "driver"
      ? [
          { to: "/", label: "Dashboard", description: "Driver overview and approvals" },
          { to: "/driver/rides", label: "Manage rides", description: "Edit routes and inspect passengers" },
        ]
      : [
          { to: "/", label: "Dashboard", description: "Ride discovery and booking feed" },
          { to: "/trips", label: "Trips", description: "Upcoming, pending, and completed rides" },
        ];

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className="sidebar" aria-label="Sidebar">
        <div className="brand-block">
          <span className="eyebrow">{user?.role === "driver" ? "Driver workspace" : "Passenger workspace"}</span>
          <h1>MooveSaathi</h1>
          <p>
            {user?.role === "driver"
              ? "Publish rides, review booking requests, and keep coordination moving."
              : "Discover routes, track your bookings, and jump into chat once a ride is confirmed."}
          </p>
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
            <span className="status-pill neutral">{user?.role === "driver" ? "Driver account" : "Passenger account"}</span>
          </div>

          <div className="profile-meta">
            <div>
              <span>Phone</span>
              <strong>{user?.phone_number || "Add on next profile pass"}</strong>
            </div>
            <div>
              <span>Bio</span>
              <strong>{user?.bio || "No profile note added yet"}</strong>
            </div>
          </div>
        </div>

        <nav className="nav-links" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} className={isActive ? "nav-link active" : "nav-link"} to={item.to}>
                <span>{item.label}</span>
                <small>{item.description}</small>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-note">
          <span className="eyebrow">Daily rhythm</span>
          <p>
            {user?.role === "driver"
              ? "Keep routes accurate, update passengers quickly, and use the ride detail pages to avoid fragmented operations."
              : "Move from discovery to booking detail to chat without losing route context or status visibility."}
          </p>
        </div>

        <button className="ghost-button sidebar-logout" onClick={() => void logout()}>
          Logout
        </button>
      </aside>

      <main className="content" id="main-content" tabIndex={-1}>
        <ToastViewport />
        <Outlet />
      </main>
    </div>
  );
}
