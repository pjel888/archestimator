"use client";

import { useState } from "react";
import { Lifebuoy } from "@phosphor-icons/react/dist/ssr";

import { Modal } from "@/components/ui/modal";
import { BetaFeedbackForm } from "@/components/workshop/BetaFeedbackForm";
import { cn } from "@/lib/ui/cn";

type WorkshopFeedbackModalProps = {
  className?: string;
};

export function WorkshopFeedbackModal({ className }: WorkshopFeedbackModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Send beta feedback"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-xs text-tertiary transition hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
          open ? "bg-surfaceMuted text-ink" : null,
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <Lifebuoy size={15} weight="regular" aria-hidden="true" />
      </button>
      <Modal
        open={open}
        title="Beta feedback"
        description="Report workflow blockers, confusing screens, export issues, and missing estimating details."
        closeLabel="Close beta feedback"
        className="max-w-[680px]"
        bodyClassName="bg-surface p-3"
        onOpenChange={setOpen}
      >
        <BetaFeedbackForm mode="inline" />
      </Modal>
    </>
  );
}
