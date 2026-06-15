import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationText = readdirSync("supabase/migrations")
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join("supabase/migrations", file), "utf8"))
  .join("\n");
const inviteEntryMigration = readFileSync(
  "supabase/migrations/20260527115342_project_invite_entry_tokens.sql",
  "utf8",
);
const types = readFileSync("src/lib/supabase/types.ts", "utf8");

function extractApplyPendingOverride() {
  return inviteEntryMigration.match(
    /create or replace function public\.apply_pending_collaboration_invitations[\s\S]*?\$\$;/,
  )?.[0] ?? "";
}

describe("project invite entry schema", () => {
  it("requires hashed invitation tokens and rejects raw token columns", () => {
    expect(migrationText).toContain("create table if not exists public.collaboration_invitation_tokens");
    expect(migrationText).toContain("token_hash text not null unique");
    expect(migrationText).toContain("token_hint text");
    expect(migrationText).not.toMatch(/\braw_token\b/);
    expect(migrationText).not.toMatch(/\btoken text\b/);
  });

  it("creates one active token per pending invitation", () => {
    expect(migrationText).toContain("collaboration_invitation_tokens_one_active_idx");
    expect(migrationText).toContain("where used_at is null and revoked_at is null");
    expect(migrationText).toContain("invitation_id uuid not null references public.collaboration_invitations(id) on delete cascade");
  });

  it("materializes expired invitations before reissue and preserves active invite uniqueness", () => {
    expect(migrationText).toContain("materialize_expired_collaboration_invitations");
    expect(migrationText).toContain("lifecycle_state = 'expired'");
    expect(migrationText).toContain("collaboration_invitations_active_project_email_idx");
    expect(migrationText).toContain("lifecycle_state = 'pending'");
  });

  it("revokes broad pending invite application from browser roles", () => {
    expect(migrationText).toContain("revoke all on function public.apply_pending_collaboration_invitations(uuid, text) from public");
    expect(migrationText).toContain("revoke all on function public.apply_pending_collaboration_invitations(uuid, text) from anon");
    expect(migrationText).toContain("revoke all on function public.apply_pending_collaboration_invitations(uuid, text) from authenticated");
  });

  it("keeps auth signup from auto-accepting invites before the invite route", () => {
    const applyPendingOverride = extractApplyPendingOverride();
    expect(applyPendingOverride).toContain("Invite route owns recipient acceptance");
    expect(applyPendingOverride).not.toMatch(/returns void\s+returns void/i);
    expect(applyPendingOverride).not.toContain("insert into public.project_members");
    expect(applyPendingOverride).not.toContain("insert into public.estimate_sheet_members");
    expect(applyPendingOverride).not.toContain("accepted_at");
  });

  it("returns wrong-account metadata without accepting or consuming the bridge", () => {
    expect(inviteEntryMigration).toContain("'wrong_account', 'invited_email', token.email");
  });

  it("grants only narrow invite RPCs to browser roles", () => {
    expect(migrationText).toContain("public.resolve_collaboration_invitation(invitation_token_hash text)");
    expect(migrationText).toContain("public.accept_collaboration_invitation(invitation_token_hash text)");
    expect(migrationText).toContain("public.accept_collaboration_invitation_by_id(target_invitation_id uuid)");
    expect(migrationText).toContain("public.list_pending_collaboration_invitations()");
    expect(migrationText).toContain("last_opened_at timestamptz");
    expect(migrationText).toContain("public.issue_collaboration_invitation_token(invitation_id uuid, invitation_token_hash text, token_hint text, delivery_method text, token_expires_at timestamptz, revoke_existing boolean)");
    expect(migrationText).toContain("grant execute on function public.resolve_collaboration_invitation(text) to anon, authenticated");
    expect(migrationText).toContain("grant execute on function public.accept_collaboration_invitation(text) to authenticated");
    expect(migrationText).toContain("grant execute on function public.accept_collaboration_invitation_by_id(uuid) to authenticated");
    expect(migrationText).toContain("grant execute on function public.list_pending_collaboration_invitations() to authenticated");
    expect(migrationText).toContain("revoke all on function public.accept_collaboration_invitation(text) from anon");
    expect(migrationText).toContain("revoke all on function public.accept_collaboration_invitation_by_id(uuid) from anon");
    expect(migrationText).toContain("revoke all on function public.revoke_collaboration_invitation(uuid) from anon");
    expect(migrationText).toContain("revoke all on function public.issue_collaboration_invitation_token(uuid, text, text, text, timestamptz, boolean) from anon");
    expect(migrationText).toContain("revoke all on function public.record_collaboration_invitation_delivery(uuid, uuid, text) from anon");
    expect(migrationText).toContain("revoke all on table public.collaboration_invitation_tokens from public, anon, authenticated");
  });

  it("returns expired pending invitations for disabled invitee cards without exposing raw tokens", () => {
    const pendingListFunctions = migrationText.match(
      /create or replace function public\.list_pending_collaboration_invitations[\s\S]*?end;\n\$\$;/g,
    ) ?? [""];
    const latestPendingListFunction = pendingListFunctions.at(-1) ?? "";

    expect(migrationText).toContain("drop function if exists public.list_pending_collaboration_invitations()");
    expect(latestPendingListFunction).toContain("state text");
    expect(latestPendingListFunction).toContain("invitation.lifecycle_state in ('pending', 'expired')");
    expect(latestPendingListFunction).toContain("then 'expired'");
    expect(latestPendingListFunction).not.toContain("and invitation.expires_at > now()");
    expect(latestPendingListFunction).not.toMatch(/raw_token|token_hash|token_hint/);
  });

  it("creates collaboration audit events without browser write grants", () => {
    expect(migrationText).toContain("create table if not exists public.collaboration_audit_events");
    expect(migrationText).toContain("alter table public.collaboration_audit_events enable row level security");
    expect(migrationText).toContain("revoke insert, update, delete on table public.collaboration_audit_events from public, anon, authenticated");
    expect(migrationText).not.toMatch(/raw_token|token_hash.*metadata/);
  });

  it("records invite opens through the invite-resolution RPC without raw token metadata", () => {
    const resolveFunctions = migrationText.match(
      /create or replace function public\.resolve_collaboration_invitation[\s\S]*?end;\n\$\$;/g,
    ) ?? [""];
    const latestResolveFunction = resolveFunctions.at(-1) ?? "";

    expect(latestResolveFunction).toContain("collaboration_invite_opened");
    expect(latestResolveFunction).toContain("insert into public.collaboration_audit_events");
    expect(latestResolveFunction).toContain("'token_id', token.token_id");
    expect(latestResolveFunction).toContain("inviter.email as inviter_email");
    expect(latestResolveFunction).toContain(
      "return query select 'revoked'::text, null::uuid, null::uuid, null::uuid",
    );
    expect(latestResolveFunction).not.toContain("return query select 'revoked'::text, token.invitation_id");
    expect(migrationText).toContain("drop function if exists public.resolve_collaboration_invitation(text)");
    expect(latestResolveFunction).not.toMatch(/'raw_token'|'token_hash'|rawToken|tokenHash/);
  });

  it("does not expose lifecycle helper execution to browser roles", () => {
    expect(inviteEntryMigration).toContain("revoke all on function public.materialize_expired_collaboration_invitations() from public");
    expect(inviteEntryMigration).toContain("revoke all on function public.materialize_expired_collaboration_invitations() from anon");
    expect(inviteEntryMigration).toContain("revoke all on function public.materialize_expired_collaboration_invitations() from authenticated");
    expect(inviteEntryMigration).not.toMatch(/grant execute on function public\.materialize_expired_collaboration_invitations\(\) to (anon|authenticated)/);
  });

  it("checks terminal accept states before wrong-account recovery", () => {
    const acceptFunction = inviteEntryMigration.match(
      /create or replace function public\.accept_collaboration_invitation[\s\S]*?end;\n\$\$;/,
    )?.[0] ?? "";

    const wrongAccountIndex = acceptFunction.indexOf("token.email <> current_email");
    const revokedIndex = acceptFunction.indexOf("token.token_revoked_at is not null");
    const expiredIndex = acceptFunction.indexOf("token.token_expires_at <= now()");
    const usedIndex = acceptFunction.indexOf("token.used_at is not null");

    expect(wrongAccountIndex).toBeGreaterThan(-1);
    expect(revokedIndex).toBeGreaterThan(-1);
    expect(expiredIndex).toBeGreaterThan(-1);
    expect(usedIndex).toBeGreaterThan(-1);
    expect(revokedIndex).toBeLessThan(wrongAccountIndex);
    expect(expiredIndex).toBeLessThan(wrongAccountIndex);
    expect(usedIndex).toBeLessThan(wrongAccountIndex);
  });

  it("keeps generated Supabase types aligned with invite entry tables and RPCs", () => {
    expect(types).toContain("collaboration_invitation_tokens: {");
    expect(types).toContain("collaboration_audit_events: {");
    expect(types).toContain("lifecycle_state: string");
    expect(types).toContain("accepted_via: string | null");
    expect(types).toContain("resolve_collaboration_invitation: {");
    expect(types).toContain("inviter_email: string");
    expect(types).toContain("accept_collaboration_invitation: {");
    expect(types).toContain("accept_collaboration_invitation_by_id: {");
    expect(types).toContain("list_pending_collaboration_invitations: {");
    expect(types).toContain("state: string");
    expect(types).toContain("last_opened_at: string");
  });
});
