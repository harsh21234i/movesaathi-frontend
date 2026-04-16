import { api } from "./client";
import type {
  Booking,
  BookingDetail,
  DriverBooking,
  PassengerBooking,
  RideDetail,
  User,
  UserSummary,
  UserRole,
} from "../types";

function buildDriverSummary(ride: PassengerBooking["ride"], role: UserRole, currentUser: User | null): UserSummary {
  if (role === "driver" && currentUser) {
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
    id: ride.id,
    full_name: "Verified driver",
    rating: 4.8,
    role: "driver",
    bio: "Experienced route host with live coordination enabled.",
  };
}

function buildStatusEvents(status: Booking["status"], createdAt: string) {
  return [
    {
      label: "Booking requested",
      tone: "done" as const,
      timestamp: createdAt,
    },
    {
      label: "Driver review",
      tone: status === "pending" ? ("current" as const) : ("done" as const),
      timestamp: status !== "pending" ? createdAt : undefined,
    },
    {
      label: status === "accepted" ? "Trip confirmed" : status === "rejected" ? "Request declined" : "Awaiting decision",
      tone: status === "pending" ? ("upcoming" as const) : ("current" as const),
      timestamp: status !== "pending" ? createdAt : undefined,
    },
  ];
}

function toRideDetail(
  ride: PassengerBooking["ride"] | DriverBooking["ride"],
  driver: UserSummary,
  passengers: DriverBooking["passenger"][],
): RideDetail {
  return {
    ...ride,
    driver_id: driver.id,
    notes: "Trip detail shared in the ride note and booking thread.",
    is_active: true,
    driver,
    booked_passengers: passengers.length,
    passengers,
    booking_id: null,
  };
}

export async function fetchMyBookings() {
  const { data } = await api.get<PassengerBooking[]>("/bookings/mine");
  return data;
}

export async function fetchManagedBookings() {
  const { data } = await api.get<DriverBooking[]>("/bookings/managed");
  return data;
}

export async function fetchBookingDetail(bookingId: number, role: UserRole, currentUser: User | null) {
  try {
    const { data } = await api.get<BookingDetail>(`/bookings/${bookingId}`);
    return data;
  } catch {
    if (role === "driver") {
      const managed = await fetchManagedBookings();
      const booking = managed.find((item) => item.id === bookingId);
      if (!booking) {
        throw new Error("Booking not found.");
      }

      const driver = currentUser
        ? {
            id: currentUser.id,
            full_name: currentUser.full_name,
            email: currentUser.email,
            phone_number: currentUser.phone_number,
            rating: currentUser.rating,
            role: currentUser.role,
            bio: currentUser.bio,
          }
        : {
            id: booking.ride.id,
            full_name: "Driver account",
            role: "driver" as const,
          };

      return {
        ...booking,
        ride: toRideDetail(booking.ride, driver, [booking.passenger]),
        driver,
        passenger: {
          id: booking.passenger.id,
          full_name: booking.passenger.full_name,
          email: booking.passenger.email,
          phone_number: booking.passenger.phone_number,
          role: "passenger",
        },
        status_events: buildStatusEvents(booking.status, booking.created_at),
      } satisfies BookingDetail;
    }

    const passengerBookings = await fetchMyBookings();
    const booking = passengerBookings.find((item) => item.id === bookingId);
    if (!booking) {
      throw new Error("Booking not found.");
    }

    const driver = buildDriverSummary(booking.ride, role, currentUser);

    return {
      ...booking,
      ride: {
        ...toRideDetail(booking.ride, driver, []),
        booking_id: booking.id,
      },
      driver,
      passenger: currentUser
        ? {
            id: currentUser.id,
            full_name: currentUser.full_name,
            email: currentUser.email,
            phone_number: currentUser.phone_number,
            role: currentUser.role,
          }
        : {
            id: booking.passenger_id,
            full_name: "Passenger account",
            role: "passenger",
          },
      status_events: buildStatusEvents(booking.status, booking.created_at),
    } satisfies BookingDetail;
  }
}

export async function updateBookingStatus(bookingId: number, status: "accepted" | "rejected") {
  const { data } = await api.patch<Booking>(`/bookings/${bookingId}`, { status });
  return data;
}
