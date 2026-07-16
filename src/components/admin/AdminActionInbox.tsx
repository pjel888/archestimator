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
        <li key={item.id} className="flex items-start gap-2 rounded-xs border border-hairline p-1.5">
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
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(item.id, snoozeActionItem)}
              className="rounded-xs border border-hairline px-1.5 py-0.5 text-[9px] font-medium leading-3 text-ink transition hover:bg-surfaceMuted disabled:opacity-50"
            >
              Snooze 1d
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(item.id, resolveActionItem)}
              className="rounded-xs border border-hairline px-1.5 py-0.5 text-[9px] font-medium leading-3 text-ink transition hover:bg-surfaceMuted disabled:opacity-50"
            >
              Resolve
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(item.id, dismissActionItem)}
              className="rounded-xs px-1.5 py-0.5 text-[9px] font-medium leading-3 text-tertiary transition hover:bg-surfaceMuted disabled:opacity-50"
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
