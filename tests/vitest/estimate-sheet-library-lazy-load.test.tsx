import { readFileSync } from "node:fs";
import path from "node:path";

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

const routerMock = vi.hoisted(() => ({
  prefetch: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
}));

const estimateActionMocks = vi.hoisted(() => ({
  deleteEstimateRowItem: vi.fn(),
  detachEstimateRowItemFromLibrary: vi.fn(),
  fetchEstimateSheetVersionControl: vi.fn(),
  fetchEstimateTree: vi.fn(),
  insertEstimateRowItemFromLibrary: vi.fn(),
  insertEstimateTemplateIntoEstimate: vi.fn(),
  insertEstimateTemplateNodeIntoEstimate: vi.fn(),
  replaceEstimateRowItemWithLibrary: vi.fn(),
  updateEstimateRowItem: vi.fn(),
}));

const loadLibraryMock = vi.hoisted(() => vi.fn());
const loadProjectLibraryMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/lazy-project/estimates/lazy-node",
  useRouter: () => routerMock,
}));

vi.mock("@/lib/estimates/actions", () => estimateActionMocks);

vi.mock("@/lib/component-library/actions", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  // U18: the in-estimate panel now loads the lite library; mock both so the
  // intercept holds regardless of which variant the component calls.
  loadCurrentWorkspaceComponentLibrary: loadLibraryMock,
  loadCurrentWorkspaceComponentLibraryLite: loadLibraryMock,
  loadProjectComponentLibraryLite: loadProjectLibraryMock,
}));

const sampleDataset = {
  libraryItems: [],
  templates: [],
  categoryTree: [],
  suppliers: [],
  brands: [],
  libraryFolders: [],
};

function renderSheet(queryClient: QueryClient, props: Record<string, unknown> = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetContent
        selectedNodeId={null}
        projectId="lazy-project"
        estimateId="lazy-estimate"
        {...props}
      />
    </QueryClientProvider>,
  );
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
}

describe("component library lazy load (U4)", () => {
  afterEach(() => {
    cleanup();
    resetEstimateWorkspaceState();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("estimate page no longer fetches the component library in the initial server render", () => {
    const pageSource = readFileSync(
      path.join(process.cwd(), "src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx"),
      "utf8",
    );
    expect(pageSource).not.toContain("getCurrentWorkspaceComponentLibrary");
    expect(pageSource).not.toContain("component-library-repository");
  });

  it("shows a sidebar skeleton, loads the library lazily, and reuses the cache on remount", async () => {
    let resolveLoad: (dataset: typeof sampleDataset) => void = () => {};
    loadProjectLibraryMock.mockImplementation(
      () => new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );

    const queryClient = makeQueryClient();
    const view = renderSheet(queryClient);

    expect(await screen.findByRole("status", { name: "Loading component library" })).toBeInTheDocument();
    expect(loadProjectLibraryMock).toHaveBeenCalledTimes(1);
    expect(loadProjectLibraryMock).toHaveBeenCalledWith("lazy-project");
    expect(loadLibraryMock).not.toHaveBeenCalled();

    await act(async () => {
      resolveLoad(sampleDataset);
    });
    await waitFor(() => {
      expect(screen.queryByRole("status", { name: "Loading component library" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("tab", { name: "Library" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Project" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Templates" })).toBeInTheDocument();

    view.unmount();
    renderSheet(queryClient);
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Library" })).toBeInTheDocument();
    });
    expect(loadProjectLibraryMock).toHaveBeenCalledTimes(1);
    expect(loadLibraryMock).not.toHaveBeenCalled();
  });

  it("shows a visible, non-blocking error with retry when the library load fails", async () => {
    loadProjectLibraryMock.mockRejectedValueOnce(new Error("library backend down"));

    const queryClient = makeQueryClient();
    const view = renderSheet(queryClient);

    const retryButton = await screen.findByRole("button", { name: /retry/i });
    expect(screen.getByText(/couldn.t load|failed to load/i)).toBeInTheDocument();

    // Sheet stays editable while the sidebar errors: the empty estimate
    // message renders because no nodes were passed.
    expect(view.container.querySelector("[data-estimate-center-column='sheet']")).toBeInTheDocument();

    loadProjectLibraryMock.mockResolvedValueOnce(sampleDataset);
    await userEvent.click(retryButton);
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Library" })).toBeInTheDocument();
    });
    expect(loadProjectLibraryMock).toHaveBeenCalledTimes(2);
    expect(loadLibraryMock).not.toHaveBeenCalled();
  });

  it("does not fetch when server-provided library props exist", async () => {
    const queryClient = makeQueryClient();
    renderSheet(queryClient, {
      libraryItems: [],
      libraryTemplates: [],
      libraryCategoryTree: [],
      librarySuppliers: [],
      libraryBrands: [],
      libraryFolders: [],
    });

    expect(screen.getByRole("tab", { name: "Library" })).toBeInTheDocument();
    expect(loadLibraryMock).not.toHaveBeenCalled();
    expect(loadProjectLibraryMock).not.toHaveBeenCalled();
  });

  it("does not fetch when the sidebar is not rendered", () => {
    const queryClient = makeQueryClient();
    renderSheet(queryClient, { renderSidebar: false });
    expect(loadLibraryMock).not.toHaveBeenCalled();
    expect(loadProjectLibraryMock).not.toHaveBeenCalled();
  });

  it("invalidates the lazy library cache after sidebar library mutations", () => {
    // Wiring contract: server-confirmed sidebar mutations must mark the
    // lazy dataset stale, or remounts re-seed from pre-mutation cache.
    const sheetSource = readFileSync(path.join(process.cwd(), "src/components/workshop/EstimateSheetContent.tsx"), "utf8");
    // U18/U19: invalidation uses the shared key constant (non-exact, so it
    // covers both the lite panel key and the full editor key). PERF-7: with
    // refetchType "none" it marks the heavy lite dataset stale without eagerly
    // refetching while the panel is open (local optimistic state is correct).
    expect(sheetSource).toContain("workspaceComponentLibraryQueryKey(workspaceId)");
    expect(sheetSource).toContain("workspaceComponentLibraryLiteQueryKey(workspaceId, projectId)");
    expect(sheetSource).not.toContain("loadCurrentWorkspaceComponentLibraryLite");
    expect(sheetSource).toContain("onLibraryDataChanged={handleLibraryDataChanged}");

    const sidebarSource = readFileSync(path.join(process.cwd(), "src/components/workshop/component-library/index.tsx"), "utf8");
    const notifyCallCount = sidebarSource.match(/onLibraryDataChanged\?\.\(\);/g)?.length ?? 0;
    // create component, create template, rename template, delete template,
    // save component edit, delete component, undo delete, bulk delete
    expect(notifyCallCount).toBeGreaterThanOrEqual(8);
  });
});
