"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowsOut, MagnifyingGlassMinus, MagnifyingGlassPlus } from "@phosphor-icons/react/dist/ssr";
import { select, zoom, zoomIdentity, type ZoomBehavior } from "d3";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  findEstimateSystemKnowledgeNode,
  findEstimateSystemKnowledgeOperation,
  selectEstimateSystemKnowledgeImpact,
  type EstimateSystemKnowledgeGraph,
  type EstimateSystemKnowledgeImpactItem,
  type EstimateSystemKnowledgeInventoryItem,
  type EstimateSystemKnowledgeNode,
  type EstimateSystemKnowledgeRelation,
  type EstimateSystemKnowledgeSource,
} from "@/lib/admin/estimate-system-knowledge";

type EstimateSystemKnowledgeGraphProps = Readonly<{
  graph: EstimateSystemKnowledgeGraph;
  onOpenFeature: (featureId: string) => void;
  onOpenPage: (pageId: string) => void;
}>;

const NODE_WIDTH = 218;
const NODE_HEIGHT = 84;
const READABLE_LABEL_SCALE = 0.92;

const KNOWLEDGE_STATUS_COPY = {
  current: { label: "Current", compact: "Current", description: "Confirmed in the current source path." },
  guarded: { label: "Requires checks", compact: "Checks", description: "Permissions, revisions, confirmation, or another explicit guard applies." },
  boundary: { label: "Stops here", compact: "Boundary", description: "The effect intentionally stops at a scope, lifecycle, or immutable snapshot boundary." },
  partial: { label: "Known gap", compact: "Partial", description: "A known gap or freshness limit is called out instead of being inferred away." },
  legacy: { label: "Legacy link", compact: "Legacy", description: "An older supported path that is separate from the current Client Portal flow." },
  "not-applicable": { label: "Not applicable", compact: "Not applicable", description: "The operation does not apply to this model or is intentionally unsupported." },
} as const;

type KnowledgeStatus = keyof typeof KNOWLEDGE_STATUS_COPY;

function humanizeId(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function knowledgeStatus(status: string) {
  return KNOWLEDGE_STATUS_COPY[status as KnowledgeStatus] ?? {
    label: humanizeId(status),
    compact: humanizeId(status),
    description: "Documented status.",
  };
}

function KnowledgeStatusLabel({ status }: { status: string }) {
  if (status === "current" || status === "guarded") return null;
  return (
    <span className={status === "partial" ? "text-[9px] font-medium text-warning" : "text-[9px] font-medium text-tertiary"}>
      {knowledgeStatus(status).compact}
    </span>
  );
}

function KnowledgeStatusNote({ status }: { status: string }) {
  if (status === "current" || status === "guarded") return null;
  const copy = knowledgeStatus(status);
  return (
    <p className="mt-2 border-t border-hairline pt-2 text-[10px] leading-4 text-secondary">
      <span className={status === "partial" ? "font-medium text-warning" : "font-medium text-ink"}>{copy.label}.</span>{" "}
      {copy.description}
    </p>
  );
}

function searchTokenRoot(token: string) {
  if (token.length <= 5) return token;
  return token
    .replace(/tion$/, "")
    .replace(/(ing|ed|al|es|s)$/, "");
}

function matchesKnowledgeQuery(value: string, normalizedQuery: string) {
  const haystack = value.toLowerCase();
  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .map(searchTokenRoot)
    .every((token) => haystack.includes(token));
}

function uniqueImpactItems(items: readonly EstimateSystemKnowledgeImpactItem[]) {
  return Array.from(new Map(items.map((item) => [
    [item.title, item.description, item.nodeId].join(":"),
    item,
  ])).values());
}

const NODE_COLORS: Record<EstimateSystemKnowledgeNode["kind"], { fill: string; stroke: string; label: string }> = {
  definition: { fill: "var(--surface-muted)", stroke: "var(--secondary)", label: "Shared definition" },
  instance: { fill: "var(--surface)", stroke: "var(--ink)", label: "Live instance" },
  structure: { fill: "var(--surface-muted)", stroke: "var(--secondary)", label: "Structure" },
  calculation: { fill: "var(--surface)", stroke: "var(--secondary)", label: "Calculation" },
  snapshot: { fill: "var(--surface-muted)", stroke: "var(--ink)", label: "Issued snapshot" },
  surface: { fill: "var(--surface)", stroke: "var(--secondary)", label: "User surface" },
  event: { fill: "var(--surface-muted)", stroke: "var(--warning)", label: "Event or history" },
  boundary: { fill: "var(--surface-muted)", stroke: "var(--warning)", label: "Guard or boundary" },
};

function relationPath(from: EstimateSystemKnowledgeNode, to: EstimateSystemKnowledgeNode) {
  const forward = to.x >= from.x;
  const startX = forward ? from.x + NODE_WIDTH : from.x;
  const endX = forward ? to.x : to.x + NODE_WIDTH;
  const startY = from.y + NODE_HEIGHT / 2;
  const endY = to.y + NODE_HEIGHT / 2;
  const bend = Math.max(56, Math.abs(endX - startX) * 0.46);
  const controlOne = forward ? startX + bend : startX - bend;
  const controlTwo = forward ? endX - bend : endX + bend;
  return ["M", startX, startY, "C", controlOne, startY + ",", controlTwo, endY + ",", endX, endY].join(" ");
}

function relationLabelPoint(from: EstimateSystemKnowledgeNode, to: EstimateSystemKnowledgeNode) {
  return {
    x: (from.x + to.x + NODE_WIDTH) / 2,
    y: (from.y + to.y + NODE_HEIGHT) / 2 - 7,
  };
}

function compactFocusedNodes(
  graph: EstimateSystemKnowledgeGraph,
  nodes: readonly EstimateSystemKnowledgeNode[],
) {
  const activeStageIds = new Set(nodes.map((node) => node.stageId));
  const activeStages = graph.stages
    .filter((stage) => activeStageIds.has(stage.id))
    .sort((left, right) => left.order - right.order);
  const stageIndexById = new Map(activeStages.map((stage, index) => [stage.id, index]));
  const itemIndexByStageId = new Map<string, number>();

  return nodes.map((node) => {
    const itemIndex = itemIndexByStageId.get(node.stageId) ?? 0;
    itemIndexByStageId.set(node.stageId, itemIndex + 1);
    return {
      ...node,
      x: 110 + (stageIndexById.get(node.stageId) ?? 0) * 300,
      y: 112 + itemIndex * 108,
    };
  });
}

function SourceNotes({
  sources,
  compact = false,
}: {
  sources: readonly EstimateSystemKnowledgeSource[];
  compact?: boolean;
}) {
  return (
    <details className={compact ? "mt-2" : "border-t border-hairline pt-3"}>
      <summary className="cursor-pointer text-[10px] font-medium text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
        Source notes · {sources.length}
      </summary>
      <ul className="mt-2 space-y-2">
        {sources.map((source) => (
          <li key={[source.file, source.note].join(":")} className="space-y-0.5 text-[10px] leading-4">
            <code className="block break-all text-ink">{source.file}</code>
            <span className="block text-secondary">{source.note}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function RelationshipList({
  graph,
  relations,
  onSelectNode,
}: {
  graph: EstimateSystemKnowledgeGraph;
  relations: readonly EstimateSystemKnowledgeRelation[];
  onSelectNode: (nodeId: string) => void;
}) {
  if (!relations.length) {
    return <p className="border-y border-dashed border-hairline py-3 text-[10px] text-secondary">No relationships match this focus.</p>;
  }

  return (
    <ol className="divide-y divide-hairline border-y border-hairline" aria-label="Knowledge graph relationships">
      {relations.map((relation, index) => {
        const from = findEstimateSystemKnowledgeNode(graph, relation.fromId);
        const to = findEstimateSystemKnowledgeNode(graph, relation.toId);
        if (!from || !to) return null;
        return (
          <li key={relation.id} className="grid gap-2 py-3 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:items-start">
            <span className="text-[9px] font-medium tabular-nums text-tertiary">{String(index + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <p className="text-[10px] font-medium leading-4 text-ink">
                <button
                  type="button"
                  className="underline decoration-divider underline-offset-2 hover:text-brand-orange-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  onClick={() => onSelectNode(from.id)}
                >
                  {from.title}
                </button>
                <span className="px-1.5 text-secondary">{relation.label}</span>
                <button
                  type="button"
                  className="underline decoration-divider underline-offset-2 hover:text-brand-orange-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  onClick={() => onSelectNode(to.id)}
                >
                  {to.title}
                </button>
              </p>
              <p className="mt-1 text-[10px] leading-4 text-secondary">{relation.explanation}</p>
              <details className="mt-1.5">
                <summary className="cursor-pointer text-[9px] text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">Evidence and timing</summary>
                <p className="mt-1 text-[9px] leading-3 text-tertiary">{relation.timing}</p>
                <SourceNotes sources={relation.sources} compact />
              </details>
            </div>
            <KnowledgeStatusLabel status={relation.status} />
          </li>
        );
      })}
    </ol>
  );
}

function KnowledgeCanvas({
  graph,
  nodes,
  relations,
  selectedNodeId,
  onSelectNode,
}: {
  graph: EstimateSystemKnowledgeGraph;
  nodes: readonly EstimateSystemKnowledgeNode[];
  relations: readonly EstimateSystemKnowledgeRelation[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const layerRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodesRef = useRef(nodes);
  const labelsHiddenRef = useRef(false);
  const [labelsHidden, setLabelsHidden] = useState(false);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const visibleStageIds = useMemo(() => new Set(nodes.map((node) => node.stageId)), [nodes]);
  const selectedRelationIds = useMemo(() => new Set(
    selectedNodeId
      ? relations
        .filter((relation) => relation.fromId === selectedNodeId || relation.toId === selectedNodeId)
        .map((relation) => relation.id)
      : [],
  ), [relations, selectedNodeId]);
  const selectedNeighborhoodNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const nodeIds = new Set<string>([selectedNodeId]);
    for (const relation of relations) {
      if (!selectedRelationIds.has(relation.id)) continue;
      nodeIds.add(relation.fromId);
      nodeIds.add(relation.toId);
    }
    return nodeIds;
  }, [relations, selectedNodeId, selectedRelationIds]);
  const canvasHeight = Math.max(660, ...nodes.map((node) => node.y + NODE_HEIGHT + 70));

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const applyTransform = useCallback((mode: "overview" | "readable" | "in" | "out") => {
    const svgNode = svgRef.current;
    const behavior = zoomRef.current;
    if (!svgNode || !behavior) return;
    const svg = select(svgNode);
    if (mode === "in") {
      svg.call(behavior.scaleBy, 1.25);
      return;
    }
    if (mode === "out") {
      svg.call(behavior.scaleBy, 0.8);
      return;
    }
    if (mode === "readable") {
      svg.call(behavior.transform, zoomIdentity.translate(32, 44).scale(1));
      return;
    }

    const currentNodes = nodesRef.current;
    if (!currentNodes.length) return;
    const rect = svgNode.getBoundingClientRect();
    const minX = Math.min(...currentNodes.map((node) => node.x)) - 70;
    const minY = Math.min(...currentNodes.map((node) => node.y)) - 80;
    const maxX = Math.max(...currentNodes.map((node) => node.x + NODE_WIDTH)) + 70;
    const maxY = Math.max(...currentNodes.map((node) => node.y + NODE_HEIGHT)) + 80;
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const scale = Math.min(1.18, Math.max(0.28, Math.min(rect.width / width, rect.height / height) * 0.9));
    const translateX = (rect.width - width * scale) / 2 - minX * scale;
    const translateY = (rect.height - height * scale) / 2 - minY * scale;
    svg.call(behavior.transform, zoomIdentity.translate(translateX, translateY).scale(scale));
  }, []);

  useEffect(() => {
    const svgNode = svgRef.current;
    const layerNode = layerRef.current;
    if (!svgNode || !layerNode) return;
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 2.5])
      .filter((event: MouseEvent | WheelEvent | TouchEvent) => {
        if (event.type === "wheel") {
          const wheelEvent = event as WheelEvent;
          return wheelEvent.ctrlKey || wheelEvent.metaKey;
        }
        if (event.type.startsWith("touch")) return (event as TouchEvent).touches.length > 1;
        return !(event as MouseEvent).button;
      })
      .on("zoom", (event) => {
        select(layerNode).attr("transform", event.transform.toString());
        const nextLabelsHidden = event.transform.k < READABLE_LABEL_SCALE;
        if (labelsHiddenRef.current !== nextLabelsHidden) {
          labelsHiddenRef.current = nextLabelsHidden;
          setLabelsHidden(nextLabelsHidden);
        }
      });
    zoomRef.current = behavior;
    select(svgNode).call(behavior).on("dblclick.zoom", null);
    const frame = window.requestAnimationFrame(() => applyTransform("readable"));
    return () => {
      window.cancelAnimationFrame(frame);
      select(svgNode).on(".zoom", null);
      zoomRef.current = null;
    };
  }, [applyTransform]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => applyTransform("readable"));
    return () => window.cancelAnimationFrame(frame);
  }, [applyTransform, nodes, relations]);

  return (
    <section aria-labelledby="knowledge-canvas-heading">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="knowledge-canvas-heading" className="text-[11px] font-medium text-ink">Relationship map</h3>
          <p className="mt-0.5 text-[9px] leading-4 text-secondary">Drag with a pointer or use a two-finger drag on touch. Ctrl/Command + scroll zooms. Select a node to read its record.</p>
        </div>
        <div className="flex items-center gap-1" aria-label="Knowledge canvas controls">
          <Button variant="outline" size="icon-xs" className="min-w-0" aria-label="Zoom out" title="Zoom out" onClick={() => applyTransform("out")}><MagnifyingGlassMinus size={13} /></Button>
          <Button variant="outline" size="icon-xs" className="min-w-0" aria-label="Zoom in" title="Zoom in" onClick={() => applyTransform("in")}><MagnifyingGlassPlus size={13} /></Button>
          <Button variant="outline" size="xs" className="min-w-0" onClick={() => applyTransform("overview")}><ArrowsOut size={13} />Overview</Button>
          <Button variant="ghost" size="xs" className="min-w-0" onClick={() => applyTransform("readable")}>Readable</Button>
        </div>
      </div>
      {labelsHidden ? (
        <p className="mb-2 text-[9px] leading-4 text-secondary" role="status">
          Overview hides labels below readable zoom. Choose Readable or zoom in to restore them.
        </p>
      ) : null}

      <div className="relative h-[clamp(420px,62dvh,620px)] overflow-hidden rounded-xs border border-hairline bg-surfaceMuted/30">
        <svg ref={svgRef} className="size-full touch-pan-y" role="group" aria-label="Interactive Estimate System knowledge graph">
          <desc>Interactive entity controls. The complete accessible relationship equivalent appears in the impact path paired with this map.</desc>
          <defs>
            <pattern id="estimate-knowledge-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--divider)" strokeWidth="0.75" />
            </pattern>
            <marker id="estimate-knowledge-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--tertiary)" />
            </marker>
          </defs>
          <g ref={layerRef} className={labelsHidden ? "[&_text]:hidden" : undefined}>
            <rect x={-2400} y={-1800} width={6400} height={5000} fill="url(#estimate-knowledge-grid)" />

            {graph.stages.filter((stage) => visibleStageIds.has(stage.id)).map((stage) => {
              const stageNodes = nodes.filter((node) => node.stageId === stage.id);
              const minX = Math.min(...stageNodes.map((node) => node.x)) - 28;
              const maxX = Math.max(...stageNodes.map((node) => node.x + NODE_WIDTH)) + 28;
              return (
                <g key={stage.id} aria-hidden="true">
                  <rect x={minX} y={36} width={maxX - minX} height={canvasHeight - 56} rx={5} fill="var(--surface)" fillOpacity={0.7} stroke="var(--divider)" />
                  <text x={minX + 14} y={62} fill="var(--ink)" fontSize={12} fontWeight={500}>{stage.title}</text>
                  <text x={minX + 14} y={79} fill="var(--estimate-guide-tertiary)" fontSize={11}>{stage.summary.length > 48 ? stage.summary.slice(0, 48) + "…" : stage.summary}</text>
                </g>
              );
            })}

            {relations.map((relation) => {
              const from = nodeById.get(relation.fromId);
              const to = nodeById.get(relation.toId);
              if (!from || !to) return null;
              const label = relationLabelPoint(from, to);
              return (
                <g
                  key={relation.id}
                  aria-hidden="true"
                  opacity={selectedNodeId && !selectedRelationIds.has(relation.id) ? 0.14 : 1}
                  style={{ transition: "opacity 160ms cubic-bezier(0.16, 1, 0.3, 1)" }}
                >
                  <path
                    d={relationPath(from, to)}
                    fill="none"
                    stroke={relation.status === "boundary" || relation.status === "partial" ? "var(--warning)" : "var(--tertiary)"}
                    strokeDasharray={relation.status === "boundary" ? "7 5" : relation.status === "partial" ? "3 4" : undefined}
                    strokeWidth={relation.status === "boundary" ? 1.8 : 1.35}
                    markerEnd="url(#estimate-knowledge-arrow)"
                  />
                  <text x={label.x} y={label.y} textAnchor="middle" fill="var(--secondary)" fontSize={11} fontWeight={500} paintOrder="stroke" stroke="var(--surface-muted)" strokeWidth={5} strokeLinejoin="round">
                    {relation.label.length > 30 ? relation.label.slice(0, 30) + "…" : relation.label}
                  </text>
                </g>
              );
            })}

            {nodes.map((node) => {
              const color = NODE_COLORS[node.kind];
              const selectedNode = node.id === selectedNodeId;
              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-label={node.title + ". " + node.plainLanguage}
                  className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  transform={"translate(" + node.x + " " + node.y + ")"}
                  opacity={selectedNodeId && !selectedNeighborhoodNodeIds.has(node.id) ? 0.28 : 1}
                  style={{ transition: "opacity 160ms cubic-bezier(0.16, 1, 0.3, 1)" }}
                  onClick={() => onSelectNode(node.id)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    onSelectNode(node.id);
                  }}
                >
                  <title>{node.plainLanguage}</title>
                  <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx={3} fill={color.fill} stroke={selectedNode ? "var(--brand-orange)" : color.stroke} strokeWidth={selectedNode ? 2.5 : 1.2} />
                  <text x={14} y={19} fill={color.stroke} fontSize={11} fontWeight={500}>{color.label}</text>
                  <text x={14} y={41} fill="var(--ink)" fontSize={12} fontWeight={500}>{node.title.length > 29 ? node.title.slice(0, 29) + "…" : node.title}</text>
                  <text x={14} y={60} fill="var(--secondary)" fontSize={11}>{node.scope}</text>
                  {node.status === "partial" || node.status === "legacy" ? (
                    <text x={NODE_WIDTH - 14} y={60} textAnchor="end" fill={node.status === "partial" ? "var(--warning)" : "var(--estimate-guide-tertiary)"} fontSize={11} fontWeight={500}>
                      {knowledgeStatus(node.status).compact}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </section>
  );
}

export function EstimateSystemKnowledgeGraph({
  graph,
  onOpenFeature,
  onOpenPage,
}: EstimateSystemKnowledgeGraphProps) {
  const allInventoryItems = useMemo(() => graph.inventory.flatMap((group) => group.items), [graph.inventory]);
  const defaultInventoryItem = allInventoryItems.find((item) => item.operationId === graph.defaultOperationId)
    ?? allInventoryItems[0]
    ?? null;
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState(defaultInventoryItem?.id ?? "");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [query, setQuery] = useState("");
  const [showWholeSystem, setShowWholeSystem] = useState(false);
  const [canvasExpanded, setCanvasExpanded] = useState(false);
  const [mobileIndexOpen, setMobileIndexOpen] = useState(false);
  const contentRef = useRef<HTMLElement>(null);
  const entityRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const operationById = useMemo(
    () => new Map(graph.operations.map((operation) => [operation.id, operation])),
    [graph.operations],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredInventoryGroups = useMemo(() => graph.inventory
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!normalizedQuery) return true;
        const operation = operationById.get(item.operationId);
        const relatedTitles = operation
          ? [operation.targetNodeId, ...operation.relatedNodeIds]
          .map((nodeId) => {
            const node = findEstimateSystemKnowledgeNode(graph, nodeId);
            return node
              ? [node.title, node.summary, node.plainLanguage, node.scope, node.tags.join(" ")].join(" ")
              : "";
          })
          .join(" ")
          : "";
        return matchesKnowledgeQuery(
          [
            group.title,
            group.summary,
            item.label,
            item.note,
            item.status,
            operation?.title ?? "",
            operation?.question ?? "",
            operation?.summary ?? "",
            operation?.kind ?? "",
            operation?.actor ?? "",
            relatedTitles,
          ].join(" "),
          normalizedQuery,
        );
      }),
    }))
    .filter((group) => group.items.length), [graph, normalizedQuery, operationById]);
  const visibleInventoryItems = useMemo(
    () => filteredInventoryGroups.flatMap((group) => group.items),
    [filteredInventoryGroups],
  );
  const selectedInventoryCandidate = allInventoryItems.find((item) => item.id === selectedInventoryItemId)
    ?? defaultInventoryItem;
  const selectedInventoryItem = normalizedQuery
    ? visibleInventoryItems.find((item) => item.id === selectedInventoryCandidate?.id)
      ?? visibleInventoryItems[0]
      ?? null
    : selectedInventoryCandidate;
  const selectedOperation = selectedInventoryItem
    ? findEstimateSystemKnowledgeOperation(graph, selectedInventoryItem.operationId)
    : null;
  const impact = useMemo(
    () => selectedOperation ? selectEstimateSystemKnowledgeImpact(graph, selectedOperation.id) : null,
    [graph, selectedOperation],
  );
  const visibleNodes = useMemo(
    () => showWholeSystem ? graph.nodes : compactFocusedNodes(graph, impact?.nodes ?? []),
    [graph, impact?.nodes, showWholeSystem],
  );
  const visibleRelations = useMemo(
    () => showWholeSystem ? graph.relations : impact?.relations ?? [],
    [graph.relations, impact?.relations, showWholeSystem],
  );
  const selectedNode = selectedNodeId ? findEstimateSystemKnowledgeNode(graph, selectedNodeId) : null;
  const matchingNodes = useMemo(() => {
    if (!normalizedQuery) return [];
    return graph.nodes.filter((node) => matchesKnowledgeQuery(
      [node.title, node.summary, node.plainLanguage, node.scope, node.tags.join(" ")].join(" "),
      normalizedQuery,
    ));
  }, [graph.nodes, normalizedQuery]);
  const selectedNodeOperations = useMemo(() => {
    if (!selectedNode) return [];
    const relatedOperationIds = new Set(graph.relations
      .filter((relation) => relation.fromId === selectedNode.id || relation.toId === selectedNode.id)
      .flatMap((relation) => relation.operationIds));
    return graph.operations.filter(
      (operation) => operation.targetNodeId === selectedNode.id
        || operation.relatedNodeIds.includes(selectedNode.id)
        || relatedOperationIds.has(operation.id)
        || operation.changes.some((item) => item.nodeId === selectedNode.id)
        || operation.unchanged.some((item) => item.nodeId === selectedNode.id),
    );
  }, [graph.operations, graph.relations, selectedNode]);
  const selectedNodeRelations = useMemo(() => {
    if (!selectedNode) return [];
    return graph.relations.filter(
      (relation) => relation.fromId === selectedNode.id || relation.toId === selectedNode.id,
    );
  }, [graph.relations, selectedNode]);
  const selectedNodeChanges = useMemo(() => {
    if (!selectedNode) return [];
    return uniqueImpactItems(graph.operations.flatMap(
      (operation) => operation.changes.filter((item) => item.nodeId === selectedNode.id),
    ));
  }, [graph.operations, selectedNode]);
  const selectedNodeUnchanged = useMemo(() => {
    if (!selectedNode) return [];
    return uniqueImpactItems(graph.operations.flatMap(
      (operation) => operation.unchanged.filter((item) => item.nodeId === selectedNode.id),
    ));
  }, [graph.operations, selectedNode]);
  const selectedNodeInventoryItems = useMemo(() => {
    const operationIds = new Set(selectedNodeOperations.map((operation) => operation.id));
    return allInventoryItems.filter((item) => operationIds.has(item.operationId));
  }, [allInventoryItems, selectedNodeOperations]);

  function focusRecord(ref: { readonly current: HTMLElement | null }) {
    window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ block: "start", inline: "nearest" });
      ref.current?.focus({ preventScroll: true });
    });
  }

  function selectInventoryItem(item: EstimateSystemKnowledgeInventoryItem) {
    setSelectedInventoryItemId(item.id);
    setSelectedNodeId("");
    setShowWholeSystem(false);
    setMobileIndexOpen(false);
    setQuery("");
    focusRecord(contentRef);
  }

  function clearQueryAndFocus() {
    setQuery("");
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function selectNode(nodeId: string) {
    setShowWholeSystem(true);
    setSelectedNodeId(nodeId);
    setMobileIndexOpen(false);
    focusRecord(entityRef);
  }

  function relatedRecords(pageIds: readonly string[], featureIds: readonly string[]) {
    if (!pageIds.length && !featureIds.length) return null;
    return (
      <section>
        <h3 className="text-[11px] font-medium text-ink">Related guide records</h3>
        <div className="mt-2 flex flex-wrap gap-1">
          {pageIds.map((pageId) => (
            <Button key={pageId} variant="outline" size="xs" className="min-w-0" onClick={() => onOpenPage(pageId)}>
              Page · {humanizeId(pageId)}
            </Button>
          ))}
          {featureIds.map((featureId) => (
            <Button key={featureId} variant="ghost" size="xs" className="min-w-0" onClick={() => onOpenFeature(featureId)}>
              Feature · {humanizeId(featureId)}
            </Button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="lg:col-span-2">
      <header className="border-b border-hairline bg-surface px-3 py-3 lg:px-4">
        <p className="text-[9px] font-medium text-tertiary">Knowledge</p>
        <h2 className="mt-0.5 text-[12px] font-medium leading-5 text-ink">What changes when I…?</h2>
        <p className="mt-1 max-w-4xl text-[10px] leading-4 text-secondary">
          Choose a product action to see what it changes, what it preserves, and how to recover.
        </p>
        <div className="mt-3 border-y border-hairline py-2">
          <p className="text-[10px] font-medium text-ink">Live work and issued client content have different lifecycles.</p>
          <p className="mt-0.5 max-w-5xl text-[10px] leading-4 text-secondary">
            Editing or deleting a live row changes current authoring and future publication source. It does not rewrite an already-issued legacy snapshot or immutable Client Portal issue.
          </p>
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] font-medium text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
            About this guide
          </summary>
          <div className="mt-2 grid gap-3 border-t border-hairline pt-3 lg:grid-cols-[220px_minmax(0,1fr)]">
            <dl className="space-y-1 text-[9px] leading-4">
              <div className="flex justify-between gap-4"><dt className="text-tertiary">Last checked</dt><dd className="text-ink">{graph.lastVerified}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-tertiary">Entities</dt><dd className="text-ink">{graph.integrity.nodeCount}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-tertiary">Effect guides</dt><dd className="text-ink">{graph.integrity.operationCount}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-tertiary">Relationships</dt><dd className="text-ink">{graph.integrity.relationCount}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-tertiary">Actions classified</dt><dd className="text-ink">{graph.integrity.inventoryItemCount}/{graph.integrity.requiredInventoryItemCount}</dd></div>
            </dl>
            <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(KNOWLEDGE_STATUS_COPY)
                .filter(([status]) => status !== "current")
                .map(([status, copy]) => (
                  <div key={status}>
                    <dt className="text-[9px] font-medium text-ink">{copy.label}</dt>
                    <dd className="mt-0.5 text-[9px] leading-4 text-secondary">{copy.description}</dd>
                  </div>
                ))}
            </dl>
          </div>
        </details>
      </header>

      <div className="grid lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="border-b border-hairline bg-surfaceMuted/20 lg:border-b-0 lg:border-r" aria-label="Knowledge action index">
          <div className="p-2 lg:hidden">
            <Button
              variant="outline"
              size="xs"
              className="w-full min-w-0 justify-between"
              aria-expanded={mobileIndexOpen}
              aria-controls="knowledge-action-index-content"
              onClick={() => {
                setMobileIndexOpen((current) => !current);
                window.requestAnimationFrame(() => searchInputRef.current?.focus());
              }}
            >
              {mobileIndexOpen ? "Hide actions" : "Browse actions"}
            </Button>
          </div>
          <div id="knowledge-action-index-content" className={`${mobileIndexOpen ? "block" : "hidden"} lg:block`}>
          <div className="border-b border-hairline p-3">
            <p className="text-[11px] font-medium text-ink">Choose an action</p>
            <p className="mt-1 text-[10px] leading-4 text-secondary">Use the words you would use while working in the app.</p>
            <SearchInput
              ref={searchInputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedNodeId("");
                setShowWholeSystem(false);
              }}
              onClear={clearQueryAndFocus}
              placeholder="Find an action or entity"
              aria-label="Search knowledge actions and entities"
              wrapperClassName="mt-2 border border-hairline bg-white"
            />
          </div>
          <div className="p-2">
            <div className="space-y-3">
              {filteredInventoryGroups.map((group) => (
                <section key={group.id} aria-labelledby={"knowledge-group-" + group.id}>
                  <div className="px-2 pb-1.5">
                    <p id={"knowledge-group-" + group.id} className="text-[9px] font-medium text-ink">{group.title}</p>
                    <p className="mt-0.5 text-[10px] leading-4 text-tertiary">{group.summary}</p>
                  </div>
                  <div className="divide-y divide-hairline border-y border-hairline">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={item.id === selectedInventoryItem?.id}
                        className="flex w-full items-start justify-between gap-2 px-2 py-2 text-left transition-colors duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus aria-pressed:bg-white aria-pressed:shadow-[inset_0_0_0_1px_var(--divider)]"
                        onClick={() => selectInventoryItem(item)}
                      >
                        <span className="min-w-0">
                          <span className="block text-[10px] font-medium leading-4 text-ink">{item.label}</span>
                          <span className="mt-0.5 block text-[10px] font-normal leading-4 text-tertiary">{item.note}</span>
                        </span>
                        <KnowledgeStatusBadge status={item.status} />
                      </button>
                    ))}
                  </div>
                </section>
              ))}
              {!visibleInventoryItems.length ? (
                <div className="border-y border-dashed border-hairline px-2 py-3 text-[9px] leading-4 text-secondary" role="status">
                  No matching action. Try a shorter phrase or choose a matching entity below.
                </div>
              ) : null}
              {matchingNodes.length ? (
                <section className="border-t border-hairline pt-2" aria-labelledby="matching-entities-heading">
                  <p id="matching-entities-heading" className="px-2 pb-1 text-[9px] font-medium text-tertiary">Matching entities</p>
                  <div className="divide-y divide-hairline border-y border-hairline">
                    {matchingNodes.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        className="w-full px-2 py-2 text-left text-[10px] font-medium text-ink hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
                        onClick={() => selectNode(node.id)}
                      >
                        {node.title}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
          </div>
        </aside>

        <article
          ref={contentRef}
          tabIndex={-1}
          aria-label="Knowledge action guide"
          className="scroll-mt-12 min-w-0 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 lg:p-4"
        >
          <p className="sr-only" aria-live="polite">
            {selectedInventoryItem ? selectedInventoryItem.label + " action record selected" : "No action record selected"}
          </p>
          {selectedOperation && selectedInventoryItem ? (
            <div className="space-y-5">
              <header className="flex flex-col gap-3 border-b border-hairline pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[9px] font-medium text-tertiary">{humanizeId(selectedOperation.kind)} action</p>
                    <KnowledgeStatusBadge status={selectedInventoryItem.status} />
                  </div>
                  <h2 className="mt-1 text-[12px] font-medium leading-5 text-ink">{selectedInventoryItem.label}</h2>
                  <p className="mt-1 text-[10px] leading-4 text-secondary">{selectedInventoryItem.note}</p>
                  <p className="mt-2 max-w-3xl text-[10px] leading-4 text-ink">{selectedOperation.summary}</p>
                </div>
                <div className="grid w-full grid-cols-2 rounded-xs border border-hairline p-0.5 sm:w-auto" role="group" aria-label="Knowledge relationship scope">
                  <Button variant={showWholeSystem ? "ghost" : "secondary"} size="xs" className="min-w-0 whitespace-nowrap" aria-pressed={!showWholeSystem} onClick={() => { setShowWholeSystem(false); setSelectedNodeId(""); }}>Focused</Button>
                  <Button variant={showWholeSystem ? "secondary" : "ghost"} size="xs" className="min-w-0 whitespace-nowrap" aria-pressed={showWholeSystem} onClick={() => { setShowWholeSystem(true); setSelectedNodeId(""); }}>Whole system</Button>
                </div>
              </header>

              <dl className="grid border-y border-hairline sm:grid-cols-2 sm:divide-x sm:divide-hairline">
                <div className="py-2 sm:pr-3"><dt className="text-[9px] text-tertiary">Started by</dt><dd className="mt-0.5 text-[10px] leading-4 text-ink">{selectedOperation.actor}</dd></div>
                <div className="border-t border-hairline py-2 sm:border-t-0 sm:pl-3"><dt className="text-[9px] text-tertiary">Where</dt><dd className="mt-0.5 text-[10px] leading-4 text-ink">{selectedOperation.entryPoint}</dd></div>
              </dl>

              <ImpactItems title="What changes" items={selectedOperation.changes} emptyCopy="This is a read-only action. It does not mutate domain data." />
              <ImpactItems title="What stays unchanged" items={selectedOperation.unchanged} />

              <section className="grid gap-4 border-y border-hairline py-3 md:grid-cols-2">
                <div>
                  <h3 className="text-[11px] font-medium text-ink">Guards</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-[10px] leading-4 text-secondary">
                    {selectedOperation.guards.map((guard) => <li key={guard}>{guard}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[11px] font-medium text-ink">Recovery or next step</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-[10px] leading-4 text-secondary">
                    {selectedOperation.recovery.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </section>

              {relatedRecords(selectedOperation.pageIds, selectedOperation.featureIds)}
              <SourceNotes sources={selectedOperation.sources} />

              <section className="border-y border-hairline py-3">
                <h3 className="text-[11px] font-medium text-ink">Impact path</h3>
                <p className="mt-1 text-[9px] leading-4 text-secondary">Direct and downstream effects for this action, in reading order.</p>
                <div className="mt-3">
                  <RelationshipList graph={graph} relations={visibleRelations} onSelectNode={selectNode} />
                </div>
              </section>

              <details
                className="border-y border-hairline py-3"
                open={canvasExpanded}
                onToggle={(event) => setCanvasExpanded(event.currentTarget.open)}
              >
                <summary className="cursor-pointer text-[11px] font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">Explore the relationship map</summary>
                <p className="mt-1 text-[9px] leading-4 text-secondary">Optional spatial view. The Impact path above contains the complete readable equivalent.</p>
                {canvasExpanded ? (
                  <div className="mt-3">
                    <KnowledgeCanvas
                      graph={graph}
                      nodes={visibleNodes}
                      relations={visibleRelations}
                      selectedNodeId={selectedNodeId}
                      onSelectNode={selectNode}
                    />
                  </div>
                ) : null}
              </details>
            </div>
          ) : (
            <div className="border-y border-dashed border-hairline py-6 text-center">
              <h2 className="text-[12px] font-medium text-ink">No matching action</h2>
              <p className="mt-1 text-[10px] leading-4 text-secondary">Choose a matching entity or clear the search to restore the full action index.</p>
            </div>
          )}

          {selectedNode ? (
            <section
              ref={entityRef}
              tabIndex={-1}
              aria-labelledby="knowledge-entity-heading"
              className="mt-6 scroll-mt-12 border-t border-hairline pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            >
              <p className="sr-only" aria-live="polite">{selectedNode.title} entity record selected</p>
              <header className="flex flex-col gap-2 border-b border-hairline pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[9px] font-medium text-tertiary">Entity record</p>
                    <KnowledgeStatusBadge status={selectedNode.status} />
                  </div>
                  <h2 id="knowledge-entity-heading" className="mt-1 text-[12px] font-medium leading-5 text-ink">{selectedNode.title}</h2>
                  <p className="mt-1 max-w-3xl text-[10px] leading-4 text-secondary">{selectedNode.plainLanguage}</p>
                </div>
                <Button variant="plain" size="xs" className="min-w-0 self-start px-0" onClick={() => { setSelectedNodeId(""); focusRecord(contentRef); }}>Return to action</Button>
              </header>

              <dl className="mt-3 grid border-y border-hairline sm:grid-cols-2 sm:divide-x sm:divide-hairline">
                <div className="py-2 sm:pr-3"><dt className="text-[9px] text-tertiary">Kind</dt><dd className="mt-0.5 text-[10px] text-ink">{NODE_COLORS[selectedNode.kind].label}</dd></div>
                <div className="border-t border-hairline py-2 sm:border-t-0 sm:pl-3"><dt className="text-[9px] text-tertiary">Scope</dt><dd className="mt-0.5 text-[10px] text-ink">{selectedNode.scope}</dd></div>
              </dl>

              <div className="mt-5 space-y-5">
                <section>
                  <h3 className="text-[11px] font-medium text-ink">How this entity affects the system</h3>
                  {selectedNodeRelations.length ? (
                    <ul className="mt-2 divide-y divide-hairline border-y border-hairline">
                      {selectedNodeRelations.map((relation) => {
                        const from = findEstimateSystemKnowledgeNode(graph, relation.fromId);
                        const to = findEstimateSystemKnowledgeNode(graph, relation.toId);
                        if (!from || !to) return null;
                        return (
                          <li key={relation.id} className="py-2.5">
                            <p className="text-[10px] font-medium leading-4 text-ink">{from.title} {relation.label} {to.title}</p>
                            <p className="mt-0.5 text-[9px] leading-4 text-secondary">{relation.explanation}</p>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[10px] leading-4 text-secondary">No relationship is attached to this entity yet.</p>
                  )}
                </section>

                <EntityImpactItems
                  title="What can change"
                  items={selectedNodeChanges}
                  emptyCopy="No action directly mutates this entity. Its relationship boundaries are listed above."
                />
                <EntityImpactItems
                  title="What stays unchanged"
                  items={selectedNodeUnchanged}
                  emptyCopy="Open a related action for its complete preservation boundaries."
                />

                {selectedNodeInventoryItems.length ? (
                  <section>
                    <h3 className="text-[11px] font-medium text-ink">Actions that touch this entity</h3>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedNodeInventoryItems.map((item) => (
                        <Button key={item.id} variant="outline" size="xs" className="h-auto min-w-0 whitespace-normal text-left" onClick={() => selectInventoryItem(item)}>
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </section>
                ) : null}

                {relatedRecords(selectedNode.pageIds, selectedNode.featureIds)}
                <SourceNotes sources={selectedNode.sources} />
              </div>
            </section>
          ) : null}
        </article>
      </div>
    </div>
  );
}

function ImpactItems({
  title,
  items,
  emptyCopy,
}: {
  title: string;
  items: readonly EstimateSystemKnowledgeImpactItem[];
  emptyCopy?: string;
}) {
  return (
    <section>
      <h3 className="text-[11px] font-medium text-ink">{title}</h3>
      {items.length ? (
        <ol className="mt-2 divide-y divide-hairline border-y border-hairline">
          {items.map((item, index) => (
            <li key={[item.title, String(index)].join(":")} className="grid gap-2 py-2.5 sm:grid-cols-[28px_minmax(0,1fr)]">
              <span className="text-[8px] tabular-nums text-tertiary">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p className="text-[10px] font-medium leading-4 text-ink">{item.title}</p>
                <p className="mt-0.5 text-[10px] leading-4 text-secondary">{item.description}</p>
                <p className="mt-1 text-[8px] leading-3 text-tertiary">{item.scope} · {item.timing}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 border-y border-hairline py-2 text-[10px] leading-4 text-secondary">{emptyCopy}</p>
      )}
    </section>
  );
}

function EntityImpactItems({
  title,
  items,
  emptyCopy,
}: {
  title: string;
  items: readonly EstimateSystemKnowledgeImpactItem[];
  emptyCopy: string;
}) {
  return (
    <section>
      <h3 className="text-[11px] font-medium text-ink">{title}</h3>
      {items.length ? (
        <ul className="mt-2 divide-y divide-hairline border-y border-hairline">
          {items.map((item) => (
            <li key={[item.title, item.description].join(":")} className="py-2">
              <p className="text-[10px] font-medium text-ink">{item.title}</p>
              <p className="mt-0.5 text-[9px] leading-4 text-secondary">{item.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[10px] leading-4 text-secondary">{emptyCopy}</p>
      )}
    </section>
  );
}
