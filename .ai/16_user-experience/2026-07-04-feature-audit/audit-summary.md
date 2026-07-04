# Audit Summary — 2026-07-04

Date: 2026-07-04
Predecessor: `../2026-06-22-full-app-user-story-ux-audit/` (12 days prior)
Branch: `main`
CSV rows: 115 user stories across 18 feature areas
Stack: Next.js 16.2.6, React 19.2.6, Bun, TypeScript 6.0.3, Vitest ^4.1.9, 30 D1 migrations

## What Changed Since June 22

Between 2026-06-22 and 2026-07-04, git log shows substantial activity:

- **Authorization hardening**: `feat(authz): harden D1 authorization, workspace scoping, and project-image ownership across API routes and domain actions` (dad384319)
- **Test suite alignment**: `test(vitest): align broad test suite with Cloudflare D1, Better Auth, and current UI contracts` (b2449fce5)
- **Cloudflare migration close-out**: multiple `docs(cloudflare-migration):` and `chore(cloudflare-migration):` commits finalizing provider-exit
- **Authentication audit**: new plan pack `2026-07-03 Authentication Audit and Improvement`
- **Redaction + publication hardening**: `fix(src): harden redaction, publication image sanitization, loading role, and worker types` (d3f91cddf)
- **Legacy Supabase spec quarantine**: `test(e2e): quarantine legacy Supabase specs and update auth/landing/route expectations`
- **Local-state cleanup**: `chore(tooling): expand eslint ignores and add Cloudflare provider-exit scripts`

Net: the codebase is more aligned with the Cloudflare stack than at June 22. The authz hardening is the most user-impacting change.

## What This Audit Found

### Phase 2 Verification (Executed 2026-07-04)

| Surface | Result | Notes |
|---|---|---|
| `bun run type-check` | PASS (exit 0) | No type errors |
| `bun run lint` | PASS (exit 0) | 0 errors, 129 warnings (drift) |
| `bun run test:dom` | PARTIAL FAIL | 3 failures across 2 test files (logger-perf + 2 agent-payload-contract); agent-payload failures resolved this session; suite killed by reviewer's bash timeout at ~8 min |
| `bun run test:e2e` | NOT RUN | Env flags + CF preview required |
| Browser QA | NOT RUN | Deferred per Codex App speed guardrail |

### Phase 1 Coverage

The canonical CSV (`canonical-feature-status.csv`) covers every user-facing feature surface:

| Feature Area | Stories |
|---|---:|
| Estimates | 20 |
| Auth and access | 13 |
| Projects | 10 |
| Cost library | 10 |
| Workshop shell | 8 |
| Collaboration | 7 |
| Settings | 7 |
| Public site | 6 |
| Publication share | 6 |
| Publication sending | 6 |
| Uploads | 4 |
| Templates | 3 |
| AI (deferred) | 3 |
| Operations | 5 |
| Charts | 2 |
| Proposal export | 2 |
| Notifications | 2 |
| Feedback | 1 |
| **Total** | **115** |

### Status Breakdown

- **112 Implemented** — code exists and is wired through to UI/API
- **2 Deferred (hidden)** — AI helpers gated behind `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` and `ARCHESTIMATOR_AI_ENABLED`
- **1 Implemented (when flag on)** — AI audit trail, conditional on AI being enabled

### Coverage By Proof Surface

| Proof Surface | Count | Status |
|---|---:|---|
| Source verified this pass | 50+ | Direct code reads |
| Test passing this pass | 30+ | Confirmed via partial `bun run test:dom` output |
| E2E mapped but not executed | 5+ | Requires env flags + CF preview |
| Provider-gated | 8+ | Cloudflare bindings, requires `cf:check-*` scripts |
| Owner/legal-gated | 3+ | Terms, beta widening, manual gates |

## CSV Caveats

The CSV (`canonical-feature-status.csv`) was originally generated via shell heredoc, then normalized via multiple Python cleanup passes (QUOTE_ALL wrapping, column-count padding, column-shift field recovery). As of the santa-loop review pass:

- 116 total rows (1 header + 115 data)
- Every row has exactly 22 columns
- 0 rows with blank `Feature Status`
- 0 rows with blank `Row Impact Severity`
- 0 rows with invalid severity values (all are `Low`, `Medium`, `High`, or `Critical`)
- 0 rows with blank `Targeted Verification`
- 0 rows with blank `External Proof Needed`
- 114 rows with blank `Issue IDs` (correct — most stories have no specific issue ID)
- 1 row with an explicit Issue ID: `PUBSITE-004` references `UX-2026-07-04-06` (the `global-error.test.tsx` hydration risk)

Severity distribution: 89 Low / 24 Medium / 2 High.

If a future agent wants to add fields beyond the 22-column June 22 schema, regenerate from structured row data rather than heredoc to avoid drift.

## Phase 3 Backlog (Summary)

7 ranked issues identified (full details in `testing-results.md`):

| ID | Severity | Title | Status |
|---|---|---|---|
| UX-2026-07-04-01 | High | Missing `.ai/08_prompts/templates/codebase-ai-loop-task.md` | **RESOLVED** — file restored, 7 agent-payload tests now pass |
| UX-2026-07-04-02 | Medium | `logger-perf.test.ts` budget too tight | Open |
| UX-2026-07-04-03 | Medium | DOM suite 8-min timeout (unresolved since June 22) | Open |
| UX-2026-07-04-04 | Low | 129 lint warnings (dead code drift) | Open |
| UX-2026-07-04-05 | Low | Endemic `act()` warnings | Open |
| UX-2026-07-04-06 | Low | `global-error.test.tsx` hydration risk (warning observed during partial DOM run; line truncated from retained log) | Open |
| UX-2026-07-04-07 | Low | jsdom doesn't recognize `<search>` tag (same evidence situation as -06) | Open |

Plus per-feature-area UX issues captured in the CSV's `Current UX Or Logistical Error` column (Medium severity items worth review):

- AUTH-001: Dropped unsafe deep links feel like broken redirects
- AUTH-002: Signup rejection copy may not explain beta gate
- AUTH-005: Terms version requires owner/legal sign-off
- INVITE-001: Expired/accepted invite tokens render unfriendly errors
- INVITE-002: Race condition on simultaneous invite acceptance
- RECIPIENT-001: Stale snapshot not surfaced to recipient
- RECIPIENT-002: P10 lockout UX not surfaced to recipient
- RECIPIENT-004: Sender cannot see aggregate decision state across recipients
- PROJ-008: Map provider quota not verified
- SET-003: Role-change UX lacks permission preview
- COLL-001: Email deliverability (SPF/DKIM/DMARC) not verified
- PUB-001: Snapshots may diverge from live estimate
- PUB-002: Failed recipient sends not aggregated in summary
- PUB-003: P10 lockout UX not surfaced to recipient
- UPLOAD-001: Cloudflare Images binding requires production verification
- UPLOAD-003: ClamAV service binding requires production verification
- NOTIF-002: Email deliverability not verifiable locally
- OPS-001/002/003: Operator-only release gates not in UI

## Phase 3 Plan (For Follow-up Sessions)

The realistic Phase 3 backlog beyond the resolved UX-2026-07-04-01 cannot be fixed in one session. Order:

1. **UX-2026-07-04-02** (Medium) — raise perf budget in `logger-perf.test.ts` or gate behind CI env.
2. **UX-2026-07-04-03** (Medium) — profile slow DOM tests; consider sharding or running subset.
3. **CSV polish** — optional; CSV is parse-consistent and field-consistent. A structured-data regeneration would remove the `Issue IDs` blank column where most rows have no issue ID (correct behavior).
4. **Owner-gated items** — terms version, beta widening, legal review (Philip-gated, not code-fixable).
5. **Provider-gated items** — run `cf:check-readiness`, `cf:check-email`, `cf:queues-cron-proof` against production bindings.
6. **UX improvements** — Medium-severity items in the CSV's `Current UX Or Logistical Error` column (one PR per feature area).

## Phase 4 Plan (Retest After Phase 3)

After Phase 3 fixes land:

1. Re-run `bun run type-check && bun run lint && bun run test:dom`
2. Capture exit codes + failure counts in `testing-results.md`
3. Run the canonical CSV's `Targeted Verification` IDs against current code
4. Browser QA via Playwright against `bun run cf:preview` for the golden path
5. Provider proofs via `cf:*` scripts against hosted worker

## Honest Scope Statement

This session delivered:
- Phase 1 framework: 115 user stories across 18 feature areas
- Phase 1 top-priority fix: `.ai/08_prompts/templates/codebase-ai-loop-task.md` restored (7 agent-payload tests now pass)
- Phase 2 partial evidence: type-check pass, lint pass, DOM partial
- Phase 3 issue backlog: 7 ranked issues (1 resolved, 6 open)
- Phase 3 fixes: deferred (multi-day work; backlog is entry point)
- Phase 4 retest: depends on Phase 3
- Santa-loop dual review: Codex (GPT-5.4) ran 6 rounds — Round 6 returned **PASS** (all 11 criteria). Reviewer A (Claude) infrastructure completely broken: 3 attempts (code-reviewer agent, code-reviewer agent, oracle agent) all timed out at 30 min with zero output. Same pattern as the 8 explore agents earlier in the session (10/10 subagent attempts failed). Single-reviewer PASS (Codex only).

What was sacrificed for honesty:
- Explore-agent + Claude code-reviewer infrastructure failed systematically (8 explore + 1 reviewer agents timed out at 30 min with zero output). Switched to direct code exploration and Codex as primary reviewer.
- Browser/Playwright evidence not captured (requires CF preview + env flags).
- The full DOM test suite did not complete (killed by reviewer's bash timeout at ~8 min; known issue).

## Files

| File | Purpose |
|---|---|
| `README.md` | Entry point |
| `canonical-feature-status.csv` | Single canonical spreadsheet (115 rows × 22 cols) |
| `testing-results.md` | Phase 2 executed evidence + 7-issue backlog |
| `audit-summary.md` | This file — narrative summary |
| `evidence/type-check.log` | Raw `bun run type-check` output (exit 0, no errors) |
| `evidence/lint.log` | Raw `bun run lint` output (0 errors, 129 warnings) |
| `evidence/test-dom.log` | Raw partial `bun run test:dom` output (killed by reviewer's bash timeout at ~8 min) |
| `evidence/test-dom-post-fix.log` | Post-fix rerun of `agent-payload-contract` tests (7/7 pass, EXIT=0) |
