import "server-only";

import { getCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { traced } from "@/lib/perf/server-timing";

export type RecipientProposalStatus = "published" | "expired" | "revoked";
export type RecipientProposalDecision = "accepted" | "declined" | "revision_requested" | null;

export type RecipientProposalRow = {
  publicationId: string;
  projectId: string;
  projectName: string;
  projectCode: string | null;
  workspaceId: string;
  workspaceName: string;
  senderDisplayName: string | null;
  status: RecipientProposalStatus;
  hasOpened: boolean;
  decision: RecipientProposalDecision;
  lastActivityAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  snapshotVersion: number;
};

export type RecipientProposalsResult =
  | { ok: true; rows: RecipientProposalRow[] }
  | { ok: false; error: "unauthorized" | "unknown" };

type RecipientProposalD1Row = {
  publication_id: string;
  project_id: string;
  project_name: string;
  project_code: string | null;
  workspace_id: string;
  workspace_name: string;
  sender_display_name: string | null;
  status: string;
  has_opened: boolean | number;
  decision: string | null;
  last_activity_at: string | null;
  published_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  snapshot_version: number | string;
};

function normalizeStatus(status: string): RecipientProposalStatus | null {
  if (status === "published" || status === "expired" || status === "revoked") return status;
  return null;
}

function normalizeDecision(decision: string | null): RecipientProposalDecision | undefined {
  if (decision === null) return null;
  if (decision === "accepted" || decision === "declined" || decision === "revision_requested") return decision;
  return undefined;
}

function mapRecipientProposalRow(row: RecipientProposalD1Row): RecipientProposalRow | null {
  const status = normalizeStatus(row.status);
  const decision = normalizeDecision(row.decision);
  const snapshotVersion = Number(row.snapshot_version);
  if (!status || decision === undefined || !Number.isFinite(snapshotVersion)) return null;

  return {
    publicationId: row.publication_id,
    projectId: row.project_id,
    projectName: row.project_name,
    projectCode: row.project_code,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    senderDisplayName: row.sender_display_name,
    status,
    hasOpened: Boolean(row.has_opened),
    decision,
    lastActivityAt: row.last_activity_at,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    snapshotVersion,
  };
}

export async function listRecipientProposals(): Promise<RecipientProposalsResult> {
  try {
    const user = await getCurrentUserContext();
    const recipientEmail = user?.email.trim().toLowerCase() ?? "";
    if (!recipientEmail) return { ok: false, error: "unauthorized" };

    const db = await getCloudflareD1Database();
    if (!db) return { ok: false, error: "unknown" };

    const now = new Date().toISOString();
    const { results = [] } = await traced("recipient-proposals.list", () =>
      db
        .prepare<RecipientProposalD1Row>(`
          SELECT
            publication.id AS publication_id,
            publication.project_id,
            project.name AS project_name,
            project.project_code,
            publication.workspace_id,
            workspace.name AS workspace_name,
            NULLIF(TRIM(sender.display_name), '') AS sender_display_name,
            CASE
              WHEN publication.status = 'revoked' OR publication.revoked_at IS NOT NULL THEN 'revoked'
              WHEN publication.status = 'expired' OR (publication.expires_at IS NOT NULL AND publication.expires_at <= ?) THEN 'expired'
              ELSE 'published'
            END AS status,
            recipient.last_opened_at IS NOT NULL AS has_opened,
            response.decision AS decision,
            MAX(
              publication.published_at,
              COALESCE(recipient.last_opened_at, publication.published_at),
              COALESCE(response.created_at, publication.published_at),
              COALESCE(publication.revoked_at, publication.published_at),
              CASE
                WHEN publication.expires_at IS NOT NULL AND publication.expires_at <= ? THEN publication.expires_at
                ELSE publication.published_at
              END
            ) AS last_activity_at,
            publication.published_at,
            publication.expires_at,
            publication.revoked_at,
            publication.snapshot_version
          FROM shared_link_recipients recipient
          INNER JOIN project_publications publication
            ON publication.id = recipient.publication_id
          INNER JOIN projects project
            ON project.id = publication.project_id
           AND project.workspace_id = publication.workspace_id
          INNER JOIN workspaces workspace
            ON workspace.id = publication.workspace_id
          LEFT JOIN profiles sender
            ON sender.id = publication.published_by
          LEFT JOIN shared_link_responses response
            ON response.id = (
              SELECT latest_response.id
              FROM shared_link_responses latest_response
              WHERE latest_response.publication_id = publication.id
                AND latest_response.recipient_id = recipient.id
              ORDER BY latest_response.created_at DESC
              LIMIT 1
            )
          WHERE lower(recipient.email) = ?
            AND publication.status IN ('published', 'expired', 'revoked')
          ORDER BY last_activity_at DESC, publication.published_at DESC, publication.id DESC
          LIMIT ?
        `)
        .bind(now, now, recipientEmail, 50)
        .all<RecipientProposalD1Row>(),
    );

    const rows = results.map(mapRecipientProposalRow);
    if (rows.some((row) => row === null)) return { ok: false, error: "unknown" };

    return { ok: true, rows: rows as RecipientProposalRow[] };
  } catch {
    return { ok: false, error: "unknown" };
  }
}
