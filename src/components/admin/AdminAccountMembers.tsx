"use client";

import { useState, useTransition } from "react";

import {
  assignUserToCorporateAccountAction,
  removeUserFromCorporateAccountAction,
  updateMemberRoleAction,
} from "@/lib/admin/corporate-account-actions";
import type { CorporateAccountMemberRow } from "@/lib/admin/corporate-account-repository";
import { Badge } from "@/components/ui/badge";
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
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Users not already in this account.
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
      if (result.ok) setSelectedUserId("");
    });
  }

  function handleRoleChange(userId: string, role: string) {
    setNotice(null);
    startTransition(async () => {
      const result = await updateMemberRoleAction({ accountId, userId, role });
      setNotice(result.ok ? "Role updated." : result.error);
    });
  }

  function handleRemove(userId: string) {
    setNotice(null);
    startTransition(async () => {
      const result = await removeUserFromCorporateAccountAction({ accountId, userId });
      setNotice(result.ok ? "Member removed." : result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Assign new member */}
      <form onSubmit={handleAssign} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">User</span>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="rounded-xs border border-hairline px-2 py-1 text-[11px] text-ink"
          >
            <option value="">Select a user…</option>
            {availableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.display_name ?? user.email} ({user.email})
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-32 flex-col gap-1">
          <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">Role</span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="rounded-xs border border-hairline px-2 py-1 text-[11px] text-ink"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={isPending || !selectedUserId}>
          Add member
        </Button>
      </form>

      {notice && <span className="text-[9px] leading-3 text-tertiary">{notice}</span>}

      {/* Members table */}
      {members.length === 0 ? (
        <p className="py-2 text-center text-[10px] text-tertiary">No members yet.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className="px-2 py-1 text-left text-[9px] font-medium uppercase leading-3 text-tertiary">User</th>
              <th scope="col" className="px-2 py-1 text-left text-[9px] font-medium uppercase leading-3 text-tertiary">Role</th>
              <th scope="col" className="px-2 py-1 text-left text-[9px] font-medium uppercase leading-3 text-tertiary">Job title</th>
              <th scope="col" className="px-2 py-1 text-right text-[9px] font-medium uppercase leading-3 text-tertiary"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.user_id} className="border-b border-hairline">
                <td className="px-2 py-1">
                  <p className="text-[10px] font-medium leading-4 text-ink">
                    {member.display_name ?? member.email}
                  </p>
                  <p className="text-[9px] leading-3 text-tertiary">{member.email}</p>
                </td>
                <td className="px-2 py-1">
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                    disabled={isPending}
                    aria-label={`Role for ${member.email}`}
                    className="rounded-xs border border-hairline px-1 py-0.5 text-[10px] text-ink"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1 text-[9px] leading-3 text-tertiary">
                  {member.job_title ?? "—"}
                </td>
                <td className="px-2 py-1 text-right">
                  <Button
                    size="icon-xs"
                    variant="danger"
                    disabled={isPending}
                    onClick={() => handleRemove(member.user_id)}
                    aria-label={`Remove ${member.email}`}
                    title="Remove"
                  >
                    ⊘
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
