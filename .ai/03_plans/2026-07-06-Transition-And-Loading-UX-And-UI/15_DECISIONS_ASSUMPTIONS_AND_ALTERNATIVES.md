# Decisions, Assumptions, and Alternatives

## Decisions (proposed, for implementation; owner-marked where required)

### DEC-01 — Rules location: `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md`
- **Problem:** Where do universal perf/loading/mount rules live?
- **Constraints:** canonical-map anti-drift; no new top-level folders; no `rules/` subdir; don't fork into tool adapters.
- **Options:** (A) `00_system/` flat file + AGENTS.md pointer; (B) new `00_system/rules/` subdir; (C) `.cursor`/`.codex` packs; (D) duplicate into each `12_agents/payloads/*`.
- **Advantages/disadvantages:** A matches the canonical-map rule and the existing `*_PROTOCOL.md` pattern; B violates anti-drift; C/D are generic/lower-authority and fragment truth.
- **Security/perf/ops:** none adverse.
- **Recommended:** A. **Reason:** aligns with canonical placement; universal scope.
- **Conditions to change:** if the brain restructures `00_system/`.
- **Status:** Proposed (Phase 4).

### DEC-02 — Reference, don't duplicate, numeric budgets
- **Problem:** where do LCP/INP/bundle numbers live?
- **Recommended:** keep `01_roadmap/27-*.md` as single source; new protocol references it.
- **Rejected:** duplicating (drift risk). **Status:** Proposed.

### DEC-03 — Skeleton-first; overlay reserved + debounced
- **Problem:** role of the global spinner overlay.
- **Recommended:** keep `RouteLoadingOverlay` as cross-shell fallback; suppress (with debounce threshold) on routes that have a `loading.tsx`.
- **Rejected:** removing the overlay entirely (cross-shell still needs feedback); showing both (double feedback).
- **Owner decision:** OPEN-UX-01 (threshold). **Status:** Proposed.

### DEC-04 — Do NOT mandate Cache Components now
- **Problem:** adopt `unstable_instant` + Cache Components for instant nav?
- **Recommended:** no, not in this pass; evaluate as owner-gated future (F-INSTANT).
- **Reason:** cross-cutting; changes every uncached boundary; needs separate plan.
- **Status:** Proposed (defers to owner OPEN-ARCH-01).

### DEC-05 — RUM sink free-tier-first
- **Recommended:** Cloudflare Workers Observability custom metric (option a) as default; GA4 events (option b) as alternative; paid APM only if owner approves.
- **Owner decision:** OPEN-PERF-01. **Status:** Proposed.

### DEC-06 — Owner-delegated planning decisions
Where the owner granted standing authority for planning (this is a planning-only pass with no code/provider/runtime mutation), the following are labeled `owner-delegated planning decision`: DEC-01, DEC-02, DEC-03 (wording, not threshold). Numeric thresholds (OPEN-UX-01/02, OPEN-PERF-02), RUM sink (OPEN-PERF-01), and Cache Components (OPEN-ARCH-01) remain **owner decisions**.

## Assumptions

- ASSUMP-01: Cloudflare Workers/OpenNext passes streaming chunks without buffering (to verify Phase 0). If false, `X-Accel-Buffering`-style mitigation needed (streaming.md).
- ASSUMP-02: existing `BfcacheHandler` + `no-store` on `/share` is sufficient; manual Chrome bfcache gate remains (per `27-*.md`).
- ASSUMP-03: react-complex-tree can hydrate client-only after `ssr:false` (P2-T1 verifies; if false, fallback to Suspense-split keeping SSR).
- ASSUMP-04: free-tier Workers Observability can absorb ~10% CWV sampling without paid plan (to confirm Phase 0).
- ASSUMP-05: Storybook addon-a11y + existing vitest DOM tests are sufficient for loading-a11y claims; browser proof only for overlay-focus (A11Y-02).
- ASSUMP-06: `validate:agents` enforces the adapter schema (per AGENTS.md); confirm before relying (Phase 4).

## Alternatives considered (summary)

- **Mandate `useSuspenseQuery` everywhere now** → rejected (introduce where it pays; codify as option).
- **Replace overlay with skeletons only** → rejected (cross-shell needs fallback).
- **Add Lighthouse CI** → deferred (no Chrome-in-CI today; owner decision; Playwright Performance-Timeline covers most).
- **Self-host fonts via next/font** → opportunity, lower priority (CSS fonts work; not blocking).
- **Add Sentry/OTel** → rejected as default (paid; free-tier RUM first).
