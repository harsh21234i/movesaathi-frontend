export type UserRole = "driver" | "passenger";
export type DriverVerificationStatus = "not_submitted" | "pending" | "approved" | "rejected";

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
  driver_verification_status?: DriverVerificationStatus;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_color?: string | null;
  vehicle_plate_number?: string | null;
  driver_license_number?: string | null;
  driver_verification_rejection_reason?: string | null;
  driver_profile_submitted_at?: string | null;
  driver_profile_reviewed_at?: string | null;
  failed_login_attempts?: number;
  locked_until?: string | null;
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
  origin_latitude?: number | null;
  origin_longitude?: number | null;
  destination_latitude?: number | null;
  destination_longitude?: number | null;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  vehicle_details?: string | null;
  notes?: string | null;
  is_active: boolean;
  status?: "scheduled" | "full" | "in_progress" | "completed" | "cancelled";
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
  status: "pending" | "accepted" | "rejected" | "cancelled_by_passenger" | "cancelled_by_driver" | "completed";
  notes?: string | null;
  boarded_at?: string | null;
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

export type RideLocation = {
  id: number;
  ride_id: number;
  driver_id: number;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed_kmph?: number | null;
  created_at: string;
  age_seconds: number;
  is_stale: boolean;
};

export type RideLocationAccess = {
  can_track: boolean;
  reason: string | null;
  tracking_starts_at: string | null;
  tracking_ends_at: string | null;
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

export type Notification = {
  id: number;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type NotificationList = {
  items: Notification[];
  unread_count: number;
};

export type NotificationReadResponse = {
  updated: number;
};

export type SessionSummary = {
  jti: string;
  issued_at: string;
  expires_at: string;
  current_session?: boolean;
  device_name?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
};

export type SessionList = {
  items: SessionSummary[];
};

export type AccountSecurity = {
  failed_login_attempts: number;
  locked_until: string | null;
  is_locked: boolean;
  lockout_reason: string | null;
  recovery_hint: string | null;
};

export type DriverVerification = {
  driver_verification_status: DriverVerificationStatus;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_plate_number: string | null;
  driver_license_number: string | null;
  driver_verification_rejection_reason: string | null;
  driver_profile_submitted_at: string | null;
  driver_profile_reviewed_at: string | null;
};

export type DeploymentStatus = {
  environment: string;
  service: string;
  release: {
    version: string;
    build_sha: string;
    build_timestamp: string;
  };
  production_safe: boolean;
  database: {
    url_scheme: string;
    auto_create_tables: boolean;
  };
  redis: {
    url_scheme: string;
  };
  jobs: {
    enabled: boolean;
    synchronous: boolean;
    max_retries: number;
  };
  integrations: {
    emails_enabled: boolean;
    smtp_configured: boolean;
  };
  migrations: {
    single_head: boolean;
    head_count: number;
    heads: string[];
  };
  preflight: DeploymentPreflight;
};

export type DeploymentPreflight = {
  ready_to_deploy: boolean;
  blocking_issues: string[];
  checks: {
    migrations_single_head: boolean;
    runtime_dependencies_healthy: boolean;
    production_auto_create_disabled: boolean;
    smtp_configured_when_enabled: boolean;
    error_reporting_configured_when_enabled: boolean;
    support_api_configured_when_enabled: boolean;
  };
  runtime_dependencies_healthy: boolean;
  runtime_dependencies: Record<string, { status: string; detail?: string }>;
  migrations: {
    single_head: boolean;
    head_count: number;
    heads: string[];
  };
};

export type DeploymentChecklist = {
  release: {
    version: string;
    service: string;
  };
  deploy_steps: string[];
  rollback_steps: string[];
  guards: {
    single_migration_head: boolean;
    runtime_dependencies_healthy: boolean;
    ready_to_deploy: boolean;
  };
};

export type JobEvent = {
  job_id: string;
  name: string;
  status: string;
  attempts: number;
  max_retries: number;
  error: string | null;
  timestamp: number;
};

export type JobsStatus = {
  worker_enabled: boolean;
  synchronous: boolean;
  worker_running: boolean;
  queued_jobs: number;
  success_total: number;
  retry_total: number;
  failed_total: number;
  last_successful_job: string | null;
  last_failed_job: string | null;
  last_error: string | null;
  recent_events: JobEvent[];
  maintenance_jobs: {
    total: number;
    session_cleanup: number;
    trip_reminders: number;
    audit_retention: number;
  };
  failed_email_jobs: JobEvent[];
};

export type PaymentStatus = "pending" | "authorized" | "captured" | "cancelled" | "refunded" | "failed";
export type PaymentProvider = "mock" | "razorpay" | string;

export type Payment = {
  id: number;
  booking_id: number;
  payer_id: number;
  amount: number;
  amount_minor: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  provider_order_id: string;
  provider_payment_id: string | null;
  checkout_key_id: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingShareToken = {
  token: string;
  booking_id: number;
  created_at: string;
};

export type BookingShareRevoke = {
  revoked: boolean;
};

export type PublicTripStatus = {
  origin: string;
  destination: string;
  departure_time: string;
  ride_status: string;
  booking_status: Booking["status"];
  driver: {
    first_name: string;
    rating: number;
  };
  latest_location: {
    latitude: number;
    longitude: number;
    heading: number | null;
    updated_at: string;
    age_seconds: number;
    is_stale: boolean;
  } | null;
  location_visible: boolean;
};

export type IncidentSeverity = "low" | "medium" | "high" | "emergency";
export type IncidentStatus = "open" | "investigating" | "resolved" | "dismissed";

export type Incident = {
  id: number;
  reporter_id: number;
  ride_id: number | null;
  booking_id: number | null;
  ride_request_id: number | null;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  support_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IncidentList = {
  items: Incident[];
};

export type PaymentList = {
  items: Payment[];
};

export type SupportUser = {
  id: number;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: UserRole;
  bio: string | null;
  rating: number;
  email_verified: boolean;
  email_verified_at: string | null;
  driver_verification_status?: DriverVerificationStatus;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_color?: string | null;
  vehicle_plate_number?: string | null;
  driver_license_number?: string | null;
  driver_verification_rejection_reason?: string | null;
  driver_profile_submitted_at?: string | null;
  driver_profile_reviewed_at?: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  audit_summary: AuditLogSummary | null;
  driver_verification_history?: {
    items: AuditLog[];
  } | null;
};

export type SupportUserList = {
  items: SupportUser[];
};

export type SupportPaymentList = {
  items: Payment[];
};

export type SupportBookingList = {
  items: DriverBooking[];
};

export type AuditLog = {
  id: number;
  actor_user_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  severity: string;
  request_id: string | null;
  metadata_json: string | null;
  created_at: string;
};

export type AuditLogList = {
  items: AuditLog[];
};

export type AuditLogSummary = {
  total: number;
  by_action: Record<string, number>;
  by_severity: Record<string, number>;
  recent_items: AuditLog[];
};

export type AuditCleanupResult = {
  deleted: number;
};

export type Review = {
  id: number;
  reviewer_id: number;
  reviewee_id: number;
  booking_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type DriverPresence = {
  id: number;
  driver_id: number;
  latitude: number;
  longitude: number;
  heading?: number | null;
  is_online: boolean;
  updated_at: string;
};

export type RideRequestStatus = "open" | "matched" | "cancelled" | "expired";

export type RideRequest = {
  id: number;
  passenger_id: number;
  origin: string;
  destination: string;
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  requested_departure_time: string;
  notes?: string | null;
  status: RideRequestStatus;
  matched_driver_id: number | null;
  matched_ride_id: number | null;
  matched_booking_id: number | null;
  created_at: string;
};

export type NearbyRideRequest = RideRequest & {
  distance_km: number;
};

export type DispatchAcceptance = {
  request: RideRequest;
  ride_id: number;
  booking_id: number;
  estimated_price_per_seat: number;
};

export type DispatchEvent =
  | {
      event_type: "nearby_request_created";
      request: RideRequest;
      distance_km: number;
    }
  | {
      event_type: "nearby_request_removed";
      request_id: number;
      reason: "matched" | "cancelled" | "expired" | "declined";
    }
  | {
      event_type: "request_matched";
      request: RideRequest;
      ride_id: number;
      booking_id: number;
      estimated_price_per_seat: number;
    }
  | {
      event_type: "request_cancelled" | "request_expired";
      request: RideRequest;
    }
  | {
      event_type: "pong";
    };

export type AIRideCreateDraft = {
  origin: string | null;
  destination: string | null;
  departure_time: string | null;
  available_seats: number | null;
  price_per_seat: number | null;
  vehicle_details: string | null;
  notes: string | null;
  missing_fields: string[];
  confidence: number;
  safety_notes: string[];
};

export type AIRideCreateAssistantResponse = {
  provider: string;
  model: string;
  used_fallback: boolean;
  draft: AIRideCreateDraft;
};

export type AIRideSearchFilters = {
  origin: string | null;
  destination: string | null;
  departure_after: string | null;
  departure_before: string | null;
  seat_count: number | null;
  max_price_per_seat: number | null;
  missing_fields: string[];
  confidence: number;
  search_summary: string;
  safety_notes: string[];
};

export type AIRideSearchAssistantResponse = {
  provider: string;
  model: string;
  used_fallback: boolean;
  filters: AIRideSearchFilters;
};

export type AIChatSuggestionIntent =
  | "ask_pickup_confirmation"
  | "share_arrival_update"
  | "confirm_luggage"
  | "delay_apology"
  | "general_reply";

export type AIChatSuggestionResponse = {
  provider: string;
  model: string;
  used_fallback: boolean;
  booking_summary: string;
  result: {
    suggestion: string;
    tone: "polite" | "friendly" | "concise" | "safety_warning";
    should_warn: boolean;
    safety_notes: string[];
  };
};
