"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { CircleNotch, Copy, PaperPlaneTilt, Trash } from "@phosphor-icons/react/dist/ssr";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { RadioGroup } from "@/components/ui/radio-group";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/status-badge";
import {
  invalidateProjectCollaboration,
  useProjectCollaborationQuery,
  useQueryClient,
} from "@/hooks/use-project-collaboration-query";
import {
  canAssignCollaborationRole,
  canMutateCollaborationTarget,
} from "@/lib/authz/collaboration-policy";
import {
  addProjectCollaborator,
  addEstimateSheetCollaborator,
  copyProjectInviteLink,
  inviteProjectCollaborator,
  inviteEstimateSheetCollaborator,
  previewEstimateSheetCollaboratorRemoval,
  previewProjectCollaboratorRemoval,
  removeEstimateSheetCollaborator,
  removeProjectCollaborator,
  resendProjectInviteEmail,
  revokeCollaborationInvitation,
  setEstimateSheetAccessMode,
  updateEstimateSheetCollaboratorRole,
  updateProjectCollaboratorRole,
  type ProjectCollaboratorRemovalMode,
} from "@/lib/collaboration/actions";
import type {
  CollaborationRole,
  EstimateSheetAccessSummary,
  EstimateSheetMemberSummary,
  CollaborationInvitationSummary,
  ProjectCollaborationSummary,
  ProjectCollaboratorSummary,
} from "@/lib/collaboration/types";
import { cn } from "@/lib/ui/cn";

export type ProjectMembersAccessPanelProps = {
  initialSummary: ProjectCollaborationSummary | null;
  projectId: string;
};

type PanelFeedback = {
  text: string;
  tone: "success" | "warning";
};

type PendingRemoval = {
  member: EstimateSheetMemberSummary;
  sheet: EstimateSheetAccessSummary;
  previewMessage: string;
};

type PendingInvitationRevocation = CollaborationInvitationSummary;

type PendingProjectRemoval = {
  affectedEstimateNames: string[];
  member: ProjectCollaboratorSummary;
  removalMode: ProjectCollaboratorRemovalMode;
};

const roleLabels: Record<CollaborationRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const ROLE_OPTIONS = (Object.keys(roleLabels) as CollaborationRole[]).map((role) => ({
  value: role,
  label: roleLabels[role],
}));

const SHEET_ACCESS_MODE_OPTIONS = [
  { value: "inherited", label: "Inherited" },
  { value: "restricted", label: "Restricted" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}` : name.slice(0, 2);
  return initials.toUpperCase();
}

function roleStatus(role: CollaborationRole): StatusBadgeStatus {
  if (role === "owner" || role === "admin") return "active";
  if (role === "editor") return "review";
  return "inactive";
}

function sourceLabel(source: ProjectCollaboratorSummary["source"]) {
  if (source === "workspace") return "Workspace";
  if (source === "sheet") return "Sheet";
  return "Project";
}

function accessModeLabel(sheet: EstimateSheetAccessSummary) {
  if (sheet.accessMode === "restricted") return "Restricted";
  if (sheet.accessMode === "sheet-overrides") {
    return `${sheet.overrideCount} override${sheet.overrideCount === 1 ? "" : "s"}`;
  }
  return "Inherited";
}

function isWarningActionMessage(result: { ok: boolean; message: string }) {
  if (!result.ok) return true;
  return /share the invite link manually|unavailable|disabled|not sent|could not/i.test(result.message);
}

function inviteScopeLabel(invitation: CollaborationInvitationSummary) {
  return invitation.scope === "estimate" ? "Estimate" : "Project";
}

function inviteExpiryLabel(value: string) {
  const expiresAt = new Date(value);
  if (Number.isNaN(expiresAt.getTime())) return "Expiry unavailable";
  if (expiresAt.getTime() <= Date.now()) return "Expired";
  return `Expires ${expiresAt.toLocaleDateString("en-PH", { day: "numeric", month: "short" })}`;
}

function manageableRoles(actorRole: CollaborationRole) {
  return ROLE_OPTIONS.filter((option) => canAssignCollaborationRole(actorRole, option.value as CollaborationRole).allowed);
}

function MemberIdentity({ member }: { member: ProjectCollaboratorSummary }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar
        size="xs"
        src={member.avatarUrl ?? undefined}
        alt={member.displayName}
        initials={getInitials(member.displayName)}
      />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium leading-3 text-ink">{member.displayName}</p>
        <p className="truncate text-[9px] leading-3 text-tertiary">{member.email ?? "No email"}</p>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: CollaborationRole }) {
  return (
    <StatusBadge status={roleStatus(role)} className="min-w-0 px-1.5 py-1">
      {roleLabels[role]}
    </StatusBadge>
  );
}

export function ProjectMembersAccessPanel({
  initialSummary,
  projectId,
}: ProjectMembersAccessPanelProps) {
  const query = useProjectCollaborationQuery(initialSummary);
  const queryClient = useQueryClient();
  const summary = query.data ?? initialSummary;
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<PanelFeedback | null>(null);
  const [sheetInviteEmailById, setSheetInviteEmailById] = useState<Record<string, string>>({});
  const [sheetInviteRoleById, setSheetInviteRoleById] = useState<Record<string, CollaborationRole>>({});
  const [sheetMemberCandidateById, setSheetMemberCandidateById] = useState<Record<string, string>>({});
  const [sheetMemberRoleById, setSheetMemberRoleById] = useState<Record<string, CollaborationRole>>({});
  const [projectInviteEmail, setProjectInviteEmail] = useState("");
  const [projectInviteRole, setProjectInviteRole] = useState<CollaborationRole>("viewer");
  const [projectMemberCandidateId, setProjectMemberCandidateId] = useState("");
  const [projectMemberRole, setProjectMemberRole] = useState<CollaborationRole>("viewer");
  const [restrictTarget, setRestrictTarget] = useState<EstimateSheetAccessSummary | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [pendingInvitationRevocation, setPendingInvitationRevocation] = useState<PendingInvitationRevocation | null>(null);
  const [pendingProjectRemoval, setPendingProjectRemoval] = useState<PendingProjectRemoval | null>(null);

  const collaboratorColumns = useMemo<Array<ColumnDef<ProjectCollaboratorSummary>>>(
    () => [
      {
        id: "member",
        header: "Member",
        cell: (member) => <MemberIdentity member={member} />,
      },
      {
        id: "role",
        header: "Role",
        className: "w-24",
        cell: (member) => <RoleBadge role={member.role} />,
      },
      {
        id: "source",
        header: "Source",
        className: "w-20",
        cell: (member) => (
          <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">
            {sourceLabel(member.source)}
          </span>
        ),
      },
    ],
    [],
  );

  function setSheetInviteEmail(estimateId: string, email: string) {
    setSheetInviteEmailById((current) => ({ ...current, [estimateId]: email }));
  }

  function setSheetInviteRole(estimateId: string, role: CollaborationRole) {
    setSheetInviteRoleById((current) => ({ ...current, [estimateId]: role }));
  }

  function readSheetInviteRole(estimateId: string) {
    return sheetInviteRoleById[estimateId] ?? "viewer";
  }

  function readSheetMemberRole(estimateId: string) {
    return sheetMemberRoleById[estimateId] ?? "viewer";
  }

  function runAccessAction(action: () => Promise<{ ok: boolean; message: string }>) {
    if (!summary) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await action();
        setFeedback({
          text: result.message,
          tone: isWarningActionMessage(result) ? "warning" : "success",
        });
        if (result.ok) {
          await invalidateProjectCollaboration(queryClient, summary.projectId);
        }
      } catch (error) {
        setFeedback({
          text: error instanceof Error ? error.message : "Access update failed.",
          tone: "warning",
        });
      }
    });
  }

  function onSheetInviteSubmit(sheet: EstimateSheetAccessSummary, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = (sheetInviteEmailById[sheet.estimateId] ?? "").trim();
    if (!email) return;
    if (!EMAIL_PATTERN.test(email)) {
      setFeedback({ text: "Enter a valid email address.", tone: "warning" });
      return;
    }
    runAccessAction(async () => {
      const result = await inviteEstimateSheetCollaborator({
        projectId,
        estimateId: sheet.estimateId,
        email,
        role: readSheetInviteRole(sheet.estimateId),
      });
      if (result.ok) setSheetInviteEmail(sheet.estimateId, "");
      return result;
    });
  }

  function onProjectInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = projectInviteEmail.trim();
    if (!email) return;
    if (!EMAIL_PATTERN.test(email)) {
      setFeedback({ text: "Enter a valid email address.", tone: "warning" });
      return;
    }
    runAccessAction(async () => {
      const result = await inviteProjectCollaborator({ projectId, email, role: projectInviteRole });
      if (result.ok) setProjectInviteEmail("");
      return result;
    });
  }

  function copyPendingInvite(invitation: CollaborationInvitationSummary) {
    runAccessAction(async () => {
      const result = await copyProjectInviteLink({ invitationId: invitation.id });
      if (!result.ok || !result.invitePath) return result;
      try {
        if (!navigator.clipboard?.writeText) {
          return { ok: false, message: "Copy is unavailable in this browser." };
        }
        await navigator.clipboard.writeText(new URL(result.invitePath, window.location.origin).toString());
        return { ok: true, message: "Invite link copied." };
      } catch {
        return { ok: false, message: "Could not copy the invite link." };
      }
    });
  }

  function resendPendingInvite(invitation: CollaborationInvitationSummary) {
    runAccessAction(() => resendProjectInviteEmail({ invitationId: invitation.id }));
  }

  function confirmPendingInviteRevocation() {
    if (!pendingInvitationRevocation) return;
    const invitation = pendingInvitationRevocation;
    setPendingInvitationRevocation(null);
    runAccessAction(() => revokeCollaborationInvitation({ invitationId: invitation.id }));
  }

  function updateDirectProjectRole(member: ProjectCollaboratorSummary, role: string) {
    if (!member.directProjectRole) return;
    const nextRole = role as CollaborationRole;
    if (!canAssignCollaborationRole(summary?.currentUserRole ?? null, nextRole).allowed) return;
    runAccessAction(() => updateProjectCollaboratorRole({ projectId, userId: member.id, role: nextRole }));
  }

  function updateDirectEstimateRole(sheet: EstimateSheetAccessSummary, member: EstimateSheetMemberSummary, role: string) {
    const nextRole = role as CollaborationRole;
    const actorRole = sheet.currentUserRole ?? summary?.currentUserRole ?? null;
    if (!canAssignCollaborationRole(actorRole, nextRole).allowed) return;
    runAccessAction(() => updateEstimateSheetCollaboratorRole({
      projectId,
      estimateId: sheet.estimateId,
      userId: member.id,
      role: nextRole,
    }));
  }

  function confirmRemoveProjectMember() {
    if (!pendingProjectRemoval) return;
    const { member, removalMode } = pendingProjectRemoval;
    setPendingProjectRemoval(null);
    runAccessAction(() => removeProjectCollaborator({ projectId, removalMode, userId: member.id }));
  }

  function requestRemoveProjectMember(member: ProjectCollaboratorSummary) {
    if (!summary) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await previewProjectCollaboratorRemoval({ projectId, userId: member.id });
        if (!result.ok) {
          setFeedback({ text: result.message, tone: "warning" });
          return;
        }
        setPendingProjectRemoval({
          affectedEstimateNames: result.affectedEstimateNames ?? [],
          member,
          removalMode: "remove_all_direct_grants",
        });
      } catch (error) {
        setFeedback({
          text: error instanceof Error ? error.message : "Could not preview project access removal.",
          tone: "warning",
        });
      }
    });
  }

  function onAccessModeChange(sheet: EstimateSheetAccessSummary, mode: string) {
    const nextInherited = mode === "inherited";
    const currentInherited = sheet.accessMode !== "restricted";
    if (nextInherited === currentInherited) return;
    if (!nextInherited) {
      setRestrictTarget(sheet);
      return;
    }
    runAccessAction(() =>
      setEstimateSheetAccessMode({
        projectId,
        estimateId: sheet.estimateId,
        inheritProjectAccess: true,
      }),
    );
  }

  function confirmRestrictEstimate() {
    if (!restrictTarget) return;
    const sheet = restrictTarget;
    setRestrictTarget(null);
    runAccessAction(() =>
      setEstimateSheetAccessMode({
        projectId,
        estimateId: sheet.estimateId,
        inheritProjectAccess: false,
      }),
    );
  }

  function confirmRemoveSheetMember() {
    if (!pendingRemoval) return;
    const { member, sheet } = pendingRemoval;
    setPendingRemoval(null);
    runAccessAction(() =>
      removeEstimateSheetCollaborator({
        projectId,
        estimateId: sheet.estimateId,
        userId: member.id,
      }),
    );
  }

  function requestRemoveSheetMember(sheet: EstimateSheetAccessSummary, member: EstimateSheetMemberSummary) {
    if (!summary) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await previewEstimateSheetCollaboratorRemoval({
          projectId,
          estimateId: sheet.estimateId,
          userId: member.id,
        });
        if (!result.ok) {
          setFeedback({ text: result.message, tone: "warning" });
          return;
        }
        setPendingRemoval({ member, sheet, previewMessage: result.message });
      } catch (error) {
        setFeedback({
          text: error instanceof Error ? error.message : "Could not preview remaining access.",
          tone: "warning",
        });
      }
    });
  }

  if (!summary) {
    return (
      <p className="rounded-xs border border-dashed border-divider bg-surfaceMuted/60 p-3 text-[10px] leading-4 text-secondary">
        Collaboration details are unavailable for this project.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4" data-publisher-members-panel="true">
        {feedback ? (
          <p
            className={cn(
              "rounded-xs px-2 py-1 text-[9px] leading-3",
              feedback.tone === "warning"
                ? "border border-warningSoft bg-warningSoft text-warning"
                : "bg-surfaceMuted text-secondary",
            )}
            role={feedback.tone === "warning" ? "alert" : "status"}
          >
            {feedback.text}
          </p>
        ) : null}

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>Project members</SectionLabel>
            {query.isFetching ? (
              <output className="flex items-center gap-1 text-[9px] leading-3 text-tertiary">
                <CircleNotch size={10} className="animate-spin" aria-hidden="true" />
                Refreshing
              </output>
            ) : null}
          </div>
          <DataTable
            data={summary.collaborators}
            columns={collaboratorColumns}
            keyExtractor={(member) => member.id}
            className="rounded-xs border border-hairline bg-white [&_table]:min-w-[420px] [&_thead]:bg-white"
            emptyState={{
              title: "No members",
              description: "Project members appear here after they are invited.",
            }}
          />
        </section>

        {summary.canManageAccess ? (
          <section className="space-y-2" aria-labelledby="project-direct-access-heading">
            <div>
              <SectionLabel id="project-direct-access-heading">Direct project access</SectionLabel>
              <p className="mt-1 text-[9px] leading-3 text-tertiary">
                Only direct project grants can be changed here. Workspace access remains inherited and unchanged.
              </p>
            </div>
            {summary.collaborators.some((member) => member.directProjectRole) ? (
              <ul className="space-y-1">
                {summary.collaborators.filter((member) => member.directProjectRole).map((member) => {
                  const directRole = member.directProjectRole as CollaborationRole;
                  const canMutate = member.id !== summary.currentUserId
                    && canMutateCollaborationTarget(summary.currentUserRole, directRole).allowed;
                  const roleOptions = manageableRoles(summary.currentUserRole);
                  return (
                    <li key={`project-direct:${member.id}`} className="flex min-w-0 items-center gap-2 rounded-xs border border-hairline bg-white px-2 py-1.5">
                      <MemberIdentity member={member} />
                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        {canMutate ? (
                          <DropdownSelect
                            className="h-7 w-24 rounded-xs border border-hairline bg-white px-1 text-secondary"
                            options={roleOptions}
                            value={directRole}
                            aria-label={`Direct project role for ${member.displayName}`}
                            ariaDisabled={isPending}
                            onValueChange={(role) => updateDirectProjectRole(member, role)}
                          />
                        ) : (
                          <RoleBadge role={directRole} />
                        )}
                        {canMutate ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-6 rounded-xs p-0 text-tertiary hover:bg-dangerSoft hover:text-danger"
                            aria-label={`Remove ${member.displayName} from project`}
                            title="Remove direct project access"
                            disabled={isPending}
                              onClick={() => requestRemoveProjectMember(member)}
                          >
                            <Trash size={16} aria-hidden="true" />
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xs border border-dashed border-hairline bg-surfaceMuted/40 px-2 py-2 text-[9px] leading-3 text-tertiary">
                No direct project grants to manage.
              </p>
            )}
          </section>
        ) : null}

        {summary.canManageAccess ? (
          <section className="space-y-2" aria-labelledby="project-known-member-heading">
            <div>
              <SectionLabel id="project-known-member-heading">Add known project member</SectionLabel>
              <p className="mt-1 text-[9px] leading-3 text-tertiary">
                Add an existing workspace profile directly. This is separate from an email invitation.
              </p>
            </div>
            {(summary.eligibleProjectMemberCandidates ?? []).length ? (
              <div className="grid grid-cols-[minmax(0,1fr)_80px_62px] gap-1">
                <DropdownSelect
                  className="h-7 min-w-0 rounded-xs border border-hairline bg-white px-1 text-secondary"
                  options={(summary.eligibleProjectMemberCandidates ?? []).map((candidate) => ({
                    value: candidate.id,
                    label: candidate.email ? `${candidate.displayName} (${candidate.email})` : candidate.displayName,
                  }))}
                  value={projectMemberCandidateId}
                  placeholder="Select workspace member"
                  aria-label="Known project member"
                  ariaDisabled={isPending}
                  onValueChange={setProjectMemberCandidateId}
                />
                <DropdownSelect
                  className="h-7 rounded-xs border border-hairline bg-white px-1 text-secondary"
                  options={manageableRoles(summary.currentUserRole)}
                  value={projectMemberRole}
                  aria-label="Known project member role"
                  ariaDisabled={isPending}
                  onValueChange={(role) => setProjectMemberRole(role as CollaborationRole)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-7 rounded-xs px-1.5 text-[9px]"
                  disabled={isPending || !projectMemberCandidateId}
                  onClick={() => runAccessAction(() => addProjectCollaborator({
                    projectId: summary.projectId,
                    userId: projectMemberCandidateId,
                    role: projectMemberRole,
                  }))}
                >
                  Add
                </Button>
              </div>
            ) : (
              <p className="rounded-xs border border-dashed border-hairline bg-surfaceMuted/40 px-2 py-2 text-[9px] leading-3 text-tertiary">
                No eligible workspace profiles are available for a direct project grant.
              </p>
            )}
          </section>
        ) : null}

        {summary.canManageAccess ? (
          <section className="space-y-2" aria-labelledby="project-team-invite-heading">
            <div>
              <SectionLabel id="project-team-invite-heading">Invite project member</SectionLabel>
              <p className="mt-1 text-[9px] leading-3 text-tertiary">
                Invites create pending access. The recipient must accept before receiving project access.
              </p>
            </div>
            <form
              noValidate
              className="grid grid-cols-[minmax(0,1fr)_80px_62px] gap-1"
              onSubmit={onProjectInviteSubmit}
            >
              <label className="sr-only" htmlFor="project-team-invite-email">Invite project member by email</label>
              <input
                id="project-team-invite-email"
                className="min-h-7 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[10px] leading-3 text-ink outline-none placeholder:text-tertiary focus:bg-accentSoft"
                type="email"
                value={projectInviteEmail}
                placeholder="email"
                disabled={isPending}
                onChange={(event) => setProjectInviteEmail(event.target.value)}
              />
              <DropdownSelect
                className="h-7 rounded-xs border border-hairline bg-white px-1 text-secondary"
                options={ROLE_OPTIONS}
                value={projectInviteRole}
                aria-label="Project invite role"
                ariaDisabled={isPending}
                onValueChange={(role) => setProjectInviteRole(role as CollaborationRole)}
              />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="min-h-7 rounded-xs px-1.5 text-[9px]"
                disabled={isPending || !projectInviteEmail.trim()}
              >
                Invite
              </Button>
            </form>
          </section>
        ) : null}

        {summary.pendingInvitations.length ? (
          <section className="space-y-2" aria-labelledby="project-pending-invitations-heading">
            <div>
              <SectionLabel id="project-pending-invitations-heading">Pending invitations</SectionLabel>
              <p className="mt-1 text-[9px] leading-3 text-tertiary">Pending invitations do not grant access until accepted.</p>
            </div>
            <ul className="space-y-1">
              {summary.pendingInvitations.map((invitation) => {
                const canManageInvitation = invitation.canManage ?? summary.canManageAccess;
                return (
                  <li
                  key={invitation.id}
                  className="flex min-w-0 items-center gap-2 rounded-xs border border-hairline bg-white px-2 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-medium leading-3 text-ink">{invitation.email}</p>
                    <p className="text-[9px] leading-3 text-tertiary">
                      {inviteScopeLabel(invitation)} · {roleLabels[invitation.role]} · {inviteExpiryLabel(invitation.expiresAt)}
                    </p>
                  </div>
                  {canManageInvitation ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-6 rounded-xs p-0 text-tertiary"
                        aria-label={`Copy invite for ${invitation.email}`}
                        title="Copy invite link"
                        disabled={isPending}
                        onClick={() => copyPendingInvite(invitation)}
                      >
                        <Copy size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-6 rounded-xs p-0 text-tertiary"
                        aria-label={`Resend invite for ${invitation.email}`}
                        title="Resend invite"
                        disabled={isPending}
                        onClick={() => resendPendingInvite(invitation)}
                      >
                        <PaperPlaneTilt size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-6 rounded-xs p-0 text-tertiary hover:bg-dangerSoft hover:text-danger"
                        aria-label={`Cancel invite for ${invitation.email}`}
                        title="Cancel invite"
                        disabled={isPending}
                        onClick={() => setPendingInvitationRevocation(invitation)}
                      >
                        <Trash size={16} aria-hidden="true" />
                      </Button>
                    </div>
                  ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="space-y-2">
          <div>
            <SectionLabel>Estimate access</SectionLabel>
            <p className="mt-1 text-[9px] leading-3 text-tertiary">
              Estimates inherit project members until a sheet-specific override or restriction is set.
            </p>
          </div>

          <div className="space-y-2">
            {summary.estimateSheets.length ? (
              summary.estimateSheets.map((sheet) => {
                const sheetMembers = sheet.members;
                const inviteEmail = sheetInviteEmailById[sheet.estimateId] ?? "";
                return (
                  <div
                    key={sheet.estimateId}
                    className="space-y-2 rounded-xs border border-hairline bg-white px-3 py-2"
                    data-publisher-sheet-access-row={sheet.estimateId}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-medium leading-3 text-ink">{sheet.name}</p>
                        <p className="mt-0.5 text-[9px] leading-3 text-tertiary">
                          {sheet.sheetCode} · {accessModeLabel(sheet)}
                        </p>
                      </div>
                      {sheet.canManageAccess ? (
                        <div className="w-24 shrink-0">
                          <DropdownSelect
                            className="h-7 rounded-xs border border-hairline bg-white px-1 text-secondary"
                            options={SHEET_ACCESS_MODE_OPTIONS}
                            value={sheet.accessMode === "restricted" ? "restricted" : "inherited"}
                            aria-label={`Access mode for ${sheet.name}`}
                            ariaDisabled={isPending}
                            onValueChange={(mode) => onAccessModeChange(sheet, mode)}
                          />
                        </div>
                      ) : (
                        <StatusBadge
                          status={sheet.accessMode === "restricted" ? "danger" : "inactive"}
                          className="min-w-0 px-1.5 py-1"
                        >
                          {sheet.accessMode === "restricted" ? "Restricted" : "Inherited"}
                        </StatusBadge>
                      )}
                    </div>

                    {sheet.canManageAccess ? (
                      (sheet.eligibleMemberCandidates ?? []).length ? (
                        <div className="grid grid-cols-[minmax(0,1fr)_80px_62px] gap-1">
                          <DropdownSelect
                            className="h-7 min-w-0 rounded-xs border border-hairline bg-white px-1 text-secondary"
                            options={(sheet.eligibleMemberCandidates ?? []).map((candidate) => ({
                              value: candidate.id,
                              label: candidate.email ? `${candidate.displayName} (${candidate.email})` : candidate.displayName,
                            }))}
                            value={sheetMemberCandidateById[sheet.estimateId] ?? ""}
                            placeholder="Add known member"
                            aria-label={`Known member for ${sheet.name}`}
                            ariaDisabled={isPending}
                            onValueChange={(userId) => setSheetMemberCandidateById((current) => ({ ...current, [sheet.estimateId]: userId }))}
                          />
                          <DropdownSelect
                            className="h-7 rounded-xs border border-hairline bg-white px-1 text-secondary"
                            options={manageableRoles(sheet.currentUserRole ?? summary.currentUserRole)}
                            value={readSheetMemberRole(sheet.estimateId)}
                            aria-label={`Known member role for ${sheet.name}`}
                            ariaDisabled={isPending}
                            onValueChange={(role) => setSheetMemberRoleById((current) => ({ ...current, [sheet.estimateId]: role as CollaborationRole }))}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-7 rounded-xs px-1.5 text-[9px]"
                            disabled={isPending || !(sheetMemberCandidateById[sheet.estimateId] ?? "")}
                            onClick={() => runAccessAction(() => addEstimateSheetCollaborator({
                              projectId,
                              estimateId: sheet.estimateId,
                              userId: sheetMemberCandidateById[sheet.estimateId] ?? "",
                              role: readSheetMemberRole(sheet.estimateId),
                            }))}
                          >
                            Add
                          </Button>
                        </div>
                      ) : null
                    ) : null}

                    {sheet.canManageAccess ? (
                      <form
                        noValidate
                        className="grid grid-cols-[minmax(0,1fr)_80px_62px] gap-1"
                        onSubmit={(event) => onSheetInviteSubmit(sheet, event)}
                      >
                        <label className="sr-only" htmlFor={`publisher-sheet-invite-${sheet.estimateId}`}>
                          Invite to {sheet.name}
                        </label>
                        <input
                          id={`publisher-sheet-invite-${sheet.estimateId}`}
                          className="min-h-7 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[10px] leading-3 text-ink outline-none placeholder:text-tertiary focus:bg-accentSoft"
                          type="email"
                          value={inviteEmail}
                          placeholder="email"
                          aria-label={`Invite to ${sheet.name}`}
                          disabled={isPending}
                          onChange={(event) => setSheetInviteEmail(sheet.estimateId, event.target.value)}
                        />
                        <DropdownSelect
                          className="h-7 rounded-xs border border-hairline bg-white px-1 text-secondary"
                          options={ROLE_OPTIONS}
                          value={readSheetInviteRole(sheet.estimateId)}
                          aria-label={`Estimate role for ${sheet.name}`}
                          ariaDisabled={isPending}
                          onValueChange={(role) => setSheetInviteRole(sheet.estimateId, role as CollaborationRole)}
                        />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="min-h-7 rounded-xs px-1.5 text-[9px]"
                          aria-label={`Invite to ${sheet.name}`}
                          disabled={isPending || !inviteEmail.trim()}
                        >
                          Invite
                        </Button>
                      </form>
                    ) : null}

                    {sheetMembers.length ? (
                      <ul className="space-y-1">
                        {sheetMembers.map((member) => (
                          <li
                            key={`${sheet.estimateId}:${member.id}`}
                            className="flex items-center gap-2 rounded-xs border border-hairline px-2 py-1.5"
                          >
                            <MemberIdentity member={member} />
                            <div className="ml-auto flex shrink-0 items-center gap-1">
                              {sheet.canManageAccess && member.id !== summary.currentUserId
                                && canMutateCollaborationTarget(sheet.currentUserRole ?? summary.currentUserRole, member.role).allowed ? (
                                <DropdownSelect
                                  className="h-7 w-24 rounded-xs border border-hairline bg-white px-1 text-secondary"
                                  options={manageableRoles(sheet.currentUserRole ?? summary.currentUserRole)}
                                  value={member.role}
                                  aria-label={`Direct estimate role for ${member.displayName} on ${sheet.name}`}
                                  ariaDisabled={isPending}
                                  onValueChange={(role) => updateDirectEstimateRole(sheet, member, role)}
                                />
                              ) : <RoleBadge role={member.role} />}
                              {sheet.canManageAccess && member.id !== summary.currentUserId ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-6 rounded-xs p-0 text-tertiary hover:bg-dangerSoft hover:text-danger"
                                  aria-label={`Remove ${member.displayName} from ${sheet.name}`}
                                  disabled={isPending}
                                  onClick={() => requestRemoveSheetMember(sheet, member)}
                                >
                                  <Trash size={16} aria-hidden="true" />
                                </Button>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-xs border border-dashed border-hairline bg-surfaceMuted/40 px-2 py-2 text-[9px] leading-3 text-tertiary">
                        No sheet-specific members.
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="rounded-xs border border-dashed border-hairline bg-surfaceMuted/40 px-2 py-3 text-[9px] leading-3 text-tertiary">
                No estimates yet.
              </p>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={restrictTarget !== null}
        onOpenChange={(next) => {
          if (!next) setRestrictTarget(null);
        }}
        title={restrictTarget ? `Restrict ${restrictTarget.name}?` : "Restrict estimate?"}
        description="Project members will stop inheriting access to this estimate. Add sheet members before restricting if others still need access."
        confirmLabel="Restrict"
        tone="warning"
        busy={isPending}
        onConfirm={confirmRestrictEstimate}
      />

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(next) => {
          if (!next) setPendingRemoval(null);
        }}
        title={
          pendingRemoval
            ? `Remove ${pendingRemoval.member.displayName} from ${pendingRemoval.sheet.name}?`
            : "Remove sheet member?"
        }
        description={pendingRemoval?.previewMessage ?? "Remaining access is being checked."}
        confirmLabel="Remove"
        tone="danger"
        busy={isPending && pendingRemoval === null}
        onConfirm={confirmRemoveSheetMember}
      />

      <ConfirmDialog
        open={pendingInvitationRevocation !== null}
        onOpenChange={(next) => {
          if (!next) setPendingInvitationRevocation(null);
        }}
        title={pendingInvitationRevocation ? `Cancel invite for ${pendingInvitationRevocation.email}?` : "Cancel invitation?"}
        description="The recipient will no longer be able to accept this invitation. You can create a new invitation later."
        confirmLabel="Cancel invite"
        tone="danger"
        busy={isPending}
        onConfirm={confirmPendingInviteRevocation}
      />

      <ConfirmDialog
        open={pendingProjectRemoval !== null}
        onOpenChange={(next) => {
          if (!next) setPendingProjectRemoval(null);
        }}
        title={pendingProjectRemoval ? `Remove ${pendingProjectRemoval.member.displayName} from this project?` : "Remove project access?"}
        description={pendingProjectRemoval?.affectedEstimateNames.length
          ? `${pendingProjectRemoval.affectedEstimateNames.length} direct estimate grant${pendingProjectRemoval.affectedEstimateNames.length === 1 ? "" : "s"} will be affected by the selected removal scope.`
          : "This member has no direct estimate grants in this project."}
        confirmLabel="Remove access"
        tone="danger"
        busy={isPending && pendingProjectRemoval === null}
        onConfirm={confirmRemoveProjectMember}
      >
        {pendingProjectRemoval ? (
          <div className="space-y-2">
            <RadioGroup
              aria-label="Project removal scope"
              name="project-removal-scope"
              value={pendingProjectRemoval.removalMode}
              disabled={isPending}
              onChange={(removalMode) => setPendingProjectRemoval((current) => current ? {
                ...current,
                removalMode: removalMode as ProjectCollaboratorRemovalMode,
              } : null)}
              options={[
                { value: "retain_sheet_grants", label: "Remove project access only and retain direct estimate access" },
                {
                  value: "remove_all_direct_grants",
                  label: `Remove project access and ${pendingProjectRemoval.affectedEstimateNames.length} direct estimate grant${pendingProjectRemoval.affectedEstimateNames.length === 1 ? "" : "s"}`,
                },
              ]}
            />
            {pendingProjectRemoval.removalMode === "remove_all_direct_grants" && pendingProjectRemoval.affectedEstimateNames.length ? (
              <ul className="list-disc space-y-0.5 pl-4 text-[9px] leading-3 text-secondary">
                {pendingProjectRemoval.affectedEstimateNames.map((name) => <li key={name}>{name}</li>)}
              </ul>
            ) : null}
          </div>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
