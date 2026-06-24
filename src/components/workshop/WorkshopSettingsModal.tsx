"use client";

import { useState, type ReactNode } from "react";
import { GearSix } from "@phosphor-icons/react/dist/ssr";

import {
  PROJECT_HEADER_ACTION_BUTTON_CLASS,
  PROJECT_HEADER_ACTION_ICON_SIZE,
} from "@/components/workshop/project-header-action-styles";
import { Modal } from "@/components/ui/modal";

type WorkshopSettingsModalProps = {
  children: ReactNode;
  closeHref?: string;
  initialOpen?: boolean;
  location?: ReactNode;
  trigger?: "button" | "none";
};

export function WorkshopSettingsModal({
  children,
  closeHref,
  initialOpen = false,
  location,
  trigger = "button",
}: WorkshopSettingsModalProps) {
  const [open, setOpen] = useState(initialOpen);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && closeHref) window.location.assign(closeHref);
  }

  return (
    <>
      {trigger === "button" ? (
        <button
          type="button"
          aria-label="Open settings"
          aria-haspopup="dialog"
          aria-expanded={open}
          className={PROJECT_HEADER_ACTION_BUTTON_CLASS}
          onClick={() => setOpen(true)}
        >
          <GearSix size={PROJECT_HEADER_ACTION_ICON_SIZE} weight="regular" aria-hidden="true" />
        </button>
      ) : null}
      <Modal
        open={open}
        title="Settings"
        description="Manage account, workspace, and access operations."
        closeLabel="Close settings"
        className="max-w-[920px]"
        bodyClassName="bg-white p-0"
        initialFocus="content"
        location={location}
        onOpenChange={handleOpenChange}
      >
        {children}
      </Modal>
    </>
  );
}
