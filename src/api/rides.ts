import { api } from "./client";
import { fetchManagedBookings, fetchMyBookings } from "./bookings";
import type { Ride, RideDetail, User, UserSummary, UserRole } from "../types";

function fallbackDriverSummary(ride: Ride, currentUser: User | null, role: UserRole): UserSummary {
  if (role === "driver" && currentUser?.id === ride.driver_id) {
    return {
      id: currentUser.id,
      full_name: currentUser.full_name,
      email: currentUser.email,
      phone_number: currentUser.phone_number,
      rating: currentUser.rating,
      role: currentUser.role,
      bio: currentUser.bio,
    };
  }

  return {
    id: ride.driver_id,
    full_name: "Verified driver",
    rating: 4.8,
    role: "driver",
    bio: "Live trip host with seat confirmation and in-app chat enabled.",
  };
}

export async function fetchRides(params: { origin?: string; destination?: string; departure_after?: string }) {
  const { data } = await api.get<Ride[]>("/rides", { params });
  return data;
}

export async function fetchMyRides() {
  const { data } = await api.get<Ride[]>("/rides/mine");
  return data;
}

export async function fetchRideDetail(rideId: number, role: UserRole, currentUser: User | null) {
  try {
    const { data } = await api.get<RideDetail>(`/rides/${rideId}`);
    return data;
  } catch {
    const rideSources = await Promise.allSettled([fetchRides({}), fetchMyRides()]);
    const rides = rideSources.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
    const ride = rides.find((item) => item.id === rideId);
    if (!ride) {
      throw new Error("Ride not found.");
    }

    const driver = fallbackDriverSummary(ride, currentUser, role);
    const managed = role === "driver" ? await fetchManagedBookings().catch(() => []) : [];
    const ownBooking = role === "passenger" ? (await fetchMyBookings().catch(() => [])).find((item) => item.ride.id === rideId) : undefined;
    const passengers = managed
      .filter((booking) => booking.ride.id === rideId)
      .map((booking) => booking.passenger);

    return {
      ...ride,
      driver,
      booked_passengers: passengers.length,
      passengers,
      booking_id: ownBooking?.id ?? null,
    } satisfies RideDetail;
  }
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

export async function updateRide(
  rideId: number,
  payload: {
    origin: string;
    destination: string;
    departure_time: string;
    available_seats: number;
    price_per_seat: number;
    vehicle_details?: string;
    notes?: string;
  },
) {
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
