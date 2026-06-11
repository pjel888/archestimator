"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretLeft, FolderSimple } from "@phosphor-icons/react/dist/ssr";

import { Skeleton } from "@/components/ui/skeleton";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";
import { useLibraryEditorChrome } from "@/hooks/use-library-editor-chrome";
import { useStableCallback } from "@/hooks/use-stable-callback";
import { loadCurrentWorkspaceComponentLibrary } from "@/lib/component-library/actions";
import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
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
  return (
    <div
      className="hidden w-[380px] shrink-0 border-l border-hairline bg-white p-2 lg:block"
      role="status"
      aria-label="Loading components dock"
    >
      <Skeleton className="h-8 w-full" />
      <div className="mt-2 space-y-1" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
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
export function TemplateEditorClient({ template: serverTemplate }: { template: EstimateTemplate }) {
  const editor = useTemplateEditor(serverTemplate);
  const template = editor.template;
  const setBreadcrumb = useLibraryEditorChrome((state) => state.setBreadcrumb);
  const clearBreadcrumb = useLibraryEditorChrome((state) => state.clearBreadcrumb);
  const setSaveState = useLibraryEditorChrome((state) => state.setSaveState);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [treeSearchQuery, setTreeSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<string[]>(() => getTemplateStructureAllNodeIds(serverTemplate));
  const treeSearchInputRef = useRef<HTMLInputElement | null>(null);

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
      const name = window.prompt(kind === "group" ? "Group name" : "Area name");
      if (!name?.trim()) return;
      void editor.addNode(parentId, kind, name);
      if (parentId) {
        setExpandedIds((current) => (current.includes(parentId) ? current : [...current, parentId]));
      }
    },
    [editor],
  );

  const renameNode = useCallback(
    (node: EstimateTreeNode) => {
      const name = window.prompt(`${node.kind === "group" ? "Group" : "Area"} name`, node.name);
      if (!name?.trim() || name.trim() === node.name) return;
      void editor.renameNode(node.id, name);
    },
    [editor],
  );

  const deleteNode = useCallback(
    (node: EstimateTreeNode) => {
      const noun = node.kind === "group" ? "group" : "area";
      if (!window.confirm(`Delete the ${noun} "${node.name}"? Its rows and child nodes are removed from this template.`)) return;
      void editor.deleteNode(node.id);
      setSelectedNodeId((current) => (current === node.id ? null : current));
    },
    [editor],
  );

  // Dock dataset: same lazy query + cache key as the estimate workspace, so
  // switching between the two surfaces reuses one fetch.
  const libraryQuery = useQuery({
    queryKey: ["workspace-component-library"],
    queryFn: () => loadCurrentWorkspaceComponentLibrary(),
    staleTime: 5 * 60 * 1000,
  });
  const queryClient = useQueryClient();
  const handleLibraryDataChanged = useStableCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["workspace-component-library"] });
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
    <div className="flex h-full min-h-0 overflow-hidden bg-white" data-template-editor-workspace="true">
      <ResizableSidePanel
        side="left"
        ariaLabel="Template structure panel"
        storageKey="template_library_tree_width"
        defaultWidth={272}
        minWidth={216}
        maxWidth={432}
        widthOffset={104}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-r border-hairline bg-white">
          <Link
            href="/workshop/library/templates"
            className="flex h-7 shrink-0 items-center gap-1 border-b border-hairline px-2 text-[10px] leading-4 text-tertiary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <CaretLeft size={11} weight="regular" aria-hidden="true" />
            All templates
          </Link>
          <TreePanelHeader
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
      {libraryQuery.data ? (
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
          initialLibraryItems={libraryQuery.data.libraryItems}
          templates={libraryQuery.data.templates}
          categoryTree={libraryQuery.data.categoryTree}
          suppliers={libraryQuery.data.suppliers}
          brands={libraryQuery.data.brands}
          libraryFolders={libraryQuery.data.libraryFolders}
          onLibraryDataChanged={handleLibraryDataChanged}
        />
      ) : (
        <TemplateEditorDockFallback />
      )}
    </div>
  );
}
