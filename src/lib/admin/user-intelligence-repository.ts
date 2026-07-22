import "server-only";

import type { AdminUserRow } from "@/lib/admin/users-repository";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

export type AdminUserSessionRow = {
  id: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  user_agent: string | null;
  has_network_address: boolean;
  is_active: boolean;
};

export type AdminUserProjectRow = {
  id: string;
  name: string;
  project_code: string | null;
  status: "ongoing" | "completed" | "archived";
  workspace_name: string | null;
  relationship: "creator" | "owner" | "admin" | "editor" | "viewer";
  estimate_count: number;
  last_activity_at: string;
};

export type AdminUserProductActivityRow = {
  id: string;
  source: "project" | "estimate" | "estimate_event" | "activation" | "library" | "collaboration" | "security";
  event_type: string;
  subject: string;
  project_id: string | null;
  estimate_id: string | null;
  occurred_at: string;
};

export type AdminUserActivitySummary = {
  event_count: number;
  active_day_count: number;
  first_observed_at: string | null;
  last_observed_at: string | null;
};

export type AdminUserIntelligence = {
  sessions: AdminUserSessionRow[];
  projects: AdminUserProjectRow[];
  activity: AdminUserProductActivityRow[];
  summary: AdminUserActivitySummary;
  error: string | null;
};

type SessionQueryRow = Omit<AdminUserSessionRow, "has_network_address" | "is_active"> & {
  has_network_address: number;
  is_active: number;
};

type ActivityQuerySummary = {
  event_count: number;
  active_days: string | null;
  first_observed_at: string | null;
  last_observed_at: string | null;
};

const EMPTY_SUMMARY: AdminUserActivitySummary = {
  event_count: 0,
  active_day_count: 0,
  first_observed_at: null,
  last_observed_at: null,
};

const PRIMARY_ACTIVITY_CTE = `
  user_activity AS (
    SELECT
      project.id,
      'project' AS source,
      'project_created' AS event_type,
      project.name AS subject,
      project.id AS project_id,
      NULL AS estimate_id,
      project.created_at AS occurred_at
    FROM projects project
    WHERE project.created_by IN (?, ?)

    UNION ALL

    SELECT
      estimate.id,
      'estimate' AS source,
      'estimate_created' AS event_type,
      estimate.name AS subject,
      estimate.project_id,
      estimate.id AS estimate_id,
      estimate.created_at AS occurred_at
    FROM estimates estimate
    WHERE estimate.created_by IN (?, ?)

    UNION ALL

    SELECT
      event.id,
      'estimate_event' AS source,
      event.event_type,
      coalesce(estimate.name, 'Estimate activity') AS subject,
      event.project_id,
      event.estimate_id,
      event.created_at AS occurred_at
    FROM estimate_sheet_events event
    LEFT JOIN estimates estimate ON estimate.id = event.estimate_id
    WHERE event.actor_user_id IN (?, ?)

    UNION ALL

    SELECT
      event.id,
      'activation' AS source,
      event.milestone AS event_type,
      'Activation milestone' AS subject,
      event.project_id,
      event.estimate_id,
      event.occurred_at
    FROM beta_activation_events event
    WHERE event.user_id IN (?, ?)

  )
`;

const AUXILIARY_ACTIVITY_CTE = `
  user_activity AS (
    SELECT
      event.id,
      'library' AS source,
      event.event_name AS event_type,
      coalesce(nullif(event.resource_kind, ''), nullif(event.surface, ''), 'Cost library activity') AS subject,
      event.project_id,
      event.estimate_id,
      event.created_at AS occurred_at
    FROM component_library_telemetry_events event
    WHERE event.actor_user_id IN (?, ?)

    UNION ALL

    SELECT
      event.id,
      'collaboration' AS source,
      event.event_type,
      coalesce(estimate.name, 'Collaboration activity') AS subject,
      event.project_id,
      event.estimate_id,
      event.created_at AS occurred_at
    FROM collaboration_audit_events event
    LEFT JOIN estimates estimate ON estimate.id = event.estimate_id
    WHERE event.actor_user_id IN (?, ?)

    UNION ALL

    SELECT
      event.id,
      'security' AS source,
      event.event_type,
      'Account security' AS subject,
      NULL AS project_id,
      NULL AS estimate_id,
      event.created_at AS occurred_at
    FROM account_security_events event
    WHERE event.user_id IN (?, ?)
  )
`;

function identityBindings(user: Pick<AdminUserRow, "profile_id" | "auth_user_id">) {
  return [user.profile_id ?? "__missing_profile__", user.auth_user_id ?? "__missing_auth_user__"] as const;
}

function repeatedIdentityBindings(user: Pick<AdminUserRow, "profile_id" | "auth_user_id">, repeats: number) {
  const [profileId, authUserId] = identityBindings(user);
  return Array.from({ length: repeats }, () => [profileId, authUserId]).flat();
}

function mergeActivitySummaries(summaries: Array<ActivityQuerySummary | null>): AdminUserActivitySummary {
  const activeDays = new Set<string>();
  const observedAt = summaries.flatMap((summary) => {
    if (!summary) return [];
    for (const day of summary.active_days?.split(",") ?? []) {
      if (day) activeDays.add(day);
    }
    return [summary.first_observed_at, summary.last_observed_at].filter((value): value is string => Boolean(value));
  });

  return {
    event_count: summaries.reduce((total, summary) => total + (summary?.event_count ?? 0), 0),
    active_day_count: activeDays.size,
    first_observed_at: observedAt.length > 0 ? observedAt.toSorted()[0] : null,
    last_observed_at: observedAt.length > 0 ? observedAt.toSorted().at(-1) ?? null : null,
  };
}

export async function getAdminUserIntelligence(
  user: Pick<AdminUserRow, "profile_id" | "auth_user_id">,
): Promise<AdminUserIntelligence> {
  const db = await getCloudflareD1Database();
  if (!db) {
    return { sessions: [], projects: [], activity: [], summary: EMPTY_SUMMARY, error: "Activity data is unavailable." };
  }

  const [profileId, authUserId] = identityBindings(user);
  const primaryActivityIds = repeatedIdentityBindings(user, 4);
  const auxiliaryActivityIds = repeatedIdentityBindings(user, 3);
  const now = new Date().toISOString();

  try {
    const sessionsResult = user.auth_user_id
      ? await db.prepare<SessionQueryRow>(
          `
            SELECT
              id,
              "createdAt" AS created_at,
              "updatedAt" AS updated_at,
              "expiresAt" AS expires_at,
              "userAgent" AS user_agent,
              CASE WHEN "ipAddress" IS NULL OR trim("ipAddress") = '' THEN 0 ELSE 1 END AS has_network_address,
              CASE WHEN "expiresAt" > ? THEN 1 ELSE 0 END AS is_active
            FROM "session"
            WHERE "userId" = ?
            ORDER BY "createdAt" DESC, id DESC
            LIMIT 50
          `,
        ).bind(now, user.auth_user_id).all<SessionQueryRow>()
      : { results: [] as SessionQueryRow[] };

    const projectsResult = await db.prepare<AdminUserProjectRow>(
        `
          WITH matched_projects AS (
            SELECT
              project.id,
              CASE
                WHEN project.created_by IN (?, ?) THEN 'creator'
                ELSE coalesce((
                  SELECT member.role
                  FROM project_members member
                  WHERE member.project_id = project.id AND member.user_id IN (?, ?)
                  ORDER BY CASE member.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'editor' THEN 2 ELSE 3 END
                  LIMIT 1
                ), 'viewer')
              END AS relationship
            FROM projects project
            WHERE project.created_by IN (?, ?)
               OR EXISTS (
                 SELECT 1 FROM project_members member
                 WHERE member.project_id = project.id AND member.user_id IN (?, ?)
               )
          )
          SELECT
            project.id,
            project.name,
            project.project_code,
            project.status,
            workspace.name AS workspace_name,
            matched.relationship,
            (SELECT count(*) FROM estimates estimate WHERE estimate.project_id = project.id) AS estimate_count,
            max(
              project.updated_at,
              coalesce((SELECT max(estimate.updated_at) FROM estimates estimate WHERE estimate.project_id = project.id), project.updated_at),
              coalesce((SELECT max(event.created_at) FROM estimate_sheet_events event WHERE event.project_id = project.id), project.updated_at)
            ) AS last_activity_at
          FROM matched_projects matched
          JOIN projects project ON project.id = matched.id
          LEFT JOIN workspaces workspace ON workspace.id = project.workspace_id
          ORDER BY last_activity_at DESC, project.id DESC
        `,
      ).bind(
        profileId, authUserId,
        profileId, authUserId,
        profileId, authUserId,
        profileId, authUserId,
      ).all<AdminUserProjectRow>();

    const primaryActivityResult = await db.prepare<AdminUserProductActivityRow>(
        `
          WITH ${PRIMARY_ACTIVITY_CTE}
          SELECT id, source, event_type, subject, project_id, estimate_id, occurred_at
          FROM user_activity
          ORDER BY occurred_at DESC, id DESC
          LIMIT 100
        `,
      ).bind(...primaryActivityIds).all<AdminUserProductActivityRow>();

    const auxiliaryActivityResult = await db.prepare<AdminUserProductActivityRow>(
        `
          WITH ${AUXILIARY_ACTIVITY_CTE}
          SELECT id, source, event_type, subject, project_id, estimate_id, occurred_at
          FROM user_activity
          ORDER BY occurred_at DESC, id DESC
          LIMIT 100
        `,
      ).bind(...auxiliaryActivityIds).all<AdminUserProductActivityRow>();

    const primarySummary = await db.prepare<ActivityQuerySummary>(
        `
          WITH ${PRIMARY_ACTIVITY_CTE}
          SELECT
            count(*) AS event_count,
            group_concat(DISTINCT substr(occurred_at, 1, 10)) AS active_days,
            min(occurred_at) AS first_observed_at,
            max(occurred_at) AS last_observed_at
          FROM user_activity
        `,
      ).bind(...primaryActivityIds).first<ActivityQuerySummary>();

    const auxiliarySummary = await db.prepare<ActivityQuerySummary>(
        `
          WITH ${AUXILIARY_ACTIVITY_CTE}
          SELECT
            count(*) AS event_count,
            group_concat(DISTINCT substr(occurred_at, 1, 10)) AS active_days,
            min(occurred_at) AS first_observed_at,
            max(occurred_at) AS last_observed_at
          FROM user_activity
        `,
      ).bind(...auxiliaryActivityIds).first<ActivityQuerySummary>();

    const activity = [
      ...(primaryActivityResult.results ?? []),
      ...(auxiliaryActivityResult.results ?? []),
    ].toSorted((left, right) => right.occurred_at.localeCompare(left.occurred_at) || right.id.localeCompare(left.id)).slice(0, 100);

    return {
      sessions: (sessionsResult.results ?? []).map((session) => ({
        ...session,
        has_network_address: session.has_network_address === 1,
        is_active: session.is_active === 1,
      })),
      projects: projectsResult.results ?? [],
      activity,
      summary: mergeActivitySummaries([primarySummary, auxiliarySummary]),
      error: null,
    };
  } catch (error) {
    emitLogRecord({
      level: "error",
      event: "admin_user_intelligence_failed",
      message: "Admin user intelligence D1 operation failed.",
      context: { error_name: error instanceof Error ? error.name : "unknown" },
    });
    return { sessions: [], projects: [], activity: [], summary: EMPTY_SUMMARY, error: "User history could not be read." };
  }
}
