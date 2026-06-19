# 03 — Evidence & Verification: Dependencies, Supply-Chain & Code-Health (Domain 12)

Date: 2026-06-19. Method: adversarial re-verification of `01-AUDIT-FINDINGS.md` —
opened each cited file at the cited line and tried to **refute** the claim; re-ran
the live tooling (`bun outdated`, `bun.lock` greps, `package.json` read,
source greps). Default posture: skepticism. All commands were read-only.

## Re-run tooling evidence (2026-06-19, this pass)

| Check | Command | Result |
|---|---|---|
| Stray file tracked | `git ls-files test-table.tsx` | TRACKED; content = 5-line scratch importing `./src/components/ui/data-table` + `console.log("OK")` |
| `three` usage | `rg "from 'three'" src` / `rg "['\"]three['\"]" src` | **0** imports; `three@^0.184.0` (pkg L87) + `@types/three` (L105) still declared |
| `class-variance-authority` usage | `rg "class-variance-authority\|\bcva\b" src` | **0**; `^0.7.1` still declared (L72) |
| `d3` direct usage | `rg "from ['\"]d3['\"]" src` | **0** direct d3 imports |
| `d3-shape` usage | `rg "from ['\"]d3-shape['\"]" src` | `CostDonutChart.tsx` imports `{ arc, pie }` + `type PieArcDatum` |
| `d3-shape` declared? | `grep d3-shape package.json` | **0** — undeclared (phantom) |
| `d3-shape` in lock | `rg "d3-shape" bun.lock` | resolves at L976 as a child of `d3@7.9.0` (L926) only |
| `@types/d3-shape` in lock | `rg "@types/d3-shape" bun.lock` | present at L670 (`3.1.8`), transitively via `@types/d3` |
| Type escape hatches | `rg "as any" src` ; `rg "@ts-ignore\|@ts-expect-error\|@ts-nocheck" src` | **0** and **0** |
| `: any` annotations | `rg ":\s*any\b" src` | all hits are the English word "any" inside comments (P6 "any node may parent any node"), **0** real `any` types |
| `eslint-disable` | `rg "eslint-disable" src` | 10 occurrences, all scoped `-next-line` (sampled — consistent with audit) |
| Boundary leak | `rg "@supabase/(ssr\|supabase-js)" src/components` | **0** direct SDK imports in components |
| Neat patch target | `head` of `patches/@firecms%2Fneat@0.8.0.patch` | patches `dist/NeatGradient.{d.ts,js}` AND minified `dist/index.es.js` / `index.umd.js`; adds `paused` + rAF early-return |
| Neat license | `rg "Commons Clause\|Selling this software" patch` | "Licensed under MIT + The Commons Clause." (L48) / "Selling this software or its derivatives is strictly prohibited." (L50) |
| exceljs subtree | `bun.lock:1110` | `exceljs@4.4.0` → `archiver@^5`, `unzipper@^0.10.11`, `uuid@^8.3.0`, `jszip`, `saxes@^5`, `tmp`; resolved `archiver@5.3.2`, `unzipper@0.10.14`, `uuid@8.3.2` |
| types.ts shape | `head src/lib/supabase/types.ts` + `rg PostgrestVersion` | generated shape; `PostgrestVersion: "14.5"` (L13); **no obvious stray top-level hand-export visible in head** |
| Outdated delta | `bun outdated` | see DEPS-02 table below — matches audit |
| Prior pack overlap | `09_DEPENDENCY_PACKAGE_AND_BUILD_CLEANUP_AUDIT.md:9-16,39-43` | F20 (three REMOVE), F21 (d3→d3-shape), F22 (cva REMOVE), F23 (ADD server-only+d3-shape), neat/exceljs KEEP — all present as claimed |

`bun outdated` (2026-06-19) confirmed: `next 16.2.6→16.2.9`, `react`/`react-dom
19.2.6→19.2.7`, `@supabase/ssr 0.10.3→0.12.0`, `@supabase/supabase-js
2.106.2→2.108.2`, `resend 6.12.4→6.14.0`, `@radix-ui/react-context-menu
2.2.16→2.3.1`, `@tanstack/react-query →5.101.0`, `sharp 0.34.5→0.35.1`,
`@firecms/neat 0.8.0→1.0.1`, plus dev bumps. **New nuance from verification:**
`next`, `react`, `react-dom`, `@supabase/ssr`, `@supabase/supabase-js`,
`@tanstack/react-query`, `zustand` are pinned *exact* (no caret), so they will not
move under `bun update` — the audit's "take the bumps" recommendation requires
explicit pin edits, now reflected in B1.

## Verdict table

| ID | Title | Prior sev / blocker | Verdict | Final sev / blocker | Note |
|---|---|---|---|---|---|
| DEPS-01 | Stray tracked `test-table.tsx` | low / false | **confirmed** | low / false | Tracked, outside `src/`, not bundled; hygiene + import-rot landmine. |
| DEPS-02 | Deps behind latest; none known-vuln; Next on patched line | low / false | **confirmed** | low / false | `bun outdated` matches. Exact-pin nuance added. Next-patched-line claim is reasoned, not locally provable (see limits). |
| DEPS-03 | Dead `three`/`@types/three`/`cva` declared | low / false | **confirmed** | low / false | 0 usage re-verified; cleanup F20/F22 diagnosed, never shipped. |
| DEPS-04 | Phantom `d3-shape`; `d3`/`@types/d3` dead | medium / false | **confirmed** | medium / false | Real undeclared-dependency hazard; masked today by transitive resolution. Correctly the top item and correctly NOT a blocker. |
| DEPS-05 | `@firecms/neat` patch maintenance + Commons-Clause license | low / false | **confirmed** | low / false | Patches minified bundles (brittle); Commons Clause text verified at patch L48-50; 0.8→1.0.1 major would drop the patch. |
| DEPS-06 | `exceljs` heavy/old transitive subtree (server-only) | low / false | **confirmed** | low / false | Subtree verified; write-only server path keeps `unzipper` parse-vuln class out of threat path. Watch-item. |
| DEPS-07 | `gen:types` blind-overwrite footgun | info / false | **confirmed (info)** | info / false | `>` redirect footgun is real; no obvious current stray export found (honest), so the *operational* risk — not a specific present-tense breakage — is the finding. Correctly info. |

**Refutations:** none. **Severity adjustments:** none — the prior auditor did not
inflate. **Launch-blockers:** 0 (correct for a pre-launch closed beta with no
external users; every item is hygiene/maintenance or a currently-masked correctness
hazard, not an exploit path).

`existing_plan_overlap` re-checked and upheld: DEPS-03 = partial:2026-06-14-Codebase-Cleanup-Plan
(F20/F22 diagnosed, unshipped — confirmed both deps still in `package.json`);
DEPS-04 = partial:…-Cleanup-Plan (F21/F23 — the `d3-shape` ADD half is the
load-bearing remaining work; `server-only` half of F23 DID ship — it is now declared
at `package.json:84`, consistent with the audit's "half done"); DEPS-05 =
covered-by:…-Cleanup-Plan KEEP, this pack adds the upgrade-path + license dimension
(verified absent from pack 09's KEEP row); DEPS-06 = covered-by KEEP (verified, row
17); DEPS-07 = covered-by:memory.

## Clean negatives independently re-verified (high-signal)

- Type hygiene: `as any` 0, `@ts-ignore/expect/nocheck` 0, real `: any` types 0
  (all comment-word "any"). Genuinely strong — no finding.
- Repository boundary: no component imports the raw Supabase SDK. Intact — no
  finding.
- Lifecycle posture: no `postinstall`/`preinstall`/`prepare`; `ignoreScripts` +
  `trustedDependencies` are a coherent conservative allow-list (`esbuild`, `sharp`,
  `unrs-resolver`). Sound — no finding.

## Per-item proof gates (what will demonstrate each fix)

| Item | Proof gate | Honest limits |
|---|---|---|
| A1 (d3-shape add / d3 drop) | `bun install` regenerates lock with `d3-shape` top-level + d3 sub-pkgs gone → `bun run type-check` (proves `@types/d3-shape` resolves the `PieArcDatum` import) → `bun run build` → **charts render check** (Storybook `CostDonutChart` story, OR the charts route via dev-auth bypass, OR the charts `test:dom` suite that mounts `CostDonutChart`) | A green build proves the import resolves; a *render* check is needed to prove `arc`/`pie` runtime behavior is unchanged. type-check alone does NOT exercise the donut math. |
| A2 (three/cva removal) | Final pre-removal `rg "from ['\"]three['\"]" src` + `rg "cva\b\|class-variance-authority" src` = 0 (F20/F22 protocol) → `bun install` → `bun run type-check` → `bun run build` | Tree-shaken dead code; a green build is conclusive that nothing imported them. |
| A3 (`test-table.tsx`) | `git rm` then `git status` clean; `bun run build` unaffected (file is outside `src/`) | Trivial; no runtime surface. |
| B1 (dep bumps) | Per-bump `bun install` → `type-check` → `build` → scoped `test:dom` (auth/supabase/email/charts) → **manual dev smoke**: Supabase auth sign-in round-trip + one Resend send path | Local checks cannot prove production CDN/runtime parity or that `@supabase/ssr 0.12` cookie/session behavior is identical under Vercel SSR — hence the domain-1 sign-off + manual auth smoke. Provider-side advisory confirmation needs `bun audit`/network DB (not in this env). |
| B2 (types.ts banner) | Comment-only; `bun run type-check` still green (no semantic change) | Process guardrail; cannot be "tested", only made visible at the edit site. |
| C1 (neat ack) | Owner ack recorded in `.ai/10_state/decisions.md`; (deferred) on any upgrade, re-derived patch applies cleanly via `bun install` and the landing hero still pauses (DevTools rAF check) | License comfort is an owner judgment, not a test. The minified-patch brittleness can only be proven at upgrade time. |
| C2 (exceljs watch) | Hand-off recorded for domain 9; (post-launch) `bun audit` clean on `exceljs` subtree | No local advisory DB in this environment — cannot run `bun audit` here; this is explicitly a post-launch cadence item. |

## Limits of local verification (honest)

- **No network advisory DB / `bun audit` in this environment.** DEPS-02's
  "none are known-vulnerable" and "Next 16.2.6 is the patched line for the May-2026
  batch" are *reasoned from version numbers + public release notes recalled at audit
  time*, not confirmed against a live CVE feed. An implementer should run `bun audit`
  (or check the GitHub advisory DB) on a networked machine before beta to close this.
- **`bun run validate` is known-red on main** (charts set-state-in-effect;
  ProposalExportPreviewDialog design-lint; test:dom all-phase can hang) — domain 10.
  Domain-12 gates must use *scoped* `test:dom`, not full `validate`, and must confirm
  any red is pre-existing (`git stash`) before attributing it to these edits.
- **Charts render parity** after the d3-shape swap is a behavioral claim the build
  alone does not cover; the render check in A1 is required, not optional.
