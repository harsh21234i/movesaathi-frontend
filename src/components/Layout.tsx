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
          { to: "/driver/requests", label: "Nearby requests", description: "Go online and accept live pickups" },
          { to: "/driver/rides", label: "Manage rides", description: "Edit routes and inspect passengers" },
          { to: "/ai", label: "Moove AI", description: "LLM tools and safety automation" },
          { to: "/notifications", label: "Notifications", description: "Read backend booking updates" },
          { to: "/account", label: "Account", description: "Profile, password, and verification" },
          { to: "/sessions", label: "Sessions", description: "Revoke active logins" },
        ]
      : [
          { to: "/", label: "Dashboard", description: "Ride discovery and booking feed" },
          { to: "/request-ride", label: "Request ride", description: "Create a live pickup for nearby drivers" },
          { to: "/trips", label: "Trips", description: "Upcoming, pending, and completed rides" },
          { to: "/ai", label: "Moove AI", description: "LLM tools and smart trip help" },
          { to: "/notifications", label: "Notifications", description: "Read backend booking updates" },
          { to: "/account", label: "Account", description: "Profile and password controls" },
          { to: "/sessions", label: "Sessions", description: "Revoke active logins" },
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
              ? "Publish routes, go online for nearby dispatch work, and keep trip coordination moving."
              : "Browse rides or send a live pickup request, then move into booking detail once a driver accepts."}
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

        <nav className="nav-links" aria-label="System">
          <Link className={location.pathname.startsWith("/ops") ? "nav-link active" : "nav-link"} to="/ops">
            <span>System</span>
            <small>Deployment, jobs, support, and audit tools</small>
          </Link>
        </nav>

        <div className="sidebar-note">
          <span className="eyebrow">Daily rhythm</span>
          <p>
            {user?.role === "driver"
              ? "Switch between published routes and live nearby requests without losing passenger context or trip control."
              : "Choose between marketplace browsing and live dispatch depending on how quickly you need a driver."}
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
