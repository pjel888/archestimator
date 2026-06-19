"use client";

import { useMemo, useRef, useTransition, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChartBarHorizontal,
  ClipboardText,
  FolderOpen,
  MapPin,
  User,
} from "@phosphor-icons/react/dist/ssr";

import { ControlInput } from "@/components/ui/control-input";
import { updateProjectDetails } from "@/lib/projects/actions";
import type { Json, Tables } from "@/lib/supabase/types";

type ProjectMetadata = {
  readonly projectImageUrl?: string;
};

type ProjectDashboardClientProps = {
  readonly project: Tables<"projects"> | null;
  readonly fallback: {
    readonly id: string;
    readonly name: string;
    readonly client: string;
    readonly location: string;
    readonly projectCode: string;
    readonly currencyCode: string;
  };
};

function readProjectMetadata(value: Json): ProjectMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, Json>;
  return {
    projectImageUrl: typeof record.projectImageUrl === "string" ? record.projectImageUrl : undefined,
  };
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function ProjectDataField({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-[8px] font-medium uppercase tracking-normal text-tertiary">{label}</span>
      {children}
    </label>
  );
}

function ProjectTimestampField({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="space-y-0.5 px-2 py-1.5">
      <span className="block text-[8px] font-medium uppercase tracking-normal text-gray-400">{label}</span>
      <p className="truncate text-[8px] font-medium leading-3 text-tertiary">{value}</p>
    </div>
  );
}

function ProjectMetric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="min-w-0 rounded-xs border border-[color:var(--glass-border)] bg-white/42 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.54)]">
      <span className="block text-[8px] font-medium uppercase tracking-normal text-tertiary">{label}</span>
      <p className="mt-0.5 truncate font-numeric text-[10px] font-medium leading-3 text-ink">{value}</p>
    </div>
  );
}

function ProjectActionTile({
  href,
  label,
  description,
  icon: Icon,
}: {
  readonly href: string;
  readonly label: string;
  readonly description: string;
  readonly icon: typeof ClipboardText;
}) {
  return (
    <Link
      href={href}
      className="workshop-project-card-control group flex min-h-24 flex-col justify-between rounded-xs border p-2 text-left transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="workshop-project-card-control grid size-7 place-items-center rounded-xs border text-secondary transition-colors group-hover:text-ink">
          <Icon size={14} weight="regular" aria-hidden="true" />
        </span>
        <ArrowUpRight size={14} weight="regular" aria-hidden="true" className="text-tertiary transition-colors group-hover:text-ink" />
      </span>
      <span className="block min-w-0">
        <span className="block truncate text-[12px] font-medium leading-4 text-ink">{label}</span>
        <span className="mt-1 block max-w-[38ch] text-[10px] leading-4 text-secondary">{description}</span>
      </span>
    </Link>
  );
}

function AutoSubmitForm({
  projectId,
  projectImageUrl,
  children,
}: {
  readonly projectId: string;
  readonly projectImageUrl?: string;
  readonly children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  const handleBlur = () => {
    if (formRef.current) {
      startTransition(() => {
        formRef.current?.requestSubmit();
      });
    }
  };

  return (
    <form
      ref={formRef}
      action={updateProjectDetails}
      className={["flex min-h-0 flex-1 flex-col", isPending ? "opacity-60" : ""].filter(Boolean).join(" ")}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          handleBlur();
        }
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      {projectImageUrl ? <input type="hidden" name="projectImageUrl" value={projectImageUrl} /> : null}
      {children}
    </form>
  );
}

export function ProjectDashboardClient({ project, fallback }: ProjectDashboardClientProps) {
  const metadata = useMemo(() => readProjectMetadata(project?.metadata ?? null), [project?.metadata]);
  const name = project?.name ?? fallback.name;
  const client = project?.client_name ?? fallback.client;
  const location = project?.location ?? fallback.location;
  const projectCode = project?.project_code ?? fallback.projectCode;
  const currencyCode = project?.currency_code ?? fallback.currencyCode;
  const projectId = project?.id ?? fallback.id;
  const updatedLabel = formatDate(project?.updated_at);
  const createdLabel = formatDate(project?.created_at);

  return (
    <section className="flex h-full min-h-0 justify-start" aria-label={`${name} project information`}>
      <aside className="flex h-full w-[274px] shrink-0 flex-col p-2" aria-label="Editable project details">
        <AutoSubmitForm projectId={projectId} projectImageUrl={metadata.projectImageUrl}>
          <input type="hidden" name="projectCode" value={projectCode} />
          <div className="dashboard-glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-xs">
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-2">
              <ProjectDataField label="Project name">
                <ControlInput
                  name="name"
                  defaultValue={name}
                  required
                  className="h-8 w-full px-2 text-[10px] font-medium text-ink"
                />
              </ProjectDataField>

              <ProjectDataField label="Client">
                <ControlInput
                  name="clientName"
                  defaultValue={client}
                  placeholder="Client name"
                  className="h-8 w-full px-2 text-[10px] font-medium text-secondary"
                />
              </ProjectDataField>

              <input type="hidden" name="currencyCode" value={currencyCode} />

              <ProjectDataField label="Project address">
                <textarea
                  name="location"
                  defaultValue={location}
                  placeholder="Project address"
                  className="min-h-12 w-full resize-y rounded-xs border border-transparent bg-white/70 px-2 py-1 !text-[10px] font-medium leading-3 text-secondary outline-none transition hover:border-hairline focus:border-accent focus:bg-accentSoft"
                />
              </ProjectDataField>
            </div>

            <div className="grid grid-cols-2 divide-x divide-[color:var(--glass-border)] border-t border-[color:var(--glass-border)] bg-white/25">
              <ProjectTimestampField label="Created" value={createdLabel} />
              <ProjectTimestampField label="Updated" value={updatedLabel} />
            </div>
          </div>
        </AutoSubmitForm>
      </aside>
      <main className="min-h-0 flex-1 overflow-auto p-2" aria-label="Project dashboard">
        <div className="grid min-h-full gap-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
          <section className="dashboard-glass flex min-h-[248px] flex-col justify-between rounded-xs p-3" aria-label="Project overview">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Project dashboard</span>
                <h2 className="mt-1 truncate text-[12px] font-medium leading-4 tracking-normal text-ink">{name}</h2>
                <div className="mt-2 flex min-w-0 flex-wrap gap-1.5 text-[10px] leading-3 text-secondary">
                  <span className="workshop-project-card-control inline-flex max-w-full items-center gap-1 rounded-xs border px-1.5 py-1">
                    <User size={12} weight="regular" aria-hidden="true" />
                    <span className="truncate">{client || "No client"}</span>
                  </span>
                  <span className="workshop-project-card-control inline-flex max-w-full items-center gap-1 rounded-xs border px-1.5 py-1">
                    <MapPin size={12} weight="regular" aria-hidden="true" />
                    <span className="truncate">{location || "No address"}</span>
                  </span>
                </div>
              </div>
              <span className="workshop-project-card-control inline-flex shrink-0 items-center gap-1 rounded-xs border px-2 py-1 font-numeric text-[10px] font-medium text-ink">
                <FolderOpen size={12} weight="regular" aria-hidden="true" />
                {projectCode}
              </span>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <ProjectMetric label="Currency" value={currencyCode} />
              <ProjectMetric label="Created" value={createdLabel} />
              <ProjectMetric label="Updated" value={updatedLabel} />
            </div>
          </section>

          <section className="dashboard-glass-warm flex min-h-[248px] flex-col justify-between rounded-xs p-3" aria-label="Project activity">
            <div>
              <span className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Working surface</span>
              <p className="mt-1 text-[12px] font-medium leading-4 text-ink">Move into estimates, cost data, or the projects index from one frosted panel.</p>
            </div>
            <div className="mt-4 grid gap-2">
              <ProjectMetric label="Primary next move" value="Open estimates" />
              <ProjectMetric label="Data view" value="Cost insights" />
            </div>
          </section>

          <section className="grid gap-2 xl:col-span-2 sm:grid-cols-3" aria-label="Project dashboard actions">
            <ProjectActionTile
              href={`/workshop/projects/${projectId}/estimates`}
              label="Estimates"
              description="Review estimate sheets and continue quantity or cost work."
              icon={ClipboardText}
            />
            <ProjectActionTile
              href={`/workshop/projects/${projectId}/data`}
              label="Data"
              description="Inspect project cost composition and comparison views."
              icon={ChartBarHorizontal}
            />
            <ProjectActionTile
              href="/workshop/projects"
              label="Projects"
              description="Return to the liquid-glass project index and workspace groups."
              icon={FolderOpen}
            />
          </section>
        </div>
      </main>
    </section>
  );
}
