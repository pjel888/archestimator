import { create } from "zustand";

/**
 * Bridges the estimate page's "Activity" and "Preview Excel Export" triggers up
 * to the project chrome header (Req 1 / D2). The dialogs and their state stay in
 * the page (`EstimateSheetContent`); only the trigger callbacks + the export
 * capability flag are lifted here so `EstimateHeaderActions` — rendered inside
 * `ProjectChromeAsync`, a different React tree — can fire them beside "Share".
 *
 * The null/false defaults double as the off-route gate: until an estimate page
 * mounts and registers, the chrome renders nothing. This also keeps SSR and the
 * first client render identical (both empty), so the streamed chrome swap and
 * hydration stay clean.
 */
type EstimateHeaderActionsState = {
  openActivity: (() => void) | null;
  openProposalPreview: (() => void) | null;
  canPreviewExport: boolean;
  register: (actions: {
    openActivity: () => void;
    openProposalPreview: () => void;
    canPreviewExport: boolean;
  }) => void;
  clear: () => void;
};

const EMPTY_STATE = {
  openActivity: null,
  openProposalPreview: null,
  canPreviewExport: false,
} as const;

export const useEstimateHeaderActionsStore = create<EstimateHeaderActionsState>((set) => ({
  ...EMPTY_STATE,
  register: ({ openActivity, openProposalPreview, canPreviewExport }) =>
    set({ openActivity, openProposalPreview, canPreviewExport }),
  clear: () => set({ ...EMPTY_STATE }),
}));
