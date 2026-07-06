# UX, UI, and Accessibility Plan

Scope: the loading/transition UX/UI surface app-wide. Visual design itself is out of scope (`DESIGN.md` is alpha, not law); this plan addresses *behavior, states, and accessibility*, not token/color choices.

---

## 1. State inventory (what must exist per surface)

Every user-facing surface should deliberately own these states. Today many exist; this plan makes coverage deliberate, not accidental.

| State | Definition | Primitive | Current coverage |
|---|---|---|---|
| **Loading (route)** | First-paint fallback during navigation/initial load | `loading.tsx` skeleton | 14 routes; gaps on `/invite/[token]`, `/workshop/publisher`, estimates list |
| **Loading (section)** | Granular streaming fallback inside a page | `<Suspense>` + section skeleton | Strong in projects layout/publisher; missing in some |
| **Loading (inline action)** | Button/row pending | `useTransition` pending + `Spinner size="xs"` or `Skeleton` | Good in projects/estimate cells |
| **Loading (global transition)** | Cross-shell fallback when no skeleton | `RouteLoadingOverlay` (spinner) | Exists; needs threshold tuning |
| **Empty** | Zero data after successful load | Empty-state component | Varies per route |
| **Error (route)** | Uncaught error in subtree | `error.tsx` → `WorkshopRouteErrorState` | 8 routes; workshop subtree uneven |
| **Error (global)** | Error above root layout | `global-error.tsx` | Exists |
| **Not found** | `notFound()` | `not-found.tsx` | Root + share; dynamic segments rely on root |
| **Auth denied** | No session/role | redirect to `/login` or `/access-required` | Server gate in `workshop/layout.tsx` |
| **Disabled** | Action unavailable | `disabled` + `aria-disabled` | Varies |
| **Offline/degraded** | Network drop | toast/inline | Partial; REL-02 covers perpetual-skeleton |
| **Conflict/stale** | Optimistic vs server disagreement | rollback + toast | Estimate row edits |
| **Destructive confirm** | Delete/publish | Dialog | Exists (modals) |
| **Progress (long op)** | XLSX/PDF/AI | progress indicator | Partial; `27-*.md` Rule 7 |

## 2. Loading-state taxonomy + decision tree (to be codified in ARCH-01 protocol)

```
Is this a route transition with a meaningful skeleton shape?
├─ YES → loading.tsx (Skeleton). Overlay suppressed (or debounced).
└─ NO  → Is this a cross-shell transition (no skeleton)?
         ├─ YES → RouteLoadingOverlay (spinner), role=status, aria-live.
         └─ NO  → Is this an in-place async action (row edit, save)?
                  ├─ YES → useTransition pending + inline Skeleton/Spinner(xs).
                  └─ NO  → Is this a long-running op (XLSX/PDF/AI)?
                           ├─ YES → Progress indicator with cancelable state.
                           └─ NO  → Skeleton section via <Suspense>.
```

Rules:
- Prefer **Skeleton** for content-shaped areas; reserve **Spinner** for indeterminate inline actions and the global overlay.
- Skeletons must **match content dimensions** (CLS) per Next.js streaming guidance.
- Every loading UI exposes `role="status"` (+ `aria-live="polite"` for primary route loading) and a descriptive `aria-label`.
- All loading animations respect `prefers-reduced-motion`.

## 3. Primary user journeys (loading/transition touchpoints)

1. **Landing → Signup/Login → Workshop.** Static marketing (fast), then auth Suspense, then workshop dashboard skeleton. Risk: overlay vs. dashboard skeleton handoff.
2. **Workshop dashboard → Project → Estimate sheet.** Project layout streams (3 Suspense). Opening an estimate is the heaviest mount (ARCH-02). Risk: full-sheet SSR+hydrate blocks.
3. **Share receiver (public).** `/share/[token]` skeleton → proposal; comments/activity fetch-in-effect delay paint (ARCH-03). Risk: slow FMP on receiver.
4. **Invite acceptance.** `/invite/[token]` has no loading/error today — risk of blank canvas on slow networks (UX-01).
5. **Settings subroutes.** Single shared `loading.tsx` — acceptable but coarse; no error boundary (UX-02).

## 4. Accessibility behavior (per A11Y-01..03)

- **Keyboard:** navigation during a transition must not trap focus; after transition, focus lands on the new route's primary heading or prior focus is restored (A11Y-02 — browser proof).
- **Screen readers:** loading announced via `aria-live`; error boundaries announce and focus the recovery action (existing pattern in `WorkshopRouteErrorState`/`global-error`).
- **Reduced motion:** all `animate-pulse`/spinner keyframes gated by `motion-reduce`. Hand-rolled `animate-pulse` divs (activity loading) must add `motion-reduce:animate-none` or migrate to `Skeleton` (which already does).
- **Contrast/cues:** loading is non-color-cue-dependent (skeleton shape + announcement). Status cues in error/empty states must not rely on color alone (existing pattern uses icons + text).
- **Responsive:** skeletons must be responsive (the dashboard bento skeleton mirrors the real bento). Verify no horizontal overflow at narrow widths (the activity audit already confirmed this pattern).

## 5. UX regressions to prevent

- Blank canvas on any dynamic route navigation (UX-01).
- Full-page `global-error` for recoverable subtree errors (UX-02).
- Skeleton-to-content CLS from dimension mismatch (Skeleton law).
- Overlay showing on top of a working skeleton (double feedback) (UX-03).
- Spinner used where a skeleton is expected (rule drift).
- Perpetual skeleton on network drop with no error escape (REL-02).

## 6. Copy/content hierarchy

- Loading labels: descriptive ("Loading project dashboard", "Loading library") — existing pattern, keep.
- Error copy: existing `WorkshopRouteErrorState` pattern; route-labeled. Keep + extend.
- Avoid "Loading..." bare text (roadmap rule). Keep skeletons labeled via `aria-label`, not visible bare text.

## 7. User-facing documentation implications

None direct (no user docs system today). The agent rule (DOC-01) becomes the internal source of truth; `.ai/01_roadmap/05-ux-ui-polish-readiness.md` and `20-ux-ui-excellence-scorecard.md` should be cross-referenced, not rewritten.
