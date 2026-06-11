"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CaretLeft, FolderSimple } from "@phosphor-icons/react/dist/ssr";

import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";
import { useLibraryEditorChrome } from "@/hooks/use-library-editor-chrome";
import type { EstimateTreeNode } from "@/lib/estimates/types";
import { filterTemplatesByQuery, type EstimateTemplate } from "../../component-library/templates";
import {
  getTemplateStructureAllNodeIds,
  TemplateStructureTree,
  TEMPLATE_EDITOR_ROOT_NODE_ID,
} from "./TemplateStructureTree";
import { TemplateEditorSheet, type TemplateSheetHandlers } from "./TemplateEditorSheet";
import { useTemplateEditor } from "./use-template-editor";

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

  const sheetHandlers: TemplateSheetHandlers = useMemo(
    () => ({
      onAddNode: addNode,
      onRenameNode: renameNode,
      onDeleteNode: deleteNode,
      onUpdateRow: (rowId, patch) => void editor.updateRow(rowId, patch),
      onRemoveRow: (rowId) => void editor.removeRow(rowId),
      onAddAllowanceRow: (nodeId, material) => void editor.addAllowanceRow(nodeId, material),
    }),
    [addNode, deleteNode, editor, renameNode],
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
    </div>
  );
}
