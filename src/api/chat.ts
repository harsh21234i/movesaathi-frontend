import { api } from "./client";
import type { Message } from "../types";

export async function fetchMessages(bookingId: number) {
  const { data } = await api.get<Message[]>(`/chat/${bookingId}/messages`);
  return data;
}

export async function sendMessage(bookingId: number, content: string) {
  const { data } = await api.post<Message>("/chat/messages", {
    booking_id: bookingId,
    content,
  });
  return data;
}

export async function markMessagesSeen(bookingId: number) {
  const { data } = await api.post<{ updated: number; message_ids: number[]; seen_at: string | null }>(`/chat/${bookingId}/seen`);
  return data;
}
