import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { ClientPortalCreateForm } from "@/components/workshop/publisher/ClientPortalCreateForm";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { clientPortalComposeSearch } from "@/lib/client-portal/compose-entry";
import { listClientPortalsForProject } from "@/lib/client-portal/control-center-service";
import { assertProjectPublicationManager } from "@/lib/publication/actions";

export const dynamic = "force-dynamic";

type Query = {
  artifactVersionId?: string | string[];
  compose?: string;
  cursor?: string;
  estimateId?: string | string[];
  requestVersionId?: string | string[];
  status?: string;
};

function values(value: string | string[] | undefined) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

export default async function ClientPortalsPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<Query> }) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const manager = await assertProjectPublicationManager(projectId);
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Something went wrong. Try again in a moment.");
  const status = query.status === "draft" || query.status === "live" || query.status === "access_off" || query.status === "archived" ? query.status : "all";
  const portals = await listClientPortalsForProject({ actor: { kind: "internal", userId: manager.currentUserId, workspaceId: manager.project.workspace_id, projectId: manager.project.id, projectRole: "viewer", portalGrants: ["manager"] }, cursor: query.cursor, database, projectId: manager.project.id, status });
  const basePath = `/workshop/projects/${encodeURIComponent(projectId)}/client-portals`;
  const composeSearch = query.compose === "1" ? clientPortalComposeSearch({
    artifactVersionIds: values(query.artifactVersionId),
    estimateIds: values(query.estimateId),
    requestVersionIds: values(query.requestVersionId),
  }) : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-surfaceMuted/35 p-4 lg:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-secondary">Project</p><h1 className="mt-1 text-xl font-semibold text-ink">Client Portals</h1><p className="mt-1 text-sm text-secondary">Manage each client-facing portal separately from legacy share links.</p></div><ClientPortalCreateForm projectId={projectId} /></header>
      {composeSearch ? <div className="mb-4 rounded-xl border border-hairline bg-white p-4 text-sm text-secondary"><p className="font-medium text-ink">Choose a portal for this issue package</p><p className="mt-1">Your selected estimates, artifact versions, and request versions will be added to its active draft. Nothing is published yet.</p></div> : null}
      <div className="mb-4 flex flex-wrap gap-2">{["all", "draft", "live", "access_off", "archived"].map((value) => <Link key={value} href={value === "all" ? basePath : `${basePath}?status=${value}`} className={status === value ? "rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white" : "rounded-md bg-white px-3 py-1.5 text-xs font-medium text-secondary ring-1 ring-hairline"}>{value.replaceAll("_", " ")}</Link>)}</div>
      <div className="grid gap-3">
        {portals.rows.map((portal) => <Link key={portal.id} href={`${basePath}/${encodeURIComponent(portal.id)}${composeSearch ? `?${composeSearch}` : ""}`} className="rounded-xl border border-hairline bg-white p-4 shadow-sm transition hover:border-ink/30"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-ink">{portal.name}</h2><StatusBadge status={portal.status === "live" ? "active" : portal.status === "archived" ? "inactive" : "draft"}>{portal.status}</StatusBadge></div><div className="mt-2 grid gap-1 text-sm text-secondary sm:grid-cols-3"><span>{portal.current_issue_number ? `Issue ${portal.current_issue_number} · ${portal.current_issue_status}` : "No issued version"}</span><span>{portal.recipient_count} recipient{portal.recipient_count === 1 ? "" : "s"}</span><span>{portal.waiting_thread_count} waiting discussion{portal.waiting_thread_count === 1 ? "" : "s"}</span></div></Link>)}
        {!portals.rows.length ? <div className="rounded-xl border border-dashed border-hairline bg-white p-8 text-sm text-secondary">No Client Portals match this filter.</div> : null}
      </div>
      {portals.nextCursor ? <div className="mt-5"><Link href={`${basePath}?status=${status}&cursor=${encodeURIComponent(portals.nextCursor)}`} className="rounded-md bg-white px-3 py-2 text-sm font-medium text-ink ring-1 ring-hairline">Load more portals</Link></div> : null}
    </div>
  );
}
