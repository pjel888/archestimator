"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useDeferredValue, useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode, type SetStateAction } from "react";
import { FolderSimple, Package, Plus, Rows, StackPlus, StackSimple, Trash, X } from "@phosphor-icons/react/dist/ssr";

import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import { Modal } from "@/components/ui/modal";
import { Drawer } from "@/components/ui/overlays/sheet-drawer";
import { ADD_BUTTON_CLASSNAME, ToolbarIconButton } from "@/components/ui/toolbar-icon-button";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { type ToastTone, useToast } from "@/components/ui/toast";
import {
  pruneSelection,
  toggleCascadeSelection,
  type TreeSelectionNode,
} from "@/lib/bulk-selection/tree-selection";
import { resolveEstimateWorkspaceSelection, useEstimateWorkspaceSelection } from "@/hooks/use-estimate-workspace-state";
import {
  createLibraryFolder,
  deleteEstimateTemplate,
  executeBulkArchiveLibraryComponents,
  previewBulkArchiveLibraryComponents,
  recordComponentLibraryTelemetryEvent,
  renameEstimateTemplate,
  renameLibraryFolder,
  reorderLibraryFolders,
  type ComponentLibraryUserPreferences,
} from "@/lib/component-library/actions";
import { setLibraryTelemetrySink } from "@/lib/component-library/library-telemetry";
import { buildLibraryFolderReorderPlan, type LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import { componentCategoryTree, type ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import { createBulkActionCorrelationId } from "@/lib/mass-deletion/bulk-action";
import {
  getReusableEstimateOutline,
  listReusableProjectEstimateSources,
  listReusableProjectSources,
  searchReusableProjectSources,
} from "@/lib/reusable-sources/actions";
import { getProjectReusableSourceDisplayName } from "@/lib/reusable-sources/display";
import type {
  ProjectEstimateReusableSource,
  ProjectNodeReusableSource,
  ProjectReusableSource,
  ProjectReusableEstimateSource,
  ProjectSourceInsertTarget,
  ReusableEstimateSource,
  ReusableSourceLiveMetadata,
} from "@/lib/reusable-sources/types";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { ComponentLibraryBrand } from "@/lib/repositories/component-library-repository";
import { cn } from "@/lib/ui/cn";
import { filterMapBy } from "@/lib/util/array";
import { estimateSurfaceClass } from "../estimate-surface-class";
import { useEstimateSurfaceVariant } from "../estimate-surface-variant";
import { estimateLibraryItems, findEstimateNode, type EstimateRowItem, type EstimateTreeNode } from "../estimate-tree-data";
import { beginEstimateWorkshopDrag } from "../estimate-workshop-drag";
import { LIBRARY_ITEM_DRAG_MIME_TYPE, dispatchAddLibraryItemEvent } from "../estimate-sheet/rows/constants";
import { ResizableSidePanel } from "../ResizableSidePanel";
import { ComponentViewControls } from "../component-library-manager/LibraryFolderTree";
import type { ComponentViewMode } from "../component-library-manager/library-folder-tree-shared";
import { ComponentFacetFilterPopover } from "@/components/workshop/library/component-facet-filter";
import {
  buildComponentFacetOptions,
  componentMatchesFacets,
  countActiveComponentFacets,
} from "@/components/workshop/library/component-facet-filter-model";
import { NewComponentForm } from "./NewComponentForm";
import { NewTemplateModal } from "./NewTemplateModal";
import { PreviewPanel } from "./PreviewPanel";
import {
  CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT,
  ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
  PROJECT_SOURCE_DRAG_MIME_TYPE,
  type CreateEstimateTemplateFromNodeEventDetail,
  type EstimateTemplate,
} from "./templates";
import {
  hydrateSidebarLibraryItems,
  isEstimateLibraryTab,
  resolveVisibleEstimateLibraryTab,
  useEstimateRightSidebarChromeState,
  useLibraryTabState,
  useProjectTabState,
  useTemplatesTabState,
  type EstimateLibraryTab,
  type TemplateSourceFilter,
} from "./use-estimate-right-sidebar-state";
import {
  buildLibraryTreeWithComponentRows,
  buildProjectComponentTree,
  splitSidebarComponentItems,
  type ComponentLibrarySupplierOption,
} from "./tree/buildLibraryTree";
import {
  buildTemplatesSelectionNodes,
  buildTemplatesTreeNodes,
  getCheckedProjectSourceTargets,
  getCheckedProjectSourceRowItems,
  getCheckedTemplateUnits,
  getTemplatesTreeAllNodeIds,
  templatesTreeCategoryId,
  templatesTreeSectionId,
} from "./tree/TemplatesTreeModel";
import { TemplatesTree } from "./tree/TemplatesTree";
import { LibraryTree } from "./tree/LibraryTree";
import { loadComponentLibraryAccountPreferences, saveComponentLibraryAccountPreferences } from "./account-preferences-client";
import {
  applyLibraryTreeOrder,
  filterTree,
  findLibrarySiblingOrder,
  findNode,
  getAllNodeIds,
  LIBRARY_TREE_ROOT_ORDER_KEY,
  type LibraryTreeOrder,
} from "./tree/helpers";
import type { LibraryTreeNode } from "./tree/types";

// U1b: project-source load failures surface through the existing toast — never
// an inline banner (which shifts the tree) and never a raw DB error shape
// ({code,details,hint,message}). One fixed, friendly string per scope; the raw
// error is logged to the browser console only, never to the DOM.
type SourceErrorScope = "dataset" | "estimates" | "outline" | "search";

function toUserSourceError(scope: SourceErrorScope): string {
  switch (scope) {
    case "dataset":
      return "Couldn't load project sources.";
    case "estimates":
      return "Couldn't load this project's estimates. Try again.";
    case "outline":
      return "Couldn't load this project's outline. Try again.";
    case "search":
      return "Couldn't search project sources. Try again.";
  }
}

function getSidebarActionToastTone(message: string): ToastTone {
  const lower = message.toLowerCase();
  if (lower.startsWith("select an area") || lower.includes("could not") || lower.includes("not inserted")) return "error";
  return "success";
}

function getArchiveActionIssueMessage(
  result: { issues?: Array<{ message?: string }>; blocked?: Array<{ message?: string }> },
  fallback: string,
) {
  return result.issues?.find((issue) => issue.message)?.message
    ?? result.blocked?.find((issue) => issue.message)?.message
    ?? fallback;
}

// Stable default for the optional `templates` prop. A bare `= []` default mints a
// fresh array each render, which would make the U10 prop-reconciliation guard
// (`syncedTemplatesProp !== templates`) fire every render → infinite re-render.
const EMPTY_TEMPLATE_PROP: EstimateTemplate[] = [];

// The single create-component modal, shared with the Components page: the
// estimate sidebar must not grow its own variant of this form.
const AddComponentModal = dynamic(() =>
  import("../component-library-manager/AddComponentModal").then((module) => module.AddComponentModal),
);
import {
  createComponent,
  defaultForm,
  getComponentName,
  getComponentPrice,
  isFormDirty,
  LIBRARY_FAVORITES_KEY,
  LIBRARY_PREFS_KEY,
  LIBRARY_RECENTS_KEY,
  LIBRARY_TREE_ORDER_KEY,
  pesoFormatter,
  readJsonStorage,
  safeSetJsonStorage,
} from "./helpers";

const DEFAULT_LIBRARY_TREE_TABS: readonly EstimateLibraryTab[] = ["components", "project", "templates"];
const PUBLIC_LIBRARY_TREE_TABS: readonly EstimateLibraryTab[] = ["components", "templates"];
const LIBRARY_TREE_TAB_LABELS: Record<EstimateLibraryTab, string> = {
  components: "Library",
  project: "Project",
  templates: "Templates",
};

function normalizeVisibleLibraryTabs(tabs: readonly EstimateLibraryTab[]): EstimateLibraryTab[] {
  const normalized: EstimateLibraryTab[] = [];
  for (const tab of tabs) {
    if (!normalized.includes(tab)) normalized.push(tab);
  }
  return normalized.length > 0 ? normalized : ["components"];
}

function buildLibraryTreeTabs(tabs: readonly EstimateLibraryTab[]) {
  return tabs.map((id) => ({ id, label: LIBRARY_TREE_TAB_LABELS[id] }));
}

const EMPTY_REUSABLE_PROJECT_SOURCES: ReusableEstimateSource[] = [];
const EMPTY_SUPPLIER_OPTIONS: ComponentLibrarySupplierOption[] = [];
const EMPTY_COMPONENT_BRANDS: ComponentLibraryBrand[] = [];
const EMPTY_LIBRARY_FOLDERS: LibraryFolderRecord[] = [];
const PROJECT_SOURCES_LOAD_TOAST_ID = "component-library-project-sources-load";
const PROJECT_SOURCE_INSERT_TOAST_ID = "component-library-project-source-insert";
const PROJECT_SOURCE_NODE_PREFIX = "source-project-";
const PROJECT_ESTIMATE_SOURCE_NODE_PREFIX = "source-estimate-";
const PROJECT_COMPONENTS_FOLDER_ID_PREFIX = "project-components";

function useNativeSidebarDialog(onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const handleDialogMouseDown = useCallback(
    (event: MouseEvent) => {
      if (event.target === dialogRef.current) onClose();
    },
    [onClose],
  );

  return useCallback(
    (node: HTMLDialogElement | null) => {
      dialogRef.current?.removeEventListener("mousedown", handleDialogMouseDown);
      dialogRef.current = node;
      if (!node) return;

      node.addEventListener("mousedown", handleDialogMouseDown);
      if (node.open) return;

      if (typeof node.showModal === "function") {
        try {
          node.showModal();
        } catch {
          node.setAttribute("open", "");
        }
        return;
      }

      node.setAttribute("open", "");
    },
    [handleDialogMouseDown],
  );
}

function isProjectComponentFolderRecord(folder: LibraryFolderRecord) {
  return folder.id.startsWith(`${PROJECT_COMPONENTS_FOLDER_ID_PREFIX}-`);
}

function toLibraryFolderRecord(folder: {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  source_category_node_id: string | null;
  folder_kind: string;
}): LibraryFolderRecord {
  return {
    id: folder.id,
    workspace_id: folder.workspace_id,
    parent_id: folder.parent_id,
    name: folder.name,
    sort_order: folder.sort_order,
    source_category_node_id: folder.source_category_node_id,
    folder_kind: folder.folder_kind === "taxonomy" ? "taxonomy" : "custom",
  };
}

/**
 * A warm/prefetched expand resolves in well under this window, so its skeleton
 * never appears; only a genuinely cold expand lingers long enough to reveal the
 * in-place skeleton rows (U23 — no spinner flash, no layout shift).
 */
const SKELETON_REVEAL_DELAY_MS = 150;

/**
 * Gates a set of "loading" ids behind {@link SKELETON_REVEAL_DELAY_MS}: an id
 * is returned only after it has been loading continuously for `delayMs`, and
 * drops out the instant it stops loading. State writes happen only inside the
 * timer callback (never synchronously in the effect), and settled-but-finished
 * ids are filtered out at read time — so no loading id can outlive its load.
 */
function useDelayedIdSet(activeIds: string[], delayMs: number): string[] {
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(null!);
  if (timersRef.current === null) timersRef.current = new Map();
  const activeKey = activeIds.join("\0");

  useEffect(() => {
    const active = new Set(activeKey ? activeKey.split("\0") : []);
    const timers = timersRef.current;
    const scheduledIds: string[] = [];
    for (const id of active) {
      if (timers.has(id)) continue;
      const timer = setTimeout(() => {
        timers.delete(id);
        setRevealedIds((current) => {
          const currentIds = new Set(current);
          return currentIds.has(id) ? current : [...current, id];
        });
      }, delayMs);
      timers.set(id, timer);
      scheduledIds.push(id);
    }
    for (const [id, timer] of Array.from(timers.entries())) {
      if (!active.has(id)) {
        clearTimeout(timer);
        timers.delete(id);
      }
    }
    return () => {
      for (const id of scheduledIds) {
        const timer = timers.get(id);
        if (timer) {
          clearTimeout(timer);
          timers.delete(id);
        }
      }
    };
  }, [activeKey, delayMs]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  // Only ids still loading should show a skeleton; revealed-but-settled ids fall
  // away here, so removal needs no state write in the effect above.
  return useMemo(
    () => activeIds.filter((id) => revealedIds.includes(id)),
    [activeIds, revealedIds],
  );
}

type EstimateComponentTreeTab = "categories" | "suppliers" | "brands";
const TEMPLATE_SOURCE_FILTER_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "custom", label: "Custom templates" },
  { value: "projects", label: "From projects" },
] as const satisfies readonly DropdownSelectOption[];

function isTemplateSourceFilter(value: string): value is TemplateSourceFilter {
  return TEMPLATE_SOURCE_FILTER_OPTIONS.some((option) => option.value === value);
}

function getComponentTreeTab(mode: ComponentViewMode): EstimateComponentTreeTab {
  if (mode === "brand") return "brands";
  return mode === "suppliers" ? "suppliers" : "categories";
}

type ProjectSourcePreviewContext = {
  projectName: string | null;
  estimateName: string | null;
  sheetCode: string | null;
  tabName: string | null;
  nodePath: string[];
  updatedAt: string | null;
  rowCount: number | null;
  totalCost: number | null;
};

function isProjectReusableEstimateSource(source: ReusableEstimateSource): source is ProjectReusableEstimateSource {
  return source.kind !== "custom-template";
}

function isProjectSourceInsertTarget(source: ProjectReusableEstimateSource): source is ProjectSourceInsertTarget {
  return source.kind === "project-tab" || source.kind === "project-node";
}

function getProjectSourceTypeLabel(source: ProjectReusableEstimateSource) {
  if (source.kind === "project") return "Project";
  if (source.kind === "project-estimate") return "Estimate";
  if (source.kind === "project-tab") return "Tab";
  // One node type — every estimate node is an "Area".
  return "Area";
}

const previewDateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

function findProjectSourceByKey(sources: ReusableEstimateSource[], key: string | null): ProjectReusableEstimateSource | null {
  if (!key) return null;
  return sources.find(
    (source): source is ProjectReusableEstimateSource =>
      isProjectReusableEstimateSource(source) && reusableProjectSourceKey(source) === key,
  ) ?? null;
}

function formatPreviewDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return previewDateFormatter.format(date);
}

function getProjectSourcePreviewContext(
  source: ProjectReusableEstimateSource,
  sources: ReusableEstimateSource[],
): ProjectSourcePreviewContext {
  const metadata: ReusableSourceLiveMetadata = source.metadata ?? {};
  const estimateId =
    source.kind === "project-estimate" || source.kind === "project-tab" || source.kind === "project-node"
      ? source.estimateId
      : null;
  const tabId = source.kind === "project-tab" || source.kind === "project-node" ? source.tabId : null;
  const projectSource = sources.find(
    (candidate): candidate is ProjectReusableEstimateSource =>
      isProjectReusableEstimateSource(candidate) &&
      candidate.kind === "project" &&
      candidate.projectId === source.projectId,
  );
  const estimateSource = estimateId
    ? sources.find(
        (candidate): candidate is ProjectEstimateReusableSource =>
          candidate.kind === "project-estimate" && candidate.estimateId === estimateId,
      )
    : null;
  const tabSource = tabId
    ? sources.find(
        (candidate): candidate is ProjectReusableEstimateSource =>
          isProjectReusableEstimateSource(candidate) &&
          candidate.kind === "project-tab" &&
          candidate.tabId === tabId,
      )
    : null;
  const tabDisplayName =
    metadata.tabDisplayName ??
    (source.kind === "project-tab" ? getProjectReusableSourceDisplayName(source) : null) ??
    (tabSource ? getProjectReusableSourceDisplayName(tabSource) : null);
  const tabName =
    tabDisplayName ??
    metadata.tabName ??
    (source.kind === "project-tab" ? source.name : null) ??
    (tabSource?.kind === "project-tab" ? tabSource.name : null);
  const nodePath =
    metadata.nodePath ??
    (source.kind === "project-node" ? [tabName, source.name].filter((value): value is string => Boolean(value)) : []);

  return {
    projectName: metadata.projectName ?? projectSource?.name ?? null,
    estimateName: metadata.estimateName ?? (source.kind === "project-estimate" ? source.name : estimateSource?.name ?? null),
    sheetCode: metadata.sheetCode ?? (source.kind === "project-estimate" ? source.sheetCode : estimateSource?.sheetCode ?? null),
    tabName,
    nodePath,
    updatedAt: metadata.updatedAt ?? null,
    rowCount: metadata.rowCount ?? null,
    totalCost: metadata.totalCost ?? null,
  };
}

type ProjectSourcePreviewOutlineRow = {
  id: string;
  label: string;
  meta: string;
};

function getProjectSourcePreviewOutlineRows(
  source: ProjectReusableEstimateSource,
  sources: ReusableEstimateSource[],
): ProjectSourcePreviewOutlineRow[] {
  const projectSources = sources.filter(isProjectReusableEstimateSource);
  switch (source.kind) {
    case "project":
      return projectSources
        .filter((candidate): candidate is ProjectEstimateReusableSource => candidate.kind === "project-estimate" && candidate.projectId === source.projectId)
        .map((candidate) => ({
          id: reusableProjectSourceKey(candidate),
          label: candidate.name,
          meta: "estimate",
        }));
    case "project-estimate":
      return projectSources
        .filter((candidate): candidate is ProjectSourceInsertTarget => candidate.kind === "project-tab" && candidate.estimateId === source.estimateId)
        .map((candidate) => ({
          id: reusableProjectSourceKey(candidate),
          label: getProjectReusableSourceDisplayName(candidate),
          meta: "tab",
        }));
    case "project-tab":
      return projectSources
        .filter((candidate): candidate is ProjectNodeReusableSource => candidate.kind === "project-node" && candidate.tabId === source.tabId)
        .map((candidate) => ({
          id: reusableProjectSourceKey(candidate),
          label: candidate.name,
          meta: candidate.nodeKind,
        }));
    case "project-node":
      return [];
    default: {
      const unreachable: never = source;
      return unreachable;
    }
  }
}

function ProjectSourcePreviewPanel({
  source,
  sources,
  onClose,
  onAdd,
  addDisabled,
  addLabel,
}: {
  source: ProjectReusableEstimateSource;
  sources: ReusableEstimateSource[];
  onClose: () => void;
  onAdd: (source: ProjectSourceInsertTarget) => void;
  addDisabled: boolean;
  addLabel: string;
}) {
  const context = getProjectSourcePreviewContext(source, sources);
  const sourceDisplayName = getProjectReusableSourceDisplayName(source);
  const outlineRows = getProjectSourcePreviewOutlineRows(source, sources);
  const nodePathText = context.nodePath.length ? context.nodePath.join(" / ") : null;
  const updatedAtText = formatPreviewDate(context.updatedAt);
  const detailRows = [
    context.projectName ? { label: "Project", value: context.projectName } : null,
    context.estimateName ? { label: "Estimate", value: context.estimateName } : null,
    context.sheetCode ? { label: "Estimate code", value: context.sheetCode } : null,
    context.tabName ? { label: "Tab", value: context.tabName } : null,
    nodePathText ? { label: "Node path", value: nodePathText } : null,
    updatedAtText ? { label: "Last updated", value: updatedAtText } : null,
    context.rowCount !== null ? { label: "Rows", value: String(context.rowCount) } : null,
    context.totalCost !== null ? { label: "Total", value: pesoFormatter.format(context.totalCost) } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
  const insertable = isProjectSourceInsertTarget(source);

  return (
    <section className="shrink-0 border-t border-hairline bg-white" aria-label="Project source preview">
      <div className="flex items-start gap-2 p-2">
        <div className="flex size-14 shrink-0 items-center justify-center border border-hairline bg-surfaceMuted text-tertiary">
          <StackSimple size={18} weight="regular" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <h3 className="truncate text-[11px] font-medium text-ink">{sourceDisplayName}</h3>
              <p className="text-[9px] font-medium text-tertiary">{getProjectSourceTypeLabel(source)} source</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-5 shrink-0 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
              aria-label="Close project source preview"
              onClick={onClose}
            >
              <X size={11} />
            </Button>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {/* U13/A3: neutral chips (no off-palette `info` tone). Content-sized,
                so they don't stretch in the 360px panel. */}
            <span className="inline-flex items-center gap-1 rounded-xs border border-hairline bg-surfaceMuted px-1.5 py-px text-[8px] font-medium leading-4 text-secondary">
              <span className="size-1.5 rounded-xs bg-accent" aria-hidden="true" />
              Snapshot source
            </span>
            <span className="inline-flex items-center rounded-xs border border-hairline bg-surfaceMuted px-1.5 py-px text-[8px] font-medium leading-4 text-secondary">
              Copies rows at insert time
            </span>
          </div>
        </div>
      </div>
      <div className="px-2 pb-2">
        {detailRows.length ? (
          <dl className="grid grid-cols-[72px_1fr] gap-x-2 gap-y-1 text-[9px] leading-4">
            {detailRows.map((row) => (
              <div key={row.label} className="contents">
                <dt className="text-tertiary">{row.label}</dt>
                <dd className="min-w-0 truncate font-medium text-ink" title={row.value}>{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-[9px] leading-4 text-tertiary">
            Snapshot source metadata will appear here when this source supplies it.
          </p>
        )}
        {outlineRows.length ? (
          <div className="mt-2 border border-hairline bg-surfaceMuted/20 p-2">
            <p className="text-[9px] font-medium text-tertiary">Source outline</p>
            <ul className="mt-1 grid gap-1">
              {outlineRows.map((row) => (
                <li key={row.id} className="flex min-w-0 items-center justify-between gap-2 text-[9px] leading-4">
                  <span className="min-w-0 truncate font-medium text-ink">{row.label}</span>
                  <span className="shrink-0 text-tertiary">{row.meta}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-2">
          {insertable ? (
            <Button onClick={() => onAdd(source)} disabled={addDisabled} aria-label={addLabel} title={addLabel} className="h-6 min-h-6 w-full text-[9px]">
              {addDisabled ? "Select group" : "Add to estimate"}
            </Button>
          ) : (
            <p className="rounded-xs border border-dashed border-hairline bg-surfaceMuted/30 p-2 text-[9px] leading-4 text-tertiary">
              Expand this source to choose a tab or group/area before inserting it.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── Main Sidebar ─── */

type EstimateRightSidebarProps = {
  onInsertComponent?: (item: EstimateRowItem) => boolean | void;
  onInsertTemplate?: (template: EstimateTemplate) => boolean | void;
  /** Inserts one group/area from inside a template, with its subtree. */
  onInsertTemplateNode?: (template: EstimateTemplate, node: EstimateTreeNode) => boolean | void;
  projectId?: string;
  estimateId?: string;
  selectedNodeId?: string | null;
  selectedNodeKind?: EstimateTreeNode["kind"] | null;
  selectedNodeName?: string | null;
  templateTargetName?: string | null;
  canInsertTemplate?: boolean;
  nodes?: EstimateTreeNode[];
  initialLibraryItems?: EstimateRowItem[];
  templates?: EstimateTemplate[];
  projectSources?: ReusableEstimateSource[];
  onInsertProjectSource?: (source: ProjectSourceInsertTarget) => boolean | Promise<boolean> | void | Promise<void>;
  categoryTree?: ComponentLibraryTaxonomyNode[];
  suppliers?: ComponentLibrarySupplierOption[];
  brands?: ComponentLibraryBrand[];
  libraryFolders?: LibraryFolderRecord[];
  showSourceTrustChips?: boolean;
  /** True while the sidebar's library/template/project-component dataset is still loading. */
  libraryDataLoading?: boolean;
  /** Reads/writes the user's saved active sidebar tab and view prefs. Disable for public/mockup embeds. */
  useStoredPreferences?: boolean;
  /** Enables browsing reusable sources pulled from real projects. Disable for public/mockup embeds. */
  enableReusableProjectSources?: boolean;
  /** Restricts the source tabs a host can show; defaults preserve the estimate sidebar contract. */
  visibleTabs?: readonly EstimateLibraryTab[];
  /** Initial source tab before stored preferences hydrate. Hidden tabs are clamped to the first visible tab. */
  initialActiveTab?: EstimateLibraryTab;
  /** Route-local unavailable state for hosts that expose Project before scoped project data exists. */
  projectTabUnavailable?: ReactNode;
  /** Reads/writes the user's saved sidebar width. Disable for public/mockup embeds. */
  usePersistentPanelWidth?: boolean;
  /** Product-specific compact drawer state controlled by EstimateSheetContent. */
  mobileDrawerOpen?: boolean;
  onMobileDrawerOpenChange?: (open: boolean) => void;
  mobileDrawerId?: string;
  // Fired after a server-confirmed library/template mutation so callers that
  // cache the lazy library dataset can invalidate it (remount freshness).
  onLibraryDataChanged?: () => void;
  /**
   * How the dock's "Add Template" creates templates: from the selected
   * estimate node (estimate workspace, default) or from scratch (hosts with
   * no estimate context, e.g. the template editor).
   */
  templateCreateMode?: "estimate-node" | "scratch";
};

type StoredLibraryPrefs = {
  favoriteIds: string[];
  storedRecentIds: string[];
  storedPrefs: { activeTab?: string; componentViewMode?: string };
  storedTreeOrder: Partial<Record<ComponentViewMode, LibraryTreeOrder>>;
  legacyStoredTab: string | null;
  replaceFavorites?: boolean;
  replaceTreeOrder?: boolean;
};

function serializeLibraryAccountPrefs(preferences: ComponentLibraryUserPreferences) {
  return JSON.stringify({
    activeTab: preferences.activeTab,
    componentViewMode: preferences.componentViewMode,
    favoriteItemIds: preferences.favoriteItemIds,
    recentItemIds: preferences.recentItemIds,
    treeOrder: preferences.treeOrder,
  });
}

function toStoredLibraryPrefs(preferences: ComponentLibraryUserPreferences): StoredLibraryPrefs {
  return {
    favoriteIds: preferences.favoriteItemIds,
    storedRecentIds: preferences.recentItemIds,
    storedPrefs: {
      activeTab: preferences.activeTab,
      componentViewMode: preferences.componentViewMode,
    },
    storedTreeOrder: preferences.treeOrder,
    legacyStoredTab: null,
    replaceFavorites: true,
    replaceTreeOrder: true,
  };
}

function buildLibrarySelectionNodes(nodes: LibraryTreeNode[]): TreeSelectionNode[] {
  return nodes.map((node) => ({
    id: node.id,
    selectable: true,
    children: node.children?.length ? buildLibrarySelectionNodes(node.children) : undefined,
  }));
}

function reusableProjectSourceKey(source: ReusableEstimateSource) {
  if (source.kind === "custom-template") return `custom-template:${source.template.id}`;
  if (source.kind === "project") return `project:${source.projectId}`;
  if (source.kind === "project-estimate") return `project-estimate:${source.estimateId}`;
  if (source.kind === "project-tab") return `project-tab:${source.tabId}`;
  return `project-node:${source.nodeId}`;
}

function mergeReusableProjectSources(
  currentSources: ReusableEstimateSource[],
  incomingSources: ReusableEstimateSource[],
  outlineEstimateId: string,
) {
  const sourcesByKey = new Map<string, ReusableEstimateSource>();
  for (const source of currentSources) {
    if ((source.kind === "project-tab" || source.kind === "project-node") && source.estimateId === outlineEstimateId) {
      continue;
    }
    sourcesByKey.set(reusableProjectSourceKey(source), source);
  }
  for (const source of incomingSources) {
    sourcesByKey.set(reusableProjectSourceKey(source), source);
  }
  return Array.from(sourcesByKey.values());
}

function mergeReusableProjectEstimateSources(
  currentSources: ReusableEstimateSource[],
  incomingSources: ProjectEstimateReusableSource[],
  projectId: string,
) {
  const sourcesByKey = new Map<string, ReusableEstimateSource>();
  for (const source of currentSources) {
    if (source.kind !== "custom-template" && source.projectId === projectId && source.kind !== "project") continue;
    sourcesByKey.set(reusableProjectSourceKey(source), source);
  }
  for (const source of incomingSources) {
    sourcesByKey.set(reusableProjectSourceKey(source), source);
  }
  return Array.from(sourcesByKey.values());
}

function mergeReusableSourcesByKey(
  currentSources: ReusableEstimateSource[],
  incomingSources: ProjectReusableEstimateSource[],
) {
  const sourcesByKey = new Map<string, ReusableEstimateSource>();
  for (const source of currentSources) sourcesByKey.set(reusableProjectSourceKey(source), source);
  for (const source of incomingSources) sourcesByKey.set(reusableProjectSourceKey(source), source);
  return Array.from(sourcesByKey.values());
}

type ReusableProjectSourceIndex = {
  projectsByTreeNodeId: Map<string, ProjectReusableSource>;
  estimatesByTreeNodeId: Map<string, ProjectEstimateReusableSource>;
  projectIdsWithEstimates: Set<string>;
  estimateIdsWithOutline: Set<string>;
};

function buildReusableProjectSourceIndex(sources: ReusableEstimateSource[]): ReusableProjectSourceIndex {
  const projectsByTreeNodeId = new Map<string, ProjectReusableSource>();
  const estimatesByTreeNodeId = new Map<string, ProjectEstimateReusableSource>();
  const projectIdsWithEstimates = new Set<string>();
  const estimateIdsWithOutline = new Set<string>();

  for (const source of sources) {
    if (source.kind === "custom-template") continue;
    if (source.kind === "project") {
      projectsByTreeNodeId.set(`${PROJECT_SOURCE_NODE_PREFIX}${source.projectId}`, source);
      continue;
    }
    if (source.kind === "project-estimate") {
      estimatesByTreeNodeId.set(`${PROJECT_ESTIMATE_SOURCE_NODE_PREFIX}${source.estimateId}`, source);
      projectIdsWithEstimates.add(source.projectId);
      continue;
    }
    estimateIdsWithOutline.add(source.estimateId);
  }

  return { projectsByTreeNodeId, estimatesByTreeNodeId, projectIdsWithEstimates, estimateIdsWithOutline };
}

function projectNodeSourceToTemplateSourceNode(source: ProjectNodeReusableSource): EstimateTreeNode {
  return {
    id: source.nodeId,
    name: source.name,
    kind: source.nodeKind,
    total: "",
    children: [],
    estimateRowItems: [],
  };
}

function projectSourceToTemplateSourceNode(source: ProjectSourceInsertTarget, projectSources: ReusableEstimateSource[]): EstimateTreeNode {
  if (source.kind === "project-node") return projectNodeSourceToTemplateSourceNode(source);
  const children = projectSources
    .filter((candidate): candidate is ProjectNodeReusableSource => candidate.kind === "project-node" && candidate.tabId === source.tabId)
    .map((nodeSource) => projectNodeSourceToTemplateSourceNode(nodeSource));
  return {
    id: source.tabId,
    name: source.name,
    kind: "group",
    total: "",
    children,
    estimateRowItems: [],
  };
}

function useEstimateRightSidebarContent({
  onInsertComponent,
  onInsertTemplate,
  onInsertTemplateNode,
  projectId,
  estimateId,
  selectedNodeId = null,
  selectedNodeKind,
  selectedNodeName,
  templateTargetName,
  canInsertTemplate: canInsertTemplateProp,
  nodes,
  initialLibraryItems = estimateLibraryItems,
  templates = EMPTY_TEMPLATE_PROP,
  projectSources = EMPTY_REUSABLE_PROJECT_SOURCES,
  onInsertProjectSource,
  categoryTree = componentCategoryTree,
  suppliers = EMPTY_SUPPLIER_OPTIONS,
  brands = EMPTY_COMPONENT_BRANDS,
  libraryFolders = EMPTY_LIBRARY_FOLDERS,
  showSourceTrustChips = true,
  libraryDataLoading = false,
  useStoredPreferences = true,
  enableReusableProjectSources = true,
  visibleTabs,
  initialActiveTab,
  projectTabUnavailable,
  usePersistentPanelWidth = true,
  mobileDrawerOpen = false,
  onMobileDrawerOpenChange,
  mobileDrawerId,
  onLibraryDataChanged,
  templateCreateMode = "estimate-node",
}: EstimateRightSidebarProps = {}) {
  const { selectedNodeId: activeSelectedNodeId } = useEstimateWorkspaceSelection(estimateId, selectedNodeId);
  const surfaceVariant = useEstimateSurfaceVariant();
  const compactViewport = useMediaQuery("(max-width: 1023px)");
  const sourcesDrawerOpen = Boolean(mobileDrawerOpen && compactViewport);
  const effectiveProjectSources = enableReusableProjectSources ? projectSources : EMPTY_REUSABLE_PROJECT_SOURCES;
  const effectiveVisibleLibraryTabs = useMemo(
    () => normalizeVisibleLibraryTabs(visibleTabs ?? (enableReusableProjectSources ? DEFAULT_LIBRARY_TREE_TABS : PUBLIC_LIBRARY_TREE_TABS)),
    [enableReusableProjectSources, visibleTabs],
  );
  const resolveVisibleTab = useCallback(
    (tab: string | null | undefined) => resolveVisibleEstimateLibraryTab(tab, effectiveVisibleLibraryTabs),
    [effectiveVisibleLibraryTabs],
  );
  const initialVisibleActiveTab = resolveVisibleTab(initialActiveTab);
  // Initial state must not read localStorage: SSR renders the fallbacks, so a
  // storage-aware initializer makes the client's first render diverge and
  // throws a hydration mismatch. Stored prefs apply in the mount effect below.
  const folderEditCommitInFlightRef = useRef(false);
  const { state: chromeState, actions: chromeActions } = useEstimateRightSidebarChromeState(initialVisibleActiveTab);
  const { state: libraryState, actions: libraryActions } = useLibraryTabState({
    initialLibraryItems,
    categoryTree,
    suppliers,
    brands,
    libraryFolders,
  });
  const { state: projectState, actions: projectActions } = useProjectTabState({
    initialLibraryItems,
    libraryFolders,
  });
  const { state: templatesState, actions: templatesActions } = useTemplatesTabState({
    templates,
    projectSources: effectiveProjectSources,
  });
  const {
    activeTab,
    searchQuery,
    searchOpen,
    previewItemId,
    previewProjectSourceKey,
  } = chromeState;
  const {
    recentIds,
    libraryItems,
    componentViewMode,
    viewModeMenuOpen,
    expandedNodeIdsByViewMode,
    bulkSelectedNodeIds,
    bulkDeleteConfirmOpen,
    customOrderByViewMode,
    showNewComponent,
    addComponentOpen,
    discardComponentChangesOpen,
    form,
    formError,
    deleteCandidate,
    insertQuantity,
    facetFilters,
    localLibraryFolders,
    pendingLibraryFolder,
    editingFolderId,
    editingFolderName,
    editingFolderMode,
    createFolderPending,
  } = libraryState;
  const { projectExpandedNodeIds } = projectState;
  const {
    templateList,
    loadedProjectSources,
    templateSourceFilter,
    projectSourcesLoading,
    projectSourceSearchResults,
    projectEstimateLoadingProjectIds,
    projectOutlineLoadingEstimateIds,
    templatesExpandedIds,
    addTemplateOpen,
    customTemplateGroups,
    templateSourceNodeId,
    templateSourceProjectSource,
    templateDefaultCategory,
    renameTemplateTarget,
    renameTemplateName,
    renameTemplateError,
    renameTemplatePending,
    deleteTemplateTarget,
    deleteTemplateError,
    deleteTemplatePending,
  } = templatesState;
  const {
    setActiveTab,
    setSearchQuery,
    setSearchOpen,
    setPreviewItemId,
    setPreviewProjectSourceKey,
  } = chromeActions;
  const {
    setRecentIds,
    setLibraryItems,
    setComponentViewMode,
    setViewModeMenuOpen,
    setExpandedNodeIdsByViewMode,
    setBulkSelectedNodeIds,
    setBulkDeleteConfirmOpen,
    setCustomOrderByViewMode,
    setShowNewComponent,
    setAddComponentOpen,
    setDiscardComponentChangesOpen,
    setForm,
    setFormError,
    setDeleteCandidate,
    setInsertQuantity,
    setFacetFilters,
    setLocalLibraryFolders,
    setPendingLibraryFolder,
    setEditingFolderId,
    setEditingFolderName,
    setEditingFolderMode,
    setCreateFolderPending,
  } = libraryActions;
  const { setProjectExpandedNodeIds } = projectActions;
  const {
    setTemplateList,
    setLoadedProjectSources,
    setTemplateSourceFilter,
    setProjectSourcesLoading,
    setProjectSourceSearchResults,
    setProjectEstimateLoadingProjectIds,
    setProjectOutlineLoadingEstimateIds,
    setTemplatesExpandedIds,
    setAddTemplateOpen,
    setTemplateSourceNodeId,
    setTemplateSourceProjectSource,
    setTemplateDefaultCategory,
    setRenameTemplateTarget,
    setRenameTemplateName,
    setRenameTemplateError,
    setRenameTemplatePending,
    setDeleteTemplateTarget,
    setDeleteTemplateError,
    setDeleteTemplatePending,
  } = templatesActions;
  const visibleActiveTab = resolveVisibleTab(activeTab);
  const { toast } = useToast();
  useEffect(() => {
    if (activeTab !== visibleActiveTab) setActiveTab(visibleActiveTab);
  }, [activeTab, setActiveTab, visibleActiveTab]);
  useEffect(() => {
    if (process.env.NODE_ENV === "test") return undefined;
    setLibraryTelemetrySink((record) => {
      void recordComponentLibraryTelemetryEvent(record);
    });
    return () => setLibraryTelemetrySink(null);
  }, []);
  useEffect(() => {
    if (!mobileDrawerOpen || compactViewport) return;
    onMobileDrawerOpenChange?.(false);
  }, [compactViewport, mobileDrawerOpen, onMobileDrawerOpenChange]);

  const projectEstimateLoadedProjectIdsRef = useRef<Set<string> | null>(null);
  if (projectEstimateLoadedProjectIdsRef.current === null) projectEstimateLoadedProjectIdsRef.current = new Set();
  const getProjectEstimateLoadedProjectIds = useCallback(() => {
    if (projectEstimateLoadedProjectIdsRef.current === null) projectEstimateLoadedProjectIdsRef.current = new Set();
    return projectEstimateLoadedProjectIdsRef.current;
  }, []);
  const setLastActionMessage = useCallback((value: SetStateAction<string>) => {
    const message = (typeof value === "function" ? value("") : value).trim();
    if (!message) return;
    toast({ tone: getSidebarActionToastTone(message), message });
  }, [toast]);
  // Like libraryItems, the template list seeds from the server prop once and
  // then evolves locally inside useTemplatesTabState. That hook reconciles prop
  // changes while preserving local optimistic appends not yet reflected upstream.
  // U23: gate the loading ids behind a short delay so a warm/prefetched expand
  // shows nothing transient; only a genuinely cold expand reveals skeleton rows.
  const skeletonProjectIds = useDelayedIdSet(projectEstimateLoadingProjectIds, SKELETON_REVEAL_DELAY_MS);
  const skeletonEstimateIds = useDelayedIdSet(projectOutlineLoadingEstimateIds, SKELETON_REVEAL_DELAY_MS);
  // U1b: outline/source/search failures go to this toast, not inline banners.
  // PERF-3: the text input stays bound to the immediate searchQuery (responsive
  // typing), but the expensive in-memory tree filtering/rebuilds read the
  // deferred value so a keystroke doesn't synchronously rebuild the whole tree.
  // The server-side project-source search keeps using the immediate value (it
  // has its own 250ms debounce).
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const editItemIdRef = useRef<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const projectSourceSearchRequestIdRef = useRef(0);
  const treeHeaderRef = useRef<HTMLDivElement>(null);
  const libraryToolsRef = useRef<HTMLDivElement>(null);
  const libraryPrefsHydratedRef = useRef(!useStoredPreferences);
  const libraryAccountPrefsLoadedRef = useRef(!useStoredPreferences || process.env.NODE_ENV === "test");
  const libraryAccountPrefsSaveSnapshotRef = useRef<string | null>(null);
  const syncedInitialLibraryItemsRef = useRef(initialLibraryItems);
  const syncedLibraryFoldersRef = useRef(libraryFolders);
  const [archiveComponentPending, setArchiveComponentPending] = useState(false);
  const [archiveComponentError, setArchiveComponentError] = useState("");
  const closeBulkDeleteConfirmDialog = useCallback(() => setBulkDeleteConfirmOpen(false), [setBulkDeleteConfirmOpen]);
  const closeRenameTemplateDialog = useCallback(() => setRenameTemplateTarget(null), [setRenameTemplateTarget]);
  const closeDeleteTemplateDialog = useCallback(() => setDeleteTemplateTarget(null), [setDeleteTemplateTarget]);
  const closeDeleteComponentDialog = useCallback(() => setDeleteCandidate(null), [setDeleteCandidate]);
  const bulkDeleteConfirmDialogRef = useNativeSidebarDialog(closeBulkDeleteConfirmDialog);
  const renameTemplateDialogRef = useNativeSidebarDialog(closeRenameTemplateDialog);
  const deleteTemplateDialogRef = useNativeSidebarDialog(closeDeleteTemplateDialog);
  const deleteComponentDialogRef = useNativeSidebarDialog(closeDeleteComponentDialog);
  const selectedTargetNode = useMemo(() => {
    if (!nodes?.length || !activeSelectedNodeId) return null;
    return resolveEstimateWorkspaceSelection({
      selectedNodeId: activeSelectedNodeId,
      fallbackNode: nodes[0],
      findNode: (nodeId) => findEstimateNode(nodes, nodeId),
    }).selectedNode;
  }, [activeSelectedNodeId, nodes]);

  const effectiveSelectedKind = selectedTargetNode?.kind ?? selectedNodeKind;
  const effectiveSelectedName = selectedTargetNode?.name ?? selectedNodeName ?? "";
  const hasTargetContext = Boolean(nodes || selectedNodeKind !== undefined || selectedNodeName !== undefined);
  const canInsert = !hasTargetContext || effectiveSelectedKind === "area";
  const canInsertTemplate = canInsertTemplateProp ?? (!hasTargetContext || effectiveSelectedKind === "group");
  const effectiveTemplateTargetName = templateTargetName ?? (effectiveSelectedKind === "group" ? effectiveSelectedName : "") ?? "";
  const targetLabel = canInsert
    ? effectiveSelectedName
      ? `Add to ${effectiveSelectedName}`
      : "Add to selected area"
    : "Select an area";

  const resetComponentForm = useCallback(() => {
    setForm(defaultForm);
    setFormError("");
    editItemIdRef.current = null;
  }, [setForm, setFormError]);

  const discardComponentChanges = useCallback(() => {
    setDiscardComponentChangesOpen(false);
    setShowNewComponent(false);
    resetComponentForm();
  }, [resetComponentForm, setDiscardComponentChangesOpen, setShowNewComponent]);

  const closeNewComponent = useCallback(() => {
    if (isFormDirty(form)) {
      setDiscardComponentChangesOpen(true);
      return;
    }
    setShowNewComponent(false);
    resetComponentForm();
  }, [form, resetComponentForm, setDiscardComponentChangesOpen, setShowNewComponent]);
  const sidebarKeyboardStateRef = useRef<{
    showNewComponent: boolean;
    addComponentOpen: boolean;
    discardComponentChangesOpen: boolean;
    deleteCandidate: EstimateRowItem | null;
    renameTemplateTarget: EstimateTemplate | null;
    deleteTemplateTarget: EstimateTemplate | null;
    viewModeMenuOpen: boolean;
    bulkDeleteConfirmOpen: boolean;
    searchQuery: string;
    searchOpen: boolean;
    previewProjectSourceKey: string | null;
    previewItemId: string | null;
    mobileDrawerOpen: boolean;
    closeNewComponent: () => void;
    setSearchOpen: (value: SetStateAction<boolean>) => void;
    setDiscardComponentChangesOpen: (value: SetStateAction<boolean>) => void;
    setViewModeMenuOpen: (value: SetStateAction<boolean>) => void;
    setBulkDeleteConfirmOpen: (value: SetStateAction<boolean>) => void;
    setDeleteCandidate: (value: SetStateAction<EstimateRowItem | null>) => void;
    setRenameTemplateTarget: (value: SetStateAction<EstimateTemplate | null>) => void;
    setDeleteTemplateTarget: (value: SetStateAction<EstimateTemplate | null>) => void;
    setSearchQuery: (value: SetStateAction<string>) => void;
    setPreviewProjectSourceKey: (value: SetStateAction<string | null>) => void;
    setPreviewItemId: (value: SetStateAction<string | null>) => void;
    onMobileDrawerOpenChange?: (open: boolean) => void;
  } | null>(null);
  useEffect(() => {
    sidebarKeyboardStateRef.current = {
      showNewComponent,
      addComponentOpen,
      discardComponentChangesOpen,
      deleteCandidate,
      renameTemplateTarget,
      deleteTemplateTarget,
      viewModeMenuOpen,
      bulkDeleteConfirmOpen,
      searchQuery,
      searchOpen,
      previewProjectSourceKey,
      previewItemId,
      mobileDrawerOpen: sourcesDrawerOpen,
      closeNewComponent,
      setSearchOpen,
      setDiscardComponentChangesOpen,
      setViewModeMenuOpen,
      setBulkDeleteConfirmOpen,
      setDeleteCandidate,
      setRenameTemplateTarget,
      setDeleteTemplateTarget,
      setSearchQuery,
      setPreviewProjectSourceKey,
      setPreviewItemId,
      onMobileDrawerOpenChange,
    };
  });
  const canLoadProjectSourcesFromActions = enableReusableProjectSources && Boolean(projectId && estimateId && effectiveProjectSources.length === 0);
  const retryProjectSourcesLoadRef = useRef<(() => void) | null>(null);
  const loadProjectSources = useCallback((isCancelled?: () => boolean) => {
    if (!canLoadProjectSourcesFromActions) return Promise.resolve();
    setProjectSourcesLoading(true);
    projectEstimateLoadedProjectIdsRef.current = new Set();
    setProjectEstimateLoadingProjectIds([]);
    setProjectOutlineLoadingEstimateIds([]);
    return listReusableProjectSources()
      .then((result) => {
        if (!isCancelled?.()) {
          setLoadedProjectSources(result.sources);
        }
      })
      .catch((error: unknown) => {
        console.error("[templates] project sources load failed", error);
        if (!isCancelled?.()) {
          toast({
            id: PROJECT_SOURCES_LOAD_TOAST_ID,
            tone: "error",
            message: toUserSourceError("dataset"),
            action: {
              label: "Retry",
              onClick: () => retryProjectSourcesLoadRef.current?.(),
            },
          });
        }
      })
      .finally(() => {
        if (!isCancelled?.()) setProjectSourcesLoading(false);
      });
  }, [
    canLoadProjectSourcesFromActions,
    setLoadedProjectSources,
    setProjectEstimateLoadingProjectIds,
    setProjectOutlineLoadingEstimateIds,
    setProjectSourcesLoading,
    toast,
  ]);
  useEffect(() => {
    retryProjectSourcesLoadRef.current = () => {
      void loadProjectSources();
    };
    return () => {
      retryProjectSourcesLoadRef.current = null;
    };
  }, [loadProjectSources]);
  const hasLoadedProjectSources = useMemo(
    () => loadedProjectSources.some((source) => source.kind !== "custom-template"),
    [loadedProjectSources],
  );
  const effectiveTemplateSourceFilter = templateSourceFilter === "projects" && !projectSourcesLoading && !hasLoadedProjectSources
    ? "all"
    : templateSourceFilter;
  const projectSourceSearchQuery = visibleActiveTab === "templates" && effectiveTemplateSourceFilter !== "custom"
    ? searchQuery.trim()
    : "";

  const applyStoredLibraryPrefs = useEffectEvent((stored: StoredLibraryPrefs) => {
    if (stored.replaceTreeOrder || stored.storedTreeOrder.default || stored.storedTreeOrder.suppliers || stored.storedTreeOrder.brand) {
      setCustomOrderByViewMode({
        default: stored.storedTreeOrder.default ?? {},
        suppliers: stored.storedTreeOrder.suppliers ?? {},
        brand: stored.storedTreeOrder.brand ?? {},
      });
    }
    if (stored.replaceFavorites || stored.favoriteIds.length || stored.storedRecentIds.length) {
      setRecentIds(stored.storedRecentIds);
      setLibraryItems((items) =>
        items.map((item) => ({
          ...item,
          isFavorite: stored.replaceFavorites ? stored.favoriteIds.includes(item.id) : item.isFavorite || stored.favoriteIds.includes(item.id),
          lastUsedAt: stored.storedRecentIds.includes(item.id) ? new Date().toISOString() : item.lastUsedAt,
        })),
      );
      setExpandedNodeIdsByViewMode((current) => ({
        ...current,
        default: getAllNodeIds(buildLibraryTreeWithComponentRows("categories", splitSidebarComponentItems(initialLibraryItems).libraryItems, stored.favoriteIds, stored.storedRecentIds, { categoryTree, suppliers, libraryFolders, pruneEmptyFolders: true })),
        brand: getAllNodeIds(buildLibraryTreeWithComponentRows("brands", splitSidebarComponentItems(initialLibraryItems).libraryItems, stored.favoriteIds, stored.storedRecentIds, { categoryTree, suppliers, brands, pruneEmptyFolders: true })),
      }));
    }

    const storedTab = stored.storedPrefs.activeTab ?? stored.legacyStoredTab;
    if (isEstimateLibraryTab(storedTab)) {
      const resolvedStoredTab = resolveVisibleTab(storedTab);
      setActiveTab(resolvedStoredTab);
      if (storedTab !== resolvedStoredTab && useStoredPreferences) {
        safeSetJsonStorage(LIBRARY_PREFS_KEY, {
          activeTab: resolvedStoredTab,
          componentViewMode: stored.storedPrefs.componentViewMode,
        });
      }
    }

    const storedMode = stored.storedPrefs.componentViewMode ?? stored.legacyStoredTab;
    if (storedMode === "brand") setComponentViewMode("brand");
    else if (storedMode === "suppliers") setComponentViewMode("suppliers");
    libraryPrefsHydratedRef.current = true;
  });

  useEffect(() => {
    if (!useStoredPreferences) return undefined;
    if (libraryPrefsHydratedRef.current) return undefined;
    // Stored values must be read synchronously: the prefs-persist effect below
    // runs in the same flush and would overwrite them with the defaults.
    const favoriteIds = readJsonStorage<string[]>(LIBRARY_FAVORITES_KEY, []);
    const storedRecentIds = readJsonStorage<string[]>(LIBRARY_RECENTS_KEY, []);
    const storedPrefs = readJsonStorage<{ activeTab?: string; componentViewMode?: string }>(LIBRARY_PREFS_KEY, {});
    const storedTreeOrder = readJsonStorage<Partial<Record<ComponentViewMode, LibraryTreeOrder>>>(LIBRARY_TREE_ORDER_KEY, {});
    const legacyStoredTab = window.localStorage.getItem("estimate_library_active_tab");

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      applyStoredLibraryPrefs({ favoriteIds, storedRecentIds, storedPrefs, storedTreeOrder, legacyStoredTab });
    });
    if (process.env.NODE_ENV !== "test") {
      libraryAccountPrefsLoadedRef.current = false;
      void loadComponentLibraryAccountPreferences()
        .then((preferences) => {
          if (cancelled || !preferences) return;
          libraryAccountPrefsSaveSnapshotRef.current = serializeLibraryAccountPrefs(preferences);
          safeSetJsonStorage(LIBRARY_PREFS_KEY, {
            activeTab: resolveVisibleTab(preferences.activeTab),
            componentViewMode: preferences.componentViewMode,
          });
          safeSetJsonStorage(LIBRARY_FAVORITES_KEY, preferences.favoriteItemIds);
          safeSetJsonStorage(LIBRARY_RECENTS_KEY, preferences.recentItemIds);
          safeSetJsonStorage(LIBRARY_TREE_ORDER_KEY, preferences.treeOrder);
          applyStoredLibraryPrefs(toStoredLibraryPrefs(preferences));
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) libraryAccountPrefsLoadedRef.current = true;
        });
    }
    return () => {
      cancelled = true;
    };
    // Stored prefs hydrate exactly once, after the SSR markup is committed.
  }, [resolveVisibleTab, useStoredPreferences]);

  useEffect(() => {
    // Persisting before stored prefs hydrate would clobber them with the
    // defaults (Strict Mode runs this effect before the hydrate microtask).
    if (!useStoredPreferences || !libraryPrefsHydratedRef.current) return;
    safeSetJsonStorage(LIBRARY_PREFS_KEY, { activeTab: visibleActiveTab, componentViewMode });
  }, [componentViewMode, useStoredPreferences, visibleActiveTab]);

  useEffect(() => {
    if (
      syncedInitialLibraryItemsRef.current === initialLibraryItems
      && syncedLibraryFoldersRef.current === libraryFolders
    ) {
      return;
    }

    syncedInitialLibraryItemsRef.current = initialLibraryItems;
    syncedLibraryFoldersRef.current = libraryFolders;
    const nextItems = hydrateSidebarLibraryItems(initialLibraryItems);
    const nextSplitItems = splitSidebarComponentItems(nextItems);
    setLibraryItems(nextItems);
    setLocalLibraryFolders(libraryFolders);
    setPreviewItemId((current) => current && nextItems.some((item) => item.id === current) ? current : null);
    setExpandedNodeIdsByViewMode((current) => ({
      ...current,
      default: Array.from(new Set([
        ...current.default,
        ...getAllNodeIds(buildLibraryTreeWithComponentRows("categories", nextSplitItems.libraryItems, [], [], {
          categoryTree,
          suppliers,
          libraryFolders,
          pruneEmptyFolders: true,
        })),
      ])),
    }));
    setProjectExpandedNodeIds((current) => Array.from(new Set([
      ...current,
      ...getAllNodeIds(buildProjectComponentTree(nextSplitItems.projectItems, { libraryFolders })),
    ])));
  }, [
    categoryTree,
    initialLibraryItems,
    libraryFolders,
    setExpandedNodeIdsByViewMode,
    setLibraryItems,
    setLocalLibraryFolders,
    setPreviewItemId,
    setProjectExpandedNodeIds,
    suppliers,
  ]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const state = sidebarKeyboardStateRef.current;
      if (!state) return;
      const activeTag = document.activeElement?.tagName;
      if (
        event.key === "/" &&
        !state.showNewComponent &&
        !state.addComponentOpen &&
        !state.discardComponentChangesOpen &&
        !state.deleteCandidate &&
        !state.renameTemplateTarget &&
        !state.deleteTemplateTarget &&
        activeTag !== "INPUT" &&
        activeTag !== "TEXTAREA" &&
        activeTag !== "SELECT"
      ) {
        event.preventDefault();
        state.setSearchOpen(true);
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        let handled = true;
        if (state.viewModeMenuOpen) state.setViewModeMenuOpen(false);
        else if (state.bulkDeleteConfirmOpen) state.setBulkDeleteConfirmOpen(false);
        else if (state.discardComponentChangesOpen) state.setDiscardComponentChangesOpen(false);
        else if (state.deleteCandidate) state.setDeleteCandidate(null);
        else if (state.renameTemplateTarget) state.setRenameTemplateTarget(null);
        else if (state.deleteTemplateTarget) state.setDeleteTemplateTarget(null);
        else if (state.showNewComponent) state.closeNewComponent();
        else if (state.searchQuery) state.setSearchQuery("");
        else if (state.searchOpen) state.setSearchOpen(false);
        else if (state.previewProjectSourceKey) state.setPreviewProjectSourceKey(null);
        else if (state.previewItemId) state.setPreviewItemId(null);
        else if (state.mobileDrawerOpen) state.onMobileDrawerOpenChange?.(false);
        else handled = false;

        if (handled) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleViewModePointerDown = useEffectEvent((event: PointerEvent) => {
    const target = event.target as Node;
    if (treeHeaderRef.current?.contains(target) || libraryToolsRef.current?.contains(target)) return;
    setViewModeMenuOpen(false);
  });

  useEffect(() => {
    if (!viewModeMenuOpen) return;
    function handlePointerDown(event: PointerEvent) {
      handleViewModePointerDown(event);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [viewModeMenuOpen]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLoadedProjectSources(effectiveProjectSources);
      projectEstimateLoadedProjectIdsRef.current = new Set();
      setProjectEstimateLoadingProjectIds([]);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    effectiveProjectSources,
    setLoadedProjectSources,
    setProjectEstimateLoadingProjectIds,
  ]);

  useEffect(() => {
    // Auto-refresh project sources every time the Templates tab is activated
    // (replaces the manual "Refresh project sources" button). Keyed only off the
    // activeTab transition, so it fires on each open but not on unrelated
    // re-renders while already on Templates (loadProjectSources is stable).
    if (visibleActiveTab !== "templates" || !canLoadProjectSourcesFromActions) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void loadProjectSources(() => cancelled);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canLoadProjectSourcesFromActions, loadProjectSources, visibleActiveTab]);

  useEffect(() => {
    let cancelled = false;
    const requestId = projectSourceSearchRequestIdRef.current + 1;
    projectSourceSearchRequestIdRef.current = requestId;
    const resetTimer = window.setTimeout(() => {
      if (cancelled || projectSourceSearchRequestIdRef.current !== requestId) return;
      setProjectSourceSearchResults([]);
    }, 0);
    if (!canLoadProjectSourcesFromActions || !projectSourceSearchQuery) {
      return () => {
        cancelled = true;
        window.clearTimeout(resetTimer);
      };
    }
    const timer = window.setTimeout(() => {
      searchReusableProjectSources({ query: projectSourceSearchQuery })
        .then((result) => {
          if (!cancelled && projectSourceSearchRequestIdRef.current === requestId) setProjectSourceSearchResults(result.sources);
        })
        .catch((error: unknown) => {
          console.error("[templates] project source search failed", error);
          if (!cancelled && projectSourceSearchRequestIdRef.current === requestId) toast({ tone: "error", message: toUserSourceError("search") });
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(resetTimer);
      window.clearTimeout(timer);
    };
  }, [
    canLoadProjectSourcesFromActions,
    projectSourceSearchQuery,
    setProjectSourceSearchResults,
    toast,
  ]);

  const handleLibraryStorage = useEffectEvent((event: StorageEvent) => {
    if (event.key === LIBRARY_FAVORITES_KEY) {
      const favoriteIds = readJsonStorage<string[]>(LIBRARY_FAVORITES_KEY, []);
      setLibraryItems((items) => items.map((item) => ({ ...item, isFavorite: favoriteIds.includes(item.id) })));
    }
    if (event.key === LIBRARY_RECENTS_KEY) {
      setRecentIds(readJsonStorage<string[]>(LIBRARY_RECENTS_KEY, []));
    }
  });

  useEffect(() => {
    if (!useStoredPreferences) return undefined;
    const handler = (event: StorageEvent) => {
      handleLibraryStorage(event);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
    // handleLibraryStorage comes from useEffectEvent, so it must NOT be listed
    // here: its identity changes every render on purpose, and listing it would
    // tear down and rebuild this listener on every render.
  }, [useStoredPreferences]);

  const favoriteIds = useMemo(
    () => filterMapBy(libraryItems, (item) => item.isFavorite === true, (item) => item.id),
    [libraryItems],
  );
  useEffect(() => {
    if (!useStoredPreferences || !libraryPrefsHydratedRef.current) return undefined;
    safeSetJsonStorage(LIBRARY_PREFS_KEY, { activeTab: visibleActiveTab, componentViewMode });
    safeSetJsonStorage(LIBRARY_FAVORITES_KEY, favoriteIds);
    safeSetJsonStorage(LIBRARY_RECENTS_KEY, recentIds);
    safeSetJsonStorage(LIBRARY_TREE_ORDER_KEY, customOrderByViewMode);

    const preferences: ComponentLibraryUserPreferences = {
      activeTab: visibleActiveTab,
      componentViewMode,
      favoriteItemIds: favoriteIds,
      recentItemIds: recentIds,
      treeOrder: customOrderByViewMode,
    };
    if (!libraryAccountPrefsLoadedRef.current) return undefined;
    const snapshot = serializeLibraryAccountPrefs(preferences);
    if (libraryAccountPrefsSaveSnapshotRef.current === snapshot) return undefined;
    libraryAccountPrefsSaveSnapshotRef.current = snapshot;
    if (process.env.NODE_ENV === "test") return undefined;

    const timer = window.setTimeout(() => {
      void saveComponentLibraryAccountPreferences(preferences).catch(() => undefined);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [componentViewMode, customOrderByViewMode, favoriteIds, recentIds, useStoredPreferences, visibleActiveTab]);

  const componentTreeTab = getComponentTreeTab(componentViewMode);
  const splitComponentItems = useMemo(() => splitSidebarComponentItems(libraryItems), [libraryItems]);
  const reusableLibraryItems = splitComponentItems.libraryItems;
  const projectComponentItems = splitComponentItems.projectItems;
  const effectiveLibraryFolders = useMemo(
    () => (pendingLibraryFolder ? [pendingLibraryFolder, ...localLibraryFolders] : localLibraryFolders),
    [localLibraryFolders, pendingLibraryFolder],
  );
  const reusableLibraryFolders = useMemo(
    () => effectiveLibraryFolders.filter((folder) => !isProjectComponentFolderRecord(folder)),
    [effectiveLibraryFolders],
  );
  const isLibraryTab = visibleActiveTab === "components";
  const isProjectTab = visibleActiveTab === "project";
  const isTemplatesTab = visibleActiveTab === "templates";

  // D1: Facet filter state — mirrors ComponentLibraryManager wiring.
  const facetOptions = useMemo(() => buildComponentFacetOptions(reusableLibraryItems), [reusableLibraryItems]);
  const activeFacetCount = useMemo(() => countActiveComponentFacets(facetFilters), [facetFilters]);
  // Facets apply to the reusable library list only; project-owned components
  // are a scope tab, not another component taxonomy.
  const facetFilteredItems = useMemo(
    () => (activeFacetCount === 0 ? reusableLibraryItems : reusableLibraryItems.filter((item) => componentMatchesFacets(item, facetFilters))),
    [activeFacetCount, facetFilters, reusableLibraryItems],
  );

  const treeNodes = useMemo(() => {
    if (isTemplatesTab) return [];
    if (isProjectTab && projectTabUnavailable) return [];
    if (isProjectTab) return buildProjectComponentTree(projectComponentItems, { libraryFolders: effectiveLibraryFolders });
    const tree = buildLibraryTreeWithComponentRows(componentTreeTab, facetFilteredItems, favoriteIds, recentIds, { categoryTree, suppliers, brands, libraryFolders: effectiveLibraryFolders, pruneEmptyFolders: true });
    return applyLibraryTreeOrder(tree, customOrderByViewMode[componentViewMode]);
  }, [brands, categoryTree, componentTreeTab, componentViewMode, customOrderByViewMode, effectiveLibraryFolders, facetFilteredItems, favoriteIds, isProjectTab, isTemplatesTab, projectComponentItems, projectTabUnavailable, recentIds, suppliers]);

  const filteredTreeNodes = useMemo(() => filterTree(treeNodes, deferredSearchQuery), [treeNodes, deferredSearchQuery]);

  const librarySelectionNodes = useMemo(() => buildLibrarySelectionNodes(treeNodes), [treeNodes]);
  // Always browse ALL projects' sources (the all/current-project scope toggle
  // was removed); no per-project filtering.
  const visibleProjectSources = enableReusableProjectSources ? loadedProjectSources : EMPTY_REUSABLE_PROJECT_SOURCES;
  const visibleProjectSourceSearchResults = useMemo(
    () => (projectSourceSearchQuery ? projectSourceSearchResults : []),
    [projectSourceSearchQuery, projectSourceSearchResults],
  );
  const searchableProjectSources = useMemo(
    () => projectSourceSearchQuery && visibleProjectSourceSearchResults.length > 0
      ? mergeReusableSourcesByKey(visibleProjectSources, visibleProjectSourceSearchResults)
      : visibleProjectSources,
    [projectSourceSearchQuery, visibleProjectSourceSearchResults, visibleProjectSources],
  );
  const visibleTemplateList = useMemo(
    () => (effectiveTemplateSourceFilter === "projects" ? [] : templateList),
    [effectiveTemplateSourceFilter, templateList],
  );
  const templateGroupNames = useMemo(
    () => Array.from(new Set([...templateList.map((template) => template.category), ...customTemplateGroups])).sort(),
    [customTemplateGroups, templateList],
  );
  const visibleCustomTemplateGroups = useMemo(
    () => (effectiveTemplateSourceFilter === "projects" ? [] : customTemplateGroups),
    [customTemplateGroups, effectiveTemplateSourceFilter],
  );
  const visibleTemplateProjectSources = useMemo(
    () => (effectiveTemplateSourceFilter === "custom" ? [] : searchableProjectSources),
    [effectiveTemplateSourceFilter, searchableProjectSources],
  );
  const loadedProjectSourceIndex = useMemo(
    () => buildReusableProjectSourceIndex(loadedProjectSources),
    [loadedProjectSources],
  );
  const templatesSelectionNodes = useMemo(
    () => buildTemplatesSelectionNodes(visibleTemplateList, visibleTemplateProjectSources, visibleCustomTemplateGroups),
    [visibleCustomTemplateGroups, visibleTemplateList, visibleTemplateProjectSources],
  );
  const activeSelectionNodes = isTemplatesTab ? templatesSelectionNodes : librarySelectionNodes;
  const previewProjectSource = useMemo(
    () => findProjectSourceByKey(visibleTemplateProjectSources, previewProjectSourceKey),
    [previewProjectSourceKey, visibleTemplateProjectSources],
  );
  const templatesProjectSourceEmptyState = useMemo(() => {
    if (projectSourcesLoading) {
      // U23: the first project-source load shows fixed-height skeleton rows in
      // place of a spinner/text banner, so real rows replace them with no shift.
      return (
        <output className="space-y-px" aria-label="Loading project sources">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex h-7 items-center px-1">
              <span className="h-2.5 w-full max-w-[160px] animate-pulse rounded-xs bg-surfaceMuted" aria-hidden="true" />
            </div>
          ))}
        </output>
      );
    }
    // Warm refresh failures surface via toast, not an inline banner.
    return undefined;
  }, [projectSourcesLoading]);
  const handleTemplateSourceFilterChange = useCallback((nextFilter: TemplateSourceFilter) => {
    setTemplateSourceFilter(nextFilter);
    setBulkSelectedNodeIds(new Set());
    if (nextFilter === "custom") setPreviewProjectSourceKey(null);
  }, [setBulkSelectedNodeIds, setPreviewProjectSourceKey, setTemplateSourceFilter]);
  const templatesSourceFilterControls = useMemo(() => {
    const hasCustomTemplates = templateList.length > 0;
    const hasProjectSources = hasLoadedProjectSources || projectSourcesLoading;
    if (!hasCustomTemplates || !hasProjectSources) return null;
    return (
      <div className="mb-2">
        <DropdownSelect
          options={TEMPLATE_SOURCE_FILTER_OPTIONS}
          value={effectiveTemplateSourceFilter}
          onValueChange={(nextValue) => {
            if (isTemplateSourceFilter(nextValue)) handleTemplateSourceFilterChange(nextValue);
          }}
          aria-label="Reusable source filter"
          className="w-full"
          variant="boxed"
        />
      </div>
    );
  }, [effectiveTemplateSourceFilter, handleTemplateSourceFilterChange, hasLoadedProjectSources, projectSourcesLoading, templateList.length]);
  const bulkSelectedIds = useMemo(() => Array.from(bulkSelectedNodeIds), [bulkSelectedNodeIds]);
  const bulkSelectionCount = bulkSelectedNodeIds.size;
  const bulkSelectedItems = useMemo(() => {
    const seenItemIds = new Set<string>();
    const items: EstimateRowItem[] = [];
    for (const nodeId of bulkSelectedNodeIds) {
      const item = findNode(treeNodes, nodeId)?.item;
      if (item && !seenItemIds.has(item.id)) {
        seenItemIds.add(item.id);
        items.push(item);
      }
    }
    return items;
  }, [bulkSelectedNodeIds, treeNodes]);

  // Cascade selections resolve to top-most insertable units: whole
  // templates, group/area subtrees, and bare component rows.
  const bulkTemplateUnits = useMemo(
    () => getCheckedTemplateUnits(visibleTemplateList, bulkSelectedNodeIds),
    [bulkSelectedNodeIds, visibleTemplateList],
  );
  const bulkTemplateUnitCount = bulkTemplateUnits.templates.length + bulkTemplateUnits.templateNodes.length;
  const bulkProjectSourceTargets = useMemo(
    () => getCheckedProjectSourceTargets(visibleTemplateProjectSources, bulkSelectedNodeIds),
    [bulkSelectedNodeIds, visibleTemplateProjectSources],
  );
  const bulkProjectSourceTargetCount = bulkProjectSourceTargets.length;
  const bulkProjectSourceRowItems = useMemo(
    () => getCheckedProjectSourceRowItems(visibleTemplateProjectSources, bulkSelectedNodeIds),
    [bulkSelectedNodeIds, visibleTemplateProjectSources],
  );

  const clearBulkSelection = useCallback(() => {
    setBulkSelectedNodeIds(new Set());
  }, [setBulkSelectedNodeIds]);

  const handleBulkCheckToggle = useCallback(
    (nodeId: string, checked: boolean) => {
      setBulkSelectedNodeIds((current) => toggleCascadeSelection(activeSelectionNodes, current, nodeId, checked));
    },
    [activeSelectionNodes, setBulkSelectedNodeIds],
  );

  const pruneBulkSelectionForNodes = useEffectEvent((selectionNodes: typeof activeSelectionNodes) => {
    setBulkSelectedNodeIds((current) => {
      const next = pruneSelection(selectionNodes, current);
      if (next.size === current.size && [...next].every((id) => current.has(id))) return current;
      return next;
    });
  });

  // Drop selections whose nodes left the tree (deletes, view-mode switches).
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      pruneBulkSelectionForNodes(activeSelectionNodes);
    });
    return () => {
      cancelled = true;
    };
  }, [activeSelectionNodes]);

  const previewItem = libraryItems.find((item) => item.id === previewItemId) ?? null;

  const persistFavorites = useCallback((items: EstimateRowItem[]) => {
    safeSetJsonStorage(LIBRARY_FAVORITES_KEY, filterMapBy(items, (item) => item.isFavorite === true, (item) => item.id));
  }, []);

  const insertLibraryItems = useCallback(
    (itemsToInsert: EstimateRowItem[], sourceItems = itemsToInsert) => {
      if (!canInsert) {
        setLastActionMessage("Select an Area before adding library components.");
        return false;
      }
      if (!itemsToInsert.length) return false;

      const insertedItems = itemsToInsert.filter((item) => {
        const insertItem = { ...item, quantity: Math.max(1, item.quantity) };
        return onInsertComponent
          ? onInsertComponent(insertItem) !== false
          : dispatchAddLibraryItemEvent(insertItem);
      });

      if (!insertedItems.length) {
        setLastActionMessage(`${itemsToInsert.length === 1 ? getComponentName(itemsToInsert[0]) : "Selected components"} was not inserted. Select an Area and try again.`);
        return false;
      }

      const recentSourceIds = Array.from(new Set(sourceItems.map((item) => item.id)));
      setRecentIds((current) => {
        const recents = [...recentSourceIds, ...current.filter((id) => !recentSourceIds.includes(id))].slice(0, 12);
        safeSetJsonStorage(LIBRARY_RECENTS_KEY, recents);
        return recents;
      });
      setLibraryItems((items) =>
        items.map((row) => (recentSourceIds.includes(row.id) ? { ...row, lastUsedAt: new Date().toISOString() } : row)),
      );
      setLastActionMessage(
        insertedItems.length === 1
          ? `${getComponentName(insertedItems[0])} added${effectiveSelectedName ? ` to ${effectiveSelectedName}` : ""}.`
          : `${insertedItems.length} components added${effectiveSelectedName ? ` to ${effectiveSelectedName}` : ""}.`,
      );
      return true;
    },
    [canInsert, effectiveSelectedName, onInsertComponent, setLastActionMessage, setLibraryItems, setRecentIds],
  );

  const addComponent = useCallback(
    (item: EstimateRowItem, quantity = 1) => {
      return insertLibraryItems([{ ...item, quantity: Math.max(1, quantity) }], [item]);
    },
    [insertLibraryItems],
  );

  const cancelInlineFolderEdit = useCallback(() => {
    if (!editingFolderId) return;
    const folderId = editingFolderId;
    if (editingFolderMode === "create") {
      setPendingLibraryFolder(null);
      setExpandedNodeIdsByViewMode((current) => ({
        ...current,
        default: current.default.filter((id) => id !== folderId),
      }));
    }
    setEditingFolderId(null);
    setEditingFolderName("");
    setEditingFolderMode(null);
    folderEditCommitInFlightRef.current = false;
  }, [
    editingFolderId,
    editingFolderMode,
    setEditingFolderId,
    setEditingFolderMode,
    setEditingFolderName,
    setExpandedNodeIdsByViewMode,
    setPendingLibraryFolder,
  ]);

  const commitInlineFolderEdit = useCallback(async (nextName?: string) => {
    if (!editingFolderId || !editingFolderMode || createFolderPending || folderEditCommitInFlightRef.current) return;
    const folderId = editingFolderId;
    const name = (nextName ?? editingFolderName).trim();
    if (!name) {
      cancelInlineFolderEdit();
      return;
    }

    if (editingFolderMode === "rename") {
      const currentFolder = localLibraryFolders.find((folder) => folder.id === folderId);
      if (!currentFolder || isProjectComponentFolderRecord(currentFolder) || currentFolder.folder_kind !== "custom") {
        cancelInlineFolderEdit();
        return;
      }
      if (name === currentFolder.name) {
        cancelInlineFolderEdit();
        return;
      }

      const optimisticFolder = { ...currentFolder, name };
      setLocalLibraryFolders((folders) =>
        folders.map((folder) => (folder.id === folderId ? optimisticFolder : folder)),
      );
      setEditingFolderId(null);
      setEditingFolderName("");
      setEditingFolderMode(null);
      setLastActionMessage(`Folder "${name}" renamed.`);

      void renameLibraryFolder(folderId, name)
        .then((result) => {
          const confirmedFolder = toLibraryFolderRecord(result.folder);
          onLibraryDataChanged?.();
          setLastActionMessage(`Folder "${confirmedFolder.name}" renamed.`);
          setLocalLibraryFolders((folders) =>
            folders.map((folder) => (folder.id === confirmedFolder.id ? confirmedFolder : folder)),
          );
        })
        .catch(() => {
          setLastActionMessage("Could not rename the folder. You may not have permission to manage library folders.");
          setLocalLibraryFolders((folders) =>
            folders.map((folder) => (folder.id === folderId ? currentFolder : folder)),
          );
        });
      return;
    }

    folderEditCommitInFlightRef.current = true;
    setCreateFolderPending(true);
    try {
      const result = await createLibraryFolder(null, name, { placement: "top" });
      const confirmedFolder = toLibraryFolderRecord(result.folder);
      setLocalLibraryFolders((folders) => [confirmedFolder, ...folders.filter((folder) => folder.id !== confirmedFolder.id)]);
      setPendingLibraryFolder(null);
      setExpandedNodeIdsByViewMode((current) => ({
        ...current,
        default: Array.from(new Set([...current.default.filter((id) => id !== folderId), confirmedFolder.id])),
      }));
      setEditingFolderId(null);
      setEditingFolderName("");
      setEditingFolderMode(null);
      onLibraryDataChanged?.();
      setLastActionMessage(`Folder "${confirmedFolder.name}" created.`);
    } catch {
      setPendingLibraryFolder(null);
      setExpandedNodeIdsByViewMode((current) => ({
        ...current,
        default: current.default.filter((id) => id !== folderId),
      }));
      setEditingFolderId(null);
      setEditingFolderName("");
      setEditingFolderMode(null);
      setLastActionMessage("Could not create the folder. You may not have permission to manage library folders.");
    } finally {
      folderEditCommitInFlightRef.current = false;
      setCreateFolderPending(false);
    }
  }, [
    cancelInlineFolderEdit,
    createFolderPending,
    editingFolderId,
    editingFolderMode,
    editingFolderName,
    localLibraryFolders,
    onLibraryDataChanged,
    setCreateFolderPending,
    setEditingFolderId,
    setEditingFolderMode,
    setEditingFolderName,
    setExpandedNodeIdsByViewMode,
    setLastActionMessage,
    setLocalLibraryFolders,
    setPendingLibraryFolder,
  ]);

  const createFolder = useCallback(() => {
    if (createFolderPending || editingFolderId) return;
    const tempId = `pending-library-folder-${Date.now().toString(36)}`;
    const rootFolders = localLibraryFolders.filter((folder) => !folder.parent_id && !isProjectComponentFolderRecord(folder));
    const nextSortOrder = rootFolders.length ? Math.min(...rootFolders.map((folder) => folder.sort_order ?? 0)) - 10 : 10;
    const tempFolder: LibraryFolderRecord = {
      id: tempId,
      workspace_id: rootFolders[0]?.workspace_id ?? "pending",
      parent_id: null,
      name: "New folder",
      sort_order: nextSortOrder,
      source_category_node_id: null,
      folder_kind: "custom",
    };

    setActiveTab("components");
    setComponentViewMode("default");
    setViewModeMenuOpen(false);
    setSearchQuery("");
    setSearchOpen(false);
    setPendingLibraryFolder(tempFolder);
    setExpandedNodeIdsByViewMode((current) => ({
      ...current,
      default: Array.from(new Set([...current.default, tempId])),
    }));
    setEditingFolderId(tempId);
    setEditingFolderName(tempFolder.name);
    setEditingFolderMode("create");
  }, [
    createFolderPending,
    editingFolderId,
    localLibraryFolders,
    setActiveTab,
    setComponentViewMode,
    setEditingFolderId,
    setEditingFolderMode,
    setEditingFolderName,
    setExpandedNodeIdsByViewMode,
    setPendingLibraryFolder,
    setSearchOpen,
    setSearchQuery,
    setViewModeMenuOpen,
  ]);

  const renameFolder = useCallback((folderId: string) => {
    if (createFolderPending || editingFolderId) return;
    const folder = localLibraryFolders.find((entry) => entry.id === folderId);
    if (!folder || isProjectComponentFolderRecord(folder) || folder.folder_kind !== "custom") return;

    setActiveTab("components");
    setComponentViewMode("default");
    setViewModeMenuOpen(false);
    setSearchQuery("");
    setSearchOpen(false);
    setPendingLibraryFolder(null);
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
    setEditingFolderMode("rename");
  }, [
    createFolderPending,
    editingFolderId,
    localLibraryFolders,
    setActiveTab,
    setComponentViewMode,
    setEditingFolderId,
    setEditingFolderMode,
    setEditingFolderName,
    setPendingLibraryFolder,
    setSearchOpen,
    setSearchQuery,
    setViewModeMenuOpen,
  ]);

  const addTemplate = useCallback(
    (template: EstimateTemplate) => {
      if (!canInsertTemplate) {
        setLastActionMessage("Select an Area before adding estimate templates.");
        return false;
      }

      const didInsert = onInsertTemplate
        ? onInsertTemplate(template) !== false
        : window.dispatchEvent(new CustomEvent("archestimator:add-estimate-template", { detail: template }));
      if (!didInsert) {
        setLastActionMessage(`${template.name} was not inserted. Select an Area and try again.`);
        return false;
      }

      setLastActionMessage(`${template.name} added${effectiveTemplateTargetName ? ` to ${effectiveTemplateTargetName}` : ""}.`);
      return true;
    },
    [canInsertTemplate, effectiveTemplateTargetName, onInsertTemplate, setLastActionMessage],
  );

  const addTemplateNode = useCallback(
    (template: EstimateTemplate, templateNode: EstimateTreeNode) => {
      if (!canInsertTemplate) {
        setLastActionMessage("Select an Area before adding template nodes.");
        return false;
      }

      const didInsert = onInsertTemplateNode ? onInsertTemplateNode(template, templateNode) !== false : false;
      if (!didInsert) {
        setLastActionMessage(`${templateNode.name} was not inserted. Select an Area and try again.`);
        return false;
      }

      setLastActionMessage(`${templateNode.name} added${effectiveTemplateTargetName ? ` to ${effectiveTemplateTargetName}` : ""}.`);
      return true;
    },
    [canInsertTemplate, effectiveTemplateTargetName, onInsertTemplateNode, setLastActionMessage],
  );

  const addProjectSource = useCallback(
    async (source: ProjectSourceInsertTarget) => {
      if (!enableReusableProjectSources) return false;
      const sourceName = getProjectReusableSourceDisplayName(source);
      if (!canInsertTemplate) {
        setLastActionMessage("Select an Area before adding project sources.");
        return false;
      }

      const targetSuffix = effectiveTemplateTargetName ? ` to ${effectiveTemplateTargetName}` : "";
      toast({
        id: PROJECT_SOURCE_INSERT_TOAST_ID,
        tone: "loading",
        message: `Adding ${sourceName}${targetSuffix}...`,
      });
      let didInsert = false;
      try {
        didInsert = onInsertProjectSource ? (await onInsertProjectSource(source)) !== false : false;
      } catch (error) {
        console.error("[templates] project source insert failed", error);
        toast({
          id: PROJECT_SOURCE_INSERT_TOAST_ID,
          tone: "error",
          message: `${sourceName} was not inserted. Select an Area and try again.`,
        });
        return false;
      }
      if (!didInsert) {
        toast({
          id: PROJECT_SOURCE_INSERT_TOAST_ID,
          tone: "error",
          message: `${sourceName} was not inserted. Select an Area and try again.`,
        });
        return false;
      }

      toast({
        id: PROJECT_SOURCE_INSERT_TOAST_ID,
        tone: "success",
        message: `${sourceName} added${targetSuffix}.`,
      });
      return true;
    },
    [canInsertTemplate, effectiveTemplateTargetName, enableReusableProjectSources, onInsertProjectSource, setLastActionMessage, toast],
  );

  const archiveLibraryItems = useCallback(async (
    itemsToArchive: EstimateRowItem[],
    options: { clearSelection?: boolean } = {},
  ) => {
    if (archiveComponentPending) return false;
    const uniqueItems = Array.from(new Map(itemsToArchive.map((item) => [item.id, item])).values());
    if (uniqueItems.length === 0) return false;
    const itemIds = uniqueItems.map((item) => item.id);

    setArchiveComponentPending(true);
    setArchiveComponentError("");
    try {
      const preview = await previewBulkArchiveLibraryComponents({ itemIds });
      if (!preview.ok || !preview.previewHash || preview.eligibleIds.length === 0) {
        throw new Error(getArchiveActionIssueMessage(preview, "Could not preview component archive."));
      }

      const result = await executeBulkArchiveLibraryComponents({
        itemIds: preview.eligibleIds,
        expectedPreviewHash: preview.previewHash,
        correlationId: createBulkActionCorrelationId(),
      });
      if (!result.ok) {
        throw new Error(getArchiveActionIssueMessage(result, "Could not archive components."));
      }

      const archivedIds = result.archivedIds?.length ? result.archivedIds : preview.eligibleIds;
      const archivedIdSet = new Set(archivedIds);
      setLibraryItems((items) => items.filter((entry) => !archivedIdSet.has(entry.id)));
      setPreviewItemId((current) => (current && archivedIdSet.has(current) ? null : current));
      setDeleteCandidate((current) => (current && archivedIdSet.has(current.id) ? null : current));
      setBulkDeleteConfirmOpen(false);
      if (options.clearSelection) clearBulkSelection();

      const archivedName = archivedIds.length === 1
        ? getComponentName(uniqueItems.find((item) => archivedIdSet.has(item.id)) ?? uniqueItems[0])
        : "";
      toast({
        tone: "success",
        message: archivedIds.length === 1 ? `${archivedName} archived.` : `${archivedIds.length} components archived.`,
      });
      onLibraryDataChanged?.();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not archive components.";
      setArchiveComponentError(message);
      toast({ tone: "error", message });
      return false;
    } finally {
      setArchiveComponentPending(false);
    }
  }, [
    archiveComponentPending,
    clearBulkSelection,
    onLibraryDataChanged,
    setBulkDeleteConfirmOpen,
    setDeleteCandidate,
    setLibraryItems,
    setPreviewItemId,
    toast,
  ]);

  const toggleFavorite = useCallback(
    (item: EstimateRowItem) => {
      setLibraryItems((items) => {
        const next = items.map((row) => (row.id === item.id ? { ...row, isFavorite: !row.isFavorite } : row));
        persistFavorites(next);
        setLastActionMessage(`${getComponentName(item)} ${item.isFavorite ? "removed from" : "added to"} favorites.`);
        return next;
      });
    },
    [persistFavorites, setLastActionMessage, setLibraryItems],
  );

  const startNewComponent = useCallback(() => {
    setAddComponentOpen(true);
  }, [setAddComponentOpen]);

  const startNewTemplate = useCallback(() => {
    setTemplateSourceProjectSource(null);
    setAddTemplateOpen(true);
  }, [setAddTemplateOpen, setTemplateSourceProjectSource]);

  const startNewTemplateInCategory = useCallback((category: string) => {
    setTemplateSourceProjectSource(null);
    setTemplateDefaultCategory(category);
    setAddTemplateOpen(true);
  }, [setAddTemplateOpen, setTemplateDefaultCategory, setTemplateSourceProjectSource]);

  const handleAddTemplateOpenChange = useCallback((open: boolean) => {
    setAddTemplateOpen(open);
    if (!open) {
      setTemplateSourceNodeId(null);
      setTemplateSourceProjectSource(null);
      setTemplateDefaultCategory(null);
    }
  }, [setAddTemplateOpen, setTemplateDefaultCategory, setTemplateSourceNodeId, setTemplateSourceProjectSource]);

  const handleCreateTemplateFromNode = useEffectEvent((event: Event) => {
    const detail = (event as CustomEvent<Partial<CreateEstimateTemplateFromNodeEventDetail>>).detail;
    if (typeof detail?.sourceNodeId !== "string" || !detail.sourceNodeId) return;
    setTemplateSourceNodeId(detail.sourceNodeId);
    setTemplateSourceProjectSource(null);
    setAddTemplateOpen(true);
  });

  // "Save as template" from the sheets tree context menu: that panel cannot
  // host the modal, so it hands the source node over via a window event.
  useEffect(() => {
    function handleCreateTemplateFromNodeEvent(event: Event) {
      handleCreateTemplateFromNode(event);
    }
    window.addEventListener(CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT, handleCreateTemplateFromNodeEvent);
    return () => window.removeEventListener(CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT, handleCreateTemplateFromNodeEvent);
  }, []);

  const templateModalSourceNode = useMemo(() => {
    if (templateSourceProjectSource) {
      return projectSourceToTemplateSourceNode(templateSourceProjectSource, loadedProjectSources);
    }
    if (templateSourceNodeId) {
      return nodes?.length ? findEstimateNode(nodes, templateSourceNodeId) ?? null : null;
    }
    return selectedTargetNode;
  }, [loadedProjectSources, nodes, selectedTargetNode, templateSourceNodeId, templateSourceProjectSource]);
  const templateModalProjectId = templateSourceProjectSource?.projectId ?? projectId;
  const templateModalEstimateId = templateSourceProjectSource?.estimateId ?? estimateId;
  const templateModalSourceTab = templateSourceProjectSource?.kind === "project-tab" ? templateSourceProjectSource : null;

  const handleComponentCreated = useCallback((item: EstimateRowItem) => {
    setLibraryItems((items) => [item, ...items.filter((entry) => entry.id !== item.id)]);
    setPreviewItemId(item.id);
    setPreviewProjectSourceKey(null);
    setLastActionMessage(`${getComponentName(item)} created in the component library.`);
    onLibraryDataChanged?.();
  }, [onLibraryDataChanged, setLastActionMessage, setLibraryItems, setPreviewItemId, setPreviewProjectSourceKey]);

  const handleTemplateCreated = useCallback((template: EstimateTemplate) => {
    setTemplateList((current) => [...current.filter((entry) => entry.id !== template.id), template]);
    setActiveTab(resolveVisibleTab("templates"));
    setTemplatesExpandedIds((current) => Array.from(new Set([
      ...current,
      templatesTreeSectionId("custom-templates"),
      templatesTreeCategoryId(template.category),
    ])));
    setLastActionMessage(`${template.name} saved to templates.`);
    onLibraryDataChanged?.();
  }, [onLibraryDataChanged, resolveVisibleTab, setActiveTab, setLastActionMessage, setTemplateList, setTemplatesExpandedIds]);

  const startRenameTemplate = useCallback((template: EstimateTemplate) => {
    setRenameTemplateTarget(template);
    setRenameTemplateName(template.name);
    setRenameTemplateError("");
  }, [setRenameTemplateError, setRenameTemplateName, setRenameTemplateTarget]);

  const commitRenameTemplate = useCallback(async () => {
    if (!renameTemplateTarget || renameTemplatePending) return;
    const nextName = renameTemplateName.trim();
    if (!nextName) {
      setRenameTemplateError("Template name is required.");
      return;
    }
    if (nextName === renameTemplateTarget.name) {
      setRenameTemplateTarget(null);
      return;
    }

    setRenameTemplatePending(true);
    setRenameTemplateError("");
    try {
      const confirmed = await renameEstimateTemplate({ templateId: renameTemplateTarget.id, name: nextName });
      setTemplateList((current) =>
        current.map((template) => (template.id === confirmed.templateId ? { ...template, name: confirmed.name } : template)),
      );
      setLastActionMessage(`${renameTemplateTarget.name} renamed to ${confirmed.name}.`);
      setRenameTemplateTarget(null);
      onLibraryDataChanged?.();
    } catch (error) {
      setRenameTemplateError(error instanceof Error ? error.message : "Could not rename template.");
    } finally {
      setRenameTemplatePending(false);
    }
  }, [
    onLibraryDataChanged,
    renameTemplateName,
    renameTemplatePending,
    renameTemplateTarget,
    setLastActionMessage,
    setRenameTemplateError,
    setRenameTemplatePending,
    setRenameTemplateTarget,
    setTemplateList,
  ]);

  const startDeleteTemplate = useCallback((template: EstimateTemplate) => {
    setDeleteTemplateTarget(template);
    setDeleteTemplateError("");
  }, [setDeleteTemplateError, setDeleteTemplateTarget]);

  const confirmDeleteTemplate = useCallback(async () => {
    if (!deleteTemplateTarget || deleteTemplatePending) return;
    setDeleteTemplatePending(true);
    setDeleteTemplateError("");
    try {
      await deleteEstimateTemplate({ templateId: deleteTemplateTarget.id });
      setTemplateList((current) => current.filter((template) => template.id !== deleteTemplateTarget.id));
      setLastActionMessage(`${deleteTemplateTarget.name} deleted from templates.`);
      setDeleteTemplateTarget(null);
      onLibraryDataChanged?.();
    } catch (error) {
      setDeleteTemplateError(error instanceof Error ? error.message : "Could not delete template.");
    } finally {
      setDeleteTemplatePending(false);
    }
  }, [
    deleteTemplatePending,
    deleteTemplateTarget,
    onLibraryDataChanged,
    setDeleteTemplateError,
    setDeleteTemplatePending,
    setDeleteTemplateTarget,
    setLastActionMessage,
    setTemplateList,
  ]);

  const saveNewComponent = useCallback(
    (addNow = false) => {
      const result = createComponent(form);
      if (result.error || !result.component) {
        setFormError(result.error ?? "Could not save component.");
        return;
      }
      const editingItemId = editItemIdRef.current;
      const nextComponent = editingItemId
        ? {
            ...result.component,
            id: editingItemId,
            isCustom: true,
            createdAt: libraryItems.find((item) => item.id === editingItemId)?.createdAt ?? result.component.createdAt,
            updatedAt: new Date().toISOString(),
          }
        : result.component;
      setLibraryItems((items) => (editingItemId ? items.map((item) => (item.id === editingItemId ? nextComponent : item)) : [nextComponent, ...items]));
      setDiscardComponentChangesOpen(false);
      setShowNewComponent(false);
      resetComponentForm();
      setPreviewItemId(nextComponent.id);
      setPreviewProjectSourceKey(null);
      setLastActionMessage(`${getComponentName(nextComponent)} ${editingItemId ? "updated" : "created"} in this sidebar view.`);
      if (addNow) addComponent(nextComponent);
      onLibraryDataChanged?.();
    },
    [
      addComponent,
      form,
      libraryItems,
      onLibraryDataChanged,
      resetComponentForm,
      setDiscardComponentChangesOpen,
      setFormError,
      setLastActionMessage,
      setLibraryItems,
      setPreviewItemId,
      setPreviewProjectSourceKey,
      setShowNewComponent,
    ],
  );

  const handleTabChange = useCallback((tab: EstimateLibraryTab) => {
    setActiveTab(resolveVisibleTab(tab));
    setSearchQuery("");
    setSearchOpen(false);
    setPreviewItemId(null);
    setPreviewProjectSourceKey(null);
    setTemplateSourceFilter("all");
    setViewModeMenuOpen(false);
    setBulkSelectedNodeIds(new Set());
  }, [
    resolveVisibleTab,
    setActiveTab,
    setBulkSelectedNodeIds,
    setPreviewItemId,
    setPreviewProjectSourceKey,
    setSearchOpen,
    setSearchQuery,
    setTemplateSourceFilter,
    setViewModeMenuOpen,
  ]);

  const handleComponentViewModeChange = useCallback((mode: ComponentViewMode) => {
    setComponentViewMode(mode);
    setActiveTab(resolveVisibleTab("components"));
    setSearchQuery("");
    setSearchOpen(false);
    setPreviewItemId(null);
    setPreviewProjectSourceKey(null);
    setViewModeMenuOpen(false);
    setBulkSelectedNodeIds(new Set());
  }, [
    resolveVisibleTab,
    setActiveTab,
    setBulkSelectedNodeIds,
    setComponentViewMode,
    setPreviewItemId,
    setPreviewProjectSourceKey,
    setSearchOpen,
    setSearchQuery,
    setViewModeMenuOpen,
  ]);

  const handleToggleNode = useCallback((nodeId: string) => {
    if (isProjectTab) {
      setProjectExpandedNodeIds((current) => (current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId]));
      return;
    }
    setExpandedNodeIdsByViewMode((current) => {
      const ids = current[componentViewMode];
      const next = ids.includes(nodeId) ? ids.filter((id) => id !== nodeId) : [...ids, nodeId];
      return { ...current, [componentViewMode]: next };
    });
  }, [componentViewMode, isProjectTab, setExpandedNodeIdsByViewMode, setProjectExpandedNodeIds]);

  const handleLibraryReorder = useCallback(
    (draggedId: string, targetId: string, position: "before" | "after" | "inside") => {
      const draggedNode = findNode(treeNodes, draggedId);
      const targetNode = findNode(treeNodes, targetId);
      if (componentViewMode === "default" && draggedNode && targetNode && !draggedNode.item && !targetNode.item) {
        const reorderableFolders = localLibraryFolders.filter(
          (folder) => folder.folder_kind === "custom" && !isProjectComponentFolderRecord(folder),
        );
        const reorderableFolderIds = new Set(reorderableFolders.map((folder) => folder.id));
        if (!reorderableFolderIds.has(draggedId) || !reorderableFolderIds.has(targetId)) return;

        let targetParentId: string | null;
        let targetIndex: number;
        if (position === "inside") {
          targetParentId = targetId;
          targetIndex = reorderableFolders.filter((folder) => folder.parent_id === targetId).length;
        } else {
          const siblingInfo = findLibrarySiblingOrder(treeNodes, draggedId, targetId);
          if (!siblingInfo) return;
          const withoutDragged = siblingInfo.siblingIds.filter((id) => id !== draggedId);
          const targetSiblingIndex = withoutDragged.indexOf(targetId);
          if (targetSiblingIndex < 0) return;
          targetParentId = siblingInfo.parentKey === LIBRARY_TREE_ROOT_ORDER_KEY ? null : siblingInfo.parentKey;
          targetIndex = position === "before" ? targetSiblingIndex : targetSiblingIndex + 1;
        }

        const result = buildLibraryFolderReorderPlan({
          folders: reorderableFolders,
          draggedFolderId: draggedId,
          targetParentId,
          targetIndex,
        });
        if (!result.ok) return;

        const previousFolders = localLibraryFolders;
        const previousOrder = customOrderByViewMode;
        const nextFolderById = new Map(result.plan.nextFolders.map((folder) => [folder.id, folder]));
        setLocalLibraryFolders((folders) => folders.map((folder) => nextFolderById.get(folder.id) ?? folder));

        const toOrderKey = (parentId: string | null) => parentId ?? LIBRARY_TREE_ROOT_ORDER_KEY;
        const nextDefaultOrder = { ...customOrderByViewMode.default };
        delete nextDefaultOrder[toOrderKey(result.plan.sourceParentId)];
        delete nextDefaultOrder[toOrderKey(result.plan.targetParentId)];
        const nextOrderByViewMode = { ...customOrderByViewMode, default: nextDefaultOrder };
        setCustomOrderByViewMode(nextOrderByViewMode);
        safeSetJsonStorage(LIBRARY_TREE_ORDER_KEY, nextOrderByViewMode);

        void reorderLibraryFolders({ updates: result.plan.updates })
          .then(() => {
            onLibraryDataChanged?.();
            setLastActionMessage("Folder moved.");
          })
          .catch(() => {
            setLocalLibraryFolders(previousFolders);
            setCustomOrderByViewMode(previousOrder);
            safeSetJsonStorage(LIBRARY_TREE_ORDER_KEY, previousOrder);
            setLastActionMessage("Could not move the folder. You may not have permission to manage library folders.");
          });
        return;
      }

      if (position === "inside") return;
      const siblingInfo = findLibrarySiblingOrder(treeNodes, draggedId, targetId);
      if (!siblingInfo) return;
      const withoutDragged = siblingInfo.siblingIds.filter((id) => id !== draggedId);
      const targetIndex = withoutDragged.indexOf(targetId);
      if (targetIndex < 0) return;
      const insertAt = position === "before" ? targetIndex : targetIndex + 1;
      const nextOrder = [...withoutDragged.slice(0, insertAt), draggedId, ...withoutDragged.slice(insertAt)];
      const next = {
        ...customOrderByViewMode,
        [componentViewMode]: { ...customOrderByViewMode[componentViewMode], [siblingInfo.parentKey]: nextOrder },
      };
      setCustomOrderByViewMode(next);
      safeSetJsonStorage(LIBRARY_TREE_ORDER_KEY, next);
    },
    [
      componentViewMode,
      customOrderByViewMode,
      localLibraryFolders,
      onLibraryDataChanged,
      setCustomOrderByViewMode,
      setLastActionMessage,
      setLocalLibraryFolders,
      treeNodes,
    ],
  );

  const handleBulkAddSelected = useCallback(() => {
    if (bulkSelectedItems.length === 0) return;
    if (insertLibraryItems(bulkSelectedItems)) clearBulkSelection();
  }, [bulkSelectedItems, clearBulkSelection, insertLibraryItems]);

  const handleBulkAddSelectedTemplates = useCallback(async () => {
    const { templates: checkedTemplates, templateNodes, items } = bulkTemplateUnits;
    let insertedCount = 0;
    if (canInsertTemplate) {
      checkedTemplates.forEach((template) => {
        if (addTemplate(template)) insertedCount += 1;
      });
      templateNodes.forEach(({ template, node }) => {
        if (addTemplateNode(template, node)) insertedCount += 1;
      });
      for (const source of bulkProjectSourceTargets) {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- Source insertion mutates ordered estimate state; preserve deterministic insertion order.
        if (await addProjectSource(source)) insertedCount += 1;
      }
    }
    const componentItems = [...items, ...bulkProjectSourceRowItems];
    if (componentItems.length > 0 && insertLibraryItems(componentItems)) insertedCount += componentItems.length;
    if (insertedCount === 0) return;
    if (insertedCount > 1) setLastActionMessage(`${insertedCount} reusable selections added.`);
    clearBulkSelection();
  }, [
    addProjectSource,
    addTemplate,
    addTemplateNode,
    bulkProjectSourceTargets,
    bulkProjectSourceRowItems,
    bulkTemplateUnits,
    canInsertTemplate,
    clearBulkSelection,
    insertLibraryItems,
    setLastActionMessage,
  ]);

  const handleConfirmBulkDelete = useCallback(() => {
    if (!isLibraryTab) {
      setBulkDeleteConfirmOpen(false);
      return;
    }
    if (bulkSelectedItems.length === 0) {
      setBulkDeleteConfirmOpen(false);
      return;
    }
    void archiveLibraryItems(bulkSelectedItems, { clearSelection: true });
  }, [
    archiveLibraryItems,
    bulkSelectedItems,
    isLibraryTab,
    setBulkDeleteConfirmOpen,
  ]);

  const handleExpandAll = useCallback(() => {
    if (isTemplatesTab) {
      // PERF-4: build the id list lazily on click. buildTemplatesTreeNodes
      // allocates a full JSX-bearing tree; doing it every render (the old
      // templatesAllNodeIds memo) was pure waste since only Expand-all reads it.
      setTemplatesExpandedIds(getTemplatesTreeAllNodeIds(buildTemplatesTreeNodes(visibleTemplateList, visibleTemplateProjectSources)));
      return;
    }
    if (isProjectTab) {
      setProjectExpandedNodeIds(getAllNodeIds(treeNodes));
      return;
    }
    setExpandedNodeIdsByViewMode((current) => ({
      ...current,
      [componentViewMode]: getAllNodeIds(treeNodes),
    }));
  }, [
    componentViewMode,
    isProjectTab,
    isTemplatesTab,
    setExpandedNodeIdsByViewMode,
    setProjectExpandedNodeIds,
    setTemplatesExpandedIds,
    treeNodes,
    visibleTemplateList,
    visibleTemplateProjectSources,
  ]);

  const handleCollapseAll = useCallback(() => {
    if (isTemplatesTab) {
      setTemplatesExpandedIds([]);
      return;
    }
    if (isProjectTab) {
      setProjectExpandedNodeIds([]);
      return;
    }
    setExpandedNodeIdsByViewMode((current) => ({
      ...current,
      [componentViewMode]: [],
    }));
  }, [
    componentViewMode,
    isProjectTab,
    isTemplatesTab,
    setExpandedNodeIdsByViewMode,
    setProjectExpandedNodeIds,
    setTemplatesExpandedIds,
  ]);

  // Loading the next level (estimates under a project, the outline under an
  // estimate) is shared by both expand and hover-prefetch (U6/U23). Each is
  // idempotent: already-resident or already-in-flight levels short-circuit, so
  // a hover followed by an expand never double-fetches.
  const ensureProjectEstimatesLoaded = useCallback((projectId: string) => {
    if (loadedProjectSourceIndex.projectIdsWithEstimates.has(projectId)) return;
    if (getProjectEstimateLoadedProjectIds().has(projectId)) return;
    if (projectEstimateLoadingProjectIds.includes(projectId)) return;

    setProjectEstimateLoadingProjectIds((current) =>
      current.includes(projectId) ? current : [...current, projectId],
    );
    listReusableProjectEstimateSources({ projectId })
      .then((result) => {
        setLoadedProjectSources((current) =>
          mergeReusableProjectEstimateSources(current, result.sources, projectId),
        );
        getProjectEstimateLoadedProjectIds().add(projectId);
      })
      .catch((error: unknown) => {
        console.error("[templates] project estimates load failed", error);
        toast({ tone: "error", message: toUserSourceError("estimates") });
      })
      .finally(() => {
        setProjectEstimateLoadingProjectIds((current) => current.filter((id) => id !== projectId));
      });
  }, [
    getProjectEstimateLoadedProjectIds,
    loadedProjectSourceIndex,
    projectEstimateLoadingProjectIds,
    setLoadedProjectSources,
    setProjectEstimateLoadingProjectIds,
    toast,
  ]);

  const ensureEstimateOutlineLoaded = useCallback((source: { projectId: string; estimateId: string }) => {
    if (loadedProjectSourceIndex.estimateIdsWithOutline.has(source.estimateId)) return;
    if (projectOutlineLoadingEstimateIds.includes(source.estimateId)) return;

    setProjectOutlineLoadingEstimateIds((current) =>
      current.includes(source.estimateId) ? current : [...current, source.estimateId],
    );
    getReusableEstimateOutline({ projectId: source.projectId, estimateId: source.estimateId })
      .then((result) => {
        setLoadedProjectSources((current) => mergeReusableProjectSources(current, result.sources, source.estimateId));
      })
      .catch((error: unknown) => {
        console.error("[templates] estimate outline load failed", error);
        toast({ tone: "error", message: toUserSourceError("outline") });
      })
      .finally(() => {
        setProjectOutlineLoadingEstimateIds((current) => current.filter((id) => id !== source.estimateId));
      });
  }, [
    loadedProjectSourceIndex,
    projectOutlineLoadingEstimateIds,
    setLoadedProjectSources,
    setProjectOutlineLoadingEstimateIds,
    toast,
  ]);

  // Hovering a project/estimate row warms its next level so the subsequent
  // expand is already resident and shows no loading state at all (U23).
  const handleTemplatesPrefetch = useCallback((nodeId: string) => {
    const projectSource = loadedProjectSourceIndex.projectsByTreeNodeId.get(nodeId);
    if (projectSource) {
      ensureProjectEstimatesLoaded(projectSource.projectId);
      return;
    }
    const source = loadedProjectSourceIndex.estimatesByTreeNodeId.get(nodeId);
    if (source) ensureEstimateOutlineLoaded(source);
  }, [ensureEstimateOutlineLoaded, ensureProjectEstimatesLoaded, loadedProjectSourceIndex]);

  const handleTemplatesToggle = useCallback((nodeId: string) => {
    const isExpanded = templatesExpandedIds.includes(nodeId);
    setTemplatesExpandedIds((current) =>
      current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId],
    );
    if (isExpanded) return;

    const projectSource = loadedProjectSourceIndex.projectsByTreeNodeId.get(nodeId);
    if (projectSource) {
      ensureProjectEstimatesLoaded(projectSource.projectId);
      return;
    }
    const source = loadedProjectSourceIndex.estimatesByTreeNodeId.get(nodeId);
    if (source) ensureEstimateOutlineLoaded(source);
  }, [
    ensureEstimateOutlineLoaded,
    ensureProjectEstimatesLoaded,
    loadedProjectSourceIndex,
    setTemplatesExpandedIds,
    templatesExpandedIds,
  ]);

  const handleItemDragStart = useCallback((event: React.DragEvent<HTMLElement>, item: EstimateRowItem | undefined) => {
    if (!item) return;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(LIBRARY_ITEM_DRAG_MIME_TYPE, JSON.stringify(item));
    event.dataTransfer.setData("text/plain", getComponentName(item));
    // Publishing the drag lets the sheet and the left tree reveal their drop
    // zones for exactly this drag's lifetime.
    beginEstimateWorkshopDrag({ kind: "library-item" });

    const dragGhost = document.createElement("div");
    dragGhost.className = "fixed -top-96 left-0 flex items-center gap-2 border border-hairline bg-white px-2 py-1 text-[10px] font-medium text-ink shadow-lg";
    dragGhost.textContent = `${getComponentName(item)} · ${pesoFormatter.format(getComponentPrice(item))}`;
    document.body.appendChild(dragGhost);
    event.dataTransfer.setDragImage(dragGhost, 12, 12);
    window.setTimeout(() => dragGhost.remove(), 0);
  }, []);

  const handleTemplateDragStart = useCallback((event: React.DragEvent<HTMLElement>, template: EstimateTemplate) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE, JSON.stringify({ templateId: template.id }));
    event.dataTransfer.setData("text/plain", template.name);
    beginEstimateWorkshopDrag({ kind: "estimate-template", templateId: template.id, templateName: template.name });

    const dragGhost = document.createElement("div");
    dragGhost.className = "fixed -top-96 left-0 border border-hairline bg-white px-2 py-1 text-[10px] font-medium text-ink shadow-lg";
    dragGhost.textContent = `${template.name} · estimate template`;
    document.body.appendChild(dragGhost);
    event.dataTransfer.setDragImage(dragGhost, 12, 12);
    window.setTimeout(() => dragGhost.remove(), 0);
  }, []);

  // Dragging a group/area from inside a template carries that subtree; the
  // drop recreates it under the target group.
  const handleTemplateNodeDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>, template: EstimateTemplate, templateNode: EstimateTreeNode) => {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData(
        ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
        JSON.stringify({ templateId: template.id, templateNodeId: templateNode.id }),
      );
      event.dataTransfer.setData("text/plain", templateNode.name);
      beginEstimateWorkshopDrag({ kind: "estimate-template", templateName: templateNode.name });

      const dragGhost = document.createElement("div");
      dragGhost.className = "fixed -top-96 left-0 border border-hairline bg-white px-2 py-1 text-[10px] font-medium text-ink shadow-lg";
      dragGhost.textContent = `${templateNode.name} · template area`;
      document.body.appendChild(dragGhost);
      event.dataTransfer.setDragImage(dragGhost, 12, 12);
      window.setTimeout(() => dragGhost.remove(), 0);
    },
    [],
  );

  const handleProjectSourceDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>, source: ProjectSourceInsertTarget) => {
      const sourceName = getProjectReusableSourceDisplayName(source);
      event.dataTransfer.effectAllowed = "copy";
      const payload = source.kind === "project-node"
        ? {
            kind: "project-node",
            projectId: source.projectId,
            estimateId: source.estimateId,
            tabId: source.tabId,
            nodeId: source.nodeId,
          }
        : {
            kind: "project-tab",
            projectId: source.projectId,
            estimateId: source.estimateId,
            tabId: source.tabId,
          };
      event.dataTransfer.setData(PROJECT_SOURCE_DRAG_MIME_TYPE, JSON.stringify(payload));
      event.dataTransfer.setData("text/plain", sourceName);
      beginEstimateWorkshopDrag({ kind: "project-source", sourceName });

      const dragGhost = document.createElement("div");
      dragGhost.className = "fixed -top-96 left-0 border border-hairline bg-white px-2 py-1 text-[10px] font-medium text-ink shadow-lg";
      dragGhost.textContent = `${sourceName} · project source`;
      document.body.appendChild(dragGhost);
      event.dataTransfer.setDragImage(dragGhost, 12, 12);
      window.setTimeout(() => dragGhost.remove(), 0);
    },
    [],
  );

  // Dragging a category header carries every template in it; the drop
  // inserts them all under the target group, in tree order.
  const handleCategoryDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>, category: string, categoryTemplates: EstimateTemplate[]) => {
      if (!categoryTemplates.length) return;
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData(
        ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
        JSON.stringify({ templateIds: categoryTemplates.map((template) => template.id) }),
      );
      event.dataTransfer.setData("text/plain", category);
      beginEstimateWorkshopDrag({ kind: "estimate-template", templateName: `${category} templates` });

      const dragGhost = document.createElement("div");
      dragGhost.className = "fixed -top-96 left-0 border border-hairline bg-white px-2 py-1 text-[10px] font-medium text-ink shadow-lg";
      dragGhost.textContent = `${category} · ${categoryTemplates.length} ${categoryTemplates.length === 1 ? "template" : "templates"}`;
      document.body.appendChild(dragGhost);
      event.dataTransfer.setDragImage(dragGhost, 12, 12);
      window.setTimeout(() => dragGhost.remove(), 0);
    },
    [],
  );

  const activeTreeLabelPrefix = isProjectTab ? "project components" : isTemplatesTab ? "templates" : "library";
  const activeSearchLabel = isProjectTab ? "Search Project Components" : isTemplatesTab ? "Search Templates" : "Search Library";
  const activeToolsLabel = isProjectTab ? "Project tools" : isTemplatesTab ? "Template tools" : "Library tools";
  const activeExpandedNodeIds = isProjectTab ? projectExpandedNodeIds : expandedNodeIdsByViewMode[componentViewMode];
  const activeLibraryTreeAriaLabel = isProjectTab ? "Project sources" : "Library sources";
  const activeSourceScopeLabel = isProjectTab || projectId === "hero-sanitized-project" ? "" : "Library";
  const visibleLibraryTreeTabs = useMemo(
    () => buildLibraryTreeTabs(effectiveVisibleLibraryTabs),
    [effectiveVisibleLibraryTabs],
  );

  const sourceSidebarBody = (
    /* group/tree on the panel keeps the tree's drag/select rail space open
       while the pointer or focus is anywhere in this sidebar, matching the
       estimate tree's behavior. */
    <aside className={cn("group/tree flex h-full min-h-0 min-w-0 flex-col !text-[10px] sm:min-w-[320px]", estimateSurfaceClass(surfaceVariant, "libraryRail"))} aria-label="Sources">
        {/* Sticky header */}
        <TreePanelHeader
          className={estimateSurfaceClass(surfaceVariant, "railPanelHeader")}
          toolbarClassName={estimateSurfaceClass(surfaceVariant, "chromeToolbar")}
          ref={treeHeaderRef}
          ariaLabel="Estimate source tools"
          labelPrefix={activeTreeLabelPrefix}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          searchValue={searchQuery}
          onSearchValueChange={setSearchQuery}
          searchPlaceholder={activeSearchLabel}
          searchLabel={activeSearchLabel}
          searchOpen={searchOpen}
          onSearchOpenChange={setSearchOpen}
          searchInputRef={searchRef}
          showDefaultActions={false}
          addActions={[]}
          tabs={visibleLibraryTreeTabs}
          activeTab={visibleActiveTab}
          tabVariant="tabs"
          tabsAriaLabel="Estimate source sections"
          onTabChange={(tab) => handleTabChange(tab as EstimateLibraryTab)}
          showBottomBorder={false}
          showToolbarBottomBorder
        />

        {/* Under-tabs toolbar row: Filter · View-by · Add (D7).
            Wrapped in `relative` so the View-by popover anchors to this row. */}
        <div ref={libraryToolsRef} className="relative">
          <div
            role="toolbar"
            aria-label={activeToolsLabel}
            className={cn("mx-2 flex h-[38px] min-h-[38px] items-center gap-1 px-0 py-0", estimateSurfaceClass(surfaceVariant, "railToolbar"))}
          >
            {/* D1: Facet filter — components only; templates-tab faceting is out of scope. */}
            {isLibraryTab ? (
              <ComponentFacetFilterPopover
                options={facetOptions}
                filters={facetFilters}
                onFiltersChange={setFacetFilters}
              />
            ) : null}
            {/* View-by — relocated grouping control */}
            {isLibraryTab ? (
              <ToolbarIconButton
                label="View by"
                visibleLabel="View by"
                onClick={() => setViewModeMenuOpen((current) => !current)}
                aria-expanded={viewModeMenuOpen}
              >
                <Rows size={13} weight="regular" aria-hidden="true" />
              </ToolbarIconButton>
            ) : null}
            <div className="ml-auto flex items-center gap-1">
              {isLibraryTab ? (
                <>
                  <ToolbarIconButton label="Add folder" onClick={createFolder} disabled={createFolderPending} className={ADD_BUTTON_CLASSNAME}>
                    <FolderSimple size={13} weight="regular" aria-hidden="true" />
                  </ToolbarIconButton>
                  <ToolbarIconButton label="Add Component" onClick={startNewComponent} className={ADD_BUTTON_CLASSNAME}>
                    <Package size={13} weight="regular" aria-hidden="true" />
                  </ToolbarIconButton>
                </>
              ) : isTemplatesTab ? (
                <>
                  <ToolbarIconButton label="Add Template" onClick={startNewTemplate} className={ADD_BUTTON_CLASSNAME}>
                    <StackPlus size={13} weight="regular" aria-hidden="true" />
                  </ToolbarIconButton>
                </>
              ) : null}
            </div>
          </div>
          {/* View-by popover — positioned absolute relative to this wrapper div,
              top-full places it just below the 38px toolbar row. */}
          {isLibraryTab && viewModeMenuOpen ? (
            <ComponentViewControls
              mode={componentViewMode}
              ariaLabel="Component view mode"
              onModeChange={handleComponentViewModeChange}
              className="top-full"
            />
          ) : null}
        </div>

        {/* Scrollable tree with a floating bulk-action dock */}
        <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto">
          <div className={cn("px-2 pt-0", bulkSelectionCount > 0 ? "pb-16" : "pb-1")}>
            {isProjectTab && projectTabUnavailable ? (
              <div className="p-2" data-project-tab-unavailable="true">
                {projectTabUnavailable}
              </div>
            ) : isTemplatesTab ? (
              <>
                {templatesSourceFilterControls}
                <TemplatesTree
                  templates={visibleTemplateList}
                  projectSources={visibleTemplateProjectSources}
                  customTemplateCategories={visibleCustomTemplateGroups}
                  searchQuery={deferredSearchQuery}
                  expandedNodeIds={templatesExpandedIds}
                  onToggle={handleTemplatesToggle}
                  templatesLoading={libraryDataLoading}
                  projectSourcesLoading={projectSourcesLoading}
                  loadingProjectIds={skeletonProjectIds}
                  loadingEstimateIds={skeletonEstimateIds}
                  onPrefetchNode={handleTemplatesPrefetch}
                  canInsertTemplate={canInsertTemplate}
                  templateTargetName={effectiveTemplateTargetName || "selected group"}
                  onAddTemplate={addTemplate}
                  onAddTemplateNode={addTemplateNode}
                  onTemplateDragStart={handleTemplateDragStart}
                  onCategoryDragStart={handleCategoryDragStart}
                  onTemplateNodeDragStart={handleTemplateNodeDragStart}
                  onAddProjectSource={addProjectSource}
                  onProjectSourceDragStart={handleProjectSourceDragStart}
                  onPreviewProjectSource={(source) => {
                    setPreviewItemId(null);
                    setPreviewProjectSourceKey(reusableProjectSourceKey(source));
                  }}
                  onClearProjectSourcePreview={() => setPreviewProjectSourceKey(null)}
                  onRenameTemplate={startRenameTemplate}
                  onDeleteTemplate={startDeleteTemplate}
                  onCreateTemplate={startNewTemplateInCategory}
                  componentAddDisabled={!canInsert}
                  componentAddLabel={targetLabel}
                  onAddComponent={(item) => addComponent(item)}
                  onItemDragStart={handleItemDragStart}
                  selectable
                  checkedIds={bulkSelectedIds}
                  onCheckToggle={handleBulkCheckToggle}
                  emptyState={templatesProjectSourceEmptyState}
                />
              </>
            ) : (
              <LibraryTree
                nodes={filteredTreeNodes}
                selectedNodeId={previewItemId}
                expandedNodeIds={activeExpandedNodeIds}
                searchQuery={deferredSearchQuery}
                onToggle={handleToggleNode}
                onItemAdd={(item) => { if (item) addComponent(item); }}
                onItemPreview={(itemId) => {
                  setPreviewProjectSourceKey(null);
                  setPreviewItemId(itemId);
                }}
                onItemEdit={undefined}
                onItemDuplicate={undefined}
                onItemToggleFavorite={isLibraryTab ? toggleFavorite : undefined}
                onItemDelete={isLibraryTab ? (item) => {
                  setArchiveComponentError("");
                  setDeleteCandidate(item);
                } : undefined}
                itemDestructiveActionLabel="Archive"
                onCreateComponent={isLibraryTab ? startNewComponent : undefined}
                onFolderRename={isLibraryTab && componentViewMode === "default" ? renameFolder : undefined}
                addDisabled={!canInsert}
                addLabel={targetLabel}
                onItemDragStart={handleItemDragStart}
                showThumbnails
                showSourceTrustChips={isProjectTab ? false : showSourceTrustChips}
                editingNodeId={editingFolderId}
                editingNodeValue={editingFolderName}
                onEditingNodeValueChange={setEditingFolderName}
                onEditingNodeCommit={commitInlineFolderEdit}
                onEditingNodeCancel={cancelInlineFolderEdit}
                treeAriaLabel={activeLibraryTreeAriaLabel}
                sourceScopeLabel={activeSourceScopeLabel}
                selectable
                checkedIds={bulkSelectedIds}
                onCheckToggle={handleBulkCheckToggle}
                onReorder={isLibraryTab ? handleLibraryReorder : undefined}
                folderNestingEnabled={isLibraryTab && componentViewMode === "default"}
                reorderDisabled={searchQuery.trim().length > 0}
                loading={libraryDataLoading}
                loadingAriaLabel={isProjectTab ? "Loading Project tree" : "Loading Library tree"}
              />
            )}
          </div>
        </div>
        <BulkActionToolbar
          placement="bottom-dock"
          dockTo="container"
          selectedCount={bulkSelectionCount}
          selectedLabel="selected"
          onClear={clearBulkSelection}
          actions={
            isTemplatesTab
              ? [
                  {
                    label: "Add selected to estimate",
                    icon: <Plus size={12} weight="regular" />,
                    disabled:
                      (!canInsertTemplate || (bulkTemplateUnitCount === 0 && bulkProjectSourceTargetCount === 0)) &&
                      (!canInsert || (bulkTemplateUnits.items.length === 0 && bulkProjectSourceRowItems.length === 0)),
                    onClick: handleBulkAddSelectedTemplates,
                  },
                ]
              : [
                  {
                    label: "Add selected components",
                    icon: <Plus size={12} weight="regular" />,
                    disabled: !canInsert || bulkSelectedItems.length === 0,
                    onClick: handleBulkAddSelected,
                  },
                  ...(isLibraryTab
                    ? [
                        {
                          label: "Archive selected components",
                          icon: <Trash size={12} weight="regular" />,
                          variant: "danger" as const,
                          disabled: archiveComponentPending || bulkSelectedItems.length === 0,
                          onClick: () => {
                            setArchiveComponentError("");
                            setBulkDeleteConfirmOpen(true);
                          },
                        },
                      ]
                    : []),
                ]
          }
        />
        </div>

        {/* Preview panel */}
        {previewItem ? (
          <PreviewPanel
            item={previewItem}
            onClose={() => setPreviewItemId(null)}
            onAdd={(quantity) => addComponent(previewItem, quantity ?? insertQuantity)}
            onEdit={undefined}
            onDuplicate={undefined}
            onFavorite={isLibraryTab ? () => toggleFavorite(previewItem) : undefined}
            onDelete={isLibraryTab ? () => {
              setArchiveComponentError("");
              setDeleteCandidate(previewItem);
            } : undefined}
            deleteLabel="Archive"
            addDisabled={!canInsert}
            addLabel={targetLabel}
            insertQuantity={insertQuantity}
            onInsertQuantityChange={setInsertQuantity}
          />
        ) : null}

        {previewProjectSource ? (
          <ProjectSourcePreviewPanel
            source={previewProjectSource}
            sources={visibleTemplateProjectSources}
            onClose={() => setPreviewProjectSourceKey(null)}
            onAdd={addProjectSource}
            addDisabled={!canInsertTemplate}
            addLabel={
              canInsertTemplate
                ? `Add to ${effectiveTemplateTargetName || "selected group"}`
                : "Select an Area before adding project sources"
            }
          />
        ) : null}

        {/* Create flow: the shared Components-page modal. */}
        {addComponentOpen ? (
          <AddComponentModal
            open={addComponentOpen}
            folders={reusableLibraryFolders}
            categoryTree={categoryTree}
            suppliers={suppliers}
            brands={brands}
            libraryItems={reusableLibraryItems}
            selectedFolderId={null}
            onOpenChange={setAddComponentOpen}
            onComponentCreated={handleComponentCreated}
            catalogueOptionsStorageScope={projectId ?? estimateId ?? "estimate-sidebar"}
          />
        ) : null}

        {/* Create flow: save an estimate node (selected, or handed over by
            the sheets tree context menu) as a template. */}
        {addTemplateOpen ? (
          <NewTemplateModal
            open={addTemplateOpen}
            onOpenChange={handleAddTemplateOpenChange}
            mode={templateModalSourceTab ? "estimate-tab" : templateSourceProjectSource ? "estimate-node" : templateCreateMode}
            projectId={templateModalProjectId}
            estimateId={templateModalEstimateId}
            sourceNode={templateModalSourceNode}
            sourceTabId={templateModalSourceTab?.tabId}
            sourceTabName={templateModalSourceTab?.name}
            sourceDisplayName={templateModalSourceTab ? getProjectReusableSourceDisplayName(templateModalSourceTab) : undefined}
            existingCategories={templateGroupNames}
            defaultCategory={templateDefaultCategory ?? undefined}
            onCreated={handleTemplateCreated}
          />
        ) : null}

        {/* Edit component form */}
        <Modal
          open={showNewComponent}
          title="Edit component"
          description="Update this reusable cost component in the local library."
          closeLabel="Cancel component edit"
          className="max-w-3xl"
          onOpenChange={(open) => {
            if (open) setShowNewComponent(true);
            else closeNewComponent();
          }}
        >
          <NewComponentForm
            form={form}
            formError={formError}
            onChange={setForm}
            onSave={() => saveNewComponent(false)}
            onSaveAndAdd={() => saveNewComponent(true)}
            onCancel={closeNewComponent}
          />
        </Modal>

        {discardComponentChangesOpen ? (
          <Modal
            open={discardComponentChangesOpen}
            title="Discard component changes?"
            description="This edit has unsaved changes."
            tone="destructive"
            closeLabel="Keep editing component"
            className="max-w-sm"
            onOpenChange={setDiscardComponentChangesOpen}
          >
            <div className="grid gap-3">
              <p className="text-[10px] leading-4 text-secondary">
                Discard the unsaved component edits and close the form?
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setDiscardComponentChangesOpen(false)}>
                  Keep editing
                </Button>
                <Button type="button" variant="danger" size="sm" onClick={discardComponentChanges}>
                  Discard changes
                </Button>
              </div>
            </div>
          </Modal>
        ) : null}

        {/* Bulk archive confirmation */}
        {bulkDeleteConfirmOpen && isLibraryTab ? (
          <dialog
            ref={bulkDeleteConfirmDialogRef}
            role="alertdialog"
            aria-label="Archive selected components"
            className="z-40 m-auto w-full max-w-72 border border-hairline bg-white p-3 text-ink shadow-xl outline-none backdrop:bg-black/25"
            onCancel={(event) => {
              event.preventDefault();
              closeBulkDeleteConfirmDialog();
            }}
          >
            <h3 className="text-[11px] font-medium text-ink">
              Archive {bulkSelectedItems.length} selected {bulkSelectedItems.length === 1 ? "component" : "components"}?
            </h3>
            <p className="mt-1 text-[9px] leading-4 text-tertiary">
              Archived components are hidden from future inserts. Existing estimate rows stay unchanged.
            </p>
            {archiveComponentError ? (
              <p role="alert" className="mt-1 text-[9px] leading-3 text-danger">{archiveComponentError}</p>
            ) : null}
            <div className="mt-3 flex justify-end gap-1">
              <Button variant="secondary" size="sm" className="h-6 min-h-6 text-[9px]" disabled={archiveComponentPending} onClick={closeBulkDeleteConfirmDialog}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" className="h-6 min-h-6 text-[9px]" disabled={archiveComponentPending} onClick={handleConfirmBulkDelete}>
                {archiveComponentPending ? "Archiving..." : "Archive selected"}
              </Button>
            </div>
          </dialog>
        ) : null}

        {/* Rename template */}
        {renameTemplateTarget ? (
          <dialog
            ref={renameTemplateDialogRef}
            aria-label={`Rename template ${renameTemplateTarget.name}`}
            className="z-40 m-auto w-full max-w-72 border border-hairline bg-white p-3 text-ink shadow-xl outline-none backdrop:bg-black/25"
            onCancel={(event) => {
              event.preventDefault();
              closeRenameTemplateDialog();
            }}
          >
            <h3 className="text-[11px] font-medium text-ink">Rename template</h3>
            <ControlInput
              value={renameTemplateName}
              aria-label="Template name"
              aria-invalid={renameTemplateError ? "true" : undefined}
              autoFocus
              placeholder="Template name"
              className="mt-2 h-7 border border-hairline bg-white px-2 !text-[10px] font-medium text-ink outline-none transition placeholder:text-tertiary hover:border-tertiary focus:border-tertiary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/40"
              onChange={(event) => {
                setRenameTemplateName(event.currentTarget.value);
                if (renameTemplateError) setRenameTemplateError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void commitRenameTemplate();
                }
              }}
            />
            {renameTemplateError ? (
              <p role="alert" className="mt-1 text-[9px] leading-3 text-danger">{renameTemplateError}</p>
            ) : null}
            <div className="mt-3 flex justify-end gap-1">
              <Button
                variant="secondary"
                size="sm"
                className="h-6 min-h-6 text-[9px]"
                disabled={renameTemplatePending}
                onClick={closeRenameTemplateDialog}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-6 min-h-6 text-[9px]"
                disabled={renameTemplatePending}
                onClick={() => void commitRenameTemplate()}
              >
                {renameTemplatePending ? "Saving…" : "Save name"}
              </Button>
            </div>
          </dialog>
        ) : null}

        {/* Delete template confirmation */}
        {deleteTemplateTarget ? (
          <dialog
            ref={deleteTemplateDialogRef}
            role="alertdialog"
            aria-label="Delete template"
            className="z-40 m-auto w-full max-w-72 border border-hairline bg-white p-3 text-ink shadow-xl outline-none backdrop:bg-black/25"
            onCancel={(event) => {
              event.preventDefault();
              closeDeleteTemplateDialog();
            }}
          >
            <h3 className="text-[11px] font-medium text-ink">Delete template?</h3>
            <p className="mt-1 text-[9px] leading-4 text-tertiary">
              Remove {deleteTemplateTarget.name} from this workspace&apos;s templates. Estimates already built from it keep their nodes and rows.
            </p>
            {deleteTemplateError ? (
              <p role="alert" className="mt-1 text-[9px] leading-3 text-danger">{deleteTemplateError}</p>
            ) : null}
            <div className="mt-3 flex justify-end gap-1">
              <Button
                variant="secondary"
                size="sm"
                className="h-6 min-h-6 text-[9px]"
                disabled={deleteTemplatePending}
                onClick={closeDeleteTemplateDialog}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="h-6 min-h-6 text-[9px]"
                disabled={deleteTemplatePending}
                onClick={() => void confirmDeleteTemplate()}
              >
                {deleteTemplatePending ? "Deleting…" : "Delete template"}
              </Button>
            </div>
          </dialog>
        ) : null}

        {/* Archive confirmation */}
        {deleteCandidate ? (
          <dialog
            ref={deleteComponentDialogRef}
            role="alertdialog"
            aria-label="Archive component"
            className="z-40 m-auto w-full max-w-72 border border-hairline bg-white p-3 text-ink shadow-xl outline-none backdrop:bg-black/25"
            onCancel={(event) => {
              event.preventDefault();
              closeDeleteComponentDialog();
            }}
          >
            <h3 className="text-[11px] font-medium text-ink">Archive component?</h3>
            <p className="mt-1 text-[9px] leading-4 text-tertiary">
              Archive {getComponentName(deleteCandidate)} in the workspace library. Existing estimate rows stay unchanged.
            </p>
            {archiveComponentError ? (
              <p role="alert" className="mt-1 text-[9px] leading-3 text-danger">{archiveComponentError}</p>
            ) : null}
            <div className="mt-3 flex justify-end gap-1">
              <Button variant="secondary" size="sm" className="h-6 min-h-6 text-[9px]" disabled={archiveComponentPending} onClick={closeDeleteComponentDialog}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" className="h-6 min-h-6 text-[9px]" disabled={archiveComponentPending} onClick={() => void archiveLibraryItems([deleteCandidate])}>
                {archiveComponentPending ? "Archiving..." : "Archive"}
              </Button>
            </div>
          </dialog>
        ) : null}
      </aside>
  );

  return (
    <>
      <ResizableSidePanel
        side="right"
        ariaLabel="Sources"
        storageKey="estimate_component_library_width_v2"
        defaultWidth={560}
        minWidth={360}
        maxWidth={560}
        persistWidth={usePersistentPanelWidth}
        compactDrawer={false}
      >
        {sourceSidebarBody}
      </ResizableSidePanel>
      <Drawer
        open={sourcesDrawerOpen}
        onOpenChange={(open) => onMobileDrawerOpenChange?.(open)}
        title="Sources"
        side="right"
        size="wide"
        modal
        withScrim
        closeLabel="Close Sources drawer"
        closeOnEscape={false}
        returnFocusOnClose
        contentId={mobileDrawerId}
        contentClassName="w-[min(38rem,calc(100vw_-_16px))] max-w-[calc(100vw_-_16px)]"
        bodyClassName="min-h-0 overflow-hidden p-0"
      >
        {sourceSidebarBody}
      </Drawer>
    </>
  );
}

function EstimateRightSidebarBase(props: EstimateRightSidebarProps = {}) {
  return useEstimateRightSidebarContent(props);
}

// PERF-5: the sidebar lives inside the high-churn estimate sheet. Its props are
// referentially stable across cell edits and selection-stable renders (query
// data, ?? fallbacks reusing existing refs, useCallback/useStableCallback
// handlers; primitive/string props are value-compared by Object.is), so
// memoizing skips its large derivation block when unrelated sheet state changes.
export const EstimateRightSidebar = memo(EstimateRightSidebarBase);
