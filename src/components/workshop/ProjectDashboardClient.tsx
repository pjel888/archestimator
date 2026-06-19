"use client";

import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ClipboardText, MapPin } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { updateProjectDetails } from "@/lib/projects/actions";
import type { ProjectPublicationStatus } from "@/lib/publication/types";
import type { ProjectRecentEstimateSheetSummary } from "@/lib/repositories/project-estimate-sheets-repository";
import type { Json, Tables } from "@/lib/supabase/types";

type ProjectMetadata = {
  readonly projectImageUrl?: string;
};

export type ProjectPublicationDashboardStatus = {
  readonly status: ProjectPublicationStatus;
  readonly clientLinkPath: string | null;
  readonly selectedEstimateCount: number;
  readonly passwordRequired: boolean;
  readonly latestOpenedAt: string | null;
  readonly openCount: number;
  readonly isStale: boolean;
  readonly canCopy: boolean;
  readonly canOpen: boolean;
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
  readonly recentSheets: ProjectRecentEstimateSheetSummary[];
  readonly publicationStatus: ProjectPublicationDashboardStatus;
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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatCompactDate(value?: string | null) {
  if (!value) return "No edits yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No edits yet";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function createEstimateHref(sheet: Pick<ProjectRecentEstimateSheetSummary, "projectId" | "firstNodeId">) {
  return sheet.firstNodeId
    ? `/workshop/projects/${sheet.projectId}/estimates/${sheet.firstNodeId}`
    : `/workshop/projects/${sheet.projectId}/estimates`;
}

function readCopyValue(clientLinkPath: string) {
  if (/^https?:\/\//.test(clientLinkPath)) return clientLinkPath;
  if (typeof window === "undefined") return clientLinkPath;
  return new URL(clientLinkPath, window.location.origin).toString();
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
      <span className="sr-only" role="status" aria-live="polite">
        {isPending ? "Saving project details" : ""}
      </span>
    </form>
  );
}

function ModuleShell({
  label,
  children,
  className = "",
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <section
      aria-label={label}
      className={[
        "flex min-h-[152px] min-w-0 flex-col rounded-xs border border-[color:var(--glass-border)] bg-white/50 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.54)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h2 className="text-[11px] font-medium leading-4 tracking-normal text-ink">{label}</h2>
      {children}
    </section>
  );
}

function RecentSheetsModule({
  projectId,
  sheets,
}: {
  readonly projectId: string;
  readonly sheets: ProjectRecentEstimateSheetSummary[];
}) {
  return (
    <ModuleShell label="Recent sheets">
      {sheets.length > 0 ? (
        <div className="mt-2 divide-y divide-[color:var(--glass-border)] overflow-hidden rounded-xs border border-[color:var(--glass-border)] bg-white/45">
          {sheets.map((sheet) => {
            const updatedLabel = formatCompactDate(sheet.updatedAt);
            return (
              <Link
                key={sheet.id}
                href={createEstimateHref(sheet)}
                aria-label={`Open ${sheet.name}, updated ${updatedLabel}`}
                className="group flex min-h-11 min-w-0 items-center justify-between gap-2 px-2 py-1.5 text-left transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-reduce:transition-none"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-medium leading-4 text-ink">{sheet.name}</span>
                  <span className="block truncate font-numeric text-[9px] leading-3 text-tertiary">
                    {sheet.sheetCode ?? "No sheet code"} · Updated {updatedLabel}
                  </span>
                </span>
                <ArrowUpRight
                  size={13}
                  weight="regular"
                  aria-hidden="true"
                  className="shrink-0 text-tertiary transition group-hover:text-ink"
                />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 flex min-h-20 flex-col justify-between rounded-xs border border-dashed border-[color:var(--glass-border)] bg-white/35 p-2">
          <p className="text-[10px] leading-4 text-secondary">No estimate sheets yet.</p>
          <Link
            href={`/workshop/projects/${projectId}/estimates`}
            className="mt-2 inline-flex min-h-8 w-fit items-center gap-1 rounded-xs border border-hairline bg-white/60 px-2 text-[10px] font-medium leading-none text-ink transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-reduce:transition-none"
          >
            Open estimates
            <ArrowUpRight size={12} weight="regular" aria-hidden="true" />
          </Link>
        </div>
      )}
    </ModuleShell>
  );
}

function PublishedLinkModule({ status }: { readonly status: ProjectPublicationDashboardStatus }) {
  const [copyStatus, setCopyStatus] = useState("");
  const statusLabel =
    status.status === "published"
      ? "Published"
      : status.status === "expired"
        ? "Expired"
        : status.status === "revoked"
          ? "Revoked"
          : "Unpublished";
  const latestOpenLabel = status.latestOpenedAt ? formatDate(status.latestOpenedAt) : "No opens yet";

  async function copyClientLink() {
    if (!status.clientLinkPath) return;
    try {
      await navigator.clipboard.writeText(readCopyValue(status.clientLinkPath));
      setCopyStatus("Client link copied");
    } catch {
      setCopyStatus("Client link copy failed");
    }
  }

  return (
    <ModuleShell label="Published link">
      <div className="mt-2 flex min-h-0 flex-1 flex-col justify-between gap-3">
        <div className="space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="rounded-xs border border-[color:var(--glass-border)] bg-white/60 px-1.5 py-1 text-[9px] font-medium leading-none text-ink">
              {statusLabel}
            </span>
            {status.passwordRequired ? (
              <span className="rounded-xs border border-[color:var(--glass-border)] bg-white/60 px-1.5 py-1 text-[9px] font-medium leading-none text-secondary">
                Password protected
              </span>
            ) : null}
            {status.isStale ? (
              <span className="rounded-xs border border-warning/30 bg-warningSoft px-1.5 py-1 text-[9px] font-medium leading-none text-warning">
                Snapshot stale
              </span>
            ) : null}
          </div>
          <dl className="grid grid-cols-2 gap-1.5 text-[9px] leading-3 text-tertiary">
            <div className="rounded-xs bg-white/35 p-1.5">
              <dt className="uppercase tracking-normal">Estimates</dt>
              <dd className="mt-0.5 font-numeric text-[10px] text-ink">{status.selectedEstimateCount}</dd>
            </div>
            <div className="rounded-xs bg-white/35 p-1.5">
              <dt className="uppercase tracking-normal">Opens</dt>
              <dd className="mt-0.5 font-numeric text-[10px] text-ink">{status.openCount}</dd>
            </div>
          </dl>
          <p className="text-[10px] leading-4 text-secondary">
            {status.status === "published"
              ? `Latest open: ${latestOpenLabel}`
              : "Use Share in the header to publish or manage a client link."}
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap gap-1.5">
          {status.canCopy && status.clientLinkPath ? (
            <Button size="sm" variant="primary" onClick={copyClientLink} aria-label="Copy published client link">
              <ClipboardText size={13} weight="regular" aria-hidden="true" />
              Copy link
            </Button>
          ) : null}
          {status.canOpen && status.clientLinkPath ? (
            <Link
              href={status.clientLinkPath}
              target="_blank"
              className="inline-flex min-h-8 min-w-[96px] items-center justify-center gap-1 rounded-xs border border-divider bg-surface px-2 py-1.5 !text-[10px] font-medium leading-none text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Open link
              <ArrowUpRight size={12} weight="regular" aria-hidden="true" />
            </Link>
          ) : null}
          <span className="sr-only" role="status" aria-live="polite">
            {copyStatus}
          </span>
        </div>
      </div>
    </ModuleShell>
  );
}

function EstimateActivityModule() {
  return (
    <ModuleShell label="Estimate activity">
      <div className="mt-2 flex min-h-20 flex-1 items-center rounded-xs border border-dashed border-[color:var(--glass-border)] bg-white/35 p-2">
        <p className="text-[10px] leading-4 text-secondary">
          Activity feed is deferred until the estimate-activity migration and RLS proof are complete.
        </p>
      </div>
    </ModuleShell>
  );
}

function LocationModule({ location }: { readonly location: string }) {
  return (
    <ModuleShell label="Location">
      <div className="mt-2 flex min-h-20 flex-1 flex-col justify-between rounded-xs border border-[color:var(--glass-border)] bg-white/35 p-2">
        <div className="flex min-w-0 gap-2">
          <MapPin size={14} weight="regular" aria-hidden="true" className="mt-0.5 shrink-0 text-tertiary" />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium leading-4 text-ink">{location || "No project address"}</p>
            <p className="mt-1 text-[10px] leading-4 text-secondary">No exact pin saved.</p>
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}

export function ProjectDashboardClient({
  project,
  fallback,
  recentSheets,
  publicationStatus,
}: ProjectDashboardClientProps) {
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
    <section className="flex h-full min-h-0 flex-col justify-start md:flex-row" aria-label={`${name} project information`}>
      <aside className="flex h-auto w-full shrink-0 flex-col p-2 md:h-full md:w-[274px]" aria-label="Project identity">
        <AutoSubmitForm projectId={projectId} projectImageUrl={metadata.projectImageUrl}>
          <input type="hidden" name="projectCode" value={projectCode} />
          <input type="hidden" name="currencyCode" value={currencyCode} />
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

              <ProjectDataField label="Project address">
                <textarea
                  name="location"
                  defaultValue={location}
                  placeholder="Project address"
                  className="min-h-12 w-full resize-y rounded-xs border border-transparent bg-white/70 px-2 py-1 !text-[10px] font-medium leading-3 text-secondary outline-none transition hover:border-hairline focus:border-accent focus:bg-accentSoft motion-reduce:transition-none"
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
        <section
          className="dashboard-glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-xs p-2"
          aria-label="Project command surface"
        >
          <div className="grid min-h-0 flex-1 gap-2 overflow-auto lg:grid-cols-2">
            <RecentSheetsModule projectId={projectId} sheets={recentSheets} />
            <PublishedLinkModule status={publicationStatus} />
            <EstimateActivityModule />
            <LocationModule location={location} />
          </div>
        </section>
      </main>
    </section>
  );
}
