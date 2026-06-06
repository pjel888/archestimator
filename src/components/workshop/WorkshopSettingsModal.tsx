"use client";

import { useState, type ReactNode } from "react";
import { GearSix } from "@phosphor-icons/react/dist/ssr";

import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/ui/cn";

type WorkshopSettingsModalProps = {
  children: ReactNode;
  closeHref?: string;
  initialOpen?: boolean;
  trigger?: "button" | "none";
};

export function WorkshopSettingsModal({
  children,
  closeHref,
  initialOpen = false,
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
            "relative grid size-10 shrink-0 place-items-center rounded-xs border border-hairline bg-white text-tertiary transition hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
            open ? "bg-surfaceMuted text-ink" : null,
          )}
          onClick={() => setOpen(true)}
        >
          <GearSix size={14} weight="regular" aria-hidden="true" />
        </button>
      ) : null}
      <Modal
        open={open}
        title="Settings"
        description="Manage account, workspace, and beta operations."
        closeLabel="Close settings"
        className="max-w-[920px]"
        bodyClassName="bg-surface p-0"
        onOpenChange={handleOpenChange}
      >
        {children}
      </Modal>
    </>
  );
}
