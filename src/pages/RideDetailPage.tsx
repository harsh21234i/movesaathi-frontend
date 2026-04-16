import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { createBooking } from "../api/rides";
import { fetchRideDetail } from "../api/rides";
import { EmptyState } from "../components/EmptyState";
import { MapPreview } from "../components/MapPreview";
import { RouteTimeline } from "../components/RouteTimeline";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import type { RideDetail } from "../types";

function formatDeparture(value: string) {
  return new Date(value).toLocaleString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RideDetailPage() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pushToast } = useNotifications();
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (!rideId || !user) {
      return;
    }

    void fetchRideDetail(Number(rideId), user.role, user)
      .then(setRide)
      .catch((loadError) => {
        setError(
          axios.isAxiosError(loadError)
            ? String(loadError.response?.data?.detail ?? "Unable to load ride details.")
            : loadError instanceof Error
              ? loadError.message
              : "Unable to load ride details.",
        );
      });
  }, [rideId, user]);

  if (!rideId) {
    return null;
  }

  if (error) {
    return (
      <EmptyState
        title="Ride details unavailable"
        description={error}
        actionLabel="Back to dashboard"
        actionTo="/"
      />
    );
  }

  if (!ride) {
    return (
      <section className="panel">
        <span className="eyebrow">Ride detail</span>
        <h2>Loading ride details</h2>
        <p>Fetching route, driver profile, seats, and booking context.</p>
      </section>
    );
  }

  const isDriverView = user?.role === "driver" && ride.driver_id === user.id;
  const hasExistingBooking = Boolean(ride.booking_id);

  return (
    <section className="detail-stack">
      <div className="detail-hero panel">
        <div>
          <span className="eyebrow">Ride detail</span>
          <h2>
            {ride.origin} to {ride.destination}
          </h2>
          <p>{formatDeparture(ride.departure_time)}</p>
        </div>
        <div className="detail-hero-actions">
          {hasExistingBooking ? (
            <Link className="primary-button inline-link-button" to={`/bookings/${ride.booking_id}`}>
              Open booking
            </Link>
          ) : !isDriverView ? (
            <button
              className="primary-button"
              disabled={isRequesting}
              type="button"
              onClick={async () => {
                setIsRequesting(true);
                try {
                  const booking = await createBooking(ride.id);
                  pushToast({
                    title: "Ride requested",
                    description: "Your booking request was sent to the driver.",
                    tone: "success",
                  });
                  navigate(`/bookings/${booking.id}`);
                } catch (requestError) {
                  setError(
                    axios.isAxiosError(requestError)
                      ? String(requestError.response?.data?.detail ?? "Unable to request this ride.")
                      : "Unable to request this ride.",
                  );
                } finally {
                  setIsRequesting(false);
                }
              }}
            >
              {isRequesting ? "Requesting..." : "Request this ride"}
            </button>
          ) : (
            <Link className="ghost-button inline-link-button" to="/driver/rides">
              Manage this ride
            </Link>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="panel detail-map-panel">
          <MapPreview origin={ride.origin} destination={ride.destination} />
          <RouteTimeline origin={ride.origin} destination={ride.destination} departureTime={ride.departure_time} />
        </div>

        <div className="detail-side-column">
          <div className="panel detail-info-card">
            <span className="eyebrow">Driver profile</span>
            <h3>{ride.driver.full_name}</h3>
            <p>{ride.driver.bio || "Reliable route host with live coordination support."}</p>
            <div className="profile-tags">
              <span className="status-pill success">Rating {ride.driver.rating?.toFixed(1) ?? "4.8"}</span>
              <span className="status-pill neutral-dark">Verified account</span>
            </div>
          </div>

          <div className="panel detail-info-card">
            <span className="eyebrow">Trip snapshot</span>
            <div className="detail-metric-grid">
              <div>
                <small>Seats left</small>
                <strong>{ride.available_seats}</strong>
              </div>
              <div>
                <small>Fare</small>
                <strong>Rs. {ride.price_per_seat.toFixed(0)}</strong>
              </div>
              <div>
                <small>Passengers</small>
                <strong>{ride.booked_passengers}</strong>
              </div>
            </div>
            {ride.notes ? <p>{ride.notes}</p> : <p>Pickup specifics and rider coordination can continue in chat once the request is accepted.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
