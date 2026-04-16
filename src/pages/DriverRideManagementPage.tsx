import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { cancelRide, fetchMyRides, updateRide } from "../api/rides";
import { fetchManagedBookings } from "../api/bookings";
import { EmptyState } from "../components/EmptyState";
import { RideForm } from "../components/RideForm";
import { useNotifications } from "../context/NotificationsContext";
import type { DriverBooking, Ride } from "../types";

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.detail ?? fallback);
  }
  return fallback;
}

export function DriverRideManagementPage() {
  const { pushToast } = useNotifications();
  const [rides, setRides] = useState<Ride[]>([]);
  const [managedBookings, setManagedBookings] = useState<DriverBooking[]>([]);
  const [selectedRideId, setSelectedRideId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setError(null);
    try {
      const [driverRides, bookings] = await Promise.all([fetchMyRides(), fetchManagedBookings()]);
      setRides(driverRides);
      setManagedBookings(bookings);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Unable to load ride management data."));
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const selectedRide = rides.find((ride) => ride.id === selectedRideId) ?? null;
  const bookingsByRide = useMemo(() => {
    return managedBookings.reduce<Record<number, DriverBooking[]>>((accumulator, booking) => {
      accumulator[booking.ride.id] = accumulator[booking.ride.id] ? [...accumulator[booking.ride.id], booking] : [booking];
      return accumulator;
    }, {});
  }, [managedBookings]);

  return (
    <section className="detail-stack">
      <div className="detail-hero panel">
        <div>
          <span className="eyebrow">Driver ride management</span>
          <h2>Edit routes, cancel inactive departures, and monitor passengers per ride.</h2>
          <p>This view is built for ongoing ride operations rather than discovery. It focuses on what a driver needs after publishing.</p>
        </div>
      </div>

      {error ? (
        <div className="form-alert error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="detail-grid">
        <div className="detail-main-column">
          <div className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Own rides</span>
                <h3>Manage live inventory</h3>
              </div>
            </div>

            <div className="booking-board">
              {rides.map((ride) => (
                <article key={ride.id} className={`booking-card ${selectedRideId === ride.id ? "selected-card" : ""}`}>
                  <div>
                    <strong>
                      {ride.origin} to {ride.destination}
                    </strong>
                    <p>{new Date(ride.departure_time).toLocaleString()}</p>
                    <p>
                      Fare Rs. {ride.price_per_seat.toFixed(0)} | Seats left {ride.available_seats}
                    </p>
                  </div>
                  <div className="booking-actions">
                    <span className={`status-pill ${ride.is_active ? "success" : "warning"}`}>{ride.is_active ? "active" : "cancelled"}</span>
                    <div className="action-row">
                      <button className="ghost-button" type="button" onClick={() => setSelectedRideId(ride.id)}>
                        Edit ride
                      </button>
                      <Link className="ghost-button inline-link-button" to={`/rides/${ride.id}`}>
                        View detail
                      </Link>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={async () => {
                          try {
                            await cancelRide(ride.id);
                            pushToast({
                              title: "Ride cancelled",
                              description: "The trip is no longer visible to passengers.",
                              tone: "warning",
                            });
                            await loadData();
                          } catch (cancelError) {
                            setError(getErrorMessage(cancelError, "Unable to cancel this ride. The backend endpoint may still be pending."));
                          }
                        }}
                      >
                        Cancel ride
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {!rides.length ? (
              <EmptyState
                title="No rides to manage"
                description="Publish a ride first, then return here to edit details, cancel departures, or review passengers."
                actionLabel="Back to dashboard"
                actionTo="/"
              />
            ) : null}
          </div>
        </div>

        <div className="detail-side-column">
          {selectedRide ? (
            <>
              <RideForm
                compact
                initialValues={selectedRide}
                title="Edit this ride"
                subtitle="Refine the route, fare, or trip notes without leaving your management view."
                submitLabel="Save changes"
                onSubmit={async (formData) => {
                  await updateRide(selectedRide.id, {
                    origin: String(formData.get("origin")),
                    destination: String(formData.get("destination")),
                    departure_time: new Date(String(formData.get("departure_time"))).toISOString(),
                    available_seats: Number(formData.get("available_seats")),
                    price_per_seat: Number(formData.get("price_per_seat")),
                    vehicle_details: String(formData.get("vehicle_details") || ""),
                    notes: String(formData.get("notes") || ""),
                  });
                  pushToast({
                    title: "Ride updated",
                    description: "Your route changes were saved.",
                    tone: "success",
                  });
                  await loadData();
                }}
              />

              <div className="panel detail-info-card">
                <span className="eyebrow">Passengers</span>
                <h3>Ride manifest</h3>
                <div className="passenger-list">
                  {(bookingsByRide[selectedRide.id] ?? []).map((booking) => (
                    <div key={booking.id} className="passenger-list-item">
                      <div>
                        <strong>{booking.passenger.full_name}</strong>
                        <p>{booking.passenger.email}</p>
                      </div>
                      <span className={`status-pill ${booking.status === "accepted" ? "success" : booking.status === "rejected" ? "warning" : "neutral-dark"}`}>
                        {booking.status}
                      </span>
                    </div>
                  ))}
                  {!(bookingsByRide[selectedRide.id] ?? []).length ? (
                    <EmptyState
                      title="No passengers yet"
                      description="Passenger requests will appear here as soon as people start booking this ride."
                    />
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="Choose a ride to manage"
              description="Select any published route from the left to edit details, cancel it, or inspect the passenger list."
            />
          )}
        </div>
      </div>
    </section>
  );
}
