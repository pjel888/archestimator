"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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
import { getCollaborationColorForUser } from "@/lib/collaboration/colors";
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
 * proof is in view, the viewport is tablet-sized or larger, and reduced motion
 * is off. It pauses while the document is hidden and freezes again if the motion
 * preference changes while the page is open.
 */

type ProofPhase =
  | "ready"
  | "jon-select-root"
  | "jon-add-branch"
  | "jon-branch-created"
  | "hover-faucet"
  | "drag-faucet"
  | "faucet-inserted"
  | "hover-ceramic"
  | "drag-ceramic"
  | "ceramic-inserted"
  | "hover-fauxwood"
  | "drag-fauxwood"
  | "fauxwood-replaced";

type ProofDataStage = "base" | "faucet" | "ceramic" | "fauxwood";

const PROOF_PHASES: ProofPhase[] = [
  "ready",
  "jon-select-root",
  "jon-add-branch",
  "jon-branch-created",
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

const PROOF_DATA_STAGE_BY_PHASE: Record<ProofPhase, ProofDataStage> = {
  ready: "base",
  "jon-select-root": "base",
  "jon-add-branch": "base",
  "jon-branch-created": "base",
  "hover-faucet": "base",
  "drag-faucet": "base",
  "faucet-inserted": "faucet",
  "hover-ceramic": "faucet",
  "drag-ceramic": "faucet",
  "ceramic-inserted": "ceramic",
  "hover-fauxwood": "ceramic",
  "drag-fauxwood": "ceramic",
  "fauxwood-replaced": "fauxwood",
};

const PROOF_DRAG_PHASES = new Set<ProofPhase>([
  "drag-faucet",
  "drag-ceramic",
  "drag-fauxwood",
]);

const STATIC_PHASE: ProofPhase = "fauxwood-replaced";

const PROOF_PHASE_DURATION_MS: Record<ProofPhase, number> = {
  ready: 1000,
  "jon-select-root": 1400,
  "jon-add-branch": 1400,
  "jon-branch-created": 2600,
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

const MOTION_VIEWPORT_QUERY = "(min-width: 768px) and (min-height: 600px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const PROOF_WORKSPACE_ID = "kimi3d-proof-workspace";
const PROOF_PROJECT_ID = "kimi3d-proof-project";
const PROOF_ESTIMATE_ID = "kimi3d-proof-estimate";
const PROOF_TAB_ID = "kimi3d-proof-tab-page-001";
const PROOF_ROOT_NODE_ID = "hero-node-lot-24a";
const PROOF_KITCHEN_NODE_ID = "hero-node-kitchen";
const PROOF_EXTERIOR_WORKS_NODE_ID = "hero-node-exterior-works";
const PROOF_BASE_CABINET_ROW_ID =
  "hero-estimate-row-kitchen-base-cabinet-run";
const PROOF_COUNTERTOP_ROW_ID = "hero-estimate-row-kitchen-countertop";
const PROOF_SINK_ROW_ID = "hero-estimate-row-kitchen-sink";
const PROOF_FAUCET_ROW_ID = "hero-estimate-row-kitchen-faucet";
const PROOF_FLOOR_FINISH_ROW_ID = "hero-estimate-row-kitchen-floor-finish";
const PROOF_FAUCET_LIBRARY_HANDLE_SELECTOR =
  '[data-tree-row="hero-library-item-single-lever-faucet"] [data-tree-rail="drag"]';

const johnCursorColor = getCollaborationColorForUser("john");
const janeCursorColor = getCollaborationColorForUser("jane-4");
const johnCursorStyle = {
  "--proof-cursor-color": johnCursorColor.cursor,
  "--proof-cursor-ring": johnCursorColor.ring,
} as CSSProperties;
const janeCursorStyle = {
  "--proof-cursor-color": janeCursorColor.cursor,
  "--proof-cursor-ring": janeCursorColor.ring,
} as CSSProperties;

function getProofPhaseAtIndex(index: number): ProofPhase {
  const normalized =
    ((index % PROOF_PHASES.length) + PROOF_PHASES.length) % PROOF_PHASES.length;
  return PROOF_PHASES[normalized] ?? "ready";
}

const proofEstimateTabBase: Omit<
  EstimateTabSummary,
  "nodeCount" | "rowCount" | "totalCost"
> = {
  id: PROOF_TAB_ID,
  name: "Page 001",
  sortOrder: 0,
  isDefault: true,
};

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
  createFolder(
    "hero-library-folder-countertop",
    "hero-library-folder-finishes",
    "Countertop",
    20,
  ),
  createFolder("hero-library-folder-casework", null, "Casework", 30),
  createFolder(
    "hero-library-folder-cabinetry",
    "hero-library-folder-casework",
    "Cabinetry",
    10,
  ),
  createFolder(
    "hero-library-folder-sink",
    "hero-library-folder-fixture",
    "Sink",
    20,
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

const baseCabinetItem = createRow({
  id: "hero-library-item-kitchen-base-cabinet-run",
  material: "Kitchen base cabinet run",
  description: "Modular base cabinets with soft-close hardware.",
  supplier: "Cabinetry Works",
  source: "supplier",
  unit: "lm",
  itemCost: 14500,
  miscCost: 20800,
  quantity: 6.4,
  category: "Casework",
  libraryFolderId: "hero-library-folder-cabinetry",
  imageUrl: "/component-thumbnails/kitchen-base-cabinets.jpg",
  pricingSource: "Supplier quotation",
});

const countertopItem = createRow({
  id: "hero-library-item-engineered-stone-countertop",
  material: "20 mm engineered-stone countertop",
  description: "Countertop with eased edges and a sink cutout.",
  supplier: "StoneMasters Countertops",
  source: "library",
  unit: "lm",
  itemCost: 8500,
  miscCost: 15000,
  quantity: 7.2,
  category: "Finishes",
  libraryFolderId: "hero-library-folder-countertop",
  imageUrl: "/component-thumbnails/kitchen-quartz-countertop.jpg",
  pricingSource: "Supplier quotation",
});

const sinkItem = createRow({
  id: "hero-library-item-single-bowl-kitchen-sink",
  material: "Single-bowl stainless kitchen sink",
  description: "Undermount sink with drain fittings and installation allowance.",
  supplier: "Franke Philippines",
  source: "library",
  unit: "pc",
  itemCost: 18500,
  miscCost: 2200,
  quantity: 1,
  category: "Kitchen Fixtures",
  libraryFolderId: "hero-library-folder-sink",
  imageUrl: "/component-thumbnails/lib-franke-single-bowl-sink.jpg",
  pricingSource: "Supplier catalog",
});

const proofBaseKitchenRows: EstimateRowItem[] = [
  { ...baseCabinetItem, id: PROOF_BASE_CABINET_ROW_ID },
  { ...countertopItem, id: PROOF_COUNTERTOP_ROW_ID },
  { ...sinkItem, id: PROOF_SINK_ROW_ID },
];

const proofLibraryItems = [
  faucetItem,
  ceramicTileItem,
  fauxWoodTileItem,
  countertopItem,
  sinkItem,
  baseCabinetItem,
];

function getProofKitchenRows(stage: ProofDataStage): EstimateRowItem[] {
  const rows = proofBaseKitchenRows.map((row) => ({ ...row }));
  if (stage !== "base") {
    rows.push({ ...faucetItem, id: PROOF_FAUCET_ROW_ID, quantity: 1 });
  }
  if (stage === "ceramic") {
    rows.push({
      ...ceramicTileItem,
      id: PROOF_FLOOR_FINISH_ROW_ID,
      quantity: 24,
    });
  }
  if (stage === "fauxwood") {
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
  const wasSequencePlayingRef = useRef(false);
  const [isInView, setIsInView] = useState(false);
  const [motionViewportAllowed, setMotionViewportAllowed] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [workspaceReady, setWorkspaceReady] = useState(false);

  const playback =
    isInView && motionViewportAllowed && workspaceReady
      ? "sequence"
      : "static";
  const isPaused = playback === "static" || documentHidden;
  const phase =
    playback === "static" ? STATIC_PHASE : getProofPhaseAtIndex(phaseIndex);
  const dragGhost = playback === "static" ? null : getDragGhost(phase);

  const dataStage = PROOF_DATA_STAGE_BY_PHASE[phase];
  const hasJonBranch =
    phase !== "ready" &&
    phase !== "jon-select-root" &&
    phase !== "jon-add-branch";
  const selectedNodeId =
    phase === "jon-select-root" || phase === "jon-add-branch"
      ? PROOF_ROOT_NODE_ID
      : phase === "jon-branch-created"
        ? PROOF_EXTERIOR_WORKS_NODE_ID
        : PROOF_KITCHEN_NODE_ID;
  const kitchenRows = useMemo(
    () => getProofKitchenRows(dataStage),
    [dataStage],
  );
  const nodes = useMemo(
    () => createProofEstimateTree(kitchenRows, hasJonBranch),
    [hasJonBranch, kitchenRows],
  );
  const estimateTabs = useMemo(() => {
    return [
      {
        ...proofEstimateTabBase,
        nodeCount: countProofEstimateNodes(nodes),
        rowCount: kitchenRows.length,
        totalCost: getKitchenRowsTotal(kitchenRows),
      },
    ];
  }, [kitchenRows, nodes]);

  useEffect(() => {
    const motionViewportQuery = window.matchMedia(MOTION_VIEWPORT_QUERY);
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    const evaluate = () => {
      setMotionViewportAllowed(
        motionViewportQuery.matches && !reducedMotionQuery.matches,
      );
    };
    evaluate();

    motionViewportQuery.addEventListener("change", evaluate);
    reducedMotionQuery.addEventListener("change", evaluate);
    return () => {
      motionViewportQuery.removeEventListener("change", evaluate);
      reducedMotionQuery.removeEventListener("change", evaluate);
    };
  }, []);

  useEffect(() => {
    const shouldPlay = playback === "sequence";
    if (!shouldPlay && wasSequencePlayingRef.current) {
      setPhaseIndex(0);
    }
    wasSequencePlayingRef.current = shouldPlay;
  }, [playback]);

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
      const libraryHandle = root.querySelector<HTMLElement>(
        PROOF_FAUCET_LIBRARY_HANDLE_SELECTOR,
      );
      const libraryRow =
        libraryHandle?.closest<HTMLElement>("[data-tree-row]");
      const libraryRowRect = libraryRow?.getBoundingClientRect();
      const hasVisibleLibrarySource = Boolean(
        libraryHandle &&
          libraryRowRect &&
          libraryRowRect.width > 0 &&
          libraryRowRect.height > 0,
      );
      if (
        !hasDynamicSkeleton &&
        hasWorkspaceSurface &&
        hasVisibleLibrarySource
      ) {
        setWorkspaceReady(true);
        observer.disconnect();
      }
    };

    const observer = new MutationObserver(evaluateWorkspaceReadiness);
    observer.observe(root, { childList: true, subtree: true });
    evaluateWorkspaceReadiness();
    return () => observer.disconnect();
  }, []);

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !workspaceReady || playback === "static") return;

    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        positionProofCursors(root, phaseRef.current);
      });
    };

    const resizeObserver = new ResizeObserver(update);
    const mutationObserver = new MutationObserver(update);
    resizeObserver.observe(root);
    mutationObserver.observe(root, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [playback, workspaceReady]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !workspaceReady || playback === "static") return;

    const frame = window.requestAnimationFrame(() => {
      positionProofCursors(root, phase);
    });
    const delayedUpdate = window.setTimeout(() => {
      positionProofCursors(root, phase);
    }, 160);

    return () => {
      window.clearTimeout(delayedUpdate);
      window.cancelAnimationFrame(frame);
    };
  }, [phase, playback, workspaceReady]);

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
      <div className={styles.proofSurfaceClip}>
        <div inert className={styles.proofScale}>
          <EstimateWorkspaceClient
            projectId={PROOF_PROJECT_ID}
            workspaceId={PROOF_WORKSPACE_ID}
            estimateId={PROOF_ESTIMATE_ID}
            projectName="Lot 24A"
            selectedNodeId={selectedNodeId}
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
            forceDesktopRails
          />
        </div>
        {!workspaceReady ? (
          <div className={styles.proofLoading} role="status" aria-live="polite">
            <span>Preparing the estimate workspace</span>
            <p>Project scope, working sheet, and cost library</p>
          </div>
        ) : null}
      </div>
      <div className={styles.proofAnimationLayer} aria-hidden="true">
        {dragGhost ? (
          <div className={styles.proofDragGhost}>
            <span>{dragGhost.title}</span>
            <small>{dragGhost.meta}</small>
          </div>
        ) : null}
        <div
          className={styles.proofCollaboratorCursor}
          style={johnCursorStyle}
          data-proof-cursor="john"
        >
          <span className={styles.proofCollaboratorCursorMarker} />
          <span className={styles.proofCollaboratorCursorName}>Philip</span>
        </div>
        <div
          className={cn(
            styles.proofCollaboratorCursor,
            styles.proofCollaboratorCursorJane,
          )}
          style={janeCursorStyle}
          data-proof-cursor="jane"
        >
          <span className={styles.proofCollaboratorCursorMarker} />
          <span className={styles.proofCollaboratorCursorName}>Jon</span>
        </div>
      </div>
    </div>
  );
}

function createProofEstimateTree(
  kitchenRows: EstimateRowItem[],
  includeJonBranch: boolean,
): EstimateTreeNode[] {
  const kitchenTotal = formatProofPeso(getKitchenRowsTotal(kitchenRows));

  return [
    {
      id: PROOF_ROOT_NODE_ID,
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
        ...(includeJonBranch
          ? [
              createArea(
                PROOF_EXTERIOR_WORKS_NODE_ID,
                "Exterior Works",
                "PHP 0",
              ),
            ]
          : []),
      ],
    },
  ];
}

function countProofEstimateNodes(nodes: EstimateTreeNode[]): number {
  return nodes.reduce(
    (count, node) =>
      count + 1 + countProofEstimateNodes(node.children ?? []),
    0,
  );
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

type ProofCursorAnchor = {
  selector: string;
  xRatio?: number;
  yRatio?: number;
};

const proofJohnCursorAnchors: Record<ProofPhase, ProofCursorAnchor> = {
  ready: {
    selector: 'button[aria-label="Add Component"]',
    xRatio: 0.5,
    yRatio: 0.5,
  },
  "jon-select-root": {
    selector: 'button[aria-label="Add Component"]',
    xRatio: 0.5,
    yRatio: 0.5,
  },
  "jon-add-branch": {
    selector: 'button[aria-label="Add Component"]',
    xRatio: 0.5,
    yRatio: 0.5,
  },
  "jon-branch-created": {
    selector: 'button[aria-label="Add Component"]',
    xRatio: 0.5,
    yRatio: 0.5,
  },
  "hover-faucet": {
    selector: PROOF_FAUCET_LIBRARY_HANDLE_SELECTOR,
  },
  "drag-faucet": {
    selector: 'section[aria-label="Kitchen"] .border-dashed',
  },
  "faucet-inserted": {
    selector: 'input[aria-label="Single-lever kitchen faucet quantity"]',
  },
  "hover-ceramic": {
    selector:
      '[data-tree-row="hero-library-item-600x600-ceramic-tiles"] [data-tree-rail="drag"]',
  },
  "drag-ceramic": {
    selector: 'section[aria-label="Kitchen"] .border-dashed',
  },
  "ceramic-inserted": {
    selector: 'input[aria-label="600x600 ceramic tiles quantity"]',
  },
  "hover-fauxwood": {
    selector:
      '[data-tree-row="hero-library-item-200x1200-faux-wood-tiles"] [data-tree-rail="drag"]',
  },
  "drag-fauxwood": {
    selector:
      '[aria-label="600x600 ceramic tiles replaceable estimate component"]',
    xRatio: 0.42,
  },
  "fauxwood-replaced": {
    selector: 'input[aria-label="200x1200 faux wood tiles quantity"]',
  },
};

function getProofJaneCursorAnchor(phase: ProofPhase): ProofCursorAnchor {
  if (phase === "jon-select-root") {
    return { selector: `[data-tree-row="${PROOF_ROOT_NODE_ID}"]` };
  }

  if (phase === "jon-add-branch") {
    return { selector: 'button[aria-label="Add Branch"]' };
  }

  if (phase !== "ready") {
    return {
      selector: `[data-tree-row="${PROOF_EXTERIOR_WORKS_NODE_ID}"]`,
    };
  }

  return {
    selector:
      'input[aria-label="20 mm engineered-stone countertop adjustment percentage"]',
  };
}

function positionProofCursors(root: HTMLDivElement, phase: ProofPhase) {
  const rootRect = root.getBoundingClientRect();
  const johnAnchor =
    proofJohnCursorAnchors[phase] ?? proofJohnCursorAnchors.ready;
  const johnPosition = getProofCursorPosition(
    root,
    rootRect,
    johnAnchor,
    { x: 0.87, y: 0.19 },
  );
  const janePosition = getProofCursorPosition(
    root,
    rootRect,
    getProofJaneCursorAnchor(phase),
    { x: 0.55, y: 0.62 },
  );

  setProofCursorPosition(root, "john", johnPosition);
  setProofCursorPosition(root, "jane", janePosition);
}

function getProofCursorPosition(
  root: HTMLDivElement,
  rootRect: DOMRect,
  anchor: ProofCursorAnchor,
  fallback: { x: number; y: number },
) {
  const target = root.querySelector<HTMLElement>(anchor.selector);
  const targetRect = target?.getBoundingClientRect();
  if (!targetRect) {
    return {
      x: rootRect.width * fallback.x,
      y: rootRect.height * fallback.y,
    };
  }

  const rawX =
    targetRect.left -
    rootRect.left +
    targetRect.width * (anchor.xRatio ?? 0.5);
  const rawY =
    targetRect.top -
    rootRect.top +
    targetRect.height * (anchor.yRatio ?? 0.5);
  const x = Math.min(Math.max(rawX, 8), Math.max(rootRect.width - 56, 8));
  const y = Math.min(Math.max(rawY, 8), Math.max(rootRect.height - 18, 8));

  return { x, y };
}

function setProofCursorPosition(
  root: HTMLDivElement,
  name: "john" | "jane",
  position: { x: number; y: number },
) {
  const xProperty = `--proof-${name}-x`;
  const yProperty = `--proof-${name}-y`;
  const x = `${position.x.toFixed(3)}px`;
  const y = `${position.y.toFixed(3)}px`;
  if (root.style.getPropertyValue(xProperty) !== x) {
    root.style.setProperty(xProperty, x);
  }
  if (root.style.getPropertyValue(yProperty) !== y) {
    root.style.setProperty(yProperty, y);
  }
}
