# Remediation Plan — API Routes & Server Actions (Domain 4)

Date: 2026-06-19 · Adversarial-verification pass complete · Stage: pre-launch closed-beta MVP.

## Verdict summary (see 03-EVIDENCE for proof)

| ID | Title | Auditor sev | Final sev | Launch blocker | Verdict |
|----|-------|-------------|-----------|----------------|---------|
| API-01 | package-builder no rate limit | medium | medium | false (conditional) | confirmed |
| API-02 | "AI no rate limit" stale for `/ask` | info | info | false | confirmed |
| API-03 | share `events` unbounded metadata JSON | low | low | false | confirmed |
| API-04 | upload content-length early-reject bypassable, backstopped | info | info | false | confirmed |
| API-05 | `"use server"` async-only-export clean | info | info | false | adjusted (count 24→21; substance holds) |
| API-06 | authz/validation/error posture sound | info | info | false | confirmed |

**Launch-blocker count: 0.** No Domain-4 hard gate. API-01 becomes a soft pre-flip gate only
if AI routes are enabled for beta (`ARCHESTIMATOR_AI_ENABLED=1` — default off, confirmed
`feature-flags.ts:13`). For the current default-off posture, the only actionable hardening is
API-03 (cheap) and an optional API-01 pre-stage so AI can be flipped on safely later.

## Sequenced remediation

### Priority 1 — API-01: add durable rate limit to `/api/ai/package-builder`
Conditional launch-blocker (only if AI is flipped on for beta). Pre-stage it now so the flip is safe.

- **Why:** The heavier of the two AI routes. An authenticated workspace user can spam
  `mode:"draft"`/`"refine"` (each a DeepSeek provider call → token cost) and `mode:"apply"`
  (production writes via `applyPackageBuilderDraft`) with no per-user/per-workspace ceiling.
  `/api/ai/ask` already throttles via `checkAiAskQuota`; package-builder has no `checkQuota` in
  `PackageBuilderDependencies` (handler.ts:33–53) and never throttles.
- **No migration required.** Reuse the existing `security_rate_limit_events` table
  (`supabase/migrations/20260601003000_security_rate_limit_events.sql`) and the exact pattern in
  `src/lib/ai/rate-limit.ts` (`checkAiAskQuota`). RLS/grants already cover this table via the AI
  audit service client (`createAiAuditSupabaseClient`).
- **Steps:**
  1. Add `checkPackageBuilderQuota` to `src/lib/ai/rate-limit.ts` (or a sibling
     `package-builder/rate-limit.ts`), mirroring `checkAiAskQuota` with:
     - `scope = "ai_package_builder"` (distinct key so it doesn't share the `ask` budget).
     - Windows tuned per mode. Suggested: `draft`/`refine` = `{60s:5, 1h:30}`;
       a **tighter** `apply` budget (production writes) e.g. `{60s:2, 1h:15}` via a `mode`
       parameter folded into the `key_hash` parts and/or a separate scope `ai_package_builder_apply`.
     - Key parts identical to ask: `[workspaceId, userId, getClientIp(request)]`.
  2. Wire it into `PackageBuilderDependencies` in `src/app/api/ai/package-builder/handler.ts`:
     add `checkQuota` to the type (lines 33–42) and `defaultDependencies` (lines 44–53), then call
     it **after** the auth gate (after handler.ts:201, before mode branching) — and for `apply`,
     call the tighter `apply`-scoped check inside the `mode === "apply"` branch (after line 277,
     before `authorizeApply`). Return the same 429 + `Retry-After` envelope `ask` uses
     (`rateLimitedResponse` shape, ask/handler.ts:95–103).
  3. `feedback` mode is a no-provider, no-write bookkeeping path — exclude it from the provider
     budget (it can share a cheap throttle or be left unmetered; document the choice).
- **Files:** `src/lib/ai/rate-limit.ts` (or new sibling), `src/app/api/ai/package-builder/handler.ts`.
  Tests: `tests/vitest/ai-package-builder-route.test.ts` (inject a stub `checkQuota` returning
  `{allowed:false}` and assert 429 + `Retry-After`).
- **Risk:** Low — additive, reversible, mirrors a shipped pattern. The only sharp edge is the
  per-mode budget shape; keep it injectable so tests don't hit Supabase.
- **Effort:** S.
- **Dependencies:** None new. Domain-2 owns `security_rate_limit_events` policy correctness, but
  the table + grants already exist and are exercised by `ask` in production, so no Domain-2
  blocking work is required.
- **Overlap:** partial:2026-06-01-security-owasp-compliance-audit (F-RL-04 / R-25). F-RL-04 names
  BOTH routes; it is now half-closed (ask done). This item closes the second half. Update the
  OWASP pack/`decisions.md` to mark F-RL-04 fully closed once landed.

### Priority 2 — API-03: bound share `events` metadata JSON
Hardening. Not a launch blocker. Cheap; do it regardless of AI posture (share is live).

- **Why:** `src/app/api/share/[token]/events/route.ts:24,45` passes `body.metadata` (arbitrary
  object) straight to `recordProjectPublicationEvent`, which writes it to
  `project_publication_events.metadata_json` JSONB (`public-repository.ts:702`) with no
  size/key/depth bound. `eventType` is allow-listed (route.ts:10–15,26); metadata is not.
  Same-origin + CSRF gated (`assertSameOriginPublicPost`) and rate-limited
  (`checkProjectPublicationEventRateLimit`), so this is storage growth / analytics pollution, not
  injection (parameterized JSONB) and not cross-tenant (publication-scoped).
- **Steps:**
  1. In the events route, after parsing `body.metadata`, enforce a bound before passing it on.
     Simplest robust check: `JSON.stringify(body.metadata ?? {})` and reject (400) if byte length
     > ~2 KB; optionally allow-list known keys (the events the app actually emits) and drop the
     rest. Keep `Cache-Control: no-store` on the error like the other returns.
  2. Defense-in-depth (optional): apply the same cap inside `recordProjectPublicationEvent`
     (`public-repository.ts`) so any other caller is also bounded. Note `recipient_id` is added
     server-side after the cap, so cap the caller-supplied object, not the merged one.
- **Files:** `src/app/api/share/[token]/events/route.ts` (+ optionally
  `src/lib/publication/public-repository.ts`).
  Tests: a vitest asserting a >2 KB metadata body returns 400 and is not written; an in-bound body
  still 204s.
- **Risk:** Very low — additive validation on a public ingress; ensure the cap is generous enough
  for legitimate event payloads (current emitters send small objects).
- **Effort:** S.
- **Dependencies:** None.
- **Overlap:** none.

### Priority 3 (bookkeeping) — API-02: mark F-RL-04 partially/fully closed
- No code. After API-01 lands, update `.ai/03_plans/2026-06-01-security-owasp-compliance-audit/09-rate-limiting-and-dos-resilience.md`
  (F-RL-04 / R-25) and `.ai/10_state/decisions.md` to record that `/api/ai/ask` was already
  closed (`checkAiAskQuota`) and `/api/ai/package-builder` is closed by API-01.
- **Effort:** S. **Overlap:** stale:2026-06-01-security-owasp-compliance-audit.

## No action required (confirmed-safe)

- **API-04** — every upload route re-checks `file.size > MAX_UPLOAD_BYTES` after reading the File
  (attachments:136, projects/images:223, component-library/images:153). The
  `content-length` early-reject (with a +1 MB slack) is a pre-buffer optimization only; a
  missing/`NaN` header just skips the optimization, not the authoritative cap. Optional cosmetic:
  coerce non-finite content-length to 0. Covered-by OWASP F-UPLOAD-*.
- **API-05** — zero non-async value exports across all `"use server"` modules (grep clean).
  **Adjustment:** the module count is **21**, not the 24 stated in the audit (likely counted
  helper/type files); the substantive claim is unchanged. Keep `bun run build` (not just
  tsc/Vitest) as the gate when editing action modules.
- **API-06** — authz/validation/error posture confirmed at every cited line: workspace-scoped
  writes (`projects/actions.ts:257–271` with `.eq("workspace_id", workspace.id)`), server-validated
  `getUser()` (`session.ts:40`), role gates on admin/feedback actions
  (`beta-allowlist-admin-actions.ts:35`, `beta-feedback-review-actions.ts:15`), server-derived
  export audience (`proposal.xlsx/route.ts:78–89`). Preserve these patterns.

## Validation gate for this pack

- `bun run build` (only gate that catches the use-server async-only-export pitfall;
  `bun run validate` is known-red on main for unrelated charts/design-lint).
- Targeted Vitest for any handler touched (`ai-package-builder-route`, a new share-events test).
- Manual/provider: after API-01, authenticated package-builder spam returns 429 once the new cap
  is hit (only observable with `ARCHESTIMATOR_AI_ENABLED=1` + a real session).
