# Proof Contracts and Known-Red Validation Ledger

**Authority:** Required by the Improve directive (proof-contract rows: `Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule`; plus known-red broad-validation ledger). This plan is planning-only; the proofs below define the **future implementation** verification.

## 1. Proof-contract rows (future implementation phases)

| Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green | Cleanup/skip rule |
|---|---|---|---|---|---|---|---|---|---|
| PC-01 | UX-01 | P1-T1 invite loading | e2e | seeded invite token | skeleton visible before resolved content | `e2e/invite-loading.spec.ts` (new) | `bun run test:e2e e2e/invite-loading.spec.ts` | Red today (blank); green after P1-T1 | skip if `PROJECT_INVITE_ENTRY_ENABLED≠1` |
| PC-02 | UX-01 | P1-T2/T3 publisher+estimates loading | e2e | seeded project | `loading.tsx` renders skeleton | extend `workshop-route-error-boundaries.spec.ts` | `bun run test:e2e` | green after add | — |
| PC-03 | UX-02 | P1-T4 workshop error boundaries | e2e | force-error fixture per subtree | in-place `WorkshopRouteErrorState`, not full-page | `e2e/workshop-route-error-boundaries.spec.ts` | `bun run test:e2e` | green after add | — |
| PC-04 | UX-04 | P1-T5 activity skeleton → `Skeleton` | static | grep | no hand-rolled `animate-pulse` divs in activity loading | `src/app/workshop/projects/[projectId]/activity/loading.tsx` | `rg "animate-pulse" src/app/workshop/projects/\[projectId\]/activity/loading.tsx` | red today; green after | — |
| PC-05 | UX-05 | P1-T6 viewport | static | grep | `export const viewport` in root layout | `src/app/layout.tsx` | `rg "export const viewport" src/app/layout.tsx` | red today; green after | — |
| PC-06 | A11Y-01/03 | P1-T7 loading a11y | DOM | render loading UIs | role=status + aria-live + motion-reduce | `tests/vitest/loading-a11y.test.tsx` (new) | `bun run test:dom tests/vitest/loading-a11y.test.tsx` | red on gaps; green after | — |
| PC-07 | A11Y-02 | overlay focus | e2e | keyboard nav during transition | focus lands correctly after transition | `e2e/overlay-focus.spec.ts` (new) | `bun run test:e2e e2e/overlay-focus.spec.ts` | green after | browser-only (skip if no chromium) |
| PC-08 | ARCH-02 | estimate non-blocking | e2e+perf | seeded estimate | skeleton paints before full sheet hydrate; CRUD latency unchanged | `e2e/estimates-shell-streaming.spec.ts`, `e2e/estimates-crud-latency.spec.ts` | `bun run test:e2e:perf` | red today (full sheet paints together) | skip P2-T2 if P2-T1 discovery fails |
| PC-09 | ARCH-03 | share fetch-in-effect removal | static+e2e | grep + receiver spec | no `fetch(` in `useEffect` in target files; FMP improved | `src/components/share/{SharePageComments,SharedLinkActivityFeed}.tsx`; `e2e/shared-link-receiver.spec.ts` | `rg "useEffect" src/components/share/SharePageComments.tsx` then spec | red today; green after | — |
| PC-10 | UX-03 | overlay suppression | e2e | nav to skeleton route | overlay suppressed (or debounced) on skeleton routes | extend `route-transition-performance.spec.ts` | `bun run test:e2e:perf` | green after | owner threshold (OPEN-UX-01) |
| PC-11 | **ARCH-07a** | **stale path fix** | static+e2e | grep + e2e | no `revalidatePath("/workshop/components")`; correct `/workshop/library/components` | `src/lib/component-library/actions.ts:309`, `src/lib/ai/package-builder/apply.ts:1896` | `rg 'revalidatePath\("/workshop/components"\)' src/lib` | **red today (no-op bug)**; green after | — |
| PC-12 | **ARCH-07b** | **proposals revalidation** | static+e2e | grep | `revalidatePath("/workshop/proposals")` exists after relevant mutations | `src/lib/**/actions.ts` | `rg 'revalidatePath\("/workshop/proposals"\)' src/lib` | **red today**; green after | — |
| PC-13 | **ARCH-07c** | **publisher revalidation** | static+e2e | grep | `revalidatePath("/workshop/publisher")` exists after mutations | `src/lib/**/actions.ts` | `rg 'revalidatePath\("/workshop/publisher"\)' src/lib` | **red today**; green after | — |
| PC-14 | ARCH-01 | P4 rule | static | n/a | `validate:agents` exit 0; protocol file present | `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md`, `AGENTS.md` | `bun run validate:agents` | green after P4 | — |
| PC-15 | PERF-01 | baselines | evidence | per EV-* | baseline JSON/MD in `metrics/` with date+commit | `metrics/` | `bun run perf:measure-routes` etc. | n/a (capture) | — |
| PC-16 | PERF-02 | RUM beacon (Web Analytics OR custom) | unit+security | beacon fixture | 204 on valid; 413/400/429 on bad; no PII; no token | `tests/vitest/web-vitals-beacon.test.ts` (new) | `bun run test:dom tests/vitest/web-vitals-beacon.test.ts` | n/a (new) | skip if owner defers PERF-02 |
| PC-17 | REL-02 | perpetual-skeleton escape | e2e | network cut mid-stream | error boundary after timeout | `e2e/loading-timeout.spec.ts` (new) | `bun run test:e2e` | green after | — |
| PC-18 | ARCH-06 | dashboard double-fetch | perf | mutation timing | one fetch path after mutation (no double) | extend `route-transition-performance.spec.ts` | `bun run test:e2e:perf` | green after | — |

## 2. Known-red validation ledger

Required by the directive: "If broad validation is known red, flaky, slow, or hanging, record the known-red command, date/source, failure class, and narrower proof that replaces it."

| Command | Date / source | Failure class | Narrower proof that replaces it for this plan's claims | Status |
|---|---|---|---|---|
| `bun run type-check` (default heap) | `.ai/10_state/current-state.md:186-187` (2026-07 entries); reproduces | **Node heap exhaustion** — aborts before diagnostics | Use `NODE_OPTIONS=--max-old-space-size=8192 bun run type-check` for type claims; this plan makes no code change so default type-check is out of scope anyway | Known-red; documented |
| `bun run validate` (broad chain) | chains the above type-check | inherits heap abort | Focused `vitest run --maxWorkers=1 <file>` + targeted `bun run test tests/unit/<file>` for specific claims | Avoid for planning pass |
| `bun run test:e2e:perf` (authenticated scenarios) | CI workflow (`ci.yml`); `27-*.md` | **Skipped in CI** without `PLAYWRIGHT_STORAGE_STATE`/dev-auth-bypass | Local run with storage state OR unauthenticated subset; PERF-04 fixes CI coverage | Known gap |
| bfcache `pageshow.persisted` in Playwright/Chrome automation | `27-*.md` stale-times note | `false` even on trivial control | Manual Chrome DevTools gate (documented) | Known gap |
| Production RUM/CWV | none today (`WebVitalsProbe` dev-only) | No signal | Playwright Performance-Timeline in-test capture; PERF-02 adds RUM | Known gap (PERF-02) |

**This planning pass validates via:** `git diff --check` (clean), static doc review, grep/read evidence, local-docs research. No broad command is claimed green.

## 3. Evidence-class honesty table

Required by the directive's final-verification matrix (distinguish local / browser / provider / production / manual / inferred).

| Evidence class | Examples used in this plan | Cannot prove |
|---|---|---|
| Local static | file inspection, `git diff --check`, `rg`, source/cred taxonomy | runtime, browser, provider, hosted behavior |
| Local automated | (none run — planning-only; future phases use type-check/vitest/playwright) | provider/production state |
| Browser/manual | (none run; future PC-07/08/10/17 are browser-only) | provider/production |
| Provider-backed | none run; PERF-02 impl needs Workers Observability/Web Analytics readback; CF cost numbers from official docs (cited) | user UX without paired UI proof |
| Hosted/production | none run | local code-path detail without source |
| Inferred | none for completion claims; ASSUMP-* labeled | stronger claims |
| **Official docs (framework/provider)** | local `node_modules/next/dist/docs/` (Next 16.2.6); Cloudflare docs (cited URLs, retrieved 2026-07-06) | repo-runtime behavior without source confirmation |

**Residual risk:** all behavior claims are deferred to implementation phases with the named proofs above. This pass proves only the *planning* is complete and grounded.
