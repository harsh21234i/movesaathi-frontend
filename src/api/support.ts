import { api } from "./client";
import type { SupportUser, SupportUserList } from "../types";

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
