"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

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
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="flex min-h-40 flex-col rounded-[10px] border border-divider bg-surface px-4 py-4">
            <h3 className="text-[12px] font-semibold text-ink">Blank project</h3>
            <p className="mt-1 text-[10px] leading-4 text-secondary">Set up a project with your own details.</p>
            <Button className="mt-auto w-full" size="sm" variant="primary" onClick={onCreateBlank}>
              Create blank project
            </Button>
          </article>
          <article className="flex min-h-40 flex-col rounded-[10px] border border-divider bg-surface px-4 py-4">
            <h3 className="text-[12px] font-semibold text-ink">Workspace template</h3>
            <p className="mt-1 text-[10px] leading-4 text-secondary">Browse the templates available to this workspace.</p>
            <Button className="mt-auto w-full" size="sm" variant="secondary" onClick={onBrowseTemplates}>
              Browse templates
            </Button>
          </article>
          <article className="flex min-h-40 flex-col rounded-[10px] border border-divider bg-surface px-4 py-4">
            <h3 className="text-[12px] font-semibold text-ink">Guided practice</h3>
            <p className="mt-1 text-[10px] leading-4 text-secondary">Spend about 10–15 minutes completing real Estimate Sheet practice tasks.</p>
            <Button
              aria-busy={isGuidedSamplePending}
              className="mt-auto w-full"
              disabled={isGuidedSamplePending}
              size="sm"
              variant="secondary"
              onClick={onGuidedSample}
            >
              {isGuidedSamplePending ? "Preparing practice..." : "Start guided practice"}
            </Button>
          </article>
          <article className="flex min-h-40 flex-col rounded-[10px] border border-divider bg-surface px-4 py-4">
            <h3 className="text-[12px] font-semibold text-ink">All start paths</h3>
            <p className="mt-1 text-[10px] leading-4 text-secondary">Compare every available starting point in one place.</p>
            <Link
              href="/workshop/getting-started"
              className="mt-auto inline-flex min-h-8 w-full items-center justify-center rounded-xs border border-divider bg-surface px-2 text-[10px] font-medium text-ink outline-none hover:bg-surfaceMuted focus-visible:ring-2 focus-visible:ring-focus"
            >
              Open Getting Started
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
