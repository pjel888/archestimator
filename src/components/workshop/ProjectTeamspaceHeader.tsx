"use client";

import { useEffect, useMemo, useState, useTransition, type CSSProperties, type FormEvent } from "react";
import { GearSix, LinkSimple, PaperPlaneTilt, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useProjectPresence } from "@/hooks/use-project-presence";
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
import type { CollaborationRole, ProjectCollaborationSummary, ProjectCollaboratorSummary } from "@/lib/collaboration/types";
import { cn } from "@/lib/ui/cn";

type ProjectTeamspaceHeaderProps = {
  summary: ProjectCollaborationSummary | null;
};

const roleLabels: Record<CollaborationRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const assignableRoles = Object.keys(roleLabels) as CollaborationRole[];

function getInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}` : name.slice(0, 2);
  return initials.toUpperCase();
}

function AvatarBubble({
  collaborator,
  online,
  offset,
}: {
  collaborator: ProjectCollaboratorSummary;
  online: boolean;
  offset: number;
}) {
  const initials = getInitials(collaborator.displayName);
  const color = getCollaborationColorForUser(collaborator.id);
  const avatarStyle: CSSProperties = {
    marginLeft: offset ? -6 : 0,
    backgroundColor: color.cursorSoft,
    borderColor: color.cursor,
    boxShadow: `0 0 0 1px ${color.ring}`,
    color: color.cursor,
  };

  return (
    <span
      className={cn(
        "relative grid size-6 shrink-0 place-items-center overflow-hidden rounded-xs border border-white bg-surfaceMuted text-[8px] font-medium leading-none text-secondary shadow-[0_0_0_1px_#F2F2F2]",
        online ? "after:absolute after:bottom-0 after:right-0 after:size-1.5 after:rounded-xs after:bg-success after:ring-1 after:ring-white" : null,
      )}
      style={avatarStyle}
      title={`${collaborator.displayName} · ${roleLabels[collaborator.role]}`}
      data-teamspace-collaborator-color={color.name}
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
    <span className="rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium uppercase leading-[10px] text-tertiary">
      {roleLabels[role]}
    </span>
  );
}

function EmptyTeamspaceRail() {
  return (
    <div
      className="flex h-full items-center gap-2 px-2 text-[9px] font-medium leading-3 text-tertiary"
      aria-label="Project teamspaces unavailable"
    >
      <span>Teamspaces unavailable</span>
    </div>
  );
}

function isWarningActionMessage(result: { ok: boolean; message: string }) {
  if (!result.ok) return true;
  return /share the invite link manually|unavailable|not sent|could not/i.test(result.message);
}

export function ProjectTeamspaceHeader({ summary }: ProjectTeamspaceHeaderProps) {
  const [open, setOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CollaborationRole>("editor");
  const [sheetInviteEmailById, setSheetInviteEmailById] = useState<Record<string, string>>({});
  const [sheetInviteRoleById, setSheetInviteRoleById] = useState<Record<string, CollaborationRole>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionMessageTone, setActionMessageTone] = useState<"neutral" | "warning">("neutral");
  const [pendingRemoval, setPendingRemoval] = useState<ProjectCollaboratorSummary | null>(null);
  const [notifyRemovedCollaborator, setNotifyRemovedCollaborator] = useState(false);
  const [inviteDeliveryConfigured, setInviteDeliveryConfigured] = useState<boolean | null>(null);
  const [inviteDeliveryMessage, setInviteDeliveryMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const currentUser = useMemo(
    () => summary?.collaborators.find((collaborator) => collaborator.id === summary.currentUserId) ?? summary?.collaborators[0] ?? null,
    [summary],
  );
  const onlineUserIds = useProjectPresence({
    projectId: summary?.projectId,
    currentUser,
    enabled: Boolean(summary),
  });

  useEffect(() => {
    if (!open || !summary) return;
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
        setInviteDeliveryMessage("Teamspace invite delivery status could not be verified. Send beta invites manually outside the app.");
      }
    }

    void loadInviteDeliveryReadiness();
    return () => {
      cancelled = true;
    };
  }, [open, summary]);

  if (!summary) return <EmptyTeamspaceRail />;

  const activeSummary = summary;
  const canManageProjectAccess = activeSummary.canManageAccess;
  const canUseInviteDelivery = inviteDeliveryConfigured === true;
  const inviteControlsDisabled = !canManageProjectAccess || !canUseInviteDelivery || isPending;
  const projectSharePath = `/workshop/projects/${activeSummary.projectId}`;

  function runAccessAction(action: () => Promise<{ ok: boolean; message: string }>) {
    setActionMessage(null);
    setActionMessageTone("neutral");
    startTransition(async () => {
      try {
        const result = await action();
        setActionMessageTone(isWarningActionMessage(result) ? "warning" : "neutral");
        setActionMessage(result.message);
      } catch (error) {
        setActionMessageTone("warning");
        setActionMessage(error instanceof Error ? error.message : "Access update failed.");
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
    runAccessAction(() =>
      removeProjectCollaborator({
        projectId: activeSummary.projectId,
        userId: collaborator.id,
        notify,
      }),
    );
  }

  function handleInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    if (!canUseInviteDelivery) {
      setActionMessageTone("warning");
      setActionMessage(inviteDeliveryMessage ?? "Teamspace invite delivery is disabled.");
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
      setActionMessageTone("neutral");
      setActionMessage("Private link copied.");
    } catch {
      setActionMessageTone("warning");
      setActionMessage("Copy unavailable. Select the link to copy it.");
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
      setActionMessageTone("neutral");
      setActionMessage("Invite link copied.");
    } catch (error) {
      setActionMessageTone("warning");
      setActionMessage(error instanceof Error ? error.message : "Copy unavailable. Ask the sender to refresh this invite.");
    }
  }

  function resendInviteEmail(invitation: ProjectCollaborationSummary["pendingInvitations"][number]) {
    if (!canUseInviteDelivery) {
      setActionMessageTone("warning");
      setActionMessage(inviteDeliveryMessage ?? "Teamspace invite delivery is disabled.");
      return;
    }
    runAccessAction(() =>
      resendProjectInviteEmail({
        invitationId: invitation.id,
      }),
    );
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
    if (!canUseInviteDelivery) {
      setActionMessageTone("warning");
      setActionMessage(inviteDeliveryMessage ?? "Teamspace invite delivery is disabled.");
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

  const visibleCollaborators = activeSummary.collaborators.slice(0, 5);
  const hiddenCollaboratorCount = Math.max(0, activeSummary.collaborators.length - visibleCollaborators.length);
  const onlineCollaboratorCount = activeSummary.collaborators.filter((collaborator) => collaborator.online || onlineUserIds.has(collaborator.id)).length;

  return (
    <>
      <div
        className="flex h-full items-center justify-end gap-2 px-2"
        aria-label="Project teamspaces"
        data-workshop-layout="project-teamspace-header"
      >
        <span className="hidden text-[9px] font-medium leading-3 text-secondary sm:inline">Teamspaces</span>
        <span className="h-4 w-px bg-hairline" aria-hidden="true" />
        <div className="flex items-center" aria-label={`${activeSummary.collaborators.length} project collaborators`}>
          {visibleCollaborators.map((collaborator, index) => (
            <AvatarBubble
              key={collaborator.id}
              collaborator={collaborator}
              online={collaborator.online || onlineUserIds.has(collaborator.id)}
              offset={index}
            />
          ))}
          {hiddenCollaboratorCount ? (
            <span className="grid size-6 shrink-0 place-items-center rounded-xs border border-white bg-surfaceMuted text-[8px] font-medium leading-none text-tertiary shadow-[0_0_0_1px_#F2F2F2]">
              +{hiddenCollaboratorCount}
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-6 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
          aria-label="Open teamspace settings"
          onClick={() => setOpen(true)}
        >
          <GearSix size={13} weight="regular" aria-hidden="true" />
        </Button>
      </div>

      <Modal
        open={open}
        title="Teamspace settings"
        description="Project and estimate sheet access"
        onOpenChange={setOpen}
        className="max-w-2xl"
        bodyClassName="p-0"
      >
        <div className="grid min-h-[360px] grid-cols-[168px_minmax(0,1fr)] divide-x divide-hairline">
          <aside className="min-w-0 bg-surfaceMuted p-3">
            <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Teamspaces</p>
            <p className="mt-1 text-[12px] font-medium leading-4 text-ink">{activeSummary.collaborators.length} collaborators</p>
            <p className="mt-0.5 text-[9px] leading-3 text-tertiary">{onlineCollaboratorCount} active now</p>
            <div className="mt-3 space-y-1">
              {activeSummary.collaborators.map((collaborator) => (
                <div key={collaborator.id} className="flex min-w-0 items-center gap-2 rounded-xs bg-white px-2 py-1.5">
                  <AvatarBubble collaborator={collaborator} online={collaborator.online || onlineUserIds.has(collaborator.id)} offset={0} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-medium leading-3 text-ink">{collaborator.displayName}</p>
                    <p className="truncate text-[8px] leading-[10px] text-tertiary">{collaborator.email ?? "No email"}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
          <div className="min-w-0 space-y-0 divide-y divide-hairline">
            <section className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[11px] font-medium leading-4 text-ink">Project access</h3>
                  <p className="text-[9px] leading-3 text-tertiary">Role baseline for every estimate sheet</p>
                </div>
                <RoleBadge role={activeSummary.currentUserRole} />
              </div>
              <form className="mt-2 grid grid-cols-[minmax(0,1fr)_84px_76px] gap-1" onSubmit={handleInviteSubmit}>
                <label className="sr-only" htmlFor="teamspace-invite-email">
                  Invite by email
                </label>
                <input
                  id="teamspace-invite-email"
                  className="min-h-7 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[10px] leading-3 text-ink outline-none placeholder:text-tertiary focus:border-focus"
                  type="email"
                  value={inviteEmail}
                  placeholder="email@company.com"
                  aria-label="Invite by email"
                  disabled={inviteControlsDisabled}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
                <label className="sr-only" htmlFor="teamspace-invite-role">
                  Invite role
                </label>
                <select
                  id="teamspace-invite-role"
                  className="min-h-7 rounded-xs border border-hairline bg-white px-1 text-[10px] leading-3 text-secondary outline-none focus:border-focus"
                  value={inviteRole}
                  aria-label="Invite role"
                  disabled={inviteControlsDisabled}
                  onChange={(event) => setInviteRole(event.target.value as CollaborationRole)}
                >
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  className="min-h-7 rounded-xs px-2 text-[10px]"
                  disabled={inviteControlsDisabled || !inviteEmail.trim()}
                >
                  Send invite
                </Button>
              </form>
              {inviteDeliveryConfigured === false && inviteDeliveryMessage ? (
                <p className="mt-2 rounded-xs border border-warning/25 bg-warningSoft px-2 py-1.5 text-[9px] leading-3 text-warning">
                  {inviteDeliveryMessage}
                </p>
              ) : null}
              <div className="mt-2 space-y-1">
                {activeSummary.collaborators.map((collaborator) => (
                  <div key={collaborator.id} className="flex items-center justify-between gap-2 rounded-xs border border-hairline px-2 py-1.5">
                    <span className="truncate text-[10px] font-medium leading-3 text-secondary">{collaborator.displayName}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      {canManageProjectAccess ? (
                        <select
                          className="h-6 rounded-xs border border-hairline bg-white px-1 text-[9px] font-medium leading-3 text-secondary outline-none focus:border-focus"
                          value={collaborator.role}
                          aria-label={`Role for ${collaborator.displayName}`}
                          disabled={isPending}
                          onChange={(event) => {
                            const role = event.target.value as CollaborationRole;
                            runAccessAction(() =>
                              updateProjectCollaboratorRole({
                                projectId: activeSummary.projectId,
                                userId: collaborator.id,
                                role,
                              }),
                            );
                          }}
                        >
                          {assignableRoles.map((role) => (
                            <option key={role} value={role}>
                              {roleLabels[role]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <RoleBadge role={collaborator.role} />
                      )}
                      {canManageProjectAccess && collaborator.source === "project" && collaborator.id !== activeSummary.currentUserId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="size-6 rounded-xs p-0 text-tertiary hover:bg-dangerSoft hover:text-danger"
                          aria-label={`Remove ${collaborator.displayName}`}
                          disabled={isPending}
                          onClick={() => openRemovalConfirmation(collaborator)}
                        >
                          <Trash size={12} aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              {activeSummary.pendingInvitations.length ? (
                <div className="mt-2 space-y-1">
                  {activeSummary.pendingInvitations.slice(0, 3).map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between gap-2 rounded-xs bg-surfaceMuted px-2 py-1.5">
                      <div className="min-w-0">
                        <span className="block truncate text-[9px] leading-3 text-tertiary">{invitation.email}</span>
                        <span className="text-[8px] font-medium uppercase leading-[10px] text-tertiary">
                          Pending {roleLabels[invitation.role]}
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
                            onClick={() => resendInviteEmail(invitation)}
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
                            onClick={() => void copyInviteLink(invitation)}
                          >
                            <LinkSimple size={11} aria-hidden="true" />
                            Copy
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
            <section className="p-3">
              <h3 className="text-[11px] font-medium leading-4 text-ink">Estimate sheet access</h3>
              <p className="text-[9px] leading-3 text-tertiary">Sheets inherit project roles until an override is set</p>
              <div className="mt-2 space-y-1">
                {activeSummary.estimateSheets.length ? (
                  activeSummary.estimateSheets.map((sheet) => (
                    <div key={sheet.estimateId} className="rounded-xs border border-hairline px-2 py-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-medium leading-3 text-secondary">{sheet.name}</p>
                          <p className="text-[8px] leading-[10px] text-tertiary">{sheet.sheetCode}</p>
                        </div>
                        {sheet.canManageAccess ? (
                          <select
                            className="h-6 shrink-0 rounded-xs border border-hairline bg-white px-1 text-[9px] font-medium leading-3 text-secondary outline-none focus:border-focus"
                            value={sheet.accessMode === "restricted" ? "restricted" : "inherited"}
                            aria-label={`Access mode for ${sheet.name}`}
                            disabled={isPending}
                            onChange={(event) =>
                              runAccessAction(() =>
                                setEstimateSheetAccessMode({
                                  projectId: activeSummary.projectId,
                                  estimateId: sheet.estimateId,
                                  inheritProjectAccess: event.target.value === "inherited",
                                }),
                              )
                            }
                          >
                            <option value="inherited">Inherited</option>
                            <option value="restricted">Restricted</option>
                          </select>
                        ) : (
                          <span className="shrink-0 text-[8px] font-medium uppercase leading-[10px] text-tertiary">
                            {sheet.accessMode === "inherits-project" ? "Inherited" : `${sheet.overrideCount} override`}
                          </span>
                        )}
                      </div>
                      {sheet.canManageAccess ? (
                        <form
                          className="mt-1.5 grid grid-cols-[minmax(0,1fr)_76px_56px] gap-1"
                          onSubmit={(event) => handleSheetInviteSubmit(sheet.estimateId, event)}
                        >
                          <label className="sr-only" htmlFor={`sheet-invite-${sheet.estimateId}`}>
                            Invite to {sheet.name}
                          </label>
                          <input
                            id={`sheet-invite-${sheet.estimateId}`}
                            className="min-h-6 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[9px] leading-3 text-ink outline-none placeholder:text-tertiary focus:border-focus"
                            type="email"
                            value={sheetInviteEmailById[sheet.estimateId] ?? ""}
                            placeholder="sheet email"
                            aria-label={`Invite to ${sheet.name}`}
                            disabled={!canUseInviteDelivery || isPending}
                            onChange={(event) => updateSheetInviteEmail(sheet.estimateId, event.target.value)}
                          />
                          <label className="sr-only" htmlFor={`sheet-role-${sheet.estimateId}`}>
                            Sheet role for {sheet.name}
                          </label>
                          <select
                            id={`sheet-role-${sheet.estimateId}`}
                            className="min-h-6 rounded-xs border border-hairline bg-white px-1 text-[9px] leading-3 text-secondary outline-none focus:border-focus"
                            value={readSheetInviteRole(sheet.estimateId)}
                            aria-label={`Sheet role for ${sheet.name}`}
                            disabled={!canUseInviteDelivery || isPending}
                            onChange={(event) => updateSheetInviteRole(sheet.estimateId, event.target.value as CollaborationRole)}
                          >
                            {assignableRoles.map((role) => (
                              <option key={role} value={role}>
                                {roleLabels[role]}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="min-h-6 rounded-xs px-1.5 text-[9px]"
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
                    No estimate sheets yet
                  </p>
                )}
              </div>
            </section>
            <section className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] divide-x divide-hairline">
              <div className="p-3">
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
                    onClick={() => void copyShareLink()}
                  >
                    <LinkSimple size={11} aria-hidden="true" />
                    Copy
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-[10px] font-medium leading-3 text-ink">Private realtime</h3>
                <p className="mt-1 text-[9px] leading-3 text-tertiary">
                  {activeSummary.realtime.presenceTransport} presence, {activeSummary.realtime.cursorTransport} cursors
                </p>
              </div>
            </section>
            {actionMessage ? (
              <section className="p-3">
                <p
                  className={cn(
                    "rounded-xs px-2 py-1.5 text-[9px] leading-3",
                    actionMessageTone === "warning"
                      ? "border border-warning/25 bg-warningSoft text-warning"
                      : "bg-surfaceMuted text-secondary",
                  )}
                  role="status"
                >
                  {actionMessage}
                </p>
              </section>
            ) : null}
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(pendingRemoval)}
        title={`Remove ${pendingRemoval?.displayName ?? "collaborator"}?`}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeRemovalConfirmation();
        }}
        className="max-w-sm"
      >
        <div className="space-y-3">
          <p className="text-[10px] leading-4 text-secondary">
            They will lose access to this project and all estimate sheets.
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
