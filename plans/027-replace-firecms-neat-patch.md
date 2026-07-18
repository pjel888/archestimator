# Plan 027: Replace the vendored `@firecms/neat` patch with a self-hosted background

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- package.json src/components/landing/NeatWireframeBackground.tsx`
> If either changed since this plan was written, compare "Current state"
> against the live code; on a mismatch, STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: deps
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

`package.json:208-210` carries a vendored patch
`"@firecms/neat@0.8.0": "patches/@firecms%2Fneat@0.8.0.patch"` (36,437 bytes)
that modifies minified `dist` files to add a `paused` property and an
early-return guard in the `requestAnimationFrame` render loop. The **only**
consumer is `src/components/landing/NeatWireframeBackground.tsx` (lines 4, 110,
151), which also adds a `<style>` rule hiding the neat attribution link
(`a[data-n][href*="neat.firecms.co"] { display: none !important; }`). A 36 KB
patch against minified dist is fragile — any `@firecms/neat` version bump (even
a patch release) breaks it and requires regenerating against new minified
output. For a single landing-page visual flourish, the carrying cost is high.
This plan replaces it with a self-hosted background (the codebase already ships
`gsap`, `d3`, and has multiple WebGL/canvas skills available) and removes the
patch + dependency + attribution-hiding concern.

## Current state

- `package.json:208-210` — `patchedDependencies` entry for `@firecms/neat@0.8.0`.
- `patches/@firecms%2Fneat@0.8.0.patch` — 36 KB, modifies `dist/NeatGradient.js`,
  `dist/index.es.js`, `dist/NeatGradient.d.ts`.
- `src/components/landing/NeatWireframeBackground.tsx` — only consumer. Imports
  `NeatConfig`/`NeatGradientInstance` types, dynamically imports `NeatGradient`,
  adds the attribution-hiding `<style>`.
- `@firecms/neat` is NOT imported anywhere else in `src/` (verified:
  `grep -rn "@firecms/neat" src/` → only that one file).

This is a landing-page hero visual. Confirm where `NeatWireframeBackground` is
rendered (likely `src/components/landing/` or `src/app/page.tsx`) and whether
landing conversion analytics are tied to its presence before removing.

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Install   | `bun install`          | exit 0              |
| Typecheck | `bun run type-check`   | exit 0              |
| Build     | `bun run build` (confirm the landing still builds; user-gated) | exit 0 |

## Scope

**In scope** (the only files you should modify/create/delete):
- `src/components/landing/NeatWireframeBackground.tsx` — replace the
  implementation with a self-hosted canvas/WebGL/GSAP background of similar
  visual character (the existing DESIGN.md and the landing's wireframe aesthetic
  guide the replacement). Keep the same exported component name and props so
  callers don't change.
- `package.json` — remove `@firecms/neat` from `dependencies` and from
  `patchedDependencies`.
- `patches/@firecms%2Fneat@0.8.0.patch` — delete.

**Out of scope**:
- Other landing components.
- Landing copy / layout.
- The replacement's visual design is a DESIGN.md decision — match the existing
  wireframe aesthetic; do not introduce a new visual direction.

## Git workflow

- Branch: `advisor/027-replace-firecms-neat`.
- Commit message: `chore(landing): replace @firecms/neat patch with self-hosted background`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Decide the replacement approach

Three options; pick based on visual fidelity needed and effort tolerance:

- **(A) Canvas 2D wireframe animation** — cheapest; a `<canvas>` with a
  hand-rolled animated wireframe (lines/points). Matches the "wireframe" name.
  Smallest bundle, no new deps.
- **(B) WebGL via the project's existing WebGL skills/three.js** (if three.js
  is already a dep — check `package.json`). Higher fidelity, more code.
- **(C) CSS/SVG animated background** — cheapest of all but least dynamic.

Read the current `NeatWireframeBackground.tsx` to see what visual it produces,
check `package.json` for `three`/WebGL deps already present, and check
`DESIGN.md` for the landing aesthetic guidance. Prefer (A) unless the visual is
load-bearing for landing conversion and needs (B)'s fidelity. The `paused` prop
behavior the patch added must be preserved in the replacement (the component
likely pauses when offscreen / on reduced-motion).

Record the choice in worktree notes before implementing.

**Verify**: nothing to run; decision.

### Step 2: Implement the replacement

Rewrite `src/components/landing/NeatWireframeBackground.tsx` to use the chosen
approach. Requirements:
- Same exported component name and props (so callers are unchanged).
- Preserve the `paused` behavior (pause animation when offscreen or on
  `prefers-reduced-motion` — match the patch's intent).
- Respect `prefers-reduced-motion` (PRODUCT.md → Accessibility: reduced-motion
  alternatives for all animations).
- Clean up its animation frame / WebGL context on unmount (no leaks — the
  patch's whole purpose was adding a pause/cleanup guard; preserve that
  discipline).
- Do NOT hide any attribution link — the replacement is self-hosted, so there's
  no third-party attribution to hide. (This resolves the licensing/maintenance
  concern raised in the audit.)

**Verify**: `bun run type-check` → exit 0.

### Step 3: Remove the dependency and patch

- In `package.json`: remove `"@firecms/neat": "^0.x"` from `dependencies` and
  the `"@firecms/neat@0.8.0": "..."` entry from `patchedDependencies`.
- `rm patches/@firecms%2Fneat@0.8.0.patch`.
- `bun install` to update the lockfile.

**Verify**: `bun install` → exit 0. `bun run type-check` → exit 0.
`grep -rn "@firecms/neat" src/ package.json` → no matches.

### Step 4: Build + visual sanity (user-gated)

**Verify**: `bun run build` → exit 0 (if the user authorized a build).

If the user authorized browser/visual QA (browser gate), open the landing page
and confirm the background renders and animates (or is static under
`prefers-reduced-motion`), pauses when offscreen, and cleans up on navigation
away. If visual QA is not authorized, note the replacement as visually
unverified and recommend the user glance at the landing before merge.

## Test plan

No automated tests for a landing visual. Manual/visual QA (step 4) is the
evidence, gated on user authorization.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run build` exits 0 (if authorized)
- [ ] `grep -rn "@firecms/neat" src/ package.json patches/` → no matches
- [ ] `patches/@firecms%2Fneat@0.8.0.patch` is deleted
- [ ] `NeatWireframeBackground.tsx` is self-hosted, preserves `paused` +
      reduced-motion + cleanup-on-unmount, and hides no attribution
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- The current visual is load-bearing for landing conversion (check analytics /
  ask the user) AND the replacement can't match fidelity with reasonable effort
  — report; the alternative is to upstream the `paused` flag as a PR to
  `@firecms/neat` and drop the patch once merged (slower but preserves the
  visual exactly).
- The replacement needs a new heavy dependency (e.g. three.js is not already
  present and adding it bloats the landing bundle) — report; prefer the
  canvas-2D option (A).
- `bun run build` fails for a reason unrelated to the replacement — record and
  STOP (don't fix unrelated build issues).

## Maintenance notes

- After this lands, no more 36 KB patch to regenerate on every `@firecms/neat`
  bump, and no attribution-hiding concern.
- The replacement is self-hosted, so future visual tweaks are local code
  changes, not patch-regeneration.
- Reviewer: confirm (a) the component's public API (name + props) is unchanged
  so callers don't break, (b) `paused`/reduced-motion/cleanup behavior is
  preserved, (c) no attribution is hidden, (d) the dependency and patch are
  fully removed.
