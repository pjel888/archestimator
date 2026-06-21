"use client";

import { useState } from "react";
import { useSharedLinkSession } from "@/hooks/use-shared-link-session";
import { SHARE_CONTAINER_WIDTH } from "@/components/share/ShareContainer";
import { createPublicationCsrfHeaders } from "@/lib/publication/client-csrf";

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
      await fetch(`/api/share/${encodeURIComponent(token)}/session`, {
        method: "DELETE",
        headers: createPublicationCsrfHeaders(),
      });
    } finally {
      window.location.reload();
    }
  }

  if (recipientEmail) {
    return (
      <div className="border-b border-hairline bg-white">
        <div className={`${SHARE_CONTAINER_WIDTH} flex items-center justify-between gap-3 py-2`}>
          <p className="min-w-0 truncate text-[12px] font-medium uppercase leading-[16px] tracking-normal text-secondary">
            You are reviewing as {recipientEmail}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-xs bg-surfaceMuted px-2 py-1 text-[12px] font-medium uppercase leading-[16px] tracking-normal text-secondary">
              Reviewer
            </span>
            <button
              type="button"
              onClick={clearRecipientSession}
              disabled={isClearingRecipientSession}
              className="min-h-11 rounded-xs px-2.5 py-1 text-[12px] font-medium uppercase leading-[16px] tracking-normal text-secondary transition hover:bg-surfaceMuted hover:text-ink disabled:cursor-wait disabled:opacity-60"
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
    <div className="border-b border-hairline bg-surfaceMuted">
      <div className={`${SHARE_CONTAINER_WIDTH} flex items-start justify-between gap-3 py-2.5`}>
        <p className="text-[12px] font-medium uppercase leading-[16px] tracking-normal text-secondary">
          Sign in as a recipient to comment and respond to this proposal.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xs text-[16px] leading-none text-secondary transition hover:bg-surfaceMuted hover:text-ink"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
