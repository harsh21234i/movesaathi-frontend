import { api } from "./client";
import type { DeploymentChecklist, DeploymentPreflight, DeploymentStatus } from "../types";

export async function fetchDeploymentStatus() {
  const { data } = await api.get<DeploymentStatus>("/deployment/status");
  return data;
}

export async function fetchDeploymentPreflight() {
  const { data } = await api.get<DeploymentPreflight>("/deployment/preflight");
  return data;
}

export async function fetchDeploymentChecklist() {
  const { data } = await api.get<DeploymentChecklist>("/deployment/checklist");
  return data;
}
