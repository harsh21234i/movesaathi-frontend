import { useCallback, useRef, useState, type ReactNode } from "react";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "warning" | "danger";
};

type PendingConfirmation = Required<ConfirmOptions>;

export function useConfirmAction() {
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setPendingConfirmation({
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel ?? "Confirm",
      cancelLabel: options.cancelLabel ?? "Keep editing",
      tone: options.tone ?? "warning",
    });

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const resolve = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setPendingConfirmation(null);
  }, []);

  const dialog = pendingConfirmation ? (
    <div
      className="confirm-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          resolve(false);
        }
      }}
    >
      <div
        className={`confirm-dialog ${pendingConfirmation.tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <span className="eyebrow">{pendingConfirmation.tone === "danger" ? "High impact action" : "Confirm action"}</span>
        <h3 id="confirm-dialog-title">{pendingConfirmation.title}</h3>
        <p id="confirm-dialog-description">{pendingConfirmation.description}</p>
        <div className="action-row">
          <button className="primary-button" type="button" autoFocus onClick={() => resolve(true)}>
            {pendingConfirmation.confirmLabel}
          </button>
          <button className="ghost-button" type="button" onClick={() => resolve(false)}>
            {pendingConfirmation.cancelLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return {
    confirm,
    ConfirmDialog: dialog as ReactNode,
  };
}
