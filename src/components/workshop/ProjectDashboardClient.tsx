"use client";

import { useMemo, useRef, useTransition } from "react";

import { ControlInput } from "@/components/ui/control-input";
import { dispatchProjectBudgetChange } from "@/components/workshop/ProjectTotalHeader";
import { updateProjectDetails } from "@/lib/projects/actions";
import type { Json, Tables } from "@/lib/supabase/types";

type ProjectMetadata = {
  projectBudget?: number;
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
    projectBudget: typeof record.projectBudget === "number" ? record.projectBudget : undefined,
    projectImageUrl: typeof record.projectImageUrl === "string" ? record.projectImageUrl : undefined,
  };
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatBudgetInput(value?: number) {
  if (typeof value !== "number") return "";
  return new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function parseBudgetInput(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
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
      <span className="block text-[8px] font-bold uppercase tracking-[0.12em] text-tertiary">{label}</span>
      {children}
    </label>
  );
}

function ProjectTimestampField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5 px-2 py-1.5">
      <span className="block text-[6px] font-semibold uppercase tracking-[0.12em] text-gray-400">{label}</span>
      <p className="truncate text-[8px] font-medium leading-3 text-tertiary">{value}</p>
    </div>
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
                className="h-8 w-full px-2 text-[10px] font-semibold text-ink"
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

            <ProjectDataField label="Planned project budget">
              <div className="relative">
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-tertiary">₱</span>
                <ControlInput
                  name="projectBudget"
                  type="text"
                  inputMode="decimal"
                  defaultValue={formatBudgetInput(metadata.projectBudget)}
                  placeholder="0.00"
                  align="left"
                  className="h-8 w-full px-2 pl-5 text-left text-[10px] font-semibold tabular-nums text-secondary"
                  onChange={(event) => dispatchProjectBudgetChange(parseBudgetInput(event.currentTarget.value))}
                />
              </div>
            </ProjectDataField>
            <input type="hidden" name="currencyCode" value="PHP" />

            <ProjectDataField label="Project address">
              <textarea
                name="location"
                defaultValue={location}
                placeholder="Project address"
                className="min-h-12 w-full resize-y rounded-sm border border-transparent bg-white/70 px-2 py-1 !text-[10px] font-medium leading-3 text-secondary outline-none transition hover:border-hairline focus:border-accent focus:bg-accentSoft"
              />
            </ProjectDataField>
          </div>

          <div className="grid grid-cols-2 divide-x divide-hairline border-t border-hairline pt-1">
            <ProjectTimestampField label="Created" value={formatDate(project?.created_at)} />
            <ProjectTimestampField label="Updated" value={formatDate(project?.updated_at)} />
          </div>
        </AutoSubmitForm>
      </aside>
    </section>
  );
}
