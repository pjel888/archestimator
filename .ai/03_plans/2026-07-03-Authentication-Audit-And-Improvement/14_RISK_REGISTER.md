# 14 - Risk Register

Risks are categorized P0 (blocker), P1 (must fix before launch/security claim), P2 (should fix soon), and P3 (cleanup). Each risk has a stable ID for traceability.

## P0 - Blockers

### RISK-001 - Publication password hard lock is not durable

**Location:** `src/lib/publication/security.ts` in-memory password attempt store.

**Risk:** Cloudflare Worker isolates do not make module-global state durable. A hard lock relying on in-memory `Map` can reset on isolate/cold-start behavior.

**Mitigation:** Move hard-lock state to D1 or Durable Object persistent storage.

**Phase:** 2

**Status:** Open.

### RISK-002 - App-layer authz matrix is incomplete

**Location:** Server actions, route handlers, repository helpers across auth/collaboration/publication/workshop.

**Risk:** D1 has no RLS fallback. Any missing server-side object-role check can become broken access control.

**Mitigation:** Fill and test the authz matrix before broad authz edits.

**Phase:** 3

**Status:** Open.

### RISK-003 - Credential-material taxonomy was incomplete

**Location:** Original pack only covered publication credentials.

**Risk:** Better Auth sessions, OAuth state/codes, invite tokens, provider secrets, cookies, and evidence could leak or be retained incorrectly.

**Mitigation:** `20_CREDENTIAL_MATERIAL_TAXONOMY.md` now inventories known material; implementation must keep it updated and add redaction tests.

**Phase:** 4

**Status:** Planning gap closed; implementation controls open.

## P1 - Launch/Security Claim Blockers

### RISK-004 - Logout and OAuth revocation semantics are undecided

**Risk:** `prompt=select_account` fixes account-picker UX but does not by itself define local-session invalidation, all-session logout, OAuth grant revocation, or shared-device reauth expectations.

**Mitigation:** Decide and test explicit policy in Phase 1.

**Status:** Open.

### RISK-005 - Role taxonomy is fragmented

**Risk:** App roles, workspace roles, project/estimate roles, beta admin roles, and publication recipient authority are scattered. Drift can become authz bugs.

**Mitigation:** Centralize role types/helpers or document why a plugin/local split is chosen.

**Phase:** 3

**Status:** Open.

### RISK-006 - `editor` role is DB-visible but not typed consistently

**Risk:** Project/estimate `editor` behavior can bypass type-level review or be mishandled in UI/server checks.

**Mitigation:** Define scoped project/estimate role types and tests.

**Phase:** 3

**Status:** Open.

### RISK-007 - Provider-leftover cleanup is under-classified

**Risk:** Stale Supabase/Vercel/Resend references can mislead agents, keep obsolete secrets active, or be deleted incorrectly.

**Mitigation:** Use `21_LEGACY_PROVIDER_CLEANUP_WORKSHEET.md`; coordinate provider-side changes with sibling pack.

**Phase:** 5

**Status:** Open.

### RISK-008 - Evidence/logging can leak credential-adjacent material

**Risk:** OAuth state, codes, cookies, invite/share URLs, emails, and provider errors can leak through logs, docs, analytics, support, or test artifacts.

**Mitigation:** Redaction policy in `08`; taxonomy in `20`; add sanitizer/evidence tests.

**Phase:** 4

**Status:** Open.

### RISK-009 - GDPR/retention/DSAR posture is not implementation-proven

**Risk:** Auth, invite, publication recipient, security audit, and support data may be over-retained or hard to export/delete.

**Mitigation:** Define retention/DSAR/breach runbooks before public/paid launch.

**Phase:** 4/6

**Status:** Open.

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

**Mitigation:** Update active docs after classification; do not rewrite historical archaeology blindly.

**Phase:** 5

**Status:** Open.

### RISK-013 - Better Auth organization/access-control plugin decision is unresolved

**Risk:** Deferring plugin adoption can preserve local complexity; adopting too early can misfit workspace/project/estimate permissions.

**Mitigation:** Evaluate after local role taxonomy and authz matrix are explicit.

**Phase:** 3

**Status:** Open decision.

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
