# Recipient Proposals Inbox IA & Recovery — Plan Pack

**Plan date:** 2026-07-07 (Asia/Manila)
**Plan profile:** exhaustive
**Plan status:** `CONDITIONALLY READY`
**Verification mode:** `emulated` (no native independent reviewer in session → status capped; see `17_FINAL_READINESS_REVIEW.md`)
**Planning folder:** `.ai/03_plans/2026-07-07-recipient-proposals-inbox-ia-recovery/`

> This is a **planning-only** pack. It does not change application code, tests, migrations, or configuration. It prepares the recipient proposal inbox IA, email-link continuity, wrong-account recovery, expired/revoked/error states, and review decision states for unambiguous implementation.

## What this pack delivers (one paragraph)

A recipient who receives a proposal email can find, open, review, and decide on that proposal with zero ambiguity. When something goes wrong — wrong account, expired/revoked link, no session, already decided — they see a clear, differentiated recovery path instead of a generic wall. The pack maps the two recipient entry points (signed-in inbox vs public share link), reconciles their identity models without conflating them, differentiates terminal link states (anti-enumeration), adds a wrong-account recovery CTA, forks the no-proposal empty state, and pins decision immutability with clear finality copy — all with no V1 schema/API change and no new client bundle.

## Implementation start document

➡️ **`11_IMPLEMENTATION_PLAN.md`** — the authoritative execution guide.

Phases 1–5 are parallel-safe (disjoint file scopes) after Phase 1 task 1.1 (copy module) lands. Phase 6 (test hardening) depends on all of them.

## Phase order + dependency graph

```
Phase 1 (terminal states + copy module + error.tsx)
  ├── 1.1 share-copy.ts constants        (sequential first)
  ├── 1.2 DISCOVERY: resolver shape      (before 1.3)
  ├── 1.3 inline terminal render          (after 1.1+1.2)
  └── 1.4 share error.tsx                (parallel with 1.3)
Phase 2 (inbox empty-state fork)          (parallel with 1,3,4,5)
Phase 3 (wrong-account CTA)               (parallel)
Phase 4 (share→inbox link)                (parallel)
Phase 5 (decision finality copy)          (parallel)
Phase 6 (test hardening + E2E doc)        (after 1–5)
```

## Requirement/task/test traceability

- Requirements: `04_REQUIREMENTS_SPECIFICATION.md` (FR-01..FR-14, UX, A11Y, ARCH, DATA, API, SEC, PERF, REL, OPS, TEST, DOC).
- Implementation tasks: `11_IMPLEMENTATION_PLAN.md` (IA-P1..P6, tasks IA-P1-T1..IA-P6-T3).
- Tests: `12_TEST_AND_VALIDATION_STRATEGY.md` (TEST-01..TEST-20 + AQ-01..10).
- Full mapping: `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.

## Blocked / open decisions table

| ID | Decision | Owner | Recommendation | Impact if deferred |
|---|---|---|---|---|
| OPEN-IA-01 | Recipient matching: keep email (hybrid) vs move to session-bound | Owner | Hybrid (email list, session act) | Security readiness 94; binding sub-95 |
| OPEN-IA-02 | Differentiate expired/revoked copy | Owner | Differentiate (anti-enumeration) | FR-09/10 blocked |
| OPEN-IA-03 | Decision revision (immutable V1) | Owner | Keep immutable V1 | FR-08/11 scope |
| OPEN-IA-04 | In-app notifications (email-only V1) | Owner | Email-only V1 | FR-14 scope |

Each has a recommended path; implementation may proceed on the recommendation or pause a named slice pending sign-off. See `00_AGENT_COORDINATION.md` and `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`.

## Stale-plan revalidation checklist (run before the first edit)

Six sibling packs are concurrently evolving the publication/share surface. Before editing, the implementer must:

1. `git status --short --branch` — confirm no unexpected concurrent changes.
2. `ls migrations/ | sort | tail -3` — confirm latest migration (was `0039` at planning time).
3. Re-read **every** file this pack touches (see "Files in scope" below) immediately before editing.
4. Re-check the sibling packs for landed changes:
   - `2026-07-07-invite-token-flow-hardening`
   - `2026-07-07-public-share-activity-minimization`
   - `2026-07-07-owasp-api-authz-matrix-refresh`
   - `2026-07-07-client-ready-proposal-package-workflow`
   - `2026-07-07-proposal-export-and-immutable-deliverable-trust`
   - `2026-07-07-public-to-beta-trust-onboarding-continuity`
5. Confirm the recipient-proposals repository query shape is unchanged (credential-free).
6. Confirm the decision API contract (`/api/share/[token]/decision`) is unchanged.

## Commands / checks to run before the first edit

```bash
bun run type-check
bun run lint
bun run test:dom        # primary gate (vitest, jsdom)
bun run build           # bundle boundary check
```

Establish a green baseline before making changes.

## Files in scope (V1)

**Modified:**
- `src/components/workshop/proposals-page/ProposalsEmptyState.tsx` (P2)
- `src/components/workshop/proposals-page/ProposalRow.tsx` (P3)
- `src/components/workshop/proposals-page/ProposalsList.tsx` (P6, possible)
- `src/components/workshop/proposals-page-client.tsx` (P2/P3 wiring)
- `src/app/share/[token]/page.tsx` (P1 — inline terminal states)
- `src/app/share/[token]/not-found.tsx` (P1 — generic-only)
- `src/components/share/SharePageDecision.tsx` (P5 — finality copy)
- `src/components/share/SharePageSessionBanner.tsx` (P4 — link)
- `src/lib/publication/share-copy.ts` (P1 — new constants)
- `tests/vitest/recipient-proposals-page.test.tsx` (P6)
- `tests/vitest/recipient-proposals-action.test.ts` (P6)
- `tests/vitest/share/share-page-decision-bar-copy-contract.test.tsx` (P5)
- `e2e/shared-link-receiver.spec.ts` (P6 — skip-comment)

**New:**
- `src/app/share/[token]/error.tsx` (P1)
- `tests/vitest/share/share-terminal-states.test.tsx` (P1)
- `tests/vitest/share/share-error-boundary.test.tsx` (P1)
- `tests/vitest/share/share-page-session-banner-link.test.tsx` (P4)

## Files explicitly off-limits (owned by sibling packs)

- `src/lib/publication/security.ts` — crypto primitives (proposal-export / invite-hardening)
- `src/app/api/share/[token]/decision/route.ts` — decision contract (unchanged)
- `src/app/api/share/[token]/{session,password,activity}/route.ts` — unchanged
- `src/lib/collaboration/*` — invite system (invite-hardening)
- `src/components/workshop/publication/*` + owner digest — (client-ready-proposal-workflow)
- `src/lib/notifications/*`, `src/features/notifications/*` — (client-ready Phase 5)
- D1 migrations — no V1 migration

## Files and systems intentionally unaffected

- `wrangler.jsonc` (no new binding)
- `DESIGN.md` (alpha; no new tokens)
- Owner/publisher UI, owner digests, recipient management
- Public activity route (`activity/route.ts`)
- Invite system
- Decision/session/password API contracts
- D1 schema

## External proof that remains required before production rollout

- Hosted/provider route-TTFB probe for `/workshop/proposals` and `/share/[token]` (deferred to implementation; low risk).
- D1 `EXPLAIN` of the listing query (deferred; index-backed, LIMIT 50).
- (Optional) Receiver E2E round-trip if `tests/fixtures/shared-link.ts` is unblocked.
- Email deliverability is owned by client-ready-proposal-workflow (out of scope here).

## Archive policy

Do **not** archive automatically. Archive only after (a) the V1 implementation lands, (b) the focused tests are green, (c) `current-state.md` is updated (DOC-01), and (d) OPEN-IA-01..04 are resolved/recorded (DOC-02). Named completed slices may be archived independently.

## Document index

| Doc | Purpose |
|---|---|
| `00_AGENT_COORDINATION.md` | Master goal, ledger, skills, open decisions |
| `01_EXECUTIVE_SUMMARY.md` | Problem, target, findings, scores |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief (verbatim) + scope + non-goals + constraints |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Systematic repo inventory |
| `04_REQUIREMENTS_SPECIFICATION.md` | All requirements + shadow-path matrices |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | Journeys, states, a11y |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Current/target architecture, decisions |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | Schema (no V1 migration), contracts |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Credential taxonomy, T-01..T-10 |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Evaluator contract, failure modes |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Direct/transitive impact, sibling fencing |
| `11_IMPLEMENTATION_PLAN.md` | **Execution guide** — phases + tasks |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test execution matrix, adversarial matrix |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Gates, rollback, ops |
| `14_RISK_REGISTER.md` | RISK-01..12 |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | DEC-IA-01..06, assumptions, rejected alternatives |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Full traceability |
| `17_FINAL_READINESS_REVIEW.md` | Verifier pass, scores, CONDITIONALLY READY rationale |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Cross-cutting stack gates |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research, cycles, gaps |

## Quick stats

- Requirements: 14 FR + 9 UX + 4 A11Y + 5 ARCH + 3 DATA + 1 API + 7 SEC + 2 PERF + 1 REL + 1 OPS + TEST + 2 DOC.
- Implementation tasks: 6 phases, 11 tasks (2 DISCOVERY-REQUIRED).
- Tests: 20 DOM/coverage entries + 10 adversarial scenarios.
- Migrations: **0** (V1).
- New API routes: **0**.
- New client bundles: **1** (route-level `error.tsx`, expected).
- Readiness: 95 overall; `CONDITIONALLY READY` (emulated verification + 4 owner-gated decisions).
