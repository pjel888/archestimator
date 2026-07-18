# Loop Ledger

Append-only planning and execution continuity for
`PLAN-2026-07-18-whole-app-consistency-audit`.

## Current State

- **Mode:** planning complete; execution not started.
- **Package status:** `CONDITIONALLY_READY` (Tier 1 units READY in `SLICE-001`;
  Tier 2-4 units PLANNED with their dependencies — hence conditionally, not fully,
  ready. This is the validator-accurate status for a pack with a ready slice plus
  explicitly unready remaining units.)
- **Implementation status:** `NOT_STARTED`
- **Release status:** `NOT_EVALUATED`
- **Plan lifecycle:** `ACTIVE`
- **Terminal status:** `ACTIVE`
- **Exact next unit:** `UNIT-001` (labor-cost divergence, CRITICAL, no dependencies)
- **Ready slice (`SLICE-001`):** UNIT-001 through UNIT-009 (all Tier 1, no deps).
- **Manifest:** `plan-pack.json` validated with `bun run validate:plan-pack`
  (PASS; `CONDITIONALLY_READY`, `next_unit: UNIT-001`).
- **Product code changed:** no — planning stage only; no source edits made.
- **Automated tests/build/browser/screenshots run:** none. No user authorization for
  tests; verification is source/diff/type/lint level per the User Test Authorization
  Gate.
- **Static implementation validation:** `NOT_REQUIRED` at planning stage.
- **Current-state pointer:** add a one-line pointer to this pack under
  `.ai/10_state/current-state.md` Fast Path when execution starts (not done at
  planning stage to avoid clutter).

## Event Ledger

| Event | Date | Result | Evidence/decision |
| --- | --- | --- | --- |
| `EV-001` | 2026-07-18 | 6-domain parallel audit dispatched. | Estimate core, publish/share/portal, auth/security, admin, uploads/infra, UI state. Each agent mandated to surface only concrete bugs with `file:line` evidence. |
| `EV-002` | 2026-07-18 | 31 findings synthesized, deduplicated, severity-ranked. | 1 CRITICAL, 8 HIGH, 13 MEDIUM, 9 LOW. |
| `EV-003` | 2026-07-18 | CRITICAL finding (F-01) deep-verified in source. | Verification sub-agent confirmed labor divergence; corrected count to 5 drop sites (not 4) and reclassified charts as a PASS site. Exhaustive call-site table recorded in unit 001. |
| `EV-004` | 2026-07-18 | HIGH findings verified directly in source. | F-02 (`template-propagation-d1.ts:182-192`), F-04 (`decision-service.ts:172-175`), F-08 (`first-estimate-checklist.ts:38`) confirmed by reading code; F-03/F-05/F-06 confirmed via targeted reads. |
| `EV-005` | 2026-07-18 | MEDIUM/LOW findings verified via grep + targeted reads. | All file:line references re-confirmed against current source. |
| `EV-006` | 2026-07-18 | Cross-reference against `/improve` pack resolved. | 4 overlaps noted (008/004/015/009-improve); ownership direction recorded in `00-PLAN.md` §11 to avoid duplicate execution. |
| `EV-007` | 2026-07-18 | Plan pack authored. | `00-PLAN.md` + 22 unit docs + LOW cluster + this ledger + `plan-pack.json`. No product code changed. |
| `EV-008` | 2026-07-18 | Plan pack validated. | `bun run validate:plan-pack` PASS after `--write` hash refresh. Status: `CONDITIONALLY_READY`, `next_unit: UNIT-001`, `SLICE-001` = Tier-1 READY units. Human-readable status tables in `00-PLAN.md` use `TODO/DONE/REJECTED`; the manifest uses the canonical `PLANNED/READY/DONE/VERIFIED` taxonomy — they map 1:1. |

## Research Lanes

Six bounded read-only audit lanes were integrated (one per domain). All lanes
reported no edits, no tests, no builds, no browser automation, and no git mutation.
One follow-up verification lane deep-confirmed the CRITICAL finding.

## Decision Ledger

(See `00-PLAN.md` §6 for the full decision table.) Key decisions:
- `DEC-001` Separate pack from `/improve` audit — defects vs improvements.
- `DEC-003` F-01 fix follows the existing oracle; no new abstraction.
- `DEC-004` F-09 beta gate centralized in a single helper/middleware chokepoint.
- `DEC-005` F-07 dead queue: owner picks wire-in vs delete during execution.
- `DEC-006` No tests unless user authorizes; three `TEST_PROPOSAL`s recorded.

## Authorization Ledger

- `AUTH-001` — **Resolved for local implementation.** All fixes are local
  source/migration work inside bound `ARCH_DB` and the existing Worker/queue/cron
  resources (standing authorization in `AGENTS.md`). No destructive migration
  required (F-01 uses additive read-normalization). Remote apply, deployment, paid
  services, and cross-provider work remain excluded.

## Gate Ledger

- `GATE-PLAN-001` — `PASS`: every verified finding (31) is reconciled to a unit
  with current-source evidence, fix direction, test decision, and dependency
  ordering. First ready unit (001) is unblocked.
- `GATE-VERIFY-001` — `PENDING`: requirement-to-evidence audit at execution
  completion (not yet started).

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| F-01 record-type widening ripples beyond listed paths | MED | Fall back to `resolveLaborRate(row)` helper at each call site (unit 001 recovery). |
| F-09 middleware beta lookup adds latency | LOW | `closed-beta-d1-store` is already cached; fall back to wrapper approach if measurable. |
| F-07 owner decision deferred | LOW | Both options are safe and independently revertible; recorded as the first execution step of unit 007. |
| Two packs (this + `/improve`) overlap on 4 items | LOW | Cross-reference map in `00-PLAN.md` §11 directs single ownership. |

## Continuation

Start execution at `UNIT-001` (or any Tier 1 no-dep unit). For each unit: reread
current source, implement the smallest coherent fix, run the cheapest decisive
evidence, update the unit's Status line and this ledger. Archive only after the
requirement-by-requirement audit passes for every CORE requirement.
