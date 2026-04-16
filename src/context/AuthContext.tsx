import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { api, configureApiSession } from "../api/client";
import { logout as logoutRequest, refreshSession } from "../api/auth";
import type { AuthTokens, User } from "../types";

type SessionState = {
  accessToken: string | null;
  refreshToken: string | null;
};

type AuthContextValue = {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isReady: boolean;
  setSession: (tokens: AuthTokens) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_TOKEN_KEY = "moovesaathi_access_token";
const REFRESH_TOKEN_KEY = "moovesaathi_refresh_token";

function readStoredSession(): SessionState {
  return {
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  };
}

function writeStoredSession(tokens: { access_token: string; refresh_token: string }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

function clearStoredSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialSession = readStoredSession();
  const [session, setSessionState] = useState<SessionState>(initialSession);
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const logoutInFlight = useRef(false);

  useEffect(() => {
    configureApiSession({
      readSession: () => session,
      writeSession: (tokens) => {
        writeStoredSession(tokens);
        startTransition(() => {
          setSessionState({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
          });
        });
      },
      resetSession: () => {
        clearStoredSession();
        startTransition(() => {
          setSessionState({ accessToken: null, refreshToken: null });
          setUser(null);
        });
      },
      refreshHandler: refreshSession,
    });
  }, [session]);

  async function refreshUser() {
    if (!session.accessToken) {
      setUser(null);
      return;
    }

    const response = await api.get<User>("/users/me");
    setUser(response.data);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!session.accessToken) {
        if (!cancelled) {
          setUser(null);
          setIsReady(true);
        }
        return;
      }

      try {
        const response = await api.get<User>("/users/me");
        if (!cancelled) {
          setUser(response.data);
        }
      } catch {
        clearStoredSession();
        if (!cancelled) {
          setSessionState({ accessToken: null, refreshToken: null });
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [session.accessToken]);

  async function handleSetSession(tokens: AuthTokens) {
    writeStoredSession(tokens);
    setSessionState({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
    const response = await api.get<User>("/users/me");
    setUser(response.data);
    setIsReady(true);
  }

  async function handleLogout() {
    if (logoutInFlight.current) {
      return;
    }

    logoutInFlight.current = true;
    const refreshToken = session.refreshToken;
    clearStoredSession();
    setSessionState({ accessToken: null, refreshToken: null });
    setUser(null);
    setIsReady(true);

    try {
      await logoutRequest(refreshToken);
    } catch {
      // Local session teardown matters more than remote logout best effort.
    } finally {
      logoutInFlight.current = false;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        token: session.accessToken,
        refreshToken: session.refreshToken,
        user,
        isReady,
        setSession: handleSetSession,
        refreshUser,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
