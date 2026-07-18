# 11 — Consolidate hand-typed easing curves onto the motion tokens

- **Status**: TODO
- **Commit**: `0a2667db9`
- **Severity**: LOW
- **Category**: Cohesion & tokens (also Easing/duration)
- **Estimated scope**: ~6 files, ~10 literal curves → tokens
- **Depends on**: Plan 01 (tokens must exist)

## Problem

After plan 01 defines `--ease-out` / `--ease-in-out` / `--ease-drawer` globally, the repo still has **four distinct hand-typed "ease-out-ish" cubic-beziers** plus the bare `ease-out` keyword scattered as literals. AUDIT.md §7: "Five hand-typed cubic-beziers that almost match is a consolidation finding."

The divergent curves in play:

| Location | Current literal | Used for | Target token |
|---|---|---|---|
| `src/app/globals.css:648` | `transition-timing-function: ease-out;` (`.sidebar-logo-frame`) | sidebar collapse width/bg/border morph | `var(--ease-in-out)` (on-screen morph, not ease-out) |
| `src/components/workshop/component-library-manager/AddComponentModal.tsx:2174` | `ease-[cubic-bezier(0.22,1,0.36,1)]` (drawer shadow fade) | variant drawer shadow | `ease-[var(--ease-out)]` |
| `src/components/workshop/component-library-manager/AddComponentModal.tsx:2186` | `ease-[cubic-bezier(0.22,1,0.36,1)]` (variant drawer slide) | drawer slide-in | `ease-[var(--ease-drawer)]` |
| `src/components/ui/shadcn-dropdown-menu.tsx:59` | `ease-[cubic-bezier(0.32,0.72,0,1)]` (item hover) | menu item hover | `ease-[var(--ease-out)]` |
| `src/components/ui/shadcn-dropdown-menu.tsx:134` | `ease-[cubic-bezier(0.32,0.72,0,1)]` | menu item hover | `ease-[var(--ease-out)]` |
| `src/components/workshop/estimate-sheet/rows/cells.tsx:379` | `ease-[cubic-bezier(0.32,0.72,0,1)]` | cell hover | `ease-[var(--ease-out)]` |
| `src/components/admin/estimate-system-map/EstimateSystemKnowledgeGraph.tsx:420,449` | `cubic-bezier(0.16, 1, 0.3, 1)` (inline style) | graph node opacity | `var(--ease-out)` |
| `src/components/sidebar/sidebar-types.ts:12` | `cubic-bezier(0.22, 1, 0.36, 1)` (JS constant) | sidebar JS easing | leave or swap to the drawer token value |
| `src/components/landing-new/new-landing.module.css:39-40` | scoped `--ease-out: cubic-bezier(0.16,1,0.3,1)`, `--ease-in-out: cubic-bezier(0.65,0,0.35,1)` | landing only | optionally point at global tokens |
| `src/components/landing-v3/landing-v3.module.css:29` | scoped `--ease: cubic-bezier(0.32,0.72,0,1)` | landing v3 only | optionally point at `--ease-drawer` |

Also: `bulk-action-toolbar.tsx:126` uses `duration-300` on a popover-sized Level-1 toolbar entrance (should be 200ms — `duration-200`, matching its Level-2 sibling at line 162).

## Target

Replace each literal with the matching global token. The token-to-purpose mapping:

- **Entrances, hover, color, exits** → `var(--ease-out)` = `cubic-bezier(0.23, 1, 0.32, 1)`
- **On-screen morphs** (sidebar collapse, panel resize) → `var(--ease-in-out)` = `cubic-bezier(0.77, 0, 0.175, 1)`
- **Drawers / iOS-like panel slides** → `var(--ease-drawer)` = `cubic-bezier(0.32, 0.72, 0, 1)`

The three target values are AUDIT.md's exact curves — copy verbatim.

### Specific edits

```css
/* target — globals.css:646-648 (.sidebar-logo-frame) */
  transition-property: width, background, border-color, box-shadow;
  transition-duration: 180ms;
  transition-timing-function: var(--ease-in-out);
```

```tsx
/* target — AddComponentModal.tsx:2174 (shadow fade) */
… opacity-0 transition-opacity duration-200 ease-[var(--ease-out)] motion-reduce:transition-none …
```

```tsx
/* target — AddComponentModal.tsx:2186 (drawer slide) */
… transition-transform duration-300 ease-[var(--ease-drawer)] motion-reduce:transition-none …
```
(Optionally also drop `duration-300` → `duration-250` here for a snappier drawer — see plan note.)

```tsx
/* target — shadcn-dropdown-menu.tsx:59 and :134 */
ease-[var(--ease-out)]   /* was ease-[cubic-bezier(0.32,0.72,0,1)] */
```

```tsx
/* target — cells.tsx:379 */
ease-[var(--ease-out)]
```

```tsx
/* target — EstimateSystemKnowledgeGraph.tsx:420 and :449 (inline style objects) */
transition: "opacity 200ms var(--ease-out)"   /* was cubic-bezier(0.16, 1, 0.3, 1) */
```

```tsx
/* target — bulk-action-toolbar.tsx:126 */
"animate-in fade-in slide-in-from-bottom-4 duration-200 motion-reduce:animate-none"   /* was duration-300 */
```

**Leave for now (lower priority, scope discipline):** `sidebar-types.ts:12` (JS constant used by the sidebar animation lib — swapping it is fine but verify the sidebar still feels right; can be a follow-up), and the scoped landing-module `--ease*` definitions (they work today; consolidating them risks subtly changing the landing feel and is not worth it for alpha).

## Repo conventions to follow

- Token references in Tailwind arbitrary values: `ease-[var(--ease-out)]` — the same `ease-[cubic-bezier(...)]` syntax these files already use, just with a var inside.
- Inline-style token references: `var(--ease-out)` directly — `EstimateSystemKnowledgeGraph.tsx` already uses inline `transition` strings.
- All three tokens are defined globally by plan 01, so they resolve in any component scope.

## Steps

1. **Confirm plan 01 has landed** (`--ease-out`, `--ease-in-out`, `--ease-drawer` in `:root`). If not, STOP — this plan is blocked.
2. `globals.css:648`: `transition-timing-function: ease-out;` → `transition-timing-function: var(--ease-in-out);` (morph = ease-in-out, per AUDIT.md §2).
3. `AddComponentModal.tsx:2174`: `ease-[cubic-bezier(0.22,1,0.36,1)]` → `ease-[var(--ease-out)]`.
4. `AddComponentModal.tsx:2186`: `ease-[cubic-bezier(0.22,1,0.36,1)]` → `ease-[var(--ease-drawer)]`. (Optional: `duration-300` → `duration-250`.)
5. `shadcn-dropdown-menu.tsx:59` and `:134`: `ease-[cubic-bezier(0.32,0.72,0,1)]` → `ease-[var(--ease-out)]`.
6. `cells.tsx:379`: `ease-[cubic-bezier(0.32,0.72,0,1)]` → `ease-[var(--ease-out)]`.
7. `EstimateSystemKnowledgeGraph.tsx:420` and `:449`: replace the `cubic-bezier(0.16, 1, 0.3, 1)` literal in the inline `transition` string with `var(--ease-out)`.
8. `bulk-action-toolbar.tsx:126`: `duration-300` → `duration-200`.

## Boundaries

- Do NOT touch the scoped landing-module `--ease*` definitions or `sidebar-types.ts:12` in this plan (noted as optional follow-ups).
- Do NOT change durations other than the bulk-action-toolbar Level-1 (line 126) — other durations are intentional or covered by their own plans.
- Do NOT add dependencies.
- Verify each edit by reading the surrounding line — the literal curves must match exactly (`0.22,1,0.36,1`, `0.32,0.72,0,1`, `0.16, 1, 0.3, 1`). If a literal has drifted since `0a2667db9`, STOP and report rather than guessing.

## Verification

- **Mechanical**: `bun run lint`; typecheck. No new errors.
- **Feel check** (per surface):
  - **Sidebar collapse/expand**: confirm the morph still feels smooth — now with the ease-in-out curve (slightly different feel: symmetric accelerate-decelerate vs the old ease-out's fast-start). If it feels worse, revert to `var(--ease-out)` — morphs are legitimately either; this is a judgment call.
  - **Variant drawer** (AddComponentModal): open/close the variant drawer. Confirm the slide uses the drawer curve (iOS-like). If you also changed duration to 250, confirm it feels snappier but not abrupt.
  - **Dropdown menu items**: hover items in a Radix dropdown. Confirm the hover transition is unchanged in feel (the new `--ease-out` `0.23,1,0.32,1` is very close to the old `0.32,0.72,0,1`).
  - **Bulk-action toolbar**: select items and confirm the Level-1 dock now enters at 200ms (snappier, matching Level-2).
  - **Knowledge graph**: toggle a node — confirm opacity transition still eases.
- **Done when**: `rg "cubic-bezier\(0\.22, 1, 0\.36, 1\)|cubic-bezier\(0\.32, 0\.72, 0, 1\)|cubic-bezier\(0\.16, 1, 0\.3, 1\)" src/` returns only the (intentionally preserved) landing-module and `sidebar-types.ts` hits, and every replaced site resolves to its token.

## Notes

- LOW severity because the existing literals are all *good* curves — this is cohesion/polish, not a feel-breaker. The highest-value single edit here is the sidebar `ease-out` → `ease-in-out` (correct easing family for a morph) and the bulk-action `duration-300` → `duration-200`.
- Safe to do partially: each edit is independent. If one feels wrong in feel-check, revert just that one.
