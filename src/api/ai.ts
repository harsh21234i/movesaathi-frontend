import { api } from "./client";
import type {
  AIChatSuggestionIntent,
  AIChatSuggestionResponse,
  AIRideCreateAssistantResponse,
  AIRideSearchAssistantResponse,
} from "../types";

export async function createRideDraftWithAI(payload: {
  prompt: string;
  timezone?: string;
  locale?: string;
}) {
  const { data } = await api.post<AIRideCreateAssistantResponse>("/ai/ride-create-assistant", payload);
  return data;
}

export async function createRideSearchWithAI(payload: {
  prompt: string;
  timezone?: string;
  locale?: string;
}) {
  const { data } = await api.post<AIRideSearchAssistantResponse>("/ai/ride-search-assistant", payload);
  return data;
}

export async function suggestChatReplyWithAI(payload: {
  booking_id: number;
  intent: AIChatSuggestionIntent;
  draft_message?: string | null;
  locale?: string;
}) {
  const { data } = await api.post<AIChatSuggestionResponse>("/ai/chat-suggestion", payload);
  return data;
}
