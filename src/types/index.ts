export type UserRole = "driver" | "passenger";

export type User = {
  id: number;
  full_name: string;
  email: string;
  phone_number?: string | null;
  role: UserRole;
  bio?: string | null;
  rating: number;
  email_verified: boolean;
  email_verified_at?: string | null;
  created_at: string;
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type RegisterResponse = User & {
  verification_token?: string | null;
};

export type ForgotPasswordResponse = {
  message: string;
  reset_token?: string | null;
};

export type ResendVerificationResponse = {
  message: string;
  verification_token?: string | null;
};

export type UserSummary = {
  id: number;
  full_name: string;
  email?: string;
  phone_number?: string | null;
  rating?: number;
  role?: UserRole;
  bio?: string | null;
};

export type Ride = {
  id: number;
  driver_id: number;
  origin: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  vehicle_details?: string | null;
  notes?: string | null;
  is_active: boolean;
};

export type RideDetail = Ride & {
  driver: UserSummary;
  booked_passengers: number;
  passengers: BookingPassengerSummary[];
  booking_id?: number | null;
};

export type Booking = {
  id: number;
  ride_id: number;
  passenger_id: number;
  status: "pending" | "accepted" | "rejected";
  notes?: string | null;
  created_at: string;
};

export type BookingRideSummary = {
  id: number;
  origin: string;
  destination: string;
  departure_time: string;
  price_per_seat: number;
  available_seats: number;
  vehicle_details?: string | null;
};

export type BookingPassengerSummary = {
  id: number;
  full_name: string;
  email: string;
  phone_number?: string | null;
};

export type PassengerBooking = Booking & {
  ride: BookingRideSummary;
};

export type DriverBooking = Booking & {
  ride: BookingRideSummary;
  passenger: BookingPassengerSummary;
};

export type BookingDetail = Booking & {
  ride: RideDetail;
  driver: UserSummary;
  passenger: UserSummary;
  status_events: Array<{
    label: string;
    tone: "done" | "current" | "upcoming";
    timestamp?: string;
  }>;
};

export type Message = {
  id: number;
  booking_id: number;
  sender_id: number;
  content: string;
  message_type: string;
  created_at: string;
  seen_at?: string | null;
};

export type ChatEvent =
  | {
      event_type: "message";
      message: Message;
    }
  | {
      event_type: "typing";
      booking_id: number;
      user_id: number;
      is_typing: boolean;
    }
  | {
      event_type: "seen";
      booking_id: number;
      user_id: number;
      message_ids: number[];
      seen_at: string;
    };

export type ToastTone = "success" | "info" | "warning" | "error";

export type Toast = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};
