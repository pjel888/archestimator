import "server-only";

import { randomUUID } from "node:crypto";

import { getCloudflareD1Database, type D1DatabaseLike, type D1Result, type D1Value } from "@/lib/cloudflare/d1";
import { prepareActivationOutboxIntent } from "@/lib/onboarding/activation-outbox";
import { validateActivationProducerIntent } from "@/lib/onboarding/activation-producer-contract";

export type PublicationAdminJson = string | number | boolean | null | { [key: string]: PublicationAdminJson | undefined } | PublicationAdminJson[];

type PublicationAdminError = {
  code?: string;
  message: string;
};

type QueryResult<T = object> = {
  count?: number | null;
  data: T[] | null;
  error: PublicationAdminError | null;
};

type SingleQueryResult<T = object> = {
  count?: number | null;
  data: T | null;
  error: PublicationAdminError | null;
};

type FilterOp = "eq" | "gte" | "in" | "is" | "lt";

type QueryFilter = {
  column: string;
  op: FilterOp;
  value: unknown;
};

type OrderBy = {
  ascending: boolean;
  column: string;
};

type QueryOperation = "delete" | "insert" | "select" | "update";

type SelectOptions = {
  count?: "exact";
  head?: boolean;
};

const knownTables = new Set([
  "estimate_nodes",
  "estimate_row_items",
  "estimate_tabs",
  "estimates",
  "profiles",
  "project_members",
  "project_publication_events",
  "project_publications",
  "projects",
  "publication_digest_log",
  "security_rate_limit_events",
  "shared_link_comments",
  "shared_link_events",
  "shared_link_recipients",
  "shared_link_responses",
  "workspace_members",
]);

const jsonColumns = new Set([
  "activity_target_labels_json",
  "metadata",
  "metadata_json",
  "resend_delivery_metadata",
  "selected_estimate_ids",
  "snapshot_json",
  "source_snapshot_json",
]);

const booleanColumns = new Set(["is_default", "is_internal"]);

function nowIso() {
  return new Date().toISOString();
}

function assertKnownTable(table: string) {
  if (!knownTables.has(table)) throw new Error(`Unsupported publication D1 table: ${table}`);
}

function assertSafeIdentifier(identifier: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe publication D1 identifier: ${identifier}`);
  }
}

function toAdminError(error: unknown): PublicationAdminError {
  const message = error instanceof Error ? error.message : String(error);
  return {
    code: /unique constraint failed/i.test(message) ? "23505" : undefined,
    message,
  };
}

function normalizeD1Value(value: unknown): D1Value {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" || typeof value === "number" || value === null || value instanceof ArrayBuffer) return value;
  return JSON.stringify(value);
}

function parseJson(value: unknown, fallback: PublicationAdminJson): PublicationAdminJson {
  if (typeof value !== "string") return (value as PublicationAdminJson | undefined) ?? fallback;
  try {
    return JSON.parse(value) as PublicationAdminJson;
  } catch {
    return fallback;
  }
}

function normalizeReadRow<T extends object>(row: T): T {
  const normalized: Record<string, unknown> = { ...(row as Record<string, unknown>) };
  for (const key of Object.keys(normalized)) {
    if (jsonColumns.has(key)) {
      normalized[key] = parseJson(normalized[key], key === "selected_estimate_ids" ? [] : {});
    } else if (booleanColumns.has(key)) {
      normalized[key] = Boolean(normalized[key]);
    }
  }
  return normalized as T;
}

function jsonText(value: unknown, fallback: PublicationAdminJson = {}) {
  return JSON.stringify(value ?? fallback);
}

function normalizeWriteRow(table: string, input: Record<string, unknown>) {
  const row: Record<string, unknown> = { ...input };
  const at = nowIso();

  if (table === "shared_link_recipients") {
    row.id ??= randomUUID();
    row.invited_at ??= at;
    row.created_at ??= at;
    row.updated_at ??= at;
    row.resend_delivery_metadata ??= {};
  }
  if (table === "security_rate_limit_events") {
    row.id ??= randomUUID();
    row.occurred_at ??= at;
  }
  if (table === "publication_digest_log") {
    row.id ??= randomUUID();
    row.created_at ??= at;
  }

  for (const key of Object.keys(row)) {
    if (jsonColumns.has(key) && typeof row[key] !== "string") {
      row[key] = jsonText(row[key], key === "selected_estimate_ids" ? [] : {});
    }
    if (booleanColumns.has(key)) {
      row[key] = row[key] ? 1 : 0;
    }
  }

  return row;
}

async function getRequiredPublicationAdminD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Cloudflare D1 ARCH_DB binding is required for publication admin actions.");
  return database;
}

async function first<T extends object>(db: D1DatabaseLike, sql: string, values: unknown[] = []) {
  const row = await db.prepare<T>(sql).bind(...values.map(normalizeD1Value)).first<T>();
  return row ? normalizeReadRow(row) : null;
}

async function all<T extends object>(db: D1DatabaseLike, sql: string, values: unknown[] = []) {
  const result = await db.prepare<T>(sql).bind(...values.map(normalizeD1Value)).all<T>();
  return (result.results ?? []).map((row) => normalizeReadRow(row));
}

async function run(db: D1DatabaseLike, sql: string, values: unknown[] = []) {
  return db.prepare(sql).bind(...values.map(normalizeD1Value)).run();
}

function selectExpression(rawColumn: string) {
  const trimmed = rawColumn.trim();
  if (!trimmed) return null;

  const aliasParts = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*):(.+)$/);
  if (aliasParts) {
    const [, alias, expression] = aliasParts;
    assertSafeIdentifier(alias);
    if (expression === "source_snapshot->>imageUrl") {
      return `json_extract(source_snapshot_json, '$.imageUrl') AS ${alias}`;
    }
    throw new Error(`Unsupported publication D1 select expression: ${trimmed}`);
  }

  assertSafeIdentifier(trimmed);
  return trimmed;
}

function selectedColumns(selectValue: string | undefined) {
  if (!selectValue?.trim() || selectValue.trim() === "*") return "*";
  const expressions = selectValue
    .split(",")
    .map(selectExpression)
    .filter((expression): expression is string => Boolean(expression));
  return expressions.length ? expressions.join(", ") : "*";
}

function parseCursorOrFilter(expression: string | null) {
  if (!expression) return null;
  const prefix = "created_at.lt.";
  const middle = ",and(created_at.eq.";
  const suffixPrefix = ",id.lt.";
  if (!expression.startsWith(prefix)) return null;
  const middleIndex = expression.indexOf(middle, prefix.length);
  if (middleIndex < 0) return null;
  const createdAt = expression.slice(prefix.length, middleIndex);
  const suffixStart = middleIndex + middle.length;
  const suffixIndex = expression.indexOf(suffixPrefix, suffixStart);
  if (suffixIndex < 0) return null;
  const id = expression.slice(suffixIndex + suffixPrefix.length, -1);
  return { createdAt, id };
}

function buildWhere(filters: QueryFilter[], orFilter: string | null) {
  const clauses: string[] = [];
  const values: unknown[] = [];

  for (const filter of filters) {
    assertSafeIdentifier(filter.column);
    if (filter.op === "eq") {
      clauses.push(`${filter.column} = ?`);
      values.push(filter.value);
    } else if (filter.op === "gte") {
      clauses.push(`${filter.column} >= ?`);
      values.push(filter.value);
    } else if (filter.op === "lt") {
      clauses.push(`${filter.column} < ?`);
      values.push(filter.value);
    } else if (filter.op === "is") {
      if (filter.value === null) {
        clauses.push(`${filter.column} IS NULL`);
      } else {
        clauses.push(`${filter.column} IS ?`);
        values.push(filter.value);
      }
    } else if (filter.op === "in") {
      const items = Array.isArray(filter.value) ? filter.value : [];
      if (!items.length) {
        clauses.push("1 = 0");
      } else {
        clauses.push(`${filter.column} IN (${items.map(() => "?").join(", ")})`);
        values.push(...items);
      }
    }
  }

  const cursor = parseCursorOrFilter(orFilter);
  if (cursor) {
    clauses.push("(created_at < ? OR (created_at = ? AND id < ?))");
    values.push(cursor.createdAt, cursor.createdAt, cursor.id);
  }

  return {
    sql: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
}

function buildOrder(orderBys: OrderBy[]) {
  if (!orderBys.length) return "";
  return ` ORDER BY ${orderBys
    .map((orderBy) => {
      assertSafeIdentifier(orderBy.column);
      return `${orderBy.column} ${orderBy.ascending ? "ASC" : "DESC"}`;
    })
    .join(", ")}`;
}

class PublicationD1QueryBuilder<T extends object = Record<string, unknown>> implements PromiseLike<QueryResult<T>> {
  private filters: QueryFilter[] = [];
  private limitValue: number | null = null;
  private operation: QueryOperation = "select";
  private orderBys: OrderBy[] = [];
  private orFilter: string | null = null;
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private selectOptions: SelectOptions | undefined;
  private selectValue: string | undefined;

  constructor(
    private readonly databasePromise: Promise<D1DatabaseLike>,
    private readonly table: string,
  ) {
    assertKnownTable(table);
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, op: "eq", value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, op: "gte", value });
    return this;
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ column, op: "in", value });
    return this;
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, op: "is", value });
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push({ column, op: "lt", value });
    return this;
  }

  maybeSingle(): Promise<SingleQueryResult<T>> {
    return this.execute().then((result) => {
      const rows = result.data ?? [];
      return { ...result, data: rows[0] ?? null };
    });
  }

  or(expression: string) {
    this.orFilter = expression;
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    this.orderBys.push({ column, ascending: options.ascending !== false });
    return this;
  }

  select(value = "*", options?: SelectOptions) {
    this.operation = this.operation === "insert" || this.operation === "update" ? this.operation : "select";
    this.selectValue = value;
    this.selectOptions = options;
    return this;
  }

  single(): Promise<SingleQueryResult<T>> {
    return this.execute().then((result) => {
      const rows = result.data ?? [];
      return { ...result, data: rows[0] ?? null };
    });
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  update(payload: Record<string, unknown>) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  private async execute(): Promise<QueryResult<T>> {
    try {
      const db = await this.databasePromise;
      if (this.operation === "insert") return await this.executeInsert(db);
      if (this.operation === "update") return await this.executeUpdate(db);
      if (this.operation === "delete") return await this.executeDelete(db);
      return await this.executeSelect(db);
    } catch (error) {
      return { data: null, error: toAdminError(error) };
    }
  }

  private async executeDelete(db: D1DatabaseLike): Promise<QueryResult<T>> {
    const where = buildWhere(this.filters, this.orFilter);
    await run(db, `DELETE FROM ${this.table}${where.sql}`, where.values);
    return { data: null, error: null };
  }

  private async executeInsert(db: D1DatabaseLike): Promise<QueryResult<T>> {
    const payloads = Array.isArray(this.payload) ? this.payload : this.payload ? [this.payload] : [];
    const inserted: Record<string, unknown>[] = [];

    for (const input of payloads) {
      const row = normalizeWriteRow(this.table, input);
      const columns = Object.keys(row);
      if (!columns.length) continue;
      columns.forEach(assertSafeIdentifier);
      await run(
        db,
        `INSERT INTO ${this.table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
        columns.map((column) => row[column]),
      );
      inserted.push(normalizeReadRow(row));
    }

    return {
      data: this.selectValue ? inserted.map((row) => pickSelectedWriteRow(row, this.selectValue!)) as T[] : inserted as T[],
      error: null,
    };
  }

  private async executeSelect(db: D1DatabaseLike): Promise<QueryResult<T>> {
    const where = buildWhere(this.filters, this.orFilter);

    if (this.selectOptions?.count === "exact" && this.selectOptions.head) {
      const row = await first<{ count: number }>(db, `SELECT COUNT(*) AS count FROM ${this.table}${where.sql}`, where.values);
      return { count: row?.count ?? 0, data: null, error: null };
    }

    const limit = this.limitValue ? ` LIMIT ${Math.max(1, Math.floor(this.limitValue))}` : "";
    const rows = await all<T>(
      db,
      `SELECT ${selectedColumns(this.selectValue)} FROM ${this.table}${where.sql}${buildOrder(this.orderBys)}${limit}`,
      where.values,
    );
    return { data: rows, error: null };
  }

  private async executeUpdate(db: D1DatabaseLike): Promise<QueryResult<T>> {
    const payload = normalizeWriteRow(this.table, (this.payload as Record<string, unknown> | null) ?? {});
    const columns = Object.keys(payload);
    columns.forEach(assertSafeIdentifier);
    const where = buildWhere(this.filters, this.orFilter);
    if (!columns.length) return { data: null, error: null };
    await run(
      db,
      `UPDATE ${this.table} SET ${columns.map((column) => `${column} = ?`).join(", ")}${where.sql}`,
      [...columns.map((column) => payload[column]), ...where.values],
    );
    return { data: null, error: null };
  }
}

function pickSelectedWriteRow(row: Record<string, unknown>, selectValue: string) {
  if (selectValue.trim() === "*") return row;
  return Object.fromEntries(
    selectValue
      .split(",")
      .map((column) => column.trim())
      .filter((column) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(column))
      .map((column) => [column, row[column]]),
  );
}

function withImmutableIssuance(
  snapshot: unknown,
  {
    issuedAt,
    issueNumber,
    selectedEstimateIds,
    supersedes,
    validThrough,
  }: {
    issuedAt: string;
    issueNumber: number;
    selectedEstimateIds: string[];
    supersedes: { issueNumber: number; version: number } | null;
    validThrough: string | null;
  },
) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return snapshot;

  const snapshotRecord = snapshot as Record<string, unknown>;
  const project = snapshotRecord.project;
  const senderNameValue =
    project && typeof project === "object" && !Array.isArray(project)
      ? (project as Record<string, unknown>).senderName
      : null;
  const senderName = typeof senderNameValue === "string" ? senderNameValue.trim() || null : null;

  return {
    ...snapshotRecord,
    issuance: {
      assumptions: [],
      exclusions: [],
      issueNumber,
      issuedAt,
      selectedEstimateIds,
      senderName,
      supersedes,
      validThrough,
      version: issueNumber,
    },
  };
}

async function replaceProjectPublication(db: D1DatabaseLike, args: Record<string, unknown>) {
  const project = await first<{ id: string }>(
    db,
    "SELECT id FROM projects WHERE id = ? AND workspace_id = ? LIMIT 1",
    [args.target_project_id, args.target_workspace_id],
  );
  if (!project) throw new Error("Project not found.");

  const versionRow = await first<{ snapshot_version: number | null }>(
    db,
    "SELECT MAX(snapshot_version) AS snapshot_version FROM project_publications WHERE project_id = ?",
    [args.target_project_id],
  );
  const nextVersion = Number(versionRow?.snapshot_version ?? 0) + 1;
  const previousPublication = await first<{ snapshot_version: number | null }>(
    db,
    "SELECT snapshot_version FROM project_publications WHERE project_id = ? AND status = 'published' LIMIT 1",
    [args.target_project_id],
  );
  const publicationId = randomUUID();
  const at = nowIso();
  const issuedSnapshot = withImmutableIssuance(args.p_snapshot_json, {
    issuedAt: at,
    issueNumber: nextVersion,
    selectedEstimateIds: Array.isArray(args.p_selected_estimate_ids)
      ? args.p_selected_estimate_ids.filter((value): value is string => typeof value === "string")
      : [],
    supersedes: previousPublication
      ? {
          issueNumber: Number(previousPublication.snapshot_version ?? 0),
          version: Number(previousPublication.snapshot_version ?? 0),
        }
      : null,
    validThrough: typeof args.p_expires_at === "string" ? args.p_expires_at : null,
  });

  const statements = [
    db
      .prepare(
        `UPDATE project_publications
         SET status = 'revoked', revoked_at = ?, updated_at = ?
         WHERE project_id = ? AND status = 'published'`,
      )
      .bind(at, at, normalizeD1Value(args.target_project_id)),
    db
      .prepare(
        `INSERT INTO project_publications (
          id, workspace_id, project_id, token_hash, encrypted_token, password_hash,
          snapshot_json, activity_target_labels_json, location_visibility, selected_estimate_ids,
          snapshot_version, published_by, published_at, expires_at, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`,
      )
      .bind(
        publicationId,
        normalizeD1Value(args.target_workspace_id),
        normalizeD1Value(args.target_project_id),
        normalizeD1Value(args.p_token_hash),
        normalizeD1Value(args.p_encrypted_token),
        normalizeD1Value(args.p_password_hash),
        jsonText(issuedSnapshot),
        jsonText(args.p_activity_target_labels_json),
        normalizeD1Value(args.p_location_visibility ?? "locality"),
        jsonText(args.p_selected_estimate_ids, []),
        nextVersion,
        normalizeD1Value(args.p_published_by),
        at,
        normalizeD1Value(args.p_expires_at ?? null),
        at,
        at,
      ),
  ];

  const activationIntent = validateActivationProducerIntent({
    domainMutationId: publicationId,
    milestone: "publication_created",
    occurredAt: at,
    projectId: String(args.target_project_id),
    source: "publication",
    userId: String(args.p_published_by),
    workspaceId: String(args.target_workspace_id),
  });
  if (activationIntent.status === "accepted") {
    statements.push(prepareActivationOutboxIntent(db, {
      domainMutationId: publicationId,
      dedupeKey: activationIntent.dedupeKey,
      milestone: "publication_created",
      occurredAt: at,
      projectId: String(args.target_project_id),
      source: "publication",
      userId: String(args.p_published_by),
      workspaceId: String(args.target_workspace_id),
    }));
  }

  if (db.batch) {
    await db.batch(statements);
  } else {
    for (const statement of statements) await statement.run();
  }

  return publicationId;
}

async function rotateProjectPublicationCredentials(db: D1DatabaseLike, args: Record<string, unknown>) {
  const publication = await first<{
    encrypted_token: string | null;
    expires_at: string | null;
    revoked_at: string | null;
    snapshot_version: number | null;
    status: string | null;
  }>(
    db,
    "SELECT encrypted_token, expires_at, revoked_at, snapshot_version, status FROM project_publications WHERE id = ? LIMIT 1",
    [args.target_publication_id],
  );
  const at = nowIso();
  if (
    !publication ||
    publication.status !== "published" ||
    publication.revoked_at ||
    (publication.expires_at && publication.expires_at <= at) ||
    publication.encrypted_token !== args.expected_encrypted_token
  ) {
    return -1;
  }

  const nextVersion = Number(publication.snapshot_version ?? 0) + 1;
  await run(
    db,
    `UPDATE project_publications
     SET token_hash = ?,
         encrypted_token = ?,
         password_hash = ?,
         snapshot_json = ?,
         activity_target_labels_json = ?,
         selected_estimate_ids = ?,
         snapshot_version = ?,
         published_at = ?,
         updated_at = ?
     WHERE id = ?`,
    [
      args.p_token_hash,
      args.p_encrypted_token,
      args.p_password_hash,
      jsonText(args.p_snapshot_json),
      jsonText(args.p_activity_target_labels_json),
      jsonText(args.p_selected_estimate_ids, []),
      nextVersion,
      at,
      at,
      args.target_publication_id,
    ],
  );

  const recipients = await run(
    db,
    `UPDATE shared_link_recipients
     SET recipient_token_hash = 'revoked:' || publication_id || ':' || id || ':' || ?,
         delivery_status = 'pending',
         resend_email_id = NULL,
         resend_last_event_at = NULL,
         resend_last_event_type = NULL,
         updated_at = ?
     WHERE publication_id = ?`,
    [nextVersion, at, args.target_publication_id],
  );
  return recipients.meta?.changes ?? 0;
}

async function persistSharedLinkRecipientResend(db: D1DatabaseLike, args: Record<string, unknown>) {
  const publication = await first<{ encrypted_token: string | null }>(
    db,
    "SELECT encrypted_token FROM project_publications WHERE id = ? LIMIT 1",
    [args.target_publication_id],
  );
  if (!publication?.encrypted_token || publication.encrypted_token !== args.expected_encrypted_token) return false;

  const result = await run(
    db,
    `UPDATE shared_link_recipients
     SET recipient_token_hash = ?,
         delivery_status = 'sent',
         resend_email_id = ?,
         invited_by = ?,
         updated_at = ?
     WHERE publication_id = ? AND id = ?`,
    [
      args.p_recipient_token_hash,
      args.p_resend_email_id ?? null,
      args.p_invited_by,
      nowIso(),
      args.target_publication_id,
      args.target_recipient_id,
    ],
  );
  return (result.meta?.changes ?? 0) > 0;
}

async function reserveSecurityRateLimitSlot(db: D1DatabaseLike, args: Record<string, unknown>) {
  const existing = await first<{ count: number }>(
    db,
    `SELECT COUNT(*) AS count
     FROM security_rate_limit_events
     WHERE scope = ? AND key_hash = ? AND occurred_at >= ?`,
    [args.p_scope, args.p_key_hash, args.p_window_start],
  );
  if ((existing?.count ?? 0) > 0) return false;

  await run(
    db,
    `INSERT INTO security_rate_limit_events (id, scope, key_hash, metadata_json, occurred_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      args.p_scope,
      args.p_key_hash,
      jsonText(args.p_metadata_json),
      nowIso(),
      args.p_expires_at,
    ],
  );
  return true;
}

async function authorizeRecipientPublicationForCurrentUser(db: D1DatabaseLike, args: Record<string, unknown>) {
  const email = typeof args.p_current_user_email === "string" ? args.p_current_user_email.trim().toLowerCase() : "";
  if (!email) return [];
  return all<{ publication_id: string; recipient_id: string }>(
    db,
    `SELECT publication.id AS publication_id, recipient.id AS recipient_id
     FROM shared_link_recipients recipient
     JOIN project_publications publication ON publication.id = recipient.publication_id
     WHERE lower(recipient.email) = ?
       AND recipient.publication_id = ?
       AND publication.status IN ('published', 'expired', 'revoked')
     LIMIT 1`,
    [email, args.p_publication_id],
  );
}

export function createPublicationAdminD1Client(databasePromise: Promise<D1DatabaseLike> = getRequiredPublicationAdminD1Database()) {
  return {
    from<T extends object = Record<string, unknown>>(table: string) {
      return new PublicationD1QueryBuilder<T>(databasePromise, table);
    },

    async callProcedure<T = unknown>(functionName: string, args: Record<string, unknown>): Promise<{ data: T | null; error: PublicationAdminError | null }> {
      try {
        const db = await databasePromise;
        let data: unknown;
        if (functionName === "replace_project_publication") {
          data = await replaceProjectPublication(db, args);
        } else if (functionName === "rotate_project_publication_credentials") {
          data = await rotateProjectPublicationCredentials(db, args);
        } else if (functionName === "persist_shared_link_recipient_resend") {
          data = await persistSharedLinkRecipientResend(db, args);
        } else if (functionName === "reserve_security_rate_limit_slot") {
          data = await reserveSecurityRateLimitSlot(db, args);
        } else if (functionName === "authorize_recipient_publication_for_current_user") {
          data = await authorizeRecipientPublicationForCurrentUser(db, args);
        } else {
          throw new Error(`Unsupported publication D1 procedure: ${functionName}`);
        }
        return { data: data as T, error: null };
      } catch (error) {
        return { data: null, error: toAdminError(error) };
      }
    },
  };
}

export type PublicationAdminD1Client = ReturnType<typeof createPublicationAdminD1Client>;
