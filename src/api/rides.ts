import { api } from "./client";
import type { Booking, Ride } from "../types";

export async function fetchRides(params: { origin?: string; destination?: string; departure_after?: string }) {
  const { data } = await api.get<Ride[]>("/rides", { params });
  return data;
}

export async function fetchMyRides() {
  const { data } = await api.get<Ride[]>("/rides/mine");
  return data;
}

export async function createRide(payload: {
  origin: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  vehicle_details?: string;
  notes?: string;
}) {
  const { data } = await api.post<Ride>("/rides", payload);
  return data;
}

export async function createBooking(rideId: number, notes?: string) {
  const { data } = await api.post<Booking>("/bookings", { ride_id: rideId, notes });
  return data;
}
