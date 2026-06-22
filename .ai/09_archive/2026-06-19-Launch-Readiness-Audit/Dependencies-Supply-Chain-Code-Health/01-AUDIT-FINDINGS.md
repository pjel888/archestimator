# 01 — Audit Findings: Dependencies, Supply-Chain & Code-Health (Domain 12)

Date: 2026-06-19. Auditor scope: domain 12 only. Read-only on source/config.

## Scope & coverage

**Read in full / inspected directly:**
- `package.json` (all deps, devDeps, scripts, `trustedDependencies`,
  `ignoreScripts`, `patchedDependencies`).
- `bun.lock` (resolution graph; ran `bun install --frozen-lockfile --dry-run` →
  lockfile is consistent with `package.json`; ran `bun outdated`).
- `patches/@firecms%2Fneat@0.8.0.patch` (the only patch; head + license banner).
- `test-table.tsx` (repo root stray file; confirmed git-tracked).
- `src/lib/repositories/**` (9 files; boundary direction + supabase imports).
- `src/lib/domain/**` (3 files) and `src/lib/util/**` (1 file).
- `src/lib/supabase/types.ts` (head/tail/exports — generated-shape check).
- Repo-wide greps: `as any`, `: any`, `@ts-ignore`, `@ts-expect-error`,
  `@ts-nocheck`, `eslint-disable`, direct `@supabase/*` imports in UI.

**Deferred / not exhaustively read:** every consumer of each dependency (sampled,
not exhaustive); full transitive CVE scan (no `bun audit`/network advisory DB in
this environment — version-vs-known-CVE reasoning used instead, see DEPS-02).

## Reconciliation table vs prior packs

| Prior pack / source | Item | This audit's status |
|---|---|---|
| 2026-06-14-Codebase-Cleanup-Plan §09 F20 | `three`+`@types/three` zero-usage → REMOVE | **Confirmed still unshipped.** `rg "['\"]three['\"]" src` = 0 imports; both still in `package.json` (`three@^0.184.0`). → DEPS-03 |
| 2026-06-14 §09 F21 | `d3`→`d3-shape` swap | **Source half done, package.json half NOT.** Code imports `d3-shape` (`CostDonutChart.tsx:4`); `d3@^7.9.0`+`@types/d3` still listed; `d3-shape` NOT a declared dep (phantom). → DEPS-04 |
| 2026-06-14 §09 F22 | `class-variance-authority` zero-usage → REMOVE | **Confirmed still unshipped.** `rg "cva\b|class-variance-authority" src` = 0. → DEPS-03 |
| 2026-06-14 §09 F23 | ADD `server-only`, `d3-shape` (imported-unlisted) | **Half done.** `server-only` now declared AND imported (10+ files). `d3-shape` still undeclared. → DEPS-04 |
| 2026-06-14 §09 F16/«KEEP» | `@firecms/neat` + patch = HIGH risk, KEEP | Confirmed KEEP; this audit adds the *upgrade-path + license* dimension the cleanup pack did not cover. → DEPS-05 |
| memory: supabase-types-not-pure-generated | `types.ts` has hand-added export + RPC drift; raw `gen:types` breaks build | **Operational caveat, still true in spirit.** Did not find an obvious stray hand-export in head/tail; the load-bearing risk (don't blind-overwrite via `gen:types`) stands. → DEPS-07 (info) |
| 2026-06-14 §05/§10 (stray files) | (not specifically listed) | `test-table.tsx` at repo root is git-tracked dead scratch. → DEPS-01 |

No prior pack covers: live `bun outdated` delta (DEPS-02), the phantom `d3-shape`
declaration gap framed as a launch-correctness risk (DEPS-04), the `@firecms/neat`
**license** (Commons Clause) note (DEPS-05), or `exceljs` transitive surface
(DEPS-06).

---

## Findings

### DEPS-01 — Stray git-tracked scratch file `test-table.tsx` at repo root
- **Severity:** low · **launch_blocker:** false · **confidence:** high
- **Files:** `test-table.tsx`
- **Evidence:** `git ls-files test-table.tsx` → TRACKED; not in `.gitignore`.
  Contents (5 lines): imports `renderToString` + `DataTable` from
  `./src/components/ui/data-table` and `console.log("OK")`. Committed in `a5ecb3a7`
  ("world-class UI component library"). Lives OUTSIDE `src/`, so `tsconfig`/`next`
  may not type-check it, but it ships in the repo and imports a real component.
- **Impact:** Dead scratch file in the repo root. Not bundled by Next (outside
  `src/app`), so no runtime/bundle risk, but it is repo-hygiene noise and an
  import-rot landmine (it hard-codes a relative path into `src/components/ui`).
- **Recommendation:** `git rm test-table.tsx`. Trivial, reversible.
- **Effort:** S · **existing_plan_overlap:** none

### DEPS-02 — Multiple dependencies behind latest; none are known-vulnerable, Next is on the patched line
- **Severity:** low · **launch_blocker:** false · **confidence:** medium
- **Files:** `package.json`, `bun.lock`
- **Evidence:** `bun outdated` delta — `next 16.2.6→16.2.9`, `react/react-dom
  19.2.6→19.2.7`, `@supabase/ssr 0.10.3→0.12.0` (minor), `@supabase/supabase-js
  2.106.2→2.108.2`, `resend 6.12.4→6.14.0`, `@radix-ui/react-context-menu
  2.2.16→2.3.1`, `@tanstack/react-query →5.101.0`, `sharp 0.34.5→0.35.1`,
  `@firecms/neat 0.8.0→1.0.1`, plus dev bumps (eslint 9→10 major, storybook,
  playwright, types). **Crucially: Next 16.2.6 IS the patched version** for the May
  2026 13-advisory security batch (middleware-bypass / RSC DoS CVE-2026-23870 /
  image-optimization) per nextjs.org — so the app is NOT exposed to that batch;
  16.2.9 is a routine patch bump with no separately-flagged CVE found.
- **Impact:** No *known-exploitable* dependency on the current pins (verified for the
  one batch that matters most — Next.js). Drift is normal maintenance debt, not a
  launch blocker, but several pins (Supabase client, resend, react) carry routine
  bugfixes worth taking before exposure.
- **Recommendation:** Before beta, take the low-risk patch/minor bumps for the
  security-adjacent runtime deps (`@supabase/ssr`, `@supabase/supabase-js`,
  `react`/`react-dom`, `next`→16.2.9, `resend`) behind the standard
  install→type-check→build→test:dom gate. Defer the eslint 9→10 major and the
  `@firecms/neat` 0.8→1.0 major (see DEPS-05) to dedicated work. Establish a
  `bun audit` / Dependabot-style cadence post-launch (cross-domain → domain 9).
- **Effort:** M · **existing_plan_overlap:** none

### DEPS-03 — Dead runtime dependencies still declared (`three`, `@types/three`, `class-variance-authority`)
- **Severity:** low · **launch_blocker:** false · **confidence:** high
- **Files:** `package.json` (lines 72, 87, 105 area), `bun.lock`
- **Evidence:** `rg "['\"]three['\"]" src` → 0 imports; `three@0.184.0` + `@types/three`
  still declared. `rg "cva\b|class-variance-authority" src` → 0; still declared
  (`^0.7.1`). Both independently flagged by the 2026-06-14 cleanup audit
  (F20/F22) via knip+depcheck+grep; **never removed.**
- **Impact:** `three` is a ~600KB package sitting in the dependency graph and
  install surface for zero benefit (supply-chain surface area + install time + a
  false "we use Three.js" signal). `class-variance-authority` is small but equally
  unused. No runtime risk (unimported code is tree-shaken), but it is dead
  supply-chain surface a launch audit should not carry.
- **Recommendation:** Remove `three`, `@types/three`, `class-variance-authority`
  from `package.json`; `bun install`; gate with type-check + build. (Re-run the
  zero-usage greps at remediation time per F20/F22.)
- **Effort:** S · **existing_plan_overlap:** partial:2026-06-14-Codebase-Cleanup-Plan (F20/F22 diagnosed; unshipped)

### DEPS-04 — Phantom (undeclared) dependency `d3-shape`; `d3`/`@types/d3` are now dead weight
- **Severity:** medium · **launch_blocker:** false · **confidence:** high
- **Files:** `package.json`, `bun.lock`, `src/components/charts/CostDonutChart.tsx:4-5`
- **Evidence:** `CostDonutChart.tsx` imports `{ arc, pie }` and `type PieArcDatum`
  from `"d3-shape"`. `grep d3-shape package.json` → **0** (not declared). In
  `bun.lock`, `d3-shape@3.2.0` resolves ONLY as a transitive child of `d3@7.9.0`
  (lock line 976 under `d3`'s dependency list). Meanwhile `d3@^7.9.0`+`@types/d3`
  are still top-level deps but `rg "from ['\"]d3['\"]"` → 0 direct d3 imports.
- **Impact:** This is a real correctness/robustness hazard, not just hygiene: the
  charts feature depends on a package it does not declare. It works today *only
  because* `d3` happens to pull `d3-shape` in transitively. The moment `d3` is
  removed (exactly what cleanup F21 prescribes) or a future `d3` major drops/renames
  `d3-shape`, charts break at build/runtime with no declared contract. The fix and
  the dead-dep removal are the same operation, so they must ship together.
- **Recommendation:** Add `d3-shape` (and `@types/d3-shape` — already transitively
  present, lock line 670) as direct deps; remove `d3` + `@types/d3`. Gate with
  type-check + build + a `CostDonutChart` render/charts smoke. This closes F21+F23's
  `d3-shape` half in one move.
- **Effort:** S · **existing_plan_overlap:** partial:2026-06-14-Codebase-Cleanup-Plan (F21/F23 diagnosed; the `d3-shape` ADD half remains undone and is the load-bearing risk)

### DEPS-05 — `@firecms/neat` patch maintenance + license (Commons Clause) carry-over
- **Severity:** low · **launch_blocker:** false · **confidence:** high
- **Files:** `package.json:62,124-126`, `patches/@firecms%2Fneat@0.8.0.patch`
- **Evidence:** `patchedDependencies: { "@firecms/neat@0.8.0": ... }`. The patch
  adds a `paused: boolean` field and an early-return in the rAF render loop (both
  the readable `dist/NeatGradient.js`/`.ts` AND the minified `dist/index.es.js` /
  `index.umd.js` — i.e. it patches **minified bundles**, the most brittle kind of
  patch). The package is **MIT + The Commons Clause** ("Selling this software or its
  derivatives is strictly prohibited", patch line 48-50). `bun outdated` shows
  `0.8.0 → 1.0.1` available, so the patch is pinned to a now-superseded major.
- **Impact:** (1) Maintenance: any version bump silently drops the patch and
  re-enables the always-on WebGL rAF loop (a perf/battery regression on the public
  landing hero) unless the patch is re-derived against new minified output — which
  is exactly why it can't auto-apply across the 1.0.1 major. (2) License: Commons
  Clause forbids *selling the software or derivatives*. Using `@firecms/neat` as a
  background effect inside a paid SaaS is the normal "use" the MIT grant allows
  (you're not selling Neat itself), so this is **almost certainly fine**, but it is
  a non-standard license a launch audit should surface to the owner for an explicit
  "we're comfortable" rather than discover post-launch.
- **Recommendation:** Keep the dep+patch for now (it's load-bearing for the hero
  perf fallback). Before any `@firecms/neat` upgrade, re-derive the patch against the
  new dist or, better, upstream the `paused` flag / replace with a self-owned wrapper
  that pauses via `cancelAnimationFrame` so no minified-bundle patch is needed.
  Record an explicit owner ack of the Commons Clause license. Do not auto-bump to
  1.0.1 without re-validating the patch.
- **Effort:** M · **existing_plan_overlap:** covered-by:2026-06-14-Codebase-Cleanup-Plan (KEEP decision) — this finding ADDS the upgrade-path + license dimension not in that pack

### DEPS-06 — `exceljs@4.4.0` ships an old, heavy transitive subtree (server-only, low exposure)
- **Severity:** low · **launch_blocker:** false · **confidence:** medium
- **Files:** `package.json:75`, `bun.lock:1110`
- **Evidence:** `exceljs@4.4.0` depends on `archiver@^5`, `unzipper@^0.10.11`,
  `jszip@^3.10.1`, `saxes@^5`, `uuid@^8.3.0`, `tmp@^0.2.0`. `unzipper@0.10.x` and
  `uuid@8` are old lines historically associated with advisories; `exceljs` is used
  ONLY in the proposal export server route (`.../export/proposal.xlsx/route.ts`),
  never client-side (cleanup audit §09 marks it server-only / KEEP).
- **Impact:** The risky transitive surface (zip/unzip parsers) is only reachable on
  the server-side export path, and the app *writes* workbooks (doesn't parse
  attacker-supplied xlsx via exceljs), so the `unzipper` parse-vuln class is largely
  not in the threat path. This is a watch-item, not a blocker.
- **Recommendation:** Keep. Add `exceljs` to the post-launch `bun audit` cadence; if
  a future advisory lands on `unzipper`/`archiver`, evaluate `exceljs` upgrade or a
  lighter writer. No pre-launch action required.
- **Effort:** S · **existing_plan_overlap:** covered-by:2026-06-14-Codebase-Cleanup-Plan (KEEP)

### DEPS-07 — `gen:types` is a footgun: never blind-overwrite `src/lib/supabase/types.ts`
- **Severity:** info · **launch_blocker:** false · **confidence:** medium
- **Files:** `package.json:20` (`gen:types`), `src/lib/supabase/types.ts` (4505 lines)
- **Evidence:** memory `supabase-types-not-pure-generated` records that `types.ts`
  has a hand-added export + RPC drift and that a raw `supabase gen types ... >
  types.ts` overwrite breaks the build (splice new tables additively instead). This
  audit confirmed `types.ts` carries `PostgrestVersion: "14.5"` and the full
  generated `Constants`/`Enums` shape; the operational hazard (the `>` redirect in
  the `gen:types` script clobbers any manual additions) is real regardless of
  whether a single stray export is currently visible.
- **Impact:** A future agent running `bun run gen:types` to "sync types" can silently
  break the build / drop hand-maintained types right before or during launch. This
  is a process/code-health risk, not a runtime vuln.
- **Recommendation:** Document the constraint at the top of `types.ts` (a comment:
  "partially hand-maintained — do not blind-overwrite; splice new tables
  additively") so the footgun is visible at the edit site, not only in agent memory.
  No dependency change.
- **Effort:** S · **existing_plan_overlap:** covered-by:memory (supabase-types-not-pure-generated)

---

## Items checked and found CLEAN (high-signal negatives)

- **Type-escape hatches:** `rg` for `as any` → **0**; `@ts-ignore`/`@ts-expect-error`/
  `@ts-nocheck` → **0**. The 10 `: any` and 8 `:\s*any` hits are ALL the English word
  "any" inside comments (e.g. "any node may parent any node"), not type annotations.
  Type hygiene is genuinely strong — no finding.
- **`eslint-disable`:** 10 occurrences in 9 files, every one a scoped
  `eslint-disable-next-line` for a justified rule (`@next/next/no-img-element` on
  user-image `<img>`, `no-console` in a perf monitor, `exhaustive-deps`,
  `react-hooks/set-state-in-effect`, an annotated TanStack-Virtual exception). No
  file-level blanket disables. Acceptable — no finding.
- **Repository boundary integrity:** No UI component imports `@supabase/ssr` or
  `@supabase/supabase-js` directly. The only direct `@supabase/supabase-js`
  `createClient` calls are in **server API routes** (`api/projects/images`,
  `api/component-library/{attachments,images}`) — legitimate service-role usage, not
  a UI leak. `realtime-auth-bridge.tsx` (a client component) imports
  `createSupabaseBrowserClient` from `@/lib/supabase/client` — the sanctioned browser
  wrapper, not the raw SDK. Repositories import `@/lib/supabase/{server,client}` +
  typed `Tables`; the `import { cache } from "react"` in `workspace-repository.ts` is
  React's server `cache()` (RSC dedupe), NOT a client-boundary leak. Client
  components importing repositories is the normal RSC top-down data pattern. Boundary
  is intact — no finding.
- **Lifecycle/postinstall posture:** No `postinstall`/`preinstall`/`prepare` in root
  `package.json`. `ignoreScripts: [sharp, unrs-resolver]` + `trustedDependencies:
  [esbuild, sharp, unrs-resolver]` is a coherent, conservative posture (native build
  scripts are explicitly allow-listed; nothing else runs install scripts). Sound — no
  finding.
- **Lockfile integrity:** `bun install --frozen-lockfile --dry-run` resolved cleanly
  → `bun.lock` is consistent with `package.json` (no drift). No finding.
- **`madge`/circular deps:** prior cleanup pack reports no circular dependencies; not
  re-run here but no boundary evidence contradicts it.

## Cross-domain handoffs (recorded, not acted on here)

- The absence of `middleware.ts` (verified: 0 supabase imports there) means the May
  2026 Next.js middleware-auth-bypass advisory class does not apply — **but the
  actual route-protection mechanism must be confirmed by domain 1 (Auth)**. Being on
  Next 16.2.6 (the patched line) is a shared positive.
- `bun audit` / Dependabot cadence and dependency-update alerting → domain 9 (Ops).
- Bundle-size *measurement* of removing `three`/`d3` → domain 6.
