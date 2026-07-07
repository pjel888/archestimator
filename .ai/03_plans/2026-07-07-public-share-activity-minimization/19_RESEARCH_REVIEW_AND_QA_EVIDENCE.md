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

### Cycle 3 — Independent adversarial verifier (emulated, dispatched as a separate `Explore` lane)
A separated adversarial + final-verification lane was dispatched after Cycles 1-2 (maker/checker separation). It read PROMPT.md + all 22 docs, spot-checked 20+ file:line claims against source, cross-referenced requirement/task IDs and scores, and produced P0/P1/P2 findings. Findings and resolutions:

- **P0-1 (resolved):** Migration number collision — the pack said "latest is `0036`" and assigned Phase 7's migration `0037`, but `0037_remove_preloaded_component_categories.sql` already exists. **Fix applied:** renumbered to `0038_shared_link_session_generation.sql` in `07_…md`, `11_…md`, `13_…md`, `README.md`; corrected "latest is `0037`".
- **P0-2 (resolved):** SEC-04/WP-1.5 cited `console.error` at `activity/route.ts:72` and listed `events/route.ts` as affected, but both routes are **silent** (zero logging — verified by grep). **Fix applied:** SEC-04/WP-1.5/01 split into sub-scope A (route the real raw-`error` `console.error` sites — `route.ts:72`, `comment/route.ts:84,120`, `decision/route.ts:38,76`, `password/route.ts:105`, `page.tsx:179,246,260,272` — through the redactor) and sub-scope B (add structured logging to the two silent routes). AC-SEC-04b added.
- **P1-1 (resolved):** "Audit logging" was only implicitly covered. **Fix applied:** added AUD-01 requirement + explicit AUD-01 decision paragraph in `08_…md` Auditability.
- **P1-2 (resolved):** WP-1.7 untraced. **Fix applied:** added WP-1.7 (cleanup) row to `16_…md`; softened the "no requirement untraced" claim to acknowledge the single non-requirement cleanup task.
- **P2-1 (resolved):** WP-2.3 empty placeholder folded into WP-5.2.
- **P2-2 (resolved):** `recipientSession` oracle added to `14_…md` as RISK-13 (accepted).
- **P2-3 (resolved):** PERF-01 fixture rationale added to `09_…md`.
- **P2-4 (noted):** `signerName` is a good positive SEC-03 test case (the current deny-list would *not* catch it; the allow-list must). Noted for the executor in WP-1.3.
- **P1-3 (accepted):** Some §A line numbers in `03_…md` are off by ~2. The README stale-plan checklist already instructs executors to re-verify line numbers before edit, and the over-fetch lines (`~484`/`~545`) are tilde-prefixed and correct. Accepted as-is; executors re-verify before editing per the README checklist.

**Verifier verdict (emulated):** the pack meets the PROMPT.md stop condition after the P0 fixes (now applied). Minimization slices (Phases 1/2/4/5-mech/8) are `IMPLEMENTATION-READY` in substance; the whole remains `CONDITIONALLY READY` due to the `emulated` cap + owner-gated slices. This matches the pack's own self-assessment in `17_…md`.

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
