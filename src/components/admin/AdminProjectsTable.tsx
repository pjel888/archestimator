"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowSquareOut, Buildings, User, UsersThree } from "@phosphor-icons/react/dist/ssr";

import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminOverviewStrip } from "@/components/admin/AdminPage";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { formatAdminDate } from "@/lib/admin/datetime";
import type { AdminProjectOverviewRow } from "@/lib/admin/projects-overview-repository";
import { cn } from "@/lib/ui/cn";

type ProjectFilter = "all" | AdminProjectOverviewRow["status"];

const projectFilters: Array<{ id: ProjectFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "ongoing", label: "Ongoing" },
  { id: "completed", label: "Completed" },
  { id: "archived", label: "Archived" },
];

function projectStatusTone(status: AdminProjectOverviewRow["status"]) {
  if (status === "ongoing") return "success" as const;
  if (status === "completed") return "neutral" as const;
  return "warning" as const;
}

function ownerHref(project: AdminProjectOverviewRow) {
  if (project.owner_profile_id) return `/admin/users/${project.owner_profile_id}`;
  if (project.owner_email) return `/admin/users?search=${encodeURIComponent(project.owner_email)}`;
  return null;
}

function OwnerIdentity({ project }: { project: AdminProjectOverviewRow }) {
  const href = ownerHref(project);
  const content = (
    <>
      <p className="truncate text-[10px] font-medium leading-4 text-ink">
        {project.owner_display_name ?? project.owner_email ?? "Unresolved owner"}
      </p>
      <p className="truncate text-[8px] leading-3 text-tertiary">
        {project.owner_email ?? project.owner_raw_id ?? "No creator recorded"}
      </p>
    </>
  );

  return href ? <Link href={href} className="block min-w-0 hover:underline">{content}</Link> : <div>{content}</div>;
}

function ProjectMobileCard({ project }: { project: AdminProjectOverviewRow }) {
  return (
    <article className="border-b border-hairline p-3 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/admin/projects/${project.id}`} className="truncate text-[11px] font-medium leading-4 text-ink hover:underline">
            {project.name}
          </Link>
          <p className="truncate text-[9px] leading-3 text-tertiary">
            {[project.project_code, project.client_name, project.location_label ?? project.location].filter(Boolean).join(" · ") || "No project brief yet"}
          </p>
        </div>
        <Badge tone={projectStatusTone(project.status)} size="xs" className="min-w-0 px-1">
          {project.status}
        </Badge>
      </div>

      <div className="mt-2 rounded-xs bg-surfaceMuted/70 p-2">
        <div className="flex items-start gap-2">
          <User size={13} className="mt-0.5 shrink-0 text-tertiary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-medium uppercase leading-3 text-tertiary">Owner</p>
            <OwnerIdentity project={project} />
          </div>
        </div>
        <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-dividerSibling/60 pt-2">
          <div>
            <dt className="text-[8px] font-medium uppercase leading-3 text-tertiary">Estimates</dt>
            <dd className="text-[10px] leading-4 text-ink">{project.estimate_count}</dd>
          </div>
          <div>
            <dt className="text-[8px] font-medium uppercase leading-3 text-tertiary">Team</dt>
            <dd className="text-[10px] leading-4 text-ink">{project.member_count}</dd>
          </div>
          <div>
            <dt className="text-[8px] font-medium uppercase leading-3 text-tertiary">Shares</dt>
            <dd className="text-[10px] leading-4 text-ink">{project.publication_count}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[9px] leading-3 text-tertiary">Updated {formatAdminDate(project.last_activity_at)}</span>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/admin/projects/${project.id}`}
            className="inline-flex min-h-7 items-center gap-1 rounded-xs border border-hairline px-2 text-[10px] font-medium text-ink hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            View 360
          </Link>
          <Link
            href={`/workshop/projects/${project.id}`}
            className="inline-flex size-7 items-center justify-center rounded-xs border border-hairline text-secondary hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            aria-label={`Open ${project.name} in Workshop`}
          >
            <ArrowSquareOut size={13} aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function AdminProjectsTable({ projects }: { projects: AdminProjectOverviewRow[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProjectFilter>("all");

  const visibleProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (filter !== "all" && project.status !== filter) return false;
      if (!query) return true;
      return [
        project.name,
        project.project_code,
        project.client_name,
        project.location,
        project.location_label,
        project.owner_email,
        project.owner_display_name,
        project.workspace_name,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [filter, projects, search]);

  const counts = useMemo(() => ({
    ongoing: projects.filter((project) => project.status === "ongoing").length,
    estimates: projects.reduce((total, project) => total + project.estimate_count, 0),
    owners: new Set(projects.map((project) => project.owner_email ?? project.owner_raw_id).filter(Boolean)).size,
  }), [projects]);

  const columns = useMemo<ColumnDef<AdminProjectOverviewRow, unknown>[]>(
    () => [
      {
        id: "project",
        accessorFn: (row) => `${row.name} ${row.project_code ?? ""} ${row.client_name ?? ""}`,
        header: "Project",
        cell: ({ row }) => (
          <Link href={`/admin/projects/${row.original.id}`} className="block max-w-72 hover:underline">
            <p className="truncate text-[10px] font-medium leading-4 text-ink">{row.original.name}</p>
            <p className="truncate text-[8px] leading-3 text-tertiary">
              {[row.original.project_code, row.original.client_name].filter(Boolean).join(" · ") || "No code or client"}
            </p>
          </Link>
        ),
      },
      {
        id: "owner",
        accessorFn: (row) => `${row.owner_display_name ?? ""} ${row.owner_email ?? ""}`,
        header: "Owner",
        cell: ({ row }) => <div className="max-w-56"><OwnerIdentity project={row.original} /></div>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={projectStatusTone(row.original.status)} size="xs" className="min-w-0 px-1">
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "portfolio",
        header: "Portfolio",
        accessorFn: (row) => row.estimate_count,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-[9px] leading-3 text-tertiary">
            <span className="inline-flex items-center gap-1"><Buildings size={11} aria-hidden />{row.original.estimate_count}</span>
            <span className="inline-flex items-center gap-1"><UsersThree size={11} aria-hidden />{row.original.member_count}</span>
          </div>
        ),
      },
      {
        accessorKey: "last_activity_at",
        header: "Last activity",
        cell: ({ row }) => <span className="text-[9px] leading-3 text-tertiary">{formatAdminDate(row.original.last_activity_at)}</span>,
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Link href={`/admin/projects/${row.original.id}`} className="inline-flex min-h-7 items-center rounded-xs border border-hairline px-2 text-[10px] font-medium text-ink hover:bg-surfaceMuted">
              View 360
            </Link>
            <Link href={`/workshop/projects/${row.original.id}`} className="inline-flex size-7 items-center justify-center rounded-xs border border-hairline text-secondary hover:bg-surfaceMuted hover:text-ink" aria-label={`Open ${row.original.name} in Workshop`}>
              <ArrowSquareOut size={13} aria-hidden />
            </Link>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-hairline p-2">
        <AdminOverviewStrip
          items={[
            { label: "Projects", value: projects.length, detail: "complete directory" },
            { label: "Ongoing", value: counts.ongoing },
            { label: "Estimates", value: counts.estimates },
            { label: "Recorded owners", value: counts.owners },
          ]}
        />

        <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch("")}
            placeholder="Search project, owner, client, or workspace…"
            aria-label="Filter projects"
            className="h-full"
            wrapperClassName="w-full border border-hairline bg-white lg:max-w-md"
          />
          <div className="flex flex-wrap items-center gap-1" aria-label="Filter projects by status">
            {projectFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={cn(
                  "min-h-7 rounded-xs border px-2 text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  filter === item.id ? "border-ink bg-ink text-white" : "border-hairline bg-white text-secondary hover:bg-surfaceMuted hover:text-ink",
                )}
              >
                {item.label}
              </button>
            ))}
            <span className="ml-1 text-[9px] leading-3 text-tertiary">{visibleProjects.length} shown</span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto md:hidden">
        {visibleProjects.length > 0 ? visibleProjects.map((project) => (
          <ProjectMobileCard key={project.id} project={project} />
        )) : <p className="p-4 text-center text-[10px] leading-4 text-tertiary">No projects match these filters.</p>}
      </div>

      <div className="hidden min-h-0 flex-1 p-2 md:flex">
        <AdminDataTable
          data={visibleProjects}
          columns={columns}
          getRowId={(row) => row.id}
          emptyMessage="No projects match these filters."
        />
      </div>
    </div>
  );
}
