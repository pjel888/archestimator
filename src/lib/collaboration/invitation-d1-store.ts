import "server-only";

import { getCloudflareD1Database, type D1DatabaseLike, type D1PreparedStatementLike } from "@/lib/cloudflare/d1";

export type InviteResolutionRow = {
  state: string;
  invitation_id: string | null;
  project_id: string | null;
  estimate_id: string | null;
  project_name: string | null;
  project_code: string | null;
  estimate_name: string | null;
  role: string | null;
  scope: string | null;
  inviter_label: string | null;
  inviter_email: string | null;
  invited_email: string | null;
  expires_at: string | null;
  token_id: string | null;
};

export type InvitationAcceptanceState = Record<string, unknown>;

export type InvitationAcceptanceResponse = {
  data: InvitationAcceptanceState | null;
  error: unknown | null;
};

type InvitationLookupRow = {
  estimate_id: string | null;
  estimate_name: string | null;
  invitation_expires_at: string;
  invitation_id: string;
  invitation_revoked_at: string | null;
  invited_email: string;
  invited_user_id: string | null;
  invited_by: string | null;
  inviter_email: string | null;
  inviter_label: string | null;
  lifecycle_state: string;
  project_code: string | null;
  project_id: string | null;
  project_name: string | null;
  role: string;
  scope: string;
  token_expires_at: string | null;
  token_id: string | null;
  token_revoked_at: string | null;
  token_used_at: string | null;
  workspace_id: string;
};

type InvitationAcceptanceInput = {
  actorEmail: string;
  actorUserId: string;
  invitationId?: string;
  invitationTokenHash?: string;
  now?: string;
  via: "invite_route" | "pending_invite";
};

function nowIso(input?: string) {
  return input ?? new Date().toISOString();
}

function createAuditId() {
  return crypto.randomUUID();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isExpired(value: string | null, now: string) {
  return Boolean(value && value <= now);
}

function toResolutionRow(row: InvitationLookupRow, state: string): InviteResolutionRow {
  if (state === "revoked") {
    return {
      state,
      invitation_id: null,
      project_id: null,
      estimate_id: null,
      project_name: null,
      project_code: null,
      estimate_name: null,
      role: null,
      scope: null,
      inviter_label: null,
      inviter_email: null,
      invited_email: null,
      expires_at: null,
      token_id: null,
    };
  }

  return {
    state,
    invitation_id: row.invitation_id,
    project_id: row.project_id,
    estimate_id: row.estimate_id,
    project_name: row.project_name,
    project_code: row.project_code,
    estimate_name: row.estimate_name,
    role: row.role,
    scope: row.scope,
    inviter_label: row.inviter_label ?? "Archestimator collaborator",
    inviter_email: row.inviter_email,
    invited_email: row.invited_email,
    expires_at: row.invitation_expires_at,
    token_id: row.token_id,
  };
}

function resolveState(row: InvitationLookupRow, now: string) {
  if (row.token_revoked_at || row.invitation_revoked_at || row.lifecycle_state === "revoked") return "revoked";
  if (row.token_used_at) return "already_used";
  if (isExpired(row.token_expires_at, now) || isExpired(row.invitation_expires_at, now) || row.lifecycle_state === "expired") {
    return "expired";
  }
  return "active";
}

function acceptedState(row: InvitationLookupRow, actorUserId: string) {
  if (row.lifecycle_state === "accepted_by_recipient" || row.lifecycle_state === "direct_granted_existing_user") {
    return row.invited_user_id === actorUserId ? "already_member" : "already_used";
  }
  if (row.token_used_at && row.invited_user_id !== actorUserId) return "already_used";
  return null;
}

async function runStatements(db: D1DatabaseLike, statements: Array<D1PreparedStatementLike>) {
  if (db.batch) {
    await db.batch(statements);
    return;
  }

  for (const statement of statements) {
    await statement.run();
  }
}

async function materializeExpiredInvitations(db: D1DatabaseLike, now: string) {
  await db
    .prepare(
      `
        UPDATE collaboration_invitations
        SET lifecycle_state = 'expired'
        WHERE lifecycle_state = 'pending'
          AND accepted_at IS NULL
          AND revoked_at IS NULL
          AND expires_at <= ?
      `,
    )
    .bind(now)
    .run();
}

async function readInvitationByTokenHash(db: D1DatabaseLike, invitationTokenHash: string) {
  return db
    .prepare<InvitationLookupRow>(
      `
        SELECT
          t.id AS token_id,
          t.expires_at AS token_expires_at,
          t.used_at AS token_used_at,
          t.revoked_at AS token_revoked_at,
          i.id AS invitation_id,
          i.workspace_id,
          i.project_id,
          i.estimate_id,
          i.email AS invited_email,
          i.role,
          i.scope,
          i.expires_at AS invitation_expires_at,
          i.revoked_at AS invitation_revoked_at,
          i.lifecycle_state,
          i.invited_user_id,
          i.invited_by,
          p.name AS project_name,
          p.project_code,
          e.name AS estimate_name,
          COALESCE(inviter.display_name, inviter.email, 'Archestimator collaborator') AS inviter_label,
          inviter.email AS inviter_email
        FROM collaboration_invitation_tokens t
        JOIN collaboration_invitations i ON i.id = t.invitation_id
        LEFT JOIN projects p ON p.id = i.project_id
        LEFT JOIN estimates e ON e.id = i.estimate_id
        LEFT JOIN profiles inviter ON inviter.id = i.invited_by
        WHERE t.token_hash = ?
        LIMIT 1
      `,
    )
    .bind(invitationTokenHash)
    .first<InvitationLookupRow>();
}

async function readInvitationById(db: D1DatabaseLike, invitationId: string) {
  return db
    .prepare<InvitationLookupRow>(
      `
        SELECT
          NULL AS token_id,
          NULL AS token_expires_at,
          NULL AS token_used_at,
          NULL AS token_revoked_at,
          i.id AS invitation_id,
          i.workspace_id,
          i.project_id,
          i.estimate_id,
          i.email AS invited_email,
          i.role,
          i.scope,
          i.expires_at AS invitation_expires_at,
          i.revoked_at AS invitation_revoked_at,
          i.lifecycle_state,
          i.invited_user_id,
          i.invited_by,
          p.name AS project_name,
          p.project_code,
          e.name AS estimate_name,
          COALESCE(inviter.display_name, inviter.email, 'Archestimator collaborator') AS inviter_label,
          inviter.email AS inviter_email
        FROM collaboration_invitations i
        LEFT JOIN projects p ON p.id = i.project_id
        LEFT JOIN estimates e ON e.id = i.estimate_id
        LEFT JOIN profiles inviter ON inviter.id = i.invited_by
        WHERE i.id = ?
        LIMIT 1
      `,
    )
    .bind(invitationId)
    .first<InvitationLookupRow>();
}

async function recordInviteAuditEvent(
  db: D1DatabaseLike,
  row: InvitationLookupRow,
  {
    actorUserId,
    eventType,
    metadata,
    now,
  }: {
    actorUserId: string | null;
    eventType: string;
    metadata: Record<string, unknown>;
    now: string;
  },
) {
  await db
    .prepare(
      `
        INSERT INTO collaboration_audit_events (
          id,
          invitation_id,
          project_id,
          estimate_id,
          actor_user_id,
          event_type,
          metadata_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      createAuditId(),
      row.invitation_id,
      row.project_id,
      row.estimate_id,
      actorUserId,
      eventType,
      JSON.stringify(metadata),
      now,
    )
    .run();
}

export async function resolveCollaborationInvitationFromD1(
  db: D1DatabaseLike,
  invitationTokenHash: string,
  now = nowIso(),
): Promise<InviteResolutionRow | null> {
  await materializeExpiredInvitations(db, now);
  const row = await readInvitationByTokenHash(db, invitationTokenHash);
  if (!row) return null;

  await runStatements(db, [
    db
      .prepare(
        `
          UPDATE collaboration_invitation_tokens
          SET last_opened_at = ?
          WHERE id = ?
        `,
      )
      .bind(now, row.token_id),
    db
      .prepare(
        `
          UPDATE collaboration_invitations
          SET last_opened_at = ?
          WHERE id = ?
        `,
      )
      .bind(now, row.invitation_id),
    db
      .prepare(
        `
          INSERT INTO collaboration_audit_events (
            id,
            invitation_id,
            project_id,
            estimate_id,
            actor_user_id,
            event_type,
            metadata_json,
            created_at
          )
          VALUES (?, ?, ?, ?, NULL, 'collaboration_invite_opened', ?, ?)
        `,
      )
      .bind(
        createAuditId(),
        row.invitation_id,
        row.project_id,
        row.estimate_id,
        JSON.stringify({ scope: row.scope, role: row.role, token_id: row.token_id }),
        now,
      ),
  ]);

  return toResolutionRow(row, resolveState(row, now));
}

export async function resolveCollaborationInvitationFromCloudflareD1(invitationTokenHash: string) {
  const db = await getCloudflareD1Database();
  return db ? resolveCollaborationInvitationFromD1(db, invitationTokenHash) : null;
}

async function hasProjectMembership(db: D1DatabaseLike, projectId: string, actorUserId: string) {
  const row = await db
    .prepare<{ role: string }>(
      `
        SELECT role
        FROM project_members
        WHERE project_id = ? AND user_id = ?
        LIMIT 1
      `,
    )
    .bind(projectId, actorUserId)
    .first<{ role: string }>();
  return Boolean(row);
}

async function hasEstimateMembership(db: D1DatabaseLike, estimateId: string, actorUserId: string) {
  const row = await db
    .prepare<{ role: string }>(
      `
        SELECT role
        FROM estimate_sheet_members
        WHERE estimate_id = ? AND user_id = ?
        LIMIT 1
      `,
    )
    .bind(estimateId, actorUserId)
    .first<{ role: string }>();
  return Boolean(row);
}

async function acceptProjectInvitation(
  db: D1DatabaseLike,
  row: InvitationLookupRow,
  actorUserId: string,
  now: string,
  tokenId: string | null,
) {
  if (!row.project_id) return null;
  const alreadyHasAccess = await hasProjectMembership(db, row.project_id, actorUserId);
  const statement = db
    .prepare(
      `
        INSERT INTO project_members (project_id, workspace_id, user_id, role, added_by, created_at, updated_at)
        SELECT ?, ?, ?, ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1
          FROM collaboration_invitations AS current_invitation
          WHERE current_invitation.id = ?
            AND current_invitation.lifecycle_state = 'pending'
            AND current_invitation.accepted_at IS NULL
            AND current_invitation.revoked_at IS NULL
            AND current_invitation.expires_at > ?
            AND EXISTS (
              SELECT 1
              FROM collaboration_invitation_tokens AS current_token
              WHERE current_token.invitation_id = current_invitation.id
                AND current_token.used_at IS NULL
                AND current_token.revoked_at IS NULL
                AND current_token.expires_at > ?
                AND (? IS NULL OR current_token.id = ?)
            )
        )
        ON CONFLICT(project_id, user_id) DO UPDATE SET
          role = CASE
            WHEN
              CASE excluded.role
                WHEN 'owner' THEN 4
                WHEN 'admin' THEN 3
                WHEN 'editor' THEN 2
                ELSE 1
              END >
              CASE project_members.role
                WHEN 'owner' THEN 4
                WHEN 'admin' THEN 3
                WHEN 'editor' THEN 2
                ELSE 1
              END
              THEN excluded.role
            ELSE project_members.role
          END,
          added_by = COALESCE(project_members.added_by, excluded.added_by),
          updated_at = excluded.updated_at
      `,
    )
    .bind(
      row.project_id,
      row.workspace_id,
      actorUserId,
      row.role,
      row.invited_by,
      now,
      now,
      row.invitation_id,
      now,
      now,
      tokenId,
      tokenId,
    );
  return { alreadyHasAccess, statement };
}

async function acceptEstimateInvitation(
  db: D1DatabaseLike,
  row: InvitationLookupRow,
  actorUserId: string,
  now: string,
  tokenId: string | null,
) {
  if (!row.estimate_id || !row.project_id) return null;
  const alreadyHasAccess = await hasEstimateMembership(db, row.estimate_id, actorUserId);
  const statement = db
    .prepare(
      `
        INSERT INTO estimate_sheet_members (estimate_id, project_id, user_id, role, added_by, created_at, updated_at)
        SELECT ?, ?, ?, ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1
          FROM collaboration_invitations AS current_invitation
          WHERE current_invitation.id = ?
            AND current_invitation.lifecycle_state = 'pending'
            AND current_invitation.accepted_at IS NULL
            AND current_invitation.revoked_at IS NULL
            AND current_invitation.expires_at > ?
            AND EXISTS (
              SELECT 1
              FROM collaboration_invitation_tokens AS current_token
              WHERE current_token.invitation_id = current_invitation.id
                AND current_token.used_at IS NULL
                AND current_token.revoked_at IS NULL
                AND current_token.expires_at > ?
                AND (? IS NULL OR current_token.id = ?)
            )
        )
        ON CONFLICT(estimate_id, user_id) DO UPDATE SET
          role = CASE
            WHEN
              CASE excluded.role
                WHEN 'owner' THEN 4
                WHEN 'admin' THEN 3
                WHEN 'editor' THEN 2
                ELSE 1
              END >
              CASE estimate_sheet_members.role
                WHEN 'owner' THEN 4
                WHEN 'admin' THEN 3
                WHEN 'editor' THEN 2
                ELSE 1
              END
              THEN excluded.role
            ELSE estimate_sheet_members.role
          END,
          added_by = COALESCE(estimate_sheet_members.added_by, excluded.added_by),
          updated_at = excluded.updated_at
      `,
    )
    .bind(
      row.estimate_id,
      row.project_id,
      actorUserId,
      row.role,
      row.invited_by,
      now,
      now,
      row.invitation_id,
      now,
      now,
      tokenId,
      tokenId,
    );
  return { alreadyHasAccess, statement };
}

async function acceptInvitationInD1(db: D1DatabaseLike, input: InvitationAcceptanceInput): Promise<InvitationAcceptanceResponse> {
  const now = nowIso(input.now);
  const actorEmail = normalizeEmail(input.actorEmail);
  if (!actorEmail || !input.actorUserId) return { data: { state: "invalid" }, error: null };

  await materializeExpiredInvitations(db, now);
  const row = input.invitationTokenHash
    ? await readInvitationByTokenHash(db, input.invitationTokenHash)
    : input.invitationId
      ? await readInvitationById(db, input.invitationId)
      : null;

  if (!row) return { data: { state: "invalid" }, error: null };
  if (row.token_revoked_at || row.invitation_revoked_at || row.lifecycle_state === "revoked") {
    return { data: { state: "revoked" }, error: null };
  }
  if (isExpired(row.token_expires_at, now) || isExpired(row.invitation_expires_at, now) || row.lifecycle_state === "expired") {
    return { data: { state: "expired" }, error: null };
  }

  const terminalAcceptedState = acceptedState(row, input.actorUserId);
  if (terminalAcceptedState) {
    if (terminalAcceptedState === "already_used") {
      await recordInviteAuditEvent(db, row, {
        actorUserId: input.actorUserId,
        eventType: "collaboration_invite_replay_blocked",
        metadata: { state: "already_used" },
        now,
      });
    }
    return {
      data: {
        state: terminalAcceptedState,
        project_id: terminalAcceptedState === "already_member" ? row.project_id : undefined,
        estimate_id: terminalAcceptedState === "already_member" ? row.estimate_id : undefined,
      },
      error: null,
    };
  }

  if (normalizeEmail(row.invited_email) !== actorEmail) {
    await recordInviteAuditEvent(db, row, {
      actorUserId: input.actorUserId,
      eventType: "collaboration_invite_wrong_account",
      metadata: { invited_email: row.invited_email },
      now,
    });
    return { data: { state: "wrong_account", invited_email: row.invited_email }, error: null };
  }

  let membership: { alreadyHasAccess: boolean; statement: D1PreparedStatementLike } | null;
  if (row.scope === "project") {
    if (!row.project_id) return { data: { state: "invalid" }, error: null };
    membership = await acceptProjectInvitation(db, row, input.actorUserId, now, row.token_id);
  } else if (row.scope === "estimate" && row.estimate_id) {
    membership = await acceptEstimateInvitation(db, row, input.actorUserId, now, row.token_id);
  } else {
    return { data: { state: "invalid" }, error: null };
  }
  if (!membership) return { data: { state: "invalid" }, error: null };

  if (!db.batch) {
    return { data: null, error: new Error("Cloudflare D1 batch support is required to accept collaboration invitations.") };
  }

  const results = await db.batch([
    membership.statement,
    input.invitationTokenHash && row.token_id
      ? db
        .prepare(
          `
            UPDATE collaboration_invitation_tokens
            SET used_at = COALESCE(used_at, ?)
            WHERE id = ?
              AND used_at IS NULL
              AND revoked_at IS NULL
              AND expires_at > ?
              AND EXISTS (
                SELECT 1
                FROM collaboration_invitations AS current_invitation
                WHERE current_invitation.id = collaboration_invitation_tokens.invitation_id
                  AND current_invitation.lifecycle_state = 'pending'
                  AND current_invitation.accepted_at IS NULL
                  AND current_invitation.revoked_at IS NULL
                  AND current_invitation.expires_at > ?
              )
          `,
        )
        .bind(now, row.token_id, now, now)
      : db
        .prepare(
          `
            UPDATE collaboration_invitation_tokens
            SET used_at = COALESCE(used_at, ?)
            WHERE invitation_id = ?
              AND used_at IS NULL
              AND revoked_at IS NULL
              AND expires_at > ?
              AND EXISTS (
                SELECT 1
                FROM collaboration_invitations AS current_invitation
                WHERE current_invitation.id = collaboration_invitation_tokens.invitation_id
                  AND current_invitation.lifecycle_state = 'pending'
                  AND current_invitation.accepted_at IS NULL
                  AND current_invitation.revoked_at IS NULL
                  AND current_invitation.expires_at > ?
              )
          `,
        )
        .bind(now, row.invitation_id, now, now),
    db
      .prepare(
        `
          UPDATE collaboration_invitations
          SET accepted_at = COALESCE(accepted_at, ?),
              invited_user_id = COALESCE(invited_user_id, ?),
              accepted_via = COALESCE(accepted_via, ?),
              lifecycle_state = 'accepted_by_recipient',
              updated_at = ?
          WHERE id = ?
            AND lifecycle_state = 'pending'
            AND accepted_at IS NULL
            AND revoked_at IS NULL
            AND expires_at > ?
            AND EXISTS (
              SELECT 1
              FROM collaboration_invitation_tokens AS consumed_token
              WHERE consumed_token.invitation_id = collaboration_invitations.id
                AND consumed_token.used_at = ?
            )
          `,
        )
      .bind(now, input.actorUserId, input.via, now, row.invitation_id, now, now),
    db
      .prepare(
        `
          INSERT INTO collaboration_audit_events (
            id,
            invitation_id,
            project_id,
            estimate_id,
            actor_user_id,
            event_type,
            metadata_json,
            created_at
          )
          SELECT ?, ?, ?, ?, ?, ?, ?, ?
          WHERE EXISTS (
            SELECT 1
            FROM collaboration_invitations AS accepted_invitation
            WHERE accepted_invitation.id = ?
              AND accepted_invitation.lifecycle_state = 'accepted_by_recipient'
              AND accepted_invitation.invited_user_id = ?
              AND accepted_invitation.accepted_at = ?
          )
            AND NOT EXISTS (
              SELECT 1
              FROM collaboration_audit_events AS existing_event
              WHERE existing_event.invitation_id = ?
                AND existing_event.actor_user_id = ?
                AND existing_event.event_type = ?
                AND existing_event.created_at = ?
            )
        `,
      )
      .bind(
        createAuditId(),
        row.invitation_id,
        row.project_id,
        row.estimate_id,
        input.actorUserId,
        membership.alreadyHasAccess ? "collaboration_invite_already_member_confirmed" : "collaboration_invite_accepted",
        JSON.stringify({ via: input.via }),
        now,
        row.invitation_id,
        input.actorUserId,
        now,
        row.invitation_id,
        input.actorUserId,
        membership.alreadyHasAccess ? "collaboration_invite_already_member_confirmed" : "collaboration_invite_accepted",
        now,
      ),
  ]);

  if ((results[2]?.meta?.changes ?? 0) !== 1) {
    const latest = await readInvitationById(db, row.invitation_id);
    if (!latest) return { data: { state: "invalid" }, error: null };
    if (latest.token_revoked_at || latest.invitation_revoked_at || latest.lifecycle_state === "revoked") {
      return { data: { state: "revoked" }, error: null };
    }
    const latestTerminalState = acceptedState(latest, input.actorUserId);
    return { data: { state: latestTerminalState ?? "invalid" }, error: null };
  }

  return {
    data: {
      state: membership.alreadyHasAccess ? "already_member" : "accepted",
      project_id: row.project_id,
      estimate_id: row.estimate_id,
    },
    error: null,
  };
}

export function acceptCollaborationInvitationTokenInD1(
  db: D1DatabaseLike,
  input: Omit<InvitationAcceptanceInput, "invitationId" | "via">,
) {
  return acceptInvitationInD1(db, { ...input, via: "invite_route" });
}

export function acceptCollaborationInvitationByIdInD1(
  db: D1DatabaseLike,
  input: Omit<InvitationAcceptanceInput, "invitationTokenHash" | "via">,
) {
  return acceptInvitationInD1(db, { ...input, via: "pending_invite" });
}

export async function acceptCollaborationInvitationTokenInCloudflareD1(
  input: Omit<InvitationAcceptanceInput, "invitationId" | "via">,
) {
  const db = await getCloudflareD1Database();
  if (!db) return { data: null, error: new Error("Cloudflare D1 collaboration invitation store is unavailable.") };
  return acceptCollaborationInvitationTokenInD1(db, input);
}

export async function acceptCollaborationInvitationByIdInCloudflareD1(
  input: Omit<InvitationAcceptanceInput, "invitationTokenHash" | "via">,
) {
  const db = await getCloudflareD1Database();
  if (!db) return { data: null, error: new Error("Cloudflare D1 collaboration invitation store is unavailable.") };
  return acceptCollaborationInvitationByIdInD1(db, input);
}
