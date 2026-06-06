import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260606090000_notification_system.sql", "utf8");

function normalizedSql(sql: string) {
  return sql.replace(/\s+/g, " ").toLowerCase();
}

const sql = normalizedSql(migration);

describe("notification schema migration", () => {
  it("creates durable notification definition and delivery tables", () => {
    expect(sql).toContain("create table if not exists public.notification_definitions");
    expect(sql).toContain("create table if not exists public.notification_deliveries");
    expect(sql).toContain("kind in ('release_announcement', 'system_notice', 'collaboration', 'publication_activity', 'beta_feedback', 'security_notice')");
    expect(sql).toContain("severity in ('info', 'success', 'warning', 'critical')");
    expect(sql).toContain("surface in ('center', 'modal', 'toast_and_center')");
    expect(sql).toContain("constraint notification_deliveries_notification_user_unique unique(notification_id, user_id)");
    expect(sql).not.toContain("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(sql).not.toContain("notification-user-a@example.invalid");
  });

  it("enables RLS and keeps browser writes revoked in V1", () => {
    expect(sql).toContain("alter table public.notification_definitions enable row level security");
    expect(sql).toContain("alter table public.notification_deliveries enable row level security");
    expect(sql).toContain("revoke all on table public.notification_definitions from public, anon, authenticated");
    expect(sql).toContain("revoke all on table public.notification_deliveries from public, anon, authenticated");
    expect(sql).toContain("grant select on table public.notification_definitions to authenticated");
    expect(sql).toContain("grant select on table public.notification_deliveries to authenticated");
    expect(sql).toContain("revoke insert, update, delete on table public.notification_definitions from authenticated");
    expect(sql).toContain("revoke insert, update, delete on table public.notification_deliveries from authenticated");
    expect(sql).not.toContain("grant all on table public.notification_definitions to authenticated");
    expect(sql).not.toContain("grant all on table public.notification_deliveries to authenticated");
    expect(sql).not.toContain("grant update on table public.notification_deliveries to authenticated");
  });

  it("scopes reads through authenticated user delivery rows only", () => {
    expect(sql).toContain('create policy "users can read definitions delivered to them"');
    expect(sql).toContain("for select to authenticated");
    expect(sql).toContain("auth.uid() is not null and exists");
    expect(sql).toContain("from public.notification_deliveries deliveries");
    expect(sql).toContain("deliveries.notification_id = notification_definitions.id");
    expect(sql).toContain("deliveries.user_id = auth.uid()");
    expect(sql).toContain('create policy "users can read own notification deliveries"');
    expect(sql).toContain("using (auth.uid() is not null and user_id = auth.uid())");
    expect(sql).not.toMatch(/create policy "[^"]*update[^"]*" on public\.notification_deliveries/);
    expect(sql).not.toContain("for update to authenticated");
  });

  it("adds the query-supporting indexes required by the implementation plan", () => {
    expect(sql).toContain("notification_definitions_release_version_idx");
    expect(sql).toContain("where release_version is not null");
    expect(sql).toContain("notification_definitions_active_idx");
    expect(sql).toContain("on public.notification_definitions(starts_at desc, expires_at, priority desc)");
    expect(sql).toContain("notification_definitions_dedupe_key_idx");
    expect(sql).toContain("notification_deliveries_user_feed_idx");
    expect(sql).toContain("on public.notification_deliveries(user_id, delivered_at desc)");
    expect(sql).toContain("notification_deliveries_user_unread_idx");
    expect(sql).toContain("where read_at is null and dismissed_at is null and archived_at is null");
    expect(sql).toContain("notification_deliveries_user_modal_idx");
    expect(sql).toContain("where modal_acknowledged_at is null and dismissed_at is null and archived_at is null");
  });

  it("constrains action links to safe internal workshop paths", () => {
    expect(sql).toContain("constraint notification_definitions_action_href_check");
    expect(sql).toContain("action_href ~ '^/workshop(/|$|\\\\?)'");
    expect(sql).toContain("action_href !~* '(^//|[[:space:]]|javascript:|https?:|%2f|%5c)'");
    expect(sql).not.toContain("/share/");
  });
});
