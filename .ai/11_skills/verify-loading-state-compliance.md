# Verify Loading-State Compliance

Use after changing a route, `loading.tsx`, `error.tsx`, `next/dynamic` boundary,
Suspense placement, or global overlay behavior.

## Procedure

1. Read `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md` and
   `.ai/00_system/VALIDATION_MATRIX.md`.
2. Inspect the affected route and shared loading components directly.
3. Confirm required `loading.tsx` / `error.tsx`, skeleton dimensions, and
   `role="status"` / `aria-*` behavior or document the specific exception.
4. Confirm heavy client chunks use `next/dynamic` with an explicit fallback
   where appropriate and that client boundaries remain narrow.
5. Confirm server reads were not added through `fetch` in `useEffect`; use the
   current server/TanStack Query boundary instead.
6. Confirm token-bearing routes remain no-store and that segment loading does
   not duplicate the global route overlay.
7. Classify the change as `Q0_CONTRACT_ONLY`, `Q1_CHANGE_GATE`,
   `Q2_CRITICAL_CHANGE_GATE`, or `Q3_RELEASE_GATE`.
8. Run every selected local source, static, lint, Vitest, Playwright,
   route-transition, build, screenshot, Storybook, accessibility, and visual-QA
   layer under the standing authorization in
   `.ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md`.

`bun run validate:agents` is a static contract validator and is relevant only
when the governing agent/protocol documentation changed.
