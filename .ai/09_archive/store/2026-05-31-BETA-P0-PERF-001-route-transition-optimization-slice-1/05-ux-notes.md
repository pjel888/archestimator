# UX Notes

## Loading States

- Workshop loading routes now render a static shell immediately instead of awaiting the authenticated workshop page shell.
- The static shell preserves the core workshop chrome shape: sidebar, header/title row, content region, and footer-height spacer.
- The Ask Flip footer assistant is not rendered by the static loading shell.
- Skeleton regions are marked `aria-hidden="true"` where appropriate, with a screen-reader-only loading status.
- Current route overlay behavior was not changed: immediate show plus existing `MIN_DISPLAY_MS = 250`.

## Prefetch Interactions

- Sidebar links now prefetch on hover/focus with cancellation on mouse leave/blur.
- Project cards now prefetch project detail routes on hover/focus.
- Estimate rows now prefetch their estimate workspace route and only real estimate React Query data.
- No fake project/library/template React Query keys were introduced.

## Error Boundaries

- Error boundaries were added for:
  - Estimate workspace route.
  - Library route.
  - Charts route.
- Error UI uses a retry button that calls `reset()`.
- User-facing error text does not expose stack traces, file paths, SQL, tokens, ids, or secrets.
- Development logging is sanitized to route, error name, and digest only.

## UX Validation Gap

No screenshot or manual visual pass was captured for skeleton timing, hover prefetch network behavior, forced error UI, or bfcache restore. Next route-transition prompt should capture those before marking UX evidence complete.
