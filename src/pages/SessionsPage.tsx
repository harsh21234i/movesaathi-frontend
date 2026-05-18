import axios from "axios";
import { useEffect, useState } from "react";

import { fetchSessions, revokeSession } from "../api/auth";
import { EmptyState } from "../components/EmptyState";
import type { SessionSummary } from "../types";

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SessionsPage() {
  const [items, setItems] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyJti, setBusyJti] = useState<string | null>(null);

  async function loadSessions() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchSessions();
      setItems(response.items);
    } catch (loadError) {
      setError(
        axios.isAxiosError(loadError)
          ? String(loadError.response?.data?.detail ?? "Unable to load sessions.")
          : "Unable to load sessions.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  return (
    <section className="detail-stack">
      <div className="detail-hero panel">
        <div>
          <span className="eyebrow">Sessions</span>
          <h2>Account session management</h2>
          <p>Review active refresh sessions and revoke any device you no longer trust.</p>
        </div>
      </div>

      {error ? (
        <div className="form-alert error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="panel">
        {isLoading ? <p>Loading session list...</p> : null}
        {!isLoading && items.length ? (
          <div className="booking-board">
            {items.map((session) => (
              <article key={session.jti} className="booking-card">
                <div>
                  <strong>{session.jti}</strong>
                  <p>Issued: {formatDate(session.issued_at)}</p>
                  <p>Expires: {formatDate(session.expires_at)}</p>
                </div>
                <div className="booking-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={busyJti === session.jti}
                    onClick={async () => {
                      setBusyJti(session.jti);
                      try {
                        await revokeSession(session.jti);
                        await loadSessions();
                      } finally {
                        setBusyJti(null);
                      }
                    }}
                  >
                    Revoke
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!isLoading && !items.length && !error ? (
          <EmptyState title="No active sessions" description="New logins will appear here once you sign in again on another device." />
        ) : null}
      </div>
    </section>
  );
}
