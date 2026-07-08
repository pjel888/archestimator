# 04 — Requirements Specification

Every requirement has a stable ID, rationale, source, priority, dependencies,
acceptance criteria, validation method, affected code areas, risks, and status.
Source-strength legend: `brief` (PROMPT.md), `repo evidence` (current source),
`official docs`, `derived`, `owner-delegated`. Priorities: P0 (must before launch),
P1 (should before broad launch), P2 (nice-to-have/hardening).

## Requirement index

| ID | Category | Priority | Title | Source strength |
|---|---|---|---|---|
| REQ-MATRIX-01 | TEST | P0 | Complete authz decision table covers every route/action | brief + repo evidence |
| REQ-TENANT-01 | SEC | P0 | Workspace isolation enforced on every authenticated read/write | repo evidence |
| REQ-CSRF-01 | SEC | P0 | Invite origin gate does not fail open on stripped headers | repo evidence (SEC-01) |
| REQ-RATE-01 | SEC | P0 | Durable rate limiting on auth-sensitive public surfaces | repo evidence |
| REQ-RATE-02 | SEC | P1 | Estimate mutation rate limit is globally effective | repo evidence (SEC-03) |
| REQ-RATE-03 | SEC | P1 | Edge-level / WAF abuse protection decision | owner-delegated (SEC-02) |
| REQ-NEG-01 | TEST | P0 | Negative/denial test for every mutation path | brief |
| REQ-NEG-02 | TEST | P1 | Cross-tenant isolation behavioral tests for read repositories with gaps | repo evidence |
| REQ-IDEMP-01 | API | P1 | Idempotency/dedup on replayable mutation surfaces | repo evidence |
| REQ-BODY-01 | SEC | P1 | Pre-parse body-size cap on public JSON POSTs | repo evidence (SEC-06) |
| REQ-VALID-01 | SEC | P2 | Centralized input validation decision (zod adoption or documented hand-rolled standard) | repo evidence (SEC-06) |
| REQ-CSP-01 | SEC | P1 | CSP hardening roadmap (nonce pipeline, enforce on workshop/auth) | repo evidence (SEC-07) |
| REQ-DOCS-01 | DOC | P0 | Single current authz matrix artifact (this pack) | brief |
| REQ-DOCS-02 | DOC | P1 | Stale June audit marked superseded | brief |
| REQ-DEFENSE-01 | SEC | P1 | Authz enforced at action boundary consistently (defense-in-depth; SEC-05/11) | repo evidence |
| REQ-DO-01 | OPS | P0 | WebSocket upgrade DoS mitigation for CollaborationRoom | repo evidence (SEC-04) |
| REQ-DOC-03 | DOC | P2 | R2 signed-URL invariant + origin-source reconciliation (SEC-09/10) | repo evidence (audit correction) |
| REQ-SECRET-01 | SEC | P0 | No raw credentials stored; rotation invalidates sessions | repo evidence (verified strong) |
| REQ-RELEASE-01 | OPS | P0 | Release gate checklist before first external user | brief |

---

## REQ-MATRIX-01 — Complete authz decision table
- **Statement:** Every API route handler and Server Action in the live runtime has a
  recorded verdict (auth / authz / validation / rate-limit / test) in Doc 03.
- **Rationale:** The brief requires an endpoint inventory + decision table; without it,
  no gap analysis is possible.
- **Source:** brief + repo evidence.
- **Priority:** P0.
- **Acceptance:** Doc 03 Section B/H enumerate all 33 route files with file:line and
  verdicts (✅ proven); Server Actions are inventoried at the **domain + authz-pattern**
  level in Section D, NOT as per-export file:line rows (there are 30 `"use server"`
  modules across 15 subdirs exporting ~162 functions — see Doc 03 §I honest scope note).
- **Validation:** static review of Doc 03 against `find src/app -name route.ts` (33) and
  `rg -l '"use server"' src/` (30 modules).
- **Affected:** this pack only.
- **Status:** ⚠️ **PARTIAL** — routes fully proven; actions covered at domain-pattern
  level (gate per domain identified + tested), but per-export file:line verdicts are out
  of scope for this refresh (separate deliverable). Corrected from earlier "✅ proven"
  during the Improve-Plan-Prompt audit (Doc 20 ADV-07).

## REQ-TENANT-01 — Workspace isolation
- **Statement:** Every authenticated read/write is scoped by a session-derived
  `workspaceId` and a D1 membership probe before any data is returned or mutated.
- **Acceptance:** No authenticated route/action returns or mutates data without a
  `canAccess*`/`canEdit*`/`getCurrentWorkspaceProject*`/equivalent SQL-scope gate.
  Cross-tenant denial tests pass.
- **Validation:** Doc 03 verdicts + `d1-access-role-boundaries.test.ts`,
  `workspace-repository-authz-*.test.ts`.
- **Status:** ✅ verified met; coverage gaps in REQ-NEG-02.

## REQ-CSRF-01 — Invite origin gate (SEC-01)
- **Statement:** `isAllowedInviteOrigin` must not return `true` when both `Origin` and
  `Referer` are absent for a state-changing invite POST.
- **Rationale:** The current `return true` on double-absence (`invite-origin.ts:39`) is
  the documented CSRF defense for `/invite/[token]/accept` POST and `/sign-out`; a
  cross-site request with headers stripped bypasses it. Mitigated by `SameSite=Lax`
  session cookie + Better-Auth session requirement, but defense-in-depth demands the
  origin check hold.
- **Acceptance:** (a) Origin check fails closed (deny) on absent Origin+Referer for POST,
  OR (b) documented owner decision to rely on SameSite=Lax + session, with the
  dependency recorded. GET (redirect) may remain permissive.
- **Validation:** extend `invite-accept-origin.test.ts` to assert denial on stripped
  headers (currently asserts `true`).
- **Affected:** `src/lib/collaboration/invite-origin.ts:39`; test.
- **Status:** ❌ gap (SEC-01, MED defense-in-depth — severity unified across all docs per Doc 20 ADV-09). Remediation task in Doc 11.

## REQ-RATE-01 — Durable rate limiting on public surfaces
- **Statement:** Every auth-sensitive public surface (publication password, session,
  comment, decision, events, unsubscribe, snapshot, activity, privacy intake, invite
  accept/continue, AI ask) uses the durable D1 limiter (not in-memory).
- **Acceptance:** Doc 03 rate-limit column shows D1 durable for all public surfaces.
- **Validation:** existing lockout/limit tests.
- **Status:** ✅ verified met.

## REQ-RATE-02 — Estimate mutation global rate limit (SEC-03)
- **Statement:** The estimate mutation rate limit (`assertEstimateActionRateLimit`)
  must be globally effective across Worker isolates, OR complemented by an edge/D1 limit.
- **Rationale:** In-memory `Map` is per-isolate; the highest-volume authenticated
  mutation surface has no real abuse throttle today.
- **Acceptance:** Either migrate to durable D1 limiter (like publication surface) or add
  an edge/WAF rule for estimate mutation endpoints; behavioral test proves a cross-isolate
  cap.
- **Validation:** new test simulating two isolates; or edge rule proof.
- **Affected:** `src/lib/estimates/action-rate-limit.ts:38`; possibly `wrangler.jsonc`.
- **Status:** ❌ gap (SEC-03, MED).

## REQ-RATE-03 — Edge/WAF abuse protection (SEC-02)
- **Statement:** An owner decision on whether to enable Cloudflare WAF/rate-limiting
  (free-tier compatible) in front of auth-sensitive routes before broad launch.
- **Rationale:** All current limiting is app-level; a parallel attacker can consume
  Worker/D1 quota first. Free-tier WAF rules can mitigate cheaply.
- **Acceptance:** Documented decision + (if approved) `wrangler.jsonc` `rules`/WAF
  config + proof.
- **Validation:** `wrangler.jsonc` diff + provider proof.
- **Status:** ❌ owner-delegated (SEC-02, HIGH-for-broad-launch, MED-for-closed-beta).

## REQ-NEG-01 — Negative tests for every mutation
- **Statement:** Every mutation path (route POST/DELETE/PATCH/PUT + Server Action write)
  has at least one denial test (unauthenticated, unauthorized/cross-tenant, invalid input).
- **Acceptance:** Test execution matrix in Doc 12 maps every mutation to a denial test.
- **Validation:** `bun run test` focused files.
- **Status:** ⚠️ partial — strong for estimates/library/publication/collaboration; gaps
  in REQ-NEG-02.

## REQ-NEG-02 — Cross-tenant read-repository denial tests
- **Statement:** Add behavioral cross-workspace denial tests for read repositories that
  currently rely only on the upstream `getCurrentWorkspaceProject` gate: project
  activity feed, project charts, publisher activity, notifications repository.
- **Acceptance:** New test files asserting cross-workspace outsider gets empty/denied.
- **Status:** ❌ gap (coverage, MED).

## REQ-IDEMP-01 — Idempotency on replayable mutations
- **Statement:** Non-bulk mutations that are replayable on double-submit (e.g. project
  create, component create, invite create) either document acceptable replay semantics
  or add a client `mutationId`/server unique constraint.
- **Status:** ⚠️ partial — bulk flows + estimate rows have idempotency; most creates do not.

## REQ-BODY-01 — Pre-parse body cap on public JSON POSTs (SEC-06)
- **Statement:** Public share POSTs that call `request.json()` apply a size cap before
  parse (mirroring the privacy intake pattern).
- **Status:** ❌ gap (LOW–MED).

## REQ-VALID-01 — Centralized validation decision (SEC-06)
- **Statement:** Owner decision: adopt zod at trust boundaries, OR codify the hand-rolled
  validation standard (the `readRequiredText`/`isUuid`/regex helpers) as a documented
  contract with a lint/test guard.
- **Status:** ❌ owner-delegated (P2).

## REQ-CSP-01 — CSP hardening roadmap (SEC-07)
- **Statement:** Plan to (a) introduce per-request nonces, (b) drop `'unsafe-inline'`/
  `'unsafe-eval'`, (c) enforce CSP on `/workshop` and `/api/auth` before broad launch.
- **Status:** ❌ roadmap (P1, broad-launch).

## REQ-DOCS-01 — Single current authz matrix
- **Status:** ✅ this pack.

## REQ-DOCS-02 — Mark June audit superseded
- **Statement:** The June audit README gets a guardrail noting it is superseded by this
  refresh for the authz matrix; retain it as migration archaeology.
- **Status:** ❌ doc task (P1). Note: the June README already has a 2026-06-18 status
  guardrail; this refresh adds the specific supersession pointer.

## REQ-DEFENSE-01 — Action-boundary authz consistency (SEC-05/11)
- **Statement:** Audit Server Actions that enforce authz only at the repository/caller
  layer rather than at the action boundary. Confirmed instances:
  (a) `loadRecipientProposals` (`src/lib/recipient-proposals/actions.ts:8`) — repo-layer
  `getCurrentUserContext`; (b) `maybeTriggerSharedLinkActivityDigest`
  (`src/lib/publication/actions.ts:1968`) — caller-authorized (comment/decision routes).
  Add action-layer guards or document+contract-test the dependency.
- **Status:** ❌ gap (LOW–MED). SEC-11 added during audit (Doc 20 ADV-08).

## REQ-DOC-03 — R2 signed-URL invariant + origin-source reconciliation (SEC-09/10, NEW)
- **Statement:** (a) Document the `signedReadUrlFactory` invariant in `r2-storage-provider.ts`
  (app-authz must run before minting any presigned URL). (b) Document the two origin
  sources (request-url vs `ARCHESTIMATOR_ALLOWED_APP_ORIGINS` env) so multi-origin
  deployments don't drift. **Do NOT remove** the env var (actively consumed in 4 sites).
- **Source:** retracted SEC-08 (Doc 20 ADV-01) — the earlier "dead config" claim was false.
- **Status:** ❌ gap (LOW, P2).

## REQ-DO-01 — WebSocket upgrade DoS mitigation (SEC-04)
- **Statement:** `CollaborationRoom` upgrade either rate-limits unauthenticated socket
  opens per IP or requires a valid token before accepting the upgrade.
- **Status:** ❌ gap (MED).

## REQ-SECRET-01 — No raw credentials stored
- **Statement:** Raw tokens/passwords never persisted; rotation invalidates sessions
  via `credentialVersion`.
- **Status:** ✅ verified strong (Doc 03 Section C).

## REQ-RELEASE-01 — Release gate checklist
- **Statement:** A go/no-go checklist for first external user covering all P0 reqs +
  external GitHub-control evidence status.
- **Status:** ✅ met by Doc 13.

---

## Shadow-path matrix — public share mutations

Applies to: `/api/share/[token]/{password,session,comment,decision,events,unsubscribe}`.

| Flow | Happy | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| password unlock | 204 + cookie | 400 no password | 400 | 401 (wrong) | 423 if publication inactive | 500 opaque | lockout count atomic via D1 INSERT…SELECT | success clears failures; retry after lockout=429 | gate re-renders / success view | `password-lockout-route` |
| session start | cookie set | 400 no recipient | 400 | 401 invalid token | 423 no password cookie | 500 | unique session | idempotent re-issue | redirect / JSON | `share/get-routes-contract` |
| comment POST | 201 | 400 | 400 empty text | 400 bad target id | 401/423 | 503 circuit breaker | snapshot-version 409 on stale | — | comment appears | `comments.test.tsx` |
| decision POST | 200 | 400 | 400 | 400 bad type | 401/423 | 503 | unique-per-recipient 409 dup | — | decision recorded | `decision.test.tsx` |
| events POST | 202 | 400 | 400 | 400 bad event | 401 (bad token) | 500 | — | — | no-op (analytics) | — |
| unsubscribe POST | 200 | 400 | 400 | 401 bad token | 401 | 500 | — | idempotent | confirmed unsubscribe | `unsubscribe-interstitial` |
| snapshot GET | JSON | notFound | empty | 401/423 | 429 | 500 | memoized per-request | — | proposal view | `snapshot-redaction` |

Every applicable cell is answered or marked N/A with reason. No public mutation lacks a
CSRF/origin + rate-limit + session/password gate.
