# 11 — Risks, Decisions, and Alternatives

Risk register + Architecture Decision Records (ADRs) with rejected alternatives.

## A. Decision register (ADRs)

### DEC-ERR-001 — Logger module location
**Context:** Where does the new logger live? Options: (a) extend `src/lib/perf/server-timing.ts`; (b) new `src/lib/observability/logger.ts`; (c) add to `src/lib/supabase/`; (d) add to `src/lib/auth/`.
**Decision:** (b) New module `src/lib/observability/logger.ts`.
**Rationale:** `server-timing.ts` is performance-focused; coupling logging muddies concerns. `supabase/` and `auth/` are too narrow. Dedicated observability module matches the concern boundary.
**Rejected:** (a) mixing concerns; (c) couples to one data layer; (d) couples to one domain.
**Status:** decided 2026-06-28.

### DEC-ERR-002 — Canonical Server Action return shape
**Context:** 7+ patterns today. Options: (a) throw everywhere; (b) `{ok, data?, error?}` with `error:{message}`; (c) `{ok, data?, error:{kind, code, message}}` discriminated union; (d) tuples `[data, error]`.
**Decision:** (c) discriminated union with `kind` + `code` + `message`.
**Rationale:** `kind` drives Toast catalog; `code` enables telemetry; `message` is user-safe copy; discriminated unions give TypeScript exhaustiveness.
**Rejected:** (a) Next.js docs say return for expected errors; (b) lacks `kind`/`code`; (d) non-idiomatic in TS.

### DEC-ERR-003 — Dev log file path
**Decision:** `./logs/dev.ndjson` at repo root. Git-ignored.
**Rationale:** Repo-root is conventional; AI agents know `$PWD`/git toplevel; git-ignore prevents accidental commit of PII.
**Rejected:** `/tmp/`, `~/.archestimator/logs/`, `os.tmpdir()` — outside repo, hard for AI agent.

### DEC-ERR-004 — Production forwarder choice
**Decision:** Sentry for errors; defer Vercel Log Drain → Axiom to first paying user.
**Rationale:** 2026 industry consensus (`02` Section D). Free tier 5k errors/mo. First-class Next.js 16 integration via `instrumentation.ts`. Source maps + breadcrumbs + release tracking.
**Rejected:** Vercel Observability (Vercel-only); PostHog (analytics-first); Datadog ($1.5-3k/mo at scale); Bugsnag/Rollbar (older).

### DEC-ERR-005 — PII redaction strategy
**Decision:** Layered — `NEVER_LOG_KEYS` set + `HASHED_ONLY` (sha256 prefix) + `MASKED` (email/phone/IP) + Sentry-side `maskAllText: true` + Data Scrubbers.
**Rejected:** "log only keys" (lossy for AI); "hash route names too" (destroys diagnosability); "trust Sentry alone" (dev file needs its own layer).

### DEC-ERR-006 — Toast API extension
**Decision:** Add `toast.appError(err)` convenience. Existing `toast({message, tone, durationMs})` untouched.
**Rejected:** Replace API (breaks 30+ call sites); parallel `toastError()` (fragments API).

### DEC-ERR-007 — Root global-error.tsx
**Decision:** Add `src/app/global-error.tsx` rendering `<html><body>` shell + brand error UI + POST to `/api/internal/client-error`.
**Rejected:** "Let Next.js default handle it" (bad UX + no logging); "catch in middleware" (middleware can't catch render-phase errors).

### DEC-ERR-008 — Scope: include Zod?
**Decision:** Out of scope. Implementer's choice in P1.
**Rationale:** Orthogonal to error-handling taxonomy. Mixing bloats the plan.

### DEC-ERR-009 — Logger transport
**Decision:** Dev = file (`./logs/dev.ndjson`). Prod = stdout (Vercel captures).
**Rationale:** AI agents can `tail -f` a file reliably. Production serverless requires stdout.

### DEC-ERR-010 — Sentry performance sampling rate
**Decision:** 10% (`tracesSampleRate: 0.1`).
**Rationale:** Industry default for pre-launch teams.

### DEC-ERR-011 — Source maps upload location
**Decision:** Sentry-only; never public CDN.
**Rationale:** Public maps let attackers reverse-engineer the client bundle. Sentry stores them privately.

## B. Risk register

| ID | Risk | L | I | Sev | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| RISK-ERR-001 | AppError taxonomy over-engineered | M | L | M | Cap at 9 leaf classes; revisit at P2 | lead | open |
| RISK-ERR-002 | Logger file-handle leak | L | M | M | `createWriteStream(append)` once; close on exit | lead | open |
| RISK-ERR-003 | Wrapping changes TS signature; callers break | M | H | H | Preserve `Args extends unknown[]`; verify each call site | implementer | open |
| RISK-ERR-004 | Existing tests assume throw behavior | H | M | H | Migrate per-module; use direct helper | implementer | open |
| RISK-ERR-005 | Sentry free tier saturates (5k/mo) | L | M | M | Sample 0.1; defer paid tier; alert at 80% | lead | open |
| RISK-ERR-006 | PII leaks via Sentry breadcrumbs | M | H | H | `beforeSend` scrub; maskAllText; Data Scrubbers | implementer | open |
| RISK-ERR-007 | Source maps accidentally published | L | C | H | CI gate verifies 404 on prod; never commit .map | implementer | open |
| RISK-ERR-008 | Dev log committed to git | L | M | M | `.gitignore` + pre-commit hook | implementer | open |
| RISK-ERR-009 | global-error POST itself fails | L | M | M | Best-effort fetch with `.catch(() => {})` | lead | open |
| RISK-ERR-010 | instrumentation.ts breaks build | L | H | H | Run sentry wizard first; verify build | implementer | open |
| RISK-ERR-011 | AI agent misinterprets log format | M | M | M | `--explain` produces English summary | lead | open |
| RISK-ERR-012 | Toast dedupe needed | M | L | M | Defer; revisit after user complaint | lead | deferred |
| RISK-ERR-013 | Plan drift between write + impl | M | M | M | Implementer re-reads; LOOP_LEDGER tracks | implementer | open |
| RISK-ERR-014 | Agent runtime still broken at impl time | M | M | M | All impl is direct; no agent required | lead | accepted |

## C. Rejected alternatives summary

| Decision | Rejected | Why |
|---|---|---|
| DEC-ERR-004 | Vercel Observability | Vercel-only; thinner alerting |
| DEC-ERR-004 | Datadog | Too expensive at pre-launch |
| DEC-ERR-004 | PostHog (for errors) | Analytics-first |
| DEC-ERR-004 | Full OTel SDK | Overkill; defer to scale |
| DEC-ERR-002 | Throw-only | Next.js docs say return for expected |
| DEC-ERR-002 | Tuple return | Non-idiomatic TS |
| DEC-ERR-003 | /tmp or home dir | Hard for AI agent to discover |
| DEC-ERR-005 | Trust Sentry alone | Dev file needs its own layer |
| DEC-ERR-005 | Hash route names too | Destroys diagnosability |
| DEC-ERR-007 | Let Next.js default handle | Bad UX + no logging |
| DEC-ERR-008 | Adopt Zod in this plan | Orthogonal; bloats scope |

## D. Open questions

| ID | Question | Owner | Resolution path |
|---|---|---|---|
| OPEN-001 | `/api/internal/client-error` rate limiter: Upstash Redis or in-memory in P5? | implementer | P5-WP7 |
| OPEN-002 | Dev logger also write to stdout for parity? | lead | P4-WP2 |
| OPEN-003 | Toast dedupe in P3 or deferred? | lead | Deferred (RISK-ERR-012) |
