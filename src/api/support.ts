import { api } from "./client";
import type {
  DriverVerificationStatus,
  Incident,
  IncidentList,
  IncidentStatus,
  Payment,
  PaymentProvider,
  PaymentStatus,
  SupportBookingList,
  SupportPaymentList,
  SupportUser,
  SupportUserList,
} from "../types";

export async function searchSupportUsers(email?: string) {
  const { data } = await api.get<SupportUserList>("/support/users", {
    params: email ? { email } : undefined,
  });
  return data;
}

export async function fetchSupportUser(userId: number) {
  const { data } = await api.get<SupportUser>(`/support/users/${userId}`);
  return data;
}

export async function fetchSupportDriverVerifications(params?: {
  status?: DriverVerificationStatus;
  email?: string;
  vehicle_plate_number?: string;
  limit?: number;
  offset?: number;
}) {
  const { data } = await api.get<SupportUserList>("/support/driver-verifications", { params });
  return data;
}

export async function fetchPendingDriverVerifications(params?: { limit?: number; offset?: number }) {
  const { data } = await api.get<SupportUserList>("/support/driver-verifications/pending", { params });
  return data;
}

export async function reviewDriverVerification(
  userId: number,
  payload: { status: DriverVerificationStatus; rejection_reason?: string | null },
) {
  const { data } = await api.patch<SupportUser>(`/support/driver-verifications/${userId}`, payload);
  return data;
}

export async function fetchSupportIncidents(params?: {
  status?: IncidentStatus;
  reporter_id?: number;
  ride_id?: number;
  booking_id?: number;
  limit?: number;
  offset?: number;
}) {
  const { data } = await api.get<IncidentList>("/support/incidents", { params });
  return data;
}

export async function updateSupportIncident(
  incidentId: number,
  payload: { status: IncidentStatus; support_notes?: string | null },
) {
  const { data } = await api.patch<Incident>(`/support/incidents/${incidentId}`, payload);
  return data;
}

export async function fetchSupportPayments(params?: {
  status?: PaymentStatus;
  provider?: PaymentProvider;
  booking_id?: number;
  payer_id?: number;
  limit?: number;
  offset?: number;
}) {
  const { data } = await api.get<SupportPaymentList>("/support/payments", { params });
  return data;
}

export async function fetchSupportBookings(params?: {
  status?: string;
  driver_id?: number;
  passenger_id?: number;
  ride_id?: number;
  boarded?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { data } = await api.get<SupportBookingList>("/support/bookings", { params });
  return data;
}

export async function reconcileSupportPayment(paymentId: number) {
  const { data } = await api.post<Payment>(`/support/payments/${paymentId}/reconcile`);
  return data;
}
