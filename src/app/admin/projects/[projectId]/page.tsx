import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getAdminProjectOverview,
  listAdminProjectEstimates,
} from "@/lib/admin/projects-overview-repository";

// F7 (UNIT-008) read-only Project 360.
export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const [project, estimates] = await Promise.all([
    getAdminProjectOverview(projectId),
    listAdminProjectEstimates(projectId),
  ]);

  if (!project) notFound();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">
          <Link href="/admin" className="hover:text-ink">Admin</Link>
          {" / "}
          {project.name}
        </p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">{project.name}</h1>
        <p className="text-[10px] leading-4 text-tertiary">
          Read-only project overview. Diagnostics, funnel, and publication links arrive in later slices.
        </p>
      </div>

      <section className="grid gap-2 md:grid-cols-2">
        <Card className="p-2">
          <h2 className="text-[11px] font-medium leading-4 text-ink">Project</h2>
          <dl className="mt-2 grid grid-cols-[100px_1fr] gap-x-2 gap-y-1 text-[10px] leading-4">
            <dt className="text-tertiary">Project code</dt>
            <dd className="text-ink">{project.project_code ?? "—"}</dd>
            <dt className="text-tertiary">Workspace</dt>
            <dd className="font-mono text-[9px] text-tertiary">{project.workspace_id}</dd>
            <dt className="text-tertiary">Created</dt>
            <dd className="text-ink">{new Date(project.created_at).toLocaleString()}</dd>
            <dt className="text-tertiary">Project ID</dt>
            <dd className="font-mono text-[9px] text-tertiary">{project.id}</dd>
          </dl>
        </Card>

        <Card className="p-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[11px] font-medium leading-4 text-ink">Estimates</h2>
            <Badge tone="neutral" size="xs" className="min-w-0 px-1">
              {estimates.length}
            </Badge>
          </div>
          {estimates.length === 0 ? (
            <p className="mt-2 text-[10px] leading-4 text-tertiary">No estimates.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {estimates.map((estimate) => (
                <li key={estimate.id} className="flex items-center justify-between gap-2 text-[10px] leading-4">
                  <Link
                    href={`/workshop/projects/${project.id}/estimates`}
                    className="truncate font-medium text-ink hover:underline"
                  >
                    {estimate.name}
                  </Link>
                  <span className="shrink-0 text-[9px] text-tertiary">
                    {new Date(estimate.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/workshop/projects/${project.id}`}
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium leading-4 text-ink hover:underline"
          >
            Open in Workshop →
          </Link>
        </Card>
      </section>
    </div>
  );
}
