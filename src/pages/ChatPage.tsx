import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { fetchBookingDetail } from "../api/bookings";
import { BookingConversation } from "../components/BookingConversation";
import { useAuth } from "../context/AuthContext";
import type { BookingDetail } from "../types";

export function ChatPage() {
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
            ? String(loadError.response?.data?.detail ?? "Unable to load booking summary.")
            : loadError instanceof Error
              ? loadError.message
              : "Unable to load booking summary.",
        );
      });
  }, [bookingId, user]);

  if (!bookingId) {
    return null;
  }

  return (
    <>
      {error ? (
        <div className="form-alert error" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : null}
      <BookingConversation
        bookingId={Number(bookingId)}
        token={token}
        user={user}
        rideSummary={
          booking
            ? {
                origin: booking.ride.origin,
                destination: booking.ride.destination,
                departure_time: booking.ride.departure_time,
                price_per_seat: booking.ride.price_per_seat,
              }
            : undefined
        }
      />
    </>
  );
}
