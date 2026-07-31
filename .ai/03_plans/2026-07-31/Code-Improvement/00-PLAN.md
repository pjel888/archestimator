# Archestimator Whole-Codebase Improvement and Debugging Plan

Package: `PLAN-2026-07-31-code-improvement`  
Baseline: `93d5124d268a1b6016f63f8a8e5e69e118630d13`  
Profile: `high-blast-radius` plan; every unit is Q2-or-higher  
Action ceiling: `IMPLEMENT_LOCAL`  
Package status: `CONDITIONALLY_READY`  
Canonical next unit: `UNIT-000`

## 1. Target Result

Produce a current-source, executable improvement program that:

1. fixes confirmed correctness and CRUD-lifecycle defects;
2. closes current authorization, upload, operational, browser, queue, and
   privacy/security gaps;
3. bounds the highest-leverage D1, request, serialization, and render paths;
4. deepens high-churn modules behind useful interfaces without compatibility
   shells;
5. removes proven dead code and stale architecture guidance; and
6. repairs the quality-baseline lineage contract that currently prevents every
   Q-profile from starting; and
7. finishes with fresh Q2-or-higher evidence rather than static-review claims.

The stop condition is not "all possible cleanup." It is every confirmed finding
in `01-AUDIT-REGISTER.md` owned by a verified unit, all investigation-only items
explicitly decided, and no red, skipped, weakened, malformed, or stale critical
evidence.

## 2. Scope and Non-Goals

### In scope

- `src/`, `worker.ts`, `wrangler.jsonc`, active `migrations/`, `tests/`, `e2e/`
- Projects, estimates, commercial terms, proposals, component library,
  collaboration, publication, Client Portal, change requests, commitments,
  uploads/artifacts, onboarding, support, notifications/activity, admin/privacy
- Local Cloudflare/D1 contracts for the resources bound in `wrangler.jsonc`
- Quality-gate correctness, including component-baseline immutable lineage
- Current-source reconciliation of the July 19 master quality and security packs

### Out of scope

- deployment or mutation of production/provider state;
- legacy `supabase/migrations/` or the unrelated Cloudflare `archestimator`
  project;
- paid services, credential rotation, or GitHub ruleset mutation;
- speculative features such as archive/restore transitions without a validated
  product requirement;
- a broad framework upgrade or dependency replacement without a demonstrated
  defect.

## 3. Baseline and Audit Method

The audit used current source as authority and reconciled graph leads against
files before accepting findings. Repository inventory at the baseline:

- 1,480 files under `src/`, including 1,467 TypeScript/TSX files
- 75 pages, 94 route handlers, and 62 server-action modules
- 1,024 files under `tests/`, including 1,000 Vitest test files
- 26 `e2e/` files and 125 active D1 migration files
- 300 GitNexus execution flows after local index refresh

Static review covered all major product domains. Runtime debugging began with
`bun run ops:agent-debug-snapshot`; its latest local `/workshop` error was stale
and already mitigated, so it was not promoted to a current defect. Installed
dependency audit returned no High/Critical advisory. The full DOM suite baseline
passed 2,140 suites and 6,775 tests; its machine-readable summary is
`evidence/baseline-dom-tests.json`. That green baseline does not cover the
missing edge cases enumerated in the audit register. A separate
`bun run quality:contracts` probe fails only on
`COMPONENT_BASELINE_BOOTSTRAP_LINEAGE_INVALID`: the validator checks current
`HEAD` history instead of the immutable comparison base. `QA-001` and
`UNIT-000` own that prerequisite; no Q-profile is claimed green before repair.

## 4. RALPLAN-DR Decision Summary

### Principles

1. Current source beats archived plans and stale architecture documents.
2. Repair invariants at their owning boundary, not in callers or UI patches.
3. Prefer deletion and direct imports over compatibility facades.
4. Tests belong inside the unit that changes behavior.
5. Local proof cannot claim hosted or production enforcement.

### Decision drivers

1. A confirmed High realtime revocation defect and multiple data-integrity bugs
   outweigh cosmetic cleanup.
2. The highest performance costs come from unbounded or serial data contracts,
   not isolated micro-optimizations.
3. Large-file size is a symptom; module depth, locality, and deletion value
   determine extraction priority.

### Options considered

#### Option A - Current-source consolidated successor pack

Recheck inherited findings, retire stale ones, group active defects by invariant,
and execute a 29-unit decision-gated dependency graph.

Advantages:

- one current authority;
- no duplicate implementation against already-landed July work;
- security, correctness, and scale work can be sequenced by risk;
- every unit has an evidence contract.

Tradeoff:

- the first audit pass is broader than a quick-fix list.

Decision: **selected**.

#### Option B - Resume the July 19 master packs verbatim

Advantages:

- historical breadth and existing unit numbering.

Tradeoffs:

- duplicates completed row-store, estimate-intent, component-library paging, and
  Client Portal queue work;
- retains findings based on older runtime and product state;
- creates two active execution authorities.

Decision: rejected as an execution strategy; retained only as provenance.

#### Option C - Fix only deterministic quick bugs

Advantages:

- fastest visible patch set.

Tradeoffs:

- leaves the High revocation gap, upload trust-chain defects, unbounded Projects
  data path, and architectural hotspots;
- does not satisfy the requested whole-codebase audit.

Decision: rejected as incomplete.

### Strongest counterargument

A 29-unit program can become a second backlog rather than an executable plan.
The answer is not to merge unrelated work. The mitigation is one canonical next
unit, self-contained evidence per unit, dependency-closed slices, direct
current-source file lists, and a finish rule that retires or verifies every
owned finding.

## 5. Requirements and Acceptance

### `REQ-001` - CRUD and correctness integrity

All confirmed create/read/update/delete, archive/restore, replay, pagination,
commercial truth, publication state, and support idempotency defects are fixed
without weakening tenant, revision, or receipt guarantees.

Acceptance:

- commercial mutations use canonical workspace-inherited authorization and bind
  the exact guard placeholder count;
- a fresh portal credential verifies after a recipient was verified previously;
- notification traversal returns every row exactly once with stable tie-breaks;
- publication never reports `sent` when delivery-state persistence failed;
- concurrent support replay has no duplicate conversation side effects;
- template variant references remain valid after component variant mutation;
- proposal preview cache/signature changes whenever any quantity sidecar changes.

### `REQ-002` - Security boundaries

Authorization and secret-bearing boundaries fail closed across realtime,
uploads, operational endpoints, queues, browser tokens, sessions, support, and
retention.

Acceptance:

- a revoked realtime subject cannot reconnect with an unexpired token;
- realtime upgrades authenticate before capacity allocation, validate origin,
  apply subject/global controls, and use a dedicated secret;
- only checksum-verified, type-verified bytes with an authoritative clean result
  can bind; if scanner viability is not proven, uploads fail closed rather than
  receiving a policy-only clean label;
- public operational routes and the secondary origin are removed or made
  unreachable through bound internal control paths;
- queue envelopes are authenticated and dedupe identity is recomputed;
- token-bearing responses are non-cacheable, cookies follow validated request
  security, share-state oracles are reduced, and isolate caches cannot cross
  user contexts;
- session material follows the Better Auth compatibility decision and security
  telemetry follows least exposure and complete retention coverage; an
  incompatible token migration remains truthfully blocked, not assumed solved.

### `REQ-003` - Bounded performance

Request, D1, serialization, replay, reconciliation, and render costs are bounded
by explicit contracts rather than total workspace size.

Acceptance:

- ready creator workspace lookup performs one workspace read; member lookup adds
  at most the required membership read, with onboarding reads at an explicit
  host;
- Projects uses stable server pagination, page size at most 50, and work that is
  independent of total workspace project count;
- AI package evidence reads one prior-estimate snapshot and runs independent
  evidence branches without avoidable serial depth;
- replay of 100 restored rows uses one authoritative batch read;
- a 500-row activity reconciliation uses fewer than ten D1 statements;
- scoped React subscriptions do not depend on whole query objects.

### `REQ-004` - Deep module architecture

High-churn modules expose deep, cohesive interfaces with improved locality and
no pass-through facade.

Acceptance:

- workspace context/provisioning no longer hides onboarding installation;
- project catalogue owns access-qualified paging and compact card projection;
- estimate display projection is pure and independently testable while the
  existing `EditableRowStore` remains the mutation owner;
- component editor draft, validation, diff, and mutation projection live in one
  pure domain model;
- direct import migration permits deletion of replaced exports.

### `REQ-005` - Lifecycle and product-policy closure

Lifecycle states are either operable, explicitly unsupported, or removed from
user-facing affordances.

Acceptance:

- component archive, native portal archive, and tab archive/restore gaps receive
  an evidence-backed product decision;
- investigation-only states do not silently become implementation requirements;
- visibility-filtered portal thread paging cannot strand reachable content.

### `REQ-006` - Privacy, operations, and provider truth

Operational data and provider configuration match the bound Cloudflare runtime
without overclaiming hosted enforcement.

Acceptance:

- cron/queue logs use structured redaction;
- redundant actor email and raw user-agent persistence are removed, minimized,
  or justified;
- retention registry tests cover every relevant security/observability table;
- `wrangler.jsonc` remains executable provider truth;
- hosted GitHub/Cloudflare readback is reported as a boundary until explicitly
  authorized and collected.

### `REQ-007` - Tests and quality evidence

Every behavior-changing unit carries fresh, machine-readable, risk-appropriate
proof.

Acceptance:

- Q2 units include focused negative-path, concurrency, tenant-isolation, and
  mutation-integrity tests plus the selected broader gate;
- browser-bound behavior includes Playwright or browser/screenshot evidence
  selected by the Q-profile;
- performance units include statement, payload, or render budgets;
- the first admitted bootstrap baseline remains valid after being tracked only
  when no baseline existed at or before its immutable comparison base, while a
  later re-bootstrap is rejected;
- no timeout, stale receipt, or static source inspection is labelled `PASS`.

### `REQ-008` - Cleanup, documentation, and plan authority

Dead security-sensitive surfaces and stale repository guidance are removed, and
one plan remains the execution authority.

Acceptance:

- orphaned Client Portal decision void action/service and proven unused helpers
  are deleted;
- `.ai/06_specs/deep/architecture-overview.md` reflects the current
  Cloudflare/D1 runtime or is retired;
- July 19 pack findings are marked current, superseded, refuted, boundary-only,
  or absorbed in this pack;
- final source and documentation scans contain no contradictory active policy.

## 6. Architecture Deepening Decisions

| Candidate | Module and interface | Depth and seam | Adapter/locality | Deletion test | Unit |
| --- | --- | --- | --- | --- | --- |
| Workspace context | `getCurrentWorkspaceContext`, `provisionDefaultWorkspace`, explicit starter bootstrap | Hides default selection, closed-state and membership rules; removes onboarding work from a read seam | Existing D1 adapter; high locality for auth/workspace rules | Replacing old imports allows deletion of `ensureDefaultWorkspace` behavior shell | `UNIT-015` |
| Project catalogue | `listProjectCataloguePage`, `listProjectOptions` | Owns access qualification, groups, favorites, summary counts, stable cursor | Route-specific D1 read model | Old omniscient project aggregate is removable from Projects consumers | `UNIT-016` |
| AI evidence | `readPackageBuilderEvidence` | One bounded snapshot projects historical and comparable evidence | D1-backed module local to package builder | Duplicate prior-estimate queries disappear | `UNIT-017` |
| Estimate display model | `projectEstimateSheetView` | Owns search, facets, grouping, visible IDs and derived totals | Pure in-process module | Extraction fails if it only wraps existing helpers without moving invariants | `UNIT-019` |
| Component editor model | `createDraft`, `validateDraft`, `diffDraft`, `toMutationInput`, `toEditedItem` | Owns variant/default/image/attachment/pending-scope invariants | Pure model; action calls remain adapters | Modal no longer contains persistence-shape logic | `UNIT-021` |

The completed `EditableRowStore`, estimate intent modules, component mutation
modules, paged component browser, and Client Portal queue are preserved rather
than reimplemented.

## 7. Execution Strategy

### Phase 0 - Authority and viability

1. `UNIT-000` repair quality-baseline lineage, then retire duplicate runnable
   predecessor authority
2. `UNIT-024` decide authoritative scanner viability
3. `UNIT-013` decide Better Auth session-token compatibility
4. `UNIT-027` decide archive lifecycle policy

### Phase A - Critical boundaries and deterministic defects

5. `UNIT-007` durable realtime revocation
6. `UNIT-008` realtime admission and remaining support/presence secret boundary
7. `UNIT-009` upload admission/finalize fail-closed integrity
8. `UNIT-025` conditional authoritative scanner implementation
9. `UNIT-001` commercial/proposal truth integrity
10. `UNIT-002` portal credential re-verification
11. `UNIT-003` notification keyset traversal and UI paging
12. `UNIT-004` publication delivery truth and legacy cutover
13. `UNIT-005` support replay, actor binding, and visible paging
14. `UNIT-006` component/template referential integrity
15. `UNIT-026` conditional session-token-at-rest migration

### Phase B - Operational and privacy hardening

16. `UNIT-011` authenticated queue envelope and dedupe identity
17. `UNIT-010` operational endpoint/origin isolation
18. `UNIT-012` browser/share/cache boundary
19. `UNIT-014` operational logging, minimization, and retention

### Phase C - Bounded data paths and deep modules

20. `UNIT-015` workspace context/onboarding seam
21. `UNIT-016` paged project catalogue
22. `UNIT-017` AI evidence snapshot and parallel reads
23. `UNIT-018` restore replay batch read
24. `UNIT-019` estimate display projection model
25. `UNIT-021` component editor domain model
26. `UNIT-022` set-wise activity outbox
27. `UNIT-023` scoped TanStack Query subscriptions

### Phase D - Reconciliation and deletion

28. `UNIT-028` safe dead-code deletion, architecture docs, and predecessor reconciliation
29. `UNIT-020` final ledger and terminal-state closeout

Dependencies in `02-UNIT-CATALOG.md` are authoritative. `UNIT-000` is the sole
initial ready slice. Conditional units are activated only by their decision
receipts. Phase order expresses risk priority, not permission to merge units.

Decision receipts use the exact transition protocol in `02-UNIT-CATALOG.md`.
An activated conditional unit must become `VERIFIED`; an external-only branch
becomes decision-backed `SUPERSEDED` plus an `AUTH-001` `BOUNDARY` and can lead
only to `AUTH_BLOCKED`; an exhausted local design becomes `BLOCKED` and can lead
only to `TECH_BLOCKED`. A missing or failed quality receipt remains
`QUALITY_BLOCKED` while the package is active. None of those states is rewritten
as `ACHIEVED`.

`GATE-020` is the machine-readable closeout promotion gate. It remains `FAIL`
until the executable pre-promotion contract in `03-VERIFICATION-MATRIX.md`
proves `UNIT-025` and `UNIT-026` are either verified implementations or an
explicitly permitted authorization-backed disposition. Any `BLOCKED` branch
keeps `UNIT-020=PLANNED` and routes only to the separate fixed-baseline Q2+
technical stop gate. That gate proves exact blocked requirement transitions,
materially distinct failed fallbacks, sealed evidence, no runnable work, and the
`NOT_READY/INCOMPLETE/BOUNDARY/ACTIVE/TECH_BLOCKED` terminal tuple.
`UNIT-028` is unconditional safe work and must verify before either terminal
path; only completion-only ledger promotion remains in `UNIT-020`.

## 8. Verification Strategy

### Plan-pack construction evidence

- plan-pack validator passes;
- Markdown/JSON contract and active-policy scans pass;
- `git diff --check` passes;
- GitNexus change detection shows planning artifacts only and no product symbol
  or execution-flow change.

The automatic classifier places the durable JSON artifacts at Q1. Its aggregate
verifier is currently `FAIL` only because `QA-001` stops
`quality:contracts`; this pack records that honestly and makes the Q2 repair the
first runnable unit rather than claiming a green aggregate gate.

Exact unit commands, report paths, and numeric thresholds are in
`03-VERIFICATION-MATRIX.md`.
`evidence/initial-plan-authors.json` freezes the complete initial writer roster;
every cumulative candidate-author receipt must contain that set plus later
writers before an independent review can pass.

### Q2 critical change gate

Used for auth/authz, D1 mutation correctness, credentials, realtime, upload,
queue, session, retention, tenant boundaries, publication delivery, and every
candidate in this pack. `UNIT-000` is Q2 because it changes quality-gate
behavior; later candidates remain Q2 minimum because they accumulate that
change against one immutable comparison baseline. Classification may still
escalate to Q3.

Minimum:

- focused positive and negative tests;
- concurrency/replay and tenant-isolation tests where applicable;
- local D1/DO/queue integration evidence;
- broader affected-domain Vitest shard;
- type-check and production build in serial heavy-command slots;
- browser/Playwright evidence for public/auth flows;
- independent security and architecture/correctness review.

### Expanded test plan

Unit tests:

- guard SQL placeholder/bind parity;
- proposal signature sidecars;
- credential claim after prior recipient verification;
- tuple cursor equal-timestamp traversal;
- scanner classification, checksum and byte ceilings;
- signed envelope tamper and dedupe mismatch;
- pure view/editor model invariants.

Integration tests:

- D1 mutation receipts and authorization with inherited workspace membership;
- losing support replay after a read-state transition;
- template selection repoint/reject transaction;
- realtime revoke then reconnect denial;
- upload reserve/finalize/scan/bind lifecycle;
- publication send success followed by persistence failure;
- set-oriented outbox reconciliation.

Browser/E2E:

- notification load-more without duplicates or omissions;
- portal resend/re-verification;
- invite/share cache and response-state behavior;
- Projects paging/filter/sort/favorite preservation;
- estimate sheet focus, keyboard, totals, history, and mutation flows after
  projection extraction;
- component create/edit variants after model extraction.

Observability:

- structured redacted cron/queue errors;
- queue retry/dead-letter receipts;
- statement counts and latency/payload budgets;
- no claim of production behavior without hosted readback.

## 9. Pre-Mortem

### Failure scenario 1 - Security fixes break valid realtime collaboration

Early warning:

- local clients fail initial connect or refresh loops spike after secret/origin
  enforcement.

Mitigation:

- characterize current valid host/origin and refresh behavior first; land durable
  revocation and upgrade controls in separate units with local DO integration.

### Failure scenario 2 - Pagination improves scale but loses access semantics

Early warning:

- favorites, groups, invite-only visibility, or equal-timestamp items differ
  between pages.

Mitigation:

- define stable compound cursors and access-qualified SQL before UI changes;
  test 100/500/1,000 fixtures and page concatenation against an authoritative
  expected set.

### Failure scenario 3 - Refactors create facades while complexity stays put

Early warning:

- old large files retain domain logic, new modules only forward parameters, or
  both old and new entry points remain.

Mitigation:

- enforce the deletion test in each architecture unit; direct-import callers and
  delete replaced exports in the same unit.

### Failure scenario 4 - Upload hardening marks unscanned content clean

Early warning:

- policy-only scanner results still map to `clean`, checksum comes from ETag, or
  pending attachment IDs remain bindable.

Mitigation:

- define an explicit inconclusive/error state, verify stored bytes, cap reads,
  and require authoritative clean state at the binding transaction.

### Failure scenario 5 - Plan execution duplicates historical work

Early warning:

- a unit proposes another row store, component-list pagination, estimate intent
  layer, or Client Portal queue.

Mitigation:

- `UNIT-000` freezes the predecessor disposition map; `UNIT-028` reconciles its
  safe authority/deletion work, `UNIT-020` closes the terminal ledger, and the
  lead rechecks current source before every unit.

## 10. Decisions and Boundaries

Assumptions under active validation:

- `ASSUMP-001`: installed Better Auth `1.6.23` may expose a session lookup and
  rotation contract compatible with non-reusable token storage; `UNIT-013`
  validates or invalidates this without presupposing a digest design.
- `ASSUMP-002`: current Next.js 16 runtime/documentation may support an enforced
  nonce CSP without breaking required scripts; `UNIT-012` validates or
  invalidates that branch while still landing unconditional browser controls.
- `ASSUMP-003`: an authoritative malware scanner may be viable inside the
  currently bound runtime; `UNIT-024` distinguishes local viability, an
  authorization-bound external provider, and technical infeasibility.

- `DEC-AUTO-001`: this pack becomes the current execution index only after
  `UNIT-000` marks earlier whole-repository packs non-runnable while preserving
  their provenance and actual implementation state.
- `DEC-AUTO-002`: no compatibility facade or feature flag is authorized for
  local refactors unless a current external consumer is proven.
- `DEC-AUTO-003`: canonical Client Portal delivery is preferred over preserving
  legacy publication authoring; if live legacy use is proven, add an explicit
  durable adapter rather than sharing payload semantics implicitly.
- `DEC-AUTO-004`: component, portal, and tab archive gaps remain
  investigation-only until `UNIT-027` proves lifecycle intent.
- `DEC-AUTO-005`: `UNIT-024` alone activates, supersedes, or blocks `UNIT-025`
  using the named scanner outcomes and conditional transition protocol in
  `02-UNIT-CATALOG.md`.
- `DEC-AUTO-006`: `UNIT-013` alone activates or blocks `UNIT-026` using the
  named Better Auth compatibility outcomes; accepted risk is not completion.
- `AUTH-001`: deployment, provider mutation/readback, GitHub ruleset mutation,
  credential rotation, paid services, irreversible data loss, and out-of-scope
  systems require explicit authorization. Local implementation and local proof
  do not.

## 11. Staffing and Handoff

Recommended implementation topology, always capped by current host pressure:

- lead/integrator: owns baseline, dependencies, shared-file arbitration, and
  final claims;
- security specialist: `UNIT-007` through `UNIT-014`, plus `UNIT-024` through
  `UNIT-026`;
- correctness/data specialist: `UNIT-001` through `UNIT-006`;
- performance/architecture specialist: `UNIT-015` through `UNIT-023`;
- test engineer: independent evidence review after each Q2 unit;
- final code reviewer and architect: independent completion review.

One writer owns each file. Workers must not revert unfamiliar changes. Heavy
commands run within the host ceiling and never overlap GitNexus indexing with a
production build or mutation work.

## 12. Final Gate

Before declaring the program complete:

1. reconcile every requirement, criterion, finding, and unit;
2. run `bun run validate:plan-pack -- .ai/03_plans/2026-07-31/Code-Improvement`;
3. run the final Q2 integrated evidence profile in serial host-safe shards;
4. run `git diff --check` and GitNexus `detect_changes`;
5. obtain independent security, correctness, architecture, and code reviews;
6. report any hosted boundary as `BOUNDARY`, never `PASS`.

Generated test, browser, candidate, author, review, quality, and GitNexus
receipts live only under ignored `.tmp/code-improvement`; durable decision and
disposition records remain in this pack and are included in the exact candidate.
