# Research, Review, and QA Evidence

## Research questions and sources

| Question | Source | Answer | Effect on plan |
|---|---|---|---|
| Does the activity route have a recipient-page UI consumer? | `src/app/share/[token]/page.tsx` (read) | No — renders `ShareReviewWorkspace` only; `SharedLinkActivityFeed` is owner-only | OPEN-UX-02; minimization can proceed without UX regression |
| Is recipient email hashed at rest? | `migrations/0014_*:58-81`, `recipient-proposals-repository.ts:86-163` | No (plaintext, lowercased); required for email-matched proposals view | DATA-03 (decision) |
| Is there a soft-delete on share tables? | `migrations/0014_*` | No `deleted_at` column | DATA-02 (document invariant) |
| Does the retention cron cover share content? | `retention-core.ts:79-143` | No (only `shared_link_events` 90d + `collaboration_audit_events` 365d) | DATA-01 (Phase 5) |
| Is the snapshot/activity token hashed before lookup? | `public-repository.ts:636-663`, `security.ts:78-81` | Yes (HMAC-SHA256, unique index) | No P0 token-storage risk |
| Does D1 support `DROP COLUMN`? | official SQLite docs (referenced) | Yes, ≥ 3.35 | Phase 7 rollback viable (verify before edit) |
| Does Next.js 16 require special handling for `force-dynamic` Route Handlers? | local `node_modules/next/dist/docs/` (referenced) | No — pattern is stable | No framework risk |

**Research validation rubric:** primary sources = repo files + migrations (authoritative); official docs = framework/provider behavior; no community convention relied upon. Sources dated by file content (current repo state).

## Skills and workflows used or unavailable

| Skill/workflow | Used | Substitute |
|---|---|---|
| `Creating-Plan-Prompt.md` | Yes (directive) | n/a |
| `Multi-Agent-Execution-Directive.md` | Yes (coordination) | n/a |
| `Explore` subagents (3 lanes) | Yes (native) | n/a |
| `archestimator-plan-pack` | Yes (confirms plan-pack warranted) | n/a |
| Native independent verifier | **Unavailable** | emulated adversarial + final-verify passes (this doc + `17_…md`) |
| Native goal/ledger tool | **Unavailable** | durable-goal contracts as document artifacts in `11_…md` |
| `ultragoal`/`ultrawork`/`autopilot`/`ultraqa`/`autoresearch` | Not invoked as native | their *contracts* reflected into plan docs |
| GitNexus/code-review-graph | Not invoked (proportional: focused read sweep) | parallel `Explore` lanes |

## Specialist workstream outputs

- L2 (routes+components): `03_…md` §A-B; `07_…md`; `08_…md`.
- L3 (data+retention): `03_…md` §C; `14_…md` (retention gap); DATA-01.
- L4 (security+credentials): `08_…md`; `21_…md`.
- L5 (tests): `03_…md` §D; `12_…md`.
- L6 (framework): this section.

## Critique-and-revision cycle summaries

### Cycle 1 — Initial draft → cross-document consistency + traceability
- **Findings:** (a) `meta` dead path not traced to a requirement → added FR-01 AC. (b) Retention gap not in risk register → added RISK-03/11. (c) Shadow-path matrices missing for retention/session → added. (d) Credential-material taxonomy not yet a separate doc → created `21_…md`.
- **Resolution:** all corrected.

### Cycle 2 — Adversarial + security/privacy + performance
- **Findings:** (a) AQ-04 (over-fetch regression) needed an explicit repo test → added SEC-01/02 tests. (b) AQ-15 (facts leak) needed allow-list rationale → DEC-02. (c) AQ-17 (log leak) needed grep assertion → SEC-04 validation. (d) PERF-01 needed baseline phase → Phase 0. (e) `emulated` cap not stated in README → added.
- **Resolution:** all corrected.

No third cycle needed — remaining findings are owner-gated (OPEN-*) or Phase-0/2 execution artifacts.

## UltraQA-style adversarial scenario matrix

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|---|
| AQ-01 | Anonymous | GET /activity with valid token, no session | seed pub | route test | 200, comments only | (planned) | Resolved by design | WP-2.1 | n/a |
| AQ-02 | Anonymous | GET /activity with revoked token | revoked pub | route test | 404 uniform + no-store | (planned) | Resolved | WP-2.1/4.1 | n/a |
| AQ-03 | Anonymous | GET /activity with expired token | expired pub | route test | 404 | (planned) | Resolved | WP-2.1 | n/a |
| AQ-04 | Developer | author_email reappears in SELECT | regression | repo test | row type omits it | (planned) | Closed by SEC-01 | WP-1.1 | n/a |
| AQ-05 | Attacker | brute-force token | 61 req/min | route test | 429 + Retry-After | (planned) | Resolved (rate limit); lockout owner-gated | WP-2.1/Phase 6 | n/a |
| AQ-06 | Attacker | tampered cursor | bad cursor | route test | 400 | (planned) | Resolved | WP-2.1 | n/a |
| AQ-07 | Recipient-A | read recipient-B decision | two recipients | route test | B's items absent | (planned) | Resolved | WP-2.1 | n/a |
| AQ-08 | Recipient | read internal comment | internal row | route test | absent | (planned) | Resolved | WP-2.1 | n/a |
| AQ-09 | Attacker | revoked pub served from cache | revoked + replay | route test | 404, cache-control no-store | (planned) | Resolved | WP-4.1 | n/a |
| AQ-10 | Anonymous | password-protected, no cookie | password pub | route test | 423 | (planned) | Resolved | WP-2.1 | n/a |
| AQ-11 | Recipient | oversized comment body | >1000 chars | comment test | 400 | (planned) | Resolved (existing sanitize) | existing | n/a |
| AQ-12 | Recipient-A | act under publication B | cross-pub | repo test | rejected (SEC-06) | (planned) | Resolved | existing | n/a |
| AQ-13 | D1 failure | one query fails mid-fan-out | fake D1 throw | route test | 500 uniform, no partial | (planned) | Resolved by REL-01 | WP-2.1 | n/a |
| AQ-14 | Attacker | future metadata key leaks as fact | off-list key | composer test | absent from facts | (planned) | Closed by SEC-03 | WP-1.3/2.2 | n/a |
| AQ-15 | Attacker | XSS via comment body | script tag | existing sanitize test | stripped | (planned) | Resolved (existing) | existing | n/a |
| AQ-16 | Attacker | CSRF comment POST | missing csrf | comment test | 401/403 | (planned) | Resolved (existing) | existing | n/a |
| AQ-17 | Operator | error logs leak token | error with /share/<token> | logging test | redacted | (planned) | Closed by SEC-04 | WP-1.5/2.4 | n/a |
| AQ-18 | Owner | retention never purges comments | past-TTL rows | retention test | purged + audited | (planned) | Closed by DATA-01 | WP-5.2 | n/a |

## Performance evaluator contract

See `09_…md` EV-ACT-01 (full). Summary: baseline = Phase 0 capture; target = p95 ≤ 300ms (std) / ≤ 500ms (1000-fixture); harness = `shared-link-activity-benchmark.test.ts`; regression = +20%; rollback = p95 > 600/800ms.

## Independent final verifier evidence

`emulated` — see `17_…md`. No native independent verifier was available. The lead ran a separated adversarial pass (AQ-01..18 above) and a separated final-verification pass (`17_…md`).

## Explicit validation gaps

- Production p95 evidence: requires Workers Observability (free) or hosted probe — not available in this planning-only pass. Local benchmark is the primary gate; production p95 is a post-release check.
- Phase 4 provider readback (D1 EXPLAIN + hosted curl): specified, not executed (planning-only).
- Owner decisions (OPEN-RET-01, OPEN-SEC-02/03/04, OPEN-UX-02): external, unresolved.
- `emulated` verification cap: requires independent reviewer or owner sign-off to lift.

## Why dynamic adversarial QA is not executed on the planning task itself

This is a planning-only task (no code change). Dynamic adversarial QA applies to the *future implementation* (matrix above + `12_…md`), not to the planning artifacts. The planning task's "adversarial" surface is the critique-and-revision cycles + the emulated verifier search, both completed.
