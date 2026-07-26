"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/button";
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

function safeInternalHref(href: string | null): string | null {
  if (!href || !href.startsWith("/") || href.startsWith("//") || href.includes("\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(href)) return null;
  return href;
}

function actionHref(item: AdminActionItemRow): string | null {
  if (item.source_kind === "support") {
    return `/admin/support?${new URLSearchParams({ c: item.source_id, folder: "all" }).toString()}`;
  }
  if (item.source_kind === "feedback") {
    return `/admin/feedback?${new URLSearchParams({ feedback: item.source_id }).toString()}`;
  }
  return safeInternalHref(item.href);
}

/**
 * F2 Action Inbox list. Source-owned support/feedback rows only expose Open;
 * other derived items can be resolved, dismissed, or snoozed for one day.
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
            {actionHref(item) ? (
              <ButtonLink
                href={actionHref(item)!}
                variant="plain"
                size="sm"
                className="min-h-8 min-w-0 flex-1 cursor-pointer rounded-xs border border-hairline px-2 py-1 text-center !text-[9px] font-medium leading-3 text-ink transition hover:bg-surfaceMuted sm:min-h-0 sm:flex-none sm:px-1.5 sm:py-0.5"
              >
                Open
              </ButtonLink>
            ) : null}
            {item.source_kind !== "support" && item.source_kind !== "feedback" ? (
              <>
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => run(item.id, snoozeActionItem)}
                  variant="plain"
                  size="sm"
                  className="min-h-8 min-w-0 flex-1 cursor-pointer rounded-xs border border-hairline px-2 py-1 !text-[9px] font-medium leading-3 text-ink transition hover:bg-surfaceMuted disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:flex-none sm:px-1.5 sm:py-0.5"
                >
                  Snooze 1d
                </Button>
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => run(item.id, resolveActionItem)}
                  variant="plain"
                  size="sm"
                  className="min-h-8 min-w-0 flex-1 cursor-pointer rounded-xs border border-hairline px-2 py-1 !text-[9px] font-medium leading-3 text-ink transition hover:bg-surfaceMuted disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:flex-none sm:px-1.5 sm:py-0.5"
                >
                  Resolve
                </Button>
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => run(item.id, dismissActionItem)}
                  variant="plain"
                  size="sm"
                  className="min-h-8 min-w-0 cursor-pointer rounded-xs px-2 py-1 !text-[9px] font-medium leading-3 text-tertiary transition hover:bg-surfaceMuted disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:py-0.5"
                  aria-label="Dismiss"
                >
                  Dismiss
                </Button>
              </>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
