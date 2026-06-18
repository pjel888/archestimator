"use client";

import { Bell } from "@phosphor-icons/react/dist/ssr";
import type { RefObject } from "react";

import { cn } from "@/lib/ui/cn";

type NotificationBellButtonProps = {
  unreadCount: number;
  open: boolean;
  onClick: () => void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
};

export function NotificationBellButton({ unreadCount, open, onClick, buttonRef }: NotificationBellButtonProps) {
  const label = unreadCount === 1 ? "Notifications, 1 unread" : `Notifications, ${unreadCount} unread`;
  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      aria-expanded={open}
      aria-controls="notification-center-panel"
      className={cn(
        "workshop-liquid-button relative grid size-10 shrink-0 place-items-center rounded-xs border focus-visible:outline-none",
      )}
      onClick={onClick}
    >
      <Bell size={15} weight="regular" aria-hidden="true" />
      {unreadCount > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full border border-white bg-danger px-0.5 text-[8px] font-medium leading-none text-white shadow-[0_2px_4px_rgba(30,35,50,0.18)]"
        >
          {badgeLabel}
        </span>
      ) : null}
    </button>
  );
}
