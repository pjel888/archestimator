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
3. Technical hardening (bounded body streams, durable admission control, status
   codes, pagination, reentrance, provider readiness, dead code removal).
4. Data optimization (FK constraints, GROUP BY roster query).
5. Full requirements traceability, execution DAG, test strategy, risk register.

**Stop condition:** Plan pack validates with `bun run validate:plan-pack` and
passes the final readiness audit (no P0/P1 planning defects).

## Current Run Scope

`PLAN_ONLY` — this stage writes only to the plan folder. No application code,
tests, migrations, or config are modified.

## Task DAG Status

| Unit | Status | Layer | Notes |
|---|---|---|---|
| UNIT-001 bounded bodies | READY | 0 | Exact resume point |
| UNIT-002 status codes | READY | 0 | Serialized route lane |
| UNIT-003 durable limiter | READY | 0 | D1 authority; local shedding best effort |
| UNIT-004 comment pagination | READY | 1 | |
| UNIT-005 snapshot reentrance | READY | 0 | |
| UNIT-006 runtime readiness | READY | 0 | Explicit provider gate |
| UNIT-007 dead surface removal | READY | 0 | Route and event type removed now |
| UNIT-008 fail-closed FK migration | READY | 1 | No orphan deletion |
| UNIT-009 roster optimization | READY | 1 | depends on UNIT-008 |
| UNIT-010 terminology | READY | 2 | gate for dependent UX units |
| UNIT-011 ShareWizard | READY | 2 | depends on UNIT-010; no new dependency |
| UNIT-012 roster cards | READY | 2 | depends on UNIT-010/011 |
| UNIT-013 dashboard CTA | READY | 2 | depends on UNIT-011 |
| UNIT-014 manager preview route | READY | 2 | depends on UNIT-011; no preview credential |
| UNIT-015 header+branding | READY | 3 | depends on UNIT-010 |
| UNIT-016 sticky CTA+banner | READY | 3 | depends on UNIT-010 |
| UNIT-017 row-action redesign | READY | 3 | depends on UNIT-010 |
| UNIT-018 comments improvements | READY | 3 | depends on UNIT-004 |
| UNIT-019 print+currency | READY | 3 | depends on UNIT-010 |
| UNIT-020 password gate | READY | 3 | depends on UNIT-010 |
| UNIT-021 inbox fixes | READY | 4 | fail-closed integrity preserved |
| UNIT-023 mobile/JS/signer | READY | 4 | depends on UNIT-010/017 |
| UNIT-022 integration | READY | 5 | depends on all other units |

## Lane Leases

No active leases. Planning stage is read-only; no file/resource contention.

## Decisions Log

| Decision | Status | Affected IDs |
|---|---|---|
| DEC-AUTO-001 authenticated manager preview route | ACTIVE | REQ-003 |
| DEC-AUTO-002 disable submit in preview | ACTIVE | REQ-003 |
| DEC-AUTO-003 URL + Copy + native Web Share, no dependency | ACTIVE | REQ-002 |
| DEC-AUTO-004 cards on mobile + table on desktop | ACTIVE | REQ-005 |
| DEC-AUTO-005 sidebar label "Share" | ACTIVE | REQ-004 |
| DEC-AUTO-006 cursor-based comment pagination | ACTIVE | SEC-004 |
| DEC-AUTO-007 row-click selects review target | ACTIVE | UX-005 |
| DEC-AUTO-008 remove dead events route | ACTIVE | SEC-007 |
| DEC-AUTO-009 preview route has no credential precedence | ACTIVE | SEC-008 |

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

The pack is implementation-ready with all 23 units in dependency-closed
`SLICE-001`. The exact next unit is `UNIT-001`. Execution remains bounded by the
current run scope and action ceiling.

### Entry 3 — 2026-07-10: Implementation-readiness repair
- **Scope:** `PLAN_ONLY`; only Publisher plan-pack artifacts changed.
- **Repairs:** Stream-enforced body limits; durable D1 admission authority;
  explicit provider/runtime secret readiness; immediate dead route/type removal;
  fail-closed explicit-column migration with parity/failure injection; no QR or
  dependency; authenticated manager preview route with RBAC on every read;
  recipient repository remains fail-closed; shared-file execution serialized.
- **Traceability:** Canonical TEST IDs and four canonical RISK IDs mirror the
  manifest; descriptive scenario labels use `SCENARIO-*`.
- **Readiness:** 23 units `READY`, `SLICE-001` dependency-closed,
  `next_unit=UNIT-001`; criteria/tests/gates remain unearned.
- **Hash handling:** Artifact and manifest hashes deliberately not refreshed in
  this repair pass.

## Stop Condition (planning stage)

Planning stage is complete when:
- `plan-pack.json` validates.
- No P0/P1 planning defect remains.
- All requirements traced, all decisions closed, all units executable.
- Statuses truthfully reflect `PLAN_ONLY` scope (planning complete, implementation
  not started).

### Entry 4 - 2026-07-10: Conditional-readiness and integration-contract repair

- **Supersedes readiness only:** Earlier entries claiming 23 READY units are
  historical. The current tuple is `CONDITIONALLY_READY/NOT_STARTED`; only
  `UNIT-001`, `UNIT-002`, `UNIT-003`, `UNIT-006`, and `UNIT-010` are READY in
  dependency-closed `SLICE-001`, with `next_unit=UNIT-001`. The other 18 units
  are PLANNED because they overlap, depend on, or finalize Program
  `PUB-DELTA-01..04` work.
- **Dependency truth:** Execution-group labels are workstreams, not barriers.
  Only explicit unit/manifest `depends_on` edges are dependencies. Four paths
  tie for longest chain: `010->011->{012|013|014}->022` and
  `010->017->023->022`.
- **Migration boundary:** `UNIT-008` must validate the durable Program
  `MIGRATION_LEASE_GENERATION.json` generation, current migration tail,
  Publisher manifest, exact unclaimed 0050 path/status, allocation hashes, and
  receipt hash immediately before editing. Drift or collision blocks and
  requires Program reissue.
- **Cross-pack receipts:** Final `UNIT-022` consumes all four Publisher deltas,
  preserves Publisher ownership of public comment/decision accessibility,
  emits `ACT-RECEIPT-PUBLISHER-v1` after the Activation contract freezes, and
  emits the REQUIRED `BETA-P1-10` receipt anchored to `UNIT-003` and
  `tests/vitest/project-publication-decision.test.tsx`.
- **Truth repairs:** Reconciled recipient/performance test paths and renamed the
  browser-print control to "Print / Save as PDF" so `window.print()` is not
  represented as a downloaded artifact.
- **Source freshness:** Re-audited at
  `e373bc865b978e237deb1d92011c96b0a3639fb4`. The extracted proposals shell is
  at `page.tsx:6,8-24`; `proposals-data.tsx:6-13` preserves auth-before-list;
  `bun run test:dom -- tests/vitest/recipient-proposals-route-gate.test.ts`
  passed 3/3 tests.
- **Validation:** The pack validator reports only deliberately stale artifact,
  evidence, and manifest hashes pending the orchestrator's final hash refresh;
  it reports no structural, reference, status, slice-closure, or semantic issue.

## 2026-07-10 - Migration lease collision supersession

- A concurrent workspace writer created `migrations/0050_admin_query_indexes.sql`.
  This invalidates every earlier Publisher 0050 lease statement without changing
  its historical record.
- The current owner allocation is `migrations/0051_publication_foreign_keys.sql`
  inside the Program's 0051..0055 generation. `UNIT-008` must validate the new
  tail, owner manifest, allocation digest, and aggregate receipt before writing.
- No migration or application source was edited by this planning repair.

## 2026-07-11T01:03:00+08:00 - Expanded-pack scoped baseline confirmation

- Three consecutive exact recorded-scope reads matched at status SHA-256
  `a30eacf3be2bcb7c9c78696f956d18fefe6e3250744053f734ffe65427200b33`
  and diff SHA-256
  `da33dd8e387cb4cfe2080d5cad1ec7f9404ccab413fdf42af63966b9a952a0c1`.
- HEAD remains `e373bc865b978e237deb1d92011c96b0a3639fb4`; this confirmation changes
  no allocation, readiness, or implementation state.

## 2026-07-10 - Generation-3 scoped baseline freeze

- Three consecutive exact-scope reads matched after the 0051 tail re-audit.
  Final scoped status SHA-256 is
  `a30eacf3be2bcb7c9c78696f956d18fefe6e3250744053f734ffe65427200b33`;
  final scoped diff SHA-256 is
  `da33dd8e387cb4cfe2080d5cad1ec7f9404ccab413fdf42af63966b9a952a0c1`.
- HEAD remains `e373bc865b978e237deb1d92011c96b0a3639fb4`; this supersedes prior
  scoped hashes without claiming the 0052 allocation.

## 2026-07-10 - Scoped source-baseline freeze

- Froze `PLAN-PACK-SCOPED-BASELINE-v1` at HEAD
  `e373bc865b978e237deb1d92011c96b0a3639fb4` using the ordered literal pathspec
  set in `03_SOURCE_AND_CODEBASE_AUDIT.md`.
- Scoped status SHA-256:
  `3c98ba41c19ca9bf7f9f6e14e55cc93cf02c51bb0e6532cbd79496d770ab4eb6`.
  Scoped diff SHA-256:
  `70197c9f98c0a0fd538eee9bc76d10ae5442633dea4cad7524e8e739bd819a24`.
- These fingerprints bind relevant tracked changes and untracked file contents.
  No product, migration, provider, browser, GitHub, or production action occurred.

## 2026-07-10 - Generation-3 migration-tail supersession

- A concurrent workspace writer claimed live
  `migrations/0051_profiles_account_status.sql`; the prior Publisher 0051
  allocation is therefore historical and cannot be written.
- Publisher's current provisional allocation is
  `migrations/0052_publication_foreign_keys.sql` in Program generation 3. The
  slot remains `UNCLAIMED`; `UNIT-008` must validate the generation receipt,
  live tail, owner manifest, and allocation digest immediately before writing.
- No migration or application source was edited by this planning repair.

## 2026-07-10T17:28:33.000Z - Deterministic public-surface unit repair

- Froze comment shedding in the route-local helper branch, cursor UX to a
  `Load more` control, provider-secret checks to named bindings/readers, and
  terminology work to a literal source/test/evidence allowlist.
- Copy/icon verification is explicitly static/DOM-only under the repository
  browser guardrail. Prior hashes are stale pending final refreeze; no product,
  test, provider, browser, or migration action occurred.

## 2026-07-10T17:33:08.000Z - Settled-scope baseline observation

- Four reads over 17 seconds matched at HEAD
  `e373bc865b978e237deb1d92011c96b0a3639fb4`, scoped status SHA-256
  `a30eacf3be2bcb7c9c78696f956d18fefe6e3250744053f734ffe65427200b33`,
  and scoped diff SHA-256
  `da33dd8e387cb4cfe2080d5cad1ec7f9404ccab413fdf42af63966b9a952a0c1`.
- This actual UTC observation supersedes prior provisional/future-dated freeze
  statements. No product, test, provider, browser, or migration action occurred.

## 2026-07-10T17:36:57.000Z - Local proof-boundary correction

- `UNIT-004` now claims only automated/DOM proof. `UNIT-006` runs a deterministic
  missing-secret local readiness command and leaves hosted binding presence
  `NOT_EVALUATED` for Release `UNIT-007` and production proof.
- The settled source baseline is unchanged; only plan hashes require refresh.

## 2026-07-10T18:33:45.000Z - Generation-4 migration-tail supersession

- Concurrent `migrations/0052_corporate_accounts.sql` occupies the number that
  generation 3 had provisionally assigned to Publisher; Publisher did not
  claim or create that file.
- The Program reissues Publisher's still-`UNCLAIMED` path as
  `migrations/0053_publication_foreign_keys.sql` in generation 4. `UNIT-008`
  must validate the exact live tail, owner manifests, allocation, and receipt
  immediately before any write.
- Historical allocation entries remain historical. No migration, product,
  provider, browser, GitHub, or production action occurred in this repair.

## 2026-07-10T18:57:45.000Z - Generation-4 settled-scope baseline observation

- Three exact-scope reads from `2026-07-10T18:57:29Z` through
  `2026-07-10T18:57:45Z` matched at HEAD
  `e373bc865b978e237deb1d92011c96b0a3639fb4`, scoped status SHA-256
  `32ab186503e591ed55166e492d900487088e6370ea03ffbca75fa52660378f56`,
  and scoped diff SHA-256
  `bd80a006b2a30dfba2880c0ec1e4881b399b100200a1849e3130e1ed26144edf`.
- The observed migration tail invalidated only the old lease; readiness and
  implementation state remain unchanged.

## 2026-07-11T03:45:00+08:00 - Improve stage: source-freshness repair and hash refreeze

- **Scope:** `PLAN_ONLY`; only Publisher plan-pack artifacts changed.
- **HEAD advanced** from `e373bc865b...` to `6069d87c271dc1509e97d1155da4d62c78d771cd`.
- **Three parallel verification lanes** re-proved all source claims against the
  current HEAD: 23 file paths/symbols (all PASS), 7 migration-table column lists
  (all exact match, zero drift from migrations 0016-0065), dead-code/TS-union/
  cursor-helper/signerName/currency claims (all PASS).
- **P1-1 repair — migration path collision:** The durable lease
  (`MIGRATION_LEASE_GENERATION.json` generation 11) reissued Publisher's
  allocation from `0053` to `0066` (`migrations/0066_publication_foreign_keys.sql`,
  status `UNCLAIMED`). The pack's prior `0053` references were stale and would
  collide with the live `0053_corporate_account_owner_integrity.sql`. All
  `0053` references updated to `0066` across `IMPLEMENTATION_PLAN.md`,
  `07_DATA_DATABASE_API_NETWORK_PLAN.md`, `08_SECURITY_PRIVACY_THREAT_MODEL.md`,
  `10_BLAST_RADIUS_AND_DEPENDENCIES.md`, and `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`.
- **P1-2 repair — CHECK constraint inversion:** The data plan claimed "Current
  CHECK excludes `download_attempt_blocked`" for `project_publication_events`;
  the current CHECK **includes** it (`0014:43-45`). The text now correctly
  describes the current CHECK and adds a preflight requirement to scan for
  existing rows with that value before the fail-closed copy.
- **P2 repair — SEC-007 precision:** `download_attempt_blocked` is in
  `project_publication_events.event_type`, NOT `shared_link_events.event_type`
  (which never referenced it). SEC-007 now correctly attributes the CHECK
  change to `project_publication_events` and notes `shared_link_events` is
  copied byte-for-byte.
- **P2 repair — SEC-008 framing:** The denial matrix described a route
  (`/workshop/publisher/preview/[projectId]`) and RBAC-on-every-render behavior
  in present tense, but both are PLANNED UNIT-014 deliverables. The route does
  not exist; `assertProjectPublicationManager` is a private mutation guard at
  `actions.ts:394` (rank >= 30), not yet a server-component read-time RBAC
  helper. The matrix is now labeled as the UNIT-014 target contract, and
  UNIT-014 must make the guard importable into the route module.
- **P2 repair — path precision:** UNIT-019 `CostDonutChart` path corrected to
  `src/components/charts/CostDonutChart.tsx` with `COLLATED_ROW_LIMIT` at
  `SharePageTabs.tsx:28`.
- **Baseline refrozen:** scoped status SHA-256
  `698e100b5a7fc9f567f2b6b341327c88a0497fc1bd10907b4418c520e8ca7e6b`,
  scoped diff SHA-256
  `7f35473a3198388a9426d3337209a5074ec3ff275114475e77aaa3472e2ee1e3`.
- **Manifest hash refreshed** to
  `6b74f7dd83b8cf8beef77bfe14b63b956b24d7a7cd5ef8404df8044b49a658a5`.
- **Migration-lease owner-manifest drift:** The improve-stage manifest edit
  changed both the raw file hash and the `manifest_sha256` field. The durable
  lease still records the pre-edit `owner_manifest_file_sha256`
  (`1ce4884395...`) and `owner_manifest_self_sha256` (`e125172e8...`). Per
  `MIGRATION_LEASE_PROTOCOL.md` this is owner-manifest drift requiring a
  monotonic Program reissue (generation >=12) before UNIT-008 can write. The
  Publisher pack does not edit cross-pack Program artifacts; UNIT-008's
  immediate precondition already fail-closes on this mismatch. The Program
  must reissue with the current Publisher digests. This is a cross-pack
  coordination boundary, not a Publisher-internal defect.
- **Status tuple unchanged:** `CONDITIONALLY_READY/NOT_STARTED/NOT_EVALUATED/
  ACTIVE/ACTIVE`. `SLICE-001` (`UNIT-001`, `UNIT-002`, `UNIT-003`, `UNIT-006`,
  `UNIT-010`) remains dependency-closed; `next_unit=UNIT-001`.
- **Validation:** `bun run validate:plan-pack` passes clean.
