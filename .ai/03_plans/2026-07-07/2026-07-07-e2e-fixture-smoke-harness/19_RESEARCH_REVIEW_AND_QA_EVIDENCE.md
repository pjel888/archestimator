# 19 — Research, Review, and QA Evidence

## Improvement pass (Improve-Plan-Prompt) — audit trail

This pack was improved in a second suite step (`Improve-Plan-Prompt.md`). The pass ran PHASE 1 (inventory) → PHASE 2 (baseline scorecard) → PHASE 3 (production-grade improvement) → PHASE 4 (iterative review) → FINAL VERIFICATION, all emulated by the same agent (no native independent lane). Results recorded in `17_*` §A–C.

**Improvement findings + fixes (this pass):**

| # | Finding (Improve-Prompt gap) | Fix | Doc |
|---|---|---|---|
| IF-1 | No document-level scorecard / inventory with authority levels | added baseline scorecard + source hierarchy in `17_*` §D + `16_*` source-strength rollup | `17_*`, `16_*` |
| IF-2 | Traceability lacked required columns (`Source ID\|Req\|evidence\|strength\|section\|work item\|AC\|test\|risk\|status\|gap`) | rewrote `16_*` to full schema | `16_*` |
| IF-3 | No Attack Surface Inventory (`entry\|actor\|authz\|validation\|DTO\|cache\|rate\|tests`) | added to `08_*` | `08_*` |
| IF-4 | Access-path matrix lacked required columns (`Source\|API\|role\|authz\|posture\|proof\|fallback`) + P0 rule | rewrote `07_*` | `07_*` |
| IF-5 | Credential taxonomy was partial ( Improve-Prompt §SOT demands full boundary-visibility) | expanded `08_*` to 7-material table × all boundaries | `08_*` |
| IF-6 | No route-specific App Router boundary/cache contracts | added per-route table to `06_*` (no Cache Components in scope; all force-dynamic) | `06_*` |
| IF-7 | Missing UX state matrix (caps a11y at 84) + action-level a11y proof matrix | added both to `05_*` | `05_*` |
| IF-8 | No proof-contract rows (`Proof ID\|Req\|unit\|layer\|fixture\|assert\|file\|cmd\|red/green\|cleanup`) | added P-01..P-21 to `12_*` + known-red ledger | `12_*` |
| IF-9 | `17_*` lacked final verification matrix + evidence-class table + adversarial P0/P1 log | rewrote `17_*` §A–C | `17_*` |
| IF-10 | **Planning defect:** `tsconfig.json:36` excludes `e2e` ⇒ `e2e:typecheck` as described wouldn't work | added T1.5b (`e2e/tsconfig.json`) + updated `03_*` §11a, `18_*`, `11_*` validation | `11_*`, `03_*`, `18_*` |
| IF-11 | `next.config.ts` confirms `initOpenNextCloudflareForDev` — strengthens ASSUMP-1 evidence | noted in `03_*` §11a | `03_*` |
| IF-12 | Shared-worktree honesty: original docs implied clean tree | corrected `00/17/19` | `00_*`, `17_*`, `19_*` |

**No new documents were created** in this pass (anti-slop: prefer improving existing over proliferating). All 12 findings closed within the existing 20-doc set.

---

## Research questions and sources

| Question | Source | Outcome |
|---|---|---|
| How does `next dev` get Cloudflare bindings? | repo: `src/lib/cloudflare/d1.ts:37`, `src/lib/uploads/runtime-storage-provider.ts:53`, `src/lib/auth/cloudflare-better-auth-runtime.ts:107`, `open-next.config.ts`, `wrangler.next-dev.jsonc` | `@opennextjs/cloudflare` `getCloudflareContext({async:true})` reads `wrangler.next-dev.jsonc` → local preview D1/R2/Queue/Email/Images (ASSUMP-1) |
| How does dev-auth bypass resolve identity? | repo: `src/lib/auth/dev-auth.ts`, `dev-auth-gate.ts`, `profile-d1-store.ts` | cookie/header secret + localhost + `NODE_ENV!=production`; resolves profile from D1 by email; throws if absent (ASSUMP-2; seed needed) |
| What's the profiles schema? | repo: `migrations/0003_profiles.sql` | `id, email (lowercase unique), display_name, role (ceo/admin/member), default_workspace_id, avatar_url, created_at, updated_at` |
| What Playwright features are available? | repo: `playwright.config.ts`, `@playwright/test ^1.60.0` | globalSetup/Teardown, retries, custom fixtures (`test.extend`), grepTags/projects all supported |
| What's the existing E2E/test/CI state? | repo: `e2e/*`, `vitest.config.ts`, `.github/workflows*`, `package.json` | 9 specs (3 ungated), no fixtures, no seed, CI disabled; full inventory in `03_*` |
| What are the critical flows? | repo: `src/app/**`, proxy, actions | 18 flows identified, 15 in core smoke (`04_*`) |
| Better Auth session/cookie shape | repo: `src/lib/auth/*`, `.env.example` | session cookie `better-auth.session_token`; magic-link + Google OAuth; no passwords |

**No external web research was required** — the plan is grounded entirely in repo evidence (the authoritative source per the suite contract). Official Cloudflare/Next.js/Better-Auth docs were not fetched because no version-sensitive claim needed them beyond what local `node_modules/next/dist/docs/` and repo source already establish; if implementation surfaces a version question, the executor consults local Next.js 16 docs. The improvement pass added repo facts: `tsconfig.json:36` (e2e excluded), `next.config.ts` (`initOpenNextCloudflareForDev`), and `force-dynamic` markers on `/share/**`, `/api/share/**`, export route — all read directly.

**Searched for but not found (recorded):** no existing D1 seed script, no miniflare/pool-workers config, no `e2e:install`/`e2e:ui` scripts, no committed `storageState` generator. These absences shaped D-1/D-2/D-6.

## Skills and workflows used / unavailable

- **Used:** `archestimator-plan-pack` (binds to dated `.ai/03_plans/` convention); `AGENTS.md` (shared-worktree + Cloudflare mandate + verification proportionality); `Explore` subagent (3 parallel read-only inventories); `Creating-Plan-Prompt.md` + `Multi-Agent-Execution-Directive.md` (suite contract).
- **Considered, not used (no material benefit for a planning task):** `ultrawork`/`ultragoal`/`autopilot` (execution workflows — planning-only here); `gitnexus` (narrow, well-mapped surface — `rg` + direct reads sufficient); Playwright/`impeccable` (implementation-time, not planning).
- **Unavailable:** native independent reviewer lane ⇒ `verification_mode: emulated`.

## Specialist workstream outputs

Emulated as separated passes (single agent); each output is the corresponding doc:
- Product/scope → `01/02/04`.
- Codebase/test architecture → `03/06/11`.
- React/Next/Cloudflare platform → `06/18`.
- Data/D1/R2/seed → `07`.
- Security/auth → `08`.
- Performance/flake → `09`.
- Test/QA → `12`.
- Ops/CI/rollout → `13`.
- Blast radius → `10`.
- Adversarial → below.
- Final verification → `17`.

## Critique-and-revision cycles (2)

**Cycle 1 (after first full draft):**
- Finding C1.1: smoke-flow list had magic-link as a core flow, but it's non-deterministic. → moved to DEFER-1 with substitute evidence; core smoke uses dev-auth (D-1).
- Finding C1.2: seed was initially described loosely. → tightened to script-based local-only idempotent with exact SQL blueprints (`07_*`), explicitly NOT a migration (D-6).
- Finding C1.3: CI matrix lacked secret-handling detail. → added SEC-1 + the "dev-only secrets, local bindings only" CI rule (`08_*`, `13_*`).
- Finding C1.4: no flake/quarantine policy. → added D-5 + PERF-FLAKE1 + quarantine lane.
- Finding C1.5: shadow-path matrices were missing. → added per-flow matrices (`12_*`).
- Finding C1.6: cross-workspace IDOR wasn't covered. → added FR-SHADOW (P1).

**Cycle 2 (targeted, after cycle-1 fixes):**
- Finding C2.1: the publication password lockout test could pollute global rate-limit state. → fixed: fresh publication per run (FR-SEED4, RISK-A6).
- Finding C2.2: terms-gate path was ambiguous. → split into T0.3 discovery + Option A/B (`11_*`, DEC-terms).
- Finding C2.3: upload test could write the wrong bucket. → fixed: preview bucket + sentinel prefix + scoped reset (RISK-A11).
- Finding C2.4: readiness score inflation risk. → scored honestly with named deficiencies; applied emulated cap ⇒ `CONDITIONALLY READY` (`17_*`).
- Finding C2.5: selector policy absent (flake risk). → added selector policy (`12_*`).

After cycle 2, no P0/P1 content gap remained; residual items are G1 (process cap), G2 (T0.1 confirmation), G3 (OPEN-1 deferred). Cap reached with residual findings recorded per the suite contract.

**Cycle 3 — Improve-Plan-Prompt audit pass (this improvement step):** the Improve-Plan-Prompt imposed stricter mandatory artifacts (per-doc scorecard, full-column traceability, attack-surface inventory, full access-path matrix, expanded credential taxonomy, route cache contracts, UX state+a11y matrices, proof-contract rows, final verification matrix + evidence-class table + adversarial log). 12 findings (IF-1..IF-12 above) were resolved, including a real planning defect (IF-10: tsconfig excludes e2e). All resolved; no P0/P1 remains (`17_*` §C). This is the final cycle before the emulated cap.

## UltraQA-style adversarial scenario matrix

(Condensed from `12_*`; full version there.)

| ID | Scenario | Expected | Status |
|---|---|---|---|
| AQ-1 | anonymous → `/workshop` | 302 `/login` | specified |
| AQ-2 | bogus dev-auth secret | 302 (not admitted) | specified |
| AQ-3 | 5 wrong share passwords | lockout | specified |
| AQ-4 | oversized comment | limiter/error | specified |
| AQ-5 | cross-workspace read | 403/redirect | specified |
| AQ-6 | anonymous upload | 401 | specified |
| AQ-7 | anonymous export | 401 | specified |
| AQ-8 | replay decision | idempotent/conflict | specified |
| AQ-9 | rotated/expired token | 404/not-found | specified |
| AQ-10 | dup project submit | idempotent/dup | specified |
| AQ-11 | concurrent agent edits config | coordinate via git status | specified (process) |

**Note:** these are **specified for the future executor to implement**; they were not executed in this planning session (planning-only).

## Performance evaluator contract

(From `09_*`.) Defined: baseline (first green run), target (≤4min suite / ≤15s flow), measurement (Playwright JSON reporter), dataset (tiny fixtures), flake policy (3× green local, 2-strike quarantine), evidence (`e2e-smoke-baseline.json` + manifest). Passing ordinary tests is not claimed as perf readiness; the evaluator is the reporter timings.

## Independent final verifier evidence

`verification_mode: emulated`. The "independent" pass in `17_*` was a separated audit pass by the same agent (searched for the full failure-mode list). No separate agent/reviewer output exists. Honest cap applied: overall 96, status `CONDITIONALLY READY`. To reach `IMPLEMENTATION-READY`, an independent reviewer or the owner must accept.

## Explicit validation gaps (honest)

| Gap | Why | Risk | Strongest substitute | Unblocks with |
|---|---|---|---|---|
| Playwright/browser not run | planning-only (mode) | the specs are designed, not proven | `03_*` evidence that the routes/auth/seed path exist; T0.1 probe design | executor implements + runs |
| CI hosted proof | planning-only | the CI job is designed, not run | local proxy (`act` or local run of the same script) | executor merges Phase 8 |
| Real Better Auth session smoke | OPEN-1 deferred | closed beta uses dev-auth (sufficient) | vitest auth tests + `cf:better-auth-proof` | owner decision (Phase 9) |
| Magic-link delivery | non-deterministic | low (email is BETTER_AUTH + Cloudflare Email, separately proven) | vitest + `cf:check-email` | — |
| Suite runtime ≤4min | unmeasured until built | medium | tiny fixtures + lean scope (D-3) by design | executor measures + records baseline |
| ASSUMP-1/2 (binding resolution) | T0.1 gates | low (evidence strong) | the `getCloudflareContext` import evidence | T0.1 probe |

## Generated artifacts and cleanup

- **Created:** 20 planning docs + `PROMPT.md` (pre-existing) inside `.ai/03_plans/2026-07-07-e2e-fixture-smoke-harness/`.
- **Outside the folder:** nothing attributable to this agent. No app/test/migration/config/provider/Git changes made by this agent. (Concurrent agents left unrelated changes in `src/`, `tests/`, `.ai/10_state/` — preserved untouched per AGENTS.md §6.)
- **Cleanup:** none needed (planning artifacts are durable; archive per the README archive policy after the harness ships).

## Confirmation

- No concurrent work overwritten (git status clean on entry; only this folder's new files on exit).
- No fabricated tool outputs, agent executions, test results, provider facts, or browser/production proof.
- All scores and the status reflect the emulated cap honestly.
