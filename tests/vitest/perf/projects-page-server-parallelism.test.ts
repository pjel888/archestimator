import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Phase-1 server-parallelism proof for `listCurrentWorkspaceProjects`
 * (src/lib/repositories/workspace-repository.ts).
 *
 * The optimization issues two query "waves" concurrently:
 *   - Wave 2: sharedProjects (D1 "projects" id IN read) ∥ favoriteEstimates (D1 "estimates" id IN read)
 *   - Wave 3: readOptionalProjectPublications (D1 "project_publications")
 *             ∥ readPendingCollaborationVisibilitySummary (D1 "collaboration_invitations")
 *
 * Method: we replace the Cloudflare D1 binding with statements whose first/all
 * calls resolve after a fixed delay AND record {table, startTime, endTime}.
 * If the two queries in a wave are kicked off together and awaited via Promise.all,
 * their [start,end] intervals OVERLAP in wall-clock. If they were serial, the second
 * query's start would be >= the first query's end (no overlap) and the total
 * wall-clock would be ~2x larger.
 *
 * We assert overlap within each wave plus a total-wall-clock bound that is
 * comfortably below the serial-equivalent cost. Thresholds are loose to avoid
 * timer flakiness on loaded CI while still being falsified by a serial regression.
 */

// Per-query simulated round-trip latency. Larger => more robust signal vs. jitter.
const QUERY_DELAY_MS = 50;

type QueryRecord = { table: string; startTime: number; endTime: number };
type D1Value = string | number | boolean | null | ArrayBuffer;

const queryLog: QueryRecord[] = [];

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ---- Fixture data, keyed by D1 query table so each statement resolves with realistic rows ----

const OWNED_PROJECT = {
  id: "project-owned",
  workspace_id: "workspace-1",
  name: "Owned Project",
  client_name: "Acme",
  location: null,
  project_code: "P-1",
  currency_code: "PHP",
  metadata: {},
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-10T00:00:00.000Z",
  created_by: "user-1",
};

const SHARED_PROJECT = {
  ...OWNED_PROJECT,
  id: "project-shared",
  name: "Shared Project",
  // A different workspace so it is NOT owned through the workspace.
  workspace_id: "workspace-other",
  created_by: "user-2",
};

const tableData: Record<string, unknown> = {
  // Wave 1
  projects: [OWNED_PROJECT], // initial owned read (.eq workspace_id)
  project_favorites: [{ project_id: "project-owned" }],
  estimate_favorites: [
    { estimate_id: "estimate-fav-1", project_id: "project-owned", created_at: "2026-06-09T00:00:00.000Z" },
  ],
  // Make the user a project_member of a NON-owned project => non-empty sharedProjectIds.
  project_members: [
    { project_id: "project-shared", workspace_id: "workspace-other", role: "editor", user_id: "user-1" },
  ],
  estimate_sheet_members: [],
  workspace_members: { role: "owner" }, // maybeSingle => owner role => canManage = true
  project_groups: [],
  project_group_memberships: [],
  // Wave 2
  // `projects` is reused for the sharedProjects (id IN) read; the statement is
  // created fresh per D1 prepare call, so call order distinguishes owned/shared rows.
  estimates: [
    { id: "estimate-fav-1", project_id: "project-owned", name: "Lobby", sheet_code: "EST-1", updated_at: "2026-06-08T00:00:00.000Z" },
  ],
  // Wave 3
  project_publications: [
    {
      id: "pub-1",
      project_id: "project-owned",
      encrypted_token: "tok",
      password_hash: null,
      status: "published",
      snapshot_version: 1,
      published_at: "2026-06-05T00:00:00.000Z",
      expires_at: null,
      revoked_at: null,
      open_count: 0,
      latest_opened_at: null,
      location_visibility: "hidden",
    },
  ],
  collaboration_invitations: [{ id: "inv-1", project_id: "project-owned" }],
  beta_starter_pack_states: [],
  beta_starter_asset_claims: [],
  starter_workspace_counts: {
    projects_count: 1,
    components_count: 0,
    templates_count: 0,
    groups_count: 0,
    custom_folders_count: 0,
  },
  workspaces: {
    id: "workspace-1",
    name: "Workspace One",
    slug: null,
    created_by: "user-1",
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
  },
};

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

// The shared-projects wave-2 read also hits `FROM projects`. We want it to return
// the SHARED project rows (so sharedProjects is non-empty). We detect the wave-2 read
// by call-order: the FIRST projects query is the owned read (wave 1), the SECOND
// is the shared read (wave 2). Track per-table call counts to vary the payload.
const d1QueryCallCounts: Record<string, number> = {};

function tableForSql(sql: string) {
  if (sql.includes("FROM beta_starter_pack_states")) return "beta_starter_pack_states";
  if (sql.includes("FROM beta_starter_asset_claims")) return "beta_starter_asset_claims";
  if (
    sql.includes("(SELECT COUNT(*) FROM projects") &&
    sql.includes("AS projects_count")
  ) {
    return "starter_workspace_counts";
  }
  if (sql.includes("FROM collaboration_invitations")) return "collaboration_invitations";
  if (sql.includes("FROM project_publications")) return "project_publications";
  if (sql.includes("FROM project_group_memberships")) return "project_group_memberships";
  if (sql.includes("FROM project_groups")) return "project_groups";
  if (sql.includes("FROM estimate_sheet_members")) return "estimate_sheet_members";
  if (sql.includes("FROM project_members")) return "project_members";
  if (sql.includes("FROM estimate_favorites")) return "estimate_favorites";
  if (sql.includes("FROM project_favorites")) return "project_favorites";
  if (sql.includes("FROM workspace_members")) return "workspace_members";
  if (sql.includes("FROM workspaces")) return "workspaces";
  if (sql.includes("FROM estimates")) return "estimates";
  if (sql.includes("FROM projects")) return "projects";
  throw new Error(`Unexpected D1 query: ${sql}`);
}

function dataForD1Query(table: string): unknown {
  d1QueryCallCounts[table] = (d1QueryCallCounts[table] ?? 0) + 1;
  if (table === "projects" && d1QueryCallCounts[table] === 2) {
    return [SHARED_PROJECT];
  }
  if (table === "workspace_members") return tableData.workspace_members;
  return tableData[table] ?? [];
}

class TimedD1Statement {
  constructor(private readonly sql: string) {}

  bind(..._values: D1Value[]) {
    void _values;
    return this;
  }

  private async resolve<T>() {
    const table = tableForSql(this.sql);
    const startTime = performance.now();
    await delay(QUERY_DELAY_MS);
    queryLog.push({ table, startTime, endTime: performance.now() });
    return dataForD1Query(table) as T;
  }

  async first<T>() {
    const data = await this.resolve<T | T[]>();
    return Array.isArray(data) ? (data[0] ?? null) : data;
  }

  async all<T>() {
    const data = await this.resolve<T[]>();
    return { results: Array.isArray(data) ? data : [] };
  }

  async run() {
    return { success: true, meta: { changes: 0 } };
  }
}

vi.mock("server-only", () => ({}));

vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: d1Mocks.getCloudflareD1Database,
}));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: vi.fn(async () => ({
    userId: "user-1",
    email: "user-1@example.com",
    role: "member",
    profile: {
      id: "user-1",
      email: "user-1@example.com",
      display_name: "User One",
      avatar_url: null,
      role: "member",
      // Set so ensureDefaultWorkspace takes the fast path: one workspaces lookup, return.
      default_workspace_id: "workspace-1",
    },
  })),
}));

// next/headers is imported at module scope; stub it so import resolves under jsdom.
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
  headers: vi.fn(async () => ({ get: () => null })),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  queryLog.length = 0;
  for (const key of Object.keys(d1QueryCallCounts)) delete d1QueryCallCounts[key];
  d1Mocks.getCloudflareD1Database.mockResolvedValue({
    prepare: (sql: string) => new TimedD1Statement(sql),
  });
});

function record(table: string) {
  const entry = queryLog.find((q) => q.table === table);
  if (!entry) {
    throw new Error(`Expected a recorded query for "${table}" but saw: ${queryLog.map((q) => q.table).join(", ")}`);
  }
  return entry;
}

function overlaps(a: QueryRecord, b: QueryRecord) {
  // Two intervals overlap iff each starts before the other ends.
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

describe("listCurrentWorkspaceProjects server query parallelism (Phase 1)", () => {
  it("runs wave-2 and wave-3 query pairs concurrently, not serially", async () => {
    const { listCurrentWorkspaceProjects } = await import("@/lib/repositories/workspace-repository");

    const overallStart = performance.now();
    const result = await listCurrentWorkspaceProjects();
    const overallTotalMs = performance.now() - overallStart;

    // Sanity: the function actually reached both optimized waves with non-empty inputs.
    expect(result.projects.length).toBeGreaterThan(0);

    // --- Wave 2: sharedProjects ("projects" 2nd read) ∥ favoriteEstimates ("estimates") ---
    const sharedRead = queryLog.filter((q) => q.table === "projects")[1];
    expect(sharedRead, "expected a 2nd projects read (sharedProjects wave-2)").toBeDefined();
    const favoriteEstimatesRead = record("estimates");
    expect(
      overlaps(sharedRead, favoriteEstimatesRead),
      "wave 2 should overlap: sharedProjects and favoriteEstimates run concurrently",
    ).toBe(true);

    // --- Wave 3: project_publications ∥ collaboration_invitations (+ rpc leg) ---
    const publicationsRead = record("project_publications");
    const invitationsRead = record("collaboration_invitations");
    expect(
      overlaps(publicationsRead, invitationsRead),
      "wave 3 should overlap: publications and pending-invite reads run concurrently",
    ).toBe(true);

    // --- Total wall-clock: parallel waves cost ~2 sequential round-trips, not ~4. ---
    // Sequential cost of just the two optimized waves alone would be ~4 * QUERY_DELAY_MS.
    // Parallel cost is ~2 * QUERY_DELAY_MS. The route now also performs starter-pack
    // state, claim, membership, and empty-workspace reads before listing projects.
    const serialEquivalentMs = 4 * QUERY_DELAY_MS;
    // The two optimized waves, run in parallel, must save at least ~one round-trip vs serial.
    // Ten round-trips is the all-serial floor for the current fake-backed app path,
    // so this ceiling still requires the optimized waves to save at least one trip.
    const allSerialFloorMs = 10 * QUERY_DELAY_MS;
    expect(overallTotalMs).toBeLessThan(allSerialFloorMs);

    // Emit the measured numbers for the report (visible with --reporter=verbose / on failure).
    console.log(
      JSON.stringify(
        {
          QUERY_DELAY_MS,
          overallTotalMs: Math.round(overallTotalMs),
          serialEquivalentForTwoWavesMs: serialEquivalentMs,
          wave2: {
            sharedProjects: { start: Math.round(sharedRead.startTime), end: Math.round(sharedRead.endTime) },
            favoriteEstimates: {
              start: Math.round(favoriteEstimatesRead.startTime),
              end: Math.round(favoriteEstimatesRead.endTime),
            },
            overlapMs: Math.round(
              Math.min(sharedRead.endTime, favoriteEstimatesRead.endTime) -
                Math.max(sharedRead.startTime, favoriteEstimatesRead.startTime),
            ),
          },
          wave3: {
            publications: { start: Math.round(publicationsRead.startTime), end: Math.round(publicationsRead.endTime) },
            invitations: { start: Math.round(invitationsRead.startTime), end: Math.round(invitationsRead.endTime) },
            overlapMs: Math.round(
              Math.min(publicationsRead.endTime, invitationsRead.endTime) -
                Math.max(publicationsRead.startTime, invitationsRead.startTime),
            ),
          },
        },
        null,
        2,
      ),
    );
  });
});
