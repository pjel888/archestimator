import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { DraggingPosition, TreeItem, TreeItemIndex, TreeViewState } from "react-complex-tree";

import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";

// LibraryPageClient now owns a TanStack Query cache (P0 T3); each render gets a fresh
// provider so the seeded fixtures behave like an isolated warm cache.
function renderLibraryShell(element: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function waitForLibraryWorkspace() {
  // The tablists are retired; the dynamic tree surface's view-mode toggle is the stable anchor.
  await screen.findByRole("button", { name: /View by:/ }, { timeout: 10_000 });
}

function openComponentViewMenu() {
  fireEvent.click(screen.getByRole("button", { name: /View by:/ }));
  return screen.getByRole("menu", { name: "Component view mode" });
}

function openAddComponentViewMenu(dialog: HTMLElement) {
  fireEvent.click(within(dialog).getByRole("button", { name: /View by:/ }));
  return within(dialog).getByRole("menu", { name: "Add component view mode" });
}

const actionMocks = vi.hoisted(() => ({
  changeCostLibraryComponentLifecycleState: vi.fn(),
  createCostLibraryComponent: vi.fn(),
  createLibraryFolder: vi.fn(),
  deleteLibraryFolder: vi.fn(),
  deleteLibraryFoldersBulk: vi.fn(),
  executeBulkArchiveLibraryComponents: vi.fn(),
  moveCostLibraryComponentToFolder: vi.fn(),
  previewBulkArchiveLibraryComponents: vi.fn(),
  renameLibraryFolder: vi.fn(),
  reorderLibraryFolders: vi.fn(),
  upsertCostLibraryComponentPriceOption: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

type CapturedFolderTreeItemData = {
  kind: "folder" | "component";
  folderId: string | null;
  label: string;
  item?: EstimateRowItem;
  parentFolderId?: string;
};

type CapturedFolderEnvironmentProps = {
  items: Record<TreeItemIndex, TreeItem<CapturedFolderTreeItemData>>;
  getItemTitle: (item: TreeItem<CapturedFolderTreeItemData>) => string;
  viewState?: TreeViewState;
  canDragAndDrop?: boolean;
  canReorderItems?: boolean;
  canDropOnFolder?: boolean;
  canDropOnNonFolder?: boolean;
  canDropBelowOpenFolders?: boolean;
  canDropAt?: (items: TreeItem<CapturedFolderTreeItemData>[], target: DraggingPosition) => boolean;
  onDrop?: (items: TreeItem<CapturedFolderTreeItemData>[], target: DraggingPosition) => void | Promise<void>;
  onPrimaryAction?: (item: TreeItem<CapturedFolderTreeItemData>) => void;
};

const rctHarness = vi.hoisted(() => ({
  lastEnvironmentProps: null as CapturedFolderEnvironmentProps | null,
}));

vi.mock("@/lib/component-library/actions", () => actionMocks);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: navigationMocks.refresh,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("react-complex-tree", () => ({
  InteractionMode: { ClickArrowToExpand: "ClickArrowToExpand" },
  ControlledTreeEnvironment: (props: CapturedFolderEnvironmentProps & { children: React.ReactNode }) => {
    rctHarness.lastEnvironmentProps = props;
    return <div data-rct-environment="true">{props.children}</div>;
  },
  Tree: ({ rootItem, treeLabel }: { rootItem: TreeItemIndex; treeLabel: string }) => {
    const environment = rctHarness.lastEnvironmentProps;
    if (!environment) return null;
    const selectedItems = new Set(environment.viewState?.["library-folder-tree"]?.selectedItems?.map(String) ?? []);
    const expandedItems = new Set(environment.viewState?.["library-folder-tree"]?.expandedItems?.map(String) ?? []);

    function renderChildren(parentId: TreeItemIndex): React.ReactNode {
      const parent = environment.items[parentId];
      return (
        <ol>
          {(parent?.children ?? []).map((childId) => {
            const child = environment.items[childId];
            return (
              <li key={String(childId)}>
                <button
                  type="button"
                  role="treeitem"
                  aria-label={environment.getItemTitle(child)}
                  aria-selected={selectedItems.has(String(childId))}
                  aria-expanded={child?.children?.length ? expandedItems.has(String(childId)) : undefined}
                  data-library-folder-node-id={String(childId)}
                  onClick={() => environment.onPrimaryAction?.(child)}
                >
                  {environment.getItemTitle(child)}
                </button>
                {child?.children?.length ? renderChildren(childId) : null}
              </li>
            );
          })}
        </ol>
      );
    }

    return (
      <div role="tree" aria-label={treeLabel}>
        {renderChildren(rootItem)}
      </div>
    );
  },
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
    source_category_node_id: "db-category-fabrication",
    folder_kind: "taxonomy" as const,
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
    actionMocks.deleteLibraryFolder.mockReset();
    actionMocks.deleteLibraryFoldersBulk.mockReset();
    actionMocks.executeBulkArchiveLibraryComponents.mockReset();
    actionMocks.moveCostLibraryComponentToFolder.mockReset();
    actionMocks.previewBulkArchiveLibraryComponents.mockReset();
    actionMocks.changeCostLibraryComponentLifecycleState.mockReset();
    actionMocks.renameLibraryFolder.mockReset();
    actionMocks.reorderLibraryFolders.mockReset();
    actionMocks.upsertCostLibraryComponentPriceOption.mockReset();
    actionMocks.reorderLibraryFolders.mockResolvedValue(undefined);
    actionMocks.moveCostLibraryComponentToFolder.mockResolvedValue(undefined);
    navigationMocks.refresh.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    rctHarness.lastEnvironmentProps = null;
  });

  it("uses /workshop/library as the canonical route and redirects the retired components and templates routes", () => {
    const libraryRoute = readFileSync(join(process.cwd(), "src/app/workshop/library/page.tsx"), "utf8");
    const libraryLayout = readFileSync(join(process.cwd(), "src/app/workshop/library/layout.tsx"), "utf8");
    const componentsSharedRoute = readFileSync(join(process.cwd(), "src/components/workshop/library/LibraryComponentsRoute.tsx"), "utf8");
    const componentsSubRoute = readFileSync(join(process.cwd(), "src/app/workshop/library/components/page.tsx"), "utf8");
    const libraryTemplatesRoute = readFileSync(join(process.cwd(), "src/app/workshop/library/templates/page.tsx"), "utf8");
    const componentsRoute = readFileSync(join(process.cwd(), "src/app/workshop/components/page.tsx"), "utf8");
    const templatesRoute = readFileSync(join(process.cwd(), "src/app/workshop/templates/page.tsx"), "utf8");

    expect(libraryRoute).toContain("LibraryOverview");
    expect(libraryRoute).toContain("getLibraryOverview");
    expect(libraryRoute).not.toContain("LibraryComponentsRoute");
    expect(componentsSubRoute).toContain("LibraryComponentsRoute");
    expect(componentsSharedRoute).toContain("LibraryPageClient");
    expect(componentsSharedRoute).toContain("getCurrentWorkspaceComponentRowsLibrary");
    expect(componentsSharedRoute).not.toContain("getCurrentWorkspaceComponentLibrary");
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

  it("keeps Supabase upload review safeguards in place", () => {
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
    expect(addComponentModal).toContain("disabled={isPending || imageBusy || attachmentBusy || validation.length > 0}");
    expect(nextConfig).toContain('url.protocol === "http:" ? "http" : url.protocol === "https:" ? "https" : null');
    expect(nextConfig).toContain("remotePatterns: supabaseImageRemotePatterns");
    expect(nextConfig).not.toContain('hostname: "**"');
    const componentLibraryManager = readFileSync(join(process.cwd(), "src/components/workshop/component-library-manager/ComponentLibraryManager.tsx"), "utf8");
    expect(componentLibraryManager).toContain("imageUrl.protocol === storageUrl.protocol");
    expect(componentLibraryManager).toContain("imageUrl.port === storageUrl.port");
  });

  it("renders the components scope as a context strip without manager tablists and with direct folder scoped rows", async () => {
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
    const contextStrip = document.querySelector('[data-component-sheet-context-strip="true"]');
    expect(contextStrip).not.toBeNull();
    expect(contextStrip).toHaveTextContent("All Components · 3 components");
    expect(contextStrip).toHaveTextContent("Sorted by folder order");

    const viewMode = openComponentViewMenu();
    expect(screen.getByText("View By")).toBeInTheDocument();
    expect(within(viewMode).getByRole("menuitemradio", { name: "Default" })).toHaveAttribute("aria-checked", "true");
    expect(within(viewMode).getByRole("menuitemradio", { name: "Suppliers" })).toHaveAttribute("aria-checked", "false");
    expect(within(viewMode).getByRole("menuitemradio", { name: "Brand" })).toHaveAttribute("aria-checked", "false");

    expect(screen.queryByLabelText("Library row collection")).not.toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "All Components" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("treeitem", { name: "All Components" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("treeitem", { name: "Fabrication" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();
    expect(screen.getAllByText("Database Steel Frame").length).toBeGreaterThan(1);
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
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Supplier Review Folder");

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

    const viewMode = openComponentViewMenu();
    fireEvent.click(within(viewMode).getByRole("menuitemradio", { name: "Suppliers" }));

    const addFolderButton = screen.getByRole("button", { name: "Add library folder" });
    expect(addFolderButton).not.toBeDisabled();
    fireEvent.click(addFolderButton);

    await waitFor(() => expect(actionMocks.createLibraryFolder).toHaveBeenCalledWith(null, "Supplier Review Folder", { placement: "top" }));
    expect(promptSpy).toHaveBeenCalledWith("Folder name");
    await waitFor(() => expect(screen.getByRole("button", { name: "View by: Default" })).toHaveAttribute("aria-pressed", "false"));
    expect(screen.getByRole("treeitem", { name: "Supplier Review Folder" })).toHaveAttribute("aria-selected", "true");
    promptSpy.mockRestore();
  });

  it("creates a root folder at the top from Add Component when no folder is selected", async () => {
    actionMocks.createLibraryFolder.mockResolvedValueOnce({
      folder: {
        id: "folder-root-created",
        workspace_id: "workspace-1",
        parent_id: null,
        name: "Root First",
        sort_order: 0,
        source_category_node_id: null,
        folder_kind: "custom",
      },
    });
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Root First");

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

    fireEvent.click(screen.getByRole("button", { name: "Add component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    expect(within(within(dialog).getByLabelText("Selected nesting path")).getByText("No folder selected")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Add library folder" }));

    await waitFor(() => expect(actionMocks.createLibraryFolder).toHaveBeenCalledWith(null, "Root First", { placement: "top" }));
    expect(promptSpy).toHaveBeenCalledWith("Folder name");
    await waitFor(() => expect(within(dialog).getByRole("treeitem", { name: "Root First" })).toHaveAttribute("aria-selected", "true"));
    const folderLabels = within(dialog).getAllByRole("treeitem").map((item) => item.getAttribute("aria-label") ?? item.textContent ?? "");
    expect(folderLabels.indexOf("Root First")).toBeLessThan(folderLabels.indexOf("Fabrication"));
    promptSpy.mockRestore();
  });

  it("opens the Add Component modal and submits categorized variants", async () => {
    actionMocks.createCostLibraryComponent.mockResolvedValue({
      itemId: "new-component-id",
      activePriceOptionId: "new-price-id",
      versionNumber: 1,
    });

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

    // The sheet's create action now keeps a visible "Add component" label.
    const addComponentButton = screen.getByRole("button", { name: "Add component" });
    expect(addComponentButton).toHaveTextContent("Add component");
    expect(addComponentButton).not.toHaveClass("size-6");
    fireEvent.click(addComponentButton);

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    const sectionTabs = within(dialog).getByRole("tablist", { name: "Add component sections" });
    const componentTab = within(sectionTabs).getByRole("tab", { name: "Component" });
    const activityTab = within(sectionTabs).getByRole("tab", { name: "Activity" });
    expect(sectionTabs).toHaveClass("h-[32px]");
    expect(sectionTabs).toHaveClass("bg-surfaceMuted");
    expect(sectionTabs).toHaveClass("border-b");
    expect(componentTab).toHaveClass("rounded-xs");
    expect(componentTab).toHaveClass("-mb-px");
    expect(componentTab).toHaveClass("bg-white");
    expect(activityTab).toHaveClass("border-transparent");
    expect(componentTab).toHaveAttribute("aria-selected", "true");
    expect(activityTab).toHaveAttribute("aria-selected", "false");
    const componentPanel = within(dialog).getByRole("tabpanel", { name: "Component" });
    expect(componentPanel).toBeInTheDocument();
    expect(within(dialog).queryByRole("tab", { name: "Classify" })).not.toBeInTheDocument();
    const componentImagePanel = within(componentPanel).getByLabelText("Component image");
    expect(componentImagePanel).toBeInTheDocument();
    expect(componentImagePanel).toHaveClass("bg-white");
    expect(componentImagePanel).not.toHaveClass("bg-surfaceMuted");
    expect(within(componentPanel).getByLabelText("Component nesting")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Component lifecycle")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Activity history")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Image URL / Path")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Reporting category")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("New supplier name")).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Upload thumbnail")).toHaveAttribute("type", "file");
    expect(within(dialog).getByRole("combobox", { name: "Brand" })).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: "Supplier" })).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Kind")).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Component measurements")).toBeInTheDocument();
    // Folder search in the picker sits behind the toolbar's magnifier disclosure.
    expect(within(dialog).queryByLabelText("Search add component library folders")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Show add component folder search" }));
    expect(within(dialog).getByLabelText("Search add component library folders")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Hide add component folder search" }));
    expect(within(dialog).queryByLabelText("Search add component library folders")).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Add component folder tools")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Expand all add component folder" })).toBeInTheDocument();
    expect(within(dialog).getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();
    const modalAddFolderButton = within(dialog).getByRole("button", { name: "Add library folder" });
    expect(modalAddFolderButton).not.toHaveTextContent("Add folder");
    expect(modalAddFolderButton).toHaveClass("size-6");
    expect(within(dialog).getByText("NEST COMPONENT UNDER")).toBeInTheDocument();
    let modalViewMode = openAddComponentViewMenu(dialog);
    expect(within(modalViewMode).getByRole("menuitemradio", { name: "Default" })).toHaveAttribute("aria-checked", "true");
    expect(within(modalViewMode).getByRole("menuitemradio", { name: "Suppliers" })).toHaveAttribute("aria-checked", "false");
    expect(within(modalViewMode).getByRole("menuitemradio", { name: "Brand" })).toHaveAttribute("aria-checked", "false");
    expect(within(dialog).queryByText("Resolve before saving")).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/validation issue/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Save and add another" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Add Component" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Use same image for all variants")).toHaveAttribute("type", "checkbox");
    expect(within(dialog).getByLabelText("Upload attachment")).toHaveAttribute("type", "file");
    fireEvent.click(within(modalViewMode).getByRole("menuitemradio", { name: "Suppliers" }));
    expect(within(dialog).getByRole("tree")).toBeInTheDocument();
    expect(within(dialog).getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();
    modalViewMode = openAddComponentViewMenu(dialog);
    fireEvent.click(within(modalViewMode).getByRole("menuitemradio", { name: "Default" }));
    expect(within(dialog).getByRole("treeitem", { name: "Fabrication" })).toHaveAttribute("aria-selected", "false");
    expect(within(within(dialog).getByLabelText("Selected nesting path")).getByText("No folder selected")).toBeInTheDocument();
    expect(dialog.querySelector("label label")).toBeNull();
    expect(within(dialog).queryByLabelText("Kind")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("treeitem", { name: "Details" }));
    expect(within(dialog).getByRole("treeitem", { name: "Details" })).toHaveAttribute("aria-selected", "true");
    expect(within(within(dialog).getByLabelText("Selected nesting path")).getByText("Details")).toHaveClass("font-medium");
    fireEvent.click(within(dialog).getByRole("treeitem", { name: "Fabrication" }));
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Acoustics");
    actionMocks.createLibraryFolder.mockResolvedValueOnce({
      folder: {
        id: "folder-acoustics",
        workspace_id: "workspace-1",
        parent_id: "folder-fabrication",
        name: "Acoustics",
        sort_order: 20,
        source_category_node_id: null,
        folder_kind: "custom",
      },
    });
    fireEvent.click(modalAddFolderButton);
    await waitFor(() => expect(actionMocks.createLibraryFolder).toHaveBeenCalledWith("folder-fabrication", "Acoustics"));
    expect(promptSpy).toHaveBeenCalledWith("Folder name");
    promptSpy.mockRestore();
    await waitFor(() => expect(within(dialog).getByRole("treeitem", { name: "Acoustics" })).toHaveAttribute("aria-selected", "true"));
    expect(within(within(dialog).getByLabelText("Selected nesting path")).getByText("Acoustics")).toHaveClass("font-medium");

    const nameInput = within(dialog).getByLabelText("Name");
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(nameInput, { target: { value: "Acoustic Wall Panel" } });
    expect(nameInput).not.toHaveAttribute("aria-invalid");
    const costInput = within(dialog).getByLabelText("Cost");
    expect(within(dialog).queryByLabelText("Price")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Pricing")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Add price option" })).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Price option 1 unit cost")).not.toBeInTheDocument();
    const variantTabs = within(dialog).getByRole("tablist", { name: "Component variants" });
    expect(within(variantTabs).getByRole("tab", { name: "Variant 1" })).toHaveAttribute("aria-selected", "true");
    expect(within(variantTabs).getByRole("button", { name: "Add variant" })).toBeInTheDocument();
    const variantOnePanel = within(dialog).getByRole("tabpanel", { name: "Variant 1" });
    const defaultVariantAction = within(variantOnePanel).getByRole("button", { name: "Default" });
    expect(defaultVariantAction).not.toHaveClass("flex-1");
    expect(defaultVariantAction).toHaveClass("w-24");
    expect(defaultVariantAction.parentElement).toHaveClass("w-[8.5rem]");
    expect(within(variantOnePanel).queryByRole("button", { name: "Remove active variant" })).not.toBeInTheDocument();
    const skuInput = within(variantOnePanel).getByLabelText("SKU / Reference");
    fireEvent.change(skuInput, { target: { value: "ACP-600" } });
    const openCostEntriesButton = within(dialog).getByRole("button", { name: "Open cost entries" });
    fireEvent.focus(costInput);
    expect(within(dialog).queryByRole("listbox", { name: "Cost entries" })).not.toBeInTheDocument();
    fireEvent.change(costInput, { target: { value: "1250" } });
    expect(within(dialog).queryByRole("listbox", { name: "Cost entries" })).not.toBeInTheDocument();
    fireEvent.keyDown(costInput, { key: "Enter" });
    expect(costInput).toHaveValue("1,250.00");
    expect(within(dialog).queryByRole("listbox", { name: "Cost entries" })).not.toBeInTheDocument();
    fireEvent.click(openCostEntriesButton);
    const costEntriesList = await within(dialog).findByRole("listbox", { name: "Cost entries" });
    expect(within(costEntriesList).getByRole("option", { name: /1,250.00/ })).toHaveAttribute("aria-selected", "true");
    expect(within(costEntriesList).getByRole("button", { name: /Delete cost entry/ })).toBeDisabled();
    expect(within(dialog).queryByLabelText("New cost amount")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Add cost entry" })).not.toBeInTheDocument();
    fireEvent.change(costInput, { target: { value: "1300" } });
    expect(within(dialog).queryByRole("listbox", { name: "Cost entries" })).not.toBeInTheDocument();
    fireEvent.blur(costInput, { relatedTarget: nameInput });
    expect(costInput).toHaveValue("1,300.00");
    fireEvent.click(openCostEntriesButton);
    const updatedCostEntriesList = await within(dialog).findByRole("listbox", { name: "Cost entries" });
    const currentCostDate = todayIsoDate();
    expect(within(updatedCostEntriesList).getByRole("option", { name: new RegExp(`${currentCostDate}.*1,300.00`) })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(within(updatedCostEntriesList).getByRole("button", { name: new RegExp(`Delete cost entry ${currentCostDate} 1,300.00`) })).not.toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Selected cost date"), { target: { value: currentCostDate } });
    expect(within(updatedCostEntriesList).getByRole("option", { name: new RegExp(`${currentCostDate}.*1,300.00`) })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const unitCombobox = within(dialog).getByRole("combobox", { name: "Unit" });
    expect(unitCombobox).toHaveAttribute("placeholder", "Search or add unit");
    fireEvent.change(unitCombobox, { target: { value: "piece" } });
    expect(within(dialog).getByRole("option", { name: /^pc/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole("option", { name: /^pcs/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("option", { name: /^pieces/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("option", { name: /Add unit "piece"/i })).not.toBeInTheDocument();
    fireEvent.change(unitCombobox, { target: { value: "square meter" } });
    expect(within(dialog).getAllByRole("option", { name: /sqm/i })[0]).toBeInTheDocument();
    fireEvent.keyDown(unitCombobox, { key: "Enter" });
    expect(unitCombobox).toHaveValue("sqm");
    expect(within(dialog).queryByLabelText("Package contains quantity")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("combobox", { name: "Package contains unit" })).not.toBeInTheDocument();
    fireEvent.change(unitCombobox, { target: { value: "box" } });
    fireEvent.click(within(dialog).getByRole("option", { name: /^box/i }));
    expect(unitCombobox).toHaveValue("box");
    expect(within(dialog).getByText("Content / box")).toBeInTheDocument();
    expect(within(dialog).queryByText(/Optional conversion from one/i)).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Content per box quantity"), { target: { value: "12" } });
    const packageUnitCombobox = within(dialog).getByRole("combobox", { name: "Content per box unit" });
    expect(packageUnitCombobox.className).toContain("min-w-[22ch]");
    fireEvent.change(packageUnitCombobox, { target: { value: "sqm" } });
    expect(within(dialog).getAllByRole("option", { name: /sqm/i })[0]).toBeInTheDocument();
    fireEvent.change(packageUnitCombobox, { target: { value: "pc" } });
    expect(within(dialog).getByRole("option", { name: /^pieces/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole("option", { name: /^pcs/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("option", { name: /^pc\s/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("option", { name: /Add unit "pc"/i })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("option", { name: /^pieces/i }));
    expect(packageUnitCombobox).toHaveValue("pieces");
    const measurements = within(dialog).getByLabelText("Component measurements");
    expect(within(measurements).queryByRole("button", { name: "Measurements" })).not.toBeInTheDocument();
    expect(within(measurements).queryByText("Optional sizing for area, coverage, volume, and mass.")).not.toBeInTheDocument();
    const lengthInput = within(dialog).getByLabelText("Length");
    const widthInput = within(dialog).getByLabelText("Width");
    const heightInput = within(dialog).getByLabelText("Height");
    expect(lengthInput).toHaveValue("0");
    expect(widthInput).toHaveValue("0");
    expect(heightInput).toHaveValue("0");
    expect(lengthInput).not.toHaveAttribute("aria-invalid");
    expect(within(dialog).getByLabelText("Computed footprint area")).toHaveValue("0 m2");
    expect(within(dialog).getByLabelText("Computed package area")).toHaveValue("0 m2");
    expect(within(dialog).getByLabelText("Computed volume")).toHaveValue("0 m3");
    fireEvent.change(lengthInput, { target: { value: "" } });
    expect(within(dialog).getByLabelText("Computed footprint area")).toHaveValue("");
    expect(within(dialog).getByLabelText("Computed package area")).toHaveValue("");
    expect(within(dialog).getByLabelText("Computed volume")).toHaveValue("");
    fireEvent.change(lengthInput, { target: { value: "0.6" } });
    fireEvent.change(widthInput, { target: { value: "0.6" } });
    fireEvent.change(heightInput, { target: { value: "0.01" } });
    expect(within(dialog).queryByLabelText("Mass")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("combobox", { name: "Mass unit" })).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Computed footprint area")).toBeDisabled();
    expect(within(dialog).getByLabelText("Computed package area")).toBeDisabled();
    expect(within(dialog).getByLabelText("Computed volume")).toBeDisabled();
    expect(within(dialog).getByLabelText("Computed footprint area")).toHaveValue("0.36 m2");
    expect(within(dialog).getByLabelText("Computed package area")).toHaveValue("4.32 m2");
    expect(within(dialog).getByLabelText("Computed volume")).toHaveValue("0.0036 m3");
    fireEvent.click(within(dialog).getByRole("button", { name: "Open cost manager" }));
    const costManager = await screen.findByRole("dialog", { name: "Cost Manager" });
    const sourceUrlInput = within(costManager).getByLabelText("Cost manager source URL");
    fireEvent.change(sourceUrlInput, { target: { value: "javascript:alert(1)" } });
    expect(within(dialog).getByRole("button", { name: "Add Component" })).toBeDisabled();
    fireEvent.change(sourceUrlInput, { target: { value: "https://supplier.example/quote" } });
    expect(within(dialog).getByRole("button", { name: "Add Component" })).not.toBeDisabled();
    fireEvent.click(within(costManager).getByRole("button", { name: "Close cost manager" }));
    fireEvent.click(within(variantTabs).getByRole("button", { name: "Add variant" }));
    const updatedVariantTabs = within(dialog).getByRole("tablist", { name: "Component variants" });
    expect(within(updatedVariantTabs).getByRole("tab", { name: "Variant 2" })).toHaveAttribute("aria-selected", "true");
    const variantTwoPanel = within(dialog).getByRole("tabpanel", { name: "Variant 2" });
    const makeDefaultAction = within(variantTwoPanel).getByRole("button", { name: "Make default" });
    expect(makeDefaultAction).toHaveClass("w-24");
    expect(makeDefaultAction.parentElement).toHaveClass("w-[8.5rem]");
    expect(within(variantTwoPanel).getByRole("button", { name: "Remove active variant" })).toBeInTheDocument();
    const variantTwoCostInput = within(dialog).getByLabelText("Cost");
    fireEvent.change(variantTwoCostInput, { target: { value: "1450" } });
    expect(variantTwoCostInput).toHaveValue("1,450.00");
    const variantTwoUnitCombobox = within(dialog).getByRole("combobox", { name: "Unit" });
    fireEvent.change(variantTwoUnitCombobox, { target: { value: "tile-box" } });
    fireEvent.click(within(dialog).getByRole("option", { name: 'Add unit "tile-box"' }));
    expect(variantTwoUnitCombobox).toHaveValue("tile-box");
    fireEvent.click(within(updatedVariantTabs).getByRole("tab", { name: "Variant 1" }));
    const brandCombobox = within(dialog).getByRole("combobox", { name: "Brand" });
    fireEvent.change(brandCombobox, { target: { value: "Acme Hardware" } });
    modalViewMode = openAddComponentViewMenu(dialog);
    expect(within(modalViewMode).getByRole("menuitemradio", { name: "Default" })).toHaveAttribute("aria-checked", "true");
    expect(within(modalViewMode).getByRole("menuitemradio", { name: "Brand" })).toHaveAttribute("aria-checked", "false");
    fireEvent.click(within(modalViewMode).getByRole("menuitemradio", { name: "Brand" }));
    expect(within(dialog).getByRole("button", { name: "View by: Brand" })).toHaveAttribute("aria-pressed", "false");
    expect(within(dialog).getByRole("treeitem", { name: "Acme Hardware" })).toHaveAttribute("aria-selected", "true");
    modalViewMode = openAddComponentViewMenu(dialog);
    fireEvent.click(within(modalViewMode).getByRole("menuitemradio", { name: "Default" }));
    const supplierCombobox = within(dialog).getByRole("combobox", { name: "Supplier" });
    fireEvent.change(supplierCombobox, { target: { value: "Database" } });
    fireEvent.click(within(dialog).getByRole("option", { name: "Database Supplier" }));
    await waitFor(() => expect(supplierCombobox).toHaveValue("Database Supplier"));
    modalViewMode = openAddComponentViewMenu(dialog);
    fireEvent.click(within(modalViewMode).getByRole("menuitemradio", { name: "Suppliers" }));
    expect(within(dialog).getByRole("button", { name: "View by: Suppliers" })).toHaveAttribute("aria-pressed", "false");
    expect(within(dialog).getByRole("treeitem", { name: "Database Supplier" })).toHaveAttribute("aria-selected", "true");
    modalViewMode = openAddComponentViewMenu(dialog);
    fireEvent.click(within(modalViewMode).getByRole("menuitemradio", { name: "Default" }));
    fireEvent.click(supplierCombobox);
    const activeSupplierOption = within(dialog).getByRole("option", { name: "Database Supplier" });
    expect(supplierCombobox).toHaveAttribute("aria-expanded", "true");
    expect(supplierCombobox).toHaveAttribute("aria-activedescendant", activeSupplierOption.id);
    fireEvent.keyDown(supplierCombobox, { key: "Escape" });
    await waitFor(() => expect(supplierCombobox).toHaveAttribute("aria-expanded", "false"));
    expect(supplierCombobox).not.toHaveAttribute("aria-activedescendant");
    fireEvent.click(activityTab);
    expect(componentTab).toHaveAttribute("aria-selected", "false");
    expect(activityTab).toHaveAttribute("aria-selected", "true");
    expect(activityTab).toHaveClass("-mb-px");
    expect(activityTab).toHaveClass("bg-white");
    expect(componentTab).toHaveClass("border-transparent");
    const activityPanel = within(dialog).getByRole("tabpanel", { name: "Activity" });
    expect(within(activityPanel).getByLabelText("Component lifecycle")).toBeInTheDocument();
    expect(within(activityPanel).getByLabelText("Activity history")).toBeInTheDocument();
    expect(within(activityPanel).getByText("Component created")).toBeInTheDocument();
    expect(within(activityPanel).getByText("Cost baseline")).toBeInTheDocument();
    expect(within(activityPanel).getByText("1,300.00")).toBeInTheDocument();
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
        unit: "box",
        libraryFolderId: "folder-acoustics",
        categoryNodeId: "db-category-fabrication",
        supplierId: "db-supplier",
        supplier: "Database Supplier",
        brand: "Acme Hardware",
        brandId: null,
        lifecycleState: "in_production",
        metadata: expect.objectContaining({
          measurement: {
            package: { quantity: 12, unit: "pieces" },
            dimensions: {
              length: 0.6,
              width: 0.6,
              height: 0.01,
              unit: "m",
              footprintArea: 0.36,
              packageArea: 4.32,
              volume: 0.0036,
            },
          },
        }),
        priceOptions: [
          expect.objectContaining({
            label: "Variant 1",
            sku: "ACP-600",
            variantDescription: "",
            variantSortOrder: 1,
            unit: "box",
            unitCost: 1300,
            miscCost: 0,
            costEntries: [
              expect.objectContaining({ unitCost: 1250, isCurrent: false }),
              expect.objectContaining({ unitCost: 1300, pricingDate: currentCostDate, isCurrent: true }),
            ],
            packageQuantity: 12,
            packageUnit: "pieces",
            dimensionLength: 0.6,
            dimensionWidth: 0.6,
            dimensionHeight: 0.01,
            dimensionUnit: "m",
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
    const branch = within(sheet).getByLabelText("Fabrication component catalogue branch");
    const card = branch.querySelector('[data-component-catalogue-card-id="db-library-steel-frame"]');
    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText("Database Supplier")).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText("Database Brand")).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText("₱1,200.00")).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText("Cost / pc")).toBeInTheDocument();
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

    const viewMode = openComponentViewMenu();
    fireEvent.click(within(viewMode).getByRole("menuitemradio", { name: "Suppliers" }));

    expect(screen.getByRole("button", { name: "View by: Suppliers" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("tab", { name: "Suppliers" })).not.toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "All Suppliers" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("treeitem", { name: "Database Supplier" }));

    const sheet = screen.getByLabelText("Component table");
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).queryByText("Owner Supplied Sink")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library row collection")).not.toBeInTheDocument();
  });

  it("uses the shared drag/drop tree environment for editable library folders", async () => {
    renderLibraryShell(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        libraryFolders={sharedFolders}
        libraryItems={sharedLibraryItems}
      />,
    );
    await waitForLibraryWorkspace();

    const environment = rctHarness.lastEnvironmentProps;
    expect(environment).toMatchObject({
      canDragAndDrop: true,
      canReorderItems: true,
      canDropOnFolder: true,
      canDropOnNonFolder: false,
      canDropBelowOpenFolders: true,
    });

    const detailItem = environment?.items["folder:folder-details"];
    expect(detailItem).toBeDefined();
    expect(environment?.canDropAt?.([detailItem!], {
      targetType: "between-items",
      parentItem: "library-folder-tree-root",
      childIndex: 0,
      linearIndex: 0,
    })).toBe(true);

    await environment?.onDrop?.([detailItem!], {
      targetType: "between-items",
      parentItem: "library-folder-tree-root",
      childIndex: 0,
      linearIndex: 0,
    });

    await waitFor(() => {
      expect(actionMocks.reorderLibraryFolders).toHaveBeenCalledWith({
        updates: expect.arrayContaining([
          expect.objectContaining({ id: "folder-details", parentId: null, sortOrder: 10 }),
          expect.objectContaining({ id: "folder-fabrication", parentId: null, sortOrder: 20 }),
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
      />,
    );
    await waitForLibraryWorkspace();

    const environment = rctHarness.lastEnvironmentProps;
    const componentItem = Object.values(environment?.items ?? {}).find(
      (item) => item.data.kind === "component" && item.data.item?.id === "db-library-steel-frame",
    );
    expect(componentItem).toBeDefined();
    expect(componentItem?.canMove).toBe(true);

    const dropTarget: DraggingPosition = {
      targetType: "item",
      treeId: "library-folder-tree",
      targetItem: "folder:folder-details",
      parentItem: "folder:folder-fabrication",
      linearIndex: 2,
      depth: 1,
    };
    expect(environment?.canDropAt?.([componentItem!], dropTarget)).toBe(true);

    await environment?.onDrop?.([componentItem!], dropTarget);

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
