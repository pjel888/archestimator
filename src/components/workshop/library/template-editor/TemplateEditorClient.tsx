"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretLeft, FolderSimple } from "@phosphor-icons/react/dist/ssr";

import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { ControlInput } from "@/components/ui/control-input";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";
import {
  LibrarySurfaceVariantProvider,
  librarySurfaceClass,
  useLibrarySurfaceVariant,
} from "@/components/workshop/library/library-surface-variant";
import { useLibraryEditorChrome } from "@/hooks/use-library-editor-chrome";
import { useStableCallback } from "@/hooks/use-stable-callback";
import { loadCurrentWorkspaceComponentLibrary } from "@/lib/component-library/actions";
import { workspaceComponentLibraryQueryKey } from "@/lib/component-library/query-keys";
import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import { cn } from "@/lib/ui/cn";
import { EstimateRightSidebar } from "../../component-library";
import { filterTemplatesByQuery, type EstimateTemplate } from "../../component-library/templates";
import { findFirstTemplateArea, findTemplateNode } from "./template-editor-model";
import {
  getTemplateStructureAllNodeIds,
  TemplateStructureTree,
  TEMPLATE_EDITOR_ROOT_NODE_ID,
} from "./TemplateStructureTree";
import { TemplateEditorSheet, type TemplateSheetHandlers } from "./TemplateEditorSheet";
import { useTemplateEditor } from "./use-template-editor";

function TemplateEditorDockFallback() {
  const surfaceVariant = useLibrarySurfaceVariant();

  return (
    <div
      className={cn("hidden w-[380px] shrink-0 p-2 lg:block", librarySurfaceClass(surfaceVariant, "rightDock"))}
      role="status"
      aria-label="Loading components dock"
    >
      <Skeleton className={cn("h-8 w-full", librarySurfaceClass(surfaceVariant, "skeleton"))} />
      <div className="mt-2 space-y-1" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className={cn("h-6 w-full", librarySurfaceClass(surfaceVariant, "skeleton"))} />
        ))}
      </div>
      <span className="sr-only">Loading components dock</span>
    </div>
  );
}

/**
 * Template editor composition: back strip + structure tree on the left,
 * estimate-style editable sheet in the center. The right Components dock
 * arrives with the editor's drag/drop phase.
 */
export function TemplateEditorClient({ template: serverTemplate, workspaceId }: { template: EstimateTemplate; workspaceId: string }) {
  return (
    <LibrarySurfaceVariantProvider variant="glass">
      <TemplateEditorSurface template={serverTemplate} workspaceId={workspaceId} />
    </LibrarySurfaceVariantProvider>
  );
}

function TemplateEditorSurface({ template: serverTemplate, workspaceId }: { template: EstimateTemplate; workspaceId: string }) {
  const editor = useTemplateEditor(serverTemplate);
  const template = editor.template;
  const surfaceVariant = useLibrarySurfaceVariant();
  const setBreadcrumb = useLibraryEditorChrome((state) => state.setBreadcrumb);
  const clearBreadcrumb = useLibraryEditorChrome((state) => state.clearBreadcrumb);
  const setSaveState = useLibraryEditorChrome((state) => state.setSaveState);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [treeSearchQuery, setTreeSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<string[]>(() => getTemplateStructureAllNodeIds(serverTemplate));
  const treeSearchInputRef = useRef<HTMLInputElement | null>(null);

  // Library Optimization Plan P1 T8 (F22): replace native browser dialogs with
  // the in-DS dialog pattern (mirrors TemplatesBrowseManager). One reusable text prompt
  // for add/rename; a destructive ConfirmDialog for delete.
  const [textPrompt, setTextPrompt] = useState<
    | { title: string; label: string; confirmLabel: string; initialValue: string; onSubmit: (value: string) => void }
    | null
  >(null);
  const [textPromptValue, setTextPromptValue] = useState("");
  const [deleteNodeTarget, setDeleteNodeTarget] = useState<EstimateTreeNode | null>(null);
  const componentLibraryQueryKey = useMemo(() => workspaceComponentLibraryQueryKey(workspaceId), [workspaceId]);
  const openTextPrompt = useCallback((next: NonNullable<typeof textPrompt>) => {
    setTextPrompt(next);
    setTextPromptValue(next.initialValue);
  }, []);
  const submitTextPrompt = useCallback(() => {
    if (!textPrompt) return;
    const value = textPromptValue.trim();
    const handler = textPrompt.onSubmit;
    setTextPrompt(null);
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
    setExpandedIds((current) =>
      current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId],
    );
  }

  function selectNode(nodeId: string) {
    setSelectedNodeId(nodeId);
    if (nodeId === TEMPLATE_EDITOR_ROOT_NODE_ID) return;
    document
      .querySelector(`[data-template-editor-node="${CSS.escape(nodeId)}"]`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  const addNode = useCallback(
    (parentId: string | null, kind: "group" | "area") => {
      openTextPrompt({
        title: kind === "group" ? "Add group" : "Add area",
        label: kind === "group" ? "Group name" : "Area name",
        confirmLabel: "Add",
        initialValue: "",
        onSubmit: (name) => {
          void editor.addNode(parentId, kind, name);
          if (parentId) {
            setExpandedIds((current) => (current.includes(parentId) ? current : [...current, parentId]));
          }
        },
      });
    },
    [editor, openTextPrompt],
  );

  const renameNode = useCallback(
    (node: EstimateTreeNode) => {
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
    [editor, openTextPrompt],
  );

  const deleteNode = useCallback((node: EstimateTreeNode) => {
    setDeleteNodeTarget(node);
  }, []);

  const confirmDeleteNode = useCallback(() => {
    const node = deleteNodeTarget;
    if (!node) return;
    void editor.deleteNode(node.id);
    setSelectedNodeId((current) => (current === node.id ? null : current));
    setDeleteNodeTarget(null);
  }, [deleteNodeTarget, editor]);

  // Dock dataset: same lazy query + cache key as the estimate workspace, so
  // switching between the two surfaces reuses one fetch.
  const { data: libraryData } = useQuery({
    queryKey: componentLibraryQueryKey,
    queryFn: () => loadCurrentWorkspaceComponentLibrary(),
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
    if (!componentTargetArea) return false;
    void editor.addLibraryItems(componentTargetArea.id, [item]);
    return true;
  });
  const handleInsertTemplate = useStableCallback((sourceTemplate: EstimateTemplate) => {
    if (sourceTemplate.id === template.id) return false;
    void editor.insertTemplate(sourceTemplate.id, templateTargetGroup?.id ?? null);
    return true;
  });
  const handleInsertTemplateNode = useStableCallback(
    (sourceTemplate: EstimateTemplate, sourceNode: EstimateTreeNode) => {
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
      onUpdateRow: (rowId, patch) => void editor.updateRow(rowId, patch),
      onRemoveRow: (rowId) => void editor.removeRow(rowId),
      onAddAllowanceRow: (nodeId, material) => void editor.addAllowanceRow(nodeId, material),
      onDropLibraryItem: (nodeId, item) => void editor.addLibraryItems(nodeId, [item]),
      onDropTemplate: (targetGroupId, payload) => {
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
    [addNode, deleteNode, editor, renameNode, template.id],
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
            onSearchValueChange={setTreeSearchQuery}
            searchPlaceholder="Search structure"
            searchLabel="Search template structure"
            searchInputRef={treeSearchInputRef}
            showDefaultActions={false}
            onExpandAll={() => setExpandedIds(getTemplateStructureAllNodeIds(template))}
            onCollapseAll={() => setExpandedIds([])}
            addActions={[
              {
                label: "Add group",
                icon: <FolderSimple size={12} weight="regular" aria-hidden="true" />,
                onClick: () => addNode(null, "group"),
              },
            ]}
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
                  void editor.moveNode(nodeId, parentId, orderedSiblingIds),
              }}
            />
          </div>
        </div>
      </ResizableSidePanel>
      <TemplateEditorSheet template={template} selectedNodeId={selectedNodeId} handlers={sheetHandlers} />
      {libraryData ? (
        <EstimateRightSidebar
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
        />
      ) : (
        <TemplateEditorDockFallback />
      )}

      {deleteNodeTarget ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteNodeTarget(null);
          }}
          title={`Delete ${deleteNodeTarget.kind === "group" ? "group" : "area"}?`}
          description={`"${deleteNodeTarget.name}" and its rows and child nodes are removed from this template.`}
          tone="destructive"
          confirmLabel="Delete"
          onConfirm={confirmDeleteNode}
        />
      ) : null}

      {textPrompt ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setTextPrompt(null);
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
              onChange={(event) => setTextPromptValue(event.target.value)}
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
