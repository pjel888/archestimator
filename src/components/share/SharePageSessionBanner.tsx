"use client";

import { useState } from "react";
import { useSharedLinkSession } from "@/hooks/use-shared-link-session";

type SharePageSessionBannerProps = {
  recipientEmail?: string | null;
  token: string;
};

export function SharePageSessionBanner({ recipientEmail = null, token }: SharePageSessionBannerProps) {
  const { isValid: hasValidRecipientSession } = useSharedLinkSession();
  const [dismissed, setDismissed] = useState(false);
  const [isClearingRecipientSession, setIsClearingRecipientSession] = useState(false);

  async function clearRecipientSession() {
    setIsClearingRecipientSession(true);
    try {
      await fetch(`/api/share/${encodeURIComponent(token)}/session`, { method: "DELETE" });
    } finally {
      window.location.reload();
    }
  }

  if (recipientEmail) {
    return (
      <div className="border-b border-hairline bg-surfaceMuted">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <p className="min-w-0 truncate text-[9px] font-medium uppercase leading-3 tracking-normal text-secondary">
            Viewing as {recipientEmail}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-xs bg-white px-1.5 py-0.5 text-[8px] font-medium uppercase leading-[10px] text-tertiary">
              Recipient
            </span>
            <button
              type="button"
              onClick={clearRecipientSession}
              disabled={isClearingRecipientSession}
              className="rounded-xs px-1.5 py-0.5 text-[9px] font-medium uppercase leading-3 text-tertiary transition hover:bg-white hover:text-ink disabled:cursor-wait disabled:opacity-60"
            >
              Not you?
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hasValidRecipientSession || dismissed) return null;

  return (
    <div className="border-b border-hairline bg-canvas">
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">
          Recipient session required for interactive features (comments, decisions). Use a recipient link to enable.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-xs p-0.5 text-[11px] leading-none text-tertiary transition hover:bg-surfaceMuted hover:text-ink"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
