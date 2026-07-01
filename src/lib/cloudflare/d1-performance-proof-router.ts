type D1Result<T = Record<string, unknown>> = {
  results?: T[];
  success?: boolean;
};

type D1PreparedStatementLike<T = Record<string, unknown>> = {
  bind(...values: Array<string | number | null>): D1PreparedStatementLike<T>;
  run(): Promise<D1Result<T>>;
  all(): Promise<D1Result<T>>;
};

type D1DatabaseLike = {
  exec(sql: string): Promise<unknown>;
  prepare<T = Record<string, unknown>>(sql: string): D1PreparedStatementLike<T>;
};

export type CloudflareD1PerformanceProofEnv = {
  ARCH_DB?: D1DatabaseLike;
  CRON_SECRET?: string;
};

type HostedQueryBenchmarkRow = {
  surface: string;
  queryBudget: number;
  plannedQueries: number;
  hostedBudgetMs: number;
  hostedP95Ms: number;
  sampleCount: number;
  rowsReturned: number;
  status: "hosted-pass" | "hosted-fail";
  notes: string;
};

type QuerySpec = {
  surface: string;
  queryBudget: number;
  plannedQueries: number;
  hostedBudgetMs: number;
  sql: string;
  params: (proofId: string) => Array<string | number | null>;
  notes: string;
};

type MutationSpec = {
  surface: string;
  queryBudget: number;
  plannedQueries: number;
  hostedBudgetMs: number;
  sql: string;
  params: (proofId: string, sample: number) => Array<string | number | null>;
  verifySql: string;
  verifyParams: (proofId: string) => Array<string | number | null>;
  notes: string;
};

type D1RuntimeProofResult = {
  d1BindingPresent: boolean;
  schemaReady: boolean;
  seedReady: boolean;
  cleanupReady: boolean;
  rowsSeeded: number;
  rowsCleaned: number | null;
  benchmarkSurfaces: number;
  benchmarkRows: HostedQueryBenchmarkRow[];
  error: string | null;
};

const D1_PERFORMANCE_PROOF_PATH = "/__cloudflare/d1-performance-proof";
const HOSTED_SAMPLE_COUNT = 9;
const PROOF_TABLES = [
  "__archestimator_d1_proof_estimate_rows",
  "__archestimator_d1_proof_estimates",
  "__archestimator_d1_proof_projects",
  "__archestimator_d1_proof_library_components",
  "__archestimator_d1_proof_workspace_members",
  "__archestimator_d1_proof_workspaces",
] as const;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS __archestimator_d1_proof_workspaces (
  proof_id TEXT NOT NULL,
  id TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (proof_id, id)
);

CREATE TABLE IF NOT EXISTS __archestimator_d1_proof_workspace_members (
  proof_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  PRIMARY KEY (proof_id, workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS __archestimator_d1_proof_projects (
  proof_id TEXT NOT NULL,
  id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (proof_id, id)
);

CREATE TABLE IF NOT EXISTS __archestimator_d1_proof_estimates (
  proof_id TEXT NOT NULL,
  id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  PRIMARY KEY (proof_id, id)
);

CREATE TABLE IF NOT EXISTS __archestimator_d1_proof_estimate_rows (
  proof_id TEXT NOT NULL,
  id TEXT NOT NULL,
  estimate_id TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_cost_cents INTEGER NOT NULL,
  PRIMARY KEY (proof_id, id)
);

CREATE TABLE IF NOT EXISTS __archestimator_d1_proof_library_components (
  proof_id TEXT NOT NULL,
  id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  unit_cost_cents INTEGER NOT NULL,
  PRIMARY KEY (proof_id, id)
);

CREATE INDEX IF NOT EXISTS idx_arch_d1_proof_projects_workspace_status
  ON __archestimator_d1_proof_projects(proof_id, workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_arch_d1_proof_members_lookup
  ON __archestimator_d1_proof_workspace_members(proof_id, workspace_id, user_id, role);
CREATE INDEX IF NOT EXISTS idx_arch_d1_proof_estimates_project
  ON __archestimator_d1_proof_estimates(proof_id, project_id);
CREATE INDEX IF NOT EXISTS idx_arch_d1_proof_rows_estimate
  ON __archestimator_d1_proof_estimate_rows(proof_id, estimate_id);
CREATE INDEX IF NOT EXISTS idx_arch_d1_proof_components_workspace_category
  ON __archestimator_d1_proof_library_components(proof_id, workspace_id, category);
`;

const QUERY_SPECS = [
  {
    surface: "workspace_homebase_summary",
    queryBudget: 3,
    plannedQueries: 1,
    hostedBudgetMs: 600,
    sql: `
      SELECT p.status, COUNT(DISTINCT p.id) AS project_count, COALESCE(SUM(e.total_cents), 0) AS total_cents
      FROM __archestimator_d1_proof_projects p
      LEFT JOIN __archestimator_d1_proof_estimates e
        ON e.proof_id = p.proof_id AND e.project_id = p.id
      WHERE p.proof_id = ? AND p.workspace_id = ?
      GROUP BY p.status
      ORDER BY p.status;
    `,
    params: (proofId: string) => [proofId, "ws-alpha"],
    notes: "Workspace summary read model should stay within one grouped D1 query plus authorization guard.",
  },
  {
    surface: "project_estimate_list_summaries",
    queryBudget: 3,
    plannedQueries: 1,
    hostedBudgetMs: 600,
    sql: `
      SELECT e.id, e.name, COUNT(r.id) AS row_count, COALESCE(SUM(r.quantity * r.unit_cost_cents), 0) AS rows_total_cents
      FROM __archestimator_d1_proof_estimates e
      LEFT JOIN __archestimator_d1_proof_estimate_rows r
        ON r.proof_id = e.proof_id AND r.estimate_id = e.id
      WHERE e.proof_id = ? AND e.project_id = ?
      GROUP BY e.id, e.name
      ORDER BY e.id;
    `,
    params: (proofId: string) => [proofId, "project-alpha-1"],
    notes: "Project estimate list should avoid per-estimate follow-up queries.",
  },
  {
    surface: "library_overview_summary",
    queryBudget: 3,
    plannedQueries: 1,
    hostedBudgetMs: 600,
    sql: `
      SELECT category, COUNT(*) AS component_count, ROUND(AVG(unit_cost_cents), 2) AS avg_unit_cost_cents
      FROM __archestimator_d1_proof_library_components
      WHERE proof_id = ? AND workspace_id = ?
      GROUP BY category
      ORDER BY category;
    `,
    params: (proofId: string) => [proofId, "ws-alpha"],
    notes: "Library overview should stay as a grouped indexed read-model query.",
  },
  {
    surface: "can_edit_project",
    queryBudget: 2,
    plannedQueries: 1,
    hostedBudgetMs: 600,
    sql: `
      SELECT EXISTS (
        SELECT 1
        FROM __archestimator_d1_proof_projects p
        JOIN __archestimator_d1_proof_workspace_members wm
          ON wm.proof_id = p.proof_id AND wm.workspace_id = p.workspace_id
        WHERE p.proof_id = ?
          AND p.id = ?
          AND wm.user_id = ?
          AND wm.role IN ('owner', 'editor')
      ) AS allowed;
    `,
    params: (proofId: string) => [proofId, "project-alpha-1", "user-owner"],
    notes: "Authorization guard should stay as one indexed membership lookup.",
  },
] as const satisfies QuerySpec[];

const MUTATION_SPECS = [
  {
    surface: "estimate_row_mutation",
    queryBudget: 3,
    plannedQueries: 1,
    hostedBudgetMs: 500,
    sql: `
      UPDATE __archestimator_d1_proof_estimate_rows
      SET quantity = ?, unit_cost_cents = ?
      WHERE proof_id = ? AND id = ?;
    `,
    params: (proofId: string, sample: number) => [
      2 + (sample % 5),
      4300 + sample,
      proofId,
      "row-alpha-1",
    ],
    verifySql: `
      SELECT quantity, unit_cost_cents
      FROM __archestimator_d1_proof_estimate_rows
      WHERE proof_id = ? AND id = ?;
    `,
    verifyParams: (proofId: string) => [proofId, "row-alpha-1"],
    notes: "Estimate row mutation should stay as one indexed D1 update against an authorized proof row.",
  },
] as const satisfies MutationSpec[];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function isAuthorized(request: Request, env: CloudflareD1PerformanceProofEnv) {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return "missing-secret";
  return request.headers.get("authorization") === `Bearer ${secret}` ? "authorized" : "unauthorized";
}

function nowMs() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentileValue) - 1));
  return sorted[index] ?? 0;
}

function roundedMs(value: number) {
  return Math.round(value * 100) / 100;
}

function proofId() {
  return `d1-runtime-${crypto.randomUUID()}`;
}

async function queryRows<T extends Record<string, unknown>>(
  db: D1DatabaseLike,
  sql: string,
  values: Array<string | number | null>,
) {
  const result = await db.prepare<T>(sql).bind(...values).all();
  return result.results ?? [];
}

async function runStatement(db: D1DatabaseLike, sql: string, values: Array<string | number | null> = []) {
  await db.prepare(sql).bind(...values).run();
}

async function ensureSchema(db: D1DatabaseLike) {
  const statements = SCHEMA_SQL
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await runStatement(db, statement);
  }
}

async function insertRows(
  db: D1DatabaseLike,
  table: string,
  columns: string[],
  rows: Array<Array<string | number | null>>,
) {
  if (rows.length === 0) return;
  const maxRowsPerStatement = Math.max(1, Math.floor(80 / columns.length));
  const rowPlaceholder = `(${columns.map(() => "?").join(", ")})`;
  for (let offset = 0; offset < rows.length; offset += maxRowsPerStatement) {
    const chunk = rows.slice(offset, offset + maxRowsPerStatement);
    const placeholders = chunk.map(() => rowPlaceholder).join(", ");
    const values = chunk.flat();
    await runStatement(db, `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}`, values);
  }
}

function buildSeedRows(id: string) {
  const projects = Array.from({ length: 6 }, (_, index) => {
    const number = index + 1;
    return [
      id,
      `project-alpha-${number}`,
      "ws-alpha",
      `Alpha Project ${number}`,
      number % 3 === 0 ? "archived" : "active",
    ];
  });

  const estimates = Array.from({ length: 12 }, (_, index) => {
    const number = index + 1;
    return [
      id,
      `estimate-alpha-${number}`,
      `project-alpha-${((number - 1) % 6) + 1}`,
      `Estimate ${number}`,
      100000 + (number * 12500),
    ];
  });

  const estimateRows = Array.from({ length: 72 }, (_, index) => {
    const number = index + 1;
    return [
      id,
      `row-alpha-${number}`,
      `estimate-alpha-${((number - 1) % 12) + 1}`,
      `Line item ${number}`,
      1 + (number % 7),
      2500 + (number * 35),
    ];
  });

  const components = Array.from({ length: 36 }, (_, index) => {
    const number = index + 1;
    const category = number % 3 === 0 ? "finish" : number % 3 === 1 ? "rough" : "fixture";
    return [
      id,
      `component-alpha-${number}`,
      "ws-alpha",
      category,
      `Component ${number}`,
      1000 + (number * 45),
    ];
  });

  return {
    workspaces: [
      [id, "ws-alpha", "alpha", "Alpha Workshop"],
      [id, "ws-beta", "beta", "Beta Workshop"],
    ],
    members: [
      [id, "ws-alpha", "user-owner", "owner"],
      [id, "ws-alpha", "user-editor", "editor"],
      [id, "ws-alpha", "user-viewer", "viewer"],
      [id, "ws-beta", "user-owner", "owner"],
    ],
    projects,
    estimates,
    estimateRows,
    components,
  };
}

async function cleanupProofRows(db: D1DatabaseLike, id: string) {
  for (const table of PROOF_TABLES) {
    await runStatement(db, `DELETE FROM ${table} WHERE proof_id = ?`, [id]);
  }
}

async function countSeededRows(db: D1DatabaseLike, id: string) {
  const rows = await queryRows<{ rows_seeded: number }>(
    db,
    `
      SELECT
        (SELECT COUNT(*) FROM __archestimator_d1_proof_workspaces WHERE proof_id = ?)
        + (SELECT COUNT(*) FROM __archestimator_d1_proof_workspace_members WHERE proof_id = ?)
        + (SELECT COUNT(*) FROM __archestimator_d1_proof_projects WHERE proof_id = ?)
        + (SELECT COUNT(*) FROM __archestimator_d1_proof_estimates WHERE proof_id = ?)
        + (SELECT COUNT(*) FROM __archestimator_d1_proof_estimate_rows WHERE proof_id = ?)
        + (SELECT COUNT(*) FROM __archestimator_d1_proof_library_components WHERE proof_id = ?) AS rows_seeded;
    `,
    [id, id, id, id, id, id],
  );
  return Number(rows[0]?.rows_seeded ?? 0);
}

async function seedProofRows(db: D1DatabaseLike, id: string) {
  const rows = buildSeedRows(id);
  await insertRows(db, "__archestimator_d1_proof_workspaces", ["proof_id", "id", "slug", "name"], rows.workspaces);
  await insertRows(
    db,
    "__archestimator_d1_proof_workspace_members",
    ["proof_id", "workspace_id", "user_id", "role"],
    rows.members,
  );
  await insertRows(
    db,
    "__archestimator_d1_proof_projects",
    ["proof_id", "id", "workspace_id", "name", "status"],
    rows.projects,
  );
  await insertRows(
    db,
    "__archestimator_d1_proof_estimates",
    ["proof_id", "id", "project_id", "name", "total_cents"],
    rows.estimates,
  );
  await insertRows(
    db,
    "__archestimator_d1_proof_estimate_rows",
    ["proof_id", "id", "estimate_id", "description", "quantity", "unit_cost_cents"],
    rows.estimateRows,
  );
  await insertRows(
    db,
    "__archestimator_d1_proof_library_components",
    ["proof_id", "id", "workspace_id", "category", "name", "unit_cost_cents"],
    rows.components,
  );
}

async function measureQuery(db: D1DatabaseLike, id: string, spec: QuerySpec) {
  const samples: number[] = [];
  let rowsReturned = 0;
  const params = spec.params(id);

  await queryRows(db, spec.sql, params);
  for (let index = 0; index < HOSTED_SAMPLE_COUNT; index += 1) {
    const started = nowMs();
    const rows = await queryRows(db, spec.sql, params);
    const ended = nowMs();
    samples.push(ended - started);
    rowsReturned = rows.length;
  }

  const hostedP95Ms = roundedMs(percentile(samples, 0.95));
  return {
    surface: spec.surface,
    queryBudget: spec.queryBudget,
    plannedQueries: spec.plannedQueries,
    hostedBudgetMs: spec.hostedBudgetMs,
    hostedP95Ms,
    sampleCount: samples.length,
    rowsReturned,
    status: spec.plannedQueries <= spec.queryBudget && hostedP95Ms <= spec.hostedBudgetMs
      ? "hosted-pass"
      : "hosted-fail",
    notes: spec.notes,
  } satisfies HostedQueryBenchmarkRow;
}

async function measureMutation(db: D1DatabaseLike, id: string, spec: MutationSpec) {
  const samples: number[] = [];

  await runStatement(db, spec.sql, spec.params(id, 0));
  for (let index = 0; index < HOSTED_SAMPLE_COUNT; index += 1) {
    const started = nowMs();
    await runStatement(db, spec.sql, spec.params(id, index + 1));
    const ended = nowMs();
    samples.push(ended - started);
  }

  const verificationRows = await queryRows(db, spec.verifySql, spec.verifyParams(id));
  const hostedP95Ms = roundedMs(percentile(samples, 0.95));
  return {
    surface: spec.surface,
    queryBudget: spec.queryBudget,
    plannedQueries: spec.plannedQueries,
    hostedBudgetMs: spec.hostedBudgetMs,
    hostedP95Ms,
    sampleCount: samples.length,
    rowsReturned: verificationRows.length,
    status: spec.plannedQueries <= spec.queryBudget
      && verificationRows.length === 1
      && hostedP95Ms <= spec.hostedBudgetMs
      ? "hosted-pass"
      : "hosted-fail",
    notes: spec.notes,
  } satisfies HostedQueryBenchmarkRow;
}

async function runD1Proof(db: D1DatabaseLike): Promise<D1RuntimeProofResult> {
  const id = proofId();
  let cleanupReady = false;
  let rowsCleaned: number | null = null;

  try {
    await ensureSchema(db);
    await cleanupProofRows(db, id);
    await seedProofRows(db, id);
    const rowsSeeded = await countSeededRows(db, id);
    const benchmarkRows = [];

    for (const spec of QUERY_SPECS) {
      benchmarkRows.push(await measureQuery(db, id, spec));
    }
    for (const spec of MUTATION_SPECS) {
      benchmarkRows.push(await measureMutation(db, id, spec));
    }

    await cleanupProofRows(db, id);
    rowsCleaned = await countSeededRows(db, id);
    cleanupReady = rowsCleaned === 0;

    return {
      d1BindingPresent: true,
      schemaReady: true,
      seedReady: rowsSeeded === 132,
      cleanupReady,
      rowsSeeded,
      rowsCleaned,
      benchmarkSurfaces: QUERY_SPECS.length + MUTATION_SPECS.length,
      benchmarkRows,
      error: null,
    };
  } catch (error) {
    try {
      await cleanupProofRows(db, id);
      rowsCleaned = await countSeededRows(db, id);
      cleanupReady = rowsCleaned === 0;
    } catch {
      cleanupReady = false;
    }

    return {
      d1BindingPresent: true,
      schemaReady: false,
      seedReady: false,
      cleanupReady,
      rowsSeeded: 0,
      rowsCleaned,
      benchmarkSurfaces: QUERY_SPECS.length + MUTATION_SPECS.length,
      benchmarkRows: [],
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }
}

function buildResponseBody(result: D1RuntimeProofResult) {
  const queryCountBudgetsReady = result.benchmarkRows.every((row) => row.plannedQueries <= row.queryBudget);
  const hostedP95Ready = result.benchmarkRows.length === QUERY_SPECS.length + MUTATION_SPECS.length
    && result.benchmarkRows.every((row) => row.status === "hosted-pass");
  const d1RuntimeProofReady = result.d1BindingPresent
    && result.schemaReady
    && result.seedReady
    && result.cleanupReady
    && queryCountBudgetsReady
    && hostedP95Ready;
  const blockers: string[] = [];

  if (!result.d1BindingPresent) blockers.push("ARCH_DB binding is missing.");
  if (!result.schemaReady) blockers.push("D1 proof schema could not be created or verified.");
  if (!result.seedReady) blockers.push(`D1 proof fixture seed count was ${result.rowsSeeded}, expected 132.`);
  if (!queryCountBudgetsReady) blockers.push("One or more D1 proof surfaces exceeded the planned query-count budget.");
  if (!hostedP95Ready) blockers.push("One or more D1 proof surfaces exceeded the hosted p95 budget.");
  if (!result.cleanupReady) blockers.push("D1 proof rows were not fully cleaned up.");
  if (result.error) blockers.push(result.error);

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-d1-runtime-performance-proof",
    endpointProofScope: "hosted-worker-d1-binding-query-budget-and-p95",
    providerBacked: true,
    result,
    readiness: {
      providerBacked: true,
      queryCountBudgetsReady,
      hostedP95Ready,
      hostedWorkerD1PerformanceReady: d1RuntimeProofReady,
      d1RuntimeProofReady,
      productionCutoverReady: false,
    },
    blockers,
    note: "Protected hosted D1 proof. It creates namespaced proof tables if needed, seeds sanitized fixture rows, measures indexed query surfaces through the real ARCH_DB binding, then deletes proof rows. It does not print secrets, change DNS, delete provider resources, or make production cutover ready.",
  };
}

export async function routeCloudflareD1PerformanceProofRequest(
  request: Request,
  env: CloudflareD1PerformanceProofEnv,
) {
  const url = new URL(request.url);
  if (url.pathname !== D1_PERFORMANCE_PROOF_PATH) return null;

  const auth = isAuthorized(request, env);
  if (auth === "missing-secret") return jsonResponse({ error: "CRON_SECRET is not configured." }, 503);
  if (auth === "unauthorized") return jsonResponse({ error: "Unauthorized." }, 401);
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  if (!env.ARCH_DB) {
    return jsonResponse(buildResponseBody({
      d1BindingPresent: false,
      schemaReady: false,
      seedReady: false,
      cleanupReady: false,
      rowsSeeded: 0,
      rowsCleaned: null,
      benchmarkSurfaces: QUERY_SPECS.length + MUTATION_SPECS.length,
      benchmarkRows: [],
      error: null,
    }), 503);
  }

  const body = buildResponseBody(await runD1Proof(env.ARCH_DB));
  return jsonResponse(body, body.readiness.d1RuntimeProofReady ? 200 : 500);
}
