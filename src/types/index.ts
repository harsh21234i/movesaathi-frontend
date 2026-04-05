export type User = {
  id: number;
  full_name: string;
  email: string;
  phone_number?: string | null;
  bio?: string | null;
  rating: number;
  created_at: string;
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

export type Booking = {
  id: number;
  ride_id: number;
  passenger_id: number;
  status: "pending" | "accepted" | "rejected";
  notes?: string | null;
  created_at: string;
};

export type Message = {
  id: number;
  booking_id: number;
  sender_id: number;
  content: string;
  message_type: string;
  created_at: string;
};
