import { api } from "./client";

export async function login(email: string, password: string) {
  const { data } = await api.post("/auth/login", { email, password });
  return data as { access_token: string; token_type: string };
}

export async function register(payload: {
  full_name: string;
  email: string;
  password: string;
  phone_number?: string;
}) {
  const { data } = await api.post("/auth/register", payload);
  return data;
}
