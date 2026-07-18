"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CaretLeft, FolderSimple } from "@phosphor-icons/react/dist/ssr";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { ControlInput } from "@/components/ui/control-input";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";
import {
  LibrarySurfaceVariantProvider,
  useLibrarySurfaceVariant,
} from "@/components/workshop/library/library-surface-variant";
import { librarySurfaceClass } from "@/components/workshop/library/library-surface-class";
import { useLibraryEditorChrome } from "@/hooks/use-library-editor-chrome";
import { useStableCallback } from "@/hooks/use-stable-callback";
import { loadCurrentWorkspaceComponentLibraryLite } from "@/lib/component-library/actions";
import {
  loadEstimateTemplateLinkedInstanceStatus,
  retryEstimateTemplateLinkedInstances,
} from "@/lib/component-library/template-editor-actions";
import { workspaceComponentLibraryLiteQueryKey } from "@/lib/component-library/query-keys";
import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import { cn } from "@/lib/ui/cn";
import { filterTemplatesByQuery, type EstimateTemplate } from "../../component-library/templates";
import { findFirstTemplateArea, findTemplateNode } from "./template-editor-model";
import {
  getTemplateStructureAllNodeIds,
  TEMPLATE_EDITOR_ROOT_NODE_ID,
} from "./template-structure-tree-model";
import { TemplateStructureTree } from "./TemplateStructureTree";
import { TemplateEditorSheet, type TemplateSheetHandlers } from "./TemplateEditorSheet";
import { useTemplateEditor } from "./use-template-editor";

const EstimateRightSidebar = dynamic(
  () => import("../../component-library").then((module) => module.EstimateRightSidebar),
  { loading: () => <TemplateEditorDockFallback /> },
);

function TemplateEditorDockFallback({ onActivate }: { onActivate?: () => void }) {
  const surfaceVariant = useLibrarySurfaceVariant();
  const className = cn("hidden w-[380px] shrink-0 p-2 lg:block", librarySurfaceClass(surfaceVariant, "rightDock"));
  const content = (
    <>
      <Skeleton className={cn("h-8 w-full", librarySurfaceClass(surfaceVariant, "skeleton"))} />
      <div className="mt-2 space-y-1" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className={cn("h-6 w-full", librarySurfaceClass(surfaceVariant, "skeleton"))} />
        ))}
      </div>
    </>
  );

  if (onActivate) {
    return (
      <button
        type="button"
        className={cn(className, "cursor-default text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus")}
        aria-label="Load components dock"
        onPointerEnter={onActivate}
        onFocus={onActivate}
        onClick={onActivate}
      >
        {content}
        <span className="sr-only">Load components dock</span>
      </button>
    );
  }

  return (
    <output
      className={className}
      aria-label="Loading components dock"
    >
      {content}
      <span className="sr-only">Loading components dock</span>
    </output>
  );
}

function TemplateEditorProjectSourcesUnavailable() {
  const surfaceVariant = useLibrarySurfaceVariant();
  return (
    <section
      className={cn("rounded-xs border border-dashed border-hairline bg-surfaceMuted/30 p-2", librarySurfaceClass(surfaceVariant, "contentTile"))}
      aria-label="Project source unavailable"
    >
      <label className="block text-[9px] font-medium uppercase tracking-normal text-tertiary" htmlFor="template-editor-project-source-selector">
        Project
      </label>
      <select
        id="template-editor-project-source-selector"
        className="mt-1 h-7 w-full rounded-xs border border-hairline bg-surface px-2 text-[10px] text-tertiary"
        disabled
        aria-label="Project source project"
      >
        <option>No project selected</option>
      </select>
      <p className="mt-2 text-[9px] leading-4 text-tertiary">
        Project sources are unavailable until this template editor has a selected project scope.
      </p>
    </section>
  );
}

function TemplateEditorReadOnlySourceDock() {
  const surfaceVariant = useLibrarySurfaceVariant();
  return (
    <ResizableSidePanel
      side="right"
      ariaLabel="Sources"
      storageKey="template_editor_read_only_sources_width"
      defaultWidth={380}
      minWidth={360}
      maxWidth={560}
      persistWidth={false}
      compactDrawer={false}
    >
      <aside className={cn("hidden h-full min-h-0 w-[380px] shrink-0 flex-col overflow-hidden p-2 lg:flex", librarySurfaceClass(surfaceVariant, "rightDock"))} aria-label="Read-only sources">
        <section className="rounded-xs border border-dashed border-hairline bg-surfaceMuted/30 p-2" aria-label="Read-only template">
          <p className="text-[10px] font-medium leading-4 text-ink">Read-only template</p>
          <p className="mt-1 text-[9px] leading-4 text-tertiary">
            Source insertion and template mutation controls are unavailable for this access level.
          </p>
        </section>
      </aside>
    </ResizableSidePanel>
  );
}

function TemplateLinkedInstancesStatus({ templateId, canEdit }: { templateId: string; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const queryKey = ["estimate-template-linked-instances", templateId] as const;
  const statusQuery = useQuery({
    queryKey,
    queryFn: () => loadEstimateTemplateLinkedInstanceStatus({ templateId }),
    refetchInterval: (query) => query.state.data?.updatingCount ? 4_000 : false,
  });
  const [retrying, setRetrying] = useState(false);
  const status = statusQuery.data;
  if (statusQuery.isPending && !status) {
    return <Skeleton className="mx-2 mt-2 h-9 shrink-0" aria-label="Loading linked instance status" />;
  }
  if (!status) {
    return (
      <section className="mx-2 mt-2 shrink-0 rounded-xs border border-dangerSoft p-2 text-[9px] text-danger">
        <p>Couldn&apos;t load linked-instance status.</p>
        <Button type="button" variant="secondary" size="xs" className="mt-1" onClick={() => void statusQuery.refetch()}>Retry</Button>
      </section>
    );
  }
  if (status.activeCount === 0) return null;
  const stale = statusQuery.isError;
  return (
    <section className="mx-2 mt-2 shrink-0 rounded-xs border border-hairline bg-surfaceMuted/35 px-2 py-1.5" aria-label="Linked instances">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] font-medium text-ink">Linked instances · v{status.currentVersionNumber}</p>
          <p className="truncate text-[8px] text-tertiary">
            {status.failedCount > 0
              ? `${status.failedCount} of ${status.activeCount} need attention`
              : status.updatingCount > 0
                ? `${status.updatingCount} updating · ${status.currentCount} current`
                : `All ${status.activeCount} linked instances updated`}
            {stale ? " · Status may be outdated" : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {status.retryableCount > 0 && canEdit ? (
            <Button
              type="button"
              variant="secondary"
              size="xs"
              disabled={retrying}
              onClick={() => {
                setRetrying(true);
                void retryEstimateTemplateLinkedInstances({ templateId })
                  .then(() => queryClient.invalidateQueries({ queryKey }))
                  .finally(() => setRetrying(false));
              }}
            >
              {retrying ? "Retrying…" : `Retry ${status.retryableCount}`}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="xs" onClick={() => void statusQuery.refetch()}>Refresh</Button>
        </div>
      </div>
      <details className="mt-1 text-[8px] text-secondary">
        <summary className="cursor-pointer select-none">View affected Estimates</summary>
        <VirtualizedLinkedInstanceList items={status.items} />
      </details>
    </section>
  );
}

type LinkedInstanceStatusItem = Awaited<ReturnType<typeof loadEstimateTemplateLinkedInstanceStatus>>["items"][number];

function VirtualizedLinkedInstanceList({ items }: { items: LinkedInstanceStatusItem[] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 24,
    overscan: 5,
  });
  return (
    <div ref={scrollRef} className="mt-1 max-h-32 overflow-auto" data-template-linked-instance-virtual-list="true">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          if (!item) return null;
          return (
            <Link
              key={item.instanceId}
              href={`/workshop/projects/${item.projectId}/estimates/${item.estimateId}`}
              className="absolute left-0 top-0 flex h-6 w-full items-center justify-between gap-2 rounded-xs px-1 hover:bg-surfaceMuted"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              <span className="min-w-0 truncate">{item.projectName} · {item.estimateName}</span>
              <span className={item.linkState === "failed" ? "text-danger" : "text-tertiary"}>
                {item.linkState === "linked" ? `v${item.appliedVersionNumber}` : item.linkState === "updating" ? `v${item.appliedVersionNumber}→${item.targetVersionNumber}` : "Failed"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

type TemplateEditorTextPrompt = {
  title: string;
  label: string;
  confirmLabel: string;
  initialValue: string;
  onSubmit: (value: string) => void;
};

type TemplateEditorUiState = {
  selectedNodeId: string | null;
  treeSearchQuery: string;
  expandedIds: string[];
  textPrompt: TemplateEditorTextPrompt | null;
  textPromptValue: string;
  deleteNodeTarget: EstimateTreeNode | null;
};

type TemplateEditorUiAction =
  | { type: "selectNode"; nodeId: string | null }
  | { type: "treeSearch"; query: string }
  | { type: "toggleExpanded"; nodeId: string }
  | { type: "setExpanded"; nodeIds: string[] }
  | { type: "ensureExpanded"; nodeId: string }
  | { type: "openTextPrompt"; prompt: TemplateEditorTextPrompt }
  | { type: "closeTextPrompt" }
  | { type: "textPromptValue"; value: string }
  | { type: "setDeleteNodeTarget"; node: EstimateTreeNode | null }
  | { type: "confirmDeleteNode"; nodeId: string };

function getInitialTemplateEditorUiState(template: EstimateTemplate): TemplateEditorUiState {
  return {
    selectedNodeId: null,
    treeSearchQuery: "",
    expandedIds: getTemplateStructureAllNodeIds(template),
    textPrompt: null,
    textPromptValue: "",
    deleteNodeTarget: null,
  };
}

function templateEditorUiReducer(
  state: TemplateEditorUiState,
  action: TemplateEditorUiAction,
): TemplateEditorUiState {
  switch (action.type) {
    case "selectNode":
      return { ...state, selectedNodeId: action.nodeId };
    case "treeSearch":
      return { ...state, treeSearchQuery: action.query };
    case "toggleExpanded":
      return {
        ...state,
        expandedIds: state.expandedIds.includes(action.nodeId)
          ? state.expandedIds.filter((id) => id !== action.nodeId)
          : [...state.expandedIds, action.nodeId],
      };
    case "setExpanded":
      return { ...state, expandedIds: action.nodeIds };
    case "ensureExpanded":
      return state.expandedIds.includes(action.nodeId)
        ? state
        : { ...state, expandedIds: [...state.expandedIds, action.nodeId] };
    case "openTextPrompt":
      return { ...state, textPrompt: action.prompt, textPromptValue: action.prompt.initialValue };
    case "closeTextPrompt":
      return { ...state, textPrompt: null };
    case "textPromptValue":
      return { ...state, textPromptValue: action.value };
    case "setDeleteNodeTarget":
      return { ...state, deleteNodeTarget: action.node };
    case "confirmDeleteNode":
      return {
        ...state,
        selectedNodeId: state.selectedNodeId === action.nodeId ? null : state.selectedNodeId,
        deleteNodeTarget: null,
      };
    default:
      return state;
  }
}

/**
 * Template editor composition: back strip + structure tree on the left,
 * estimate-style editable sheet in the center. The right Components dock
 * arrives with the editor's drag/drop phase.
 */
export function TemplateEditorClient({
  template: serverTemplate,
  workspaceId,
  canEditTemplate = true,
}: {
  template: EstimateTemplate;
  workspaceId: string;
  canEditTemplate?: boolean;
}) {
  return (
    <LibrarySurfaceVariantProvider variant="glass">
      <TemplateEditorSurface template={serverTemplate} workspaceId={workspaceId} canEditTemplate={canEditTemplate} />
    </LibrarySurfaceVariantProvider>
  );
}

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
function TemplateEditorSurface({
  template: serverTemplate,
  workspaceId,
  canEditTemplate,
}: {
  template: EstimateTemplate;
  workspaceId: string;
  canEditTemplate: boolean;
}) {
  const editor = useTemplateEditor(serverTemplate);
  const template = editor.template;
  const surfaceVariant = useLibrarySurfaceVariant();
  const setBreadcrumb = useLibraryEditorChrome((state) => state.setBreadcrumb);
  const clearBreadcrumb = useLibraryEditorChrome((state) => state.clearBreadcrumb);
  const setSaveState = useLibraryEditorChrome((state) => state.setSaveState);
  const [dockRequested, setDockRequested] = useState(false);
  const [uiState, dispatchUi] = useReducer(
    templateEditorUiReducer,
    serverTemplate,
    getInitialTemplateEditorUiState,
  );
  const { selectedNodeId, treeSearchQuery, expandedIds, textPrompt, textPromptValue, deleteNodeTarget } = uiState;
  const treeSearchInputRef = useRef<HTMLInputElement | null>(null);

  // Library Optimization Plan P1 T8 (F22): replace native browser dialogs with
  // the in-DS dialog pattern (mirrors TemplatesBrowseManager). One reusable text prompt
  // for add/rename; a destructive ConfirmDialog for delete.
  const componentLibraryQueryKey = useMemo(() => workspaceComponentLibraryLiteQueryKey(workspaceId), [workspaceId]);
  const requestDock = useCallback(() => {
    setDockRequested(true);
  }, []);

  const openTextPrompt = useCallback((next: TemplateEditorTextPrompt) => {
    dispatchUi({ type: "openTextPrompt", prompt: next });
  }, []);
  const submitTextPrompt = useCallback(() => {
    if (!textPrompt) return;
    const value = textPromptValue.trim();
    const handler = textPrompt.onSubmit;
    dispatchUi({ type: "closeTextPrompt" });
    if (value) handler(value);
  }, [textPrompt, textPromptValue]);

  useEffect(() => {
    setBreadcrumb({ templateId: template.id, templateName: template.name, category: template.category });
    return () => clearBreadcrumb(template.id);
  }, [clearBreadcrumb, setBreadcrumb, template.category, template.id, template.name]);

  useEffect(() => {
    setSaveState(editor.saveState);
  }, [editor.saveState, setSaveState]);

  const treeTemplate = useMemo(() => {
    const [match] = filterTemplatesByQuery([template], treeSearchQuery);
    return match ?? { ...template, nodes: [] };
  }, [template, treeSearchQuery]);

  function toggleExpanded(nodeId: string) {
    dispatchUi({ type: "toggleExpanded", nodeId });
  }

  function selectNode(nodeId: string) {
    dispatchUi({ type: "selectNode", nodeId });
    if (nodeId === TEMPLATE_EDITOR_ROOT_NODE_ID) return;
    document
      .querySelector(`[data-template-editor-node="${CSS.escape(nodeId)}"]`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  const addNode = useCallback(
    (parentId: string | null, kind: "group" | "area") => {
      if (!canEditTemplate) return;
      openTextPrompt({
        title: kind === "group" ? "Add group" : "Add area",
        label: kind === "group" ? "Group name" : "Area name",
        confirmLabel: "Add",
        initialValue: "",
          onSubmit: (name) => {
            void editor.addNode(parentId, kind, name);
            if (parentId) {
              dispatchUi({ type: "ensureExpanded", nodeId: parentId });
            }
          },
      });
    },
    [canEditTemplate, editor, openTextPrompt],
  );

  const renameNode = useCallback(
    (node: EstimateTreeNode) => {
      if (!canEditTemplate) return;
      openTextPrompt({
        title: node.kind === "group" ? "Rename group" : "Rename area",
        label: node.kind === "group" ? "Group name" : "Area name",
        confirmLabel: "Rename",
        initialValue: node.name,
        onSubmit: (name) => {
          if (name === node.name) return;
          void editor.renameNode(node.id, name);
        },
      });
    },
    [canEditTemplate, editor, openTextPrompt],
  );

  const deleteNode = useCallback((node: EstimateTreeNode) => {
    if (!canEditTemplate) return;
    dispatchUi({ type: "setDeleteNodeTarget", node });
  }, [canEditTemplate]);

  const confirmDeleteNode = useCallback(() => {
    if (!canEditTemplate) return;
    const node = deleteNodeTarget;
    if (!node) return;
    void editor.deleteNode(node.id);
    dispatchUi({ type: "confirmDeleteNode", nodeId: node.id });
  }, [canEditTemplate, deleteNodeTarget, editor]);

  // Dock dataset: same lazy query + cache key as the estimate workspace, so
  // switching between the two surfaces reuses one fetch.
  const { data: libraryData } = useQuery({
    queryKey: componentLibraryQueryKey,
    queryFn: () => loadCurrentWorkspaceComponentLibraryLite(),
    enabled: dockRequested,
    staleTime: 5 * 60 * 1000,
  });
  const queryClient = useQueryClient();
  const handleLibraryDataChanged = useStableCallback(() => {
    void queryClient.invalidateQueries({ queryKey: componentLibraryQueryKey });
  });

  // Component inserts land on the selected area, a selected group's first
  // area, or the template's first area; template inserts land on the
  // selected group or the root.
  const selectedNode = selectedNodeId ? findTemplateNode(template.nodes, selectedNodeId) : null;
  const componentTargetArea = useMemo(() => {
    if (selectedNode?.kind === "area") return selectedNode;
    if (selectedNode?.kind === "group") return findFirstTemplateArea(selectedNode.children ?? []);
    return findFirstTemplateArea(template.nodes);
  }, [selectedNode, template.nodes]);
  const templateTargetGroup = selectedNode?.kind === "group" ? selectedNode : null;

  const handleInsertComponent = useStableCallback((item: EstimateRowItem) => {
    if (!canEditTemplate) return false;
    if (!componentTargetArea) return false;
    void editor.addLibraryItems(componentTargetArea.id, [item]);
    return true;
  });
  const handleInsertTemplate = useStableCallback((sourceTemplate: EstimateTemplate) => {
    if (!canEditTemplate) return false;
    if (sourceTemplate.id === template.id) return false;
    void editor.insertTemplate(sourceTemplate.id, templateTargetGroup?.id ?? null);
    return true;
  });
  const handleInsertTemplateNode = useStableCallback(
    (sourceTemplate: EstimateTemplate, sourceNode: EstimateTreeNode) => {
      if (!canEditTemplate) return false;
      if (sourceTemplate.id === template.id) return false;
      void editor.insertTemplate(sourceTemplate.id, templateTargetGroup?.id ?? null, sourceNode.id);
      return true;
    },
  );

  const sheetHandlers: TemplateSheetHandlers = useMemo(
    () => ({
      onAddNode: addNode,
      onRenameNode: renameNode,
      onDeleteNode: deleteNode,
      onUpdateRow: (rowId, patch) => {
        if (canEditTemplate) void editor.updateRow(rowId, patch);
      },
      onRemoveRow: (rowId) => {
        if (canEditTemplate) void editor.removeRow(rowId);
      },
      onAddAllowanceRow: (nodeId, material) => {
        if (canEditTemplate) void editor.addAllowanceRow(nodeId, material);
      },
      onDropLibraryItem: (nodeId, item) => {
        if (canEditTemplate) void editor.addLibraryItems(nodeId, [item]);
      },
      onDropTemplate: (targetGroupId, payload) => {
        if (!canEditTemplate) return;
        if (payload.kind === "template-node") {
          if (payload.templateId === template.id) return;
          void editor.insertTemplate(payload.templateId, targetGroupId, payload.templateNodeId);
          return;
        }
        for (const sourceTemplateId of payload.templateIds) {
          if (sourceTemplateId === template.id) continue;
          void editor.insertTemplate(sourceTemplateId, targetGroupId);
        }
      },
    }),
    [addNode, canEditTemplate, deleteNode, editor, renameNode, template.id],
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 overflow-hidden rounded-xs",
        surfaceVariant === "glass" ? "gap-2 border border-[color:var(--glass-border)] p-2" : "bg-white",
        librarySurfaceClass(surfaceVariant, "root"),
      )}
      data-template-editor-workspace="true"
      data-library-surface={surfaceVariant}
    >
      <ResizableSidePanel
        side="left"
        ariaLabel="Template structure panel"
        storageKey="template_library_tree_width"
        defaultWidth={272}
        minWidth={216}
        maxWidth={432}
        widthOffset={104}
      >
        <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", librarySurfaceClass(surfaceVariant, "treeRail"))}>
          <Link
            href="/workshop/library/templates"
            prefetch={false}
            className={cn(
              "flex h-7 shrink-0 items-center gap-1 px-2 text-[10px] leading-4 text-tertiary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              librarySurfaceClass(surfaceVariant, "railPanelHeader"),
            )}
          >
            <CaretLeft size={11} weight="regular" aria-hidden="true" />
            All templates
          </Link>
          <TreePanelHeader
            className={cn("bg-transparent", librarySurfaceClass(surfaceVariant, "railPanelHeader"))}
            toolbarClassName={librarySurfaceClass(surfaceVariant, "toolbar")}
            showToolbarBottomBorder={surfaceVariant !== "glass"}
            ariaLabel="Template structure tools"
            labelPrefix="template structure"
            searchValue={treeSearchQuery}
            onSearchValueChange={(query) => dispatchUi({ type: "treeSearch", query })}
            searchPlaceholder="Search structure"
            searchLabel="Search template structure"
            searchInputRef={treeSearchInputRef}
            showDefaultActions={false}
            onExpandAll={() => dispatchUi({ type: "setExpanded", nodeIds: getTemplateStructureAllNodeIds(template) })}
            onCollapseAll={() => dispatchUi({ type: "setExpanded", nodeIds: [] })}
            addActions={canEditTemplate ? [
              {
                label: "Add group",
                icon: <FolderSimple size={12} weight="regular" aria-hidden="true" />,
                onClick: () => addNode(null, "group"),
              },
            ] : []}
          />
          <div className="min-h-0 flex-1 overflow-auto p-2">
            <TemplateStructureTree
              template={treeTemplate}
              selectedNodeId={selectedNodeId}
              onSelectNode={selectNode}
              expandedIds={treeSearchQuery.trim() ? getTemplateStructureAllNodeIds(treeTemplate) : expandedIds}
              onToggle={toggleExpanded}
              handlers={{
                onAddNode: addNode,
                onRenameNode: renameNode,
                onDeleteNode: deleteNode,
                onMoveNode: (nodeId, parentId, orderedSiblingIds) =>
                  canEditTemplate ? void editor.moveNode(nodeId, parentId, orderedSiblingIds) : undefined,
              }}
              canEdit={canEditTemplate}
            />
          </div>
        </div>
      </ResizableSidePanel>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {editor.outcomeUnknown ? (
          editor.outcomeUnknownCollapsed ? (
            <button
              type="button"
              className="mx-2 mt-2 shrink-0 rounded-xs border border-warningSoft bg-warningSoft/30 px-2 py-1 text-left text-[9px] font-medium text-ink"
              onClick={editor.expandUnknownOutcome}
            >
              Outcome unknown · check retained Template update
            </button>
          ) : (
            <section
              className="mx-2 mt-2 shrink-0 rounded-xs border border-warningSoft bg-warningSoft/30 p-2 text-[9px] text-ink"
              aria-label="Outcome unknown"
              aria-live="polite"
            >
              <p className="font-medium">Outcome unknown</p>
              <p className="mt-0.5 text-tertiary">
                We couldn&apos;t confirm whether “{editor.outcomeUnknown.actionLabel}” applied. New shared edits stay blocked until this retained intent resolves.
              </p>
              <div className="mt-1 flex items-center gap-1">
                <Button type="button" variant="secondary" size="xs" disabled={editor.resolvingOutcome} onClick={() => void editor.checkUnknownOutcome()}>
                  {editor.resolvingOutcome ? "Checking…" : "Check again"}
                </Button>
                <Button type="button" variant="ghost" size="xs" onClick={editor.collapseUnknownOutcome}>Close and check later</Button>
              </div>
            </section>
          )
        ) : null}
        <TemplateLinkedInstancesStatus templateId={template.id} canEdit={canEditTemplate} />
        <TemplateEditorSheet template={template} selectedNodeId={selectedNodeId} handlers={sheetHandlers} canEdit={canEditTemplate} />
      </div>
      {!canEditTemplate ? (
        <TemplateEditorReadOnlySourceDock />
      ) : dockRequested && libraryData ? (
        <EstimateRightSidebar
          visibleTabs={["components", "project"]}
          initialActiveTab="components"
          selectedNodeId={componentTargetArea?.id ?? null}
          selectedNodeKind={componentTargetArea?.kind ?? null}
          selectedNodeName={componentTargetArea?.name ?? null}
          templateTargetName={templateTargetGroup?.name ?? template.name}
          canInsertTemplate
          templateCreateMode="scratch"
          onInsertComponent={handleInsertComponent}
          onInsertTemplate={handleInsertTemplate}
          onInsertTemplateNode={handleInsertTemplateNode}
          initialLibraryItems={libraryData.libraryItems}
          templates={libraryData.templates}
          categoryTree={libraryData.categoryTree}
          suppliers={libraryData.suppliers}
          brands={libraryData.brands}
          libraryFolders={libraryData.libraryFolders}
          onLibraryDataChanged={handleLibraryDataChanged}
          projectTabUnavailable={<TemplateEditorProjectSourcesUnavailable />}
        />
      ) : (
        <TemplateEditorDockFallback onActivate={requestDock} />
      )}

      {deleteNodeTarget ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) dispatchUi({ type: "setDeleteNodeTarget", node: null });
          }}
          title={`Delete ${deleteNodeTarget.kind === "group" ? "group" : "area"}?`}
          description={`"${deleteNodeTarget.name}" and its rows and child nodes are removed from this template.`}
          tone="destructive"
          confirmLabel="Delete"
          onConfirm={confirmDeleteNode}
        />
      ) : null}

      {editor.pendingSharedMutation ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) editor.cancelSharedMutation();
          }}
          title={`${editor.pendingSharedMutation.actionLabel}?`}
          description={
            `${editor.pendingSharedMutation.impact.activeInstanceCount} linked ${editor.pendingSharedMutation.impact.activeInstanceCount === 1 ? "instance" : "instances"} `
            + `across ${editor.pendingSharedMutation.impact.affectedProjectCount} ${editor.pendingSharedMutation.impact.affectedProjectCount === 1 ? "project" : "projects"} `
            + `and ${editor.pendingSharedMutation.impact.affectedEstimateCount} ${editor.pendingSharedMutation.impact.affectedEstimateCount === 1 ? "estimate" : "estimates"} will update.`
          }
          confirmLabel="Update linked instances"
          onConfirm={() => {
            void editor.confirmSharedMutation();
          }}
        />
      ) : null}

      {textPrompt ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) dispatchUi({ type: "closeTextPrompt" });
          }}
          title={textPrompt.title}
          description="Enter a name and confirm to apply."
          confirmLabel={textPrompt.confirmLabel}
          onConfirm={submitTextPrompt}
        >
          <label className="grid gap-1">
            <span className="text-[9px] font-medium text-tertiary">{textPrompt.label}</span>
            <ControlInput
              aria-label={textPrompt.label}
              autoFocus
              value={textPromptValue}
              onChange={(event) => dispatchUi({ type: "textPromptValue", value: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitTextPrompt();
                }
              }}
            />
          </label>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
