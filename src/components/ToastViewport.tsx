import { useNotifications } from "../context/NotificationsContext";

export function ToastViewport() {
  const { toasts, dismissToast } = useNotifications();

  return (
    <div className="toast-stack" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <article key={toast.id} className={`toast-card ${toast.tone}`}>
          <div>
            <strong>{toast.title}</strong>
            {toast.description ? <p>{toast.description}</p> : null}
          </div>
          <button className="toast-dismiss" type="button" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">
            ×
          </button>
        </article>
      ))}
    </div>
  );
}
