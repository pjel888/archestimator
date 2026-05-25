"use client";

import type { ReactNode } from "react";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  description?: ReactNode;
  closeLabel?: string;
  className?: string;
  bodyClassName?: string;
};

export function Modal({
  open,
  title,
  children,
  onOpenChange,
  description,
  closeLabel = "Close modal",
  className,
  bodyClassName,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-archestimator-modal-root
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label={closeLabel}
        className="absolute inset-0 cursor-default bg-black/25 backdrop-blur-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-0"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "relative z-[1001] flex max-h-[calc(100dvh-32px)] w-full max-w-md flex-col overflow-hidden rounded-xs border border-hairline bg-white shadow-2xl",
          className,
        )}
      >
        <div className="flex min-h-10 items-start justify-between gap-3 border-b border-hairline px-3 py-2">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-[11px] font-medium leading-4 text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-0.5 text-[10px] font-medium leading-4 text-tertiary">
                {description}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6 shrink-0 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
            aria-label={closeLabel}
            onClick={() => onOpenChange(false)}
          >
            <X size={13} weight="regular" aria-hidden="true" />
          </Button>
        </div>
        <div className={cn("min-h-0 flex-1 overflow-auto p-3", bodyClassName)}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
