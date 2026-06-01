# UX Notes

## Loading And Fallback Behavior

Slice 1 static workshop loading shells remain in place so route loading skeletons do not wait on auth or cookies.

This run added or completed:

- `WorkshopPageShell` content Suspense fallback.
- Project workspace child-route Suspense fallback.
- Nested project estimates `loading.tsx` fallback.
- Estimate workspace dynamic tree/content fallbacks.
- Bubble chart dynamic fallback.

The fallback UI keeps the existing workshop chrome shape, uses neutral palette/hairline borders, `rounded-xs`, regular/medium weights, small visible app text, and `aria-hidden="true"` on decorative skeleton regions where appropriate.

## Dynamic Imports

Estimate workspace, library manager, add-component modal, landing wireframe background, and project bubble chart now load lazily. The dynamic boundaries use stable skeleton or null fallbacks rather than spinner UI.

## Error Boundaries

Workshop library, project charts, and estimate workspace route errors share the same compact retry state. The latest evidence refresh added direct DOM tests for the actual `error.tsx` route components, a component-level forced-render screenshot for all three route labels, and live dev-auth screenshots for each thrown route via the gated route-error smoke harness.

The route-error UI shows only user-safe copy: route label, "This view could not load", continuation guidance, and a Retry button. The regression test uses an error object containing SQL text, a token-like value, a local file path, a stack string, and a digest, then verifies those details are not visible to the user.

## Route Overlay

The existing route overlay behavior was preserved:

- Immediate show.
- `MIN_DISPLAY_MS = 250`.
- No 150ms delayed-show change was added.

Automated bfcache/back-forward smoke found no stuck route overlay in both dev-server and production-like runs.

Automated public Link-transition smoke now records overlay visibility during `/features` to `/pricing` transitions. The dev-server median was 2378 ms with overlay visibility in 4 of 5 runs; the production-like median was 392 ms with overlay visibility in 5 of 5 runs.

The isolated authenticated route-transition smoke records a successful sidebar rail transition when the collapsed sidebar icon position is targeted, matching the visible 64px sidebar rail. A refreshed evidence-contract pass now separates hover-before-click RSC requests from click-transition RSC requests; in the local dev-auth environment, no hover-before-click `_rsc` requests were observed for sidebar, project-card, or estimate-row surfaces. Local Next.js source/docs inspection explains this limitation: App Router prefetch URL creation is disabled in development, while the local dev-auth bypass is development-only.

## Manual UX Gaps

Still missing:

- Authenticated workshop visual timing.
- Production-mode authenticated hover/focus Network screenshots for sidebar/project/estimate-row prefetch that prove `_rsc` requests happen before click.
- Manual slow-transition skeleton screenshot.
- Production-mode route-error screenshots. Live dev-auth route-error screenshots are captured in `live-route-error-screenshots/`, but they include the local Next.js dev issue notifier and should not be treated as production UI proof.
