"use client";

import type { EstimateTabSummary } from "@/lib/estimates/types";
import { EstimateWorkspaceClient } from "@/components/workshop/EstimateWorkspaceClient";
import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

const WORKSPACE_ID = "landing-sanitized-workspace";
const PROJECT_ID = "landing-sanitized-project";
const ESTIMATE_ID = "landing-sanitized-estimate";
const TAB_ID = "landing-sanitized-tab";
const AREA_ID = "landing-sanitized-reception-area";

const libraryItems = [
  createRow({ id: "landing-library-reception", material: "Reception and pantry millwork", description: "Custom joinery package for reception and pantry areas.", supplier: "Sanitized supplier", source: "library", unit: "lot", itemCost: 912000, miscCost: 0, quantity: 1, category: "Joinery", pricingSource: "Sanitized product demo" }),
  createRow({ id: "landing-library-floor", material: "Large-format porcelain floor tile", description: "Porcelain floor finish for public workplace areas.", supplier: "Sanitized supplier", source: "supplier", unit: "sqm", itemCost: 2450, miscCost: 0, quantity: 420, category: "Finishes", pricingSource: "Sanitized product demo" }),
  createRow({ id: "landing-library-acoustic", material: "Acoustic ceiling system", description: "Suspended acoustic ceiling system with perimeter trim.", supplier: "Sanitized supplier", source: "supplier", unit: "sqm", itemCost: 3100, miscCost: 0, quantity: 360, category: "Ceilings", pricingSource: "Sanitized product demo" }),
];

const estimateRows = libraryItems.map((item, index) => ({ ...item, id: `landing-estimate-row-${index + 1}` }));
const estimateTotal = estimateRows.reduce((sum, row) => sum + row.totalItemCosts, 0);
const nodes: EstimateTreeNode[] = [{
  id: "landing-sanitized-root",
  name: "Makati Workplace Fit-Out",
  kind: "group",
  total: formatPeso(estimateTotal),
  children: [{
    id: "landing-sanitized-ground-floor",
    name: "Workplace Levels 1–2",
    kind: "group",
    total: formatPeso(estimateTotal),
    children: [{ id: AREA_ID, name: "Reception and shared spaces", kind: "area", total: formatPeso(estimateTotal), estimateRowItems: estimateRows }],
  }],
}];

const estimateTabs: EstimateTabSummary[] = [{
  id: TAB_ID,
  name: "Cost Plan",
  sortOrder: 0,
  isDefault: true,
  nodeCount: 3,
  rowCount: estimateRows.length,
  totalCost: estimateTotal,
}];

export function ExactEstimateWorkspace() {
  return (
    <EstimateWorkspaceClient
      projectId={PROJECT_ID}
      workspaceId={WORKSPACE_ID}
      estimateId={ESTIMATE_ID}
      projectName="Makati Workplace Fit-Out"
      estimateName="Cost Plan · Revision B"
      estimateSheetCode="CP-026"
      selectedNodeId={AREA_ID}
      nodes={nodes}
      estimateTabs={estimateTabs}
      activeTabId={TAB_ID}
      canEditEstimate
      libraryItems={libraryItems}
      libraryTemplates={[]}
      libraryCategoryTree={[]}
      librarySuppliers={[]}
      libraryBrands={[]}
      libraryFolders={[]}
      libraryUseStoredPreferences={false}
      libraryEnableReusableProjectSources={false}
      surfaceVariant="glass"
      disableRouteSync
      presentationMode
    />
  );
}

function createRow(
  input: Omit<EstimateRowItem, "subTotal" | "totalItemCosts" | "pricingDate"> & Partial<Pick<EstimateRowItem, "pricingDate">>,
): EstimateRowItem {
  const subTotal = input.itemCost * input.quantity;
  const contingencyPercentage = input.contingencyPercentage ?? 0;
  const contingencyValue = (subTotal * contingencyPercentage) / 100;
  return { ...input, currency: "PHP", subTotal, contingencyPercentage, contingencyValue, totalItemCosts: subTotal + input.miscCost + contingencyValue, pricingDate: input.pricingDate ?? "2026-07-18", linkState: input.linkState ?? "linked-clean" };
}

function formatPeso(value: number) {
  return `PHP ${Math.round(value).toLocaleString("en-US")}`;
}
