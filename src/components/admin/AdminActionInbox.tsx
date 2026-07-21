"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  dismissActionItem,
  resolveActionItem,
  snoozeActionItem,
} from "@/lib/admin/action-inbox-actions";
import type { AdminActionItemRow, ActionItemSeverity } from "@/lib/admin/action-inbox-repository";
import { Badge } from "@/components/ui/badge";

const SEVERITY_TONE: Record<ActionItemSeverity, "danger" | "warning" | "neutral"> = {
  critical: "danger",
  warning: "warning",
  info: "neutral",
};

function ageLabel(iso: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  return days <= 0 ? "today" : `${days}d`;
}

/**
 * F2 Action Inbox list. Each item can be resolved, dismissed, or snoozed 1 day.
 * Snoozed items resurface automatically once snooze_until passes (see repository).
 */
export function AdminActionInbox({ items }: { items: AdminActionItemRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(itemId: string, fn: (id: string) => Promise<{ ok: boolean }>) {
    startTransition(async () => {
      await fn(itemId);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return <p className="text-[10px] leading-4 text-tertiary">Inbox is clear — nothing needs you right now.</p>;
  }

  return (
    <ol className="space-y-1" aria-label="Action inbox items">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-col gap-2 rounded-xs border border-hairline p-1.5 sm:flex-row sm:items-start sm:gap-2"
        >
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <Badge tone={SEVERITY_TONE[item.severity]} size="xs" className="mt-0.5 min-w-0 px-1">
              {item.severity}
            </Badge>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium leading-4 text-ink">{item.title}</p>
              <p className="text-[9px] leading-3 text-tertiary">
                {item.source_kind} · seen {ageLabel(item.last_seen_at)}
                {item.status === "snoozed" && item.snooze_until ? ` · snoozed until ${ageLabel(item.snooze_until)}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:shrink-0 sm:justify-end">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(item.id, snoozeActionItem)}
              className="min-h-8 flex-1 rounded-xs border border-hairline px-2 py-1 text-[9px] font-medium leading-3 text-ink transition hover:bg-surfaceMuted disabled:opacity-50 sm:min-h-0 sm:flex-none sm:px-1.5 sm:py-0.5"
            >
              Snooze 1d
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(item.id, resolveActionItem)}
              className="min-h-8 flex-1 rounded-xs border border-hairline px-2 py-1 text-[9px] font-medium leading-3 text-ink transition hover:bg-surfaceMuted disabled:opacity-50 sm:min-h-0 sm:flex-none sm:px-1.5 sm:py-0.5"
            >
              Resolve
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(item.id, dismissActionItem)}
              className="min-h-8 rounded-xs px-2 py-1 text-[9px] font-medium leading-3 text-tertiary transition hover:bg-surfaceMuted disabled:opacity-50 sm:min-h-0 sm:px-1.5 sm:py-0.5"
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
