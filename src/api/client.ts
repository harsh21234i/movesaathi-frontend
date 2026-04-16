import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { env } from "../env";

type SessionReader = () => { accessToken: string | null; refreshToken: string | null };
type SessionWriter = (tokens: { access_token: string; refresh_token: string }) => void;
type SessionReset = () => void;
type RefreshHandler = (refreshToken: string) => Promise<{ access_token: string; refresh_token: string }>;

let readSession: SessionReader = () => ({ accessToken: null, refreshToken: null });
let writeSession: SessionWriter = () => undefined;
let resetSession: SessionReset = () => undefined;
let refreshHandler: RefreshHandler | null = null;

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const api = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
});

export function configureApiSession(options: {
  readSession: SessionReader;
  writeSession: SessionWriter;
  resetSession: SessionReset;
  refreshHandler: RefreshHandler;
}) {
  readSession = options.readSession;
  writeSession = options.writeSession;
  resetSession = options.resetSession;
  refreshHandler = options.refreshHandler;
}

api.interceptors.request.use((config) => {
  const { accessToken } = readSession();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? "";
    if (
      !originalRequest ||
      originalRequest._retry ||
      error.response?.status !== 401 ||
      !refreshHandler ||
      requestUrl.includes("/auth/refresh")
    ) {
      throw error;
    }

    const { refreshToken } = readSession();
    if (!refreshToken) {
      resetSession();
      throw error;
    }

    try {
      originalRequest._retry = true;
      const nextTokens = await refreshHandler(refreshToken);
      writeSession(nextTokens);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${nextTokens.access_token}`;
      return await api(originalRequest);
    } catch {
      resetSession();
      throw error;
    }
  },
);

export function getWebsocketBaseUrl() {
  return env.wsUrl.replace(/\/$/, "");
}
