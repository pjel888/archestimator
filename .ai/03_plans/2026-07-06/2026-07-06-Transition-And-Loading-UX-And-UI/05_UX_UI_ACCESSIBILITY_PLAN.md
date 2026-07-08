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

---

## 8. Full state matrix (mandatory per Improve directive; without it UX readiness caps at 84)

Every user-facing surface × every state. ✓ = present today; ✗ = gap; △ = partial.

| Surface | Loading (route) | Loading (section) | Loading (inline) | Empty | Success | Partial-success | Error (route) | Error (global) | Not-found | Auth-denied | Disabled | Offline/degraded | Conflict/stale | Destructive-confirm | Progress (long op) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` landing | n/a (static) | n/a | n/a | n/a | ✓ | n/a | ✗ (global only) | ✓ | root ✓ | n/a | n/a | ✗ | n/a | n/a | n/a |
| `/share/[token]` | ✓ | △ (comments fetch-in-effect) | △ | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | password gate ✓ | ✓ | ✗ (REL-02) | ✗ | n/a | △ (export) |
| `/invite/[token]` | **✗ (UX-01)** | n/a | n/a | n/a | ✓ | n/a | **✗ (UX-02)** | ✓ | terminal-state (ok) | n/a | ✓ | ✗ | n/a | n/a | n/a |
| `/workshop` dashboard | ✓ | n/a | ✓ | ✓ | ✓ | ✗ | **✗ (UX-02)** | ✓ | root ✓ | ✓ gate | ✓ | ✗ | △ (ARCH-06 double-fetch) | ✓ | △ |
| `/workshop/projects` | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | **✗ (UX-02)** | ✓ | root ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | △ |
| `/workshop/projects/[id]` | ✓ + layout Suspense | ✓ | ✓ | ✓ | ✓ | ✗ | **✗ (UX-02)** | ✓ | root ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | △ |
| `…/activity` | △ (hand-rolled UX-04) | n/a | ✓ | ✓ | ✓ | ✗ | **✗ (UX-02)** | ✓ | root ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | n/a |
| `…/estimates` | **✗ (UX-01)** in-page Suspense | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | root ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | △ |
| `…/estimates/[nodeId]` | ✓ + Suspense | ✓ | ✓ (ARCH-02 mount gap) | ✓ | ✓ | ✗ | ✓ | ✓ | root ✓ | ✓ | ✓ | ✗ | ✓ (optimistic) | ✓ | △ |
| `/workshop/library/*` | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | root ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | n/a |
| `/workshop/settings/*` | ✓ (shared) | n/a | ✓ | ✓ | ✓ | ✗ | **✗ (UX-02)** | ✓ | root ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | n/a |
| `/workshop/proposals` | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | **✗ (UX-02)** + **ARCH-07b stale** | ✓ | root ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | n/a |
| `/workshop/publisher` | **✗ (UX-01)** + **ARCH-07c stale** | ✓ (nested Suspense) | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | root ✓ | ✓ | ✓ | ✗ | ✓ | ✓ (publish) | ✓ (publish) |

**Gap summary:** offline/degraded is ✗ app-wide (REL-02 perpetual-skeleton escape needed); partial-success ✗ app-wide (acceptable for closed beta — document); route error.tsx missing on 6 workshop subtrees (UX-02); UX-01 gaps on 3 routes; ARCH-07 stale on proposals/publisher (correctness, Phase 1.5).

## 9. Action-level accessibility proof matrix (mandatory per Improve directive)

For each interactive action touched by this plan: keyboard path, focus target/restoration, accessible name/live-region, proof type.

| Action | Keyboard path | Focus target / restoration | Accessible name + live-region | Proof type |
|---|---|---|---|---|
| Navigate to a route (loading shows) | Tab/Enter on Link → new route | focus → new route primary heading (or restore) | `aria-live="polite"` on loading UI + `aria-label="Loading …"` | PC-01/02 (e2e skeleton) + PC-06 (DOM a11y) |
| `RouteLoadingOverlay` during transition | n/a (passive) | `aria-hidden` toggled on shell; must not trap focus (A11Y-02) | `output role="status" aria-live="polite" aria-label="Loading page"` | PC-07 (keyboard/focus e2e) — browser-only |
| Estimate row inline edit | Tab to cell → Enter → type → Enter/Escape | focus restored to cell after commit/rollback | pending state announced (useTransition); toast on error | PC-08 (CRUD latency) + existing estimate-cell tests |
| Open estimate sheet (skeleton→content) | click/Enter on estimate link | focus → sheet primary region | skeleton `aria-busy`/`aria-label` | PC-08 (shell-streaming) |
| Share password unlock | form fields → submit | focus → first field on error; → content on success | `aria-live` error; success announcement | shared-link-receiver spec |
| Invite accept | form submit (POST) | focus → `/workshop` on success; → error on wrong-account | terminal-state announcements | invite spec (new) |
| Settings save | form submit → toast | focus → trigger; toast announced | toast `role="status"` | existing settings tests |
| Open/close modal (project/library) | Esc closes; focus trap; restore trigger | focus → first focusable; restore on close | dialog `aria-modal` + labelledby | existing modal tests |
| Publisher publish/unpublish | confirm dialog → progress | focus → progress region; → result | progress `role="status"`; result live-region | publisher spec |

**WCAG 2.2 AA alignment:** keyboard operable (2.1), visible focus (2.4.7), semantic HTML + landmarks (1.3.1, 1.3.6 target where practical), contrast (1.4.3 — Skeleton/Spinner neutrals satisfy), reduced-motion (2.3.3), status messages (4.1.3), target size (2.5.8 — verify interactive controls ≥24×24px). Browser proof reserved for focus/routing (A11Y-02) per AGENTS.md proportional-verification.

## 10. Dense/large-data + responsive/touch constraints (mandatory)

- **Estimate sheet:** large tree (virtualize >500 nodes per `27-*.md`); row editing keystrokes local (bible §4.3). Mount optimization ARCH-02.
- **Component library (1000+ items):** `useDeferredValue` search; virtualize. Lazy via `dynamic`.
- **Responsive:** skeletons must mirror bento at narrow widths (no horizontal overflow — activity audit pattern). Touch targets ≥24px.
- **Explicit non-goals:** no decorative redesign; no marketing-page drift; workflow software only.

## 11. Visual QA gate table (when browser proof is required)

Per AGENTS.md proportional verification, browser/visual QA is required only when static/DOM tests cannot prove the claim. For this plan:

| Risk | Needs browser proof? | Why |
|---|---|---|
| Skeleton CLS (dimension match) | Yes (EV-09/shell-streaming + CLS capture) | reflow under real streaming |
| Overlay focus (A11Y-02) | Yes (PC-07) | real keyboard/focus during transition |
| `ssr:false` estimate hydration (ARCH-02) | Yes (PC-08 CRUD-latency) | real interaction after dynamic load |
| Skeleton `role/aria` | No (PC-06 DOM) | static DOM assertion suffices |
| `viewport` export | No (PC-05 grep) | static |
| Reduced-motion | No (CSS audit) + optional emulate | static suffices |
| Loading labels/copy | No (DOM text) | static |

This keeps browser proof proportional — proving only browser-only claims, per AGENTS.md.
