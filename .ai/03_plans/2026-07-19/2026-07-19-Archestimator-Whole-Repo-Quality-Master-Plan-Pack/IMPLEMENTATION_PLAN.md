# Archestimator Whole-Repo Quality Master Implementation Plan

> **Historical predecessor — not runnable.** This plan was superseded without
> implementation by `.ai/03_plans/2026-07-31/Code-Improvement/`. All 67 units
> are `SUPERSEDED`, `next_unit` is `null`, and no ready slices remain. Later
> execution language is preserved only as provenance and grants no authority to
> implement, deploy, provision providers, or cross an external boundary.

## 1. Historical Execution Contract

This was the runnable artifact produced by consolidating the three absorbed
2026-07-18 audit packs. It is now historical provenance only. Current source,
repository `AGENTS.md`, and the exact successor above govern any future work.
`UNIT-CATALOG.md` retains the former per-unit proposal without claiming delivery.

**Baseline:** `7f9a484b42b0d951f219e3c4ce1bfbb4364e8847`
**Run scope:** `PLAN_ONLY`
**Implementation:** `NOT_STARTED`
**Next unit:** `null`
**Package readiness:** `NOT_READY`
**Lifecycle:** `N/A`

The package is not ready because execution authority moved to the successor.
No unit in this predecessor is `READY` or `IN_PROGRESS`; supersession does not
mean the proposed implementation occurred.

## 2. Consolidation Decisions

- Preserve all three predecessor folders byte-for-byte under
  `source-snapshots/`; old plan text is evidence, never authority.
- Execute only reverified current work. Already-implemented, invalid, refuted,
  unsafe, duplicate, and externally owned directions have explicit dispositions
  in `AUDIT-AND-DISPOSITION.md` and are not parallel backlogs.
- Merge exact overlaps once: performance/improve restore reads, row style, email
  delivery, verification/CI; consistency/improve timing-safe comparisons and
  sign-out cleanup.
- Split stale compound proposals before execution: scanner viability from the
  image pipeline, queue topology from secret scoping, fixed-window limits from
  active-concurrency admission, Web Vitals cleanup from batching policy, XLSX
  copy removal from compression, and auth read coalescing from cookie caching.
- Preserve July-16 completed architecture. Do not redo extracted estimate-tree
  reads, typed D1 intent modules, `EditableRowStore` commit ownership, shared
  bearer helpers, durable public-rate-limit infrastructure, publication
  repository splits, or existing Client Portal migration work.

## 3. Risk Warnings

- `UNIT-015` (`runD1Batch`) is GitNexus **CRITICAL**: 23 direct and 76 total
  affected symbols across eight modules. The leader must review the upstream
  impact report before edits.
- `UNIT-014` (money oracle) is GitNexus **HIGH**: four direct and 12 total
  affected symbols, including a project-dashboard flow.
- `UNIT-001` is correctness-critical because variant removal can leave live
  estimate-template rows pointing at unavailable variants. Its receipt must
  include pre/post reference counts and an exact fix-forward path.
- `UNIT-023` is **HIGH** because admission races span isolates and persistent
  session state. Its receipt must identify duplicate/expired-row reconciliation.
- `UNIT-033` is **HIGH** because a mistaken drop policy can lose required
  collaboration, auth, error, or convergence messages. Required messages remain
  no-drop by default.
- `UNIT-035` is **HIGH** because auth-read optimization can silently weaken
  immediate revocation. The current uncached direct-read path is the rollback.
- `UNIT-038` (component guard SQL) is GitNexus **HIGH**: 18 affected symbols
  across four modules. It cannot change SQL before local `EXPLAIN QUERY PLAN`.
- `UNIT-045` (EstimateSheet decomposition) has high behavioral risk even though
  graph attribution is incomplete. It must preserve the July-16 row-store
  lifecycle and use exclusive ownership of the shared component.
- `UNIT-022` and `UNIT-052` through `UNIT-054` form a high-risk scanner state
  machine. A rejected topology/provider receipt supersedes the chain.
- `UNIT-024` and `UNIT-055` through `UNIT-057` must preserve invite token
  creation/rotation semantics; they cannot reuse the existing Client Portal
  notification queue schema blindly.
- `UNIT-043` and `UNIT-061` through `UNIT-064` must preserve every public action
  error shape; each domain closes with its own recovery receipt.

## 4. Dependency Graph

```text
UNIT-001 ───────────────────────────────► UNIT-038
UNIT-012 + UNIT-019 + UNIT-020 + UNIT-021 ► UNIT-022
UNIT-016 ───────────────────────────────► UNIT-023
UNIT-019 ───────────────────────────────► UNIT-020
UNIT-026 ───────────────────────────────► UNIT-027
UNIT-003 + UNIT-031 ────────────────────► UNIT-045
UNIT-007 + UNIT-010 + UNIT-041 ─────────► UNIT-048
UNIT-022 ─► UNIT-052 ─► UNIT-053 ─► UNIT-054
UNIT-024 ─► UNIT-055 ─► UNIT-056 ─► UNIT-057
UNIT-042 ─► UNIT-058 + UNIT-059 + UNIT-060
UNIT-043 ─► UNIT-061 + UNIT-062 + UNIT-063 + UNIT-064
UNIT-044 ─► UNIT-065 ─► UNIT-066
```

The graph below records the former dependency proposal. It exposes no current
work: every unit is `SUPERSEDED` and the former ownership slices are removed.

## 5. Execution Waves

### Wave 1 — correctness, security, and truth

| Unit | Title | Role | Dependencies | Risk |
| --- | --- | --- | --- | --- |
| `UNIT-001` | Repoint template rows when variants disappear | CORE | — | HIGH |
| `UNIT-002` | Make verification and CI claims truthful | CORE | — | LOW |
| `UNIT-003` | Guard stale estimate-row insert success | CORE | — | LOW |
| `UNIT-004` | Include contingency in proposal preview identity | CORE | — | LOW |
| `UNIT-005` | Purge workspace and query state on sign-out | CORE | — | MED |
| `UNIT-006` | Reconcile support unread state and result limits | CORE | — | LOW |
| `UNIT-007` | Fail closed for invite POSTs without origin evidence | CORE | — | MED |
| `UNIT-008` | Reuse constant-time comparison for CSRF/control secrets | CORE | — | MED |
| `UNIT-009` | Remove personal platform-admin fallback | CORE | — | LOW |
| `UNIT-010` | Centralize all live share-cookie decoding | CORE | — | LOW |
| `UNIT-011` | Separate telemetry pepper from publication secrets | CORE | — | MED |
| `UNIT-012` | Require direct-upload checksum binding | CORE | — | MED |
| `UNIT-013` | Bound upload scan-override TTL | CORE | — | LOW |
| `UNIT-014` | Route legacy money totals through the oracle | CORE | — | HIGH |
| `UNIT-015` | Make absent D1 batch support fail before writes | CORE | — | CRITICAL |
| `UNIT-016` | Converge fixed-window limits and breakers durably | CORE | — | MED |
| `UNIT-017` | Reduce agent adapters to canonical stubs | CORE | — | LOW |
| `UNIT-018` | Repair D1 performance tooling and current-stack docs | CORE | — | LOW |

`UNIT-001` was the former `next_unit`. It is now `SUPERSEDED` with every other
unit in this pack; use the successor for current-source disposition and work.

### Wave 2 — queues and uploads

| Unit | Title | Role | Dependencies | Risk |
| --- | --- | --- | --- | --- |
| `UNIT-019` | Resolve upload-job producer topology | CORE_EVIDENCE | — | MED |
| `UNIT-020` | Scope upload-job route secrets | CORE | `UNIT-019` | MED |
| `UNIT-021` | Prove a viable production scanner provider | CORE_EVIDENCE | — | MED |
| `UNIT-022` | Define image scan state machine and provider contract | CORE | `UNIT-012`, `UNIT-019`, `UNIT-020`, `UNIT-021` + positive receipts | HIGH |
| `UNIT-023` | Make upload admission atomic across isolates | CORE_EVIDENCE | `UNIT-016` | HIGH |
| `UNIT-024` | Define publication delivery queue contract | CORE | — | HIGH |
| `UNIT-052` | Enforce image scan admission and enqueue | CORE | `UNIT-022` positive receipt | HIGH |
| `UNIT-053` | Consume image scan results idempotently | CORE | `UNIT-052` | HIGH |
| `UNIT-054` | Gate image delivery to verified clean objects | CORE | `UNIT-053` | HIGH |
| `UNIT-055` | Persist publication delivery intent and enqueue | CORE | `UNIT-024` positive binding receipt | HIGH |
| `UNIT-056` | Deliver publication events idempotently | CORE | `UNIT-055` | HIGH |
| `UNIT-057` | Reconcile publication delivery outcomes | CORE | `UNIT-056` | HIGH |

Evidence/contract units terminate in one of two valid states: unlock the exact
bounded successor named by a positive receipt, or mark every dependent branch
`SUPERSEDED`/boundary-stopped with a decisive negative receipt. Dependency
completion alone never authorizes the positive branch.

### Wave 3 — deterministic performance work

| Unit | Title | Role | Dependencies | Risk |
| --- | --- | --- | --- | --- |
| `UNIT-025` | Batch restore-replay row reads | CORE | — | LOW |
| `UNIT-026` | Make Web Vitals page lifecycle deterministic | CORE | — | LOW |
| `UNIT-027` | Decide Web Vitals batching and sampling from evidence | CORE_EVIDENCE | `UNIT-026` | LOW |
| `UNIT-028` | Avoid empty five-minute cron event writes | CORE | — | LOW |
| `UNIT-029` | Reconcile activity outbox set-wise | CORE | — | MED |
| `UNIT-030` | Narrow whole-result TanStack Query subscriptions | CORE | — | LOW |
| `UNIT-031` | Stabilize virtual row inputs without Hooks violations | CORE_EVIDENCE | — | MED |

### Wave 4 — measured decisions and low-priority consistency

| Unit | Title | Role | Dependencies | Risk |
| --- | --- | --- | --- | --- |
| `UNIT-032` | Replace unbounded library loading with order-safe paging | CORE_EVIDENCE | — | MED |
| `UNIT-033` | Define message-specific Durable Object backpressure | CORE_EVIDENCE | — | HIGH |
| `UNIT-034` | Measure and remove redundant XLSX body copying | CORE_EVIDENCE | — | MED |
| `UNIT-035` | Decide auth read coalescing without weakening revocation | CORE_EVIDENCE | — | HIGH |
| `UNIT-036` | Place the dormant closed-beta guard without request D1 | AUXILIARY_EVIDENCE | — | MED |
| `UNIT-037` | Map route/provider consumers before provider splitting | CORE_EVIDENCE | — | MED |
| `UNIT-038` | Explain component-source guard SQL before refactoring | CORE_EVIDENCE | `UNIT-001` | HIGH |
| `UNIT-039` | Resolve column-width reset scope from UX evidence | AUXILIARY_EVIDENCE | — | LOW |
| `UNIT-040` | Decide invite-preview disclosure policy | AUXILIARY_EVIDENCE | — | LOW |
| `UNIT-041` | Resolve the root share API contract | AUXILIARY_EVIDENCE | — | LOW |
| `UNIT-067` | Decide XLSX ZIP compression from isolated evidence | CORE_EVIDENCE | — | MED |

### Wave 5 — maintainability after behavior is stable

| Unit | Title | Role | Dependencies | Risk |
| --- | --- | --- | --- | --- |
| `UNIT-042` | Inventory and classify real client failures | CORE | — | MED |
| `UNIT-043` | Define the action-error compatibility contract | CORE | — | HIGH |
| `UNIT-044` | Define workspace repository extraction boundaries | CORE | — | MED |
| `UNIT-045` | Decompose EstimateSheet orchestration and JSX | CORE | `UNIT-003`, `UNIT-031` | HIGH |
| `UNIT-046` | Remove the FireCMS Neat patch and dependency | AUXILIARY | — | LOW |
| `UNIT-047` | Delete orphaned Client Portal decision actions | AUXILIARY | — | LOW |
| `UNIT-058` | Migrate workshop client failures | CORE | `UNIT-042` | MED |
| `UNIT-059` | Migrate publication and portal client failures | CORE | `UNIT-042` | MED |
| `UNIT-060` | Migrate admin, support, and upload client failures | CORE | `UNIT-042` | MED |
| `UNIT-061` | Migrate publication action errors | CORE | `UNIT-043` | HIGH |
| `UNIT-062` | Migrate library action errors | CORE | `UNIT-043` | HIGH |
| `UNIT-063` | Migrate estimate and workshop action errors | CORE | `UNIT-043` | HIGH |
| `UNIT-064` | Migrate admin and support action errors | CORE | `UNIT-043` | HIGH |
| `UNIT-065` | Extract publication and homebase repositories | CORE | `UNIT-044` | MED |
| `UNIT-066` | Extract access and admin repositories | CORE | `UNIT-065` | MED |

### Wave 6 — conditional directions, not disguised implementation

| Unit | Title | Role | Dependencies | Risk |
| --- | --- | --- | --- | --- |
| `UNIT-048` | Reassess a Next.js 16 nonce CSP only after share stabilization | DIRECTION | `UNIT-007`, `UNIT-010`, `UNIT-041` | HIGH |
| `UNIT-049` | Revision handoff deferred to the MVP Stage-C owner | SUPERSEDED | external owner | MED |
| `UNIT-050` | Cost-intelligence research has no active owner | SUPERSEDED | named future trigger | MED |
| `UNIT-051` | Remove the dead row-update broadcast hook | TEST_GATED | explicit test task | LOW |

`UNIT-049` is deferred to the named MVP Stage-C owner. `UNIT-050` is
`SUPERSEDED/DEFERRED_NO_ACTIVE_OWNER`; it can be reopened only after
`UNIT-014=VERIFIED` and creation of an explicit cost-intelligence plan pack.
Neither appears as dependency-ready work. `UNIT-051` remains `BLOCKED` only because
its preferred source deletion requires maintained test-file cleanup. None of
these units authorizes browser rollout, hosted changes, new paid providers, or
broad product expansion.

## 6. Historical Outcome Gates And Authorization Boundaries

`plan-pack.json#outcome_transitions` and `#readiness_rules` are the executable
record of the former state-transition contract. They are retained for provenance
and must not be applied to reactivate this pack. Under the former contract,
`depends_on` completion alone could not advance a conditionally gated unit, and
`SUPERSEDED` dominated weaker states.

- `UNIT-019`: `KEEP_HTTP` unlocks `UNIT-020`; `KEEP_QUEUE_NATIVE` supersedes
  `UNIT-020` with a receipt; `DELETE` supersedes `UNIT-020`, `UNIT-022`, and
  `UNIT-052` through `UNIT-054`.
- `UNIT-021`: a viable local contract advances `UNIT-022`; a negative provider
  result supersedes the scanner implementation chain. External provisioning or
  hosted proof remains `AUTH-001`, not a local blocker.
- `UNIT-024`: a semantically compatible existing bound queue advances
  `UNIT-055`; otherwise the chain stops at `AUTH-002` before any new/unbound
  queue, paid service, deployment, or provider change.
- `UNIT-048` and `UNIT-051`: product test/browser work is `AUTH-003` and remains
  stopped until the user explicitly requests that task. Safe source/docs review
  may still complete before the boundary.

The manifest retains `release_status: BOUNDARY` because the external/provider
limits recorded here remain truthful historical boundaries. They do not make
this predecessor runnable. No boundary resolution can reactivate a unit here;
current work must be reconciled and owned by the successor.

## 7. Former Parallel Ownership Model

The former six ready slices were:

- **Correctness:** `UNIT-001`, `UNIT-003` through `UNIT-006`.
- **Security:** `UNIT-007` through `UNIT-013`, plus `UNIT-016`.
- **Data/ops:** `UNIT-002`, `UNIT-014`, `UNIT-015`, `UNIT-017`, `UNIT-018`,
  `UNIT-025`, `UNIT-028`, `UNIT-029`.
- **Frontend/performance:** `UNIT-026`, `UNIT-030`, `UNIT-031`.
- **Evidence:** `UNIT-019`, `UNIT-021`, `UNIT-032` through `UNIT-037`, and
  `UNIT-039` through `UNIT-041`, plus `UNIT-067`.
- **Contracts/maintenance:** `UNIT-024`, `UNIT-042` through `UNIT-044`,
  `UNIT-046`, `UNIT-047`.

These slices are retained only to explain the former proposal. They are absent
from the manifest and must not be assigned or executed.

## 8. Former Evidence And Test Contract

The former plan required each unit to produce:

1. current-source premise confirmation;
2. upstream GitNexus impact before editing each symbol;
3. scoped diff and static evidence named in `UNIT-CATALOG.md`;
4. a receipt in `LOOP_LEDGER.md` with remaining risk, next-state changes, and
   fix-forward/recovery evidence for `UNIT-001`, `UNIT-014`, `UNIT-015`,
   `UNIT-022` through `UNIT-024`, `UNIT-033`, `UNIT-035`, `UNIT-038`,
   `UNIT-045`, and every dependent high-risk implementation unit.

Minimum recovery receipts are concrete: `UNIT-001` records affected estimate and
template-row reference counts plus the repair query/path; `UNIT-014` records the
legacy/canonical money-output matrix and the call-site rollback; `UNIT-023`
records duplicate/expired admission reconciliation and idempotent retry;
`UNIT-033` records every message class and restores required messages to no-drop
on regression; `UNIT-035` restores the current uncached direct-read path and
proves revocation behavior. Queue, scanner, SQL, action-error, and repository
units retain the more specific recovery obligations in their catalog entries.

Product tests are `TEST_PROPOSAL` unless the user explicitly creates a
`TEST_TASK`. Type/LSP, lint, static validators, SQL dry runs, and local
`EXPLAIN QUERY PLAN` are allowed evidence. Do not claim an unrun test passed.

`FOLLOWUP-TEST-001` preserves the stale getting-started test cleanup from the
consistency pack. It is not a runnable unit until a user-authorized test task
allows test-file edits.

## 9. Historical Closeout

This predecessor did not reach `ACHIEVED`; implementation remained
`NOT_STARTED`. The original closeout target was:

- every CORE unit is `VERIFIED` or evidence-rejected with a current receipt;
- every AUXILIARY/DIRECTION unit is `VERIFIED`, `SUPERSEDED`, or explicitly
  deferred to its named owner and trigger;
- all high-risk impact reports and decision evidence are recorded;
- source snapshots still match `SOURCE-INTEGRITY.md`;
- no predecessor active path remains outside archives;
- plan-pack, planning-prompt, scoped whitespace, and GitNexus change checks pass;
- no pending ready unit remains in `LOOP_LEDGER.md`.
