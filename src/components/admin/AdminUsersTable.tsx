"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Check, Pause, Prohibit } from "@phosphor-icons/react/dist/ssr";
import type { ColumnDef } from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminDeleteUserButton } from "@/components/admin/AdminDeleteUserButton";
import { banUser, reactivateUser, suspendUser } from "@/lib/admin/user-actions";
import type { AdminUserRow } from "@/lib/admin/users-repository";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";

export function AdminUsersTable({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const columns = useMemo<ColumnDef<AdminUserRow, unknown>[]>(
    () => [
      {
        id: "user",
        accessorFn: (row) => `${row.display_name ?? ""} ${row.email}`,
        header: "User",
        cell: ({ row }) => {
          const user = row.original;
          const content = (
            <>
              <p className="text-[10px] font-medium leading-4 text-ink">{user.display_name ?? user.email}</p>
              <p className="text-[9px] leading-3 text-tertiary">{user.email}</p>
            </>
          );
          return (
            user.is_manageable ? (
              <Link href={`/admin/users/${user.id}`} className="block hover:underline">
                {content}
              </Link>
            ) : <div>{content}</div>
          );
        },
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
          const role = row.original.role;
          return (
            <Badge tone={role === "ceo" || role === "admin" ? "success" : "neutral"} size="xs" className="min-w-0 px-1">
              {role}
            </Badge>
          );
        },
      },
      {
        accessorKey: "account_status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.account_status;
          return (
            <Badge
              tone={status === "active" ? "success" : status === "suspended" || status === "invited" ? "warning" : "danger"}
              size="xs"
              className="min-w-0 px-1"
            >
              {status}
            </Badge>
          );
        },
      },
      {
        id: "sessions",
        accessorKey: "active_session_count",
        header: "Sessions",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <span className="text-[9px] leading-3 text-tertiary">
              {user.active_session_count} active
              {user.last_session_at ? (
                <>
                  <br />
                  {`Last: ${new Date(user.last_session_at).toLocaleDateString()}`}
                </>
              ) : null}
            </span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Joined",
        cell: ({ row }) => (
          <span className="text-[9px] leading-3 text-tertiary">
            {new Date(row.original.created_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => {
          const user = row.original;
          if (!user.is_manageable) {
            return <span className="text-[9px] text-tertiary">Invite-only</span>;
          }
          return (
            <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
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
                    <Pause aria-hidden size={13} />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="danger"
                    disabled={isPending}
                    onClick={() => handleAction("ban", user.id)}
                    aria-label={`Ban ${user.email}`}
                    title="Ban (permanent)"
                  >
                    <Prohibit aria-hidden size={13} />
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
                  <Check aria-hidden size={13} />
                </Button>
              )}
              <AdminDeleteUserButton userId={user.id} email={user.email} />
            </div>
          );
        },
      },
    ],
    [isPending],
  );

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch("")}
          placeholder="Search by email or name…"
          aria-label="Filter users"
          wrapperClassName="w-full border border-hairline bg-white sm:max-w-xs"
        />
        {notice ? <span className="text-[9px] leading-3 text-tertiary sm:text-right">{notice}</span> : null}
      </div>
      <AdminDataTable
        data={initialUsers}
        columns={columns}
        getRowId={(row) => row.id}
        globalFilter={search}
        emptyMessage="No users found."
      />
    </div>
  );
}
