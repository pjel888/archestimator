import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const repository = readFileSync(
  join(process.cwd(), "src/lib/repositories/workspace-repository.ts"),
  "utf8",
);
const page = readFileSync(
  join(process.cwd(), "src/app/workshop/projects/page.tsx"),
  "utf8",
);
const client = readFileSync(
  join(process.cwd(), "src/components/workshop/projects-page-client.tsx"),
  "utf8",
);

describe("project groups repository wiring (Part 7c, additive)", () => {
  test("exports the camelCase ProjectGroupSummary contract", () => {
    expect(repository).toContain("export type ProjectGroupSummary");
    expect(repository).toContain("accentId: string | null");
    expect(repository).toContain("position: number");
  });

  test("fetches groups and memberships inside the single listCurrentWorkspaceProjects batch (no N+1)", () => {
    const fnStart = repository.indexOf("export const listCurrentWorkspaceProjects = cache(");
    expect(fnStart).toBeGreaterThan(-1);
    const fnEnd = repository.indexOf("\nfunction mergeHomebaseRecords", fnStart);
    const body = repository.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);

    // Both D1 reads exist in this function...
    expect(body).toContain("FROM project_groups");
    expect(body).toContain("FROM project_group_memberships");

    // ...and they live in the SAME Promise.all wave as the favorites read, not a
    // new serial await. Anchor: the group reads must appear before the first
    // post-batch owned-project processing.
    const promiseAllIndex = body.indexOf("Promise.all([");
    const groupsReadIndex = body.indexOf("FROM project_groups");
    const membershipsReadIndex = body.indexOf("FROM project_group_memberships");
    const postBatchIndex = body.indexOf("const ownedProjectIds");
    expect(promiseAllIndex).toBeGreaterThan(-1);
    expect(postBatchIndex).toBeGreaterThan(-1);
    expect(groupsReadIndex).toBeGreaterThan(promiseAllIndex);
    expect(membershipsReadIndex).toBeGreaterThan(promiseAllIndex);
    expect(groupsReadIndex).toBeLessThan(postBatchIndex);
    expect(membershipsReadIndex).toBeLessThan(postBatchIndex);

    // Per-user + per-workspace scoping (mirrors favorites RLS predicate usage).
    expect(body).toContain("AND user_id = ?");
  });

  test("returns projectGroups additively alongside the existing keys", () => {
    expect(repository).toContain("projectGroups:");
    // Existing keys MUST remain — additive, never a rename.
    expect(repository).toContain("favoriteProjectIds:");
    expect(repository).toContain("projects: [");
  });

  test("stamps groupId on every project list item", () => {
    expect(repository).toContain("groupId:");
    // The internal list-item type carries the field.
    expect(repository).toContain("groupId: string | null");
    expect(repository).toContain("groupPosition: number | null");
  });

  test("resolves groupId to null for shared / non-owned list items (per-user membership scoping)", () => {
    // Memberships are read per-user (.eq("user_id", profile.id)), so the lookup
    // map only ever holds THIS user's group rows. Every stamp site MUST resolve a
    // miss to null — never undefined, never another user's group. Pin both the
    // per-user scoping on the read and the null-default at the stamp site.
    expect(repository).toContain("FROM project_group_memberships");
    expect(repository).toContain("groupMembershipByProjectId.get(project.id)?.group_id ?? null");
    expect(repository).toContain("groupMembershipByProjectId.get(project.id)?.position ?? null");
    // The synthetic pending-invite item (never in a user group) defaults to null too.
    expect(repository).toContain("groupId: null");
    expect(repository).toContain("groupPosition: null");
  });

  test("client ProjectListItem and page wiring expose groups additively", () => {
    expect(client).toContain("groupId?: string | null");
    expect(page).toContain("projectGroups");
    expect(page).toContain("favoriteProjectIds"); // existing prop preserved
  });
});
