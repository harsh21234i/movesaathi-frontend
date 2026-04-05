import { createContext, useContext, useEffect, useState } from "react";

import { api } from "../api/client";
import type { User } from "../types";

type AuthContextValue = {
  token: string | null;
  user: User | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("moovesaathi_token"));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    api
      .get<User>("/users/me")
      .then((response) => setUser(response.data))
      .catch(() => {
        localStorage.removeItem("moovesaathi_token");
        setToken(null);
        setUser(null);
      });
  }, [token]);

  async function handleLogin(nextToken: string) {
    localStorage.setItem("moovesaathi_token", nextToken);
    setToken(nextToken);
    const response = await api.get<User>("/users/me");
    setUser(response.data);
  }

  function handleLogout() {
    localStorage.removeItem("moovesaathi_token");
    setToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ token, user, login: handleLogin, logout: handleLogout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
