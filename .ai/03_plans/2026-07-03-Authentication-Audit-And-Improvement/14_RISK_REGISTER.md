# 14 - Risk Register

Risks are categorized P0 (blocker), P1 (must fix before launch/security claim), P2 (should fix soon), and P3 (cleanup). Each risk has a stable ID for traceability.

## P0 - Blockers

### RISK-001 - Publication password hard lock is not durable

**Location:** `src/app/api/share/[token]/password/route.ts` durable password lockout path.

**Risk:** Cloudflare Worker isolates do not make module-global state durable. A hard lock relying on in-memory `Map` can reset on isolate/cold-start behavior.

**Mitigation:** Phase 2 local implementation removed the process-local password attempt store and now relies on existing D1 `security_rate_limit_events` rows via `project_publication_password` helpers. The route-level regression test proves lockout survives route module reset and expires after the 15-minute durable row window.

**Phase:** 2

**Status:** Locally mitigated; hosted Cloudflare Worker / production D1 proof not run.

### RISK-002 - App-layer authz matrix is incomplete

**Location:** Server actions, route handlers, repository helpers across auth/collaboration/publication/workshop.

**Risk:** D1 has no RLS fallback. Any missing server-side object-role check can become broken access control.

**Mitigation:** `24_PHASE_3_AUTHZ_MATRIX_AND_ROLE_TAXONOMY_PLAN.md` fills the current static matrix shape and identifies the remaining test-first work packages. WP1 local implementation now gates realtime topic-envelope issuance through D1 object access and requires a topic-bound room-token handshake before Durable Object broadcast/presence traffic. WP2 local implementation adds direct D1 helper role-boundary tests and fail-closed D1-error behavior. WP3 local tests lock named route/action denial paths before data reads, writes, RPCs, or revalidation. WP4 local tests convert key workspace repository rows from source-only checks into behavior coverage. WP5 local tests lock beta-admin action boundaries for non-admin denial and `ceo/admin` positive paths. WP6 local implementation centralizes role contracts and removes stale app-role widening from active profile row types.

**Phase:** 3

**Status:** Locally mitigated for Phase 3; hosted Worker/D1 proof remains open.

### RISK-003 - Credential-material taxonomy was incomplete

**Location:** Original pack only covered publication credentials.

**Risk:** Better Auth sessions, OAuth state/codes, invite tokens, provider secrets, cookies, and evidence could leak or be retained incorrectly.

**Mitigation:** `20_CREDENTIAL_MATERIAL_TAXONOMY.md` now inventories known material; implementation must keep it updated and add redaction tests.

**Phase:** 4

**Status:** Locally mitigated for Phase 4 known material; legal/public-launch retention review remains open.

## P1 - Launch/Security Claim Blockers

### RISK-004 - Launch-level logout and OAuth revocation semantics are not fully settled

**Risk:** `prompt=select_account` fixes account-picker UX but does not by itself define local-session invalidation, all-session logout, OAuth grant revocation, or shared-device reauth expectations.

**Mitigation:** Phase 1 draft now chooses local-session-only for the account-picker fix; before any broader launch/security claim, decide and test whether all-session logout, OAuth grant revocation, or shared-device reauth is required.

**Status:** Open.

### RISK-005 - Role taxonomy is fragmented

**Risk:** App roles, workspace roles, project/estimate roles, beta admin roles, and publication recipient authority are scattered. Drift can become authz bugs.

**Mitigation:** `24_PHASE_3_AUTHZ_MATRIX_AND_ROLE_TAXONOMY_PLAN.md` documents the app/platform, workspace, project/estimate, beta-admin, public share, and realtime room role domains. Phase 3 WP6 adds `src/lib/auth/roles.ts` as the central role contract and routes active profile row types through the narrow app platform role.

**Phase:** 3

**Status:** Locally mitigated; keep future role changes routed through `src/lib/auth/roles.ts`.

### RISK-006 - `editor` role is DB-visible but not typed consistently

**Risk:** Project/estimate `editor` behavior can bypass type-level review or be mishandled in UI/server checks.

**Mitigation:** Phase 3 WP2/WP3 direct D1 helper and route/action tests prove `editor` can edit scoped project/estimate content where intended and is rejected from manager-only operations. WP6 central role tests document that collaboration `editor` is content-edit authority, not manager authority.

**Phase:** 3

**Status:** Locally mitigated by Phase 3 focused tests.

### RISK-007 - Provider-leftover cleanup is under-classified

**Risk:** Stale Supabase/Vercel/Resend references can mislead agents, keep obsolete secrets active, or be deleted incorrectly.

**Mitigation:** Use `21_LEGACY_PROVIDER_CLEANUP_WORKSHEET.md`, `26_PHASE_5_LEGACY_PROVIDER_CLEANUP_PLAN.md`, `28_PHASE_5_REMAINING_PROVIDER_FIXTURE_CLEANUP_PLAN.md`, and `29_PHASE_5_PROVIDER_STRING_FILE_INVENTORY.md`; coordinate repository-wide source/script/test/env cleanup with `.ai/03_plans/2026-07-04-Vercel-Supabase-Cleanup/`. The sibling cleanup ledger records substantial repo-local implementation, Slice 0 target-literal cleanup, Slice A stale proof-utility archive, Slice A2 provider-only proof-test archive, Slice B/D3 allowlist proof, and historical type-file retirement; the auth follow-up scan now returns `44` legacy provider keyword hit files outside `supabase/**`, while `4` non-blocking retired-type path references remain. Final status depends on preserving the allowlist proof, preserving caller-clean proof for archived stale proof utilities/tests, and gathering provider-dashboard/hosted/operator/provider-exit proof. Keep provider-side credential rotation/removal or waivers in the owner/provider-exit runbook.

**Phase:** 5

**Status:** Classification, current-worktree re-audit, sibling-ledger repo-local cleanup evidence, Slice A archive evidence for the stale shared-link proof utilities and direct dependent tests, Slice A2 archive evidence for the remaining provider-only proof tests, Slice B/D3 allowlist proof, historical type-file retirement, and a full current file-level inventory exist; final provider-exit proof remains open because hosted/provider-dashboard/operator proof and provider-exit pack/CI readiness are not resolved here.

### RISK-008 - Evidence/logging can leak credential-adjacent material

**Risk:** OAuth state, codes, cookies, invite/share URLs, emails, and provider errors can leak through logs, docs, analytics, support, or test artifacts.

**Mitigation:** Redaction policy in `08`; taxonomy in `20`; Phase 4 local implementation extends `src/lib/observability/redact.ts` and client-error tests so tokenized share/invite/API-share paths plus recipient/rt/state/code/cookie query material are redacted while route shape remains useful.

**Phase:** 4

**Status:** Locally mitigated for current diagnostics/client-error surface; hosted log spot check remains open.

### RISK-009 - GDPR/retention/DSAR posture is not implementation-proven

**Risk:** Auth, invite, publication recipient, security audit, and support data may be over-retained or hard to export/delete.

**Mitigation:** Phase 4 updates `20_CREDENTIAL_MATERIAL_TAXONOMY.md` and `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` with closed-beta retention defaults plus DSAR and breach runbooks. Legal/privacy review and exact public/paid retention windows remain required before launch claims.

**Phase:** 4/6

**Status:** Runbook drafted locally; legal/public-launch policy remains open.

## P2 - Should Fix Soon

### RISK-010 - State mismatch recovery is reactive

**Risk:** Users may still see first-click failures if stale OAuth state cookies recur.

**Mitigation:** Add telemetry and decide whether to proactively clear state before OAuth start.

**Phase:** 1

**Status:** Open.

### RISK-011 - Invite origin posture allows missing Origin/Referer

**Risk:** Defense-in-depth origin check is weaker than publication POST checks.

**Mitigation:** Document why SameSite/session/token gates are sufficient or tighten with tests.

**Phase:** 3/4

**Status:** Open.

### RISK-012 - Active docs still contain stale Supabase Auth/Vercel wording

**Risk:** Future agents may implement against obsolete runtime assumptions.

**Mitigation:** `26_PHASE_5_LEGACY_PROVIDER_CLEANUP_PLAN.md` classifies current active-vs-historical references and records sibling-ledger cleanup evidence plus the remaining contradiction scan. Update active docs through the sibling cleanup pack or an equivalent scoped cleanup slice; do not rewrite historical archaeology blindly.

**Phase:** 5

**Status:** Classification, re-audit, and substantial cleanup implementation are recorded; remaining active-doc/script/test contradictions still need targeted classification or cleanup proof.

### RISK-013 - Better Auth organization/access-control plugin decision is unresolved

**Risk:** Deferring plugin adoption can preserve local complexity; adopting too early can misfit workspace/project/estimate permissions.

**Mitigation:** Phase 3 planning evaluated the Better Auth Organization plugin against the local D1/object-scoped model and deferred adoption for this phase. Revisit only after realtime authz and local role contracts are locked by tests.

**Phase:** 3

**Status:** Deferred for Phase 3.

## P3 - Cleanup

### RISK-014 - Duplicate/simple security helpers may hide intent

**Examples:** Publication CSRF token helpers with identical shapes; disabled legacy callback route.

**Risk:** Maintainability/confusion.

**Mitigation:** Clean after behavior is covered by tests and provider leftovers are classified.

**Phase:** 5

**Status:** Open.

## Closed / Superseded Risks

### RISK-015 - `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER` missing from `.env.example`

**Previous status:** Open in original seed pack.

**Current evidence:** Current `.env.example` documents `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` and optional `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER`.

**Status:** Closed as stale plan finding. Keep covered by Phase 0 revalidation, but do not implement a nonexistent env-doc fix.
