"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LinkBreak } from "@phosphor-icons/react/dist/ssr";
import type { ColumnDef } from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin/AdminDataTable";
import {
  linkWorkspaceAction,
  unlinkWorkspaceAction,
} from "@/lib/admin/corporate-account-actions";
import { formatAdminDate } from "@/lib/admin/datetime";
import type {
  WorkspaceLinkCandidateRow,
  WorkspaceSummaryRow,
} from "@/lib/admin/corporate-account-repository";
import { Button } from "@/components/ui/button";

export function AdminAccountWorkspaces({
  accountId,
  workspaces,
  linkableWorkspaces,
}: {
  accountId: string;
  workspaces: WorkspaceSummaryRow[];
  linkableWorkspaces: WorkspaceLinkCandidateRow[];
}) {
  const router = useRouter();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const linkedIds = new Set(workspaces.map((w) => w.id));
  const available = linkableWorkspaces.filter((w) => !linkedIds.has(w.id));

  function handleLink(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await linkWorkspaceAction({ workspaceId: selectedWorkspaceId, accountId });
      setNotice(result.ok ? "Workspace linked." : result.error);
      if (result.ok) {
        setSelectedWorkspaceId("");
        router.refresh();
      }
    });
  }

  function handleUnlink(workspaceId: string) {
    setNotice(null);
    startTransition(async () => {
      const result = await unlinkWorkspaceAction({ workspaceId });
      setNotice(result.ok ? "Workspace unlinked." : result.error);
      if (result.ok) router.refresh();
    });
  }

  const columns: ColumnDef<WorkspaceSummaryRow, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="text-[10px] font-medium leading-4 text-ink">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "slug",
      header: "Slug",
      cell: ({ row }) => (
        <span className="text-[9px] leading-3 text-tertiary">{row.original.slug ?? "—"}</span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-[9px] leading-3 text-tertiary">
          {formatAdminDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => {
        const ws = row.original;
        return (
          <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
            <Button
              size="icon-xs"
              variant="secondary"
              disabled={isPending}
              onClick={() => handleUnlink(ws.id)}
              aria-label={`Unlink ${ws.name}`}
              title="Unlink"
            >
              <LinkBreak aria-hidden size={16} />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {available.length > 0 ? (
        <form onSubmit={handleLink} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">Workspace</span>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              className="min-h-9 rounded-xs border border-hairline px-2 py-1 text-[11px] text-ink"
            >
              <option value="">Select a workspace…</option>
              {available.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} -{" "}
                  {ws.corporate_account_id
                    ? `Move from ${ws.corporate_account_name ?? "another account"}`
                    : "No corporate account"}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={isPending || !selectedWorkspaceId} className="min-h-9 w-full sm:w-auto">
            Link workspace
          </Button>
        </form>
      ) : null}

      {notice ? <span className="text-[9px] leading-3 text-tertiary">{notice}</span> : null}

      <div className="overflow-hidden rounded-xs border border-hairline md:hidden [content-visibility:auto]">
        {workspaces.length > 0 ? (
          workspaces.map((ws) => (
            <article key={ws.id} className="border-b border-hairline p-3 last:border-b-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium leading-4 text-ink">{ws.name}</p>
                  <p className="truncate text-[9px] leading-3 text-tertiary">{ws.slug ?? "No slug"}</p>
                </div>
                <Button
                  size="xs"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => handleUnlink(ws.id)}
                  aria-label={`Unlink ${ws.name}`}
                  className="min-h-8 shrink-0"
                >
                  <LinkBreak aria-hidden size={16} />
                  Unlink
                </Button>
              </div>
              <p className="mt-2 text-[9px] leading-3 text-tertiary">
                Created {formatAdminDate(ws.created_at)}
              </p>
            </article>
          ))
        ) : (
          <p className="p-4 text-center text-[10px] leading-4 text-tertiary">No linked workspaces.</p>
        )}
      </div>

      <div className="hidden md:block">
        <AdminDataTable
          data={workspaces}
          columns={columns}
          getRowId={(row) => row.id}
          emptyMessage="No linked workspaces."
          persistenceKey="admin-account-workspaces"
        />
      </div>
    </div>
  );
}
