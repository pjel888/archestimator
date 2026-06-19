# Audit Findings — API Routes & Server Actions (Domain 4)

Date: 2026-06-19 · Stage: pre-launch closed-beta MVP · Auditor lane: Domain 4.

## Scope & coverage

**Read in full (every line):**
- All 19 files under `src/app/api/**` (the prompt's "16" undercounts; the actual handler set is
  19, incl. the AI `handler.ts` split files and the export `filename.ts`).
- AI: `ai/ask/{route,handler}.ts`, `ai/package-builder/{route,handler}.ts`, plus `src/lib/ai/auth.ts`,
  `feature-flags.ts`, `rate-limit.ts` (signatures), and the package-builder schema/draft/apply contract surface.
- Uploads: `component-library/{attachments,images}/route.ts`, `projects/images/route.ts`.
- Export: `projects/.../export/proposal.xlsx/route.ts` + `filename.ts`.
- Share: all 8 `share/[token]/*` routes + `src/lib/publication/security.ts` (origin/CSRF/session/cookie helpers, ~570 lines) + relevant `public-repository.ts` sections (rate limits, event recording, verify).
- Webhook: `webhooks/resend/route.ts` + `src/lib/email/resend-webhooks.ts` (signature verify).
- Health route.
- All 24 `"use server"` modules: header placement + a full export inventory (grep) + deep reads of
  `auth/actions.ts`, `auth/beta-allowlist-admin-actions.ts`, `workshop/beta-feedback-review-actions.ts`,
  `projects/actions.ts` (create/delete/update), plus `auth/session.ts` helpers.

**Deferred / cross-domain (not deeply re-verified here):**
- The *internals* of RLS, the bulk-delete/comment/decision RPCs, and `security_rate_limit_events`
  enforcement (Domain 2). I confirmed call sites reach the user-scoped client and the durable table;
  correctness of the policies/functions is Domain 2's gate.
- Repository workspace-scoping inside `getProjectEstimateTreeByEstimate` / `getEstimateTabTree`
  (export IDOR depends on it) — cross-noted to Domain 2.

## Reconciliation vs prior packs

Primary prior work: `.ai/03_plans/2026-06-01-security-owasp-compliance-audit` (3-pass, 24 sections,
production-readiness gate). The current code is visibly the *remediated* output of that audit:
magic-byte upload validation, `assertSameOriginPublicPost` (same-origin + double-submit CSRF),
generic 500 envelopes ("SEC-15"), GET-interstitial unsubscribe ("SEC-14"), server-gated export
audience ("§C.1"), durable Postgres rate limits, and `webhooks.verify` signature checking are all present.

| Prior finding | Status in code today | Verdict |
|---|---|---|
| F-RL-04 / SEC-3P-002 "AI endpoints no rate limit" | `ask` now wired to `checkAiAskQuota` (durable). **package-builder still has none.** | **partial / stale** — split into API-01 (live residual) |
| SEC-3P-001 "share cookie Secure/SameSite not explicit" | `security.ts` sets `secure`/`httpOnly`/`sameSite:"lax"` explicitly on session + access cookies | **stale (fixed)** |
| F-UPLOAD-01..05 (upload hardening) | Magic-byte sniff, declared-vs-actual mime check, sharp re-encode, pixel caps, path ownership | **covered (implemented)** |
| F-SHARE-01..12 | Origin+CSRF, signed session cookie, password lockout, snapshot-version guard, generic errors | **covered (implemented)** |
| F-WEB / webhook (sec.16) | `resend.webhooks.verify` (svix id/timestamp/signature) + size cap + secret-gated | **covered (implemented)** |
| F-ERR-01/02/05, SEC-15 | 500 path returns generic envelope; raw msg logged server-side only | **covered (implemented)** |
| F-INPUT-02 "Zod not used" | Hand-rolled validators throughout; functionally adequate | **covered (info)** |
| F-AI-05/06 (prompt injection, LLM state-change) | Data-not-instructions system prompt; Apply gated by signed draft-token + hash + explicit confirm | **covered (mitigated)** — Domain-12/AI residual |
| F-CI-01..09, F-LOG-02 (CI/monitoring gates) | Out of Domain-4 lane | **covered-by:OWASP** → Domain 9/10 |

Archived `ai-chatbot-agent-readiness` (sec/isolation plan) is consistent with the shipped
auth-mode gate (`authMode !== "supabase"` → 403) and read-only Ask posture. No conflict.

## Findings

### API-01 — Package-builder route has no rate limiting (ask does)
- **Severity:** medium · **launch_blocker:** false (true only if AI is enabled for beta with cost/abuse exposure)
- **Evidence:** `src/app/api/ai/package-builder/handler.ts` — `PackageBuilderDependencies` (lines 33–53)
  has no `checkQuota`; the handler never throttles. Contrast `src/app/api/ai/ask/handler.ts:7,40,131`
  which wires durable `checkAiAskQuota`. `package-builder/route.ts` adds nothing. Grep for
  `quota|rate.?limit` across `package-builder/**` returns nothing.
- **Impact:** An authenticated workspace user can spam `mode:"draft"`/`"refine"` (each a DeepSeek
  provider call → cost) and `mode:"apply"` (production writes via `applyPackageBuilderDraft`) with no
  per-user/per-workspace ceiling. This is the heavier and more dangerous of the two AI routes.
- **Mitigating context:** gated behind `isAiRoutesEnabled()` (default **off**), a real Supabase
  session + workspace, feature flags (`flags.applyShell/applyTree/applyRows`), and a signed draft-token
  + draft-hash + explicit-confirmation gate on Apply. So it is not anonymous and Apply is not trivially forgeable.
- **Recommendation:** Add the same durable `security_rate_limit_events`-backed quota used by `ask`
  (a `checkPackageBuilderQuota` mirroring `checkAiAskQuota`, with a tighter cap on `mode:"apply"`).
- **Effort:** S · **Confidence:** high · **Overlap:** partial:2026-06-01-security-owasp-compliance-audit (F-RL-04/SEC-3P-002, now stale for `ask`, still live here)

### API-02 — Prior "AI endpoints no rate limit" finding is stale for /api/ai/ask
- **Severity:** info · **launch_blocker:** false
- **Evidence:** `ask/handler.ts:131` calls `checkQuota` → `checkAiAskQuota` (`src/lib/ai/rate-limit.ts`),
  which reads/inserts `security_rate_limit_events` (durable, serverless-correct), returns 429 + `Retry-After`.
- **Impact:** None — recorded so the readiness gate's open "F-RL-04 (Medium)" is not re-actioned wholesale.
  Only the package-builder half (API-01) remains.
- **Recommendation:** Mark SEC-3P-002 partially-closed (ask done, package-builder pending).
- **Effort:** S · **Confidence:** high · **Overlap:** stale:2026-06-01-security-owasp-compliance-audit

### API-03 — Share `events` route stores unbounded public-supplied JSON metadata
- **Severity:** low · **launch_blocker:** false
- **Evidence:** `src/app/api/share/[token]/events/route.ts:24,45` passes `body.metadata` (arbitrary object)
  straight to `recordProjectPublicationEvent`, which writes it to `project_publication_events.metadata_json`
  JSONB (`public-repository.ts:694,701`) with no size/key/depth bound. `eventType` is allow-listed; `metadata` is not.
- **Impact:** A CSRF-valid, same-origin client can persist large/arbitrary JSON blobs (storage growth,
  analytics pollution). Not injection (parameterized JSONB), not cross-tenant (publication-scoped).
- **Mitigating context:** route is same-origin + CSRF gated (`assertSameOriginPublicPost`) and durably
  rate-limited (`checkProjectPublicationEventRateLimit`), so abuse volume is bounded.
- **Recommendation:** Cap serialized `metadata` bytes (e.g. reject > 2 KB) and/or allow-list keys before insert.
- **Effort:** S · **Confidence:** high · **Overlap:** none

### API-04 — Upload content-length early-reject is bypassable but backstopped by file.size
- **Severity:** info · **launch_blocker:** false
- **Evidence:** `component-library/images/route.ts:142`, `projects/images/route.ts:210`,
  `component-library/attachments/route.ts:126` use `Number(request.headers.get("content-length") ?? 0)`.
  A missing/malformed header yields `NaN` (or 0); `NaN > MAX` is `false`, so the early 413 is skipped.
- **Impact:** None exploitable — every route re-checks `file.size > MAX_UPLOAD_BYTES` after reading the
  multipart File (images.ts:153, projects/images.ts:223, attachments.ts:136), which is the authoritative
  cap. The header check is only an optimization to fail before buffering.
- **Recommendation:** None required. Optionally treat non-finite content-length as 0 explicitly for clarity.
- **Effort:** S · **Confidence:** high · **Overlap:** covered-by:2026-06-01-security-owasp-compliance-audit (F-UPLOAD-*)

### API-05 — `"use server"` async-only-export pitfall: clean across all 24 modules
- **Severity:** info · **launch_blocker:** false
- **Evidence:** Grep across every `"use server"` file for `^export (const|function|class|let|var|enum) `
  *excluding* `async` returns zero hits. All non-async exports are `export type`/`export interface`
  (type-only, erased — safe). All value exports are `async function`. `next build` will not trip the
  "Server Actions must be async" error from this surface.
- **Impact:** Confirms the known historical pitfall (memory: use-server-exports-only-async) is not
  currently present. Worth re-checking after any concurrent agent edits these files.
- **Recommendation:** Keep `bun run build` (not just tsc/Vitest) as the gate when editing action modules.
- **Effort:** S · **Confidence:** high · **Overlap:** none

### API-06 — Authz/validation/error-handling posture across handlers is sound (strengths)
- **Severity:** info · **launch_blocker:** false
- **Evidence:** AI routes fail closed on `authMode !== "supabase"` and missing workspace
  (`ask/handler.ts:124-126`, `package-builder/handler.ts:200-201`). Admin actions gate on role
  (`beta-allowlist-admin-actions.ts:35,55`, `beta-feedback-review-actions.ts:15`). Project/estimate
  actions use `requireCurrentUserContext()` + workspace-scoped `.eq("workspace_id", ...)` (e.g.
  `projects/actions.ts:257-258,270-271`). Auth uses `getUser()` (server-validated JWT), not `getSession`
  (`session.ts:40`). Export audience is server-derived, never caller-trusted (`proposal.xlsx/route.ts:78-89`).
  Public share errors return generic 500 envelopes (SEC-15) while logging detail server-side.
- **Impact:** No authz bypass, no raw-error leakage, no unvalidated-input path found in the read surface.
- **Recommendation:** None. Preserve these patterns when editing.
- **Effort:** S · **Confidence:** high · **Overlap:** covered-by:2026-06-01-security-owasp-compliance-audit

## Launch-gate summary

**No Domain-4 hard launch blocker.** The single actionable pre-launch item is **API-01** (package-builder
rate limit) — and only if AI routes are flipped on for beta (they default off). Everything else is
hardening (API-03), stale-bookkeeping (API-02), or confirmed-safe (API-04/05/06).
