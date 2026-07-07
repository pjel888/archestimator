import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("project status schema and list contracts", () => {
  it("adds a constrained D1 project status column with a list index", () => {
    const migration = read("migrations/0039_project_status.sql");

    expect(migration).toContain("ADD COLUMN status TEXT NOT NULL DEFAULT 'ongoing'");
    expect(migration).toContain("CHECK (status IN ('ongoing', 'completed', 'archived'))");
    expect(migration).toContain("idx_projects_workspace_status_updated");
    expect(migration).toContain("ON projects(workspace_id, status, updated_at DESC)");
  });

  it("reads and normalizes status through the workshop project list path", () => {
    const repository = read("src/lib/repositories/workspace-repository.ts");

    expect(repository).toContain(
      "id, workspace_id, created_by, name, client_name, location, project_code, currency_code, status, metadata, created_at, updated_at",
    );
    expect(repository).toContain("status: normalizeProjectStatus(project.status)");
    expect(repository).toContain("status: normalizeProjectStatus(value.status)");
  });

  it("updates project status through the authorized D1 server action", () => {
    const actions = read("src/lib/projects/actions.ts");

    expect(actions).toContain("export async function updateProjectStatus");
    expect(actions).toContain("canEditProjectInD1(database, projectId, currentUser)");
    expect(actions).toContain("SET status = ?");
    expect(actions).toContain("WHERE id = ? AND workspace_id = ?");
    expect(actions).toContain('emitProjectMetadataUpdatedEvent(projectId, ["status"])');
    expect(actions).toContain('revalidatePath("/workshop/projects")');
    expect(actions).toContain("revalidatePath(`/workshop/projects/${projectId}`)");
  });
});
