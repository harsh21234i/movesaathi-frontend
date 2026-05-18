import { api } from "./client";
import type { AuditCleanupResult, AuditLogList, AuditLogSummary } from "../types";

export async function fetchMyAuditLogs(params?: { limit?: number; offset?: number }) {
  const { data } = await api.get<AuditLogList>("/audit/me", { params });
  return data;
}

export async function fetchMyAuditSummary() {
  const { data } = await api.get<AuditLogSummary>("/audit/me/summary");
  return data;
}

export async function cleanupMyAuditLogs(keepDays = 365) {
  const { data } = await api.delete<AuditCleanupResult>("/audit/me/cleanup", {
    params: { keep_days: keepDays },
  });
  return data;
}
