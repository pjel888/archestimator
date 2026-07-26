"use client";

import { ClockCounterClockwise, FileText, FileXls } from "@phosphor-icons/react/dist/ssr";
import { useParams } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/button";
import { projectClientPortalComposeHref } from "@/lib/client-portal/compose-entry";
import {
  PROJECT_HEADER_ACTION_BUTTON_CLASS,
  PROJECT_HEADER_ACTION_ICON_SIZE,
} from "./project-header-action-styles";
import { useEstimateHeaderActionsStore } from "./use-estimate-header-actions-store";

// Mirror the Publisher header-link controls so the header actions read as one
// compact icon-button cluster.

/**
 * The relocated estimate-sheet "Activity" + "Preview Excel Export" triggers,
 * rendered in the project chrome header beside "Share" (Req 1 / D2). The page
 * (`EstimateSheetContent`) keeps the dialogs and their state and registers the
 * trigger callbacks + export capability into the shared Zustand store; this
 * component only fires them.
 *
 * Off-route gate: while no estimate page has registered (both handlers null),
 * this renders nothing — so it is identical on the server, on first client
 * render, and off the estimate route, keeping the streamed-chrome swap and
 * hydration clean.
 */
export function EstimateHeaderActions() {
  const params = useParams<{ nodeId?: string; projectId?: string }>();
  const openActivity = useEstimateHeaderActionsStore((state) => state.openActivity);
  const openProposalPreview = useEstimateHeaderActionsStore((state) => state.openProposalPreview);
  const canPreviewExport = useEstimateHeaderActionsStore((state) => state.canPreviewExport);

  if (!openActivity && !openProposalPreview) return null;

  return (
    <>
      {params.projectId && params.nodeId ? (
        <ButtonLink
          href={projectClientPortalComposeHref(params.projectId, { nodeIds: [params.nodeId] })}
          variant="ghost"
          size="icon-sm"
          className={PROJECT_HEADER_ACTION_BUTTON_CLASS}
          aria-label="Publish to Timeline"
          title="Publish to Timeline"
        >
          <FileText size={PROJECT_HEADER_ACTION_ICON_SIZE} weight="regular" aria-hidden="true" />
        </ButtonLink>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={PROJECT_HEADER_ACTION_BUTTON_CLASS}
        aria-label="Preview Excel Export"
        title="Preview Excel Export"
        disabled={!canPreviewExport}
        onClick={openProposalPreview ?? undefined}
      >
        <FileXls size={PROJECT_HEADER_ACTION_ICON_SIZE} weight="regular" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={PROJECT_HEADER_ACTION_BUTTON_CLASS}
        aria-label="Activity"
        title="Activity"
        onClick={openActivity ?? undefined}
      >
        <ClockCounterClockwise size={PROJECT_HEADER_ACTION_ICON_SIZE} weight="regular" aria-hidden="true" />
      </Button>
    </>
  );
}
