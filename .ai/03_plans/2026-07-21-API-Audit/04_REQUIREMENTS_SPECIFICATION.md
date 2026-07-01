# 04 — Requirements Specification

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Verification mode: `emulated`

## REQ-* ID assignment

Every requirement has a stable ID, statement, rationale, source, priority, dependencies, acceptance criteria, validation method, affected code areas, risks, and status. See `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` for the cross-reference to WP-* / AC-* / TEST-* / evidence.

### REQ-API-* (API contract)

| ID | Requirement | Source | Priority | AC | Validation | Affected surfaces |
|---|---|---|---|---|---|---|
| REQ-API-001 | Every API-bearing surface (29 Route Handlers + 30 Server Action files + Better Auth catch-all + DO RPC) is named in `03_*.md` with file:line evidence | SRC-008 | P0 | AC-001 | `03_*.md` inventory diff vs `find src/app -name 'route.ts'` | All |
| REQ-API-002 | Every Route Handler returns a stable error envelope `{ok: boolean, data: T ⏐ null, error: E ⏐ null}` | `06_*.md` decision | P0 | AC-002 | grep for envelope pattern + DOM test per handler | 29 route handlers |
| REQ-API-003 | Every Server Action returns a typed DTO (no raw throw) | `06_*.md` decision | P0 | AC-003 | code-review + DOM test per action | 30 server action files |
| REQ-API-004 | Every mutation (Server Action or Route Handler) is idempotent under duplicate submit (idempotency key OR conditional update OR transactional guard) | SRC-008 | P0 | AC-004 | adversarial duplicate-submit test | mutation handlers |
| REQ-API-005 | Every API surface has a defined timeout (D1 query, R2 GET, Email send, outbound fetch) | SRC-010, SRC-007 | P1 | AC-005 | observability budget + code review | All |
| REQ-API-006 | Every API surface has a defined retry cap with exponential backoff (NOT infinite) | SRC-013, SRC-014 | P1 | AC-006 | code review + queue DLQ alert | All |
| REQ-API-007 | Internal `/api/internal/*` routes reject unauthenticated calls (require `CRON_SECRET` or `UPLOAD_*_JOB_SECRET`) | SRC-006 | P0 | AC-007 | denial test | 4 internal routes |
| REQ-API-008 | `/api/share/[token]/*` mutations require (a) valid token, (b) password gate when set, (c) rate limit, (d) idempotent unsubscribe | SRC-007 | P0 | AC-008 | role-matrix + token-enumeration rate-limit test | 8 share routes |
| REQ-API-009 | Direct upload (`/api/component-library/attachments/direct-upload`) mints scoped signed URLs authorizing ONLY the requesting user's workspace | SRC-007 | P0 | AC-009 | cross-workspace denial test | direct-upload route |
| REQ-API-010 | AI routes (`/api/ai/ask`, `/api/ai/package-builder`) gate behind feature flag + require authenticated session + audit log to D1 (migration 0006) | SRC-008 | P1 | AC-010 | flag-off denial test + flag-on audit-row test | 2 AI routes |

### REQ-SEC-* (security / privacy)

| ID | Requirement | Source | Priority | AC | Validation | Affected surfaces |
|---|---|---|---|---|---|---|
| REQ-SEC-001 | Every D1 prepared statement is scoped by `workspace_id` or `owner_id` (D1 has no RLS — app code enforces) | SRC-017 | P0 | AC-011 | per-table access-path matrix from `cf:d1-authz-matrix` output | All D1 access |
| REQ-SEC-002 | Every Server Action verifies (a) Better Auth session, (b) ownership of mutated resource, (c) zod validation at top, (d) DTO return | SRC-008 | P0 | AC-012 | action-by-action verdict table | 30 Server Action files |
| REQ-SEC-003 | Credential-material taxonomy separates (a) session cookie, (b) OAuth state, (c) magic-link token, (d) share token (hashed vs raw), (e) invite token (hashed vs raw), (f) WebSocket ticket, (g) R2 signed URL, (h) CSRF token | SRC-001 | P0 | AC-013 | taxonomy table in `08_*.md` with rotation/revocation per material | auth, share, invite, DO, R2 |
| REQ-SEC-004 | No `NEXT_PUBLIC_` secret leaks (secrets only via `cloudflare-env.d.ts` CloudflareEnv binding) | SRC-001, SRC-002 | P0 | AC-014 | grep + build bundle analysis | All client code |
| REQ-SEC-005 | No raw Error messages leak to clients (stack traces, internal paths) from Route Handlers | SRC-008 | P1 | AC-015 | error-path test | All handlers |
| REQ-SEC-006 | WAF / rate-limit posture is an explicit decision (`OPEN-003`); if WAF is enabled, every public endpoint has a rate-limit rule or trusted-IP allowlist | SRC-006, SRC-007 | P1 | AC-016 | WAF ruleset review OR rate-limit absence justification | All public endpoints |
| REQ-SEC-007 | `BETTER_AUTH_TRUSTED_ORIGINS` is parsed as an exact-match list (no wildcard) for CSRF posture | SRC-002, SRC-011 | P0 | AC-017 | code review + bad-origin denial test | Better Auth |
| REQ-SEC-008 | Better Auth ratelimiter storage is D1 (not KV — KV is eventual), with bounded window per IP/email | SRC-011 | P1 | AC-018 | adapter readback + sample test | Better Auth |
| REQ-SEC-009 | No outbound fetch to user-controllable URL without SSRF guard (allowlist + dns resolution + private-IP block) | SRC-010 | P1 | AC-019 | SSRF test on every outbound fetch | location-actions, AI |
| REQ-SEC-010 | WebSocket upgrade requires a signed ticket (not anonymous); ticket minted after Better Auth session validation; rate-limited per session | SRC-012 | P0 | AC-020 | anonymous WS denial test + rate-limit test | DO collaboration |
| REQ-SEC-011 | DMARC posture is an explicit decision (`OPEN-006`); if external recipients are supported, target `p=reject` | FAST PATH `current-state.md:74` | P2 | AC-021 | DNS readback | Email |
| REQ-SEC-012 | R2 object keys do NOT embed PII; keys are opaque IDs or workspace-prefixed paths | SRC-007 | P1 | AC-022 | object key inventory + policy review | R2 |

### REQ-DATA-* (database / data)

| ID | Requirement | Source | Priority | AC | Validation | Affected surfaces |
|---|---|---|---|---|---|---|
| REQ-DATA-001 | Every D1 migration (29 files) is reviewed for table tenant-scope columns, indexes on `workspace_id`, and grant posture | SRC-016, SRC-017 | P0 | AC-023 | per-table access-path matrix from `cf:d1-authz-matrix` + `cf:d1-rpc-map` | D1 migrations |
| REQ-DATA-002 | Every D1 prepared statement / RPC-equivalent has an `EXPLAIN` proof that it uses the expected index under canonical cardinality | SRC-019 | P1 | AC-024 | `cf:d1-performance-proof` artifacts | D1 hot paths |
| REQ-DATA-003 | Every D1 write is wrapped in a transaction (batch) when atomicity matters | SRC-019 | P1 | AC-025 | code review on every mutation path | All writes |
| REQ-DATA-004 | D1 backups / restore are proven via `cf:d1-restore-rehearsal` and documented in `13_*.md` | SRC-019, FAST PATH | P1 | AC-026 | restore rehearsal artifact | D1 |

### REQ-PERF-* (performance)

| ID | Requirement | Source | Priority | AC | Validation | Affected surfaces |
|---|---|---|---|---|---|---|
| REQ-PERF-001 | Every API surface has a defined p50/p95 budget (D1 ≤600ms, R2 ≤2s for signed-URL mint, Email send ≤10s, DO RPC ≤500ms) | FAST PATH `current-state.md:81-84` | P1 | AC-027 | `cf:d1-runtime-performance-proof` artifacts | All |
| REQ-PERF-002 | Durable Object WebSocket hibernation via `alarm()` is verified — WS keep-alive billing is bounded | SRC-012 | P1 | AC-028 | DO code review | DO |
| REQ-PERF-003 | Queue consumer batch processing time is under the 30s timeout in the worst case | SRC-014 | P1 | AC-029 | benchmark | Queue |
| REQ-PERF-004 | Cron job runtime is bounded; overlap protection is in app code (not Worker runtime) | SRC-013 | P1 | AC-030 | cron overlap test | Cron |

### REQ-REL-* (reliability)

| ID | Requirement | Source | Priority | AC | Validation | Affected surfaces |
|---|---|---|---|---|---|---|
| REQ-REL-001 | Every API surface has a defined failure mode (timeout, retry, fallback) | SRC-013, SRC-014 | P1 | AC-031 | failure-injection test (per surface) | All |
| REQ-REL-002 | DLQ (`archestimator-upload-jobs-dlq`) has an alert when messages appear (Workers Observability or scheduled scan) | SRC-015 | P1 | AC-032 | alert test | Queue |
| REQ-REL-003 | Workers Observability sampling (`head_sampling_rate: 0.1`) is sufficient for P0 forensic visibility (`OPEN-002`) | SRC-003 | P1 | AC-033 | observability dashboard readback | All |
| REQ-REL-004 | Cron `console.log` is replaced with structured-logger pattern OR intentional `console.log` is justified | SRC-003 | P2 | AC-034 | code review | Cron |

### REQ-OPS-* (operations)

| ID | Requirement | Source | Priority | AC | Validation | Affected surfaces |
|---|---|---|---|---|---|---|
| REQ-OPS-001 | Every API surface has documented rollback steps (`13_*.md`) | `13_*.md` | P1 | AC-035 | rollback runbook present | All |
| REQ-OPS-002 | Every new binding / env var addition is reflected in `cloudflare-env.d.ts` via `bun run cf:typegen` | SRC-001, SRC-002 | P1 | AC-036 | typegen diff review | Worker |
| REQ-OPS-003 | Every new D1 migration is paired with a rollback SQL script (drop / recreate / data restore) | SRC-016 | P1 | AC-037 | migration review | D1 |
| REQ-OPS-004 | Feature flag changes (AI, beta) are config-only; no code deploy required to flip | SRC-010 | P2 | AC-038 | config review | AI surfaces |

### REQ-TEST-* (testing)

| ID | Requirement | Source | Priority | AC | Validation | Affected surfaces |
|---|---|---|---|---|---|---|
| REQ-TEST-001 | Every REQ-API-* has a Vitest DOM test or Playwright E2E test | `12_*.md` | P0 | AC-039 | Test Execution Matrix in `12_*.md` | All |
| REQ-TEST-002 | Every REQ-SEC-* has a denial test (auth denied, ownership denied, cross-workspace denied) | `12_*.md` | P0 | AC-040 | role-matrix test inventory | Security surfaces |
| REQ-TEST-003 | Pre-existing RED tests (~131 / 36 files) are triaged against API surfaces in `12_*.md` | SRC-018 | P1 | AC-041 | RED test ledger | Test suite |
| REQ-TEST-004 | UltraQA adversarial scenario matrix is defined in `19_*.md` covering malformed input, oversized payloads, unusual Unicode, path traversal, prompt injection, unauthorized/cross-workspace, duplicate submit, concurrent writes, stale cache, network timeout, retry-after-partial-success, cancellation, dirty worktree/concurrent-agent safety, hung commands, misleading success output | `19_*.md` | P0 | AC-042 | matrix present + at least 1 sample row per scenario | All |
| REQ-TEST-005 | Performance evaluator contract (baseline, target, fixture size, sample count, regression threshold, evidence artifact) is defined for hot paths | `09_*.md` | P1 | AC-043 | contract present per hot path | Hot paths |

### REQ-DOC-* (documentation)

| ID | Requirement | Source | Priority | AC | Validation | Affected surfaces |
|---|---|---|---|---|---|---|
| REQ-DOC-001 | README root file stack description is updated to Cloudflare-only (or explicit migration-archaeology note added) | FAST PATH, SRC-018 | P2 | AC-044 | README diff | README |
| REQ-DOC-002 | Every stable ID (REQ-* / WP-* / AC-* / TEST-* / RISK-* / DEC-* / GATE-* / OPEN-* / SRC-*) appears consistently across the audit pack | `16_*.md` | P0 | AC-045 | cross-doc reference scan | All |

### REQ-A11Y-* (accessibility of error states returned to clients)

| ID | Requirement | Source | Priority | AC | Validation | Affected surfaces |
|---|---|---|---|---|---|---|
| REQ-A11Y-001 | Error states returned to clients follow WCAG 2.2 AA alert/role semantics when rendered in UI | `05_*.md` | P2 | AC-046 | DOM a11y test on error-rendered components | Client error UI |
| REQ-A11Y-002 | Toast / banner surfaces announce error state change to screen readers (live region) | `05_*.md` | P2 | AC-047 | RTL live-region assertion | Toast / banner |

### REQ-ARCH-* (architecture)

| ID | Requirement | Source | Priority | AC | Validation | Affected surfaces |
|---|---|---|---|---|---|---|
| REQ-ARCH-001 | D1 access is centralized in one repository module for per-table access-path scoping | `06_*.md` | P0 | AC-048 | code review + import graph | D1 |
| REQ-ARCH-002 | Server Action manifest auto-generated from `"use server"` exports (or manually maintained ledger) | `06_*.md` | P2 | AC-049 | manifest diff vs `grep` | Server Actions |

### REQ-AI-* (AI surfaces, feature-flagged)

| ID | Requirement | Source | Priority | AC | Validation | Affected surfaces |
|---|---|---|---|---|---|---|
| REQ-AI-001 | AI routes (`/api/ai/ask`, `/api/ai/package-builder`) audit log to D1 migration 0006 (`ai_audit_rate_limits`) on every call | SRC-008 | P1 | AC-050 | audit-row presence test | 2 AI routes |
| REQ-AI-002 | AI routes reject calls when feature flag is off (no hidden backdoor) | SRC-008 | P1 | AC-051 | flag-off denial test | 2 AI routes |
| REQ-AI-003 | AI outbound calls (DeepSeek or Cloudflare AI) include SSRF guard and timeout | SRC-010 | P1 | AC-052 | SSRF test | AI routes |

## Shadow Path Matrix

Per Multi-Agent-Execution-Directive §7 + Creating-Plan-Prompt.md §10 Shadow Path Matrix mandate. Each user-facing flow, API call, Server Action, RPC, migration, background job, or external integration gets a row covering happy path + nil/missing + empty + invalid + auth denied + upstream/network error + concurrency/race + retry/idempotency + user-visible result + test.

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Project list (GET /workshop/projects) | 200 OK with project summaries | 400 / 422 — `projectId` missing | 200 OK with empty list | 422 for bad filters | 401 unauthenticated | 503 on D1 timeout with retry | OK — read-only | Not applicable | Project list renders | TEST-API-001 |
| Project create (Server Action) | 201 with new projectId | 422 zod | n/a | 422 zod | 401 unauthenticated | 503 with bounded retry | duplicate submit guard (idempotency key) | idempotency key | Project appears in list | TEST-API-002 + TEST-SEC-001 |
| Project delete (Server Action) | 200 + archived | 422 missing projectId | n/a | 422 bad id | 401 unauthenticated or 403 not owner | 503 | concurrent delete race — last-writer-wins or 409 | idempotency: second delete returns 200 (no-op) or 404 | Project disappears | TEST-API-003 + TEST-SEC-002 |
| Estimate row CRUD (Server Action) | 200 / 201 | 422 missing fields | OK for empty group | 422 zod | 401 / 403 not workspace member | 503 | optimistic + rollback on conflict | idempotency key for write actions | Row updates in tree | TEST-API-004 + TEST-SEC-003 |
| Component library CRUD | 200 / 201 | 422 | OK for empty | 422 zod | 401 / 403 | 503 | concurrent edit — last-writer-wins or guard | idempotency key | Component appears | TEST-API-005 |
| Direct-upload mint (Route Handler) | 200 with scoped signed URL | 422 missing metadata | n/a | 422 invalid content-type | 401 unauthenticated | 503 R2 unavailable | duplicate mint — same URL returned within TTL | NOT idempotent (TTL-bounded) | Client uploads to R2 | TEST-API-006 + TEST-SEC-004 |
| Excel export (Route Handler) | 200 with .xlsx download | 422 missing estimateId | n/a for empty estimate (export empty tree) | 422 bad estimateId | 401 / 403 | 503 | single-flight lock (key: estimateId) | not retried; user clicks again | File downloads | TEST-API-007 |
| Share-token view (Route Handler) | 200 with snapshot | n/a | n/a | 401 invalid token | 401 invalid/expired token | 503 | concurrent decision — last-writer-wins or guard | idempotent unsubscribe | Snapshot renders | TEST-API-008 + TEST-SEC-005 |
| Share-token comment mutation | 200 with commentId | 422 missing body | 422 empty body | 422 zod | 401 invalid token | 503 | concurrent comment — append OK | idempotency key | Comment appears | TEST-API-009 + TEST-SEC-006 |
| Share-token decision mutation | 200 + status | 422 missing decision | n/a | 422 zod (accept/reject/open) | 401 invalid token | 503 | concurrent decision — last-writer-wins | idempotent (re-decide overwrites) | Status badge updates | TEST-API-010 |
| Better Auth sign-in (Server Action + Route Handler) | 200 with session cookie | 422 | n/a | 422 zod | 401 invalid credentials | 503 (Better Auth idp) | concurrent sign-in — new session issued | rate-limited per IP/email | User redirected to /workshop | TEST-AUTH-001 + TEST-SEC-007 |
| Better Auth OAuth callback | 200 with session | 422 missing code | n/a | 422 bad state | 401 invalid state | 503 | state CSRF guard | one-shot state | User redirected | TEST-AUTH-002 |
| Invite accept (Route Handler) | 200 with joined workspace | 422 missing token | n/a | 422 invalid token | 401 invalid/expired token | 503 | concurrent accept — idempotent | idempotent (already-joined → 200) | Workspace joined | TEST-API-011 + TEST-SEC-008 |
| Cron upload-cleanup | OK | n/a | n/a OK | n/a | 401 missing CRON_SECRET | 503 on R2 | overlap guard (next-run skipped if previous still running) | idempotent (cleanup is delete-by-key) | Console log + metrics | TEST-CRON-001 |
| Queue upload-job consumer | OK | n/a | n/a OK | n/a OK | n/a (internal) | 503 on R2 | per-message dedup key | at-least-once + dedup | Internal result logged | TEST-QUEUE-001 |
| DO CollaborationRoom WS | OK connection | n/a | n/a | 400 invalid message | 401 missing WS ticket | ws close on idle/timeout | per-session cursor rate limit | best-effort cursor (not transactional) | Cursor visible to peers | TEST-DO-001 + TEST-SEC-009 |
| Email send (collaboration invite / publication share) | OK | 422 missing email | n/a | 422 bad email | 401 unauthenticated | 503 on EMAIL binding | rate-limit per recipient | idempotent: same `inviteId` does not re-send | Recipient receives email | TEST-EMAIL-001 |
| AI ask (feature-flagged) | 200 with response | 422 missing prompt | n/a | 422 oversized prompt | 401 / 403 feature flag off | 503 on AI provider | per-session rate limit | not retried | Response renders (or hidden) | TEST-AI-001 + TEST-AI-002 |
| AI package builder (feature-flagged) | 200 with draft suggestions | 422 missing project context | n/a | 422 oversized | 401 / 403 | 503 on AI provider | per-session rate limit | not retried | Draft appears in estimate | TEST-AI-003 |
| Internal /api/internal/upload-cleanup | OK | n/a | n/a OK | n/a | 401 missing CRON_SECRET | 503 on D1/R2 | one-shot per cron | idempotent (cleanup) | Internal success | TEST-INTERNAL-001 + TEST-SEC-010 |
| Internal /api/internal/upload-scan | OK | n/a | n/a OK | n/a | 401 missing UPLOAD_SCAN_JOB_SECRET | 503 on R2 | one-shot | idempotent (scan) | Internal success | TEST-INTERNAL-002 |

## Status legend

- `pending` — not yet audited
- `audit-in-progress` — being audited in this pack
- `audited` — audit finding landed in downstream doc (cite finding doc)
- `blocked` — blocked on OPEN-* decision
- `deferred` — explicitly deferred to a future implementation plan

All REQ-* above are status `audit-in-progress` at this pack's open. Final status is recorded in `17_FINAL_READINESS_REVIEW.md`.