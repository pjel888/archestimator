"use client";

import { useState, type ReactNode } from "react";
import { GearSix } from "@phosphor-icons/react/dist/ssr";

import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/ui/cn";

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
          className={cn(
            "workshop-liquid-button relative grid size-10 shrink-0 place-items-center rounded-xs border focus-visible:outline-none",
          )}
          onClick={() => setOpen(true)}
        >
          <GearSix size={15} weight="regular" aria-hidden="true" />
        </button>
      ) : null}
      <Modal
        open={open}
        title="Settings"
        description="Manage account, workspace, and beta operations."
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
