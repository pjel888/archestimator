"use client";

import { ClockCounterClockwise, FileXls } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";
import { useEstimateHeaderActionsStore } from "./use-estimate-header-actions-store";

// Mirror the "Share" trigger in ProjectPublicationHeader so the four header
// actions read as one cluster (size-10 icon button, hairline border, same hover
// + focus states).
const HEADER_ACTION_BUTTON_CLASS =
  "relative grid size-10 shrink-0 place-items-center rounded-xs border border-hairline bg-white text-tertiary transition hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-tertiary";

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
  const openActivity = useEstimateHeaderActionsStore((state) => state.openActivity);
  const openProposalPreview = useEstimateHeaderActionsStore((state) => state.openProposalPreview);
  const canPreviewExport = useEstimateHeaderActionsStore((state) => state.canPreviewExport);

  if (!openActivity && !openProposalPreview) return null;

  return (
    <>
      <button
        type="button"
        className={cn(HEADER_ACTION_BUTTON_CLASS)}
        aria-label="Preview Excel Export"
        title="Preview Excel Export"
        disabled={!canPreviewExport}
        onClick={openProposalPreview ?? undefined}
      >
        <FileXls size={14} weight="regular" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={cn(HEADER_ACTION_BUTTON_CLASS)}
        aria-label="Activity"
        title="Activity"
        onClick={openActivity ?? undefined}
      >
        <ClockCounterClockwise size={14} weight="regular" aria-hidden="true" />
      </button>
    </>
  );
}
