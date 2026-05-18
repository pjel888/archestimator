"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CaretDown, Cube, DotsSixVertical, HouseLine, MagnifyingGlass, Plus, Stack } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import { getExpandedNodeIds, flattenVisibleNodes, sampleEstimateTree } from "./estimate-tree-data";
import { ResizableSidePanel } from "./ResizableSidePanel";

type EstimateSheetTreeProps = {
  projectId: string;
  projectName: string;
  selectedNodeId: string;
};

function NodeIcon({ kind }: { kind: "lot" | "structure" | "level" | "area" }) {
  if (kind === "lot" || kind === "structure") return <HouseLine size={12} weight="bold" aria-hidden="true" />;
  if (kind === "level") return <Stack size={12} weight="bold" aria-hidden="true" />;
  return <Cube size={12} weight="bold" aria-hidden="true" />;
}

export function EstimateSheetTree({ projectId, projectName, selectedNodeId }: EstimateSheetTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(getExpandedNodeIds(sampleEstimateTree)));
  const visibleNodes = useMemo(() => flattenVisibleNodes(sampleEstimateTree, expandedIds), [expandedIds]);

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
      <div className="h-full overflow-auto border-r border-hairline p-2">
        <label className="flex h-8 items-center gap-1 border-b border-hairline p-2 text-[10px] font-bold text-tertiary">
          <MagnifyingGlass size={13} aria-hidden="true" />
          <input className="min-w-0 flex-1 bg-transparent text-[10px] font-bold outline-none placeholder:text-tertiary" placeholder="Search" aria-label="Search estimate areas" />
        </label>

        <div className="flex h-10 items-center justify-end">
          <Button variant="ghost" size="icon-sm" aria-label="Add estimate area">
            <Plus size={14} weight="bold" aria-hidden="true" />
          </Button>
        </div>

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
                      "relative inline-flex h-7 min-w-0 items-center justify-start gap-0 overflow-hidden rounded-md p-1 !text-[10px] !font-bold leading-none text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2",
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
    </ResizableSidePanel>
  );
}
