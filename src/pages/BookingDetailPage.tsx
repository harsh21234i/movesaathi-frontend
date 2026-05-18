import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { fetchBookingDetail } from "../api/bookings";
import { createPayment, confirmPayment, fetchBookingPayment } from "../api/payments";
import { createReview } from "../api/reviews";
import { BookingConversation } from "../components/BookingConversation";
import { EmptyState } from "../components/EmptyState";
import { LiveLocationPanel } from "../components/LiveLocationPanel";
import { StatusTimeline } from "../components/StatusTimeline";
import { useAuth } from "../context/AuthContext";
import type { BookingDetail } from "../types";
import type { Payment } from "../types";

export function BookingDetailPage() {
  const { bookingId } = useParams();
  const { token, user } = useAuth();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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

  useEffect(() => {
    if (!bookingId || !booking) {
      return;
    }

    setPaymentError(null);
    void fetchBookingPayment(Number(bookingId)).then(setPayment).catch((loadError) => {
      if (axios.isAxiosError(loadError) && loadError.response?.status === 404) {
        setPayment(null);
        return;
      }
      setPaymentError(
        axios.isAxiosError(loadError)
          ? String(loadError.response?.data?.detail ?? "Unable to load payment details.")
          : "Unable to load payment details.",
      );
    });
  }, [bookingId, booking]);

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

          <div className="panel detail-info-card">
            <span className="eyebrow">Payment</span>
            {paymentError ? (
              <div className="form-alert error" role="alert">
                {paymentError}
              </div>
            ) : null}
            {payment ? (
              <>
                <div className="detail-metric-grid">
                  <div>
                    <small>Amount</small>
                    <strong>
                      {payment.currency} {payment.amount.toFixed(0)}
                    </strong>
                  </div>
                  <div>
                    <small>Status</small>
                    <strong>{payment.status}</strong>
                  </div>
                  <div>
                    <small>Provider</small>
                    <strong>{payment.provider}</strong>
                  </div>
                </div>
                <div className="action-row">
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={isConfirmingPayment}
                    onClick={async () => {
                      setIsConfirmingPayment(true);
                      try {
                        setPayment(await confirmPayment(payment.id));
                      } finally {
                        setIsConfirmingPayment(false);
                      }
                    }}
                  >
                    {isConfirmingPayment ? "Confirming..." : "Confirm payment"}
                  </button>
                </div>
              </>
            ) : booking.status !== "rejected" ? (
              <div className="action-row">
                <button
                  className="primary-button"
                  type="button"
                  disabled={isCreatingPayment}
                  onClick={async () => {
                    setIsCreatingPayment(true);
                    try {
                      setPayment(await createPayment({ booking_id: booking.id }));
                    } finally {
                      setIsCreatingPayment(false);
                    }
                  }}
                >
                  {isCreatingPayment ? "Creating..." : "Create payment"}
                </button>
              </div>
            ) : (
              <p>This booking was rejected, so no payment flow is available.</p>
            )}
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
          {booking.status === "accepted" ? (
            <LiveLocationPanel rideId={booking.ride.id} canUpdate={user?.role === "driver" && booking.ride.driver_id === user.id} />
          ) : null}
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

      {booking.status === "completed" ? (
        <div className="panel detail-info-card">
          <span className="eyebrow">Review</span>
          <h3>Rate the other trip participant</h3>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setReviewError(null);
              const formData = new FormData(event.currentTarget);
              const rating = Number(formData.get("rating"));
              const comment = String(formData.get("comment") || "").trim() || null;
              const revieweeId = user?.role === "driver" ? booking.passenger.id : booking.driver.id;

              setIsSubmittingReview(true);
              try {
                await createReview({
                  booking_id: booking.id,
                  reviewee_id: revieweeId,
                  rating,
                  comment,
                });
                event.currentTarget.reset();
              } catch (submitError) {
                setReviewError(
                  axios.isAxiosError(submitError)
                    ? String(submitError.response?.data?.detail ?? "Unable to submit review.")
                    : "Unable to submit review.",
                );
              } finally {
                setIsSubmittingReview(false);
              }
            }}
          >
            <div className="inline-grid two-column">
              <div className="input-group">
                <label htmlFor="rating">Rating</label>
                <select id="rating" name="rating" defaultValue="5" required>
                  <option value="5">5</option>
                  <option value="4">4</option>
                  <option value="3">3</option>
                  <option value="2">2</option>
                  <option value="1">1</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="comment">Comment</label>
                <input id="comment" name="comment" placeholder="Smooth ride and clear communication." />
              </div>
            </div>
            {reviewError ? (
              <div className="form-alert error" role="alert">
                {reviewError}
              </div>
            ) : null}
            <button className="primary-button" type="submit" disabled={isSubmittingReview}>
              {isSubmittingReview ? "Submitting..." : "Submit review"}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
