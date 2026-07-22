"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { UserMinus } from "@phosphor-icons/react/dist/ssr";
import type { ColumnDef } from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin/AdminDataTable";
import {
  assignUserToCorporateAccountAction,
  removeUserFromCorporateAccountAction,
  updateMemberRoleAction,
} from "@/lib/admin/corporate-account-actions";
import type { CorporateAccountMemberRow } from "@/lib/admin/corporate-account-repository";
import { Button } from "@/components/ui/button";

const ROLES = ["owner", "team_leader", "member", "viewer"];

export function AdminAccountMembers({
  accountId,
  members,
  assignableUsers,
}: {
  accountId: string;
  members: CorporateAccountMemberRow[];
  assignableUsers: { id: string; email: string; display_name: string | null; account_status: string }[];
}) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const memberIds = new Set(members.map((m) => m.user_id));
  const availableUsers = assignableUsers.filter((u) => !memberIds.has(u.id));

  function handleAssign(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await assignUserToCorporateAccountAction({
        accountId,
        userId: selectedUserId,
        role: selectedRole,
      });
      setNotice(result.ok ? "Member added." : result.error);
      if (result.ok) {
        setSelectedUserId("");
        router.refresh();
      }
    });
  }

  function handleRoleChange(userId: string, role: string) {
    setNotice(null);
    startTransition(async () => {
      const result = await updateMemberRoleAction({ accountId, userId, role });
      setNotice(result.ok ? "Role updated." : result.error);
      if (result.ok) router.refresh();
    });
  }

  function handleRemove(userId: string) {
    setNotice(null);
    startTransition(async () => {
      const result = await removeUserFromCorporateAccountAction({ accountId, userId });
      setNotice(result.ok ? "Member removed." : result.error);
      if (result.ok) router.refresh();
    });
  }

  const columns: ColumnDef<CorporateAccountMemberRow, unknown>[] = [
    {
      id: "user",
      accessorFn: (row) => `${row.display_name ?? ""} ${row.email}`,
      header: "User",
      cell: ({ row }) => {
        const member = row.original;
        return (
          <>
            <p className="text-[10px] font-medium leading-4 text-ink">{member.display_name ?? member.email}</p>
            <p className="text-[9px] leading-3 text-tertiary">{member.email}</p>
          </>
        );
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const member = row.original;
        return (
          <select
            value={member.role}
            onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
            disabled={isPending}
            aria-label={`Role for ${member.email}`}
            className="rounded-xs border border-hairline px-1 py-0.5 text-[10px] text-ink"
            onClick={(event) => event.stopPropagation()}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      accessorKey: "job_title",
      header: "Job title",
      cell: ({ row }) => (
        <span className="text-[9px] leading-3 text-tertiary">{row.original.job_title ?? "—"}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => {
        const member = row.original;
        return (
          <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
            <Button
              size="icon-xs"
              variant="danger"
              disabled={isPending}
              onClick={() => handleRemove(member.user_id)}
              aria-label={`Remove ${member.email}`}
              title="Remove"
            >
              <UserMinus aria-hidden size={13} />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleAssign} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">User</span>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="min-h-9 rounded-xs border border-hairline px-2 py-1 text-[11px] text-ink"
          >
            <option value="">Select a user…</option>
            {availableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.display_name ?? user.email} ({user.email})
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-full flex-col gap-1 sm:w-32">
          <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">Role</span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="min-h-9 rounded-xs border border-hairline px-2 py-1 text-[11px] text-ink"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={isPending || !selectedUserId} className="min-h-9 w-full sm:w-auto">
          Add member
        </Button>
      </form>

      {notice ? <span className="text-[9px] leading-3 text-tertiary">{notice}</span> : null}

      <div className="overflow-hidden rounded-xs border border-hairline md:hidden [content-visibility:auto]">
        {members.length > 0 ? (
          members.map((member) => (
            <article key={member.user_id} className="border-b border-hairline p-3 last:border-b-0">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium leading-4 text-ink">
                  {member.display_name ?? member.email}
                </p>
                <p className="break-all text-[9px] leading-3 text-tertiary">{member.email}</p>
              </div>
              <div className="mt-2 grid gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[8px] font-medium uppercase leading-3 text-tertiary">Role</span>
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                    disabled={isPending}
                    aria-label={`Role for ${member.email}`}
                    className="min-h-9 rounded-xs border border-hairline px-2 py-1 text-[10px] text-ink"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-[9px] leading-3 text-tertiary">
                    {member.job_title ?? "No job title"}
                  </p>
                  <Button
                    size="xs"
                    variant="danger"
                    disabled={isPending}
                    onClick={() => handleRemove(member.user_id)}
                    aria-label={`Remove ${member.email}`}
                    className="min-h-8 shrink-0"
                  >
                    <UserMinus aria-hidden size={13} />
                    Remove
                  </Button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <p className="p-4 text-center text-[10px] leading-4 text-tertiary">No members yet.</p>
        )}
      </div>

      <div className="hidden md:block">
        <AdminDataTable
          data={members}
          columns={columns}
          getRowId={(row) => row.user_id}
          emptyMessage="No members yet."
        />
      </div>
    </div>
  );
}
