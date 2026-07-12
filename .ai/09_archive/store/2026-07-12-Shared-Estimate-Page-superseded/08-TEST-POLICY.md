# 08 — Test Policy (User Test Authorization Gate)

> **Supreme rule:** No criterion authorizes creating, expanding, repairing, or running
> a test on the agent's own authority. `TARGETED`/`BROADER`/`MVP_CRITICAL_INVARIANT`
> identify a risk that would benefit from a test but authorize a **`TEST_PROPOSAL`
> only** — record it and wait. Only `TEST_TASK` (explicit user testing request)
> authorizes execution. This audit run created no tests and ran none.

## Audit-run evidence class

This is a **read-only audit**. Every finding is proven by:
- source inspection (`file:line`),
- type/schema inspection (D1 `migrations/*.sql`, `types.ts`),
- control-flow tracing across components/routes/lib.

No runtime, no build, no browser, no provider state was touched. All criteria are
`test_requirement: NOT_REQUIRED`, `test_trigger: NONE`, `test_ids: []`.

## Per-unit test decisions (for the FUTURE implementation run)

| Unit | test_requirement | trigger | rationale |
|---|---|---|---|
| UNIT-1 (node target kind: schema + validators) | `TARGETED` | `MVP_CRITICAL_INVARIANT` | Schema CHECK + target-validation is a data-integrity + authz boundary. **`TEST_PROPOSAL` only** — named risk: "node-target comment accepted when valid, rejected when unknown; existing proposal/estimate/row targets unaffected." Cheapest decisive non-test proof: migration rebuild count-assert (mirror 0066) + type evidence + validator unit reasoning. Await explicit `TEST_TASK`. |
| UNIT-2 (node commenting UI) | `NOT_REQUIRED` | `NONE` | UI wiring; static + type evidence. Browser proof only on explicit request. |
| UNIT-3 (row commenting from tree) | `NOT_REQUIRED` | `NONE` | UI wiring parity with existing collated handler. |
| UNIT-4 (tree show-more) | `NOT_REQUIRED` | `NONE` | UI state; source evidence. |
| UNIT-5 (>500-row degradation) | `NOT_REQUIRED` | `NONE` | Pure function; type + source evidence. Optional `TEST_PROPOSAL` for reconstruction edge cases if the implementing agent judges regression risk. |
| UNIT-6 (cross-widget invalidation) | `NOT_REQUIRED` | `NONE` | Cache wiring; static evidence. |
| UNIT-7 (decision undo + drafts) | `NOT_REQUIRED` | `NONE` (drafts); product-decision-dependent (undo) | Draft persistence = source evidence. Undo needs owner policy before code. |
| UNIT-8 (Cache-Control header) | `NOT_REQUIRED` | `NONE` | Header inspection. |
| UNIT-9 (virtualization) | `NOT_REQUIRED` | `NONE` | Perf; benchmark only on explicit request. |
| UNIT-10 (nav totals / donut / activity feed) | `NOT_REQUIRED` | `NONE` | UI wiring. |
| UNIT-11 (P2/P3 cleanup bundle) | `NOT_REQUIRED` per item; `TARGETED` for the snapshot-read runtime guard if treated as a security control | `MVP_CRITICAL_INVARIANT` for the guard | Snapshot guard = defense-in-depth; `TEST_PROPOSAL` only. |
| UNIT-12 (feature backlog) | Varies | Varies | Most warrant `TEST_PROPOSAL` at minimum given schema/auth surface. Await owner prioritization. |

## TEST_PROPOSALs recorded (named risk + exact command shape)

> These are **proposals**, not authorized runs. The executing agent must wait for an
> explicit `TEST_TASK` before running any of them.

```
TEST_PROPOSAL-node-target-validation
Risk: node-target comments accepted/rejected correctly; existing targets unaffected.
Command shape (exact command TBD at execution time): a focused test of
  validateSharedLinkReviewTarget over {valid node, unknown node, node from another
  publication, legacy snapshot without treeNodes}.
Await: explicit TEST_TASK.

TEST_PROPOSAL-share-page-e2e (browser-gated)
Risk: the full recipient review flow (password → session → tree → comment on node/row
  → decision) works end-to-end on a real published snapshot.
Command shape: Playwright/browser run against the owner's example token
  FNX2rBm6V-... on localhost.
Await: explicit TEST_TASK + browser authorization.
```

## What this audit did NOT prove (honest gaps)

- **No runtime verification.** All findings are static. A latent runtime bug not
  visible in source would not be caught.
- **No browser/visual proof.** The owner's example page was not opened. Layout,
  hydration, and actual interaction behavior are inferred from source, not observed.
- **No provider/hosted proof.** D1/Cloudflare behavior is inferred from
  source + `wrangler.jsonc`, not exercised.
- **Sibling-pack cross-refs** (Publisher SEC-1/BUG-2/BUG-3) are trusted as
  evidence-grade but were not re-proven from scratch here; they were confirmed present
  on the share surface by direct inspection.
