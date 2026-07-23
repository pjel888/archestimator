"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowSquareOut, LinkBreak, LinkSimple, Prohibit } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Tooltip } from "@/components/ui/overlays/tooltip";
import { revokeProjectPublication, rotateProjectPublicationLink } from "@/lib/publication/actions";

type ConfirmAction = "rotate" | "revoke";
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

function readConfirmCopy(action: ConfirmAction, projectName: string) {
  if (action === "rotate") {
    return {
      title: "Create a new shared link?",
      description: `The current link for ${projectName} will stop working.`,
      body: "Recipients will need the new URL. Existing comments, decisions, and audit history stay attached to the project.",
      confirmLabel: "Create new link",
    };
  }

  return {
    title: "Turn off this shared link?",
    description: `Recipients will lose access to ${projectName}.`,
    body: "The project stays private to your workspace. You can generate another shared link later from the project detail page.",
    confirmLabel: "Turn off link",
  };
}

export function PublishedProjectQuickActions({
  projectId,
  projectName,
  clientLinkPath,
  canManagePublication,
}: PublishedProjectQuickActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function copyClientLink() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable.");
      await navigator.clipboard.writeText(readAbsoluteClientLink(clientLinkPath));
      setFeedback({ text: `Copied shared link for ${projectName}.`, tone: "success" });
    } catch {
      setFeedback({ text: `Copy unavailable for ${projectName}.`, tone: "error" });
    }
  }

  function runConfirmedAction() {
    if (!confirmAction || isPending) return;
    const action = confirmAction;
    setConfirmAction(null);
    setFeedback(null);

    startTransition(async () => {
      try {
        if (action === "rotate") {
          const result = await rotateProjectPublicationLink({ projectId });
          if (!result.ok) {
            setFeedback({ text: result.message, tone: "error" });
            return;
          }
          setFeedback({ text: result.message || `Created a new shared link for ${projectName}.`, tone: "success" });
        } else {
          const result = await revokeProjectPublication({ projectId });
          if (!result.ok) {
            setFeedback({ text: result.message, tone: "error" });
            return;
          }
          setFeedback({ text: result.message || `Turned off shared link for ${projectName}.`, tone: "success" });
        }
        // Server Actions revalidate `/workshop` via revalidatePublicationRoutes (ARCH-06: one path).
      } catch (error) {
        setFeedback({
          text: error instanceof Error ? error.message : `Shared link action failed for ${projectName}.`,
          tone: "error",
        });
      }
    });
  }

  const confirmCopy = confirmAction ? readConfirmCopy(confirmAction, projectName) : null;

  return (
    <>
      <div className="dashboard-published-actions" aria-label={`Shared link quick actions for ${projectName}`}>
        <Tooltip label="Copy link" side="top">
          <Button
            type="button"
            variant="plain"
            size="icon-xs"
            className="dashboard-published-action"
            aria-label={`Copy ${projectName} shared link`}
            aria-busy={isPending}
            disabled={isPending}
            onClick={() => void copyClientLink()}
          >
            <LinkSimple size={16} weight="regular" aria-hidden="true" />
          </Button>
        </Tooltip>
        <Tooltip label="Preview link" side="top">
          <Link
            href={clientLinkPath}
            target="_blank"
            rel="noreferrer"
            className="dashboard-published-action"
            aria-label={`Preview ${projectName} shared link`}
          >
            <ArrowSquareOut size={16} weight="regular" aria-hidden="true" />
          </Link>
        </Tooltip>
        {canManagePublication ? (
          <>
            <Tooltip label="New link" side="top">
              <Button
                type="button"
                variant="plain"
                size="icon-xs"
                className="dashboard-published-action"
                aria-label={`Create new shared link for ${projectName}`}
                aria-busy={isPending}
                disabled={isPending}
                onClick={() => setConfirmAction("rotate")}
              >
                <LinkBreak size={16} weight="regular" aria-hidden="true" />
              </Button>
            </Tooltip>
            <Tooltip label="Turn off link" side="top">
              <Button
                type="button"
                variant="plain"
                size="icon-xs"
                className="dashboard-published-action dashboard-published-action--danger"
                aria-label={`Turn off ${projectName} shared link`}
                aria-busy={isPending}
                disabled={isPending}
                onClick={() => setConfirmAction("revoke")}
              >
                <Prohibit size={16} weight="regular" aria-hidden="true" />
              </Button>
            </Tooltip>
          </>
        ) : null}
      </div>
      {feedback ? (
        <span className="sr-only" role={feedback.tone === "error" ? "alert" : "status"}>
          {feedback.text}
        </span>
      ) : null}
      <Modal
        open={confirmAction !== null}
        title={confirmCopy?.title ?? ""}
        description={confirmCopy?.description}
        onOpenChange={(next) => {
          if (!next) setConfirmAction(null);
        }}
        className="max-w-sm"
      >
        <div className="space-y-3">
          <p className="text-[10px] leading-4 text-secondary">{confirmCopy?.body}</p>
          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-7 rounded-xs px-2 text-[10px]"
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmAction === "revoke" ? "danger" : "secondary"}
              size="sm"
              className="min-h-7 rounded-xs px-2 text-[10px]"
              disabled={isPending}
              onClick={runConfirmedAction}
            >
              {confirmCopy?.confirmLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
