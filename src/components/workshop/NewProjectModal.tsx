"use client";

import { X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";

import { NewProjectForm } from "./NewProjectForm";

type NewProjectModalProps = {
  onClose: () => void;
};

export function NewProjectModal({ onClose }: NewProjectModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/20 p-2 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        className="flex max-h-[90%] w-full max-w-3xl flex-col overflow-hidden rounded-xs border border-white/70 bg-white/92 shadow-[0_24px_80px_-42px_rgba(17,17,17,0.65)] ring-1 ring-black/5 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between border-b border-hairline bg-white/80 px-3 py-2">
          <div className="min-w-0">
            <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Projects</p>
            <h3 id="new-project-title" className="mt-0.5 text-[12px] font-medium text-ink">
              Create project
            </h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-xs text-tertiary hover:bg-surfaceMuted hover:text-ink"
            aria-label="Close create project"
            onClick={onClose}
          >
            <X size={14} weight="regular" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          <NewProjectForm />
        </div>
      </div>
    </div>
  );
}
