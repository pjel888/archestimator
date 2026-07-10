# Verify Loading-State Compliance

**Format:** B (procedure skill)  
**When:** After adding/changing a route, `loading.tsx`, `error.tsx`, `next/dynamic` mount, or global overlay behavior.

## Steps

1. Read `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md`.
2. Confirm the route has `loading.tsx` / `error.tsx` when required by the protocol checklists.
3. Confirm loading UI uses `Skeleton` + `role="status"` / `aria-*` (or documented exception).
4. Confirm heavy client chunks use `dynamic` with `loading` fallback when a skeleton exists.
5. Confirm no new `fetch` inside `useEffect` for server reads (TanStack Query instead).
6. Confirm token routes remain no-store.
7. Run: `bun run validate:agents` (if protocol/AGENTS changed), focused vitest/Playwright for touched surfaces.
