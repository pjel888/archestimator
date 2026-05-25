"use client";

import type { ReactNode } from "react";
import { X, FloppyDisk, ImageSquare } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { deleteProject, updateProjectDetails } from "@/lib/projects/actions";
import type { Json, Tables } from "@/lib/supabase/types";

type ProjectDetailsModalProps = {
  project: Tables<"projects">;
  onClose: () => void;
};

type ProjectMetadata = {
  projectImageUrl?: string;
};

function readProjectMetadata(value: Json): ProjectMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, Json>;
  return {
    projectImageUrl: typeof record.projectImageUrl === "string" ? record.projectImageUrl : undefined,
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-tertiary">{children}</span>;
}

export function ProjectDetailsModal({ project, onClose }: ProjectDetailsModalProps) {
  const metadata = readProjectMetadata(project.metadata);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/25 p-2 backdrop-blur-md">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close project details" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-details-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/70 bg-white/88 shadow-[0_24px_80px_-42px_rgba(17,17,17,0.65)] ring-1 ring-black/5 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between border-b border-hairline bg-white/80 px-3 py-2">
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-tertiary">Project details</p>
            <h2 id="project-details-title" className="mt-0.5 truncate text-[12px] font-bold text-ink">
              {project.name}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-sm text-tertiary hover:bg-surfaceMuted hover:text-ink"
            aria-label="Close project details"
            onClick={onClose}
          >
            <X size={14} weight="bold" />
          </Button>
        </div>

        <form action={updateProjectDetails} className="min-h-0 flex-1 overflow-auto p-2">
          <input type="hidden" name="projectId" value={project.id} />
          <div className="grid gap-2 lg:grid-cols-[240px_1fr]">
            <div className="overflow-hidden rounded-lg border border-hairline bg-white">
              {metadata.projectImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={metadata.projectImageUrl} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,#fff0e5_0%,#f4f7fa_52%,#ffffff_100%)] text-tertiary">
                  <ImageSquare size={28} weight="duotone" aria-hidden="true" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em]">Project image</span>
                </div>
              )}
              <div className="space-y-1 border-t border-hairline p-2">
                <FieldLabel>Project image URL</FieldLabel>
                <ControlInput name="projectImageUrl" defaultValue={metadata.projectImageUrl ?? ""} placeholder="https://..." className="h-8 px-2" />
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <FieldLabel>Project name</FieldLabel>
                <ControlInput name="name" defaultValue={project.name} required className="h-8 px-2" />
              </label>
              <label className="space-y-1">
                <FieldLabel>Client</FieldLabel>
                <ControlInput name="clientName" defaultValue={project.client_name ?? ""} placeholder="Client name" className="h-8 px-2" />
              </label>
              <label className="space-y-1">
                <FieldLabel>Project code</FieldLabel>
                <ControlInput name="projectCode" defaultValue={project.project_code ?? ""} placeholder="PRJ-001" className="h-8 px-2" />
              </label>
              <label className="space-y-1 md:col-span-2">
                <FieldLabel>Location</FieldLabel>
                <ControlInput name="location" defaultValue={project.location ?? ""} placeholder="City / site location" className="h-8 px-2" />
              </label>
              <label className="space-y-1">
                <FieldLabel>Currency</FieldLabel>
                <ControlInput name="currencyCode" defaultValue={project.currency_code} className="h-8 px-2 uppercase" />
              </label>
            </div>
          </div>

          <div className="mt-2 grid gap-2 border-t border-hairline pt-2 md:grid-cols-2">
            <div className="rounded-lg border border-hairline bg-white p-2">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-tertiary">Database IDs</p>
              <dl className="mt-2 space-y-1 text-[10px] leading-4">
                <div className="flex justify-between gap-2">
                  <dt className="text-tertiary">Project</dt>
                  <dd className="truncate font-mono text-ink">{project.id}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-tertiary">Workspace</dt>
                  <dd className="truncate font-mono text-ink">{project.workspace_id}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-lg border border-hairline bg-white p-2">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-tertiary">Record timestamps</p>
              <dl className="mt-2 space-y-1 text-[10px] leading-4">
                <div className="flex justify-between gap-2">
                  <dt className="text-tertiary">Created</dt>
                  <dd className="text-right text-ink">{formatDateTime(project.created_at)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-tertiary">Updated</dt>
                  <dd className="text-right text-ink">{formatDateTime(project.updated_at)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-2 mt-2 flex justify-between gap-2 border-t border-hairline bg-white/90 px-2 py-2 backdrop-blur">
            <Button
              type="submit"
              variant="danger"
              size="sm"
              className="h-8"
              formAction={deleteProject}
              onClick={(event) => {
                if (!window.confirm(`Delete ${project.name}? This also removes its estimates.`)) event.preventDefault();
              }}
            >
              Delete project
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" className="h-8" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="h-8 gap-1.5">
                <FloppyDisk size={13} weight="bold" aria-hidden="true" />
                Save details
              </Button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
