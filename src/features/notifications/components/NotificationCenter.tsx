"use client";

import { ArrowClockwise } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { NotificationBellButton } from "@/features/notifications/components/NotificationBellButton";
import { NotificationListItem } from "@/features/notifications/components/NotificationListItem";
import {
  useDeferredNotificationQueryEnabled,
  useDismissNotificationMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  useUnreadNotificationCountQuery,
} from "@/features/notifications/hooks/useNotificationsQuery";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const unreadQueryEnabled = useDeferredNotificationQueryEnabled(open);
  const feedQuery = useNotificationsQuery(undefined, { enabled: open });
  const unreadQuery = useUnreadNotificationCountQuery({ enabled: unreadQueryEnabled });
  const markReadMutation = useMarkNotificationReadMutation();
  const dismissMutation = useDismissNotificationMutation();
  const unreadCount = unreadQuery.data ?? 0;
  const items = feedQuery.data?.items ?? [];

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => panelRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        window.setTimeout(() => bellRef.current?.focus(), 0);
      }
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (bellRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  return (
    <div className="relative shrink-0">
      <NotificationBellButton
        unreadCount={unreadCount}
        open={open}
        buttonRef={bellRef}
        onClick={() => setOpen((current) => !current)}
      />
      <span aria-live="polite" className="sr-only">
        {unreadCount === 1 ? "1 unread notification" : `${unreadCount} unread notifications`}
      </span>
      {open ? (
        <section
          id="notification-center-panel"
          ref={panelRef}
          tabIndex={-1}
          aria-label="Notifications"
          className="absolute right-0 top-8 z-[80] flex max-h-[min(420px,calc(100dvh-92px))] w-[min(280px,calc(100vw-24px))] flex-col overflow-hidden rounded-xs border border-hairline bg-white shadow-[0_12px_36px_rgba(17,17,17,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <div className="flex min-h-9 items-center justify-between border-b border-hairline px-2">
            <p className="text-[11px] font-medium leading-4 text-ink">Notifications</p>
            <IconButton
              type="button"
              label="Retry notifications"
              variant="plain"
              size="icon-xs"
              className="grid size-6 cursor-pointer place-items-center rounded-xs text-tertiary transition hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              onClick={() => void feedQuery.refetch()}
              icon={<ArrowClockwise size={16} weight="regular" aria-hidden="true" />}
            />
          </div>

          {feedQuery.isLoading ? (
            <output className="space-y-1 p-2 text-[10px] leading-4 text-tertiary">
              <div className="h-8 rounded-xs bg-surfaceMuted" aria-hidden="true" />
              <div className="h-8 rounded-xs bg-surfaceMuted" aria-hidden="true" />
              <span>Loading notifications...</span>
            </output>
          ) : feedQuery.isError ? (
            <div role="alert" className="space-y-2 p-2 text-[10px] leading-4 text-secondary">
              <p>Notifications could not load.</p>
              <Button
                type="button"
                variant="plain"
                size="xs"
                className="inline-flex min-h-7 min-w-0 cursor-pointer items-center rounded-xs border border-hairline px-2 text-[10px] font-medium text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                onClick={() => void feedQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <p className="p-2 text-[10px] leading-4 text-tertiary">No notifications</p>
          ) : (
            <ul className="min-h-0 overflow-y-auto" aria-label="Notification list">
              {items.map((item) => (
                <NotificationListItem
                  key={item.id}
                  notification={item}
                  isDismissing={dismissMutation.isPending && dismissMutation.variables === item.id}
                  isMarkingRead={markReadMutation.isPending && markReadMutation.variables === item.id}
                  onDismiss={(deliveryId) => dismissMutation.mutate(deliveryId)}
                  onMarkRead={(deliveryId) => markReadMutation.mutate(deliveryId)}
                />
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
