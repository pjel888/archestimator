"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { banUser, reactivateUser, suspendUser } from "@/lib/admin/user-actions";
import type { AdminUserRow } from "@/lib/admin/users-repository";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AdminUsersTable({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = search.trim()
    ? initialUsers.filter((user) =>
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        (user.display_name?.toLowerCase().includes(search.toLowerCase()) ?? false))
    : initialUsers;

  function handleAction(action: "suspend" | "ban" | "reactivate", userId: string) {
    setNotice(null);
    startTransition(async () => {
      const fn = action === "suspend" ? suspendUser : action === "ban" ? banUser : reactivateUser;
      const result = await fn(userId);
      if (!result.ok) {
        const messages: Record<string, string> = {
          self_target: "You cannot modify your own account.",
          validation: "Invalid user ID.",
          d1_unavailable: "Database is unavailable.",
          not_found: "User not found.",
          failed: "Action failed.",
        };
        setNotice(messages[result.error] ?? "Action failed.");
      } else {
        setNotice(`User ${action}ed. The list will refresh.`);
      }
    });
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name…"
          aria-label="Filter users"
          className="w-full max-w-xs rounded-xs border border-hairline px-2 py-1 text-[11px] text-ink"
        />
        {notice && <span className="text-[9px] leading-3 text-tertiary">{notice}</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-hairline">
              <th scope="col" className="px-2 py-1 text-left text-[9px] font-medium uppercase leading-3 text-tertiary">User</th>
              <th scope="col" className="px-2 py-1 text-left text-[9px] font-medium uppercase leading-3 text-tertiary">Role</th>
              <th scope="col" className="px-2 py-1 text-left text-[9px] font-medium uppercase leading-3 text-tertiary">Status</th>
              <th scope="col" className="px-2 py-1 text-left text-[9px] font-medium uppercase leading-3 text-tertiary">Sessions</th>
              <th scope="col" className="px-2 py-1 text-left text-[9px] font-medium uppercase leading-3 text-tertiary">Joined</th>
              <th scope="col" className="px-2 py-1 text-right text-[9px] font-medium uppercase leading-3 text-tertiary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center text-[10px] text-tertiary">
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="border-b border-hairline">
                  <td className="px-2 py-1">
                    <Link href={`/admin/users/${user.id}`} className="block hover:underline">
                      <p className="text-[10px] font-medium leading-4 text-ink">{user.display_name ?? user.email}</p>
                      <p className="text-[9px] leading-3 text-tertiary">{user.email}</p>
                    </Link>
                  </td>
                  <td className="px-2 py-1">
                    <Badge tone={user.role === "ceo" || user.role === "admin" ? "success" : "neutral"} size="xs" className="min-w-0 px-1">
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-2 py-1">
                    <Badge
                      tone={user.account_status === "active" ? "success" : user.account_status === "suspended" ? "warning" : "danger"}
                      size="xs"
                      className="min-w-0 px-1"
                    >
                      {user.account_status}
                    </Badge>
                  </td>
                  <td className="px-2 py-1 text-[9px] leading-3 text-tertiary">
                    {user.active_session_count} active
                    {user.last_session_at && (
                      <>
                        <br />
                        {`Last: ${new Date(user.last_session_at).toLocaleDateString()}`}
                      </>
                    )}
                  </td>
                  <td className="px-2 py-1 text-[9px] leading-3 text-tertiary">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex justify-end gap-1">
                      {user.account_status === "active" ? (
                        <>
                          <Button
                            size="icon-xs"
                            variant="secondary"
                            disabled={isPending}
                            onClick={() => handleAction("suspend", user.id)}
                            aria-label={`Suspend ${user.email}`}
                            title="Suspend (temporary)"
                          >
                            ⏸
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="danger"
                            disabled={isPending}
                            onClick={() => handleAction("ban", user.id)}
                            aria-label={`Ban ${user.email}`}
                            title="Ban (permanent)"
                          >
                            ⊘
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="icon-xs"
                          variant="secondary"
                          disabled={isPending}
                          onClick={() => handleAction("reactivate", user.id)}
                          aria-label={`Reactivate ${user.email}`}
                          title="Reactivate"
                        >
                          ✓
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
