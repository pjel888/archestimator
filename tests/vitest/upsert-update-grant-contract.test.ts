import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// Regression contract for the "unable to move a project to a group" / "cannot favorite a
// project" class of bug.
//
// A Supabase `.upsert(..., { onConflict })` compiles to `INSERT ... ON CONFLICT DO UPDATE`.
// PostgreSQL requires the UPDATE privilege on the target table for that statement and checks
// it UNCONDITIONALLY at executor startup — it fails with 42501 even on an empty table where
// no row conflicts. So any table written via a DO-UPDATE upsert on the *authenticated* client
// MUST grant UPDATE to authenticated, or every write 500s. Unit tests mock Supabase, so only
// a contract like this (or a live DB) catches a missing grant.
//
// An upsert with `{ ignoreDuplicates: true }` compiles to ON CONFLICT DO NOTHING, which needs
// only INSERT — those are exempt.
const migrationsDir = join(process.cwd(), "supabase/migrations");
const srcDir = join(process.cwd(), "src");

// Tables written via a DO-UPDATE upsert on the AUTHENTICATED client => MUST be granted UPDATE.
const AUTH_UPSERT_TABLES_REQUIRING_UPDATE = new Set([
  "project_group_memberships", // moveProjectToGroup / bulkAssignProjectsToGroup
  "project_favorites", // setProjectFavorite (favorite = true)
  "project_locations", // saveProjectLocation uses an authenticated DO-UPDATE upsert
  "workspace_account_settings", // account settings upsert (already granted update)
]);

// DO-UPDATE upsert tables that do NOT need an authenticated UPDATE grant, with the reason.
// Either they run on a service-role/admin client (RLS + table grants bypassed) or their grants
// are managed by Supabase platform defaults rather than an explicit migration.
const AUTH_UPSERT_TABLES_EXEMPT = new Map<string, string>([
  ["project_members", "service-role/admin client (collaboration actions)"],
  ["estimate_sheet_members", "service-role/admin client (collaboration actions)"],
  ["estimate_sheet_access_settings", "service-role/admin client (collaboration actions)"],
  ["user_onboarding_profiles", "account service-role client"],
  ["ai_action_runs", "Cloudflare D1 AI audit store, not authenticated Supabase client"],
  ["estimate_row_items", "no explicit grant migration; relies on Supabase default privileges"],
]);

function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFilesRecursive(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

// Discover every `.from("<table>").upsert(` site in src and classify it as DO UPDATE
// (needs UPDATE) vs DO NOTHING (`ignoreDuplicates: true`, INSERT-only). Returns the set of
// tables reached by a DO-UPDATE upsert anywhere in the app.
function discoverDoUpdateUpsertTables(): Set<string> {
  const tables = new Set<string>();
  const re = /\.from\(\s*["'`](\w+)["'`]\s*\)\s*\.upsert\(/g;
  for (const file of listFilesRecursive(srcDir)) {
    const text = readFileSync(file, "utf8");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const table = match[1];
      // Inspect the upsert option object (a window after the call open-paren) for DO NOTHING.
      const window = text.slice(match.index, match.index + 400);
      if (/ignoreDuplicates\s*:\s*true/.test(window)) continue; // ON CONFLICT DO NOTHING
      tables.add(table);
    }
  }
  return tables;
}

// Compute the EFFECTIVE set of privileges granted to `authenticated` for a table by replaying
// every migration in filename (chronological) order: `revoke all ... from authenticated`
// clears the set, `grant <privs> ... to authenticated` adds to it. Reflects the real DB state,
// not a single file — a later migration that revoked the grant would be caught too.
function effectiveAuthenticatedPrivileges(table: string): Set<string> {
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const grantRe = new RegExp(
    `grant\\s+([a-z, ]+?)\\s+on\\s+(?:table\\s+)?public\\.${table}\\s+to\\s+authenticated`,
    "i",
  );
  const revokeAllRe = new RegExp(
    `revoke\\s+all\\s+on\\s+(?:table\\s+)?public\\.${table}\\s+from\\s+authenticated`,
    "i",
  );

  const privileges = new Set<string>();
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    for (const rawLine of sql.split("\n")) {
      const line = rawLine.trim();
      if (line.startsWith("--")) continue; // ignore commentary that mentions grants
      if (revokeAllRe.test(line)) privileges.clear();
      const grant = grantRe.exec(line);
      if (grant) {
        for (const priv of grant[1].split(",")) {
          const token = priv.trim().toLowerCase();
          if (token) privileges.add(token);
        }
      }
    }
  }
  return privileges;
}

describe("upsert tables grant UPDATE to authenticated", () => {
  for (const table of AUTH_UPSERT_TABLES_REQUIRING_UPDATE) {
    it(`grants UPDATE on public.${table} (required by ON CONFLICT DO UPDATE)`, () => {
      const privileges = effectiveAuthenticatedPrivileges(table);
      // Sanity: the table is actually granted to authenticated at all.
      expect(privileges.has("insert")).toBe(true);
      // The fix: without UPDATE, every DO-UPDATE upsert on this table is denied 42501.
      expect(privileges.has("update")).toBe(true);
    });
  }

  it("keeps estimate_favorites on insert-only (its upsert is ON CONFLICT DO NOTHING)", () => {
    // Documents the deliberate divergence so a future reader does not "fix" it by adding the
    // unnecessary UPDATE grant. If someone drops `ignoreDuplicates`, the tripwire below moves
    // estimate_favorites into the DO-UPDATE set and forces it to be classified.
    const privileges = effectiveAuthenticatedPrivileges("estimate_favorites");
    expect(privileges.has("insert")).toBe(true);
  });

  // Tripwire (addresses the "future new table" gap): scan the whole app for DO-UPDATE upserts
  // and require every reached table to be classified — either it needs the authenticated UPDATE
  // grant (and has it), or it is explicitly exempt (admin client / platform-default grants). A
  // brand-new upsert on an un-granted authenticated table fails here with an actionable message.
  it("classifies every DO-UPDATE upsert table in the codebase", () => {
    const discovered = discoverDoUpdateUpsertTables();
    // The known broken-then-fixed tables must actually be discovered (guards the scanner regex).
    expect(discovered.has("project_group_memberships")).toBe(true);
    expect(discovered.has("project_favorites")).toBe(true);

    const unclassified: string[] = [];
    for (const table of discovered) {
      if (AUTH_UPSERT_TABLES_EXEMPT.has(table)) continue;
      if (AUTH_UPSERT_TABLES_REQUIRING_UPDATE.has(table)) {
        // If it requires the grant, the per-table tests above assert UPDATE is present; double
        // check here too so the tripwire alone is sufficient.
        const privileges = effectiveAuthenticatedPrivileges(table);
        if (!privileges.has("update")) unclassified.push(`${table} (missing UPDATE grant)`);
        continue;
      }
      unclassified.push(
        `${table} (new DO-UPDATE upsert — add to AUTH_UPSERT_TABLES_REQUIRING_UPDATE + grant ` +
          `UPDATE, or to AUTH_UPSERT_TABLES_EXEMPT if it uses an admin/service-role client)`,
      );
    }
    expect(unclassified, `Unclassified DO-UPDATE upsert tables:\n${unclassified.join("\n")}`).toEqual([]);
  });
});
