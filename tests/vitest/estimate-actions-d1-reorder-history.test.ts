import { describe, expect, it, vi } from "vitest";

import type { CurrentUserContext } from "@/lib/auth/session";
import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { EstimateActionsD1Client } from "@/lib/estimates/d1-action-client";

vi.mock("server-only", () => ({}));

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const ESTIMATE_ID = "44444444-4444-4444-8444-444444444444";
const NODE_ID = "55555555-5555-4555-8555-555555555555";
const OTHER_PROJECT_ID = "66666666-6666-4666-8666-666666666666";

type FakeProjectRow = {
  id: string;
  workspace_id: string;
};

type FakeEstimateRow = {
  id: string;
  project_id: string;
};

type FakeNodeRow = {
  id: string;
  estimate_id: string;
  estimate_tab_id?: string | null;
  parent_id: string | null;
  kind?: string;
  name?: string;
  sort_order: number;
};

type FakeHistoryEvent = {
  id: string;
  estimate_id: string;
  workspace_id: string;
  project_id: string;
  event_type: string;
  event_source: string;
  correlation_id: string;
  actor_user_id: string | null;
  changed_fields: unknown;
  old_snapshot: unknown;
  payload: unknown;
};

type CapturedStatement = {
  sql: string;
  values: D1Value[];
};

type FakeRowItem = Record<string, D1Value | undefined>;

type FakeComponentAttachment = {
  id: string;
  owner_scope: "project";
  price_option_id: string;
  item_id: null;
  project_id: string;
  project_component_id: string;
  workspace_id: string;
  upload_asset_id: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  attachment_kind: "pdf" | "excel";
  metadata_json: string;
  created_by: string;
  review_status: "uploaded" | "approved" | "rejected" | "superseded";
  applicable_cost_entry_id: null;
  is_current_approved: number;
  review_revision: number;
  created_at: string;
  updated_at: string;
};

type FakeUploadAsset = {
  id: string;
  workspace_id: string;
  actor_user_id: string;
  project_id: string;
  surface: "component-attachment";
  target_entity_type: "project-component";
  target_entity_id: string;
  status: "finalized" | "removed";
  file_name: string;
  content_type: string;
  size_bytes: number;
  scan_status: "pending" | "clean";
  scan_override_expires_at: null;
  storage_bucket: "component-attachments";
  storage_path: string;
  metadata_json: string;
};

function parseJsonValue(value: D1Value | undefined) {
  if (typeof value !== "string") return value;
  return JSON.parse(value);
}

function readJsonRecord(value: unknown) {
  if (typeof value === "string") {
    try {
      return readJsonRecord(JSON.parse(value) as unknown);
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function projectComponentIdentity(row: FakeRowItem) {
  const sourceSnapshot = readJsonRecord(row.source_snapshot_json);
  if (
    sourceSnapshot.sourceType === "project_component"
    || sourceSnapshot.sourceType === "promoted_project_component"
    || sourceSnapshot.sourceType === "promoted_express_component"
    || sourceSnapshot.sourceType === "express_component"
  ) {
    const sourceComponentId = typeof sourceSnapshot.sourceComponentId === "string" ? sourceSnapshot.sourceComponentId.trim() : "";
    if (sourceComponentId) return sourceComponentId;
    const sourceEstimateRowId = typeof sourceSnapshot.sourceEstimateRowId === "string" ? sourceSnapshot.sourceEstimateRowId.trim() : "";
    if (sourceEstimateRowId) return sourceEstimateRowId;
  }

  const metadata = readJsonRecord(row.metadata_json);
  const projection = readJsonRecord(metadata.projectComponentProjection);
  const expressComponent = readJsonRecord(metadata.expressComponent);
  return String(projection.componentId ?? expressComponent.componentId ?? expressComponent.id ?? "");
}

function applyEstimateRowUpdate(database: FakeD1Database, statement: CapturedStatement) {
  const assignments = statement.sql
    .slice(statement.sql.indexOf(" SET ") + 5, statement.sql.indexOf(" WHERE "))
    .split(",")
    .map((assignment) => assignment.trim().split(" = ")[0]);
  const hasRevisionGuard = statement.sql.includes("AND row_revision = ?");
  const rowId = String(statement.values[statement.values.length - (hasRevisionGuard ? 3 : 2)] ?? "");
  const estimateId = String(statement.values[statement.values.length - (hasRevisionGuard ? 2 : 1)] ?? "");
  const row = database.rowItems.get(rowId);
  if (!row || row.estimate_id !== estimateId) return;
  assignments.forEach((column, index) => {
    row[column] = statement.values[index];
  });
}

function createCurrentUserContext(): CurrentUserContext {
  const now = "2026-07-06T00:00:00.000Z";
  return {
    avatarUrl: null,
    displayName: "Estimator Owner",
    email: "owner@example.test",
    profile: {
      avatar_url: null,
      created_at: now,
      default_workspace_id: WORKSPACE_ID,
      display_name: "Estimator Owner",
      email: "owner@example.test",
      id: USER_ID,
      role: "member",
      updated_at: now,
    },
    role: "member",
    userId: USER_ID,
  };
}

function makeProjectComponentVariantRow(input: {
  id: string;
  selectedPriceOptionId: string;
  description: string;
  unit: string;
  unitCost: number;
  quantity: number;
  miscCost?: number;
  rowRevision: number;
  priceOptions: Array<Record<string, unknown>>;
}) {
  const selectedOption = input.priceOptions.find((option) => option.id === input.selectedPriceOptionId);
  return {
    id: input.id,
    estimate_id: ESTIMATE_ID,
    node_id: NODE_ID,
    material: "Project cabinet",
    description: input.description,
    supplier: "Local shop",
    unit: input.unit,
    quantity: input.quantity,
    quantity_base: null,
    quantity_contingency_amount: null,
    unit_cost: input.unitCost,
    contingency_percentage: 0,
    adjustment_percentage: 0,
    misc_cost: input.miscCost ?? 0,
    source_snapshot_json: JSON.stringify({
      sourceType: "project_component",
      sourceComponentId: "project-component-variants",
      sourceEstimateRowId: input.id,
      priceOptionId: input.selectedPriceOptionId,
      priceOptionLabel: selectedOption?.label,
      description: input.description,
      unit: input.unit,
      unit_cost: input.unitCost,
      sku: selectedOption?.sku ?? null,
      imageUrl: selectedOption?.thumbnailPath ?? null,
      priceOptions: input.priceOptions,
    }),
    metadata_json: JSON.stringify({}),
    link_state: "unlinked",
    source_library_item_id: null,
    sort_order: input.rowRevision * 1000,
    row_revision: input.rowRevision,
    created_at: "2026-07-06T00:00:00.000Z",
    updated_at: "2026-07-06T00:00:00.000Z",
  } satisfies FakeRowItem;
}

class FakeD1Statement<T = Record<string, unknown>> {
  values: D1Value[] = [];

  constructor(
    private readonly database: FakeD1Database,
    readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    this.database.firstStatements.push(this);

    if (this.sql.includes("SELECT 1 AS allowed") && this.sql.includes("FROM estimates estimate")) {
      const estimateId = String(this.values[0] ?? "");
      const estimate = this.database.estimates.get(estimateId);
      const projectCreatorUserId = this.values[3];
      return estimate && projectCreatorUserId === USER_ID ? ({ allowed: 1 } as R) : null;
    }

    if (this.sql.includes("SELECT 1 AS allowed") && this.sql.includes("FROM projects project")) {
      const projectId = String(this.values[0] ?? "");
      return this.database.projects.has(projectId) && this.values.includes(USER_ID)
        ? ({ allowed: 1 } as R)
        : null;
    }

    if (this.sql.includes("SELECT id, payload") && this.sql.includes("FROM estimate_sheet_events")) {
      const estimateId = String(this.values[0] ?? "");
      const correlationId = String(this.values[1] ?? "");
      const existing = this.database.historyEvents.find(
        (event) => event.estimate_id === estimateId && event.correlation_id === correlationId,
      );
      return existing ? ({ id: existing.id, payload: JSON.stringify(existing.payload) } as R) : null;
    }

    if (this.sql.includes("SELECT *") && this.sql.includes("FROM estimate_sheet_events")) {
      const eventId = String(this.values[0] ?? "");
      const estimateId = String(this.values[1] ?? "");
      const projectId = String(this.values[2] ?? "");
      const existing = this.database.historyEvents.find(
        (event) => event.id === eventId && event.estimate_id === estimateId && event.project_id === projectId,
      );
      return existing
        ? ({
            ...existing,
            old_snapshot: JSON.stringify(existing.old_snapshot),
            payload: JSON.stringify(existing.payload),
          } as R)
        : null;
    }

    if (this.sql.includes("SELECT estimate.id, estimate.project_id, project.workspace_id")) {
      const estimateId = String(this.values[0] ?? "");
      const expectedProjectId = this.values.length > 1 ? String(this.values[1] ?? "") : null;
      const estimate = this.database.estimates.get(estimateId);
      const project = estimate ? this.database.projects.get(estimate.project_id) : null;
      return estimate && project && (!expectedProjectId || estimate.project_id === expectedProjectId)
        ? ({ id: estimate.id, project_id: estimate.project_id, workspace_id: project.workspace_id } as R)
        : null;
    }

    if (this.sql.includes("SELECT id, workspace_id") && this.sql.includes("FROM projects")) {
      const projectId = String(this.values[0] ?? "");
      const project = this.database.projects.get(projectId);
      return project ? ({ ...project } as R) : null;
    }

    if (this.sql.includes("SELECT row_item.*") && this.sql.includes("project.workspace_id")) {
      const rowId = String(this.values[0] ?? "");
      const estimateId = String(this.values[1] ?? "");
      const projectId = String(this.values[2] ?? "");
      const row = this.database.rowItems.get(rowId);
      const estimate = this.database.estimates.get(estimateId);
      const project = estimate ? this.database.projects.get(estimate.project_id) : null;
      return row && row.estimate_id === estimateId && estimate?.project_id === projectId && project
        ? ({ ...row, workspace_id: project.workspace_id } as R)
        : null;
    }

    if (this.sql.includes("FROM estimate_row_items") && this.sql.includes("WHERE estimate_id = ?")) {
      const estimateId = String(this.values[0] ?? "");
      const rowId = String(this.values[1] ?? "");
      const row = this.database.rowItems.get(rowId);
      return row && row.estimate_id === estimateId ? ({ ...row } as R) : null;
    }

    return null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    this.database.allStatements.push(this);
    if (this.sql.includes("row_item.id AS row_id") && this.sql.includes("project.id = ?")) {
      const projectId = String(this.values[0] ?? "");
      const sourceRowId = String(this.values[1] ?? "");
      const componentId = String(this.values[2] ?? "");
      const results = [...this.database.rowItems.values()]
        .filter((row) => {
          const estimate = this.database.estimates.get(String(row.estimate_id ?? ""));
          return estimate?.project_id === projectId
            && (row.id === sourceRowId || projectComponentIdentity(row) === componentId);
        })
        .map((row) => {
          const sourceSnapshot = readJsonRecord(row.source_snapshot_json);
          const metadata = readJsonRecord(row.metadata_json);
          return {
            row_id: row.id,
            row_revision: row.row_revision,
            project_id: projectId,
            project_name: "Project",
            estimate_id: row.estimate_id,
            estimate_name: "Estimate",
            selected_price_option_id: sourceSnapshot.priceOptionId ?? metadata.priceOptionId ?? null,
          };
        }) as R[];
      return { results, success: true };
    }
    if (this.sql.includes("FROM estimate_row_items row_item") && this.sql.includes("INNER JOIN estimates estimate")) {
      const projectId = String(this.values[0] ?? "");
      const excludedRowId = String(this.values[1] ?? "");
      const componentId = String(this.values[2] ?? "");
      const results = [...this.database.rowItems.values()]
        .filter((row) => {
          const estimate = this.database.estimates.get(String(row.estimate_id ?? ""));
          return estimate?.project_id === projectId
            && row.id !== excludedRowId
            && projectComponentIdentity(row) === componentId;
        })
        .map((row) => ({ ...row })) as R[];
      return { results, success: true };
    }
    if (this.sql.includes("FROM component_variant_attachments") && this.sql.includes("owner_scope = 'project'")) {
      const [workspaceId, projectId, componentId] = this.values.map(String);
      const results = [...this.database.componentAttachments.values()]
        .filter((attachment) => attachment.workspace_id === workspaceId
          && attachment.project_id === projectId
          && attachment.project_component_id === componentId)
        .map((attachment) => ({ ...attachment })) as R[];
      return { results, success: true };
    }
    if (this.sql.includes("FROM upload_assets") && this.sql.includes("WHERE id IN (")) {
      const ids = new Set(this.values.map(String));
      const results = [...this.database.uploadAssets.values()]
        .filter((asset) => ids.has(asset.id))
        .map((asset) => ({ ...asset })) as R[];
      return { results, success: true };
    }
    if (this.sql.includes("FROM estimate_nodes") && (this.sql.includes("WHERE estimate_id = ?") || this.sql.includes("node.estimate_id = ?"))) {
      const estimateId = String(this.values[0] ?? "");
      const selectedIds = this.sql.includes("id IN (") ? new Set(this.values.slice(1).map(String)) : null;
      const results = [...this.database.nodes.values()]
        .filter((node) => node.estimate_id === estimateId && (!selectedIds || selectedIds.has(node.id)))
        .sort((left, right) => /ORDER BY\s+(?:node\.)?sort_order ASC,\s*(?:node\.)?id ASC/.test(this.sql)
          ? left.sort_order - right.sort_order || left.id.localeCompare(right.id)
          : 0)
        .map((node) => ({ ...node })) as R[];
      return { results, success: true };
    }
    if (this.sql.includes("FROM estimate_row_items") && this.sql.includes(" AND id IN (")) {
      const estimateId = String(this.values[0] ?? "");
      const rowIds = new Set(this.values.slice(1).map(String));
      const results = [...this.database.rowItems.values()]
        .filter((row) => row.estimate_id === estimateId && rowIds.has(String(row.id ?? "")))
        .map((row) => ({ ...row })) as R[];
      return { results, success: true };
    }
    if (this.sql.includes("FROM estimate_row_items") && this.sql.includes("node_id IN (")) {
      const estimateId = String(this.values[0] ?? "");
      const nodeIds = new Set(this.values.slice(1).map(String));
      const results = [...this.database.rowItems.values()]
        .filter((row) => row.estimate_id === estimateId && nodeIds.has(String(row.node_id ?? "")))
        .map((row) => ({ ...row })) as R[];
      return { results, success: true };
    }
    return { results: [], success: true };
  }

  applyMutation(): D1Result<T> {
    if (this.sql.includes("INSERT INTO estimate_sheet_events")) {
      const [
        id,
        estimateId,
        workspaceId,
        projectId,
        ,
        ,
        ,
        eventType,
        eventSource,
        correlationId,
        actorUserId,
        changedFields,
        ,
        oldSnapshot,
        ,
        payload,
      ] = this.values;
      this.database.historyEvents.push({
        id: String(id),
        estimate_id: String(estimateId),
        workspace_id: String(workspaceId),
        project_id: String(projectId),
        event_type: String(eventType),
        event_source: String(eventSource),
        correlation_id: String(correlationId),
        actor_user_id: actorUserId === null ? null : String(actorUserId),
        changed_fields: parseJsonValue(changedFields),
        old_snapshot: parseJsonValue(oldSnapshot),
        payload: parseJsonValue(payload),
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.startsWith("DELETE FROM estimate_row_items")) {
      const estimateId = String(this.values[0] ?? "");
      const nodeIds = new Set(this.values.slice(1).map(String));
      for (const [rowId, row] of this.database.rowItems) {
        if (row.estimate_id === estimateId && nodeIds.has(String(row.node_id ?? ""))) this.database.rowItems.delete(rowId);
      }
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.startsWith("DELETE FROM estimate_nodes")) {
      const estimateId = String(this.values[0] ?? "");
      const nodeIds = new Set(this.values.slice(1).map(String));
      for (const [nodeId, node] of this.database.nodes) {
        if (node.estimate_id === estimateId && nodeIds.has(nodeId)) this.database.nodes.delete(nodeId);
      }
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.startsWith("INSERT INTO estimate_nodes")) {
      const columns = this.sql.slice(this.sql.indexOf("(") + 1, this.sql.indexOf(")")).split(",").map((column) => column.trim());
      const rowCount = Math.max(1, Math.floor(this.values.length / Math.max(columns.length, 1)));
      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const offset = rowIndex * columns.length;
        const record = Object.fromEntries(columns.map((column, index) => [column, this.values[offset + index]]));
        this.database.nodes.set(String(record.id), {
          id: String(record.id),
          estimate_id: String(record.estimate_id),
          estimate_tab_id: record.estimate_tab_id === null ? null : String(record.estimate_tab_id),
          parent_id: record.parent_id === null ? null : String(record.parent_id),
          sort_order: Number(record.sort_order),
        });
      }
      return { success: true, meta: { changes: rowCount } };
    }

    if (this.sql.startsWith("INSERT INTO estimate_row_items")) {
      const columns = this.sql.slice(this.sql.indexOf("(") + 1, this.sql.indexOf(")")).split(",").map((column) => column.trim());
      const rowCount = Math.max(1, Math.floor(this.values.length / Math.max(columns.length, 1)));
      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const offset = rowIndex * columns.length;
        const record = Object.fromEntries(columns.map((column, index) => [column, this.values[offset + index]]));
        this.database.rowItems.set(String(record.id), record);
      }
      return { success: true, meta: { changes: rowCount } };
    }

    if (this.sql.includes("UPDATE estimate_nodes SET parent_id = ?")) {
      const [parentId, sortOrder, , nodeId, estimateId] = this.values;
      const node = this.database.nodes.get(String(nodeId));
      if (node && node.estimate_id === estimateId) {
        node.parent_id = parentId === null ? null : String(parentId);
        node.sort_order = Number(sortOrder);
      }
      return { success: true, meta: { changes: node ? 1 : 0 } };
    }

    if (this.sql.includes("UPDATE estimate_row_items SET")) {
      applyEstimateRowUpdate(this.database, this);
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.includes("INSERT INTO component_variant_attachments")) {
      const [
        id, priceOptionId, projectId, projectComponentId, workspaceId, uploadAssetId,
        storageBucket, storagePath, fileName, contentType, sizeBytes, attachmentKind,
        metadataJson, createdBy, createdAt, updatedAt,
      ] = this.values;
      this.database.componentAttachments.set(String(id), {
        id: String(id),
        owner_scope: "project",
        price_option_id: String(priceOptionId),
        item_id: null,
        project_id: String(projectId),
        project_component_id: String(projectComponentId),
        workspace_id: String(workspaceId),
        upload_asset_id: String(uploadAssetId),
        storage_bucket: String(storageBucket),
        storage_path: String(storagePath),
        file_name: String(fileName),
        content_type: String(contentType),
        size_bytes: Number(sizeBytes),
        attachment_kind: String(attachmentKind) as "pdf" | "excel",
        metadata_json: String(metadataJson),
        created_by: String(createdBy),
        review_status: "uploaded",
        applicable_cost_entry_id: null,
        is_current_approved: 0,
        review_revision: 1,
        created_at: String(createdAt),
        updated_at: String(updatedAt),
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.includes("UPDATE component_variant_attachments") && this.sql.includes("review_status = 'superseded'")) {
      const attachmentId = String(this.values[3] ?? "");
      const attachment = this.database.componentAttachments.get(attachmentId);
      if (attachment) {
        attachment.review_status = "superseded";
        attachment.is_current_approved = 0;
        attachment.review_revision += 1;
        attachment.updated_at = String(this.values[2] ?? attachment.updated_at);
      }
      return { success: true, meta: { changes: attachment ? 1 : 0 } };
    }

    if (this.sql.includes("UPDATE upload_assets") && this.sql.includes("status = 'removed'")) {
      const assetId = String(this.values[1] ?? "");
      const asset = this.database.uploadAssets.get(assetId);
      if (asset) asset.status = "removed";
      return { success: true, meta: { changes: asset ? 1 : 0 } };
    }

    return { success: true, meta: { changes: 0 } };
  }

  async run(): Promise<D1Result<T>> {
    this.database.runStatements.push(this);
    return this.applyMutation();
  }
}

class FakeD1Database implements D1DatabaseLike {
  allStatements: CapturedStatement[] = [];
  firstStatements: CapturedStatement[] = [];
  runStatements: CapturedStatement[] = [];
  batchStatements: CapturedStatement[] = [];
  projects = new Map<string, FakeProjectRow>([
    [PROJECT_ID, { id: PROJECT_ID, workspace_id: WORKSPACE_ID }],
  ]);
  estimates = new Map<string, FakeEstimateRow>([
    [ESTIMATE_ID, { id: ESTIMATE_ID, project_id: PROJECT_ID }],
  ]);
  nodes = new Map<string, FakeNodeRow>([
    [NODE_ID, { id: NODE_ID, estimate_id: ESTIMATE_ID, parent_id: "old-parent", sort_order: 10 }],
  ]);
  rowItems = new Map<string, FakeRowItem>();
  componentAttachments = new Map<string, FakeComponentAttachment>();
  uploadAssets = new Map<string, FakeUploadAsset>();
  historyEvents: FakeHistoryEvent[] = [];

  prepare<T = Record<string, unknown>>(sql: string) {
    return new FakeD1Statement<T>(this, sql);
  }

  async batch<T = Record<string, unknown>>(statements: Array<D1PreparedStatementLike<T>>): Promise<Array<D1Result<T>>> {
    const fakeStatements = statements as Array<FakeD1Statement<T>>;
    this.batchStatements.push(...fakeStatements);
    return fakeStatements.map((statement) => statement.applyMutation());
  }
}

describe("EstimateActionsD1Client reorder history", () => {
  it("writes scoped reorder history with project and workspace context", async () => {
    const database = new FakeD1Database();
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());
    const updates = [{ id: NODE_ID, parent_id: null, sort_order: 20 }];

    const result = await client.call<{ updatedNodeCount: number }>("reorder_estimate_nodes_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      move_updates: updates,
      acting_user_id: USER_ID,
      correlation_id: "reorder-correlation-1",
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ updatedNodeCount: 1 });
    expect(database.nodes.get(NODE_ID)).toMatchObject({ parent_id: null, sort_order: 20 });
    expect(database.historyEvents).toHaveLength(1);
    expect(database.batchStatements.some((statement) => statement.sql.includes("UPDATE estimate_nodes"))).toBe(true);
    expect(database.batchStatements.some((statement) => statement.sql.includes("INSERT INTO estimate_sheet_events"))).toBe(true);
    expect(database.historyEvents[0]).toMatchObject({
      workspace_id: WORKSPACE_ID,
      project_id: PROJECT_ID,
      event_type: "estimate_nodes_reordered",
      event_source: "server_action",
      correlation_id: "reorder-correlation-1",
      actor_user_id: USER_ID,
      changed_fields: ["parent_id", "sort_order"],
      payload: { updates },
    });
  });

  it.each([
    ["missing", {}],
    ["empty", { target_project_id: "" }],
    ["unknown", { target_project_id: OTHER_PROJECT_ID }],
  ])("rejects %s target_project_id before mutating reordered nodes", async (_label, projectScope) => {
    const database = new FakeD1Database();
    const before = { ...database.nodes.get(NODE_ID) };
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("reorder_estimate_nodes_with_history", {
      ...projectScope,
      target_estimate_id: ESTIMATE_ID,
      move_updates: [{ id: NODE_ID, parent_id: null, sort_order: 20 }],
      acting_user_id: USER_ID,
      correlation_id: `reorder-preflight-${_label}`,
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("Estimate history event workspace could not be resolved.");
    expect(database.nodes.get(NODE_ID)).toEqual(before);
    expect(database.batchStatements).toEqual([]);
    expect(database.historyEvents).toEqual([]);
  });

  it("rejects a valid project that does not own the estimate before mutating reordered nodes", async () => {
    const database = new FakeD1Database();
    database.projects.set(OTHER_PROJECT_ID, { id: OTHER_PROJECT_ID, workspace_id: WORKSPACE_ID });
    const before = { ...database.nodes.get(NODE_ID) };
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("reorder_estimate_nodes_with_history", {
      target_project_id: OTHER_PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      move_updates: [{ id: NODE_ID, parent_id: null, sort_order: 20 }],
      acting_user_id: USER_ID,
      correlation_id: "reorder-wrong-project",
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("Estimate not found in the current project.");
    expect(database.nodes.get(NODE_ID)).toEqual(before);
    expect(database.batchStatements).toEqual([]);
    expect(database.historyEvents).toEqual([]);
  });

  it.each([
    ["an unknown updated node", [{ id: "missing-node", parent_id: null, sort_order: 10 }], "Estimate tree update node not found in the current estimate."],
    ["an unknown parent", [{ id: NODE_ID, parent_id: "missing-parent", sort_order: 10 }], "Estimate tree update parent not found in the current estimate."],
  ])("rejects %s before mutating D1", async (_label, moveUpdates, expectedMessage) => {
    const database = new FakeD1Database();
    const before = [...database.nodes.entries()];
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("reorder_estimate_nodes_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      move_updates: moveUpdates,
      acting_user_id: USER_ID,
      correlation_id: `reorder-invalid-${_label}`,
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe(expectedMessage);
    expect([...database.nodes.entries()]).toEqual(before);
    expect(database.batchStatements).toEqual([]);
    expect(database.historyEvents).toEqual([]);
  });

  it("rejects node ids that belong to another estimate before mutating D1", async () => {
    const database = new FakeD1Database();
    database.estimates.set("other-estimate", { id: "other-estimate", project_id: PROJECT_ID });
    database.nodes.set("other-node", {
      id: "other-node",
      estimate_id: "other-estimate",
      parent_id: null,
      sort_order: 10,
    });
    const before = [...database.nodes.entries()];
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("reorder_estimate_nodes_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      move_updates: [{ id: "other-node", parent_id: null, sort_order: 20 }],
      acting_user_id: USER_ID,
      correlation_id: "reorder-cross-estimate",
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("Estimate tree update node not found in the current estimate.");
    expect([...database.nodes.entries()]).toEqual(before);
    expect(database.batchStatements).toEqual([]);
  });

  it("reads reordered siblings through the D1 query path by sort order then id", async () => {
    const database = new FakeD1Database();
    database.nodes = new Map<string, FakeNodeRow>([
      ["node-c", { id: "node-c", estimate_id: ESTIMATE_ID, parent_id: null, sort_order: 30 }],
      ["node-b", { id: "node-b", estimate_id: ESTIMATE_ID, parent_id: null, sort_order: 20 }],
      ["node-a", { id: "node-a", estimate_id: ESTIMATE_ID, parent_id: null, sort_order: 10 }],
    ]);
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const reorder = await client.call("reorder_estimate_nodes_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      // DEC-AUTO-008: the planner dense-renumbers sibling slots. Equal slots
      // remain deterministic on read via the id tiebreaker; they are not rejected.
      move_updates: [
        { id: "node-c", parent_id: null, sort_order: 10 },
        { id: "node-b", parent_id: null, sort_order: 10 },
        { id: "node-a", parent_id: null, sort_order: 20 },
      ],
      acting_user_id: USER_ID,
      correlation_id: "reorder-readback",
    });
    const readback = await client
      .from("estimate_nodes")
      .select("*")
      .eq("estimate_id", ESTIMATE_ID)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    expect(reorder.error).toBeNull();
    expect(readback.error).toBeNull();
    expect((readback.data as FakeNodeRow[] | null)?.map((node) => node.id)).toEqual(["node-b", "node-c", "node-a"]);
  });

  it("restores a deleted node subtree and its rows from D1 history snapshots", async () => {
    const database = new FakeD1Database();
    database.nodes = new Map<string, FakeNodeRow>([
      ["ground-floor", { id: "ground-floor", estimate_id: ESTIMATE_ID, estimate_tab_id: "tab-a", parent_id: null, sort_order: 10 }],
      ["kitchen", { id: "kitchen", estimate_id: ESTIMATE_ID, estimate_tab_id: "tab-a", parent_id: "ground-floor", sort_order: 20 }],
    ]);
    database.rowItems.set("row-1", {
      id: "row-1",
      estimate_id: ESTIMATE_ID,
      node_id: "kitchen",
      material: "Cabinet",
      quantity: 1,
      unit_cost: 100,
      misc_cost: 0,
      contingency_percentage: 0,
      adjustment_percentage: 0,
      sort_order: 10,
      row_revision: 1,
    });
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const deletion = await client.call<{ eventId: string }>("delete_estimate_node_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_node_id: "ground-floor",
      acting_user_id: USER_ID,
      correlation_id: "delete-for-restore",
    });
    const restore = await client.call("restore_deleted_estimate_nodes_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      source_delete_event_id: deletion.data?.eventId,
      target_node_ids: ["ground-floor"],
      acting_user_id: USER_ID,
      correlation_id: "restore-deleted-tree",
    });

    expect(deletion.error).toBeNull();
    expect(database.historyEvents[0]?.old_snapshot).toMatchObject({
      nodes: [
        expect.objectContaining({ id: "ground-floor", estimate_id: ESTIMATE_ID }),
        expect.objectContaining({ id: "kitchen", estimate_id: ESTIMATE_ID }),
      ],
      rows: [expect.objectContaining({ id: "row-1", node_id: "kitchen" })],
    });
    expect(restore.error).toBeNull();
    expect(restore.data).toMatchObject({
      sourceEventId: deletion.data?.eventId,
      restoredNodeIds: ["ground-floor", "kitchen"],
      restoredRootNodeIds: ["ground-floor"],
      restoredNodeCount: 2,
      restoredRowIds: ["row-1"],
      restoredRowCount: 1,
    });
    expect([...database.nodes.keys()]).toEqual(["ground-floor", "kitchen"]);
    expect(database.rowItems.has("row-1")).toBe(true);
  });

  it("rejects restore collisions before writing any batch statements", async () => {
    const database = new FakeD1Database();
    database.historyEvents.push({
      id: "delete-event-with-collision",
      estimate_id: ESTIMATE_ID,
      workspace_id: WORKSPACE_ID,
      project_id: PROJECT_ID,
      event_type: "estimate_node_deleted",
      event_source: "server_action",
      correlation_id: "delete-collision-source",
      actor_user_id: USER_ID,
      changed_fields: [],
      old_snapshot: {
        nodeIds: [NODE_ID],
        nodes: [{
          id: NODE_ID,
          estimate_id: ESTIMATE_ID,
          parent_id: null,
          kind: "group",
          name: "Existing node",
          sort_order: 10,
        }],
        rows: [],
      },
      payload: {},
    });
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("restore_deleted_estimate_nodes_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      source_delete_event_id: "delete-event-with-collision",
      target_node_ids: [NODE_ID],
      acting_user_id: USER_ID,
      correlation_id: "restore-collision",
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("One or more estimate nodes to restore already exist.");
    expect(database.batchStatements).toEqual([]);
    expect(database.historyEvents).toHaveLength(1);
  });

  it("propagates project component field edits to sibling row instances", async () => {
    const database = new FakeD1Database();
    const metadata = JSON.stringify({
      expressComponent: {
        kind: "express",
        schemaVersion: 1,
        id: "project-component-1",
        componentId: "project-component-1",
      },
    });
    database.rowItems = new Map<string, FakeRowItem>([
      ["row-1", {
        id: "row-1",
        estimate_id: ESTIMATE_ID,
        node_id: NODE_ID,
        material: "Original cabinet",
        description: "Original",
        supplier: "Local shop",
        unit: "lm",
        quantity: 2,
        quantity_base: null,
        quantity_contingency_amount: null,
        unit_cost: 100,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        misc_cost: 0,
        source_snapshot_json: JSON.stringify({
          sourceType: "project_component",
          sourceComponentId: "project-component-1",
          sourceEstimateRowId: "row-1",
          brand: "Old brand",
        }),
        metadata_json: metadata,
        link_state: "unlinked",
        source_library_item_id: null,
        sort_order: 1000,
        row_revision: 1,
        created_at: "2026-07-06T00:00:00.000Z",
        updated_at: "2026-07-06T00:00:00.000Z",
      }],
      ["row-2", {
        id: "row-2",
        estimate_id: ESTIMATE_ID,
        node_id: NODE_ID,
        material: "Original cabinet",
        description: "Second instance",
        supplier: "Local shop",
        unit: "lm",
        quantity: 5,
        quantity_base: null,
        quantity_contingency_amount: null,
        unit_cost: 100,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        misc_cost: 0,
        source_snapshot_json: JSON.stringify({
          sourceType: "project_component",
          sourceComponentId: "project-component-1",
          sourceEstimateRowId: "row-2",
          brand: "Old brand",
        }),
        metadata_json: metadata,
        link_state: "unlinked",
        source_library_item_id: null,
        sort_order: 2000,
        row_revision: 3,
        created_at: "2026-07-06T00:00:00.000Z",
        updated_at: "2026-07-06T00:00:00.000Z",
      }],
    ]);
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("update_estimate_row_item_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_row_id: "row-1",
      expected_row_revision: 1,
      row_patch: {
        material: "Updated shared cabinet",
        quantity: 9,
        unitCost: 150,
        sourceSnapshot: {
          sourceType: "project_component",
          sourceComponentId: "project-component-1",
          sourceEstimateRowId: "row-1",
          brand: "Updated brand",
        },
      },
      acting_user_id: USER_ID,
      correlation_id: "row-update-correlation-1",
    });

    expect(result.error).toBeNull();
    expect(database.rowItems.get("row-1")).toMatchObject({
      material: "Updated shared cabinet",
      quantity: 9,
      unit_cost: 150,
      row_revision: 2,
    });
    expect(database.rowItems.get("row-2")).toMatchObject({
      material: "Updated shared cabinet",
      quantity: 5,
      unit_cost: 150,
      row_revision: 4,
    });
    expect(readJsonRecord(database.rowItems.get("row-2")?.source_snapshot_json)).toMatchObject({
      sourceComponentId: "project-component-1",
      sourceEstimateRowId: "row-2",
      brand: "Updated brand",
    });
    expect(database.historyEvents[0]).toMatchObject({
      event_type: "row_updated",
      payload: { rowId: "row-1", propagatedRowIds: ["row-2"] },
    });
  });

  it("updates only rows selecting the edited project component variant while sharing the full graph", async () => {
    const database = new FakeD1Database();
    const previousPriceOptions = [
      {
        id: "variant-1",
        label: "Default",
        sku: "STD-1",
        variantDescription: "Standard cabinet",
        unit: "lm",
        unitCost: 100,
        miscCost: 0,
        currency: "PHP",
        thumbnailPath: "/variant-1.webp",
        isActive: true,
        isDefault: true,
      },
      {
        id: "variant-2",
        label: "Option 2",
        sku: "PRM-1",
        variantDescription: "Premium cabinet",
        unit: "lm",
        unitCost: 200,
        miscCost: 0,
        currency: "PHP",
        thumbnailPath: "/variant-2.webp",
        isActive: true,
        isDefault: false,
      },
    ];
    const nextPriceOptions = [
      { ...previousPriceOptions[0], isDefault: false },
      {
        ...previousPriceOptions[1],
        label: "Premium",
        sku: "PRM-2",
        variantDescription: "Updated premium cabinet",
        unit: "set",
        unitCost: 275,
        thumbnailPath: "/variant-2-new.webp",
        isDefault: true,
      },
    ];
    database.rowItems = new Map<string, FakeRowItem>([
      ["row-1", makeProjectComponentVariantRow({
        id: "row-1",
        selectedPriceOptionId: "variant-1",
        description: "Standard cabinet",
        unit: "lm",
        unitCost: 100,
        quantity: 2,
        rowRevision: 1,
        priceOptions: previousPriceOptions,
      })],
      ["row-2", makeProjectComponentVariantRow({
        id: "row-2",
        selectedPriceOptionId: "variant-1",
        description: "Standard cabinet",
        unit: "lm",
        unitCost: 100,
        quantity: 5,
        miscCost: 12,
        rowRevision: 3,
        priceOptions: previousPriceOptions,
      })],
      ["row-3", makeProjectComponentVariantRow({
        id: "row-3",
        selectedPriceOptionId: "variant-2",
        description: "Premium cabinet",
        unit: "lm",
        unitCost: 200,
        quantity: 7,
        miscCost: 25,
        rowRevision: 5,
        priceOptions: previousPriceOptions,
      })],
    ]);
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("update_estimate_row_item_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_row_id: "row-1",
      expected_row_revision: 1,
      row_patch: {
        material: "Project cabinet",
        description: "Standard cabinet",
        unit: "lm",
        unitCost: 100,
        sourceSnapshot: {
          sourceType: "project_component",
          sourceComponentId: "project-component-variants",
          sourceEstimateRowId: "row-1",
          priceOptionId: "variant-1",
          priceOptionLabel: "Default",
          priceOptions: nextPriceOptions,
        },
      },
      acting_user_id: USER_ID,
      correlation_id: "project-variant-option-2-update",
    });

    expect(result.error).toBeNull();
    expect(database.rowItems.get("row-2")).toMatchObject({
      description: "Standard cabinet",
      unit: "lm",
      unit_cost: 100,
      quantity: 5,
      misc_cost: 12,
      row_revision: 4,
    });
    expect(database.rowItems.get("row-3")).toMatchObject({
      description: "Updated premium cabinet",
      unit: "set",
      unit_cost: 275,
      quantity: 7,
      misc_cost: 25,
      row_revision: 6,
    });
    expect(readJsonRecord(database.rowItems.get("row-2")?.source_snapshot_json)).toMatchObject({
      priceOptionId: "variant-1",
      priceOptionLabel: "Default",
      priceOptions: nextPriceOptions,
    });
    expect(readJsonRecord(database.rowItems.get("row-3")?.source_snapshot_json)).toMatchObject({
      priceOptionId: "variant-2",
      priceOptionLabel: "Premium",
      description: "Updated premium cabinet",
      unit: "set",
      unit_cost: 275,
      sku: "PRM-2",
      imageUrl: "/variant-2-new.webp",
      imageAsset: null,
      priceOptions: nextPriceOptions,
    });
  });

  it("persists project variant attachment ownership with the row graph and history batch", async () => {
    const database = new FakeD1Database();
    const attachmentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const assetId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const priceOptions = [
      {
        id: "variant-1",
        label: "Default",
        variantDescription: "Standard cabinet",
        unit: "lm",
        unitCost: 100,
        miscCost: 0,
        currency: "PHP",
        isActive: true,
        isDefault: true,
      },
      {
        id: "variant-2",
        label: "Premium",
        variantDescription: "Premium cabinet",
        unit: "set",
        unitCost: 200,
        miscCost: 0,
        currency: "PHP",
        isActive: true,
        isDefault: false,
      },
    ];
    const attachment = {
      id: attachmentId,
      assetId,
      bucket: "component-attachments",
      path: `${WORKSPACE_ID}/${USER_ID}/cabinet-spec.pdf`,
      fileName: "cabinet-spec.pdf",
      contentType: "application/pdf",
      sizeBytes: 2048,
      kind: "pdf",
      scanStatus: "clean",
      reviewStatus: "approved",
      isCurrentApproved: true,
    };
    const nextPriceOptions = [
      { ...priceOptions[0], attachments: [attachment] },
      priceOptions[1],
    ];
    database.rowItems = new Map<string, FakeRowItem>([
      ["row-1", makeProjectComponentVariantRow({
        id: "row-1", selectedPriceOptionId: "variant-1", description: "Standard cabinet", unit: "lm", unitCost: 100, quantity: 2, rowRevision: 1, priceOptions,
      })],
      ["row-2", makeProjectComponentVariantRow({
        id: "row-2", selectedPriceOptionId: "variant-2", description: "Premium cabinet", unit: "set", unitCost: 200, quantity: 3, rowRevision: 2, priceOptions,
      })],
    ]);
    database.uploadAssets.set(assetId, {
      id: assetId,
      workspace_id: WORKSPACE_ID,
      actor_user_id: USER_ID,
      project_id: PROJECT_ID,
      surface: "component-attachment",
      target_entity_type: "project-component",
      target_entity_id: "project-component-variants",
      status: "finalized",
      file_name: attachment.fileName,
      content_type: attachment.contentType,
      size_bytes: attachment.sizeBytes,
      scan_status: "pending",
      scan_override_expires_at: null,
      storage_bucket: "component-attachments",
      storage_path: attachment.path,
      metadata_json: JSON.stringify({ projectId: PROJECT_ID, projectComponentId: "project-component-variants" }),
    });
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("update_estimate_row_item_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_row_id: "row-1",
      expected_row_revision: 1,
      row_patch: {
        description: "Standard cabinet",
        unit: "lm",
        unitCost: 100,
        sourceSnapshot: {
          sourceType: "project_component",
          sourceComponentId: "project-component-variants",
          sourceEstimateRowId: "row-1",
          priceOptionId: "variant-1",
          priceOptionLabel: "Default",
          priceOptions: nextPriceOptions,
        },
      },
      acting_user_id: USER_ID,
      correlation_id: "project-variant-attachment-save",
    });

    expect(result.error).toBeNull();
    expect(database.componentAttachments.get(attachmentId)).toMatchObject({
      owner_scope: "project",
      project_id: PROJECT_ID,
      project_component_id: "project-component-variants",
      price_option_id: "variant-1",
      upload_asset_id: assetId,
      review_status: "uploaded",
    });
    const savedAttachment = ((readJsonRecord(database.rowItems.get("row-1")?.source_snapshot_json).priceOptions as Array<Record<string, unknown>>)[0]?.attachments as Array<Record<string, unknown>>)[0];
    expect(savedAttachment).toMatchObject({
      id: attachmentId,
      assetId,
      scanStatus: "pending",
      reviewStatus: "uploaded",
      isCurrentApproved: false,
    });
    expect(readJsonRecord(database.rowItems.get("row-2")?.source_snapshot_json)).toMatchObject({
      priceOptions: expect.arrayContaining([
        expect.objectContaining({ id: "variant-1", attachments: [expect.objectContaining({ id: attachmentId })] }),
      ]),
    });
    expect(database.historyEvents[0]?.changed_fields).toContain("component_variant_attachments");
    expect(database.batchStatements.some((statement) => statement.sql.includes("project_attachment_option_membership_guard"))).toBe(true);
    expect(database.batchStatements.some((statement) => statement.sql.includes("INSERT INTO component_variant_attachments"))).toBe(true);
  });

  it("supersedes only attachments removed from their project variant", async () => {
    const database = new FakeD1Database();
    const attachmentOneId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const attachmentTwoId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const assetOneId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const assetTwoId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const makeAttachment = (id: string, assetId: string, fileName: string) => ({
      id,
      assetId,
      bucket: "component-attachments",
      path: `${WORKSPACE_ID}/${USER_ID}/${fileName}`,
      fileName,
      contentType: "application/pdf",
      sizeBytes: 1024,
      kind: "pdf" as const,
      scanStatus: "pending",
      reviewStatus: "uploaded" as const,
      isCurrentApproved: false,
    });
    const attachmentOne = makeAttachment(attachmentOneId, assetOneId, "standard.pdf");
    const attachmentTwo = makeAttachment(attachmentTwoId, assetTwoId, "premium.pdf");
    const priceOptions = [
      { id: "variant-1", label: "Default", variantDescription: "Standard", unit: "lm", unitCost: 100, miscCost: 0, currency: "PHP", attachments: [attachmentOne], isActive: true, isDefault: true },
      { id: "variant-2", label: "Premium", variantDescription: "Premium", unit: "set", unitCost: 200, miscCost: 0, currency: "PHP", attachments: [attachmentTwo], isActive: true, isDefault: false },
    ];
    database.rowItems = new Map<string, FakeRowItem>([
      ["row-1", makeProjectComponentVariantRow({ id: "row-1", selectedPriceOptionId: "variant-1", description: "Standard", unit: "lm", unitCost: 100, quantity: 1, rowRevision: 1, priceOptions })],
      ["row-2", makeProjectComponentVariantRow({ id: "row-2", selectedPriceOptionId: "variant-2", description: "Premium", unit: "set", unitCost: 200, quantity: 1, rowRevision: 2, priceOptions })],
    ]);
    const now = "2026-07-14T00:00:00.000Z";
    for (const [priceOptionId, attachment] of [["variant-1", attachmentOne], ["variant-2", attachmentTwo]] as const) {
      database.componentAttachments.set(attachment.id, {
        id: attachment.id,
        owner_scope: "project",
        price_option_id: priceOptionId,
        item_id: null,
        project_id: PROJECT_ID,
        project_component_id: "project-component-variants",
        workspace_id: WORKSPACE_ID,
        upload_asset_id: attachment.assetId,
        storage_bucket: attachment.bucket,
        storage_path: attachment.path,
        file_name: attachment.fileName,
        content_type: attachment.contentType,
        size_bytes: attachment.sizeBytes,
        attachment_kind: attachment.kind,
        metadata_json: JSON.stringify({ assetId: attachment.assetId, scanStatus: "pending" }),
        created_by: USER_ID,
        review_status: "uploaded",
        applicable_cost_entry_id: null,
        is_current_approved: 0,
        review_revision: 1,
        created_at: now,
        updated_at: now,
      });
      database.uploadAssets.set(attachment.assetId, {
        id: attachment.assetId,
        workspace_id: WORKSPACE_ID,
        actor_user_id: USER_ID,
        project_id: PROJECT_ID,
        surface: "component-attachment",
        target_entity_type: "project-component",
        target_entity_id: "project-component-variants",
        status: "finalized",
        file_name: attachment.fileName,
        content_type: attachment.contentType,
        size_bytes: attachment.sizeBytes,
        scan_status: "pending",
        scan_override_expires_at: null,
        storage_bucket: "component-attachments",
        storage_path: attachment.path,
        metadata_json: JSON.stringify({ projectId: PROJECT_ID }),
      });
    }
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("update_estimate_row_item_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_row_id: "row-1",
      expected_row_revision: 1,
      row_patch: {
        description: "Standard",
        unit: "lm",
        unitCost: 100,
        sourceSnapshot: {
          sourceType: "project_component",
          sourceComponentId: "project-component-variants",
          sourceEstimateRowId: "row-1",
          priceOptionId: "variant-1",
          priceOptionLabel: "Default",
          priceOptions: [
            { ...priceOptions[0], attachments: [] },
            priceOptions[1],
          ],
        },
      },
      acting_user_id: USER_ID,
      correlation_id: "project-variant-attachment-remove",
    });

    expect(result.error).toBeNull();
    expect(database.componentAttachments.get(attachmentOneId)?.review_status).toBe("superseded");
    expect(database.uploadAssets.get(assetOneId)?.status).toBe("removed");
    expect(database.componentAttachments.get(attachmentTwoId)?.review_status).toBe("uploaded");
    expect(database.uploadAssets.get(assetTwoId)?.status).toBe("finalized");
    expect(database.historyEvents[0]?.payload).toMatchObject({
      attachments: { createdAttachmentIds: [], supersededAttachmentIds: [attachmentOneId] },
    });
  });

  it("moves only rows using a removed project variant to its explicit replacement", async () => {
    const database = new FakeD1Database();
    const previousPriceOptions = [
      { id: "variant-1", label: "Default", variantDescription: "Standard", unit: "lm", unitCost: 100, miscCost: 0, currency: "PHP", isActive: true, isDefault: true },
      { id: "variant-2", label: "Option 2", variantDescription: "Premium", unit: "set", unitCost: 250, miscCost: 0, currency: "PHP", isActive: true, isDefault: false },
    ];
    const nextPriceOptions = [previousPriceOptions[0]];
    database.rowItems = new Map<string, FakeRowItem>([
      ["row-1", makeProjectComponentVariantRow({
        id: "row-1", selectedPriceOptionId: "variant-1", description: "Standard", unit: "lm", unitCost: 100, quantity: 2, rowRevision: 1, priceOptions: previousPriceOptions,
      })],
      ["row-2", makeProjectComponentVariantRow({
        id: "row-2", selectedPriceOptionId: "variant-2", description: "Premium", unit: "set", unitCost: 250, quantity: 9, miscCost: 30, rowRevision: 3, priceOptions: previousPriceOptions,
      })],
    ]);
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("update_estimate_row_item_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_row_id: "row-1",
      expected_row_revision: 1,
      removed_price_option_replacements: { "variant-2": "variant-1" },
      row_patch: {
        description: "Standard",
        unit: "lm",
        unitCost: 100,
        sourceSnapshot: {
          sourceType: "project_component",
          sourceComponentId: "project-component-variants",
          sourceEstimateRowId: "row-1",
          priceOptionId: "variant-1",
          priceOptionLabel: "Default",
          priceOptions: nextPriceOptions,
        },
      },
      acting_user_id: USER_ID,
      correlation_id: "project-variant-option-2-replaced",
    });

    expect(result.error).toBeNull();
    expect(database.rowItems.get("row-2")).toMatchObject({
      description: "Standard",
      unit: "lm",
      unit_cost: 100,
      quantity: 9,
      misc_cost: 30,
      row_revision: 4,
    });
    expect(readJsonRecord(database.rowItems.get("row-2")?.source_snapshot_json)).toMatchObject({
      priceOptionId: "variant-1",
      priceOptionLabel: "Default",
      priceOptions: nextPriceOptions,
    });
  });

  it("rejects deleting a used project variant without an explicit replacement", async () => {
    const database = new FakeD1Database();
    const previousPriceOptions = [
      { id: "variant-1", label: "Default", variantDescription: "Standard", unit: "lm", unitCost: 100, miscCost: 0, currency: "PHP", isActive: true, isDefault: true },
      { id: "variant-2", label: "Option 2", variantDescription: "Premium", unit: "set", unitCost: 250, miscCost: 0, currency: "PHP", isActive: true, isDefault: false },
    ];
    database.rowItems = new Map<string, FakeRowItem>([
      ["row-1", makeProjectComponentVariantRow({
        id: "row-1", selectedPriceOptionId: "variant-1", description: "Standard", unit: "lm", unitCost: 100, quantity: 2, rowRevision: 1, priceOptions: previousPriceOptions,
      })],
      ["row-2", makeProjectComponentVariantRow({
        id: "row-2", selectedPriceOptionId: "variant-2", description: "Premium", unit: "set", unitCost: 250, quantity: 9, rowRevision: 3, priceOptions: previousPriceOptions,
      })],
    ]);
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("update_estimate_row_item_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_row_id: "row-1",
      expected_row_revision: 1,
      row_patch: {
        description: "Standard",
        unit: "lm",
        unitCost: 100,
        sourceSnapshot: {
          sourceType: "project_component",
          sourceComponentId: "project-component-variants",
          sourceEstimateRowId: "row-1",
          priceOptionId: "variant-1",
          priceOptionLabel: "Default",
          priceOptions: [previousPriceOptions[0]],
        },
      },
      acting_user_id: USER_ID,
      correlation_id: "project-variant-option-2-rejected",
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("Choose an active replacement for every used project component variant before saving.");
    expect(database.rowItems.get("row-1")?.row_revision).toBe(1);
    expect(database.rowItems.get("row-2")?.row_revision).toBe(3);
    expect(database.batchStatements).toEqual([]);
  });

  it("reports project variant usage counts for the edit modal", async () => {
    const database = new FakeD1Database();
    const priceOptions = [
      { id: "variant-1", label: "Default", variantDescription: "Standard", unit: "lm", unitCost: 100, miscCost: 0, currency: "PHP", isActive: true, isDefault: true },
      { id: "variant-2", label: "Option 2", variantDescription: "Premium", unit: "set", unitCost: 250, miscCost: 0, currency: "PHP", isActive: true, isDefault: false },
    ];
    database.rowItems = new Map<string, FakeRowItem>([
      ["row-1", makeProjectComponentVariantRow({
        id: "row-1", selectedPriceOptionId: "variant-1", description: "Standard", unit: "lm", unitCost: 100, quantity: 2, rowRevision: 1, priceOptions,
      })],
      ["row-2", makeProjectComponentVariantRow({
        id: "row-2", selectedPriceOptionId: "variant-1", description: "Standard", unit: "lm", unitCost: 100, quantity: 3, rowRevision: 2, priceOptions,
      })],
      ["row-3", makeProjectComponentVariantRow({
        id: "row-3", selectedPriceOptionId: "variant-2", description: "Premium", unit: "set", unitCost: 250, quantity: 4, rowRevision: 3, priceOptions,
      })],
    ]);
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("preview_estimate_component_edit_impact", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_row_id: "row-1",
    });

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      componentKind: "project",
      instanceCount: 3,
      optionUsageCounts: {
        "variant-1": 2,
        "variant-2": 1,
      },
    });
  });

  it("propagates project component edits to snapshot-linked siblings when metadata identity is missing", async () => {
    const database = new FakeD1Database();
    database.rowItems = new Map<string, FakeRowItem>([
      ["row-1", {
        id: "row-1",
        estimate_id: ESTIMATE_ID,
        node_id: NODE_ID,
        material: "Pergo Flooring",
        description: "Original flooring",
        supplier: "Ace Hardware",
        unit: "sqm",
        quantity: 2,
        quantity_base: null,
        quantity_contingency_amount: null,
        unit_cost: 100,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        misc_cost: 0,
        source_snapshot_json: JSON.stringify({
          sourceType: "project_component",
          sourceComponentId: "project-component-1",
          sourceEstimateRowId: "row-1",
          brand: "Pergo",
        }),
        metadata_json: JSON.stringify({
          expressComponent: {
            kind: "express",
            schemaVersion: 1,
            id: "legacy-row-local-id",
          },
        }),
        link_state: "unlinked",
        source_library_item_id: null,
        sort_order: 1000,
        row_revision: 1,
        created_at: "2026-07-06T00:00:00.000Z",
        updated_at: "2026-07-06T00:00:00.000Z",
      }],
      ["row-2", {
        id: "row-2",
        estimate_id: ESTIMATE_ID,
        node_id: NODE_ID,
        material: "Pergo Flooring",
        description: "Second instance",
        supplier: "Ace Hardware",
        unit: "sqm",
        quantity: 5,
        quantity_base: null,
        quantity_contingency_amount: null,
        unit_cost: 100,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        misc_cost: 0,
        source_snapshot_json: JSON.stringify({
          sourceType: "project_component",
          sourceComponentId: "project-component-1",
          sourceEstimateRowId: "row-1",
          brand: "Pergo",
        }),
        metadata_json: JSON.stringify({}),
        link_state: "unlinked",
        source_library_item_id: null,
        sort_order: 2000,
        row_revision: 3,
        created_at: "2026-07-06T00:00:00.000Z",
        updated_at: "2026-07-06T00:00:00.000Z",
      }],
    ]);
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("update_estimate_row_item_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_row_id: "row-1",
      expected_row_revision: 1,
      row_patch: {
        material: "Pergo Flooring 2",
        quantity: 9,
        sourceSnapshot: {
          sourceType: "project_component",
          sourceComponentId: "project-component-1",
          sourceEstimateRowId: "row-1",
          brand: "Pergo Updated",
        },
      },
      acting_user_id: USER_ID,
      correlation_id: "row-update-correlation-snapshot-identity",
    });

    expect(result.error).toBeNull();
    expect(database.rowItems.get("row-1")).toMatchObject({
      material: "Pergo Flooring 2",
      quantity: 9,
      row_revision: 2,
    });
    expect(database.rowItems.get("row-2")).toMatchObject({
      material: "Pergo Flooring 2",
      quantity: 5,
      row_revision: 4,
    });
    expect(readJsonRecord(database.rowItems.get("row-2")?.source_snapshot_json)).toMatchObject({
      sourceComponentId: "project-component-1",
      sourceEstimateRowId: "row-1",
      brand: "Pergo Updated",
    });
    expect(database.historyEvents[0]).toMatchObject({
      event_type: "row_updated",
      payload: { rowId: "row-1", propagatedRowIds: ["row-2"] },
    });
  });

  it("merges shared project component image patches without dropping snapshot identity", async () => {
    const database = new FakeD1Database();
    database.rowItems = new Map<string, FakeRowItem>([
      ["row-1", {
        id: "row-1",
        estimate_id: ESTIMATE_ID,
        node_id: NODE_ID,
        material: "Pergo Flooring",
        description: "Original flooring",
        supplier: "Ace Hardware",
        unit: "sqm",
        quantity: 2,
        quantity_base: null,
        quantity_contingency_amount: null,
        unit_cost: 100,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        misc_cost: 0,
        source_snapshot_json: JSON.stringify({
          sourceType: "project_component",
          sourceComponentId: "project-component-1",
          sourceEstimateRowId: "row-1",
          brand: "Pergo",
        }),
        metadata_json: JSON.stringify({}),
        link_state: "unlinked",
        source_library_item_id: null,
        sort_order: 1000,
        row_revision: 1,
        created_at: "2026-07-06T00:00:00.000Z",
        updated_at: "2026-07-06T00:00:00.000Z",
      }],
      ["row-2", {
        id: "row-2",
        estimate_id: ESTIMATE_ID,
        node_id: NODE_ID,
        material: "Pergo Flooring",
        description: "Second instance",
        supplier: "Ace Hardware",
        unit: "sqm",
        quantity: 5,
        quantity_base: null,
        quantity_contingency_amount: null,
        unit_cost: 100,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        misc_cost: 0,
        source_snapshot_json: JSON.stringify({
          sourceType: "project_component",
          sourceComponentId: "project-component-1",
          sourceEstimateRowId: "row-1",
          brand: "Pergo",
        }),
        metadata_json: JSON.stringify({}),
        link_state: "unlinked",
        source_library_item_id: null,
        sort_order: 2000,
        row_revision: 3,
        created_at: "2026-07-06T00:00:00.000Z",
        updated_at: "2026-07-06T00:00:00.000Z",
      }],
    ]);
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("update_estimate_row_item_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      target_row_id: "row-1",
      expected_row_revision: 1,
      row_patch: {
        sourceSnapshot: {
          imageUrl: "https://assets.example.test/pergo.webp",
        },
      },
      acting_user_id: USER_ID,
      correlation_id: "row-update-correlation-image",
    });

    expect(result.error).toBeNull();
    expect(readJsonRecord(database.rowItems.get("row-1")?.source_snapshot_json)).toMatchObject({
      sourceType: "project_component",
      sourceComponentId: "project-component-1",
      sourceEstimateRowId: "row-1",
      brand: "Pergo",
      imageUrl: "https://assets.example.test/pergo.webp",
    });
    expect(readJsonRecord(database.rowItems.get("row-2")?.source_snapshot_json)).toMatchObject({
      sourceType: "project_component",
      sourceComponentId: "project-component-1",
      sourceEstimateRowId: "row-1",
      brand: "Pergo",
      imageUrl: "https://assets.example.test/pergo.webp",
    });
    expect(database.historyEvents[0]).toMatchObject({
      event_type: "row_updated",
      payload: { rowId: "row-1", propagatedRowIds: ["row-2"] },
    });
  });

  it("rejects self-parenting and descendant cycles before writing reorder history", async () => {
    const database = new FakeD1Database();
    database.nodes = new Map<string, FakeNodeRow>([
      ["project-scope", { id: "project-scope", estimate_id: ESTIMATE_ID, estimate_tab_id: "tab-a", parent_id: null, sort_order: 10 }],
      ["ground-floor", { id: "ground-floor", estimate_id: ESTIMATE_ID, estimate_tab_id: "tab-a", parent_id: "project-scope", sort_order: 20 }],
      ["kitchen", { id: "kitchen", estimate_id: ESTIMATE_ID, estimate_tab_id: "tab-a", parent_id: "ground-floor", sort_order: 30 }],
    ]);
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const selfResult = await client.call("reorder_estimate_nodes_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      move_updates: [{ id: "kitchen", parent_id: "kitchen", sort_order: 10 }],
      acting_user_id: USER_ID,
      correlation_id: "reorder-correlation-self",
    });
    const cycleResult = await client.call("reorder_estimate_nodes_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      move_updates: [{ id: "ground-floor", parent_id: "kitchen", sort_order: 10 }],
      acting_user_id: USER_ID,
      correlation_id: "reorder-correlation-cycle",
    });

    expect(selfResult.data).toBeNull();
    expect(selfResult.error?.message).toBe("An estimate tree node cannot be moved inside itself or one of its descendants.");
    expect(cycleResult.data).toBeNull();
    expect(cycleResult.error?.message).toBe("An estimate tree node cannot be moved inside itself or one of its descendants.");
    expect(database.batchStatements).toEqual([]);
    expect(database.historyEvents).toEqual([]);
  });

  it("rejects cross-tab reparenting before writing reorder history", async () => {
    const database = new FakeD1Database();
    database.nodes = new Map<string, FakeNodeRow>([
      ["ground-floor", { id: "ground-floor", estimate_id: ESTIMATE_ID, estimate_tab_id: "tab-a", parent_id: null, sort_order: 10 }],
      ["kitchen", { id: "kitchen", estimate_id: ESTIMATE_ID, estimate_tab_id: "tab-a", parent_id: "ground-floor", sort_order: 20 }],
      ["site-works", { id: "site-works", estimate_id: ESTIMATE_ID, estimate_tab_id: "tab-b", parent_id: null, sort_order: 30 }],
    ]);
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("reorder_estimate_nodes_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      move_updates: [{ id: "kitchen", parent_id: "site-works", sort_order: 10 }],
      acting_user_id: USER_ID,
      correlation_id: "reorder-correlation-cross-tab",
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("Estimate tree nodes cannot be moved across tabs.");
    expect(database.batchStatements).toEqual([]);
    expect(database.historyEvents).toEqual([]);
  });

  it.each([
    ["missing", {}],
    ["empty", { target_project_id: "" }],
    ["unknown", { target_project_id: OTHER_PROJECT_ID }],
  ])("rejects %s target_project_id before appending reorder history", async (_label, projectScope) => {
    const database = new FakeD1Database();
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("reorder_estimate_nodes_with_history", {
      ...projectScope,
      target_estimate_id: ESTIMATE_ID,
      move_updates: [{ id: NODE_ID, parent_id: null, sort_order: 20 }],
      acting_user_id: USER_ID,
      correlation_id: `reorder-correlation-${_label}`,
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("Estimate history event workspace could not be resolved.");
    expect(database.historyEvents).toEqual([]);
  });
});
