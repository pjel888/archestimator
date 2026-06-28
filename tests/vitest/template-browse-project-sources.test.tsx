import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplatesBrowseManager } from "@/components/workshop/library/templates-browse/TemplatesBrowseManager";
import type { EstimateTemplate } from "@/components/workshop/component-library/templates";

const componentLibraryActionMocks = vi.hoisted(() => ({
  createLibraryFolder: vi.fn(),
  createEstimateTemplate: vi.fn(),
  createEstimateTemplateFromEstimateNode: vi.fn(),
  deleteEstimateTemplate: vi.fn(),
  duplicateEstimateTemplate: vi.fn(),
  executeBulkArchiveLibraryComponents: vi.fn(),
  listEstimateInsertTargets: vi.fn(),
  loadComponentLibraryUserPreferences: vi.fn(),
  moveEstimateTemplateToCategory: vi.fn(),
  previewBulkArchiveLibraryComponents: vi.fn(),
  recordComponentLibraryTelemetryEvent: vi.fn(),
  renameEstimateTemplate: vi.fn(),
  renameLibraryFolder: vi.fn(),
  renameTemplateCategory: vi.fn(),
  reorderLibraryFolders: vi.fn(),
  resolveEstimateTemplateInsertTarget: vi.fn(),
  saveComponentLibraryUserPreferences: vi.fn(),
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
  listReusableProjectSources: vi.fn(),
  searchReusableProjectSources: vi.fn(),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => false,
}));

vi.mock("@/lib/component-library/actions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/component-library/actions")>()),
  createLibraryFolder: componentLibraryActionMocks.createLibraryFolder,
  createEstimateTemplate: componentLibraryActionMocks.createEstimateTemplate,
  createEstimateTemplateFromEstimateNode: componentLibraryActionMocks.createEstimateTemplateFromEstimateNode,
  deleteEstimateTemplate: componentLibraryActionMocks.deleteEstimateTemplate,
  duplicateEstimateTemplate: componentLibraryActionMocks.duplicateEstimateTemplate,
  executeBulkArchiveLibraryComponents: componentLibraryActionMocks.executeBulkArchiveLibraryComponents,
  listEstimateInsertTargets: componentLibraryActionMocks.listEstimateInsertTargets,
  loadComponentLibraryUserPreferences: componentLibraryActionMocks.loadComponentLibraryUserPreferences,
  moveEstimateTemplateToCategory: componentLibraryActionMocks.moveEstimateTemplateToCategory,
  previewBulkArchiveLibraryComponents: componentLibraryActionMocks.previewBulkArchiveLibraryComponents,
  recordComponentLibraryTelemetryEvent: componentLibraryActionMocks.recordComponentLibraryTelemetryEvent,
  renameEstimateTemplate: componentLibraryActionMocks.renameEstimateTemplate,
  renameLibraryFolder: componentLibraryActionMocks.renameLibraryFolder,
  renameTemplateCategory: componentLibraryActionMocks.renameTemplateCategory,
  reorderLibraryFolders: componentLibraryActionMocks.reorderLibraryFolders,
  resolveEstimateTemplateInsertTarget: componentLibraryActionMocks.resolveEstimateTemplateInsertTarget,
  saveComponentLibraryUserPreferences: componentLibraryActionMocks.saveComponentLibraryUserPreferences,
}));

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

const fixtureTemplate: EstimateTemplate = {
  id: "template-empty",
  name: "Empty Starter",
  description: "Starter shell.",
  category: "Residential",
  nodes: [],
};

describe("TemplatesBrowseManager library route source dock", () => {
  beforeEach(() => {
    navigationMocks.push.mockReset();
    navigationMocks.refresh.mockReset();
    navigationMocks.replace.mockReset();
    for (const mock of Object.values(componentLibraryActionMocks)) mock.mockReset();
    estimateActionMocks.insertEstimateTemplateIntoEstimate.mockReset();
    reusableSourceActionMocks.getReusableEstimateOutline.mockReset();
    reusableSourceActionMocks.listReusableProjectEstimateSources.mockReset();
    reusableSourceActionMocks.listReusableProjectSources.mockReset();
    reusableSourceActionMocks.searchReusableProjectSources.mockReset();
  });

  it("renders Library and Project source tabs without nesting Templates", () => {
    render(<TemplatesBrowseManager templates={[fixtureTemplate]} />);

    expect(screen.getByRole("treeitem", { name: "All Templates" })).toBeInTheDocument();
    const sourceTabs = screen.getByRole("tablist", { name: "Estimate source sections" });
    expect(within(sourceTabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Library", "Project"]);
    expect(screen.queryByRole("tab", { name: "Templates" })).not.toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "Projects reusable sources" })).not.toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: /project source$/ })).not.toBeInTheDocument();

    fireEvent.click(within(sourceTabs).getByRole("tab", { name: "Project" }));

    expect(screen.getByLabelText("Project source unavailable")).toBeInTheDocument();
    expect(screen.getByLabelText("Project source project")).toBeDisabled();
  });

  it("never calls the reusable-source actions from the library route", () => {
    render(<TemplatesBrowseManager templates={[fixtureTemplate]} />);

    expect(reusableSourceActionMocks.listReusableProjectSources).not.toHaveBeenCalled();
    expect(reusableSourceActionMocks.searchReusableProjectSources).not.toHaveBeenCalled();
    expect(reusableSourceActionMocks.listReusableProjectEstimateSources).not.toHaveBeenCalled();
    expect(reusableSourceActionMocks.getReusableEstimateOutline).not.toHaveBeenCalled();
  });
});
