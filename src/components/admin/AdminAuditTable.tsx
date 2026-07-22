"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { formatAdminDateTime } from "@/lib/admin/datetime";

// F0-4: rows are fetched server-side from the real audit repository
// (listAuditEvents) and passed in as plain serializable data. The raw
// summary_json is intentionally NOT surfaced here — it may hold PII, and the
// table needs only structural fields.
export type AuditRow = {
  id: string;
  actor: string;
  action: string;
  target: string;
  occurredAt: string;
};

function AuditMobileCard({ row }: { row: AuditRow }) {
  return (
    <article className="border-b border-hairline p-3 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 break-words text-[11px] font-medium leading-4 text-ink">{row.action}</p>
        <time className="shrink-0 text-[9px] leading-3 text-tertiary" dateTime={row.occurredAt}>
          {formatAdminDateTime(row.occurredAt)}
        </time>
      </div>
      <dl className="mt-2 grid gap-1.5 rounded-xs bg-surfaceMuted/70 p-2">
        <div className="min-w-0">
          <dt className="text-[8px] font-medium uppercase leading-3 text-tertiary">Actor</dt>
          <dd className="break-all text-[10px] leading-4 text-ink">{row.actor}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[8px] font-medium uppercase leading-3 text-tertiary">Target</dt>
          <dd className="break-all text-[10px] leading-4 text-ink">{row.target || "—"}</dd>
        </div>
      </dl>
    </article>
  );
}

export function AdminAuditTable({ rows, error }: { rows: AuditRow[]; error?: string | null }) {
  const columns = useMemo<ColumnDef<AuditRow, unknown>[]>(
    () => [
      {
        accessorKey: "actor",
        header: "Actor",
        cell: ({ row }) => row.original.actor,
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => <span className="font-medium">{row.original.action}</span>,
      },
      {
        accessorKey: "target",
        header: "Target",
        cell: ({ row }) => row.original.target || "—",
      },
      {
        accessorKey: "occurredAt",
        header: "When",
        cell: ({ row }) => formatAdminDateTime(row.original.occurredAt),
      },
    ],
    [],
  );

  const emptyMessage = error ? `Audit log unreadable: ${error}` : "No admin audit events recorded yet.";

  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto md:hidden [content-visibility:auto]">
        {rows.length > 0 ? (
          rows.map((row) => <AuditMobileCard key={row.id} row={row} />)
        ) : (
          <p className="p-4 text-center text-[10px] leading-4 text-tertiary">{emptyMessage}</p>
        )}
      </div>
      <div className="hidden min-h-0 flex-1 md:flex">
        <AdminDataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          emptyMessage={emptyMessage}
          className="min-h-0 flex-1"
        />
      </div>
    </>
  );
}
