import { api } from "./client";
import type { Ride, RideDetail, RideLocation, RideLocationAccess, User, UserRole } from "../types";

export type RidePayload = {
  origin: string;
  destination: string;
  origin_latitude?: number | null;
  origin_longitude?: number | null;
  destination_latitude?: number | null;
  destination_longitude?: number | null;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  vehicle_details?: string;
  notes?: string;
};

export type RideLocationPayload = {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed_kmph?: number | null;
};

export async function fetchRides(params: { origin?: string; destination?: string; departure_after?: string }) {
  const { data } = await api.get<Ride[]>("/rides", { params });
  return data;
}

export async function fetchMyRides() {
  const { data } = await api.get<Ride[]>("/rides/mine");
  return data;
}

export async function fetchRideDetail(rideId: number, _role: UserRole, _currentUser: User | null) {
  const { data } = await api.get<RideDetail>(`/rides/${rideId}`);
  return data;
}

export async function createRide(payload: RidePayload) {
  const { data } = await api.post<Ride>("/rides", payload);
  return data;
}

export async function updateRide(rideId: number, payload: RidePayload) {
  const { data } = await api.patch<Ride>(`/rides/${rideId}`, payload);
  return data;
}

export async function cancelRide(rideId: number) {
  await api.delete(`/rides/${rideId}`);
}

export async function createBooking(rideId: number, notes?: string) {
  const { data } = await api.post<{ id: number }>("/bookings", { ride_id: rideId, notes });
  return data;
}

export async function updateRideLocation(rideId: number, payload: RideLocationPayload) {
  const { data } = await api.post<RideLocation>(`/rides/${rideId}/location`, payload);
  return data;
}

export async function fetchLatestRideLocation(rideId: number) {
  const { data } = await api.get<RideLocation>(`/rides/${rideId}/location/latest`);
  return data;
}

export async function fetchRideLocationHistory(rideId: number, limit = 25) {
  const { data } = await api.get<RideLocation[]>(`/rides/${rideId}/location/history`, {
    params: { limit },
  });
  return data;
}

export async function fetchRideLocationAccess(rideId: number) {
  const { data } = await api.get<RideLocationAccess>(`/rides/${rideId}/location/access`);
  return data;
}
