"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  ArrowSquareOut,
  LinkBreak,
  LinkSimple,
  LockSimple,
  Prohibit,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import {
  ControlField,
  ControlInput,
  CONTROL_INPUT_SURFACE_CLASS,
} from "@/components/ui/control-input";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { Drawer } from "@/components/ui/overlays/sheet-drawer";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/status-badge";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { PublisherActivityFeed } from "@/components/workshop/publisher/PublisherActivityFeed";
import { PublisherProjectMembersPanel } from "@/components/workshop/publisher/PublisherProjectMembersPanel";
import { RecipientEmailComposer } from "@/components/workshop/publication/RecipientEmailComposer";
import { SheetPickerList } from "@/components/workshop/publication/SheetPickerList";
import type {
  ProjectEstimateSheet,
  ProjectPublicationStatus,
  ProjectPublicationSummary,
} from "@/lib/publication/types";
import type { ProjectPublicationRosterRow as ProjectPublicationRosterRowData } from "@/lib/publisher/roster-repository";
import { cn } from "@/lib/ui/cn";
import { usePublisherDrawer } from "./usePublisherDrawer";

type PublisherDrawerProps = {
  initialTab?: PublisherDrawerTabId;
  open: boolean;
  row: ProjectPublicationRosterRowData | null;
  onOpenChange: (open: boolean) => void;
};

export type PublisherDrawerTabId = "overview" | "recipients" | "sheets" | "access" | "settings" | "activity";
type ConfirmedPublisherAction = "rotate" | "revoke";
type DrawerFeedback = { text: string; tone: "success" | "error" };

const DRAWER_TABS = [
  { id: "overview", label: "Overview" },
  { id: "recipients", label: "Recipients" },
  { id: "sheets", label: "Sheets" },
  { id: "access", label: "Access" },
  { id: "settings", label: "Settings" },
  { id: "activity", label: "Activity" },
] satisfies Array<{ id: PublisherDrawerTabId; label: string }>;

const EMPTY_ESTIMATE_SHEETS: ProjectEstimateSheet[] = [];

const statusCopy = {
  expired: { label: "Expired", badge: "danger" },
  published: { label: "Active", badge: "active" },
  revoked: { label: "Revoked", badge: "danger" },
  unpublished: { label: "Draft", badge: "draft" },
} satisfies Record<ProjectPublicationStatus, { label: string; badge: StatusBadgeStatus }>;

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function readAbsoluteClientLink(clientLinkPath: string) {
  if (/^https?:\/\//i.test(clientLinkPath)) return clientLinkPath;
  if (typeof window === "undefined") return clientLinkPath;
  return new URL(clientLinkPath, window.location.origin).toString();
}

function areStringSetsEqual(a: readonly string[], b: readonly string[]) {
  if (a.length !== b.length) return false;
  const seen = new Set(a);
  return b.every((value) => seen.has(value));
}

function rowToSummary(row: ProjectPublicationRosterRowData): ProjectPublicationSummary {
  return {
    canManagePublication: row.canManagePublication,
    clientLinkPath: row.clientLinkPath,
    expiresAt: row.expiresAt,
    latestActivityAt: row.latestActivityAt,
    latestOpenedAt: row.latestOpenedAt,
    latestRecipientOpen: null,
    locationVisibility: "locality",
    openCount: row.openCount,
    passwordRequired: row.passwordRequired,
    projectId: row.projectId,
    publicationId: row.publicationId,
    publishedAt: row.publishedAt,
    selectedEstimateCount: row.selectedEstimateCount,
    selectedEstimateIds: row.selectedEstimateIds,
    snapshotVersion: row.snapshotVersion,
    staleSnapshotWarning: row.staleSnapshotWarning,
    status: row.status,
    tokenCopyAvailable: row.tokenCopyAvailable,
    workspaceId: row.workspaceId,
  };
}

export function PublisherDrawer({ initialTab = "overview", open, row, onOpenChange }: PublisherDrawerProps) {
  const [activeTab, setActiveTab] = useState<PublisherDrawerTabId>(initialTab);
  const [selectedEstimateIdsOverride, setSelectedEstimateIdsOverride] = useState<string[] | null>(null);
  const [requirePasswordOverride, setRequirePasswordOverride] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<DrawerFeedback | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmedPublisherAction | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const publicationActionInFlightRef = useRef<string | null>(null);

  const drawer = usePublisherDrawer(row?.projectId ?? null, open);
  const fallbackSummary = row ? rowToSummary(row) : null;
  const summary = drawer.data?.summary ?? fallbackSummary;
  const estimateSheets = drawer.data?.estimateSheets ?? EMPTY_ESTIMATE_SHEETS;
  const canManagePublication = Boolean(summary?.canManagePublication);
  const effectiveStatus = summary?.status ?? "unpublished";
  const hasLiveLink = effectiveStatus === "published" && Boolean(summary?.clientLinkPath);
  const status = statusCopy[effectiveStatus];
  const tabs = useMemo<readonly TabItem[]>(
    () => DRAWER_TABS.map((tab) => ({ id: tab.id, label: tab.label })),
    [],
  );
  const defaultSelectedEstimateIds = useMemo(() => {
    if (!summary) return [];
    const allEstimateIds = estimateSheets.map((estimate) => estimate.id);
    const availableEstimateIds = new Set(allEstimateIds);
    const curatedAvailableIds = summary.selectedEstimateIds.filter((estimateId) =>
      availableEstimateIds.has(estimateId),
    );
    return curatedAvailableIds.length > 0 ? curatedAvailableIds : allEstimateIds;
  }, [estimateSheets, summary]);
  const selectedEstimateIds = selectedEstimateIdsOverride ?? defaultSelectedEstimateIds;
  const savedSelectedEstimateIds = summary?.selectedEstimateIds ?? [];
  const sheetSelectionDirty = !areStringSetsEqual(selectedEstimateIds, savedSelectedEstimateIds);
  const publicationBusy = drawer.isMutating;
  const hasSelectableEstimate = estimateSheets.length === 0 || selectedEstimateIds.length > 0;
  const canRunManagerAction = canManagePublication && Boolean(summary?.projectId) && !publicationBusy;
  const copyLabel = copyState === "copied" ? "Copied" : copyState === "failed" ? "Retry copy" : "Copy link";
  const requirePassword = requirePasswordOverride ?? Boolean(summary?.passwordRequired);

  if (!row) return null;

  function reportBusy() {
    setFeedback({
      text: "Finish the current publication action before starting another.",
      tone: "error",
    });
  }

  async function runPublicationUpdate(
    action: () => Promise<{ ok: boolean; message: string; clientLinkPath?: string | null }>,
  ) {
    const actionProjectId = summary?.projectId ?? row?.projectId;
    if (!actionProjectId) return;
    if (publicationBusy || publicationActionInFlightRef.current) {
      reportBusy();
      return;
    }
    publicationActionInFlightRef.current = actionProjectId;
    setFeedback(null);
    try {
      const result = await action();
      setFeedback({ text: result.message, tone: result.ok ? "success" : "error" });
      if (result.ok) {
        setPassword("");
        setRequirePasswordOverride(null);
        setSelectedEstimateIdsOverride(null);
        await drawer.query.refetch();
      }
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Shared link update failed.",
        tone: "error",
      });
    } finally {
      if (publicationActionInFlightRef.current === actionProjectId) {
        publicationActionInFlightRef.current = null;
      }
    }
  }

  function saveSheetScope() {
    if (!summary?.projectId || !hasSelectableEstimate) return;
    void runPublicationUpdate(() =>
      drawer.republishMutation.mutateAsync({
        projectId: summary.projectId,
        selectedEstimateIds,
        locationVisibility: summary.locationVisibility,
      }),
    );
  }

  function saveAccessSettings() {
    if (!summary?.projectId || !hasSelectableEstimate) return;
    void runPublicationUpdate(() =>
      drawer.republishMutation.mutateAsync({
        clearPassword: !requirePassword,
        locationVisibility: summary.locationVisibility,
        password: requirePassword ? password.trim() || undefined : undefined,
        projectId: summary.projectId,
        selectedEstimateIds,
      }),
    );
  }

  function runConfirmedAction(action: ConfirmedPublisherAction) {
    if (!summary?.projectId) return;
    if (action === "rotate") {
      void runPublicationUpdate(() =>
        drawer.rotateMutation.mutateAsync({
          projectId: summary.projectId,
        }),
      );
      return;
    }
    void runPublicationUpdate(() =>
      drawer.revokeMutation.mutateAsync({
        projectId: summary.projectId,
      }),
    );
  }

  async function copyClientLink() {
    if (!summary?.clientLinkPath) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable.");
      await navigator.clipboard.writeText(readAbsoluteClientLink(summary.clientLinkPath));
      setCopyState("copied");
      setFeedback({ text: "Shared link copied.", tone: "success" });
    } catch {
      setCopyState("failed");
      setFeedback({ text: "Copy unavailable. Select the link to copy it.", tone: "error" });
    }
  }

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        title={row.projectName}
        description="Shared link details and manager actions"
        side="right"
        size="wide"
        modal
        closeLabel="Close publisher drawer"
        contentId="publisher-publication-drawer"
        bodyClassName="min-h-0 p-0"
        contentClassName="bg-surface"
      >
        <div className="flex min-h-0 flex-col" data-publisher-drawer="true">
          <div className="border-b border-hairline px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <SectionLabel>Publication state</SectionLabel>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={status.badge} showDot>{status.label}</StatusBadge>
                  {summary?.passwordRequired ? (
                    <span className="inline-flex items-center gap-1 rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[9px] leading-3 text-secondary">
                      <LockSimple size={10} aria-hidden="true" />
                      Password
                    </span>
                  ) : null}
                  {summary?.staleSnapshotWarning ? (
                    <span className="inline-flex items-center gap-1 rounded-xs bg-warningSoft px-1.5 py-0.5 text-[9px] leading-3 text-warning">
                      <WarningCircle size={10} aria-hidden="true" />
                      {summary.staleSnapshotWarning.daysBehind}d behind
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-[10px] leading-4 text-secondary">
                  {row.projectCode ? `${row.projectCode} / ` : ""}
                  {row.clientName ?? "No client set"}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-7 px-2 py-0 text-[10px]"
                  disabled={!summary?.clientLinkPath}
                  onClick={() => void copyClientLink()}
                >
                  <LinkSimple size={11} aria-hidden="true" />
                  {copyLabel}
                </Button>
                {summary?.clientLinkPath ? (
                  <a
                    href={summary.clientLinkPath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-7 items-center justify-center gap-1.5 rounded-xs border border-divider bg-surface px-2 text-[10px] font-medium text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1"
                  >
                    <ArrowSquareOut size={11} aria-hidden="true" />
                    Open
                  </a>
                ) : null}
              </div>
            </div>
            {feedback ? (
              <p
                className={cn(
                  "mt-3 rounded-xs px-2 py-1 text-[9px] leading-3",
                  feedback.tone === "error"
                    ? "border border-dangerSoft bg-dangerSoft text-danger"
                    : "bg-surfaceMuted text-secondary",
                )}
                role={feedback.tone === "error" ? "alert" : "status"}
              >
                {feedback.text}
              </p>
            ) : null}
            {drawer.query.isError ? (
              <p className="mt-3 rounded-xs border border-warningSoft bg-warningSoft px-2 py-1 text-[9px] leading-3 text-warning" role="alert">
                Drawer details could not be refreshed. Actions use the latest visible roster state.
              </p>
            ) : null}
          </div>

          <Tabs
            tabs={tabs}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as PublisherDrawerTabId)}
            ariaLabel="Shared link sections"
            controlsPanels={false}
            idBase="publisher-drawer"
            variant="pills"
            className="border-b border-hairline px-3 py-2"
          />

          <div
            id={`publisher-drawer-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`publisher-drawer-tab-${activeTab}`}
            tabIndex={0}
            className="min-h-[420px] flex-1 overflow-auto p-4"
          >
            {activeTab === "overview" ? (
              <div className="grid gap-3 text-[10px] leading-4 text-secondary sm:grid-cols-2">
                <div className="rounded-xs border border-hairline bg-white px-3 py-2">
                  <SectionLabel>Published</SectionLabel>
                  <p className="mt-1 text-ink">{formatDate(summary?.publishedAt)}</p>
                </div>
                <div className="rounded-xs border border-hairline bg-white px-3 py-2">
                  <SectionLabel>Expires</SectionLabel>
                  <p className="mt-1 text-ink">{formatDate(summary?.expiresAt)}</p>
                </div>
                <div className="rounded-xs border border-hairline bg-white px-3 py-2">
                  <SectionLabel>Recipients</SectionLabel>
                  <p className="mt-1 text-ink">{row.recipientCount === 1 ? "1 recipient" : `${row.recipientCount} recipients`}</p>
                </div>
                <div className="rounded-xs border border-hairline bg-white px-3 py-2">
                  <SectionLabel>Estimate scope</SectionLabel>
                  <p className="mt-1 text-ink">
                    {summary?.selectedEstimateCount === 1
                      ? "1 sheet"
                      : `${summary?.selectedEstimateCount ?? row.selectedEstimateCount} sheets`}
                  </p>
                </div>
                <div className="rounded-xs border border-hairline bg-white px-3 py-2 sm:col-span-2">
                  <SectionLabel>Latest activity</SectionLabel>
                  <p className="mt-1 text-ink">{formatDate(summary?.latestActivityAt)}</p>
                  {summary?.latestOpenedAt ? (
                    <p className="mt-1 text-secondary">Last opened {formatDate(summary.latestOpenedAt)}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activeTab === "recipients" ? (
              summary?.publicationId && canManagePublication ? (
                <RecipientEmailComposer
                  publicationId={summary.publicationId}
                  baseClientLink={summary.clientLinkPath}
                  currentUserEmail={drawer.data?.currentUserEmail ?? null}
                  projectName={row.projectName}
                  isPublicationBusy={publicationBusy}
                  onMessage={setFeedback}
                />
              ) : (
                <p className="rounded-xs border border-dashed border-divider bg-surfaceMuted/60 p-3 text-[10px] leading-4 text-secondary">
                  Recipient controls are available to publication managers after a shared link exists.
                </p>
              )
            ) : null}

            {activeTab === "sheets" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <SectionLabel>Client-visible sheets</SectionLabel>
                  {sheetSelectionDirty ? (
                    <span className="text-[9px] font-medium leading-3 text-warning">Unsaved</span>
                  ) : null}
                </div>
                <SheetPickerList
                  estimates={estimateSheets}
                  selectedIds={selectedEstimateIds}
                  onChange={setSelectedEstimateIdsOverride}
                  disabled={!canManagePublication || publicationBusy}
                  aria-label="Select estimates to include in this shared link"
                />
                {!hasSelectableEstimate ? (
                  <p className="text-[9px] leading-3 text-warning">Select at least one estimate before updating the shared page.</p>
                ) : null}
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="min-h-7 px-2 py-0 text-[10px]"
                  disabled={!canRunManagerAction || !hasSelectableEstimate}
                  onClick={saveSheetScope}
                >
                  <ArrowClockwise size={11} aria-hidden="true" />
                  {hasLiveLink ? "Update shared page" : "Generate shared link"}
                </Button>
              </div>
            ) : null}

            {activeTab === "access" ? (
              <PublisherProjectMembersPanel
                projectId={row.projectId}
                initialSummary={drawer.data?.collaborationSummary ?? null}
              />
            ) : null}

            {activeTab === "settings" ? (
              <div className="space-y-4 text-[10px] leading-4 text-secondary">
                <div className="space-y-2 rounded-xs border border-hairline bg-white px-3 py-3">
                  <SectionLabel>Access</SectionLabel>
                  <label className="flex min-h-7 items-center gap-2 text-secondary">
                    <input
                      type="checkbox"
                      className="size-3 accent-ink"
                      checked={requirePassword}
                      disabled={!canManagePublication || publicationBusy}
                      onChange={(event) => {
                        setRequirePasswordOverride(event.currentTarget.checked);
                        if (!event.currentTarget.checked) setPassword("");
                      }}
                    />
                    Require password
                  </label>
                  {requirePassword ? (
                    <ControlField label="Password" className="max-w-sm">
                      <ControlInput
                        id="publisher-drawer-password"
                        type="password"
                        className={cn("min-h-7", CONTROL_INPUT_SURFACE_CLASS)}
                        placeholder={summary?.passwordRequired ? "Enter a new password to change it" : "Set a link password"}
                        value={password}
                        disabled={!canManagePublication || publicationBusy}
                        onChange={(event) => setPassword(event.currentTarget.value)}
                      />
                    </ControlField>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="min-h-7 px-2 py-0 text-[10px]"
                    disabled={!canRunManagerAction || !hasSelectableEstimate}
                    onClick={saveAccessSettings}
                  >
                    Save access settings
                  </Button>
                </div>

                <div className="space-y-2 rounded-xs border border-hairline bg-white px-3 py-3">
                  <SectionLabel>Link lifecycle</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-7 px-2 py-0 text-[10px]"
                      disabled={!canRunManagerAction || !hasLiveLink}
                      onClick={() => setConfirmAction("rotate")}
                    >
                      <LinkBreak size={11} aria-hidden="true" />
                      New link
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="min-h-7 px-2 py-0 text-[10px]"
                      disabled={!canRunManagerAction || !hasLiveLink}
                      onClick={() => setConfirmAction("revoke")}
                    >
                      <Prohibit size={11} aria-hidden="true" />
                      Turn off link
                    </Button>
                  </div>
                  {!canManagePublication ? (
                    <p className="text-[9px] leading-3 text-secondary">Only owners and admins can change publication settings.</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activeTab === "activity" ? <PublisherActivityFeed projectId={row.projectId} /> : null}
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(next) => {
          if (!next) setConfirmAction(null);
        }}
        title={confirmAction === "rotate" ? "Create a new shared link?" : "Turn off shared link?"}
        description={
          confirmAction === "rotate"
            ? "The current shared URL will stop working immediately. Recipient rows stay, but recipients need a new link."
            : "The current shared URL and recipient links will stop working."
        }
        confirmLabel={confirmAction === "rotate" ? "Create new link" : "Turn off link"}
        tone={confirmAction === "revoke" ? "danger" : "warning"}
        busy={publicationBusy}
        onConfirm={() => {
          if (confirmAction) runConfirmedAction(confirmAction);
        }}
      />
    </>
  );
}
