# Unit 013 — `share/[token]/sections/*` Duplicate Client-Portal Routes Without A Token-Type Guard (MEDIUM)

**Finding:** F-13 · **Severity:** MEDIUM · **Priority:** P3 · **Effort:** S · **Risk:** LOW
**Requirement:** `REQ-010` (item) · **Status:** TODO · **Depends on:** 005 · **Test:** NOT_REQUIRED

## Problem

Unlike every other share-side endpoint under `/api/share/[token]/*`
(`decision`, `comment`, `threads`, `session`, `password` all branch on
`isClientPortalToken`), the three routes
`share/[token]/sections/[sectionId]`, `…/rows`, and `…/activity` call
`clientPortal*Response` unconditionally. For a legacy share token they 404 (no
portal match), so they are effectively unreachable for legacy clients but
advertise a non-existent capability. The divergence from sibling routes is the
defect.

## Evidence

`src/app/api/share/[token]/threads/route.ts` guards with:
```ts
if (!await isClientPortalToken(token)) return new Response(null, { status: 404 });
```

`src/app/api/share/[token]/sections/[sectionId]/route.ts` (and `rows/route.ts`,
`activity/route.ts`) have **no such guard** and call
`clientPortalSectionResponse` directly.

## Fix Direction

Add the same `isClientPortalToken` guard to all three routes for consistency:

```ts
if (!await isClientPortalToken(token)) {
  return new Response(null, { status: 404 });
}
```

If the routes are genuinely unused (confirm via grep for client callers), **remove**
them instead — dead routes are worse than consistent ones.

### Owned paths
- `src/app/api/share/[token]/sections/[sectionId]/route.ts`
- `src/app/api/share/[token]/sections/[sectionId]/rows/route.ts`
- `src/app/api/share/[token]/sections/[sectionId]/activity/route.ts`

### Prohibited
- Do not change the client-portal response shape.

## Acceptance Evidence

- `AC-001`: all three routes either 404 for non-portal tokens (consistent guard)
  or are removed.

## Recovery

None needed.

## Notes

Land after unit 005 so the share password surface is consistent first.
