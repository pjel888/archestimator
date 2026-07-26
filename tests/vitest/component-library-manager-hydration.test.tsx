import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ComponentLibraryManager } from "@/components/workshop/component-library-manager/ComponentLibraryManager";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";

const navigationMocks = vi.hoisted(() => ({
  pathname: "/workshop/library/components",
  searchParams: "",
  router: {
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => navigationMocks.router,
  useSearchParams: () => new URLSearchParams(navigationMocks.searchParams),
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    return function MockDynamicComponent(props: Record<string, unknown>) {
      if ("open" in props) {
        return props.open ? (
          <div data-archestimator-modal-root role="dialog" aria-label="Add Component">
            Add Component
          </div>
        ) : null;
      }
      if ("folders" in props) {
        return <div aria-label="Component library tree" />;
      }
      return null;
    };
  },
}));

vi.mock("@/lib/component-library/actions", () => ({
  createCostLibraryComponent: vi.fn(),
  createLibraryFolder: vi.fn(),
  deleteLibraryFolder: vi.fn(),
  executeBulkArchiveLibraryComponents: vi.fn(),
  loadCostLibraryComponentRowDetail: vi.fn(),
  moveCostLibraryComponentToFolder: vi.fn(),
  previewBulkArchiveLibraryComponents: vi.fn(),
  renameLibraryFolder: vi.fn(),
}));

const categoryTree: ComponentLibraryTaxonomyNode[] = [
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

const libraryFolders: LibraryFolderRecord[] = [
  {
    id: "folder-fabrication",
    workspace_id: "workspace-1",
    parent_id: null,
    name: "Fabrication",
    sort_order: 10,
    source_category_node_id: null,
    folder_kind: "custom",
  },
];

const libraryItems: EstimateRowItem[] = [
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
    category: "Fabrication",
    categoryNodeId: "db-category-fabrication",
    categoryPath: ["Database Components", "Fabrication"],
    libraryFolderId: "folder-fabrication",
    pricingSource: "Database Supplier",
    pricingDate: "2026-05-22",
  },
];

function TestManager() {
  return (
    <ComponentLibraryManager
      categoryTree={categoryTree}
      suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
      brands={[]}
      libraryFolders={libraryFolders}
      libraryItems={libraryItems}
      workspaceId="workspace-1"
    />
  );
}

describe("ComponentLibraryManager hydration", () => {
  let root: Root | null = null;

  afterEach(() => {
    root?.unmount();
    root = null;
    navigationMocks.searchParams = "";
    vi.restoreAllMocks();
  });

  it("defers the add-component route modal until after hydration", async () => {
    navigationMocks.searchParams = "";
    const serverHtml = renderToString(<TestManager />);
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    expect(container.querySelector('[role="dialog"][aria-label="Add Component"]')).toBeNull();

    navigationMocks.searchParams = "add=component";
    const recoverableErrors: Error[] = [];

    await act(async () => {
      root = hydrateRoot(container, <TestManager />, {
        onRecoverableError: (error) => {
          recoverableErrors.push(error);
        },
      });
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(recoverableErrors.map((error) => error.message).join("\n")).not.toMatch(/hydration|hydrated/i);
    expect(container.querySelector('[role="dialog"][aria-label="Add Component"]')).not.toBeNull();
  });
});
