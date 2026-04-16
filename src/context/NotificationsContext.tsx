import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { Toast, ToastTone } from "../types";

type NotificationsContextValue = {
  toasts: Toast[];
  pushToast: (input: { title: string; description?: string; tone?: ToastTone }) => void;
  dismissToast: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function dismissToast(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function pushToast(input: { title: string; description?: string; tone?: ToastTone }) {
    const id = crypto.randomUUID();
    const nextToast: Toast = {
      id,
      title: input.title,
      description: input.description,
      tone: input.tone ?? "info",
    };

    setToasts((current) => [...current, nextToast]);

    window.setTimeout(() => {
      dismissToast(id);
    }, 4200);
  }

  const value = useMemo(
    () => ({
      toasts,
      pushToast,
      dismissToast,
    }),
    [toasts],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
}
