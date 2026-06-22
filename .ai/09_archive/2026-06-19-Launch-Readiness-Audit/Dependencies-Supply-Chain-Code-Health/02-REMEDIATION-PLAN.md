# 02 — Remediation Plan: Dependencies, Supply-Chain & Code-Health (Domain 12)

Date: 2026-06-19. Status: PLAN (post adversarial verification). Write-scope: this
folder only. Source/config remain read-only until an implementer picks this up.

## Verification outcome (summary)

All 7 prior findings were adversarially re-checked against the real files and the
live `bun outdated` / `bun.lock` / `package.json` state. **Every finding held**
(confirmed or scope-adjusted); **none were refuted**; **zero launch-blockers**.
This is correct for a pre-launch closed beta with no external users: the domain-12
surface is maintenance/hygiene debt and one real (but currently-masked)
undeclared-dependency correctness hazard, not an exploit path. Severities were not
inflated; DEPS-04 (medium) is correctly the top item and correctly NOT a blocker.

The full verdict table and proof gates are in `03-EVIDENCE-AND-VERIFICATION.md`.

## Sequencing principle

No item blocks launch, so this is **opportunistic pre-beta hardening**, ordered by
(real risk reduction × low cost) and by *coupling* — DEPS-04 and DEPS-03's `d3` half
are the **same physical edit** and MUST ship together or the swap order can break
charts. Group A is one small, well-gated PR. Group B is independent and trivial.
Group C is watch/record-only (no code change required pre-beta).

---

## GROUP A — One dependency-graph PR (couple DEPS-04 + DEPS-03 + DEPS-01)

These are build-graph edits with one shared validation gate. Do them as a single
branch so the d3 removal and the d3-shape add land atomically.

### A1 — Declare `d3-shape` + drop dead `d3`/`@types/d3` (DEPS-04 + DEPS-03 d3 half)
**Severity:** medium · **Effort:** S · **Blocker:** no

This is the load-bearing item: `src/components/charts/CostDonutChart.tsx:4-5`
imports `{ arc, pie }` and `type PieArcDatum` from `"d3-shape"`, but `d3-shape` is
**not declared** in `package.json` — it resolves today only as a transitive child of
`d3@7.9.0` (`bun.lock:976`). The cleanup pack's own F21 prescribes removing `d3`;
the moment that happens, charts break unless `d3-shape` is first promoted to a
direct dep. **Order matters: ADD before REMOVE.**

Steps:
1. In `package.json` `dependencies`, **add** `"d3-shape": "^3.2.0"` (lock already
   has `d3-shape@3.2.0` at line 976 — pin to that resolved line).
2. In `devDependencies`, **add** `"@types/d3-shape": "^3.1.8"` (lock already has
   `@types/d3-shape@3.1.8` at line 670). `d3-shape` does NOT ship its own types, so
   this is required for `tsc` once `@types/d3` is gone.
3. In `dependencies`, **remove** `"d3": "^7.9.0"`.
4. In `devDependencies`, **remove** `"@types/d3": "^7.4.3"`.
5. `bun install` (regenerates `bun.lock`; expect ~33 d3 sub-packages to drop from
   the graph and `d3-shape` to become a top-level resolution).

Files: `package.json` (lines 74, 101), `bun.lock` (regenerated). No `src/**` change
— the source already imports from `d3-shape`.

Risk: low. Single consuming file (`CostDonutChart.tsx`). The risk is a *wrong-order*
edit (remove d3 before adding d3-shape) leaving an install where `tsc`/charts fail —
mitigated by doing both in one `bun install` and gating with a charts render check.
Rollback: revert `package.json` + `bun.lock`.

### A2 — Remove dead `three` / `@types/three` / `class-variance-authority` (DEPS-03)
**Severity:** low · **Effort:** S · **Blocker:** no

`rg "from 'three'" src` → 0; `rg "class-variance-authority|\bcva\b" src` → 0
(re-verified 2026-06-19). Both were diagnosed by the cleanup pack (F20/F22) and
never shipped.

Steps:
1. `package.json` `dependencies`: remove `"three": "^0.184.0"` (line 87) and
   `"class-variance-authority": "^0.7.1"` (line 72).
2. `devDependencies`: remove `"@types/three": "^0.184.1"` (line 105).
3. Per F22, re-run `rg "cva\b|class-variance-authority" src` and
   `rg "from ['\"]three['\"]" src` at implementation time as the final pre-removal
   proof (guards against a new import landing between audit and remediation).
4. `bun install`.

Files: `package.json` (lines 72, 87, 105), `bun.lock`. Risk: low (tree-shaken dead
code; removing it changes nothing at runtime). Rollback: revert the two files.

### A3 — Delete stray tracked scratch file `test-table.tsx` (DEPS-01)
**Severity:** low · **Effort:** S · **Blocker:** no

`git ls-files test-table.tsx` → tracked. 5-line scratch importing
`./src/components/ui/data-table` + `console.log("OK")`, committed in `a5ecb3a7`.
Lives outside `src/` so Next does not bundle it, but it is hygiene noise and an
import-rot landmine (hard-codes a relative path into `src/components/ui`).

Steps: `git rm test-table.tsx`. Risk: trivial/reversible.

### Group A combined validation gate (run once for A1+A2+A3)
`bun install` → `bun run type-check` → `bun run build` → charts render check
(`CostDonutChart`, see evidence doc for options) → scoped `bun run test:dom` on the
charts suite. Do NOT gate on full `bun run validate` (known-red on main for
unrelated reasons — charts set-state-in-effect, ProposalExportPreviewDialog
design-lint, per domain 10). Confirm the red is pre-existing via `git stash` if in
doubt. Rollback for the whole group: revert `package.json` + `bun.lock` (+ restore
`test-table.tsx`).

---

## GROUP B — Independent low-risk maintenance (no coupling to Group A)

### B1 — Take security-adjacent patch/minor bumps before exposure (DEPS-02)
**Severity:** low · **Effort:** M · **Blocker:** no

`bun outdated` (re-run 2026-06-19) confirms the drift: `next 16.2.6→16.2.9`,
`react`/`react-dom 19.2.6→19.2.7`, `@supabase/ssr 0.10.3→0.12.0` (minor),
`@supabase/supabase-js 2.106.2→2.108.2`, `resend 6.12.4→6.14.0`,
`@radix-ui/react-context-menu 2.2.16→2.3.1`, `@tanstack/react-query →5.101.0`,
`sharp 0.34.5→0.35.1`. None are known-exploitable on the current pins.

**Caveat surfaced by verification:** `next`, `react`, `react-dom`,
`@supabase/ssr`, `@supabase/supabase-js`, `@tanstack/react-query`, `zustand` are
pinned *exact* (no caret) in `package.json` — so `bun update` will NOT move them;
each must be bumped by editing the pin explicitly. `next 16.2.6` is the patched line
for the May 2026 advisory batch (reasoned claim, not locally verifiable — see
evidence doc), so `16.2.9` is routine, not an emergency.

Steps:
1. In one branch, bump the runtime-security-adjacent pins by editing
   `package.json`: `next`→`16.2.9`, `@next/third-parties`→`^16.2.9`,
   `@next/bundle-analyzer`→`16.2.9`, `eslint-config-next`→`16.2.9`,
   `react`/`react-dom`→`19.2.7`, `@supabase/ssr`→`0.12.0`,
   `@supabase/supabase-js`→`2.108.2`, `resend`→`^6.14.0`. (Keep React/Next in
   lockstep.)
2. `bun install` → `bun run type-check` → `bun run build` → `bun run test:dom`
   (scoped to auth/supabase/email/charts suites) → manual smoke of a Supabase auth
   round-trip and one Resend send path in dev.
3. **Hold for separate work** (do NOT bundle here): `eslint 9→10` (major, lint-only,
   can churn config), `@firecms/neat 0.8→1.0.1` (major — see DEPS-05; breaks the
   patch), and the Storybook 10.4.2→10.4.6 dev stack. `@supabase/ssr 0.10→0.12` is a
   minor but the SSR cookie/session surface is sensitive — keep it in this branch but
   smoke auth explicitly and flag to **domain 1 (Auth)** before merge.

Files: `package.json`, `bun.lock`. Risk: low-medium (auth/SSR client surface is the
only place a minor bump could regress session handling — hence the explicit auth
smoke + domain-1 flag). Rollback: revert both files.

Dependency on other domains: **domain 9 (Ops)** owns the post-launch `bun audit` /
Dependabot cadence (recommended, not a domain-12 deliverable). **Domain 1 (Auth)**
should sign off the `@supabase/ssr` minor before merge.

### B2 — Annotate the `gen:types` footgun at the edit site (DEPS-07, info)
**Severity:** info · **Effort:** S · **Blocker:** no

`package.json:20` `gen:types` is a raw `supabase gen types ... > types.ts` `>`
redirect that clobbers the file. Memory `supabase-types-not-pure-generated` records
that `types.ts` is partially hand-maintained (and carries `PostgrestVersion: "14.5"`
at line 13). Verification did NOT find an obvious stray top-level hand-export in the
head, so the *current* drift is subtle — but the redirect footgun is real
regardless.

Steps: add a top-of-file banner comment to `src/lib/supabase/types.ts`:
`// PARTIALLY HAND-MAINTAINED — do NOT blind-overwrite via `bun run gen:types`. The`
`// gen:types script is a `>` redirect that clobbers manual additions. Splice new`
`// tables/RPCs additively and re-validate `bun run build` after.` Optionally
mirror the warning as a comment beside the `gen:types` script in `package.json`.

Files: `src/lib/supabase/types.ts` (line 1), optionally `package.json:20`. Risk:
nil (comment only). This is the one Group-B item that touches `src/**`.

---

## GROUP C — Watch / record only (no pre-beta code change)

### C1 — `@firecms/neat` patch + Commons-Clause license: record owner ack (DEPS-05)
**Severity:** low · **Effort:** M (only if/when upgrading) · **Blocker:** no

The patch (`patches/@firecms%2Fneat@0.8.0.patch`) adds a `paused` flag + rAF
early-return and patches **minified bundles** (`dist/index.es.js`,
`dist/index.umd.js`) — the most brittle patch kind. `@firecms/neat` is
**MIT + The Commons Clause** ("Selling this software or its derivatives is strictly
prohibited", patch lines 48-50). `bun outdated`: `0.8.0 → 1.0.1` (major).

Pre-beta action (record-only):
1. Record an explicit owner acknowledgement that the Commons Clause is understood:
   using Neat as a background effect inside a paid SaaS is ordinary "use" under the
   MIT grant (you are not selling Neat itself or a derivative of it), so this is
   almost certainly fine — but the owner should consciously accept it rather than
   discover it post-launch. Put the ack in `.ai/10_state/decisions.md`.
2. **Do NOT auto-bump to 1.0.1.** The major will silently drop the patch (a `>=1.0.0`
   range won't match `@firecms/neat@0.8.0` in `patchedDependencies`) and re-enable
   the always-on WebGL rAF loop on the public landing hero (perf/battery regression).

Deferred work (only when an upgrade is actually wanted): re-derive the patch against
1.0.1's minified dist, OR — better — replace the minified-bundle patch with a
self-owned wrapper that pauses via `cancelAnimationFrame`, eliminating the brittle
patch entirely. Effort M, off the pre-beta path.

Files (deferred only): `package.json:62,124-126`,
`patches/@firecms%2Fneat@0.8.0.patch`.

### C2 — `exceljs` transitive subtree: add to post-launch audit cadence (DEPS-06)
**Severity:** low · **Effort:** S · **Blocker:** no

`exceljs@4.4.0` (`bun.lock:1110`) pulls `archiver@5.3.2`, `unzipper@0.10.14`,
`uuid@8.3.2`, `jszip`, `saxes@5`, `tmp` — old zip/unzip lines historically
associated with advisories. **But** `exceljs` is used only server-side in the
proposal-export route and the app **writes** workbooks (does not parse
attacker-supplied xlsx via exceljs), so the `unzipper` parse-vuln class is largely
out of the threat path. Watch-item, not a blocker.

Action: no pre-beta change. Hand to **domain 9 (Ops)** to include `exceljs`/
`unzipper`/`archiver` in the post-launch `bun audit` cadence; if an advisory lands,
evaluate an `exceljs` upgrade or a lighter writer.

---

## Cross-domain dependencies / handoffs

- **Domain 1 (Auth):** sign off the `@supabase/ssr 0.10→0.12` minor (B1) before
  merge; also owns confirming the actual route-protection mechanism (no
  `middleware.ts` — verified 0 supabase imports there, so the May-2026 Next.js
  middleware-auth-bypass class does not apply; being on the 16.2.x patched line is a
  shared positive).
- **Domain 9 (Ops):** owns the post-launch `bun audit`/Dependabot cadence and the
  `exceljs` watch (C2). Not a domain-12 deliverable.
- **Domain 6 (Bundle/perf):** owns *measuring* the bundle-size win from dropping
  `three`/`d3` (A1/A2). Domain 12 only removes the deps.
- **Domain 10 (CI/gates):** owns the known-red `bun run validate` on main; domain-12
  remediation must NOT be blamed for or blocked by that pre-existing red.

## Suggested execution order

1. **Group A** (one PR: A1+A2+A3) — biggest real risk reduction (closes the phantom
   `d3-shape` hazard), one gate.
2. **B1** (dependency bumps) — independent; coordinate the `@supabase/ssr` minor with
   domain 1.
3. **B2** (types.ts banner) — trivial, anytime.
4. **C1/C2** — record-only; no code change before beta.
