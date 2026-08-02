import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve: (value: boolean) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useConfirm() — returns an async confirm() function that resolves true/false.
 * Usage:
 *   const { confirm, ConfirmDialog } = useConfirm();
 *   const ok = await confirm({ message: "Delete this item?" });
 *   if (ok) doDelete();
 *
 *   // In JSX:
 *   <ConfirmDialog />
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    message: "",
    resolve: () => {},
  });

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...opts, open: true, resolve });
    });
  }, []);

  const handleResponse = (result: boolean) => {
    state.resolve(result);
    setState((s) => ({ ...s, open: false }));
  };

  const Dialog = () =>
    state.open ? (
      <ConfirmDialogUI
        {...state}
        onConfirm={() => handleResponse(true)}
        onCancel={() => handleResponse(false)}
      />
    ) : null;

  return { confirm, ConfirmDialog: Dialog };
}

// ─── Standalone modal UI ──────────────────────────────────────────────────────

interface DialogUIProps extends ConfirmOptions {
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialogUI({
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: DialogUIProps) {
  const iconColor =
    variant === "danger"
      ? "bg-rose-100 text-rose-600"
      : variant === "warning"
        ? "bg-amber-100 text-amber-600"
        : "bg-primary/10 text-primary";

  const btnColor =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-700 text-white"
      : variant === "warning"
        ? "bg-amber-500 hover:bg-amber-600 text-white"
        : "bg-primary hover:bg-primary/90 text-primary-foreground";

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm animate-in fade-in zoom-in-95 rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${iconColor}`}
        >
          {variant === "danger" ? (
            <Trash2 className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
        </div>

        {/* Title */}
        {title && (
          <h3 className="mb-1 text-center font-display text-base font-bold text-foreground">
            {title}
          </h3>
        )}

        {/* Message */}
        <p className="text-center text-sm text-muted-foreground leading-relaxed">{message}</p>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${btnColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
