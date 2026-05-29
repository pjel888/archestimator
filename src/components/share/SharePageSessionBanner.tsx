"use client";

import { useState } from "react";
import { useSharedLinkSession } from "@/hooks/use-shared-link-session";

export function SharePageSessionBanner() {
  const { isValid: hasValidRecipientSession } = useSharedLinkSession();
  const [dismissed, setDismissed] = useState(false);

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
