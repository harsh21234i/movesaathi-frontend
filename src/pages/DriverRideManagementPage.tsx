import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { cancelRide, completeRide, fetchMyRides, updateRide } from "../api/rides";
import { fetchManagedBookings } from "../api/bookings";
import { EmptyState } from "../components/EmptyState";
import { LiveLocationPanel } from "../components/LiveLocationPanel";
import { RideForm } from "../components/RideForm";
import { useNotifications } from "../context/NotificationsContext";
import { useConfirmAction } from "../hooks/useConfirmAction";
import type { DriverBooking, Ride } from "../types";

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;
    if (typeof responseData === "string") {
      return responseData;
    }
    if (responseData && typeof responseData === "object") {
      const detail = (responseData as { detail?: unknown }).detail;
      if (typeof detail === "string") {
        return detail;
      }
      if (detail != null) {
        return String(detail);
      }
      return JSON.stringify(responseData);
    }
    if (error.response) {
      return `HTTP ${error.response.status} ${error.response.statusText || ""}`.trim();
    }
  }
  return fallback;
}

function optionalCoordinate(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? Number(value) : null;
}

export function DriverRideManagementPage() {
  const { pushToast } = useNotifications();
  const { confirm, ConfirmDialog } = useConfirmAction();
  const [rides, setRides] = useState<Ride[]>([]);
  const [managedBookings, setManagedBookings] = useState<DriverBooking[]>([]);
  const [selectedRideId, setSelectedRideId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyRideId, setBusyRideId] = useState<number | null>(null);

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
  const selectedRideBookings = selectedRide ? (bookingsByRide[selectedRide.id] ?? []) : [];
  const selectedAcceptedCount = selectedRideBookings.filter((booking) => booking.status === "accepted").length;
  const selectedPendingCount = selectedRideBookings.filter((booking) => booking.status === "pending").length;
  const selectedBoardedCount = selectedRideBookings.filter((booking) => booking.boarded_at).length;

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
                    <span className={`status-pill ${ride.is_active ? "success" : "warning"}`}>{ride.is_active ? "active" : ride.status}</span>
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
                        disabled={!ride.is_active || ride.status === "completed" || busyRideId === ride.id}
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: "Cancel this ride?",
                            description: "Passengers will no longer be able to use this departure and active requests may be affected.",
                            confirmLabel: "Cancel ride",
                            tone: "danger",
                          });
                          if (!confirmed) {
                            return;
                          }
                          setBusyRideId(ride.id);
                          setError(null);
                          try {
                            await cancelRide(ride.id);
                            pushToast({
                              title: "Ride cancelled",
                              description: "The trip is no longer visible to passengers.",
                              tone: "warning",
                            });
                            await loadData();
                          } catch (cancelError) {
                            setError(getErrorMessage(cancelError, "Unable to cancel this ride."));
                          } finally {
                            setBusyRideId(null);
                          }
                        }}
                      >
                        {busyRideId === ride.id ? "Cancelling..." : "Cancel ride"}
                      </button>
                      <button
                        className="primary-button"
                        type="button"
                        disabled={!ride.is_active || ride.status === "completed" || busyRideId === ride.id}
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: "Complete this ride?",
                            description: "Accepted passengers must already be boarded. Completion finalizes booking and payment lifecycle state.",
                            confirmLabel: "Complete ride",
                            tone: "warning",
                          });
                          if (!confirmed) {
                            return;
                          }
                          setBusyRideId(ride.id);
                          setError(null);
                          try {
                            await completeRide(ride.id);
                            pushToast({
                              title: "Ride completed",
                              description: "Accepted boarded passengers were marked complete and payments were finalized.",
                              tone: "success",
                            });
                            await loadData();
                          } catch (completeError) {
                            setError(getErrorMessage(completeError, "Unable to complete this ride. Board accepted passengers first."));
                          } finally {
                            setBusyRideId(null);
                          }
                        }}
                      >
                        {busyRideId === ride.id ? "Updating..." : "Complete ride"}
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
                allowAdvancedLocation={false}
                title="Edit this ride"
                subtitle="Refine the route, fare, or trip notes without leaving your management view."
                submitLabel="Save changes"
                onSubmit={async (formData) => {
                  await updateRide(selectedRide.id, {
                    origin: String(formData.get("origin")),
                    destination: String(formData.get("destination")),
                    origin_latitude: optionalCoordinate(formData, "origin_latitude"),
                    origin_longitude: optionalCoordinate(formData, "origin_longitude"),
                    destination_latitude: optionalCoordinate(formData, "destination_latitude"),
                    destination_longitude: optionalCoordinate(formData, "destination_longitude"),
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
                onAutoSave={async (formData) => {
                  await updateRide(selectedRide.id, {
                    origin: String(formData.get("origin")),
                    destination: String(formData.get("destination")),
                    origin_latitude: optionalCoordinate(formData, "origin_latitude"),
                    origin_longitude: optionalCoordinate(formData, "origin_longitude"),
                    destination_latitude: optionalCoordinate(formData, "destination_latitude"),
                    destination_longitude: optionalCoordinate(formData, "destination_longitude"),
                    departure_time: new Date(String(formData.get("departure_time"))).toISOString(),
                    available_seats: Number(formData.get("available_seats")),
                    price_per_seat: Number(formData.get("price_per_seat")),
                    vehicle_details: String(formData.get("vehicle_details") || ""),
                    notes: String(formData.get("notes") || ""),
                  });
                }}
              />

              <LiveLocationPanel rideId={selectedRide.id} canUpdate />

              <div className="panel detail-info-card">
                <span className="eyebrow">Passengers</span>
                <h3>Ride manifest</h3>
                <div className="profile-tags">
                  <span className="status-pill neutral-dark">{selectedRideBookings.length} total</span>
                  <span className="status-pill success">{selectedAcceptedCount} accepted</span>
                  <span className="status-pill neutral-dark">{selectedPendingCount} pending</span>
                  <span className="status-pill neutral-dark">{selectedBoardedCount} boarded</span>
                </div>
                <div className="passenger-list">
                  {selectedRideBookings.map((booking) => (
                    <div key={booking.id} className="passenger-list-item">
                      <div>
                        <strong>{booking.passenger.full_name}</strong>
                        <p>{booking.passenger.email}</p>
                      </div>
                      <div className="booking-actions">
                        <span className={`status-pill ${booking.status === "accepted" ? "success" : booking.status === "rejected" ? "warning" : "neutral-dark"}`}>
                          {booking.status}
                        </span>
                        <Link className="ghost-button inline-link-button" to={`/bookings/${booking.id}`}>
                          Open booking
                        </Link>
                      </div>
                    </div>
                  ))}
                  {!selectedRideBookings.length ? (
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
      {ConfirmDialog}
    </section>
  );
}
