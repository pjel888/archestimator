import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listCommunicationRecords } from "@/lib/admin/communications-repository";

const SEVERITY_TONE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  info: "neutral",
  success: "success",
  warning: "warning",
  critical: "danger",
};

export const dynamic = "force-dynamic";

// F9 (UNIT-010) Communications Manager — in-app Published/All-History view.
// Create new broadcasts at /admin/notifications. Email channel is provider-gated.
export default async function AdminCommunicationsPage() {
  const records = await listCommunicationRecords();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Communications</h1>
        <p className="text-[10px] leading-4 text-tertiary">
          In-app broadcast history with delivery counts. Bulk campaign email remains intentionally
          unavailable; one-to-one support email lives in{" "}
          <Link href="/admin/support" className="text-ink underline">
            Support
          </Link>
          .{" "}
          <Link href="/admin/notifications" className="text-ink underline">
            Create a broadcast →
          </Link>
        </p>
      </div>

      <Card className="p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-medium leading-4 text-ink">Published &amp; history</h2>
          <Badge tone="neutral" size="xs" className="min-w-0 px-1">
            {records.length} record{records.length === 1 ? "" : "s"}
          </Badge>
        </div>
        {records.length === 0 ? (
          <p className="text-[10px] leading-4 text-tertiary">No broadcasts sent yet.</p>
        ) : (
          <ul className="space-y-1" aria-label="Communication records">
            {records.map((record) => (
              <li
                key={record.id}
                className="flex items-center justify-between gap-2 border-b border-hairline pb-1 text-[10px] leading-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{record.title}</p>
                  <p className="text-[9px] text-tertiary">
                    {record.kind} · {record.surface} · {new Date(record.created_at).toLocaleString()}
                    {record.release_version ? ` · ${record.release_version}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge tone={SEVERITY_TONE[record.severity] ?? "neutral"} size="xs" className="min-w-0 px-1">
                    {record.severity}
                  </Badge>
                  <Badge tone="neutral" size="xs" className="min-w-0 px-1">
                    {record.delivery_count} delivered
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
