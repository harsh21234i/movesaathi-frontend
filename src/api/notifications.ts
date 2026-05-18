import { api } from "./client";
import type { NotificationList, Notification, NotificationReadResponse } from "../types";

export async function fetchNotifications(params?: { is_read?: boolean; notification_type?: string; limit?: number; offset?: number }) {
  const { data } = await api.get<NotificationList>("/notifications", { params });
  return data;
}

export async function markNotificationRead(notificationId: number) {
  const { data } = await api.patch<Notification>(`/notifications/${notificationId}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.patch<NotificationReadResponse>("/notifications/read-all");
  return data;
}
