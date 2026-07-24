"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import { Copy, Eye, ShareNetwork } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { onboardingTarget } from "@/lib/onboarding/target-catalog";
import { useClientLinksLearning } from "./ClientLinksLearningRail";

type ShareLinkDisplayProps = {
  projectName: string;
  projectId: string;
  clientLinkPath: string;
  previewHref?: string;
};

function subscribeToBrowserState() {
  return () => undefined;
}

export function ShareLinkDisplay({
  clientLinkPath,
  previewHref,
  projectId,
  projectName,
}: ShareLinkDisplayProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [selectableFallback, setSelectableFallback] = useState(false);
  const learning = useClientLinksLearning();
  const browserOrigin = useSyncExternalStore(subscribeToBrowserState, () => window.location.origin, () => null);
  const nativeShareAvailable = useSyncExternalStore(subscribeToBrowserState, () => typeof navigator.share === "function", () => false);
  const absoluteLink = /^https?:\/\//i.test(clientLinkPath) || !browserOrigin
    ? clientLinkPath
    : new URL(clientLinkPath, browserOrigin).toString();

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 3_000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  async function copyLink() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable.");
      await navigator.clipboard.writeText(absoluteLink);
      setSelectableFallback(false);
    } catch {
      setMessage("Copy unavailable. Select the link to copy it.");
      setSelectableFallback(true);
      return;
    }

    try {
      const completion = await learning?.complete(projectId, "copy");
      setMessage(completion?.message ?? "Shared link copied.");
    } catch {
      setMessage(
        "Shared link copied, but guide completion could not be verified. Resume the guide and try again.",
      );
    }
  }

  async function acknowledgeSelectableLink() {
    try {
      const completion = await learning?.complete(projectId, "selectable_link");
      setMessage(completion?.message ?? "Selectable link acknowledged.");
    } catch {
      setMessage(
        "The selected link is ready, but guide completion could not be verified. Resume the guide and try again.",
      );
    }
  }

  async function openPreview(event: MouseEvent<HTMLAnchorElement>) {
    if (!previewHref) return;
    if (!learning?.active) return;
    event.preventDefault();
    try {
      const completion = await learning.complete(projectId, "authenticated_preview");
      if (completion && !completion.ok) {
        setMessage(completion.message);
        return;
      }
      window.location.assign(previewHref);
    } catch {
      setMessage(
        "Preview could not be verified for this guide. Resume the guide and try again.",
      );
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
    <section
      {...onboardingTarget("publisher.link")}
      aria-label="Shared link"
      className="space-y-2 rounded-xs border border-hairline bg-surfaceMuted/50 p-3"
    >
      <label htmlFor="share-wizard-link" className="text-[10px] font-medium leading-4 text-ink">Client link</label>
      <input
        id="share-wizard-link"
        readOnly
        value={absoluteLink}
        onFocus={(event) => event.currentTarget.select()}
        className="min-h-8 w-full rounded-xs border border-divider bg-white px-2.5 py-1.5 text-[10px] leading-4 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" variant="primary" size="sm" className="min-h-8 px-2.5 !text-[10px]" onClick={() => void copyLink()}>
          <Copy size={16} aria-hidden="true" />
          Copy
        </Button>
        {previewHref ? (
          <Link
            {...onboardingTarget("publisher.preview")}
            href={previewHref}
            className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-xs border border-divider bg-surface px-2.5 text-[10px] font-medium text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            aria-label={`Preview shared page for ${projectName}`}
            onClick={(event) => void openPreview(event)}
          >
            <Eye size={16} aria-hidden="true" /> Preview
          </Link>
        ) : null}
        {nativeShareAvailable ? (
          <Button type="button" variant="secondary" size="sm" className="min-h-8 px-2.5 !text-[10px]" aria-label={`Share link for ${projectName}`} onClick={() => void shareLink()}>
            <ShareNetwork size={16} aria-hidden="true" />
            Share
          </Button>
        ) : null}
      </div>
      {selectableFallback ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-8 px-2.5 !text-[10px]"
          onClick={() => void acknowledgeSelectableLink()}
        >
          I copied the selected link
        </Button>
      ) : null}
      {message ? <p role="status" className="text-[10px] leading-4 text-secondary">{message}</p> : null}
    </section>
  );
}
