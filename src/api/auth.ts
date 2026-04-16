import { api } from "./client";
import type {
  AuthTokens,
  ForgotPasswordResponse,
  RegisterResponse,
  ResendVerificationResponse,
} from "../types";

export async function login(email: string, password: string) {
  const { data } = await api.post("/auth/login", { email, password });
  return data as AuthTokens;
}

export async function register(payload: {
  full_name: string;
  email: string;
  password: string;
  phone_number?: string;
}) {
  const { data } = await api.post("/auth/register", payload);
  return data as RegisterResponse;
}

export async function refreshSession(refreshToken: string) {
  const { data } = await api.post("/auth/refresh", { refresh_token: refreshToken });
  return data as AuthTokens;
}

export async function logout(refreshToken: string | null) {
  await api.post("/auth/logout", { refresh_token: refreshToken });
}

export async function forgotPassword(email: string) {
  const { data } = await api.post("/auth/forgot-password", { email });
  return data as ForgotPasswordResponse;
}

export async function resetPassword(token: string, newPassword: string) {
  await api.post("/auth/reset-password", { token, new_password: newPassword });
}

export async function verifyEmail(token: string) {
  await api.post("/auth/verify-email", { token });
}

export async function resendVerification(email: string) {
  const { data } = await api.post("/auth/resend-verification", { email });
  return data as ResendVerificationResponse;
}
