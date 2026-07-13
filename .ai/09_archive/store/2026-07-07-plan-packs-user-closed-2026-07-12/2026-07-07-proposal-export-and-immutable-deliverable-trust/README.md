# Plan Pack — Proposal Export and Immutable Deliverable Trust

**Folder:** `.ai/03_plans/2026-07-07-proposal-export-and-immutable-deliverable-trust/`
**Derived feature name:** `proposal-export-and-immutable-deliverable-trust`
**Date (Asia/Manila):** 2026-07-07
**Plan profile:** `exhaustive` (D1 schema, app authorization, publication/auth, data integrity,
release readiness)
**Mode:** planning only — no application code was modified by this task.

## Status: `CONDITIONALLY READY`

`verification_mode: independent` — the final verification was performed by a **separate native
verifier agent** with distinct output (15/15 completion gates passed; no hidden defects found).
The status is `CONDITIONALLY READY` (not `IMPLEMENTATION-READY`) because **Performance readiness
= 92 < 95** (required for user-facing exports), reflecting that performance thresholds are
deliberately DISCOVERY-REQUIRED rather than guessed. This is a content gate, not a verification
cap. See `17_FINAL_READINESS_REVIEW.md`.

**Implementation-ready slices (named):**
- Phase 0 — trust-ledger schema + repository + checksum + redaction-policy/byte-scan + staleness
  helper (after DISCOVERY T0.4: owner review of internal-field allowlist).
- Phase 1 — Surface A (XLSX) trust wiring.
- Phase 2 — Surface B (snapshot) immutability + recipient content binding.

**Gated / blocked:**
- Phase 3 (large-export streaming/async) — gated on T3.0 evaluator thresholds + ASSUMP-2 (queue
  consumer confirmation) + TEST-2 hosted smoke.
- PDF format (DEC-FORMAT-1) — BLOCKED-EXTERNAL (owner decision on renderer/licensing).

See `17_FINAL_READINESS_REVIEW.md` for the full audit and the smallest set of actions to reach
`IMPLEMENTATION-READY`.

## What this plan delivers

A future executor can make Archestimator's proposal outputs **trustworthy enough for real client
review** by giving every issued deliverable five trust properties it currently lacks:

1. **Immutability** — append-only package rows; republish/rotate retains prior versions.
2. **Content addressing** — SHA-256 of deliverable bytes, stored at generation.
3. **Source/staleness stamping** — as-of + revision + recipient-visible staleness.
4. **Redaction assurance** — broadened client-XLSX redaction + byte-level leak scan.
5. **Large-export reliability** — streaming/Queue path replacing whole-buffer + all-or-nothing 413.

Plus **recipient delivery proof** that binds acceptance to the content hash, not just the version
integer.

## Implementation start document

**`11_IMPLEMENTATION_PLAN.md`** — the authoritative execution guide.

### Phase order

0. **Foundations** — migration `0040_*`, `proposal-deliverable-packages` repository, checksum
   module, redaction-policy + byte-scan, staleness helper.
1. **Surface A (XLSX)** — route hash+package write, download audit, preview trust panel.
2. **Surface B (snapshot)** — canonicalize+checksum on publish, append-only republish/rotate,
   recipient staleness, content-bound accept.
3. **Large-export reliability** (P1, flagged) — streaming (mid) + async queue job (large).
4. **Tests/docs/cleanup** — hosted smoke, denial tests, docs, orphan-R2 reconcile.

### Dependency graph

```
Phase 0 (schema+modules) ─┬─► Phase 1 (XLSX)
                          ├─► Phase 2 (snapshot)
                          └─► Phase 3 (stream/async) ──► Phase 4 (tests/docs)
```

Phase 1 and Phase 2 are parallel-safe after Phase 0 contracts are set (disjoint file scopes:
`proposal-export/*`+`route.ts` vs `publication/*`), except `publication/*` files must be
serialized internally. Phase 3 depends on Phase 1's route changes.

## Requirement/task/test traceability

- Requirements: `04_REQUIREMENTS_SPECIFICATION.md` (FR-1..10, UX, A11Y, ARCH, DATA, API, SEC,
  PERF, REL, OPS, TEST, DOC).
- Full traceability: `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` (every req ↔ phase ↔ task ↔ code ↔
  AC ↔ test ↔ rollout).
- Test matrix: `12_TEST_AND_VALIDATION_STRATEGY.md`.
- Adversarial matrix: `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.

## Blocked decisions table

| Decision | ID | Owner | Unblock action |
|---|---|---|---|
| PDF renderer + licensing | DEC-FORMAT-1 / OPEN-4 | Philip | select renderer; approve cost |
| Internal-field allowlist | OPEN-1 / T0.4 | owner review | review sample internal XLSX tokens |
| Perf thresholds | OPEN-3 / T3.0 | executor | run evaluator |
| Queue consumer hosting | OPEN / T3.2 (ASSUMP-2) | executor | confirm consumer structure |
| Orphan-R2 reconcile strategy | OPEN-5 / T4.4 | executor | lifecycle rule vs reconcile cron |
| `source_estimate_revision` field | OPEN-2 / T1.1 | executor | check `estimates` schema |
| Store small-package bytes inline vs regenerate | OPEN-6 / DEC-STORE-1a | executor | determinism audit of `xlsx-workbook.ts` |
| Independent/owner review (strengthens acceptance) | RISK-5 | Philip | review this pack (NOTE: final verification was already independent; this is optional strengthening) |

## Stale-plan revalidation checklist (before executing)

- [ ] Confirm latest migration number (`0039` today → `0040` next); recheck `migrations/`.
- [ ] Re-read `src/lib/proposal-export/*`, `route.ts`, `src/lib/publication/*` immediately before
      editing (shared worktree).
- [ ] Confirm `wrangler.jsonc` bindings unchanged (`ARCH_DB`, `ARCH_UPLOADS_R2`,
      `UPLOAD_JOBS_QUEUE`).
- [ ] Re-confirm `known-issues.md:372` still lists immutable snapshots as future work.
- [ ] Confirm no other agent is editing `publication/*` or `route.ts` (ledger coordination).

## Commands / checks before the first edit

```
git status --short --branch
bun run type-check
bun run test:dom -- proposal-workbook        # confirm baseline green
bun run test:dom -- project-publication-snapshot
rg -n "applyAudiencePolicy" src/lib/proposal-export   # confirm redaction chokepoints
rg -n "snapshot_version" src/lib/publication          # confirm version-lock points
```

## Files explicitly off-limits (for this plan's scope)

- `supabase/migrations/*` (legacy archaeology — never extend).
- Historical Supabase project `ebxxqidacheyapmmzavr` (provider-exit evidence only).
- Unrelated Cloudflare accounts/projects.
- Cost-library / component-library versioning (own system).
- Estimate editing workflow (workshop tree/row mutations).
- Better Auth session model / `/share` access mechanics (unchanged).
- Durable Object `COLLAB_ROOMS` (out of scope).

## Files/systems intentionally unaffected

- Auth/invite/password/crypto primitives (`src/lib/publication/security.ts`) — unchanged.
- Publication UX (Publisher drawer tabs, sheet picker) — DEC-LINK-1.
- Cost library, uploads (component-library), collaboration invitations.

## External proof required before production rollout

- Hosted oversized-export smoke (TEST-2 / `cf:verify-hosted-proposal-export-oversized`).
- Hosted perf p95 within gate (`cf:verify-hosted-performance`).
- D1/R2 readback for the new table + large-artifact round-trip (wrangler).
- Checksum-mismatch monitor at 0 for a observation window.

## Archive policy

Do **not** archive automatically. Archive only after full implementation + hosted smoke +
owner sign-off, or archive named completed slices (Phase 0–2 first, Phase 3 when ungated).

## Document index

| Doc | Purpose |
|---|---|
| `00_AGENT_COORDINATION.md` | Master /goal, orchestration, skills, concurrency |
| `01_EXECUTIVE_SUMMARY.md` | What/why/current/target/findings/decisions/readiness |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief verbatim, in/out scope, assumptions, constraints |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Evidence: file maps, flows, gaps, precedents, risk quotes, tests |
| `04_REQUIREMENTS_SPECIFICATION.md` | Requirements + shadow-paths + credential taxonomy |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | Journeys, states, a11y, primitives |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Current/target arch, boundaries, state machine, decisions |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | Migration blueprint, access matrix, API contracts |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Threats, controls, denial tests |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Evaluator, failure modes, observability, budgets |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Impact inventory, classification, deps |
| `11_IMPLEMENTATION_PLAN.md` | Phased tasks (authoritative execution guide) |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test execution matrix, commands |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Sequencing, gates, flags, runbook |
| `14_RISK_REGISTER.md` | Risks with mitigation/residual |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | Decisions with rejected alternatives, assumptions, open items |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Full traceability |
| `17_FINAL_READINESS_REVIEW.md` | Verifier audit, scores, status, caps |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Cross-cutting stack decisions |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research, adversarial matrix, evaluator, gaps |
| `PROMPT.md` | Original brief (preserved) |
