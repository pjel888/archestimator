"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { EstimateTabSummary } from "@/lib/estimates/types";
import { EstimateWorkspaceClient } from "@/components/workshop/EstimateWorkspaceClient";
import {
  endEstimateWorkshopDrag,
  useEstimateWorkshopDragState,
} from "@/components/workshop/estimate-workshop-drag";
import type {
  EstimateRowItem,
  EstimateTreeNode,
} from "@/components/workshop/estimate-tree-data";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { cn } from "@/lib/ui/cn";

import { heroCopy } from "../_content";
import styles from "../kimi-landing.module.css";

/**
 * Exact product proof for the /kimi3d hero: the real current
 * `EstimateWorkspaceClient` mounted with a sanitized local fixture and a
 * deterministic demonstration sequence. Route-owned re-implementation of the
 * proven hero-demo contract; no landing-v3/landing-production imports.
 *
 * SSR and the first client render always show the static final phase, so the
 * proof is meaningful before hydration. The sequence starts only when the
 * proof is in view, the viewport is desktop-sized, and reduced motion is off.
 * It pauses while the document is hidden and freezes again if the motion
 * preference changes while the page is open.
 */

type ProofPhase =
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

const PROOF_PHASES: ProofPhase[] = [
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

const PROOF_DRAG_PHASES = new Set<ProofPhase>([
  "drag-faucet",
  "drag-ceramic",
  "drag-fauxwood",
]);

const STATIC_PHASE: ProofPhase = "fauxwood-replaced";
const STATIC_PHASE_INDEX = PROOF_PHASES.indexOf(STATIC_PHASE);
const PROOF_SEQUENCE_END_INDEX = STATIC_PHASE_INDEX + PROOF_PHASES.length;

const PROOF_PHASE_DURATION_MS: Record<ProofPhase, number> = {
  ready: 1000,
  "hover-faucet": 1200,
  "drag-faucet": 2400,
  "faucet-inserted": 2200,
  "hover-ceramic": 1200,
  "drag-ceramic": 2400,
  "ceramic-inserted": 2200,
  "hover-fauxwood": 1200,
  "drag-fauxwood": 2400,
  "fauxwood-replaced": 5000,
};

const DESKTOP_LOOP_QUERY = "(min-width: 821px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const PROOF_WORKSPACE_ID = "hero-sanitized-workspace";
const PROOF_PROJECT_ID = "hero-sanitized-project";
const PROOF_ESTIMATE_ID = "hero-sanitized-estimate";
const PROOF_TAB_ID = "hero-sanitized-tab-page-001";
const PROOF_KITCHEN_NODE_ID = "hero-node-kitchen";
const PROOF_FAUCET_ROW_ID = "hero-estimate-row-kitchen-faucet";
const PROOF_FLOOR_FINISH_ROW_ID = "hero-estimate-row-kitchen-floor-finish";

function getProofPhaseAtIndex(index: number): ProofPhase {
  const normalized =
    ((index % PROOF_PHASES.length) + PROOF_PHASES.length) % PROOF_PHASES.length;
  return PROOF_PHASES[normalized] ?? "ready";
}

const proofEstimateTabs: EstimateTabSummary[] = [
  {
    id: PROOF_TAB_ID,
    name: "Page 001",
    sortOrder: 0,
    isDefault: true,
    nodeCount: 8,
    rowCount: 3,
    totalCost: 228940,
  },
];

const proofLibraryFolders: LibraryFolderRecord[] = [
  createFolder("hero-library-folder-fixture", null, "Fixture", 10),
  createFolder(
    "hero-library-folder-faucet",
    "hero-library-folder-fixture",
    "Faucet",
    10,
  ),
  createFolder("hero-library-folder-finishes", null, "Finishes", 20),
  createFolder(
    "hero-library-folder-floor",
    "hero-library-folder-finishes",
    "Floor",
    10,
  ),
];

const faucetItem = createRow({
  id: "hero-library-item-single-lever-faucet",
  material: "Single-lever kitchen faucet",
  description:
    "Chrome deck-mounted mixer faucet for kitchen sink installation.",
  supplier: "IKEA Philippines",
  source: "library",
  unit: "pc",
  itemCost: 4200,
  miscCost: 900,
  quantity: 1,
  category: "Kitchen Fixtures",
  libraryFolderId: "hero-library-folder-faucet",
  imageUrl: "/component-thumbnails/hero-single-lever-kitchen-faucet.png",
  pricingSource: "Supplier catalog",
});

const ceramicTileItem = createRow({
  id: "hero-library-item-600x600-ceramic-tiles",
  material: "600x600 ceramic tiles",
  description:
    "Large-format matte ceramic floor tile for kitchen floor finish.",
  supplier: "Mariwasa / Wilcon Depot",
  source: "supplier",
  unit: "sqm",
  itemCost: 780,
  miscCost: 0,
  quantity: 24,
  category: "Finishes",
  libraryFolderId: "hero-library-folder-floor",
  imageUrl: "/component-thumbnails/hero-600x600-ceramic-tiles.png",
  pricingSource: "Supplier catalog",
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
  pricingSource: "Supplier catalog",
});

const proofLibraryItems = [faucetItem, ceramicTileItem, fauxWoodTileItem];

function getProofKitchenRows(phase: ProofPhase): EstimateRowItem[] {
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
    rows.push({ ...faucetItem, id: PROOF_FAUCET_ROW_ID, quantity: 1 });
  }
  if (
    phase === "ceramic-inserted" ||
    phase === "hover-fauxwood" ||
    phase === "drag-fauxwood"
  ) {
    rows.push({
      ...ceramicTileItem,
      id: PROOF_FLOOR_FINISH_ROW_ID,
      quantity: 24,
    });
  }
  if (phase === "fauxwood-replaced") {
    rows.push({
      ...fauxWoodTileItem,
      id: PROOF_FLOOR_FINISH_ROW_ID,
      quantity: 24,
    });
  }
  return rows;
}

function getDragGhost(phase: ProofPhase) {
  if (phase === "drag-faucet")
    return {
      title: "Single-lever kitchen faucet",
      meta: "Cost library item - PHP 4,200",
    };
  if (phase === "drag-ceramic")
    return { title: "600x600 ceramic tiles", meta: "24 sqm - PHP 18,720" };
  if (phase === "drag-fauxwood")
    return { title: "200x1200 faux wood tiles", meta: "Replace floor finish" };
  return null;
}

export function HeroWorkspaceProof({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [desktopMotionAllowed, setDesktopMotionAllowed] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(STATIC_PHASE_INDEX);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const sequenceComplete = phaseIndex >= PROOF_SEQUENCE_END_INDEX;

  const playback =
    isInView && desktopMotionAllowed && !sequenceComplete
      ? "sequence"
      : "static";
  const isPaused = playback === "static" || documentHidden;
  const phase =
    playback === "static" ? STATIC_PHASE : getProofPhaseAtIndex(phaseIndex);
  const dragGhost = playback === "static" ? null : getDragGhost(phase);

  const nodes = useMemo(() => createProofEstimateTree(phase), [phase]);
  const estimateTabs = useMemo(() => {
    const kitchenRows = getProofKitchenRows(phase);
    const first = proofEstimateTabs[0];
    return [
      {
        ...first,
        rowCount: kitchenRows.length,
        totalCost: getKitchenRowsTotal(kitchenRows),
      },
    ];
  }, [phase]);

  useEffect(() => {
    const desktopQuery = window.matchMedia(DESKTOP_LOOP_QUERY);
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    const evaluate = () => {
      setDesktopMotionAllowed(
        desktopQuery.matches && !reducedMotionQuery.matches,
      );
    };
    evaluate();

    desktopQuery.addEventListener("change", evaluate);
    reducedMotionQuery.addEventListener("change", evaluate);
    return () => {
      desktopQuery.removeEventListener("change", evaluate);
      reducedMotionQuery.removeEventListener("change", evaluate);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsInView(entry.isIntersecting);
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const evaluateWorkspaceReadiness = () => {
      const hasDynamicSkeleton = Boolean(
        root.querySelector(
          '[data-skeleton="estimate-tree-dynamic"], [data-skeleton="estimate-content-dynamic"]',
        ),
      );
      const hasWorkspaceSurface = Boolean(
        root.querySelector('section[aria-label="Kitchen"]'),
      );
      setWorkspaceReady(!hasDynamicSkeleton && hasWorkspaceSurface);
    };

    evaluateWorkspaceReadiness();
    const observer = new MutationObserver(evaluateWorkspaceReadiness);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      setDocumentHidden(document.visibilityState === "hidden");
    };
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setTimeout(() => {
      setPhaseIndex((current) => current + 1);
    }, PROOF_PHASE_DURATION_MS[phase]);
    return () => window.clearTimeout(timer);
  }, [phase, phaseIndex, isPaused]);

  useEffect(() => {
    if (!isPaused && PROOF_DRAG_PHASES.has(phase)) {
      useEstimateWorkshopDragState.setState({
        activeDrag: { kind: "library-item" },
      });
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
    queryClient.setQueryData(
      estimateQueryKeys.tabTree(PROOF_ESTIMATE_ID, PROOF_TAB_ID),
      nodes,
    );
    queryClient.setQueryData(
      estimateQueryKeys.areaTree(PROOF_ESTIMATE_ID),
      nodes,
    );
  }, [nodes, queryClient]);

  useEffect(() => () => endEstimateWorkshopDrag(), []);

  return (
    <div
      ref={rootRef}
      className={cn(styles.proofViewport, className)}
      data-proof-playback={playback}
      data-proof-phase={phase}
      data-workspace-ready={workspaceReady ? "" : undefined}
      role="region"
      aria-label={heroCopy.demoRegionLabel}
    >
      {/* The demo is a presentation of the real workspace: pointer-inert
          already, and inert here keeps its many controls out of the tab order
          and accessibility tree. The region label plus the visible disclosure
          communicate what it is. */}
      <div inert className={styles.proofScale}>
        <EstimateWorkspaceClient
          projectId={PROOF_PROJECT_ID}
          workspaceId={PROOF_WORKSPACE_ID}
          estimateId={PROOF_ESTIMATE_ID}
          projectName="Lot 24A"
          selectedNodeId={PROOF_KITCHEN_NODE_ID}
          nodes={nodes}
          estimateTabs={estimateTabs}
          activeTabId={PROOF_TAB_ID}
          canEditEstimate
          libraryItems={proofLibraryItems}
          libraryTemplates={[]}
          libraryCategoryTree={[]}
          librarySuppliers={[]}
          libraryBrands={[]}
          libraryFolders={proofLibraryFolders}
          libraryUseStoredPreferences={false}
          libraryEnableReusableProjectSources={false}
          surfaceVariant="glass"
          disableRouteSync
          presentationMode
        />
      </div>
      {!workspaceReady ? (
        <div className={styles.proofLoading} role="status" aria-live="polite">
          <span>Preparing the estimate workspace</span>
          <p>Project scope, working sheet, and cost library</p>
        </div>
      ) : null}
      <div className={styles.proofAnimationLayer} aria-hidden="true">
        {dragGhost ? (
          <div className={styles.proofDragGhost}>
            <span>{dragGhost.title}</span>
            <small>{dragGhost.meta}</small>
          </div>
        ) : null}
        <div className={styles.proofMouse}>
          <svg viewBox="0 0 20 26" focusable="false" aria-hidden="true">
            <path d="M2.2 1.4 18.1 15.9l-8.2 1.2-3.7 7.5L2.2 1.4Z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function createProofEstimateTree(phase: ProofPhase): EstimateTreeNode[] {
  const kitchenRows = getProofKitchenRows(phase);
  const kitchenTotal = formatProofPeso(getKitchenRowsTotal(kitchenRows));

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
              id: PROOF_KITCHEN_NODE_ID,
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

function formatProofPeso(value: number) {
  return `PHP ${Math.round(value).toLocaleString("en-US")}`;
}

function createArea(id: string, name: string, total: string): EstimateTreeNode {
  return { id, name, kind: "area", total, estimateRowItems: [] };
}

function createFolder(
  id: string,
  parentId: string | null,
  name: string,
  sortOrder: number,
): LibraryFolderRecord {
  return {
    id,
    workspace_id: PROOF_WORKSPACE_ID,
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
    linkState:
      input.linkState ??
      (input.source === "project" ? "unlinked" : "linked-clean"),
  };
}
