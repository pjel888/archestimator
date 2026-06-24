"use client";

import { useEffect, useMemo, useState } from "react";

import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { EstimateTabSummary } from "@/lib/estimates/types";
import { EstimateWorkspaceClient } from "@/components/workshop/EstimateWorkspaceClient";
import {
  endEstimateWorkshopDrag,
  useEstimateWorkshopDragState,
} from "@/components/workshop/estimate-workshop-drag";
import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import styles from "./landing-v3.module.css";

type HeroAnimationPhase =
  | "ready"
  | "hover-faucet"
  | "drag-faucet"
  | "faucet-inserted"
  | "hover-ceramic"
  | "drag-ceramic"
  | "ceramic-inserted"
  | "hover-fauxwood"
  | "drag-fauxwood"
  | "fauxwood-replaced";

const HERO_PHASES: HeroAnimationPhase[] = [
  "ready",
  "hover-faucet",
  "drag-faucet",
  "faucet-inserted",
  "hover-ceramic",
  "drag-ceramic",
  "ceramic-inserted",
  "hover-fauxwood",
  "drag-fauxwood",
  "fauxwood-replaced",
];

const DRAG_PHASES = new Set<HeroAnimationPhase>(["drag-faucet", "drag-ceramic", "drag-fauxwood"]);

const HERO_WORKSPACE_ID = "hero-sanitized-workspace";
const HERO_PROJECT_ID = "hero-sanitized-project";
const HERO_ESTIMATE_ID = "hero-sanitized-estimate";
const HERO_TAB_ID = "hero-sanitized-tab-page-001";
const KITCHEN_NODE_ID = "hero-node-kitchen";

const heroEstimateTabs: EstimateTabSummary[] = [
  {
    id: HERO_TAB_ID,
    name: "Page 001",
    sortOrder: 0,
    isDefault: true,
    nodeCount: 8,
    rowCount: 3,
    totalCost: 228940,
  },
];

const heroLibraryFolders: LibraryFolderRecord[] = [
  createFolder("hero-library-folder-fixture", null, "Fixture", 10),
  createFolder("hero-library-folder-faucet", "hero-library-folder-fixture", "Faucet", 10),
  createFolder("hero-library-folder-finishes", null, "Finishes", 20),
  createFolder("hero-library-folder-floor", "hero-library-folder-finishes", "Floor", 10),
];

const faucetItem = createRow({
  id: "hero-library-item-single-lever-faucet",
  material: "Single-lever kitchen faucet",
  description: "Chrome deck-mounted mixer faucet for kitchen sink installation.",
  supplier: "IKEA Philippines",
  source: "library",
  unit: "pc",
  itemCost: 4200,
  miscCost: 900,
  quantity: 1,
  category: "Kitchen Fixtures",
  libraryFolderId: "hero-library-folder-faucet",
  imageUrl: "/component-thumbnails/hero-single-lever-kitchen-faucet.png",
  pricingSource: "Sanitized hero demo",
});

const ceramicTileItem = createRow({
  id: "hero-library-item-600x600-ceramic-tiles",
  material: "600x600 ceramic tiles",
  description: "Large-format matte ceramic floor tile for kitchen floor finish.",
  supplier: "Mariwasa / Wilcon Depot",
  source: "supplier",
  unit: "sqm",
  itemCost: 780,
  miscCost: 0,
  quantity: 24,
  category: "Finishes",
  libraryFolderId: "hero-library-folder-floor",
  imageUrl: "/component-thumbnails/hero-600x600-ceramic-tiles.png",
  pricingSource: "Sanitized hero demo",
});

const fauxWoodTileItem = createRow({
  id: "hero-library-item-200x1200-faux-wood-tiles",
  material: "200x1200 faux wood tiles",
  description: "Wood-look porcelain plank tile for warm residential floors.",
  supplier: "Floor Center",
  source: "supplier",
  unit: "sqm",
  itemCost: 1150,
  miscCost: 0,
  quantity: 24,
  category: "Finishes",
  libraryFolderId: "hero-library-folder-floor",
  imageUrl: "/component-thumbnails/hero-200x1200-faux-wood-tiles.png",
  pricingSource: "Sanitized hero demo",
});

const heroLibraryItems = [faucetItem, ceramicTileItem, fauxWoodTileItem];

export function HeroEstimateWorkspaceMockup() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phase = HERO_PHASES[phaseIndex] ?? "ready";
  const dragGhost = getDragGhost(phase);
  const nodes = useMemo(() => createHeroEstimateTree(phase), [phase]);
  const estimateTabs = useMemo(() => {
    const rowCount = countHeroKitchenRows(phase);
    return [
      {
        ...heroEstimateTabs[0],
        rowCount,
        totalCost: getKitchenRowsTotal(getKitchenRows(phase)),
      },
    ];
  }, [phase]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhaseIndex((current) => (current + 1) % HERO_PHASES.length);
    }, 2400);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (DRAG_PHASES.has(phase)) {
      useEstimateWorkshopDragState.setState({ activeDrag: { kind: "library-item" } });
      return;
    }
    endEstimateWorkshopDrag();
  }, [phase]);

  useEffect(() => () => endEstimateWorkshopDrag(), []);

  return (
    <div className={styles.heroActualEstimateMockupViewport} data-hero-animation-phase={phase}>
      <div className={styles.heroActualEstimateMockupScale}>
        <EstimateWorkspaceClient
          projectId={HERO_PROJECT_ID}
          workspaceId={HERO_WORKSPACE_ID}
          estimateId={HERO_ESTIMATE_ID}
          projectName="Lot 24A"
          selectedNodeId={KITCHEN_NODE_ID}
          nodes={nodes}
          estimateTabs={estimateTabs}
          activeTabId={HERO_TAB_ID}
          canEditEstimate
          libraryItems={heroLibraryItems}
          libraryTemplates={[]}
          libraryCategoryTree={[]}
          librarySuppliers={[]}
          libraryBrands={[]}
          libraryFolders={heroLibraryFolders}
          libraryShowSourceTrustChips={false}
          libraryUseStoredPreferences={false}
          libraryEnableReusableProjectSources={false}
          surfaceVariant="glass"
          disableRouteSync
        />
      </div>
      <div className={styles.heroMockupAnimationLayer} aria-hidden="true">
        {dragGhost ? (
          <div className={styles.heroMockupDragGhost}>
            <span>{dragGhost.title}</span>
            <small>{dragGhost.meta}</small>
          </div>
        ) : null}
        <div className={styles.heroMockupMouse}>
          <svg viewBox="0 0 20 26" focusable="false" aria-hidden="true">
            <path d="M2.2 1.4 18.1 15.9l-8.2 1.2-3.7 7.5L2.2 1.4Z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function createHeroEstimateTree(phase: HeroAnimationPhase): EstimateTreeNode[] {
  const kitchenRows = getKitchenRows(phase);
  const kitchenTotal = formatHeroPeso(getKitchenRowsTotal(kitchenRows));

  return [
    {
      id: "hero-node-lot-24a",
      name: "Lot 24A",
      kind: "group",
      total: kitchenTotal,
      children: [
        {
          id: "hero-node-ground-floor",
          name: "Ground Floor",
          kind: "group",
          total: kitchenTotal,
          children: [
            createArea("hero-node-living-room", "Living Room", "PHP 0"),
            {
              id: KITCHEN_NODE_ID,
              name: "Kitchen",
              kind: "area",
              total: kitchenTotal,
              estimateRowItems: kitchenRows,
            },
            createArea("hero-node-dining-room", "Dining Room", "PHP 0"),
            createArea("hero-node-powder-room", "Powder Room", "PHP 0"),
          ],
        },
        {
          id: "hero-node-second-floor",
          name: "Second Floor",
          kind: "group",
          total: "PHP 0",
          children: [
            createArea("hero-node-master-bedroom", "Master Bedroom", "PHP 0"),
            createArea("hero-node-bedroom-a", "Bedroom A", "PHP 0"),
            createArea("hero-node-bedroom-b", "Bedroom B", "PHP 0"),
          ],
        },
      ],
    },
  ];
}

function getKitchenRows(phase: HeroAnimationPhase): EstimateRowItem[] {
  const rows: EstimateRowItem[] = [];
  if (phase === "faucet-inserted" || phase === "hover-ceramic" || phase === "drag-ceramic" || phase === "ceramic-inserted" || phase === "hover-fauxwood" || phase === "drag-fauxwood" || phase === "fauxwood-replaced") {
    rows.push({ ...faucetItem, id: "hero-estimate-row-kitchen-faucet", quantity: 1 });
  }
  if (phase === "ceramic-inserted" || phase === "hover-fauxwood" || phase === "drag-fauxwood") {
    rows.push({ ...ceramicTileItem, id: "hero-estimate-row-kitchen-floor-finish", quantity: 24 });
  }
  if (phase === "fauxwood-replaced") {
    rows.push({ ...fauxWoodTileItem, id: "hero-estimate-row-kitchen-floor-finish", quantity: 24 });
  }
  return rows;
}

function countHeroKitchenRows(phase: HeroAnimationPhase) {
  return getKitchenRows(phase).length;
}

function getKitchenRowsTotal(rows: EstimateRowItem[]) {
  return rows.reduce((sum, row) => sum + row.totalItemCosts, 0);
}

function formatHeroPeso(value: number) {
  return `PHP ${Math.round(value).toLocaleString("en-US")}`;
}

function createArea(id: string, name: string, total: string): EstimateTreeNode {
  return { id, name, kind: "area", total, estimateRowItems: [] };
}

function createFolder(id: string, parentId: string | null, name: string, sortOrder: number): LibraryFolderRecord {
  return {
    id,
    workspace_id: HERO_WORKSPACE_ID,
    parent_id: parentId,
    name,
    sort_order: sortOrder,
    source_category_node_id: null,
    folder_kind: "custom",
  };
}

function createRow(
  input: Omit<EstimateRowItem, "subTotal" | "totalItemCosts" | "pricingDate" | "confidence"> &
    Partial<Pick<EstimateRowItem, "pricingDate" | "confidence">>,
): EstimateRowItem {
  const subTotal = input.itemCost * input.quantity;
  const contingencyPercentage = input.contingencyPercentage ?? 0;
  const contingencyValue = (subTotal * contingencyPercentage) / 100;
  return {
    ...input,
    currency: "PHP",
    subTotal,
    contingencyPercentage,
    contingencyValue,
    totalItemCosts: subTotal + input.miscCost + contingencyValue,
    pricingDate: input.pricingDate ?? "2026-06-24",
    confidence: input.confidence ?? "Hero demo",
    linkState: input.linkState ?? (input.source === "project" ? "unlinked" : "linked-clean"),
  };
}

function getDragGhost(phase: HeroAnimationPhase) {
  if (phase === "drag-faucet") return { title: "Single-lever kitchen faucet", meta: "Library component - PHP 4,200" };
  if (phase === "drag-ceramic") return { title: "600x600 ceramic tiles", meta: "24 sqm - PHP 18,720" };
  if (phase === "drag-fauxwood") return { title: "200x1200 faux wood tiles", meta: "Replace floor finish" };
  return null;
}
