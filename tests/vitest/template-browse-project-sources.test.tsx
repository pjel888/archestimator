import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplatesBrowseManager } from "@/components/workshop/library/templates-browse/TemplatesBrowseManager";
import type { EstimateTemplate } from "@/components/workshop/component-library/templates";
import type { ReusableEstimateSource } from "@/lib/reusable-sources/types";

const componentLibraryActionMocks = vi.hoisted(() => ({
  createEstimateTemplate: vi.fn(),
  createEstimateTemplateFromEstimateNode: vi.fn(),
  deleteEstimateTemplate: vi.fn(),
  duplicateEstimateTemplate: vi.fn(),
  listEstimateInsertTargets: vi.fn(),
  moveEstimateTemplateToCategory: vi.fn(),
  renameEstimateTemplate: vi.fn(),
  renameTemplateCategory: vi.fn(),
  resolveEstimateTemplateInsertTarget: vi.fn(),
}));

const estimateActionMocks = vi.hoisted(() => ({
  insertEstimateTemplateIntoEstimate: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}));

const reusableSourceActionMocks = vi.hoisted(() => ({
  getReusableEstimateOutline: vi.fn(),
  listReusableProjectEstimateSources: vi.fn(),
}));

vi.mock("@/lib/component-library/actions", () => componentLibraryActionMocks);

vi.mock("@/lib/estimates/actions", () => estimateActionMocks);

vi.mock("@/lib/reusable-sources/actions", () => reusableSourceActionMocks);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigationMocks.push,
    refresh: navigationMocks.refresh,
    replace: navigationMocks.replace,
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/workshop/library/templates",
}));

type ReusableEstimateOutlineResult = {
  readonly sources: ReusableEstimateSource[];
};

const fixtureTemplate: EstimateTemplate = {
  id: "template-empty",
  name: "Empty Starter",
  description: "Starter shell.",
  category: "Residential",
  nodes: [],
};

const fixtureProjectSources: ReusableEstimateSource[] = [
  {
    kind: "project",
    projectId: "project-1",
    name: "Library Route Project",
  },
  {
    kind: "project-estimate",
    projectId: "project-1",
    estimateId: "estimate-1",
    name: "Route Estimate",
    sheetCode: "EST-ROUTE",
  },
];

describe("TemplatesBrowseManager project sources", () => {
  beforeEach(() => {
    navigationMocks.push.mockReset();
    navigationMocks.refresh.mockReset();
    navigationMocks.replace.mockReset();
    for (const mock of Object.values(componentLibraryActionMocks)) mock.mockReset();
    estimateActionMocks.insertEstimateTemplateIntoEstimate.mockReset();
    reusableSourceActionMocks.getReusableEstimateOutline.mockReset();
    reusableSourceActionMocks.listReusableProjectEstimateSources.mockReset();
  });

  it("loads route-level project estimates only after a project expands", async () => {
    reusableSourceActionMocks.listReusableProjectEstimateSources.mockResolvedValue({
      sources: fixtureProjectSources.filter((source) => source.kind === "project-estimate"),
    });

    render(<TemplatesBrowseManager templates={[fixtureTemplate]} projectSources={[fixtureProjectSources[0]]} />);

    const projectRow = screen.getByRole("treeitem", { name: "Library Route Project project source" });
    expect(screen.queryByRole("treeitem", { name: "Route Estimate estimate EST-ROUTE" })).not.toBeInTheDocument();
    expect(reusableSourceActionMocks.getReusableEstimateOutline).not.toHaveBeenCalled();

    fireEvent.click(within(projectRow).getByRole("button", { name: "Expand" }));

    await waitFor(() => {
      expect(reusableSourceActionMocks.listReusableProjectEstimateSources).toHaveBeenCalledWith({ projectId: "project-1" });
    });
    expect(await screen.findByRole("treeitem", { name: "Route Estimate estimate EST-ROUTE" })).toBeInTheDocument();
    expect(reusableSourceActionMocks.getReusableEstimateOutline).not.toHaveBeenCalled();
  });

  it("lazy-loads a route-level project estimate outline when the estimate expands", async () => {
    let resolveOutline: (value: ReusableEstimateOutlineResult) => void = () => undefined;
    reusableSourceActionMocks.getReusableEstimateOutline.mockReturnValue(new Promise<ReusableEstimateOutlineResult>((resolve) => {
      resolveOutline = resolve;
    }));

    render(<TemplatesBrowseManager templates={[fixtureTemplate]} projectSources={fixtureProjectSources} />);

    const estimateRow = screen.getByRole("treeitem", { name: "Route Estimate estimate EST-ROUTE" });
    expect(screen.queryByRole("treeitem", { name: "Demolition project tab source" })).not.toBeInTheDocument();

    fireEvent.click(within(estimateRow).getByRole("button", { name: "Expand" }));

    await waitFor(() => {
      expect(reusableSourceActionMocks.getReusableEstimateOutline).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-1",
      });
    });
    expect(await screen.findByText("Loading estimate outline…")).toBeInTheDocument();

    await act(async () => {
      resolveOutline({
        sources: [
          {
            kind: "project-tab",
            projectId: "project-1",
            estimateId: "estimate-1",
            tabId: "tab-1",
            name: "Demolition",
          },
          {
            kind: "project-node",
            projectId: "project-1",
            estimateId: "estimate-1",
            tabId: "tab-1",
            nodeId: "node-1",
            nodeKind: "group",
            name: "Site Works",
          },
        ],
      });
    });

    expect(await screen.findByRole("treeitem", { name: "Demolition project tab source" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Site Works project group" })).toBeInTheDocument();
  });
});
