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

export async function cancelMyBooking(bookingId: number) {
  const { data } = await api.patch<Booking>(`/bookings/${bookingId}`, { status: "cancelled_by_passenger" });
  return data;
}

export async function issueBoardingOtp(bookingId: number) {
  const { data } = await api.post<{ otp: string; expires_at: string }>(`/bookings/${bookingId}/boarding-code`);
  return data;
}

export async function verifyBoardingOtp(bookingId: number, otp: string) {
  const { data } = await api.post<Booking>(`/bookings/${bookingId}/boarding/verify`, { otp });
  return data;
}
