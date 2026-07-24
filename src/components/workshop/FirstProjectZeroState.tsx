"use client";

import { ProjectStartOptions } from "./ProjectStartOptions";

type FirstProjectZeroStateProps = {
  canCreateProjects: boolean;
  onBrowseTemplates: () => void;
  onCreateBlank: () => void;
  onGuidedSample: () => void;
  isGuidedSamplePending: boolean;
};

export function FirstProjectZeroState({
  canCreateProjects,
  onBrowseTemplates,
  onCreateBlank,
  onGuidedSample,
  isGuidedSamplePending,
}: FirstProjectZeroStateProps) {
  if (!canCreateProjects) {
    return (
      <section
        aria-live="polite"
        aria-label="No projects yet"
        data-first-project-zero-state="viewer"
        data-testid="first-project-zero-state"
        className="grid h-full min-h-[420px] place-items-center px-4 py-10"
      >
        <div className="w-full max-w-[440px] rounded-[12px] border border-white/80 bg-white px-5 py-6 text-center shadow-[0_10px_24px_rgba(30,35,50,0.075),0_2px_7px_rgba(30,35,50,0.045),inset_0_1px_0_rgba(255,255,255,0.88)]">
          <h2 className="text-[14px] font-semibold text-ink">No projects yet</h2>
          <p className="mt-2 text-[11px] leading-5 text-secondary">
            Contact a workspace owner to create the first project or share one with you.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-live="polite"
      aria-label="Create your first project"
      data-first-project-zero-state="creator"
      data-testid="first-project-zero-state"
      className="grid h-full min-h-[420px] place-items-center px-4 py-10"
    >
      <div className="w-full max-w-[680px] rounded-[12px] border border-white/80 bg-white p-5 shadow-[0_10px_24px_rgba(30,35,50,0.075),0_2px_7px_rgba(30,35,50,0.045),inset_0_1px_0_rgba(255,255,255,0.88)]">
        <div className="max-w-[440px]">
          <h2 className="text-[14px] font-semibold text-ink">Create your first project</h2>
          <p className="mt-1 text-[11px] leading-5 text-secondary">
            Start from scratch, reuse a workspace Template, explore an example, or follow guided practice.
          </p>
        </div>
        <div className="mt-5">
          <ProjectStartOptions
            onBrowseTemplates={onBrowseTemplates}
            onCreateBlank={onCreateBlank}
            onGuidedSample={onGuidedSample}
            isGuidedSamplePending={isGuidedSamplePending}
          />
        </div>
      </div>
    </section>
  );
}
