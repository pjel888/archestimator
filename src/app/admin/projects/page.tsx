import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { Card } from "@/components/ui/card";
import { AdminProjectsTable } from "@/components/admin/AdminProjectsTable";
import { listAdminProjects } from "@/lib/admin/projects-overview-repository";

// F7 (UNIT-008) Projects list — entry point to read-only Project 360 views.
export default async function AdminProjectsPage() {
  const projects = await listAdminProjects();

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin"
        title="Projects"
        description="Read-only. Use search (⌘K) to find a project by name or code."
      />

      <Card className="p-2">
        <AdminProjectsTable projects={projects} />
      </Card>
    </AdminPage>
  );
}
