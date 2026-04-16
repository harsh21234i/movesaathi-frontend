import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchMyBookings } from "../api/bookings";
import { EmptyState } from "../components/EmptyState";
import { useNotifications } from "../context/NotificationsContext";
import type { PassengerBooking } from "../types";

type TripTab = "upcoming" | "pending" | "completed";

export function PassengerTripsPage() {
  const { pushToast } = useNotifications();
  const [bookings, setBookings] = useState<PassengerBooking[]>([]);
  const [tab, setTab] = useState<TripTab>("upcoming");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchMyBookings()
      .then(setBookings)
      .catch((loadError) => {
        setError(
          axios.isAxiosError(loadError)
            ? String(loadError.response?.data?.detail ?? "Unable to load trips.")
            : "Unable to load trips.",
        );
      });
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchMyBookings()
        .then((nextBookings) => {
          setBookings((current) => {
            if (nextBookings.length > current.length) {
              pushToast({
                title: "Trip update",
                description: "A new booking update was added to your trips board.",
                tone: "info",
              });
            }
            return nextBookings;
          });
        })
        .catch(() => undefined);
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, [pushToast]);

  const visibleTrips = useMemo(() => {
    const now = Date.now();
    if (tab === "pending") {
      return bookings.filter((booking) => booking.status === "pending");
    }

    if (tab === "completed") {
      return bookings.filter(
        (booking) => booking.status === "rejected" || new Date(booking.ride.departure_time).getTime() < now,
      );
    }

    return bookings.filter(
      (booking) => booking.status === "accepted" && new Date(booking.ride.departure_time).getTime() >= now,
    );
  }, [bookings, tab]);

  return (
    <section className="detail-stack">
      <div className="detail-hero panel">
        <div>
          <span className="eyebrow">Passenger trips</span>
          <h2>Track each ride request after it leaves the marketplace.</h2>
          <p>Use separate tabs for what is upcoming, still awaiting confirmation, or already finished.</p>
        </div>
      </div>

      <div className="panel trips-panel">
        <div className="tab-strip" role="tablist" aria-label="Passenger trip tabs">
          {(["upcoming", "pending", "completed"] as TripTab[]).map((candidate) => (
            <button
              key={candidate}
              className={`tab-button ${tab === candidate ? "active" : ""}`}
              type="button"
              role="tab"
              aria-selected={tab === candidate}
              onClick={() => setTab(candidate)}
            >
              {candidate}
            </button>
          ))}
        </div>

        {error ? (
          <div className="form-alert error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="booking-board">
          {visibleTrips.map((booking) => (
            <article key={booking.id} className="booking-card trip-card">
              <div>
                <strong>
                  {booking.ride.origin} to {booking.ride.destination}
                </strong>
                <p>{new Date(booking.ride.departure_time).toLocaleString()}</p>
                <p>Fare: Rs. {booking.ride.price_per_seat.toFixed(0)}</p>
              </div>
              <div className="booking-actions">
                <span className={`status-pill ${booking.status === "accepted" ? "success" : booking.status === "pending" ? "neutral-dark" : "warning"}`}>
                  {booking.status}
                </span>
                <Link className="ghost-button inline-link-button" to={`/bookings/${booking.id}`}>
                  Open booking
                </Link>
              </div>
            </article>
          ))}
        </div>

        {!visibleTrips.length && !error ? (
          <EmptyState
            title={`No ${tab} trips yet`}
            description={
              tab === "upcoming"
                ? "Accepted rides will appear here once drivers confirm your booking requests."
                : tab === "pending"
                  ? "Any request still waiting for a driver decision will stay in this tab."
                  : "Completed or declined ride requests will move into this history tab."
            }
            actionLabel="Explore rides"
            actionTo="/"
          />
        ) : null}
      </div>
    </section>
  );
}
