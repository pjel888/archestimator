"use client";

import { X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";

import { NewProjectForm } from "./NewProjectForm";

type NewProjectModalProps = {
  onClose: () => void;
};

export function NewProjectModal({ onClose }: NewProjectModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/25 p-2 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        className="relative flex max-h-[92vh] min-h-[560px] w-full max-w-5xl flex-col overflow-hidden rounded-xs border border-white/70 bg-white shadow-[0_34px_110px_-48px_rgba(17,17,17,0.68)] ring-1 ring-black/5"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-2 top-2 z-20 size-8 rounded-xs bg-white/80 text-tertiary shadow-sm backdrop-blur hover:bg-white hover:text-ink"
          aria-label="Close create project"
          onClick={onClose}
        >
          <X size={14} weight="regular" />
        </Button>

        <div className="min-h-0 flex-1 overflow-auto">
          <NewProjectForm />
        </div>
      </div>
    </div>
  );
}
