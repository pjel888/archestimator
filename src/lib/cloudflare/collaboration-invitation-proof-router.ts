import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import {
  acceptCollaborationInvitationByIdInD1,
  acceptCollaborationInvitationTokenInD1,
  resolveCollaborationInvitationFromD1,
} from "@/lib/collaboration/invitation-d1-store";

export type CloudflareCollaborationInvitationProofEnv = {
  ARCH_DB?: D1DatabaseLike;
  CRON_SECRET?: string;
};

type CleanupCounts = {
  workspaces: number;
  profiles: number;
  workspaceMembers: number;
  projects: number;
  estimates: number;
  projectMembers: number;
  estimateMembers: number;
  invitations: number;
  tokens: number;
  auditEvents: number;
};

const INTERNAL_API_PATH = "/api/internal/collaboration-invitation-proof";
const PROOF_PATH = "/__cloudflare/collaboration-invitation-proof";
const PROOF_PATHS = new Set([INTERNAL_API_PATH, PROOF_PATH]);
const PROOF_PREFIX = "codex-collab-proof-";
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

function isAuthorized(request: Request, env: CloudflareCollaborationInvitationProofEnv) {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return "missing-secret";
  return request.headers.get("authorization") === `Bearer ${secret}` ? "authorized" : "unauthorized";
}

function nowIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function proofId(label: string, runId: string) {
  return `${PROOF_PREFIX}${label}-${runId}`;
}

function proofEmail(label: string, runId: string) {
  return `${PROOF_PREFIX}${label}-${runId}@${EMAIL_DOMAIN}`;
}

async function runStatement(db: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  return db.prepare(sql).bind(...values).run();
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
    projectMembers: 0,
    estimateMembers: 0,
    invitations: 0,
    tokens: 0,
    auditEvents: 0,
  };
}

async function countProofRows(db: D1DatabaseLike): Promise<CleanupCounts> {
  const idLike = `${PROOF_PREFIX}%`;
  const emailLike = `${PROOF_PREFIX}%@${EMAIL_DOMAIN}`;
  const row = await firstRow<Record<keyof CleanupCounts, number>>(
    db,
    `
      SELECT
        (SELECT COUNT(*) FROM workspaces WHERE id LIKE ? OR slug LIKE ? OR name LIKE ?) AS workspaces,
        (SELECT COUNT(*) FROM profiles WHERE id LIKE ? OR email LIKE ?) AS profiles,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id LIKE ? OR user_id LIKE ?) AS workspaceMembers,
        (SELECT COUNT(*) FROM projects WHERE id LIKE ? OR workspace_id LIKE ? OR name LIKE ?) AS projects,
        (SELECT COUNT(*) FROM estimates WHERE id LIKE ? OR project_id LIKE ?) AS estimates,
        (SELECT COUNT(*) FROM project_members WHERE project_id LIKE ? OR workspace_id LIKE ? OR user_id LIKE ?) AS projectMembers,
        (SELECT COUNT(*) FROM estimate_sheet_members WHERE estimate_id LIKE ? OR project_id LIKE ? OR user_id LIKE ?) AS estimateMembers,
        (SELECT COUNT(*) FROM collaboration_invitations WHERE id LIKE ? OR workspace_id LIKE ? OR project_id LIKE ? OR estimate_id LIKE ? OR email LIKE ?) AS invitations,
        (SELECT COUNT(*) FROM collaboration_invitation_tokens WHERE invitation_id LIKE ? OR token_hash LIKE ? OR created_by LIKE ?) AS tokens,
        (SELECT COUNT(*) FROM collaboration_audit_events WHERE invitation_id LIKE ? OR project_id LIKE ? OR estimate_id LIKE ? OR actor_user_id LIKE ?) AS auditEvents
    `,
    [
      idLike, idLike, idLike,
      idLike, emailLike,
      idLike, idLike,
      idLike, idLike, idLike,
      idLike, idLike,
      idLike, idLike, idLike,
      idLike, idLike, idLike,
      idLike, idLike, idLike, idLike, emailLike,
      idLike, idLike, idLike,
      idLike, idLike, idLike, idLike,
    ],
  );

  return {
    ...emptyCleanupCounts(),
    ...Object.fromEntries(
      Object.keys(emptyCleanupCounts()).map((key) => [key, numberValue(row?.[key as keyof CleanupCounts])]),
    ),
  };
}

function cleanupPassed(counts: CleanupCounts) {
  return Object.values(counts).every((value) => value === 0);
}

async function cleanupProofRows(db: D1DatabaseLike) {
  const idLike = `${PROOF_PREFIX}%`;
  const emailLike = `${PROOF_PREFIX}%@${EMAIL_DOMAIN}`;
  await runStatement(
    db,
    `
      DELETE FROM collaboration_audit_events
      WHERE invitation_id LIKE ?
        OR project_id LIKE ?
        OR estimate_id LIKE ?
        OR actor_user_id LIKE ?
    `,
    [idLike, idLike, idLike, idLike],
  );
  await runStatement(
    db,
    "DELETE FROM collaboration_invitation_tokens WHERE invitation_id LIKE ? OR token_hash LIKE ? OR created_by LIKE ?",
    [idLike, idLike, idLike],
  );
  await runStatement(
    db,
    `
      DELETE FROM collaboration_invitations
      WHERE id LIKE ?
        OR workspace_id LIKE ?
        OR project_id LIKE ?
        OR estimate_id LIKE ?
        OR email LIKE ?
    `,
    [idLike, idLike, idLike, idLike, emailLike],
  );
  await runStatement(db, "DELETE FROM estimate_sheet_members WHERE estimate_id LIKE ? OR project_id LIKE ? OR user_id LIKE ?", [idLike, idLike, idLike]);
  await runStatement(db, "DELETE FROM project_members WHERE project_id LIKE ? OR workspace_id LIKE ? OR user_id LIKE ?", [idLike, idLike, idLike]);
  await runStatement(db, "DELETE FROM estimates WHERE id LIKE ? OR project_id LIKE ?", [idLike, idLike]);
  await runStatement(db, "DELETE FROM projects WHERE id LIKE ? OR workspace_id LIKE ? OR name LIKE ?", [idLike, idLike, idLike]);
  await runStatement(db, "DELETE FROM workspace_members WHERE workspace_id LIKE ? OR user_id LIKE ?", [idLike, idLike]);
  await runStatement(db, "DELETE FROM profiles WHERE id LIKE ? OR email LIKE ?", [idLike, emailLike]);
  await runStatement(db, "DELETE FROM workspaces WHERE id LIKE ? OR slug LIKE ? OR name LIKE ?", [idLike, idLike, idLike]);
}

async function seedFixture(db: D1DatabaseLike, runId: string) {
  const now = nowIso();
  const future = nowIso(7 * 24 * 60 * 60 * 1000);
  const workspaceId = proofId("workspace", runId);
  const projectId = proofId("project", runId);
  const wrongProjectId = proofId("project-wrong", runId);
  const byIdProjectId = proofId("project-by-id", runId);
  const managerId = proofId("manager", runId);
  const inviteeId = proofId("invitee", runId);
  const otherId = proofId("other", runId);
  const managerEmail = proofEmail("manager", runId);
  const inviteeEmail = proofEmail("invitee", runId);
  const otherEmail = proofEmail("other", runId);
  const activeInvitationId = proofId("invitation-active", runId);
  const wrongInvitationId = proofId("invitation-wrong", runId);
  const revokedInvitationId = proofId("invitation-revoked", runId);
  const byIdInvitationId = proofId("invitation-by-id", runId);
  const activeTokenHash = proofId("token-active", runId);
  const wrongTokenHash = proofId("token-wrong", runId);
  const revokedTokenHash = proofId("token-revoked", runId);

  await runStatement(
    db,
    "INSERT INTO workspaces (id, name, slug, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [workspaceId, proofId("workspace", runId), workspaceId, managerId, now, now],
  );
  for (const [id, email, displayName] of [
    [managerId, managerEmail, "Codex Collaboration Proof Manager"],
    [inviteeId, inviteeEmail, "Codex Collaboration Proof Invitee"],
    [otherId, otherEmail, "Codex Collaboration Proof Other"],
  ]) {
    await runStatement(
      db,
      "INSERT INTO profiles (id, email, display_name, role, default_workspace_id, avatar_url, created_at, updated_at) VALUES (?, ?, ?, 'member', ?, NULL, ?, ?)",
      [id, email, displayName, workspaceId, now, now],
    );
    await runStatement(
      db,
      "INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [workspaceId, id, "member", now, now],
    );
  }
  for (const [id, name] of [
    [projectId, proofId("project", runId)],
    [wrongProjectId, proofId("project-wrong", runId)],
    [byIdProjectId, proofId("project-by-id", runId)],
  ]) {
    await runStatement(
      db,
      "INSERT INTO projects (id, workspace_id, name, project_code, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, workspaceId, name, `CF-${runId.slice(0, 8)}`, managerId, now, now],
    );
    await runStatement(
      db,
      "INSERT INTO project_members (project_id, workspace_id, user_id, role, added_by, created_at, updated_at) VALUES (?, ?, ?, 'editor', NULL, ?, ?)",
      [id, workspaceId, managerId, now, now],
    );
  }

  for (const [id, project, email, role, state, revokedAt] of [
    [activeInvitationId, projectId, inviteeEmail, "editor", "pending", null],
    [wrongInvitationId, wrongProjectId, inviteeEmail, "viewer", "pending", null],
    [revokedInvitationId, projectId, inviteeEmail, "viewer", "revoked", now],
    [byIdInvitationId, byIdProjectId, inviteeEmail, "editor", "pending", null],
  ]) {
    await runStatement(
      db,
      `
        INSERT INTO collaboration_invitations (
          id, workspace_id, project_id, estimate_id, scope, email, role,
          invited_by, invited_user_id, lifecycle_state, accepted_at,
          accepted_via, direct_granted_at, direct_granted_user_id, revoked_at,
          last_opened_at, expires_at, created_at, updated_at
        )
        VALUES (?, ?, ?, NULL, 'project', ?, ?, ?, NULL, ?, NULL, NULL, NULL, NULL, ?, NULL, ?, ?, ?)
      `,
      [id, workspaceId, project, email, role, managerId, state, revokedAt, future, now, now],
    );
  }
  for (const [id, invitationId, tokenHash, revokedAt] of [
    [proofId("token-row-active", runId), activeInvitationId, activeTokenHash, null],
    [proofId("token-row-wrong", runId), wrongInvitationId, wrongTokenHash, null],
    [proofId("token-row-revoked", runId), revokedInvitationId, revokedTokenHash, now],
    [proofId("token-row-by-id", runId), byIdInvitationId, proofId("token-by-id", runId), null],
  ]) {
    await runStatement(
      db,
      `
        INSERT INTO collaboration_invitation_tokens (
          id, invitation_id, token_hash, token_hint, delivery_method,
          created_by, created_at, expires_at, last_opened_at, used_at,
          revoked_at, revoked_by
        )
        VALUES (?, ?, ?, 'proof', 'copy_url', ?, ?, ?, NULL, NULL, ?, ?)
      `,
      [id, invitationId, tokenHash, managerId, now, future, revokedAt, revokedAt ? managerId : null],
    );
  }

  return {
    activeInvitationId,
    activeTokenHash,
    byIdInvitationId,
    byIdProjectId,
    inviteeEmail,
    inviteeId,
    otherEmail,
    otherId,
    projectId,
    wrongProjectId,
    revokedTokenHash,
    wrongTokenHash,
  };
}

async function countRows(db: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const row = await firstRow<{ count: number }>(db, sql, values);
  return numberValue(row?.count);
}

async function runHostedCollaborationInvitationProof(db: D1DatabaseLike) {
  const runId = crypto.randomUUID().replace(/-/g, "");
  const now = nowIso();
  let cleanupBefore = emptyCleanupCounts();
  let cleanupAfter = emptyCleanupCounts();
  let fixture: Awaited<ReturnType<typeof seedFixture>> | null = null;
  let error: string | null = null;
  let proof: Record<string, unknown> = {};

  try {
    await cleanupProofRows(db);
    cleanupBefore = await countProofRows(db);
    fixture = await seedFixture(db, runId);

    const activeResolve = await resolveCollaborationInvitationFromD1(db, fixture.activeTokenHash, now);
    const revokedResolve = await resolveCollaborationInvitationFromD1(db, fixture.revokedTokenHash, now);
    const acceptByToken = await acceptCollaborationInvitationTokenInD1(db, {
      actorEmail: fixture.inviteeEmail,
      actorUserId: fixture.inviteeId,
      invitationTokenHash: fixture.activeTokenHash,
      now,
    });
    const tokenReplaySameActor = await acceptCollaborationInvitationTokenInD1(db, {
      actorEmail: fixture.inviteeEmail,
      actorUserId: fixture.inviteeId,
      invitationTokenHash: fixture.activeTokenHash,
      now,
    });
    const tokenReplayOtherActor = await acceptCollaborationInvitationTokenInD1(db, {
      actorEmail: fixture.otherEmail,
      actorUserId: fixture.otherId,
      invitationTokenHash: fixture.activeTokenHash,
      now,
    });
    const wrongAccount = await acceptCollaborationInvitationTokenInD1(db, {
      actorEmail: fixture.otherEmail,
      actorUserId: fixture.otherId,
      invitationTokenHash: fixture.wrongTokenHash,
      now,
    });
    const acceptById = await acceptCollaborationInvitationByIdInD1(db, {
      actorEmail: fixture.inviteeEmail,
      actorUserId: fixture.inviteeId,
      invitationId: fixture.byIdInvitationId,
      now,
    });
    const byIdReplay = await acceptCollaborationInvitationByIdInD1(db, {
      actorEmail: fixture.inviteeEmail,
      actorUserId: fixture.inviteeId,
      invitationId: fixture.byIdInvitationId,
      now,
    });

    const activeMembershipRows = await countRows(
      db,
      "SELECT COUNT(*) AS count FROM project_members WHERE project_id = ? AND user_id = ?",
      [fixture.projectId, fixture.inviteeId],
    );
    const byIdMembershipRows = await countRows(
      db,
      "SELECT COUNT(*) AS count FROM project_members WHERE project_id = ? AND user_id = ?",
      [fixture.byIdProjectId, fixture.inviteeId],
    );
    const wrongMembershipRows = await countRows(
      db,
      "SELECT COUNT(*) AS count FROM project_members WHERE project_id = ? AND user_id = ?",
      [fixture.wrongProjectId, fixture.otherId],
    );
    const acceptedAuditRows = await countRows(
      db,
      "SELECT COUNT(*) AS count FROM collaboration_audit_events WHERE invitation_id = ? AND event_type = 'collaboration_invite_accepted'",
      [fixture.activeInvitationId],
    );
    const replayBlockedAuditRows = await countRows(
      db,
      "SELECT COUNT(*) AS count FROM collaboration_audit_events WHERE invitation_id = ? AND event_type = 'collaboration_invite_replay_blocked'",
      [fixture.activeInvitationId],
    );
    const wrongAccountAuditRows = await countRows(
      db,
      "SELECT COUNT(*) AS count FROM collaboration_audit_events WHERE invitation_id LIKE ? AND event_type = 'collaboration_invite_wrong_account'",
      [`${PROOF_PREFIX}%`],
    );

    proof = {
      activeResolve: {
        passed: activeResolve?.state === "active" && activeResolve.project_id === fixture.projectId,
        state: activeResolve?.state ?? null,
        projectVisible: Boolean(activeResolve?.project_id),
      },
      revokedResolve: {
        passed: revokedResolve?.state === "revoked" && revokedResolve.project_id === null,
        state: revokedResolve?.state ?? null,
        projectVisible: Boolean(revokedResolve?.project_id),
      },
      acceptByToken: {
        passed: acceptByToken.data?.state === "accepted" && activeMembershipRows === 1 && acceptedAuditRows === 1,
        state: acceptByToken.data?.state ?? null,
        membershipRows: activeMembershipRows,
        acceptedAuditRows,
      },
      replay: {
        passed: tokenReplaySameActor.data?.state === "already_member"
          && tokenReplayOtherActor.data?.state === "already_used"
          && activeMembershipRows === 1
          && replayBlockedAuditRows >= 1,
        sameActorState: tokenReplaySameActor.data?.state ?? null,
        otherActorState: tokenReplayOtherActor.data?.state ?? null,
        replayBlockedAuditRows,
      },
      wrongAccount: {
        passed: wrongAccount.data?.state === "wrong_account" && wrongMembershipRows === 0 && wrongAccountAuditRows >= 1,
        state: wrongAccount.data?.state ?? null,
        membershipRows: wrongMembershipRows,
        wrongAccountAuditRows,
      },
      acceptById: {
        passed: acceptById.data?.state === "accepted" && byIdReplay.data?.state === "already_member" && byIdMembershipRows === 1,
        state: acceptById.data?.state ?? null,
        replayState: byIdReplay.data?.state ?? null,
        membershipRows: byIdMembershipRows,
      },
    };
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  } finally {
    await cleanupProofRows(db);
    cleanupAfter = await countProofRows(db);
  }

  const readiness = {
    d1BindingPresent: true,
    resolveStateReady: (proof.activeResolve as { passed?: boolean } | undefined)?.passed === true,
    revokedTerminalNulled: (proof.revokedResolve as { passed?: boolean } | undefined)?.passed === true,
    acceptByTokenReady: (proof.acceptByToken as { passed?: boolean } | undefined)?.passed === true,
    acceptByIdReady: (proof.acceptById as { passed?: boolean } | undefined)?.passed === true,
    wrongAccountDenied: (proof.wrongAccount as { passed?: boolean } | undefined)?.passed === true,
    replayDenied: (proof.replay as { passed?: boolean } | undefined)?.passed === true,
    cleanupReady: cleanupPassed(cleanupAfter),
  };
  const hostedCollaborationInvitationD1Ready = Object.values(readiness).every(Boolean) && !error;

  return {
    generatedAt: nowIso(),
    mode: "cloudflare-hosted-collaboration-invitation-proof",
    proofSurface: INTERNAL_API_PATH,
    readiness: {
      ...readiness,
      hostedCollaborationInvitationD1Ready,
    },
    proof,
    cleanupBefore,
    cleanupAfter,
    passed: hostedCollaborationInvitationD1Ready,
    error,
    note: "Secret-gated hosted proof. It creates only codex-collab-proof-* fixtures, exercises deployed Worker D1 collaboration invitation resolve/accept/replay/denial paths, and verifies exact cleanup. It does not return raw invite tokens, bearer secrets, session cookies, or real project/customer data.",
  };
}

export async function routeCloudflareCollaborationInvitationProofRequest(
  request: Request,
  env: CloudflareCollaborationInvitationProofEnv,
) {
  const url = new URL(request.url);
  if (!PROOF_PATHS.has(url.pathname)) return null;

  const authorization = isAuthorized(request, env);
  if (authorization === "missing-secret") return jsonResponse({ error: "CRON_SECRET is not configured." }, 503);
  if (authorization === "unauthorized") return jsonResponse({ error: "Unauthorized." }, 401);
  if (!env.ARCH_DB) return jsonResponse({ error: "ARCH_DB D1 binding is not configured." }, 503);

  const report = await runHostedCollaborationInvitationProof(env.ARCH_DB);
  return jsonResponse(report, report.passed ? 200 : 500);
}
