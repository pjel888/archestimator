"use client";

import { useState } from "react";
import { Copy, ShareNetwork } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";

type ShareLinkDisplayProps = {
  projectName: string;
  clientLinkPath: string;
};

function readAbsoluteClientLink(clientLinkPath: string) {
  if (/^https?:\/\//i.test(clientLinkPath)) return clientLinkPath;
  if (typeof window === "undefined") return clientLinkPath;
  return new URL(clientLinkPath, window.location.origin).toString();
}

export function ShareLinkDisplay({ clientLinkPath, projectName }: ShareLinkDisplayProps) {
  const [message, setMessage] = useState<string | null>(null);
  const absoluteLink = readAbsoluteClientLink(clientLinkPath);

  async function copyLink() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable.");
      await navigator.clipboard.writeText(absoluteLink);
      setMessage("Shared link copied.");
    } catch {
      setMessage("Copy unavailable. Select the link to copy it.");
    }
  }

  async function shareLink() {
    if (typeof navigator.share !== "function") {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: projectName, url: absoluteLink });
      setMessage("Share menu opened.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Could not open the share menu. Copy the link instead.");
    }
  }

  return (
    <section aria-label="Shared link" className="space-y-2 rounded-xs border border-hairline bg-surfaceMuted/50 p-3">
      <label htmlFor="share-wizard-link" className="text-[10px] font-medium text-ink">Shared link</label>
      <input
        id="share-wizard-link"
        readOnly
        value={absoluteLink}
        onFocus={(event) => event.currentTarget.select()}
        className="w-full rounded-xs border border-divider bg-white px-2 py-1.5 text-[10px] text-ink"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => void copyLink()}>
          <Copy size={14} aria-hidden="true" />
          Copy
        </Button>
        {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => void shareLink()}>
            <ShareNetwork size={14} aria-hidden="true" />
            Share
          </Button>
        ) : null}
      </div>
      {message ? <p role="status" className="text-[10px] text-secondary">{message}</p> : null}
    </section>
  );
}
