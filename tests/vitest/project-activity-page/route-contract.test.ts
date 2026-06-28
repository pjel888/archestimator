import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("project activity route contracts", () => {
  it("keeps the load-more API authenticated, editor-gated, and no-store", () => {
    const source = readFileSync("src/app/api/projects/[projectId]/activity/route.ts", "utf8");

    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).toContain("requireCurrentUserContext()");
    expect(source).toContain('rpc("can_edit_project"');
    expect(source).toContain('"Cache-Control": "private, no-store, max-age=0"');
    expect(source).toContain("readProjectActivityFeed");
    expect(source).not.toContain('Cache-Control": "public');
    expect(source).not.toContain("service_role");
    expect(source).not.toContain("supabaseAdmin");
  });

  it("keeps cursor out of canonical client URL state and uses it only for load more", () => {
    const source = readFileSync("src/components/workshop/project-activity/ProjectActivityClient.tsx", "utf8");

    expect(source).toContain("serializeActivityPageState(initialState)");
    expect(source).toContain('params.set("cursor", nextCursor)');
    expect(source).toContain("router.replace(nextStateUrl(pathname, nextState), { scroll: false })");
    expect(source).not.toContain('router.replace(`${pathname}?cursor=');
  });

  it("keeps the activity page under the project edit gate before prefetching activity", () => {
    const source = readFileSync("src/app/workshop/projects/[projectId]/activity/page.tsx", "utf8");

    expect(source).toContain("requireCurrentUserContext()");
    expect(source).toContain('rpc("can_edit_project"');
    expect(source).toContain("if (!canEdit)");
    expect(source).toContain("readProjectActivityFeed");
  });
});
