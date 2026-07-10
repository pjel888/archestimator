# LOOP_LEDGER.md — Durable Planning Loop State

Lead-owned append-only ledger. Single writer: the planning lead. Updated as the
plan pack is created, improved, and eventually executed.

## Run Identity

- **Run ID:** `PLAN-2026-07-10-publisher-shared-pages-create`
- **Goal:** Create a comprehensive frontier-level plan pack for the Publisher
  and Shared Link feature redesign.
- **Plan manifest hash:** (pending — set after `plan-pack.json` is frozen)
- **Baseline HEAD:** `081a0757a`
- **Baseline scoped status:** (clean working tree except pre-existing modifications
  noted in git status)
- **Started:** 2026-07-10

## Goal Capsule

**Outcome:** A plan pack at `.ai/03_plans/2026-07-10/Publisher-And-Shared-Pages/`
that a fresh codebase AI can implement end to end, covering:
1. Comprehensive audit of the existing Publisher + Shared Link feature (all
   surfaces, data flow, security, UX gaps).
2. Redesigned UX with guided publish wizard, prominent CTAs, plain-language
   terminology, mobile support.
3. Technical hardening (body-size limits, circuit breakers, status codes,
   pagination, reentrance, dead code).
4. Data optimization (FK constraints, GROUP BY roster query).
5. Full requirements traceability, execution DAG, test strategy, risk register.

**Stop condition:** Plan pack validates with `bun run validate:plan-pack` and
passes the final readiness audit (no P0/P1 planning defects).

## Current Run Scope

`PLAN_ONLY` — this stage writes only to the plan folder. No application code,
tests, migrations, or config are modified.

## Task DAG Status

| Unit | Status | Layer | Owner | Notes |
|---|---|---|---|---|
| UNIT-001 body-size limits | PLANNED | 0 | — | |
| UNIT-002 status codes | PLANNED | 0 | — | |
| UNIT-003 circuit breaker | PLANNED | 0 | — | |
| UNIT-004 comment pagination | PLANNED | 1 | — | |
| UNIT-005 snapshot reentrance | PLANNED | 0 | — | |
| UNIT-006 startup secrets | PLANNED | 0 | — | |
| UNIT-007 dead code removal | PLANNED | 0 | — | |
| UNIT-008 FK migration | PLANNED | 1 | — | |
| UNIT-009 roster optimization | PLANNED | 1 | — | depends on UNIT-008 |
| UNIT-010 terminology | PLANNED | 2 | — | gate for L2/L3 |
| UNIT-011 ShareWizard | PLANNED | 2 | — | depends on UNIT-010 |
| UNIT-012 roster cards | PLANNED | 2 | — | depends on UNIT-010 |
| UNIT-013 dashboard CTA | PLANNED | 2 | — | depends on UNIT-011 |
| UNIT-014 preview mode | PLANNED | 2 | — | depends on UNIT-011 |
| UNIT-015 header+branding | PLANNED | 3 | — | depends on UNIT-010 |
| UNIT-016 sticky CTA+banner | PLANNED | 3 | — | depends on UNIT-010 |
| UNIT-017 row-action redesign | PLANNED | 3 | — | depends on UNIT-010 |
| UNIT-018 comments improvements | PLANNED | 3 | — | depends on UNIT-004 |
| UNIT-019 print+currency | PLANNED | 3 | — | depends on UNIT-010 |
| UNIT-020 password gate | PLANNED | 3 | — | depends on UNIT-010 |
| UNIT-021 inbox fixes | PLANNED | 4 | — | |
| UNIT-022 integration | PLANNED | 5 | — | depends on all |

## Lane Leases

No active leases. Planning stage is read-only; no file/resource contention.

## Decisions Log

| Decision | Status | Affected IDs |
|---|---|---|
| DEC-AUTO-001 preview cookie mechanism | ACTIVE | REQ-003 |
| DEC-AUTO-002 disable submit in preview | ACTIVE | REQ-003 |
| DEC-AUTO-003 QR code via qrcode package | ACTIVE | REQ-002 |
| DEC-AUTO-004 cards on mobile + table on desktop | ACTIVE | REQ-005 |
| DEC-AUTO-005 sidebar label "Share" | ACTIVE | REQ-004 |
| DEC-AUTO-006 cursor-based comment pagination | ACTIVE | SEC-004 |
| DEC-AUTO-007 row-click selects review target | ACTIVE | UX-005 |
| DEC-AUTO-008 remove dead events route | ACTIVE | SEC-007 |

## Evidence Receipts

| Evidence | Claim | Source | Hash | Freshness |
|---|---|---|---|---|
| Publisher page audit | 03_SOURCE_AND_CODEBASE_AUDIT.md §A | git HEAD 081a0757a | — | 2026-07-10 |
| Share page UI audit | 03_SOURCE_AND_CODEBASE_AUDIT.md §G.2 | git HEAD 081a0757a | — | 2026-07-10 |
| Data model audit | 03_SOURCE_AND_CODEBASE_AUDIT.md §A (D1) | migrations/0014 | — | 2026-07-10 |
| Navigation audit | 03_SOURCE_AND_CODEBASE_AUDIT.md §I | git HEAD 081a0757a | — | 2026-07-10 |

## Planning Loop Entries

### Entry 1 — 2026-07-10: Plan pack creation
- **Action:** Created plan pack at `.ai/03_plans/2026-07-10/Publisher-And-Shared-Pages/`.
- **Scope:** `PLAN_ONLY`.
- **Audit method:** Five parallel exploration agents (publisher page, share page,
  data model, share UI components, navigation/inbox). Each produced exhaustive
  file:line-referenced audits.
- **Decisions:** 8 DEC-AUTO-* recorded.
- **Next action:** Improve stage — adversarial review + repair.

### Entry 2 — 2026-07-10: Improve stage (adversarial review + repair)
- **Action:** Ran 3 parallel adversarial-review agents against the pack and source.
- **Defects found:** 2 P0 (FK migration SQL invalid for SQLite; RecipientEmailComposer
  duplication), 8 P1 (unowned page.tsx files, unsubscribe missing from SEC-001,
  cursor shape wrong, test paths wrong, e2e/contract test breakage, events route
  layer race, unaddressed gaps, preview-cookie precedence), 6 P2 (terminology
  inconsistency, wizard a11y gaps, mobile wizard unspecified, QR contradiction).
- **Repairs applied:**
  - **P0-1:** Replaced invalid `ALTER TABLE ADD CONSTRAINT` with correct SQLite
    table-rebuild pattern (following migration 0040 convention). 7 table rebuilds.
  - **P0-2:** Changed architecture to reuse existing `RecipientEmailComposer`
    (765 lines) instead of inventing `RecipientQuickAdd`.
  - **P0-3:** Added 8 new requirements (REQ-009 through REQ-016) covering
    persistent link display, empty-project wizard, email-not-configured, wizard
    a11y, mobile wizard, QR conditional, republish path, Access-tab rename,
    consistent verb.
  - **P0-4:** Added 9 new UX requirements (UX-013 through UX-021) covering mobile
    tree nav, collated-row load-more, comment load-more UI, signer-name
    consistency, row-click keyboard model, sticky bar a11y, JS-disabled fallback,
    labeled actions, aria-live cleanup.
  - **P0-5:** Added SEC-008 (preview-cookie precedence) and SEC-009 (unsubscribe
    surface).
  - **P1:** Fixed UNIT-001 (add unsubscribe route), UNIT-007 (events route layer
    race — defer enum to UNIT-019), UNIT-011 (add page.tsx ownership + reuse
    RecipientEmailComposer + wizard a11y + mobile), UNIT-012 (labeled actions +
    aria-live fix), UNIT-014 (page.tsx ownership + SEC-008 precedence),
    UNIT-016 (preserve existing "Not you?" button), UNIT-017 (roving tabindex),
    UNIT-018 (load-more UI), UNIT-019 (download_attempt_blocked decision +
    collated load-more + currency fix location), UNIT-021 (email-mismatch fix),
    new UNIT-023 (mobile tree + JS-disabled + signer-name).
  - **P1:** Fixed cursor shape claim (`{createdAt, id}` not `{publicationId, ...}`).
  - **P1:** Fixed test paths (`tests/vitest/perf/` not `tests/perf/`).
  - **P1:** Added existing-test-update guidance (e2e, contract tests).
  - **P2:** Added DEC-AUTO-009 (preview-cookie precedence).
  - **P2:** Added wizard mobile form-factor spec, QR conditional on device,
    wizard a11y (step-change announcements, focus management).
  - **P2:** Added decision-verb mapping to terminology table.
  - **Validated ASSUMP-002** (SQLite does NOT support ALTER TABLE ADD CONSTRAINT
    — proven by parse-error test; table-rebuild is correct).
- **New totals:** 53 requirements, 88 acceptance criteria, 23 execution units,
  9 DEC-AUTO decisions, 3 verification gates.
- **Next action:** Plan pack validates. Ready for execution or further review.

## Next Action

The improve stage is complete. The plan pack validates with
`bun run validate:plan-pack`. All P0 and P1 defects from the adversarial review
have been repaired. The pack is ready for the `Create-Implementation-Prompt` /
`Executing-Plan-Prompt` stage when Philip is ready to build.

## Stop Condition (planning stage)

Planning stage is complete when:
- `plan-pack.json` validates.
- No P0/P1 planning defect remains.
- All requirements traced, all decisions closed, all units executable.
- Statuses truthfully reflect `PLAN_ONLY` scope (planning complete, implementation
  not started).
