import { api } from "./client";
import type {
  Booking,
  BookingDetail,
  DriverBooking,
  PassengerBooking,
  User,
  UserRole,
} from "../types";

export async function fetchMyBookings() {
  const { data } = await api.get<PassengerBooking[]>("/bookings/mine");
  return data;
}

export async function fetchManagedBookings() {
  const { data } = await api.get<DriverBooking[]>("/bookings/managed");
  return data;
}

export async function fetchBookingDetail(bookingId: number, _role: UserRole, _currentUser: User | null) {
  const { data } = await api.get<BookingDetail>(`/bookings/${bookingId}`);
  return data;
}

export async function updateBookingStatus(bookingId: number, status: "accepted" | "rejected") {
  const { data } = await api.patch<Booking>(`/bookings/${bookingId}`, { status });
  return data;
}
