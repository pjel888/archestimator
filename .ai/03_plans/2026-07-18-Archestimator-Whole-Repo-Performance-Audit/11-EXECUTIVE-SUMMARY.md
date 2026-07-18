# 11 — Executive Summary

**Audit commit:** `a41a07d0143abf72289a97cd8bd023cfa9986361` (2026-07-18)
**Audit folder:** `.ai/03_plans/2026-07-18-Archestimator-Whole-Repo-Performance-Audit/`
**Mode:** read-only audit + planning (no production code changed)
**Coverage:** 12,621 tracked files classified; ~1,500 runtime-surface files audited in depth
**Reconciliation:** existing `2026-07-18-Codebase-Improve-Audit-Plan-Pack` (33 plans) re-checked at HEAD

---

## The five largest performance risks

### 1. CI is disabled while README claims it is active — PERF-CI-001 (P0)
`.github/workflows/` is **empty**. All workflows live in `.github/workflows-disabled/`. `README.md:380-385` still claims `bun run validate → bun run build → Playwright smoke` runs on every PR. Result: **no automated regression protection** of any kind — type-check, lint, build, test, bundle-budget, Playwright smoke all silent. Regressions ship without a gate. (Workflows were intentionally archived Jul 13 in commit `25c117184`; the README was not updated.)

### 2. Every authenticated request forces 3 sequential D1 reads — PERF-AUTH-001 (P1)
`src/lib/auth/better-auth-cloudflare.ts:317-319` passes `disableCookieCache: true` to `auth.api.getSession`. Better Auth's session cookie cache is bypassed; every workshop navigation hits D1 for the session, then `src/lib/auth/session.ts:65-77` issues 2 more reads (closed-beta + profile). At 3 reads × every authenticated request × every prefetched `_rsc`, this is the largest per-request D1 cost in the app.

### 3. Web-vitals telemetry is the largest client-driven D1 write amplifier — PERF-OBS-001 (P1)
`src/components/web-vitals-collector.tsx` posts LCP on every LCP entry (no dedup), posts CLS+INP from **both** `visibilitychange(hidden)` and `pagehide` (duplicate on mobile tab-switch), and the `pagehide` listener is leaked (never removed in cleanup). Minimum 5-7 D1 INSERTs per page view; doubles on mobile. Endpoint has no rate limit (compare `client-error/route.ts:9-10` which does).

### 4. Linked-Template propagation + 5-minute cron is a new scaling domain — K-10 (P2 cluster)
Migration 0092 added 5 tables and a propagation job system. The `*/5 * * * *` cron now runs 3 parallel reconciliation tasks (notifications + template intent recovery + template propagation) and **always inserts a `cron_run_events` row even on no-op** — 288 invocations/day × ~4 statements = ~1,152 D1 rows/day from empty sweeps alone. Propagation design is sound (lease-token, batched, 10-attempt ceiling) but unproven at scale (K-10 — needs hosted fanout proof at 50/500 linked instances).

### 5. Estimate editor hot paths have known memoization gaps — PERF-FE-001 (P2)
The virtualized row `style` prop at `row-table.tsx:1309-1315` is an inline object literal rebuilt every render and passed to a `memo()`'d row with default shallow compare. Every visible virtual row re-renders on every parent re-render (scroll, focus, selection, scrollMargin update). This is existing Plan 022, still unimplemented, confirmed current at HEAD.

(Honorable mentions for the top-5: GlobalPresence singleton DO never hibernates due to a `broadcastTimer` cleanup leak — PERF-CRON-002; no `bufferedAmount` backpressure in any DO — PERF-RT-001; XLSX export does a full double-buffer copy at the 3,000-row ceiling — PERF-EXP-001.)

---

## Three best-return-on-effort changes

### 1. Re-enable CI (Wave 0, XS effort, PERF-CI-001)
A `git mv` and/or a README edit. Restores every regression gate that's already written. Single highest-leverage change.

### 2. Web-vitals batching + sampling + leak fix (Wave 1, M effort, PERF-OBS-001)
Cuts the largest client-driven D1 write amplifier by ~80-90% while preserving observability. The `pagehide` leak fix alone is XS and zero-risk.

### 3. Session cookie cache re-enabled (Wave 2, M effort, PERF-AUTH-001)
Removes 1-3 D1 reads from every authenticated request. Requires audit of why `disableCookieCache: true` was originally set (likely a revocation-safety concern that needs a replacement revocation check) — hence Wave 2 not Wave 1.

---

## Is Archestimator ready for its intended beta scale?

**Yes, conditionally — provided PERF-CI-001 is resolved before launch.** The codebase is unusually well-disciplined for its size: zero `as any`/`@ts-ignore`, SQL-injection / IDOR / dev-auth-bypass all rejected after deep audit (existing pack findings re-validated), D1 batch hard-throw enforced across 10+ sites, atomicity contracts in place, link-template propagation designed with lease-tokens and bounded retries, capacity contract enforced on collaboration rooms (100 connections). The estimate-editor god component is large (3,803 lines) but its hot paths are mostly well-memoized except for the cited `style` prop gap.

**What is NOT ready:** hosted-scale proof for the new linked-Template surface (K-10), collaboration ceiling proof (K-12), authenticated-route D1 query-count proof, and any browser/RUM-based regression gate. All are gated on credentials/browser authorization — none are blockers for the audit's findings, but all should be produced before claiming "beta-ready" externally.

---

## Current confidence level and what would most affect it

**Confidence: HIGH on static findings, LOW on measured magnitudes.**

Every claim in `05-FINDINGS-REGISTER.md` is grounded in current source with `file:line` citations. The mechanisms are certain. What is *not* certain is the magnitude of each fix's improvement — those are HYPOTHESIS until Wave 0 measurement unlocks the browser/build/hosted gates.

**Evidence that would most change conclusions:**
1. **Bundle baseline** (`ANALYZE=true bun run build`) — confirms or rejects PERF-FE-002 (AppProviders split) magnitude; catches any heavy-dep-in-bundle issue the existing pack rejected.
2. **Hosted D1 runtime proof extended to authenticated surfaces** — converts PERF-AUTH-001 from "3 reads/request" STATIC to a measured cost; validates PERF-D1-001 improvement.
3. **React Profiler on rapid typing + scroll** — converts PERF-FE-001 from "all rows re-render" STATIC to a measured commit-duration delta.
4. **Hosted linked-Template fanout test at 500 instances** — validates K-10 design at scale.

---

## Existing plan-pack items: valid, stale, newly discovered

- **Still valid (verified current at HEAD)**: 27 of 33 plans. The largest are 021 (async recipient emails — PERF-PUB-001 confirms), 022 (style prop memoization — PERF-FE-001 confirms), 023 (restore batch — PERF-D1-001 confirms), 026 (god-component decomposition — confirmed 3,803 lines), 025 (`workspace-repository.ts` split — confirmed 3,713 lines), 027 (`@firecms/neat` — still imported), 005 (platform-admin email fallback — `philipjonlewis@gmail.com` still hardcoded at `roles.ts:31`), 003 (rate limiter durable — `action-rate-limit.ts` still pure in-memory).
- **Verified DONE at HEAD**: 002 (D1 batch hard-throw — enforced at 10+ sites); partial 011 (direct-upload checksum binding exists at `direct-upload/route.ts:516-531`).
- **Stale on assumptions**: 0 of 33 on core claims. All source assumptions still hold.
- **Newly discovered in this audit**: 14 fresh findings (see `05-FINDINGS-REGISTER.md`). The largest new surfaces are migration 0092 linked-Template propagation, durable rate-limit infrastructure (used by publication but NOT estimate actions), the expanded 5-minute cron, the Client Portal notification durable queue, and the `cron_run_events` always-write pattern.

---

## Next 48 hours / two weeks / before public launch

### Next 48 hours
- **Wave 0 + the four XS/S Wave 1 quick wins**: re-enable CI (QW-1), fix the web-vitals `pagehide` leak (QW-6), batch the restore-replay reads (QW-2), stabilize the virtualized row `style` prop (QW-3). All four are low-risk, high-frequency-impact, and need no hosted proof to be obviously correct. Estimated total: 1-2 eng-days.

### Next two weeks
- **Wave 0 measurement prerequisites** (bundle baseline, D1 runtime proof extension, React Profiler baselines) once the build/browser/hosted gates are authorized.
- **Wave 1 in full**: web-vitals batching (W1-7), cron no-op gate (W1-4), GlobalPresence hibernation fix (W1-5), DO backpressure (W1-6), XLSX buffer copy (W1-8), `reconcileActivityOutbox` batch (W1-9).
- **Wave 2 starts**: session cookie cache (W2-1), async recipient emails (existing Plan 021 / W2-2).

### Before public launch
- **Wave 2 completes**: AppProviders split (W2-3), RealtimeAuthBridge removal (W2-4).
- **Wave 3**: representative D1 fixtures (W3-1), linked-Template fanout hosted proof (W3-2), 100-connection collab ceiling proof (W3-3), queue concurrency explicit (W3-6).
- **Wave 4**: bundle-size and D1 query-count CI gates (W4-1, W4-2), provider-era script + budget-doc cleanup (W4-3, W4-4), tighten `head_sampling_rate` from 1 → 0.1 (W4-5).

---

## What should explicitly NOT be optimized yet

- **God component decomposition (Plan 026)** — L effort, MED-HIGH risk; defer until Wave 1-2 confirms the estimate-editor hot-path concerns can't be resolved by smaller fixes. Needs a characterization test prerequisite.
- **`workspace-repository.ts` split (Plan 025)** — L effort, no measured perf issue; pure maintainability. Pair with Plan 026.
- **Action error consolidation (Plan 024)** — L effort, no measured perf issue.
- **`@firecms/neat` patch removal (Plan 027)** — verify bundle impact first (W0-4); no measured cost today.
- **Realtime row-update broadcast wiring (PERF-FE-003)** — product-not-required-yet; either delete the dead hook (XS) or defer the feature (L).
- **Existing Tier 5 spikes (Plans 028-033)** — direction spikes, not perf; defer until product prompts.
- **D1 index proposals** — none recommended without `EXPLAIN QUERY PLAN` evidence (W0-6). Existing audit rejected "missing indexes" claims; do not add speculative indexes.
- **Tightening `head_sampling_rate` below 0.1 at public launch** — defer until real traffic-volume data exists.

---

## One-page scorecard

| Surface | State | Confidence | Top finding |
|---|---|---|---|
| Public performance | Static-only; browser-gated | LOW (no RUM) | PERF-FE-002 (AppProviders global), PERF-OBS-001 (web-vitals) |
| Authenticated navigation | Static; hosted-gated | LOW | PERF-AUTH-001 (3 D1 reads/request) |
| Estimate editor responsiveness | Static; React-Profiler-gated | MEDIUM | PERF-FE-001 (style prop memo gap); existing Plan 022 |
| Large-data behavior | Untested at scale | LOW | K-10 (linked-Template fanout); K-09 (synthetic D1 proof only) |
| D1 efficiency | Static query shapes; EXPLAIN-gated | MEDIUM | PERF-D1-001 (restore N+1), PERF-D1-002 (outbox N+1), PERF-CRON-001 (cron write amp) |
| Worker / runtime efficiency | Static | MEDIUM | K-11 (URL parses); static cache bounded; observability at full sampling |
| Realtime scalability | Static; hosted-load-gated | LOW | K-12 (100-conn theoretical only); PERF-RT-001 (no backpressure); PERF-CRON-002 (hibernation leak) |
| Background-job health | Static | MEDIUM | PERF-CRON-001 (5-min cron write amp); K-10 (propagation); queue idempotency mixed (Client Portal good, upload-jobs per-batch only) |
| Export performance | Static | MEDIUM | PERF-EXP-001 (2× memory + uncompressed ZIP) |
| Observability cost | Static | HIGH | PERF-OBS-001 (web-vitals amp); PERF-CRON-001 (cron ledger); DRIFT-12 (lint fails) |
| Regression protection | **NONE active** | HIGH | PERF-CI-001 (CI archived; README stale) — release blocker |

---

## Bottom line

Archestimator is a well-engineered codebase with one release blocker (no CI), two high-frequency cost centers (auth cache disabled; web-vitals write amplification), and a known set of UI hot-path gaps already enumerated in the existing plan pack. This audit's contribution is: (a) reconciling the existing 33 plans against 16 commits of drift, (b) enumerating 14 fresh findings introduced by recent work (linked Templates, durable rate limits, expanded cron, Client Portal queue, observability ledger), (c) converting the existing budget doc's vague aspirations into concrete Wave 0-4 work with exact commands and gates, and (d) drawing a clear line between what is STATIC-CONFIRMED (mechanism) and what is BLOCKED (magnitude, awaiting user-authorized measurement).

No production code was changed. Implementation is the user's call, on the user's gates.
