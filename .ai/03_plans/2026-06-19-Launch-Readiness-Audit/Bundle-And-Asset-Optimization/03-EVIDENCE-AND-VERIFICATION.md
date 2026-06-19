# Bundle & Asset Optimization — Evidence & Verification (2026-06-19)

Adversarial re-verification of `01-AUDIT-FINDINGS.md`. Each finding was attacked by
opening the cited files/commands and trying to refute it. All evidence below was
re-collected this pass (read-only on source).

## Method / honesty notes

- All greps run from repo root `/Users/philiplewis/Documents/archestimator`.
- `ripgrep` display interleaved two adjacent `globals.css` matches in this session; I
  fell back to `grep -F` and a direct `Read` of `globals.css:65–67` to get ground truth
  for the sidebar-texture claim (this is what flipped BUNDLE-04).
- NOT done locally (same honest gaps as the prior pack): no `ANALYZE=true next build
  --webpack` treemap, no live Lighthouse/WebPageTest. Byte-level "initial JS per route"
  remains measured-by-grep, not treemap. Local checks can prove *import structure*,
  *dependency declaration*, and *asset reference*; they CANNOT prove field LCP/INP or the
  exact per-route KB without a treemap + RUM.

---

## BUNDLE-01 — `three` unused — VERDICT: CONFIRMED (overlap corrected to `stale`)

**Claim:** `three` (38MB) is fully unused; neat declares no `three` dep.

**Re-verification:**
- `rg "['\"]three['\"]|three/src|three/examples|THREE\." src tests scripts .storybook` →
  only two hits, both string literals in tests (`ai-package-builder-provider.test.ts:76`
  `bedrooms: "three"`; `tab-strip.test.tsx:30` `label: "Three"`). **Zero real imports.**
- `package.json:87` `"three": "^0.184.0"`, `package.json:105` `"@types/three"`. Confirmed.
- `du -sh node_modules/three` = **38M**. Confirmed.
- `node_modules/@firecms/neat/package.json` → `dependencies: None`, `peerDependencies:
  None`, version `0.8.0`. `grep -rl "three" node_modules/@firecms/neat/dist` → **nothing**.
  So neat bundles its own WebGL and does NOT depend on `three`.

**Refutation attempt → failed.** The dep is genuinely dead.

**Overlap correction (important):** the auditor set `existing_plan_overlap: none`. That is
wrong. The prior `2026-06-14-Overall-Site-Performance` pack DID address `three` — but
**incorrectly**: PERF-BN-08 (`05_BUNDLE_JS_CSS_ASSET_AUDIT.md:282–289`) and the AS09 row
(`09_..._AUDIT.md:391`) assert `three` is "a transitive dependency of `@firecms/neat`" that
"rides this same defer." Today neat declares no deps and ships no `three`, so that prior
assessment is **stale/incorrect**. Corrected overlap: **stale:2026-06-14-Overall-Site-Performance**.
Net effect on the finding: unchanged (still a valid medium-severity hygiene removal), but
the reconciliation narrative must record that the prior pack mis-modeled it.

**Severity:** medium (kept). Not a launch blocker (ships zero client bytes today).

**Proof gate for the fix:** after removing both deps + `bun install`,
`bun run type-check` green (no `three` import to break); optional `next build` of landing
to confirm the WebGL hero still renders via neat. A local build *can* prove the removal is
non-breaking; it *cannot* prove a byte change because there was no client byte to begin with.

---

## BUNDLE-02 — full `d3` declared, only `d3-shape` used — VERDICT: CONFIRMED

**Re-verification:**
- Only app d3 import: `src/components/charts/CostDonutChart.tsx:4`
  `import { arc, pie } from "d3-shape"` (+ type `PieArcDatum` line 5). No `import * as d3`.
- `rg "from ['\"]d3"` across `src` → only that file; the other hits are *test assertions*
  in `tests/vitest/project-dashboard-charts-ui.test.ts` that enforce the donut imports
  `"d3-shape"` and that other clients do NOT import `"d3"`.
- `package.json:74` `"d3"`, `:101` `"@types/d3"`. `grep "d3-shape" package.json` → **not a
  direct dep**; `node_modules/d3-shape/package.json` present (transitive, hoisted).

**Refutation attempt → failed.** Declaration/install-graph gap is real.

**Overlap check:** prior pack `05_BUNDLE..._AUDIT.md:60` verified only `d3-shape` is used
(client-bytes) but never recommended making it a *direct* dep / dropping the meta-package.
So `existing_plan_overlap: partial:2026-06-14-Overall-Site-Performance` is **correct**.

**Severity:** low (kept). **Proof gate:** after add `d3-shape`/drop `d3`, `bun install` +
`type-check` green; the existing charts-UI contract test
(`project-dashboard-charts-ui.test.ts:55`) continues to assert the `"d3-shape"` import.

---

## BUNDLE-03 — orphaned `public/` assets — VERDICT: CONFIRMED (broadened to absorb sidebar-BG)

**Re-verification (each file present + `grep -rF <basename> src` → 0 hits):**
- `public/Screenshot 2026-05-18 at 9.00.39 PM.png` — present (988277 bytes), 0 src refs.
- `public/landing/archestimator-frosted-construction.png` — present (2366625 bytes), 0 refs.
- `public/archestimator_logo.png` — present (713550 bytes), 0 refs (app uses SVG logos).
- `public/{next,vercel,window,globe,file}.svg` — all present, 0 refs each.
- `public/sidebar-BG.png` — present (2771717 bytes); see BUNDLE-04 below — its only
  reference is a **dead** CSS var, so it is functionally an orphan and is folded in here.

**Refutation attempt → failed.** Prior `AS03` (`09_..._AUDIT.md:98`) already documented
these; the `Cards/*.jpg` portion is already deleted (confirmed `public/Cards` jpgs gone).
Overlap `partial:2026-06-14-Overall-Site-Performance` is correct.

**Severity:** low (kept). **Proof gate:** per-file `grep -rF` zero-reference proof before
`git rm`; then `next build`/app boot with `/`, `/workshop`, `/share` loaded → no 404, no
visual change. Local checks fully prove this one (static references are greppable; the only
residual risk is a runtime-constructed string, which the dynamic-concat check covers).

---

## BUNDLE-04 — `sidebar-BG.png` on authed critical path — VERDICT: REFUTED (downgraded, folded into BUNDLE-03)

**Claim under attack:** "2.6MB `sidebar-BG.png` served as a CSS background on every
authenticated page, on the cold-load critical path → hurts authed-LCP, single largest
actually-loaded asset." (The auditor itself flagged medium confidence and told the reader
to "confirm which file CSS actually loads.")

**Ground-truth re-verification:**
- `Read` of `src/app/globals.css:66` → exactly one definition:
  `--sidebar-texture: url("/sidebar-BG.png");`. There is **no** `/n.png` file
  (`test -f public/n.png` → MISSING); the earlier audit's `/n.png` hedge was a ripgrep
  display artifact.
- `grep -rn "sidebar-texture" src` → the var is **defined once and consumed nowhere**.
  `grep -rF "var(--sidebar-texture)" src` → **zero hits**.
- The sidebar actually paints an inline data URI: `src/components/sidebar/MainSidebar.tsx:290`
  `style={{ backgroundImage: GLASS_GRAIN_DATA_URI }}` (imported from `./glass-grain`,
  line 17). So the real sidebar grain is an inline data URI, not `sidebar-BG.png`.
- `git log -S "var(--sidebar-texture)" -- src` → no commit ever consumed it (the texture
  var has been dead since introduction).

**Conclusion:** the central claim — that this 2.6MB PNG is on the authed cold-load critical
path — is **false**. Nothing loads `sidebar-BG.png` at runtime; it is a deploy-artifact
orphan referenced only by a dead CSS variable. Correct action is **delete the file** (and
optionally the dead var), NOT an M-effort AVIF/WebP re-encode of a texture nothing paints.

**Severity:** medium → **low** (downgraded; absorbed into BUNDLE-03).
**Launch blocker:** false (unchanged).

**Prior-pack overlap also stale:** prior `AS04` (`09_..._AUDIT.md:126–136`) cited
`src/components/sidebar/SidebarHeader.tsx:39` painting `backgroundImage: url("/sidebar-BG.png")`.
That consumption site does not exist in today's code (the sidebar was rewritten to
`MainSidebar.tsx` + `GLASS_GRAIN_DATA_URI`). So `partial:2026-06-14` is upgraded to
**stale:2026-06-14-Overall-Site-Performance** for the *critical-path* characterization; the
*delete-the-bytes* outcome survives under BUNDLE-03.

**Proof gate:** `grep -rF "sidebar-BG" src` → only the dead var (now removed); `grep -rF
"var(--sidebar-texture)" src` → zero; boot `/workshop` and confirm the sidebar grain is
unchanged (it renders the data URI). Local checks fully prove there is no critical-path
load. (We cannot, and need not, run a treemap for this — there is no network request to
measure.)

---

## BUNDLE-05 — phosphor barrel imports — VERDICT: CONFIRMED (low, optional)

**Re-verification:** `rg -rl "@phosphor-icons/react/dist/ssr" src` = 111 files;
`rg -rl "from ['\"]@phosphor-icons/react['\"]" src` (minus stories) = 6 files. Of those 6,
three are **type-only** imports (`import type { Icon as PhosphorIcon }` in
`SidebarNavItemRow.tsx`, `MainSidebar.tsx`, `ProjectMiniSidebar.tsx`) — erased at build,
zero bytes. Only three are value-icon barrel imports:
`share/ShareEstimateTreeView.tsx`, `share/ShareEstimateTreePanel.tsx`, `ui/checkbox.tsx`.
`optimizePackageImports:["@phosphor-icons/react"]` (`next.config.ts:55`) rewrites these at
build, so byte delta ≈ 0.

**Refinement vs audit:** the audit listed `checkbox.tsx` and the two share files (correct)
but the headline count "a handful" overstates impact — only 3 value-import files matter.
Verdict confirmed, scope tightened. Overlap `covered-by:2026-06-14` is correct.

**Proof gate:** if normalized, `type-check` green; treemap would show no change (optimizer
already handles it).

---

## BUNDLE-06 — no Turbopack treemap / no JS budget — VERDICT: CONFIRMED (info)

**Re-verification:** `next.config.ts:2` imports `@next/bundle-analyzer`; `:191`
`enabled: process.env.ANALYZE === "true"`. The analyzer only emits a treemap under
`next build --webpack`; default builds use Turbopack and emit nothing. No CI size budget
exists. This matches the recurring "blocked — no analyzer run" note in the prior pack.

**Proof gate:** running `ANALYZE=true next build --webpack` once produces the baseline; this
is itself the proof. Honest limit: this is the one item local checks *cannot* shortcut —
it requires actually running the slow webpack build (deferred this session).

---

## Confirmed-healthy (spot-rechecked, no action)

- **exceljs server isolation:** `rg -rln "exceljs" src` → only
  `src/lib/proposal-export/create-proposal-workbook.ts`. `grep -c exceljs
  build-proposal-export-model.ts` (the client-reachable model) → 0. Boundary clean.
- **Fonts:** `src/app/layout.tsx:2` `import { Doto, Roboto_Mono } from "next/font/google"`
  with `display:"swap"`; self-hosted, no render-blocking external font CSS.

---

## Reconciliation correction (net)

The prior `2026-06-14-Overall-Site-Performance` pack is mostly valid, but this pass found
**two stale assessments** the auditor under-weighted: (1) it modeled `three` as a deferred
transitive dep of neat (false — neat has no deps), and (2) it modeled `sidebar-BG.png` as a
live CSS background painted by `SidebarHeader.tsx` (false — that site is gone and the
texture var is dead). Both corrections were folded into the verdicts above. No finding in
this domain is a launch blocker for closed-beta.
