import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationsDir = join(process.cwd(), "supabase/migrations");

function readMigrationContaining(fragment: string): string {
  const match = readdirSync(migrationsDir)
    .filter((name) => name.includes(fragment))
    .sort()
    .pop();
  if (!match) throw new Error(`No migration file matching "${fragment}"`);
  return readFileSync(join(migrationsDir, match), "utf8");
}

const allowDeletionMigration = readMigrationContaining("allow_project_deletion_with_active_publications");
const publicationMigration = readMigrationContaining("project_client_publication");

describe("project deletion with active publications", () => {
  it("reclassifies an active published shared link from a hard blocker to a warning", () => {
    // The whole point of the fix: an active publication must no longer set the
    // project state to 'blocked' (which forced ok=false and refused deletion).
    expect(allowDeletionMigration).toContain("create or replace function public.preview_bulk_delete_projects");
    expect(allowDeletionMigration).toContain("'active_publication'");
    // Regression guard: the project CASE must not block on an active publication.
    expect(allowDeletionMigration).not.toContain("when ap.project_id is not null then 'blocked'");
  });

  it("surfaces the active link as an informational, revoke-on-delete warning", () => {
    expect(allowDeletionMigration).toContain("active published shared link that will be revoked upon deletion");
    expect(allowDeletionMigration).toContain("warningsCount");
  });

  it("keeps deletion eligible when nothing is genuinely blocked", () => {
    // ok stays true as long as there is at least one eligible id and zero blockers;
    // active-publication projects are eligible, so a normal delete proceeds.
    expect(allowDeletionMigration).toContain("cardinality(eligible_ids) > 0 and jsonb_array_length(blocked) = 0");
  });

  it("still scopes active publications to live, unrevoked, unexpired links", () => {
    expect(allowDeletionMigration).toContain("status = 'published'");
    expect(allowDeletionMigration).toContain("revoked_at is null");
    expect(allowDeletionMigration).toContain("pp.expires_at > now()");
  });

  it("restricts the preview RPC to authenticated callers", () => {
    expect(allowDeletionMigration).toContain("revoke execute on function public.preview_bulk_delete_projects(uuid[], uuid) from public, anon");
    expect(allowDeletionMigration).toContain("grant execute on function public.preview_bulk_delete_projects(uuid[], uuid) to authenticated");
  });

  it("does not disclose project names for preview rows the caller cannot manage", () => {
    expect(allowDeletionMigration).toContain("when p.id is not null and public.can_manage_project_access(r.id) then p.name");
    expect(allowDeletionMigration).toContain("else null");
  });

  it("persists active-publication warning context in the deletion audit metadata", () => {
    expect(allowDeletionMigration).toContain("create or replace function public.execute_bulk_delete_projects");
    expect(allowDeletionMigration).toContain("metadata");
    expect(allowDeletionMigration).toContain("jsonb_build_object('warnings', coalesce(preview->'issues', '[]'::jsonb))");
  });

  it("guarantees publications cascade away when the project row is deleted", () => {
    // Deleting the project must clean up its publications automatically, otherwise
    // the FK would raise and deletion would fail even with ok=true.
    expect(publicationMigration).toContain("references public.projects(id, workspace_id)");
    expect(publicationMigration).toContain("on delete cascade");
  });
});
