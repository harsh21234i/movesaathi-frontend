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
};

export type SessionList = {
  items: SessionSummary[];
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

export type Payment = {
  id: number;
  booking_id: number;
  payer_id: number;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  provider_payment_id: string;
  provider_client_secret: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
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
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  audit_summary: AuditLogSummary | null;
};

export type SupportUserList = {
  items: SupportUser[];
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
