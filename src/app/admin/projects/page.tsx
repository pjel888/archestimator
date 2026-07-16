import { Card } from "@/components/ui/card";
import { AdminProjectsTable } from "@/components/admin/AdminProjectsTable";
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
        <AdminProjectsTable projects={projects} />
      </Card>
    </div>
  );
}
