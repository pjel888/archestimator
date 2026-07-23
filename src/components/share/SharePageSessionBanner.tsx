"use client";

import { useState } from "react";
import { SHARE_CONTAINER_WIDTH } from "@/components/share/ShareContainer";
import { createPublicationCsrfHeaders } from "@/lib/publication/client-csrf";

type SharePageSessionBannerProps = {
  recipientEmail?: string | null;
  token: string;
};

export function SharePageSessionBanner({ recipientEmail = null, token }: SharePageSessionBannerProps) {
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
          <p className="min-w-0 truncate text-[10px] font-medium leading-[14px] text-secondary">
            You are reviewing as {recipientEmail}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-xs bg-surfaceMuted px-2 py-1 text-[9px] font-medium leading-[12px] text-secondary">
              Reviewer
            </span>
            <button
              type="button"
              onClick={clearRecipientSession}
              disabled={isClearingRecipientSession}
              className="min-h-11 cursor-pointer rounded-xs px-2.5 py-1 text-[10px] font-medium leading-[14px] text-secondary transition hover:bg-surfaceMuted hover:text-ink disabled:cursor-wait disabled:opacity-60"
            >
              Not you?
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
