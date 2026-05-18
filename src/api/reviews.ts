import { api } from "./client";
import type { Review } from "../types";

export async function createReview(payload: {
  booking_id: number;
  reviewee_id: number;
  rating: number;
  comment?: string | null;
}) {
  const { data } = await api.post<Review>("/reviews", payload);
  return data;
}
