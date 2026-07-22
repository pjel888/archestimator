"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  logReleaseAction,
  setReleaseStatusAction,
} from "@/lib/admin/release-center-actions";
import type { AdminReleaseRecordRow, ReleaseStatus } from "@/lib/admin/release-center-repository";
import { formatAdminDateTime } from "@/lib/admin/datetime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_TONE: Record<ReleaseStatus, "neutral" | "success" | "warning" | "danger"> = {
  pending: "warning",
  shipped: "success",
  blocked: "danger",
  rolled_back: "neutral",
};

// F5 Release Center: log a release and set its go/no-go status.
export function AdminReleaseCenter({ initialRecords }: { initialRecords: AdminReleaseRecordRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [version, setVersion] = useState("");
  const [commitRef, setCommitRef] = useState("");
  const [notes, setNotes] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  function logRelease() {
    setNotice(null);
    startTransition(async () => {
      const result = await logReleaseAction({ versionLabel: version, commitRef, goNoGoNotes: notes });
      if (!result.ok) {
        setNotice("Could not log release.");
        return;
      }
      setVersion("");
      setCommitRef("");
      setNotes("");
      router.refresh();
    });
  }

  function changeStatus(recordId: string, status: ReleaseStatus) {
    startTransition(async () => {
      await setReleaseStatusAction(recordId, status);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 rounded-xs border border-hairline p-1.5">
        <p className="text-[10px] font-medium leading-4 text-ink">Log a release</p>
        <input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="Version label (e.g. 2026-07-16.1)"
          maxLength={120}
          className="w-full rounded-xs border border-hairline bg-white p-1.5 text-[10px] leading-4 text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Version label"
        />
        <input
          value={commitRef}
          onChange={(e) => setCommitRef(e.target.value)}
          placeholder="Commit / PR ref (optional)"
          className="w-full rounded-xs border border-hairline bg-white p-1.5 text-[10px] leading-4 text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Commit reference"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Go/no-go notes (optional)"
          rows={2}
          className="w-full resize-y rounded-xs border border-hairline bg-white p-1.5 text-[10px] leading-4 text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Go/no-go notes"
        />
        <div className="flex items-center justify-between">
          {notice && <span className="text-[9px] leading-3 text-tertiary">{notice}</span>}
          <Button
            size="sm"
            variant="secondary"
            className="ml-auto"
            disabled={pending || version.trim().length === 0}
            onClick={logRelease}
          >
            {pending ? "Logging…" : "Log release"}
          </Button>
        </div>
      </div>

      {initialRecords.length === 0 ? (
        <p className="text-[10px] leading-4 text-tertiary">No releases logged yet.</p>
      ) : (
        <ul className="space-y-1" aria-label="Release records">
          {initialRecords.map((record) => (
            <li
              key={record.id}
              className="flex flex-col gap-2 rounded-xs border border-hairline p-1.5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-[10px] font-medium leading-4 text-ink">{record.version_label}</p>
                <p className="text-[9px] leading-3 text-tertiary">
                  {record.commit_ref ? `${record.commit_ref} · ` : ""}
                  {formatAdminDateTime(record.created_at)}
                </p>
                {record.go_no_go_notes && (
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[9px] leading-3 text-secondary">
                    {record.go_no_go_notes}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1 sm:shrink-0 sm:justify-end">
                <Badge tone={STATUS_TONE[record.status]} size="xs" className="min-w-0 px-1">
                  {record.status}
                </Badge>
                <select
                  value={record.status}
                  disabled={pending}
                  onChange={(e) => changeStatus(record.id, e.target.value as ReleaseStatus)}
                  aria-label={`Set status for ${record.version_label}`}
                  className="min-h-8 rounded-xs border border-hairline bg-white px-1.5 py-1 text-[9px] leading-3 text-ink disabled:opacity-50 sm:min-h-0 sm:px-1 sm:py-0.5"
                >
                  <option value="pending">pending</option>
                  <option value="shipped">shipped</option>
                  <option value="blocked">blocked</option>
                  <option value="rolled_back">rolled_back</option>
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
