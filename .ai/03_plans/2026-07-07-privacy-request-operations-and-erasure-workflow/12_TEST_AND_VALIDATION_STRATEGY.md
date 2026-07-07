# 12 — Test And Validation Strategy

> *(Improved 2026-07-07:)* the Test Execution Matrix now uses the **exact proof-contract column shape** required by the directive (`Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule`), and a **Known-red / flaky / slow command ledger** is added.

## Test layers in repo (verified)

- `bun run test` → `bun test tests/unit` (Bun native unit tests).
- `bun run test:dom` → `vitest run --maxWorkers=1` (jsdom, `tests/vitest/**`, alias `@`→`./src`, `server-only` stubbed).
- `bun run type-check` → `tsc --noEmit`.
- `bun run lint` → `eslint`; `bun run lint:design-system` → `node scripts/enforce-app-design-system.mjs`; `validate` also runs `lint:design`.
- `bun run validate` → the broad gate (type-check && lint && lint:design-system && lint:design && test && test:dom) — **see known-red ledger**.
- `cf:typegen` → `wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts` (only if Worker Env changes — not needed here).
- `cf:d1-*` proof scripts are per-domain (e.g. `cf:d1-runtime-proof`); a privacy-request proof script would be added at execution if a provider readback is required.

## Test Execution Matrix (proof contracts)

| Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule |
|---|---|---|---|---|---|---|---|---|---|
| PC-01 | FR-1 (anon) | P0-T3 | Route Handler unit | FakeD1; valid anon body | 201 + `identityVerified=false`; row inserted with `identity_verified=0` | `tests/vitest/compliance-privacy-request-route.test.ts` (new) | `bun run test:dom -- compliance-privacy-request-route` | new green | none |
| PC-02 | FR-1, IDENT-2 (auth) | P0-T3 | Route Handler unit | FakeD1 + session mock (platform member) | 201 + `identityVerified=true`; `requester_user_id` set; no token row | same | same | new green | none |
| PC-03 | ABUSE-1 | P0-T2/T3 | unit | FakeD1; 6th call in 60s | 429 + `Retry-After`; counter pruned | `tests/vitest/compliance-privacy-request-rate-limit.test.ts` (new) | `bun run test:dom -- compliance-privacy-request-rate-limit` | new green | none |
| PC-04 | IDENT-1 | P0-T2 + P0-T5 (verify SA) | unit | FakeD1; raw token captured | verified=true; raw token NOT in any stored column; reuse → 409; expired → 410 | `tests/vitest/compliance-privacy-verification.test.ts` (new) | `bun run test:dom -- compliance-privacy-verification` | new green | none |
| PC-05 | FR-2 | P0-T2 | unit | FakeD1; one row per transition | legal transitions set lifecycle cols; illegal → 409; terminal rejects | extend `tests/vitest/compliance-privacy-request-repository.test.ts` | `bun run test:dom -- compliance-privacy-request-repository` | new green | none |
| PC-06 | FR-2 (conflict) | P0-T2 | unit | FakeD1; two concurrent transitions | second legal → 409 or no-op; no double-write | same | same | new green | none |
| PC-07 | OPS-1, SEC-1 | P1-T1 | unit | session mocks: member, viewer, unauthenticated | non-operator → 403 on every operator surface | `tests/vitest/compliance-privacy-operator-gate.test.ts` (new) | `bun run test:dom -- compliance-privacy-operator-gate` | new green (gated on OPEN-OPS-01) | none |
| PC-08 | UX-1, SEC-2 | P0-T4 | Route Handler unit | FakeD1 + lookup token | valid → 200 `{status, updatedAt}`; unknown id → **404**; bad/expired token → **404 uniform** (no enumeration); no PII returned | `tests/vitest/compliance-privacy-status-lookup.test.ts` (new) | `bun run test:dom -- compliance-privacy-status-lookup` | new green | none |
| PC-09 | FR-4 | P2-T1 | action unit | FakeD1 + R2 mock; seeded requester | evidence pointer set; R2 key `privacy-exports/<id>/<uuid>.json`; only requester data | `tests/vitest/compliance-privacy-export.test.ts` (new) | `bun run test:dom -- compliance-privacy-export` | new green (gated OPEN-OPS-01) | none |
| PC-10 | FR-4 (no leak) | P2-T1 | action unit | seeded two users in same workspace | export contains only requester rows | same | same | new green | none |
| PC-11 | FR-5 (dry-run) | P3-T2 | action unit | seeded rows; scope fixture | per-table counts returned; **no mutation**; `dryRunToken` issued | `tests/vitest/compliance-privacy-erasure.test.ts` (new) | `bun run test:dom -- compliance-privacy-erasure` | new green (gated OPEN-ERASE-01) | none |
| PC-12 | FR-5 (confirm) | P3-T2 | action unit | seeded + scope fixture + dryRunToken | retention event written; scope-assertion passes; reused/stale token → 409; `legal_hold=1` blocks | same | same | new green (gated) | none |
| PC-13 | EVID-2 | P0-T2 (invariant) | invariant | FakeD1 capture across all writes | no raw email/ip/ua/verify-token/lookup-token/dryRunToken in any stored column or log fixture | `tests/vitest/compliance-privacy-no-raw-data.test.ts` (new) | `bun run test:dom -- compliance-privacy-no-raw-data` | new green | none |
| PC-14 | EMAIL-1, EMAIL-2 | P1-T5 | unit | `sendEmail` mock; circuit-open state | email invoked on intake (email present); circuit open → intake still 201; status email on transition; opt-out respected | `tests/vitest/compliance-privacy-email.test.ts` (new) | `bun run test:dom -- compliance-privacy-email` | new green (copy gated OPEN-LEGAL-01) | none |
| PC-15 | FR-3 | P1-T2 | Route Handler unit | FakeD1 rows | ordered redacted rows; `no-store`; limit/offset honored | `tests/vitest/compliance-privacy-operator-queue.test.ts` (new) | `bun run test:dom -- compliance-privacy-operator-queue` | new green (gated OPEN-OPS-01) | none |
| PC-16 | OPS-2, EVID-1 | P1-T3 | unit | FakeD1 | event row per transition + per note | extend repository test | `bun run test:dom -- compliance-privacy-request-repository` | new green | none |
| PC-17 | SLA-2 | P4-T2 | unit | past-due row | breached flag set; notification event written | `tests/vitest/compliance-privacy-sla.test.ts` (new) | `bun run test:dom -- compliance-privacy-sla` | new green (gated OPEN-LEGAL-02) | none |
| PC-18 | A11Y-1 | P1-T4 | DOM (RTL) | rendered queue/detail | keyboard path operable; aria-live region present; accessible names; focus restoration after dialog | `tests/vitest/compliance-privacy-queue-a11y.test.tsx` (new) | `bun run test:dom -- compliance-privacy-queue-a11y` | new green | none |

## Known-red / flaky / slow command ledger

> *(Improved pass addition.)* Required by the directive. Verified against `.ai/10_state/current-state.md` (lines ~2791–2797, ~3497) and `package.json`.

| Command | Status | Date/branch | Failure excerpt / reason | Narrower proof that replaces it for this plan |
|---|---|---|---|---|
| `bun run validate` | **RED on `main`** | 2026-07-07 / `main` (current-state.md ~L2791) | "full `bun run validate` is red in the repo-wide `test:dom` phase … 131 failed tests across 36 files … auth/beta, project groups/favorites, publication, library, agent-payload/tooling, upload-proof, project-list contract" — all **pre-existing, unrelated** to compliance/privacy | Do **not** promise green `validate`. Use the focused `bun run test:dom -- compliance-privacy-*` filters above. Broad `validate` is a release-gate-only signal owned separately. |
| `bun run test:dom` (unfiltered) | **RED on `main`** | 2026-07-07 / `main` | same as above (subset of `validate`) | same — always filter to `compliance-privacy-*` |
| `bun run lint:design-system` | **has a pre-existing red** | 2026-07-07 / `main` (current-state.md ~L3497) | `cells.tsx:478 uses rounded-full` (unrelated to this plan) | focused `lint:design-system` may still surface this pre-existing finding; do not treat it as caused by this plan |
| `bun run build` (`next build`) | **caveat** | always | `next.config.ts` sets `typescript.ignoreBuildErrors: true` in the OpenNext branch — `next build` does **not** catch type errors | rely on `bun run type-check` (`tsc --noEmit`) for type gating, **not** `next build` |
| `bun run test:dom -- compliance-privacy-*` | **expected green** | this plan | n/a (new tests) | this is the declared proof for behavior claims |
| `bun run type-check` | expected green | this plan | n/a | type gate |

**Flake policy:** vitest runs with `--maxWorkers=1` (serial). If a proof flakes, drop min/max, take the median of the remaining; a >2x performance regression that persists on rerun is real (`09`).

## Adversarial scenario matrix

See `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` (`AQ-01`…`AQ-15`). The handling-case matrix for credential replay/expiry/revoke/duplicate-click/cross-recipient is in `21` §B.1.

## Validation for THIS planning (improvement) pass

- Static review of all docs (including the new 20/21).
- Cross-document ID/contradiction audit (see `17`).
- `git diff --check` at close.
- No code/test/migration changes → no `type-check`/`test`/`build` run for the planning pass itself (docs-only; `AGENTS.md` proportional verification).

## Skipped / unavailable validation

- No native independent reviewer → adversarial + final verification `emulated` (cap in `17`).
- No Cloudflare Email / R2 / remote-D1 / browser proof at planning time → execution-time evidence (called out per phase).
- No production RUM/CWV telemetry exists today (`WebVitalsProbe` is dev-only, dormant unless `NEXT_PUBLIC_PERF_TRACE=1`); CWV claims are therefore deferred to execution/production.
