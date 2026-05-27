import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260527120000_project_client_publication.sql", "utf8");
const types = readFileSync("src/lib/supabase/types.ts", "utf8");

describe("project client publication schema", () => {
  it("adds token-hashed immutable client publications with snapshots, events, and manager-only RLS", () => {
    expect(migration).toContain("create type public.project_publication_status");
    expect(migration).toContain("create type public.project_publication_event_type");
    expect(migration).toContain("create table if not exists public.project_publications");
    expect(migration).toContain("token_hash text not null");
    expect(migration).toContain("encrypted_token text not null");
    expect(migration).toContain("password_hash text");
    expect(migration).toContain("snapshot_json jsonb not null");
    expect(migration).toContain("selected_estimate_ids uuid[] not null");
    expect(migration).toContain("status public.project_publication_status not null default 'published'");
    expect(migration).toContain("published_by uuid");
    expect(migration).toContain("revoked_at timestamptz");
    expect(migration).toContain("create table if not exists public.project_publication_events");
    expect(migration).toContain("event_type public.project_publication_event_type not null");
    expect(migration).toContain("metadata_json jsonb not null default '{}'::jsonb");
    expect(migration).toContain("create or replace function public.can_manage_project_publication");
    expect(migration).toContain("public.can_manage_project_access(target_project_id)");
    expect(migration).toContain('create policy "project publication managers can read publication rows"');
    expect(migration).toContain('create policy "project publication managers can insert publication rows"');
    expect(migration).toContain('create policy "project publication managers can update publication rows"');
    expect(migration).toContain('create policy "project publication service role can insert events"');
    expect(migration).toContain("revoke all on table public.project_publications from public, anon, authenticated");
    expect(migration).toContain("revoke all on table public.project_publication_events from public, anon, authenticated");
    expect(migration).toContain(
      "revoke all on function public.can_manage_project_publication(uuid) from public, anon, authenticated",
    );
    expect(migration).toContain("grant execute on function public.can_manage_project_publication(uuid) to authenticated");
    expect(migration).toContain(
      "revoke all on function public.increment_project_publication_open(uuid) from public, anon, authenticated",
    );
    expect(migration).toContain("grant execute on function public.increment_project_publication_open(uuid) to service_role");
  });

  it("keeps generated Supabase types aligned with the publication tables", () => {
    expect(types).toContain('project_publication_status: "published" | "expired" | "revoked"');
    expect(types).toContain("project_publication_event_type:");
    expect(types).toContain('"password_success"');
    expect(types).toContain('"download_attempt_blocked"');
    expect(types).toContain("project_publications: {");
    expect(types).toContain("encrypted_token: string");
    expect(types).toContain("snapshot_json: Json");
    expect(types).toContain("project_publication_events: {");
    expect(types).toContain("publication_id: string");
  });
});
