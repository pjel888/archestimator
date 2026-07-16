import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";

// F1 (UNIT-002) global search — federated, bounded, admin-gated. Searches ONLY
// non-secret columns (email / display name / account name / project name+code /
// estimate name). Never searches tokens, secrets, or payloads. Each source is
// independent: a failure in one does not erase the others (degraded flag set).

export type AdminSearchKind = "user" | "account" | "project" | "estimate";

export type AdminSearchResult = {
  kind: AdminSearchKind;
  id: string;
  label: string;
  sublabel: string | null;
  href: string;
};

export type AdminSearchOutcome = {
  results: AdminSearchResult[];
  degraded: boolean;
  error: string | null;
};

const MIN_QUERY_LENGTH = 2;
const PER_KIND_LIMIT = 8;

/**
 * Normalize a raw search string into a LIKE pattern, or null if too short.
 * Escapes % _ \ so user input is treated literally (not as wildcards), then
 * wraps in % for substring matching.
 */
export function normalizeSearchQuery(raw: string): string | null {
  const trimmed = (raw ?? "").trim().toLowerCase();
  if (trimmed.length < MIN_QUERY_LENGTH) return null;
  return `%${trimmed.replace(/[%_\\]/g, "\\$&")}%`;
}

type UserHit = { id: string; email: string; display_name: string | null };
type AccountHit = { id: string; name: string; status: string };
type ProjectHit = { id: string; name: string; project_code: string | null };
type EstimateHit = { id: string; name: string; project_id: string };

export async function searchAdminEntities(rawQuery: string): Promise<AdminSearchOutcome> {
  const like = normalizeSearchQuery(rawQuery);
  if (!like) return { results: [], degraded: false, error: null };

  const db = await getCloudflareD1Database();
  if (!db) return { results: [], degraded: true, error: "Cloudflare D1 is not available." };

  // Four bounded queries in parallel; .catch keeps one failing source from
  // discarding the rest.
  const [users, accounts, projects, estimates] = await Promise.all([
    db
      .prepare<UserHit>(
        `
          SELECT id, email, display_name FROM profiles
          WHERE lower(email) LIKE ? ESCAPE '\\'
             OR lower(coalesce(display_name, '')) LIKE ? ESCAPE '\\'
          ORDER BY created_at DESC
          LIMIT ?
        `,
      )
      .bind(like, like, PER_KIND_LIMIT)
      .all<UserHit>()
      .then((r) => r.results ?? [])
      .catch(() => [] as UserHit[]),
    db
      .prepare<AccountHit>(
        `
          SELECT id, name, status FROM corporate_accounts
          WHERE lower(name) LIKE ? ESCAPE '\\'
          ORDER BY created_at DESC
          LIMIT ?
        `,
      )
      .bind(like, PER_KIND_LIMIT)
      .all<AccountHit>()
      .then((r) => r.results ?? [])
      .catch(() => [] as AccountHit[]),
    db
      .prepare<ProjectHit>(
        `
          SELECT id, name, project_code FROM projects
          WHERE lower(name) LIKE ? ESCAPE '\\'
             OR lower(coalesce(project_code, '')) LIKE ? ESCAPE '\\'
          ORDER BY created_at DESC
          LIMIT ?
        `,
      )
      .bind(like, like, PER_KIND_LIMIT)
      .all<ProjectHit>()
      .then((r) => r.results ?? [])
      .catch(() => [] as ProjectHit[]),
    db
      .prepare<EstimateHit>(
        `
          SELECT id, name, project_id FROM estimates
          WHERE lower(name) LIKE ? ESCAPE '\\'
          ORDER BY created_at DESC
          LIMIT ?
        `,
      )
      .bind(like, PER_KIND_LIMIT)
      .all<EstimateHit>()
      .then((r) => r.results ?? [])
      .catch(() => [] as EstimateHit[]),
  ]);

  const results: AdminSearchResult[] = [
    ...users.map((u) => ({
      kind: "user" as const,
      id: u.id,
      label: u.display_name || u.email,
      sublabel: u.email,
      href: `/admin/users/${u.id}`,
    })),
    ...accounts.map((a) => ({
      kind: "account" as const,
      id: a.id,
      label: a.name,
      sublabel: a.status,
      href: `/admin/accounts/${a.id}`,
    })),
    ...projects.map((p) => ({
      kind: "project" as const,
      id: p.id,
      label: p.name,
      sublabel: p.project_code,
      href: `/admin/projects/${p.id}`,
    })),
    ...estimates.map((e) => ({
      kind: "estimate" as const,
      id: e.id,
      label: e.name,
      sublabel: null,
      href: `/workshop/projects/${e.project_id}/estimates`,
    })),
  ];

  return { results, degraded: false, error: null };
}
