import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { fetchManagedBookings, updateBookingStatus } from "../api/bookings";
import { createRide, fetchMyRides } from "../api/rides";
import { RideForm } from "../components/RideForm";
import type { DriverBooking, Ride } from "../types";

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

export function DriverDashboardPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [bookings, setBookings] = useState<DriverBooking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);

  async function loadDashboard() {
    setError(null);
    setRequestsError(null);

    try {
      const [driverRides, managedBookings] = await Promise.all([fetchMyRides(), fetchManagedBookings()]);
      setRides(driverRides);
      setBookings(managedBookings);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Unable to load driver dashboard."));
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const pendingBookings = bookings.filter((booking) => booking.status === "pending").length;
  const acceptedBookings = bookings.filter((booking) => booking.status === "accepted").length;

  return (
    <section className="dashboard-stack" aria-label="Driver dashboard">
      <div className="hero-panel panel" aria-labelledby="driver-dashboard-title">
        <div className="hero-copy">
          <span className="eyebrow">Driver operations desk</span>
          <h2 id="driver-dashboard-title">Publish routes, review booking requests, and keep each trip under control.</h2>
          <p>Your dashboard now separates driver work from passenger browsing so publishing and booking management stop competing for the same screen.</p>
        </div>

        <div className="metric-grid" aria-label="Driver summary metrics">
          <article className="metric-card">
            <span>Your rides</span>
            <strong>{rides.length}</strong>
            <small>published departures owned by your account</small>
          </article>
          <article className="metric-card">
            <span>Pending requests</span>
            <strong>{pendingBookings}</strong>
            <small>requests waiting for your decision</small>
          </article>
          <article className="metric-card">
            <span>Accepted bookings</span>
            <strong>{acceptedBookings}</strong>
            <small>active passengers ready for coordination</small>
          </article>
          <article className="metric-card">
            <span>Total seats left</span>
            <strong>{rides.reduce((sum, ride) => sum + ride.available_seats, 0)}</strong>
            <small>remaining capacity across your rides</small>
          </article>
        </div>
      </div>

      <div className="dashboard-grid">
        <RideForm
          onSubmit={async (formData) => {
            setError(null);
            try {
              await createRide({
                origin: String(formData.get("origin")),
                destination: String(formData.get("destination")),
                departure_time: new Date(String(formData.get("departure_time"))).toISOString(),
                available_seats: Number(formData.get("available_seats")),
                price_per_seat: Number(formData.get("price_per_seat")),
                vehicle_details: String(formData.get("vehicle_details") || ""),
                notes: String(formData.get("notes") || ""),
              });
              await loadDashboard();
            } catch (createRideError) {
              throw new Error(getErrorMessage(createRideError, "Unable to publish ride."));
            }
          }}
        />

        <div className="panel search-panel" aria-labelledby="driver-rides-title">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Published routes</span>
              <h3 id="driver-rides-title">Your ride board</h3>
            </div>
            <p>Track the routes you already published so you can see which ones still have seats and which ones need passenger follow-up.</p>
          </div>

          {error ? (
            <div className="form-alert error" role="alert" aria-live="assertive">
              {error}
            </div>
          ) : null}

          <div className="booking-board">
            {rides.map((ride) => (
              <article key={ride.id} className="booking-card">
                <div>
                  <strong>
                    {ride.origin} to {ride.destination}
                  </strong>
                  <p>{formatCompactDate(ride.departure_time)}</p>
                  <p>
                    Rs. {ride.price_per_seat.toFixed(0)} | Seats left: {ride.available_seats}
                  </p>
                </div>
                <div className="booking-actions">
                  <span className={`status-pill ${ride.is_active ? "success" : "warning"}`}>
                    {ride.is_active ? "active" : "closed"}
                  </span>
                </div>
              </article>
            ))}
            {!rides.length ? (
              <div className="empty-card">
                <strong>No rides published yet.</strong>
                <p>Use the publish panel to create your first driver-facing trip listing.</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="panel trust-panel" aria-labelledby="driver-requests-title">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Booking requests</span>
              <h3 id="driver-requests-title">Passenger approvals</h3>
            </div>
          </div>

          {requestsError ? (
            <div className="form-alert error" role="alert" aria-live="assertive">
              {requestsError}
            </div>
          ) : null}

          <div className="booking-board">
            {bookings.map((booking) => (
              <article key={booking.id} className="booking-card">
                <div>
                  <strong>
                    {booking.passenger.full_name} for {booking.ride.origin} to {booking.ride.destination}
                  </strong>
                  <p>{formatCompactDate(booking.ride.departure_time)}</p>
                  <p>{booking.passenger.email}</p>
                  {booking.notes ? <p>{booking.notes}</p> : null}
                </div>

                <div className="booking-actions">
                  <span className={`status-pill ${booking.status === "accepted" ? "success" : booking.status === "rejected" ? "warning" : "neutral-dark"}`}>
                    {booking.status}
                  </span>
                  {booking.status === "pending" ? (
                    <div className="action-row">
                      <button
                        className="primary-button"
                        disabled={activeBookingId === booking.id}
                        onClick={async () => {
                          setActiveBookingId(booking.id);
                          setRequestsError(null);
                          try {
                            await updateBookingStatus(booking.id, "accepted");
                            await loadDashboard();
                          } catch (updateError) {
                            setRequestsError(getErrorMessage(updateError, "Unable to accept booking."));
                          } finally {
                            setActiveBookingId(null);
                          }
                        }}
                        type="button"
                      >
                        Accept
                      </button>
                      <button
                        className="ghost-button"
                        disabled={activeBookingId === booking.id}
                        onClick={async () => {
                          setActiveBookingId(booking.id);
                          setRequestsError(null);
                          try {
                            await updateBookingStatus(booking.id, "rejected");
                            await loadDashboard();
                          } catch (updateError) {
                            setRequestsError(getErrorMessage(updateError, "Unable to reject booking."));
                          } finally {
                            setActiveBookingId(null);
                          }
                        }}
                        type="button"
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                  {booking.status === "accepted" ? (
                    <Link className="ghost-button inline-link-button" to={`/chat/${booking.id}`}>
                      Open chat
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
            {!bookings.length ? (
              <div className="empty-card">
                <strong>No booking requests yet.</strong>
                <p>Once passengers start requesting seats on your rides, they will appear here with approve and reject actions.</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
