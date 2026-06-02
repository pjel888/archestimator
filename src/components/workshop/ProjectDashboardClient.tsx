"use client";

import Link from "next/link";
import { useMemo, useRef, useTransition } from "react";
import { ChartPieSlice, ClipboardText, ListChecks } from "@phosphor-icons/react/dist/ssr";

import { ControlInput } from "@/components/ui/control-input";
import { EmptyState } from "@/components/ui/empty-state";
import { updateProjectDetails } from "@/lib/projects/actions";
import type { Json, Tables } from "@/lib/supabase/types";

type ProjectMetadata = {
  projectImageUrl?: string;
};

type ProjectDashboardClientProps = {
  project: Tables<"projects"> | null;
  fallback: {
    id: string;
    name: string;
    client: string;
    location: string;
    projectCode: string;
    currencyCode: string;
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
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function ProjectDataField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-[8px] font-medium uppercase tracking-normal text-tertiary">{label}</span>
      {children}
    </label>
  );
}

function ProjectTimestampField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5 px-2 py-1.5">
      <span className="block text-[8px] font-medium uppercase tracking-normal text-gray-400">{label}</span>
      <p className="truncate text-[8px] font-medium leading-3 text-tertiary">{value}</p>
    </div>
  );
}

function ProjectDashboardLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-xs border border-divider bg-white px-2 !text-[10px] font-medium leading-none text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      {icon}
      {label}
    </Link>
  );
}

function AutoSubmitForm({
  projectId,
  projectImageUrl,
  children,
}: {
  projectId: string;
  projectImageUrl?: string;
  children: React.ReactNode;
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
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
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
  const projectId = project?.id ?? fallback.id;
  const projectRoute = `/workshop/projects/${projectId}`;

  return (
    <section className="flex h-full min-h-0 justify-start bg-white" aria-label={`${name} project information`}>
      <aside className="flex h-full w-[274px] shrink-0 flex-col border-r border-hairline bg-white" aria-label="Editable project details">
        <AutoSubmitForm projectId={projectId} projectImageUrl={metadata.projectImageUrl}>
          <input type="hidden" name="projectCode" value={projectCode} />
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto py-2 pl-4 pr-2">
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

            <input type="hidden" name="currencyCode" value="PHP" />

            <ProjectDataField label="Project address">
              <textarea
                name="location"
                defaultValue={location}
                placeholder="Project address"
                className="min-h-12 w-full resize-y rounded-xs border border-transparent bg-white/70 px-2 py-1 !text-[10px] font-medium leading-3 text-secondary outline-none transition hover:border-hairline focus:border-accent focus:bg-accentSoft"
              />
            </ProjectDataField>
          </div>

          <div className="grid grid-cols-2 divide-x divide-hairline border-t border-hairline pt-1">
            <ProjectTimestampField label="Created" value={formatDate(project?.created_at)} />
            <ProjectTimestampField label="Updated" value={formatDate(project?.updated_at)} />
          </div>
        </AutoSubmitForm>
      </aside>
      <main className="min-h-0 flex-1 overflow-auto p-2" aria-label="Project dashboard next steps">
        <EmptyState
          icon={<ClipboardText size={18} weight="regular" aria-hidden="true" />}
          title="Build this project from estimates"
          description="Open the estimate list to create your first sheet, use Charts to review cost mix, or return to Projects when you are choosing another job."
          action={
            <div className="flex flex-wrap items-center justify-center gap-1">
              <ProjectDashboardLink
                href={`${projectRoute}/estimates`}
                label="Open estimates"
                icon={<ListChecks size={12} weight="regular" aria-hidden="true" />}
              />
              <ProjectDashboardLink
                href={`${projectRoute}/charts`}
                label="View charts"
                icon={<ChartPieSlice size={12} weight="regular" aria-hidden="true" />}
              />
              <ProjectDashboardLink
                href="/workshop/projects"
                label="All projects"
                icon={<ClipboardText size={12} weight="regular" aria-hidden="true" />}
              />
            </div>
          }
          className="h-full bg-white"
        />
      </main>
    </section>
  );
}
