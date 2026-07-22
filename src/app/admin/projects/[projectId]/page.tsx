import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import { AdminOverviewStrip, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin/datetime";
import {
  getAdminProjectOverview,
  listAdminProjectActivity,
  listAdminProjectEstimates,
  listAdminProjectMembers,
} from "@/lib/admin/projects-overview-repository";

function statusTone(status: "ongoing" | "completed" | "archived") {
  if (status === "ongoing") return "success" as const;
  if (status === "completed") return "neutral" as const;
  return "warning" as const;
}

function humanize(value: string | null) {
  if (!value) return "—";
  return value.replaceAll("_", " ").replace(/\b\w/gu, (character) => character.toUpperCase());
}

function formatMoney(value: number | null, currencyCode: string) {
  if (value === null) return "—";
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toLocaleString("en-PH")}`;
  }
}

function userHref(profileId: string | null, email: string | null) {
  if (profileId) return `/admin/users/${profileId}`;
  if (email) return `/admin/users?search=${encodeURIComponent(email)}`;
  return null;
}

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const [project, estimates, members, activity] = await Promise.all([
    getAdminProjectOverview(projectId),
    listAdminProjectEstimates(projectId),
    listAdminProjectMembers(projectId),
    listAdminProjectActivity(projectId),
  ]);

  if (!project) notFound();

  const ownerLink = userHref(project.owner_profile_id, project.owner_email);
  const metadata = (() => {
    try {
      const parsed = JSON.parse(project.metadata) as unknown;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return project.metadata;
    }
  })();

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow={
          <>
            <Link href="/admin/projects" className="hover:text-ink">Projects</Link>
            {" / "}
            {project.name}
          </>
        }
        title={project.name}
        description="Read-only Project 360 with ownership, commercial brief, delivery activity, team access, estimates, and client sharing."
        actions={
          <>
            <Badge tone={statusTone(project.status)} size="xs" className="min-w-0 px-1.5">{project.status}</Badge>
            <Link
              href={`/workshop/projects/${project.id}`}
              className="inline-flex min-h-7 items-center gap-1 rounded-xs border border-hairline px-2 text-[10px] font-medium text-ink hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Open in Workshop <ArrowSquareOut size={12} aria-hidden />
            </Link>
          </>
        }
      />

      <AdminOverviewStrip
        items={[
          {
            label: "Owner",
            value: ownerLink ? <Link href={ownerLink} className="hover:underline">{project.owner_display_name ?? project.owner_email ?? "Unresolved"}</Link> : project.owner_display_name ?? "Unresolved",
            detail: project.owner_source === "creator" ? "creator fallback" : "project member",
          },
          { label: "Estimates", value: project.estimate_count, detail: `${project.member_count} team records` },
          { label: "Client shares", value: project.publication_count, detail: `${project.publication_open_count} opens` },
          { label: "Last activity", value: formatAdminDate(project.last_activity_at), detail: project.workspace_name ?? "workspace" },
        ]}
      />

      <section className="grid gap-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]" aria-label="Project context">
        <Card className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[11px] font-medium leading-4 text-ink">Project brief</h2>
              <p className="mt-0.5 text-[9px] leading-3 text-tertiary">Commercial and delivery context stored on the project record.</p>
            </div>
            <span className="text-[9px] leading-3 text-tertiary">Updated {formatAdminDateTime(project.updated_at)}</span>
          </div>
          <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Client", project.client_name ?? "—"],
              ["Project code", project.project_code ?? "—"],
              ["Location", project.location_label ?? project.location ?? "—"],
              ["Project type", humanize(project.project_type)],
              ["Phase", humanize(project.project_phase)],
              ["Procurement", humanize(project.procurement_status)],
              ["Market region", project.market_region ?? "—"],
              ["Gross floor area", project.gross_floor_area === null ? "—" : `${project.gross_floor_area.toLocaleString("en-PH")} ${project.floor_area_unit ?? ""}`.trim()],
              ["Target budget", formatMoney(project.target_budget, project.currency_code)],
              ["Budget basis", project.budget_basis_date ? formatAdminDate(project.budget_basis_date) : "—"],
              ["Currency", project.currency_code],
              ["Created", formatAdminDateTime(project.created_at)],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 border-b border-hairline pb-2 last:border-b-0 sm:last:border-b">
                <dt className="text-[8px] font-medium uppercase leading-3 text-tertiary">{label}</dt>
                <dd className="mt-0.5 break-words text-[10px] leading-4 text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-3">
          <h2 className="text-[11px] font-medium leading-4 text-ink">Ownership and workspace</h2>
          <div className="mt-3 rounded-xs border border-hairline bg-surfaceMuted/60 p-2.5">
            <p className="text-[8px] font-medium uppercase leading-3 text-tertiary">Primary owner</p>
            {ownerLink ? (
              <Link href={ownerLink} className="mt-0.5 block text-[11px] font-medium leading-4 text-ink hover:underline">
                {project.owner_display_name ?? project.owner_email}
              </Link>
            ) : <p className="mt-0.5 text-[11px] font-medium leading-4 text-ink">Unresolved owner</p>}
            <p className="text-[9px] leading-3 text-tertiary">{project.owner_email ?? project.owner_raw_id ?? "No identity recorded"}</p>
            <p className="mt-1 text-[9px] leading-3 text-secondary">
              {project.owner_source === "project_member" ? "Explicit project owner membership." : "No explicit owner membership; using the recorded project creator."}
            </p>
          </div>

          <dl className="mt-3 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-[10px] leading-4">
            <dt className="text-tertiary">Workspace</dt>
            <dd className="min-w-0 break-words text-ink">{project.workspace_name ?? "Unnamed workspace"}</dd>
            <dt className="text-tertiary">Recorded creator</dt>
            <dd className="min-w-0 break-words text-ink">{project.creator_display_name ?? project.creator_email ?? project.created_by ?? "—"}</dd>
            <dt className="text-tertiary">Team records</dt>
            <dd className="text-ink">{members.length}</dd>
            <dt className="text-tertiary">Location source</dt>
            <dd className="text-ink">{project.location_source ? humanize(project.location_source) : "Text field only"}</dd>
          </dl>

          <details className="mt-3 border-t border-hairline pt-2">
            <summary className="cursor-pointer text-[9px] font-medium leading-4 text-secondary hover:text-ink">Record identifiers and metadata</summary>
            <dl className="mt-2 grid grid-cols-[6rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-[9px] leading-3">
              <dt className="text-tertiary">Project ID</dt><dd className="break-all text-tertiary">{project.id}</dd>
              <dt className="text-tertiary">Workspace ID</dt><dd className="break-all text-tertiary">{project.workspace_id}</dd>
              <dt className="text-tertiary">Owner ID</dt><dd className="break-all text-tertiary">{project.owner_raw_id ?? "—"}</dd>
              <dt className="text-tertiary">Source revision</dt><dd className="text-ink">{project.publication_source_revision}</dd>
            </dl>
            {metadata !== "{}" ? <pre className="mt-2 max-h-40 overflow-auto rounded-xs bg-surfaceMuted p-2 text-[8px] leading-3 text-secondary">{metadata}</pre> : null}
          </details>
        </Card>
      </section>

      <section className="grid gap-2 xl:grid-cols-2" aria-label="Project delivery records">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-2 border-b border-hairline p-3">
            <div>
              <h2 className="text-[11px] font-medium leading-4 text-ink">Team access</h2>
              <p className="text-[9px] leading-3 text-tertiary">Explicit project memberships, separate from creator fallback.</p>
            </div>
            <Badge tone="neutral" size="xs" className="min-w-0 px-1">{members.length}</Badge>
          </div>
          {members.length === 0 ? (
            <div className="p-3 text-[10px] leading-4 text-tertiary">No explicit project members. Ownership resolves from the recorded creator.</div>
          ) : (
            <ul>
              {members.map((member) => {
                const href = userHref(member.profile_id, member.email);
                return (
                  <li key={member.user_id} className="flex items-center justify-between gap-3 border-b border-hairline px-3 py-2 last:border-b-0">
                    <div className="min-w-0">
                      {href ? <Link href={href} className="truncate text-[10px] font-medium leading-4 text-ink hover:underline">{member.display_name ?? member.email ?? member.user_id}</Link> : <p className="truncate text-[10px] font-medium leading-4 text-ink">{member.display_name ?? member.user_id}</p>}
                      <p className="truncate text-[8px] leading-3 text-tertiary">{member.email ?? member.user_id}</p>
                    </div>
                    <Badge tone={member.role === "owner" ? "success" : "neutral"} size="xs" className="min-w-0 px-1">{member.role}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-2 border-b border-hairline p-3">
            <div>
              <h2 className="text-[11px] font-medium leading-4 text-ink">Estimate portfolio</h2>
              <p className="text-[9px] leading-3 text-tertiary">Sheets owned by this project and their recorded creators.</p>
            </div>
            <Badge tone="neutral" size="xs" className="min-w-0 px-1">{estimates.length}</Badge>
          </div>
          {estimates.length === 0 ? (
            <div className="p-3 text-[10px] leading-4 text-tertiary">No estimates have been created.</div>
          ) : (
            <ul>
              {estimates.map((estimate) => (
                <li key={estimate.id} className="border-b border-hairline px-3 py-2 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/workshop/projects/${project.id}/estimates`} className="truncate text-[10px] font-medium leading-4 text-ink hover:underline">{estimate.name}</Link>
                      <p className="truncate text-[8px] leading-3 text-tertiary">{estimate.sheet_code || "No sheet code"} · {estimate.creator_display_name ?? estimate.creator_email ?? "Unknown creator"}</p>
                    </div>
                    <span className="shrink-0 text-[9px] leading-3 text-tertiary">{formatAdminDate(estimate.updated_at)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[9px] leading-3 text-secondary">
                    <span>{formatMoney(estimate.project_budget, estimate.currency_code)}</span>
                    <span>{estimate.currency_code}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b border-hairline p-3">
          <div>
            <h2 className="text-[11px] font-medium leading-4 text-ink">Project activity</h2>
            <p className="text-[9px] leading-3 text-tertiary">Latest estimate, collaboration, activation, and publication records.</p>
          </div>
          <Badge tone="neutral" size="xs" className="min-w-0 px-1">{activity.length}</Badge>
        </div>
        {activity.length === 0 ? (
          <div className="p-3 text-[10px] leading-4 text-tertiary">No recorded project events.</div>
        ) : (
          <ol>
            {activity.map((event) => {
              const actorHref = userHref(event.actor_profile_id, event.actor_email);
              return (
                <li key={`${event.source}-${event.id}`} className="grid gap-1 border-b border-hairline px-3 py-2 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(8rem,auto)] sm:items-center">
                  <time dateTime={event.occurred_at} className="text-[9px] leading-3 text-tertiary">{formatAdminDateTime(event.occurred_at)}</time>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-medium leading-4 text-ink">{humanize(event.event_type)}</p>
                    <p className="truncate text-[8px] leading-3 text-tertiary">{event.subject} · {event.source}</p>
                  </div>
                  {actorHref ? <Link href={actorHref} className="truncate text-[9px] leading-3 text-secondary hover:underline sm:text-right">{event.actor_display_name ?? event.actor_email}</Link> : <span className="truncate text-[9px] leading-3 text-tertiary sm:text-right">{event.actor_display_name ?? event.actor_email ?? "System"}</span>}
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </AdminPage>
  );
}
