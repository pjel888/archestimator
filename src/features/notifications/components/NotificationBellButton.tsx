"use client";

import { Bell } from "@phosphor-icons/react/dist/ssr";
import type { RefObject } from "react";

import { IconButton } from "@/components/ui/icon-button";
import {
  PROJECT_HEADER_ACTION_BUTTON_CLASS,
  PROJECT_HEADER_ACTION_ICON_SIZE,
} from "@/components/workshop/project-header-action-styles";

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
    <IconButton
      ref={buttonRef}
      type="button"
      label={label}
      aria-expanded={open}
      aria-controls="notification-center-panel"
      className={PROJECT_HEADER_ACTION_BUTTON_CLASS}
      onClick={onClick}
      icon={(
        <>
          <Bell size={PROJECT_HEADER_ACTION_ICON_SIZE} weight="regular" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 grid h-3 min-w-3 place-items-center rounded-full border border-white bg-danger px-0.5 text-[7px] font-medium leading-none text-white shadow-[0_2px_4px_rgba(30,35,50,0.18)]"
            >
              {badgeLabel}
            </span>
          ) : null}
        </>
      )}
    />
  );
}
