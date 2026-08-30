import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { cancelRideRequest, connectDispatchSocket, createRideRequest, fetchMyRideRequests } from "../api/dispatch";
import { DispatchRequestForm } from "../components/DispatchRequestForm";
import { EmptyState } from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import type { RideRequest } from "../types";

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

function getRequestTone(status: RideRequest["status"]) {
  if (status === "matched") {
    return "success";
  }
  if (status === "cancelled" || status === "expired") {
    return "warning";
  }
  return "neutral-dark";
}

export function PassengerRequestPage() {
  const { token } = useAuth();
  const { pushToast } = useNotifications();
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [dispatchSocketState, setDispatchSocketState] = useState<"connecting" | "connected" | "reconnecting">("connecting");

  async function loadRequests(withLoader = false) {
    if (withLoader) {
      setIsLoading(true);
    }
    setError(null);
    try {
      setRequests(await fetchMyRideRequests());
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Unable to load your dispatch requests."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests(true);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = connectDispatchSocket(token, {
      onOpen: () => setDispatchSocketState("connected"),
      onReconnect: () => setDispatchSocketState("reconnecting"),
      onEvent: (event) => {
        if (event.event_type === "request_matched") {
          setRequests((current) =>
            current.map((request) => (request.id === event.request.id ? event.request : request)),
          );
          pushToast({
            title: "Driver matched",
            description: `A driver accepted your request. Estimated fare: Rs. ${event.estimated_price_per_seat.toFixed(0)}.`,
            tone: "success",
          });
          return;
        }

        if (event.event_type === "request_cancelled" || event.event_type === "request_expired") {
          setRequests((current) =>
            current.map((request) => (request.id === event.request.id ? event.request : request)),
          );
          if (event.event_type === "request_expired") {
            pushToast({
              title: "Request expired",
              description: "Your open request passed its requested departure time and left the live queue.",
              tone: "warning",
            });
          }
        }
      },
    });

    return () => {
      setDispatchSocketState("connecting");
      socket.close();
    };
  }, [pushToast, token]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchMyRideRequests()
        .then((nextRequests) => {
          setRequests((current) => {
            const currentMatched = current.filter((request) => request.status === "matched").length;
            const nextMatched = nextRequests.filter((request) => request.status === "matched").length;
            if (nextMatched > currentMatched) {
              pushToast({
                title: "Driver matched",
                description: "One of your live requests was accepted by a nearby driver.",
                tone: "success",
              });
            }
            return nextRequests;
          });
        })
        .catch(() => undefined);
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, [pushToast]);

  const openRequests = requests.filter((request) => request.status === "open").length;
  const matchedRequests = requests.filter((request) => request.status === "matched").length;

  return (
    <section className="dashboard-stack" aria-label="Passenger dispatch request page">
      <div className="hero-panel panel dispatch-hero">
        <div className="hero-copy">
          <span className="eyebrow">Dispatch request desk</span>
          <h2>Send a live pickup request instead of waiting for a published ride.</h2>
          <p>The request goes into the nearby driver queue immediately. Once a driver accepts, you move straight into a matched trip and booking.</p>
        </div>

        <div className="metric-grid dispatch-metric-grid" aria-label="Passenger dispatch metrics">
          <article className="metric-card">
            <span>Requests sent</span>
            <strong>{requests.length}</strong>
            <small>across open and matched dispatch attempts</small>
          </article>
          <article className="metric-card">
            <span>Open now</span>
            <strong>{openRequests}</strong>
            <small>waiting in the nearby driver queue</small>
          </article>
          <article className="metric-card">
            <span>Matched</span>
            <strong>{matchedRequests}</strong>
            <small>already converted into a live booking</small>
          </article>
          <article className="metric-card">
            <span>Refresh</span>
            <strong>20s</strong>
            <small>dispatch board polling interval</small>
          </article>
          <article className="metric-card">
            <span>Realtime</span>
            <strong>{dispatchSocketState === "connected" ? "Live" : dispatchSocketState === "reconnecting" ? "Retrying" : "Connecting"}</strong>
            <small>dispatch websocket connection status</small>
          </article>
        </div>
      </div>

      <div className="dashboard-grid">
        <DispatchRequestForm
          onSubmit={async (formData) => {
            const originLatitude = Number(formData.get("origin_latitude"));
            const originLongitude = Number(formData.get("origin_longitude"));
            const destinationLatitude = Number(formData.get("destination_latitude"));
            const destinationLongitude = Number(formData.get("destination_longitude"));

            if (
              Number.isNaN(originLatitude) ||
              Number.isNaN(originLongitude) ||
              Number.isNaN(destinationLatitude) ||
              Number.isNaN(destinationLongitude)
            ) {
              throw new Error("Choose both pickup and dropoff from the map or place suggestions before sending the request.");
            }

            try {
              await createRideRequest({
                origin: String(formData.get("origin")),
                destination: String(formData.get("destination")),
                origin_latitude: originLatitude,
                origin_longitude: originLongitude,
                destination_latitude: destinationLatitude,
                destination_longitude: destinationLongitude,
                requested_departure_time: new Date(String(formData.get("requested_departure_time"))).toISOString(),
                notes: String(formData.get("notes") || ""),
              });
              pushToast({
                title: "Dispatch request sent",
                description: "Nearby drivers can now see your pickup request.",
                tone: "success",
              });
              await loadRequests();
            } catch (submitError) {
              throw new Error(getErrorMessage(submitError, "Unable to send this dispatch request."));
            }
          }}
        />

        <div className="panel search-panel dispatch-board-panel" aria-labelledby="passenger-dispatch-board-title">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Live queue</span>
              <h3 id="passenger-dispatch-board-title">Your recent requests</h3>
            </div>
            <p>Matched requests expose direct ride and booking links so you can jump into trip detail immediately.</p>
          </div>

          <div className="action-row">
            <button className="primary-button" type="button" onClick={() => void loadRequests()}>
              Refresh requests
            </button>
            <Link className="ghost-button inline-link-button" to="/trips">
              Open trips board
            </Link>
          </div>

          {error ? (
            <div className="form-alert error" role="alert" aria-live="assertive">
              {error}
            </div>
          ) : null}
          {!error && isLoading ? (
            <div className="form-alert info" aria-live="polite">
              Loading your dispatch requests...
            </div>
          ) : null}

          <div className="booking-board">
            {requests.map((request) => (
              <article key={request.id} className="booking-card dispatch-request-card">
                <div className="dispatch-card-copy">
                  <strong>
                    {request.origin} to {request.destination}
                  </strong>
                  <div className="dispatch-card-meta">
                    <span>Pickup {formatCompactDate(request.requested_departure_time)}</span>
                    <span>Sent {formatCompactDate(request.created_at)}</span>
                  </div>
                  {request.notes ? <p>{request.notes}</p> : null}
                </div>
                <div className="booking-actions">
                  <span className={`status-pill ${getRequestTone(request.status)}`}>{request.status}</span>
                  {request.status === "open" ? (
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={activeRequestId === request.id}
                      onClick={async () => {
                        setActiveRequestId(request.id);
                        setError(null);
                        try {
                          await cancelRideRequest(request.id);
                          pushToast({
                            title: "Request cancelled",
                            description: "The nearby-driver queue no longer includes this dispatch request.",
                            tone: "warning",
                          });
                          await loadRequests();
                        } catch (cancelError) {
                          setError(getErrorMessage(cancelError, "Unable to cancel this dispatch request."));
                        } finally {
                          setActiveRequestId(null);
                        }
                      }}
                    >
                      {activeRequestId === request.id ? "Cancelling..." : "Cancel request"}
                    </button>
                  ) : null}
                  {request.matched_booking_id ? (
                    <Link className="ghost-button inline-link-button" to={`/bookings/${request.matched_booking_id}`}>
                      Open booking
                    </Link>
                  ) : null}
                  {request.matched_ride_id ? (
                    <Link className="ghost-button inline-link-button" to={`/rides/${request.matched_ride_id}`}>
                      Open ride
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
            {!requests.length && !isLoading ? (
              <EmptyState
                title="No dispatch requests yet"
                description="Use the pickup form to send your first nearby-driver request."
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
