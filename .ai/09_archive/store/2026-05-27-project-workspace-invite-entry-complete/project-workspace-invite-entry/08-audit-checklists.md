# 08 - Audit Checklists

## Product Readiness

- [x] Invitee first screen clearly says who invited them and what project they are joining.
- [x] Invitee can continue without profile, country, organization, or workspace intake.
- [x] Successful auth lands on `/workshop`.
- [x] `/workshop` invite state is non-blocking.
- [x] `/workshop/projects` shows shared projects without requiring workspace switching.
- [x] Existing project owners/admins can still manage Teamspaces.
- [x] Viewers do not see manager-only affordances as available actions.

## UX/UI

- [x] `/invite/[token]` uses compact product UI, not a marketing landing page.
- [x] Invite preview works on mobile and desktop.
- [x] Error states are plain-language and non-leaky.
- [x] Shared project visual signal is not color-only.
- [x] Shared cards preserve existing card density modes.
- [x] No visible text exceeds workshop font-size rules.
- [x] No nested cards or oversized onboarding-style panels.

## Security

- [x] Raw invite tokens are never stored.
- [x] Raw invite tokens are never logged.
- [x] Raw invite tokens are hashed on the server before database RPC calls.
- [x] Invite entry is disabled when the server-only invite token pepper is missing.
- [x] Direct browser-style raw-token and unpeppered-hash RPC attempts cannot resolve or accept an invite.
- [x] Invalid token state does not reveal project, email, or invitation existence.
- [x] Wrong-account state requires valid token match before showing invite email.
- [x] Email-bound invite cannot be accepted by a different account.
- [x] Expired and revoked invites cannot be accepted.
- [x] Already accepted invite cannot be reused by another user.
- [x] Acceptance is atomic.
- [x] `apply_pending_collaboration_invitations(uuid, text)` is not directly executable by `anon` or ordinary `authenticated` clients.
- [x] Existing-user direct grants are distinguishable from recipient-click acceptance.
- [x] `collaboration_audit_events` has no browser write grants.
- [x] RLS remains the final authority for project and estimate access.
- [x] No service-role key crosses into client code.

## Data And Migration

- [x] Token hash extension is migration-tested.
- [x] Generated Supabase types match migration.
- [x] Existing `collaboration_invitations` rows remain compatible.
- [x] Active unique indexes still prevent duplicate pending invites.
- [x] Expired rows are materialized or closed before duplicate invite reissue.
- [x] Expired invitations do not show as normal active pending invites.
- [x] Invite acceptance preserves the highest existing role.
- [x] Project and estimate invitations both have lifecycle coverage.
- [x] Revocation immediately blocks future acceptance.

## Testing

- [x] Route state tests cover invalid, expired, revoked, accepted, already-member, signed-out, signed-in, and wrong-account.
- [x] Auth callback tests prove success still lands on `/workshop`.
- [x] Workshop pending-invite tests prove no forced onboarding.
- [x] Project listing tests prove shared projects show up and are labeled.
- [x] Teamspaces tests prove copied invite URLs use `/invite/[token]`.
- [x] Schema tests prove no raw token storage.
- [x] Browser QA covers invite entry, login handoff, `/workshop`, and `/workshop/projects`.
- [x] Feature-flag tests prove invite entry can be disabled without removing existing project links.
- [x] `e2e/project-invite-entry.spec.ts` covers desktop and mobile.

## Launch Evidence

- [x] `PROJECT_INVITE_ENTRY_ENABLED` rollout/rollback state recorded for local implementation; production rollout remains under auth/pre-launch gates.
- [x] Supabase Dashboard redirect allow-list evidence is transferred to the auth/pre-launch roadmap because it is external launch evidence, not remaining invite-entry implementation work.
- [x] Targeted Vitest command recorded.
- [x] Typecheck output recorded.
- [x] Lint output recorded.
- [x] Design-system lint output recorded.
- [x] `git diff --check` output recorded.
- [x] Browser evidence recorded or explicit blocker documented.
- [x] Known unrelated dirty-worktree validation noise documented separately.
- [x] `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` updated only after implementation reality changes.

## Archive Disposition

All implementation, migration, browser, unit, static, and linked-database grant gates for invite entry are closed as of 2026-05-27. Remaining external launch evidence for provider dashboards, legal pages, Vercel env policy, support runbooks, and owner go/no-go remains in `.ai/01_roadmap/README.md` Phase 1 and Phase 7.
