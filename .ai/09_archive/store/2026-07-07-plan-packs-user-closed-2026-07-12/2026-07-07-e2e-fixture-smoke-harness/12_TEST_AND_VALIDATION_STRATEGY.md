# 12 — Test and Validation Strategy

## Testing tiers chosen (lightest proof that proves the claim)

| Claim | Proof | Where |
|---|---|---|
| Smoke route/interaction/data behavior | Playwright `@smoke` (browser) | `e2e/smoke/*.spec.ts` |
| Auth-gate denial / IDOR denial | Playwright (status + redirect assertions) | smoke specs |
| Seed idempotency / correctness | `bun run e2e:reset && e2e:seed` twice + readback | manual/CI |
| Harness types | `tsc --noEmit` over `e2e/` | type-check |
| No regression to existing e2e | `bun run test:e2e` (existing specs behave as before) | local/CI |
| Suite perf/flake | reporter JSON timings + baseline | `e2e-smoke-baseline.json` |

**NOT chosen (with reason):** Playwright visual/perf regression for smoke (owned by existing specs); magic-link email delivery (non-deterministic — substituted by vitest + `cf:*` proof); Google OAuth happy path (needs real account — OPEN-1 deferred).

## Test Execution Matrix

| Req | Test file path | Type | Existing/new | Fixture/data setup | Command | Expected evidence | Known reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-S1 | `e2e/smoke/01-auth-gate.spec.ts` | E2E browser | new | none (public) | `test:e2e:smoke --grep auth-gate` | 302 + login UI | — | executor |
| FR-S2 | `e2e/smoke/02-auth-bypass.spec.ts` | E2E | new | smoke profile (SEED1) | `… --grep auth-bypass` | 200 w/ cookie, 302 w/o | — | |
| FR-S3 | `e2e/smoke/03-terms.spec.ts` | E2E | new | profile ± terms-accepted | `… --grep terms` | prompt + accept + persist | — | |
| FR-S4 | `e2e/smoke/04-dashboard.spec.ts` | E2E | new | authed + workspace | `… --grep dashboard` | shell root + create-project control | — | |
| FR-S5 | `e2e/smoke/05-project-create.spec.ts` | E2E | new | authed | `… --grep project-create` | redirect + render + listed | — | |
| FR-S6 | `e2e/smoke/06-estimate-edit.spec.ts` | E2E | new | project + library item | `… --grep estimate-edit` | row + total>0 + rename | — | |
| FR-S7 | `e2e/smoke/07-library.spec.ts` | E2E | new | library seed | `… --grep library` | list + create | — | |
| FR-S8 | `e2e/smoke/08-export.spec.ts` | E2E (route) | new | project+estimate+priced row | `… --grep export` | 200 xlsx + rate-limit | — | |
| FR-S9 | `e2e/smoke/09-publish.spec.ts` | E2E | new | project+estimate+pub secrets | `… --grep publish` | roster + token reachable | — | |
| FR-S10 | `e2e/smoke/10-share-open.spec.ts` | E2E | new | open publication + recipient | `… --grep share-open` | review + comment + accept | — | |
| FR-S11 | `e2e/smoke/11-share-password.spec.ts` | E2E | new | fresh pw publication/run | `… --grep share-password` | gate + unlock + lockout×5 | — | |
| FR-S12 | `e2e/smoke/12-recipient-inbox.spec.ts` | E2E | new | shared proposal + recipient | `… --grep inbox` | list + open → /share | — | |
| FR-S13 | `e2e/smoke/13-upload.spec.ts` | E2E (route) | new | tiny.png + R2 preview | `… --grep upload` | reserve→finalize→object | — | |
| FR-S14 | `e2e/smoke/14-feedback.spec.ts` | E2E | new | authed | `… --grep feedback` | saved banner | — | |
| FR-S15 | `e2e/smoke/15-signout.spec.ts` | E2E | new | authed | `… --grep signout` | /login + 302 after | — | |
| FR-SEED1..4 | `scripts/e2e/seed-local.ts` + reset | script | new | — | `e2e:reset && e2e:seed` | deterministic, profile resolves | — | |
| ARCH/SEC | type-check + existing e2e regression | static+e2e | — | — | `tsc --noEmit`; `test:e2e` | no type errors; existing behave | — | |

**Known pre-existing reds:** none in scope (the harness is greenfield; existing specs are untouched and their current pass/skip behavior is the regression baseline).

## Selector policy (anti-flake)

- Prefer `getByRole`, `getByLabel`, `getByText` (stable) over CSS classes/generated text.
- Where the app lacks a stable hook, add `data-smoke="<flow>"` (gated per-task in `11_*`), not fragile class chains.
- Never assert on auto-generated copy that legitimately changes; assert on semantic intent (role + stable label).

## Shadow-path matrices (TEST-SP1)

Minimum per runtime flow: assert **happy + auth-denied + one error cell**. Full matrices below; N/A cells marked with reason.

### FR-S5 project create
| Flow | Happy | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| createProject | name→redirect | N/A (form requires name) | empty name→validation error | too-long name→validation error | no cookie→302 | N/A (local) | N/A (single user) | dup submit→ same project or idempotent per action | redirect / error banner | 05 spec |

### FR-S6 estimate edit
| Flow | Happy | Nil | Empty | Invalid | Auth denied | Upstream | Race | Retry | Result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| createEstimate | create→node route | N/A | empty name→error | bad projectId→404/403 | no cookie→302 | N/A | N/A | dup→ dup sheet or rejected | row renders | 06 spec |
| insertRow | lib item→row total>0 | missing lib id→error | empty→error | invalid id→error | no cookie→302 | N/A | N/A | N/A | row+total | 06 spec |

### FR-S8 export
| Flow | Happy | Nil | Empty | Invalid | Auth denied | Upstream | Race | Retry | Result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| export.xlsx | 200+xlsx | missing params→400/empty | estimate w/ no rows→empty xlsx or 400 | bad estimateId→404/403 | 401 no auth | N/A | N/A | 2nd call→rate-limit | download / 429 | 08 spec |

### FR-S9 publish
| Flow | Happy | Nil | Empty | Invalid | Auth denied | Upstream | Race | Retry | Result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| createProjectPublication | link created | no estimates selected→validation | empty selection→error | bad projectId→403 | non-manager→403 | N/A | N/A | dup→ idempotent per proc | roster+token | 09 spec |

### FR-S10 share open
| Flow | Happy | Nil | Empty | Invalid | Auth denied | Upstream | Race | Retry | Result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| view open | review renders | N/A | estimate empty→empty tab | bad/expired token→404/not-found | N/A (public open) | N/A | N/A | N/A | tabs visible | 10 spec |
| comment | posted→visible | empty comment→error/disable | empty→error | oversized→limiter | no recipient session→403 | N/A | N/A | dup→ dup or idempotent | comment shown | 10 spec |
| decision accept | accepted state | N/A | N/A | already decided→conflict/idempotent | no session→403 | N/A | N/A | dup→ idempotent | Accepted | 10 spec |

### FR-S11 share password
| Flow | Happy | Nil | Empty | Invalid | Auth denied | Upstream | Race | Retry | Result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| unlock | correct→snapshot | N/A | empty→error | wrong→error; 5×→lockout | N/A (public gate) | N/A | N/A | N/A | render / lockout | 11 spec |

### FR-S13 upload
| Flow | Happy | Nil | Empty | Invalid | Auth denied | Upstream | Race | Retry | Result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| reserve→finalize | 200→object | missing fields→400 | empty body→400 | non-image/oversized→400/limiter | 401 no auth | R2 down→error | concurrent→admission control | dup finalize→ idempotent | asset id | 13 spec |

### FR-SHADOW (cross-workspace IDOR denial, P1)
| Flow | Happy | Auth denied (cross-workspace) | Test |
|---|---|---|---|
| user A reads user B project | user A reads own→200 | user A GET `/workshop/projects/<B-id>` → 403/redirect (not 200) | add to 05 or a dedicated spec |

## Adversarial scenario matrix (UltraQA-style)

| ID | User/attacker model | Scenario | Setup | Harness/command | Expected signal | Status |
|---|---|---|---|---|---|---|
| AQ-1 | anonymous | reach `/workshop` | none | 01 spec | 302 `/login` | specified |
| AQ-2 | cookie-forged | bogus dev-auth secret | wrong cookie | 02 spec | 302 (not admitted) | specified |
| AQ-3 | recipient | 5 wrong passwords | fresh pw pub | 11 spec | lockout | specified |
| AQ-4 | recipient | oversized comment | seeded pub | 10 spec (extend) | limiter/error | specified |
| AQ-5 | cross-workspace | user A → B's project | two workspaces | FR-SHADOW | 403/redirect | specified |
| AQ-6 | anonymous | upload reserve | none | 13 spec | 401 | specified |
| AQ-7 | anonymous | export.xlsx | none | 08 spec | 401 | specified |
| AQ-8 | recipient | replay decision | decided pub | 10 spec extend | idempotent/conflict | specified |
| AQ-9 | attacker | expired/rotated token | rotated pub | 10/11 extend | 404/not-found | specified |
| AQ-10 | concurrent | dup project submit | rapid double | 05 spec extend | idempotent/dup | specified |
| AQ-11 | dirty-worktree | concurrent agent edits config | git status check | manual/CI | coordinate | specified (process) |

Full browser-pen/load matrix (k6, etc.) is explicitly deferred to a dedicated CI job/staging (mirrors the existing `shared-link-receiver.spec.ts` header note) — not closed-beta smoke.

## Performance evaluator contract

(From `09_*`.) Baseline = first green run; target ≤ 4 min suite / ≤ 15 s/flow; measurement = Playwright JSON reporter; dataset = tiny fixtures; flake policy = 3 consecutive green local runs, 2-strike quarantine; evidence = `e2e-smoke-baseline.json` + manifest.

## Substitute evidence (what smoke does NOT prove, and what does)

| Claim smoke doesn't prove | Substitute |
|---|---|
| Magic-link email actually delivers | vitest + `cf:check-email` / `cf:better-auth-proof` |
| Google OAuth end-to-end | OPEN-1 deferred; vitest for OAuth state/csrf |
| Real R2 in production | `cf:verify-hosted-upload-runtime` |
| Real D1 authz in production | `cf:d1-authz-matrix`, vitest authz tests |
| CSP headers | vitest + global-CSP plan |
| Visual regression | existing `frontdoor-landing-visual`/`landing-audit` |
| Route perf | `route-transition-performance.spec.ts` + perf scripts |

## Validation commands (executor; verified against `package.json`)

- `bun run e2e:typecheck` (uses `e2e/tsconfig.json`; root excludes e2e — T1.5b)
- `bun run e2e:reset && bun run e2e:seed`
- `bun run test:e2e:smoke:local`
- `bun run test:e2e` (regression of existing specs)
- CI: `.github/workflows/e2e-smoke.yml`

A requirement is not ready if its validation is only "manual QA" without exact steps/actor/setup/expected/pass-fail. Every smoke flow above has objective assertions; no "works correctly" criteria.

## Proof-contract rows (Improve-Plan-Prompt §11 — mandatory)

`Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule`

| Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green | Cleanup/skip |
|---|---|---|---|---|---|---|---|---|---|
| P-01 | FR-S1 | `01-auth-gate` | E2E browser | none (anonymous) | `GET /workshop`→302 `/login?next=`; `/login` has Google btn + `input[type=email]`; 0 console err | `e2e/smoke/01-auth-gate.spec.ts` | `bun run test:e2e:smoke --grep auth-gate` | green=302+UI; red=200 or missing field | no cleanup (stateless) |
| P-02 | FR-S2, SEC-1 | `02-auth-bypass` | E2E browser | smoke profile (SEED1) + dev-auth cookie | 200 w/ valid cookie (`[data-workshop-page-shell-root]` visible); 302 w/o cookie | `e2e/smoke/02-auth-bypass.spec.ts` | `… --grep auth-bypass` | green=admit+deny; red=admits w/o cookie (hole) or denies w/ cookie | seed-scoped reset |
| P-03 | FR-S3 | `03-terms` | E2E browser | profile ± terms-accepted (per T0.3) | prompt→accept→`/workshop` renders; reload no re-prompt | `e2e/smoke/03-terms.spec.ts` | `… --grep terms` | green=both paths; red=prompt persists or never shows | reset terms row |
| P-04 | FR-S4 | `04-dashboard` | E2E browser | authed + workspace (SEED2) | shell root + create-project control visible; 0 console err | `e2e/smoke/04-dashboard.spec.ts` | `… --grep dashboard` | green=present; red=missing control | — |
| P-05 | FR-S5 | `05-project-create` | E2E browser | authed | name→redirect `/workshop/projects/<uuid>`; listed on `/workshop/projects` | `e2e/smoke/05-project-create.spec.ts` | `… --grep project-create` | green=redirect+listed; red=no redirect or not listed | delete created project (or reset) |
| P-06 | FR-S6 | `06-estimate-edit` | E2E browser | project + library item (SEED3) | create→node route 200; row total>0; rename updates label | `e2e/smoke/06-estimate-edit.spec.ts` | `… --grep estimate-edit` | green=row+total+rename; red=total 0 or rename lost | reset |
| P-07 | FR-S7 | `07-library` | E2E browser | library seed (SEED3) | `/workshop/library/components` loads; seeded item visible; create adds item | `e2e/smoke/07-library.spec.ts` | `… --grep library` | green=list+create; red=item absent | reset |
| P-08 | FR-S8, SEC-3 | `08-export` | E2E route | project+estimate+priced row (SEED2) | 200 + xlsx content-type + len>0; 2nd call rate-limited | `e2e/smoke/08-export.spec.ts` | `… --grep export` | green=200+xlsx+limiter; red=401 or no limiter | — |
| P-09 | FR-S9 | `09-publish` | E2E browser | project+estimate+pub secrets (SEED4) | roster row + token; `/share/<token>` reachable | `e2e/smoke/09-publish.spec.ts` | `… --grep publish` | green=roster+token; red=403 or token unreachable | reset (fresh token) |
| P-10 | FR-S10 | `10-share-open` | E2E browser | open publication + recipient (SEED4) | review renders; comment visible; accept state | `e2e/smoke/10-share-open.spec.ts` | `… --grep share-open` | green=render+comment+accept; red=404 or comment lost | reset |
| P-11 | FR-S11, SEC-3 | `11-share-password` | E2E browser | **fresh** pw publication per run | gate visible; correct→render; 5 wrong→lockout+disabled input | `e2e/smoke/11-share-password.spec.ts` | `… --grep share-password` | green=gate+unlock+lockout; red=admits wrong pw or no lockout | fresh token (no global limiter reset) |
| P-12 | FR-S12 | `12-recipient-inbox` | E2E browser | shared proposal + recipient (SEED4) | `/workshop/proposals` lists it; open→`/share/<token>` | `e2e/smoke/12-recipient-inbox.spec.ts` | `… --grep inbox` | green=list+open; red=empty list or no nav | reset |
| P-13 | FR-S13 | `13-upload` | E2E route | `tiny.png` (<1KB) + R2 preview | reserve 200→finalize 200→object under `e2e-smoke/` prefix in preview R2 | `e2e/smoke/13-upload.spec.ts` | `… --grep upload` | green=round-trip+object; red=401 or no object | delete `e2e-smoke/` prefix |
| P-14 | FR-S14 | `14-feedback` | E2E browser | authed | submit→saved banner | `e2e/smoke/14-feedback.spec.ts` | `… --grep feedback` | green=banner; red=no banner | reset (or ignore synthetic row) |
| P-15 | FR-S15 | `15-signout` | E2E browser | authed | `/login`; `GET /workshop` after→302 | `e2e/smoke/15-signout.spec.ts` | `… --grep signout` | green=/login+302; red=still authed | — |
| P-16 | FR-FX1 | fixture factory | static type | n/a | `tsc` clean; builders typed+composable | `e2e/fixtures/*` | `bun run e2e:typecheck` | green=0 errors; red=type error | — |
| P-17 | FR-SEED1..4, FR-FX2 | seed/reset | script | sentinel fixtures | idempotent; profile resolves; reset leaves no orphans; local-only | `scripts/e2e/{seed,reset}-local.ts` | `bun run e2e:reset && bun run e2e:seed` (×2) | green=deterministic; red=orphans or throw | self-cleaning |
| P-18 | FR-SHADOW | IDOR denial (P1) | E2E browser | two workspaces (A owner, B project) | user A `GET /workshop/projects/<B-id>`→403/redirect (not 200) | `e2e/smoke/05-project-create.spec.ts` (ext) or dedicated | `… --grep idor` | green=403/redirect; red=200 (IDOR) | reset |
| P-19 | PERF-FLAKE1 | suite perf | perf | tiny fixtures | suite ≤4min; flow ≤15s median; retries:1; quarantine lane exists | reporter JSON + `e2e-smoke-baseline.json` | `bun run test:e2e:smoke:local` (×3) | green=within budget; red=>6min or flake | — |
| P-20 | OPS-CI1 | CI gate | hosted CI | smoke env from secrets | green PR; ≤4min; fails PR on real failure | `.github/workflows/e2e-smoke.yml` | CI run | green=mergeable; red=blocks | — |
| P-21 | regression | existing specs unchanged | E2E | n/a | existing 9 specs pass/skip exactly as before the config edit | `e2e/*.spec.ts` | `bun run test:e2e` | green=unchanged; red=behavior changed | revert config hunk |

**Red/green discipline:** each proof has a falsifiable red condition (what would prove the claim false), not just a green check. P-02 red = "admits without cookie" (proves SEC-1). P-11 red = "no lockout" (proves FR-S11). P-18 red = "200 on cross-workspace" (proves IDOR denial).

## Known-red broad-validation ledger (Improve-Plan-Prompt §11)

- **`bun run validate`** (type-check + lint + design-lints + unit + dom): **not run by this plan** — it's the app's broad gate, unrelated to a planning-only task. At implementation time the executor runs **targeted** proofs (`e2e:typecheck`, `test:e2e:smoke:local`, `test:e2e` regression), not `validate`, because `validate` covers app code the harness doesn't touch and would be slow/noisy for harness changes. If a harness change ever touches shared logic, escalate to `validate`.
- **`bun run test:dom`** (vitest, ~633 files, `fileParallelism:false`): not run for harness changes (disjoint from vitest). Existing reds (if any) are pre-existing and unrelated.
- **No known-red harness command** is hidden: `test:e2e:smoke:local` is the gate; if it's red, the PR is blocked (by design).
