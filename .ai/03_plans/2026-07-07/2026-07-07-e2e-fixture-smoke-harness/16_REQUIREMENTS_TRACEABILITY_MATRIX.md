# 16 — Requirements Traceability Matrix

Schema (per Improve-Plan-Prompt §Phase 3.2): `Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision`.

**Source strength key:** `brief` = PROMPT.md; `repo evidence` = read from current files; `official docs` = local Next.js/CF docs; `derived` = inferred from architecture; `assumption` = unverified (ASSUMP-*).

**Status key:** `pending` (planned, not implemented — this is a planning pack); `pending-disc` (pending a discovery task T0.x); `satisfied-by-design` (an architectural decision, no implementation needed).

| Source ID | Requirement | Source evidence | Strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|---|
| SRC-PROMPT | FR-S1 auth-gate negative | `e2e/auth.spec.ts`; `src/proxy.ts`; `src/lib/auth/request-proxy.ts` | repo evidence + brief | 04 FR-S1; 12 matrix | T4.1 (`01-auth-gate.spec.ts`) | `GET /workshop`→302 `/login?next=`; `/login` has Google btn + email input; no console err | 01 spec (chromium, @smoke) | RISK-A1 (dev/prod proxy divergence) | pending | — |
| SRC-PROMPT | FR-S2 dev-auth bypass | `src/lib/auth/dev-auth.ts:31-52`; `dev-auth-gate.ts:12-47`; `e2e/route-transition-performance.spec.ts:148-161` | repo evidence + brief | 04 FR-S2 | T4.2 (`02-auth-bypass.spec.ts`) | 200 w/ valid cookie; 302 w/o | 02 spec | RISK-A3 (bypass misuse) | pending | needs FR-SEED1 |
| SRC-PROMPT | FR-S3 terms gate | `src/lib/legal/terms-acceptance.ts:42`; `terms-acceptance-d1-store.ts:63` | repo evidence + brief | 04 FR-S3 | T4.3 + T0.3 discovery | prompt→accept→persist; reload no re-prompt | 03 spec | RISK-A12 | pending-disc | OPEN-2 (T0.3 Option A/B) |
| SRC-PROMPT | FR-S4 dashboard | `src/app/workshop/page.tsx` | repo evidence | 04 FR-S4 | T5.1 | `[data-workshop-page-shell-root]` + create-project control | 04 spec | low | pending | — |
| SRC-PROMPT | FR-S5 project create | `src/lib/projects/actions.ts:774,833` (`createProject`/`createProjectRecord`) | repo evidence + brief | 04 FR-S5 | T5.2 | name→redirect `/workshop/projects/<uuid>`; listed | 05 spec | low | pending | needs FR-SEED2 |
| SRC-PROMPT | FR-S6 estimate edit | `src/lib/estimates/actions.ts:2311` (`createEstimate`) | repo evidence + brief | 04 FR-S6 | T5.3 | create→node route 200; row total>0; rename updates | 06 spec | low | pending | needs FR-SEED3 |
| SRC-PROMPT | FR-S7 library | `src/lib/component-library/actions.ts` (`loadCurrentWorkspaceComponentLibrary` etc.) | repo evidence + brief | 04 FR-S7 | T5.4 | list loads; create adds item | 07 spec | low | pending | needs FR-SEED3 |
| SRC-PROMPT | FR-S8 proposal export | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:18` (`force-dynamic`); `checkProposalExportRateLimit` | repo evidence + brief | 04 FR-S8 | T5.5 | 200 + xlsx content-type + len>0; 2nd call rate-limited | 08 spec | low | pending | — |
| SRC-PROMPT | FR-S9 publish shared link | `src/lib/publication/actions.ts:775` (`createProjectPublication`) | repo evidence + brief | 04 FR-S9 | T6.1 | roster row + token; `/share/<token>` reachable | 09 spec | RISK-A6 | pending | needs FR-SEED4 |
| SRC-PROMPT | FR-S10 share open | `src/app/share/[token]/page.tsx` (`force-dynamic`); `/api/share/[token]/{comment,decision}` | repo evidence + brief | 04 FR-S10 | T6.2 | review renders; comment visible; accept state | 10 spec | low | pending | needs FR-SEED4 |
| SRC-PROMPT | FR-S11 share password+lockout | `/api/share/[token]/password/route.ts:16` (`force-dynamic`); current-state 2026-07-07 lockout (5 tries/1h) | repo evidence + brief | 04 FR-S11 | T6.3 | gate; correct→render; 5 wrong→lockout | 11 spec | RISK-A6 | pending | fresh token/run |
| SRC-PROMPT | FR-S12 recipient inbox | `src/app/workshop/proposals/page.tsx`; `src/lib/repositories/recipient-proposals-repository.ts`; `openRecipientProposalAction` | repo evidence + brief | 04 FR-S12 | T6.4 | list shows shared; open→`/share/<token>` | 12 spec | low | pending | needs FR-SEED4 |
| SRC-PROMPT | FR-S13 upload | `src/app/api/component-library/attachments/direct-upload/route.ts` (`requireCurrentUserContext`); `src/lib/uploads/*`; `wrangler.next-dev.jsonc` preview bucket | repo evidence + brief | 04 FR-S13 | T7.1 | reserve 200→finalize 200→object in preview R2 | 13 spec | RISK-A11 | pending | needs tiny.png (T2.2) |
| SRC-PROMPT | FR-S14 feedback | `src/app/workshop/feedback/page.tsx`; `src/lib/workshop/beta-feedback-actions.ts` (`submitBetaFeedback`) | repo evidence + brief | 04 FR-S14 | T7.2 | submit→saved banner | 14 spec | low | pending | — |
| SRC-PROMPT | FR-S15 sign-out | `src/lib/auth/actions.ts` (`signOut`) | repo evidence + brief | 04 FR-S15 | T4.4 | `/login`; after `/workshop`→302 | 15 spec | low | pending | — |
| SRC-DERIVED | FR-FX1 fixture factory | no existing layer (`tests/vitest/fixtures/activity-events.ts` is nearest pattern) | repo evidence + derived | 06 §fixture; 11 T2.1 | T2.1, T2.2 | typed, composable, sentinel-keyed; `tsc` clean | `e2e:typecheck` | low | pending | — |
| SRC-PROMPT | FR-SEED1 smoke profile | `migrations/0003_profiles.sql` (CHECKs); `dev-auth.ts:38-42` (throws if absent) | repo evidence + brief | 07 SEED-PROFILE | T3.1, T3.2 | idempotent; resolves via dev-auth; local-only | `e2e:seed`+FR-S2 | RISK-A4 | pending-disc | T0.2 schema read |
| SRC-PROMPT | FR-SEED2 workspace+project | `migrations/0030_workspace_owner_membership_backfill.sql`; `ESTIMATES_E2E_PROJECT_ID` default `22222222-…` | repo evidence + brief | 07 SEED-WORKSPACE | T3.1, T3.2 | `/workshop/projects` lists sentinel; estimate renders | FR-S5/S6 | RISK-A4 | pending-disc | T0.2 |
| SRC-DERIVED | FR-SEED3 library item | derived from FR-S6/S7 | derived | 07 | T3.1 | visible on library page | FR-S7 | low | pending | T0.2 |
| SRC-PROMPT | FR-SEED4 publication+recipient | `src/lib/publication/actions.ts`; `.env.example:42-46` (publication secrets) | repo evidence + brief | 07 SEED-PUBLICATION | T3.1 | open renders; pw gates | FR-S9–S12 | RISK-A6 | pending | — |
| SRC-DERIVED | FR-FX2 reset | derived (isolation/idempotency) | derived | 07; 11 T3.3 | T3.3 | scoped; re-runnable; no orphans | reset→seed→run→reset | RISK-A11 | pending | — |
| SRC-DERIVED | FR-SHADOW IDOR denial | `src/lib/auth/*` workspace authz (current-state: workspace authz 4 files/30 tests) | repo evidence + derived | 12 AQ-5 | T5.1 ext | user A→user B project = 403/redirect (not 200) | 05 ext spec | med | pending | — |
| SRC-DERIVED | ARCH-1 custom fixtures | Playwright `test.extend` (`@playwright/test ^1.60.0`) | official docs + derived | 06; 11 T1.3 | T1.3 | `authedPage`/`smokeData` exposed | `e2e:typecheck` | low | pending | — |
| SRC-DERIVED | ARCH-2 globalSetup/Teardown | Playwright globalSetup capability | official docs + derived | 06; 11 T1.6 | T1.6 | reset+seed+probe once; suite starts | suite setup | RISK-A8 | pending | — |
| SRC-DESIGN | ARCH-3 webServer unchanged | decision D-2 | derived | 06 D-2 | — | `bun run dev:3020` | existing specs | low | satisfied-by-design | — |
| SRC-DERIVED | ARCH-ENV1 env contract | `playwright.config.ts:6-8,54`; `.env.example` (107 lines) | repo evidence + derived | 06 §env; 18 | T1.1 | every var present + mapped to flow | doc review | low | pending | — |
| SRC-DESIGN | ARCH-ENV2 umbrella skip | decision D-4 | derived | 04 §skip; 13 | T1.2 | skip names missing flag | spec behavior | low | pending | — |
| SRC-PROMPT | OPS-CI1 routine CI | `.github/workflows-disabled/ci.yml` (archived pattern); PROMPT "CI matrix" | repo evidence + brief | 13; 11 T8.1 | T8.1 | green PR ≤4min | hosted CI run | RISK-A8 | pending | hosted proof at impl |
| SRC-DERIVED | OPS-CI2 extended matrix | `playwright.config.ts:8` (`ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX`) | repo evidence + derived | 13; 11 T8.2 | T8.2 | matrix runs, non-blocking | CI run | low | pending | — |
| SRC-PROMPT | PERF-FLAKE1 flake budget | PROMPT "flake budget"; `playwright.config.ts:55` (trace) | brief + derived | 09; 11 T1.4/T8.3 | T1.4, T8.3 | ≤4min; retries:1; quarantine lane | timing baseline | RISK-A5/A9 | pending | measure at impl |
| SRC-PROMPT | TEST-PROOF1 proof artifacts | PROMPT "proof artifacts" | brief | 12; 11 T8.3 | T8.3 | html+trace+json manifest | artifact exists | low | pending | — |
| SRC-DERIVED | TEST-SP1 shadow paths | derived from runtime-flow risk | derived | 12 matrices | specs | happy+denied+error cell per runtime flow | specs | low | pending | — |
| SRC-DESIGN | SEC-1/2/3 harness safety | `dev-auth-gate.ts:12-32` (NODE_ENV/localhost/secret≥32) | repo evidence | 08; 06 §env | T1.1/T3.3/T6.3 | no real secrets; local-only; fresh tokens | review | RISK-A3 | pending | — |
| SRC-DERIVED | T1.5b e2e tsconfig | `tsconfig.json:36` excludes `e2e` | repo evidence | 03 §11a; 18; 11 T1.5b | T1.5b | `e2e:typecheck` exits 0; type error fails it | `e2e:typecheck` | low | pending | — |
| SRC-DERIVED | DOC-1 runbook | derived | derived | 13; 11 T8.4 | T8.4 | `e2e/README.md` exists, accurate | review | low | pending | — |

## Performance-sensitive requirements (extra mapping)

| Req | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| PERF-FLAKE1 | first green run (executor captures) | suite ≤4min, flow ≤15s median | Playwright JSON reporter timings + CI wall-clock | >6min suite / >30s flow | quarantine the flow |
| (no app-perf reqs in smoke scope — app perf owned by `route-transition-performance.spec.ts` + perf scripts + `.ai/03_plans/2026-07-07-bundle-and-route-performance-gate-hardening/`) | — | — | — | — | — |

## Source-strength rollup

- `repo evidence`: 22 requirements (authoritative — read from current files).
- `repo evidence + brief`: 12 (PROMPT named the flow; repo confirms the surface).
- `derived`: 11 (architecture/inference; labeled, not presented as source facts).
- `brief`: 3 (PROMPT-named deliverables like flake budget/proof artifacts).
- `official docs`: 2 (Playwright capabilities).
- `assumption`: 0 requirements (ASSUMP-1..5 are *plan-execution* assumptions validated in Phase 0, not requirement-source assumptions).

## Completion audit (per Improve-Plan-Prompt)

- **Every requirement has source evidence:** ✓ (Source ID column filled for all).
- **Every requirement has acceptance criteria:** ✓.
- **Every requirement has a planned proof path:** ✓ (Test/proof column).
- **Every work item traces to a source requirement or recorded decision:** ✓ (Work item column; ARCH-3 = decision D-2).
- **No requirement untraced:** ✓ (37 rows, all FR-*/ARCH-*/OPS-*/PERF-*/TEST-*/SEC-*/DOC-* covered).
- **Source strength classified:** ✓ (so inferred/derived reqs are not presented as repo facts).
