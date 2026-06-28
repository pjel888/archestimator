# 07 — Requirements Specification

Stable IDs for every requirement. Each ID maps to source evidence, acceptance criteria, validation method, affected code area, and risk. Traceability matrix in `12_TRACEABILITY_AND_READINESS_REVIEW.md`.

## ID prefixes

- `FR-` Functional requirement
- `ARCH-` Architecture requirement
- `LOG-` Logging requirement
- `OBS-` Observability requirement
- `SEC-` Security/privacy requirement
- `UX-` User-experience requirement
- `A11Y-` Accessibility requirement
- `TEST-` Testing requirement
- `PERF-` Performance requirement
- `DOC-` Documentation requirement
- `AC-` Acceptance criterion (child of a requirement)

## Requirements

### FR-001 — Typed AppError hierarchy
- **Statement:** Every throw site and every server-action return uses a subclass of `AppError` from `src/lib/observability/app-error.ts`.
- **Rationale:** `01` Section E gaps 1, 2, 9, 10. Currently 7+ distinct error patterns; raw Supabase errors leak to client.
- **Source:** user request + `01_SOURCE_AUDIT.md`.
- **Priority:** P1 (must).
- **Dependencies:** none.
- **AC-001.1:** All 9 `AppErrorKind` values and 12 concrete leaf classes exist (auth ×4 plus validation, not_found, conflict, database, upstream, rate_limit, network, internal).
- **AC-001.2:** `unwrapSupabase` translates Postgres error codes (`42501`, `PGRST301`, `PGRST309`, etc.) to the correct subclass.
- **AC-001.3:** Existing tests in `tests/vitest/library-action-errors.test.ts` and `tests/vitest/auth-error-mapping.test.ts` continue to pass.
- **Validation:** `bun run test:dom -- tests/vitest/app-error.test.ts tests/vitest/unwrap-supabase.test.ts`.
- **Affected:** `src/lib/observability/app-error.ts` (new).
- **Risk:** Subclasses too fine → switch-statement fatigue; too coarse → lossy taxonomy. Plan targets 9 public kinds and 12 concrete classes.

### FR-002 — Unified Server Action return shape
- **Statement:** Pilot scope: `publication/actions.ts` exports actions wrapped with `withActionErrors` returning `ActionResult<T>`. Full scope after pilot: all 22 server action files.
- **Rationale:** `01` Section B.1 — 7+ inconsistent shapes; client code cannot write a single error handler.
- **Priority:** P2a pilot; P2b full migration after pilot.
- **Dependencies:** FR-001.
- **AC-002.1:** `withActionErrors(fn)` returns a function returning `{ok:true,data} | {ok:false,error:{kind,code,message}}`.
- **AC-002.2:** Pilot action module migrated; no raw Supabase details returned to clients.
- **AC-002.3:** Targeted pilot server-action tests pass with no new failures against the known baseline.
- **Validation:** `bun run type-check` + targeted pilot tests.
- **Affected:** all 22 files listed in `01` B.1; `src/lib/observability/with-action-errors.ts` (new).

### FR-003 — Unified Route Handler error response
- **Statement:** Pilot scope: one representative route handler uses `errorResponse(err)` for error responses. Full scope after pilot: all 22 route handlers.
- **Priority:** P2a pilot; P2b full migration after pilot.
- **AC-003.1:** Every handler returns `{ok:false, error:{kind,code,message}, trace_id}` with mapped HTTP status.
- **AC-003.2:** Pilot route-handler test covers the selected handler; all-22 smoke-gate coverage follows after pilot evidence.
- **Affected:** all 22 files in `01` B.2; `src/lib/observability/route-error.ts` (new).

### FR-004 — Root global-error.tsx
- **Statement:** Pilot scope: one selected root or segment error boundary exists and renders safe fallback UI using the Next.js 16 `unstable_retry` contract. Full scope may include root `global-error.tsx` after pilot proof.
- **Rationale:** `01` Section A.2 — none exists.
- **Priority:** P3a pilot.
- **AC-004.1:** Selected pilot boundary file exists.
- **AC-004.2:** Tested via DOM/static test or Playwright only when browser behavior is the claim being proven.
- **Affected:** new file.

### FR-005 — Root error.tsx and not-found.tsx
- **Statement:** Selected pilot `error.tsx`/`global-error.tsx` exists; root `not-found.tsx` is a follow-on after pilot if still needed.
- **Priority:** P3a pilot.
- **AC-005.1:** Pilot boundary file exists.
- **AC-005.2:** Pilot `error.tsx` calls `toast.appError` on mount when the selected boundary is segment-level.
- **AC-005.3:** `not-found.tsx` remains follow-on, not pilot-blocking.

### FR-006 — Toast.appError convenience
- **Statement:** `src/components/ui/toast.tsx` exports `toast.appError(err)`.
- **Rationale:** preserves existing API; adds AppError-aware convenience.
- **Priority:** P3a pilot.
- **AC-006.1:** Existing `toast({message, tone, durationMs})` API unchanged.
- **AC-006.2:** `toast.appError(err)` picks tone+copy from `toast-config.ts` per `err.kind`.
- **Validation:** `tests/vitest/toast-apperror.test.tsx` (new).
- **Affected:** `src/components/ui/toast.tsx` (extend only); `src/lib/observability/toast-config.ts` (new).

### FR-007 — Auth error bridge
- **Statement:** `src/lib/auth/error-mapping.ts` exports `mapAuthCodeToAppError(code, cause)` that returns `AppError.AuthError` subclass.
- **Priority:** P2b after pilot.
- **AC-007.1:** Existing `mapAuthErrorToCode` function preserved unchanged.
- **AC-007.2:** `recordAccountSecurityEvent` calls preserved unchanged.
- **AC-007.3:** New bridge maps every existing code in `src/lib/auth/error-mapping.ts` (`email_required`, `auth_request_failed`, `google_request_failed`, `callback_missing_code`, `callback_exchange_failed`, `invalid_redirect`). Codes not present in the source today (e.g. Supabase-native `otp_expired`, future `beta_access_required`) are added to the bridge only when the source emits them.
- **Affected:** `src/lib/auth/error-mapping.ts` (extend only).

### ARCH-001 — Observability module location
- **Statement:** Foundation observability code lives under `src/lib/observability/`.
- **Rationale:** `DEC-ERR-001`.
- **AC-001.1:** 9 planned files per `05` Section A.1.
- **AC-001.2:** `src/lib/perf/server-timing.ts` consumed (not modified).

### ARCH-002 — Off-limits files
- **Statement:** Files in README `## Protected contracts` preserve existing contracts.
- **AC-002.1:** git diff for protected contracts is additive only where the plan explicitly allows it.

### LOG-001 — Structured dev NDJSON logger
- **Statement:** `src/lib/observability/logger.ts` writes NDJSON records to `./logs/dev.ndjson` in development.
- **Priority:** P4 (pilot must).
- **AC-001.1:** Records conform to schema in `04` Section B.1.
- **AC-001.2:** Append-mode writes; truncate-on-dev-start; 50MB rotation cap.
- **AC-001.3:** PERF_TRACE AsyncLocalStorage consumed for `request_id` + `scope`.
- **Validation:** `tests/vitest/logger.test.ts` in P4.

### LOG-002 — Redaction layer
- **Statement:** `src/lib/observability/redact.ts` redacts all keys in `NEVER_LOG_KEYS`, hashes `HASHED_ONLY`, masks `MASKED`.
- **Priority:** P1 (must).
- **Validation:** `tests/vitest/redact.test.ts`.

### LOG-003 — AI tail command
- **Statement:** `scripts/tail-dev-logs.mjs` supports `--tail --last N --since DURATION --grep PATTERN --error --explain`.
- **Priority:** P4 (must).
- **AC-003.1:** Each flag works; output is valid JSON.
- **AC-003.2:** `--explain` produces the AI-readable summary per `04` D.2.
- **Validation:** `tests/unit/tail-dev-logs.test.ts`.

### LOG-004 — .gitignore logs/
- **Statement:** `./logs/` ignored by git.
- **Priority:** P4.

### OBS-001 — instrumentation.ts with onRequestError
- **Statement:** `instrumentation.ts` at project root exports `register()` and `onRequestError()`.
- **Priority:** P5 (owner/provider-gated for prod observability).
- **AC-001.1:** `onRequestError` captures via Sentry.
- **AC-001.2:** Tested via `tests/vitest/instrumentation.test.ts`.

### OBS-002 — Sentry integration
- **Statement:** `@sentry/nextjs` installed; `sentry.{server,client}.config.ts` exist; `SENTRY_DSN` env documented. Real DSN, GitHub secret, Vercel env, source-map upload, and dashboard proof are owner/provider-gated.
- **Priority:** P5 conditional.
- **AC-002.1:** Source maps uploaded in CI.
- **AC-002.2:** `beforeSend` hook redacts PII per `06`.

### OBS-003 — Vercel Log Drain (deferred)
- **Statement:** Vercel dashboard Log Drain config forwarder to Axiom/Better Stack.
- **Priority:** Deferred (not in P5; triggered by first paying user).

### SEC-001 — Never log secrets
- **Statement:** `NEVER_LOG_KEYS` set covers all env-var-named secrets.
- **AC-001.1:** Property test: feed 1000 random key:value pairs containing secret-like keys → no leaks.

### SEC-002 — Source maps private
- **Statement:** Source maps never published to public CDN.
- **AC-002.1:** Playwright probe in P6a verifies `/.next/static/chunks/*.map` returns 404 on production deploy.

### SEC-003 — Client error endpoint hardened
- **Statement:** `/api/internal/client-error` is same-origin checked, strictly parsed, size-capped, redacted, tainted-field labeled, and rate-limited to 10 requests/min/IP for local/preview. Production enablement requires provider-backed rate limiting.
- **AC-003.1:** Test verifies 11th request in a minute returns 429.
- **AC-003.2:** Tests verify malformed, cross-site, oversized, email/token/URL, control-character, and prompt-injection payloads do not produce trusted/raw log fields.

### SEC-004 — PII masking in Sentry
- **Statement:** `maskAllText: true` in prod; replay sampling remains `0`; `data-private` attribute respected; `beforeSend` strips auth headers.

### UX-001 — Consistent toast tones per error kind
- **Statement:** `03` Section C table implemented in `toast-config.ts`.
- **AC-001.1:** Each `AppErrorKind` maps to a specific tone, copy, and duration.

### UX-002 — Dismissible toasts
- **Statement:** All error toasts dismissible (existing API already supports this; preserved).

### A11Y-001 — Toasts announce to screen readers
- **Statement:** Toast container uses `role="status"` for non-critical tones and `role="alert"` for `error` tone, with `aria-live="polite"` and `aria-live="assertive"` respectively.
- **AC-001.1:** Existing toast.tsx already complies (verified in audit). P3 task: explicit test in `tests/vitest/toast-a11y.test.tsx`.

### A11Y-002 — Error boundaries focusable
- **Statement:** `global-error.tsx` and `error.tsx` move focus to the error container on mount.
- **AC-002.1:** Playwright test verifies `document.activeElement` is inside the error boundary after navigation.

### TEST-001 — New test files for P1
- **Statement:** `tests/vitest/{app-error,unwrap-supabase,with-action-errors,logger,redact}.test.ts` exist and pass.

### TEST-002 — New test files for P3–P5
- **Statement:** `tests/vitest/{toast-apperror,toast-a11y,client-error,instrumentation,sentry-redact}.test.ts` + `tests/unit/tail-dev-logs.test.ts` exist and pass.

### TEST-003 — Adversarial QA matrix
- **Statement:** `09_TEST_QA_ULTRAQA_PLAN.md` matrix executed; zero P0/P1 findings unresolved at P6a.

### PERF-001 — Logger overhead budget
- **Statement:** `logger.error` adds <1ms p95 per call once the P4 file writer is enabled.
- **AC-001.1:** `tests/vitest/logger-perf.test.ts` measures 1000 calls in P4; p95 < 1ms.

### PERF-002 — Bundle size budget
- **Statement:** Client bundle delta <60KB gzipped after P5.
- **AC-002.1:** Bundle-analyzer CI gate fails build if delta exceeded.

### DOC-001 — Update `.ai/10_state/current-state.md`
- **Statement:** After P1 lands, append an entry to current-state.md describing the new observability module.

### DOC-002 — Update `DESIGN.md` (only if Toast catalog changes UI tokens)
- **Statement:** Toast copy catalog in `toast-config.ts` may reuse existing tokens; if it introduces new tokens, update DESIGN.md.
- **Priority:** Conditional.

## Shadow path matrix (per `Creating-Plan-Prompt.md` Section 10)

For the canonical flows this plan affects:

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Server action `createProject` | 200 `{ok,data}` | `ValidationError` 400 | n/a | `ValidationError` 400 | `AuthRequiredError`/`AuthPermissionDeniedError` 401/403 | `UpstreamError` 502 | `ConflictError` 409 | Idempotency token in P5 | Toast.appError | `tests/vitest/projects-actions.test.ts` |
| Route `POST /api/share/[token]/comment` | 200 `{ok}` | `ValidationError` 400 | n/a | `ValidationError` 400 | 401/403 | 502 | 409 | n/a | errorResponse JSON | `tests/vitest/share-comment.test.ts` |
| Auth callback | redirect to workshop | redirect to `/login?code=callback_missing_code` | n/a | redirect with code | redirect | redirect with `service_unavailable` | n/a | n/a | Browser redirect | `tests/vitest/auth-error-mapping.test.ts` |
| Toast.appError(err) | tone+copy rendered | n/a | n/a | n/a | n/a | n/a | n/a | n/a | Visible toast | `tests/vitest/toast-apperror.test.tsx` |
| `global-error.tsx` | HTML renders, POST logs | n/a | n/a | n/a | n/a | POST swallowed | n/a | n/a | Page | Playwright `e2e/global-error.spec.ts` |
| `instrumentation.onRequestError` | Sentry capture | n/a | n/a | n/a | n/a | Sentry unavailable → swallow | n/a | n/a | Sentry dashboard | `tests/vitest/instrumentation.test.ts` |

## Out-of-scope (deferred)

| Item | Defer trigger |
|---|---|
| Zod schema library adoption | Separate owner decision; this plan uses a strict local parser by default |
| PostHog product analytics | Separate work; not blocking |
| Vercel Analytics / Speed Insights | Separate work |
| Vercel Log Drain config | After first paying user |
| Full OTel SDK | After 50+ paying users |
| Per-tenant log isolation | After multi-tenant scale |
| HSM-backed hashing | After SOC2 requirement |
| Session replay (Sentry) tuning | After first incident |
| Toast dedupe logic | After first user complaint about double-toasts |
