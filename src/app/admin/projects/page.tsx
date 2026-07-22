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
        title="Project directory"
        description="Inspect ownership, customer context, delivery status, estimates, sharing, and recent project activity."
      />

      <Card className="overflow-hidden p-0">
        <AdminProjectsTable projects={projects} />
      </Card>
    </AdminPage>
  );
}
