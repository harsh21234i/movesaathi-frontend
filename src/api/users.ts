import { api } from "./client";
import type { DriverVerification, User } from "../types";

export async function updateMe(payload: {
  full_name?: string | null;
  phone_number?: string | null;
  bio?: string | null;
}) {
  const { data } = await api.patch<User>("/users/me", payload);
  return data;
}

export async function fetchDriverProfile() {
  const { data } = await api.get<DriverVerification>("/users/me/driver-profile");
  return data;
}

export async function updateDriverProfile(payload: {
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_color?: string | null;
  vehicle_plate_number?: string | null;
  driver_license_number?: string | null;
}) {
  const { data } = await api.patch<DriverVerification>("/users/me/driver-profile", payload);
  return data;
}

