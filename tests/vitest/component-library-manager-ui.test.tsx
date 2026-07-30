import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentProps, ReactNode } from "react";

import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import { LibraryFolderTreeSurface } from "@/components/workshop/component-library-manager/LibraryFolderTree";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import { workspaceComponentRowsLibraryQueryKey } from "@/lib/component-library/query-keys";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { ComponentRowsLibraryDataset } from "@/lib/repositories/component-library-repository";

const navigationMocks = vi.hoisted(() => {
  const refresh = vi.fn();
  const push = vi.fn();
  const replace = vi.fn();
  return {
    refresh,
    push,
    replace,
    router: { refresh, push, replace },
    pathname: "/workshop/library/components",
    searchParams: "",
  };
});

const actionMocks = vi.hoisted(() => ({
  createCostLibraryComponent: vi.fn(),
  saveCostLibraryComponentDraft: vi.fn(),
  createLibraryFolder: vi.fn(),
  deleteLibraryFolder: vi.fn(),
  executeBulkArchiveLibraryComponents: vi.fn(),
  findCurrentWorkspaceCostLibraryComponentDuplicate: vi.fn(),
  moveCostLibraryComponentToFolder: vi.fn(),
  previewBulkArchiveLibraryComponents: vi.fn(),
  renameLibraryFolder: vi.fn(),
  reorderLibraryFolders: vi.fn(),
  getCostLibraryComponentUsage: vi.fn(),
  loadCostLibraryComponentRowDetail: vi.fn(),
}));

vi.mock("@/lib/component-library/actions", () => actionMocks);

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks.router,
  usePathname: () => navigationMocks.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
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

const sharedLibraryFolders: LibraryFolderRecord[] = [
  {
    id: "folder-fabrication",
    workspace_id: "workspace-1",
    parent_id: null,
    name: "Fabrication",
    sort_order: 10,
    source_category_node_id: null,
    folder_kind: "custom",
  },
  {
    id: "folder-details",
    workspace_id: "workspace-1",
    parent_id: "folder-fabrication",
    name: "Details",
    sort_order: 10,
    source_category_node_id: null,
    folder_kind: "custom",
  },
  {
    id: "folder-empty-child",
    workspace_id: "workspace-1",
    parent_id: "folder-details",
    name: "Empty Child",
    sort_order: 20,
    source_category_node_id: null,
    folder_kind: "custom",
  },
];

const sharedBrands = [
  {
    id: "db-brand",
    name: "Database Brand",
    normalized_name: "database brand",
    sort_order: 1,
  },
  {
    id: "db-pull-studio",
    name: "Pull Studio",
    normalized_name: "pull studio",
    sort_order: 2,
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
    id: "db-library-custom-cabinet-pull",
    material: "Custom Cabinet Pull",
    name: "Custom Cabinet Pull",
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
    id: "db-library-owner-supplied-sink",
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

const unmatchedLibraryItem: EstimateRowItem = {
  id: "db-library-custom-bronze-widget",
  material: "Custom Bronze Widget",
  name: "Custom Bronze Widget",
  description: "Component without a matching taxonomy folder",
  supplier: "Unmatched Supplier",
  supplierId: "db-unmatched-supplier",
  source: "library",
  unit: "pc",
  itemCost: 900,
  price: 900,
  currency: "PHP",
  quantity: 1,
  subTotal: 900,
  miscCost: 0,
  totalItemCosts: 900,
  category: "Obscure specialty",
  categoryNodeId: "missing-category-node",
  categoryPath: ["Obscure specialty"],
  pricingSource: "Unmatched Supplier",
  pricingDate: "2026-05-22",
};

// LibraryPageClient now owns a TanStack Query cache (P0 T3), so it needs a provider.
function withQueryClient(
  children: ReactNode,
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function renderLibrary(overrides: Partial<ComponentProps<typeof LibraryPageClient>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  window.history.replaceState(
    null,
    "",
    `${navigationMocks.pathname}${navigationMocks.searchParams ? `?${navigationMocks.searchParams}` : ""}`,
  );
  const result = render(
    withQueryClient(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[
          { id: "db-supplier", name: "Database Supplier", sort_order: 1 },
          { id: "db-custom-supplier", name: "Custom Maker", sort_order: 2 },
        ]}
        brands={sharedBrands}
        libraryFolders={sharedLibraryFolders}
        libraryItems={sharedLibraryItems}
        canManageLibrary
        {...overrides}
      />,
      queryClient,
    ),
  );
  const componentTree = await screen.findByLabelText("Component library tree", undefined, { timeout: 10_000 });
  // The folder tree surface is a named dynamic import; its toolbar is the stable anchor.
  await within(componentTree).findByRole("button", { name: /Organize by:/ }, { timeout: 10_000 });
  return Object.assign(result, { queryClient });
}

function getCatalogueGrid(sheet: HTMLElement, label: string) {
  return within(sheet).getByRole("list", { name: `${label} component catalogue grid` });
}

function clickDrawerAddVariant(drawer: HTMLElement) {
  const addVariantButtons = within(drawer).getAllByRole("button", { name: "Add variant" });
  fireEvent.click(addVariantButtons[addVariantButtons.length - 1]);
}

function openLibraryTreeSearch() {
  const tree = screen.getByLabelText("Component library tree");
  fireEvent.click(within(tree).getByRole("button", { name: "Show library folder search" }));
  return within(tree).getByRole("searchbox", { name: "Search component library tree" });
}

function openComponentSheetSearch() {
  const sheet = screen.getByLabelText("Component table");
  fireEvent.click(within(sheet).getByRole("button", { name: "Show component table search" }));
  return within(sheet).getByRole("searchbox", { name: "Search components" });
}

function getLibraryFolderButton(name: string) {
  const matches = screen.getAllByRole("treeitem", { name });
  const folderButton = matches.find((element) => (element.getAttribute("data-tree-row") ?? "").startsWith("folder:"));
  if (!folderButton) throw new Error(`Library folder button not found: ${name}`);
  return folderButton;
}

function getLibraryFolderArrowWithin(scope: HTMLElement, folderId: string) {
  const row = scope.querySelector(`[data-tree-row="folder:${folderId}"]`);
  if (!row) throw new Error(`Library folder row not found: ${folderId}`);
  const arrow = within(row as HTMLElement).queryByRole("button", { name: /Collapse|Expand/ });
  if (!arrow) throw new Error(`Library folder arrow not found: ${folderId}`);
  return arrow as HTMLElement;
}

function getComponentNameInspectButton(itemId: string) {
  const button = document.querySelector(`[data-component-card-inspect="${itemId}"]`);
  if (!(button instanceof HTMLElement)) throw new Error(`Inspect button not found for ${itemId}`);
  return button;
}

function openComponentOrganizationMenu() {
  fireEvent.click(screen.getByRole("button", { name: /Organize by:/ }));
  return screen.getByRole("menu", { name: "Component view mode" });
}

describe("component library manager bundle boundaries", () => {
  it("keeps the library folder tree surface behind a named dynamic import", () => {
    const managerSource = readFileSync(join(process.cwd(), "src/components/workshop/component-library-manager/ComponentLibraryManager.tsx"), "utf8");

    expect(managerSource).toContain('import("./LibraryFolderTree").then((module) => module.LibraryFolderTreeSurface)');
    expect(managerSource).not.toContain('from "./LibraryFolderTree"');
    expect(managerSource).toContain('from "./library-folder-tree-shared"');
  });
});

describe("component library manager UI", () => {
  beforeAll(async () => {
    await import("@/components/workshop/component-library-manager/ComponentLibraryManager");
    await import("@/components/workshop/component-library-manager/AddComponentModal");

    if (!window.PointerEvent) {
      window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
    }
  }, 60_000);

  beforeEach(() => {
    navigationMocks.refresh.mockReset();
    navigationMocks.push.mockReset();
    navigationMocks.replace.mockReset();
    navigationMocks.pathname = "/workshop/library/components";
    navigationMocks.searchParams = "";
    window.history.replaceState(null, "", navigationMocks.pathname);
    actionMocks.createCostLibraryComponent.mockReset();
    actionMocks.saveCostLibraryComponentDraft.mockReset();
    actionMocks.saveCostLibraryComponentDraft.mockResolvedValue({
      draftId: "component-draft-1",
      savedAt: "2026-07-06T00:00:00.000Z",
    });
    actionMocks.createLibraryFolder.mockReset();
    actionMocks.deleteLibraryFolder.mockReset();
    actionMocks.executeBulkArchiveLibraryComponents.mockReset();
    actionMocks.findCurrentWorkspaceCostLibraryComponentDuplicate.mockReset();
    actionMocks.findCurrentWorkspaceCostLibraryComponentDuplicate.mockResolvedValue(null);
    actionMocks.moveCostLibraryComponentToFolder.mockReset();
    actionMocks.previewBulkArchiveLibraryComponents.mockReset();
    actionMocks.renameLibraryFolder.mockReset();
    actionMocks.reorderLibraryFolders.mockReset();
    actionMocks.getCostLibraryComponentUsage.mockReset();
    actionMocks.getCostLibraryComponentUsage.mockResolvedValue({ templateRowCount: 0, estimateRowCount: 0 });
    actionMocks.loadCostLibraryComponentRowDetail.mockReset();
    actionMocks.loadCostLibraryComponentRowDetail.mockResolvedValue(null);
  });

  it("renders the library workspace without the retired standalone manager chrome", async () => {
    await renderLibrary();

    expect(screen.getByLabelText("Component library workspace")).toBeInTheDocument();
    expect(screen.getByLabelText("Component library tree")).toBeInTheDocument();
    expect(screen.getByLabelText("Component table")).toBeInTheDocument();

    const workspace = screen.getByLabelText("Component library workspace");
    const tree = screen.getByLabelText("Component library tree");
    const sheet = screen.getByLabelText("Component table");

    // Persistent search inputs are retired; both panels expose magnifier disclosures instead.
    expect(screen.queryByLabelText("Search component library tree")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Search component table")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Search components")).not.toBeInTheDocument();
    expect(within(tree).getByRole("button", { name: "Show library folder search" })).toBeInTheDocument();
    expect(within(tree).getByRole("button", { name: "Add library folder" })).toHaveClass(
      "size-6",
      "bg-orange-100",
      "text-orange-700",
      "cursor-pointer",
    );
    expect(within(sheet).getByLabelText("Component table tools")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Show component table search" })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Filter components" })).toBeInTheDocument();
    const addComponentButton = within(sheet).getByRole("button", { name: "Add component" });
    expect(addComponentButton).toHaveClass("size-6", "bg-orange-100", "text-orange-700", "cursor-pointer");
    expect(addComponentButton).not.toHaveTextContent("Add component");
    expect(screen.queryByRole("button", { name: "Add Component" })).not.toBeInTheDocument();

    const workspaceFrame = document.querySelector('[data-component-library-workspace="true"]');
    const sheetPanel = workspace.querySelector('[data-component-library-sheet-panel="true"]');
    const treePanel = workspace.querySelector('[data-component-library-tree-panel="true"]');
    expect(workspaceFrame).toHaveAttribute("data-library-surface", "glass");
    expect(workspaceFrame).toHaveClass("estimate-glass-well");
    expect(sheetPanel).not.toBeNull();
    expect(treePanel).not.toBeNull();
    expect(treePanel).not.toHaveClass("border-l");
    expect(treePanel).not.toHaveClass("border-hairline");
    // The tree panel now leads the sheet on the left side of the workspace.
    expect(treePanel!.compareDocumentPosition(sheetPanel!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(document.querySelector('[data-component-library-center-header="true"]')).toBeNull();
    expect(document.querySelector('[data-workshop-layout="component-library-workspace-header-row"]')).toBeNull();

    // The retired manager tablists and persistent second toolbar row stay absent.
    expect(screen.queryByRole("tablist", { name: "Library views" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Component table tabs" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Components" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "All Components" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Templates" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Suppliers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Custom" })).not.toBeInTheDocument();
    expect(sheet.querySelector('[data-component-sheet-context-strip="true"]')).toBeNull();
    const tools = within(sheet).getByLabelText("Component table tools");
    expect(within(tools).getByRole("button", { name: "Filter components" })).toBeInTheDocument();
    expect(within(tools).getByRole("combobox", { name: "View components" })).toBeInTheDocument();
    expect(within(tools).getByRole("combobox", { name: "Sort components by" })).toBeInTheDocument();
    expect(within(tools).getByRole("combobox", { name: "Component sort order" })).toBeInTheDocument();
    expect(within(getCatalogueGrid(sheet, "All Components")).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByLabelText("Library row collection")).not.toBeInTheDocument();

    expect(screen.queryByLabelText("Search library")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library tools")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New component" })).not.toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "Component library table" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library filters")).not.toBeInTheDocument();
    expect(screen.queryByText("Demo seed")).not.toBeInTheDocument();
  });

  it("opens the inline folder-name dialog from the compact Add folder control", async () => {
    const animationFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    try {
      await renderLibrary();

      const addFolderButton = screen.getByRole("button", { name: "Add library folder" });
      fireEvent.pointerDown(addFolderButton, { button: 0, pointerType: "mouse" });
      fireEvent.mouseUp(addFolderButton, { button: 0 });
      fireEvent.click(addFolderButton);

      const dialog = await screen.findByRole("dialog", { name: "New folder" });
      expect(screen.getByRole("dialog", { name: "New folder" })).toBe(dialog);
      await waitFor(() => expect(within(dialog).getByLabelText("Folder name")).toHaveFocus());
      expect(within(dialog).getByRole("button", { name: "Create folder" })).toBeInTheDocument();

      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(addFolderButton).toHaveFocus());
    } finally {
      animationFrame.mockRestore();
    }
  });

  it("skips folder-trigger focus restoration after the trigger disconnects", async () => {
    await renderLibrary();
    const addFolderButton = screen.getByRole("button", { name: "Add library folder" });
    fireEvent.click(addFolderButton);
    const dialog = await screen.findByRole("dialog", { name: "New folder" });
    await waitFor(() => expect(within(dialog).getByLabelText("Folder name")).toHaveFocus());

    let restoreFocus: FrameRequestCallback | undefined;
    const animationFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      restoreFocus = callback;
      return 1;
    });
    try {
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      addFolderButton.remove();
      restoreFocus?.(0);
      expect(addFolderButton).not.toHaveFocus();
    } finally {
      animationFrame.mockRestore();
    }
  });

  it("routes the tree-toolbar Add folder control through its create callback", () => {
    const onCreateFolder = vi.fn();
    render(
      <LibraryFolderTreeSurface
        folders={[]}
        folderNodes={[]}
        selectedFolderId={null}
        onSelectFolder={vi.fn()}
        onCreateFolder={onCreateFolder}
        searchAriaLabel="Search folders"
        folderSearchPlaceholder="Search folders"
        supplierSearchPlaceholder="Search suppliers"
        toolbarAriaLabel="Folder tools"
        toolbarLabelPrefix="folder"
        viewModeAriaLabel="Folder view mode"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add library folder" }));

    expect(onCreateFolder).toHaveBeenCalledWith(null, expect.objectContaining({ placement: "top" }));
  });

  it("starts new workspaces with zero library folders while keeping all-components browsing", async () => {
    navigationMocks.searchParams = "add=component";
    await renderLibrary({
      libraryFolders: [
        {
          id: "legacy-taxonomy-folder",
          workspace_id: "workspace-1",
          parent_id: null,
          name: "Legacy Seed Folder",
          sort_order: 10,
          source_category_node_id: "db-category-fabrication",
          folder_kind: "taxonomy",
        },
      ],
    });

    const tree = screen.getByLabelText("Component library tree");
    const folderTree = within(tree).getByRole("tree", { name: "Library folders" });
    expect(within(folderTree).queryAllByRole("treeitem")).toHaveLength(0);
    expect(within(folderTree).queryByRole("treeitem", { name: "All Components" })).not.toBeInTheDocument();
    expect(within(folderTree).queryByRole("treeitem", { name: "Database Components" })).not.toBeInTheDocument();
    expect(within(folderTree).queryByRole("treeitem", { name: "Fabrication" })).not.toBeInTheDocument();
    expect(within(folderTree).queryByRole("treeitem", { name: "Legacy Seed Folder" })).not.toBeInTheDocument();

    const sheet = screen.getByLabelText("Component table");
    expect(within(getCatalogueGrid(sheet, "All Components")).getAllByRole("listitem")).toHaveLength(3);

    const addDialog = await screen.findByRole("dialog", { name: "Add Component" }, { timeout: 15_000 });
    expect(within(addDialog).queryByLabelText("Component nesting")).not.toBeInTheDocument();
    expect(within(addDialog).getByRole("textbox", { name: "Direct category" })).toHaveValue("Uncategorized");
  });

  it("uses an in-app discard confirmation for dirty Add Component drafts", async () => {
    await renderLibrary();

    const addComponentModalSource = readFileSync(join(process.cwd(), "src/components/workshop/component-library-manager/AddComponentModal.tsx"), "utf8");
    expect(addComponentModalSource).not.toContain("window.confirm");
    expect(addComponentModalSource).not.toContain("saveCostLibraryComponentDraft");
    expect(addComponentModalSource).toContain("closeOnOverlayClick={false}");
    expect(addComponentModalSource).toContain("closeOnEscape={false}");
    expect(addComponentModalSource).toContain('size="md"');
    expect(addComponentModalSource).toContain("sm:grid-cols-[minmax(0,1fr)_auto_auto]");
    expect(addComponentModalSource).toContain('variant="brand"');

    const dialogSource = readFileSync(join(process.cwd(), "src/components/ui/overlays/dialog.tsx"), "utf8");
    expect(dialogSource).toContain("flex-wrap");
    expect(dialogSource).not.toContain("flex shrink-0 items-center gap-1");

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));
    const addDialog = await screen.findByRole("dialog", { name: "Add Component" }, { timeout: 15_000 });

    fireEvent.change(within(addDialog).getByLabelText("Name"), {
      target: { value: "Draft component" },
    });
    fireEvent.click(within(addDialog).getByRole("button", { name: "Close add component modal" }));

    const discardDialog = await screen.findByRole("dialog", { name: "Discard unsaved component?" });
    expect(discardDialog).toHaveTextContent("This component has unsaved edits.");
    expect(discardDialog).toHaveTextContent("Unsaved changes are not stored after you discard them.");
    expect(within(discardDialog).queryByRole("button", { name: "Save to drafts" })).not.toBeInTheDocument();
    expect(within(discardDialog).getByRole("button", { name: "Add Component" })).toBeInTheDocument();

    fireEvent.click(within(discardDialog).getByRole("button", { name: "Keep editing" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Discard unsaved component?" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("dialog", { name: "Add Component" })).toBeInTheDocument();
  });

  it("keeps Add Component duplicate checks indexed instead of scanning every library item while typing", () => {
    const addComponentModalSource = readFileSync(join(process.cwd(), "src/components/workshop/component-library-manager/AddComponentModal.tsx"), "utf8");

    expect(addComponentModalSource).toContain("const duplicateIdentityIndex = useMemo");
    expect(addComponentModalSource).toContain("duplicateIdentityIndex.bySupplier.get");
    expect(addComponentModalSource).toContain("duplicateIdentityIndex.byBrand.get");
    expect(addComponentModalSource).not.toContain("libraryItems.find((item) =>");
  });

  it("discards dirty Add Component state without offering inaccessible draft storage", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));
    const addDialog = await screen.findByRole("dialog", { name: "Add Component" }, { timeout: 15_000 });

    fireEvent.change(within(addDialog).getByLabelText("Name"), {
      target: { value: "Draft component" },
    });
    fireEvent.click(within(addDialog).getByRole("button", { name: "Close add component modal" }));

    const discardDialog = await screen.findByRole("dialog", { name: "Discard unsaved component?" });
    expect(within(discardDialog).queryByRole("button", { name: "Save to drafts" })).not.toBeInTheDocument();
    fireEvent.click(within(discardDialog).getByRole("button", { name: "Discard changes" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add Component" })).not.toBeInTheDocument());
    expect(actionMocks.saveCostLibraryComponentDraft).not.toHaveBeenCalled();
  });

  it("opens and closes the component inspector from route state without dropping other params", async () => {
    navigationMocks.searchParams = "component=db-library-custom-cabinet-pull&brand=none";

    await renderLibrary();

    const inspector = await screen.findByLabelText("Component inspector");
    expect(within(inspector).getByText("Custom Cabinet Pull")).toBeInTheDocument();

    fireEvent.click(within(inspector).getByRole("button", { name: "Close component details" }));

    await waitFor(() => {
      expect(screen.queryByLabelText("Component inspector")).not.toBeInTheDocument();
    });
    expect(`${window.location.pathname}${window.location.search}`).toBe("/workshop/library/components?brand=none");
  });

  it("fails safe for invalid component route state", async () => {
    navigationMocks.searchParams = "component=foreign-component&density=compact";

    await renderLibrary();

    await waitFor(() => {
      expect(`${window.location.pathname}${window.location.search}`).toBe("/workshop/library/components?density=compact");
    });
    expect(screen.queryByLabelText("Component inspector")).not.toBeInTheDocument();
  });

  it("hydrates a valid direct component link that is outside the loaded page", async () => {
    navigationMocks.searchParams = "component=db-library-custom-bronze-widget&density=compact";
    actionMocks.loadCostLibraryComponentRowDetail.mockResolvedValue(unmatchedLibraryItem);

    await renderLibrary();

    const inspector = await screen.findByLabelText("Component inspector");
    expect(inspector).toHaveTextContent("Custom Bronze Widget");
    expect(actionMocks.loadCostLibraryComponentRowDetail).toHaveBeenCalledWith("db-library-custom-bronze-widget");
    expect(`${window.location.pathname}${window.location.search}`).toBe(
      "/workshop/library/components?component=db-library-custom-bronze-widget&density=compact",
    );
  });

  it("deep-links clicked component cards into inspector route state", async () => {
    await renderLibrary();
    fireEvent.click(getComponentNameInspectButton("db-library-custom-cabinet-pull"));

    expect(`${window.location.pathname}${window.location.search}`).toBe(
      "/workshop/library/components?component=db-library-custom-cabinet-pull",
    );
    expect(await screen.findByLabelText("Component inspector")).toHaveTextContent("Custom Cabinet Pull");
  });

  it("keeps editable folder navigation while projecting components into one flat catalogue grid", async () => {
    await renderLibrary();

    const tree = screen.getByLabelText("Component library tree");
    const sheet = screen.getByLabelText("Component table");
    const folderTree = within(tree).getByRole("tree", { name: "Library folders" });
    expect(folderTree).toHaveClass("space-y-0");

    expect(within(tree).queryByRole("treeitem", { name: "All Components" })).not.toBeInTheDocument();
    expect(getLibraryFolderButton("Details")).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "Custom Cabinet Pull" })).toBeInTheDocument();
    expect(within(getCatalogueGrid(sheet, "All Components")).getAllByRole("listitem")).toHaveLength(3);
    expect(within(sheet).queryByRole("tablist")).not.toBeInTheDocument();
    expect(within(sheet).queryByLabelText("All Components component rows")).not.toBeInTheDocument();
    const fabricationArrow = getLibraryFolderArrowWithin(tree, "folder-fabrication");
    expect(getLibraryFolderButton("Fabrication")).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(fabricationArrow);

    expect(getLibraryFolderButton("Fabrication")).toHaveAttribute("aria-expanded", "false");
    expect(within(tree).queryByRole("treeitem", { name: "Details" })).not.toBeInTheDocument();

    fireEvent.click(getLibraryFolderArrowWithin(tree, "folder-fabrication"));

    expect(getLibraryFolderButton("Fabrication")).toHaveAttribute("aria-expanded", "true");
    expect(getLibraryFolderButton("Details")).toBeInTheDocument();

    const catalogueGrid = within(sheet).getByLabelText("All Components component catalogue grid");
    expect(catalogueGrid).toHaveClass("list-none");
    expect(catalogueGrid).toHaveClass("grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))]");
    expect(catalogueGrid.querySelectorAll("[data-component-catalogue-card-id]")).toHaveLength(3);
    expect(within(catalogueGrid).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(catalogueGrid).getByText("Database Brand")).toBeInTheDocument();
    expect(within(catalogueGrid).getByText("Fabrication / Details")).toBeInTheDocument();
    expect(within(sheet).queryByLabelText(/component catalogue branch/)).not.toBeInTheDocument();
    const emptyFolderRow = tree.querySelector('[data-tree-row="folder:folder-empty-child"]');
    expect(emptyFolderRow).not.toBeNull();
    expect(within(emptyFolderRow as HTMLElement).getByRole("button", { name: /Collapse|Expand/ })).toBeInTheDocument();
    const detailsCard = catalogueGrid.querySelector('[data-component-catalogue-card-id="db-library-custom-cabinet-pull"]');
    expect(detailsCard).not.toBeNull();
    expect(within(detailsCard as HTMLElement).getByText("Custom Cabinet Pull")).toBeInTheDocument();
    expect(within(detailsCard as HTMLElement).getByText("Fabrication / Details")).toBeInTheDocument();
    expect(within(detailsCard as HTMLElement).getByText("Pull Studio")).toBeInTheDocument();

    fireEvent.click(getLibraryFolderButton("Details"));

    expect(within(getCatalogueGrid(sheet, "Details")).getAllByRole("listitem")).toHaveLength(1);
    const selectedDetailsGrid = within(sheet).getByLabelText("Details component catalogue grid");
    expect(within(selectedDetailsGrid).getByText("Custom Cabinet Pull")).toBeInTheDocument();
    expect(selectedDetailsGrid.querySelectorAll("[data-component-catalogue-card-id]")).toHaveLength(1);
    expect(within(sheet).queryByText("Database Steel Frame")).not.toBeInTheDocument();
  });

  it("loads only the first visible catalogue image eagerly", async () => {
    await renderLibrary({
      libraryItems: sharedLibraryItems.map((item) => ({
        ...item,
        imageUrl: `/api/library/components/${item.id}/image`,
      })),
    });

    const catalogueGrid = screen.getByLabelText("All Components component catalogue grid");
    const images = catalogueGrid.querySelectorAll("img");

    expect(images).toHaveLength(3);
    expect(images[0]).toHaveAttribute("loading", "eager");
    expect(images[1]).toHaveAttribute("loading", "lazy");
    expect(images[2]).toHaveAttribute("loading", "lazy");
  });

  it("keeps the canonical toolbar add action available through empty and no-loaded-match recovery states", async () => {
    const emptyRender = await renderLibrary({ libraryItems: [] });
    const emptyState = document.querySelector('[data-component-library-empty-state="empty-library"]');
    expect(emptyState).not.toBeNull();
    expect(within(emptyState as HTMLElement).getByText("Build your component library")).toBeInTheDocument();
    expect(within(emptyState as HTMLElement).queryByRole("button", { name: "Add component" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add component" })).toHaveClass("size-6", "bg-orange-100", "text-orange-700");

    emptyRender.unmount();
    await renderLibrary();
    const sheetSearch = openComponentSheetSearch();
    fireEvent.change(sheetSearch, { target: { value: "no such loaded component" } });

    const noMatchState = document.querySelector('[data-component-library-empty-state="no-loaded-matches"]');
    expect(noMatchState).not.toBeNull();
    expect(within(noMatchState as HTMLElement).getByText("No loaded components match")).toBeInTheDocument();
    expect(within(noMatchState as HTMLElement).getByRole("button", { name: "Clear search" })).toBeInTheDocument();
  });

  it("shows catalogue result counts and searches pricing source fields", async () => {
    await renderLibrary({
      libraryItems: sharedLibraryItems.map((item) =>
        item.id === "db-library-steel-frame"
          ? { ...item, pricingSource: "May quote ledger" }
          : item,
      ),
    });

    const sheet = screen.getByLabelText("Component table");
    expect(within(getCatalogueGrid(sheet, "All Components")).getAllByRole("listitem")).toHaveLength(3);
    expect(within(sheet).getByText("Source: May quote ledger")).toBeInTheDocument();
    expect(within(sheet).getAllByText("Checked 2026-05-22").length).toBeGreaterThan(0);

    const treeSearch = openLibraryTreeSearch();
    fireEvent.change(treeSearch, { target: { value: "quote ledger" } });

    const tree = screen.getByLabelText("Component library tree");
    expect(within(tree).getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();
    expect(within(tree).queryByRole("treeitem", { name: "Custom Cabinet Pull" })).not.toBeInTheDocument();
    expect(within(tree).queryByRole("treeitem", { name: "Owner Supplied Sink" })).not.toBeInTheDocument();

    fireEvent.change(treeSearch, { target: { value: "database brand" } });

    expect(within(tree).getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();
    expect(within(tree).queryByRole("treeitem", { name: "Custom Cabinet Pull" })).not.toBeInTheDocument();

    const sheetSearch = openComponentSheetSearch();
    fireEvent.change(sheetSearch, { target: { value: "quote ledger" } });

    expect(within(getCatalogueGrid(sheet, "All Components")).getAllByRole("listitem")).toHaveLength(1);
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).queryByText("Custom Cabinet Pull")).not.toBeInTheDocument();
    expect(within(sheet).queryByText("Owner Supplied Sink")).not.toBeInTheDocument();

    fireEvent.change(sheetSearch, { target: { value: "database brand" } });

    expect(within(getCatalogueGrid(sheet, "All Components")).getAllByRole("listitem")).toHaveLength(1);
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).queryByText("Custom Cabinet Pull")).not.toBeInTheDocument();

    // The accessible catalogue list reflects search and facet result counts.
    fireEvent.change(sheetSearch, { target: { value: "" } });
    expect(within(getCatalogueGrid(sheet, "All Components")).getAllByRole("listitem")).toHaveLength(3);

    fireEvent.click(within(sheet).getByRole("button", { name: "Filter components" }));
    const filterDialog = within(sheet).getByRole("region", { name: "Filter components" });
    expect(within(filterDialog).getByText("Filter components")).toBeInTheDocument();
    expect(within(filterDialog).getByRole("button", { name: "Reset filters" })).toBeDisabled();

    fireEvent.click(within(filterDialog).getByRole("checkbox", { name: "Database Supplier" }));

    expect(within(getCatalogueGrid(sheet, "All Components")).getAllByRole("listitem")).toHaveLength(1);
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).queryByText("Custom Cabinet Pull")).not.toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Filter components (1 active)" })).toBeInTheDocument();

    fireEvent.click(within(filterDialog).getByRole("button", { name: "Reset filters" }));

    expect(within(getCatalogueGrid(sheet, "All Components")).getAllByRole("listitem")).toHaveLength(3);
    expect(within(sheet).getByText("Custom Cabinet Pull")).toBeInTheDocument();
  });

  it("uses the shared toolbar controls to sort both card and dense catalogue views", async () => {
    await renderLibrary();

    const sheet = screen.getByLabelText("Component table");
    const tools = within(sheet).getByLabelText("Component table tools");
    const cardOrder = () => Array.from(
      sheet.querySelectorAll<HTMLElement>("[data-component-catalogue-card-id]"),
      (card) => card.dataset.componentCatalogueCardId,
    );
    const denseOrder = () => Array.from(
      sheet.querySelectorAll<HTMLElement>("[data-component-dense-row-id]"),
      (row) => row.dataset.componentDenseRowId,
    );

    const sortField = within(tools).getByRole("combobox", { name: "Sort components by" });
    fireEvent.click(sortField);
    fireEvent.click(screen.getByRole("option", { name: "Component name" }));

    const sortOrder = within(tools).getByRole("combobox", { name: "Component sort order" });
    fireEvent.click(sortOrder);
    fireEvent.click(screen.getByRole("option", { name: "Z to A" }));

    expect(cardOrder()).toEqual([
      "db-library-owner-supplied-sink",
      "db-library-steel-frame",
      "db-library-custom-cabinet-pull",
    ]);

    const view = within(tools).getByRole("combobox", { name: "View components" });
    fireEvent.click(view);
    fireEvent.click(screen.getByRole("option", { name: "Dense table" }));

    expect(denseOrder()).toEqual([
      "db-library-owner-supplied-sink",
      "db-library-steel-frame",
      "db-library-custom-cabinet-pull",
    ]);

    fireEvent.click(sortOrder);
    fireEvent.click(screen.getByRole("option", { name: "A to Z" }));
    expect(denseOrder()).toEqual([
      "db-library-custom-cabinet-pull",
      "db-library-steel-frame",
      "db-library-owner-supplied-sink",
    ]);

    fireEvent.click(view);
    fireEvent.click(screen.getByRole("option", { name: "Cards" }));
    expect(cardOrder()).toEqual([
      "db-library-custom-cabinet-pull",
      "db-library-steel-frame",
      "db-library-owner-supplied-sink",
    ]);
  });

  it("moves supplier organization under Components instead of a top-level Suppliers tab", async () => {
    await renderLibrary();

    const viewMode = openComponentOrganizationMenu();
    expect(screen.getByText("Organize by")).toBeInTheDocument();
    expect(within(viewMode).getByRole("menuitemradio", { name: "Folders" })).toHaveAttribute("aria-checked", "true");
    expect(within(viewMode).getByRole("menuitemradio", { name: "Brands" })).toHaveAttribute("aria-checked", "false");
    fireEvent.click(within(viewMode).getByRole("menuitemradio", { name: "Suppliers" }));

    const tree = screen.getByLabelText("Component library tree");
    const sheet = screen.getByLabelText("Component table");

    expect(screen.queryByRole("tab", { name: "Suppliers" })).not.toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "All Suppliers" })).toHaveAttribute("aria-selected", "true");
    expect(within(tree).getByRole("treeitem", { name: "Database Supplier" })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();

    fireEvent.click(within(tree).getByRole("treeitem", { name: "Database Supplier" }));

    expect(within(getCatalogueGrid(sheet, "Database Supplier")).getAllByRole("listitem")).toHaveLength(1);
    const supplierGrid = within(sheet).getByLabelText("Database Supplier component catalogue grid");
    expect(within(supplierGrid).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(supplierGrid).getByText("Database Supplier")).toBeInTheDocument();
    expect(within(sheet).queryByText("Owner Supplied Sink")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library row collection")).not.toBeInTheDocument();
  });

  it("adds Brand as a component organization view and scopes the sheet directly to brands", async () => {
    await renderLibrary();

    const viewMode = openComponentOrganizationMenu();
    fireEvent.click(within(viewMode).getByRole("menuitemradio", { name: "Brands" }));

    const tree = screen.getByLabelText("Component library tree");
    const sheet = screen.getByLabelText("Component table");

    expect(screen.getByRole("button", { name: "Organize by: Brands" })).toHaveAttribute("aria-pressed", "false");
    expect(within(tree).getByRole("treeitem", { name: "All Brands" })).toHaveAttribute("aria-selected", "true");
    expect(within(tree).getByRole("treeitem", { name: "Database Brand" })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "Pull Studio" })).toBeInTheDocument();

    fireEvent.click(within(tree).getByRole("treeitem", { name: "Database Brand" }));

    expect(within(getCatalogueGrid(sheet, "Database Brand")).getAllByRole("listitem")).toHaveLength(1);
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).queryByText("Custom Cabinet Pull")).not.toBeInTheDocument();
    expect(within(sheet).queryByText("Owner Supplied Sink")).not.toBeInTheDocument();
  });

  it("renders the Add Component modal with the OpenDesign field contract instead of the retired nesting tree", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    expect(within(dialog).queryByLabelText("Component nesting")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("treeitem", { name: "Fabrication" })).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Name")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Description")).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: "Direct category" })).toHaveValue("Uncategorized");
    expect(within(dialog).getByRole("combobox", { name: "Supplier" })).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: "Brand" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Unit cost")).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: "Unit" })).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Pricing source")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Pricing date")).not.toBeInTheDocument();
  });

  it("keeps supplier and brand typing as form fields without staging modal tree folders", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });

    fireEvent.change(within(dialog).getByRole("combobox", { name: "Supplier" }), {
      target: { value: "Future Fabricator" },
    });

    expect(within(dialog).getByRole("combobox", { name: "Supplier" })).toHaveValue("Future Fabricator");
    expect(within(dialog).queryByRole("treeitem", { name: "All Suppliers" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("treeitem", { name: "Future Fabricator" })).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole("combobox", { name: "Brand" }), {
      target: { value: "Future Studio" },
    });

    expect(within(dialog).getByRole("combobox", { name: "Brand" })).toHaveValue("Future Studio");
    expect(within(dialog).queryByRole("treeitem", { name: "All Brands" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("treeitem", { name: "Future Studio" })).not.toBeInTheDocument();
  });

  it("opens the OpenDesign variant drawer instead of the retired cost manager", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Open variants panel" }));

    const drawer = within(dialog).getByRole("dialog", { name: "Manage variants" });
    expect(within(drawer).getByText("No variants yet.")).toBeInTheDocument();
    clickDrawerAddVariant(drawer);
    await waitFor(() => expect(within(drawer).getByRole("button", { name: "Open V-1 — Default" })).toHaveAttribute("aria-pressed", "true"));
    expect(within(drawer).getByLabelText("Variant Name")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("Variant Description")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("SKU / Reference")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("Variant unit cost")).toBeInTheDocument();
    const variantUnit = within(drawer).getByRole("combobox", { name: "Variant unit" });
    expect(variantUnit).toBeInTheDocument();
    expect(within(drawer).getByLabelText("Equivalent quantity")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("Equivalent unit")).toBeInTheDocument();

    fireEvent.change(variantUnit, { target: { value: "box" } });

    expect(within(drawer).getByLabelText("Equivalent quantity")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("Equivalent unit")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("Upload attachment")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Cost Manager" })).not.toBeInTheDocument();
    expect(within(drawer).queryByLabelText("Misc cost")).not.toBeInTheDocument();
    expect(within(drawer).queryByLabelText("Pricing source")).not.toBeInTheDocument();
  });

  it("keeps the OpenDesign modal/drawer motion, shadow, and alignment contracts in source", () => {
    const addComponentModalSource = readFileSync(join(process.cwd(), "src/components/workshop/component-library-manager/AddComponentModal.tsx"), "utf8");

    expect(addComponentModalSource).toContain("blurBackdrop");
    expect(addComponentModalSource).toContain("relative isolate flex");
    expect(addComponentModalSource).not.toContain("lg:-translate-x-[184px]");
    expect(addComponentModalSource).toContain("translate-x-[calc(-100%+1px)] opacity-100");
    expect(addComponentModalSource).not.toContain("translate-x-[calc(-100%+1px)] opacity-0");
    expect(addComponentModalSource).toContain("transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]");
    expect(addComponentModalSource).toContain("max-[1120px]:translate-x-[calc(100%+8px)]");
    expect(addComponentModalSource).toContain("motion-reduce:transition-none");
    expect(addComponentModalSource).toContain("OPENDESIGN_MODAL_SHADOW_CLASS");
    expect(addComponentModalSource).toContain("0_28px_70px_-24px_rgba(23,29,40,0.32)");
    expect(addComponentModalSource).toContain("OPENDESIGN_DRAWER_SHADOW_CLASS");
    expect(addComponentModalSource).toContain("24px_0_42px_-34px_rgba(23,29,40,0.48)");
    expect(addComponentModalSource).toContain("data-add-component-modal-over-drawer-shadow");
    expect(addComponentModalSource).toContain("right-[-32px] top-8 z-30 w-8");
    expect(addComponentModalSource).toContain('aria-hidden={!variantDrawerOpen}');
    expect(addComponentModalSource).toContain('variantDrawerOpen ? "opacity-100" : "pointer-events-none opacity-0"');
    expect(addComponentModalSource).toContain("left-[calc(100%-1px)] top-8 z-10 flex w-[min(533px,calc(100vw-32px))]");
    expect(addComponentModalSource).not.toContain("left-[calc(100%-8px)] top-8 z-10");
    expect(addComponentModalSource).not.toContain("top-[77px] z-10 flex");
    expect(addComponentModalSource).toContain("h-[49px] min-h-[49px] shrink-0");
    expect(addComponentModalSource).toContain("min-h-[176px]");
    expect(addComponentModalSource).toContain("h-[99px] grid-cols-[83px_minmax(0,1fr)]");
    expect(addComponentModalSource).toContain('sizes="83px"');
    expect(addComponentModalSource).toContain("pt-[6px]");
  });

  it("updates the lifecycle draft from the Activity tab and keeps the modal open on Escape", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    fireEvent.click(within(dialog).getByRole("tab", { name: "Activity" }));

    const activityPanel = within(dialog).getByRole("tabpanel", { name: "Activity" });
    const lifecycleTrigger = within(activityPanel).getByRole("combobox", { name: "Component state" });
    expect(lifecycleTrigger).toHaveTextContent("Available");

    fireEvent.click(lifecycleTrigger);
    // The listbox portals to document.body so the modal's overflow cannot clip it.
    const listbox = screen.getByRole("listbox", { name: "Component state" });
    expect(listbox.parentElement).toBe(document.body);

    fireEvent.click(within(listbox).getByRole("option", { name: "In production" }));

    expect(lifecycleTrigger).toHaveTextContent("In production");
    expect(screen.queryByRole("listbox", { name: "Component state" })).toBeNull();
    expect(within(activityPanel).getByText("Current state: In production. Default cost: PHP 0.00.")).toBeInTheDocument();
    expect(within(activityPanel).getByLabelText("Currency")).toHaveValue("PHP");
    expect(within(activityPanel).getByLabelText("Change note")).toBeInTheDocument();

    // Escape with the listbox open closes only the listbox; the hosting modal stays.
    fireEvent.click(lifecycleTrigger);
    expect(screen.getByRole("listbox", { name: "Component state" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("listbox", { name: "Component state" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Add Component" })).toBeInTheDocument();
  });

  it("renders main and variant unit dropdowns with clear code and meaning columns", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    const unitInput = within(dialog).getByRole("combobox", { name: "Unit" });

    fireEvent.focus(unitInput);
    fireEvent.change(unitInput, { target: { value: "" } });

    const unitOptions = screen.getByRole("listbox", { name: "Unit options" });
    expect(unitOptions.parentElement).toBe(document.body);
    expect(unitOptions).toHaveClass("fixed", "z-[1050]");
    expect(within(unitOptions).getByText("Code")).toBeInTheDocument();
    expect(within(unitOptions).getByText("Meaning")).toBeInTheDocument();
    expect(unitOptions.querySelector('[data-combobox-option-code="pc"]')).toHaveTextContent("pc");
    expect(unitOptions.querySelector('[data-combobox-option-meaning="Piece"]')).toHaveTextContent("Piece");

    fireEvent.click(within(dialog).getByRole("button", { name: "Open variants panel" }));
    const drawer = within(dialog).getByRole("dialog", { name: "Manage variants" });
    clickDrawerAddVariant(drawer);
    await waitFor(() => expect(within(drawer).getByRole("button", { name: "Open V-1 — Default" })).toHaveAttribute("aria-pressed", "true"));
    const variantUnitInput = within(drawer).getByRole("combobox", { name: "Variant unit" });
    fireEvent.focus(variantUnitInput);
    fireEvent.change(variantUnitInput, {
      target: { value: "" },
    });

    const variantUnitOptions = screen.getByRole("listbox", { name: "Variant unit options" });
    expect(variantUnitOptions.parentElement).toBe(document.body);
    expect(variantUnitOptions).toHaveClass("fixed", "z-[1050]");
    expect(within(variantUnitOptions).getByText("Code")).toBeInTheDocument();
    expect(within(variantUnitOptions).getByText("Meaning")).toBeInTheDocument();
    expect(variantUnitOptions.querySelector('[data-combobox-option-code="pc"]')).toHaveTextContent("pc");
    expect(variantUnitOptions.querySelector('[data-combobox-option-meaning="Piece"]')).toHaveTextContent("Piece");
  });

  it("removes collection dropdown behavior instead of hiding it", async () => {
    await renderLibrary({ libraryItems: [...sharedLibraryItems, unmatchedLibraryItem] });

    expect(screen.queryByLabelText("Library row collection")).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Estimate Row Items" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Custom Row Items" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Uncategorized" })).not.toBeInTheDocument();
    expect(screen.queryByText("Custom Row Items")).not.toBeInTheDocument();
    expect(screen.queryByText("Uncategorized")).not.toBeInTheDocument();

    const source = readFileSync(join(process.cwd(), "src/components/workshop/component-library-manager/ComponentLibraryManager.tsx"), "utf8");
    expect(source).not.toContain("RowCollectionSelect");
    expect(source).not.toContain("changeCollection");
    expect(source).not.toContain("collectionOptions");
    expect(source).not.toContain("activeCollectionId");
    expect(source).not.toContain("estimate-row-items");
    expect(source).not.toContain("custom-row-items");
    expect(source).not.toContain("uncategorized");
    expect(source).not.toContain("Uncategorized");
    expect(source).not.toContain("supplier-row-items");
  });

  it("does not expose template UI inside the component route", async () => {
    await renderLibrary();

    expect(screen.queryByRole("tab", { name: "Templates" })).not.toBeInTheDocument();
    expect(screen.queryByText("All Templates")).not.toBeInTheDocument();
    expect(screen.queryByText("Residential Rooms")).not.toBeInTheDocument();
    expect(screen.queryByText("Condo Fit-Out Starter")).not.toBeInTheDocument();
  });

  it("opens right-click actions on editable library folders", async () => {
    await renderLibrary();

    fireEvent.contextMenu(getLibraryFolderButton("Fabrication"), { clientX: 16, clientY: 16 });

    expect(await screen.findByRole("menuitem", { name: "Select" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Add folder" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Rename" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
  });

  it("does not expose folder bulk-selection checkboxes without a real folder bulk action", async () => {
    await renderLibrary();

    const tree = screen.getByRole("tree", { name: "Library folders" });
    expect(within(tree).queryByRole("checkbox", { name: "Select Fabrication" })).not.toBeInTheDocument();
    expect(within(tree).queryByRole("checkbox", { name: "Select Details" })).not.toBeInTheDocument();
  });

  it("keeps warm folder and component caches converged after deleting a folder", async () => {
    actionMocks.deleteLibraryFolder.mockResolvedValue(undefined);
    const { queryClient } = await renderLibrary();

    fireEvent.contextMenu(getLibraryFolderButton("Details"), { clientX: 16, clientY: 16 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    const confirmDialog = await screen.findByRole("alertdialog", { name: "Delete folder?" });
    fireEvent.click(within(confirmDialog).getByRole("button", { name: "Delete folder" }));

    await waitFor(() => expect(actionMocks.deleteLibraryFolder).toHaveBeenCalledWith("folder-details"));
    await waitFor(() => {
      const cached = queryClient.getQueryData<ComponentRowsLibraryDataset>(
        workspaceComponentRowsLibraryQueryKey("legacy-test-scope"),
      );
      expect(cached?.libraryFolders).not.toEqual(expect.arrayContaining([
        expect.objectContaining({ id: "folder-details" }),
      ]));
      expect(cached?.libraryFolders).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: "folder-empty-child", parent_id: "folder-fabrication", sort_order: 10 }),
      ]));
      expect(cached?.libraryItems.find((item) => item.id === "db-library-custom-cabinet-pull")?.libraryFolderId).toBeUndefined();
    });
  });

  it("does not infer that a folder is empty from a partial loaded component page", async () => {
    const partialLibrary: ComponentRowsLibraryDataset = {
      workspaceId: "legacy-test-scope",
      categoryTree: sharedCategoryTree,
      suppliers: [
        { id: "db-supplier", name: "Database Supplier", sort_order: 1 },
        { id: "db-custom-supplier", name: "Custom Maker", sort_order: 2 },
      ],
      brands: sharedBrands,
      libraryFolders: sharedLibraryFolders,
      libraryItems: sharedLibraryItems.filter((item) => item.libraryFolderId !== "folder-details"),
      isPartial: true,
      loadedComponentCount: 2,
      totalComponentCount: 52,
    };
    await renderLibrary({ initialLibrary: partialLibrary });

    fireEvent.contextMenu(getLibraryFolderButton("Details"), { clientX: 16, clientY: 16 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    const confirmDialog = await screen.findByRole("alertdialog", { name: "Delete folder?" });

    expect(confirmDialog).toHaveTextContent("Any components assigned to it stay in the library and lose this folder.");
    expect(confirmDialog).not.toHaveTextContent("This folder is empty");
  });

  it("searches folder labels without reintroducing procurement scopes as category folders", async () => {
    await renderLibrary();

    const treeSearch = openLibraryTreeSearch();
    fireEvent.change(treeSearch, { target: { value: "luminaire" } });

    expect(screen.getByLabelText("Search component library tree")).toHaveValue("luminaire");
    expect(screen.queryByText("FF&E")).not.toBeInTheDocument();
    expect(screen.queryByText("Furniture, Fixtures, and Equipment")).not.toBeInTheDocument();
    expect(screen.queryByText("Fixtures & Equipment")).not.toBeInTheDocument();
  });

  it("enforces the 500-component selection cap through the dense large-result fallback", async () => {
    const manyItems = Array.from({ length: 501 }, (_, index) => ({
      ...sharedLibraryItems[0],
      id: `bulk-component-${index + 1}`,
      name: `Bulk Component ${index + 1}`,
      material: `Bulk Component ${index + 1}`,
      libraryFolderId: undefined,
    }));
    await renderLibrary({ libraryFolders: [], libraryItems: manyItems });

    const cardScaleFallback = document.querySelector('[data-component-card-scale-fallback="true"]');
    expect(cardScaleFallback).not.toBeNull();
    fireEvent.click(within(cardScaleFallback as HTMLElement).getByRole("button", { name: "Dense" }));

    const firstCheckbox = document.querySelector('input[aria-label="Select Bulk Component 1"]');
    if (!(firstCheckbox instanceof HTMLInputElement)) throw new Error("First bulk-selection checkbox not found");
    fireEvent.click(firstCheckbox);
    fireEvent.click(screen.getByText("Select visible"));

    expect(screen.getByText("500 selected")).toBeInTheDocument();

    const sheetSearch = openComponentSheetSearch();
    fireEvent.change(sheetSearch, { target: { value: "Bulk Component 501" } });
    const checkbox501 = await screen.findByRole("checkbox", { name: "Select Bulk Component 501" });
    expect(checkbox501).toBeDisabled();
  });
});
