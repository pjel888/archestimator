import { Profiler, type ComponentProps } from "react";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateRightSidebar } from "@/components/workshop/component-library";
import { estimateLibraryItems, type EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import type { EstimateTemplate } from "@/components/workshop/component-library/templates";

const treeRenderCounts = vi.hoisted(() => ({
  library: 0,
  templates: 0,
  reset() {
    this.library = 0;
    this.templates = 0;
  },
}));

const componentLibraryActionMocks = vi.hoisted(() => ({
  createLibraryFolder: vi.fn(),
  deleteEstimateTemplate: vi.fn(),
  executeBulkArchiveLibraryComponents: vi.fn(),
  loadComponentLibraryUserPreferences: vi.fn(),
  previewBulkArchiveLibraryComponents: vi.fn(),
  recordComponentLibraryTelemetryEvent: vi.fn(),
  renameEstimateTemplate: vi.fn(),
  renameLibraryFolder: vi.fn(),
  reorderLibraryFolders: vi.fn(),
  saveComponentLibraryUserPreferences: vi.fn(),
}));

const reusableSourceActionMocks = vi.hoisted(() => ({
  getReusableEstimateOutline: vi.fn(),
  listReusableProjectEstimateSources: vi.fn(),
  listReusableProjectSources: vi.fn(),
  searchReusableProjectSources: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
    dismissToast: vi.fn(),
    clearToasts: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => false,
}));

vi.mock("@/lib/component-library/actions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/component-library/actions")>()),
  createLibraryFolder: componentLibraryActionMocks.createLibraryFolder,
  deleteEstimateTemplate: componentLibraryActionMocks.deleteEstimateTemplate,
  executeBulkArchiveLibraryComponents: componentLibraryActionMocks.executeBulkArchiveLibraryComponents,
  loadComponentLibraryUserPreferences: componentLibraryActionMocks.loadComponentLibraryUserPreferences,
  previewBulkArchiveLibraryComponents: componentLibraryActionMocks.previewBulkArchiveLibraryComponents,
  recordComponentLibraryTelemetryEvent: componentLibraryActionMocks.recordComponentLibraryTelemetryEvent,
  renameEstimateTemplate: componentLibraryActionMocks.renameEstimateTemplate,
  renameLibraryFolder: componentLibraryActionMocks.renameLibraryFolder,
  reorderLibraryFolders: componentLibraryActionMocks.reorderLibraryFolders,
  saveComponentLibraryUserPreferences: componentLibraryActionMocks.saveComponentLibraryUserPreferences,
}));

vi.mock("@/lib/reusable-sources/actions", () => ({
  getReusableEstimateOutline: reusableSourceActionMocks.getReusableEstimateOutline,
  listReusableProjectEstimateSources: reusableSourceActionMocks.listReusableProjectEstimateSources,
  listReusableProjectSources: reusableSourceActionMocks.listReusableProjectSources,
  searchReusableProjectSources: reusableSourceActionMocks.searchReusableProjectSources,
}));

vi.mock("@/components/workshop/component-library/tree/LibraryTree", () => ({
  LibraryTree: (props: {
    onItemPreview?: (itemId: string) => void;
    onToggle?: (nodeId: string) => void;
  }) => {
    treeRenderCounts.library += 1;
    return (
      <div data-testid="library-tree" aria-label="Mock library tree">
        <button type="button" onClick={() => props.onItemPreview?.("sidebar-profiler-item")}>
          Preview library item
        </button>
        <button type="button" onClick={() => props.onToggle?.("sidebar-profiler-folder")}>
          Toggle library node
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/workshop/component-library/tree/TemplatesTree", () => ({
  TemplatesTree: (props: {
    onToggle?: (nodeId: string) => void;
  }) => {
    treeRenderCounts.templates += 1;
    return (
      <div data-testid="templates-tree" aria-label="Mock templates tree">
        <button type="button" onClick={() => props.onToggle?.("templates-section-custom-templates")}>
          Toggle template node
        </button>
      </div>
    );
  },
}));

const sidebarItems: EstimateRowItem[] = estimateLibraryItems.slice(0, 3);
const sidebarTemplates: EstimateTemplate[] = [
  {
    id: "template-profiler",
    name: "Profiler template",
    category: "Rooms",
    createdAt: "2026-06-26T00:00:00.000Z",
    nodes: [],
  },
];

function renderProfiledSidebar(props: ComponentProps<typeof EstimateRightSidebar> = {}) {
  const commits: string[] = [];
  const view = render(
    <Profiler
      id="estimate-right-sidebar"
      onRender={(_id, phase) => {
        commits.push(phase);
      }}
    >
      <EstimateRightSidebar
        initialLibraryItems={sidebarItems}
        templates={sidebarTemplates}
        enableReusableProjectSources={false}
        useStoredPreferences={false}
        {...props}
      />
    </Profiler>,
  );
  return { commits, view };
}

describe("EstimateRightSidebar active-tab render scope (F-13)", () => {
  beforeEach(() => {
    treeRenderCounts.reset();
    componentLibraryActionMocks.loadComponentLibraryUserPreferences.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
    treeRenderCounts.reset();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("does not render the inactive tree when active-tab interactions update sidebar state", () => {
    const { commits } = renderProfiledSidebar();

    expect(screen.getByTestId("library-tree")).toBeInTheDocument();
    expect(screen.queryByTestId("templates-tree")).not.toBeInTheDocument();
    expect(treeRenderCounts.library).toBeGreaterThan(0);
    expect(treeRenderCounts.templates).toBe(0);

    const commitsAfterMount = commits.length;
    treeRenderCounts.reset();

    fireEvent.click(screen.getByRole("button", { name: "Preview library item" }));

    expect(commits.length).toBeGreaterThan(commitsAfterMount);
    expect(treeRenderCounts.library).toBeGreaterThan(0);
    expect(treeRenderCounts.templates).toBe(0);

    treeRenderCounts.reset();
    fireEvent.click(screen.getByRole("tab", { name: "Templates" }));

    expect(screen.getByTestId("templates-tree")).toBeInTheDocument();
    expect(screen.queryByTestId("library-tree")).not.toBeInTheDocument();
    expect(treeRenderCounts.templates).toBeGreaterThan(0);
    expect(treeRenderCounts.library).toBe(0);

    const commitsAfterTabSwitch = commits.length;
    treeRenderCounts.reset();

    fireEvent.click(screen.getByRole("button", { name: "Toggle template node" }));

    expect(commits.length).toBeGreaterThan(commitsAfterTabSwitch);
    expect(treeRenderCounts.templates).toBeGreaterThan(0);
    expect(treeRenderCounts.library).toBe(0);

    treeRenderCounts.reset();
    fireEvent.click(screen.getByRole("tab", { name: "Library" }));

    expect(screen.getByTestId("library-tree")).toBeInTheDocument();
    expect(screen.queryByTestId("templates-tree")).not.toBeInTheDocument();
    expect(treeRenderCounts.library).toBeGreaterThan(0);
    expect(treeRenderCounts.templates).toBe(0);
  });
});
