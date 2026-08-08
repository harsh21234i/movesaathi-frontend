import { api } from "./client";
import type { Payment, PaymentList } from "../types";

export async function createPayment(payload: { booking_id: number; currency?: string }) {
  const { data } = await api.post<Payment>("/payments", payload);
  return data;
}

export async function fetchMyPayments(params?: { limit?: number; offset?: number }) {
  const { data } = await api.get<PaymentList>("/payments/mine", { params });
  return data;
}

export async function fetchBookingPayment(bookingId: number) {
  const { data } = await api.get<Payment>(`/payments/bookings/${bookingId}`);
  return data;
}

export async function fetchPayment(paymentId: number) {
  const { data } = await api.get<Payment>(`/payments/${paymentId}`);
  return data;
}

export async function confirmPayment(paymentId: number) {
  const { data } = await api.post<Payment>(`/payments/${paymentId}/confirm`);
  return data;
}

export async function reconcilePayment(paymentId: number) {
  const { data } = await api.post<Payment>(`/payments/${paymentId}/reconcile`);
  return data;
}
