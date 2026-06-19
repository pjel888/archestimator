# Bundle & Asset Optimization — Remediation Plan (2026-06-19)

Adversarially verified. Launch-blocker count for this domain: **0**. This is a
cheap-but-real cleanup backlog for closed-beta, not a release gate.

Write surface for this pack is `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/Bundle-And-Asset-Optimization/`
only. The edits below are the *recommended* implementation surface; they are NOT applied
by this audit pass.

## Verdict summary (see 03-EVIDENCE for proof)

| ID | Title | Verdict | Final severity | Blocker |
|----|-------|---------|----------------|---------|
| BUNDLE-01 | `three` (38MB) fully unused dep | confirmed | medium | no |
| BUNDLE-02 | full `d3` meta declared, only `d3-shape` used (transitive) | confirmed | low | no |
| BUNDLE-03 | orphaned `public/` assets shipped (incl. sidebar-BG) | adjusted (absorbs BUNDLE-04) | low | no |
| BUNDLE-04 | `sidebar-BG.png` on authed LCP critical path | **refuted** (var unused → it is an orphan, not critical-path) | low | no |
| BUNDLE-05 | phosphor barrel imports in 6 files | confirmed | low | no |
| BUNDLE-06 | no Turbopack treemap / no JS budget | confirmed | info | no |

## Sequencing rationale

All items are low-blast-radius, reversible hygiene. There is no launch blocker, so
sequence by effort/value, not by risk gating. Do the two dependency removals together
(one `bun install`), then the asset sweep, then the optional consistency/tooling items.

---

## Item 1 — Remove unused `three` + `@types/three` (BUNDLE-01)

**Why first:** highest-value, lowest-risk. 38MB of install/supply-chain surface that
ships zero client bytes today but is a live foot-gun (a sanctioned dep any future
`import "three"` would silently pull ~600KB into a client chunk with no review friction).
Also corrects a stale prior-pack belief that `three` is a deferred transitive dep of
`@firecms/neat` — it is not (neat 0.8.0 declares no deps and bundles its own WebGL).

**Steps:**
1. In `package.json`, delete line 87 (`"three": "^0.184.0"`) and line 105
   (`"@types/three": "^0.184.1"`).
2. `bun install` to update `bun.lock`.
3. `bun run type-check` — must stay green (no real `three` import exists, only two test
   string literals `bedrooms: "three"` and tab fixture `label: "Three"`, which are
   unaffected).
4. Optional belt-and-suspenders: `next build` (or at least build the landing route) to
   confirm `@firecms/neat` still resolves and the WebGL hero still works.

**Files:** `package.json`, `bun.lock`.
**Migration/RLS:** none.
**Risk:** very low — one-line revert if a real `three` feature lands later.
**Effort:** S.
**Dependencies:** none. Cross-domain note: if Domain 5/landing later wants the neat→three
relationship re-proven, it is already disproven here (neat does not depend on three).

---

## Item 2 — Make `d3-shape` a direct dep; drop `d3`/`@types/d3` (BUNDLE-02)

**Why:** the only d3 import in the app is `import { arc, pie } from "d3-shape"`
(`src/components/charts/CostDonutChart.tsx:4`). `d3-shape` is currently satisfied only as
a transitive child of the `d3` meta-package — fragile across a future `d3` major or a
hoisting change, and the meta-package drags ~29 unused `d3-*` submodules into the install
graph. Prior pack verified only the *client-byte* side; the dep-declaration side is new.

**Steps:**
1. Add `"d3-shape": "^3.2.0"` to `dependencies` and `"@types/d3-shape": "^3.1.x"` to
   `devDependencies` in `package.json` (pin to the version already hoisted under
   `node_modules/d3-shape` — confirm with `node_modules/d3-shape/package.json`).
2. Remove `"d3": "^7.9.0"` (line 74) and `"@types/d3": "^7.4.3"` (line 101) **only after**
   re-running `rg -n "from ['\"]d3['\"]|from ['\"]d3-(?!shape)" src` returns nothing but
   the existing `d3-shape` import (verified zero other d3-* imports today).
3. `bun install`; `bun run type-check`.
4. Confirm the donut still renders: it remains dynamic-imported (`ProjectChartsClient`),
   so no client-byte change.

**Files:** `package.json`, `bun.lock`.
**Migration/RLS:** none.
**Risk:** low — if the build complains about a missing `d3-*` submodule, the grep in
step 2 missed something; re-add `d3`. The charts UI contract test
(`tests/vitest/project-dashboard-charts-ui.test.ts:55`) already asserts
`CostDonutChart` imports from `"d3-shape"`, which keeps this honest.
**Effort:** S.
**Dependencies:** do in the same `bun install` as Item 1.

---

## Item 3 — Delete orphaned `public/` assets, including `sidebar-BG.png` (BUNDLE-03 + refuted BUNDLE-04)

**Why:** ~7MB of dead bytes in the deploy artifact. Each is verified present and
unreferenced from `src/`. **`sidebar-BG.png` belongs here, not in a separate "optimize the
critical-path texture" item:** the CSS var `--sidebar-texture: url("/sidebar-BG.png")`
(`src/app/globals.css:66`) is **never consumed** — there is no `var(--sidebar-texture)`
anywhere in `src`, and the sidebar actually paints an inline `GLASS_GRAIN_DATA_URI`
(`src/components/sidebar/MainSidebar.tsx:290`). So the 2.6MB PNG is an orphan, not an
authed-LCP cost. Do NOT spend M-effort re-encoding a texture nothing loads — just delete
the asset (and optionally the dead CSS var).

**Confirmed orphans (grep over `src` → 0 hits each):**
- `public/sidebar-BG.png` (~2.6MB) — referenced only by the dead `--sidebar-texture` var.
- `public/landing/archestimator-frosted-construction.png` (~2.3MB) — superseded by
  `landing/hero-slides/*.jpg` + `next/image`.
- `public/Screenshot 2026-05-18 at 9.00.39 PM.png` (~966KB) — dev cruft; must not leak
  into a public deploy at launch.
- `public/archestimator_logo.png` (~697KB) — app uses the SVG logos.
- `public/{next,vercel,window,globe,file}.svg` — Next starter boilerplate.

**Steps:**
1. For each file, final per-file confirmation: `grep -rF "<basename>" src` plus a check for
   dynamic string concat, manifest, and email-template references → must be zero.
2. `git rm` the confirmed orphans.
3. Remove the now-dead `--sidebar-texture` line in `src/app/globals.css:66` (optional but
   tidy — it points at a file you just deleted).
4. `next build` or boot the app; load `/`, `/workshop`, and a `/share` link to confirm no
   404s and no visual change (the sidebar already renders the data-URI grain, unaffected).

**Files:** the listed `public/**` files; optionally `src/app/globals.css`.
**Migration/RLS:** none.
**Risk:** low — only deletion-by-404 if a dynamic reference was missed; the grep gate
catches static references. Keep `public/component-thumbnails/` and
`public/landing/hero-slides/` (both referenced).
**Effort:** S.
**Dependencies:** none.

---

## Item 4 — (Optional) Normalize 6 phosphor barrel imports to `/dist/ssr` (BUNDLE-05)

**Why:** 111/135 phosphor consumers already use the tree-shake-friendly
`@phosphor-icons/react/dist/ssr` path and `optimizePackageImports:["@phosphor-icons/react"]`
(`next.config.ts:55`) rewrites the rest at build, so the byte delta is ~0. Pure
consistency + removing reliance on the experimental optimizer flag.

**Files to normalize (value-icon imports only):**
- `src/components/share/ShareEstimateTreeView.tsx`
- `src/components/share/ShareEstimateTreePanel.tsx`
- `src/components/ui/checkbox.tsx`

(The three `import type { Icon as PhosphorIcon }` sites in `SidebarNavItemRow.tsx`,
`MainSidebar.tsx`, `ProjectMiniSidebar.tsx` are type-only — erased at build, zero bytes —
leave them.)

**Steps:** change the import specifier from `@phosphor-icons/react` to
`@phosphor-icons/react/dist/ssr` in the three value-import files. `bun run type-check`.
**Risk:** trivial. **Effort:** S. **Dependencies:** none. Skip for closed-beta if time-boxed.

---

## Item 5 — (Optional, post-launch) Capture a webpack treemap baseline + document recipe (BUNDLE-06)

**Why:** `@next/bundle-analyzer` (`next.config.ts:191`, gated on `ANALYZE=true`) only emits
a treemap under a **webpack** build; default `next build`/`next dev` use Turbopack and emit
nothing. Per-route initial-JS is "measured by grep, not treemap" — the same gap every prior
pack recorded. Not a blocker; structure is verified.

**Steps:**
1. Run `ANALYZE=true next build --webpack` once pre/post the dep changes; archive the
   landing `/` and `/workshop` treemaps as the launch baseline.
2. Document the recipe in this pack and/or the launch checklist.
3. Post-launch optional: a lightweight CI check on the `.next` route manifest to guard
   against a future heavy static import sneaking into a client entry.

**Risk:** none (read-only measurement). **Effort:** M (build is slow).
**Dependencies:** best run after Items 1–2 so the baseline reflects the cleaned graph.

---

## Cross-domain handoffs (not owned here)

- Private `project-images` covers bypass `next/image` (prior AS05/AS10) → image-route /
  security domain. Noted, not actioned here.
- `@vercel/speed-insights` not wired (prior AS01) → Observability domain.
- CSP/headers/nonce → Domain 7.
