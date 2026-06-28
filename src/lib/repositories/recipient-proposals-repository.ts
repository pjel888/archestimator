import "server-only";

import { traced } from "@/lib/perf/server-timing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

type RecipientProposalRpcRow = {
  publication_id: string;
  project_id: string;
  project_name: string;
  project_code: string | null;
  workspace_id: string;
  workspace_name: string;
  sender_display_name: string | null;
  status: string;
  has_opened: boolean;
  decision: string | null;
  last_activity_at: string | null;
  published_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  snapshot_version: number;
};

type SupabaseRpcError = {
  code?: string;
  message?: string;
};

type RecipientProposalsRpcClient = {
  rpc(
    functionName: "list_recipient_publications_for_current_user",
    args: { page_limit: number },
  ): Promise<{ data: RecipientProposalRpcRow[] | null; error: SupabaseRpcError | null }>;
};

function isUnauthorizedError(error: SupabaseRpcError | null | undefined) {
  return error?.code === "42501" || error?.code === "PGRST301";
}

function normalizeStatus(status: string): RecipientProposalStatus | null {
  if (status === "published" || status === "expired" || status === "revoked") return status;
  return null;
}

function normalizeDecision(decision: string | null): RecipientProposalDecision | undefined {
  if (decision === null) return null;
  if (decision === "accepted" || decision === "declined" || decision === "revision_requested") return decision;
  return undefined;
}

function mapRecipientProposalRow(row: RecipientProposalRpcRow): RecipientProposalRow | null {
  const status = normalizeStatus(row.status);
  const decision = normalizeDecision(row.decision);
  if (!status || decision === undefined) return null;

  return {
    publicationId: row.publication_id,
    projectId: row.project_id,
    projectName: row.project_name,
    projectCode: row.project_code,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    senderDisplayName: row.sender_display_name,
    status,
    hasOpened: row.has_opened,
    decision,
    lastActivityAt: row.last_activity_at,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    snapshotVersion: row.snapshot_version,
  };
}

export async function listRecipientProposals(): Promise<RecipientProposalsResult> {
  try {
    const supabase = (await createSupabaseServerClient()) as unknown as RecipientProposalsRpcClient;
    const { data, error } = await traced("recipient-proposals.list", () =>
      supabase.rpc("list_recipient_publications_for_current_user", { page_limit: 50 }),
    );

    if (error) {
      return { ok: false, error: isUnauthorizedError(error) ? "unauthorized" : "unknown" };
    }

    const rows = (data ?? []).map(mapRecipientProposalRow);
    if (rows.some((row) => row === null)) return { ok: false, error: "unknown" };

    return { ok: true, rows: rows as RecipientProposalRow[] };
  } catch {
    return { ok: false, error: "unknown" };
  }
}
