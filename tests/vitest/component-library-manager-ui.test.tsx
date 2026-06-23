import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentProps, ReactNode } from "react";

import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";

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
  createLibraryFolder: vi.fn(),
  deleteLibraryFolder: vi.fn(),
  executeBulkArchiveLibraryComponents: vi.fn(),
  moveCostLibraryComponentToFolder: vi.fn(),
  previewBulkArchiveLibraryComponents: vi.fn(),
  renameLibraryFolder: vi.fn(),
  reorderLibraryFolders: vi.fn(),
  getCostLibraryComponentUsage: vi.fn(),
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
function withQueryClient(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function renderLibrary(overrides: Partial<ComponentProps<typeof LibraryPageClient>> = {}) {
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
        {...overrides}
      />,
    ),
  );
  const componentTree = await screen.findByLabelText("Component library tree", undefined, { timeout: 10_000 });
  // The folder tree surface is a named dynamic import; its toolbar is the stable anchor.
  await within(componentTree).findByRole("button", { name: /View by:/ }, { timeout: 10_000 });
  return result;
}

function getSheetContextStrip(sheet: HTMLElement) {
  const strip = sheet.querySelector('[data-component-sheet-context-strip="true"]');
  if (!strip) throw new Error("Component table context strip not found");
  return strip as HTMLElement;
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

function getLibraryFolderButtonWithin(scope: HTMLElement, name: string) {
  const matches = within(scope).getAllByRole("treeitem", { name });
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

function openComponentViewMenu() {
  fireEvent.click(screen.getByRole("button", { name: /View by:/ }));
  return screen.getByRole("menu", { name: "Component view mode" });
}

function openAddComponentViewMenu(dialog: HTMLElement) {
  fireEvent.click(within(dialog).getByRole("button", { name: /View by:/ }));
  return within(dialog).getByRole("menu", { name: "Add component view mode" });
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
  });

  beforeEach(() => {
    navigationMocks.refresh.mockReset();
    navigationMocks.push.mockReset();
    navigationMocks.replace.mockReset();
    navigationMocks.pathname = "/workshop/library/components";
    navigationMocks.searchParams = "";
    window.history.replaceState(null, "", navigationMocks.pathname);
    actionMocks.createCostLibraryComponent.mockReset();
    actionMocks.createLibraryFolder.mockReset();
    actionMocks.deleteLibraryFolder.mockReset();
    actionMocks.executeBulkArchiveLibraryComponents.mockReset();
    actionMocks.moveCostLibraryComponentToFolder.mockReset();
    actionMocks.previewBulkArchiveLibraryComponents.mockReset();
    actionMocks.renameLibraryFolder.mockReset();
    actionMocks.reorderLibraryFolders.mockReset();
    actionMocks.getCostLibraryComponentUsage.mockReset();
    actionMocks.getCostLibraryComponentUsage.mockResolvedValue({ templateRowCount: 0, estimateRowCount: 0 });
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
    expect(within(sheet).getByLabelText("Component table tools")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Show component table search" })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Filter components" })).toBeInTheDocument();
    const addComponentButton = within(sheet).getByRole("button", { name: "Add component" });
    expect(addComponentButton).toHaveTextContent("Add component");
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

    // The single-tab tablists are retired in favor of a plain-text context strip.
    expect(screen.queryByRole("tablist", { name: "Library views" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Component table tabs" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Components" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "All Components" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Templates" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Suppliers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Custom" })).not.toBeInTheDocument();
    const contextStrip = getSheetContextStrip(sheet);
    expect(contextStrip).toHaveTextContent("All Components · 3 components");
    expect(contextStrip).toHaveTextContent("Sorted by folder order");
    expect(screen.queryByLabelText("Library row collection")).not.toBeInTheDocument();

    expect(screen.queryByLabelText("Search library")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library tools")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New component" })).not.toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "Component library table" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library filters")).not.toBeInTheDocument();
    expect(screen.queryByText("Demo seed")).not.toBeInTheDocument();
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
    expect(getSheetContextStrip(sheet)).toHaveTextContent("All Components · 3 components");

    const addDialog = await screen.findByRole("dialog", { name: "Add Component" }, { timeout: 15_000 });
    const nesting = within(addDialog).getByLabelText("Component nesting");
    expect(within(nesting).queryByRole("treeitem", { name: "All Components" })).not.toBeInTheDocument();
    expect(within(nesting).queryByRole("treeitem", { name: "Fabrication" })).not.toBeInTheDocument();
  });

  it("uses an in-app discard confirmation for dirty Add Component drafts", async () => {
    await renderLibrary();

    const addComponentModalSource = readFileSync(join(process.cwd(), "src/components/workshop/component-library-manager/AddComponentModal.tsx"), "utf8");
    expect(addComponentModalSource).not.toContain("window.confirm");
    expect(addComponentModalSource).toContain("ConfirmDialog");

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));
    const addDialog = await screen.findByRole("dialog", { name: "Add Component" }, { timeout: 15_000 });

    fireEvent.change(within(addDialog).getByLabelText("Name"), {
      target: { value: "Draft component" },
    });
    fireEvent.click(within(addDialog).getByRole("button", { name: "Close add component modal" }));

    const discardDialog = await screen.findByRole("dialog", { name: "Discard this draft?" });
    expect(discardDialog).toHaveTextContent("You have unsaved changes to this component. They are lost if you leave.");

    fireEvent.click(within(discardDialog).getByRole("button", { name: "Keep editing" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Discard this draft?" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("dialog", { name: "Add Component" })).toBeInTheDocument();
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

  it("deep-links clicked component cards into inspector route state", async () => {
    await renderLibrary();
    fireEvent.click(screen.getByRole("button", { name: "View details for Custom Cabinet Pull" }));

    expect(`${window.location.pathname}${window.location.search}`).toBe(
      "/workshop/library/components?component=db-library-custom-cabinet-pull",
    );
    expect(await screen.findByLabelText("Component inspector")).toHaveTextContent("Custom Cabinet Pull");
  });

  it("uses editable folder navigation and shows component leaves inside the library tree", async () => {
    await renderLibrary();

    const tree = screen.getByLabelText("Component library tree");
    const sheet = screen.getByLabelText("Component table");
    const folderTree = within(tree).getByRole("tree", { name: "Library folders" });
    expect(folderTree).toHaveClass("space-y-0");

    expect(within(tree).queryByRole("treeitem", { name: "All Components" })).not.toBeInTheDocument();
    expect(getLibraryFolderButton("Details")).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "Custom Cabinet Pull" })).toBeInTheDocument();
    expect(getSheetContextStrip(sheet)).toHaveTextContent("All Components · 3 components");
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

    const fabricationBranch = within(sheet).getByLabelText("Fabrication component catalogue branch");
    const detailsBranch = within(sheet).getByLabelText("Fabrication / Details component catalogue branch");
    const emptyBranch = within(sheet).getByLabelText("Fabrication / Details / Empty Child component catalogue branch");
    expect(fabricationBranch).toHaveAttribute("data-component-catalogue-folder-depth", "0");
    expect(detailsBranch).toHaveAttribute("data-component-catalogue-folder-depth", "1");
    expect(emptyBranch).toHaveAttribute("data-component-catalogue-folder-depth", "2");
    expect(fabricationBranch.firstElementChild).toHaveClass("min-h-[72px]");
    expect(detailsBranch.firstElementChild).toHaveClass("min-h-[72px]");
    expect(emptyBranch.firstElementChild).toHaveClass("min-h-[72px]");
    expect(fabricationBranch.firstElementChild).toHaveClass("bg-white/80");
    expect(fabricationBranch.firstElementChild).toHaveClass("border-white/60");
    expect(fabricationBranch.firstElementChild).not.toHaveClass("border-l-2");
    expect(fabricationBranch.firstElementChild).not.toHaveClass("border-l-divider/70");
    expect(detailsBranch.firstElementChild).not.toHaveClass("border-l-2");
    expect(emptyBranch.firstElementChild).not.toHaveClass("border-l-2");
    expect(fabricationBranch.firstElementChild).not.toHaveClass("bg-surfaceMuted/70");
    expect(fabricationBranch.firstElementChild).not.toHaveAttribute("style");
    expect(detailsBranch.firstElementChild).not.toHaveAttribute("style");
    expect(emptyBranch.firstElementChild).not.toHaveAttribute("style");
    expect(within(fabricationBranch).getByText("Component Library")).toHaveClass("text-tertiary/70");
    expect(within(fabricationBranch).getByRole("heading", { name: "Fabrication" })).toHaveClass("font-medium");
    expect(within(detailsBranch).getByText("Fabrication", { selector: "p" })).toHaveClass("text-tertiary/70");
    expect(within(detailsBranch).getByRole("heading", { name: "Details" })).toHaveClass("font-medium");
    expect(within(emptyBranch).getByText("Fabrication / Details", { selector: "p" })).toHaveClass("text-tertiary/70");
    expect(within(emptyBranch).getByRole("heading", { name: "Empty Child" })).toHaveClass("font-medium");
    expect(within(fabricationBranch).queryByText(/\d+ items?/i)).not.toBeInTheDocument();
    expect(within(emptyBranch).queryByText("Empty folder")).not.toBeInTheDocument();
    expect(within(fabricationBranch).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(fabricationBranch).getByText("Database Brand")).toBeInTheDocument();
    const emptyFolderRow = tree.querySelector('[data-tree-row="folder:folder-empty-child"]');
    expect(emptyFolderRow).not.toBeNull();
    expect(within(emptyFolderRow as HTMLElement).queryByRole("button", { name: /Collapse|Expand/ })).toBeNull();
    const detailsCard = detailsBranch.querySelector('[data-component-catalogue-card-id="db-library-custom-cabinet-pull"]');
    const emptyRow = emptyBranch.querySelector('[data-component-catalogue-empty-row="true"]');
    expect(detailsCard).not.toBeNull();
    expect(emptyRow).toBeNull();
    expect(within(detailsCard as HTMLElement).getByText("Custom Cabinet Pull")).toBeInTheDocument();
    expect(within(detailsCard as HTMLElement).getByText("Fabrication / Details")).toBeInTheDocument();
    expect(within(detailsCard as HTMLElement).getByText("Pull Studio")).toBeInTheDocument();
    expect(within(emptyBranch).queryByText("No components in this folder yet.")).not.toBeInTheDocument();
    expect(emptyBranch.querySelector('[data-component-catalogue-empty-card="true"]')).toBeNull();
    const detailsGrid = within(detailsBranch).getByLabelText("Fabrication / Details component catalogue grid");
    expect(detailsGrid).not.toHaveAttribute("style");
    expect(detailsGrid).toHaveClass("list-none");
    expect(detailsGrid).toHaveClass("p-0");

    fireEvent.click(within(detailsBranch).getByRole("button", { name: "Collapse Fabrication / Details" }));

    expect(within(detailsBranch).getByRole("button", { name: "Expand Fabrication / Details" })).toHaveAttribute("aria-expanded", "false");
    expect(within(detailsBranch).queryByText("Custom Cabinet Pull")).not.toBeInTheDocument();
    expect(within(detailsBranch).queryByLabelText("Fabrication / Details / Empty Child component catalogue branch")).not.toBeInTheDocument();

    fireEvent.click(within(detailsBranch).getByRole("button", { name: "Expand Fabrication / Details" }));

    expect(within(detailsBranch).getByRole("button", { name: "Collapse Fabrication / Details" })).toHaveAttribute("aria-expanded", "true");
    expect(within(detailsBranch).getByText("Custom Cabinet Pull")).toBeInTheDocument();
    expect(within(detailsBranch).getByLabelText("Fabrication / Details / Empty Child component catalogue branch")).toBeInTheDocument();

    fireEvent.click(getLibraryFolderButton("Details"));

    expect(getSheetContextStrip(sheet)).toHaveTextContent("Details · 1 component");
    const selectedDetailsBranch = within(sheet).getByLabelText("Fabrication / Details component catalogue branch");
    expect(selectedDetailsBranch.firstElementChild).toHaveClass("bg-white/80");
    expect(selectedDetailsBranch.firstElementChild).not.toHaveClass("border-l-2");
    expect(selectedDetailsBranch.firstElementChild).not.toHaveClass("border-l-divider/70");
    expect(selectedDetailsBranch.firstElementChild).not.toHaveClass("bg-surfaceMuted/70");
    expect(within(selectedDetailsBranch).getByText("Custom Cabinet Pull")).toBeInTheDocument();
    expect(within(sheet).getByLabelText("Fabrication / Details / Empty Child component catalogue branch")).toBeInTheDocument();
    expect(within(sheet).queryByText("Database Steel Frame")).not.toBeInTheDocument();
  });

  it("shows catalogue result counts and searches pricing source trust fields", async () => {
    await renderLibrary({
      libraryItems: sharedLibraryItems.map((item) =>
        item.id === "db-library-steel-frame"
          ? { ...item, pricingSource: "May quote ledger", confidence: "supplier quote" }
          : item,
      ),
    });

    const sheet = screen.getByLabelText("Component table");
    const contextStrip = getSheetContextStrip(sheet);
    expect(contextStrip).toHaveTextContent("All Components · 3 components");
    expect(contextStrip).toHaveTextContent("Sorted by folder order");
    expect(within(sheet).getByText("Source: May quote ledger")).toBeInTheDocument();
    expect(within(sheet).getAllByText("Checked 2026-05-22").length).toBeGreaterThan(0);
    expect(within(sheet).getByText("Confidence: supplier quote")).toBeInTheDocument();

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

    expect(contextStrip).toHaveTextContent('1 of 3 match "quote ledger"');
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).queryByText("Custom Cabinet Pull")).not.toBeInTheDocument();
    expect(within(sheet).queryByText("Owner Supplied Sink")).not.toBeInTheDocument();

    fireEvent.change(sheetSearch, { target: { value: "database brand" } });

    expect(contextStrip).toHaveTextContent('1 of 3 match "database brand"');
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).queryByText("Custom Cabinet Pull")).not.toBeInTheDocument();

    // Facet filters report through the same live summary once search is cleared.
    fireEvent.change(sheetSearch, { target: { value: "" } });
    expect(contextStrip).toHaveTextContent("Sorted by folder order");

    fireEvent.click(within(sheet).getByRole("button", { name: "Filter components" }));
    const filterDialog = within(sheet).getByRole("dialog");
    expect(within(filterDialog).getByText("Filter components")).toBeInTheDocument();
    expect(within(filterDialog).getByRole("button", { name: "Reset filters" })).toBeDisabled();

    fireEvent.click(within(filterDialog).getByRole("checkbox", { name: "supplier quote" }));

    expect(contextStrip).toHaveTextContent("1 of 3 after filters");
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).queryByText("Custom Cabinet Pull")).not.toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Filter components (1 active)" })).toBeInTheDocument();

    fireEvent.click(within(filterDialog).getByRole("button", { name: "Reset filters" }));

    expect(contextStrip).toHaveTextContent("Sorted by folder order");
    expect(within(sheet).getByText("Custom Cabinet Pull")).toBeInTheDocument();
  });

  it("moves supplier organization under Components instead of a top-level Suppliers tab", async () => {
    await renderLibrary();

    const viewMode = openComponentViewMenu();
    expect(screen.getByText("View By")).toBeInTheDocument();
    expect(within(viewMode).getByRole("menuitemradio", { name: "Default" })).toHaveAttribute("aria-checked", "true");
    expect(within(viewMode).getByRole("menuitemradio", { name: "Brand" })).toHaveAttribute("aria-checked", "false");
    fireEvent.click(within(viewMode).getByRole("menuitemradio", { name: "Suppliers" }));

    const tree = screen.getByLabelText("Component library tree");
    const sheet = screen.getByLabelText("Component table");

    expect(screen.queryByRole("tab", { name: "Suppliers" })).not.toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "All Suppliers" })).toHaveAttribute("aria-selected", "true");
    expect(within(tree).getByRole("treeitem", { name: "Database Supplier" })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();

    fireEvent.click(within(tree).getByRole("treeitem", { name: "Database Supplier" }));

    expect(getSheetContextStrip(sheet)).toHaveTextContent("Database Supplier · 1 component");
    const supplierBranch = within(sheet).getByLabelText("Fabrication component catalogue branch");
    expect(within(supplierBranch).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(supplierBranch).getByText("Database Supplier")).toBeInTheDocument();
    expect(within(sheet).queryByText("Owner Supplied Sink")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library row collection")).not.toBeInTheDocument();
  });

  it("adds Brand as a component organization view and scopes the sheet directly to brands", async () => {
    await renderLibrary();

    const viewMode = openComponentViewMenu();
    fireEvent.click(within(viewMode).getByRole("menuitemradio", { name: "Brand" }));

    const tree = screen.getByLabelText("Component library tree");
    const sheet = screen.getByLabelText("Component table");

    expect(screen.getByRole("button", { name: "View by: Brand" })).toHaveAttribute("aria-pressed", "false");
    expect(within(tree).getByRole("treeitem", { name: "All Brands" })).toHaveAttribute("aria-selected", "true");
    expect(within(tree).getByRole("treeitem", { name: "Database Brand" })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "Pull Studio" })).toBeInTheDocument();

    fireEvent.click(within(tree).getByRole("treeitem", { name: "Database Brand" }));

    expect(getSheetContextStrip(sheet)).toHaveTextContent("Database Brand · 1 component");
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).queryByText("Custom Cabinet Pull")).not.toBeInTheDocument();
    expect(within(sheet).queryByText("Owner Supplied Sink")).not.toBeInTheDocument();
  });

  it("uses the same working folder expanders inside the Add Component modal", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    const modalFabricationArrow = getLibraryFolderArrowWithin(dialog, "folder-fabrication");
    expect(getLibraryFolderButtonWithin(dialog, "Fabrication")).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getByRole("treeitem", { name: "Details" })).toBeInTheDocument();

    fireEvent.click(modalFabricationArrow);

    expect(getLibraryFolderButtonWithin(dialog, "Fabrication")).toHaveAttribute("aria-expanded", "false");
    expect(within(dialog).queryByRole("treeitem", { name: "Details" })).not.toBeInTheDocument();

    fireEvent.click(getLibraryFolderArrowWithin(dialog, "folder-fabrication"));

    expect(getLibraryFolderButtonWithin(dialog, "Fabrication")).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getByRole("treeitem", { name: "Details" })).toBeInTheDocument();
  });

  it("runs rename and delete folder actions inside the Add Component modal tree", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    const managerSource = readFileSync(join(process.cwd(), "src/components/workshop/component-library-manager/ComponentLibraryManager.tsx"), "utf8");
    expect(managerSource).not.toContain("window.prompt");
    expect(managerSource).not.toContain("window.confirm");
    expect(managerSource).toContain("ConfirmDialog");

    actionMocks.renameLibraryFolder.mockResolvedValueOnce({
      folder: {
        ...sharedLibraryFolders[1],
        name: "Renamed Details",
      },
    });

    fireEvent.contextMenu(getLibraryFolderButtonWithin(dialog, "Details"), { clientX: 16, clientY: 16 });

    expect(await screen.findByRole("menuitem", { name: "Select" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Add folder" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));

    const renameDialog = await screen.findByRole("dialog", { name: "Rename folder" });
    fireEvent.change(within(renameDialog).getByLabelText("Folder name"), {
      target: { value: "Renamed Details" },
    });
    fireEvent.click(within(renameDialog).getByRole("button", { name: "Save name" }));

    await waitFor(() => expect(actionMocks.renameLibraryFolder).toHaveBeenCalledWith("folder-details", "Renamed Details"));
    await waitFor(() => expect(getLibraryFolderButtonWithin(dialog, "Renamed Details")).toBeInTheDocument());

    actionMocks.deleteLibraryFolder.mockResolvedValueOnce(undefined);

    fireEvent.contextMenu(getLibraryFolderButtonWithin(dialog, "Renamed Details"), { clientX: 16, clientY: 16 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));

    const deleteDialog = await screen.findByRole("alertdialog", { name: "Delete folder?" });
    expect(deleteDialog).toHaveTextContent('Delete "Renamed Details"? Its 1 component and 1 subfolder move out of this folder; nothing is deleted from the library.');
    expect(within(deleteDialog).getByRole("button", { name: "Keep folder" })).toBeInTheDocument();
    fireEvent.click(within(deleteDialog).getByRole("button", { name: "Delete folder" }));

    await waitFor(() => expect(actionMocks.deleteLibraryFolder).toHaveBeenCalledWith("folder-details"));
  });

  it("keeps folder actions recoverable when rename or delete fails", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));
    const dialog = await screen.findByRole("dialog", { name: "Add Component" });

    actionMocks.renameLibraryFolder.mockRejectedValueOnce(new Error("Folder was changed by someone else."));

    fireEvent.contextMenu(getLibraryFolderButtonWithin(dialog, "Details"), { clientX: 16, clientY: 16 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rename" }));

    const renameDialog = await screen.findByRole("dialog", { name: "Rename folder" });
    fireEvent.change(within(renameDialog).getByLabelText("Folder name"), {
      target: { value: "Conflicted Details" },
    });
    fireEvent.click(within(renameDialog).getByRole("button", { name: "Save name" }));

    expect((await screen.findAllByText("Folder was changed by someone else.")).length).toBeGreaterThan(0);
    expect(getLibraryFolderButtonWithin(dialog, "Details")).toBeInTheDocument();
    expect(within(dialog).queryByRole("treeitem", { name: "Conflicted Details" })).not.toBeInTheDocument();

    actionMocks.deleteLibraryFolder.mockRejectedValueOnce(new Error("Folder still has children."));

    fireEvent.contextMenu(getLibraryFolderButtonWithin(dialog, "Details"), { clientX: 16, clientY: 16 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));

    const deleteDialog = await screen.findByRole("alertdialog", { name: "Delete folder?" });
    fireEvent.click(within(deleteDialog).getByRole("button", { name: "Delete folder" }));

    expect((await screen.findAllByText("Folder still has children.")).length).toBeGreaterThan(0);
    expect(getLibraryFolderButtonWithin(dialog, "Details")).toBeInTheDocument();
  });

  it("keeps supplier typing in the current Add Component tree view and stages the supplier folder", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    const viewMode = openAddComponentViewMenu(dialog);
    expect(within(viewMode).getByRole("menuitemradio", { name: "Default" })).toHaveAttribute("aria-checked", "true");
    expect(within(dialog).getByRole("treeitem", { name: "Fabrication" })).toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole("combobox", { name: "Supplier" }), {
      target: { value: "Future Fabricator" },
    });

    expect(within(dialog).getByRole("combobox", { name: "Supplier" })).toHaveValue("Future Fabricator");
    expect(within(viewMode).getByRole("menuitemradio", { name: "Default" })).toHaveAttribute("aria-checked", "true");
    expect(within(dialog).queryByRole("treeitem", { name: "All Suppliers" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("treeitem", { name: "Future Fabricator" })).not.toBeInTheDocument();

    fireEvent.click(within(viewMode).getByRole("menuitemradio", { name: "Suppliers" }));

    expect(within(dialog).getByRole("button", { name: "View by: Suppliers" })).toHaveAttribute("aria-pressed", "false");
    expect(within(dialog).getByRole("treeitem", { name: "Future Fabricator" })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps brand typing in the current Add Component tree view and stages the brand folder", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    const viewMode = openAddComponentViewMenu(dialog);
    expect(within(viewMode).getByRole("menuitemradio", { name: "Default" })).toHaveAttribute("aria-checked", "true");
    expect(within(dialog).getByRole("treeitem", { name: "Fabrication" })).toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole("combobox", { name: "Brand" }), {
      target: { value: "Future Studio" },
    });

    expect(within(dialog).getByRole("combobox", { name: "Brand" })).toHaveValue("Future Studio");
    expect(within(viewMode).getByRole("menuitemradio", { name: "Default" })).toHaveAttribute("aria-checked", "true");
    expect(within(dialog).queryByRole("treeitem", { name: "All Brands" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("treeitem", { name: "Future Studio" })).not.toBeInTheDocument();

    fireEvent.click(within(viewMode).getByRole("menuitemradio", { name: "Brand" }));

    expect(within(dialog).getByRole("button", { name: "View by: Brand" })).toHaveAttribute("aria-pressed", "false");
    expect(within(dialog).getByRole("treeitem", { name: "Future Studio" })).toHaveAttribute("aria-selected", "true");
  });

  it("opens a cost manager with timestamped component cost data", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    expect(within(dialog).getByText("Cost baseline")).toBeInTheDocument();
    expect(within(dialog).getByText(/Updated /)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Open cost manager" }));

    const manager = await screen.findByRole("dialog", { name: "Cost Manager" });
    expect(within(manager).getByText("Variant 1 cost data")).toBeInTheDocument();
    expect(within(manager).getByText("Current entry")).toBeInTheDocument();
    expect(within(manager).getByText("All cost entries")).toBeInTheDocument();
    expect(within(manager).getByRole("textbox", { name: "Cost manager unit cost" })).toBeInTheDocument();
    expect(within(manager).getByRole("textbox", { name: "Cost manager misc cost" })).toBeInTheDocument();
    expect(within(manager).getByLabelText("Cost manager pricing source")).toBeInTheDocument();
    expect(within(manager).getByLabelText("Cost manager pricing date")).toBeInTheDocument();
    expect(within(manager).getByLabelText("Cost manager confidence")).toBeInTheDocument();
    expect(within(manager).getByLabelText("Cost manager source URL")).toBeInTheDocument();
    expect(within(manager).getByLabelText("Cost manager notes")).toBeInTheDocument();

    fireEvent.click(within(manager).getByRole("button", { name: "Add cost entry" }));

    const costEntries = within(manager).getByRole("listbox", { name: "Cost manager entries" });
    expect(within(costEntries).getAllByRole("option")).toHaveLength(2);
  });

  it("commits a cost confidence through the shared dropdown select", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Open cost manager" }));

    const manager = await screen.findByRole("dialog", { name: "Cost Manager" });
    const confidenceTrigger = within(manager).getByRole("combobox", { name: "Cost manager confidence" });
    expect(confidenceTrigger).toHaveTextContent("Medium");

    fireEvent.click(confidenceTrigger);
    const listbox = screen.getByRole("listbox", { name: "Cost manager confidence" });
    expect(listbox.parentElement).toBe(document.body);

    fireEvent.click(within(listbox).getByRole("option", { name: "High" }));

    expect(confidenceTrigger).toHaveTextContent("High");
    expect(screen.queryByRole("listbox", { name: "Cost manager confidence" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Cost Manager" })).toBeInTheDocument();
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
    // The draft update propagates to the activity history summary row.
    const lifecycleHistoryRow = within(activityPanel).getByText("Lifecycle state").closest('[role="listitem"]') as HTMLElement;
    expect(within(lifecycleHistoryRow).getByText("In production")).toBeInTheDocument();

    // Escape with the listbox open closes only the listbox; the hosting modal stays.
    fireEvent.click(lifecycleTrigger);
    expect(screen.getByRole("listbox", { name: "Component state" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("listbox", { name: "Component state" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Add Component" })).toBeInTheDocument();
  });

  it("renders unit dropdowns with clear code and meaning columns", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    const unitInput = within(dialog).getByRole("combobox", { name: "Unit" });

    fireEvent.focus(unitInput);
    fireEvent.change(unitInput, { target: { value: "" } });

    const unitOptions = within(dialog).getByRole("listbox", { name: "Unit options" });
    expect(within(unitOptions).getByText("Code")).toBeInTheDocument();
    expect(within(unitOptions).getByText("Meaning")).toBeInTheDocument();
    expect(unitOptions.querySelector('[data-combobox-option-code="pc"]')).toHaveTextContent("pc");
    expect(unitOptions.querySelector('[data-combobox-option-meaning="Piece"]')).toHaveTextContent("Piece");

    fireEvent.change(unitInput, { target: { value: "box" } });
    fireEvent.click(within(dialog).getByRole("option", { name: "box Box / carton" }));

    const packageUnitInput = within(dialog).getByRole("combobox", { name: "Content per box unit" });
    fireEvent.focus(packageUnitInput);

    const packageUnitOptions = within(dialog).getByRole("listbox", { name: "Content per box unit options" });
    expect(within(packageUnitOptions).getByText("Code")).toBeInTheDocument();
    expect(within(packageUnitOptions).getByText("Meaning")).toBeInTheDocument();
    expect(packageUnitOptions.querySelector('[data-combobox-option-code="pieces"]')).toHaveTextContent("pieces");
    expect(packageUnitOptions.querySelector('[data-combobox-option-meaning="Count"]')).toHaveTextContent("Count");

    fireEvent.click(within(dialog).getByRole("button", { name: "Advanced catalog details" }));
    const dimensionUnitInput = within(dialog).getByRole("combobox", { name: "Dimension unit" });
    fireEvent.focus(dimensionUnitInput);

    const dimensionUnitOptions = within(dialog).getByRole("listbox", { name: "Dimension unit options" });
    expect(dimensionUnitOptions).toHaveAttribute("data-combobox-popup-placement", "top");
    expect(within(dimensionUnitOptions).getByText("Code")).toBeInTheDocument();
    expect(within(dimensionUnitOptions).getByText("Meaning")).toBeInTheDocument();
    expect(dimensionUnitOptions.querySelector('[data-combobox-option-code="mm"]')).toHaveTextContent("mm");
    expect(dimensionUnitOptions.querySelector('[data-combobox-option-meaning="Millimeter"]')).toHaveTextContent("Millimeter");
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

  it("searches folder labels without reintroducing procurement scopes as category folders", async () => {
    await renderLibrary();

    const treeSearch = openLibraryTreeSearch();
    fireEvent.change(treeSearch, { target: { value: "luminaire" } });

    expect(screen.getByLabelText("Search component library tree")).toHaveValue("luminaire");
    expect(screen.queryByText("FF&E")).not.toBeInTheDocument();
    expect(screen.queryByText("Furniture, Fixtures, and Equipment")).not.toBeInTheDocument();
    expect(screen.queryByText("Fixtures & Equipment")).not.toBeInTheDocument();
  });
});
