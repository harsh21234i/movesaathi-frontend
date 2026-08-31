import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { acceptRideRequest, connectDispatchSocket, declineRideRequest, fetchDriverPresence, fetchNearbyRideRequests, upsertDriverPresence } from "../api/dispatch";
import { EmptyState } from "../components/EmptyState";
import { MapPreview } from "../components/MapPreview";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import { useConfirmAction } from "../hooks/useConfirmAction";
import type { DriverPresence, NearbyRideRequest } from "../types";

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.detail ?? fallback);
  }
  return fallback;
}

function formatCompactDate(value: string) {
  return new Date(value).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DriverRequestsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { pushToast } = useNotifications();
  const { confirm, ConfirmDialog } = useConfirmAction();
  const [presence, setPresence] = useState<DriverPresence | null>(null);
  const [nearbyRequests, setNearbyRequests] = useState<NearbyRideRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [decliningRequestId, setDecliningRequestId] = useState<number | null>(null);
  const [dispatchSocketState, setDispatchSocketState] = useState<"connecting" | "connected" | "reconnecting">("connecting");

  async function loadNearbyRequests() {
    setIsRefreshing(true);
    setError(null);
    try {
      setNearbyRequests(await fetchNearbyRideRequests());
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Unable to load nearby dispatch requests."));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function updatePresence(options: { isOnline: boolean; latitude: number; longitude: number; heading?: number | null }) {
    setError(null);
    try {
      const nextPresence = await upsertDriverPresence({
        latitude: options.latitude,
        longitude: options.longitude,
        heading: options.heading ?? null,
        is_online: options.isOnline,
      });
      setPresence(nextPresence);
      if (nextPresence.is_online) {
        await loadNearbyRequests();
      } else {
        setNearbyRequests([]);
      }
    } catch (presenceError) {
      setError(getErrorMessage(presenceError, "Unable to update driver presence."));
    }
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    void fetchDriverPresence()
      .then((storedPresence) => {
        setPresence(storedPresence);
        if (storedPresence.is_online) {
          void loadNearbyRequests();
        }
      })
      .catch((loadError) => {
        if (axios.isAxiosError(loadError) && loadError.response?.status === 404) {
          setPresence(null);
          return;
        }
        setError(getErrorMessage(loadError, "Unable to restore driver online status."));
      });
  }, [token]);

  useEffect(() => {
    if (!token || !presence?.is_online) {
      return;
    }

    const socket = connectDispatchSocket(token, {
      onOpen: () => setDispatchSocketState("connected"),
      onReconnect: () => setDispatchSocketState("reconnecting"),
      onEvent: (event) => {
        if (event.event_type === "nearby_request_created") {
          setNearbyRequests((current) => {
            const withoutDuplicate = current.filter((request) => request.id !== event.request.id);
            return [{ ...event.request, distance_km: event.distance_km }, ...withoutDuplicate].sort(
              (left, right) => left.distance_km - right.distance_km,
            );
          });
          pushToast({
            title: "New nearby request",
            description: "A passenger request entered your live dispatch radius.",
            tone: "info",
          });
          return;
        }

        if (event.event_type === "nearby_request_removed") {
          setNearbyRequests((current) => current.filter((request) => request.id !== event.request_id));
        }
      },
    });

    return () => {
      setDispatchSocketState("connecting");
      socket.close();
    };
  }, [presence?.is_online, pushToast, token]);

  useEffect(() => {
    if (!presence?.is_online) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchNearbyRideRequests()
        .then((nextRequests) => {
          setNearbyRequests((current) => {
            if (nextRequests.length > current.length) {
              pushToast({
                title: "New nearby request",
                description: "A passenger request entered your live dispatch radius.",
                tone: "info",
              });
            }
            return nextRequests;
          });
        })
        .catch(() => undefined);
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [presence?.is_online, pushToast]);

  return (
    <section className="dashboard-stack" aria-label="Driver nearby dispatch requests">
      <div className="hero-panel panel dispatch-hero">
        <div className="hero-copy">
          <span className="eyebrow">Nearby dispatch</span>
          <h2>Go online, share your live position, and pick up passenger requests around you.</h2>
          <p>This flow is the driver side of real-time dispatch. Presence controls who can see requests, and accepting one creates the private ride and booking automatically.</p>
        </div>

        <div className="metric-grid dispatch-metric-grid" aria-label="Driver dispatch metrics">
          <article className="metric-card">
            <span>Driver mode</span>
            <strong>{presence?.is_online ? "Online" : "Offline"}</strong>
            <small>request discovery only works while sharing your position</small>
          </article>
          <article className="metric-card">
            <span>Nearby requests</span>
            <strong>{nearbyRequests.length}</strong>
            <small>current open pickups within dispatch radius</small>
          </article>
          <article className="metric-card">
            <span>Refresh loop</span>
            <strong>15s</strong>
            <small>driver queue polling interval while online</small>
          </article>
          <article className="metric-card">
            <span>Acceptance result</span>
            <strong>Instant</strong>
            <small>private ride and booking are created on accept</small>
          </article>
          <article className="metric-card">
            <span>Realtime</span>
            <strong>{dispatchSocketState === "connected" ? "Live" : dispatchSocketState === "reconnecting" ? "Retrying" : "Connecting"}</strong>
            <small>dispatch websocket connection status</small>
          </article>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel ride-form-panel dispatch-presence-panel" aria-labelledby="driver-presence-title">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Driver presence</span>
              <h3 id="driver-presence-title">Broadcast your location</h3>
            </div>
            <p>Nearby matching depends on your current coordinates. Without a fresh presence update, this queue should stay empty by design.</p>
          </div>

          <div className="detail-metric-grid">
            <div>
              <small>Current state</small>
              <strong>{presence?.is_online ? "Online" : "Offline"}</strong>
            </div>
            <div>
              <small>Latitude</small>
              <strong>{presence ? presence.latitude.toFixed(4) : "Pending"}</strong>
            </div>
            <div>
              <small>Longitude</small>
              <strong>{presence ? presence.longitude.toFixed(4) : "Pending"}</strong>
            </div>
          </div>

          <div className="action-row">
            <button
              className="primary-button"
              type="button"
              disabled={isLocating}
              onClick={() => {
                if (!navigator.geolocation) {
                  setError("This browser cannot provide live location. Use a location-enabled browser to go online.");
                  return;
                }

                setIsLocating(true);
                setError(null);
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    void updatePresence({
                      isOnline: true,
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                      heading: position.coords.heading ?? null,
                    }).finally(() => {
                      setIsLocating(false);
                    });
                  },
                  () => {
                    setIsLocating(false);
                    setError("Location access was denied, so nearby request matching cannot be enabled.");
                  },
                  {
                    enableHighAccuracy: true,
                    timeout: 12000,
                    maximumAge: 0,
                  },
                );
              }}
            >
              {isLocating ? "Finding location..." : presence?.is_online ? "Refresh my location" : "Go online with current location"}
            </button>

            <button
              className="ghost-button"
              type="button"
              disabled={!presence}
              onClick={async () => {
                if (!presence) {
                  return;
                }
                const confirmed = await confirm({
                  title: "Go offline now?",
                  description: "You will stop receiving nearby passenger requests until you share your location again.",
                  confirmLabel: "Go offline",
                  tone: "warning",
                });
                if (!confirmed) {
                  return;
                }
                void updatePresence({
                  isOnline: false,
                  latitude: presence.latitude,
                  longitude: presence.longitude,
                  heading: presence.heading ?? null,
                });
              }}
            >
              Go offline
            </button>
          </div>

          {presence ? (
            <MapPreview
              origin="Driver position"
              destination="Dispatch radius center"
              originLatitude={presence.latitude}
              originLongitude={presence.longitude}
            />
          ) : (
            <div className="info-card">
              <strong>Location is not shared yet</strong>
              <p>Use the button above to publish your current position, otherwise nearby passenger requests cannot be ranked for you.</p>
            </div>
          )}

          {error ? (
            <div className="form-alert error" role="alert" aria-live="assertive">
              {error}
            </div>
          ) : null}
        </div>

        <div className="panel search-panel dispatch-board-panel" aria-labelledby="nearby-requests-title">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Nearby queue</span>
              <h3 id="nearby-requests-title">Open passenger requests</h3>
            </div>
            <p>The queue only shows open passenger requests within your dispatch radius. Accepting one converts it into a trip immediately.</p>
          </div>

          <div className="action-row">
            <button
              className="primary-button"
              type="button"
              disabled={!presence?.is_online || isRefreshing}
              onClick={() => void loadNearbyRequests()}
            >
              {isRefreshing ? "Refreshing..." : "Refresh nearby queue"}
            </button>
            <Link className="ghost-button inline-link-button" to="/driver/rides">
              Open ride management
            </Link>
          </div>

          <div className="booking-board">
            {nearbyRequests.map((request) => (
              <article key={request.id} className="booking-card dispatch-request-card">
                <div className="dispatch-card-copy">
                  <strong>
                    {request.origin} to {request.destination}
                  </strong>
                  <div className="dispatch-card-meta">
                    <span>Pickup {formatCompactDate(request.requested_departure_time)}</span>
                    <span>{request.distance_km.toFixed(1)} km away</span>
                  </div>
                  {request.notes ? <p>{request.notes}</p> : null}
                </div>
                <div className="booking-actions">
                  <span className="status-pill neutral-dark">open</span>
                  <div className="action-row">
                    <button
                      className="primary-button"
                      type="button"
                      disabled={activeRequestId === request.id || decliningRequestId === request.id}
                      onClick={async () => {
                        setActiveRequestId(request.id);
                        setError(null);
                        try {
                          const acceptance = await acceptRideRequest(request.id);
                          pushToast({
                            title: "Request accepted",
                            description: `Matched trip created at Rs. ${acceptance.estimated_price_per_seat.toFixed(0)}.`,
                            tone: "success",
                          });
                          await loadNearbyRequests();
                          navigate(`/bookings/${acceptance.booking_id}`);
                        } catch (acceptError) {
                          setError(getErrorMessage(acceptError, "Unable to accept this dispatch request."));
                        } finally {
                          setActiveRequestId(null);
                        }
                      }}
                    >
                      {activeRequestId === request.id ? "Accepting..." : "Accept request"}
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={decliningRequestId === request.id || activeRequestId === request.id}
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: "Decline this pickup request?",
                          description: "This request will be removed from your queue, but other nearby drivers may still accept it.",
                          confirmLabel: "Decline request",
                          tone: "warning",
                        });
                        if (!confirmed) {
                          return;
                        }
                        setDecliningRequestId(request.id);
                        setError(null);
                        try {
                          await declineRideRequest(request.id);
                          setNearbyRequests((current) => current.filter((item) => item.id !== request.id));
                          pushToast({
                            title: "Request declined",
                            description: "This pickup has been removed from your queue only.",
                            tone: "warning",
                          });
                        } catch (declineError) {
                          setError(getErrorMessage(declineError, "Unable to decline this dispatch request."));
                        } finally {
                          setDecliningRequestId(null);
                        }
                      }}
                    >
                      {decliningRequestId === request.id ? "Declining..." : "Decline"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!nearbyRequests.length ? (
              <EmptyState
                title={presence?.is_online ? "No nearby requests right now" : "Go online to see dispatch work"}
                description={
                  presence?.is_online
                    ? "The queue is empty at the moment or no passenger request falls inside your current dispatch radius."
                    : "Share your live location first. The backend uses that presence to decide which ride requests belong in your queue."
                }
              />
            ) : null}
          </div>
        </div>
      </div>
      {ConfirmDialog}
    </section>
  );
}
