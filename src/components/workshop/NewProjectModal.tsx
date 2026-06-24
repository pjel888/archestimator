"use client";

import { X } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useRef } from "react";

import { Button } from "@/components/ui/button";

import { NewProjectForm, type NewProjectOptimisticSnapshot } from "./NewProjectForm";

type NewProjectModalProps = {
  onClose: () => void;
  onOptimisticProjectChange?: (snapshot: NewProjectOptimisticSnapshot) => void;
};

export function NewProjectModal({ onClose, onOptimisticProjectChange }: NewProjectModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const openDialogElement = useCallback((node: HTMLDialogElement | null) => {
    dialogRef.current = node;
    if (!node || node.open) return;
    if (typeof node.showModal === "function") {
      try {
        node.showModal();
      } catch {
        node.setAttribute("open", "");
      }
    } else {
      node.setAttribute("open", "");
    }
  }, []);

  const closeDialog = useCallback(() => {
    if (dialogRef.current?.open) {
      if (typeof dialogRef.current.close === "function") {
        try {
          dialogRef.current.close();
        } catch {
          dialogRef.current.removeAttribute("open");
        }
      } else {
        dialogRef.current.removeAttribute("open");
      }
    }
    onClose();
  }, [onClose]);

  return (
    <dialog
      ref={openDialogElement}
      aria-modal="true"
      aria-labelledby="new-project-title"
      className="z-30 w-[calc(100%-1rem)] max-w-5xl border-0 bg-transparent p-0 text-ink backdrop:bg-black/25 backdrop:backdrop-blur-md"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
    >
      <div className="relative flex max-h-[92vh] min-h-[560px] w-full flex-col overflow-hidden rounded-xs border border-white/70 bg-white shadow-[0_34px_110px_-48px_rgba(17,17,17,0.68)] ring-1 ring-black/5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-2 top-2 z-20 size-8 rounded-xs bg-white/80 text-tertiary shadow-sm backdrop-blur hover:bg-white hover:text-ink"
          aria-label="Close create project"
          onClick={closeDialog}
        >
          <X size={14} weight="regular" />
        </Button>

        <div className="min-h-0 flex-1 overflow-auto">
          <NewProjectForm
            onSuccess={closeDialog}
            onOptimisticProjectChange={onOptimisticProjectChange}
          />
        </div>
      </div>
    </dialog>
  );
}
