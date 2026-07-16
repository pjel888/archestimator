"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowSquareOut,
  LinkBreak,
  LinkSimple,
  LockSimple,
  PencilSimple,
  Prohibit,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { Drawer } from "@/components/ui/overlays/sheet-drawer";
import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/status-badge";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { PublisherActivityFeed } from "@/components/workshop/publisher/PublisherActivityFeed";
import { RecipientEmailComposer } from "@/components/workshop/publication/RecipientEmailComposer";
import type {
  ProjectPublicationStatus,
  ProjectPublicationSummary,
} from "@/lib/publication/types";
import type { ProjectPublicationRosterRow as ProjectPublicationRosterRowData } from "@/lib/publisher/roster-repository";
import { cn } from "@/lib/ui/cn";
import { usePublisherDrawer } from "./usePublisherDrawer";

type PublisherDrawerProps = {
  embedded?: boolean;
  initialTab?: PublisherDrawerTabId;
  open: boolean;
  row: ProjectPublicationRosterRowData | null;
  onOpenChange: (open: boolean) => void;
  onEditLink?: (row: ProjectPublicationRosterRowData, trigger: HTMLButtonElement) => void;
};

export type PublisherDrawerTabId = "overview" | "recipients" | "activity";
type ConfirmedPublisherAction = "migrate" | "rollback_migration" | "rotate" | "revoke";
type DrawerFeedback = { text: string; tone: "success" | "error" };

const DRAWER_TABS = [
  { id: "overview", label: "Overview" },
  { id: "recipients", label: "Recipients" },
  { id: "activity", label: "Activity" },
] satisfies Array<{ id: PublisherDrawerTabId; label: string }>;

const statusCopy = {
  expired: { label: "Expired", badge: "danger" },
  published: { label: "Live", badge: "active" },
  revoked: { label: "Off", badge: "danger" },
  unpublished: { label: "Not shared", badge: "draft" },
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

function readEstimateScope(count: number) {
  if (count === 0) return "All estimates";
  return count === 1 ? "1 estimate" : `${count} estimates`;
}

function readRecipientScope(count: number) {
  if (count === 0) return "Anyone with the link";
  return count === 1 ? "1 recipient" : `${count} recipients`;
}

export function PublisherDrawer({ embedded = false, initialTab = "overview", open, row, onOpenChange, onEditLink }: PublisherDrawerProps) {
  const [activeTab, setActiveTab] = useState<PublisherDrawerTabId>(initialTab);
  const [feedback, setFeedback] = useState<DrawerFeedback | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmedPublisherAction | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const publicationActionInFlightRef = useRef<string | null>(null);

  const drawer = usePublisherDrawer(row?.projectId ?? null, open);
  const fallbackSummary = row ? rowToSummary(row) : null;
  const summary = drawer.data?.summary ?? fallbackSummary;
  const canManagePublication = Boolean(summary?.canManagePublication);
  const effectiveStatus = summary?.status ?? "unpublished";
  const hasLiveLink = effectiveStatus === "published" && Boolean(summary?.clientLinkPath);
  const canMigrateLegacyPublication = canManagePublication
    && effectiveStatus === "published"
    && drawer.data?.legacyMigrationEnabled === true
    && Boolean(row?.publicationId)
    && !row?.clientPortalPath;
  const canRollbackLegacyMigration = canManagePublication
    && effectiveStatus === "published"
    && drawer.data?.legacyMigrationEnabled === true
    && Boolean(row?.publicationId)
    && Boolean(row?.clientPortalPath);
  const status = effectiveStatus === "published" && summary?.staleSnapshotWarning
    ? { label: "Needs update", badge: "review" as const }
    : statusCopy[effectiveStatus];
  const tabs = useMemo<readonly TabItem[]>(
    () => DRAWER_TABS.map((tab) => ({ id: tab.id, label: tab.label })),
    [],
  );
  const publicationBusy = drawer.isMutating;
  const canRunManagerAction = canManagePublication && Boolean(summary?.projectId) && !publicationBusy;
  const copyLabel = copyState === "copied" ? "Copied" : copyState === "failed" ? "Retry copy" : "Copy link";

  if (!row) return null;

  const rowProjectId = row.projectId;
  const previewHref = `/workshop/publisher/preview/${encodeURIComponent(row.projectId)}`;
  const estimateCount = summary?.selectedEstimateCount ?? row.selectedEstimateCount;

  function reportBusy() {
    setFeedback({
      text: "Finish the current publication action before starting another.",
      tone: "error",
    });
  }

  async function runPublicationUpdate(
    action: () => Promise<{ ok: boolean; message: string; clientLinkPath?: string | null }>,
  ) {
    const actionProjectId = summary?.projectId ?? rowProjectId;
    if (publicationBusy || publicationActionInFlightRef.current) {
      reportBusy();
      return;
    }
    publicationActionInFlightRef.current = actionProjectId;
    setFeedback(null);
    try {
      const result = await action();
      setFeedback({ text: result.message, tone: result.ok ? "success" : "error" });
      if (result.ok) await drawer.query.refetch();
    } catch {
      setFeedback({
        text: "Shared link update failed. Please try again.",
        tone: "error",
      });
    } finally {
      if (publicationActionInFlightRef.current === actionProjectId) {
        publicationActionInFlightRef.current = null;
      }
    }
  }

  function runConfirmedAction(action: ConfirmedPublisherAction) {
    if (!summary?.projectId) return;
    if (action === "migrate") {
      const legacyPublicationId = row?.publicationId;
      if (!legacyPublicationId) return;
      void runPublicationUpdate(() => drawer.migrateLegacyMutation.mutateAsync({ legacyPublicationId, projectId: summary.projectId }));
      return;
    }
    if (action === "rollback_migration") {
      const legacyPublicationId = row?.publicationId;
      if (!legacyPublicationId) return;
      void runPublicationUpdate(() => drawer.rollbackLegacyMigrationMutation.mutateAsync({ legacyPublicationId, projectId: summary.projectId }));
      return;
    }
    if (action === "rotate") {
      void runPublicationUpdate(() => drawer.rotateMutation.mutateAsync({ projectId: summary.projectId }));
      return;
    }
    void runPublicationUpdate(() => drawer.revokeMutation.mutateAsync({ projectId: summary.projectId }));
  }

  async function copyClientLink() {
    if (!summary?.clientLinkPath) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable.");
      await navigator.clipboard.writeText(readAbsoluteClientLink(summary.clientLinkPath));
      setCopyState("copied");
      setFeedback({ text: "Client link copied.", tone: "success" });
    } catch {
      setCopyState("failed");
      setFeedback({ text: "Copy unavailable. Select the link below to copy it.", tone: "error" });
    }
    // ponytail: reset the button label so "Copied"/"Retry copy" doesn't stick forever.
    window.setTimeout(() => setCopyState("idle"), 2500);
  }

  const content = (
    <div
      className="flex h-full min-h-0 flex-col bg-white"
      data-publisher-drawer="true"
      data-publisher-detail-pane={embedded ? "true" : undefined}
    >
      <header className="shrink-0 border-b border-hairline px-3 py-2.5 sm:px-4">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="truncate text-[12px] font-medium leading-4 text-ink">{row.projectName}</h2>
              <StatusBadge status={status.badge} showDot className="min-w-0 px-1.5 py-1 !text-[10px]">{status.label}</StatusBadge>
              {summary?.passwordRequired ? (
                <span className="inline-flex min-h-5 items-center gap-1 text-[9px] leading-3 text-secondary">
                  <LockSimple size={11} aria-hidden="true" /> Password protected
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-[10px] leading-4 text-secondary">
              {[row.projectCode, row.clientName].filter(Boolean).join(" / ") || "No client set"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {onEditLink && canManagePublication ? (
              <Button
                type="button"
                variant="brand"
                size="sm"
                className="min-h-8 min-w-0 px-2.5 !text-[10px]"
                onClick={(event) => onEditLink(row, event.currentTarget)}
              >
                <PencilSimple size={13} aria-hidden="true" />
                {hasLiveLink ? "Edit client link" : "Create client link"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-8 min-w-0 px-2 !text-[10px]"
              disabled={!summary?.clientLinkPath}
              onClick={() => void copyClientLink()}
            >
              <LinkSimple size={13} aria-hidden="true" />
              {copyLabel}
            </Button>
            {summary?.clientLinkPath ? (
              <Link
                href={previewHref}
                className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-xs border border-divider bg-surface px-2 text-[10px] font-medium text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1"
              >
                <ArrowSquareOut size={13} aria-hidden="true" />
                Preview
              </Link>
            ) : null}
            {row.clientPortalPath ? (
              <Link
                href={row.clientPortalPath}
                className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-xs border border-divider bg-surface px-2 text-[10px] font-medium text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1"
              >
                <ArrowSquareOut size={13} aria-hidden="true" />
                Open Client Portal
              </Link>
            ) : null}
          </div>
        </div>

        {summary?.staleSnapshotWarning ? (
          <p className="mt-2.5 flex items-start gap-1.5 border border-warning/30 bg-warningSoft px-2.5 py-2 text-[10px] leading-4 text-warning">
            <WarningCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {"daysBehind" in summary.staleSnapshotWarning
              ? `Client content is ${summary.staleSnapshotWarning.daysBehind} days behind the current project.`
              : "Client content is behind the current project."}{" "}
            Edit the client link to publish the latest estimates.
          </p>
        ) : null}
        {feedback ? (
          <p
            className={cn(
              "mt-2.5 border px-2.5 py-2 text-[10px] leading-4",
              feedback.tone === "error"
                ? "border-danger/30 bg-dangerSoft text-danger"
                : "border-success/30 bg-surfaceMuted text-secondary",
            )}
            role={feedback.tone === "error" ? "alert" : "status"}
          >
            {feedback.text}
          </p>
        ) : null}
        {drawer.query.isError ? (
          <p className="mt-2.5 border border-warning/30 bg-warningSoft px-2.5 py-2 text-[10px] leading-4 text-warning" role="alert">
            Link details could not be refreshed. The last available project state is shown.
          </p>
        ) : null}
      </header>

      <Tabs
        tabs={tabs}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as PublisherDrawerTabId)}
        ariaLabel="Client link sections"
        controlsPanels={false}
        idBase="publisher-drawer"
        variant="underline"
        className="shrink-0 px-2 sm:px-4"
        getTabButtonProps={() => ({ className: "min-h-8 px-3 !text-[10px]" })}
      />

      <div
        id={`publisher-drawer-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`publisher-drawer-tab-${activeTab}`}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-auto p-3 sm:p-4"
      >
        {activeTab === "overview" ? (
          <div className="mx-auto max-w-4xl space-y-4 text-[10px] leading-4 text-secondary">
            <section>
              <h3 className="text-[11px] font-medium leading-4 text-ink">Client link</h3>
              {summary?.clientLinkPath ? (
                <input
                  readOnly
                  value={readAbsoluteClientLink(summary.clientLinkPath)}
                  aria-label={`Client link for ${row.projectName}`}
                  onFocus={(event) => event.currentTarget.select()}
                  className="mt-1.5 min-h-8 w-full rounded-xs border border-divider bg-surfaceMuted/55 px-2.5 text-[10px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                />
              ) : (
                <p className="mt-1.5 border border-divider bg-surfaceMuted/45 px-2.5 py-2 text-[10px] leading-4 text-secondary">
                  This project has not been shared with a client yet.
                </p>
              )}
            </section>

            <section>
              <h3 className="text-[11px] font-medium leading-4 text-ink">Link summary</h3>
              <dl className="mt-1.5 divide-y divide-hairline border-y border-hairline">
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-2 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-secondary">Published</dt><dd className="font-medium text-ink">{formatDate(summary?.publishedAt)}</dd></div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-2 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-secondary">Expires</dt><dd className="font-medium text-ink">{formatDate(summary?.expiresAt)}</dd></div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-2 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-secondary">Estimates</dt><dd className="font-medium text-ink">{readEstimateScope(estimateCount)}</dd></div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-2 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-secondary">Recipients</dt><dd className="font-medium text-ink">{readRecipientScope(row.recipientCount)}</dd></div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-2 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-secondary">Opens</dt><dd className="font-medium text-ink">{row.openCount}</dd></div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-2 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-secondary">Latest activity</dt><dd className="font-medium text-ink">{formatDate(summary?.latestActivityAt)}</dd></div>
              </dl>
            </section>

            <section className="flex flex-col gap-2.5 border-t border-hairline pt-3.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl">
                <h3 className="text-[11px] font-medium leading-4 text-ink">Link controls</h3>
                <p className="mt-1 text-[10px] leading-4 text-secondary">
                  Editing estimates and password access happens in one place. Link replacement and shutdown remain separate because they immediately affect every recipient.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {canMigrateLegacyPublication ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="min-h-8 min-w-0 px-2 !text-[10px]"
                    disabled={!canRunManagerAction}
                    onClick={() => setConfirmAction("migrate")}
                  >
                    <ArrowSquareOut size={13} aria-hidden="true" />
                    Migrate to Client Portal
                  </Button>
                ) : null}
                {canRollbackLegacyMigration ? (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="min-h-8 min-w-0 px-2 !text-[10px]"
                    disabled={!canRunManagerAction}
                    onClick={() => setConfirmAction("rollback_migration")}
                  >
                    <Prohibit size={13} aria-hidden="true" />
                    Roll back Portal migration
                  </Button>
                ) : null}
                <Link
                  href={`/workshop/projects/${encodeURIComponent(row.projectId)}/team`}
                  className="inline-flex min-h-8 items-center justify-center rounded-xs border border-divider bg-white px-2 text-[10px] font-medium text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  Team access
                </Link>
                {canManagePublication && hasLiveLink ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-8 min-w-0 px-2 !text-[10px]"
                      disabled={!canRunManagerAction}
                      onClick={() => setConfirmAction("rotate")}
                    >
                      <LinkBreak size={13} aria-hidden="true" />
                      Replace link
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="min-h-8 min-w-0 px-2 !text-[10px]"
                      disabled={!canRunManagerAction}
                      onClick={() => setConfirmAction("revoke")}
                    >
                      <Prohibit size={13} aria-hidden="true" />
                      Turn off link
                    </Button>
                  </>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "recipients" ? (
          summary?.publicationId && canManagePublication ? (
            <div className="mx-auto max-w-4xl [&_button]:min-h-8 [&_button]:!text-[10px] [&_input]:min-h-8 [&_input]:!text-[10px] [&_label]:!text-[9px] [&_p]:!text-[9px]">
              <RecipientEmailComposer
                publicationId={summary.publicationId}
                baseClientLink={summary.clientLinkPath}
                currentUserEmail={drawer.data?.currentUserEmail ?? null}
                projectName={row.projectName}
                isPublicationBusy={publicationBusy}
                onMessage={setFeedback}
              />
            </div>
          ) : (
            <p className="mx-auto max-w-4xl border border-divider bg-surfaceMuted/60 px-2.5 py-2 text-[10px] leading-4 text-secondary">
              Recipient controls are available to publication managers after a client link exists.
            </p>
          )
        ) : null}

        {activeTab === "activity" ? (
          <div className="mx-auto max-w-4xl [&_button]:min-h-8 [&_button]:!text-[10px] [&_p]:!text-[9px]">
            <PublisherActivityFeed projectId={row.projectId} />
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      {embedded ? content : (
        <Drawer
          open={open}
          onOpenChange={onOpenChange}
          title={row.projectName}
          description="Client link details and manager actions"
          side="right"
          size="wide"
          modal
          closeLabel="Close client link details"
          contentId="publisher-publication-drawer"
          bodyClassName="min-h-0 p-0"
          contentClassName="bg-surface"
          headerClassName="min-h-12 px-3 py-2"
          titleClassName="text-[12px] font-medium leading-4"
          descriptionClassName="text-[10px] font-normal leading-4"
          closeButtonClassName="size-8"
        >
          {content}
        </Drawer>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(next) => {
          if (!next) setConfirmAction(null);
        }}
        title={confirmAction === "migrate" ? "Migrate this legacy client link?" : confirmAction === "rollback_migration" ? "Roll back Client Portal routing?" : confirmAction === "rotate" ? "Replace this client link?" : "Turn off this client link?"}
        description={
          confirmAction === "migrate"
            ? "This imports the published legacy record into a Client Portal and verifies the mapping before the Publisher exposes it. Existing client URLs remain available."
            : confirmAction === "rollback_migration"
            ? "This restores existing client URLs to the legacy publication. Imported Client Portal history is preserved and can be re-verified later with the migration action."
            : confirmAction === "rotate"
            ? "The current URL will stop working immediately. Existing recipients will need the replacement link."
            : "The current URL and every recipient link will stop working immediately."
        }
        confirmLabel={confirmAction === "migrate" ? "Migrate link" : confirmAction === "rollback_migration" ? "Roll back routing" : confirmAction === "rotate" ? "Replace link" : "Turn off link"}
        tone={confirmAction === "revoke" || confirmAction === "rollback_migration" ? "danger" : "warning"}
        busy={publicationBusy}
        onConfirm={() => {
          if (confirmAction) runConfirmedAction(confirmAction);
        }}
      />
    </>
  );
}
