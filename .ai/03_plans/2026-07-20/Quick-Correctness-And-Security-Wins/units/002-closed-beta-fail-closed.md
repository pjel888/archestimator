# UNIT-002 — Closed-beta fail-closed gate (REJECTED — implemented independently)

## Status

`SUPERSEDED` · depends on: (none) · requirement: `SEC-002` (REJECTED) · risks: none
· resolution: `DEC-AUTO-001`

## Why this unit is rejected

The finding this unit addressed — "closed-beta gate fails open when
`CLOSED_BETA_ACCESS_ENABLED` is unset" — was **independently implemented in the
shared worktree** between plan authoring and the Improve-Plan pass, with a
superior design. Executing the original unit would clobber the in-tree
implementation and its test.

## Current state (verified 2026-07-20 during Improve-Plan reconcile)

`src/lib/auth/closed-beta-access.ts:60-68` now reads:

```ts
export function isClosedBetaAccessEnabled(env: ClosedBetaEnv = process.env) {
  if (env.ARCHESTIMATOR_ALLOW_OPEN_BETA === "1") return false;
  const raw = env.CLOSED_BETA_ACCESS_ENABLED;
  if (raw === "true") return true;
  if (raw === "false") return false;
  // Unset on Cloudflare Worker runtime: fail closed (close beta).
  // Unset in local Node: remain open for dogfooding (explicit true required to gate).
  return env.ARCHESTIMATOR_CF_RUNTIME === "1";
}
```

Plus a new `resolveClosedBetaRuntimeEnv` helper (`:37-58`) that merges
Cloudflare Worker bindings (`getCloudflareContext().env`) over `process.env` and
sets the `ARCHESTIMATOR_CF_RUNTIME` marker used by the fail-closed default.

The in-tree design is **better than the original plan's** because it
distinguishes the Cloudflare Worker runtime (where unset must fail closed) from
local Node development (where unset stays open for dogfooding). The original
plan's tristate would have broken local dev.

A test exists at `tests/vitest/closed-beta-access.test.ts` covering the
fail-closed-on-CF-runtime case (verified: the "fails closed on Cloudflare
runtime when the flag is unset" test asserts `isClosedBetaAccessEnabled({
ARCHESTIMATOR_CF_RUNTIME: "1" })` returns `true`).

## What an executor should do

**Nothing.** Do not execute this unit. If the in-tree implementation regresses,
open a new plan referencing the current `closed-beta-access.ts` as the baseline.

## Original (now-superseded) plan — retained for audit

The original unit proposed a tristate resolver (`enabled`/`disabled`/`unset`)
that failed closed on `unset`. The in-tree implementation achieves the same
safety goal with a runtime-aware two-axis design (`CLOSED_BETA_ACCESS_ENABLED`
explicit values + `ARCHESTIMATOR_CF_RUNTIME` marker). The original prose is
intentionally not reproduced here to avoid confusion; see git history of this
file if the original wording is needed for comparison.
