"use client";

import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";

export type ShareDecisionType = "accepted" | "declined" | "revision_requested";

type SharePageDecisionConfirmDialogProps = {
  decision: ShareDecisionType;
  activeReviewTargetLabel: string;
  noteDraft: string;
  signerNameDraft: string;
  isSubmitting: boolean;
  error: string | null;
  announcement: string;
  onClose: () => void;
  onConfirm: () => void;
  onNoteDraftChange: (value: string) => void;
  onSignerNameDraftChange: (value: string) => void;
};

const dialogFocusableSelector =
  "button:not([disabled]), textarea:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

function confirmTitle(decision: ShareDecisionType) {
  if (decision === "accepted") return "Approve this proposal?";
  if (decision === "declined") return "Decline this proposal?";
  return "Request changes?";
}

function confirmBody(decision: ShareDecisionType) {
  if (decision === "accepted") return "We'll notify the project team and keep comments open for follow-up.";
  if (decision === "declined") return "We'll notify the project team. You can still leave comments if context would help.";
  return "Send your requested changes to the project team. Comments remain open for details and follow-up.";
}

export function SharePageDecisionConfirmDialog({
  decision,
  activeReviewTargetLabel,
  noteDraft,
  signerNameDraft,
  isSubmitting,
  error,
  announcement,
  onClose,
  onConfirm,
  onNoteDraftChange,
  onSignerNameDraftChange,
}: SharePageDecisionConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const handleNativeDialogKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(dialogFocusableSelector) ?? []);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  const openDialogElement = useCallback(
    (node: HTMLDialogElement | null) => {
      dialogRef.current?.removeEventListener("keydown", handleNativeDialogKeyDown);
      dialogRef.current = node;
      if (!node) return;
      node.addEventListener("keydown", handleNativeDialogKeyDown);
      if (!node.open) {
        if (typeof node.showModal === "function") {
          try {
            node.showModal();
          } catch {
            node.setAttribute("open", "");
          }
        } else {
          node.setAttribute("open", "");
        }
      }
      window.setTimeout(() => {
        const firstFocusable = node.querySelector<HTMLElement>(dialogFocusableSelector);
        firstFocusable?.focus();
      }, 0);
    },
    [handleNativeDialogKeyDown],
  );

  return (
    <dialog
      ref={openDialogElement}
      aria-modal="true"
      aria-labelledby="decision-confirm-title"
      className="w-[calc(100%-2rem)] max-w-md rounded-xs border border-hairline bg-proposalPaper p-0 text-[13px] leading-[18px] tracking-normal text-ink shadow-sm backdrop:bg-black/40"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="p-4">
        <h2 id="decision-confirm-title" className="text-[15px] font-medium leading-[20px] tracking-normal text-ink">
          {confirmTitle(decision)}
        </h2>
        <p className="mt-2 max-w-[600px] text-[13px] leading-[18px] tracking-normal text-secondary">{confirmBody(decision)}</p>
        <div className="mt-3 rounded-xs border border-hairline bg-white px-2 py-1 text-[12px] leading-[16px] tracking-normal text-secondary">
          Applies to {activeReviewTargetLabel}
        </div>

        {decision === "accepted" ? (
          <div className="mt-3">
            <label className="block text-[12px] font-medium leading-[16px] tracking-normal text-secondary" htmlFor="decision-signer-name">
              Your name
            </label>
            <input
              id="decision-signer-name"
              className="mt-1 w-full rounded-xs border border-hairline bg-white p-2 text-[13px] leading-[18px] tracking-normal text-ink placeholder:text-tertiary focus:bg-accentSoft focus:outline-none"
              maxLength={120}
              placeholder="Enter your name"
              value={signerNameDraft}
              onChange={(event) => onSignerNameDraftChange(event.target.value)}
              disabled={isSubmitting}
              autoComplete="name"
              required
            />
          </div>
        ) : null}

        <div className="mt-3">
          <label className="block text-[12px] font-medium leading-[16px] tracking-normal text-secondary" htmlFor="decision-note">
            Note (optional)
          </label>
          <textarea
            id="decision-note"
            className="mt-1 w-full rounded-xs border border-hairline bg-white p-2 text-[13px] leading-[18px] tracking-normal text-ink placeholder:text-tertiary focus:bg-accentSoft focus:outline-none"
            rows={3}
            maxLength={2000}
            placeholder={decision === "revision_requested" ? "Describe the requested changes..." : "Add a note (optional)"}
            value={noteDraft}
            onChange={(event) => onNoteDraftChange(event.target.value)}
            disabled={isSubmitting}
          />
          <div className="mt-0.5 text-right text-[11px] leading-[15px] tracking-normal text-secondary">{noteDraft.length}/2000</div>
        </div>

        {error && <p role="alert" className="mt-2 text-[12px] leading-[16px] tracking-normal text-danger">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant={decision === "declined" ? "secondary" : "primary"}
            size="sm"
            onClick={onConfirm}
            disabled={isSubmitting || (decision === "accepted" && !signerNameDraft.trim())}
          >
            {isSubmitting ? "Recording..." : "Confirm"}
          </Button>
        </div>
        <div aria-live="polite" className="sr-only">{announcement}</div>
      </div>
    </dialog>
  );
}
