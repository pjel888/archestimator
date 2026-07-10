# 14 - Canonical Risk Register

These `RISK-*` IDs are the stable records referenced by `plan-pack.json`. `IMPLEMENTATION_PLAN.md` owns unit behavior; this register owns triggers, mitigations, and fallbacks.

| ID | Risk / trigger | Severity / probability | Owning units / criterion | Mitigation and proof | Fallback |
|---|---|---|---|---|---|
| `RISK-001` | The wrong bottleneck is optimized, plan admission is confused with runtime source identity, or a producer change escapes lineage. | High / Medium | `UNIT-001`, `UNIT-004`, `UNIT-005` / `AC-007` | Pre-edit-only planning admission; deterministic v2 helper; separate application/producer digests; Units 001-004 frozen cohort; dual-digest predecessor admission; owned before/after product-test deltas; strict branch predicates. | Reopen the earliest changed application/tool owner and rerun its dependency closure; never infer currentness from Git HEAD alone. |
| `RISK-002` | Graph, incremental totals, subtree merge, or stable sibling order diverges from the nested-tree oracle. | Critical / Medium | `UNIT-006`-`UNIT-009` / `AC-004` | Dual-read shadow mode, exact-order parity, >=1,000 generated operation sequences, minimized seeds. | Resolve mode `off`; retain nested helpers as oracle; repair the first counterexample. |
| `RISK-003` | Route, mutation, expired local session, or direct remote proof crosses actor/resource/tenant boundaries or leaks evidence. | Critical / Low | `UNIT-005`, `UNIT-009`, `UNIT-011` / `AC-006` | Authorization-first denials; generated local Better Auth session and allowlisted `runtime.env` in ignored mode-`0600` state; owner/hash checks; child-process-only env propagation; Wrangler auth plus exact binding/database preflight; synthetic tenant only; redacted artifacts. `UNIT-011` adds no endpoint. | Mode `off`; reject the app request or abort before remote seed; run the redacted incident/debug path. |
| `RISK-004` | Entity rollback, template insert, optimistic-ID resolution, or realtime ordering clobbers a newer concurrent edit. | Critical / Medium | `UNIT-009` / `AC-004` | Revision-scoped inverse patches, atomic reservation rollback, concurrent event-sequence tests, no whole-tree restore. | Disable entity-patch mode; refetch server-confirmed state; minimize the event sequence. |
| `RISK-005` | Hosted D1 proof crashes after seed, loses a delete response, has multiple unresolved runs, or writes recovery output that masquerades as proof. | High / Low | `UNIT-011` / `AC-008` | Create/fsync every directory from durable `.ai/`; one `cleanup.json` lease/journal before seed; eleven-table exact keys; explicit-run cleanup; separate non-indexable recovery schema; complete hosted report only after uninterrupted cleanup. | Block new seed; clean each named UUID; never project recovery as hosted proof; incident path if provider failure persists. |
| `RISK-006` | Browser timing is non-reproducible, uses stale build/data, races shared state, or records false verified/current evidence after cleanup/first-transition interruption. | High / Medium | `UNIT-001`, `UNIT-002` / `AC-007` | Serialized units, immutable run artifacts/current projections, dual fingerprints, UUID state/ports/auth, built-server/CDP/cache profile, report-before-cleanup, exit/closed-port receipt, directory-chain fsync, absent-projection recovery, pinned Chromium, raw samples, zero retries, 100 repetitions for <=2% claims. | Fail preflight/budget, invalidate uncertain producers, retain the run/lease, recover projections from journal, and never waive a sample. |
| `RISK-007` | Loaded-only/truncated state yields false totals, incomplete export, or stale evidence is treated as current. | High / Medium | `UNIT-001`, `UNIT-010` / `AC-003` | Explicit truncation UI, complete server proposal materialization, source/fixture/evidence hashes, current-source precedence. | Block unsafe move/export; refresh the exact stale proof class. |
| `RISK-008` | An index or hosted run worsens writes/storage or exceeds free-tier posture. | High / Medium | `UNIT-003`, `UNIT-011` / `AC-008` | Exact query-plan selection, before/after rows read/written, run projection below 50% of current allowance, active migrations only. | Do not add/remove the candidate index; abort before seed. |
| `RISK-009` | Virtualization during editing loses focus/scroll/set semantics or fails tablet/mobile accessibility. | High / Medium | `UNIT-002`, `UNIT-008` / `AC-006` | Browser focus/keyboard/scroll profiles, bounded mounts, semantic move, edited-row pinning, WCAG matrix before unit exit. | Revert the smallest render boundary; retain graph/data contracts; rerun the failed viewport. |
| `RISK-010` | Graph/store and client splits add excessive retained heap, duplicate trees, bundle, or RSC payload. | High / Low | `UNIT-006`, `UNIT-010` / `AC-007` | <=20 MiB graph delta, no second steady full tree, <=350 KiB client gzip, <=500 KiB stress RSC, installed analyzer only. | Resolve graph mode `off`; remove the duplicate representation/split. |
| `RISK-011` | Project-component fan-out, edit-surface conflation, link-state transition, or variant ordering corrupts projections or masters. | Critical / Medium | `UNIT-003`, `UNIT-006`, `UNIT-009` / `AC-007` | Measured 1/100/1000 fan-out, `componentInstanceRowIdsByIdentity`, three-surface table assertions, link/master invariants, stored ordering tests. | Disable entity-patch/graph path; restore server-confirmed projection; leave library master unchanged. |
| `RISK-012` | Scope drift adds unmeasured architecture, dependencies, controls, or a restore affordance that current D1 deliberately does not support. | High / Medium | `UNIT-004`-`UNIT-009` / `AC-005` | Evidence activation only, no new dependency, current promote/detach flow, explicit irreversible delete confirmation, narrow unit leases. | Supersede or revert the out-of-scope unit; keep current behavior and record residual risk. |

## Legacy Risk Absorption

The original `R01`-`R30` labels are retired aliases, not active trace IDs:

| Canonical ID | Retired aliases absorbed |
|---|---|
| `RISK-001` | `R15`, `R22` |
| `RISK-002` | `R01`, `R02`, `R08`, `R23`, `R29` |
| `RISK-003` | `R03`, `R12`, `R28` |
| `RISK-004` | `R09`, `R21`, `R25`, `R26` |
| `RISK-005` | `R14`, `R24` |
| `RISK-006` | `R05`, `R27` |
| `RISK-007` | `R07`, `R11`, `R13` |
| `RISK-008` | `R04` |
| `RISK-009` | `R06`, `R30` |
| `RISK-010` | `R10` |
| `RISK-011` | `R16`, `R18`, `R19`, `R20` |
| `RISK-012` | `R17` |

## Highest-Risk Decision

`RISK-003` is the highest-severity boundary: no performance gain can relax current D1 authorization, tenant scoping, secret handling, or evidence redaction. Its denial and cleanup tests block the owning units before performance results are considered.
