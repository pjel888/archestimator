import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { convergeCreatedComponentLibraryCaches } from "@/lib/component-library/cache-convergence";
import {
  workspaceComponentLibraryLiteQueryKey,
  workspaceComponentLibraryQueryKey,
  workspaceComponentRowsLibraryQueryKey,
} from "@/lib/component-library/query-keys";
import type { EstimateRowItem } from "@/lib/estimates/types";
import type {
  ComponentLibraryDataset,
  ComponentRowsLibraryDataset,
} from "@/lib/repositories/component-library-repository";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";

function makeItem(id: string, name: string): EstimateRowItem {
  return {
    id,
    material: name,
    name,
    description: "Complete variant projection",
    supplier: "Supplier",
    unit: "box",
    itemCost: 2500,
    quantity: 1,
    subTotal: 2500,
    miscCost: 0,
    totalItemCosts: 2500,
    source: "library",
    sourceLibraryItemId: id,
    componentVersionNumber: 1,
    priceOptionId: `${id}-option`,
    priceOptions: [{
      id: `${id}-option`,
      label: "Option 1",
      unit: "box",
      unitCost: 2500,
      miscCost: 0,
      currency: "PHP",
      isActive: true,
      isDefault: true,
      attachments: [{
        id: `${id}-attachment`,
        bucket: "component-attachments",
        path: `${id}/spec.pdf`,
        fileName: "spec.pdf",
        contentType: "application/pdf",
        sizeBytes: 128,
      }],
    }],
  } as EstimateRowItem;
}

function makeLibraryDataset(items: EstimateRowItem[]): ComponentLibraryDataset {
  return {
    categoryTree: [],
    suppliers: [],
    brands: [],
    libraryFolders: [],
    libraryItems: items,
    templates: [],
  };
}

function makeRowsDataset(items: EstimateRowItem[]): ComponentRowsLibraryDataset {
  return {
    workspaceId: WORKSPACE_ID,
    categoryTree: [],
    suppliers: [],
    brands: [],
    libraryFolders: [],
    libraryItems: items,
    loadedComponentCount: items.length,
    totalComponentCount: items.length,
  };
}

describe("component create cache convergence", () => {
  it("synchronously patches full, lite, and rows caches without invalidation or refetch", () => {
    const queryClient = new QueryClient();
    const existing = makeItem("existing", "Existing");
    const created = makeItem("created", "Created");
    const fullKey = workspaceComponentLibraryQueryKey(WORKSPACE_ID);
    const liteKey = workspaceComponentLibraryLiteQueryKey(WORKSPACE_ID, PROJECT_ID);
    const rowsKey = workspaceComponentRowsLibraryQueryKey(WORKSPACE_ID);
    const projectRowsKey = workspaceComponentRowsLibraryQueryKey(WORKSPACE_ID, PROJECT_ID);
    const unrelatedKey = workspaceComponentLibraryQueryKey("other-workspace");
    queryClient.setQueryData(fullKey, makeLibraryDataset([existing]));
    queryClient.setQueryData(liteKey, makeLibraryDataset([existing]));
    queryClient.setQueryData(rowsKey, makeRowsDataset([existing]));
    queryClient.setQueryData(projectRowsKey, makeRowsDataset([existing]));
    queryClient.setQueryData(unrelatedKey, makeLibraryDataset([existing]));
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const refetchSpy = vi.spyOn(queryClient, "refetchQueries");

    convergeCreatedComponentLibraryCaches(queryClient, WORKSPACE_ID, created);

    for (const key of [fullKey, liteKey]) {
      const cached = queryClient.getQueryData<ComponentLibraryDataset>(key);
      expect(cached?.libraryItems.map((item) => item.id)).toEqual([created.id, existing.id]);
      expect(cached?.libraryItems[0]?.priceOptions?.[0]?.attachments?.[0]?.fileName).toBe("spec.pdf");
    }
    for (const key of [rowsKey, projectRowsKey]) {
      const cached = queryClient.getQueryData<ComponentRowsLibraryDataset>(key);
      expect(cached?.libraryItems.map((item) => item.id)).toEqual([created.id, existing.id]);
      expect(cached?.loadedComponentCount).toBe(2);
      expect(cached?.totalComponentCount).toBe(2);
    }
    expect(queryClient.getQueryData<ComponentLibraryDataset>(unrelatedKey)?.libraryItems).toEqual([existing]);
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(refetchSpy).not.toHaveBeenCalled();

    convergeCreatedComponentLibraryCaches(queryClient, WORKSPACE_ID, created);
    expect(queryClient.getQueryData<ComponentRowsLibraryDataset>(rowsKey)?.loadedComponentCount).toBe(2);
    expect(queryClient.getQueryData<ComponentRowsLibraryDataset>(rowsKey)?.libraryItems).toHaveLength(2);
  });
});
