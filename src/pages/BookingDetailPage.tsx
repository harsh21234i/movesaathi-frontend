import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { fetchBookingDetail } from "../api/bookings";
import { BookingConversation } from "../components/BookingConversation";
import { EmptyState } from "../components/EmptyState";
import { StatusTimeline } from "../components/StatusTimeline";
import { useAuth } from "../context/AuthContext";
import type { BookingDetail } from "../types";

export function BookingDetailPage() {
  const { bookingId } = useParams();
  const { token, user } = useAuth();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId || !user) {
      return;
    }

    void fetchBookingDetail(Number(bookingId), user.role, user)
      .then(setBooking)
      .catch((loadError) => {
        setError(
          axios.isAxiosError(loadError)
            ? String(loadError.response?.data?.detail ?? "Unable to load booking details.")
            : loadError instanceof Error
              ? loadError.message
              : "Unable to load booking details.",
        );
      });
  }, [bookingId, user]);

  if (!bookingId) {
    return null;
  }

  if (error) {
    return (
      <EmptyState
        title="Booking detail unavailable"
        description={error}
        actionLabel="Back to dashboard"
        actionTo="/"
      />
    );
  }

  if (!booking) {
    return (
      <section className="panel">
        <span className="eyebrow">Booking detail</span>
        <h2>Loading booking details</h2>
        <p>Fetching ride summary, participants, and status timeline.</p>
      </section>
    );
  }

  return (
    <section className="detail-stack">
      <div className="detail-hero panel">
        <div>
          <span className="eyebrow">Booking detail</span>
          <h2>
            {booking.ride.origin} to {booking.ride.destination}
          </h2>
          <p>Booking #{booking.id}</p>
        </div>
        <div className="profile-tags">
          <span className={`status-pill ${booking.status === "accepted" ? "success" : booking.status === "rejected" ? "warning" : "neutral-dark"}`}>
            {booking.status}
          </span>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main-column">
          <div className="panel detail-info-card">
            <span className="eyebrow">Ride info</span>
            <div className="detail-metric-grid">
              <div>
                <small>Departure</small>
                <strong>{new Date(booking.ride.departure_time).toLocaleString()}</strong>
              </div>
              <div>
                <small>Fare</small>
                <strong>Rs. {booking.ride.price_per_seat.toFixed(0)}</strong>
              </div>
              <div>
                <small>Seats left</small>
                <strong>{booking.ride.available_seats}</strong>
              </div>
            </div>
            <p>{booking.notes || "Use the chat below to confirm landmarks, timing, and seat details."}</p>
          </div>

          <div className="panel detail-info-card">
            <span className="eyebrow">Status timeline</span>
            <StatusTimeline items={booking.status_events} />
          </div>
        </div>

        <div className="detail-side-column">
          <div className="panel detail-info-card">
            <span className="eyebrow">Driver</span>
            <h3>{booking.driver.full_name}</h3>
            <p>{booking.driver.email ?? "Driver contact shared after confirmation."}</p>
          </div>
          <div className="panel detail-info-card">
            <span className="eyebrow">Passenger</span>
            <h3>{booking.passenger.full_name}</h3>
            <p>{booking.passenger.email ?? "Passenger contact available in live booking flow."}</p>
          </div>
        </div>
      </div>

      <BookingConversation
        bookingId={booking.id}
        token={token}
        user={user}
        backTo={user?.role === "driver" ? "/driver/rides" : "/trips"}
        rideSummary={{
          origin: booking.ride.origin,
          destination: booking.ride.destination,
          departure_time: booking.ride.departure_time,
          price_per_seat: booking.ride.price_per_seat,
        }}
      />
    </section>
  );
}
