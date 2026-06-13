"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  Check,
  CircleNotch,
  Gear,
  LinkSimple,
  PaperPlaneTilt,
  Trash,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Modal } from "@/components/ui/modal";
import { Popover } from "@/components/ui/overlays/popover";
import { Tooltip } from "@/components/ui/overlays/tooltip";
import { useToast } from "@/components/ui/toast";
import { useProjectPresence } from "@/hooks/use-project-presence";
import {
  invalidateProjectCollaboration,
  optimisticallySetCollaboratorRole,
  useProjectCollaborationQuery,
  useQueryClient,
} from "@/hooks/use-project-collaboration-query";
import {
  copyProjectInviteLink,
  inviteEstimateSheetCollaborator,
  inviteProjectCollaborator,
  removeProjectCollaborator,
  readProjectInviteDeliveryReadiness,
  resendProjectInviteEmail,
  setEstimateSheetAccessMode,
  updateProjectCollaboratorRole,
} from "@/lib/collaboration/actions";
import { getCollaborationColorForUser } from "@/lib/collaboration/colors";
import { describeActiveSurface, routeToActiveSurface } from "@/lib/collaboration/presence-surface";
import type { CollaborationRole, ProjectCollaborationSummary, ProjectCollaboratorSummary } from "@/lib/collaboration/types";
import { cn } from "@/lib/ui/cn";

type ProjectTeamspaceHeaderProps = {
  /** SSR summary; seeds the TanStack query (T2.1) — treated as initial data. */
  summary: ProjectCollaborationSummary | null;
};

const roleLabels: Record<CollaborationRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const assignableRoles = Object.keys(roleLabels) as CollaborationRole[];
const ROLE_OPTIONS = assignableRoles.map((role) => ({ value: role, label: roleLabels[role] }));
const SHEET_ACCESS_MODE_OPTIONS = [
  { value: "inherited", label: "Inherited" },
  { value: "restricted", label: "Restricted" },
];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PENDING_INVITE_PREVIEW_COUNT = 3;

function getInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}` : name.slice(0, 2);
  return initials.toUpperCase();
}

function isOnlineCollaborator(collaborator: ProjectCollaboratorSummary, onlineUserIds: Set<string>) {
  return collaborator.online || onlineUserIds.has(collaborator.id);
}

function formatExpiry(expiresAt: string): string {
  const expires = new Date(expiresAt).getTime();
  if (Number.isNaN(expires)) return "expiry unknown";
  const ms = expires - Date.now();
  if (ms <= 0) return "expired";
  const days = Math.round(ms / 86_400_000);
  if (days >= 1) return `expires in ${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.max(1, Math.round(ms / 3_600_000));
  return `expires in ${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * Unified, contrast-correct collaborator avatar (T3.1 / WCAG 1.4.3 fix / R-8).
 * Uses the palette's intended white text on the saturated `cursor` background
 * (≥4.5:1 for all 8 hues), wires the previously-dead stacking offset/zIndex, and
 * shares the exact hue used by that user's live cursor caret.
 */
function CollaboratorAvatar({
  collaborator,
  online,
  offset = 0,
  stackSize = 1,
  size = "header",
}: {
  collaborator: ProjectCollaboratorSummary;
  online: boolean;
  offset?: number;
  stackSize?: number;
  size?: "header" | "row";
}) {
  const initials = getInitials(collaborator.displayName);
  const color = getCollaborationColorForUser(collaborator.id);
  const dimension = size === "header" ? "size-6 text-[9px]" : "size-7 text-[10px]";
  const avatarStyle: CSSProperties = {
    marginLeft: offset ? -8 : 0,
    zIndex: stackSize - offset,
    backgroundColor: color.cursor,
    color: color.text,
    boxShadow: `0 0 0 1.5px #ffffff, 0 0 0 2.5px ${color.ring}`,
  };

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-xs font-medium leading-none",
        dimension,
        online
          ? "after:absolute after:bottom-0 after:right-0 after:size-1.5 after:rounded-xs after:bg-success after:ring-[1.5px] after:ring-white"
          : null,
      )}
      style={avatarStyle}
      data-teamspace-collaborator-color={color.name}
      data-teamspace-online={online ? "true" : "false"}
    >
      {collaborator.avatarUrl ? (
        <span
          role="img"
          aria-label={collaborator.displayName}
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url("${collaborator.avatarUrl}")` }}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}

function RoleBadge({ role }: { role: CollaborationRole }) {
  return (
    <span className="rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[9px] font-medium uppercase leading-[12px] text-tertiary">
      {roleLabels[role]}
    </span>
  );
}

function UnavailableTeamspaceRail() {
  return (
    <Tooltip label="Teamspace unavailable — reopen the project to retry">
      <span
        role="status"
        aria-label="Teamspace unavailable"
        className="relative grid h-8 shrink-0 place-items-center gap-1 rounded-xs border border-hairline bg-white px-2 text-[9px] font-medium text-tertiary opacity-70"
      >
        <span className="flex items-center gap-1">
          <UsersThree size={13} weight="regular" aria-hidden="true" />
          Unavailable
        </span>
      </span>
    </Tooltip>
  );
}

function isWarningActionMessage(result: { ok: boolean; message: string }) {
  if (!result.ok) return true;
  return /share the invite link manually|unavailable|not sent|could not/i.test(result.message);
}

function activityLabel(online: boolean, surface: string | undefined) {
  if (!online) return "Offline";
  if (surface) return `Active now · in ${surface}`;
  return "Active now";
}

export function ProjectTeamspaceHeader({ summary }: ProjectTeamspaceHeaderProps) {
  const query = useProjectCollaborationQuery(summary);
  const liveSummary = query.data ?? summary;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const pathname = usePathname();
  const activeSurface = useMemo(() => routeToActiveSurface(pathname), [pathname]);

  const [open, setOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<CollaborationRole>("editor");
  const [sheetInviteEmailById, setSheetInviteEmailById] = useState<Record<string, string>>({});
  const [sheetInviteRoleById, setSheetInviteRoleById] = useState<Record<string, CollaborationRole>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionMessageTone, setActionMessageTone] = useState<"neutral" | "warning">("neutral");
  const [actionAssertive, setActionAssertive] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<ProjectCollaboratorSummary | null>(null);
  const [notifyRemovedCollaborator, setNotifyRemovedCollaborator] = useState(false);
  const [inviteDeliveryConfigured, setInviteDeliveryConfigured] = useState<boolean | null>(null);
  const [inviteDeliveryMessage, setInviteDeliveryMessage] = useState<string | null>(null);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [doneRowId, setDoneRowId] = useState<string | null>(null);
  const [showAllPending, setShowAllPending] = useState(false);
  const [maxFaces, setMaxFaces] = useState(4);
  const [presenceAnnouncement, setPresenceAnnouncement] = useState("");
  const [isPending, startTransition] = useTransition();

  const currentUser = useMemo(
    () =>
      liveSummary?.collaborators.find((collaborator) => collaborator.id === liveSummary.currentUserId) ??
      liveSummary?.collaborators[0] ??
      null,
    [liveSummary],
  );

  const presence = useProjectPresence({
    projectId: liveSummary?.projectId,
    currentUser,
    activeSurface,
    enabled: Boolean(liveSummary),
  });
  const onlineUserIds = presence.onlineUserIds;

  // Responsive face budget (08 §2 responsive rules): 2 (<640) / 3 (<900) / 4.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const small = window.matchMedia("(max-width: 639px)");
    const medium = window.matchMedia("(max-width: 899px)");
    function update() {
      setMaxFaces(small.matches ? 2 : medium.matches ? 3 : 4);
    }
    update();
    small.addEventListener("change", update);
    medium.addEventListener("change", update);
    return () => {
      small.removeEventListener("change", update);
      medium.removeEventListener("change", update);
    };
  }, []);

  // Announce joins/leaves once at a time (08 §2 aria-live).
  const prevOnlineRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!liveSummary) return;
    const prev = prevOnlineRef.current;
    const nameFor = (id: string) =>
      liveSummary.collaborators.find((collaborator) => collaborator.id === id)?.displayName ?? "Someone";
    for (const id of onlineUserIds) {
      if (!prev.has(id) && id !== liveSummary.currentUserId) {
        setPresenceAnnouncement(`${nameFor(id)} is now active`);
        break;
      }
    }
    for (const id of prev) {
      if (!onlineUserIds.has(id) && id !== liveSummary.currentUserId) {
        setPresenceAnnouncement(`${nameFor(id)} left`);
        break;
      }
    }
    prevOnlineRef.current = new Set(onlineUserIds);
  }, [onlineUserIds, liveSummary]);

  useEffect(() => {
    if (!open || !liveSummary) return;
    let cancelled = false;

    async function loadInviteDeliveryReadiness() {
      try {
        const readiness = await readProjectInviteDeliveryReadiness();
        if (cancelled) return;
        setInviteDeliveryConfigured(readiness.configured);
        setInviteDeliveryMessage(readiness.message);
      } catch {
        if (cancelled) return;
        setInviteDeliveryConfigured(false);
        setInviteDeliveryMessage(
          "Teamspace invite delivery status could not be verified. Send beta invites manually outside the app.",
        );
      }
    }

    void loadInviteDeliveryReadiness();
    return () => {
      cancelled = true;
    };
  }, [open, liveSummary]);

  // Close the roster popover on Escape / outside click.
  useEffect(() => {
    if (!rosterOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setRosterOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [rosterOpen]);

  if (!liveSummary) return <UnavailableTeamspaceRail />;

  const activeSummary = liveSummary;
  const canManageProjectAccess = activeSummary.canManageAccess;
  const canUseInviteDelivery = inviteDeliveryConfigured === true;
  const checkingDelivery = open && inviteDeliveryConfigured === null;
  const inviteCapabilityDisabled = !canManageProjectAccess || !canUseInviteDelivery;
  const inviteControlsDisabled = inviteCapabilityDisabled || isPending;
  const projectSharePath = `/workshop/projects/${activeSummary.projectId}`;

  // --- Presence-ordered roster (T3.2 / D-2: online in stack, all in roster) ---
  const selfId = activeSummary.currentUserId;
  const self = activeSummary.collaborators.find((collaborator) => collaborator.id === selfId) ?? null;
  const onlineOthers = activeSummary.collaborators
    .filter((collaborator) => collaborator.id !== selfId && isOnlineCollaborator(collaborator, onlineUserIds))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const offlineOthers = activeSummary.collaborators
    .filter((collaborator) => collaborator.id !== selfId && !isOnlineCollaborator(collaborator, onlineUserIds))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const stackOrder = [self, ...onlineOthers].filter(Boolean) as ProjectCollaboratorSummary[];
  const shownFaces = stackOrder.slice(0, maxFaces);
  const overflowCount = activeSummary.collaborators.length - shownFaces.length;
  const rosterOrder = [...stackOrder, ...offlineOthers];
  const onlineCollaboratorCount = activeSummary.collaborators.filter((collaborator) =>
    isOnlineCollaborator(collaborator, onlineUserIds),
  ).length;

  function setResult(message: string, tone: "neutral" | "warning", assertive = false) {
    setActionMessageTone(tone);
    setActionAssertive(assertive);
    setActionMessage(message);
  }

  function runAccessAction(
    action: () => Promise<{ ok: boolean; message: string }>,
    options: { rowId?: string; assertive?: boolean } = {},
  ) {
    setActionMessage(null);
    if (options.rowId) setBusyRowId(options.rowId);
    startTransition(async () => {
      try {
        const result = await action();
        setResult(result.message, isWarningActionMessage(result) ? "warning" : "neutral", options.assertive ?? false);
        if (result.ok) {
          await invalidateProjectCollaboration(queryClient, activeSummary.projectId);
          if (options.rowId) {
            setDoneRowId(options.rowId);
            window.setTimeout(() => setDoneRowId((current) => (current === options.rowId ? null : current)), 1400);
          }
        }
      } catch (error) {
        setResult(error instanceof Error ? error.message : "Access update failed.", "warning", options.assertive ?? false);
      } finally {
        if (options.rowId) setBusyRowId((current) => (current === options.rowId ? null : current));
      }
    });
  }

  function openRemovalConfirmation(collaborator: ProjectCollaboratorSummary) {
    setNotifyRemovedCollaborator(false);
    setPendingRemoval(collaborator);
  }

  function closeRemovalConfirmation() {
    if (isPending) return;
    setPendingRemoval(null);
    setNotifyRemovedCollaborator(false);
  }

  function confirmCollaboratorRemoval() {
    if (!pendingRemoval) return;
    const collaborator = pendingRemoval;
    const notify = notifyRemovedCollaborator;
    setPendingRemoval(null);
    setNotifyRemovedCollaborator(false);
    runAccessAction(
      () =>
        removeProjectCollaborator({
          projectId: activeSummary.projectId,
          userId: collaborator.id,
          notify,
        }),
      { assertive: true },
    );
  }

  function handleInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    if (!EMAIL_PATTERN.test(email)) {
      setInviteEmailError("Enter a valid email address.");
      return;
    }
    setInviteEmailError(null);
    if (!canUseInviteDelivery) {
      setResult(inviteDeliveryMessage ?? "Teamspace invite delivery is disabled.", "warning");
      return;
    }
    runAccessAction(async () => {
      const result = await inviteProjectCollaborator({
        projectId: activeSummary.projectId,
        email,
        role: inviteRole,
      });
      if (result.ok) setInviteEmail("");
      return result;
    });
  }

  async function copyShareLink() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable.");
      const projectShareLink = typeof window === "undefined" ? projectSharePath : `${window.location.origin}${projectSharePath}`;
      await navigator.clipboard.writeText(projectShareLink);
      toast({ message: "Private link copied.", tone: "success" });
      setResult("Private link copied.", "neutral");
    } catch {
      toast({ message: "Copy unavailable. Select the link to copy it.", tone: "error" });
      setResult("Copy unavailable. Select the link to copy it.", "warning");
    }
  }

  async function copyInviteLink(invitation: ProjectCollaborationSummary["pendingInvitations"][number]) {
    try {
      if (!canUseInviteDelivery) throw new Error(inviteDeliveryMessage ?? "Teamspace invite delivery is disabled.");
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable.");
      let invitePath = invitation.invitePath;
      if (!invitePath) {
        const result = await copyProjectInviteLink({ invitationId: invitation.id });
        if (!result.ok) throw new Error(result.message);
        invitePath = result.invitePath ?? null;
      }
      if (!invitePath) throw new Error("Invite link unavailable.");
      const inviteLink = typeof window === "undefined" ? invitePath : `${window.location.origin}${invitePath}`;
      await navigator.clipboard.writeText(inviteLink);
      toast({ message: "Invite link copied.", tone: "success" });
      setResult("Invite link copied.", "neutral");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Copy unavailable. Ask the sender to refresh this invite.";
      toast({ message, tone: "error" });
      setResult(message, "warning");
    }
  }

  function resendInviteEmail(invitation: ProjectCollaborationSummary["pendingInvitations"][number]) {
    if (!canUseInviteDelivery) {
      setResult(inviteDeliveryMessage ?? "Teamspace invite delivery is disabled.", "warning");
      return;
    }
    runAccessAction(() => resendProjectInviteEmail({ invitationId: invitation.id }));
  }

  function readSheetInviteRole(estimateId: string) {
    return sheetInviteRoleById[estimateId] ?? "viewer";
  }

  function updateSheetInviteEmail(estimateId: string, email: string) {
    setSheetInviteEmailById((current) => ({ ...current, [estimateId]: email }));
  }

  function updateSheetInviteRole(estimateId: string, role: CollaborationRole) {
    setSheetInviteRoleById((current) => ({ ...current, [estimateId]: role }));
  }

  function handleSheetInviteSubmit(estimateId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = (sheetInviteEmailById[estimateId] ?? "").trim();
    if (!email) return;
    if (!EMAIL_PATTERN.test(email)) {
      setResult("Enter a valid email address.", "warning");
      return;
    }
    if (!canUseInviteDelivery) {
      setResult(inviteDeliveryMessage ?? "Teamspace invite delivery is disabled.", "warning");
      return;
    }
    runAccessAction(async () => {
      const result = await inviteEstimateSheetCollaborator({
        projectId: activeSummary.projectId,
        estimateId,
        email,
        role: readSheetInviteRole(estimateId),
      });
      if (result.ok) updateSheetInviteEmail(estimateId, "");
      return result;
    });
  }

  function commitRoleChange(collaborator: ProjectCollaboratorSummary, role: CollaborationRole) {
    optimisticallySetCollaboratorRole(queryClient, activeSummary.projectId, collaborator.id, role);
    runAccessAction(
      () =>
        updateProjectCollaboratorRole({
          projectId: activeSummary.projectId,
          userId: collaborator.id,
          role,
        }),
      { rowId: collaborator.id },
    );
  }

  function openManageAccess() {
    setRosterOpen(false);
    // Reset to "checking…" here (event context) rather than in the readiness
    // effect, so the modal re-verifies delivery each open without a sync setState
    // inside the effect.
    setInviteDeliveryConfigured(null);
    setOpen(true);
  }

  const isEmptyTeam = activeSummary.collaborators.length <= 1 && activeSummary.pendingInvitations.length === 0;
  const visiblePending = showAllPending
    ? activeSummary.pendingInvitations
    : activeSummary.pendingInvitations.slice(0, PENDING_INVITE_PREVIEW_COUNT);
  const hiddenPendingCount = activeSummary.pendingInvitations.length - visiblePending.length;

  function rosterActivityFor(collaborator: ProjectCollaboratorSummary) {
    const online = isOnlineCollaborator(collaborator, onlineUserIds);
    const entry = presence.entries.get(collaborator.id);
    const surface = entry ? describeActiveSurface(entry.activeSurface) : undefined;
    return activityLabel(online, online ? surface : undefined);
  }

  return (
    <>
      {/* Header presence cluster (Track B) — replaces the lone gear. */}
      <div
        className="relative flex items-center"
        data-workshop-layout="project-teamspace-header"
        data-teamspace-presence-cluster
      >
        <div className="flex items-center" role="group" aria-label={`${onlineCollaboratorCount} active now`}>
          {shownFaces.map((collaborator, index) => {
            const online = isOnlineCollaborator(collaborator, onlineUserIds);
            const isSelf = collaborator.id === selfId;
            const activity = rosterActivityFor(collaborator);
            const label = `${collaborator.displayName}${isSelf ? " (you)" : ""}, ${roleLabels[collaborator.role]}, ${activity}`;
            return (
              <Tooltip key={collaborator.id} label={label} side="bottom">
                <button
                  type="button"
                  className="rounded-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  style={{ marginLeft: index ? -8 : 0, zIndex: shownFaces.length - index }}
                  aria-label={label}
                  data-teamspace-face={collaborator.id}
                  onClick={openManageAccess}
                >
                  <CollaboratorAvatar
                    collaborator={collaborator}
                    online={online}
                    offset={0}
                    stackSize={shownFaces.length}
                  />
                </button>
              </Tooltip>
            );
          })}

          {overflowCount > 0 ? (
            <Popover
              open={rosterOpen}
              onOpenChange={setRosterOpen}
              side="bottom"
              align="end"
              title="In this project"
              triggerLabel={`Show all ${activeSummary.collaborators.length} collaborators`}
              triggerVariant="ghost"
              triggerSize="sm"
              triggerClassName="ml-1 grid size-6 place-items-center rounded-xs border border-hairline bg-surfaceMuted px-0 text-[9px] font-medium text-secondary hover:bg-white"
              contentClassName="w-64"
              className="ml-0"
              trigger={<span aria-hidden="true">+{overflowCount}</span>}
              footer={
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-1 rounded-xs px-2 py-1 text-[10px] font-medium text-ink hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  onClick={openManageAccess}
                >
                  <Gear size={12} aria-hidden="true" />
                  Manage access
                </button>
              }
            >
              <RosterList
                collaborators={rosterOrder}
                onlineUserIds={onlineUserIds}
                rosterActivityFor={rosterActivityFor}
                selfId={selfId}
              />
            </Popover>
          ) : null}
        </div>

        <Tooltip label="Manage access">
          <button
            type="button"
            className={cn(
              "ml-1 grid h-6 shrink-0 place-items-center gap-1 rounded-xs border border-hairline bg-white px-1.5 text-[10px] font-medium text-tertiary transition hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              "lg:px-2",
            )}
            aria-label="Manage access"
            aria-haspopup="dialog"
            aria-expanded={open}
            data-teamspace-manage-access
            onClick={openManageAccess}
          >
            <Gear size={13} weight="regular" aria-hidden="true" />
            <span className="hidden lg:inline">Manage access</span>
          </button>
        </Tooltip>

        <span className="sr-only" role="status" aria-live="polite" aria-relevant="additions removals">
          {presenceAnnouncement}
        </span>
      </div>

      <ShareModal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setActionMessage(null);
            setInviteEmailError(null);
          }
        }}
        summary={activeSummary}
        currentUser={currentUser}
        onlineUserIds={onlineUserIds}
        rosterActivityFor={rosterActivityFor}
        canManageProjectAccess={canManageProjectAccess}
        canUseInviteDelivery={canUseInviteDelivery}
        checkingDelivery={checkingDelivery}
        inviteDeliveryConfigured={inviteDeliveryConfigured}
        inviteDeliveryMessage={inviteDeliveryMessage}
        inviteControlsDisabled={inviteControlsDisabled}
        inviteCapabilityDisabled={inviteCapabilityDisabled}
        isPending={isPending}
        isEmptyTeam={isEmptyTeam}
        inviteEmail={inviteEmail}
        inviteEmailError={inviteEmailError}
        inviteRole={inviteRole}
        onInviteEmailChange={(value) => {
          setInviteEmail(value);
          if (inviteEmailError) setInviteEmailError(null);
        }}
        onInviteRoleChange={setInviteRole}
        onInviteSubmit={handleInviteSubmit}
        busyRowId={busyRowId}
        doneRowId={doneRowId}
        onCommitRole={commitRoleChange}
        onRemove={openRemovalConfirmation}
        sheetInviteEmailById={sheetInviteEmailById}
        readSheetInviteRole={readSheetInviteRole}
        onSheetInviteEmailChange={updateSheetInviteEmail}
        onSheetInviteRoleChange={updateSheetInviteRole}
        onSheetInviteSubmit={handleSheetInviteSubmit}
        onSheetAccessModeChange={(estimateId, mode) =>
          runAccessAction(() =>
            setEstimateSheetAccessMode({
              projectId: activeSummary.projectId,
              estimateId,
              inheritProjectAccess: mode === "inherited",
            }),
          )
        }
        visiblePending={visiblePending}
        hiddenPendingCount={hiddenPendingCount}
        onShowAllPending={() => setShowAllPending(true)}
        onResendInvite={resendInviteEmail}
        onCopyInvite={copyInviteLink}
        projectSharePath={projectSharePath}
        onCopyShareLink={copyShareLink}
        actionMessage={actionMessage}
        actionMessageTone={actionMessageTone}
        actionAssertive={actionAssertive}
      />

      <Modal
        open={Boolean(pendingRemoval)}
        title={`Remove ${pendingRemoval?.displayName ?? "collaborator"}?`}
        tone="destructive"
        size="sm"
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeRemovalConfirmation();
        }}
      >
        <div className="space-y-3">
          <p className="text-[10px] leading-4 text-secondary">
            They will lose access to this project and all estimates. You can re-invite them later.
          </p>
          {pendingRemoval ? (
            <label className="flex items-center gap-2 rounded-xs border border-hairline px-2 py-1.5 text-[10px] font-medium leading-3 text-secondary">
              <input
                type="checkbox"
                className="size-3 rounded-xs border-hairline text-ink focus:ring-focus"
                checked={notifyRemovedCollaborator}
                disabled={isPending}
                onChange={(event) => setNotifyRemovedCollaborator(event.target.checked)}
              />
              <span>Notify {pendingRemoval.displayName} of removal</span>
            </label>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-7 rounded-xs px-2 text-[10px]"
              disabled={isPending}
              onClick={closeRemovalConfirmation}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="min-h-7 rounded-xs px-2 text-[10px]"
              disabled={isPending}
              onClick={confirmCollaboratorRemoval}
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function RosterList({
  collaborators,
  onlineUserIds,
  rosterActivityFor,
  selfId,
}: {
  collaborators: ProjectCollaboratorSummary[];
  onlineUserIds: Set<string>;
  rosterActivityFor: (collaborator: ProjectCollaboratorSummary) => string;
  selfId?: string;
}) {
  return (
    <ul className="space-y-1">
      {collaborators.map((collaborator) => {
        const online = isOnlineCollaborator(collaborator, onlineUserIds);
        return (
          <li key={collaborator.id} className="flex min-w-0 items-center gap-2">
            <CollaboratorAvatar collaborator={collaborator} online={online} size="row" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[10px] font-medium leading-3 text-ink">
                {collaborator.displayName}
                {collaborator.id === selfId ? <span className="text-tertiary"> (you)</span> : null}
              </span>
              <span className="block truncate text-[9px] leading-3 text-tertiary">{rosterActivityFor(collaborator)}</span>
            </span>
            <RoleBadge role={collaborator.role} />
          </li>
        );
      })}
    </ul>
  );
}

type ShareModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: ProjectCollaborationSummary;
  currentUser: ProjectCollaboratorSummary | null;
  onlineUserIds: Set<string>;
  rosterActivityFor: (collaborator: ProjectCollaboratorSummary) => string;
  canManageProjectAccess: boolean;
  canUseInviteDelivery: boolean;
  checkingDelivery: boolean;
  inviteDeliveryConfigured: boolean | null;
  inviteDeliveryMessage: string | null;
  inviteControlsDisabled: boolean;
  inviteCapabilityDisabled: boolean;
  isPending: boolean;
  isEmptyTeam: boolean;
  inviteEmail: string;
  inviteEmailError: string | null;
  inviteRole: CollaborationRole;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (role: CollaborationRole) => void;
  onInviteSubmit: (event: FormEvent<HTMLFormElement>) => void;
  busyRowId: string | null;
  doneRowId: string | null;
  onCommitRole: (collaborator: ProjectCollaboratorSummary, role: CollaborationRole) => void;
  onRemove: (collaborator: ProjectCollaboratorSummary) => void;
  sheetInviteEmailById: Record<string, string>;
  readSheetInviteRole: (estimateId: string) => CollaborationRole;
  onSheetInviteEmailChange: (estimateId: string, email: string) => void;
  onSheetInviteRoleChange: (estimateId: string, role: CollaborationRole) => void;
  onSheetInviteSubmit: (estimateId: string, event: FormEvent<HTMLFormElement>) => void;
  onSheetAccessModeChange: (estimateId: string, mode: string) => void;
  visiblePending: ProjectCollaborationSummary["pendingInvitations"];
  hiddenPendingCount: number;
  onShowAllPending: () => void;
  onResendInvite: (invitation: ProjectCollaborationSummary["pendingInvitations"][number]) => void;
  onCopyInvite: (invitation: ProjectCollaborationSummary["pendingInvitations"][number]) => void;
  projectSharePath: string;
  onCopyShareLink: () => void;
  actionMessage: string | null;
  actionMessageTone: "neutral" | "warning";
  actionAssertive: boolean;
};

function ShareModal(props: ShareModalProps) {
  const {
    open,
    onOpenChange,
    summary,
    onlineUserIds,
    rosterActivityFor,
    canManageProjectAccess,
    canUseInviteDelivery,
    checkingDelivery,
    inviteDeliveryConfigured,
    inviteDeliveryMessage,
    inviteControlsDisabled,
    inviteCapabilityDisabled,
    isPending,
    isEmptyTeam,
    inviteEmail,
    inviteEmailError,
    inviteRole,
    onInviteEmailChange,
    onInviteRoleChange,
    onInviteSubmit,
    busyRowId,
    doneRowId,
    onCommitRole,
    onRemove,
    sheetInviteEmailById,
    readSheetInviteRole,
    onSheetInviteEmailChange,
    onSheetInviteRoleChange,
    onSheetInviteSubmit,
    onSheetAccessModeChange,
    visiblePending,
    hiddenPendingCount,
    onShowAllPending,
    onResendInvite,
    onCopyInvite,
    projectSharePath,
    onCopyShareLink,
    actionMessage,
    actionMessageTone,
    actionAssertive,
  } = props;

  let feedback: ReactNode = null;
  if (actionMessage) {
    feedback = (
      <p
        className={cn(
          "rounded-xs px-2 py-1.5 text-[9px] leading-3",
          actionMessageTone === "warning"
            ? "border border-warning/25 bg-warningSoft text-warning"
            : "bg-surfaceMuted text-secondary",
        )}
      >
        {actionMessage}
      </p>
    );
  }

  return (
    <Modal
      open={open}
      title="Share"
      description="Invite people and manage who can edit."
      onOpenChange={onOpenChange}
      size="lg"
      bodyClassName="p-0"
    >
      <div className="max-h-[70vh] overflow-y-auto">
        {/* Zone 1 — People */}
        <section className="space-y-3 p-3">
          {isEmptyTeam ? (
            <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted/60 px-3 py-2.5">
              <p className="text-[11px] font-medium leading-4 text-ink">Invite your first teammate</p>
              <p className="text-[9px] leading-3 text-tertiary">
                Add someone by email to estimate together in real time.
              </p>
            </div>
          ) : null}

          {checkingDelivery ? (
            <p className="flex items-center gap-1.5 text-[9px] leading-3 text-tertiary" role="status">
              <CircleNotch size={11} className="animate-spin" aria-hidden="true" />
              Checking invite delivery…
            </p>
          ) : null}

          <form
            noValidate
            className="grid grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_96px_84px]"
            onSubmit={onInviteSubmit}
          >
            <div className="min-w-0">
              <label className="sr-only" htmlFor="teamspace-invite-email">
                Invite by email
              </label>
              <input
                id="teamspace-invite-email"
                className={cn(
                  "min-h-7 w-full min-w-0 rounded-xs border bg-white px-2 text-[10px] leading-3 text-ink outline-none placeholder:text-tertiary focus:border-focus",
                  inviteEmailError ? "border-danger" : "border-hairline",
                )}
                type="email"
                value={inviteEmail}
                placeholder="email@company.com"
                aria-label="Invite by email"
                aria-invalid={inviteEmailError ? "true" : undefined}
                aria-describedby={inviteEmailError ? "teamspace-invite-email-error" : undefined}
                disabled={inviteControlsDisabled}
                onChange={(event) => onInviteEmailChange(event.target.value)}
              />
            </div>
            <label className="sr-only" htmlFor="teamspace-invite-role">
              Invite role
            </label>
            <DropdownSelect
              id="teamspace-invite-role"
              className="h-7 rounded-xs border border-hairline bg-white px-1 !text-[10px] text-secondary"
              options={ROLE_OPTIONS}
              value={inviteRole}
              aria-label="Invite role"
              disabled={inviteCapabilityDisabled}
              ariaDisabled={!inviteCapabilityDisabled && isPending}
              onValueChange={(role) => onInviteRoleChange(role as CollaborationRole)}
            />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="min-h-7 rounded-xs px-2 text-[10px]"
              disabled={inviteControlsDisabled || !inviteEmail.trim()}
            >
              Invite
            </Button>
            {/* Reserved helper/error row so paired controls keep their baseline. */}
            <p
              id="teamspace-invite-email-error"
              className={cn("min-h-3 text-[9px] leading-3 sm:col-span-3", inviteEmailError ? "text-danger" : "text-transparent")}
            >
              {inviteEmailError ?? "."}
            </p>
          </form>

          {inviteDeliveryConfigured === false && inviteDeliveryMessage ? (
            <p className="rounded-xs border border-warning/25 bg-warningSoft px-2 py-1.5 text-[9px] leading-3 text-warning">
              {inviteDeliveryMessage}
            </p>
          ) : null}

          <ul className="space-y-1">
            {summary.collaborators.map((collaborator) => {
              const online = isOnlineCollaborator(collaborator, onlineUserIds);
              const busy = busyRowId === collaborator.id;
              const done = doneRowId === collaborator.id;
              return (
                <li
                  key={collaborator.id}
                  className="flex items-center gap-2 rounded-xs border border-hairline px-2 py-1.5"
                  data-teamspace-member-row={collaborator.id}
                >
                  <CollaboratorAvatar collaborator={collaborator} online={online} size="row" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-medium leading-3 text-ink">{collaborator.displayName}</p>
                    <p className="truncate text-[9px] leading-3 text-tertiary">
                      {collaborator.email ?? "No email"} · {rosterActivityFor(collaborator)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {busy ? <CircleNotch size={12} className="animate-spin text-tertiary" aria-hidden="true" /> : null}
                    {done && !busy ? <Check size={12} className="text-success" aria-hidden="true" /> : null}
                    {canManageProjectAccess ? (
                      <div className="w-16 shrink-0">
                        <DropdownSelect
                          className="h-6 rounded-xs border border-hairline bg-white px-1 text-secondary"
                          options={ROLE_OPTIONS}
                          value={collaborator.role}
                          aria-label={`Role for ${collaborator.displayName}`}
                          ariaDisabled={busy}
                          onValueChange={(value) => onCommitRole(collaborator, value as CollaborationRole)}
                        />
                      </div>
                    ) : (
                      <RoleBadge role={collaborator.role} />
                    )}
                    {canManageProjectAccess && collaborator.source === "project" && collaborator.id !== summary.currentUserId ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-6 rounded-xs p-0 text-tertiary hover:bg-dangerSoft hover:text-danger"
                        aria-label={`Remove ${collaborator.displayName}`}
                        disabled={isPending}
                        onClick={() => onRemove(collaborator)}
                      >
                        <Trash size={12} aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          {visiblePending.length ? (
            <div className="space-y-1">
              <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Pending invitations</p>
              {visiblePending.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between gap-2 rounded-xs bg-surfaceMuted px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-[10px] leading-3 text-secondary">{invitation.email}</span>
                    <span className="text-[9px] leading-3 text-tertiary">
                      {roleLabels[invitation.role]} · {formatExpiry(invitation.expiresAt)}
                    </span>
                  </div>
                  {canManageProjectAccess ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-6 rounded-xs px-1.5 text-[9px]"
                        aria-label={`Resend invite for ${invitation.email}`}
                        disabled={!canUseInviteDelivery || isPending}
                        onClick={() => onResendInvite(invitation)}
                      >
                        <PaperPlaneTilt size={11} aria-hidden="true" />
                        Resend
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-6 rounded-xs px-1.5 text-[9px]"
                        aria-label={`Copy invite link for ${invitation.email}`}
                        disabled={!canUseInviteDelivery || isPending}
                        onClick={() => onCopyInvite(invitation)}
                      >
                        <LinkSimple size={11} aria-hidden="true" />
                        Copy
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
              {hiddenPendingCount > 0 ? (
                <button
                  type="button"
                  className="text-[9px] font-medium leading-3 text-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  onClick={onShowAllPending}
                >
                  +{hiddenPendingCount} more
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* Zone 2 — Estimate access (demoted) */}
        <section className="space-y-2 border-t border-hairline p-3">
          <div>
            <h3 className="text-[11px] font-medium leading-4 text-ink">Estimate access</h3>
            <p className="text-[9px] leading-3 text-tertiary">Estimates inherit project roles until an override is set.</p>
          </div>
          <div className="space-y-1">
            {summary.estimateSheets.length ? (
              summary.estimateSheets.map((sheet) => (
                <div key={sheet.estimateId} className="rounded-xs border border-hairline px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-medium leading-3 text-secondary">{sheet.name}</p>
                      <p className="text-[9px] leading-3 text-tertiary">{sheet.sheetCode}</p>
                    </div>
                    {sheet.canManageAccess ? (
                      <div className="w-20 shrink-0">
                        <DropdownSelect
                          className="h-6 rounded-xs border border-hairline bg-white px-1 text-secondary"
                          options={SHEET_ACCESS_MODE_OPTIONS}
                          value={sheet.accessMode === "restricted" ? "restricted" : "inherited"}
                          aria-label={`Access mode for ${sheet.name}`}
                          ariaDisabled={isPending}
                          onValueChange={(mode) => onSheetAccessModeChange(sheet.estimateId, mode)}
                        />
                      </div>
                    ) : (
                      <span className="shrink-0 text-[9px] font-medium uppercase leading-3 text-tertiary">
                        {sheet.accessMode === "inherits-project"
                          ? "Inherited"
                          : `${sheet.overrideCount} override${sheet.overrideCount === 1 ? "" : "s"}`}
                      </span>
                    )}
                  </div>
                  {sheet.canManageAccess ? (
                    <form
                      noValidate
                      className="mt-1.5 grid grid-cols-[minmax(0,1fr)_76px_56px] gap-1"
                      onSubmit={(event) => onSheetInviteSubmit(sheet.estimateId, event)}
                    >
                      <label className="sr-only" htmlFor={`sheet-invite-${sheet.estimateId}`}>
                        Invite to {sheet.name}
                      </label>
                      <input
                        id={`sheet-invite-${sheet.estimateId}`}
                        className="min-h-6 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[9px] leading-3 text-ink outline-none placeholder:text-tertiary focus:border-focus"
                        type="email"
                        value={sheetInviteEmailById[sheet.estimateId] ?? ""}
                        placeholder="email"
                        aria-label={`Invite to ${sheet.name}`}
                        disabled={!canUseInviteDelivery || isPending}
                        onChange={(event) => onSheetInviteEmailChange(sheet.estimateId, event.target.value)}
                      />
                      <label className="sr-only" htmlFor={`sheet-role-${sheet.estimateId}`}>
                        Estimate role for {sheet.name}
                      </label>
                      <DropdownSelect
                        id={`sheet-role-${sheet.estimateId}`}
                        className="h-6 rounded-xs border border-hairline bg-white px-1 text-secondary"
                        options={ROLE_OPTIONS}
                        value={readSheetInviteRole(sheet.estimateId)}
                        aria-label={`Estimate role for ${sheet.name}`}
                        disabled={!canUseInviteDelivery}
                        ariaDisabled={canUseInviteDelivery && isPending}
                        onValueChange={(role) => onSheetInviteRoleChange(sheet.estimateId, role as CollaborationRole)}
                      />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="min-h-6 rounded-xs px-1.5 text-[9px]"
                        aria-label={`Invite to ${sheet.name}`}
                        disabled={!canUseInviteDelivery || isPending || !(sheetInviteEmailById[sheet.estimateId] ?? "").trim()}
                      >
                        Invite
                      </Button>
                    </form>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-xs border border-dashed border-hairline px-2 py-3 text-[9px] leading-3 text-tertiary">
                No estimates yet
              </p>
            )}
          </div>
        </section>

        {/* Zone 3 — Private link + presence note */}
        <section className="grid grid-cols-1 gap-3 border-t border-hairline p-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div>
            <h3 className="text-[10px] font-medium leading-3 text-ink">Private project link</h3>
            <div className="mt-1 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-1">
              <label className="sr-only" htmlFor="teamspace-project-share-link">
                Private project link
              </label>
              <input
                id="teamspace-project-share-link"
                className="min-h-6 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[9px] leading-3 text-secondary outline-none focus:border-focus"
                aria-label="Private project link"
                readOnly
                value={projectSharePath}
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-6 rounded-xs px-1.5 text-[9px]"
                aria-label="Copy private link"
                onClick={onCopyShareLink}
              >
                <LinkSimple size={11} aria-hidden="true" />
                Copy
              </Button>
            </div>
          </div>
          <div className="sm:border-l sm:border-hairline sm:pl-3">
            <h3 className="text-[10px] font-medium leading-3 text-ink">Live collaboration</h3>
            <p className="mt-1 text-[9px] leading-3 text-tertiary">Live presence &amp; cursors are enabled for this project.</p>
          </div>
        </section>

        {/* Live regions: polite for routine, assertive for destructive. */}
        {feedback ? (
          <section className="border-t border-hairline p-3">
            <div role="status" aria-live="polite">
              {!actionAssertive ? feedback : null}
            </div>
            <div role="alert" aria-live="assertive">
              {actionAssertive ? feedback : null}
            </div>
          </section>
        ) : null}
      </div>
    </Modal>
  );
}
