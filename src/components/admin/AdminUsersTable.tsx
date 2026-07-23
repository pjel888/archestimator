"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Check, Pause, Prohibit } from "@phosphor-icons/react/dist/ssr";
import type { ColumnDef } from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminDeleteUserButton } from "@/components/admin/AdminDeleteUserButton";
import { AdminOverviewStrip } from "@/components/admin/AdminPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { formatAdminDate } from "@/lib/admin/datetime";
import { banUser, reactivateUser, suspendUser } from "@/lib/admin/user-actions";
import type { AdminUserRow } from "@/lib/admin/users-repository";
import { cn } from "@/lib/ui/cn";

type DirectoryFilter = "all" | "active" | "restricted" | "invite_only";
type UserAction = "suspend" | "ban" | "reactivate";

const directoryFilters: Array<{ id: DirectoryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "restricted", label: "Restricted" },
  { id: "invite_only", label: "Invite-only" },
];

function statusTone(status: AdminUserRow["account_status"]) {
  if (status === "active") return "success" as const;
  if (status === "suspended" || status === "invited") return "warning" as const;
  return "danger" as const;
}

function matchesDirectoryFilter(user: AdminUserRow, filter: DirectoryFilter) {
  if (filter === "all") return true;
  if (filter === "active") return user.account_status === "active";
  if (filter === "invite_only") return !user.is_manageable;
  return user.account_status === "suspended" || user.account_status === "banned" || user.account_status === "revoked";
}

function UserActions({
  user,
  isPending,
  mobile = false,
  onAction,
}: {
  user: AdminUserRow;
  isPending: boolean;
  mobile?: boolean;
  onAction: (action: UserAction, userId: string, email: string) => void;
}) {
  if (!user.is_manageable) {
    return (
      <div className={cn("flex items-center gap-1", mobile && "grid grid-cols-2")}>
        {user.is_registered ? (
          <Link
            href={`/admin/users/${user.id}`}
            className="inline-flex min-h-7 cursor-pointer items-center justify-center rounded-xs border border-hairline px-2 text-[10px] font-medium text-ink hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            View history
          </Link>
        ) : null}
        <Link
          href="/admin/allowlist"
          className="inline-flex min-h-7 cursor-pointer items-center justify-center rounded-xs border border-hairline px-2 text-[10px] font-medium text-secondary hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Manage access
        </Link>
      </div>
    );
  }

  if (user.role === "ceo" || user.role === "admin") {
    return (
      <div className={cn("flex items-center gap-2", mobile && "justify-between")}>
        <span className="text-[9px] leading-3 text-tertiary">Protected administrator</span>
        <Link
          href={`/admin/users/${user.id}`}
          className="inline-flex min-h-7 cursor-pointer items-center justify-center rounded-xs border border-hairline px-2 text-[10px] font-medium text-ink hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          View details
        </Link>
      </div>
    );
  }

  if (mobile) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {user.account_status === "active" ? (
          <>
            <Button size="xs" variant="secondary" disabled={isPending} onClick={() => onAction("suspend", user.id, user.email)}>
              <Pause aria-hidden size={16} /> Suspend
            </Button>
            <Button size="xs" variant="danger" disabled={isPending} onClick={() => onAction("ban", user.id, user.email)}>
              <Prohibit aria-hidden size={16} /> Ban
            </Button>
          </>
        ) : (
          <Button size="xs" variant="secondary" disabled={isPending} className="col-span-2" onClick={() => onAction("reactivate", user.id, user.email)}>
            <Check aria-hidden size={16} /> Reactivate
          </Button>
        )}
        <Link
          href={`/admin/users/${user.id}`}
          className="inline-flex min-h-7 cursor-pointer items-center justify-center rounded-xs border border-hairline px-2 text-[10px] font-medium text-ink hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          View details
        </Link>
        <AdminDeleteUserButton userId={user.id} email={user.email} compact={false} />
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
      {user.account_status === "active" ? (
        <>
          <Button
            size="icon-xs"
            variant="secondary"
            disabled={isPending}
            onClick={() => onAction("suspend", user.id, user.email)}
            aria-label={`Suspend ${user.email}`}
            title="Suspend temporarily"
          >
            <Pause aria-hidden size={16} />
          </Button>
          <Button
            size="icon-xs"
            variant="danger"
            disabled={isPending}
            onClick={() => onAction("ban", user.id, user.email)}
            aria-label={`Ban ${user.email}`}
            title="Ban permanently"
          >
            <Prohibit aria-hidden size={16} />
          </Button>
        </>
      ) : (
        <Button
          size="icon-xs"
          variant="secondary"
          disabled={isPending}
          onClick={() => onAction("reactivate", user.id, user.email)}
          aria-label={`Reactivate ${user.email}`}
          title="Reactivate"
        >
          <Check aria-hidden size={16} />
        </Button>
      )}
      <AdminDeleteUserButton userId={user.id} email={user.email} />
    </div>
  );
}

function UserMobileCard({
  user,
  isPending,
  onAction,
}: {
  user: AdminUserRow;
  isPending: boolean;
  onAction: (action: UserAction, userId: string, email: string) => void;
}) {
  return (
    <article className="border-b border-hairline p-3 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium leading-4 text-ink">{user.display_name ?? user.email}</p>
          <p className="break-all text-[9px] leading-3 text-tertiary">{user.email}</p>
        </div>
        <Badge tone={statusTone(user.account_status)} size="xs" className="min-w-0 px-1">
          {user.account_status}
        </Badge>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 rounded-xs bg-surfaceMuted/70 p-2">
        <div>
          <dt className="text-[8px] font-medium uppercase leading-3 text-tertiary">Role</dt>
          <dd className="text-[10px] leading-4 text-ink">{user.role}</dd>
        </div>
        <div>
          <dt className="text-[8px] font-medium uppercase leading-3 text-tertiary">Registration</dt>
          <dd className="text-[10px] leading-4 text-ink">{user.is_registered ? "Registered" : "Invite-only"}</dd>
        </div>
        <div>
          <dt className="text-[8px] font-medium uppercase leading-3 text-tertiary">Sessions</dt>
          <dd className="text-[10px] leading-4 text-ink">{user.total_session_count} total · {user.active_session_count} active</dd>
        </div>
        <div>
          <dt className="text-[8px] font-medium uppercase leading-3 text-tertiary">Joined</dt>
          <dd className="text-[10px] leading-4 text-ink">{formatAdminDate(user.created_at)}</dd>
        </div>
      </dl>

      <div className="mt-2">
        <UserActions user={user} isPending={isPending} mobile onAction={onAction} />
      </div>
    </article>
  );
}

export function AdminUsersTable({
  initialUsers,
  totalCount,
  initialSearch = "",
}: {
  initialUsers: AdminUserRow[];
  totalCount: number;
  initialSearch?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [filter, setFilter] = useState<DirectoryFilter>("all");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return initialUsers.filter((user) => {
      if (!matchesDirectoryFilter(user, filter)) return false;
      if (!query) return true;
      return user.email.toLowerCase().includes(query) || (user.display_name ?? "").toLowerCase().includes(query);
    });
  }, [filter, initialUsers, search]);

  const counts = useMemo(() => ({
    registered: initialUsers.filter((user) => user.is_registered).length,
    beta: initialUsers.filter((user) => user.is_beta_user).length,
    restricted: initialUsers.filter((user) => matchesDirectoryFilter(user, "restricted")).length,
    sessions: initialUsers.reduce((total, user) => total + user.active_session_count, 0),
  }), [initialUsers]);

  const handleAction = useCallback((action: UserAction, userId: string, email: string) => {
    setNotice(null);
    startTransition(async () => {
      const fn = action === "suspend" ? suspendUser : action === "ban" ? banUser : reactivateUser;
      const result = await fn(userId);
      if (!result.ok) {
        const messages: Record<string, string> = {
          self_target: "You cannot modify your own account.",
          protected_target: "Platform administrator accounts are protected from this action.",
          validation: "Invalid user ID.",
          d1_unavailable: "Database is unavailable.",
          not_found: "User not found.",
          failed: "Action failed.",
        };
        setNotice({ tone: "error", text: messages[result.error] ?? "Action failed." });
        return;
      }
      const verbs: Record<UserAction, string> = {
        suspend: "suspended",
        ban: "banned",
        reactivate: "reactivated",
      };
      setNotice({ tone: "success", text: `${email} was ${verbs[action]}.` });
      router.refresh();
    });
  }, [router]);

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
              <p className="truncate text-[10px] font-medium leading-4 text-ink">{user.display_name ?? user.email}</p>
              <p className="truncate text-[9px] leading-3 text-tertiary">{user.email}</p>
            </>
          );
          return user.is_manageable || user.is_registered ? (
            <Link href={`/admin/users/${user.id}`} className="block max-w-64 hover:underline">
              {content}
            </Link>
          ) : <div className="max-w-64">{content}</div>;
        },
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <Badge tone={row.original.role === "ceo" || row.original.role === "admin" ? "success" : "neutral"} size="xs" className="min-w-0 px-1">
            {row.original.role}
          </Badge>
        ),
      },
      {
        accessorKey: "account_status",
        header: "Access",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <Badge tone={statusTone(row.original.account_status)} size="xs" className="min-w-0 px-1">
              {row.original.account_status}
            </Badge>
            <p className="text-[8px] leading-3 text-tertiary">{row.original.is_registered ? "Registered" : "Invite-only"}</p>
          </div>
        ),
      },
      {
        id: "sessions",
        accessorKey: "active_session_count",
        header: "Activity",
        cell: ({ row }) => (
          <span className="text-[9px] leading-3 text-tertiary">
            {row.original.total_session_count} total · {row.original.active_session_count} active
            {row.original.last_session_at ? <><br />Last {formatAdminDate(row.original.last_session_at)}</> : null}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Joined",
        cell: ({ row }) => <span className="text-[9px] leading-3 text-tertiary">{formatAdminDate(row.original.created_at)}</span>,
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => <UserActions user={row.original} isPending={isPending} onAction={handleAction} />,
      },
    ],
    [handleAction, isPending],
  );

  const shownDetail = initialUsers.length < totalCount ? `first ${initialUsers.length} loaded` : "complete directory";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-hairline p-2">
        <AdminOverviewStrip
          items={[
            { label: "Directory records", value: totalCount, detail: shownDetail },
            { label: "Registered accounts", value: counts.registered },
            { label: "Beta access", value: counts.beta },
            { label: "Active sessions", value: counts.sessions },
          ]}
        />

        <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch("")}
            placeholder="Search loaded users by email or name…"
            aria-label="Filter loaded users"
            className="h-full"
            wrapperClassName="w-full border border-hairline bg-white lg:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-1" aria-label="Filter users by access state">
            {directoryFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={cn(
                  "min-h-7 cursor-pointer rounded-xs border px-2 text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  filter === item.id ? "border-ink bg-ink text-white" : "border-hairline bg-white text-secondary hover:bg-surfaceMuted hover:text-ink",
                )}
              >
                {item.label}
              </button>
            ))}
            <span className="ml-1 text-[9px] leading-3 text-tertiary">{visibleUsers.length} shown</span>
          </div>
        </div>

        {notice ? (
          <p
            role={notice.tone === "error" ? "alert" : "status"}
            aria-live="polite"
            className={cn(
              "mt-2 rounded-xs border px-2 py-1.5 text-[10px] leading-4",
              notice.tone === "error" ? "border-dangerSoft bg-dangerSoft/40 text-danger" : "border-success/20 bg-success/10 text-ink",
            )}
          >
            {notice.text}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto md:hidden [content-visibility:auto]">
        {visibleUsers.length > 0 ? visibleUsers.map((user) => (
          <UserMobileCard key={user.id} user={user} isPending={isPending} onAction={handleAction} />
        )) : (
          <p className="p-4 text-center text-[10px] leading-4 text-tertiary">No users match these filters.</p>
        )}
      </div>

      <div className="hidden min-h-0 flex-1 p-2 md:flex">
        <AdminDataTable
          data={visibleUsers}
          columns={columns}
          getRowId={(row) => row.id}
          emptyMessage="No users match these filters."
          persistenceKey="admin-users"
        />
      </div>
    </div>
  );
}
