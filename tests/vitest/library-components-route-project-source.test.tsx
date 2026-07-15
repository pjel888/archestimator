import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  canManageLibrary: vi.fn(),
  getProjectOnlyComponentRowsLibraryPage: vi.fn(),
  isExpressComponentPromotionEnabled: vi.fn(),
  listCurrentWorkspaceProjects: vi.fn(),
}));

vi.mock("@/components/workshop/LibraryPageClient", () => ({
  LibraryPageClient: ({ promotionEnabled }: { promotionEnabled?: boolean }) => (
    <section data-testid="project-component-catalogue" data-promotion-enabled={String(Boolean(promotionEnabled))}>
      {promotionEnabled ? <button type="button">Promote Project Component to library</button> : null}
    </section>
  ),
}));

vi.mock("@/components/workshop/library/LibraryComponentSourceShell", () => ({
  LibraryComponentSourceShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: vi.fn().mockResolvedValue({ userId: "user-1", role: "owner" }),
}));

vi.mock("@/lib/authz/d1-access", () => ({
  isWorkspaceEditorInD1: (...args: unknown[]) => routeMocks.canManageLibrary(...args),
}));

vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: vi.fn().mockResolvedValue({ prepare: vi.fn() }),
}));

vi.mock("@/lib/component-library/project-component-projection", () => ({
  getProjectOnlyComponentRowsLibraryPage: (...args: unknown[]) =>
    routeMocks.getProjectOnlyComponentRowsLibraryPage(...args),
}));

vi.mock("@/lib/estimates/express-components", () => ({
  isExpressComponentPromotionEnabled: (...args: unknown[]) =>
    routeMocks.isExpressComponentPromotionEnabled(...args),
}));

vi.mock("@/lib/perf/server-timing", () => ({
  traced: (_name: string, run: () => unknown) => run(),
  withPerfTraceRequest: (_name: string, run: () => unknown) => run(),
}));

vi.mock("@/lib/repositories/component-library-repository", () => ({
  getCurrentWorkspaceComponentRowsLibraryPage: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  ensureDefaultWorkspace: vi.fn().mockResolvedValue({ workspace: { id: "workspace-a" } }),
  listCurrentWorkspaceProjects: (...args: unknown[]) => routeMocks.listCurrentWorkspaceProjects(...args),
}));

import { LibraryComponentsRoute } from "@/components/workshop/library/LibraryComponentsRoute";

beforeEach(() => {
  routeMocks.canManageLibrary.mockReset().mockResolvedValue(true);
  routeMocks.isExpressComponentPromotionEnabled.mockReset().mockReturnValue(false);
  routeMocks.listCurrentWorkspaceProjects.mockReset().mockResolvedValue({
    projects: [{
      accessKind: "owned",
      project: {
        id: "project-1",
        name: "Lewis Residence",
        workspace_id: "workspace-a",
      },
    }],
  });
  routeMocks.getProjectOnlyComponentRowsLibraryPage.mockReset().mockResolvedValue({
    workspaceId: "workspace-a",
    categoryTree: [],
    suppliers: [],
    brands: [],
    libraryFolders: [{ id: "project-components-project-1" }],
    libraryItems: [{ id: "project-component-1" }],
    isPartial: false,
    loadedComponentCount: 1,
    totalComponentCount: 1,
    hasMore: false,
    nextCursor: null,
  });
});

describe("Project Components route promotion gate", () => {
  it("hides promotion UI when the server-side promotion feature is disabled", async () => {
    const result = await LibraryComponentsRoute({
      searchParams: { source: "project", projectId: "project-1" },
    });
    render(result);

    expect(routeMocks.canManageLibrary).toHaveBeenCalled();
    expect(routeMocks.isExpressComponentPromotionEnabled).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("project-component-catalogue")).toHaveAttribute(
      "data-promotion-enabled",
      "false",
    );
    expect(screen.queryByRole("button", { name: /Promote Project Component/i })).not.toBeInTheDocument();
  });
});
