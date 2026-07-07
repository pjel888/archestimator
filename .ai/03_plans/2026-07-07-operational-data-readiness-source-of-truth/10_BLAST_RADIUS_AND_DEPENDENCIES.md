# 10 — Blast Radius and Dependencies

## Summary

The planning task itself touches **no** application/runtime files. The *future execution* of this plan has a **narrow, well-contained** blast radius: a few new scripts, one new doc, small edits to three narrative docs, and optional CI/pre-commit wiring. It does **not** touch any runtime path, database, provider resource, or user-facing route.

## Direct impact (execution phase)

| Area | Impact | Class | Evidence |
|---|---|---|---|
| `scripts/generate-operational-truth-snapshot.ts` | new file | **new** | FR-2 |
| `scripts/check-operational-truth-drift.mjs` | new file | **new** | FR-3 |
| `operational-truth.snapshot.json` | new committed artifact | **new** | FR-2 |
| Canonical home (Markdown, location OPEN-1) | new file | **new** | FR-1 |
| `AGENTS.md` | edit: cron line fix (2→3), restart-read bullet, pointer to home | **required change** | §3.2, FR-5 |
| `README.md` | edit: migration count (29→38), latest (`0029`→`0038`), cron (2→3) | **required change** | §3.2 |
| `.ai/10_state/current-state.md` | edit: "both cron schedules" → three; add Fast-Path pointer to home | **probable change** | §3.2 |
| `supabase/README.md` | edit: pending-review count (14→10) | **possible change** (minor, secondary) | §3.2 |
| `package.json` | add scripts `ops:truth:snapshot`, `ops:truth:check` | **required change** | FR-2/3 |
| `.github/workflows/` (or husky) | new/edited workflow to run detector | **possible change** (OPS-1) | §3.6, FR-6 |
| Sibling pack `2026-07-07-d1-migration-state-and-schema-integrity` | cross-reference update (its Phase 4 → "contributor to umbrella detector") | **probable change** (doc only) | §3.7 |

## Transitive impact

| Area | Impact | Class | Evidence |
|---|---|---|---|
| Future plan-pack PROMPTs | authors cite canonical home instead of re-deriving facts | **verification only** (policy) | FR-5 |
| `cloudflare-env.d.ts` | **explicitly unaffected** (already auto-generated; not an assertion target) | **explicitly unaffected** | §3.1 |
| `wrangler.jsonc` | **explicitly unaffected** (read-only) | **explicitly unaffected** | constraint |
| `migrations/` | **explicitly unaffected** (read-only filenames) | **explicitly unaffected** | constraint |
| `worker.ts` | **explicitly unaffected** (read-only parse) | **explicitly unaffected** | constraint |
| D1 / R2 / DO / Queue / Email / Images | **explicitly unaffected** (no provider calls) | **explicitly unaffected** | §07 |
| User-facing routes, auth, sessions | **explicitly unaffected** | **explicitly unaffected** | no app code |
| Existing `cf:*` scripts | **explicitly unaffected** (no rename; new `ops:*` namespace) | **explicitly unaffected** | §3.5 |

## Dependency direction

- The canonical home depends on the snapshot (authoring-time). The snapshot depends on the substrate. The detector depends on the snapshot + narrative docs. CI depends on the detector. **No runtime component depends on any of this** — failure of the detector never affects the deployed Worker.

## Compatibility / backward compatibility

- **Behavior:** zero runtime behavior change. The Worker, routes, auth, and data paths are byte-identical.
- **Docs:** narrative edits change *text*, not behavior. A stale cron count in `AGENTS.md` is not "behavior" — fixing it corrects documentation only.
- **CI:** adding the detector is additive. If CI is currently disabled (§3.6), the detector runs only when Actions is re-enabled, or via pre-commit. No forced migration.

## Concurrent-agent safety (shared worktree)

- `AGENTS.md`, `README.md`, and `current-state.md` are **high-traffic files** edited by many agents. Per Multi-Agent Execution Directive §6 high-concurrency rules, the execution phase must:
  - Declare file ownership in the coordination ledger before each edit.
  - Re-read each file immediately before editing.
  - Keep edits narrowly scoped to the operational-fact lines (do not reflow surrounding prose).
  - Run `git diff --check` after each edit.
- The new scripts and snapshot are **low-contention** (new files / generated artifact) — safe.
- The sibling-pack cross-reference edit must not modify the sibling's *technical* content, only add a pointer.

## Affected documentation

| Doc | Change type |
|---|---|
| Canonical home | created |
| `AGENTS.md` | operational-fact lines + 1 bullet |
| `README.md` | operational-fact lines |
| `current-state.md` | cron wording + Fast-Path pointer |
| This plan's sibling pointer | cross-link |
| `18_STACK_CONTRACT` (this pack) | n/a — created here |

## Risks concentrated where

The only "scary" part is editing `AGENTS.md` and `current-state.md` under concurrency. Everything else is additive/new. The plan's phasing (`11_IMPLEMENTATION_PLAN`) sequences the high-contention edits last and smallest-first.
