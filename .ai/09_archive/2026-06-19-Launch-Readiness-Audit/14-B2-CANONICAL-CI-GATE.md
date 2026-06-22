# B2 Canonical CI Gate

Date: 2026-06-20. Scope: exact policy for clearing B2 (`bun run validate` red).

## Canonical rule

B2 closes only when one of these is true:

1. `bun run validate` exits 0 on the implementation branch, with output captured.
2. The repository intentionally splits advisory checks out of `validate`/CI, with an owner decision
   and package-script change recorded in the close artifact.

Partial lint cleanup does not close B2.

## Current known red set

The 2026-06-19 audit verified these failure sources:

| Area | Known failure | Canonical handling |
|---|---|---|
| React hooks lint | `useLiquidGlassRefraction` and bulk-delete mount latch errors. | Fix source or delete dead code; prove lint/source behavior. |
| Local tooling lint noise | `.gitnexus/run.cjs` is git-ignored but linted locally. | Add `.gitnexus/**` to `globalIgnores`; this is Testing-CI-owned, not Frontend-owned. |
| Design-system lint | Icon/design-system violation such as `MainSidebar`. | Either fix or explicitly make advisory with owner decision. |
| Strict design lint | `lint:design` exits non-zero with strict anti-patterns. | Either resolve, split from hard CI, or record owner-approved advisory posture. |
| DOM phase | `test:dom` all-phase hang risk. | Split into bounded shards/timeouts before making it required CI proof. |

## Required implementation order

1. Normalize the hard gate definition: decide whether design checks are hard or advisory.
2. Fix real source lint errors.
3. Ignore local-only generated state such as `.gitnexus/**`.
4. Bound or split DOM tests so CI cannot hang indefinitely.
5. Run `bun run validate` or the newly defined hard gate.
6. Only then re-enable/require GitHub CI for B1.

## Anti-regression rule

If an implementer changes `package.json` scripts to make B2 pass, the close artifact must state
which checks remain hard, which are advisory, and where advisory failures are still reported. Silent
downgrades are not valid closure.
