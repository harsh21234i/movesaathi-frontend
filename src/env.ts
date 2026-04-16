function readEnv(name: "VITE_API_URL" | "VITE_WS_URL", fallback: string) {
  const value = import.meta.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  apiUrl: readEnv("VITE_API_URL", "http://localhost:8000/api/v1"),
  wsUrl: readEnv("VITE_WS_URL", "ws://localhost:8000/api/v1/chat/ws"),
};
