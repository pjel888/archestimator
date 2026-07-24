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

import {
  ProjectStartOptions,
  type ProjectStartOptionsProps,
} from "./ProjectStartOptions";

type ProjectStartModalProps = ProjectStartOptionsProps & {
  onClose: () => void;
};

export function ProjectStartModal({
  onClose,
  ...startOptions
}: ProjectStartModalProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      closeLabel="Close project start choices"
    >
      <DialogPortal>
        <div
          data-project-start-modal-root
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
        >
          <DialogOverlay blur className="bg-black/25" />
          <DialogContent
            data-project-start-modal
            described={false}
            initialFocus="first"
            className="max-h-[calc(100dvh-2rem)] w-[min(980px,calc(100vw-2rem))] max-w-none overflow-hidden border border-white/70 bg-white p-0 text-ink shadow-2xl"
          >
            <DialogHeader className="min-h-11 border-b border-hairline bg-white px-4 py-3">
              <DialogTitle className="text-[12px] font-medium text-ink">
                Start a project
              </DialogTitle>
              <DialogCloseButton className="size-8 rounded-xs text-tertiary hover:text-ink" />
            </DialogHeader>
            <DialogBody className="max-h-[calc(100dvh-7rem)] overflow-y-auto p-4">
              <p className="mb-4 max-w-[560px] text-[10px] leading-4 text-secondary">
                Choose a blank project, a workspace Template, guided practice, or review every starting path.
              </p>
              <ProjectStartOptions {...startOptions} />
            </DialogBody>
          </DialogContent>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
