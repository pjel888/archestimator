"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { CircleNotch, Trash } from "@phosphor-icons/react/dist/ssr";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/status-badge";
import {
  invalidateProjectCollaboration,
  useProjectCollaborationQuery,
  useQueryClient,
} from "@/hooks/use-project-collaboration-query";
import {
  inviteEstimateSheetCollaborator,
  removeEstimateSheetCollaborator,
  setEstimateSheetAccessMode,
} from "@/lib/collaboration/actions";
import type {
  CollaborationRole,
  EstimateSheetAccessSummary,
  EstimateSheetMemberSummary,
  ProjectCollaborationSummary,
  ProjectCollaboratorSummary,
} from "@/lib/collaboration/types";
import { cn } from "@/lib/ui/cn";

type PublisherProjectMembersPanelProps = {
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

export function PublisherProjectMembersPanel({
  initialSummary,
  projectId,
}: PublisherProjectMembersPanelProps) {
  const query = useProjectCollaborationQuery(initialSummary);
  const queryClient = useQueryClient();
  const summary = query.data ?? initialSummary;
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<PanelFeedback | null>(null);
  const [sheetInviteEmailById, setSheetInviteEmailById] = useState<Record<string, string>>({});
  const [sheetInviteRoleById, setSheetInviteRoleById] = useState<Record<string, CollaborationRole>>({});
  const [restrictTarget, setRestrictTarget] = useState<EstimateSheetAccessSummary | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

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
                              <RoleBadge role={member.role} />
                              {sheet.canManageAccess && member.id !== summary.currentUserId ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-6 rounded-xs p-0 text-tertiary hover:bg-dangerSoft hover:text-danger"
                                  aria-label={`Remove ${member.displayName} from ${sheet.name}`}
                                  disabled={isPending}
                                  onClick={() => setPendingRemoval({ member, sheet })}
                                >
                                  <Trash size={12} aria-hidden="true" />
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
        description="They will lose sheet-specific access. Project or workspace access may still grant access when the estimate inherits project members."
        confirmLabel="Remove"
        tone="danger"
        busy={isPending}
        onConfirm={confirmRemoveSheetMember}
      />
    </>
  );
}
