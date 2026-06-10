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

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/lazy-project/estimates/lazy-node",
  useRouter: () => routerMock,
}));

vi.mock("@/lib/estimates/actions", () => estimateActionMocks);

vi.mock("@/lib/component-library/actions", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  loadCurrentWorkspaceComponentLibrary: loadLibraryMock,
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
  return new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
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
    loadLibraryMock.mockImplementation(
      () => new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );

    const queryClient = makeQueryClient();
    const view = renderSheet(queryClient);

    expect(await screen.findByRole("status", { name: "Loading component library" })).toBeInTheDocument();
    expect(loadLibraryMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLoad(sampleDataset);
    });
    await waitFor(() => {
      expect(screen.queryByRole("status", { name: "Loading component library" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("tab", { name: /components/i })).toBeInTheDocument();

    view.unmount();
    renderSheet(queryClient);
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /components/i })).toBeInTheDocument();
    });
    expect(loadLibraryMock).toHaveBeenCalledTimes(1);
  });

  it("shows a visible, non-blocking error with retry when the library load fails", async () => {
    loadLibraryMock.mockRejectedValueOnce(new Error("library backend down"));

    const queryClient = makeQueryClient();
    const view = renderSheet(queryClient);

    const retryButton = await screen.findByRole("button", { name: /retry/i });
    expect(screen.getByText(/couldn.t load|failed to load/i)).toBeInTheDocument();

    // Sheet stays editable while the sidebar errors: the empty estimate
    // message renders because no nodes were passed.
    expect(view.container.querySelector("[data-estimate-center-column='sheet']")).toBeInTheDocument();

    loadLibraryMock.mockResolvedValueOnce(sampleDataset);
    await userEvent.click(retryButton);
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /components/i })).toBeInTheDocument();
    });
    expect(loadLibraryMock).toHaveBeenCalledTimes(2);
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

    expect(screen.getByRole("tab", { name: /components/i })).toBeInTheDocument();
    expect(loadLibraryMock).not.toHaveBeenCalled();
  });

  it("does not fetch when the sidebar is not rendered", () => {
    const queryClient = makeQueryClient();
    renderSheet(queryClient, { renderSidebar: false });
    expect(loadLibraryMock).not.toHaveBeenCalled();
  });
});
