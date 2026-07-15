export type EstimateSystemKnowledgeSource = Readonly<{
  file: string;
  note: string;
}>;

export type EstimateSystemKnowledgeConfidence = "high" | "medium" | "low";

export type EstimateSystemKnowledgeStage = Readonly<{
  id: string;
  title: string;
  summary: string;
  order: number;
}>;

export type EstimateSystemKnowledgeNodeKind =
  | "definition"
  | "instance"
  | "structure"
  | "calculation"
  | "snapshot"
  | "surface"
  | "event"
  | "boundary";

export type EstimateSystemKnowledgeStatus = "current" | "legacy" | "partial";

export type EstimateSystemKnowledgeNode = Readonly<{
  id: string;
  title: string;
  kind: EstimateSystemKnowledgeNodeKind;
  stageId: string;
  x: number;
  y: number;
  summary: string;
  plainLanguage: string;
  scope: string;
  status: EstimateSystemKnowledgeStatus;
  confidence: EstimateSystemKnowledgeConfidence;
  pageIds: readonly string[];
  featureIds: readonly string[];
  tags: readonly string[];
  sources: readonly EstimateSystemKnowledgeSource[];
}>;

export type EstimateSystemKnowledgeRelationEffect =
  | "contains"
  | "defines"
  | "materializes"
  | "projects"
  | "selects"
  | "changes"
  | "synchronizes"
  | "recalculates"
  | "records"
  | "deletes"
  | "restores"
  | "localizes"
  | "promotes"
  | "snapshots"
  | "serves"
  | "keeps-unchanged"
  | "supersedes"
  | "reviews"
  | "notifies"
  | "refreshes"
  | "guards";

export type EstimateSystemKnowledgeRelation = Readonly<{
  id: string;
  fromId: string;
  toId: string;
  effect: EstimateSystemKnowledgeRelationEffect;
  label: string;
  explanation: string;
  status: "current" | "guarded" | "boundary" | "partial";
  confidence: EstimateSystemKnowledgeConfidence;
  timing: string;
  operationIds: readonly string[];
  sources: readonly EstimateSystemKnowledgeSource[];
}>;

export type EstimateSystemKnowledgeImpactItem = Readonly<{
  title: string;
  description: string;
  nodeId?: string;
  scope: string;
  timing: string;
}>;

export type EstimateSystemKnowledgeOperation = Readonly<{
  id: string;
  title: string;
  question: string;
  kind: "create" | "read" | "update" | "delete" | "restore" | "move" | "copy" | "convert" | "publish" | "review";
  status: "current" | "guarded" | "boundary" | "partial" | "legacy" | "not-applicable";
  confidence: EstimateSystemKnowledgeConfidence;
  actor: string;
  entryPoint: string;
  summary: string;
  targetNodeId: string;
  relatedNodeIds: readonly string[];
  relationIds: readonly string[];
  changes: readonly EstimateSystemKnowledgeImpactItem[];
  unchanged: readonly EstimateSystemKnowledgeImpactItem[];
  guards: readonly string[];
  recovery: readonly string[];
  pageIds: readonly string[];
  featureIds: readonly string[];
  sources: readonly EstimateSystemKnowledgeSource[];
}>;

export type EstimateSystemKnowledgeInventoryItem = Readonly<{
  id: string;
  label: string;
  status: "current" | "guarded" | "legacy" | "boundary" | "partial" | "not-applicable";
  operationId: string;
  note: string;
}>;

export type EstimateSystemKnowledgeInventoryGroup = Readonly<{
  id: string;
  title: string;
  summary: string;
  items: readonly EstimateSystemKnowledgeInventoryItem[];
}>;

export const ESTIMATE_SYSTEM_REQUIRED_OPERATION_IDS = [
  "estimate-create",
  "estimate-read-open",
  "estimate-duplicate",
  "estimate-archive-delete",
  "structure-create",
  "structure-rename",
  "structure-reorder",
  "structure-duplicate-tab",
  "structure-delete-subtree",
  "structure-restore",
  "row-create-blank",
  "row-insert-library",
  "row-read",
  "row-edit-local-fields",
  "row-select-variant",
  "row-move-reorder",
  "row-replace",
  "row-delete",
  "row-bulk-delete",
  "row-undo-restore",
  "project-component-reuse",
  "project-component-edit-shared-fields",
  "project-component-remove-replace-variant",
  "project-component-localize",
  "project-component-promote",
  "library-component-create",
  "library-component-read",
  "library-component-update",
  "library-component-archive",
  "library-component-permanent-delete",
  "library-variant-add",
  "library-variant-edit",
  "library-variant-reorder",
  "library-variant-set-default",
  "library-variant-remove",
  "template-create-edit",
  "template-insert-materialize",
  "template-reorder",
  "template-delete",
  "template-saved-snapshot-fallback",
  "charges-edit-row-inputs",
  "charges-edit-sheet-adjustment",
  "charges-derive-totals",
  "legacy-publication-create",
  "legacy-publication-read",
  "legacy-publication-republish",
  "legacy-publication-revoke",
  "portal-draft",
  "portal-publish-issue",
  "portal-read-issued-content",
  "portal-supersede",
  "portal-withdraw-archive",
  "portal-discuss",
  "portal-decide",
] as const;

export type EstimateSystemKnowledgeGraph = Readonly<{
  version: string;
  lastVerified: string;
  title: string;
  summary: string;
  stages: readonly EstimateSystemKnowledgeStage[];
  nodes: readonly EstimateSystemKnowledgeNode[];
  relations: readonly EstimateSystemKnowledgeRelation[];
  operations: readonly EstimateSystemKnowledgeOperation[];
  inventory: readonly EstimateSystemKnowledgeInventoryGroup[];
  defaultOperationId: string;
  integrity: Readonly<{
    ok: true;
    stageCount: number;
    nodeCount: number;
    relationCount: number;
    operationCount: number;
    inventoryItemCount: number;
    requiredInventoryItemCount: number;
  }>;
}>;

export type EstimateSystemKnowledgeImpact = Readonly<{
  operation: EstimateSystemKnowledgeOperation;
  nodes: readonly EstimateSystemKnowledgeNode[];
  relations: readonly EstimateSystemKnowledgeRelation[];
}>;

type EstimateSystemKnowledgeGraphInput = Omit<EstimateSystemKnowledgeGraph, "integrity">;

function assertPresent(value: string, owner: string, field: string) {
  if (!value.trim()) throw new Error(`${owner} requires ${field}`);
}

function assertUniqueIds(items: readonly { id: string }[], label: string) {
  const ids = new Set<string>();
  for (const item of items) {
    assertPresent(item.id, label, "an id");
    if (ids.has(item.id)) throw new Error(`Duplicate ${label} id: ${item.id}`);
    ids.add(item.id);
  }
}

function assertReferences(
  owner: string,
  references: readonly string[],
  validIds: ReadonlySet<string>,
  targetLabel: string,
) {
  for (const reference of references) {
    if (!validIds.has(reference)) {
      throw new Error(`${owner} references missing ${targetLabel}: ${reference}`);
    }
  }
}

function assertSources(owner: string, sources: readonly EstimateSystemKnowledgeSource[]) {
  if (sources.length === 0) throw new Error(`${owner} requires at least one source`);
  for (const source of sources) {
    assertPresent(source.file, owner, "a source file");
    assertPresent(source.note, owner, "a source note");
  }
}

function assertConfidence(owner: string, confidence: EstimateSystemKnowledgeConfidence) {
  if (!(["high", "medium", "low"] as const).includes(confidence)) {
    throw new Error(`${owner} requires a valid confidence level`);
  }
}

function assertImpactItems(
  owner: string,
  items: readonly EstimateSystemKnowledgeImpactItem[],
  nodeIds: ReadonlySet<string>,
  label: string,
  allowEmpty = false,
) {
  if (!allowEmpty && items.length === 0) throw new Error(`${owner} requires at least one ${label} item`);
  for (const item of items) {
    assertPresent(item.title, owner, `${label} title`);
    assertPresent(item.description, owner, `${label} description`);
    assertPresent(item.scope, owner, `${label} scope`);
    assertPresent(item.timing, owner, `${label} timing`);
    assertReferences(owner, item.nodeId ? [item.nodeId] : [], nodeIds, "impact node");
  }
}

export function defineEstimateSystemKnowledgeGraph(
  input: EstimateSystemKnowledgeGraphInput,
): EstimateSystemKnowledgeGraph {
  assertPresent(input.version, "Knowledge graph", "a version");
  assertPresent(input.lastVerified, "Knowledge graph", "a verification date");
  assertPresent(input.title, "Knowledge graph", "a title");
  assertPresent(input.summary, "Knowledge graph", "a summary");
  if (input.stages.length === 0) throw new Error("Knowledge graph requires stages");
  if (input.nodes.length === 0) throw new Error("Knowledge graph requires nodes");
  if (input.relations.length === 0) throw new Error("Knowledge graph requires relations");
  if (input.operations.length === 0) throw new Error("Knowledge graph requires operations");
  if (input.inventory.length === 0) throw new Error("Knowledge graph requires an operation inventory");

  assertUniqueIds(input.stages, "stage");
  assertUniqueIds(input.nodes, "node");
  assertUniqueIds(input.relations, "relation");
  assertUniqueIds(input.operations, "operation");
  assertUniqueIds(input.inventory, "inventory group");

  const stageIds = new Set(input.stages.map((stage) => stage.id));
  const nodeIds = new Set(input.nodes.map((node) => node.id));
  const relationIds = new Set(input.relations.map((relation) => relation.id));
  const operationIds = new Set(input.operations.map((operation) => operation.id));
  const stageOrders = new Set<number>();

  for (const stage of input.stages) {
    assertPresent(stage.title, `Stage ${stage.id}`, "a title");
    assertPresent(stage.summary, `Stage ${stage.id}`, "a summary");
    if (!Number.isInteger(stage.order) || stage.order < 0) {
      throw new Error(`Stage ${stage.id} requires a non-negative integer order`);
    }
    if (stageOrders.has(stage.order)) throw new Error(`Duplicate stage order: ${stage.order}`);
    stageOrders.add(stage.order);
  }

  for (const node of input.nodes) {
    assertPresent(node.title, `Node ${node.id}`, "a title");
    assertPresent(node.summary, `Node ${node.id}`, "a summary");
    assertPresent(node.plainLanguage, `Node ${node.id}`, "plain language");
    assertPresent(node.scope, `Node ${node.id}`, "a scope");
    assertConfidence(`Node ${node.id}`, node.confidence);
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      throw new Error(`Node ${node.id} requires finite coordinates`);
    }
    assertReferences(`Node ${node.id}`, [node.stageId], stageIds, "stage");
    assertSources(`Node ${node.id}`, node.sources);
  }

  for (const relation of input.relations) {
    assertPresent(relation.label, `Relation ${relation.id}`, "a label");
    assertPresent(relation.explanation, `Relation ${relation.id}`, "an explanation");
    assertPresent(relation.timing, `Relation ${relation.id}`, "timing");
    assertConfidence(`Relation ${relation.id}`, relation.confidence);
    assertReferences(`Relation ${relation.id}`, [relation.fromId, relation.toId], nodeIds, "node");
    if (relation.operationIds.length === 0) {
      throw new Error(`Relation ${relation.id} requires at least one operation`);
    }
    assertReferences(`Relation ${relation.id}`, relation.operationIds, operationIds, "operation");
    assertSources(`Relation ${relation.id}`, relation.sources);
  }

  for (const operation of input.operations) {
    const owner = `Operation ${operation.id}`;
    assertPresent(operation.title, owner, "a title");
    assertPresent(operation.question, owner, "a question");
    assertPresent(operation.actor, owner, "an actor");
    assertPresent(operation.entryPoint, owner, "an entry point");
    assertPresent(operation.summary, owner, "a summary");
    assertConfidence(owner, operation.confidence);
    assertReferences(owner, [operation.targetNodeId, ...operation.relatedNodeIds], nodeIds, "node");
    if (operation.relatedNodeIds.length === 0) throw new Error(`${owner} requires related nodes`);
    if (operation.relationIds.length === 0) throw new Error(`${owner} requires relations`);
    assertReferences(owner, operation.relationIds, relationIds, "relation");
    assertImpactItems(owner, operation.changes, nodeIds, "change", operation.kind === "read" || operation.status === "not-applicable");
    assertImpactItems(owner, operation.unchanged, nodeIds, "unchanged");
    if (operation.guards.length === 0) throw new Error(`${owner} requires guard information`);
    if (operation.recovery.length === 0) throw new Error(`${owner} requires recovery information`);
    assertSources(owner, operation.sources);
  }

  const inventoryItems = input.inventory.flatMap((group) => {
    assertPresent(group.title, `Inventory group ${group.id}`, "a title");
    assertPresent(group.summary, `Inventory group ${group.id}`, "a summary");
    if (group.items.length === 0) throw new Error(`Inventory group ${group.id} requires items`);
    return group.items;
  });
  assertUniqueIds(inventoryItems, "inventory item");
  const requiredInventoryIds = new Set<string>(ESTIMATE_SYSTEM_REQUIRED_OPERATION_IDS);
  const suppliedInventoryIds = new Set(inventoryItems.map((item) => item.id));
  for (const requiredId of requiredInventoryIds) {
    if (!suppliedInventoryIds.has(requiredId)) throw new Error(`Operation inventory is missing required item: ${requiredId}`);
  }
  for (const suppliedId of suppliedInventoryIds) {
    if (!requiredInventoryIds.has(suppliedId)) throw new Error(`Operation inventory contains unknown item: ${suppliedId}`);
  }
  for (const item of inventoryItems) {
    const owner = `Inventory item ${item.id}`;
    assertPresent(item.label, owner, "a label");
    assertPresent(item.note, owner, "a classification note");
    assertReferences(owner, [item.operationId], operationIds, "operation");
  }
  const inventoriedOperationIds = new Set(inventoryItems.map((item) => item.operationId));
  for (const operationId of operationIds) {
    if (!inventoriedOperationIds.has(operationId)) {
      throw new Error(`Operation inventory has no action for effect guide: ${operationId}`);
    }
  }

  const operationsById = new Map(input.operations.map((operation) => [operation.id, operation]));
  const relationsById = new Map(input.relations.map((relation) => [relation.id, relation]));
  for (const operation of input.operations) {
    for (const relationId of operation.relationIds) {
      if (!relationsById.get(relationId)?.operationIds.includes(operation.id)) {
        throw new Error(`Operation ${operation.id} references relation ${relationId} without a reciprocal operation reference`);
      }
    }
  }
  for (const relation of input.relations) {
    for (const operationId of relation.operationIds) {
      if (!operationsById.get(operationId)?.relationIds.includes(relation.id)) {
        throw new Error(`Relation ${relation.id} references operation ${operationId} without a reciprocal relation reference`);
      }
    }
  }

  assertReferences("Knowledge graph default operation", [input.defaultOperationId], operationIds, "operation");

  return {
    ...input,
    integrity: {
      ok: true,
      stageCount: input.stages.length,
      nodeCount: input.nodes.length,
      relationCount: input.relations.length,
      operationCount: input.operations.length,
      inventoryItemCount: inventoryItems.length,
      requiredInventoryItemCount: ESTIMATE_SYSTEM_REQUIRED_OPERATION_IDS.length,
    },
  };
}

export function findEstimateSystemKnowledgeNode(
  graph: EstimateSystemKnowledgeGraph,
  nodeId: string,
) {
  return graph.nodes.find((node) => node.id === nodeId) ?? null;
}

export function findEstimateSystemKnowledgeOperation(
  graph: EstimateSystemKnowledgeGraph,
  operationId: string,
) {
  return graph.operations.find((operation) => operation.id === operationId) ?? null;
}

export function selectEstimateSystemKnowledgeImpact(
  graph: EstimateSystemKnowledgeGraph,
  operationId: string,
): EstimateSystemKnowledgeImpact | null {
  const operation = findEstimateSystemKnowledgeOperation(graph, operationId);
  if (!operation) return null;

  const relationsById = new Map(graph.relations.map((relation) => [relation.id, relation]));
  const relations = operation.relationIds.flatMap((relationId) => {
    const relation = relationsById.get(relationId);
    return relation ? [relation] : [];
  });
  const selectedNodeIds = new Set([
    operation.targetNodeId,
    ...operation.relatedNodeIds,
    ...relations.flatMap((relation) => [relation.fromId, relation.toId]),
    ...operation.changes.flatMap((item) => (item.nodeId ? [item.nodeId] : [])),
    ...operation.unchanged.flatMap((item) => (item.nodeId ? [item.nodeId] : [])),
  ]);

  return {
    operation,
    nodes: graph.nodes.filter((node) => selectedNodeIds.has(node.id)),
    relations,
  };
}
