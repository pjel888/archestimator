# 05 — UX, UI, Accessibility Plan

## Applicability: minimal

This is a **D1 query-budget and index-coverage plan**. It changes no user-visible UI, no routes, no components, no copy, no design tokens, and no navigation. Therefore the UX/UI/a11y surface of the *planning task itself* is "not applicable," recorded here with evidence per the directive (Section 8A: "For docs-only planning work, record why dynamic adversarial QA is not applicable to the planning task itself, while still specifying the adversarial QA required for future implementation").

The implementation phases (P1–P5) are likewise backend/infrastructural:

- **P1 (indexes):** schema-only; no UI.
- **P2 (repository fixes):** the N+1 fix and LIMIT additions change *how much data* is fetched, not *what is displayed*. The user-visible result set for HP-5 (estimate list) is unchanged — the fix is purely a query-count reduction. No new empty/loading/error states are introduced.
- **P3/P4 (proof):** scripts and a Worker route under `/__cloudflare/*` (admin-gated); no user UI.
- **P5 (CI/rollout):** CI config + runbook; no UI.

## UX regressions to guard against during P2

Although no UI is intentionally changed, two P2 changes have a *possible* user-visible side effect that the implementation agent must verify does not regress UX:

| P2 task | Possible UX side effect | Guard |
|---|---|---|
| `T-P2-02` (add LIMITs to unbounded reads) | A list that previously showed all items now shows at most N. If a first user has more than N items, they see truncation with no explanation. | LIMIT values sized to 10× first-user volume (per `09`); add a defensive "showing first N" affordance **only if** a route's existing UI has no pagination. If the route already paginates, no change. |
| `T-P2-03` (app-layer cache for global category taxonomy) | Stale categories after an admin edits the taxonomy. | Cache TTL bounded; invalidation hook on category write actions. No user-visible "stale" state beyond TTL. |

Neither introduces a new loading, empty, error, permission-denied, offline, or degraded state. Both preserve the existing state matrix for their routes.

## Accessibility

No changes to:

- Keyboard navigation, focus order, focus restoration.
- Screen-reader semantics, ARIA, live regions.
- Color contrast or non-color cues.
- Reduced-motion behavior.
- Heading/title behavior.

The proof scripts and the `/__cloudflare/d1-performance-proof` route are admin/operator surfaces behind `CRON_SECRET`; they are not part of the user a11y surface and are exempt from the a11y gate (they return JSON, not HTML).

## Dynamic adversarial QA applicability (for the future implementation)

Per directive 4A (ULTRAQA-style), the *implementation* phases that touch runtime behavior (P2 repository changes) do require adversarial QA — but it is **data/QA adversarialism, not UI adversarialism**. The matrix is in `12_TEST_AND_VALIDATION_STRATEGY.md` and `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`:

- Empty workspace (HP-1, HP-2 with zero projects).
- Heavy workspace (10× volume).
- Stale cache after P2 category cache.
- Cross-workspace denial (must still hold after batching the capability check in `T-P2-01`).
- D1 unavailable (degraded path).

No browser/Playwright proof is required for this plan because no browser-only claim is made. Per AGENTS.md Codex speed guardrail, this is the correct proportional choice; browser proof would be ceremony here.

## Summary

- UX/UI/a11y impact of the plan: **none**.
- UX regressions to guard during implementation: **two** (`T-P2-02` truncation, `T-P2-03` cache staleness), both with named guards.
- Browser proof: **intentionally skipped** (no browser-only claim).
