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

function createPublicationServiceClient() {
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
