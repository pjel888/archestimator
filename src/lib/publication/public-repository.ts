import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { hashPublicationToken, readPublicationTokenHashSecret, verifyPublicationPassword } from "@/lib/publication/security";
import type { ProjectPublicationSnapshot } from "@/lib/publication/types";
import type { Database, Json, Tables } from "@/lib/supabase/types";

export type ProjectPublicationEventType = "open" | "password_success" | "password_failure" | "download_attempt_blocked";

export type ResolvedProjectPublicationAccess = {
  publicationId: string;
  status: "published";
  passwordRequired: boolean;
  snapshotVersion: number;
};

export type ResolvedProjectPublicationSnapshot = ResolvedProjectPublicationAccess & {
  snapshot: ProjectPublicationSnapshot;
};

type PublicationLookupRow = Pick<
  Tables<"project_publications">,
  "expires_at" | "id" | "password_hash" | "revoked_at" | "snapshot_version" | "status"
>;

type PublicationSnapshotLookupRow = PublicationLookupRow & Pick<Tables<"project_publications">, "snapshot_json">;

export function createPublicationServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("Public publication lookup requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "archestimator-project-publication",
      },
    },
  });
}

function isActivePublication(row: PublicationLookupRow) {
  if (row.status !== "published") return false;
  if (row.revoked_at) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return false;
  return true;
}

function readTokenHash(token: string) {
  return hashPublicationToken(token, readPublicationTokenHashSecret());
}

function hashRequestValue(value: string | null) {
  if (!value) return null;
  return createHash("sha256").update(value).digest("base64url");
}

function toResolvedAccess(data: PublicationLookupRow): ResolvedProjectPublicationAccess {
  return {
    publicationId: data.id,
    status: "published",
    passwordRequired: Boolean(data.password_hash),
    snapshotVersion: data.snapshot_version,
  };
}

export async function resolveProjectPublicationAccessByToken(token: string): Promise<ResolvedProjectPublicationAccess | null> {
  if (!token.trim()) return null;

  const supabase = createPublicationServiceClient();
  const { data, error } = await supabase
    .from("project_publications")
    .select("id, status, password_hash, expires_at, revoked_at, snapshot_version")
    .eq("token_hash", readTokenHash(token))
    .maybeSingle();

  if (error) throw error;
  if (!data || !isActivePublication(data)) return null;

  return toResolvedAccess(data);
}

export async function resolveProjectPublicationSnapshotByToken(token: string): Promise<ResolvedProjectPublicationSnapshot | null> {
  if (!token.trim()) return null;

  const supabase = createPublicationServiceClient();
  const { data, error } = await supabase
    .from("project_publications")
    .select("id, status, password_hash, snapshot_json, expires_at, revoked_at, snapshot_version")
    .eq("token_hash", readTokenHash(token))
    .maybeSingle();

  if (error) throw error;
  if (!data || !isActivePublication(data as PublicationSnapshotLookupRow)) return null;

  return {
    ...toResolvedAccess(data),
    snapshot: data.snapshot_json as ProjectPublicationSnapshot,
  };
}

export async function verifyProjectPublicationPasswordByToken(token: string, password: string) {
  if (!token.trim() || !password) return false;

  const supabase = createPublicationServiceClient();
  const { data, error } = await supabase
    .from("project_publications")
    .select("id, status, password_hash, expires_at, revoked_at, snapshot_version")
    .eq("token_hash", readTokenHash(token))
    .maybeSingle();

  if (error) throw error;
  if (!data || !isActivePublication(data) || !data.password_hash) return false;

  const passwordValid = await verifyPublicationPassword(password, data.password_hash);
  return passwordValid ? toResolvedAccess(data) : null;
}

export async function recordProjectPublicationEvent({
  token,
  eventType,
  request,
  metadata = {},
}: {
  token: string;
  eventType: ProjectPublicationEventType;
  request: Request;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createPublicationServiceClient();
  const { data: publication, error: publicationError } = await supabase
    .from("project_publications")
    .select("id, status, password_hash, expires_at, revoked_at, snapshot_version")
    .eq("token_hash", readTokenHash(token))
    .maybeSingle();

  if (publicationError) throw publicationError;
  if (!publication || !isActivePublication(publication)) return;

  const { error: eventError } = await supabase.from("project_publication_events").insert({
    publication_id: publication.id,
    event_type: eventType,
    metadata_json: metadata as Json,
    ip_hash: hashRequestValue(request.headers.get("x-forwarded-for")),
    user_agent_hash: hashRequestValue(request.headers.get("user-agent")),
  });
  if (eventError) throw eventError;

  if (eventType === "open") {
    const { error: incrementError } = await supabase.rpc("increment_project_publication_open", {
      target_publication_id: publication.id,
    });
    if (incrementError) throw incrementError;
  }
}

// ============================================================================
// P5: Verify recipient token for shared link session (additive, uses P3 shared_link_recipients table)
// Hashes the raw recipient token with the same publication hash secret, matches against
// recipient_token_hash + publication linkage. Returns context for cookie + future RPCs.
// ============================================================================
export async function verifySharedLinkRecipientToken(
  publicationToken: string,
  recipientToken: string,
): Promise<{ publicationId: string; snapshotVersion: number; recipientId: string } | null> {
  if (!publicationToken.trim() || !recipientToken.trim()) return null;

  const supabase = createPublicationServiceClient();
  const pubHash = readTokenHash(publicationToken);

  const { data: pub, error: pubErr } = await supabase
    .from("project_publications")
    .select("id, status, expires_at, revoked_at, snapshot_version")
    .eq("token_hash", pubHash)
    .maybeSingle();

  if (pubErr) throw pubErr;
  if (!pub || !isActivePublication(pub as PublicationLookupRow)) return null;

  const recHash = hashPublicationToken(recipientToken, readPublicationTokenHashSecret());

  // @ts-expect-error P3 table (shared_link_recipients + columns) — types pending local `supabase db reset` + regen (Docker blocker; authorized per .ai/10_state/current-state.md and P3 migration notes). Runtime verified against remote schema.
  const { data: rec, error: recErr } = await supabase
    .from("shared_link_recipients" as any)
    .select("id" as any)
    .eq("recipient_token_hash" as any, recHash)
    .eq("publication_id" as any, pub.id)
    .maybeSingle();

  if (recErr) throw recErr;
  if (!rec) return null;

  return {
    publicationId: pub.id,
    snapshotVersion: pub.snapshot_version,
    recipientId: (rec as any).id,
  };
}

// ============================================================================
// P6: Insert client comment via the P3 SECURITY DEFINER RPC (additive only)
// - Reuses createPublicationServiceClient + hash helpers
// - Looks up recipient_token_hash from P3 table using recipientId (from P5 session)
// - Server-side sanitize + truncate defense-in-depth (RPC also truncates)
// - Returns comment id or throws on validation failure (publication/recipient active)
// - Called exclusively from the new POST /api/share/[token]/comment after CSRF + session + rate
// ============================================================================
export async function insertSharedLinkComment(params: {
  publicationToken: string;
  recipientId: string;
  body: string;
  estimateId?: string | null;
  rowId?: string | null;
}): Promise<{ id: string }> {
  const supabase = createPublicationServiceClient();
  const pubHash = readTokenHash(params.publicationToken); // uses same secret as P3/P4/P5

  // Lookup recipient_token_hash (P3 table — cast as in verify fn)
  const { data: rec, error: recErr } = await supabase
    .from("shared_link_recipients" as any)
    .select("recipient_token_hash" as any)
    .eq("id" as any, params.recipientId)
    .maybeSingle();

  if (recErr) throw recErr;
  if (!rec || !(rec as any).recipient_token_hash) {
    throw new Error("Recipient not found for comment.");
  }
  const recipientTokenHash = (rec as any).recipient_token_hash as string;

  const sanitizedBody = params.body.trim().slice(0, 1000);

  // Call the exact P3 RPC (validates active pub + recipient match internally)
  // @ts-expect-error P3 RPC (insert_client_comment) + shared_link_* tables — types pending local `supabase db reset` + regen (Docker blocker per current-state; runtime verified against remote schema + migration 20260528220000).
  const { data: commentId, error: rpcErr } = await supabase.rpc("insert_client_comment", {
    p_token_hash: pubHash,
    p_recipient_token_hash: recipientTokenHash,
    p_estimate_id: params.estimateId ?? null,
    p_row_id: params.rowId ?? null,
    p_body: sanitizedBody,
  } as any);

  if (rpcErr) throw rpcErr;
  if (!commentId) throw new Error("Failed to insert comment.");

  return { id: commentId as string };
}

// (readTokenHash / hash helpers already defined earlier in this module for P3/P5 paths)
