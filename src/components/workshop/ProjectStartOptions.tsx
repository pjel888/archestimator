"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export type ProjectStartOptionsProps = {
  onBrowseTemplates: () => void;
  onCreateBlank: () => void;
  onGuidedSample: () => void;
  isGuidedSamplePending: boolean;
};

export function ProjectStartOptions({
  onBrowseTemplates,
  onCreateBlank,
  onGuidedSample,
  isGuidedSamplePending,
}: ProjectStartOptionsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <article className="flex min-h-40 flex-col rounded-xs border border-divider bg-surface px-4 py-4">
        <h3 className="text-[12px] font-medium text-ink">Blank project</h3>
        <p className="mt-1 text-[10px] leading-4 text-secondary">
          Set up a project with your own details.
        </p>
        <Button className="mt-auto w-full" size="sm" variant="primary" onClick={onCreateBlank}>
          Create blank project
        </Button>
      </article>
      <article className="flex min-h-40 flex-col rounded-xs border border-divider bg-surface px-4 py-4">
        <h3 className="text-[12px] font-medium text-ink">Workspace template</h3>
        <p className="mt-1 text-[10px] leading-4 text-secondary">
          Browse the templates available to this workspace.
        </p>
        <Button className="mt-auto w-full" size="sm" variant="secondary" onClick={onBrowseTemplates}>
          Browse templates
        </Button>
      </article>
      <article className="flex min-h-40 flex-col rounded-xs border border-divider bg-surface px-4 py-4">
        <h3 className="text-[12px] font-medium text-ink">Guided practice</h3>
        <p className="mt-1 text-[10px] leading-4 text-secondary">
          Spend about 10–15 minutes completing real Estimate Sheet practice tasks.
        </p>
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
      <article className="flex min-h-40 flex-col rounded-xs border border-divider bg-surface px-4 py-4">
        <h3 className="text-[12px] font-medium text-ink">All start paths</h3>
        <p className="mt-1 text-[10px] leading-4 text-secondary">
          Compare every available starting point in one place.
        </p>
        <Link
          href="/workshop/getting-started"
          className="mt-auto inline-flex min-h-8 w-full items-center justify-center rounded-xs border border-divider bg-surface px-2 text-[10px] font-medium text-ink outline-none hover:bg-surfaceMuted focus-visible:ring-2 focus-visible:ring-focus"
        >
          Open Getting Started
        </Link>
      </article>
    </div>
  );
}
