import Link from "next/link";

import { AdminPage, AdminPageHeader, AdminSection } from "@/components/admin/AdminPage";
import { Badge } from "@/components/ui/badge";
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
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin"
        title="Communications"
        description={
          <>
            In-app broadcast history with delivery counts. Bulk campaign email remains intentionally
            unavailable; one-to-one support email lives in{" "}
            <Link href="/admin/support" className="text-ink underline">
              Support
            </Link>
            .{" "}
            <Link href="/admin/notifications" className="text-ink underline">
              Create a broadcast →
            </Link>
          </>
        }
      />

      <AdminSection
        title="Published &amp; history"
        actions={
          <Badge tone="neutral" size="xs" className="min-w-0 px-1">
            {records.length} record{records.length === 1 ? "" : "s"}
          </Badge>
        }
      >
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
      </AdminSection>
    </AdminPage>
  );
}
