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
