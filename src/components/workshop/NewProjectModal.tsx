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
        className="flex max-h-[90%] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-hairline bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-tertiary">Live Supabase</p>
            <h3 id="new-project-title" className="mt-0.5 text-[12px] font-bold text-ink">
              Create project
            </h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-sm text-tertiary hover:bg-surfaceMuted hover:text-ink"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={14} />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          <NewProjectForm />
        </div>
      </div>
    </div>
  );
}
