"use client";

import { useMemo, useRef, useTransition, type ReactNode } from "react";

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

          <div className="grid grid-cols-2 divide-x divide-hairline border-t border-hairline pt-1">
            <ProjectTimestampField label="Created" value={formatDate(project?.created_at)} />
            <ProjectTimestampField label="Updated" value={formatDate(project?.updated_at)} />
          </div>
        </AutoSubmitForm>
      </aside>
      <main className="min-h-0 flex-1 overflow-auto bg-white" aria-label="Project dashboard empty page" />
    </section>
  );
}
