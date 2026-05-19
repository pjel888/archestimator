"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { CaretDown, Cube, DotsSixVertical, Files, HouseLine, Stack } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { ControlSelect } from "@/components/ui/control-select";
import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import { createEstimateNode } from "@/lib/estimates/actions";
import { cn } from "@/lib/ui/cn";
import { getExpandedNodeIds, flattenVisibleNodes, type EstimateAreaNode } from "./estimate-tree-data";
import { ResizableSidePanel } from "./ResizableSidePanel";

type EstimateSheetTreeProps = {
  projectId: string;
  estimateId: string;
  projectName: string;
  selectedNodeId: string | null;
  nodes: EstimateAreaNode[];
};

type ParentOption = {
  id: string;
  label: string;
};

function NodeIcon({ kind }: { kind: "lot" | "general" | "structure" | "level" | "area" }) {
  if (kind === "general") return <Files size={12} weight="bold" aria-hidden="true" />;
  if (kind === "lot" || kind === "structure") return <HouseLine size={12} weight="bold" aria-hidden="true" />;
  if (kind === "level") return <Stack size={12} weight="bold" aria-hidden="true" />;
  return <Cube size={12} weight="bold" aria-hidden="true" />;
}

function getParentOptions(nodes: EstimateAreaNode[]) {
  const options: ParentOption[] = [{ id: "", label: "Estimate root" }];

  function visit(node: EstimateAreaNode, path: string[]) {
    const nextPath = [...path, node.name];
    if (node.kind !== "area") options.push({ id: node.id, label: nextPath.join(" / ") });
    node.children?.forEach((child) => visit(child, nextPath));
  }

  nodes.forEach((node) => visit(node, []));
  return options;
}

function getDefaultParentId(nodes: EstimateAreaNode[], selectedNodeId: string | null) {
  if (!selectedNodeId) return "";
  let parentId = "";

  function visit(node: EstimateAreaNode, parent: EstimateAreaNode | null): boolean {
    if (node.id === selectedNodeId) {
      parentId = node.kind === "area" ? parent?.id ?? "" : node.id;
      return true;
    }

    return Boolean(node.children?.some((child) => visit(child, node)));
  }

  nodes.some((node) => visit(node, null));
  return parentId;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-tertiary">{label}</span>
      {children}
    </label>
  );
}

function AddEstimateNodeForm({
  action,
  parentOptions,
  defaultParentId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  parentOptions: ParentOption[];
  defaultParentId: string;
}) {
  return (
    <form action={action} className="grid gap-3">
      <Field label="Node name">
        <ControlInput
          name="name"
          required
          autoFocus
          placeholder="Kitchen, Ground Floor, Site Works"
          className="h-8 border-hairline px-2"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Node type">
          <ControlSelect
            name="kind"
            defaultValue="area"
            aria-label="Node type"
            wrapperClassName="h-8 w-full"
            className="h-8 w-full rounded-sm border border-hairline bg-white px-2 pr-6 !text-[10px]"
          >
            <option value="area">Area Node</option>
            <option value="general">General Node</option>
          </ControlSelect>
        </Field>
        <Field label="Parent context">
          <ControlSelect
            name="parentId"
            defaultValue={defaultParentId}
            aria-label="Parent context"
            wrapperClassName="h-8 w-full"
            className="h-8 w-full rounded-sm border border-hairline bg-white px-2 pr-6 !text-[10px]"
          >
            {parentOptions.map((option) => (
              <option key={option.id || "root"} value={option.id}>
                {option.label}
              </option>
            ))}
          </ControlSelect>
        </Field>
      </div>
      <div className="flex justify-end gap-1.5 border-t border-hairline pt-3">
        <Button type="submit" variant="primary" size="sm">
          Add node
        </Button>
      </div>
    </form>
  );
}

export function EstimateSheetTree({ projectId, estimateId, projectName, selectedNodeId, nodes }: EstimateSheetTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(getExpandedNodeIds(nodes)));
  const [showAddNode, setShowAddNode] = useState(false);
  const visibleNodes = useMemo(() => flattenVisibleNodes(nodes, expandedIds), [expandedIds, nodes]);
  const parentOptions = useMemo(() => getParentOptions(nodes), [nodes]);
  const defaultParentId = useMemo(() => getDefaultParentId(nodes, selectedNodeId), [nodes, selectedNodeId]);
  const createNodeAction = createEstimateNode.bind(null, projectId, estimateId);

  function toggleNode(nodeId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  return (
    <ResizableSidePanel side="left" ariaLabel="Estimate sheet tree" storageKey="estimate_sheet_tree_width" defaultWidth={272} minWidth={216} maxWidth={432}>
      <div className="flex h-full flex-col overflow-hidden border-r border-hairline bg-white">
        <div className="sticky top-0 z-20 shrink-0 bg-white">
          <div className="flex h-10 items-center border-b border-hairline pl-4 pr-2">
            <h2 className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-tertiary">Estimate tree</h2>
          </div>
          <div className="flex h-[38px] items-center">
            <SearchInput
              wrapperClassName="w-full"
              placeholder="Search estimate tree"
              aria-label="Search estimate tree"
            />
          </div>
          <HeaderIconToolbar ariaLabel="Estimate tree tools" labelPrefix="estimate tree" onAdd={() => setShowAddNode(true)} />
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
        {visibleNodes.length === 0 ? (
          <div className="rounded-md border border-dashed border-hairline bg-surface-muted p-2 text-[10px] leading-4 text-tertiary">
            This estimate has no tree nodes yet. Add a General Node or Area Node to begin rebuilding the estimate structure.
          </div>
        ) : null}
        <nav aria-label={`${projectName} estimate areas`}>
          <ol className="space-y-1">
            {visibleNodes.map((node) => {
              const hasChildren = Boolean(node.children?.length);
              const isExpanded = expandedIds.has(node.id);
              const isSelected = selectedNodeId === node.id;
              const href = `/workshop/projects/${projectId}/estimates/${node.id}`;

              return (
                <li key={node.id} className="grid h-7 grid-cols-[20px_minmax(0,1fr)_20px] items-center gap-1">
                  <span className="flex size-5 items-center justify-center text-tertiary" aria-hidden="true">
                    <DotsSixVertical size={13} />
                  </span>

                  <Link
                    href={href}
                    aria-current={isSelected ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-7 min-w-0 items-center justify-start gap-0 overflow-hidden rounded-md p-1 !text-[10px] !font-normal leading-none text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2",
                      isSelected ? "bg-surface-muted" : "hover:bg-surface-muted",
                    )}
                  >
                      <span className="flex h-full min-w-0 flex-1 items-center" style={{ paddingLeft: `${Math.min(node.depth * 14, 98)}px` }}>
                        {Array.from({ length: node.depth }).map((_, index) => (
                          <span
                            key={`${node.id}-line-${index}`}
                            aria-hidden="true"
                            className="absolute top-0 h-full border-l border-divider"
                            style={{ left: `${index * 14 + 6}px` }}
                          />
                        ))}
                        <span className="mr-1 flex size-4 shrink-0 items-center justify-center rounded-sm border border-hairline bg-white text-tertiary" aria-hidden="true">
                          <NodeIcon kind={node.kind} />
                        </span>
                        <span className="min-w-0 truncate text-left">{node.name}</span>
                      </span>
                  </Link>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={hasChildren ? `${isExpanded ? "Collapse" : "Expand"} ${node.name}` : `${node.name} has no children`}
                    aria-expanded={hasChildren ? isExpanded : undefined}
                    className="size-5 rounded-sm p-0 text-tertiary"
                    onClick={() => {
                      if (hasChildren) toggleNode(node.id);
                    }}
                  >
                    {hasChildren ? <CaretDown size={12} aria-hidden="true" className={isExpanded ? "" : "-rotate-90"} /> : <span className="size-1 rounded-full bg-tertiary" />}
                  </Button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
      </div>
      <Modal
        open={showAddNode}
        title="Add estimate tree node"
        description="Add a General Node or Area Node inside a valid parent context."
        onOpenChange={setShowAddNode}
      >
        <AddEstimateNodeForm action={createNodeAction} parentOptions={parentOptions} defaultParentId={defaultParentId} />
      </Modal>
    </ResizableSidePanel>
  );
}
