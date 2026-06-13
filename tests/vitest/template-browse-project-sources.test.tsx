import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplatesBrowseManager } from "@/components/workshop/library/templates-browse/TemplatesBrowseManager";
import type { EstimateTemplate } from "@/components/workshop/component-library/templates";

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

const fixtureTemplate: EstimateTemplate = {
  id: "template-empty",
  name: "Empty Starter",
  description: "Starter shell.",
  category: "Residential",
  nodes: [],
};

// Templates Audit U3 (decision D-C): the standalone library route no longer
// derives reusable sources from projects. Project-source browsing now lives
// solely in the in-estimate Templates panel, so the route renders custom
// templates only and never touches the reusable-source actions.
describe("TemplatesBrowseManager library route (no project sources)", () => {
  beforeEach(() => {
    navigationMocks.push.mockReset();
    navigationMocks.refresh.mockReset();
    navigationMocks.replace.mockReset();
    for (const mock of Object.values(componentLibraryActionMocks)) mock.mockReset();
    estimateActionMocks.insertEstimateTemplateIntoEstimate.mockReset();
    reusableSourceActionMocks.getReusableEstimateOutline.mockReset();
    reusableSourceActionMocks.listReusableProjectEstimateSources.mockReset();
  });

  it("renders only the custom-template tree with no Projects section", () => {
    render(<TemplatesBrowseManager templates={[fixtureTemplate]} />);

    expect(screen.getByRole("treeitem", { name: "All Templates" })).toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "Projects reusable sources" })).not.toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: /project source$/ })).not.toBeInTheDocument();
  });

  it("never calls the reusable-source actions from the library route", () => {
    render(<TemplatesBrowseManager templates={[fixtureTemplate]} />);

    expect(reusableSourceActionMocks.listReusableProjectEstimateSources).not.toHaveBeenCalled();
    expect(reusableSourceActionMocks.getReusableEstimateOutline).not.toHaveBeenCalled();
  });
});
