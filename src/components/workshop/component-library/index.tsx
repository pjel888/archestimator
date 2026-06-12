"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, PlusSquare, SquaresFour, StackPlus, StackSimple, Trash, X } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { Modal } from "@/components/ui/modal";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import {
  pruneSelection,
  toggleCascadeSelection,
  type TreeSelectionNode,
} from "@/lib/bulk-selection/tree-selection";
import { resolveEstimateWorkspaceSelection, useEstimateWorkspaceSelection } from "@/hooks/use-estimate-workspace-state";
import { deleteEstimateTemplate, renameEstimateTemplate } from "@/lib/component-library/actions";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import { componentCategoryTree, type ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import { getReusableEstimateOutline, listReusableProjectSources } from "@/lib/reusable-sources/actions";
import type {
  ProjectEstimateReusableSource,
  ProjectReusableEstimateSource,
  ProjectSourceInsertTarget,
  ReusableEstimateSource,
  ReusableSourceLiveMetadata,
} from "@/lib/reusable-sources/types";
import type { ComponentLibraryBrand } from "@/lib/repositories/component-library-repository";
import { cn } from "@/lib/ui/cn";
import { estimateLibraryItems, findEstimateNode, type EstimateRowItem, type EstimateTreeNode } from "../estimate-tree-data";
import { beginEstimateWorkshopDrag } from "../estimate-workshop-drag";
import { ResizableSidePanel } from "../ResizableSidePanel";
import { ComponentViewControls, type ComponentViewMode } from "../component-library-manager/LibraryFolderTree";
import { COMPONENT_VIEW_MODES } from "../component-library-manager/library-folder-tree-shared";
import { NewComponentForm } from "./NewComponentForm";
import { NewTemplateModal } from "./NewTemplateModal";
import {
  CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT,
  ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
  PROJECT_SOURCE_DRAG_MIME_TYPE,
  type CreateEstimateTemplateFromNodeEventDetail,
  type EstimateTemplate,
} from "./templates";
import type { NewComponentForm as NewComponentFormType } from "./types";
import {
  applyLibraryTreeOrder,
  buildLibraryTreeWithComponentRows,
  buildTemplatesSelectionNodes,
  buildTemplatesTreeNodes,
  filterTree,
  findLibrarySiblingOrder,
  findNode,
  getAllNodeIds,
  getCheckedProjectSourceTargets,
  getCheckedTemplateUnits,
  getTemplatesTreeAllNodeIds,
  LibraryTree,
  TemplatesTree,
  templatesTreeCategoryId,
  templatesTreeSectionId,
  type LibraryTreeNode,
  type LibraryTreeOrder,
} from "./tree";
import type { ComponentLibrarySupplierOption } from "./tree/buildLibraryTree";

// The single create-component modal, shared with the Components page: the
// estimate sidebar must not grow its own variant of this form.
const AddComponentModal = dynamic(() =>
  import("../component-library-manager/AddComponentModal").then((module) => module.AddComponentModal),
);
import {
  createComponent,
  defaultForm,
  getComponentDesignation,
  getComponentDiscipline,
  getComponentImageUrl,
  getComponentName,
  getComponentPrice,
  getStalenessLabel,
  getStalenessTone,
  isFormDirty,
  LIBRARY_FAVORITES_KEY,
  LIBRARY_PREFS_KEY,
  LIBRARY_RECENTS_KEY,
  LIBRARY_TREE_ORDER_KEY,
  pesoFormatter,
  readJsonStorage,
  safeSetJsonStorage,
  sanitizeComponentSourceUrl,
} from "./helpers";

const LIBRARY_TREE_TABS = [
  { id: "components", label: "Components" },
  { id: "templates", label: "Templates" },
] as const;

const EMPTY_REUSABLE_PROJECT_SOURCES: ReusableEstimateSource[] = [];
const PROJECT_ESTIMATE_SOURCE_NODE_PREFIX = "source-estimate-";

type EstimateLibraryTab = (typeof LIBRARY_TREE_TABS)[number]["id"];
type EstimateComponentTreeTab = "categories" | "suppliers" | "brands";
type ProjectSourceScope = "all" | "current-project";
type TemplateSourceFilter = "all" | "custom" | "projects";

function getComponentTreeTab(mode: ComponentViewMode): EstimateComponentTreeTab {
  if (mode === "brand") return "brands";
  return mode === "suppliers" ? "suppliers" : "categories";
}

/* ─── Preview Panel ─── */

function PreviewPanel({
  item,
  onClose,
  onAdd,
  onEdit,
  onDuplicate,
  onFavorite,
  onDelete,
  addDisabled,
  addLabel,
  insertQuantity,
  onInsertQuantityChange,
}: {
  item: EstimateRowItem;
  onClose: () => void;
  onAdd: (quantity?: number) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  addDisabled: boolean;
  addLabel: string;
  insertQuantity: number;
  onInsertQuantityChange: (quantity: number) => void;
}) {
  const stalenessTone = getStalenessTone(item.pricingDate);
  const stalenessLabel = getStalenessLabel(item.pricingDate);
  const sourceHref = sanitizeComponentSourceUrl(item.sourceUrl);
  const stalenessClass =
    stalenessTone === "danger"
      ? "text-danger"
      : stalenessTone === "warning"
        ? "text-warning"
        : stalenessTone === "success"
          ? "text-success"
          : "text-tertiary";

  return (
    <div className="shrink-0 border-t border-hairline bg-white">
      <div className="flex items-start gap-2 p-2">
        <span
          className="block size-14 shrink-0 overflow-hidden border border-hairline bg-surfaceMuted bg-cover bg-center"
          style={{ backgroundImage: `url(${getComponentImageUrl(item)})` }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <h3 className="truncate text-[11px] font-medium text-ink">{getComponentName(item)}</h3>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-5 shrink-0 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
              aria-label="Close component preview"
              onClick={onClose}
            >
              <X size={11} />
            </Button>
          </div>
          <p className="text-[9px] font-medium text-tertiary">
            {item.category} · {item.supplier || "No supplier"}
          </p>
          <p className="mt-0.5 font-sans text-[10px] font-medium tabular-nums text-ink">
            {pesoFormatter.format(getComponentPrice(item))} / {item.unit}
          </p>
          <p className={cn("mt-0.5 truncate text-[8px] font-medium leading-3", stalenessClass)}>
            {item.pricingSource || item.supplier || "Library"}
            {stalenessLabel ? ` · ${stalenessLabel}` : ""}
          </p>
        </div>
      </div>
      <div className="px-2 pb-2">
        <p className="line-clamp-3 text-[9px] leading-4 text-secondary/70">{item.description || "No description."}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Badge size="xs">
            {getComponentDiscipline(item)}
          </Badge>
          <Badge size="xs">
            {getComponentDesignation(item)}
          </Badge>
          {item.isCustom ? <Badge size="xs" tone="accent">Custom</Badge> : null}
          {item.tags?.map((tag) => (
            <Badge key={tag} size="xs">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-[44px_1fr_1fr_1fr] gap-1">
          <input
            type="number"
            min={1}
            value={insertQuantity}
            aria-label="Insert quantity"
            onChange={(event) => onInsertQuantityChange(Math.max(1, Number.parseInt(event.target.value, 10) || 1))}
            className="h-6 border border-hairline bg-white px-1 text-center text-[9px] font-medium tabular-nums text-ink outline-none focus:border-accent"
          />
          <Button onClick={() => onAdd(insertQuantity)} disabled={addDisabled} aria-label={addLabel} title={addLabel} className="h-6 min-h-6 text-[9px]">
            {addDisabled ? "Select area" : `Add ×${insertQuantity}`}
          </Button>
          <Button variant="secondary" onClick={onEdit} className="h-6 min-h-6 text-[9px]">
            Edit
          </Button>
          <Button variant="secondary" onClick={onDuplicate} className="h-6 min-h-6 text-[9px]">
            Duplicate
          </Button>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-1">
          <Button variant="secondary" onClick={onFavorite} className="h-6 min-h-6 text-[9px]">
            {item.isFavorite ? "Unfavorite" : "Favorite"}
          </Button>
          <Button variant="danger" onClick={onDelete} className="h-6 min-h-6 text-[9px]">
            Delete
          </Button>
        </div>
        {item.notes || sourceHref ? (
          <p className="mt-1.5 text-[9px] leading-3 text-tertiary">
            {item.notes} {sourceHref ? <a href={sourceHref} target="_blank" rel="noreferrer" className="text-accent hover:underline">Source</a> : null}
          </p>
        ) : null}
      </div>
    </div>
  );
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
  return source.nodeKind === "group" ? "Group" : "Area";
}

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
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
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
  const tabName =
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
    <div className="shrink-0 border-t border-hairline bg-white" role="region" aria-label="Project source preview">
      <div className="flex items-start gap-2 p-2">
        <div className="flex size-14 shrink-0 items-center justify-center border border-hairline bg-accent-soft text-accent">
          <StackSimple size={18} weight="regular" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <h3 className="truncate text-[11px] font-medium text-ink">{source.name}</h3>
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
            <Badge size="xs" tone="info">Live source</Badge>
            <Badge size="xs">Read-through source</Badge>
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
            Live project metadata will appear here when this source supplies it.
          </p>
        )}
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
    </div>
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
  onInsertProjectSource?: (source: ProjectSourceInsertTarget) => boolean | void;
  categoryTree?: ComponentLibraryTaxonomyNode[];
  suppliers?: ComponentLibrarySupplierOption[];
  brands?: ComponentLibraryBrand[];
  libraryFolders?: LibraryFolderRecord[];
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

const EMPTY_LIBRARY_TREE_ORDER: Record<ComponentViewMode, LibraryTreeOrder> = { default: {}, suppliers: {}, brand: {} };

function buildLibrarySelectionNodes(nodes: LibraryTreeNode[]): TreeSelectionNode[] {
  return nodes.map((node) => ({
    id: node.id,
    selectable: true,
    children: node.children?.length ? buildLibrarySelectionNodes(node.children) : undefined,
  }));
}

function componentToForm(item: EstimateRowItem): NewComponentFormType {
  return {
    material: getComponentName(item),
    category: item.category ?? "",
    supplier: item.supplier ?? "",
    unit: item.unit ?? "pc",
    itemCost: String(getComponentPrice(item)),
    currency: item.currency ?? "PHP",
    discipline: getComponentDiscipline(item),
    designation: getComponentDesignation(item),
    description: item.description ?? "",
    tags: (item.tags ?? []).join(", "),
    imageUrl: item.imageUrl ?? "",
    miscCost: String(item.miscCost ?? 0),
    sku: item.sku ?? "",
    sourceUrl: item.sourceUrl ?? "",
    notes: item.notes ?? "",
  };
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

function findProjectEstimateSourceByNodeId(sources: ReusableEstimateSource[], nodeId: string): ProjectEstimateReusableSource | null {
  if (!nodeId.startsWith(PROJECT_ESTIMATE_SOURCE_NODE_PREFIX)) return null;
  const estimateId = nodeId.slice(PROJECT_ESTIMATE_SOURCE_NODE_PREFIX.length);
  return sources.find(
    (source): source is ProjectEstimateReusableSource => source.kind === "project-estimate" && source.estimateId === estimateId,
  ) ?? null;
}

function hasReusableEstimateOutline(sources: ReusableEstimateSource[], estimateId: string) {
  return sources.some((source) =>
    (source.kind === "project-tab" || source.kind === "project-node") && source.estimateId === estimateId,
  );
}

function sourceBelongsToProject(source: ReusableEstimateSource, projectId: string) {
  return source.kind === "custom-template" || source.projectId === projectId;
}

export function EstimateRightSidebar({
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
  templates = [],
  projectSources = EMPTY_REUSABLE_PROJECT_SOURCES,
  onInsertProjectSource,
  categoryTree = componentCategoryTree,
  suppliers = [],
  brands = [],
  libraryFolders = [],
  onLibraryDataChanged,
  templateCreateMode = "estimate-node",
}: EstimateRightSidebarProps = {}) {
  const { selectedNodeId: activeSelectedNodeId } = useEstimateWorkspaceSelection(estimateId, selectedNodeId);
  // Initial state must not read localStorage: SSR renders the fallbacks, so a
  // storage-aware initializer makes the client's first render diverge and
  // throws a hydration mismatch. Stored prefs apply in the mount effect below.
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [libraryItems, setLibraryItems] = useState<EstimateRowItem[]>(() =>
    initialLibraryItems.map((item, index) => ({
      ...item,
      createdAt: item.createdAt ?? new Date(Date.now() - (index % 18) * 86400000).toISOString(),
      discipline: getComponentDiscipline(item),
      designation: getComponentDesignation(item),
      tags: item.tags ?? [item.category, item.supplier, getComponentDiscipline(item)].filter(Boolean),
    })),
  );

  const [activeTab, setActiveTab] = useState<EstimateLibraryTab>("components");
  const [componentViewMode, setComponentViewMode] = useState<ComponentViewMode>("default");
  const [viewModeMenuOpen, setViewModeMenuOpen] = useState(false);
  const [expandedNodeIdsByViewMode, setExpandedNodeIdsByViewMode] = useState<Record<ComponentViewMode, string[]>>(() => ({
    default: getAllNodeIds(buildLibraryTreeWithComponentRows("categories", initialLibraryItems, [], [], { categoryTree, suppliers })),
    suppliers: [],
    brand: getAllNodeIds(buildLibraryTreeWithComponentRows("brands", initialLibraryItems, [], [], { categoryTree, suppliers, brands })),
  }));
  // Like libraryItems, the template list seeds from the server prop once and
  // then evolves locally (created templates append without a route refresh).
  const [templateList, setTemplateList] = useState<EstimateTemplate[]>(templates);
  const [loadedProjectSources, setLoadedProjectSources] = useState<ReusableEstimateSource[]>(projectSources);
  const [projectSourceScope, setProjectSourceScope] = useState<ProjectSourceScope>("all");
  const [templateSourceFilter, setTemplateSourceFilter] = useState<TemplateSourceFilter>("all");
  const [projectSourcesLoading, setProjectSourcesLoading] = useState(false);
  const [projectSourcesError, setProjectSourcesError] = useState("");
  const [projectOutlineLoadingEstimateIds, setProjectOutlineLoadingEstimateIds] = useState<string[]>([]);
  const [projectOutlineErrors, setProjectOutlineErrors] = useState<Record<string, string>>({});
  const [templatesExpandedIds, setTemplatesExpandedIds] = useState<string[]>(() =>
    Array.from(new Set([
      templatesTreeSectionId("custom-templates"),
      templatesTreeSectionId("projects"),
      ...templates.map((template) => templatesTreeCategoryId(template.category)),
    ])),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [previewProjectSourceKey, setPreviewProjectSourceKey] = useState<string | null>(null);
  const [bulkSelectedNodeIds, setBulkSelectedNodeIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [customOrderByViewMode, setCustomOrderByViewMode] = useState<Record<ComponentViewMode, LibraryTreeOrder>>(
    () => EMPTY_LIBRARY_TREE_ORDER,
  );
  const [showNewComponent, setShowNewComponent] = useState(false);
  const [addComponentOpen, setAddComponentOpen] = useState(false);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  // "Save as template" from the sheets tree targets the right-clicked node
  // instead of the current selection; categories prefill from their menu.
  const [templateSourceNodeId, setTemplateSourceNodeId] = useState<string | null>(null);
  const [templateDefaultCategory, setTemplateDefaultCategory] = useState<string | null>(null);
  const [renameTemplateTarget, setRenameTemplateTarget] = useState<EstimateTemplate | null>(null);
  const [renameTemplateName, setRenameTemplateName] = useState("");
  const [renameTemplateError, setRenameTemplateError] = useState("");
  const [renameTemplatePending, setRenameTemplatePending] = useState(false);
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<EstimateTemplate | null>(null);
  const [deleteTemplateError, setDeleteTemplateError] = useState("");
  const [deleteTemplatePending, setDeleteTemplatePending] = useState(false);
  const [form, setForm] = useState<NewComponentFormType>(defaultForm);
  const [formError, setFormError] = useState("");
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<EstimateRowItem | null>(null);
  const [deletedItems, setDeletedItems] = useState<EstimateRowItem[]>([]);
  const [insertQuantity, setInsertQuantity] = useState(1);
  const [lastActionMessage, setLastActionMessage] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const treeHeaderRef = useRef<HTMLDivElement>(null);
  const deleteUndoTimerRef = useRef<number | null>(null);
  const libraryPrefsHydratedRef = useRef(false);

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
    setEditItemId(null);
  }, []);

  const closeNewComponent = useCallback(() => {
    if (isFormDirty(form) && !window.confirm("Discard component changes?")) return;
    setShowNewComponent(false);
    resetComponentForm();
  }, [form, resetComponentForm]);

  useEffect(() => {
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
      if (storedTreeOrder.default || storedTreeOrder.suppliers || storedTreeOrder.brand) {
        setCustomOrderByViewMode({
          default: storedTreeOrder.default ?? {},
          suppliers: storedTreeOrder.suppliers ?? {},
          brand: storedTreeOrder.brand ?? {},
        });
      }
      if (favoriteIds.length || storedRecentIds.length) {
        setRecentIds(storedRecentIds);
        setLibraryItems((items) =>
          items.map((item) => ({
            ...item,
            isFavorite: item.isFavorite || favoriteIds.includes(item.id),
            lastUsedAt: storedRecentIds.includes(item.id) ? new Date().toISOString() : item.lastUsedAt,
          })),
        );
        setExpandedNodeIdsByViewMode((current) => ({
          ...current,
          default: getAllNodeIds(buildLibraryTreeWithComponentRows("categories", initialLibraryItems, favoriteIds, storedRecentIds, { categoryTree, suppliers })),
          brand: getAllNodeIds(buildLibraryTreeWithComponentRows("brands", initialLibraryItems, favoriteIds, storedRecentIds, { categoryTree, suppliers, brands })),
        }));
      }

      const storedTab = storedPrefs.activeTab ?? legacyStoredTab;
      if (storedTab === "templates") setActiveTab("templates");

      const storedMode = storedPrefs.componentViewMode ?? legacyStoredTab;
      if (storedMode === "brand") setComponentViewMode("brand");
      else if (storedMode === "suppliers") setComponentViewMode("suppliers");
      libraryPrefsHydratedRef.current = true;
    });
    return () => {
      cancelled = true;
    };
    // Stored prefs hydrate exactly once, after the SSR markup is committed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Persisting before stored prefs hydrate would clobber them with the
    // defaults (Strict Mode runs this effect before the hydrate microtask).
    if (!libraryPrefsHydratedRef.current) return;
    safeSetJsonStorage(LIBRARY_PREFS_KEY, { activeTab, componentViewMode });
  }, [activeTab, componentViewMode]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const activeTag = document.activeElement?.tagName;
      if (
        event.key === "/" &&
        !showNewComponent &&
        !addComponentOpen &&
        !deleteCandidate &&
        !renameTemplateTarget &&
        !deleteTemplateTarget &&
        activeTag !== "INPUT" &&
        activeTag !== "TEXTAREA" &&
        activeTag !== "SELECT"
      ) {
        event.preventDefault();
        setSearchOpen(true);
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        if (viewModeMenuOpen) setViewModeMenuOpen(false);
        else if (bulkDeleteConfirmOpen) setBulkDeleteConfirmOpen(false);
        else if (deleteCandidate) setDeleteCandidate(null);
        else if (renameTemplateTarget) setRenameTemplateTarget(null);
        else if (deleteTemplateTarget) setDeleteTemplateTarget(null);
        else if (showNewComponent) closeNewComponent();
        else if (searchQuery) setSearchQuery("");
        else if (searchOpen) setSearchOpen(false);
        else if (previewProjectSourceKey) setPreviewProjectSourceKey(null);
        else if (previewItemId) setPreviewItemId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addComponentOpen, bulkDeleteConfirmOpen, closeNewComponent, deleteCandidate, deleteTemplateTarget, previewItemId, previewProjectSourceKey, renameTemplateTarget, searchOpen, searchQuery, showNewComponent, viewModeMenuOpen]);

  useEffect(() => {
    if (!viewModeMenuOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!treeHeaderRef.current?.contains(event.target as Node)) setViewModeMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [viewModeMenuOpen]);

  useEffect(() => {
    setLoadedProjectSources(projectSources);
    setProjectOutlineErrors({});
  }, [projectSources]);

  useEffect(() => {
    if (activeTab !== "templates" || !projectId || !estimateId || projectSources.length > 0) return;
    let cancelled = false;
    setProjectSourcesLoading(true);
    setProjectSourcesError("");
    listReusableProjectSources()
      .then((result) => {
        if (!cancelled) setLoadedProjectSources(result.sources);
      })
      .catch((error: unknown) => {
        if (!cancelled) setProjectSourcesError(error instanceof Error ? error.message : "Could not load project sources.");
      })
      .finally(() => {
        if (!cancelled) setProjectSourcesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, estimateId, projectId, projectSources.length]);

  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key === LIBRARY_FAVORITES_KEY) {
        const favoriteIds = readJsonStorage<string[]>(LIBRARY_FAVORITES_KEY, []);
        setLibraryItems((items) => items.map((item) => ({ ...item, isFavorite: favoriteIds.includes(item.id) })));
      }
      if (event.key === LIBRARY_RECENTS_KEY) {
        setRecentIds(readJsonStorage<string[]>(LIBRARY_RECENTS_KEY, []));
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    return () => {
      if (deleteUndoTimerRef.current) window.clearTimeout(deleteUndoTimerRef.current);
    };
  }, []);

  const favoriteIds = useMemo(() => libraryItems.filter((item) => item.isFavorite).map((item) => item.id), [libraryItems]);
  const componentTreeTab = getComponentTreeTab(componentViewMode);

  const treeNodes = useMemo(() => {
    if (activeTab === "templates") return [];
    const tree = buildLibraryTreeWithComponentRows(componentTreeTab, libraryItems, favoriteIds, recentIds, { categoryTree, suppliers, brands });
    return applyLibraryTreeOrder(tree, customOrderByViewMode[componentViewMode]);
  }, [activeTab, brands, categoryTree, componentTreeTab, componentViewMode, customOrderByViewMode, favoriteIds, libraryItems, recentIds, suppliers]);

  const filteredTreeNodes = useMemo(() => filterTree(treeNodes, searchQuery), [treeNodes, searchQuery]);

  const librarySelectionNodes = useMemo(() => buildLibrarySelectionNodes(treeNodes), [treeNodes]);
  const visibleProjectSources = useMemo(() => {
    if (projectSourceScope !== "current-project" || !projectId) return loadedProjectSources;
    return loadedProjectSources.filter((source) => sourceBelongsToProject(source, projectId));
  }, [loadedProjectSources, projectId, projectSourceScope]);
  const visibleTemplateList = useMemo(
    () => (templateSourceFilter === "projects" ? [] : templateList),
    [templateList, templateSourceFilter],
  );
  const visibleTemplateProjectSources = useMemo(
    () => (templateSourceFilter === "custom" ? [] : visibleProjectSources),
    [templateSourceFilter, visibleProjectSources],
  );
  const templatesSelectionNodes = useMemo(
    () => buildTemplatesSelectionNodes(visibleTemplateList, visibleTemplateProjectSources),
    [visibleTemplateList, visibleTemplateProjectSources],
  );
  const activeSelectionNodes = activeTab === "templates" ? templatesSelectionNodes : librarySelectionNodes;
  const previewProjectSource = useMemo(
    () => findProjectSourceByKey(visibleTemplateProjectSources, previewProjectSourceKey),
    [previewProjectSourceKey, visibleTemplateProjectSources],
  );
  const templatesAllNodeIds = useMemo(
    () => getTemplatesTreeAllNodeIds(buildTemplatesTreeNodes(visibleTemplateList, visibleTemplateProjectSources)),
    [visibleTemplateList, visibleTemplateProjectSources],
  );
  const templatesProjectSourceEmptyState = useMemo(() => {
    if (projectSourcesLoading) {
      return (
        <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted/30 p-2 text-[10px] leading-4 text-tertiary">
          Loading project sources…
        </div>
      );
    }
    if (projectSourcesError) {
      return (
        <div className="rounded-xs border border-dashed border-danger/30 bg-danger/5 p-2 text-[10px] leading-4 text-danger">
          Couldn&apos;t load project sources. {projectSourcesError}
        </div>
      );
    }
    return undefined;
  }, [projectSourcesError, projectSourcesLoading]);
  const templatesProjectSourceStatus = useMemo(() => {
    const loadingCount = projectOutlineLoadingEstimateIds.length;
    const errors = Object.values(projectOutlineErrors);
    if (loadingCount > 0) {
      return (
        <div className="mb-2 rounded-xs border border-dashed border-hairline bg-surfaceMuted/30 p-2 text-[10px] leading-4 text-tertiary">
          Loading {loadingCount === 1 ? "estimate outline" : `${loadingCount} estimate outlines`}…
        </div>
      );
    }
    if (errors.length > 0) {
      return (
        <div className="mb-2 rounded-xs border border-dashed border-danger/30 bg-danger/5 p-2 text-[10px] leading-4 text-danger">
          Couldn&apos;t load estimate outline. {errors[0]}
        </div>
      );
    }
    return null;
  }, [projectOutlineErrors, projectOutlineLoadingEstimateIds.length]);
  const templatesProjectSourceScopeControls = useMemo(() => {
    if (
      templateSourceFilter === "custom" ||
      !projectId ||
      loadedProjectSources.every((source) => source.kind === "custom-template")
    ) return null;
    return (
      <div className="mb-2 flex gap-1" role="group" aria-label="Project source scope">
        <Button
          type="button"
          variant="outline"
          size="xs"
          aria-pressed={projectSourceScope === "all"}
          className="min-h-6 min-w-0 flex-1 px-2 py-1"
          onClick={() => setProjectSourceScope("all")}
        >
          All projects
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          aria-pressed={projectSourceScope === "current-project"}
          className="min-h-6 min-w-0 flex-1 px-2 py-1"
          onClick={() => setProjectSourceScope("current-project")}
        >
          Current project only
        </Button>
      </div>
    );
  }, [loadedProjectSources, projectId, projectSourceScope, templateSourceFilter]);
  const handleTemplateSourceFilterChange = useCallback((nextFilter: TemplateSourceFilter) => {
    setTemplateSourceFilter(nextFilter);
    setBulkSelectedNodeIds(new Set());
    if (nextFilter === "custom") setPreviewProjectSourceKey(null);
  }, []);
  const templatesSourceFilterControls = useMemo(() => {
    const hasCustomTemplates = templateList.length > 0;
    const hasProjectSources = loadedProjectSources.some((source) => source.kind !== "custom-template") || projectSourcesLoading;
    if (!hasCustomTemplates || !hasProjectSources) return null;
    const filters: Array<{ id: TemplateSourceFilter; label: string }> = [
      { id: "all", label: "All sources" },
      { id: "custom", label: "Custom templates" },
      { id: "projects", label: "Project sources" },
    ];
    return (
      <div className="mb-2 flex gap-1" role="group" aria-label="Reusable source filter">
        {filters.map((filter) => (
          <Button
            key={filter.id}
            type="button"
            variant="outline"
            size="xs"
            aria-pressed={templateSourceFilter === filter.id}
            className="min-h-6 min-w-0 flex-1 px-2 py-1"
            onClick={() => handleTemplateSourceFilterChange(filter.id)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
    );
  }, [handleTemplateSourceFilterChange, loadedProjectSources, projectSourcesLoading, templateList.length, templateSourceFilter]);
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

  const clearBulkSelection = useCallback(() => {
    setBulkSelectedNodeIds(new Set());
  }, []);

  const handleBulkCheckToggle = useCallback(
    (nodeId: string, checked: boolean) => {
      setBulkSelectedNodeIds((current) => toggleCascadeSelection(activeSelectionNodes, current, nodeId, checked));
    },
    [activeSelectionNodes],
  );

  // Drop selections whose nodes left the tree (deletes, view-mode switches).
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setBulkSelectedNodeIds((current) => {
        const next = pruneSelection(activeSelectionNodes, current);
        if (next.size === current.size && [...next].every((id) => current.has(id))) return current;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [activeSelectionNodes]);

  const previewItem = libraryItems.find((item) => item.id === previewItemId) ?? null;

  const persistFavorites = useCallback((items: EstimateRowItem[]) => {
    safeSetJsonStorage(LIBRARY_FAVORITES_KEY, items.filter((item) => item.isFavorite).map((item) => item.id));
  }, []);

  const insertLibraryItems = useCallback(
    (itemsToInsert: EstimateRowItem[], sourceItems = itemsToInsert) => {
      if (!canInsert) {
        setLastActionMessage("Select an Area Node before adding library components.");
        return false;
      }
      if (!itemsToInsert.length) return false;

      const insertedItems = itemsToInsert.filter((item) => {
        const insertItem = { ...item, quantity: Math.max(1, item.quantity) };
        return onInsertComponent
          ? onInsertComponent(insertItem) !== false
          : window.dispatchEvent(new CustomEvent("archestimator:add-library-item", { detail: insertItem }));
      });

      if (!insertedItems.length) {
        setLastActionMessage(`${itemsToInsert.length === 1 ? getComponentName(itemsToInsert[0]) : "Selected components"} was not inserted. Select an Area Node and try again.`);
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
    [canInsert, effectiveSelectedName, onInsertComponent],
  );

  const addComponent = useCallback(
    (item: EstimateRowItem, quantity = 1) => {
      return insertLibraryItems([{ ...item, quantity: Math.max(1, quantity) }], [item]);
    },
    [insertLibraryItems],
  );

  const addTemplate = useCallback(
    (template: EstimateTemplate) => {
      if (!canInsertTemplate) {
        setLastActionMessage("Select a Group Node before adding estimate templates.");
        return false;
      }

      const didInsert = onInsertTemplate
        ? onInsertTemplate(template) !== false
        : window.dispatchEvent(new CustomEvent("archestimator:add-estimate-template", { detail: template }));
      if (!didInsert) {
        setLastActionMessage(`${template.name} was not inserted. Select a Group Node and try again.`);
        return false;
      }

      setLastActionMessage(`${template.name} added${effectiveTemplateTargetName ? ` to ${effectiveTemplateTargetName}` : ""}.`);
      return true;
    },
    [canInsertTemplate, effectiveTemplateTargetName, onInsertTemplate],
  );

  const addTemplateNode = useCallback(
    (template: EstimateTemplate, templateNode: EstimateTreeNode) => {
      if (!canInsertTemplate) {
        setLastActionMessage("Select a Group Node before adding template nodes.");
        return false;
      }

      const didInsert = onInsertTemplateNode ? onInsertTemplateNode(template, templateNode) !== false : false;
      if (!didInsert) {
        setLastActionMessage(`${templateNode.name} was not inserted. Select a Group Node and try again.`);
        return false;
      }

      setLastActionMessage(`${templateNode.name} added${effectiveTemplateTargetName ? ` to ${effectiveTemplateTargetName}` : ""}.`);
      return true;
    },
    [canInsertTemplate, effectiveTemplateTargetName, onInsertTemplateNode],
  );

  const addProjectSource = useCallback(
    (source: ProjectSourceInsertTarget) => {
      if (!canInsertTemplate) {
        setLastActionMessage("Select a Group Node before adding project sources.");
        return false;
      }

      const didInsert = onInsertProjectSource ? onInsertProjectSource(source) !== false : false;
      if (!didInsert) {
        setLastActionMessage(`${source.name} was not inserted. Select a Group Node and try again.`);
        return false;
      }

      setLastActionMessage(`${source.name} added${effectiveTemplateTargetName ? ` to ${effectiveTemplateTargetName}` : ""}.`);
      return true;
    },
    [canInsertTemplate, effectiveTemplateTargetName, onInsertProjectSource],
  );

  const duplicateItem = useCallback((item: EstimateRowItem) => {
    const now = new Date().toISOString();
    setLibraryItems((items) => [
      { ...item, id: `custom-copy-${Date.now()}`, material: `${getComponentName(item)} copy`, name: `${getComponentName(item)} copy`, isCustom: true, createdAt: now, updatedAt: now },
      ...items,
    ]);
    setLastActionMessage(`${getComponentName(item)} duplicated.`);
  }, []);

  const toggleFavorite = useCallback(
    (item: EstimateRowItem) => {
      setLibraryItems((items) => {
        const next = items.map((row) => (row.id === item.id ? { ...row, isFavorite: !row.isFavorite } : row));
        persistFavorites(next);
        setLastActionMessage(`${getComponentName(item)} ${item.isFavorite ? "removed from" : "added to"} favorites.`);
        return next;
      });
    },
    [persistFavorites],
  );

  const startNewComponent = useCallback(() => {
    setAddComponentOpen(true);
  }, []);

  const startNewTemplate = useCallback(() => {
    setAddTemplateOpen(true);
  }, []);

  const startNewTemplateInCategory = useCallback((category: string) => {
    setTemplateDefaultCategory(category);
    setAddTemplateOpen(true);
  }, []);

  const handleAddTemplateOpenChange = useCallback((open: boolean) => {
    setAddTemplateOpen(open);
    if (!open) {
      setTemplateSourceNodeId(null);
      setTemplateDefaultCategory(null);
    }
  }, []);

  // "Save as template" from the sheets tree context menu: that panel cannot
  // host the modal, so it hands the source node over via a window event.
  useEffect(() => {
    function handleCreateTemplateFromNode(event: Event) {
      const detail = (event as CustomEvent<Partial<CreateEstimateTemplateFromNodeEventDetail>>).detail;
      if (typeof detail?.sourceNodeId !== "string" || !detail.sourceNodeId) return;
      setTemplateSourceNodeId(detail.sourceNodeId);
      setAddTemplateOpen(true);
    }
    window.addEventListener(CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT, handleCreateTemplateFromNode);
    return () => window.removeEventListener(CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT, handleCreateTemplateFromNode);
  }, []);

  const templateModalSourceNode = useMemo(() => {
    if (templateSourceNodeId) {
      return nodes?.length ? findEstimateNode(nodes, templateSourceNodeId) ?? null : null;
    }
    return selectedTargetNode;
  }, [nodes, selectedTargetNode, templateSourceNodeId]);

  const handleComponentCreated = useCallback((item: EstimateRowItem) => {
    setLibraryItems((items) => [item, ...items.filter((entry) => entry.id !== item.id)]);
    setPreviewItemId(item.id);
    setPreviewProjectSourceKey(null);
    setLastActionMessage(`${getComponentName(item)} created in the component library.`);
    onLibraryDataChanged?.();
  }, [onLibraryDataChanged]);

  const handleTemplateCreated = useCallback((template: EstimateTemplate) => {
    setTemplateList((current) => [...current.filter((entry) => entry.id !== template.id), template]);
    setActiveTab("templates");
    setTemplatesExpandedIds((current) => Array.from(new Set([
      ...current,
      templatesTreeSectionId("custom-templates"),
      templatesTreeCategoryId(template.category),
    ])));
    setLastActionMessage(`${template.name} saved to templates.`);
    onLibraryDataChanged?.();
  }, [onLibraryDataChanged]);

  const startRenameTemplate = useCallback((template: EstimateTemplate) => {
    setRenameTemplateTarget(template);
    setRenameTemplateName(template.name);
    setRenameTemplateError("");
  }, []);

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
  }, [onLibraryDataChanged, renameTemplateName, renameTemplatePending, renameTemplateTarget]);

  const startDeleteTemplate = useCallback((template: EstimateTemplate) => {
    setDeleteTemplateTarget(template);
    setDeleteTemplateError("");
  }, []);

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
  }, [deleteTemplatePending, deleteTemplateTarget, onLibraryDataChanged]);

  const startEditComponent = useCallback((item: EstimateRowItem) => {
    setForm(componentToForm(item));
    setFormError("");
    setEditItemId(item.id);
    setShowNewComponent(true);
  }, []);

  const saveNewComponent = useCallback(
    (addNow = false) => {
      const result = createComponent(form);
      if (result.error || !result.component) {
        setFormError(result.error ?? "Could not save component.");
        return;
      }
      const nextComponent = editItemId
        ? {
            ...result.component,
            id: editItemId,
            isCustom: true,
            createdAt: libraryItems.find((item) => item.id === editItemId)?.createdAt ?? result.component.createdAt,
            updatedAt: new Date().toISOString(),
          }
        : result.component;
      setLibraryItems((items) => (editItemId ? items.map((item) => (item.id === editItemId ? nextComponent : item)) : [nextComponent, ...items]));
      setShowNewComponent(false);
      resetComponentForm();
      setPreviewItemId(nextComponent.id);
      setPreviewProjectSourceKey(null);
      setLastActionMessage(`${getComponentName(nextComponent)} ${editItemId ? "updated" : "created"}.`);
      if (addNow) addComponent(nextComponent);
      onLibraryDataChanged?.();
    },
    [addComponent, editItemId, form, libraryItems, onLibraryDataChanged, resetComponentForm],
  );

  const deleteLibraryItem = useCallback((item: EstimateRowItem) => {
    setLibraryItems((items) => items.filter((entry) => entry.id !== item.id));
    setDeleteCandidate(null);
    setDeletedItems([item]);
    setLastActionMessage(`${getComponentName(item)} deleted. Undo is available.`);
    if (deleteUndoTimerRef.current) window.clearTimeout(deleteUndoTimerRef.current);
    deleteUndoTimerRef.current = window.setTimeout(() => setDeletedItems([]), 5000);
    onLibraryDataChanged?.();
  }, [onLibraryDataChanged]);

  const undoDelete = useCallback(() => {
    if (!deletedItems.length) return;
    setLibraryItems((items) => [...deletedItems, ...items]);
    setLastActionMessage(deletedItems.length === 1 ? `${getComponentName(deletedItems[0])} restored.` : `${deletedItems.length} components restored.`);
    setDeletedItems([]);
    if (deleteUndoTimerRef.current) window.clearTimeout(deleteUndoTimerRef.current);
    onLibraryDataChanged?.();
  }, [deletedItems, onLibraryDataChanged]);

  const handleTabChange = useCallback((tab: EstimateLibraryTab) => {
    setActiveTab(tab);
    setSearchQuery("");
    setSearchOpen(false);
    setPreviewItemId(null);
    setPreviewProjectSourceKey(null);
    setTemplateSourceFilter("all");
    setViewModeMenuOpen(false);
    setBulkSelectedNodeIds(new Set());
  }, []);

  const handleComponentViewModeChange = useCallback((mode: ComponentViewMode) => {
    setComponentViewMode(mode);
    setActiveTab("components");
    setSearchQuery("");
    setSearchOpen(false);
    setPreviewItemId(null);
    setPreviewProjectSourceKey(null);
    setViewModeMenuOpen(false);
    setBulkSelectedNodeIds(new Set());
  }, []);

  const handleToggleNode = useCallback((nodeId: string) => {
    setExpandedNodeIdsByViewMode((current) => {
      const ids = current[componentViewMode];
      const next = ids.includes(nodeId) ? ids.filter((id) => id !== nodeId) : [...ids, nodeId];
      return { ...current, [componentViewMode]: next };
    });
  }, [componentViewMode]);

  const handleLibraryReorder = useCallback(
    (draggedId: string, targetId: string, position: "before" | "after") => {
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
    [componentViewMode, customOrderByViewMode, treeNodes],
  );

  const handleBulkAddSelected = useCallback(() => {
    if (bulkSelectedItems.length === 0) return;
    if (insertLibraryItems(bulkSelectedItems)) clearBulkSelection();
  }, [bulkSelectedItems, clearBulkSelection, insertLibraryItems]);

  const handleBulkAddSelectedTemplates = useCallback(() => {
    const { templates: checkedTemplates, templateNodes, items } = bulkTemplateUnits;
    let insertedCount = 0;
    if (canInsertTemplate) {
      checkedTemplates.forEach((template) => {
        if (addTemplate(template)) insertedCount += 1;
      });
      templateNodes.forEach(({ template, node }) => {
        if (addTemplateNode(template, node)) insertedCount += 1;
      });
      bulkProjectSourceTargets.forEach((source) => {
        if (addProjectSource(source)) insertedCount += 1;
      });
    }
    if (items.length > 0 && insertLibraryItems(items)) insertedCount += items.length;
    if (insertedCount === 0) return;
    if (insertedCount > 1) setLastActionMessage(`${insertedCount} reusable selections added.`);
    clearBulkSelection();
  }, [
    addProjectSource,
    addTemplate,
    addTemplateNode,
    bulkProjectSourceTargets,
    bulkTemplateUnits,
    canInsertTemplate,
    clearBulkSelection,
    insertLibraryItems,
  ]);

  const handleConfirmBulkDelete = useCallback(() => {
    if (bulkSelectedItems.length === 0) {
      setBulkDeleteConfirmOpen(false);
      return;
    }
    const deletedItemIds = new Set(bulkSelectedItems.map((item) => item.id));
    setLibraryItems((items) => items.filter((entry) => !deletedItemIds.has(entry.id)));
    setDeletedItems(bulkSelectedItems);
    setBulkDeleteConfirmOpen(false);
    clearBulkSelection();
    setPreviewItemId((current) => (current && deletedItemIds.has(current) ? null : current));
    setLastActionMessage(
      `${bulkSelectedItems.length} ${bulkSelectedItems.length === 1 ? "component" : "components"} deleted. Undo is available.`,
    );
    if (deleteUndoTimerRef.current) window.clearTimeout(deleteUndoTimerRef.current);
    deleteUndoTimerRef.current = window.setTimeout(() => setDeletedItems([]), 5000);
    onLibraryDataChanged?.();
  }, [bulkSelectedItems, clearBulkSelection, onLibraryDataChanged]);

  const handleExpandAll = useCallback(() => {
    if (activeTab === "templates") {
      setTemplatesExpandedIds(templatesAllNodeIds);
      return;
    }
    setExpandedNodeIdsByViewMode((current) => ({
      ...current,
      [componentViewMode]: getAllNodeIds(treeNodes),
    }));
  }, [activeTab, componentViewMode, templatesAllNodeIds, treeNodes]);

  const handleCollapseAll = useCallback(() => {
    if (activeTab === "templates") {
      setTemplatesExpandedIds([]);
      return;
    }
    setExpandedNodeIdsByViewMode((current) => ({
      ...current,
      [componentViewMode]: [],
    }));
  }, [activeTab, componentViewMode]);

  const handleTemplatesToggle = useCallback((nodeId: string) => {
    const isExpanded = templatesExpandedIds.includes(nodeId);
    setTemplatesExpandedIds((current) =>
      current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId],
    );
    if (isExpanded) return;

    const source = findProjectEstimateSourceByNodeId(loadedProjectSources, nodeId);
    if (!source) return;
    if (hasReusableEstimateOutline(loadedProjectSources, source.estimateId)) return;
    if (projectOutlineLoadingEstimateIds.includes(source.estimateId)) return;

    setProjectOutlineLoadingEstimateIds((current) =>
      current.includes(source.estimateId) ? current : [...current, source.estimateId],
    );
    setProjectOutlineErrors((current) => {
      const next = { ...current };
      delete next[source.estimateId];
      return next;
    });
    getReusableEstimateOutline({ projectId: source.projectId, estimateId: source.estimateId })
      .then((result) => {
        setLoadedProjectSources((current) => mergeReusableProjectSources(current, result.sources, source.estimateId));
      })
      .catch((error: unknown) => {
        setProjectOutlineErrors((current) => ({
          ...current,
          [source.estimateId]: error instanceof Error ? error.message : "Could not load estimate outline.",
        }));
      })
      .finally(() => {
        setProjectOutlineLoadingEstimateIds((current) => current.filter((estimateId) => estimateId !== source.estimateId));
      });
  }, [loadedProjectSources, projectOutlineLoadingEstimateIds, templatesExpandedIds]);

  const handleItemDragStart = useCallback((event: React.DragEvent<HTMLElement>, item: EstimateRowItem | undefined) => {
    if (!item) return;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-archestimator-library-item", JSON.stringify(item));
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
      dragGhost.textContent = `${templateNode.name} · template ${templateNode.kind === "group" ? "group" : "area"}`;
      document.body.appendChild(dragGhost);
      event.dataTransfer.setDragImage(dragGhost, 12, 12);
      window.setTimeout(() => dragGhost.remove(), 0);
    },
    [],
  );

  const handleProjectSourceDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>, source: ProjectSourceInsertTarget) => {
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
      event.dataTransfer.setData("text/plain", source.name);
      beginEstimateWorkshopDrag({ kind: "project-source", sourceName: source.name });

      const dragGhost = document.createElement("div");
      dragGhost.className = "fixed -top-96 left-0 border border-hairline bg-white px-2 py-1 text-[10px] font-medium text-ink shadow-lg";
      dragGhost.textContent = `${source.name} · project source`;
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

  return (
    <ResizableSidePanel side="right" ariaLabel="Library" storageKey="estimate_component_library_width_v2" defaultWidth={380} minWidth={360} maxWidth={560}>
      {/* group/tree on the panel keeps the tree's drag/select rail space open
          while the pointer or focus is anywhere in this sidebar, matching the
          estimate tree's behavior. */}
      <aside className="group/tree flex h-full min-h-0 min-w-[320px] flex-col border-l border-hairline bg-white !text-[10px]">
        {/* Sticky header */}
        <TreePanelHeader
          ref={treeHeaderRef}
          ariaLabel="Library tree tools"
          labelPrefix="library tree"
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          searchValue={searchQuery}
          onSearchValueChange={setSearchQuery}
          searchPlaceholder="Search Library Tree"
          searchLabel="Search Library Tree"
          searchOpen={searchOpen}
          onSearchOpenChange={setSearchOpen}
          searchInputRef={searchRef}
          leadingActions={[
            {
              label: `View by: ${COMPONENT_VIEW_MODES.find((item) => item.id === componentViewMode)?.label ?? "Default"}`,
              icon: <SquaresFour size={12} weight="regular" aria-hidden="true" />,
              onClick: () => setViewModeMenuOpen((current) => !current),
              pressed: viewModeMenuOpen,
              disabled: activeTab !== "components",
            },
          ]}
          leadingActionsLabel="Component tree view mode"
          addActions={[
            {
              label: "Add Component",
              icon: <PlusSquare size={13} weight="regular" aria-hidden="true" />,
              onClick: startNewComponent,
            },
            {
              label: "Add Template",
              icon: <StackPlus size={13} weight="regular" aria-hidden="true" />,
              onClick: startNewTemplate,
            },
          ]}
          tabs={LIBRARY_TREE_TABS}
          activeTab={activeTab}
          tabsAriaLabel="Library tree views"
          onTabChange={(tab) => handleTabChange(tab as EstimateLibraryTab)}
        >
          {activeTab === "components" && viewModeMenuOpen ? (
            <ComponentViewControls
              mode={componentViewMode}
              ariaLabel="Component view mode"
              onModeChange={handleComponentViewModeChange}
              className="top-[40px]"
            />
          ) : null}
        </TreePanelHeader>

        {/* Scrollable tree with a floating bulk-action dock */}
        <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto">
          <div className={cn("p-2", bulkSelectionCount > 0 && "pb-16")}>
            {activeTab === "templates" ? (
              <>
                {templatesProjectSourceStatus}
                {templatesSourceFilterControls}
                {templatesProjectSourceScopeControls}
                <TemplatesTree
                  templates={visibleTemplateList}
                  projectSources={visibleTemplateProjectSources}
                  searchQuery={searchQuery}
                  expandedNodeIds={templatesExpandedIds}
                  onToggle={handleTemplatesToggle}
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
                expandedNodeIds={expandedNodeIdsByViewMode[componentViewMode]}
                searchQuery={searchQuery}
                onToggle={handleToggleNode}
                onItemAdd={(item) => { if (item) addComponent(item); }}
                onItemPreview={(itemId) => {
                  setPreviewProjectSourceKey(null);
                  setPreviewItemId(itemId);
                }}
                onItemEdit={startEditComponent}
                onItemDuplicate={duplicateItem}
                onItemToggleFavorite={toggleFavorite}
                onItemDelete={setDeleteCandidate}
                onCreateComponent={startNewComponent}
                addDisabled={!canInsert}
                addLabel={targetLabel}
                onItemDragStart={handleItemDragStart}
                selectable
                checkedIds={bulkSelectedIds}
                onCheckToggle={handleBulkCheckToggle}
                onReorder={handleLibraryReorder}
                reorderDisabled={searchQuery.trim().length > 0}
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
            activeTab === "templates"
              ? [
                  {
                    label: "Add selected to estimate",
                    icon: <Plus size={12} weight="regular" />,
                    disabled:
                      (!canInsertTemplate || (bulkTemplateUnitCount === 0 && bulkProjectSourceTargetCount === 0)) &&
                      (!canInsert || bulkTemplateUnits.items.length === 0),
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
                  {
                    label: "Delete selected components",
                    icon: <Trash size={12} weight="regular" />,
                    variant: "danger",
                    disabled: bulkSelectedItems.length === 0,
                    onClick: () => setBulkDeleteConfirmOpen(true),
                  },
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
            onEdit={() => startEditComponent(previewItem)}
            onDuplicate={() => duplicateItem(previewItem)}
            onFavorite={() => toggleFavorite(previewItem)}
            onDelete={() => setDeleteCandidate(previewItem)}
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
                : "Select a Group Node before adding project sources"
            }
          />
        ) : null}

        {/* Create flow: the shared Components-page modal. */}
        {addComponentOpen ? (
          <AddComponentModal
            open={addComponentOpen}
            folders={libraryFolders}
            categoryTree={categoryTree}
            suppliers={suppliers}
            brands={brands}
            libraryItems={libraryItems}
            selectedFolderId={null}
            onOpenChange={setAddComponentOpen}
            onComponentCreated={handleComponentCreated}
          />
        ) : null}

        {/* Create flow: save an estimate node (selected, or handed over by
            the sheets tree context menu) as a template. */}
        {addTemplateOpen ? (
          <NewTemplateModal
            open={addTemplateOpen}
            onOpenChange={handleAddTemplateOpenChange}
            mode={templateCreateMode}
            projectId={projectId}
            estimateId={estimateId}
            sourceNode={templateModalSourceNode}
            existingCategories={Array.from(new Set(templateList.map((template) => template.category))).sort()}
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

        {deletedItems.length ? (
          <div className="absolute right-2 bottom-2 z-30 max-w-72 border border-hairline bg-white p-2 shadow-xl">
            <p className="text-[9px] font-medium text-ink">
              {deletedItems.length === 1 ? `${getComponentName(deletedItems[0])} deleted.` : `${deletedItems.length} components deleted.`}
            </p>
            <Button type="button" variant="secondary" size="sm" className="mt-1 h-6 min-h-6 text-[9px]" onClick={undoDelete}>
              Undo
            </Button>
          </div>
        ) : null}

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {lastActionMessage}
        </div>

        {/* Bulk delete confirmation */}
        {bulkDeleteConfirmOpen ? (
          <div className="absolute inset-0 z-40 grid place-items-center bg-black/25 p-4">
            <div role="alertdialog" aria-modal="true" className="w-full max-w-72 border border-hairline bg-white p-3 shadow-xl">
              <h3 className="text-[11px] font-medium text-ink">
                Delete {bulkSelectedItems.length} selected {bulkSelectedItems.length === 1 ? "component" : "components"}?
              </h3>
              <p className="mt-1 text-[9px] leading-4 text-tertiary">
                Removes them from this local library view. Existing estimate rows stay unchanged, and Undo is available for a few seconds.
              </p>
              <div className="mt-3 flex justify-end gap-1">
                <Button variant="secondary" size="sm" className="h-6 min-h-6 text-[9px]" onClick={() => setBulkDeleteConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" className="h-6 min-h-6 text-[9px]" onClick={handleConfirmBulkDelete}>
                  Delete selected
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Rename template */}
        {renameTemplateTarget ? (
          <div className="absolute inset-0 z-40 grid place-items-center bg-black/25 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Rename template ${renameTemplateTarget.name}`}
              className="w-full max-w-72 border border-hairline bg-white p-3 shadow-xl"
            >
              <h3 className="text-[11px] font-medium text-ink">Rename template</h3>
              <ControlInput
                value={renameTemplateName}
                aria-label="Template name"
                aria-invalid={renameTemplateError ? "true" : undefined}
                autoFocus
                className="mt-2 h-7 border border-hairline bg-white px-2 !text-[10px] font-medium text-ink outline-none transition focus:border-accent"
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
                  onClick={() => setRenameTemplateTarget(null)}
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
            </div>
          </div>
        ) : null}

        {/* Delete template confirmation */}
        {deleteTemplateTarget ? (
          <div className="absolute inset-0 z-40 grid place-items-center bg-black/25 p-4">
            <div role="alertdialog" aria-modal="true" className="w-full max-w-72 border border-hairline bg-white p-3 shadow-xl">
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
                  onClick={() => setDeleteTemplateTarget(null)}
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
            </div>
          </div>
        ) : null}

        {/* Delete confirmation */}
        {deleteCandidate ? (
          <div className="absolute inset-0 z-40 grid place-items-center bg-black/25 p-4">
            <div role="alertdialog" aria-modal="true" className="w-full max-w-72 border border-hairline bg-white p-3 shadow-xl">
              <h3 className="text-[11px] font-medium text-ink">Delete component?</h3>
              <p className="mt-1 text-[9px] leading-4 text-tertiary">
                Remove {getComponentName(deleteCandidate)} from this local library view. Existing estimate rows stay unchanged.
              </p>
              <div className="mt-3 flex justify-end gap-1">
                <Button variant="secondary" size="sm" className="h-6 min-h-6 text-[9px]" onClick={() => setDeleteCandidate(null)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" className="h-6 min-h-6 text-[9px]" onClick={() => deleteLibraryItem(deleteCandidate)}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </ResizableSidePanel>
  );
}
