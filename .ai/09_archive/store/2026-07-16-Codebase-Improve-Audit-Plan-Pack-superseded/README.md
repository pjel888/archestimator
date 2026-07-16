# Archestimator Codebase Improve Audit — Plan Pack

**Plan date:** 2026-07-16
**Planned at commit:** `9a821b51a` (HEAD at authoring; branch `main`)
**Source audit:** `/improve` standard-effort, full-repo sweep (4 read-only category agents + lead vetting), 2026-07-16
**Repository:** `pjel888/archestimator`
**Target:** whole codebase, prioritized by leverage — migrations/upload lifecycle, performance hot paths, security hardening, test-gate integrity, and structural tech-debt.
**Package status:** NOT_READY (PLAN_ONLY — nothing implemented; every unit PLANNED)
**Implementation status:** NOT_STARTED
**Release status:** NOT_EVALUATED
**Tests/builds/browser/deployments performed during planning:** None (read-only audit; repo gates test execution behind explicit user request and the tree is shared multi-agent WIP)
**Canonical execution artifact:** this `README.md` (status table + execution order below). Per-unit detail in `1NN-*.md`.

---

## What this pack is

A senior-advisor `/improve` audit produced a vetted findings table. The owner directed that **every** finding (not only the quick wins) be turned into an executable plan with blast-radius analysis, simulations, and performance/optimization studies, following the repo's plan-pack contract (`Creating-Plan-Prompt.md`, `Multi-Agent-Execution-Directive.md`, `Plan-Pack-Schema.md`, `validate:plan-pack`).

Scope decision recorded as `DEC-AUTO-001`: the plan-pack skill's lean default ("smallest executable pack") is overridden by the owner's explicit "comprehensive, ALL findings" instruction. Structure and validation still follow the schema; content is substantive, not ceremonial.

## Executive position (one paragraph)

The codebase is **unusually well-defended for an alpha**: no IDOR / SQL injection / XSS sink / auth bypass / committed secrets; `bun audit` clean; SQL `?`-bound throughout; CSRF centralized; cookies hardened; crypto timing-safe where it matters most. The audit surfaced **no security fire**. The highest-leverage work is **deploy-safety of the new upload-lifecycle migrations (0084–0087)**, a few **cheap perf wins with in-repo precedent**, **test-gate integrity** (the default `test` command proves almost nothing), and a set of **structural debts** (a 6,261-line estimate mutation god-module; two overlapping `public-repository.ts`; an active-recipient query copied 5–6×) that are not urgent but compound. Full posture + rejected findings in `00-EXECUTIVE-DIRECTION.md` and `05-SECURITY-HARDENING-ANALYSIS.md`.

## Scope, non-goals, acceptance

**In scope:** the 20 units below — 17 concrete fixes + 3 direction/design items.

**Non-goals:**
- Re-implementing the publication bearer-link model, D1 RLS (D1 has none), or the dev-auth-bypass env gate — all accepted tradeoffs (see `06-RISKS-DECISIONS-AND-NON-GOALS.md`).
- Re-litigating the 30-odd already-documented publisher/proposals findings (preserved in `.ai/04_tasks/2026-07-16-publisher-audit-deferred-*.md`).
- Broad test/build/browser execution — user-gated; units name a `TEST_PROPOSAL` where a test would materially help but do not execute it.

**Acceptance criterion (pack-level):** every unit lands its in-scope change, passes `bun run type-check` and `bun run lint`, and the unit's `Done criteria` (machine-checkable) hold. Hosted migration apply (`UNIT-001`) and hosted characterization (`UNIT-015`) are external actions recorded as boundaries in prose, not auto-executed.

**Stop condition:** a unit is done when its `Done criteria` pass; the pack is done when all CORE units are VERIFIED. AUXILIARY (direction) units are design spikes — done when the design + open-questions doc is reviewed.

## Orchestration (Multi-Agent-Execution-Directive)

- **Lead owns** `plan-pack.json`, this README, the traceability graph, and integration. One writer per shared file.
- **Units are disjoint by file scope** (see each doc's "Scope"). Safe to parallelize dependency-independent units; the dependency edges are in the table below and encoded as `depends_on` in `plan-pack.json`.
- **Hard concurrency rule:** migrations (`UNIT-001`), the estimate write-path (`UNIT-014`), and the publication/share layer (`UNIT-009`, `UNIT-017`) are single-writer surfaces — do not edit them concurrently with other in-flight agent work; reread before edit.
- **Recovery:** on weak output or scope drift, narrow/reissue or serialize; optional-lane failure never blocks completed local implementation.

## Execution order & status

Recommended order is roughly: deploy-safety → cheap perf/reliability → structural. `UNIT-016` depends on `UNIT-007`; `UNIT-014` is large and last among CORE.

| Unit | Title | Cat | Pri | Eff | Risk | Depends on | Doc | Status |
|------|-------|-----|-----|-----|------|------------|-----|--------|
| UNIT-001 | Migration safety: scope `pragma_foreign_key_check`, prefill NULL `actor_user_id`, make 0084–0087 re-runnable, harden 0087 `strftime` | data | P1 | M | MED | — | `100-migration-safety.md` | PLANNED |
| UNIT-002 | Hoist `resolveComponentCategory` Map build out of the per-item hot path | perf | P1 | S | LOW | — | `110-category-folder-map-rebuild.md` | PLANNED |
| UNIT-003 | Timing-safe Bearer-secret compare on internal cron routes | sec | P1 | S | LOW | — | `120-timing-safe-bearer-secret.md` | PLANNED |
| UNIT-004 | Fix the `test` gate illusion + reclassify `*proof*` tests out of the behavioral suite | tests | P1 | S | LOW | — | `130-test-gate-and-coverage.md` | PLANNED |
| UNIT-005 | Centralize the D1 batch statement/parameter-limit guard | perf/reliab | P2 | S | LOW | — | `140-d1-batch-limit-guard.md` | PLANNED |
| UNIT-006 | Contract test: every non-GET API route references an auth primitive | sec/dx | P2 | S | LOW | — | `150-api-route-auth-contract-test.md` | PLANNED |
| UNIT-007 | Upload removal: per-asset eligibility + distinct `removed`/`blocked` sets + matching index | bug/perf | P2 | M | MED | — | `160-upload-removal-semantics.md` | PLANNED |
| UNIT-008 | Action-inbox: project expired snoozes as `open` + reject missing `snoozeUntil` | bug | P2 | S | LOW | — | `170-action-inbox-snooze-consistency.md` | PLANNED |
| UNIT-009 | Raise publication password floor (4→8), add server test, fix stale BLK-01 doc | sec/doc | P3 | S | LOW | — | `180-publication-password-floor.md` | PLANNED |
| UNIT-010 | De-duplicate the active-recipient query into one loader | tech-debt | P2 | S | MED | — | `190-active-recipient-query-dedup.md` | PLANNED |
| UNIT-011 | Remove the leaky `pagehide` listener in `web-vitals-collector` | reliab | P3 | S | LOW | — | `200-web-vitals-pagehide-leak.md` | PLANNED |
| UNIT-012 | Make `getCloudflareD1Database` distinguish "unbound" from "broken" | reliab/obs | P3 | S | LOW | — | `210-d1-database-null-observability.md` | PLANNED |
| UNIT-013 | Cap the component-library "load all" path (`isPartial` + keyset pagination) | perf | P2 | M | LOW | — | `220-component-library-unbounded-load.md` | PLANNED |
| UNIT-014 | Characterize, then split, the 6,261-line `EstimateActionsD1Client` god-module | tech-debt | P3 | L | HIGH | — | `230-estimate-mutation-god-module-split.md` | PLANNED |
| UNIT-015 | Hosted characterization test for share-link brute-force / password-lockout survival | tests | P1 | M | HIGH | — | `240-hosted-share-link-lockout-characterization.md` | PLANNED |
| UNIT-016 | Replace the `json_tree` reference scan with a denormalized `upload_asset_references` table | perf | P3 | L | MED | UNIT-007 | `250-upload-reference-tracking-table.md` | PLANNED |
| UNIT-017 | Extract shared `access-security` from the two `public-repository.ts` | tech-debt | P3 | M | MED | — | `260-public-repository-access-security-extract.md` | PLANNED |
| UNIT-018 | Direction: expand Estimate-System-Map beyond admin (design spike) | direction | — | M | LOW | — | `300-direction-estimate-system-map.md` | PLANNED |
| UNIT-019 | Direction: add estimate XLSX/CSV import (design spike) | direction | — | L | MED | — | `310-direction-estimate-import.md` | PLANNED |
| UNIT-020 | Direction: close the activation → founder action-inbox loop (design spike) | direction | — | M | LOW | — | `320-direction-activation-action-inbox.md` | PLANNED |

Status values: PLANNED → READY → IN_PROGRESS → DONE → VERIFIED (or BLOCKED / SUPERSEDED). Update the matching row in `plan-pack.json` `units[]` and append a `LOOP_LEDGER.md` entry when a unit moves.

## Dependency notes

- **UNIT-016 depends on UNIT-007**: the denormalized reference table replaces the `json_tree` predicate that UNIT-007 refactors — land the predicate refactor first.
- **UNIT-014 is large + HIGH risk**: characterization tests (step 1 of its own doc) must precede any split. Treat UNIT-015's harness pattern as the template for characterization.
- **UNIT-001 is deploy-gated**: the migration edits are local (`IMPLEMENT_LOCAL`); applying them to hosted D1 is an external action (`EXTERNAL_ACTIONS`) recorded in `06-RISKS-DECISIONS-AND-NON-GOALS.md`, not auto-run.
- All other CORE units are independent and may run in parallel subject to the single-writer rule on shared files.

## Companion documents

| Doc | Role |
|-----|------|
| `00-EXECUTIVE-DIRECTION.md` | Posture, scope decision, what changed since recon |
| `01-AUDIT-FINDINGS-REGISTER.md` | Full vetted findings table + rejected register + unit traceability |
| `02-BLAST-RADIUS-AND-IMPACT-ANALYSIS.md` | Per-finding blast radius (graph-grounded) |
| `03-PERFORMANCE-AND-OPTIMIZATION-STUDY.md` | Perf findings deep-dive + complexity/optimization analysis |
| `04-DEPLOY-DATA-INTEGRITY-AND-SIMULATIONS.md` | Migration safety + concurrency/idempotency simulations |
| `05-SECURITY-HARDENING-ANALYSIS.md` | Security findings + accepted tradeoffs |
| `06-RISKS-DECISIONS-AND-NON-GOALS.md` | Risks, decisions, non-goals, external-action boundaries |
| `LOOP_LEDGER.md` | Append-only coordination log |
| `PACK-MANIFEST.md` | File inventory + hashes (mirrors `plan-pack.json` artifacts) |
| `1NN-*.md` | One self-contained executor-ready plan per unit |
