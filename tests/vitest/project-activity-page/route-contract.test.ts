import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  canEditProjectInD1: vi.fn(),
  getCloudflareD1Database: vi.fn(),
  getCurrentWorkspaceProject: vi.fn(),
  listProjectEstimatesForDropdown: vi.fn(),
  listProjectMembersForDropdown: vi.fn(),
  listProjectRecipientsForDropdown: vi.fn(),
  readProjectActivityFeed: vi.fn(),
  requireCurrentUserContext: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: routeMocks.requireCurrentUserContext,
}));

vi.mock("@/lib/authz/d1-access", () => ({
  canEditProjectInD1: routeMocks.canEditProjectInD1,
}));

vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: routeMocks.getCloudflareD1Database,
}));

vi.mock("@/lib/repositories/project-activity-feed-repository", () => ({
  listProjectEstimatesForDropdown: routeMocks.listProjectEstimatesForDropdown,
  listProjectMembersForDropdown: routeMocks.listProjectMembersForDropdown,
  listProjectRecipientsForDropdown: routeMocks.listProjectRecipientsForDropdown,
  readProjectActivityFeed: routeMocks.readProjectActivityFeed,
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  getCurrentWorkspaceProject: routeMocks.getCurrentWorkspaceProject,
}));

vi.mock("@/components/workshop/project-activity/ProjectActivityClient", () => ({
  ProjectActivityClient: () => null,
}));

vi.mock("@/lib/perf/server-timing", () => ({
  traced: (_name: string, operation: () => unknown) => operation(),
  withPerfTraceRequest: (_name: string, operation: () => unknown) => operation(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const SHARED_WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const DEFAULT_WORKSPACE_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "44444444-4444-4444-8444-444444444444";

describe("project activity route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the load-more API authenticated, editor-gated, and no-store", () => {
    const source = readFileSync("src/app/api/projects/[projectId]/activity/route.ts", "utf8");

    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).toContain("requireCurrentUserContext()");
    expect(source).toContain("canEditProjectInD1");
    expect(source).toContain("getCloudflareD1Database");
    expect(source).toContain('"Cache-Control": "private, no-store, max-age=0"');
    expect(source).toContain("readProjectActivityFeed");
    expect(source).not.toContain('Cache-Control": "public');
    expect(source).not.toContain("createSupabaseServerClient");
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
    expect(source).toContain("canEditProjectInD1");
    expect(source).toContain("getCloudflareD1Database");
    expect(source).toContain("if (!canEdit)");
    expect(source).toContain("readProjectActivityFeed");
    expect(source).not.toContain("createSupabaseServerClient");
  });

  it("loads activity for a shared target project outside the user's default workspace", async () => {
    const db = {};
    const currentUser = {
      userId: USER_ID,
      email: "editor@example.test",
      role: "member",
      profile: { default_workspace_id: DEFAULT_WORKSPACE_ID },
    };
    const page = {
      items: [],
      nextCursor: null,
      counts: { filteredTotalCount: 0, scopeTotalCount: 0 },
    };
    routeMocks.requireCurrentUserContext.mockResolvedValue(currentUser);
    routeMocks.getCurrentWorkspaceProject.mockResolvedValue({
      project: { id: PROJECT_ID, workspace_id: SHARED_WORKSPACE_ID },
    });
    routeMocks.getCloudflareD1Database.mockResolvedValue(db);
    routeMocks.canEditProjectInD1.mockResolvedValue(true);
    routeMocks.readProjectActivityFeed.mockResolvedValue(page);
    const { GET } = await import("@/app/api/projects/[projectId]/activity/route");

    const response = await GET(
      new NextRequest(new URL(`http://localhost/api/projects/${PROJECT_ID}/activity?cursor=cursor-1&limit=7`)),
      { params: Promise.resolve({ projectId: PROJECT_ID }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(page);
    expect(routeMocks.getCurrentWorkspaceProject).toHaveBeenCalledWith(PROJECT_ID);
    expect(routeMocks.canEditProjectInD1).toHaveBeenCalledWith(db, PROJECT_ID, currentUser);
    expect(routeMocks.readProjectActivityFeed).toHaveBeenCalledWith(expect.objectContaining({
      cursor: "cursor-1",
      includeCounts: true,
      limit: 7,
      projectId: PROJECT_ID,
    }));
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });

  it("denies load-more activity when the user cannot edit the project", async () => {
    const db = {};
    const currentUser = {
      userId: USER_ID,
      email: "viewer@example.test",
      role: "member",
      profile: { default_workspace_id: DEFAULT_WORKSPACE_ID },
    };
    routeMocks.requireCurrentUserContext.mockResolvedValue(currentUser);
    routeMocks.getCurrentWorkspaceProject.mockResolvedValue({
      project: { id: PROJECT_ID, workspace_id: SHARED_WORKSPACE_ID },
    });
    routeMocks.getCloudflareD1Database.mockResolvedValue(db);
    routeMocks.canEditProjectInD1.mockResolvedValue(false);
    const { GET } = await import("@/app/api/projects/[projectId]/activity/route");

    const response = await GET(
      new NextRequest(new URL(`http://localhost/api/projects/${PROJECT_ID}/activity?cursor=cursor-1`)),
      { params: Promise.resolve({ projectId: PROJECT_ID }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Project activity is not available." });
    expect(routeMocks.readProjectActivityFeed).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });

  it("fails closed without reading activity when the project edit probe throws", async () => {
    const db = {};
    const currentUser = {
      userId: USER_ID,
      email: "viewer@example.test",
      role: "member",
      profile: { default_workspace_id: DEFAULT_WORKSPACE_ID },
    };
    routeMocks.requireCurrentUserContext.mockResolvedValue(currentUser);
    routeMocks.getCurrentWorkspaceProject.mockResolvedValue({
      project: { id: PROJECT_ID, workspace_id: SHARED_WORKSPACE_ID },
    });
    routeMocks.getCloudflareD1Database.mockResolvedValue(db);
    routeMocks.canEditProjectInD1.mockRejectedValue(new Error("d1 unavailable"));
    const { GET } = await import("@/app/api/projects/[projectId]/activity/route");

    const response = await GET(
      new NextRequest(new URL(`http://localhost/api/projects/${PROJECT_ID}/activity?cursor=cursor-1`)),
      { params: Promise.resolve({ projectId: PROJECT_ID }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Project activity is not available." });
    expect(routeMocks.readProjectActivityFeed).not.toHaveBeenCalled();
  });

  it("renders denied activity pages with empty data and without prefetching activity", async () => {
    const db = {};
    const currentUser = {
      userId: USER_ID,
      email: "viewer@example.test",
      role: "member",
      profile: { default_workspace_id: DEFAULT_WORKSPACE_ID },
    };
    routeMocks.requireCurrentUserContext.mockResolvedValue(currentUser);
    routeMocks.getCurrentWorkspaceProject.mockResolvedValue({
      project: { id: PROJECT_ID, name: "Shared Project", workspace_id: SHARED_WORKSPACE_ID },
    });
    routeMocks.getCloudflareD1Database.mockResolvedValue(db);
    routeMocks.canEditProjectInD1.mockResolvedValue(false);
    const { default: ProjectActivityPage } = await import("@/app/workshop/projects/[projectId]/activity/page");

    const suspenseElement = ProjectActivityPage({
      params: Promise.resolve({ projectId: PROJECT_ID }),
      searchParams: Promise.resolve({ scope: "all" }),
    }) as { props: { children: { props: unknown; type: (props: unknown) => Promise<{ props: Record<string, unknown> }> } } };
    const contentElement = suspenseElement.props.children;
    const activityElement = await contentElement.type(contentElement.props);

    expect(activityElement.props).toEqual(expect.objectContaining({
      canEdit: false,
      currentUserId: USER_ID,
      initialLoadFailed: false,
      projectId: PROJECT_ID,
      projectName: "Shared Project",
    }));
    expect(activityElement.props.initialData).toEqual({
      items: [],
      nextCursor: null,
      partial: false,
      unavailableSources: [],
      counts: {
        loadedCount: 0,
        filteredTotalCount: 0,
        scopeTotalCount: 0,
      },
    });
    expect(activityElement.props.estimates).toEqual([]);
    expect(activityElement.props.members).toEqual([]);
    expect(activityElement.props.recipients).toEqual([]);
    expect(routeMocks.readProjectActivityFeed).not.toHaveBeenCalled();
    expect(routeMocks.listProjectEstimatesForDropdown).not.toHaveBeenCalled();
    expect(routeMocks.listProjectMembersForDropdown).not.toHaveBeenCalled();
    expect(routeMocks.listProjectRecipientsForDropdown).not.toHaveBeenCalled();
  });
});
