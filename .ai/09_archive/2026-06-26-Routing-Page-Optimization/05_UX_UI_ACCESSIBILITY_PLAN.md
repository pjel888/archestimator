# 05 - UX, UI, and Accessibility Plan

## UX Principle

Users should see one stable workspace shell and the most specific leaf loading state available.

For the target route, the only acceptable full-content fallback is the estimate sheet skeleton.

## Current Skeleton Map

| Route | Intended Skeleton | Acceptability for Target Sheet Route |
|---|---|---|
| `/workshop` | Workshop/home loading | Not acceptable after sheet navigation starts |
| `/workshop/projects` | Projects collection skeleton | Not acceptable after sheet navigation starts |
| `/workshop/projects/[projectId]` | Project dashboard skeleton | Not acceptable for sheet route |
| `/workshop/projects/[projectId]/estimates` | Estimates table skeleton | Not acceptable for sheet route |
| `/workshop/projects/[projectId]/estimates/[nodeId]` | `EstimateSheetRouteSkeleton` | Correct |

## Desired User Journey

### Cold Direct Load

1. Browser opens target URL.
2. Auth/session gate resolves.
3. Stable workshop/project shell appears.
4. Sheet-shaped skeleton appears if data is still loading.
5. Real estimate sheet appears.
6. No project dashboard or estimates-list skeleton appears after sheet route work starts.

### Warm Client Navigation

1. User is already on `/workshop/projects/[projectId]/estimates`.
2. User clicks or keyboard-activates a sheet link.
3. Existing shell remains mounted.
4. Content slot shows sheet skeleton or transitions directly to content.
5. No full-screen overlay unless navigation exceeds the configured delay and the overlay is proven useful.
6. Sheet content becomes usable.

### Hover-Prefetched Navigation

1. Hover/focus remains over the estimate link for at least the prefetch delay.
2. `router.prefetch(href)` warms the route.
3. Click should be faster than no-hover.
4. If prefetch is ineffective, the plan should not hide it; benchmark reports hover and no-hover separately.

## Loading Announcement Contract

- Use one `role="status"` per active loading region.
- Use `aria-busy="true"` on the status root.
- Visual skeleton blocks remain `aria-hidden="true"`.
- Avoid nested audible loading regions.
- If the global overlay is visible, ensure it does not make the only useful status region inaccessible longer than the overlay budget.

## Layout Stability Contract

`EstimateSheetRouteSkeleton` must preserve:

- Overall `flex h-full min-h-0 overflow-hidden` estimate workspace shape.
- Tree pane width around `376px`.
- Library rail width around `560px`.
- Center sheet column structure.
- `min-h-0` and overflow contracts so content does not snap when data resolves.

The target CLS budget is less than `0.1`, aligned with web.dev Core Web Vitals guidance.

## UI Non-Goals

- Do not redesign project dashboard or estimate sheet visuals.
- Do not add marketing-style loading illustrations.
- Do not introduce a new skeleton design language.
- Do not replace route skeletons with a generic spinner.

## UX Acceptance Tests

- `ProjectEstimatesListSkeleton` never appears during target sheet navigation.
- `ProjectRouteContentFallback` never appears during target sheet navigation.
- `ProjectsListSkeleton` and `StaticWorkshopLoadingShell` never appear after the target transition starts.
- `EstimateSheetRouteSkeleton` appears at most once before content.
- `[data-estimate-center-column='sheet']` becomes visible within the route budget.
- Reduced-motion users do not receive new motion.
- Keyboard/focus users can navigate from estimate list to sheet without focus traps or hidden active content.

