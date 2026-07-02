import { EstimateActionsD1Client } from "@/lib/estimates/d1-action-client";
import type { CurrentUserProfile } from "@/lib/auth/profile-d1-store";
import type { CurrentUserContext } from "@/lib/auth/session";

type D1Value = string | number | boolean | null;

type D1Result<T = Record<string, unknown>> = {
  results?: T[];
  success?: boolean;
  meta?: {
    changes?: number;
  };
};

type D1PreparedStatementLike<T = Record<string, unknown>> = {
  bind(...values: D1Value[]): D1PreparedStatementLike<T>;
  first<R = T>(): Promise<R | null>;
  all<R = T>(): Promise<D1Result<R>>;
  run(): Promise<D1Result<T>>;
};

type D1DatabaseLike = {
  exec?(sql: string): Promise<unknown>;
  prepare<T = Record<string, unknown>>(sql: string): D1PreparedStatementLike<T>;
};

export type CloudflareEstimateHistoryProofEnv = {
  ARCH_DB?: D1DatabaseLike;
  CRON_SECRET?: string;
};

type CleanupCounts = {
  workspaces: number;
  profiles: number;
  workspaceMembers: number;
  projects: number;
  estimates: number;
  estimateTabs: number;
  estimateNodes: number;
  estimateRows: number;
  estimateEvents: number;
  estimateAdjustments: number;
};

const ESTIMATE_HISTORY_PROOF_PATH = "/__cloudflare/estimate-history-proof";
const ESTIMATE_HISTORY_INTERNAL_API_PATH = "/api/internal/estimate-history-proof";
const ESTIMATE_HISTORY_PROOF_PATHS = new Set([ESTIMATE_HISTORY_PROOF_PATH, ESTIMATE_HISTORY_INTERNAL_API_PATH]);
const PROOF_SLUG_PREFIX = "codex-estimate-proof-";
const EMAIL_DOMAIN = "example.invalid";
const NO_STORE_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function isAuthorized(request: Request, env: CloudflareEstimateHistoryProofEnv) {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return "missing-secret";
  return request.headers.get("authorization") === `Bearer ${secret}` ? "authorized" : "unauthorized";
}

function nowIso() {
  return new Date().toISOString();
}

function proofId() {
  return crypto.randomUUID();
}

function proofEmail(label: string, runId: string) {
  return `${PROOF_SLUG_PREFIX}${label}-${runId.replace(/-/g, "")}@${EMAIL_DOMAIN}`;
}

async function runStatement(db: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  return db.prepare(sql).bind(...values).run();
}

async function queryRows<T extends Record<string, unknown>>(
  db: D1DatabaseLike,
  sql: string,
  values: D1Value[] = [],
) {
  const result = await db.prepare<T>(sql).bind(...values).all();
  return result.results ?? [];
}

async function firstRow<T extends Record<string, unknown>>(
  db: D1DatabaseLike,
  sql: string,
  values: D1Value[] = [],
) {
  return db.prepare<T>(sql).bind(...values).first<T>();
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyCleanupCounts(): CleanupCounts {
  return {
    workspaces: 0,
    profiles: 0,
    workspaceMembers: 0,
    projects: 0,
    estimates: 0,
    estimateTabs: 0,
    estimateNodes: 0,
    estimateRows: 0,
    estimateEvents: 0,
    estimateAdjustments: 0,
  };
}

async function countProofRows(db: D1DatabaseLike): Promise<CleanupCounts> {
  const row = await firstRow<Record<keyof CleanupCounts, number>>(
    db,
    `
      SELECT
        (SELECT COUNT(*) FROM workspaces WHERE slug LIKE ?) AS workspaces,
        (SELECT COUNT(*) FROM profiles WHERE email LIKE ?) AS profiles,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id IN (SELECT id FROM workspaces WHERE slug LIKE ?)) AS workspaceMembers,
        (SELECT COUNT(*) FROM projects WHERE workspace_id IN (SELECT id FROM workspaces WHERE slug LIKE ?)) AS projects,
        (SELECT COUNT(*) FROM estimates WHERE project_id IN (
          SELECT project.id
          FROM projects project
          JOIN workspaces workspace ON workspace.id = project.workspace_id
          WHERE workspace.slug LIKE ?
        )) AS estimates,
        (SELECT COUNT(*) FROM estimate_tabs WHERE estimate_id IN (
          SELECT estimate.id
          FROM estimates estimate
          JOIN projects project ON project.id = estimate.project_id
          JOIN workspaces workspace ON workspace.id = project.workspace_id
          WHERE workspace.slug LIKE ?
        )) AS estimateTabs,
        (SELECT COUNT(*) FROM estimate_nodes WHERE estimate_id IN (
          SELECT estimate.id
          FROM estimates estimate
          JOIN projects project ON project.id = estimate.project_id
          JOIN workspaces workspace ON workspace.id = project.workspace_id
          WHERE workspace.slug LIKE ?
        )) AS estimateNodes,
        (SELECT COUNT(*) FROM estimate_row_items WHERE estimate_id IN (
          SELECT estimate.id
          FROM estimates estimate
          JOIN projects project ON project.id = estimate.project_id
          JOIN workspaces workspace ON workspace.id = project.workspace_id
          WHERE workspace.slug LIKE ?
        )) AS estimateRows,
        (SELECT COUNT(*) FROM estimate_sheet_events WHERE workspace_id IN (SELECT id FROM workspaces WHERE slug LIKE ?)) AS estimateEvents,
        (SELECT COUNT(*) FROM estimate_sheet_adjustments WHERE estimate_id IN (
          SELECT estimate.id
          FROM estimates estimate
          JOIN projects project ON project.id = estimate.project_id
          JOIN workspaces workspace ON workspace.id = project.workspace_id
          WHERE workspace.slug LIKE ?
        )) AS estimateAdjustments
    `,
    Array.from({ length: 10 }, () => `${PROOF_SLUG_PREFIX}%`),
  );
  const counts = emptyCleanupCounts();
  for (const key of Object.keys(counts) as Array<keyof CleanupCounts>) {
    counts[key] = numberValue(row?.[key]);
  }
  return counts;
}

function cleanupPassed(counts: CleanupCounts) {
  return Object.values(counts).every((value) => value === 0);
}

async function cleanupProofRows(db: D1DatabaseLike) {
  const slugPattern = `${PROOF_SLUG_PREFIX}%`;
  await runStatement(db, "DELETE FROM estimate_sheet_events WHERE workspace_id IN (SELECT id FROM workspaces WHERE slug LIKE ?)", [slugPattern]);
  await runStatement(
    db,
    `
      DELETE FROM estimate_sheet_adjustments
      WHERE estimate_id IN (
        SELECT estimate.id
        FROM estimates estimate
        JOIN projects project ON project.id = estimate.project_id
        JOIN workspaces workspace ON workspace.id = project.workspace_id
        WHERE workspace.slug LIKE ?
      )
    `,
    [slugPattern],
  );
  await runStatement(
    db,
    `
      DELETE FROM estimate_row_items
      WHERE estimate_id IN (
        SELECT estimate.id
        FROM estimates estimate
        JOIN projects project ON project.id = estimate.project_id
        JOIN workspaces workspace ON workspace.id = project.workspace_id
        WHERE workspace.slug LIKE ?
      )
    `,
    [slugPattern],
  );
  await runStatement(
    db,
    `
      DELETE FROM estimate_nodes
      WHERE estimate_id IN (
        SELECT estimate.id
        FROM estimates estimate
        JOIN projects project ON project.id = estimate.project_id
        JOIN workspaces workspace ON workspace.id = project.workspace_id
        WHERE workspace.slug LIKE ?
      )
    `,
    [slugPattern],
  );
  await runStatement(
    db,
    `
      DELETE FROM estimate_tabs
      WHERE estimate_id IN (
        SELECT estimate.id
        FROM estimates estimate
        JOIN projects project ON project.id = estimate.project_id
        JOIN workspaces workspace ON workspace.id = project.workspace_id
        WHERE workspace.slug LIKE ?
      )
    `,
    [slugPattern],
  );
  await runStatement(
    db,
    `
      DELETE FROM estimate_sheet_members
      WHERE estimate_id IN (
        SELECT estimate.id
        FROM estimates estimate
        JOIN projects project ON project.id = estimate.project_id
        JOIN workspaces workspace ON workspace.id = project.workspace_id
        WHERE workspace.slug LIKE ?
      )
    `,
    [slugPattern],
  );
  await runStatement(
    db,
    `
      DELETE FROM estimates
      WHERE project_id IN (
        SELECT project.id
        FROM projects project
        JOIN workspaces workspace ON workspace.id = project.workspace_id
        WHERE workspace.slug LIKE ?
      )
    `,
    [slugPattern],
  );
  await runStatement(db, "DELETE FROM project_members WHERE workspace_id IN (SELECT id FROM workspaces WHERE slug LIKE ?)", [slugPattern]);
  await runStatement(db, "DELETE FROM projects WHERE workspace_id IN (SELECT id FROM workspaces WHERE slug LIKE ?)", [slugPattern]);
  await runStatement(db, "DELETE FROM workspace_members WHERE workspace_id IN (SELECT id FROM workspaces WHERE slug LIKE ?)", [slugPattern]);
  await runStatement(db, "DELETE FROM profiles WHERE email LIKE ?", [`${PROOF_SLUG_PREFIX}%@${EMAIL_DOMAIN}`]);
  await runStatement(db, "DELETE FROM workspaces WHERE slug LIKE ?", [slugPattern]);
}

function createCurrentUserContext(input: {
  avatarUrl?: string | null;
  defaultWorkspaceId: string | null;
  displayName: string;
  email: string;
  userId: string;
}): CurrentUserContext {
  const now = nowIso();
  const profile: CurrentUserProfile = {
    avatar_url: input.avatarUrl ?? null,
    created_at: now,
    default_workspace_id: input.defaultWorkspaceId,
    display_name: input.displayName,
    email: input.email,
    id: input.userId,
    role: "member",
    updated_at: now,
  };
  return {
    userId: input.userId,
    email: input.email,
    role: "member",
    profile,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl ?? null,
  };
}

async function seedFixture(db: D1DatabaseLike, ids: Record<string, string>) {
  const now = nowIso();
  const metadata = JSON.stringify({ source: "cloudflare_estimate_history_proof" });
  await runStatement(
    db,
    "INSERT INTO workspaces (id, name, slug, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [ids.workspaceId, "Codex Estimate Proof Workspace", ids.workspaceSlug, ids.editorUserId, now, now],
  );
  for (const [userId, label, defaultWorkspaceId] of [
    [ids.editorUserId, "editor", ids.workspaceId],
    [ids.viewerUserId, "viewer", ids.workspaceId],
    [ids.strangerUserId, "stranger", ids.strangerWorkspaceId],
  ]) {
    await runStatement(
      db,
      "INSERT INTO profiles (id, email, display_name, role, default_workspace_id, avatar_url, created_at, updated_at) VALUES (?, ?, ?, 'member', ?, NULL, ?, ?)",
      [userId, proofEmail(label, ids.runId), `Codex Estimate Proof ${label}`, defaultWorkspaceId, now, now],
    );
  }
  await runStatement(
    db,
    "INSERT INTO workspaces (id, name, slug, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [ids.strangerWorkspaceId, "Codex Estimate Proof Other Workspace", `${ids.workspaceSlug}-other`, ids.strangerUserId, now, now],
  );
  await runStatement(
    db,
    "INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at) VALUES (?, ?, 'member', ?, ?), (?, ?, 'viewer', ?, ?), (?, ?, 'member', ?, ?)",
    [
      ids.workspaceId,
      ids.editorUserId,
      now,
      now,
      ids.workspaceId,
      ids.viewerUserId,
      now,
      now,
      ids.strangerWorkspaceId,
      ids.strangerUserId,
      now,
      now,
    ],
  );
  await runStatement(
    db,
    "INSERT INTO projects (id, workspace_id, name, project_code, created_by, created_at, updated_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [ids.projectId, ids.workspaceId, "Codex Estimate Proof Project", "CODX-PROOF", ids.editorUserId, now, now, metadata],
  );
  await runStatement(
    db,
    "INSERT INTO estimates (id, project_id, name, created_by, created_at, updated_at, sheet_code, notes, currency_code, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PHP', ?)",
    [ids.estimateId, ids.projectId, "Codex Estimate Proof Estimate", ids.editorUserId, now, now, "CODX-001", "Synthetic proof estimate", metadata],
  );
  await runStatement(
    db,
    "INSERT INTO estimate_tabs (id, estimate_id, name, sort_order, is_default, archived_at, metadata, created_by, created_at, updated_at) VALUES (?, ?, 'Main', 1000, 1, NULL, ?, ?, ?, ?)",
    [ids.tabId, ids.estimateId, metadata, ids.editorUserId, now, now],
  );
  await runStatement(
    db,
    "INSERT INTO estimate_nodes (id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order, metadata_json, created_at, updated_at) VALUES (?, ?, ?, NULL, 'area', 'Proof Area', 1000, ?, ?, ?)",
    [ids.nodeId, ids.estimateId, ids.tabId, metadata, now, now],
  );
  await runStatement(
    db,
    `
      INSERT INTO estimate_row_items (
        id,
        estimate_id,
        node_id,
        description,
        designation,
        discipline,
        material,
        supplier,
        supplier_id,
        quantity,
        quantity_base,
        quantity_contingency_amount,
        unit,
        unit_cost,
        misc_cost,
        contingency_percentage,
        adjustment_percentage,
        source_snapshot_json,
        sort_order,
        row_revision,
        category_node_id,
        source_library_item_id,
        link_state,
        metadata_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, 'Proof row', 'Proof', 'Architectural', 'Concrete', 'Proof Supplier', NULL, 1, NULL, NULL, 'sqm', 100, 0, 0, 0, '{}', 1000, 1, NULL, NULL, 'unlinked', ?, ?, ?)
    `,
    [ids.rowId, ids.estimateId, ids.nodeId, metadata, now, now],
  );
}

async function readRowSummary(db: D1DatabaseLike, estimateId: string, rowId: string) {
  return firstRow<{ id: string; quantity: number; row_revision: number; unit_cost: number }>(
    db,
    "SELECT id, quantity, row_revision, unit_cost FROM estimate_row_items WHERE estimate_id = ? AND id = ? LIMIT 1",
    [estimateId, rowId],
  );
}

async function eventCount(db: D1DatabaseLike, estimateId: string, correlationId: string) {
  const row = await firstRow<{ count: number }>(
    db,
    "SELECT COUNT(*) AS count FROM estimate_sheet_events WHERE estimate_id = ? AND correlation_id = ?",
    [estimateId, correlationId],
  );
  return numberValue(row?.count);
}

async function runIdempotencyProof(db: D1DatabaseLike, ids: Record<string, string>, editor: CurrentUserContext) {
  const client = new EstimateActionsD1Client(db, editor);
  const before = await readRowSummary(db, ids.estimateId, ids.rowId);
  const args = {
    target_project_id: ids.projectId,
    target_estimate_id: ids.estimateId,
    target_row_id: ids.rowId,
    expected_row_revision: before?.row_revision ?? 1,
    row_patch: { quantity: 2.5 },
    acting_user_id: editor.userId,
    correlation_id: ids.idempotencyCorrelationId,
  };
  const first = await client.call("update_estimate_row_item_with_history", args);
  const second = await client.call("update_estimate_row_item_with_history", args);
  const after = await readRowSummary(db, ids.estimateId, ids.rowId);
  const events = await eventCount(db, ids.estimateId, ids.idempotencyCorrelationId);
  const firstEventId = typeof first.data === "object" && first.data ? (first.data as { eventId?: unknown }).eventId : null;
  const secondEventId = typeof second.data === "object" && second.data ? (second.data as { eventId?: unknown }).eventId : null;
  return {
    passed: !first.error && !second.error && events === 1 && numberValue(after?.row_revision) === numberValue(before?.row_revision) + 1 && numberValue(after?.quantity) === 2.5,
    firstError: first.error?.message ?? null,
    secondError: second.error?.message ?? null,
    before,
    after,
    eventCount: events,
    replayReturnedSameEvent: Boolean(firstEventId && secondEventId && firstEventId === secondEventId),
  };
}

async function runDenialProof(
  db: D1DatabaseLike,
  ids: Record<string, string>,
  viewer: CurrentUserContext,
  stranger: CurrentUserContext,
) {
  const before = await readRowSummary(db, ids.estimateId, ids.rowId);
  const viewerClient = new EstimateActionsD1Client(db, viewer);
  const strangerClient = new EstimateActionsD1Client(db, stranger);
  const viewerCanEdit = await viewerClient.call<boolean>("can_edit_estimate", { target_estimate_id: ids.estimateId });
  const strangerCanEdit = await strangerClient.call<boolean>("can_edit_estimate", { target_estimate_id: ids.estimateId });
  const viewerMutation = await viewerClient.call("update_estimate_row_item_with_history", {
    target_project_id: ids.projectId,
    target_estimate_id: ids.estimateId,
    target_row_id: ids.rowId,
    expected_row_revision: before?.row_revision ?? 1,
    row_patch: { quantity: 9 },
    acting_user_id: viewer.userId,
    correlation_id: ids.viewerCorrelationId,
  });
  const strangerMutation = await strangerClient.call("update_estimate_row_item_with_history", {
    target_project_id: ids.projectId,
    target_estimate_id: ids.estimateId,
    target_row_id: ids.rowId,
    expected_row_revision: before?.row_revision ?? 1,
    row_patch: { quantity: 10 },
    acting_user_id: stranger.userId,
    correlation_id: ids.strangerCorrelationId,
  });
  const after = await readRowSummary(db, ids.estimateId, ids.rowId);
  const viewerEvents = await eventCount(db, ids.estimateId, ids.viewerCorrelationId);
  const strangerEvents = await eventCount(db, ids.estimateId, ids.strangerCorrelationId);
  return {
    passed: viewerCanEdit.data === false
      && strangerCanEdit.data === false
      && Boolean(viewerMutation.error)
      && Boolean(strangerMutation.error)
      && viewerEvents === 0
      && strangerEvents === 0
      && numberValue(after?.row_revision) === numberValue(before?.row_revision)
      && numberValue(after?.quantity) === numberValue(before?.quantity),
    viewerCanEdit: viewerCanEdit.data === true,
    strangerCanEdit: strangerCanEdit.data === true,
    viewerMutationError: viewerMutation.error?.message ?? null,
    strangerMutationError: strangerMutation.error?.message ?? null,
    viewerEventCount: viewerEvents,
    strangerEventCount: strangerEvents,
    before,
    after,
  };
}

async function runRollbackProof(db: D1DatabaseLike, ids: Record<string, string>) {
  if (!db.exec) {
    return {
      passed: false,
      error: "D1 exec is not available for transaction rollback proof.",
      rollbackErrorObserved: false,
      rowResidue: null,
      eventResidue: null,
    };
  }
  let error: string | null = null;
  try {
    await db.exec(`
      BEGIN TRANSACTION;
      INSERT INTO estimate_row_items (
        id,
        estimate_id,
        node_id,
        description,
        designation,
        discipline,
        material,
        supplier,
        quantity,
        unit,
        unit_cost,
        misc_cost,
        contingency_percentage,
        adjustment_percentage,
        source_snapshot_json,
        sort_order,
        row_revision,
        link_state,
        metadata_json,
        created_at,
        updated_at
      )
      VALUES (
        '${ids.rollbackRowId}',
        '${ids.estimateId}',
        '${ids.nodeId}',
        'Rollback row',
        'Rollback',
        'Architectural',
        'Rollback material',
        'Rollback supplier',
        1,
        'unit',
        1,
        0,
        0,
        0,
        '{}',
        2000,
        1,
        'unlinked',
        '{"source":"rollback-proof"}',
        '${nowIso()}',
        '${nowIso()}'
      );
      INSERT INTO estimate_sheet_events (
        id,
        estimate_id,
        workspace_id,
        project_id,
        estimate_node_id,
        estimate_tab_id,
        target_row_id,
        event_type,
        event_source,
        correlation_id,
        actor_user_id,
        changed_fields,
        row_context,
        old_snapshot,
        new_snapshot,
        payload,
        metadata,
        total_delta,
        created_at
      )
      VALUES (
        '${ids.rollbackEventId}',
        '${ids.estimateId}',
        '${ids.workspaceId}',
        '${ids.projectId}',
        '${ids.nodeId}',
        '${ids.tabId}',
        '${ids.rollbackRowId}',
        'row_inserted',
        'server_action',
        '${ids.rollbackCorrelationId}',
        '${ids.editorUserId}',
        '[]',
        '{}',
        NULL,
        '{}',
        '{"rowId":"${ids.rollbackRowId}"}',
        '{}',
        1,
        '${nowIso()}'
      );
      INSERT INTO __archestimator_missing_rollback_guard (id) VALUES ('${ids.rollbackRowId}');
      COMMIT;
    `);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    try {
      await db.exec("ROLLBACK;");
    } catch {
      // D1 may automatically roll back the failed transaction.
    }
  }
  const rowResidue = await firstRow<{ count: number }>(
    db,
    "SELECT COUNT(*) AS count FROM estimate_row_items WHERE id = ?",
    [ids.rollbackRowId],
  );
  const eventResidue = await firstRow<{ count: number }>(
    db,
    "SELECT COUNT(*) AS count FROM estimate_sheet_events WHERE id = ? OR correlation_id = ?",
    [ids.rollbackEventId, ids.rollbackCorrelationId],
  );
  const rowCount = numberValue(rowResidue?.count);
  const eventRows = numberValue(eventResidue?.count);
  return {
    passed: Boolean(error) && rowCount === 0 && eventRows === 0,
    error,
    rollbackErrorObserved: Boolean(error),
    rowResidue: rowCount,
    eventResidue: eventRows,
  };
}

export async function routeCloudflareEstimateHistoryProofRequest(
  request: Request,
  env: CloudflareEstimateHistoryProofEnv,
) {
  const pathname = new URL(request.url).pathname;
  if (!ESTIMATE_HISTORY_PROOF_PATHS.has(pathname)) return null;
  const auth = isAuthorized(request, env);
  if (auth !== "authorized") return jsonResponse({ error: auth === "missing-secret" ? "Proof secret is not configured." : "Unauthorized." }, auth === "missing-secret" ? 503 : 401);
  const db = env.ARCH_DB;
  if (!db) return jsonResponse({ error: "Cloudflare D1 ARCH_DB binding is not configured." }, 503);

  const runId = proofId();
  const ids = {
    runId,
    workspaceId: proofId(),
    workspaceSlug: `${PROOF_SLUG_PREFIX}${runId}`,
    projectId: proofId(),
    estimateId: proofId(),
    tabId: proofId(),
    nodeId: proofId(),
    rowId: proofId(),
    editorUserId: proofId(),
    viewerUserId: proofId(),
    strangerUserId: proofId(),
    strangerWorkspaceId: proofId(),
    idempotencyCorrelationId: proofId(),
    viewerCorrelationId: proofId(),
    strangerCorrelationId: proofId(),
    rollbackCorrelationId: proofId(),
    rollbackRowId: proofId(),
    rollbackEventId: proofId(),
  };

  let cleanupBefore = emptyCleanupCounts();
  let cleanupAfter = emptyCleanupCounts();
  let idempotencyProof: Awaited<ReturnType<typeof runIdempotencyProof>> | null = null;
  let denialProof: Awaited<ReturnType<typeof runDenialProof>> | null = null;
  let rollbackProof: Awaited<ReturnType<typeof runRollbackProof>> | null = null;
  let error: string | null = null;

  try {
    await cleanupProofRows(db);
    cleanupBefore = await countProofRows(db);
    await seedFixture(db, ids);

    const editor = createCurrentUserContext({
      defaultWorkspaceId: ids.workspaceId,
      displayName: "Codex Estimate Proof editor",
      email: proofEmail("editor", runId),
      userId: ids.editorUserId,
    });
    const viewer = createCurrentUserContext({
      defaultWorkspaceId: ids.workspaceId,
      displayName: "Codex Estimate Proof viewer",
      email: proofEmail("viewer", runId),
      userId: ids.viewerUserId,
    });
    const stranger = createCurrentUserContext({
      defaultWorkspaceId: ids.strangerWorkspaceId,
      displayName: "Codex Estimate Proof stranger",
      email: proofEmail("stranger", runId),
      userId: ids.strangerUserId,
    });

    idempotencyProof = await runIdempotencyProof(db, ids, editor);
    denialProof = await runDenialProof(db, ids, viewer, stranger);
    rollbackProof = await runRollbackProof(db, ids);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  } finally {
    await cleanupProofRows(db);
    cleanupAfter = await countProofRows(db);
  }

  const passed = Boolean(idempotencyProof?.passed)
    && Boolean(denialProof?.passed)
    && Boolean(rollbackProof?.passed)
    && cleanupPassed(cleanupAfter)
    && !error;

  return jsonResponse({
    generatedAt: nowIso(),
    mode: "cloudflare-hosted-estimate-history-proof",
    proofSurface: pathname,
    runId,
    readiness: {
      d1BindingPresent: true,
      appLayerEditorGuardReady: Boolean(denialProof?.passed),
      crossWorkspaceDenialReady: Boolean(denialProof?.passed),
      viewerDenialReady: Boolean(denialProof?.passed),
      idempotencyReady: Boolean(idempotencyProof?.passed),
      rollbackReady: Boolean(rollbackProof?.passed),
      cleanupReady: cleanupPassed(cleanupAfter),
      hostedEstimateHistoryD1Ready: passed,
    },
    fixture: {
      workspaceId: ids.workspaceId,
      projectId: ids.projectId,
      estimateId: ids.estimateId,
      rowId: ids.rowId,
    },
    idempotencyProof,
    denialProof,
    rollbackProof,
    cleanupBefore,
    cleanupAfter,
    cleanupPassed: cleanupPassed(cleanupAfter),
    passed,
    error,
    note: "Secret-gated hosted proof. It creates only codex-estimate-proof-* fixtures, exercises the deployed Worker D1 binding and app D1 action client, then verifies exact cleanup. No session tokens or provider secrets are returned.",
  }, passed ? 200 : 500);
}
