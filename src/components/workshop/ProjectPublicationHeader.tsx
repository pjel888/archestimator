"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { ArrowClockwise, ArrowSquareOut, LinkBreak, LinkSimple, LockSimple, Prohibit } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import {
  ControlField,
  ControlInput,
  CONTROL_INPUT_SURFACE_CLASS,
} from "@/components/ui/control-input";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { SectionLabel } from "@/components/ui/section-label";
import { TabStrip, getTabStripPanelId, getTabStripTabId } from "@/components/ui/tab-strip";
import { cn } from "@/lib/ui/cn";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import {
  createProjectPublication,
  refreshProjectPublicationSummary,
  republishProjectPublication,
  revokeProjectPublication,
  rotateProjectPublicationLink,
} from "@/lib/publication/actions";
import { RecipientEmailComposer } from "./publication/RecipientEmailComposer";
export { RecipientEmailComposer };
import { SheetPickerList } from "./publication/SheetPickerList";
export { SheetPickerList };
export type { SheetPickerListProps } from "./publication/SheetPickerList";
import {
  readPublicationServerSignature,
  shouldUseOptimisticPublicationResult,
} from "./publication/publication-optimistic";
export {
  readPublicationServerSignature,
  shouldUseOptimisticPublicationResult,
} from "./publication/publication-optimistic";
import SharedLinkActivityFeed from "@/components/share/SharedLinkActivityFeed";
import {
  PROJECT_HEADER_ACTION_BUTTON_CLASS,
  PROJECT_HEADER_ACTION_DOT_CLASS,
  PROJECT_HEADER_ACTION_ICON_SIZE,
} from "./project-header-action-styles";
import type {
  ProjectEstimateSheet,
  ProjectPublicationLocationVisibility,
  ProjectPublicationStatus,
  ProjectPublicationSummary,
} from "@/lib/publication/types";

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

type LocationVisibilityDraft = {
  value: ProjectPublicationLocationVisibility;
  summaryKey: string;
};

type PublicationLocalResult = {
  clientLinkPath: string | null;
  passwordRequired: boolean;
  status: ProjectPublicationStatus;
  summaryKey: string;
  baseServerSignature: string;
};

type PublicationTabId = "content" | "recipients" | "activity";
type DestructivePublicationAction = "clear-password" | "revoke" | "rotate" | "regenerate";
type PublicationSuccessIntent =
  | "generate"
  | "republish"
  | "rotate"
  | "regenerate"
  | "revoke"
  | "reactivate"
  | "clear-password";
// AC-MOD-12: owner-action feedback carries a tone so a thrown action error renders as a
// danger alert instead of reading like a success in the neutral status box.
type ActionFeedback = { text: string; tone: "success" | "error" };
const EMPTY_ESTIMATE_IDS: string[] = [];
const EMPTY_PROJECT_ESTIMATE_SHEETS: ProjectEstimateSheet[] = [];
const SHARED_LINK_ACTIVITY_SEEN_STORAGE_PREFIX = "archestimator_shared_link_last_seen";
const LOCATION_VISIBILITY_OPTIONS: Array<{
  value: ProjectPublicationLocationVisibility;
  label: string;
  description: string;
}> = [
  {
    value: "locality",
    label: "City/locality",
    description: "Show a coarse location only.",
  },
  {
    value: "exact",
    label: "Exact address",
    description: "Show the saved project location.",
  },
  {
    value: "hidden",
    label: "Hidden",
    description: "Do not show location on the client page.",
  },
];
const publicationHeaderDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return publicationHeaderDateFormatter.format(new Date(value));
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

function readLocationVisibility(value: ProjectPublicationLocationVisibility | null | undefined): ProjectPublicationLocationVisibility {
  if (value === "exact" || value === "hidden") return value;
  return "locality";
}

function readLocationVisibilityLabel(value: ProjectPublicationLocationVisibility) {
  if (value === "exact") return "Exact address";
  if (value === "hidden") return "Hidden";
  return "City/locality";
}

function readSummaryKey(summary: ProjectPublicationSummary | null) {
  return summary?.projectId ?? "no-project";
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
      body: "The current shared link will stop working immediately. Existing recipients are kept — re-send them the new link from Recipients. The new link keeps the currently-published estimates and password; unsaved picker or password changes are not applied. Password-protected links require recipients to re-enter the password.",
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

function readPublicationSuccessMessage(intent: PublicationSuccessIntent, fallback: string) {
  if (intent === "generate") return "Shared link ready. Copy it or send recipient links from Recipients.";
  if (intent === "republish") return "Shared page updated. Clients now see the saved content and access settings.";
  if (intent === "rotate") return "New shared link ready. Copy it, then resend recipient links from Recipients.";
  if (intent === "regenerate") return "Brand-new shared link ready. Previous recipient links no longer work.";
  if (intent === "revoke") return "Shared link turned off. Clients can no longer open the shared page.";
  if (intent === "reactivate") return "Link reactivated with the same URL and password. Expiry was cleared.";
  if (intent === "clear-password") return "Password removed. Anyone with this link can now open the shared page.";
  return fallback;
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

export function ProjectPublicationHeader({
  summary,
  currentUserEmail = null,
  projectEstimateSheets = EMPTY_PROJECT_ESTIMATE_SHEETS,
}: ProjectPublicationHeaderProps) {
  const summaryKey = readSummaryKey(summary);
  const activitySeenStorageKey = readActivitySeenStorageKey(summary, summaryKey);
  const hydrated = useIsHydrated();
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
  const [locationVisibilityDraft, setLocationVisibilityDraft] = useState<LocationVisibilityDraft>(() => ({
    value: readLocationVisibility(summary?.locationVisibility),
    summaryKey,
  }));
  const [isPending, startTransition] = useTransition();
  const [confirmInFlight, setConfirmInFlight] = useState(false);
  // AC-MOD-21: synchronous in-flight latch so a rapid double-click on the destructive confirm
  // dispatches at most one action (the `isPending` transition flag updates a tick too late to
  // stop a second click in the same event loop).
  const confirmInFlightRef = useRef(false);
  const linkInputRef = useRef<HTMLInputElement | null>(null);
  const focusSharedLinkAfterActionRef = useRef(false);
  const publicationBusy = isPending || confirmInFlight;

  // P1: selected estimates for the Content picker (defaults to all when estimates provided)
  const summarySelectedEstimateIds = summary?.selectedEstimateIds ?? EMPTY_ESTIMATE_IDS;
  const defaultSelectedEstimateIds = useMemo(() => {
    const allEstimateIds = projectEstimateSheets.map((estimate) => estimate.id);
    const availableEstimateIds = new Set(allEstimateIds);
    // AC-MOD-18 (MOD-SHEET-07): prefer the last curated selection (∩ available sheets) regardless of
    // status. After revoke the summary still carries the curated `selectedEstimateIds`; falling
    // through to ALL sheets here would silently broaden a re-publish to every sheet. Only default to
    // "all" when there is no prior curated selection (or none of it survives in the current sheets).
    const curatedAvailableIds = summarySelectedEstimateIds.filter((estimateId) =>
      availableEstimateIds.has(estimateId),
    );
    if (curatedAvailableIds.length > 0) return curatedAvailableIds;
    return allEstimateIds;
  }, [projectEstimateSheets, summarySelectedEstimateIds]);
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

  const [activeTab, setActiveTab] = useState<PublicationTabId>("content");
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
  const expiryDraftDirty = hasExpiryDraft && expiryInputValue !== isoToDateTimeLocalValue(summary?.expiresAt);
  const hasLocationVisibilityDraft = locationVisibilityDraft.summaryKey === summaryKey;
  const savedLocationVisibility = readLocationVisibility(summary?.locationVisibility);
  const locationVisibility = hasLocationVisibilityDraft ? locationVisibilityDraft.value : savedLocationVisibility;
  const locationVisibilityDirty = hasLocationVisibilityDraft && locationVisibility !== savedLocationVisibility;
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
  // `activitySeenAt` comes from localStorage (null on the server, a timestamp on
  // the client), so the unseen-activity dot would render on the server but not on
  // the client → hydration mismatch. Gate on hydration: no dot on the server or
  // first client render; the real unseen state resolves post-commit.
  const hasHeaderActivity = hydrated && hasLiveClientLink && isPublicationActivityUnseen(latestActivityAt, activitySeenAt);
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
  const shareTriggerStateLabel = hasLiveClientLink
    ? `Live, ${metadataSource?.openCount ?? 0} opened`
    : "Draft";
  // AC-MOD-16 (MOD-PW-03): the chip reflects the SAVED publication state, never the unsaved draft, so
  // it does not flip to "Open access" the instant the box is unchecked. Source of truth is the actual
  // server value until an owner action succeeds optimistically, then the reconciled local result.
  const serverPasswordRequired = Boolean(effectivePasswordRequired);
  const passwordStateLabel = serverPasswordRequired ? "Password on" : "Open access";
  // AC-MOD-16 (MOD-PWDRAFT-CHECK-02): the password draft is "unsaved" when it diverges
  // from the saved server state — the require toggle differs, or a new password is typed while the
  // box is checked. (Clearing/typing on an open link with the box unchecked is covered by the toggle
  // comparison.) Only meaningful while there is a draft for this summary.
  const passwordDraftDirty =
    hasPasswordDraft &&
    (requirePassword !== serverPasswordRequired || (requirePassword && password.trim().length > 0));
  const passwordRequiredForSubmit = requirePassword && !effectivePasswordRequired && !password.trim();
  const managerPendingChangeCount = [estimateSelectionDirty, passwordDraftDirty, expiryDraftDirty, locationVisibilityDirty].filter(Boolean).length;
  const selectedEstimateStatusLabel = projectEstimateSheets.length > 0
    ? `${selectedEstimateIds.length} of ${projectEstimateSheets.length} estimates`
    : `${selectedEstimateIds.length} estimates`;
  const accessOverviewLabel = serverPasswordRequired ? "Password required" : "Open access";
  const locationOverviewLabel = readLocationVisibilityLabel(savedLocationVisibility);
  const expiryOverviewLabel = summary?.expiresAt ? formatDate(summary.expiresAt) : "No expiry";
  const latestActivityOverviewLabel = latestActivityAt ? formatDate(latestActivityAt) : "No recipient activity";
  const overviewStatusMessage = managerPendingChangeCount > 0
    ? `${managerPendingChangeCount} pending change${managerPendingChangeCount === 1 ? "" : "s"} — use ${hasLiveClientLink ? "Update shared page" : "Generate shared link"} to apply.`
    : hasLiveClientLink
      ? "Shared page matches saved settings."
      : "Set estimates and access, then generate the shared link.";

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
        // react-doctor-disable-next-line react-doctor/async-defer-await -- The stale-token guard depends on the refreshed summary resolving before metadata is committed.
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

  useEffect(() => {
    if (!open || !focusSharedLinkAfterActionRef.current || !clientLinkPath) return;
    const frame = window.requestAnimationFrame(() => {
      linkInputRef.current?.focus({ preventScroll: true });
      linkInputRef.current?.select();
      focusSharedLinkAfterActionRef.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [clientLinkPath, open]);

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

  function runPublicationAction(
    action: () => Promise<{ ok: boolean; message: string; clientLinkPath?: string | null }>,
    successIntent: PublicationSuccessIntent,
    options?: { nextPasswordRequired?: boolean },
  ) {
    setActionFeedback(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          setActionFeedback({ text: result.message, tone: "error" });
          return;
        }
        if (result.clientLinkPath !== undefined) {
          const nextPasswordRequired = options?.nextPasswordRequired ?? requirePassword;
          setActiveTab("content");
          focusSharedLinkAfterActionRef.current = Boolean(result.clientLinkPath);
          setLocalResult({
            clientLinkPath: result.clientLinkPath,
            passwordRequired: result.clientLinkPath ? nextPasswordRequired : false,
            status: result.clientLinkPath ? "published" : "revoked",
            summaryKey,
            // Capture the server signature of the *pre-revalidation* summary so
            // the optimistic result auto-expires once the live summary moves on.
            baseServerSignature: serverSignature,
          });
        }
        setPasswordDraft({
          password: "",
          requirePassword: result.clientLinkPath === null ? false : options?.nextPasswordRequired ?? requirePassword,
          summaryKey,
        });
        // AC-MOD-10: drop the expiry draft on success so the input re-syncs to the freshly
        // revalidated summary's stored expiry (mirrors the password-draft reset).
        setExpiryDraft({ value: "", summaryKey: "" });
        setLocationVisibilityDraft({ value: "locality", summaryKey: "" });
        // Clear the Estimates-picker override so it re-syncs to the freshly
        // revalidated summary's selection instead of showing stale pre-publish
        // edits (MOD-SHEET-01). Success path only — never in catch.
        setSelectedEstimateOverride(null);
        setActionFeedback({ text: readPublicationSuccessMessage(successIntent, result.message), tone: "success" });
      } catch (error) {
        // AC-MOD-12: a thrown action error renders as a danger alert, never as success.
        setActionFeedback({
          text: error instanceof Error ? error.message : "Publication update failed.",
          tone: "error",
        });
      } finally {
        // AC-MOD-21: release the destructive-confirm latch once the transition settles.
        confirmInFlightRef.current = false;
        setConfirmInFlight(false);
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
    setConfirmInFlight(true);
    const action = destructiveAction;
    setDestructiveAction(null);

    if (action === "clear-password") {
      runPublicationAction(() =>
        republishProjectPublication({
          projectId: summary.projectId,
          selectedEstimateIds,
          password: undefined,
          clearPassword: true,
          locationVisibility,
        }),
        "clear-password",
        { nextPasswordRequired: false },
      );
      return;
    }

    if (action === "rotate") {
      // AC-MOD-13 (MOD-ROTATE-PWDRAFT-01): rotation re-mints the token only — it must NOT apply
      // the unsaved Content password draft. Passing just { projectId } keeps the server's
      // existing `latest.password_hash` (the safe default); password changes flow through the
      // Content controls + Update, never through rotation. (The confirm copy already tells recipients
      // they must re-enter the existing password.)
      runPublicationAction(() => rotateProjectPublicationLink({ projectId: summary.projectId }), "rotate");
      return;
    }

    if (action === "regenerate") {
      if (freshTokenPasswordRequired) {
        confirmInFlightRef.current = false;
        setConfirmInFlight(false);
        setActionFeedback({
          text: "Enter a new password before creating a new protected link.",
          tone: "error",
        });
        return;
      }
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
          locationVisibility,
        }),
        "regenerate",
      );
      return;
    }

    runPublicationAction(() => revokeProjectPublication({ projectId: summary.projectId }), "revoke");
  }

  const hasSelectedEstimates = selectedEstimateIds.length > 0;
  // AC-MOD-22: a fresh token for an expired protected link cannot reuse the existing hash from
  // the client-side draft. Require the owner to type a replacement password before minting a
  // brand-new row, otherwise createProjectPublication would receive an empty string and create an
  // open link while the UI still shows password protection.
  const freshTokenPasswordRequired = isExpiredLink && requirePassword && !password.trim();
  const generateDisabled = !canManagePublication || !summary?.projectId || publicationBusy || passwordRequiredForSubmit || !hasSelectedEstimates;
  const destructiveCopy = readDestructivePublicationActionCopy(destructiveAction);
  const destructiveTone = "danger";

  function handlePrimaryPublicationAction() {
    if (!summary?.projectId) return;
    runPublicationAction(
      () =>
        hasLiveClientLink
          ? republishProjectPublication({
              projectId: summary.projectId,
              selectedEstimateIds,
              password: requirePassword && password.trim() ? password.trim() : undefined,
              clearPassword: false,
              expiresAt: expiresAtForAction,
              locationVisibility,
            })
          : createProjectPublication({
              projectId: summary.projectId,
              selectedEstimateIds,
              password: requirePassword ? password.trim() : undefined,
              expiresAt: expiresAtForAction,
              locationVisibility,
            }),
      hasLiveClientLink ? "republish" : "generate",
    );
  }

  function handleReactivateLink() {
    if (!summary?.projectId) return;
    runPublicationAction(
      () =>
        republishProjectPublication({
          projectId: summary.projectId,
          selectedEstimateIds,
          expiresAt: null,
          locationVisibility,
        }),
      "reactivate",
    );
  }

  function renderPublicationFooter() {
    if (isExpiredLink) {
      return (
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="min-h-8 rounded-xs px-2 text-[10px]"
              aria-label="Reactivate link"
              disabled={!canManagePublication || !summary?.projectId || publicationBusy || !hasSelectedEstimates}
              onClick={handleReactivateLink}
            >
              <ArrowClockwise size={11} aria-hidden="true" />
              Reactivate link
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-8 rounded-xs px-2 text-[10px]"
              aria-label="Create new link instead"
              disabled={!canManagePublication || !summary?.projectId || publicationBusy || !hasSelectedEstimates || freshTokenPasswordRequired}
              onClick={() => setDestructiveAction("regenerate")}
            >
              <LinkBreak size={11} aria-hidden="true" />
              Create new link instead
            </Button>
          </div>
          {freshTokenPasswordRequired ? (
            <p className="text-right text-[9px] leading-3 text-warning">
              Enter a new password in Content before creating a brand-new protected link.
            </p>
          ) : null}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="min-h-8 rounded-xs px-2 text-[10px]"
          aria-label={hasLiveClientLink ? "Update shared page" : "Generate shared link"}
          disabled={generateDisabled}
          onClick={handlePrimaryPublicationAction}
        >
          <ArrowClockwise size={11} aria-hidden="true" />
          {hasLiveClientLink ? "Update shared page" : "Generate shared link"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-8 rounded-xs px-2 text-[10px]"
          aria-label="Create new shared link"
          disabled={!canManagePublication || !summary?.projectId || !hasLiveClientLink || publicationBusy || passwordRequiredForSubmit}
          onClick={() => setDestructiveAction("rotate")}
        >
          <LinkBreak size={11} aria-hidden="true" />
          New link
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="min-h-8 rounded-xs px-2 text-[10px]"
          aria-label="Turn off shared link"
          disabled={!canManagePublication || !summary?.projectId || !hasLiveClientLink || publicationBusy}
          onClick={() => setDestructiveAction("revoke")}
        >
          <Prohibit size={11} aria-hidden="true" />
          Turn off link
        </Button>
      </div>
    );
  }

  const modalLocation = useMemo(() => (
    actionFeedback ? (
      <span
        className={cn(
          "rounded-xs px-2 py-0.5",
          actionFeedback.tone === "error" ? "bg-dangerSoft text-danger" : "text-secondary",
        )}
        role={actionFeedback.tone === "error" ? "alert" : "status"}
      >
        {actionFeedback.text}
      </span>
    ) : (
      <span>{overviewStatusMessage}</span>
    )
  ), [actionFeedback, overviewStatusMessage]);
  const publicationFooter = renderPublicationFooter();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={PROJECT_HEADER_ACTION_BUTTON_CLASS}
        aria-label="Open shared link"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={`Shared link: ${shareTriggerStateLabel}`}
        data-workshop-layout="project-publication-header"
        onClick={() => {
          setActiveTab("content");
          setOpen(true);
        }}
      >
        <LinkSimple size={PROJECT_HEADER_ACTION_ICON_SIZE} weight="regular" aria-hidden="true" />
        {hasLiveClientLink ? (
          <span
            aria-hidden="true"
            data-shared-link-active-dot="true"
            data-shared-link-activity-dot={hasHeaderActivity ? "true" : undefined}
            className={PROJECT_HEADER_ACTION_DOT_CLASS}
          />
        ) : null}
      </Button>
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
            setActiveTab("content");
            // AC-MOD-12: clear feedback in the close handler (never synchronously in an effect)
            // so stale success/error tone doesn't persist into the next open.
            setActionFeedback(null);
          }
          setOpen(next);
        }}
        size="xl"
        className="max-w-[760px]"
        bodyClassName="p-0"
        footer={publicationFooter}
        location={modalLocation}
      >
        <div className="flex min-h-0 flex-col bg-white">
          <div className="min-w-0 flex flex-col bg-white">
            <div className="border-b border-hairline p-4 sm:p-6" data-testid="publication-manager-overview">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <SectionLabel>Publishing overview</SectionLabel>
                  <p className="mt-1 text-[12px] font-medium leading-4 text-ink">{statusLabel}</p>
                  <p className="mt-1 text-[10px] leading-4 text-secondary">{overviewStatusMessage}</p>
                </div>
                {managerPendingChangeCount > 0 ? (
                  <span className="w-fit rounded-xs border border-warning/40 bg-warning/10 px-2 py-1 text-[9px] font-medium leading-3 text-warning">
                    Pending changes
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <div className="rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[9px] font-medium leading-3 text-secondary">
                  {selectedEstimateStatusLabel}
                </div>
                <div className="rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[9px] font-medium leading-3 text-secondary">
                  {accessOverviewLabel}
                </div>
                <div className="rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[9px] font-medium leading-3 text-secondary">
                  {locationOverviewLabel}
                </div>
                <div className="rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[9px] font-medium leading-3 text-secondary">
                  {expiryOverviewLabel}
                </div>
                <div className="rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[9px] font-medium leading-3 text-secondary">
                  {metadataSource?.openCount ?? 0}
                </div>
                <div className="rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[9px] font-medium leading-3 text-secondary">
                  {latestActivityOverviewLabel}
                </div>
              </div>
              {recipientOpenIsLatest && latestRecipientOpen ? (
                <div className="mt-3 text-[10px] leading-4 text-secondary">
                  <p className="font-medium text-ink">Last opened by</p>
                  <p>
                    {latestRecipientOpen.displayName ?? latestRecipientOpen.email}
                    {latestRecipientOpen.displayName ? ` (${latestRecipientOpen.email})` : null}
                  </p>
                </div>
              ) : latestAnonymousOpenedAt ? (
                <div className="mt-3 text-[10px] leading-4 text-secondary">
                  <p className="font-medium text-ink">Last opened</p>
                  <p>{formatDate(latestAnonymousOpenedAt)}</p>
                </div>
              ) : null}
              {summary?.staleSnapshotWarning ? (
                <div className="mt-3 rounded-xs border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] leading-4 text-amber-950">
                  Snapshot is {summary.staleSnapshotWarning.daysBehind} days behind current data. Update shared page.
                </div>
              ) : null}
            </div>

            {summary !== null ? (
              <div className="border-b border-hairline p-4 sm:p-5">
                {hasLiveClientLink ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <SectionLabel>Live client link</SectionLabel>
                      <div className="flex flex-wrap gap-1">
                        <span className="rounded-xs bg-successSoft px-1.5 py-0.5 text-[9px] font-medium leading-3 text-success">Live</span>
                        <span className="rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[9px] font-medium leading-3 text-secondary">
                          {passwordStateLabel}
                        </span>
                      </div>
                    </div>
                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] gap-1">
                      <ControlInput
                        ref={linkInputRef}
                        id="project-publication-client-link"
                        className={cn("min-h-9 !text-[15px]", CONTROL_INPUT_SURFACE_CLASS)}
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
                        className="min-h-9 rounded-xs px-2 text-[10px]"
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
                        className="min-h-9 rounded-xs px-2 text-[10px]"
                        aria-label="Copy shared link"
                        disabled={!clientLinkPath}
                        onClick={() => void copyClientLink()}
                      >
                        <LinkSimple size={11} aria-hidden="true" />
                        Copy
                      </Button>
                    </div>
                    <p className="text-[9px] leading-3 text-secondary">
                      Anyone with this link can open the shared page{serverPasswordRequired ? " after entering the password" : ""}. {summary?.expiresAt ? `Access ends ${formatDate(summary.expiresAt)}.` : "No expiry is set."}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xs border border-dashed border-divider bg-surfaceMuted/60 p-3 text-[10px] leading-4 text-secondary">
                    <p className="font-medium text-ink">{isExpiredLink ? "Link expired" : "Link is off"}</p>
                    <p className="mt-0.5">
                      {isExpiredLink
                        ? "Reactivate keeps the same URL and password, or create a brand-new link for a clean reset."
                        : "Generate a shared link when the client-facing content and access settings are ready."}
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <TabStrip
              tabs={(
                [
                  { id: "content", label: "Content" },
                  { id: "recipients", label: "Recipients" },
                  { id: "activity", label: "Activity" },
                ] as const
              ).filter((tab) => tab.id !== "activity" || canManagePublication)}
              activeTab={activeTab}
              ariaLabel="Shared link sections"
              onTabChange={handlePublicationTabChange}
              className="bg-white px-4 sm:px-5"
              variant="modal"
              idBase="project-publication"
            />

            {/* AC-MOD-11: a single tabpanel wrapper whose id/labelledby track the active
                tab — correct because only the active panel renders. tabIndex={0} makes the
                panel focusable for keyboard users moving off the tablist. */}
            <div
              className="min-h-[320px] flex-1 space-y-5 overflow-auto p-4 sm:p-5"
              role="tabpanel"
              id={getTabStripPanelId("project-publication", activeTab)}
              aria-labelledby={getTabStripTabId("project-publication", activeTab)}
              tabIndex={0}
            >
              {activeTab === "activity" && canManagePublication && (
                <div className="space-y-2">
                  <SectionLabel>Shared link activity</SectionLabel>
                  <p className="text-[9px] text-secondary">Comments, decisions, and events from recipients (internal notes visible to you only).</p>
                  {/* AC-MOD-19 (MOD-ACTIVITY-TOKEN-01): only mount the feed for a genuinely live link
                      with a non-empty token. A revoked/expired link has a null clientLinkPath → an
                      empty token → loadSharedLinkActivity("") throws "not found", which the feed shows
                      as a retryable error that always fails. Render a neutral empty state instead. */}
                  {effectiveStatus === "published" && activityPublicationToken ? (
                    <SharedLinkActivityFeed publicationToken={activityPublicationToken} publicationId={summary?.publicationId ?? null} isOwner={true} onActivitySeen={markSharedLinkActivitySeen} />
                  ) : (
                    <p className="rounded-xs border border-dashed border-divider bg-surfaceMuted/60 p-3 text-[10px] leading-4 text-secondary">
                      Activity is available while the link is live. Reactivate or create a shared link to see recipient activity.
                    </p>
                  )}
                </div>
              )}

              {activeTab === "content" && summary === null && (
                // AC-MOD-19 (MOD-EMPTY-NOPROJECT-01): a null summary is NOT an unpublished zeroed
                // link — there is no shareable publication context for this project yet. Render an
                // explicit, calm info state instead of the ambiguous "Create a shared link" zeroed UI.
                <div
                  className="rounded-xs border border-dashed border-divider bg-surfaceMuted/60 p-4 text-[10px] leading-4 text-secondary"
                >
                  <p className="font-medium text-ink">No shareable publication yet</p>
                  <p className="mt-1 text-secondary">
                    This project doesn&apos;t have a shareable client page yet. Open a project with
                    published estimates to create and manage its shared link here.
                  </p>
                </div>
              )}

              {activeTab === "content" && summary !== null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <SectionLabel>Estimates the client will see</SectionLabel>
                    {/* AC-MOD-14 (MOD-SHEET-02): the published link still shows its saved estimates
                        until the owner presses Update; this hint surfaces the pending change. */}
                    {estimateSelectionDirty && (
                      <span className="text-[9px] font-medium leading-3 text-warning">
                        Unsaved — Update to apply
                      </span>
                    )}
                  </div>
                  <SheetPickerList
                    estimates={projectEstimateSheets}
                    selectedIds={selectedEstimateIds}
                    onChange={setSelectedEstimateIds}
                    aria-label="Select estimates to include in shared link"
                    disabled={publicationBusy}
                  />
                  {!hasSelectedEstimates && projectEstimateSheets.length > 0 && (
                    <p className="text-[9px] text-warning">No estimates selected — your client would see a blank page, so generate is disabled.</p>
                  )}
                </div>
              )}

              {activeTab === "content" && summary !== null && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <SectionLabel>Access</SectionLabel>
                    {/* AC-MOD-16 (MOD-PWDRAFT-CHECK-02): same unsaved-hint styling as the estimates picker
                        (AC-MOD-14) — surfaces a pending password change before Update is pressed. */}
                    {(passwordDraftDirty || expiryDraftDirty || locationVisibilityDirty) && (
                      <span className="text-[9px] font-medium leading-3 text-warning">
                        Unsaved — Update to apply
                      </span>
                    )}
                  </div>
                  {/* AC-MOD-16 (MOD-PW-04): state the SAVED server password state explicitly so a
                      checked box with a blank field is never ambiguous about whether one is set. */}
                  <p className="text-[10px] leading-3 text-secondary">
                    {serverPasswordRequired ? "Password is currently set" : "No password set"}
                  </p>
                  <label className="flex min-h-7 items-center gap-2 rounded-xs border border-hairline bg-white px-2 text-[10px] leading-3 text-secondary transition hover:border-tertiary cursor-pointer">
                    <input
                      type="checkbox"
                      aria-label="Require password"
                      className="size-3 accent-ink"
                      checked={requirePassword}
                      disabled={publicationBusy || serverPasswordRequired}
                      onChange={(event) =>
                        setPasswordDraft({
                          password: event.currentTarget.checked ? password : "",
                          requirePassword: event.currentTarget.checked,
                          summaryKey,
                        })
                      }
                    />
                    <LockSimple size={11} aria-hidden="true" />
                    Clients must enter a password
                  </label>
                  {requirePassword ? (
                    <ControlField label="Link password" className="max-w-sm">
                      <ControlInput
                        id="project-publication-password"
                        className={cn("min-h-7", CONTROL_INPUT_SURFACE_CLASS)}
                        aria-label="Link password"
                        type="password"
                        disabled={publicationBusy}
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
                  {serverPasswordRequired ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="min-h-7 rounded-xs px-2 text-[10px]"
                      aria-label="Remove shared-link password"
                      disabled={publicationBusy || !hasLiveClientLink}
                      onClick={() => setDestructiveAction("clear-password")}
                    >
                      Remove password
                    </Button>
                  ) : null}
                  <div
                    className="max-w-xl"
                    role="radiogroup"
                    aria-labelledby="project-publication-location-label"
                    aria-describedby="project-publication-location-help"
                  >
                    <p id="project-publication-location-label" className="text-[10px] font-medium leading-3 text-ink">Project location</p>
                    <p id="project-publication-location-help" className="mt-0.5 text-[9px] leading-3 text-secondary">
                      Choose how much address detail appears on the shared page.
                    </p>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                      {LOCATION_VISIBILITY_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={cn(
                            "flex min-h-16 cursor-pointer flex-col gap-1 rounded-xs border bg-white p-2 text-[10px] leading-3 transition",
                            locationVisibility === option.value
                              ? "border-ink text-ink"
                              : "border-hairline text-secondary hover:border-tertiary",
                          )}
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <input
                              type="radio"
                              className="size-3 accent-ink"
                              name="project-publication-location-visibility"
                              value={option.value}
                              checked={locationVisibility === option.value}
                              disabled={publicationBusy}
                              onChange={() =>
                                setLocationVisibilityDraft({
                                  value: option.value,
                                  summaryKey,
                                })
                              }
                            />
                            {option.label}
                          </span>
                          <span className="pl-5 text-[9px] leading-3 text-secondary">{option.description}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* AC-MOD-10: owner-set expiry. Empty = no expiry. Applied on Generate/Update. */}
                  <ControlField
                    label="Link expiry"
                    controlId="project-publication-expiry"
                    helperText={
                      expiresAtForAction
                        ? "Clients lose access after this time. Clear the field for no expiry."
                        : "No expiry — the link stays live until you turn it off or rotate it."
                    }
                    as="div"
                    className="max-w-sm"
                  >
                    {({ controlId, labelId, describedBy, invalid }) => (
                      <div className="mt-1 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-1">
                        <ControlInput
                          id={controlId}
                          className={cn("min-h-7", CONTROL_INPUT_SURFACE_CLASS)}
                          aria-labelledby={labelId}
                          aria-describedby={describedBy}
                          invalid={invalid}
                          type="datetime-local"
                          disabled={publicationBusy}
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
                          disabled={publicationBusy || !expiryInputValue}
                          onClick={() => setExpiryDraft({ value: "", summaryKey })}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </ControlField>
                </div>
              )}

              {activeTab === "recipients" && summary?.publicationId && canManagePublication && (
                <RecipientEmailComposer
                  publicationId={summary.publicationId}
                  baseClientLink={clientLinkPath}
                  currentUserEmail={currentUserEmail}
                  projectName={null}
                  isPublicationBusy={publicationBusy}
                  onMessage={(m) => setActionFeedback(m)}
                />
              )}
              {activeTab === "recipients" && (!summary?.publicationId || !canManagePublication) && (
                <div className="text-[10px] text-secondary">
                  Create or activate a shared link first to manage recipients.
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={destructiveAction !== null}
        title={destructiveCopy.title}
        description={destructiveCopy.description}
        confirmLabel={destructiveCopy.confirmLabel}
        tone={destructiveTone}
        busy={isPending}
        initialFocus="cancel"
        onOpenChange={(next) => {
          if (!next) setDestructiveAction(null);
        }}
        onConfirm={runConfirmedDestructiveAction}
      >
        <p>{destructiveCopy.body}</p>
      </ConfirmDialog>
    </>
  );
}
