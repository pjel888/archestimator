import { composeCollaborationActivity, composeEstimateActivity } from "@/lib/activity/activity-composer";
import type { ActivityViewModel } from "@/lib/activity/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

/**
 * Curated, project-scoped activity feed (Phase 2, flag-gated — R10/R11). Merges
 * two sources — estimate-sheet events (joined to the project through
 * `estimates.project_id`, since `estimate_sheet_events` has no `project_id`) and
 * collaboration/project-metadata audit events (already project-scoped) — into a
 * single reverse-chronological strip capped at 8 rows. No cursor in v1.
 */
export const PROJECT_ACTIVITY_LIMIT = 8;
/** Per-source fetch buffer so curation has material to filter/aggregate before the cap. */
const PROJECT_ACTIVITY_FETCH_BUFFER = 40;
/** Consecutive same-actor/same-type events within this window collapse into one row. */
const BURST_WINDOW_MS = 60_000;
/** Noisy estimate event sources suppressed from the curated feed. */
const SUPPRESSED_ESTIMATE_SOURCES = new Set(["autosave", "auto_save", "auto-save"]);

type EstimateSheetEventRow = Pick<
  Tables<"estimate_sheet_events">,
  | "id"
  | "estimate_id"
  | "event_type"
  | "event_source"
  | "created_at"
  | "actor_user_id"
  | "estimate_tab_id"
  | "target_row_id"
  | "estimate_node_id"
  | "row_context"
  | "old_snapshot"
  | "new_snapshot"
  | "changed_fields"
  | "total_delta"
  | "payload"
  | "correlation_id"
>;

type CollaborationAuditRow = Pick<
  Tables<"collaboration_audit_events">,
  "id" | "event_type" | "created_at" | "actor_user_id" | "metadata"
>;

type ActivityCandidate = {
  id: string;
  createdAt: string;
  actorUserId: string | null;
  eventType: string;
  eventSource: string | null;
  compose: (actorLabel: string | null) => ActivityViewModel;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function estimateCandidate(row: EstimateSheetEventRow): ActivityCandidate {
  return {
    id: row.id,
    createdAt: row.created_at,
    actorUserId: row.actor_user_id,
    eventType: row.event_type,
    eventSource: row.event_source,
    compose: (actorLabel) =>
      composeEstimateActivity({
        id: row.id,
        eventType: row.event_type,
        eventSource: row.event_source,
        createdAt: row.created_at,
        actorUserId: row.actor_user_id,
        actorLabel,
        estimateTabId: row.estimate_tab_id,
        targetRowId: row.target_row_id,
        estimateNodeId: row.estimate_node_id,
        rowContext: isRecord(row.row_context) ? row.row_context : null,
        oldSnapshot: row.old_snapshot,
        newSnapshot: row.new_snapshot,
        changedFields: row.changed_fields,
        totalDelta: row.total_delta,
        payload: isRecord(row.payload) ? row.payload : null,
        correlationId: row.correlation_id,
      }),
  };
}

function collaborationCandidate(row: CollaborationAuditRow): ActivityCandidate {
  return {
    id: row.id,
    createdAt: row.created_at,
    actorUserId: row.actor_user_id,
    eventType: row.event_type,
    eventSource: null,
    compose: (actorLabel) =>
      composeCollaborationActivity({
        id: row.id,
        eventType: row.event_type,
        createdAt: row.created_at,
        actorUserId: row.actor_user_id,
        actorLabel,
        metadata: isRecord(row.metadata) ? row.metadata : null,
      }),
  };
}

function isSuppressed(candidate: ActivityCandidate): boolean {
  return candidate.eventSource != null && SUPPRESSED_ESTIMATE_SOURCES.has(candidate.eventSource);
}

/**
 * Pure curation: drop noise, sort newest-first, collapse bursts of identical
 * actor+type edits, cap at 8, then compose with resolved actor names. Extracted
 * from the query so the merge/dedup/cap logic is testable without a database.
 */
export function buildProjectActivityFeed(input: {
  estimateEvents: EstimateSheetEventRow[];
  collaborationEvents: CollaborationAuditRow[];
  actorLabels: Map<string, string>;
}): ActivityViewModel[] {
  const candidates = [
    ...input.estimateEvents.map(estimateCandidate),
    ...input.collaborationEvents.map(collaborationCandidate),
  ].filter((candidate) => !isSuppressed(candidate));

  candidates.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const kept: ActivityCandidate[] = [];
  for (const candidate of candidates) {
    const previous = kept[kept.length - 1];
    const isBurstOfPrevious =
      previous != null &&
      previous.actorUserId === candidate.actorUserId &&
      previous.eventType === candidate.eventType &&
      Math.abs(new Date(previous.createdAt).getTime() - new Date(candidate.createdAt).getTime()) <= BURST_WINDOW_MS;
    if (isBurstOfPrevious) continue;
    kept.push(candidate);
    if (kept.length >= PROJECT_ACTIVITY_LIMIT) break;
  }

  return kept.map((candidate) =>
    candidate.compose(candidate.actorUserId ? input.actorLabels.get(candidate.actorUserId) ?? null : null),
  );
}

async function resolveActorLabels(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  actorUserIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(actorUserIds.filter((id): id is string => typeof id === "string" && id.length > 0))];
  if (unique.length === 0) return new Map();
  try {
    const { data, error } = await supabase.from("profiles").select("id, display_name, email").in("id", unique);
    if (error) return new Map();
    return new Map(
      ((data ?? []) as Array<{ id: string; display_name: string | null; email: string | null }>).map((profile) => [
        profile.id,
        profile.display_name?.trim() || profile.email?.trim() || "Unknown user",
      ]),
    );
  } catch {
    return new Map();
  }
}

/** Load the curated project activity feed (≤8 rows). Empty array when the project has no activity. */
export async function getProjectActivity(projectId: string): Promise<ActivityViewModel[]> {
  const supabase = await createSupabaseServerClient();

  // estimate_sheet_events has no project_id — scope it through the project's estimates.
  const { data: estimateIdRows, error: estimatesError } = await supabase
    .from("estimates")
    .select("id")
    .eq("project_id", projectId);
  if (estimatesError) throw estimatesError;
  const estimateIds = (estimateIdRows ?? []).map((row) => row.id);

  const [estimateEventsResult, collaborationResult] = await Promise.all([
    estimateIds.length > 0
      ? supabase
          .from("estimate_sheet_events")
          .select(
            "id, estimate_id, event_type, event_source, created_at, actor_user_id, estimate_tab_id, target_row_id, estimate_node_id, row_context, old_snapshot, new_snapshot, changed_fields, total_delta, payload, correlation_id",
          )
          .in("estimate_id", estimateIds)
          .order("created_at", { ascending: false })
          .limit(PROJECT_ACTIVITY_FETCH_BUFFER)
      : Promise.resolve({ data: [] as EstimateSheetEventRow[], error: null }),
    supabase
      .from("collaboration_audit_events")
      .select("id, event_type, created_at, actor_user_id, metadata")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(PROJECT_ACTIVITY_FETCH_BUFFER),
  ]);

  if (estimateEventsResult.error) throw estimateEventsResult.error;
  if (collaborationResult.error) throw collaborationResult.error;

  const estimateEvents = (estimateEventsResult.data ?? []) as EstimateSheetEventRow[];
  const collaborationEvents = (collaborationResult.data ?? []) as CollaborationAuditRow[];

  const actorLabels = await resolveActorLabels(supabase, [
    ...estimateEvents.map((row) => row.actor_user_id ?? ""),
    ...collaborationEvents.map((row) => row.actor_user_id ?? ""),
  ]);

  return buildProjectActivityFeed({ estimateEvents, collaborationEvents, actorLabels });
}
