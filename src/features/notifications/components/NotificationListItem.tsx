"use client";

import { Check, X } from "@phosphor-icons/react/dist/ssr";

import type { NotificationDeliveryView } from "@/lib/notifications/types";
import { cn } from "@/lib/ui/cn";

type NotificationListItemProps = {
  notification: NotificationDeliveryView;
  onDismiss: (deliveryId: string) => void;
  onMarkRead: (deliveryId: string) => void;
  isDismissing?: boolean;
  isMarkingRead?: boolean;
};

function severityClassName(severity: NotificationDeliveryView["severity"]) {
  if (severity === "success") return "border-l-success";
  if (severity === "warning") return "border-l-warning";
  if (severity === "critical") return "border-l-danger";
  return "border-l-hairline";
}

export function NotificationListItem({
  notification,
  onDismiss,
  onMarkRead,
  isDismissing = false,
  isMarkingRead = false,
}: NotificationListItemProps) {
  const unread = !notification.readAt;

  return (
    <li
      className={cn(
        "flex gap-2 border-b border-hairline border-l-2 px-2 py-2 last:border-b-0",
        severityClassName(notification.severity),
        unread ? "bg-surfaceMuted/60" : "bg-white",
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="min-w-0 flex-1 truncate text-[10px] font-medium leading-4 text-ink">{notification.title}</p>
          {unread ? <span className="size-1.5 shrink-0 rounded-xs bg-primary" aria-hidden="true" /> : null}
        </div>
        <p className="line-clamp-2 break-words text-[10px] leading-4 text-secondary">{notification.body}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-[8px] leading-3 text-tertiary">
          <span>{new Date(notification.deliveredAt).toLocaleDateString()}</span>
          {notification.releaseVersion ? <span>v{notification.releaseVersion}</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-start gap-1">
        {unread ? (
          <button
            type="button"
            aria-label={`Mark ${notification.title} read`}
            className="grid size-6 place-items-center rounded-xs text-tertiary transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            disabled={isMarkingRead}
            onClick={() => onMarkRead(notification.id)}
          >
            <Check size={12} weight="regular" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          aria-label={`Dismiss ${notification.title}`}
          className="grid size-6 place-items-center rounded-xs text-tertiary transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          disabled={isDismissing}
          onClick={() => onDismiss(notification.id)}
        >
          <X size={12} weight="regular" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
