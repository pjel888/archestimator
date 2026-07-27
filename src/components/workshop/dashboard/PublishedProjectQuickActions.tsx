"use client";

import { useState } from "react";
import { ArrowSquareOut, ClockCounterClockwise, LinkSimple } from "@phosphor-icons/react/dist/ssr";

import { Button, ButtonLink } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/overlays/tooltip";

type Feedback = { text: string; tone: "success" | "error" };

type PublishedProjectQuickActionsProps = {
  projectId: string;
  projectName: string;
  clientLinkPath: string;
  canManagePublication: boolean;
};

function readAbsoluteClientLink(clientLinkPath: string) {
  if (/^https?:\/\//i.test(clientLinkPath)) return clientLinkPath;
  if (typeof window === "undefined") return clientLinkPath;
  return new URL(clientLinkPath, window.location.origin).toString();
}

export function PublishedProjectQuickActions({
  projectId,
  projectName,
  clientLinkPath,
  canManagePublication,
}: PublishedProjectQuickActionsProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function copyClientLink() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable.");
      await navigator.clipboard.writeText(readAbsoluteClientLink(clientLinkPath));
      setFeedback({ text: `Copied client link for ${projectName}.`, tone: "success" });
    } catch {
      setFeedback({ text: `Copy unavailable for ${projectName}.`, tone: "error" });
    }
  }

  return (
    <>
      <div className="dashboard-published-actions" aria-label={`Commitment quick actions for ${projectName}`}>
        <Tooltip label="Copy link" side="top">
          <Button
            type="button"
            variant="plain"
            size="icon-xs"
            className="dashboard-published-action"
            aria-label={`Copy ${projectName} client link`}
            onClick={() => void copyClientLink()}
          >
            <LinkSimple size={16} weight="regular" aria-hidden="true" />
          </Button>
        </Tooltip>
        <Tooltip label="Preview portal" side="top">
          <ButtonLink
            href={clientLinkPath}
            variant="plain"
            size="icon-xs"
            target="_blank"
            rel="noreferrer"
            className="dashboard-published-action"
            aria-label={`Preview ${projectName} client portal`}
          >
            <ArrowSquareOut size={16} weight="regular" aria-hidden="true" />
          </ButtonLink>
        </Tooltip>
        {canManagePublication ? (
          <>
            <Tooltip label="Open timeline" side="top">
              <ButtonLink
                href={`/workshop/projects/${encodeURIComponent(projectId)}/timeline`}
                variant="plain"
                size="icon-xs"
                className="dashboard-published-action"
                aria-label={`Open ${projectName} commitment timeline`}
              >
                <ClockCounterClockwise size={16} weight="regular" aria-hidden="true" />
              </ButtonLink>
            </Tooltip>
            <Tooltip label="Open Client Portals" side="top">
              <ButtonLink
                href={`/workshop/projects/${encodeURIComponent(projectId)}/client-portals`}
                variant="plain"
                size="icon-xs"
                className="dashboard-published-action"
                aria-label={`Open ${projectName} Client Portals`}
              >
                <LinkSimple size={16} weight="regular" aria-hidden="true" />
              </ButtonLink>
            </Tooltip>
          </>
        ) : null}
      </div>
      {feedback ? <span className="sr-only" role={feedback.tone === "error" ? "alert" : "status"}>{feedback.text}</span> : null}
    </>
  );
}
