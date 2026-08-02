"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretRight, FolderSimple } from "@phosphor-icons/react/dist/ssr";

import { Skeleton } from "@/components/ui/skeleton";
import { Button, ButtonLink } from "@/components/ui/button";
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
import type { TemplateEditorTextPrompt } from "./TemplateEditorDialogs";
import { TemplateEditorSheet, type TemplateSheetHandlers } from "./TemplateEditorSheet";
import { useTemplateEditor } from "./use-template-editor";

const TemplateEditorDialogs = dynamic(
  () => import("./TemplateEditorDialogs").then((module) => module.TemplateEditorDialogs),
  { ssr: false },
);

const TemplateLinkedInstancesStatus = dynamic(
  () => import("./TemplateLinkedInstancesStatus").then((module) => module.TemplateLinkedInstancesStatus),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="mx-2 mt-2 h-9 shrink-0" aria-label="Loading linked instance status" />
    ),
  },
);

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
      <Button
        type="button"
        variant="plain"
        size="xs"
        className={cn(
          "min-h-0 min-w-0 items-stretch justify-start whitespace-normal p-0 text-left focus-visible:ring-offset-0",
          className,
          "cursor-default",
        )}
        aria-label="Load components dock"
        onPointerEnter={onActivate}
        onFocus={onActivate}
        onClick={onActivate}
      >
        {content}
        <span className="sr-only">Load components dock</span>
      </Button>
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
          <ButtonLink
            href="/workshop/library/templates"
            prefetch={false}
            variant="plain"
            size="xs"
            className={cn(
              "h-7 min-w-0 shrink-0 justify-start gap-1 px-2 !text-[10px] leading-4 text-tertiary hover:text-ink focus-visible:ring-offset-0",
              librarySurfaceClass(surfaceVariant, "railPanelHeader"),
            )}
          >
            <CaretRight size={11} weight="regular" className="rotate-180" aria-hidden="true" />
            All templates
          </ButtonLink>
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
                icon: <FolderSimple size={16} weight="regular" aria-hidden="true" />,
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
            <Button
              type="button"
              variant="plain"
              size="xs"
              className="mx-2 mt-2 min-w-0 shrink-0 justify-start whitespace-normal border border-warningSoft bg-warningSoft/30 px-2 py-1 text-left !text-[9px] text-ink"
              onClick={editor.expandUnknownOutcome}
            >
              Outcome unknown · check retained Template update
            </Button>
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

      {deleteNodeTarget || editor.pendingSharedMutation || textPrompt ? (
        <TemplateEditorDialogs
          deleteNodeTarget={deleteNodeTarget}
          onCloseDeleteNode={() => dispatchUi({ type: "setDeleteNodeTarget", node: null })}
          onConfirmDeleteNode={confirmDeleteNode}
          pendingSharedMutation={editor.pendingSharedMutation}
          onCancelSharedMutation={editor.cancelSharedMutation}
          onConfirmSharedMutation={editor.confirmSharedMutation}
          textPrompt={textPrompt}
          textPromptValue={textPromptValue}
          onCloseTextPrompt={() => dispatchUi({ type: "closeTextPrompt" })}
          onTextPromptValueChange={(value) => dispatchUi({ type: "textPromptValue", value })}
          onSubmitTextPrompt={submitTextPrompt}
        />
      ) : null}
    </div>
  );
}
