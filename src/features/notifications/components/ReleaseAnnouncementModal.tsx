"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { isAllowedNotificationActionHref } from "@/lib/notifications/release-announcements";
import type { ReleaseAnnouncementView } from "@/lib/notifications/types";
import { useAcknowledgeReleaseAnnouncementMutation } from "@/features/notifications/hooks/useNotificationsQuery";

type ReleaseAnnouncementModalProps = {
  announcement: ReleaseAnnouncementView | null;
  returnFocusRef?: { current: HTMLElement | null };
};

export function ReleaseAnnouncementModal({ announcement, returnFocusRef }: ReleaseAnnouncementModalProps) {
  const acknowledgeMutation = useAcknowledgeReleaseAnnouncementMutation();
  const [closedDeliveryIds, setClosedDeliveryIds] = useState<Set<string>>(() => new Set());
  const acknowledgedDeliveryIdsRef = useRef<Set<string>>(null!);
  if (acknowledgedDeliveryIdsRef.current === null) acknowledgedDeliveryIdsRef.current = new Set();
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const primaryButtonRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);

  const open = Boolean(announcement && !closedDeliveryIds.has(announcement.id));

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.setTimeout(() => primaryButtonRef.current?.focus(), 0);
  }, [open]);

  const restoreFocus = useCallback(() => {
    window.setTimeout(() => {
      const target = returnFocusRef?.current ?? previousFocusRef.current;
      target?.focus();
    }, 0);
  }, [returnFocusRef]);

  const acknowledge = useCallback(() => {
    if (!announcement) return;
    setClosedDeliveryIds((current) => new Set(current).add(announcement.id));
    if (!acknowledgedDeliveryIdsRef.current.has(announcement.id)) {
      acknowledgedDeliveryIdsRef.current.add(announcement.id);
      acknowledgeMutation.mutate(announcement.id);
    }
    restoreFocus();
  }, [acknowledgeMutation, announcement, restoreFocus]);

  if (!announcement) return null;

  const hasAction = announcement.actionHref && isAllowedNotificationActionHref(announcement.actionHref);

  return (
    <Modal
      open={open}
      title={announcement.title}
      description={announcement.releaseVersion ? `Version ${announcement.releaseVersion}` : undefined}
      closeLabel="Close release announcement"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) acknowledge();
      }}
      bodyClassName="space-y-3"
    >
      <div className="space-y-2">
        {announcement.releaseVersion ? (
          <span className="inline-flex max-w-full rounded-xs border border-hairline bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium leading-3 text-tertiary">
            {announcement.releaseVersion}
          </span>
        ) : null}
        <p className="max-w-full break-words text-[10px] leading-4 text-secondary">{announcement.body}</p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button
          ref={(node) => {
            if (!hasAction) primaryButtonRef.current = node;
          }}
          type="button"
          className="inline-flex min-h-7 cursor-pointer items-center justify-center rounded-xs px-2 text-[10px] font-medium leading-none text-tertiary transition hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          onClick={acknowledge}
        >
          Dismiss
        </button>
        {hasAction ? (
          <a
            ref={(node) => {
              primaryButtonRef.current = node;
            }}
            href={announcement.actionHref ?? "/workshop"}
            className="inline-flex min-h-7 cursor-pointer items-center justify-center rounded-xs bg-primary px-2 text-[10px] font-medium leading-none text-white transition hover:bg-accentDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            onClick={acknowledge}
          >
            {announcement.actionLabel ?? "Open"}
          </a>
        ) : null}
      </div>
    </Modal>
  );
}
