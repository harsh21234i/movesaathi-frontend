import { api } from "./client";
import type {
  AccountSecurity,
  AuthTokens,
  ForgotPasswordResponse,
  RegisterResponse,
  SessionList,
  ResendVerificationResponse,
  UserRole,
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
  role: UserRole;
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

export async function changePassword(currentPassword: string, newPassword: string) {
  await api.post("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export async function verifyEmail(token: string) {
  await api.post("/auth/verify-email", { token });
}

export async function resendVerification(email: string) {
  const { data } = await api.post("/auth/resend-verification", { email });
  return data as ResendVerificationResponse;
}

export async function fetchSessions() {
  const { data } = await api.get<SessionList>("/auth/sessions");
  return data;
}

export async function fetchAccountSecurity() {
  const { data } = await api.get<AccountSecurity>("/auth/security");
  return data;
}

export async function revokeSession(sessionJti: string) {
  await api.delete(`/auth/sessions/${sessionJti}`);
}

export async function revokeOtherSessions() {
  await api.post("/auth/sessions/revoke-others");
}
