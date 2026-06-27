"use client";

import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/overlays/dialog";

import { NewProjectForm, type NewProjectOptimisticSnapshot } from "./NewProjectForm";

type NewProjectModalProps = {
  onClose: () => void;
  onOptimisticProjectChange?: (snapshot: NewProjectOptimisticSnapshot) => void;
  googleMapsApiKey?: string;
  googleMapsMapId?: string | null;
  clientOptions?: string[];
};

export function NewProjectModal({
  onClose,
  onOptimisticProjectChange,
  googleMapsApiKey = "",
  googleMapsMapId = null,
  clientOptions = [],
}: NewProjectModalProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      closeLabel="Close create project"
    >
      <DialogPortal>
        <div
          data-create-project-modal-root
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
        >
          <DialogOverlay blur className="bg-black/25" />
          <DialogContent
            data-create-project-modal
            data-create-project-modal-shell
            described={false}
            initialFocus="first"
            className="workshop-create-project-modal-glass max-h-[calc(100dvh-2rem)] w-[min(1380px,calc(100vw-2rem))] max-w-none border bg-transparent p-1 text-ink shadow-none"
          >
            <DialogHeader className="min-h-11 border-0 bg-transparent px-2 py-2">
              <DialogTitle className="overflow-visible whitespace-normal">
                <span className="block min-w-0">
                  <span className="block text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">
                    Projects
                  </span>
                  <span className="mt-0.5 block text-[12px] font-medium leading-4 text-ink">
                    Create project
                  </span>
                </span>
              </DialogTitle>
              <DialogCloseButton className="workshop-liquid-button size-8 rounded-xs text-tertiary hover:text-ink" />
            </DialogHeader>

            <DialogBody className="min-h-0 overflow-hidden p-0">
              <div
                data-create-project-modal-tray
                className="min-h-0 overflow-hidden rounded-xs border border-white/70 bg-white"
              >
                <NewProjectForm
                  showHeader={false}
                  googleMapsApiKey={googleMapsApiKey}
                  googleMapsMapId={googleMapsMapId}
                  clientOptions={clientOptions}
                  onSuccess={onClose}
                  onOptimisticProjectChange={onOptimisticProjectChange}
                />
              </div>
            </DialogBody>
          </DialogContent>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
