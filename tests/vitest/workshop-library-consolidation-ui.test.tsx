import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";

// LibraryPageClient now owns a TanStack Query cache (P0 T3); each render gets a fresh
// provider so the seeded fixtures behave like an isolated warm cache.
function renderLibraryShell(element: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

// jsdom has no DataTransfer; the shared tree only needs setData/getData plus the
// effect/types fields it writes during an HTML5 drag.
function createDragDataTransfer() {
  const store: Record<string, string> = {};
  return {
    setData: (type: string, value: string) => {
      store[type] = value;
    },
    getData: (type: string) => store[type] ?? "",
    setDragImage: () => {},
    clearData: () => {},
    dropEffect: "none",
    effectAllowed: "all",
    types: [] as string[],
  };
}

function setRowRect(element: HTMLElement, top = 0, height = 28) {
  element.getBoundingClientRect = () => ({
    x: 0,
    y: top,
    top,
    left: 0,
    right: 200,
    bottom: top + height,
    width: 200,
    height,
    toJSON: () => ({}),
  });
}

function dispatchDragEvent(
  element: HTMLElement,
  type: "dragstart" | "dragover" | "drop" | "dragend",
  options: { clientY?: number; dataTransfer: ReturnType<typeof createDragDataTransfer> },
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: options.dataTransfer });
  if (options.clientY !== undefined) {
    Object.defineProperty(event, "clientY", { value: options.clientY });
  }
  fireEvent(element, event);
}

async function waitForLibraryWorkspace() {
  // The tablists are retired; the dynamic tree surface's organization toggle is the stable anchor.
  await screen.findByRole("button", { name: /Organize by:/ }, { timeout: 10_000 });
}

function clickDrawerAddVariant(drawer: HTMLElement) {
  const addVariantButtons = within(drawer).getAllByRole("button", { name: "Add variant" });
  fireEvent.click(addVariantButtons[addVariantButtons.length - 1]);
}

function openComponentOrganizationMenu() {
  fireEvent.click(screen.getByRole("button", { name: /Organize by:/ }));
  return screen.getByRole("menu", { name: "Component view mode" });
}

const actionMocks = vi.hoisted(() => ({
  createCostLibraryComponent: vi.fn(),
  saveCostLibraryComponentDraft: vi.fn(),
  createLibraryFolder: vi.fn(),
  deleteLibraryFolder: vi.fn(),
  deleteLibraryFoldersBulk: vi.fn(),
  executeBulkArchiveLibraryComponents: vi.fn(),
  findCurrentWorkspaceCostLibraryComponentDuplicate: vi.fn(),
  getCostLibraryComponentUsage: vi.fn(),
  loadCostLibraryComponentRowDetail: vi.fn(),
  moveCostLibraryComponentToFolder: vi.fn(),
  previewBulkArchiveLibraryComponents: vi.fn(),
  renameLibraryFolder: vi.fn(),
  reorderLibraryFolders: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => {
  const state = {
    search: "",
    push: vi.fn((href: string) => {
      state.search = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
    }),
    refresh: vi.fn(),
    replace: vi.fn((href: string) => {
      state.search = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
    }),
  };
  return state;
});

vi.mock("@/lib/component-library/actions", () => actionMocks);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigationMocks.push,
    refresh: navigationMocks.refresh,
    replace: navigationMocks.replace,
  }),
  usePathname: () => "/workshop/library/components",
  useSearchParams: () => new URLSearchParams(window.location.search || navigationMocks.search),
}));

const sharedCategoryTree: ComponentLibraryTaxonomyNode[] = [
  {
    id: "db-section-components",
    label: "Database Components",
    kind: "organizer",
    children: [
      {
        id: "db-category-fabrication",
        label: "Fabrication",
        kind: "category",
      },
    ],
  },
];

const sharedFolders = [
  {
    id: "folder-fabrication",
    workspace_id: "workspace-1",
    parent_id: null,
    name: "Fabrication",
    sort_order: 10,
    source_category_node_id: null,
    folder_kind: "custom" as const,
  },
  {
    id: "folder-details",
    workspace_id: "workspace-1",
    parent_id: "folder-fabrication",
    name: "Details",
    sort_order: 10,
    source_category_node_id: null,
    folder_kind: "custom" as const,
  },
];

const sharedBrands = [
  {
    id: "db-brand",
    name: "Database Brand",
    normalized_name: "database brand",
    sort_order: 1,
  },
];

const sharedLibraryItems: EstimateRowItem[] = [
  {
    id: "db-library-steel-frame",
    material: "Database Steel Frame",
    name: "Database Steel Frame",
    description: "Shared DB-backed component",
    supplier: "Database Supplier",
    supplierId: "db-supplier",
    source: "library",
    unit: "pc",
    itemCost: 1200,
    price: 1200,
    currency: "PHP",
    quantity: 1,
    subTotal: 1200,
    miscCost: 0,
    totalItemCosts: 1200,
    category: "Legacy category label",
    categoryNodeId: "db-category-fabrication",
    categoryPath: ["Database Components", "Fabrication"],
    libraryFolderId: "folder-fabrication",
    brand: "Database Brand",
    brandId: "db-brand",
    pricingSource: "Database Supplier",
    pricingDate: "2026-05-22",
  },
  {
    id: "db-library-custom-pull",
    material: "Custom Pull",
    name: "Custom Pull",
    description: "User-created component",
    supplier: "Custom Maker",
    supplierId: "db-custom-supplier",
    source: "library",
    unit: "pc",
    itemCost: 75,
    price: 75,
    currency: "PHP",
    quantity: 1,
    subTotal: 75,
    miscCost: 0,
    totalItemCosts: 75,
    category: "Fabrication",
    categoryNodeId: "db-category-fabrication",
    categoryPath: ["Database Components", "Fabrication"],
    libraryFolderId: "folder-details",
    brand: "Pull Studio",
    brandId: "db-pull-studio",
    isCustom: true,
    pricingSource: "Custom Maker",
    pricingDate: "2026-05-22",
  },
  {
    id: "db-library-owner-sink",
    material: "Owner Supplied Sink",
    name: "Owner Supplied Sink",
    description: "Component without supplier metadata",
    supplier: "",
    source: "library",
    unit: "pc",
    itemCost: 500,
    price: 500,
    currency: "PHP",
    quantity: 1,
    subTotal: 500,
    miscCost: 0,
    totalItemCosts: 500,
    category: "Fabrication",
    categoryNodeId: "db-category-fabrication",
    categoryPath: ["Database Components", "Fabrication"],
    pricingSource: "Owner",
    pricingDate: "2026-05-22",
  },
];

describe("workshop library consolidation UI", () => {
  beforeAll(async () => {
    await import("@/components/workshop/component-library-manager/ComponentLibraryManager");
    await import("@/components/workshop/component-library-manager/AddComponentModal");
  }, 60_000);

  beforeEach(() => {
    actionMocks.createLibraryFolder.mockReset();
    actionMocks.createCostLibraryComponent.mockReset();
    actionMocks.saveCostLibraryComponentDraft.mockReset();
    actionMocks.saveCostLibraryComponentDraft.mockResolvedValue({
      draftId: "component-draft-1",
      savedAt: "2026-07-06T00:00:00.000Z",
    });
    actionMocks.deleteLibraryFolder.mockReset();
    actionMocks.deleteLibraryFoldersBulk.mockReset();
    actionMocks.executeBulkArchiveLibraryComponents.mockReset();
    actionMocks.findCurrentWorkspaceCostLibraryComponentDuplicate.mockReset();
    actionMocks.findCurrentWorkspaceCostLibraryComponentDuplicate.mockResolvedValue(null);
    actionMocks.getCostLibraryComponentUsage.mockReset();
    actionMocks.loadCostLibraryComponentRowDetail.mockReset();
    actionMocks.moveCostLibraryComponentToFolder.mockReset();
    actionMocks.previewBulkArchiveLibraryComponents.mockReset();
    actionMocks.renameLibraryFolder.mockReset();
    actionMocks.reorderLibraryFolders.mockReset();
    actionMocks.reorderLibraryFolders.mockResolvedValue(undefined);
    actionMocks.getCostLibraryComponentUsage.mockResolvedValue({ templateRowCount: 0, estimateRowCount: 0 });
    actionMocks.loadCostLibraryComponentRowDetail.mockResolvedValue(null);
    actionMocks.moveCostLibraryComponentToFolder.mockResolvedValue(undefined);
    navigationMocks.search = "";
    window.history.replaceState(null, "", "/workshop/library/components");
    navigationMocks.push.mockClear();
    navigationMocks.refresh.mockReset();
    navigationMocks.replace.mockClear();
    vi.spyOn(window, "confirm").mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  it("uses /workshop/library as the canonical route and redirects the retired components and templates routes", () => {
    const libraryRoute = readFileSync(join(process.cwd(), "src/app/workshop/library/page.tsx"), "utf8");
    const libraryLayout = readFileSync(join(process.cwd(), "src/app/workshop/library/layout.tsx"), "utf8");
    const componentsSharedRoute = readFileSync(join(process.cwd(), "src/components/workshop/library/LibraryComponentsRoute.tsx"), "utf8");
    const componentsSubRoute = readFileSync(join(process.cwd(), "src/app/workshop/library/components/page.tsx"), "utf8");
    const libraryTemplatesRoute = readFileSync(join(process.cwd(), "src/app/workshop/library/templates/page.tsx"), "utf8");
    const componentsRoute = readFileSync(join(process.cwd(), "src/app/workshop/components/page.tsx"), "utf8");
    const templatesRoute = readFileSync(join(process.cwd(), "src/app/workshop/templates/page.tsx"), "utf8");
    const componentActions = readFileSync(join(process.cwd(), "src/lib/component-library/actions.ts"), "utf8");

    expect(libraryRoute).toContain("LibraryOverview");
    expect(libraryRoute).not.toContain("getLibraryOverview");
    expect(libraryRoute).not.toContain("LibraryComponentsRoute");
    expect(componentsSubRoute).toContain("LibraryComponentsRoute");
    expect(componentsSharedRoute).toContain("LibraryPageClient");
    expect(componentsSharedRoute).toContain("getCurrentWorkspaceComponentRowsLibraryPage");
    expect(componentsSharedRoute).not.toContain("itemLimit");
    expect(componentsSharedRoute).not.toContain("getCurrentWorkspaceComponentLibrary");
    expect(componentActions).toContain("return getCurrentWorkspaceComponentRowsLibraryPage(cursor);");
    expect(componentActions).toContain("getCurrentWorkspaceComponentRowDetail(itemId)");
    expect(libraryRoute).not.toContain("templates=");
    expect(libraryLayout).toContain('breadcrumbs={["Library"]}');
    expect(libraryLayout).toContain('contentClassName=""');
    expect(libraryLayout).toContain("LibraryTabsLayoutClient");
    expect(libraryRoute).not.toContain("Workspace library");
    expect(libraryRoute).not.toContain("Categories and templates");
    expect(componentsRoute).toContain('redirect("/workshop/library")');
    expect(componentsRoute).not.toContain("getCurrentWorkspaceComponentLibrary");
    expect(templatesRoute).toContain('redirect("/workshop/library/templates")');
    expect(libraryTemplatesRoute).toContain("TemplatesBrowsePageClient");
    expect(libraryTemplatesRoute).toContain("getCurrentWorkspaceEstimateTemplates");
  });

  it("keeps library cross-route links from eagerly prefetching sibling route payloads", () => {
    const tabStrip = readFileSync(join(process.cwd(), "src/components/ui/tab-strip.tsx"), "utf8");
    const libraryTabs = readFileSync(join(process.cwd(), "src/components/workshop/library/LibraryTabsLayoutClient.tsx"), "utf8");
    const titleBar = readFileSync(join(process.cwd(), "src/components/workshop/library/LibraryTitleBarClient.tsx"), "utf8");
    const overview = readFileSync(join(process.cwd(), "src/components/workshop/library/overview/LibraryOverview.tsx"), "utf8");
    const recentComponentCard = readFileSync(
      join(process.cwd(), "src/components/workshop/library/overview/RecentComponentCard.tsx"),
      "utf8",
    );
    const templatePreviewDock = readFileSync(
      join(process.cwd(), "src/components/workshop/library/templates-browse/TemplatePreviewDock.tsx"),
      "utf8",
    );
    const templateEditor = readFileSync(
      join(process.cwd(), "src/components/workshop/library/template-editor/TemplateEditorClient.tsx"),
      "utf8",
    );

    expect(tabStrip).toContain("prefetch={tab.prefetch}");
    expect(libraryTabs).toContain("prefetch={false}");
    expect(libraryTabs).toContain("prefetchLibraryRoute(tab.href)");
    expect(libraryTabs).toContain("onPointerEnter");
    expect(libraryTabs).toContain("onFocus");
    expect(libraryTabs).toContain("onClick");
    expect(titleBar).toContain('href="/workshop/library" prefetch={false}');
    expect(titleBar).toContain('href="/workshop/library/templates" prefetch={false}');
    expect(overview).toContain('data-library-overview="empty"');
    expect(overview).not.toContain("href=");
    expect(recentComponentCard).toContain("href={getComponentDetailsHref(component.id)}");
    expect(recentComponentCard).toContain("prefetch={false}");
    expect(templatePreviewDock).toContain("buildTemplatePreviewNodeTotals(template.nodes)");
    expect(templatePreviewDock).not.toContain("computeTemplateNodeTotal");
    expect(templateEditor).toContain('href="/workshop/library/templates"');
    expect(templateEditor).toContain("prefetch={false}");
  });

  it("keeps upload review safeguards in place", () => {
    const attachmentRoute = readFileSync(join(process.cwd(), "src/app/api/component-library/attachments/route.ts"), "utf8");
    const addComponentModal = readFileSync(join(process.cwd(), "src/components/workshop/component-library-manager/AddComponentModal.tsx"), "utf8");
    const nextConfig = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

    expect(attachmentRoute).toContain("includesAscii(bytes, \"[Content_Types].xml\")");
    expect(attachmentRoute).toContain("includesAscii(bytes, \"xl/workbook.xml\")");
    expect(attachmentRoute).toContain("export async function DELETE");
    expect(attachmentRoute).toContain("const declaredMime = file.type.trim()");
    expect(addComponentModal).toContain("cleanupUploadedDraftAssets");
    expect(addComponentModal).toContain("removeComponentAttachmentUpload");
    expect(addComponentModal).toContain("attachmentBusy");
    expect(addComponentModal).toContain('accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"');
    expect(addComponentModal).toContain("isImageUploadBusy(imageUpload.state)");
    expect(addComponentModal).toContain("disabled={isPending || imageBusy || attachmentBusy}");
    expect(nextConfig).toContain("localPatterns: localImagePatterns");
    expect(nextConfig).toContain('{ pathname: "/api/projects/images" }');
    expect(nextConfig).not.toContain('hostname: "**"');
    const componentLibraryManager = readFileSync(join(process.cwd(), "src/components/workshop/component-library-manager/ComponentLibraryManager.tsx"), "utf8");
    expect(componentLibraryManager).toContain("function shouldBypassComponentImageOptimization");
    expect(componentLibraryManager).toContain('return src.startsWith("/api/") || !src.startsWith("/");');
    expect(componentLibraryManager).toContain("unoptimized={shouldBypassComponentImageOptimization(imageUrl)}");
  });

  it("renders the components scope in the single toolbar row without manager tablists", async () => {
    renderLibraryShell(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        brands={sharedBrands}
        libraryFolders={sharedFolders}
        libraryItems={sharedLibraryItems}
      />,
    );
    await waitForLibraryWorkspace();

    expect(screen.queryByRole("tablist", { name: "Library views" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Component table tabs" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Components" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Templates" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Suppliers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Custom" })).not.toBeInTheDocument();
    expect(document.querySelector('[data-component-sheet-context-strip="true"]')).toBeNull();
    const tools = screen.getByLabelText("Component table tools");
    expect(within(tools).getByRole("button", { name: "Filter components" })).toBeInTheDocument();
    expect(within(tools).getByRole("combobox", { name: "View components" })).toBeInTheDocument();
    expect(within(tools).getByRole("combobox", { name: "Sort components by" })).toBeInTheDocument();
    expect(within(tools).getByRole("combobox", { name: "Component sort order" })).toBeInTheDocument();
    expect(within(tools).getByText("All Components · 3 components · 3 loaded")).toHaveAttribute(
      "data-component-sheet-summary",
      "true",
    );

    const viewMode = openComponentOrganizationMenu();
    expect(screen.getByText("Organize by")).toBeInTheDocument();
    expect(within(viewMode).getByRole("menuitemradio", { name: "Folders" })).toHaveAttribute("aria-checked", "true");
    expect(within(viewMode).getByRole("menuitemradio", { name: "Suppliers" })).toHaveAttribute("aria-checked", "false");
    expect(within(viewMode).getByRole("menuitemradio", { name: "Brands" })).toHaveAttribute("aria-checked", "false");

    expect(screen.queryByLabelText("Library row collection")).not.toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "All Components" })).not.toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Fabrication" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();
    expect(screen.getAllByText("Database Steel Frame").length).toBeGreaterThan(1);
  });

  it("gates the persisted dense component table behind the shared toolbar view control with card action parity", async () => {
    vi.stubEnv("NEXT_PUBLIC_LIBRARY_DENSE_MODE", "1");
    renderLibraryShell(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        brands={sharedBrands}
        libraryFolders={sharedFolders}
        libraryItems={[
          { ...sharedLibraryItems[0], lifecycleState: "available" },
          { ...sharedLibraryItems[1], lifecycleState: "draft" },
          { ...sharedLibraryItems[2], lifecycleState: "discontinued" },
        ]}
        canManageLibrary
      />,
    );
    await waitForLibraryWorkspace();

    const tools = screen.getByLabelText("Component table tools");
    const displayMode = within(tools).getByRole("combobox", { name: "View components" });
    expect(displayMode).toHaveAttribute("title", "View: Cards");
    fireEvent.click(displayMode);
    fireEvent.click(screen.getByRole("option", { name: "Dense table" }));
    expect(within(tools).getByRole("combobox", { name: "Sort components by" })).toBeInTheDocument();
    expect(within(tools).getByRole("combobox", { name: "Component sort order" })).toBeInTheDocument();

    expect(window.localStorage.getItem("archestimator_component_library_display_mode")).toBe("dense");
    const table = screen.getByRole("table", { name: "All Components dense component table" });
    expect(table).toHaveAttribute("data-library-virtualization-source", "WORKSHOP_VIRTUALIZATION_FLAGS");
    for (const column of ["Name", "Folder", "Brand", "Supplier", "Cost", "Pricing source", "Pricing date", "Lifecycle", "Usage", "Actions"]) {
      expect(within(table).getByRole("columnheader", { name: new RegExp(column, "i") })).toBeInTheDocument();
    }

    const steelRow = within(table).getByRole("row", { name: /Database Steel Frame/ });
    expect(within(steelRow).getByText("Fabrication")).toBeInTheDocument();
    expect(within(steelRow).getAllByText("Database Supplier")).toHaveLength(2);
    expect(within(steelRow).getByText("Database Brand")).toBeInTheDocument();
    expect(steelRow).toHaveTextContent("₱1,200.00 / pc");
    expect(within(steelRow).getByText("2026-05-22")).toBeInTheDocument();
    expect(within(steelRow).getByText("Available")).toBeInTheDocument();
    const detailButtons = within(steelRow).getAllByRole("button", { name: "View details for Database Steel Frame" });
    expect(detailButtons[0]).toHaveAttribute(
      "data-component-card-inspect",
      "db-library-steel-frame",
    );

    expect(within(steelRow).getByRole("checkbox", { name: "Select Database Steel Frame" })).toBeInTheDocument();
    fireEvent.keyDown(steelRow, { key: " " });
    expect(screen.getByRole("button", { name: "Archive selected" })).not.toBeDisabled();
    fireEvent.keyDown(within(table).getByRole("row", { name: /Database Steel Frame/ }), { key: "Enter" });
    expect(await screen.findByLabelText("Component inspector")).toBeInTheDocument();
    expect(window.location.search).toBe("?component=db-library-steel-frame");
    expect(actionMocks.getCostLibraryComponentUsage).toHaveBeenCalledWith({ itemId: "db-library-steel-frame" });

    fireEvent.click(within(table).getByRole("button", { name: "Sort by cost" }));
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Custom Pull");
  });

  it("clears a foreign component route-state id without opening the inspector", async () => {
    window.history.replaceState(null, "", "/workshop/library/components?component=foreign-component-id");

    renderLibraryShell(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        brands={sharedBrands}
        libraryFolders={sharedFolders}
        libraryItems={sharedLibraryItems}
      />,
    );
    await waitForLibraryWorkspace();

    await waitFor(() => expect(window.location.search).toBe(""));
    expect(screen.queryByLabelText("Component inspector")).not.toBeInTheDocument();
    expect(actionMocks.getCostLibraryComponentUsage).not.toHaveBeenCalledWith({ itemId: "foreign-component-id" });
  });

  it("keeps Add folder usable from supplier organization by creating a Default folder", async () => {
    actionMocks.createLibraryFolder.mockResolvedValueOnce({
      folder: {
        id: "folder-supplier-created",
        workspace_id: "workspace-1",
        parent_id: null,
        name: "Supplier Review Folder",
        sort_order: 30,
        source_category_node_id: null,
        folder_kind: "custom",
      },
    });
    renderLibraryShell(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        brands={sharedBrands}
        libraryFolders={sharedFolders}
        libraryItems={sharedLibraryItems}
        canManageLibrary
      />,
    );
    await waitForLibraryWorkspace();

    const viewMode = openComponentOrganizationMenu();
    fireEvent.click(within(viewMode).getByRole("menuitemradio", { name: "Suppliers" }));

    const addFolderButton = screen.getByRole("button", { name: "Add library folder" });
    expect(addFolderButton).not.toBeDisabled();
    fireEvent.click(addFolderButton);

    const createFolderDialog = await screen.findByRole("dialog", { name: "New folder" });
    fireEvent.change(within(createFolderDialog).getByLabelText("Folder name"), { target: { value: "Supplier Review Folder" } });
    fireEvent.click(within(createFolderDialog).getByRole("button", { name: "Create folder" }));

    await waitFor(() => expect(actionMocks.createLibraryFolder).toHaveBeenCalledWith(null, "Supplier Review Folder", { placement: "top" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Organize by: Folders" })).toHaveAttribute("aria-pressed", "false"));
    expect(screen.getByRole("treeitem", { name: "Supplier Review Folder" })).toHaveAttribute("aria-current", "page");
  });

  it("opens Add Component without embedding the library folder tree", async () => {
    renderLibraryShell(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        brands={sharedBrands}
        libraryFolders={sharedFolders}
        libraryItems={sharedLibraryItems}
        canManageLibrary
      />,
    );
    await waitForLibraryWorkspace();

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    expect(within(dialog).queryByLabelText("Component nesting")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("treeitem", { name: "Fabrication" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Add library folder" })).not.toBeInTheDocument();
  });

  it("opens the Add Component modal and submits categorized variants", async () => {
    actionMocks.createCostLibraryComponent.mockResolvedValue({
      itemId: "new-component-id",
      activePriceOptionId: "new-price-id",
      versionNumber: 1,
      component: {
        ...sharedLibraryItems[0],
        id: "new-component-id",
        sourceLibraryItemId: "new-component-id",
      },
    });

    renderLibraryShell(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        brands={sharedBrands}
        libraryFolders={sharedFolders}
        libraryItems={sharedLibraryItems}
        canManageLibrary
      />,
    );
    await waitForLibraryWorkspace();

    // The canonical create action stays the same compact orange icon button.
    const addComponentButton = screen.getByRole("button", { name: "Add component" });
    expect(addComponentButton).not.toHaveTextContent("Add component");
    expect(addComponentButton).toHaveClass("size-6", "bg-orange-100", "text-orange-700");
    fireEvent.click(addComponentButton);

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    const sectionTabs = within(dialog).getByRole("tablist", { name: "Add component sections" });
    const componentTab = within(sectionTabs).getByRole("tab", { name: "Component" });
    const activityTab = within(sectionTabs).getByRole("tab", { name: "Activity" });
    expect(sectionTabs).toHaveClass("h-8");
    expect(sectionTabs).toHaveClass("border-b");
    expect(componentTab).toHaveClass("border-b-[#F24405]");
    expect(componentTab).toHaveClass("text-ink");
    expect(activityTab).toHaveClass("border-b-transparent");
    expect(componentTab).toHaveAttribute("aria-selected", "true");
    expect(activityTab).toHaveAttribute("aria-selected", "false");
    const componentPanel = within(dialog).getByRole("tabpanel", { name: "Component" });
    expect(componentPanel).toBeInTheDocument();
    expect(within(dialog).queryByRole("tab", { name: "Classify" })).not.toBeInTheDocument();
    const componentImagePanel = within(componentPanel).getByLabelText("Component image");
    expect(componentImagePanel).toBeInTheDocument();
    expect(componentImagePanel).toHaveClass("bg-[rgba(255,255,255,0.64)]");
    expect(componentImagePanel).not.toHaveClass("bg-surfaceMuted");
    expect(within(componentPanel).queryByLabelText("Component nesting")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Component lifecycle")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Activity history")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Image URL / Path")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Reporting category")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("New supplier name")).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Upload thumbnail")).toHaveAttribute("type", "file");
    expect(within(dialog).getByRole("combobox", { name: "Brand" })).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: "Supplier" })).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Kind")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Component measurements")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Advanced catalog details" })).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Search add component library folders")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Add component folder tools")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("NEST COMPONENT UNDER")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Resolve before saving")).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/validation issue/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Save and add another" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Add Component" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Use same image for all variants")).toHaveAttribute("type", "checkbox");
    expect(within(dialog).queryByRole("tree")).not.toBeInTheDocument();
    expect(dialog.querySelector("label label")).toBeNull();
    expect(within(dialog).queryByLabelText("Kind")).not.toBeInTheDocument();

    const nameInput = within(dialog).getByLabelText("Name");
    expect(nameInput).not.toHaveAttribute("aria-invalid");
    fireEvent.change(nameInput, { target: { value: "Acoustic Wall Panel" } });
    expect(nameInput).not.toHaveAttribute("aria-invalid");
    fireEvent.change(within(dialog).getByLabelText("Category"), { target: { value: "Fabrication" } });
    expect(within(dialog).queryByLabelText("Price")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Pricing")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Add price option" })).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Price option 1 unit cost")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Open variants panel" }));
    const variantsPanel = await within(dialog).findByRole("dialog", { name: "Manage variants" });
    expect(within(variantsPanel).getByLabelText("Variant manager")).toBeInTheDocument();
    expect(within(variantsPanel).getByText("No variants yet.")).toBeInTheDocument();
    expect(within(variantsPanel).queryByRole("button", { name: "Open V-1 — Default" })).not.toBeInTheDocument();
    const defaultVariantAction = within(variantsPanel).getByRole("button", { name: "Default" });
    expect(defaultVariantAction).toBeDisabled();
    clickDrawerAddVariant(variantsPanel);
    await waitFor(() => expect(within(variantsPanel).getByRole("button", { name: "Open V-1 — Default" })).toHaveAttribute("aria-pressed", "true"));
    const defaultVariantActionAfterAdd = within(variantsPanel).getByRole("button", { name: "Default" });
    expect(defaultVariantActionAfterAdd).toHaveAttribute("aria-pressed", "true");
    expect(defaultVariantActionAfterAdd).not.toBeDisabled();
    const variantOneEditor = within(variantsPanel).getByLabelText("Variant editor");
    expect(within(variantOneEditor).getByLabelText("Upload attachment")).toHaveAttribute("type", "file");
    fireEvent.change(within(variantOneEditor).getByLabelText("Variant Name"), { target: { value: "Variant 1" } });
    const skuInput = within(variantOneEditor).getByLabelText("SKU / Reference");
    fireEvent.change(skuInput, { target: { value: "ACP-600" } });
    const variantOneCostInput = within(variantOneEditor).getByLabelText("Variant unit cost");
    fireEvent.change(variantOneCostInput, { target: { value: "1300" } });
    expect(variantOneCostInput).toHaveValue("1300");
    const variantOneUnitCombobox = within(variantOneEditor).getByRole("combobox", { name: "Variant unit" });
    expect(variantOneUnitCombobox).toHaveAttribute("placeholder", "Search units");
    fireEvent.change(variantOneUnitCombobox, { target: { value: "box" } });
    fireEvent.click(screen.getByRole("option", { name: /^box/i }));
    expect(variantOneUnitCombobox).toHaveValue("box");
    const equivalentQuantity = await within(variantOneEditor).findByLabelText("Equivalent quantity");
    fireEvent.change(equivalentQuantity, { target: { value: "12" } });
    const equivalentUnitInput = within(variantOneEditor).getByLabelText("Equivalent unit");
    fireEvent.change(equivalentUnitInput, { target: { value: "pieces" } });
    expect(equivalentUnitInput).toHaveValue("pieces");
    clickDrawerAddVariant(variantsPanel);
    await waitFor(() => expect(within(variantsPanel).getByRole("button", { name: "Open V-2 — Option 2" })).toHaveAttribute("aria-pressed", "true"));
    const variantTwoEditor = within(variantsPanel).getByLabelText("Variant editor");
    fireEvent.change(within(variantTwoEditor).getByLabelText("Variant Name"), { target: { value: "Variant 2" } });
    expect(within(variantsPanel).getByRole("button", { name: "Delete variant" })).toBeInTheDocument();
    const variantTwoCostInput = within(variantTwoEditor).getByLabelText("Variant unit cost");
    fireEvent.change(variantTwoCostInput, { target: { value: "1450" } });
    expect(variantTwoCostInput).toHaveValue("1450");
    const variantTwoUnitCombobox = within(variantTwoEditor).getByRole("combobox", { name: "Variant unit" });
    fireEvent.change(variantTwoUnitCombobox, { target: { value: "tile-box" } });
    fireEvent.click(screen.getByRole("option", { name: 'Add unit "tile-box"' }));
    expect(variantTwoUnitCombobox).toHaveValue("tile-box");
    fireEvent.click(within(variantsPanel).getByRole("button", { name: "Open V-1 — Variant 1" }));
    const brandCombobox = within(dialog).getByRole("combobox", { name: "Brand" });
    fireEvent.change(brandCombobox, { target: { value: "Acme Hardware" } });
    const supplierCombobox = within(dialog).getByRole("combobox", { name: "Supplier" });
    fireEvent.change(supplierCombobox, { target: { value: "Database" } });
    fireEvent.click(screen.getByRole("option", { name: "Database Supplier" }));
    await waitFor(() => expect(supplierCombobox).toHaveValue("Database Supplier"));
    fireEvent.click(activityTab);
    expect(componentTab).toHaveAttribute("aria-selected", "false");
    expect(activityTab).toHaveAttribute("aria-selected", "true");
    expect(activityTab).toHaveClass("border-b-[#F24405]");
    expect(componentTab).toHaveClass("border-b-transparent");
    const activityPanel = within(dialog).getByRole("tabpanel", { name: "Activity" });
    expect(within(activityPanel).getByLabelText("Component lifecycle")).toBeInTheDocument();
    expect(within(activityPanel).getByText(/Default cost: PHP 1,300.00/)).toBeInTheDocument();
    fireEvent.click(within(activityPanel).getByRole("combobox", { name: "Component state" }));
    fireEvent.click(within(screen.getByRole("listbox", { name: "Component state" })).getByRole("option", { name: "In production" }));
    expect(within(activityPanel).getByRole("combobox", { name: "Component state" })).toHaveTextContent("In production");

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Component" }));

    await waitFor(() => expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledTimes(1));
    const createdPayload = actionMocks.createCostLibraryComponent.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(createdPayload).not.toHaveProperty("kind");
    expect(createdPayload).not.toHaveProperty("sku");
    expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Acoustic Wall Panel",
        category: "Fabrication",
        unit: "box",
        supplierId: "db-supplier",
        supplier: "Database Supplier",
        brand: "Acme Hardware",
        brandId: null,
        lifecycleState: "in_production",
        priceOptions: [
          expect.objectContaining({
            label: "Variant 1",
            sku: "ACP-600",
            variantDescription: "",
            variantSortOrder: 1,
            unit: "box",
            unitCost: 1300,
            packageQuantity: 12,
            packageUnit: "pieces",
            isDefault: true,
          }),
          expect.objectContaining({
            label: "Variant 2",
            variantSortOrder: 2,
            unit: "tile-box",
            unitCost: 1450,
            isDefault: false,
          }),
        ],
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add Component" })).not.toBeInTheDocument());
  });

  it("renders versioned components as ecommerce-style catalogue cards without lifecycle or history chrome", async () => {
    renderLibraryShell(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        libraryFolders={sharedFolders}
        libraryItems={[
          {
            ...sharedLibraryItems[0],
            lifecycleState: "available",
            componentVersionNumber: 1,
            brand: "Database Brand",
            priceOptionId: "retail-price",
            priceOptionLabel: "Retail",
            priceOptions: [
              { id: "retail-price", label: "Retail", unit: "pc", unitCost: 1200, miscCost: 0, currency: "PHP", isDefault: true, isActive: true },
              { id: "installed-price", label: "Installed", unit: "pc", unitCost: 1600, miscCost: 100, currency: "PHP", isDefault: false, isActive: true },
            ],
            history: [
              { id: "version-1", type: "version", label: "Version 1", summary: "Component created", effectiveAt: "2026-05-22T00:00:00.000Z" },
            ],
          },
        ]}
      />,
    );
    await waitForLibraryWorkspace();

    const sheet = screen.getByLabelText("Component table");
    const grid = within(sheet).getByLabelText("All Components component catalogue grid");
    const card = grid.querySelector('[data-component-catalogue-card-id="db-library-steel-frame"]');
    expect(card).not.toBeNull();
    const cardElement = card as HTMLElement;
    const cardName = within(cardElement).getByText("Database Steel Frame");
    const cardBrand = within(cardElement).getByText("Database Brand");
    const cardSupplier = within(cardElement).getByText("Database Supplier");
    expect(cardName).toBeInTheDocument();
    expect(cardBrand).toBeInTheDocument();
    expect(cardSupplier).toBeInTheDocument();
    expect(cardName.compareDocumentPosition(cardBrand) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cardBrand.compareDocumentPosition(cardSupplier) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(card as HTMLElement).getByText("₱1,200.00")).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText("Cost / pc")).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText("Fabrication")).toBeInTheDocument();
    expect(within(sheet).queryByLabelText(/component catalogue branch/)).not.toBeInTheDocument();
    expect(within(sheet).queryByText("History / v1")).not.toBeInTheDocument();
    expect(within(sheet).queryByText("Available")).not.toBeInTheDocument();
    expect(within(sheet).queryByLabelText("Pricing option for Database Steel Frame")).not.toBeInTheDocument();
    expect(within(sheet).queryByLabelText("Lifecycle state for Database Steel Frame")).not.toBeInTheDocument();
  });

  it("keeps supplier organization inside Components and scopes the sheet directly to suppliers", async () => {
    renderLibraryShell(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[
          { id: "db-supplier", name: "Database Supplier", sort_order: 1 },
          { id: "db-custom-supplier", name: "Custom Maker", sort_order: 2 },
        ]}
        libraryFolders={sharedFolders}
        libraryItems={sharedLibraryItems}
      />,
    );
    await waitForLibraryWorkspace();

    const viewMode = openComponentOrganizationMenu();
    fireEvent.click(within(viewMode).getByRole("menuitemradio", { name: "Suppliers" }));

    expect(screen.getByRole("button", { name: "Organize by: Suppliers" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("tab", { name: "Suppliers" })).not.toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "All Suppliers" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("treeitem", { name: "Database Supplier" }));

    const sheet = screen.getByLabelText("Component table");
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).queryByText("Owner Supplied Sink")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library row collection")).not.toBeInTheDocument();
  });

  it("reorders library folders by dragging a folder row on the shared tree", async () => {
    renderLibraryShell(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        libraryFolders={sharedFolders}
        libraryItems={sharedLibraryItems}
        canManageLibrary
      />,
    );
    await waitForLibraryWorkspace();

    const tree = await screen.findByRole("tree", { name: "Library folders" });
    const detailsRow = tree.querySelector('[data-tree-row="folder:folder-details"]') as HTMLElement;
    const fabricationRow = tree.querySelector('[data-tree-row="folder:folder-fabrication"]') as HTMLElement;
    expect(detailsRow).not.toBeNull();
    expect(fabricationRow).not.toBeNull();
    expect(detailsRow).toHaveAttribute("draggable", "true");

    // Drop the nested "Details" folder before the top-level Fabrication folder;
    // this lifts it out to parent_id null and persists the new sibling order.
    setRowRect(fabricationRow);
    const dataTransfer = createDragDataTransfer();
    dispatchDragEvent(detailsRow, "dragstart", { dataTransfer });
    dispatchDragEvent(fabricationRow, "dragover", { dataTransfer, clientY: 1 });
    dispatchDragEvent(fabricationRow, "drop", { dataTransfer, clientY: 1 });

    await waitFor(() => {
      expect(actionMocks.reorderLibraryFolders).toHaveBeenCalledWith({
        updates: expect.arrayContaining([
          expect.objectContaining({ id: "folder-details", parentId: null }),
          expect.objectContaining({ id: "folder-fabrication", parentId: null }),
        ]),
      });
    });
  });

  it("lets component rows move to another library folder from the tree", async () => {
    renderLibraryShell(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        libraryFolders={sharedFolders}
        libraryItems={sharedLibraryItems}
        canManageLibrary
      />,
    );
    await waitForLibraryWorkspace();

    const tree = await screen.findByRole("tree", { name: "Library folders" });
    const componentRow = tree.querySelector('[data-tree-row$=":db-library-steel-frame"]') as HTMLElement;
    const detailsRow = tree.querySelector('[data-tree-row="folder:folder-details"]') as HTMLElement;
    expect(componentRow).not.toBeNull();
    expect(componentRow).toHaveAttribute("draggable", "true");
    expect(detailsRow).not.toBeNull();

    // A component dropped on any band of a folder row moves into that folder.
    const dataTransfer = createDragDataTransfer();
    fireEvent.dragStart(componentRow, { dataTransfer });
    fireEvent.dragOver(detailsRow, { dataTransfer });
    fireEvent.drop(detailsRow, { dataTransfer });

    await waitFor(() =>
      expect(actionMocks.moveCostLibraryComponentToFolder).toHaveBeenCalledWith({
        itemId: "db-library-steel-frame",
        libraryFolderId: "folder-details",
      }),
    );
    // Library Optimization Plan P0 T4: the move now patches the warm TanStack Query
    // cache instead of calling router.refresh() (which re-ran the whole server
    // segment). The optimistic local update + cache patch keep the UI consistent.
    expect(navigationMocks.refresh).not.toHaveBeenCalled();
  });
});
