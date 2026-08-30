import { api, getWebsocketBaseUrl } from "./client";
import type { DispatchAcceptance, DispatchEvent, DriverPresence, NearbyRideRequest, RideRequest } from "../types";

export type DriverPresencePayload = {
  latitude: number;
  longitude: number;
  heading?: number | null;
  is_online: boolean;
};

export type RideRequestPayload = {
  origin: string;
  destination: string;
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  requested_departure_time: string;
  notes?: string;
};

export async function upsertDriverPresence(payload: DriverPresencePayload) {
  const { data } = await api.post<DriverPresence>("/dispatch/presence", payload);
  return data;
}

export async function fetchDriverPresence() {
  const { data } = await api.get<DriverPresence>("/dispatch/presence");
  return data;
}

export async function createRideRequest(payload: RideRequestPayload) {
  const { data } = await api.post<RideRequest>("/dispatch/requests", payload);
  return data;
}

export async function fetchMyRideRequests(status?: string) {
  const { data } = await api.get<RideRequest[]>("/dispatch/requests/mine", {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function fetchNearbyRideRequests(limit = 20) {
  const { data } = await api.get<NearbyRideRequest[]>("/dispatch/requests/nearby", {
    params: { limit },
  });
  return data;
}

export async function cancelRideRequest(requestId: number) {
  const { data } = await api.post<RideRequest>(`/dispatch/requests/${requestId}/cancel`);
  return data;
}

export async function declineRideRequest(requestId: number) {
  const { data } = await api.post<{ request_id: number; driver_id: number; dismissed: boolean }>(
    `/dispatch/requests/${requestId}/decline`,
  );
  return data;
}

export async function acceptRideRequest(requestId: number) {
  const { data } = await api.post<DispatchAcceptance>(`/dispatch/requests/${requestId}/accept`);
  return data;
}

export function connectDispatchSocket(token: string, handlers: {
  onEvent: (event: DispatchEvent) => void;
  onClose?: () => void;
  onOpen?: () => void;
  onReconnect?: (attempt: number, delayMs: number) => void;
}) {
  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let heartbeatTimer: number | null = null;
  let reconnectAttempt = 0;
  let disposed = false;

  const connect = () => {
    if (disposed) {
      return;
    }
    socket = new WebSocket(`${getWebsocketBaseUrl().replace("/chat/ws", "/dispatch/ws")}?token=${encodeURIComponent(token)}`);

    socket.onopen = () => {
      reconnectAttempt = 0;
      handlers.onOpen?.();
      socket?.send(JSON.stringify({ event_type: "ping" }));
      if (heartbeatTimer != null) {
        window.clearInterval(heartbeatTimer);
      }
      heartbeatTimer = window.setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ event_type: "ping" }));
        }
      }, 20000);
    };

    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as DispatchEvent;
        handlers.onEvent(event);
      } catch {
        // Ignore malformed realtime payloads and let the polling fallback recover.
      }
    };

    socket.onerror = () => {
      socket?.close();
    };

    socket.onclose = () => {
      if (heartbeatTimer != null) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      handlers.onClose?.();
      if (disposed) {
        return;
      }
      if (reconnectTimer != null) {
        window.clearTimeout(reconnectTimer);
      }
      reconnectAttempt += 1;
      const delayMs = Math.min(10000, 500 * 2 ** Math.min(reconnectAttempt, 5));
      handlers.onReconnect?.(reconnectAttempt, delayMs);
      reconnectTimer = window.setTimeout(connect, delayMs);
    };
  };

  connect();

  return {
    close: () => {
      disposed = true;
      if (reconnectTimer != null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (heartbeatTimer != null) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      socket?.close();
    },
  };
}
