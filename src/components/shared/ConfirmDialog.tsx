import type { ReactNode } from "react";

type Props = {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Shared confirm-before-you-commit dialog. Used for both the proposal
 * approve flow ("this places a real order") and the Copilot auto-execute
 * opt-in flow ("trades place without per-trade approval").
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  danger = false,
  disabled = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      role="presentation"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          maxWidth: 440,
          width: "100%",
          padding: 20,
          boxShadow: "var(--shadow-elevated)",
        }}
      >
        <div
          id="confirm-dialog-title"
          className="heading-tight"
          style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}
        >
          {title}
        </div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 20 }}>
          {body}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className="btn btn-sm"
            disabled={disabled}
            onClick={onConfirm}
            style={{
              background: danger ? "var(--negative)" : "var(--accent-bg)",
              color: danger ? "#fff" : "var(--accent-text)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
