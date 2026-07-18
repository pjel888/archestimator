# 12 — `fade-in` entrances: add origin where the consumer should explain where content came from

- **Status**: TODO
- **Commit**: `0a2667db9`
- **Severity**: LOW
- **Category**: Physicality & origin (per-consumer polish)
- **Estimated scope**: 1–3 consumer sites (verify each before changing)

## Problem

The shared `fade-in` keyframe is pure opacity — no transform — so consumers that swap content (tab content, toolbar reveals) lose any sense of *where* the new state came from. Whether this is a finding depends entirely on the consumer:

```css
/* src/app/globals.css:1372-1380 — current (the keyframe itself; do NOT change) */
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

AUDIT.md §3/§8: a content swap that only fades has no origin. The fix is **per-consumer** — pair `fade-in` with a small `translateY(4px)→0` or `scale(0.98)→1` where origin matters. The keyframe itself is correct for consumers where a pure fade is right (e.g. a progress bar, a loading state).

## Target consumers to evaluate (verify each at its file:line before changing)

The `fade-in` consumers identified in recon:

1. **`src/components/ui/progress.tsx`** — progress feedback. **Pure fade is correct here.** Do NOT change. (A progress bar appearing should not slide.)
2. **`src/components/workshop/estimate-sheet/EstimateTabStrip.tsx:755`** — newly-added estimate tab entrance. **Candidate for origin motion** — a new tab appearing should explain it came from the tab strip. ⚠️ BUT: recon found this line applies `animate-in fade-in-0 slide-in-from-bottom-1` and **`fade-in-0` and `slide-in-from-bottom-1` are undefined classes** (only `fade-in`, `slide-in-from-bottom-4`, `slide-in-from-top-1` exist). So the tab entrance currently does nothing. The right fix here is to **define the missing classes** (covered by the missed-opportunity work / a dedicated fix), not to add origin to a no-op. Flag, do not change the keyframe.
3. **`src/components/ui/bulk-action-toolbar.tsx:126,162`** — toolbar reveals. Line 126 uses `fade-in slide-in-from-bottom-4` (already has origin via the slide — correct). Line 162 uses `fade-in slide-in-from-top-1` (also has origin — correct). **Already handled. Do NOT change.**

## Target

After verifying the consumers, the honest conclusion is: **the `fade-in` keyframe should NOT be changed**, and its current consumers are either correct-as-is (progress), already have paired origin motion (bulk-action toolbar), or are broken for an unrelated reason (EstimateTabStrip's undefined classes).

The one real, in-scope improvement is the **EstimateTabStrip broken entrance** — but that belongs to the "define the missing animation classes" missed-opportunity work (the Radix `fade-in-0`/`zoom-in-95`/`slide-in-from-bottom-1` classes referenced in `shadcn-dropdown-menu.tsx`, `context-menu.tsx`, and `EstimateTabStrip.tsx`). That is a cohesive piece of work best handled as a single plan that adds the full `tailwindcss-animate`-compatible class set the codebase already assumes exists.

## Repo conventions to follow

- The existing movement keyframes (`slide-in-from-bottom-4`, `slide-in-from-top-1`, `scale-in`) are the pattern for origin motion. Adding `slide-in-from-bottom-1` / `slide-in-from-bottom-2` / `fade-in-0` / `zoom-in-95` would extend the same system.
- Reduced-motion: any new movement keyframe must be covered by the plan 09 reduced-motion block (redirect movement → `fade-in`).

## Steps

Given the per-consumer audit, this plan's concrete action is narrowed to **defining the missing animation utility classes** so the entrances that already reference them actually work:

1. Open `src/app/globals.css`, locate the `.scale-in { animation-name: scale-in; }` rule (line ~1429) and the keyframes above it (~1372-1408).
2. Add the missing keyframes and utility classes that the codebase already references:
   - `fade-in-0` → `animation-name: fade-in;` (alias; `0` = start opacity 0, which `fade-in` already does). Add `.fade-in-0 { animation-name: fade-in; }`.
   - `zoom-in-95` → a scale-from-0.95 keyframe (physical, not scale(0)): add
     ```css
     @keyframes zoom-in-95 { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
     .zoom-in-95 { animation-name: zoom-in-95; }
     ```
     (This is nearly identical to the existing `scale-in` — consider aliasing `.zoom-in-95 { animation-name: scale-in; }` instead to avoid a duplicate. Prefer the alias.)
   - `slide-in-from-bottom-1` → translateY(0.25rem): add
     ```css
     @keyframes slide-in-from-bottom-1 { from { transform: translateY(0.25rem); } to { transform: translateY(0); } }
     .slide-in-from-bottom-1 { animation-name: slide-in-from-bottom-1; }
     ```
   - `slide-in-from-left-1` / `slide-in-from-right-1` → translateX(±0.25rem) (used by `data-[side=left/right]` on dropdowns). Add both.
   - For exit classes (`animate-out`, `fade-out-0`, `zoom-out-95`) referenced in `shadcn-dropdown-menu.tsx:81,102` and `context-menu.tsx`: either define them (reverse keyframes applied on `data-[state=closed]`) **or** remove the `data-[state=closed]:*` tokens from those className strings (simpler — Radix already unmounts; exit animation is polish). **Default: remove the exit tokens** unless a reviewer wants exit animation, since adding a full `animate-out` system is larger scope.
3. Ensure the plan 09 reduced-motion block (which redirects `.slide-in-from-*` and `.scale-in` to `fade-in`) also covers the new `.slide-in-from-bottom-1`, `.slide-in-from-left-1`, `.slide-in-from-right-1`, `.zoom-in-95` / `.zoom-out-95` names. Add them to the selector list.

## Boundaries

- Do NOT change the existing `fade-in` keyframe — it is correct.
- Do NOT change `progress.tsx` (pure fade is right there).
- Do NOT change the working `bulk-action-toolbar.tsx` entrances (already have origin).
- Default to **aliasing** `zoom-in-95` → `scale-in` rather than duplicating the keyframe.
- For exit animations, default to **removing** the `data-[state=closed]:*` tokens rather than building a full `animate-out` system (scope discipline).
- Do NOT add the `tailwindcss-animate` dependency — the repo deliberately replaced it (see the comment at `globals.css:1370` "Animation utilities (replaces tailwindcss-animate)").
- Do NOT add other dependencies.
- If any referenced className has drifted since `0a2667db9` (grep `fade-in-0|zoom-in-95|slide-in-from-bottom-1|slide-in-from-left-1|slide-in-from-right-1|animate-out|fade-out-0|zoom-out-95` to confirm the live set before editing), STOP and report.

## Verification

- **Mechanical**: `bun run lint`; typecheck. No new errors.
- **Feel check**:
  - **EstimateTabStrip**: add a new estimate tab. Confirm it now animates in (fade + small slide-up over ~150ms) instead of popping. (Was: no animation — the classes were no-ops.)
  - **Radix dropdown** (`shadcn-dropdown-menu.tsx`): open a menu. Confirm the `zoom-in-95` (aliased to `scale-in`) + `fade-in-0` entrance now runs — the menu scales from 0.95 at its `--radix-dropdown-menu-content-transform-origin` and fades in. (Was: only the `slide-in-from-top-1` side-variant ran; the zoom/fade were no-ops.)
  - **Context menu**: same check on right-click.
  - Toggle `prefers-reduced-motion`: confirm all the new movement classes degrade to the short fade (via the plan 09 block, now extended to cover them).
- **Done when**: `rg "fade-in-0|zoom-in-95|slide-in-from-bottom-1|slide-in-from-left-1|slide-in-from-right-1" src/` returns only references that now resolve to defined classes, and dropdowns/tab-entrances visibly animate.

## Notes

- This plan drifted from "add origin to fade-in consumers" into "fix the broken undefined-class references" — that's the honest result of the per-consumer audit. The original §12 finding (pure-fade loses origin) is real but, in this codebase, already mitigated where it matters (toolbar) and the remaining gap is actually a *missing-definition* bug, not a missing-origin design choice. Naming the plan accurately so the executor doesn't go changing the `fade-in` keyframe or `progress.tsx`.
- LOW severity — these entrances being no-ops is a polish gap, not a feel-breaker on working motion.
