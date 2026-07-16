import Link from "next/link";

import { Card } from "@/components/ui/card";
import { listAdminProjects } from "@/lib/admin/projects-overview-repository";

// F7 (UNIT-008) Projects list — entry point to read-only Project 360 views.
export default async function AdminProjectsPage() {
  const projects = await listAdminProjects();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Projects</h1>
        <p className="text-[10px] leading-4 text-tertiary">
          Read-only. Use search (⌘K) to find a project by name or code.
        </p>
      </div>

      <Card className="p-2">
        {projects.length === 0 ? (
          <p className="text-[10px] leading-4 text-tertiary">No projects found.</p>
        ) : (
          <ul className="space-y-1">
            {projects.map((project) => (
              <li key={project.id} className="flex items-center justify-between gap-2 border-b border-hairline pb-1 text-[10px] leading-4 last:border-b-0">
                <Link href={`/admin/projects/${project.id}`} className="truncate font-medium text-ink hover:underline">
                  {project.name}
                </Link>
                <span className="shrink-0 text-[9px] text-tertiary">
                  {project.project_code ? `${project.project_code} · ` : ""}
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
