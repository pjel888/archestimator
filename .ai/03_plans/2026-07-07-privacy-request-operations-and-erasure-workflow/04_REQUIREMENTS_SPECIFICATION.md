# 04 — Requirements Specification

> Stable IDs are append-only. Source-strength legend: `brief` (PROMPT.md), `repo evidence` (current source/migrations/tests), `official docs` (local Next.js / Cloudflare docs), `owner-delegated planning decision`, `derived`. Every requirement states what can go wrong, what the user sees, what the system records, and how the implementation proves it.

## State machine (the contract)

```
                 ┌──────────────────────────────────────────────┐
                 ▼                                              │
  submitted ──▶ in_triage ──▶ in_progress ──▶ completed         │
     │              │              │                            │
     │              │              └──────▶ rejected            │
     │              └───────────────┴──────▶ rejected           │
     │                                                             │
     └─ (identity_verified flag must be true before in_progress)  │
                                                                   │
  Allowed transitions (guard):                                     │
   submitted  -> in_triage | rejected    (operator only)           │
   in_triage  -> in_progress | rejected  (operator only; requires identity_verified) │
   in_progress-> completed | rejected    (operator only; requires fulfillment evidence for access/erasure) │
   completed/rejected are terminal. No reopen. New request = new row.              │
```

- `identity_verified` is a boolean column (new in `0037`). It is set true by either (a) the authenticated-requester fast path at intake, or (b) the operator confirming the token-verification loop completed for an anonymous requester.
- Transitions are enforced server-side in the repository (single source of truth), not only in the UI.

---

## FR — Functional requirements

### FR-1 — Intake accepts anonymous and authenticated requesters
- **Statement:** `POST /api/compliance/privacy-requests` accepts requests with no session (anonymous) and, when a valid session is present, records `requester_user_id` and marks `identity_verified = true`.
- **Rationale:** Anonymous intake is required (migration 0033 comment); authenticated users should skip the verification loop.
- **Source:** `repo evidence` (route.ts:42; repository lines 100–147), `brief`.
- **Priority:** P0. **Dependencies:** none. **Affected areas:** `route.ts`, `privacy-request-repository.ts`, migration `0037`.
- **Acceptance criteria:** `AC-FR-1a` anonymous POST with email returns 201 and `identity_verified=false`; `AC-FR-1b` authenticated POST sets `requester_user_id` and `identity_verified=true`; `AC-FR-1c` invalid kind/description return 400.
- **Validation:** unit/repository + route-handler test. **Risks:** session leak into anonymous path. **Status:** specified.

### FR-2 — Lifecycle transitions are state-machine-guarded
- **Statement:** The repository exposes `transitionStatus(id, to, actorUserId)` that allows only the transitions in the diagram, sets `triaged_at`/`resolved_at`/`triaged_by` appropriately, and refuses illegal transitions.
- **Rationale:** Lifecycle columns exist but are never written; no guard exists.
- **Source:** `repo evidence` (repository row model lines 38–55; statuses lines 17–24), `derived`.
- **Priority:** P0. **Dependencies:** migration `0037` (no schema change needed for the columns themselves; they exist). **Affected:** `privacy-request-repository.ts`.
- **Acceptance criteria:** `AC-FR-2a` `submitted→in_triage` sets `triaged_at`+`triaged_by`; `AC-FR-2b` `in_triage→in_progress` requires `identity_verified=true` else `ConflictError(409)`; `AC-FR-2c` `in_progress→completed` for `access`/`erasure` requires fulfillment evidence pointer else `409`; `AC-FR-2d` illegal transition returns `409` and does not mutate; `AC-FR-2e` terminal states reject further transitions.
- **Validation:** repository unit tests for each transition + denial. **Risks:** race on concurrent transitions (see DATA-3). **Status:** specified.

### FR-3 — Request detail + queue read endpoints exist
- **Statement:** `GET /api/compliance/privacy-requests` (list, operator-gated) and `GET /api/compliance/privacy-requests/[id]` (detail, operator-gated) return redacted rows (never raw email/IP/UA).
- **Rationale:** `listPrivacyRequests` has zero callers; no detail fetch exists.
- **Source:** `repo evidence` (repository lines 149–163), `derived`.
- **Priority:** P1. **Dependencies:** operator gate (OPS-1), FR-2. **Affected:** new routes.
- **Acceptance criteria:** `AC-FR-3a` non-operator gets `403`; `AC-FR-3b` list returns rows ordered `created_at DESC`, limited, with only redacted fields; `AC-FR-3c` detail returns 404 for unknown id, 403 for non-operator; `AC-FR-3d` response is `no-store`.
- **Validation:** route-handler tests with operator/non-operator fixtures. **Status:** specified.

### FR-4 — Export fulfillment produces a data package
- **Statement:** For an `access`/`portability` request in `in_progress`, an operator action generates an export package of the requester's data (scoped by `requester_user_id` when present), stores it in R2 (`ARCH_UPLOADS_R2`) under a request-scoped key, and records an evidence pointer.
- **Rationale:** No fulfillment path exists; export is the non-destructive fulfillment.
- **Source:** `brief` ("export/delete actions"), `derived`.
- **Priority:** P2. **Dependencies:** FR-2, FR-3, R2 binding, identity verified. **Affected:** new server action + repository function.
- **Acceptance criteria:** `AC-FR-4a` package generated only for `identity_verified=true` and `in_progress`; `AC-FR-4b` R2 object key is `privacy-exports/<requestId>/<uuid>.json`; `AC-FR-4c` evidence pointer (R2 key + sha256 + generated_at + generated_by) stored on the request; `AC-FR-4d` package contains only the requester's data (no cross-user leak).
- **Validation:** action test with seeded user data + R2 mock/proof. **Status:** specified.

### FR-5 — Erasure/anonymization fulfillment is dry-run + operator-confirmed (GATED)
- **Statement:** For an `erasure` request, an operator runs a **dry-run** that returns the would-be-affected rows/tables (per a counsel-approved scope list), then a separate **confirm** action performs the deletion/anonymization, records `data_retention_events`, and writes fulfillment evidence.
- **Rationale:** Erasure must not fire on an unverified or un-scoped request; must coexist with the retention cron.
- **Source:** `brief`, `repo evidence` (retention-core.ts), `owner-delegated planning decision` (`OPEN-ERASE-01`).
- **Priority:** P3. **Dependencies:** `OPEN-ERASE-01` resolved, FR-2, identity verified, backup snapshot recorded. **Affected:** new server action; reuses `data_retention_events` sink.
- **Acceptance criteria:** `AC-FR-5a` dry-run returns counts per table, no mutation; `AC-FR-5b` confirm requires a fresh dry-run token (single-use) and operator re-auth; `AC-FR-5c` confirm writes `data_retention_events` with `action ∈ {anonymized,purged}` and minimized metadata; `AC-FR-5d` confirm writes fulfillment evidence pointer; `AC-FR-5e` erasure scope is exactly the counsel-approved list (assertable in tests).
- **Validation:** action test with seeded data + D1 mock; dry-run/confirm denial tests. **Status:** specified but **gated** — not implementation-ready until `OPEN-ERASE-01`.

---

## IDENT — Identity verification

### IDENT-1 — Hashed-token email verification loop for anonymous requesters
- **Statement:** Intake with an email generates a single-use verification token (`crypto.randomUUID()`-strength), stores **only its hash** (`hashAccountSecurityValue`), and emails a verification link. Clicking the link sets `identity_verified=true`. Tokens expire (default 24h) and are single-use.
- **Rationale:** Erasure must not fire on an unverified anonymous request; mirrors magic-link discipline.
- **Source:** `brief` ("identity checks"), `repo evidence` (`account-audit.ts` hashing; `better-auth-cloudflare.ts` magic-link), `derived`.
- **Priority:** P0. **Dependencies:** migration `0037` (token columns), email client. **Affected:** repository, new verification route/action.
- **Acceptance criteria:** `AC-IDENT-1a` only the hash is stored (assert no raw token column); `AC-IDENT-1b` expired or reused token returns 410/409 and does not set verified; `AC-IDENT-1c` successful verify sets `identity_verified=true` and consumes the token; `AC-IDENT-1d` token bound to the request id (not reusable across requests).
- **Validation:** repository + route tests; raw-token-not-stored assertion in test. **Status:** specified.

### IDENT-2 — Authenticated-requester fast path
- **Statement:** When intake is called with a valid session, `identity_verified=true` and `requester_user_id` are set at intake; no email loop is sent.
- **Source:** `derived`, `repo evidence` (session.ts).
- **Priority:** P0. **Dependencies:** FR-1. **Acceptance:** `AC-IDENT-2a` authenticated intake has `identity_verified=true` and no token row. **Status:** specified.

---

## SLA — SLA timers (GATED on OPEN-LEGAL-02)

### SLA-1 — SLA clock model
- **Statement:** A `sla_due_at` column (new in `0037`) is computed when the request enters `in_triage` (default target = 30 days; configurable). The clock definition (start event, target, pause/resume rules) follows `OPEN-LEGAL-02`.
- **Source:** `brief` ("SLA timers"), `owner-delegated planning decision` (`OPEN-LEGAL-02`).
- **Priority:** P1 (column + compute) / P4 (breach). **Dependencies:** `OPEN-LEGAL-02` for final target + clock rules. **Acceptance:** `AC-SLA-1a` `sla_due_at` set on `submitted→in_triage`; `AC-SLA-1b` null before triage. **Status:** specified, target is owner-delegated default.

### SLA-2 — SLA breach detection + escalation (GATED)
- **Statement:** A daily check (cron or on-read) flags requests past `sla_due_at` as breached and notifies the escalation owner.
- **Source:** `brief`, `owner-delegated planning decision`. **Priority:** P4. **Dependencies:** `OPEN-LEGAL-02`. **Acceptance:** `AC-SLA-2a` breached request marked; `AC-SLA-2b` escalation notification sent (audit row). **Status:** gated.

---

## OPS — Operator queue

### OPS-1 — Operator gate
- **Statement:** All queue/detail/transition/fulfillment actions require `isPlatformAdminRole(role)` (closed-beta); reuse `beta-allowlist-admin.ts` pattern.
- **Source:** `repo evidence` (`beta-allowlist-admin.ts`), `owner-delegated planning decision` (`OPEN-OPS-01`).
- **Priority:** P1. **Acceptance:** `AC-OPS-1a` non-operator gets `403` on every operator surface; `AC-OPS-1b` operator sees queue. **Status:** specified.

### OPS-2 — Operator notes/history
- **Statement:** Operators can append notes to a request; every transition writes a history row (actor, from→to, timestamp, note).
- **Source:** `derived`. **Priority:** P1. **Dependencies:** migration `0037` (notes/history table). **Acceptance:** `AC-OPS-2a` notes append-only; `AC-OPS-2b` transition writes history row. **Status:** specified.

---

## EMAIL — Email

### EMAIL-1 — Confirmation email at intake (GATED copy on OPEN-LEGAL-01)
- **Statement:** Intake sends a confirmation email (when an email is provided) using `sendEmail` + circuit breaker; body references the request id and the workflow; copy follows `OPEN-LEGAL-01`.
- **Source:** `brief`, `repo evidence` (route.ts:101-104; `transactional-email-client.ts`).
- **Priority:** P1. **Dependencies:** `OPEN-LEGAL-01` for final copy. **Acceptance:** `AC-EMAIL-1a` email sent on intake when email present; `AC-EMAIL-1b` circuit-breaker open degrades silently (no 500 to intake); `AC-EMAIL-1c` no email sent when no email provided. **Status:** specified (copy gated).

### EMAIL-2 — Status-update emails on transition (GATED copy)
- **Statement:** On `completed`/`rejected` (and optionally `in_progress`), a status-update email is sent if an email is present and the requester opted in.
- **Priority:** P1. **Acceptance:** `AC-EMAIL-2a` transition triggers email; `AC-EMAIL-2b` opt-out respected. **Status:** specified (copy gated).

---

## EVID — Audit evidence

### EVID-1 — Every transition and fulfillment is audited
- **Statement:** Each transition writes a `privacy_request_events` row (new table in `0037`) with actor, from→to, timestamp, note, and minimized metadata; each fulfillment writes an evidence pointer (R2 key / sha256 / generated_by) and, for erasure, a `data_retention_events` row.
- **Source:** `brief` ("audit evidence"), `repo evidence` (`account_security_events` discipline; `data_retention_events`).
- **Priority:** P1 (events) / P2–P3 (fulfillment evidence). **Acceptance:** `AC-EVID-1a` transition creates event row; `AC-EVID-1b` fulfillment writes evidence pointer; `AC-EVID-1c` erasure writes retention event. **Status:** specified.

### EVID-2 — No raw personal data in evidence
- **Statement:** Email/IP/UA stored only as HMAC hashes; evidence pointers reference R2 keys, not raw payloads; logs never include raw email/IP/UA or raw tokens.
- **Source:** `brief` ("Do not store secrets or raw personal data in evidence"), `repo evidence` (hashing).
- **Priority:** P0 (cross-cutting). **Acceptance:** `AC-EVID-2a` test asserts no raw email/IP/UA/token in any stored column or log fixture. **Status:** specified.

---

## ABUSE — Abuse controls

### ABUSE-1 — Intake rate limit (D1 sliding window)
- **Statement:** Intake is rate-limited per `cf-connecting-ip` (and per email-hash when provided) via a D1 sliding window mirroring `ai/rate-limit.ts` (e.g. 5/min, 20/hour).
- **Source:** `repo evidence` (`ai/rate-limit.ts`), `derived`.
- **Priority:** P0. **Acceptance:** `AC-ABUSE-1a` over-limit returns `429`; `AC-ABUSE-1b` limit counted per-ip; `AC-ABUSE-1c` expired entries pruned. **Status:** specified.

### ABUSE-2 — Optional Turnstile (deferred)
- **Statement:** Turnstile is **not** added in closed-beta (no integration exists; `AGENTS.md` cost posture). Documented as a future control if abuse appears.
- **Source:** `derived`. **Priority:** deferred. **Acceptance:** `AC-ABUSE-2a` decision recorded with revisit trigger. **Status:** deferred-with-rationale.

---

## UX / A11Y / ARCH / SEC / TEST / DOC

### UX-1 — Requester status lookup
- **Statement:** A requester can look up their request status by id (+ the verification token for anonymous) without exposing other requests.
- **Priority:** P1. **Acceptance:** `AC-UX-1a` valid id+token returns status; `AC-UX-1b` unknown id returns 404 (no enumeration). **Status:** specified. (See `05` for full UX.)

### A11Y-1 — Operator queue is keyboard/screen-reader operable
- **Statement:** Queue and detail pages use semantic primitives (`src/components/ui/`), keyboard navigation, visible focus, live-region status updates.
- **Priority:** P1. **Acceptance:** `AC-A11Y-1a` keyboard path; `AC-A11Y-1b` accessible names; `AC-A11Y-1c` status changes announced. **Status:** specified. (Full matrix in `05`.)

### ARCH-1 — Server/Client boundary
- **Statement:** Queue/detail are Server Components reading via the repository; mutations are Server Actions; the smallest `"use client"` boundary is the interactive filter/detail UI.
- **Priority:** P1. **Status:** specified. (Detail in `06`.)

### SEC-1 — Authorization at server boundary, not only UI
- **Statement:** Every operator surface checks `isPlatformAdminRole` server-side; requester lookup checks token ownership server-side.
- **Priority:** P1. **Status:** specified. (Threat model in `08`.)

### TEST-1 — Anonymous + authenticated coverage
- **Statement:** Tests cover anonymous + authenticated intake, operator denial, identity verification, lifecycle transitions, fulfillment (export; erasure dry-run/confirm), abuse rate limit, and no-raw-data assertions.
- **Priority:** P0–P3. **Status:** specified. (Matrix in `12`.)

### DOC-1 — Privacy notice links the workflow (GATED)
- **Statement:** Once `OPEN-LEGAL-01` resolves, `src/app/privacy/page.tsx` links to the request workflow instead of "email support."
- **Priority:** P0-T4. **Status:** gated. (Detail in `13`.)

---

## Shadow-path matrices

### Matrix S1 — Intake (`POST /api/compliance/privacy-requests`)

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Anonymous intake | 201 + id | 400 (no kind/desc) | 400 (empty desc) | 400 (bad kind; desc >4000) | N/A (anonymous) | 500 opaque (D1 down) | unique id per call (UUID) | duplicate creates new row (intentional) | "recorded" + id | PC-01 |
| Authenticated intake | 201 + id + verified=true | as above | as above | as above | N/A (session optional) | 500 opaque | as above | as above | "recorded" | PC-02 |
| Rate-limited | 429 after limit | N/A | N/A | N/A | N/A | N/A | counter race (D1 atomic) | 429 retry-after | "too many requests" | PC-03 |

### Matrix S2 — Identity verification

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Verify token | 200, verified=true | 400 (no token) | 410 (expired) | 409 (reused) | N/A (token is bearer) | 500 opaque | single-use (consume atomically) | second use → 409 | "verified" | PC-04 |

### Matrix S3 — Operator transition

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Transition | 200 + event row | 400 (no id/to) | 404 (unknown id) | 409 (illegal transition; unverified) | 403 (non-operator) | 500 opaque | row lock / CAS on status | same legal transition twice → second is no-op or 409 | "updated" | PC-06 |

### Matrix S4 — Export fulfillment

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Export | 200 + evidence pointer | 400 | 404 (unknown user) | 409 (not in_progress/unverified) | 403 | R2 write fail → 500 + no partial | single evidence pointer per request | re-run overwrites evidence pointer | "export ready" | PC-09 |

### Matrix S5 — Erasure (dry-run/confirm)

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Dry-run | 200 + per-table counts | 400 | empty counts (no data) | 409 (unverified) | 403 | D1 read fail → 500 | read-only (safe) | idempotent | "N rows across M tables" | PC-11 |
| Confirm | 200 + retention event + evidence | 400 (no dry-run token) | 409 (stale token) | 409 (scope changed) | 403 | partial delete → fix-forward via retention cron | single-use token | confirm twice → second 409 | "erased" | PC-12 |

---

## Open decisions

| ID | Decision | Owner | Deadline/trigger | Effect if unresolved | Source |
|---|---|---|---|---|---|
| `OPEN-LEGAL-01` | Privacy-notice wording sign-off | Owner/legal | Before public form + email body | Form/email copy stays generic; `DOC-1` blocked | `repo evidence` (privacy-notice-draft.md) |
| `OPEN-LEGAL-02` | SLA policy (target, clock start, escalation) | Owner/legal | Before `P4` | `P4` blocked; `SLA-1` uses 30-day default | `brief` |
| `OPEN-ERASE-01` | Erasure scope vs retention/legal-hold | Owner/legal | Before `P3` | `P3` blocked | `repo evidence` (retention-core.ts) |
| `OPEN-OPS-01` | Operator role (reuse platform-admin vs new DPO role) | Owner | Before `P1-T2` | `P1` reuses platform-admin (recommended) | `repo evidence` (roles.ts) |

## Source-strength summary

| Category | Source-strength pattern |
|---|---|
| Intake/lifecycle/data-model | `repo evidence` (strong) |
| Identity verification | `repo evidence` (pattern) + `derived` |
| SLA | `brief` + `owner-delegated planning decision` (target) |
| Erasure scope | `repo evidence` (retention) + `owner-delegated planning decision` |
| Email | `repo evidence` (client) + `brief` |
| Operator gate | `repo evidence` (`beta-allowlist-admin.ts`) |
| Abuse | `repo evidence` (`ai/rate-limit.ts`) + `derived` |
