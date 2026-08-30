import { useEffect, useState } from "react";

import { checkApiHealth } from "../api/client";

type ApiStatus = "checking" | "online" | "offline";

export function ApiStatusBanner() {
  const [status, setStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    let mounted = true;

    async function ping() {
      try {
        await checkApiHealth();
        if (mounted) {
          setStatus("online");
        }
      } catch {
        if (mounted) {
          setStatus("offline");
        }
      }
    }

    void ping();
    const intervalId = window.setInterval(() => {
      void ping();
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  if (status === "online") {
    return null;
  }

  return (
    <div className={`api-status-banner ${status}`} role="status" aria-live="polite">
      <strong>{status === "checking" ? "Checking backend connection" : "Backend connection unavailable"}</strong>
      <span>
        {status === "checking"
          ? "Restoring API health before loading live ride data."
          : "Start the backend on port 8000 or check VITE_API_URL before continuing."}
      </span>
    </div>
  );
}
