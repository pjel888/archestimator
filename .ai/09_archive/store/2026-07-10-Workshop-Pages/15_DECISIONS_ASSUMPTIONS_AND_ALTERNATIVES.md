# 15 — Decisions, Assumptions, Alternatives

## DEC-01 — Keep nested `/workshop/*` URLs; do NOT flatten to `/proposals`
- **Problem:** User hypothesizes nested routing causes the skeleton flash and asks if `/proposals` (flat) would be faster.
- **Constraints:** Must improve perceived nav performance without harming SPA feel; preserve auth gate; no URL-migration burden disproportionate to the problem.
- **Options considered:**
  1. **Keep nested `/workshop/*` + fix chrome ownership (recommended).** Root cause is chrome-in-page, not nesting. Nesting *enables* layout reuse + SPA transitions + partial prefetch.
  2. **Flatten to `/proposals` (separate top-level route).** Loses shared-layout reuse; cross-root nav = full page load (`route-groups.md:30-31`). **Net worse.** Rejected.
  3. **Route group `(workshop)` → flat URLs with shared layout.** Removes `/workshop` from ALL URLs — a product/URL-migration decision, not a perf fix. **Out of proportion.** Rejected.
- **Advantages of recommended:** smallest change; proven twice already in repo (`library/layout.tsx`, `projects/[projectId]/layout.tsx`); doc-backed.
- **Disadvantages:** does not change the URL (but the URL is not the problem).
- **Security/perf/ops implications:** none negative; perf improves.
- **Recommended option:** 1.
- **Reason:** doc-cited evidence shows nesting is a benefit, and the real root cause (RC-1/RC-2) is orthogonal to URL shape.
- **Conditions that would change this:** if product wants flat URLs for marketing/SEO reasons specifically → then route groups `(workshop)` are the right tool, evaluated as a *separate* product decision.
- **Status:** **RESOLVED 2026-07-10** — Philip acked Option 1 (keep nested `/workshop/*` URLs; fix chrome ownership separately via Phase 1 `WorkshopShell`). Ack recorded in this pack's `00_COORDINATION_LEDGER.md` and `LOOP_LEDGER.md` (I-5).

## DEC-02 — Move persistent chrome into `workshop/layout.tsx` via a new `WorkshopShell`
- **Problem:** Chrome remounts per page (RC-1).
- **Options:** (a) new `WorkshopShell` in the layout (recommended); (b) keep per-page shells but memoize (does not prevent remount across route segments — rejected); (c) `template.tsx` (re-renders every nav — wrong direction — rejected).
- **Reason:** layouts persist on navigation; this is the documented, repo-proven pattern.
- **Conditions to change:** none realistic.

## DEC-03 — RC-2 "unblock the gate" is WITHDRAWN (resolves P0-2)
- **Problem:** RC-2 noted the gate's uncached reads block navigation. The original plan proposed deferring/Suspense-wrapping them (Phase 2 options A/B).
- **Resolution:** **Both original options are unsafe and withdrawn.** Verified from source (`request-proxy.ts:195,227-248`, `protected-route-gate.ts:26-39`): the layout is the **sole production auth+terms verifier**. Deferring it risks pre-rendering workshop content to unauthenticated/terms-pending users (SEC-T1/T2). RC-2's blocking behavior is **correct and intentional** — it IS the security gate.
- **Chosen action (DEC-03-final):** document the gate as intentional/synchronous-first (WP-2.1, comment-only); do NOT defer. If the reads are *measured* slow, the safe optimization is faster reads (React `cache()`, indexing), never deferring the decision.
- **Rejected alternatives:** (A) "render shell first, gate later" — rejected, exposes content; (B) "Suspense-wrap gate reads" — rejected, same exposure.
- **Status:** resolved (this cycle).

## DEC-04 — `cacheComponents` is Phase 4 (optional, owner-gated) — DEFERRED 2026-07-10
- **Reason:** larger change with build-validation requirements; not needed to fix the user's problem.
- **Status:** **DEFERRED 2026-07-10** — formally classified out-of-scope for this pack's archive criterion. The shell-stability fix (Phases 1–3) is complete and proven; `cacheComponents` remains a separate future optimization with its own build-validation gate. Not a blocker for archive.

## Assumptions
- ASSUMP-01: single-user-per-workspace (cache staleness tolerance) — consistent with `next.config.ts:99-101`.
- ASSUMP-02: observation reproducible in prod build (dev disables prefetch — `link.md:298`).
- ASSUMP-03: no concurrent edits to the touched files at execution time.

## Rejected alternatives summary
- Flatten URLs (DEC-01 opt 2) — worse UX.
- Route-group URL rename (DEC-01 opt 3) — disproportionate.
- Per-page shell memoization (DEC-02 opt b) — doesn't fix segment-level remount.
- `template.tsx` (DEC-02 opt c) — re-renders every nav.
