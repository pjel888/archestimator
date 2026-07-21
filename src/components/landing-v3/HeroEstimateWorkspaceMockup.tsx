"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { EstimateTabSummary } from "@/lib/estimates/types";
import { EstimateWorkspaceClient } from "@/components/workshop/EstimateWorkspaceClient";
import {
  endEstimateWorkshopDrag,
  useEstimateWorkshopDragState,
} from "@/components/workshop/estimate-workshop-drag";
import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { cn } from "@/lib/ui/cn";
import styles from "./landing-v3.module.css";

export type HeroAnimationPhase =
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

export const HERO_ANIMATION_PHASES: HeroAnimationPhase[] = [
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

const HERO_DRAG_PHASES = new Set<HeroAnimationPhase>(["drag-faucet", "drag-ceramic", "drag-fauxwood"]);

export const HERO_WORKSPACE_ID = "hero-sanitized-workspace";
export const HERO_PROJECT_ID = "hero-sanitized-project";
export const HERO_ESTIMATE_ID = "hero-sanitized-estimate";
export const HERO_TAB_ID = "hero-sanitized-tab-page-001";
export const HERO_KITCHEN_NODE_ID = "hero-node-kitchen";
export const HERO_FAUCET_ROW_ID = "hero-estimate-row-kitchen-faucet";
export const HERO_FLOOR_FINISH_ROW_ID = "hero-estimate-row-kitchen-floor-finish";

/** Must stay below drag-phase durations so the faux mouse lands before insert. */
export const HERO_CURSOR_TRANSITION_MS = 1800;

const HERO_PHASE_DURATION_MS: Record<HeroAnimationPhase, number> = {
  ready: 1000,
  "hover-faucet": 1200,
  "drag-faucet": 2400,
  "faucet-inserted": 2200,
  "hover-ceramic": 1200,
  "drag-ceramic": 2400,
  "ceramic-inserted": 2200,
  "hover-fauxwood": 1200,
  "drag-fauxwood": 2400,
  "fauxwood-replaced": 2400,
};

export function getHeroPhaseDurationMs(phase: HeroAnimationPhase): number {
  return HERO_PHASE_DURATION_MS[phase];
}

export function getHeroPhaseAtIndex(index: number): HeroAnimationPhase {
  const normalized = ((index % HERO_ANIMATION_PHASES.length) + HERO_ANIMATION_PHASES.length) % HERO_ANIMATION_PHASES.length;
  return HERO_ANIMATION_PHASES[normalized] ?? "ready";
}

export function advanceHeroPhaseIndex(index: number): number {
  return (index + 1) % HERO_ANIMATION_PHASES.length;
}

export function msUntilHeroPhase(target: HeroAnimationPhase, fromIndex = 0): number {
  let elapsed = 0;
  let index = fromIndex;
  for (let step = 0; step < HERO_ANIMATION_PHASES.length; step += 1) {
    const phase = getHeroPhaseAtIndex(index);
    if (phase === target) return elapsed;
    elapsed += getHeroPhaseDurationMs(phase);
    index = advanceHeroPhaseIndex(index);
  }
  return elapsed;
}

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

export function getHeroKitchenRows(phase: HeroAnimationPhase): EstimateRowItem[] {
  const rows: EstimateRowItem[] = [];
  if (
    phase === "faucet-inserted" ||
    phase === "hover-ceramic" ||
    phase === "drag-ceramic" ||
    phase === "ceramic-inserted" ||
    phase === "hover-fauxwood" ||
    phase === "drag-fauxwood" ||
    phase === "fauxwood-replaced"
  ) {
    rows.push({ ...faucetItem, id: HERO_FAUCET_ROW_ID, quantity: 1 });
  }
  if (phase === "ceramic-inserted" || phase === "hover-fauxwood" || phase === "drag-fauxwood") {
    rows.push({ ...ceramicTileItem, id: HERO_FLOOR_FINISH_ROW_ID, quantity: 24 });
  }
  if (phase === "fauxwood-replaced") {
    rows.push({ ...fauxWoodTileItem, id: HERO_FLOOR_FINISH_ROW_ID, quantity: 24 });
  }
  return rows;
}

export function findHeroKitchenRowsInTree(nodes: EstimateTreeNode[] | undefined): EstimateRowItem[] {
  if (!nodes) return [];
  const visit = (node: EstimateTreeNode): EstimateRowItem[] | null => {
    if (node.id === HERO_KITCHEN_NODE_ID) return node.estimateRowItems ?? [];
    for (const child of node.children ?? []) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  for (const node of nodes) {
    const found = visit(node);
    if (found) return found;
  }
  return [];
}

export type HeroEstimateWorkspaceMockupProps = {
  /**
   * "loop" (default) preserves the existing phase cycle. "static" freezes the
   * demo on `staticPhase` with no timers and no cursor/drag affordances.
   */
  playback?: "loop" | "static";
  staticPhase?: HeroAnimationPhase;
  /** When true, an hidden document cancels timers and ends any drag state. */
  pauseWhenDocumentHidden?: boolean;
  className?: string;
};

export function HeroEstimateWorkspaceMockup({
  playback = "loop",
  staticPhase = "fauxwood-replaced",
  pauseWhenDocumentHidden = false,
  className,
}: HeroEstimateWorkspaceMockupProps = {}) {
  const queryClient = useQueryClient();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [documentHidden, setDocumentHidden] = useState(false);

  // Static playback is fully deterministic; loop playback continues from the
  // current index when it resumes after a pause.
  const isPaused = playback === "static" || (pauseWhenDocumentHidden && documentHidden);
  const phase = playback === "static" ? staticPhase : getHeroPhaseAtIndex(phaseIndex);
  const dragGhost = playback === "static" ? null : getDragGhost(phase);
  const nodes = useMemo(() => createHeroEstimateTree(phase), [phase]);
  const estimateTabs = useMemo(() => {
    const kitchenRows = getHeroKitchenRows(phase);
    return [
      {
        ...heroEstimateTabs[0],
        rowCount: kitchenRows.length,
        totalCost: getKitchenRowsTotal(kitchenRows),
      },
    ];
  }, [phase]);

  useEffect(() => {
    if (!pauseWhenDocumentHidden) return;
    const onVisibilityChange = () => {
      setDocumentHidden(document.visibilityState === "hidden");
    };
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [pauseWhenDocumentHidden]);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setTimeout(() => {
      setPhaseIndex((current) => advanceHeroPhaseIndex(current));
    }, getHeroPhaseDurationMs(phase));
    return () => window.clearTimeout(timer);
  }, [phase, phaseIndex, isPaused]);

  useEffect(() => {
    if (!isPaused && HERO_DRAG_PHASES.has(phase)) {
      useEstimateWorkshopDragState.setState({ activeDrag: { kind: "library-item" } });
      return;
    }
    // Pausing (static mode or hidden tab) must never leave the shared store
    // in a dragging state.
    endEstimateWorkshopDrag();
  }, [phase, isPaused]);

  // EstimateSheetContent/Tree freeze `nodes` into TanStack `initialData` on mount.
  // Re-publish the phase tree into the same query keys the sheet reads so drop
  // phases actually create visible kitchen rows (and ready clears them).
  useEffect(() => {
    queryClient.setQueryData(estimateQueryKeys.tabTree(HERO_ESTIMATE_ID, HERO_TAB_ID), nodes);
    queryClient.setQueryData(estimateQueryKeys.areaTree(HERO_ESTIMATE_ID), nodes);
  }, [nodes, queryClient]);

  useEffect(() => () => endEstimateWorkshopDrag(), []);

  return (
    <div
      className={cn(styles.heroActualEstimateMockupViewport, className)}
      data-hero-animation-phase={phase}
      data-hero-playback={playback}
    >
      <div className={styles.heroActualEstimateMockupScale}>
        <EstimateWorkspaceClient
          projectId={HERO_PROJECT_ID}
          workspaceId={HERO_WORKSPACE_ID}
          estimateId={HERO_ESTIMATE_ID}
          projectName="Lot 24A"
          selectedNodeId={HERO_KITCHEN_NODE_ID}
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
  const kitchenRows = getHeroKitchenRows(phase);
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
              id: HERO_KITCHEN_NODE_ID,
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
  input: Omit<EstimateRowItem, "subTotal" | "totalItemCosts" | "pricingDate"> &
    Partial<Pick<EstimateRowItem, "pricingDate">>,
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
    linkState: input.linkState ?? (input.source === "project" ? "unlinked" : "linked-clean"),
  };
}

function getDragGhost(phase: HeroAnimationPhase) {
  if (phase === "drag-faucet") return { title: "Single-lever kitchen faucet", meta: "Library component - PHP 4,200" };
  if (phase === "drag-ceramic") return { title: "600x600 ceramic tiles", meta: "24 sqm - PHP 18,720" };
  if (phase === "drag-fauxwood") return { title: "200x1200 faux wood tiles", meta: "Replace floor finish" };
  return null;
}
