import axios from "axios";
import { useEffect, useState } from "react";

import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../api/notifications";
import { EmptyState } from "../components/EmptyState";
import type { Notification } from "../types";

function formatNotificationTime(value: string) {
  return new Date(value).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function loadNotifications() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchNotifications({ limit: 50 });
      setItems(response.items);
      setUnreadCount(response.unread_count);
    } catch (loadError) {
      setError(
        axios.isAxiosError(loadError)
          ? String(loadError.response?.data?.detail ?? "Unable to load notifications.")
          : "Unable to load notifications.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  return (
    <section className="detail-stack">
      <div className="detail-hero panel">
        <div>
          <span className="eyebrow">Notifications</span>
          <h2>Backend notification inbox</h2>
          <p>Read trip updates, booking changes, and background events without relying on browser toasts alone.</p>
        </div>
        <div className="profile-tags">
          <span className="status-pill neutral-dark">{unreadCount} unread</span>
          <button
            className="ghost-button"
            type="button"
            disabled={!unreadCount}
            onClick={async () => {
              setBusyId(-1);
              try {
                await markAllNotificationsRead();
                await loadNotifications();
              } finally {
                setBusyId(null);
              }
            }}
          >
            Mark all read
          </button>
        </div>
      </div>

      {error ? (
        <div className="form-alert error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="panel">
        {isLoading ? <p>Loading notification feed...</p> : null}
        {!isLoading && items.length ? (
          <div className="booking-board">
            {items.map((notification) => (
              <article key={notification.id} className={`booking-card ${notification.is_read ? "selected-card" : ""}`}>
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.body}</p>
                  <p>{formatNotificationTime(notification.created_at)}</p>
                </div>
                <div className="booking-actions">
                  <span className={`status-pill ${notification.is_read ? "neutral-dark" : "success"}`}>
                    {notification.is_read ? "read" : "new"}
                  </span>
                  {!notification.is_read ? (
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={busyId === notification.id}
                      onClick={async () => {
                        setBusyId(notification.id);
                        try {
                          await markNotificationRead(notification.id);
                          await loadNotifications();
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!isLoading && !items.length && !error ? (
          <EmptyState title="No notifications yet" description="Trip updates, reminders, and booking events will appear here." />
        ) : null}
      </div>
    </section>
  );
}
