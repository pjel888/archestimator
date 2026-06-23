import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.WORKSHOP_PROJECTS_SUMMARY_RPC_DISABLED = "1";

/**
 * Phase-1 server-parallelism proof for `listCurrentWorkspaceProjects`
 * (src/lib/repositories/workspace-repository.ts).
 *
 * The optimization issues two query "waves" concurrently:
 *   - Wave 2: sharedProjects (from "projects" .in id)  ∥  favoriteEstimates (from "estimates" .in id)
 *   - Wave 3: readOptionalProjectPublications (from "project_publications")
 *             ∥ readPendingCollaborationVisibilitySummary
 *               (rpc "list_pending_collaboration_invitations" + from "collaboration_invitations")
 *
 * Method: we replace the Supabase server client with a builder whose every awaited
 * query/rpc resolves after a fixed delay AND records {table, startTime, endTime}.
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

const queryLog: QueryRecord[] = [];

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * A chainable, thenable Supabase query-builder mock. Every chain method returns
 * `this` so the function-under-test can call .select/.eq/.in/.order/.is/.gt/.limit/
 * .maybeSingle in any order. Awaiting the builder (its .then) starts the clock,
 * waits QUERY_DELAY_MS, then resolves `{ data, error }` and records the interval.
 *
 * Crucially the timer only STARTS when the builder is awaited (.then invoked), so
 * two builders awaited together (Promise.all) both begin their delay immediately
 * and overlap. A serial `await a; await b` would not overlap.
 */
function createQueryBuilder(table: string, data: unknown) {
  let settled: Promise<{ data: unknown; error: null }> | null = null;

  const start = () => {
    if (settled) return settled;
    const startTime = performance.now();
    settled = delay(QUERY_DELAY_MS).then(() => {
      queryLog.push({ table, startTime, endTime: performance.now() });
      return { data, error: null };
    });
    return settled;
  };

  const builder: Record<string, unknown> = {
    then(onFulfilled: (value: { data: unknown; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
      return start().then(onFulfilled, onRejected);
    },
  };
  for (const method of ["select", "eq", "in", "order", "is", "gt", "limit", "maybeSingle"]) {
    builder[method] = () => builder;
  }
  return builder;
}

// ---- Fixture data, keyed by table/rpc so each chain resolves with realistic rows ----

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
  // `projects` is reused for the sharedProjects (.in id) read; the builder is created
  // fresh per `.from(...)` call, so we differentiate shared rows via the rpc/table map
  // below isn't enough — instead we hand the shared read its own table key.
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
    },
  ],
  collaboration_invitations: [{ id: "inv-1", project_id: "project-owned" }],
  workspaces: { id: "workspace-1", name: "Workspace One", slug: null, created_by: "user-1" },
};

// The shared-projects wave-2 read also hits `.from("projects")`. We want it to return
// the SHARED project rows (so sharedProjects is non-empty). We detect the wave-2 read
// by call-order: the FIRST `.from("projects")` is the owned read (wave 1), the SECOND
// is the shared read (wave 2). Track per-table call counts to vary the payload.
const fromCallCounts: Record<string, number> = {};

function dataForFrom(table: string): unknown {
  fromCallCounts[table] = (fromCallCounts[table] ?? 0) + 1;
  if (table === "projects" && fromCallCounts[table] === 2) {
    return [SHARED_PROJECT];
  }
  return tableData[table] ?? [];
}

const supabaseMock = {
  from(table: string) {
    return createQueryBuilder(table, dataForFrom(table));
  },
  rpc(name: string) {
    // Only `list_pending_collaboration_invitations` is reached in this path; it returns
    // received pending invites. Return an empty (but timed) result so wave-3 timing is
    // still recorded for the rpc leg.
    return createQueryBuilder(`rpc:${name}`, []);
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
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
  process.env.WORKSHOP_PROJECTS_SUMMARY_RPC_DISABLED = "1";
  queryLog.length = 0;
  for (const key of Object.keys(fromCallCounts)) delete fromCallCounts[key];
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
    // Parallel cost is ~2 * QUERY_DELAY_MS. (Wave 1 + the ensureDefaultWorkspace
    // workspaces lookup add a couple more serial round-trips, so we bound generously.)
    const serialEquivalentMs = 4 * QUERY_DELAY_MS;
    // The two optimized waves, run in parallel, must save at least ~one round-trip vs serial.
    // Use a generous ceiling well under the all-serial cost of every query in the path.
    const allSerialFloorMs = 6 * QUERY_DELAY_MS; // wave1-ish + wave2(2) + wave3(2) if fully serial
    expect(overallTotalMs).toBeLessThan(allSerialFloorMs);

    // Emit the measured numbers for the report (visible with --reporter=verbose / on failure).
    // eslint-disable-next-line no-console
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
