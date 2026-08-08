import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { cancelMyBooking, fetchBookingDetail, issueBoardingOtp, verifyBoardingOtp } from "../api/bookings";
import { createPayment, confirmPayment, fetchBookingPayment, reconcilePayment } from "../api/payments";
import { createReview } from "../api/reviews";
import { BookingConversation } from "../components/BookingConversation";
import { EmptyState } from "../components/EmptyState";
import { LiveLocationPanel } from "../components/LiveLocationPanel";
import { PaymentLifecyclePanel } from "../components/PaymentLifecyclePanel";
import { StatusTimeline } from "../components/StatusTimeline";
import { useAuth } from "../context/AuthContext";
import { openRazorpayCheckout } from "../services/razorpayCheckout";
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
  const [isCancelling, setIsCancelling] = useState(false);
  const [boardingOtp, setBoardingOtp] = useState<{ otp: string; expires_at: string } | null>(null);
  const [boardingInput, setBoardingInput] = useState("");
  const [boardingError, setBoardingError] = useState<string | null>(null);
  const [isBoardingActionPending, setIsBoardingActionPending] = useState(false);

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

  useEffect(() => {
    if (!bookingId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchBookingPayment(Number(bookingId))
        .then(setPayment)
        .catch((loadError) => {
          if (axios.isAxiosError(loadError) && loadError.response?.status === 404) {
            setPayment(null);
          }
        });
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [bookingId]);

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

  async function refreshPayment() {
    if (!bookingId) {
      return;
    }
    try {
      const nextPayment = await fetchBookingPayment(Number(bookingId));
      setPayment(nextPayment);
    } catch (loadError) {
      if (axios.isAxiosError(loadError) && loadError.response?.status === 404) {
        setPayment(null);
        return;
      }
      setPaymentError(
        axios.isAxiosError(loadError)
          ? String(loadError.response?.data?.detail ?? "Unable to load payment details.")
          : "Unable to load payment details.",
      );
    }
  }

  async function handleCreatePayment() {
    if (!booking) {
      return;
    }

    setIsCreatingPayment(true);
    setPaymentError(null);
    try {
      const createdPayment = await createPayment({ booking_id: booking.id });
      setPayment(createdPayment);
      await refreshPayment();
    } catch (createError) {
      setPaymentError(
        axios.isAxiosError(createError)
          ? String(createError.response?.data?.detail ?? "Unable to create payment.")
          : createError instanceof Error
            ? createError.message
            : "Unable to create payment.",
      );
    } finally {
      setIsCreatingPayment(false);
    }
  }

  async function handleConfirmPayment() {
    if (!payment) {
      return;
    }

    setIsConfirmingPayment(true);
    setPaymentError(null);
    try {
      if (payment.provider === "razorpay") {
        if (!user) {
          throw new Error("Sign in again before paying.");
        }
        await openRazorpayCheckout(payment, user);
        await reconcilePayment(payment.id);
      } else {
        await confirmPayment(payment.id);
      }
      await refreshPayment();
    } catch (confirmError) {
      setPaymentError(
        axios.isAxiosError(confirmError)
          ? String(confirmError.response?.data?.detail ?? "Unable to complete payment.")
          : confirmError instanceof Error
            ? confirmError.message
            : "Unable to complete payment.",
      );
    } finally {
      setIsConfirmingPayment(false);
    }
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
          <div className="profile-tags detail-badges">
            <span className={`status-pill ${booking.status === "accepted" ? "success" : booking.status === "rejected" ? "warning" : "neutral-dark"}`}>
              {booking.status}
            </span>
            <span className="status-pill neutral-dark">Driver {booking.driver.full_name}</span>
            <span className="status-pill neutral-dark">Passenger {booking.passenger.full_name}</span>
          </div>
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
            {booking.status === "accepted" ? (
              <div className="boarding-verification">
                <div>
                  <span className="eyebrow">Secure boarding</span>
                  <h3>{booking.boarded_at ? "Passenger verified" : "Verify before starting"}</h3>
                  <p>
                    {booking.boarded_at
                      ? `Boarding confirmed ${new Date(booking.boarded_at).toLocaleString()}.`
                      : user?.role === "passenger"
                        ? "Generate the code only when you meet the driver. Tell it to the driver before entering."
                        : "Ask the passenger for the six-digit code before allowing boarding."}
                  </p>
                </div>
                {boardingError ? <div className="form-alert error" role="alert">{boardingError}</div> : null}
                {!booking.boarded_at && user?.role === "passenger" ? (
                  <div className="action-row">
                    {boardingOtp ? (
                      <div className="boarding-code" aria-live="polite">
                        <strong>{boardingOtp.otp}</strong>
                        <small>Expires {new Date(boardingOtp.expires_at).toLocaleTimeString()}</small>
                      </div>
                    ) : null}
                    <button
                      className="primary-button"
                      type="button"
                      disabled={isBoardingActionPending}
                      onClick={async () => {
                        setIsBoardingActionPending(true);
                        setBoardingError(null);
                        try {
                          setBoardingOtp(await issueBoardingOtp(booking.id));
                        } catch (boardingActionError) {
                          setBoardingError(
                            axios.isAxiosError(boardingActionError)
                              ? String(boardingActionError.response?.data?.detail ?? "Unable to generate boarding OTP.")
                              : "Unable to generate boarding OTP.",
                          );
                        } finally {
                          setIsBoardingActionPending(false);
                        }
                      }}
                    >
                      {isBoardingActionPending ? "Generating..." : boardingOtp ? "Generate new code" : "Generate boarding OTP"}
                    </button>
                  </div>
                ) : null}
                {!booking.boarded_at && user?.role === "driver" ? (
                  <form
                    className="boarding-form"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      setIsBoardingActionPending(true);
                      setBoardingError(null);
                      try {
                        await verifyBoardingOtp(booking.id, boardingInput);
                        setBooking(await fetchBookingDetail(Number(bookingId), user.role, user));
                        setBoardingInput("");
                      } catch (boardingActionError) {
                        setBoardingError(
                          axios.isAxiosError(boardingActionError)
                            ? String(boardingActionError.response?.data?.detail ?? "Unable to verify boarding OTP.")
                            : "Unable to verify boarding OTP.",
                        );
                      } finally {
                        setIsBoardingActionPending(false);
                      }
                    }}
                  >
                    <label htmlFor="boarding-otp">Passenger boarding OTP</label>
                    <div className="action-row">
                      <input
                        id="boarding-otp"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="\d{6}"
                        maxLength={6}
                        value={boardingInput}
                        onChange={(event) => setBoardingInput(event.target.value.replace(/\D/g, ""))}
                        placeholder="6-digit code"
                        required
                      />
                      <button className="primary-button" type="submit" disabled={isBoardingActionPending || boardingInput.length !== 6}>
                        {isBoardingActionPending ? "Verifying..." : "Verify passenger"}
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            ) : null}
            {user?.role === "passenger" && ["pending", "accepted"].includes(booking.status) ? (
              <div className="action-row">
                <button
                  className="ghost-button"
                  type="button"
                  disabled={isCancelling}
                  onClick={async () => {
                    setIsCancelling(true);
                    try {
                      await cancelMyBooking(booking.id);
                      setBooking(await fetchBookingDetail(Number(bookingId), user.role, user));
                    } catch (cancelError) {
                      setError(
                        axios.isAxiosError(cancelError)
                          ? String(cancelError.response?.data?.detail ?? "Unable to cancel booking.")
                          : "Unable to cancel booking.",
                      );
                    } finally {
                      setIsCancelling(false);
                    }
                  }}
                >
                  {isCancelling ? "Cancelling..." : "Cancel my booking"}
                </button>
              </div>
            ) : null}
          </div>

          <PaymentLifecyclePanel
            booking={booking}
            payment={payment}
            paymentError={paymentError}
            user={user}
            isCreatingPayment={isCreatingPayment}
            isConfirmingPayment={isConfirmingPayment}
            onCreatePayment={handleCreatePayment}
            onConfirmPayment={handleConfirmPayment}
            onRefreshPayment={refreshPayment}
          />
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
