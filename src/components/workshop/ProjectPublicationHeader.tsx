"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { ArrowClockwise, ArrowSquareOut, LinkBreak, LinkSimple, LockSimple, Prohibit } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import {
  ControlField,
  ControlInput,
  CONTROL_INPUT_SURFACE_CLASS,
} from "@/components/ui/control-input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/ui/cn";
import {
  createProjectPublication,
  refreshProjectPublicationSummary,
  republishProjectPublication,
  revokeProjectPublication,
  rotateProjectPublicationLink,
} from "@/lib/publication/actions";
import { RecipientEmailComposer } from "./publication/RecipientEmailComposer";
export { RecipientEmailComposer };
import SharedLinkActivityFeed from "@/components/share/SharedLinkActivityFeed";
import { WorkshopTreeTabs, getTabStripPanelId, getTabStripTabId } from "./workshop-tree";
import type { ProjectEstimateSheet, ProjectPublicationStatus, ProjectPublicationSummary } from "@/lib/publication/types";

type ProjectPublicationHeaderProps = {
  summary: ProjectPublicationSummary | null;
  currentUserEmail?: string | null;
  projectEstimateSheets?: ProjectEstimateSheet[];
};

type PasswordDraft = {
  password: string;
  requirePassword: boolean;
  summaryKey: string;
};

// AC-MOD-10: owner-set link expiry, tracked as a draft like the password (keyed by
// summaryKey, reset on action success). `value` is a datetime-local string ("" = no expiry).
type ExpiryDraft = {
  value: string;
  summaryKey: string;
};

type PublicationLocalResult = {
  clientLinkPath: string | null;
  passwordRequired: boolean;
  status: ProjectPublicationStatus;
  summaryKey: string;
  baseServerSignature: string;
};

type PublicationTabId = "link" | "sheets" | "access" | "recipients" | "activity";
type DestructivePublicationAction = "clear-password" | "revoke" | "rotate" | "regenerate";
// AC-MOD-12: owner-action feedback carries a tone so a thrown action error renders as a
// danger alert instead of reading like a success in the neutral status box.
type ActionFeedback = { text: string; tone: "success" | "error" };
const EMPTY_ESTIMATE_IDS: string[] = [];
const SHARED_LINK_ACTIVITY_SEEN_STORAGE_PREFIX = "archestimator_shared_link_last_seen";

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

// AC-MOD-10: a stored ISO expiry → the value a <input type="datetime-local"> expects
// (local wall-clock "YYYY-MM-DDTHH:mm", no seconds/zone). Empty string when there is no
// expiry or the stored value is unparseable.
function isoToDateTimeLocalValue(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// The inverse: a datetime-local value → an ISO string for the server, or null when the
// owner cleared the field (no expiry). Unparseable input is treated as "no expiry".
function dateTimeLocalValueToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

// AC-MOD-14: order-insensitive equality for two string-id lists (estimate selections).
function areStringSetsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const seen = new Set(a);
  return b.every((value) => seen.has(value));
}

function readPublicationStatusLabel(status: ProjectPublicationStatus | null | undefined) {
  if (!status || status === "unpublished") return "Link off";
  if (status === "expired") return "Expired";
  if (status === "revoked") return "Turned off";
  return "Link live";
}

function readSummaryKey(summary: ProjectPublicationSummary | null) {
  return summary?.projectId ?? "no-project";
}

/**
 * Server "signature" of the publication summary at a moment in time. The
 * optimistic `localResult` is only honored while the *live* summary still
 * carries the signature captured when the optimistic result was created.
 * When revalidation lands — or the link is revoked/expired elsewhere — this
 * signature changes, so the optimistic result is dropped and the modal falls
 * back to server truth (AC-MOD-05).
 */
export function readPublicationServerSignature(summary: ProjectPublicationSummary | null): string {
  if (!summary) return "none";
  return [
    summary.status ?? "unpublished",
    summary.clientLinkPath ?? "",
    summary.snapshotVersion ?? 0,
    summary.passwordRequired ?? false,
  ].join("|");
}

/**
 * Whether the optimistic owner-action result should still be preferred over
 * server truth. True only while the optimistic result targets the mounted
 * summary (same projectId) AND the live server signature is unchanged from the
 * one captured when the optimistic result was created.
 */
export function shouldUseOptimisticPublicationResult(
  localResult: { summaryKey: string; baseServerSignature: string } | null,
  summaryKey: string,
  serverSignature: string,
): boolean {
  return Boolean(
    localResult &&
      localResult.summaryKey === summaryKey &&
      localResult.baseServerSignature === serverSignature,
  );
}

function readActivitySeenStorageKey(summary: ProjectPublicationSummary | null, summaryKey: string) {
  return `${SHARED_LINK_ACTIVITY_SEEN_STORAGE_PREFIX}:${summary?.publicationId ?? summaryKey}`;
}

// MOD-MET / AC-MOD-07: the "unseen activity" side of the dot. Includes latestActivityAt
// (max of comments/decisions/opens from the summary) so a new comment or decision lights
// the dot, not just an open. Accepts the loose metadata shape used by the live-refetch path.
function readLatestPublicationActivityAt(
  metadata: Pick<ProjectPublicationSummary, "latestOpenedAt" | "latestActivityAt" | "latestRecipientOpen"> | null,
) {
  const timestamps = [metadata?.latestActivityAt, metadata?.latestOpenedAt, metadata?.latestRecipientOpen?.openedAt]
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a));
  return timestamps[0] ?? null;
}

function readStoredActivitySeenAt(storageKey: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeStoredActivitySeenAt(storageKey: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, value);
  } catch {}
}

function isPublicationActivityUnseen(latestActivityAt: string | null, lastSeenAt: string | null) {
  if (!latestActivityAt) return false;
  if (!lastSeenAt) return true;
  return Date.parse(latestActivityAt) > Date.parse(lastSeenAt);
}

function readDestructivePublicationActionCopy(action: DestructivePublicationAction | null) {
  if (action === "rotate") {
    return {
      title: "Create new shared link?",
      description: "The current shared link will stop working.",
      // AC-MOD-14 (MOD-SHEET-03): rotation re-publishes the currently-published estimates and
      // existing password, not any unsaved picker/password edits — make that explicit.
      body: "The current shared link will stop working immediately. Existing recipients are kept — re-send them the new link from the Recipients tab. The new link keeps the currently-published estimates and password; unsaved picker or password changes are not applied. Password-protected links require recipients to re-enter the password.",
      confirmLabel: "Create new link",
    };
  }

  if (action === "regenerate") {
    return {
      title: "Create a brand-new shared link?",
      description: "All existing recipient links will stop working.",
      body: "A new token is minted and all existing recipient links will stop working immediately. Prefer Reactivate link to keep the same URL and password. Continue only if you intend to distribute a fresh link.",
      confirmLabel: "Create new link",
    };
  }

  if (action === "clear-password") {
    return {
      title: "Clear shared-link password?",
      description: "Anyone with the link can view it without a password.",
      body: "Anyone with the link can view this shared page without a password after this update.",
      confirmLabel: "Clear password",
    };
  }

  return {
    title: "Turn off shared link?",
    description: "Recipients will lose access to this shared page.",
    body: "Recipients will lose access to this shared page immediately. You can generate a new shared link later.",
    confirmLabel: "Turn off link",
  };
}

function subscribeToOriginChange() {
  return () => undefined;
}

function readBrowserOrigin() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

function readServerOrigin() {
  return "";
}

export function ProjectPublicationHeader({ summary, currentUserEmail = null, projectEstimateSheets = [] }: ProjectPublicationHeaderProps) {
  const summaryKey = readSummaryKey(summary);
  const activitySeenStorageKey = readActivitySeenStorageKey(summary, summaryKey);
  const [open, setOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const [activitySeenState, setActivitySeenState] = useState<{ storageKey: string; value: string | null }>(() => ({
    storageKey: activitySeenStorageKey,
    value: readStoredActivitySeenAt(activitySeenStorageKey),
  }));
  const [localResult, setLocalResult] = useState<PublicationLocalResult | null>(null);
  // MOD-ACT-03: live metadata refetch. Holds ONLY the activity/metadata fields (never
  // status/clientLinkPath/lifecycle) so the open-count, "last opened", and activity dot can
  // update while the modal is mounted without touching the optimistic lifecycle reconcile.
  const [refreshedMetadata, setRefreshedMetadata] = useState<{
    projectId: string;
    data: Pick<ProjectPublicationSummary, "openCount" | "latestOpenedAt" | "latestActivityAt" | "latestRecipientOpen">;
  } | null>(null);
  const [destructiveAction, setDestructiveAction] = useState<DestructivePublicationAction | null>(null);
  const [passwordDraft, setPasswordDraft] = useState<PasswordDraft>(() => ({
    password: "",
    requirePassword: Boolean(summary?.passwordRequired),
    summaryKey,
  }));
  // AC-MOD-10: owner-set expiry draft (datetime-local string; "" = no expiry).
  const [expiryDraft, setExpiryDraft] = useState<ExpiryDraft>(() => ({
    value: isoToDateTimeLocalValue(summary?.expiresAt),
    summaryKey,
  }));
  const [isPending, startTransition] = useTransition();
  // AC-MOD-21: synchronous in-flight latch so a rapid double-click on the destructive confirm
  // dispatches at most one action (the `isPending` transition flag updates a tick too late to
  // stop a second click in the same event loop).
  const confirmInFlightRef = useRef(false);

  // P1: selected estimates for the Estimates tab picker (defaults to all when estimates provided)
  const summarySelectedEstimateIds = summary?.selectedEstimateIds ?? EMPTY_ESTIMATE_IDS;
  const defaultSelectedEstimateIds = useMemo(() => {
    const allEstimateIds = projectEstimateSheets.map((estimate) => estimate.id);
    if (summary?.status === "published" && summarySelectedEstimateIds.length > 0) {
      const availableEstimateIds = new Set(allEstimateIds);
      return summarySelectedEstimateIds.filter((estimateId) => availableEstimateIds.has(estimateId));
    }
    return allEstimateIds;
  }, [projectEstimateSheets, summary?.status, summarySelectedEstimateIds]);
  const [selectedEstimateOverride, setSelectedEstimateOverride] = useState<{
    ids: string[];
    summaryKey: string;
  } | null>(null);
  const selectedEstimateIds =
    selectedEstimateOverride?.summaryKey === summaryKey
      ? selectedEstimateOverride.ids
      : defaultSelectedEstimateIds;
  const setSelectedEstimateIds = (ids: string[]) => {
    setSelectedEstimateOverride({ ids, summaryKey });
  };
  // AC-MOD-14 (MOD-SHEET-02): the picker is "dirty" when the owner has changed the selection on a
  // *published* link but hasn't pressed Update yet. Compare sorted id sets (order-insensitive)
  // against the published selection so re-selecting the same set in a different order isn't dirty.
  const estimateSelectionDirty =
    summary?.status === "published" &&
    !areStringSetsEqual(selectedEstimateIds, summarySelectedEstimateIds);

  // P1/P4/P8: 5-tab navigation (Link / Estimates / Access / Recipients / Activity owner-only)
  const [activeTab, setActiveTab] = useState<PublicationTabId>("link");
  const browserOrigin = useSyncExternalStore(subscribeToOriginChange, readBrowserOrigin, readServerOrigin);
  const serverSignature = readPublicationServerSignature(summary);
  const hasLocalResult = shouldUseOptimisticPublicationResult(localResult, summaryKey, serverSignature);
  const hasPasswordDraft = passwordDraft.summaryKey === summaryKey;
  const requirePassword = hasPasswordDraft ? passwordDraft.requirePassword : Boolean(summary?.passwordRequired);
  const password = hasPasswordDraft ? passwordDraft.password : "";
  // AC-MOD-10: effective expiry input value (draft for this summary, else stored expiry).
  const hasExpiryDraft = expiryDraft.summaryKey === summaryKey;
  const expiryInputValue = hasExpiryDraft ? expiryDraft.value : isoToDateTimeLocalValue(summary?.expiresAt);
  const expiresAtForAction = dateTimeLocalValueToIso(expiryInputValue);
  const clientLinkPath = hasLocalResult ? localResult?.clientLinkPath ?? "" : summary?.clientLinkPath ?? "";
  const canManagePublication = summary?.canManagePublication ?? false;
  const effectiveStatus = hasLocalResult ? localResult?.status ?? "unpublished" : summary?.status ?? "unpublished";
  const effectivePasswordRequired = hasLocalResult ? localResult?.passwordRequired ?? false : summary?.passwordRequired ?? false;
  const hasLiveClientLink = effectiveStatus === "published";
  // AC-MOD-19 (MOD-ACTIVITY-TOKEN-01): the Activity feed needs the publication token (the last
  // path segment of the client link). A revoked/expired link has no live link path → empty token,
  // which the feed cannot load. Derive it from the effective link so the gate below can avoid
  // mounting the feed with a token that would only ever error.
  const activityPublicationToken = clientLinkPath.split("/").pop() || "";
  // AC-MOD-10: an expired link keeps its stored row (status stays "published" in the DB but the
  // summary surfaces "expired"), so it can be reactivated in place. In this state the primary
  // control is a safe Reactivate, with a confirm-gated fresh-token escape hatch.
  const isExpiredLink = effectiveStatus === "expired";
  // MOD-ACT-03: the live-refetched metadata supersedes the prop summary ONLY for the
  // activity/metadata displays + dot. Status, clientLinkPath, and the optimistic lifecycle
  // reconcile above keep using `summary`/`localResult`, so this stays isolated from AC-MOD-05.
  // Use refetched metadata only while the modal is open and it belongs to the current project,
  // so stale or cross-project metadata is never shown (no reset-on-close effect needed).
  const metadataSource =
    (open && refreshedMetadata && refreshedMetadata.projectId === summary?.projectId
      ? refreshedMetadata.data
      : null) ?? summary;
  const latestActivityAt = readLatestPublicationActivityAt(metadataSource);
  const activitySeenAt = activitySeenState.storageKey === activitySeenStorageKey
    ? activitySeenState.value
    : readStoredActivitySeenAt(activitySeenStorageKey);
  const hasHeaderActivity = hasLiveClientLink && isPublicationActivityUnseen(latestActivityAt, activitySeenAt);
  const latestRecipientOpen = canManagePublication ? metadataSource?.latestRecipientOpen ?? null : null;
  const latestAnonymousOpenedAt = metadataSource?.latestOpenedAt ?? null;
  // MOD-MET-02: "last opened" must reflect the genuinely most-recent open. When an anonymous
  // open is newer than the latest recipient-scoped open, show a generic "Last opened" without
  // attribution; otherwise keep the recipient attribution.
  const recipientOpenIsLatest =
    latestRecipientOpen != null &&
    (latestAnonymousOpenedAt == null ||
      Date.parse(latestRecipientOpen.openedAt) >= Date.parse(latestAnonymousOpenedAt));
  const statusLabel = readPublicationStatusLabel(effectiveStatus);
  const absoluteClientLink = clientLinkPath && browserOrigin ? `${browserOrigin}${clientLinkPath}` : clientLinkPath;
  // AC-MOD-16 (MOD-PW-03): the chip reflects the SAVED server state, never the optimistic draft, so
  // it does not flip to "Open access" the instant the box is unchecked. Source of truth is the actual
  // server value — `summary?.passwordRequired` — which equals the reconciled effective value when no
  // optimistic owner action is in flight, and stays on server truth while only the draft has changed.
  const serverPasswordRequired = Boolean(summary?.passwordRequired);
  const passwordStateLabel = serverPasswordRequired ? "Password on" : "Open access";
  // AC-MOD-16 (MOD-PWDRAFT-CHECK-02): the Access tab's password draft is "unsaved" when it diverges
  // from the saved server state — the require toggle differs, or a new password is typed while the
  // box is checked. (Clearing/typing on an open link with the box unchecked is covered by the toggle
  // comparison.) Only meaningful while there is a draft for this summary.
  const passwordDraftDirty =
    hasPasswordDraft &&
    (requirePassword !== serverPasswordRequired || (requirePassword && password.trim().length > 0));
  const passwordRequiredForSubmit = requirePassword && !effectivePasswordRequired && !password.trim();

  function markSharedLinkActivitySeen() {
    const nextSeenAt = latestActivityAt ?? new Date().toISOString();
    setActivitySeenState({ storageKey: activitySeenStorageKey, value: nextSeenAt });
    writeStoredActivitySeenAt(activitySeenStorageKey, nextSeenAt);
  }

  function handlePublicationTabChange(tab: PublicationTabId) {
    setActiveTab(tab);
    if (tab === "activity") markSharedLinkActivitySeen();
  }

  // MOD-ACT-03: best-effort live refetch of the activity/metadata fields when the modal
  // opens and whenever the Activity tab is (re)selected. Stores ONLY the metadata slice;
  // failures are swallowed (the prop summary remains the source of truth). A monotonically
  // increasing token discards stale responses if the modal closed or the summary changed.
  const metadataRefreshTokenRef = useRef(0);
  const projectId = summary?.projectId ?? null;
  const shouldRefreshMetadata = open && canManagePublication && Boolean(projectId);
  useEffect(() => {
    if (!shouldRefreshMetadata || !projectId) return;
    const token = ++metadataRefreshTokenRef.current;
    void (async () => {
      try {
        const next = await refreshProjectPublicationSummary(projectId);
        // Ignore if a newer request superseded this one or the modal/summary moved on.
        if (token !== metadataRefreshTokenRef.current) return;
        if (!next || next.projectId !== projectId) return;
        setRefreshedMetadata({
          projectId,
          data: {
            openCount: next.openCount,
            latestOpenedAt: next.latestOpenedAt,
            latestActivityAt: next.latestActivityAt,
            latestRecipientOpen: next.latestRecipientOpen ?? null,
          },
        });
      } catch {
        // Best-effort; keep the prop summary on failure.
      }
    })();
    // Re-run on modal open and on Activity-tab selection (activeTab) for this project.
  }, [shouldRefreshMetadata, projectId, activeTab]);

  async function copyClientLink() {
    if (!clientLinkPath) {
      setActionFeedback({ text: "Create a shared link first.", tone: "error" });
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable.");
      await navigator.clipboard.writeText(absoluteClientLink);
      setActionFeedback({ text: "Shared link copied.", tone: "success" });
    } catch {
      setActionFeedback({ text: "Copy unavailable. Select the link to copy it.", tone: "error" });
    }
  }

  function openClientLink() {
    if (!clientLinkPath || typeof window === "undefined") {
      setActionFeedback({ text: "Create a shared link first.", tone: "error" });
      return;
    }

    window.open(clientLinkPath, "_blank", "noopener,noreferrer");
  }

  function runPublicationAction(action: () => Promise<{ ok: boolean; message: string; clientLinkPath?: string | null }>) {
    setActionFeedback(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.clientLinkPath !== undefined) {
          setLocalResult({
            clientLinkPath: result.clientLinkPath,
            passwordRequired: result.clientLinkPath ? requirePassword : false,
            status: result.clientLinkPath ? "published" : "revoked",
            summaryKey,
            // Capture the server signature of the *pre-revalidation* summary so
            // the optimistic result auto-expires once the live summary moves on.
            baseServerSignature: serverSignature,
          });
        }
        setPasswordDraft({
          password: "",
          requirePassword: result.clientLinkPath === null ? false : requirePassword,
          summaryKey,
        });
        // AC-MOD-10: drop the expiry draft on success so the input re-syncs to the freshly
        // revalidated summary's stored expiry (mirrors the password-draft reset).
        setExpiryDraft({ value: "", summaryKey: "" });
        // Clear the Estimates-picker override so it re-syncs to the freshly
        // revalidated summary's selection instead of showing stale pre-publish
        // edits (MOD-SHEET-01). Success path only — never in catch.
        setSelectedEstimateOverride(null);
        setActionFeedback({ text: result.message, tone: "success" });
      } catch (error) {
        // AC-MOD-12: a thrown action error renders as a danger alert, never as success.
        setActionFeedback({
          text: error instanceof Error ? error.message : "Publication update failed.",
          tone: "error",
        });
      } finally {
        // AC-MOD-21: release the destructive-confirm latch once the transition settles.
        confirmInFlightRef.current = false;
      }
    });
  }

  function runConfirmedDestructiveAction() {
    if (!summary?.projectId || !destructiveAction) return;
    // AC-MOD-21: synchronous double-submit guard. A rapid second click before React commits
    // the modal-close / isPending update must not dispatch a second action. The latch is
    // released in runPublicationAction's `finally` once the transition settles.
    if (confirmInFlightRef.current) return;
    confirmInFlightRef.current = true;
    const action = destructiveAction;
    setDestructiveAction(null);

    if (action === "clear-password") {
      runPublicationAction(() =>
        republishProjectPublication({
          projectId: summary.projectId,
          selectedEstimateIds,
          password: undefined,
          clearPassword: true,
        }),
      );
      return;
    }

    if (action === "rotate") {
      // AC-MOD-13 (MOD-ROTATE-PWDRAFT-01): rotation re-mints the token only — it must NOT apply
      // the unsaved Access-tab password draft. Passing just { projectId } keeps the server's
      // existing `latest.password_hash` (the safe default); password changes flow through the
      // Access tab + Update, never through rotation. (The confirm copy already tells recipients
      // they must re-enter the existing password.)
      runPublicationAction(() => rotateProjectPublicationLink({ projectId: summary.projectId }));
      return;
    }

    if (action === "regenerate") {
      // AC-MOD-10: deliberate fresh-token mint (breaks existing recipient links). Only reached
      // from the expired-state "Create new link instead" path, behind this confirm. A brand-new
      // link must start LIVE, so we never carry a stale already-past expiry forward — only a
      // future expiry is honored; otherwise the new link starts with no expiry.
      const freshExpiresAt =
        expiresAtForAction && Date.parse(expiresAtForAction) > Date.now() ? expiresAtForAction : null;
      runPublicationAction(() =>
        createProjectPublication({
          projectId: summary.projectId,
          selectedEstimateIds,
          password: requirePassword ? password.trim() : undefined,
          expiresAt: freshExpiresAt,
        }),
      );
      return;
    }

    runPublicationAction(() => revokeProjectPublication({ projectId: summary.projectId }));
  }

  const hasSelectedEstimates = selectedEstimateIds.length > 0;
  const generateDisabled = !canManagePublication || !summary?.projectId || isPending || passwordRequiredForSubmit || !hasSelectedEstimates;

  return (
    <>
      <button
        type="button"
        className={cn(
          "relative grid size-10 shrink-0 place-items-center rounded-xs border border-hairline bg-white text-tertiary transition hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
          open ? "bg-surfaceMuted text-ink" : null,
        )}
        aria-label="Open shared link"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Shared link"
        data-workshop-layout="project-publication-header"
        onClick={() => {
          setActiveTab("link");
          setOpen(true);
        }}
      >
        <LinkSimple size={14} weight="regular" aria-hidden="true" />
        {hasHeaderActivity ? (
          <span
            aria-hidden="true"
            data-shared-link-activity-dot="true"
            className="absolute -right-1 -top-1 size-2 rounded-xs border border-white bg-warning"
          />
        ) : null}
      </button>
      {actionFeedback ? (
        <span
          className="sr-only"
          role={actionFeedback.tone === "error" ? "alert" : "status"}
        >
          {actionFeedback.text}
        </span>
      ) : null}

      <Modal
        open={open}
        title="Shared link"
        description="View-only project page"
        onOpenChange={(next) => {
          if (!next) {
            setActiveTab("link");
            // AC-MOD-12: clear feedback in the close handler (never synchronously in an effect)
            // so stale success/error tone doesn't persist into the next open.
            setActionFeedback(null);
          }
          setOpen(next);
        }}
        className="max-w-5xl"
        bodyClassName="p-0"
      >
        <div className="grid min-h-[600px] grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="border-b border-hairline bg-surfaceMuted p-4 lg:border-b-0 lg:border-r lg:p-6">
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Shared link</p>
                <p className="mt-1.5 text-[12px] font-medium leading-4 text-ink">{statusLabel}</p>
                <p className="mt-1 text-[10px] leading-3 text-secondary">
                  {summary?.selectedEstimateCount ?? 0} estimates · version {summary?.snapshotVersion ?? 0}
                </p>
                {summary?.staleSnapshotWarning ? (
                  <div className="mt-3 rounded-xs border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] leading-4 text-amber-950">
                    Snapshot is {summary.staleSnapshotWarning.daysBehind} days behind current data. Update shared page.
                  </div>
                ) : null}
              </div>
              <div className="border-t border-hairline pt-4 space-y-3">
                <div>
                  <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Opened</p>
                  <p className="mt-0.5 text-[10px] leading-3 text-secondary">
                    <span className="font-medium text-ink">{metadataSource?.openCount ?? 0}</span> times
                  </p>
                </div>
                {latestRecipientOpen && recipientOpenIsLatest ? (
                  <div>
                    <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Last opened by</p>
                    <p className="mt-0.5 text-[10px] leading-3 text-secondary">
                      <span className="block text-ink">{latestRecipientOpen.displayName || latestRecipientOpen.email}</span>
                      <span className="block">{latestRecipientOpen.email}</span>
                      <span className="block">{formatDate(latestRecipientOpen.openedAt)}</span>
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Last opened</p>
                    <p className="mt-0.5 text-[10px] leading-3 text-secondary">{formatDate(latestAnonymousOpenedAt)}</p>
                  </div>
                )}
                <div>
                  <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Published</p>
                  <p className="mt-0.5 text-[10px] leading-3 text-secondary">{formatDate(summary?.publishedAt ?? null)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Expires</p>
                  <p className="mt-0.5 text-[10px] leading-3 text-secondary">{formatDate(summary?.expiresAt ?? null)}</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0 flex flex-col bg-white">
            <WorkshopTreeTabs
              tabs={(
                [
                  { id: "link", label: "Link" },
                  { id: "sheets", label: "Estimates" },
                  { id: "access", label: "Access" },
                  { id: "recipients", label: "Recipients" },
                  { id: "activity", label: "Activity" },
                ] as const
              ).filter((tab) => tab.id !== "activity" || canManagePublication)}
              activeTab={activeTab}
              ariaLabel="Shared link settings"
              onTabChange={handlePublicationTabChange}
              idBase="project-publication"
            />

            {/* AC-MOD-11: a single tabpanel wrapper whose id/labelledby track the active
                tab — correct because only the active panel renders. tabIndex={0} makes the
                panel focusable for keyboard users moving off the tablist. */}
            <div
              className="flex-1 overflow-auto p-6"
              role="tabpanel"
              id={getTabStripPanelId("project-publication", activeTab)}
              aria-labelledby={getTabStripTabId("project-publication", activeTab)}
              tabIndex={0}
            >
              {activeTab === "activity" && canManagePublication && (
                <div className="space-y-2">
                  <h3 className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Shared link activity</h3>
                  <p className="text-[9px] text-tertiary">Comments, decisions, and events from recipients (internal notes visible to you only).</p>
                  {/* AC-MOD-19 (MOD-ACTIVITY-TOKEN-01): only mount the feed for a genuinely live link
                      with a non-empty token. A revoked/expired link has a null clientLinkPath → an
                      empty token → loadSharedLinkActivity("") throws "not found", which the feed shows
                      as a retryable error that always fails. Render a neutral empty state instead. */}
                  {effectiveStatus === "published" && activityPublicationToken ? (
                    <SharedLinkActivityFeed publicationToken={activityPublicationToken} publicationId={summary?.publicationId ?? null} isOwner={true} onActivitySeen={markSharedLinkActivitySeen} />
                  ) : (
                    <p
                      className="rounded-xs border border-dashed border-divider bg-surfaceMuted/60 p-3 text-[10px] leading-4 text-tertiary"
                      role="status"
                    >
                      Activity is available while the link is live. Reactivate or create a shared link to see recipient activity.
                    </p>
                  )}
                </div>
              )}

              {activeTab === "link" && summary === null && (
                // AC-MOD-19 (MOD-EMPTY-NOPROJECT-01): a null summary is NOT an unpublished zeroed
                // link — there is no shareable publication context for this project yet. Render an
                // explicit, calm info state instead of the ambiguous "Create a shared link" zeroed UI.
                <div
                  className="rounded-xs border border-dashed border-divider bg-surfaceMuted/60 p-4 text-[10px] leading-4 text-secondary"
                  role="status"
                >
                  <p className="font-medium text-ink">No shareable publication yet</p>
                  <p className="mt-1 text-tertiary">
                    This project doesn&apos;t have a shareable client page yet. Open a project with
                    published estimates to create and manage its shared link here.
                  </p>
                </div>
              )}

              {activeTab === "link" && summary !== null && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <ControlField
                      label="Shared link"
                      helperText="Anyone with this link can view this project page."
                      className="min-w-0 flex-1"
                    >
                      <div className="mt-1 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] gap-1">
                        <ControlInput
                          id="project-publication-client-link"
                          className={cn("min-h-7", CONTROL_INPUT_SURFACE_CLASS)}
                          aria-label="Shared link"
                          readOnly
                          placeholder="Create a shared link"
                          value={absoluteClientLink}
                          onFocus={(event) => event.currentTarget.select()}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="min-h-7 rounded-xs px-2 text-[10px]"
                          aria-label="Open shared link"
                          disabled={!clientLinkPath}
                          onClick={openClientLink}
                        >
                          <ArrowSquareOut size={11} aria-hidden="true" />
                          Open
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="min-h-7 rounded-xs px-2 text-[10px]"
                          aria-label="Copy shared link"
                          disabled={!clientLinkPath}
                          onClick={() => void copyClientLink()}
                        >
                          <LinkSimple size={11} aria-hidden="true" />
                          Copy
                        </Button>
                      </div>
                    </ControlField>
                    <span className="mt-5 shrink-0 rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium uppercase leading-[10px] text-tertiary">
                      {passwordStateLabel}
                    </span>
                  </div>
                </div>
              )}

              {activeTab === "sheets" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Estimates to include</h3>
                    {/* AC-MOD-14 (MOD-SHEET-02): the published link still shows its saved estimates
                        until the owner presses Update; this hint surfaces the pending change. */}
                    {estimateSelectionDirty && (
                      <span className="text-[9px] font-medium leading-3 text-warning" role="status">
                        Unsaved — Update to apply
                      </span>
                    )}
                  </div>
                  <SheetPickerList
                    estimates={projectEstimateSheets}
                    selectedIds={selectedEstimateIds}
                    onChange={setSelectedEstimateIds}
                    aria-label="Select estimates to include in shared link"
                    disabled={isPending}
                  />
                  {!hasSelectedEstimates && projectEstimateSheets.length > 0 && (
                    <p className="text-[9px] text-tertiary" role="status">0 estimates selected — generate is disabled</p>
                  )}
                </div>
              )}

              {activeTab === "access" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Access</h3>
                    {/* AC-MOD-16 (MOD-PWDRAFT-CHECK-02): same unsaved-hint styling as the Estimates tab
                        (AC-MOD-14) — surfaces a pending password change before Update is pressed. */}
                    {passwordDraftDirty && (
                      <span className="text-[9px] font-medium leading-3 text-warning" role="status">
                        Unsaved — Update to apply
                      </span>
                    )}
                  </div>
                  {/* AC-MOD-16 (MOD-PW-04): state the SAVED server password state explicitly so a
                      checked box with a blank field is never ambiguous about whether one is set. */}
                  <p className="text-[10px] leading-3 text-secondary" role="status">
                    {serverPasswordRequired ? "Password is currently set" : "No password set"}
                  </p>
                  <label className="flex min-h-7 items-center gap-2 rounded-xs border border-hairline bg-white px-2 text-[10px] leading-3 text-secondary transition hover:border-tertiary cursor-pointer">
                    <input
                      type="checkbox"
                      className="size-3 accent-ink"
                      checked={requirePassword}
                      onChange={(event) =>
                        setPasswordDraft({
                          password: event.currentTarget.checked ? password : "",
                          requirePassword: event.currentTarget.checked,
                          summaryKey,
                        })
                      }
                    />
                    <LockSimple size={11} aria-hidden="true" />
                    Require password
                  </label>
                  {requirePassword ? (
                    <ControlField label="Link password" className="max-w-sm">
                      <ControlInput
                        id="project-publication-password"
                        className={cn("min-h-7", CONTROL_INPUT_SURFACE_CLASS)}
                        aria-label="Link password"
                        type="password"
                        placeholder={summary?.passwordRequired ? "Enter a new password to change it" : "Set a link password"}
                        value={password}
                        onChange={(event) =>
                          setPasswordDraft({
                            password: event.currentTarget.value,
                            requirePassword: true,
                            summaryKey,
                          })
                        }
                      />
                    </ControlField>
                  ) : null}
                  {/* AC-MOD-10: owner-set expiry. Empty = no expiry. Applied on Generate/Update. */}
                  <ControlField
                    label="Link expiry"
                    helperText={
                      expiresAtForAction
                        ? "Recipients lose access after this time. Clear the field for no expiry."
                        : "No expiry — the link stays live until you turn it off or rotate it."
                    }
                    className="max-w-sm"
                  >
                    <div className="mt-1 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-1">
                      <ControlInput
                        id="project-publication-expiry"
                        className={cn("min-h-7", CONTROL_INPUT_SURFACE_CLASS)}
                        aria-label="Link expiry"
                        type="datetime-local"
                        value={expiryInputValue}
                        onChange={(event) =>
                          setExpiryDraft({ value: event.currentTarget.value, summaryKey })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-7 rounded-xs px-2 text-[10px]"
                        aria-label="Clear link expiry"
                        disabled={!expiryInputValue}
                        onClick={() => setExpiryDraft({ value: "", summaryKey })}
                      >
                        Clear
                      </Button>
                    </div>
                  </ControlField>
                </div>
              )}

              {activeTab === "recipients" && summary?.publicationId && canManagePublication && (
                <RecipientEmailComposer
                  publicationId={summary.publicationId}
                  baseClientLink={clientLinkPath}
                  currentUserEmail={currentUserEmail}
                  projectName={null}
                  // Recipient-composer messages surface in the shared status box; treat them as
                  // neutral/success (the composer renders its own danger states inline).
                  onMessage={(m) => setActionFeedback(m ? { text: m, tone: "success" } : null)}
                />
              )}
              {activeTab === "recipients" && (!summary?.publicationId || !canManagePublication) && (
                <div className="text-[10px] text-tertiary">
                  Create or activate a shared link first to manage recipients.
                </div>
              )}
            </div>

            {/* Link controls — always visible below tabs so Generate can be disabled from Estimates tab state */}
            <div className="border-t border-hairline p-6">
              <h3 className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Link controls</h3>
              {isExpiredLink ? (
                <>
                  <p className="mt-2 text-[9px] leading-3 text-tertiary">
                    This link has expired. Reactivate it to keep the same URL and password, or create a brand-new link.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {/* AC-MOD-10: safe primary — reactivate in place (same token + password, clears expiry). */}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-7 rounded-xs px-2 text-[10px]"
                      aria-label="Reactivate link"
                      disabled={!canManagePublication || !summary?.projectId || isPending || !hasSelectedEstimates}
                      onClick={() => {
                        if (!summary?.projectId) return;
                        runPublicationAction(() =>
                          republishProjectPublication({
                            projectId: summary.projectId,
                            selectedEstimateIds,
                            expiresAt: null,
                          }),
                        );
                      }}
                    >
                      <ArrowClockwise size={11} aria-hidden="true" />
                      Reactivate link
                    </Button>
                    {/* Confirm-gated fresh-token mint — breaks existing recipient links. */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-7 rounded-xs px-2 text-[10px]"
                      aria-label="Create new link instead"
                      disabled={!canManagePublication || !summary?.projectId || isPending || !hasSelectedEstimates}
                      onClick={() => setDestructiveAction("regenerate")}
                    >
                      <LinkBreak size={11} aria-hidden="true" />
                      Create new link instead
                    </Button>
                  </div>
                </>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="min-h-7 rounded-xs px-2 text-[10px]"
                    aria-label={hasLiveClientLink ? "Update shared page" : "Generate shared link"}
                    disabled={generateDisabled}
                    onClick={() => {
                      if (!summary?.projectId) return;
                      if (hasLiveClientLink && effectivePasswordRequired && !requirePassword) {
                        setDestructiveAction("clear-password");
                        return;
                      }
                      runPublicationAction(() =>
                        hasLiveClientLink
                          ? republishProjectPublication({
                              projectId: summary.projectId,
                              selectedEstimateIds,
                              password: requirePassword && password.trim() ? password.trim() : undefined,
                              clearPassword: !requirePassword,
                              expiresAt: expiresAtForAction,
                            })
                          : createProjectPublication({
                              projectId: summary.projectId,
                              selectedEstimateIds,
                              password: requirePassword ? password.trim() : undefined,
                              expiresAt: expiresAtForAction,
                            }),
                      );
                    }}
                  >
                    <ArrowClockwise size={11} aria-hidden="true" />
                    {hasLiveClientLink ? "Update shared page" : "Generate shared link"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-7 rounded-xs px-2 text-[10px]"
                    aria-label="Create new shared link"
                    disabled={!canManagePublication || !summary?.projectId || !hasLiveClientLink || isPending || passwordRequiredForSubmit}
                    onClick={() => setDestructiveAction("rotate")}
                  >
                    <LinkBreak size={11} aria-hidden="true" />
                    New link
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="min-h-7 rounded-xs px-2 text-[10px]"
                    aria-label="Turn off shared link"
                    disabled={!canManagePublication || !summary?.projectId || !hasLiveClientLink || isPending}
                    onClick={() => setDestructiveAction("revoke")}
                  >
                    <Prohibit size={11} aria-hidden="true" />
                    Turn off link
                  </Button>
                </div>
              )}
            </div>

            {actionFeedback ? (
              <div className="border-t border-hairline p-6">
                {/* AC-MOD-12: error feedback renders as a danger alert; success keeps the neutral
                    status styling so a thrown action error never reads like a success. */}
                <p
                  className={cn(
                    "rounded-xs px-2 py-1.5 text-[9px] leading-3",
                    actionFeedback.tone === "error"
                      ? "border border-dangerSoft bg-dangerSoft text-danger"
                      : "bg-surfaceMuted text-secondary",
                  )}
                  role={actionFeedback.tone === "error" ? "alert" : "status"}
                >
                  {actionFeedback.text}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </Modal>

      <Modal
        open={destructiveAction !== null}
        title={readDestructivePublicationActionCopy(destructiveAction).title}
        description={readDestructivePublicationActionCopy(destructiveAction).description}
        onOpenChange={(next) => {
          if (!next) setDestructiveAction(null);
        }}
        className="max-w-sm"
      >
        <div className="space-y-3">
          <p className="text-[10px] leading-4 text-secondary">
            {readDestructivePublicationActionCopy(destructiveAction).body}
          </p>
          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-7 rounded-xs px-2 text-[10px]"
              onClick={() => setDestructiveAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={destructiveAction === "revoke" || destructiveAction === "regenerate" ? "danger" : "secondary"}
              size="sm"
              className="min-h-7 rounded-xs px-2 text-[10px]"
              disabled={isPending}
              onClick={runConfirmedDestructiveAction}
            >
              {readDestructivePublicationActionCopy(destructiveAction).confirmLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* P1: SheetPickerList — compact, a11y, keyboard-friendly picker for estimates.
 * Used exclusively inside the "Estimates" tab of the publication modal.
 * Design: SF Pro via parent, 10-12px text, rounded-xs (3px), regular Phosphor if needed, native checkboxes for max keyboard.
 */
export type SheetPickerListProps = {
  estimates: ProjectEstimateSheet[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  "aria-label"?: string;
};

export function SheetPickerList({ estimates, selectedIds, onChange, disabled, "aria-label": ariaLabel = "Select estimates to include in shared link" }: SheetPickerListProps) {
  const selectedSet = new Set(selectedIds);
  const allIds = estimates.map((e) => e.id);
  const allSelected = estimates.length > 0 && selectedIds.length === estimates.length;

  function toggle(id: string) {
    if (disabled) return;
    const next = selectedSet.has(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    onChange(next);
  }

  function selectAll() {
    if (disabled) return;
    onChange(allIds);
  }

  function clearAll() {
    if (disabled) return;
    onChange([]);
  }

  if (estimates.length === 0) {
    return (
      <div className="rounded-xs border border-dashed border-divider bg-surfaceMuted/60 p-3 text-center text-[10px] text-tertiary">
        No estimates in this project.
      </div>
    );
  }

  return (
    <div aria-label={ariaLabel} className="text-[10px]">
      <div className="mb-1 flex items-center gap-2 text-[9px]">
        <button
          type="button"
          onClick={selectAll}
          disabled={disabled || allSelected}
          className="rounded-xs px-1.5 py-0.5 text-secondary hover:text-ink disabled:opacity-50"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={disabled || selectedIds.length === 0}
          className="rounded-xs px-1.5 py-0.5 text-secondary hover:text-ink disabled:opacity-50"
        >
          Clear
        </button>
        <span className="ml-auto text-tertiary tabular-nums">
          {selectedIds.length} / {estimates.length} selected
        </span>
      </div>

      <div className="max-h-40 overflow-auto rounded-xs border border-hairline bg-white p-1 text-[10px] leading-4">
        {estimates.map((est) => {
          const checked = selectedSet.has(est.id);
          const label = est.sheetCode ? `${est.sheetCode} — ${est.name}` : est.name;
          return (
            <label
              key={est.id}
              className="flex cursor-pointer items-center gap-1.5 rounded-xs px-1 py-0.5 hover:bg-surfaceMuted/70"
            >
              <input
                type="checkbox"
                className="size-3 accent-ink"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(est.id)}
                aria-label={label}
              />
              <span className="truncate">{label}</span>
            </label>
          );
        })}
      </div>

      {selectedIds.length === 0 && (
        <p className="mt-1 text-[9px] text-tertiary" role="status">
          0 estimates selected
        </p>
      )}
    </div>
  );
}
