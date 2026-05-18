import { api } from "./client";
import type { JobsStatus } from "../types";

export async function fetchJobsStatus() {
  const { data } = await api.get<JobsStatus>("/jobs/status");
  return data;
}
