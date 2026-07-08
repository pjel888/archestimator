# UX, UI, and Accessibility Plan

**Scope note:** This is a **performance-gate** planning pack. It does **not** introduce, modify, or remove any user-facing UI. There are no new screens, components, loading states, error states, keyboard paths, or focus behaviors introduced by this pack. Therefore the UX/UI/a11y surface is **verification-only**: the gates must not regress existing UX, and where gates measure UX-adjacent behavior (route-transition overlay visibility, skeleton episodes), they reference the UX owned by the sibling plan.

## Primary user journey impact

- **End users (closed-beta):** No direct UX change. Indirect benefit: tightened gates reduce the chance that a regression makes routes feel slow (route-transition latency) or heavy (bundle size).
- **Developers/PR authors:** The per-PR CI gate increment must stay within the REL-01 wall-clock target so routine iteration is not slowed. Budget misses surface as CI annotations/runbook entries, not as product UI.

## UX-adjacent signals the gates measure (owned here, behavior owned by sibling plan)

| Signal | Owner of the signal (gate) | Owner of the behavior (UX) | Source |
|---|---|---|---|
| `[data-route-overlay]` visibility count/rate | PERF-03/04 (this pack) | Sibling transition/loading UX plan (`RouteLoadingOverlay`) | `e2e/route-transition-performance.spec.ts:333,378,414`; `measure-route-transitions.ts:135-140` |
| `[data-testid='estimate-sheet-route-skeleton']` episodes | PERF-04 (this pack) | Sibling plan (skeleton policy) | `measure-route-transitions.ts:111-114` |
| Parent-fallback seen count | PERF-04 (this pack) | Sibling plan (loading.tsx coverage) | `check-route-transition-readiness.ts:278,300` |
| Sheet-content-visible timing | PERF-04 (this pack) | Sibling plan (estimate sheet mount) | `check-route-transition-readiness.ts:311-316` |

**Decision:** This pack consumes these signals as **gate telemetry** with budgets defined in PERF-03/PERF-04. It does **not** redefine what the overlay/skeleton should do — that is the sibling plan's `UX-*` requirements. If a gate miss is caused by UX behavior (e.g. overlay showing too often), the runbook (OPS-01) routes the fix to the UX owner, not to this pack.

## Accessibility

- No new UI, so no new keyboard/focus/screen-reader/contrast work.
- The route-transition Playwright harness uses `getByRole`/`locator` with accessible names (e.g. `clickLibraryTab` uses `tablist { name: "Library sections" }`), so it does not introduce inaccessible test selectors. No change required.

## Loading/empty/error/disabled states

- Not applicable to this pack (no UI). The gates themselves report via CI status and JSON/Markdown artifacts; their "error state" is a budget miss handled by OPS-01.

## Responsive/reduced-motion/localization

- Not applicable (no UI).

## UX regressions to guard against

- A tightened route-transition budget must not pressure implementers to *remove* the overlay/skeleton (which would regress perceived UX) just to pass the gate. PERF-07 (flake policy) and OPS-01 (triage) exist so a miss is triaged, not papered over by degrading UX. This is an explicit constraint: **gate tightening must not incentivize UX removal.**

## Cross-reference

- UX/loading/error coverage, overlay threshold (`OPEN-UX-01`), RUM sink (`OPEN-PERF-01`), and per-route boundary/cache contracts: `.ai/03_plans/2026-07-06-Transition-And-Loading-UX-And-UI/`. This pack depends on that plan's Phase-0 baselines and Phase-1.5 revalidation-correctness fixes; it does not duplicate them.
