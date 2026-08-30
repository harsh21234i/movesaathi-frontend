import { api } from "./client";
import type { Incident, IncidentList, IncidentSeverity, IncidentStatus } from "../types";

export async function createIncident(payload: {
  ride_id?: number | null;
  booking_id?: number | null;
  ride_request_id?: number | null;
  title: string;
  description: string;
  severity: IncidentSeverity;
}) {
  const { data } = await api.post<Incident>("/incidents", payload);
  return data;
}

export async function fetchMyIncidents(params?: { limit?: number; offset?: number }) {
  const { data } = await api.get<IncidentList>("/incidents", { params });
  return data;
}

export async function fetchMyIncident(incidentId: number) {
  const { data } = await api.get<Incident>(`/incidents/${incidentId}`);
  return data;
}

export async function updateSupportIncidentStatus(
  incidentId: number,
  payload: { status: IncidentStatus; support_notes?: string | null },
) {
  const { data } = await api.patch<Incident>(`/support/incidents/${incidentId}`, payload);
  return data;
}
