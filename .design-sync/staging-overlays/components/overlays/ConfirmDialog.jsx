import React from "react";

/**
 * ConfirmDialog — the small decision modal (live: ConfirmDialog over AppModal).
 * A short `sm` modal with a ghost Cancel and a primary/danger Confirm. Use
 * `tone="destructive"` for delete/irreversible actions — it switches the
 * confirm to the danger button, sets the alertdialog role, and tints the head.
 * `busy` swaps the confirm label to "Working" and disables it; `error` shows a
 * soft-red banner above the message.
 */

let injected = false;
function useConfirmCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "confirm-dialog");
  el.textContent = `
  .ae-confirm__msg{font-family:var(--font-sf-pro);font-size:10px;line-height:16px;letter-spacing:0;color:var(--secondary);}
  .ae-confirm__err{margin-bottom:12px;border:1px solid var(--danger-soft);background:var(--danger-soft);
    padding:6px 8px;font-family:var(--font-sf-pro);font-size:9px;line-height:16px;color:var(--danger);}
  `;
  document.head.appendChild(el);
}

export function ConfirmDialog({
  open = true,
  onConfirm,
  onCancel,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  error,
  inline = false,
  children,
}) {
  useConfirmCss();
  const NS = (typeof window !== "undefined" && window.ArchestimatorDesignSystem_3fbb6f) || {};
  const Modal = NS.Modal;
  const Button = NS.Button;
  if (!Modal) return null;
  const destructive = tone === "destructive" || tone === "danger";
  const close = onClose || onCancel;
  const footer = (
    <>
      <Button variant="ghost" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        variant={destructive ? "danger" : "primary"}
        aria-busy={busy ? "true" : undefined}
        disabled={busy}
        onClick={busy ? undefined : onConfirm}
      >
        {busy ? "Working" : confirmLabel}
      </Button>
    </>
  );
  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      description={description}
      tone={tone}
      size="sm"
      inline={inline}
      footer={footer}
    >
      {error ? <div className="ae-confirm__err">{error}</div> : null}
      {children ? <div className="ae-confirm__msg">{children}</div> : null}
    </Modal>
  );
}
