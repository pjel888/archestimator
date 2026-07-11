"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Copy, Eye, ShareNetwork } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";

type ShareLinkDisplayProps = {
  projectName: string;
  clientLinkPath: string;
  previewHref?: string;
};

function subscribeToBrowserState() {
  return () => undefined;
}

export function ShareLinkDisplay({ clientLinkPath, previewHref, projectName }: ShareLinkDisplayProps) {
  const [message, setMessage] = useState<string | null>(null);
  const browserOrigin = useSyncExternalStore(subscribeToBrowserState, () => window.location.origin, () => null);
  const nativeShareAvailable = useSyncExternalStore(subscribeToBrowserState, () => typeof navigator.share === "function", () => false);
  const absoluteLink = /^https?:\/\//i.test(clientLinkPath) || !browserOrigin
    ? clientLinkPath
    : new URL(clientLinkPath, browserOrigin).toString();

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
      <label htmlFor="share-wizard-link" className="text-[11px] font-medium leading-4 text-ink">Shared link</label>
      <input
        id="share-wizard-link"
        readOnly
        value={absoluteLink}
        onFocus={(event) => event.currentTarget.select()}
        className="w-full rounded-xs border border-divider bg-white px-2 py-2 text-[11px] leading-4 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" variant="primary" size="sm" className="min-h-11 sm:min-h-8" onClick={() => void copyLink()}>
          <Copy size={14} aria-hidden="true" />
          Copy
        </Button>
        {previewHref ? (
          <Link href={previewHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xs border border-divider bg-surface px-2 text-[10px] font-medium text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:min-h-8" aria-label={`Preview shared page for ${projectName}`}>
            <Eye size={14} aria-hidden="true" /> Preview
          </Link>
        ) : null}
        {nativeShareAvailable ? (
          <Button type="button" variant="secondary" size="sm" className="min-h-11 sm:min-h-8" aria-label={`Share link for ${projectName}`} onClick={() => void shareLink()}>
            <ShareNetwork size={14} aria-hidden="true" />
            Share
          </Button>
        ) : null}
      </div>
      {message ? <p role="status" className="text-[10px] text-secondary">{message}</p> : null}
    </section>
  );
}
