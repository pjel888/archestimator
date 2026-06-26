"use client";

import { useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from "react";

import { buildProposalExportModel } from "@/lib/proposal-export/build-proposal-export-model";
import type { ProposalExportMetadata, ProposalExportModel } from "@/lib/proposal-export/types";
import type { EstimateTabSummary } from "@/lib/estimates/types";

import type { EstimateTreeNode } from "../estimate-tree-data";
import type { ProposalExportPreviewScope, ProposalExportUserSettings } from "../ProposalExportPreviewDialog";
import {
  appendProposalExportSettingsParams,
  countUnsavedEditableRows,
  createProposalPreviewSignature,
  PROPOSAL_XLSX_CONTENT_TYPE,
  proposalPreviewModelSettings,
  readContentDispositionFilename,
  triggerBlobDownload,
} from "./proposal-preview-model";
import {
  materializeEditableEstimateTree,
  type EditableRowValue,
} from "./rows/editable-row-model";

type UseEstimateProposalPreviewInput = {
  projectId?: string;
  estimateId?: string;
  activeTabId?: string;
  dataTabId?: string;
  estimateTabs: EstimateTabSummary[];
  estimateTree: EstimateTreeNode[];
  editableRows: Record<string, EditableRowValue>;
  resolvedProposalExportMetadata: ProposalExportMetadata | null;
  isProposalPreviewOpen: boolean;
  proposalPreviewScope: ProposalExportPreviewScope;
  proposalPreviewModel: ProposalExportModel | null;
  proposalPreviewSignature: string;
  isDownloadingProposal: boolean;
  proposalDownloadError: string | null;
  proposalExportSettings: ProposalExportUserSettings;
  setIsProposalPreviewOpen: Dispatch<SetStateAction<boolean>>;
  setProposalPreviewScope: Dispatch<SetStateAction<ProposalExportPreviewScope>>;
  setProposalPreviewModel: Dispatch<SetStateAction<ProposalExportModel | null>>;
  setProposalPreviewSignature: Dispatch<SetStateAction<string>>;
  setIsDownloadingProposal: Dispatch<SetStateAction<boolean>>;
  setProposalDownloadError: Dispatch<SetStateAction<string | null>>;
  setProposalExportSettings: Dispatch<SetStateAction<ProposalExportUserSettings>>;
};

export function useEstimateProposalPreview({
  projectId,
  estimateId,
  activeTabId,
  dataTabId,
  estimateTabs,
  estimateTree,
  editableRows,
  resolvedProposalExportMetadata,
  isProposalPreviewOpen,
  proposalPreviewScope,
  proposalPreviewModel,
  proposalPreviewSignature,
  isDownloadingProposal,
  proposalDownloadError,
  proposalExportSettings,
  setIsProposalPreviewOpen,
  setProposalPreviewScope,
  setProposalPreviewModel,
  setProposalPreviewSignature,
  setIsDownloadingProposal,
  setProposalDownloadError,
  setProposalExportSettings,
}: UseEstimateProposalPreviewInput) {
  const proposalPreviewOpenerRef = useRef<HTMLElement | null>(null);
  const persistedTabs = useMemo(() => estimateTabs.filter((tab) => tab.id !== "legacy-main"), [estimateTabs]);
  const hasMultiplePersistedTabs = persistedTabs.length > 1;
  const activeProposalExportTab = useMemo(
    () =>
      persistedTabs.find((tab) => tab.id === dataTabId) ??
      persistedTabs.find((tab) => tab.id === activeTabId) ??
      persistedTabs.find((tab) => tab.isDefault) ??
      persistedTabs[0],
    [activeTabId, dataTabId, persistedTabs],
  );
  const activeProposalExportTabName = activeProposalExportTab?.name ?? "Current";
  const tabScopeSignature = useMemo(
    () => persistedTabs.map((tab) => `${tab.id}:${tab.name}:${tab.sortOrder}`).join("|"),
    [persistedTabs],
  );
  const getProposalPreviewSignature = useCallback(
    (scope: ProposalExportPreviewScope) => [
      createProposalPreviewSignature(estimateTree, editableRows, resolvedProposalExportMetadata),
      dataTabId ?? "legacy",
      tabScopeSignature,
      scope,
      JSON.stringify(proposalPreviewModelSettings(proposalExportSettings)),
    ].join("::"),
    [dataTabId, editableRows, estimateTree, proposalExportSettings, resolvedProposalExportMetadata, tabScopeSignature],
  );
  const currentProposalPreviewSignature = useMemo(
    () => (proposalPreviewModel ? getProposalPreviewSignature(proposalPreviewScope) : ""),
    [getProposalPreviewSignature, proposalPreviewModel, proposalPreviewScope],
  );
  const proposalDownloadHref = useMemo(() => {
    if (!projectId || !estimateId) return null;
    const baseHref = `/api/projects/${encodeURIComponent(projectId)}/estimates/${encodeURIComponent(estimateId)}/export/proposal.xlsx`;
    const params = new URLSearchParams();
    if (hasMultiplePersistedTabs && proposalPreviewScope === "active-tab" && dataTabId) params.set("tab", dataTabId);
    appendProposalExportSettingsParams(params, proposalExportSettings);
    const query = params.toString();
    return query ? `${baseHref}?${query}` : baseHref;
  }, [dataTabId, estimateId, hasMultiplePersistedTabs, projectId, proposalExportSettings, proposalPreviewScope]);

  const buildProposalPreview = useCallback((scope: ProposalExportPreviewScope = proposalPreviewScope) => {
    if (!resolvedProposalExportMetadata) return null;

    // The preview reflects the user's rate/formula choices so its grand total
    // matches the file; audience stays client-safe in the preview (the real
    // audience is server-resolved on download).
    const model = buildProposalExportModel({
      metadata: resolvedProposalExportMetadata,
      nodes: materializeEditableEstimateTree(estimateTree, editableRows),
      settings: proposalPreviewModelSettings(proposalExportSettings),
    });
    setProposalPreviewModel(model);
    setProposalPreviewSignature(getProposalPreviewSignature(scope));
    return model;
  }, [editableRows, estimateTree, getProposalPreviewSignature, proposalExportSettings, proposalPreviewScope, resolvedProposalExportMetadata, setProposalPreviewModel, setProposalPreviewSignature]);

  const changeProposalPreviewScope = useCallback((scope: ProposalExportPreviewScope) => {
    setProposalPreviewScope(scope);
    setProposalDownloadError(null);
    if (isProposalPreviewOpen) buildProposalPreview(scope);
  }, [buildProposalPreview, isProposalPreviewOpen, setProposalDownloadError, setProposalPreviewScope]);

  const changeProposalExportSettings = useCallback((next: ProposalExportUserSettings) => {
    // Settings changes mark the preview stale (the signature includes settings);
    // the user refreshes to rebuild - matching the existing stale-then-refresh
    // pattern and avoiding jank.
    setProposalExportSettings(next);
    setProposalDownloadError(null);
  }, [setProposalDownloadError, setProposalExportSettings]);

  const openProposalPreview = useCallback(() => {
    // Capture the opener so focus returns to it when the dialog closes
    // (F-06/P1-T3), mirroring inspectorOpenerRef / rowDetailsOpenerRef.
    proposalPreviewOpenerRef.current = (typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null);
    const model = buildProposalPreview();
    if (model) setIsProposalPreviewOpen(true);
  }, [buildProposalPreview, setIsProposalPreviewOpen]);

  const closeProposalPreview = useCallback(() => {
    setIsProposalPreviewOpen(false);
    setProposalDownloadError(null);
    window.requestAnimationFrame(() => proposalPreviewOpenerRef.current?.focus());
  }, [setIsProposalPreviewOpen, setProposalDownloadError]);

  const refreshProposalPreview = useCallback(() => {
    setProposalDownloadError(null);
    buildProposalPreview();
  }, [buildProposalPreview, setProposalDownloadError]);

  // F-05 (P1-T1): fetch-then-blob download. A bare <a href> saved the route's
  // JSON error body (413/404/500/429/401) to disk under the .xlsx name; here
  // we inspect response.ok + content-type, blob only on success, and surface the
  // route's {error} inline instead of handing the user a corrupt file.
  const downloadProposalExport = useCallback(async () => {
    if (!proposalDownloadHref) return;
    setIsDownloadingProposal(true);
    setProposalDownloadError(null);
    try {
      const response = await fetch(proposalDownloadHref, { credentials: "same-origin" });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.includes(PROPOSAL_XLSX_CONTENT_TYPE)) {
        let message = "We couldn't generate the spreadsheet. Please try again.";
        try {
          const body = await response.json();
          if (body && typeof body.error === "string" && body.error.trim()) message = body.error;
        } catch {
          /* non-JSON error body - keep the friendly default */
        }
        setProposalDownloadError(message);
        return;
      }
      const blob = await response.blob();
      const filename = readContentDispositionFilename(response.headers.get("content-disposition")) ?? "proposal.xlsx";
      triggerBlobDownload(blob, filename);
    } catch {
      setProposalDownloadError("We couldn't reach the export service. Check your connection and try again.");
    } finally {
      setIsDownloadingProposal(false);
    }
  }, [proposalDownloadHref, setIsDownloadingProposal, setProposalDownloadError]);

  const proposalPreviewScopeControls = hasMultiplePersistedTabs
    ? {
        selectedScope: proposalPreviewScope,
        activeTabName: activeProposalExportTabName,
        tabCount: persistedTabs.length,
        onScopeChange: changeProposalPreviewScope,
      }
    : undefined;
  const isProposalPreviewStale = Boolean(proposalPreviewModel && proposalPreviewSignature !== currentProposalPreviewSignature);
  // Disable download for a genuinely empty export. For multi-tab all-tabs scope
  // the preview is built from the active tab only, so other tabs may still carry
  // rows - keep that case enabled and let the route decide.
  const isProposalExportEmpty =
    (proposalPreviewModel?.proposalRows.length ?? 0) === 0 &&
    !(hasMultiplePersistedTabs && proposalPreviewScope === "all-tabs");
  const proposalPreviewUnsavedEditCount = useMemo(
    () => countUnsavedEditableRows(estimateTree, editableRows),
    [editableRows, estimateTree],
  );
  const proposalPreviewStatus = useMemo(
    () => ({
      freshness: isProposalPreviewStale ? ("stale" as const) : ("current" as const),
      download: isDownloadingProposal
        ? ({ kind: "preparing" as const })
        : Boolean(proposalDownloadHref) && !isProposalExportEmpty
          ? ({ kind: "ready" as const })
          : ({ kind: "disabled" as const }),
      downloadError: proposalDownloadError,
      unsavedEdits: proposalPreviewUnsavedEditCount,
    }),
    [
      isDownloadingProposal,
      isProposalExportEmpty,
      isProposalPreviewStale,
      proposalDownloadError,
      proposalDownloadHref,
      proposalPreviewUnsavedEditCount,
    ],
  );

  return {
    changeProposalExportSettings,
    closeProposalPreview,
    downloadProposalExport,
    openProposalPreview,
    proposalPreviewScopeControls,
    proposalPreviewStatus,
    refreshProposalPreview,
  };
}
