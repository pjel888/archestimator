import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

const runRaceProof = process.env.ARCHESTIMATOR_DUPLICATE_DECISION_RACE_PROOF === "1";
const branchSafeTargetAllowed = process.env.ARCHESTIMATOR_DUPLICATE_DECISION_RACE_BRANCH_SAFE === "1";
const databaseUrl = process.env.SUPABASE_DB_URL;
const psqlBin = process.env.PSQL_BIN ?? "psql";

const createdWorkspaceIds = new Set<string>();

function isLocalPostgresUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".localhost");
  } catch {
    return false;
  }
}

function hasPsql() {
  try {
    execFileSync(psqlBin, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return true;
  } catch {
    return false;
  }
}

function raceProofSkipReason() {
  if (!runRaceProof) return "Set ARCHESTIMATOR_DUPLICATE_DECISION_RACE_PROOF=1 to run the provider-backed duplicate-decision race proof.";
  if (!databaseUrl) return "SUPABASE_DB_URL is required for the provider-backed duplicate-decision race proof.";
  if (!isLocalPostgresUrl(databaseUrl) && !branchSafeTargetAllowed) {
    return "Duplicate-decision race proof mutates only local Supabase unless ARCHESTIMATOR_DUPLICATE_DECISION_RACE_BRANCH_SAFE=1 is set.";
  }
  if (!hasPsql()) return `Missing psql binary: ${psqlBin}. Set PSQL_BIN if needed.`;
  return null;
}

function requireRaceProofEnv() {
  const skipReason = raceProofSkipReason();
  if (skipReason) throw new Error(skipReason);
  return databaseUrl as string;
}

function quoteSql(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function psqlArgs(sql: string) {
  return [
    "-X",
    "-v",
    "ON_ERROR_STOP=1",
    "-q",
    "-t",
    "-A",
    "-d",
    requireRaceProofEnv(),
    "-c",
    sql,
  ];
}

async function query(sql: string) {
  const result = await execFileAsync(psqlBin, psqlArgs(sql), { encoding: "utf8" });
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

async function cleanupWorkspace(workspaceId: string) {
  try {
    await query(`delete from public.workspaces where id = ${quoteSql(workspaceId)}::uuid;`);
  } finally {
    createdWorkspaceIds.delete(workspaceId);
  }
}

describe.skipIf(raceProofSkipReason() !== null)("QA-G06 duplicate-decision provider race proof", () => {
  afterEach(async () => {
    for (const workspaceId of Array.from(createdWorkspaceIds)) {
      await cleanupWorkspace(workspaceId);
    }
  });

  it("persists exactly one decision when two RPC calls race for the same recipient", async () => {
    const stamp = Date.now().toString(36);
    const workspaceId = crypto.randomUUID();
    const projectId = crypto.randomUUID();
    const publicationId = crypto.randomUUID();
    const recipientId = crypto.randomUUID();
    const tokenHash = `qa-g06-token-${stamp}-${crypto.randomUUID()}`;
    const recipientTokenHash = `qa-g06-recipient-${stamp}-${crypto.randomUUID()}`;

    createdWorkspaceIds.add(workspaceId);

    await query(`
      insert into public.workspaces (id, name, slug)
      values (${quoteSql(workspaceId)}::uuid, 'QA-G06 race workspace', ${quoteSql(`qa-g06-${stamp}`)});

      insert into public.projects (id, workspace_id, name)
      values (${quoteSql(projectId)}::uuid, ${quoteSql(workspaceId)}::uuid, 'QA-G06 race project');

      insert into public.project_publications (
        id,
        workspace_id,
        project_id,
        token_hash,
        encrypted_token,
        status,
        snapshot_version,
        selected_estimate_ids,
        snapshot_json
      )
      values (
        ${quoteSql(publicationId)}::uuid,
        ${quoteSql(workspaceId)}::uuid,
        ${quoteSql(projectId)}::uuid,
        ${quoteSql(tokenHash)},
        'qa-g06-redacted-token',
        'published',
        1,
        '{}'::uuid[],
        '{"estimates":[]}'::jsonb
      );

      insert into public.shared_link_recipients (id, publication_id, email, recipient_token_hash)
      values (
        ${quoteSql(recipientId)}::uuid,
        ${quoteSql(publicationId)}::uuid,
        ${quoteSql(`qa-g06-${stamp}@archestimator.local`)},
        ${quoteSql(recipientTokenHash)}
      );
    `);

    const decisionSql = `
      select public.submit_client_response(
        ${quoteSql(tokenHash)},
        ${quoteSql(recipientTokenHash)},
        'accepted',
        'QA-G06 duplicate race proof',
        1,
        null,
        null,
        'proposal',
        'the proposal',
        null
      );
    `;

    const results = await Promise.allSettled([
      execFileAsync(psqlBin, psqlArgs(decisionSql), { encoding: "utf8" }),
      execFileAsync(psqlBin, psqlArgs(decisionSql), { encoding: "utf8" }),
    ]);

    const successes = results.filter((result) => result.status === "fulfilled");
    const failures = results.filter((result) => result.status === "rejected");

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(JSON.stringify(failures[0])).toContain("Decision already submitted.");

    const [responseCount] = await query(`
      select count(*)
      from public.shared_link_responses
      where publication_id = ${quoteSql(publicationId)}::uuid
        and recipient_id = ${quoteSql(recipientId)}::uuid;
    `);

    expect(responseCount).toBe("1");
  });
});

describe.skipIf(raceProofSkipReason() === null)("QA-G06 duplicate-decision provider race proof", () => {
  it("is skipped until a safe local or branch-safe Supabase harness is available", () => {
    expect(raceProofSkipReason()).toMatch(/duplicate-decision race proof|SUPABASE_DB_URL|local Supabase|psql/);
  });
});
