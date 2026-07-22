import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

export type AdminProjectOverviewRow = {
  id: string;
  name: string;
  project_code: string | null;
  workspace_id: string;
  workspace_name: string | null;
  status: "ongoing" | "completed" | "archived";
  client_name: string | null;
  location: string | null;
  currency_code: string;
  project_type: string | null;
  gross_floor_area: number | null;
  floor_area_unit: "sqm" | "sqft" | null;
  project_phase: string | null;
  market_region: string | null;
  target_budget: number | null;
  budget_basis_date: string | null;
  procurement_status: string | null;
  publication_source_revision: number;
  metadata: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  owner_raw_id: string | null;
  owner_profile_id: string | null;
  owner_auth_user_id: string | null;
  owner_email: string | null;
  owner_display_name: string | null;
  owner_source: "project_member" | "creator";
  creator_profile_id: string | null;
  creator_auth_user_id: string | null;
  creator_email: string | null;
  creator_display_name: string | null;
  member_count: number;
  estimate_count: number;
  publication_count: number;
  published_publication_count: number;
  publication_open_count: number;
  location_label: string | null;
  location_source: string | null;
};

export type AdminProjectEstimateRow = {
  id: string;
  name: string;
  sheet_code: string;
  project_id: string;
  currency_code: string;
  project_budget: number | null;
  created_by: string | null;
  creator_profile_id: string | null;
  creator_email: string | null;
  creator_display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminProjectMemberRow = {
  user_id: string;
  role: "owner" | "admin" | "editor" | "viewer";
  added_by: string | null;
  profile_id: string | null;
  auth_user_id: string | null;
  email: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminProjectActivityRow = {
  id: string;
  source: "estimate" | "collaboration" | "activation" | "publication";
  event_type: string;
  subject: string;
  actor_user_id: string | null;
  actor_profile_id: string | null;
  actor_email: string | null;
  actor_display_name: string | null;
  estimate_id: string | null;
  occurred_at: string;
};

const IDENTITY_DIRECTORY_CTE = `
  identity_directory AS (
    SELECT
      p.id AS profile_id,
      u.id AS auth_user_id,
      p.email,
      coalesce(nullif(p.display_name, ''), nullif(u.name, ''), p.email) AS display_name
    FROM profiles p
    LEFT JOIN "user" u ON lower(trim(u.email)) = lower(trim(p.email))
    WHERE p.deleted_at IS NULL

    UNION ALL

    SELECT
      NULL AS profile_id,
      u.id AS auth_user_id,
      lower(trim(u.email)) AS email,
      coalesce(nullif(u.name, ''), lower(trim(u.email))) AS display_name
    FROM "user" u
    WHERE NOT EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.deleted_at IS NULL
        AND lower(trim(p.email)) = lower(trim(u.email))
    )
  )
`;

const PROJECT_SELECT = `
  WITH
  ${IDENTITY_DIRECTORY_CTE},
  project_owner_ids AS (
    SELECT
      p.id AS project_id,
      coalesce(
        (
          SELECT pm.user_id
          FROM project_members pm
          WHERE pm.project_id = p.id AND pm.role = 'owner'
          ORDER BY pm.created_at ASC, pm.user_id ASC
          LIMIT 1
        ),
        p.created_by
      ) AS owner_raw_id,
      CASE WHEN EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.role = 'owner'
      ) THEN 'project_member' ELSE 'creator' END AS owner_source
    FROM projects p
  )
  SELECT
    p.id,
    p.name,
    p.project_code,
    p.workspace_id,
    w.name AS workspace_name,
    p.status,
    p.client_name,
    p.location,
    p.currency_code,
    p.project_type,
    p.gross_floor_area,
    p.floor_area_unit,
    p.project_phase,
    p.market_region,
    p.target_budget,
    p.budget_basis_date,
    p.procurement_status,
    p.publication_source_revision,
    p.metadata,
    p.created_by,
    p.created_at,
    p.updated_at,
    max(
      p.updated_at,
      coalesce((SELECT max(e.updated_at) FROM estimates e WHERE e.project_id = p.id), p.updated_at),
      coalesce((SELECT max(event.created_at) FROM estimate_sheet_events event WHERE event.project_id = p.id), p.updated_at),
      coalesce((SELECT max(pub.updated_at) FROM project_publications pub WHERE pub.project_id = p.id), p.updated_at)
    ) AS last_activity_at,
    owner_ids.owner_raw_id,
    owner.profile_id AS owner_profile_id,
    owner.auth_user_id AS owner_auth_user_id,
    owner.email AS owner_email,
    owner.display_name AS owner_display_name,
    owner_ids.owner_source,
    creator.profile_id AS creator_profile_id,
    creator.auth_user_id AS creator_auth_user_id,
    creator.email AS creator_email,
    creator.display_name AS creator_display_name,
    (SELECT count(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
    (SELECT count(*) FROM estimates e WHERE e.project_id = p.id) AS estimate_count,
    (SELECT count(*) FROM project_publications pub WHERE pub.project_id = p.id) AS publication_count,
    (SELECT count(*) FROM project_publications pub WHERE pub.project_id = p.id AND pub.status = 'published') AS published_publication_count,
    coalesce((SELECT sum(pub.open_count) FROM project_publications pub WHERE pub.project_id = p.id), 0) AS publication_open_count,
    coalesce(location.display_label, location.address_text) AS location_label,
    location.source AS location_source
  FROM projects p
  LEFT JOIN workspaces w ON w.id = p.workspace_id
  LEFT JOIN project_owner_ids owner_ids ON owner_ids.project_id = p.id
  LEFT JOIN identity_directory owner
    ON owner.profile_id = owner_ids.owner_raw_id OR owner.auth_user_id = owner_ids.owner_raw_id
  LEFT JOIN identity_directory creator
    ON creator.profile_id = p.created_by OR creator.auth_user_id = p.created_by
  LEFT JOIN project_locations location ON location.project_id = p.id
`;

function logFailure(error: unknown, event: string) {
  emitLogRecord({
    level: "error",
    event,
    message: "Admin project overview D1 operation failed.",
    context: { error_name: error instanceof Error ? error.name : "unknown" },
  });
}

export async function getAdminProjectOverview(
  projectId: string,
): Promise<AdminProjectOverviewRow | null> {
  const db = await getCloudflareD1Database();
  if (!db) return null;
  try {
    return (
      (await db
        .prepare<AdminProjectOverviewRow>(`${PROJECT_SELECT} WHERE p.id = ? LIMIT 1`)
        .bind(projectId)
        .first<AdminProjectOverviewRow>()) ?? null
    );
  } catch (error) {
    logFailure(error, "admin_project_overview_failed");
    return null;
  }
}

export async function listAdminProjectEstimates(
  projectId: string,
  limit = 50,
): Promise<AdminProjectEstimateRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) return [];
  try {
    const result = await db
      .prepare<AdminProjectEstimateRow>(
        `
          WITH ${IDENTITY_DIRECTORY_CTE}
          SELECT
            e.id,
            e.name,
            e.sheet_code,
            e.project_id,
            e.currency_code,
            e.project_budget,
            e.created_by,
            creator.profile_id AS creator_profile_id,
            creator.email AS creator_email,
            creator.display_name AS creator_display_name,
            e.created_at,
            e.updated_at
          FROM estimates e
          LEFT JOIN identity_directory creator
            ON creator.profile_id = e.created_by OR creator.auth_user_id = e.created_by
          WHERE e.project_id = ?
          ORDER BY e.updated_at DESC, e.id DESC
          LIMIT ?
        `,
      )
      .bind(projectId, limit)
      .all<AdminProjectEstimateRow>();
    return result.results ?? [];
  } catch (error) {
    logFailure(error, "admin_project_estimates_failed");
    return [];
  }
}

export async function listAdminProjectMembers(projectId: string): Promise<AdminProjectMemberRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) return [];
  try {
    const result = await db
      .prepare<AdminProjectMemberRow>(
        `
          WITH ${IDENTITY_DIRECTORY_CTE}
          SELECT
            member.user_id,
            member.role,
            member.added_by,
            identity.profile_id,
            identity.auth_user_id,
            identity.email,
            identity.display_name,
            member.created_at,
            member.updated_at
          FROM project_members member
          LEFT JOIN identity_directory identity
            ON identity.profile_id = member.user_id OR identity.auth_user_id = member.user_id
          WHERE member.project_id = ?
          ORDER BY
            CASE member.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'editor' THEN 2 ELSE 3 END,
            member.created_at ASC
        `,
      )
      .bind(projectId)
      .all<AdminProjectMemberRow>();
    return result.results ?? [];
  } catch (error) {
    logFailure(error, "admin_project_members_failed");
    return [];
  }
}

export async function listAdminProjectActivity(
  projectId: string,
  limit = 75,
): Promise<AdminProjectActivityRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) return [];
  try {
    const result = await db
      .prepare<AdminProjectActivityRow>(
        `
          WITH
          ${IDENTITY_DIRECTORY_CTE},
          activity AS (
            SELECT
              event.id,
              'estimate' AS source,
              event.event_type,
              coalesce(estimate.name, 'Estimate activity') AS subject,
              event.actor_user_id,
              event.estimate_id,
              event.created_at AS occurred_at
            FROM estimate_sheet_events event
            LEFT JOIN estimates estimate ON estimate.id = event.estimate_id
            WHERE event.project_id = ?

            UNION ALL

            SELECT
              event.id,
              'collaboration' AS source,
              event.event_type,
              coalesce(estimate.name, 'Project collaboration') AS subject,
              event.actor_user_id,
              event.estimate_id,
              event.created_at AS occurred_at
            FROM collaboration_audit_events event
            LEFT JOIN estimates estimate ON estimate.id = event.estimate_id
            WHERE event.project_id = ?

            UNION ALL

            SELECT
              event.id,
              'activation' AS source,
              event.milestone AS event_type,
              'Activation milestone' AS subject,
              event.user_id AS actor_user_id,
              event.estimate_id,
              event.occurred_at
            FROM beta_activation_events event
            WHERE event.project_id = ?

            UNION ALL

            SELECT
              publication.id,
              'publication' AS source,
              'publication_' || publication.status AS event_type,
              'Client publication' AS subject,
              publication.published_by AS actor_user_id,
              NULL AS estimate_id,
              publication.published_at AS occurred_at
            FROM project_publications publication
            WHERE publication.project_id = ?
          )
          SELECT
            activity.id,
            activity.source,
            activity.event_type,
            activity.subject,
            activity.actor_user_id,
            actor.profile_id AS actor_profile_id,
            actor.email AS actor_email,
            actor.display_name AS actor_display_name,
            activity.estimate_id,
            activity.occurred_at
          FROM activity
          LEFT JOIN identity_directory actor
            ON actor.profile_id = activity.actor_user_id OR actor.auth_user_id = activity.actor_user_id
          ORDER BY activity.occurred_at DESC, activity.id DESC
          LIMIT ?
        `,
      )
      .bind(projectId, projectId, projectId, projectId, limit)
      .all<AdminProjectActivityRow>();
    return result.results ?? [];
  } catch (error) {
    logFailure(error, "admin_project_activity_failed");
    return [];
  }
}

export async function listAdminProjects(limit = 200): Promise<AdminProjectOverviewRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) return [];
  try {
    const result = await db
      .prepare<AdminProjectOverviewRow>(`${PROJECT_SELECT} ORDER BY last_activity_at DESC, p.id DESC LIMIT ?`)
      .bind(limit)
      .all<AdminProjectOverviewRow>();
    return result.results ?? [];
  } catch (error) {
    logFailure(error, "admin_projects_list_failed");
    return [];
  }
}
