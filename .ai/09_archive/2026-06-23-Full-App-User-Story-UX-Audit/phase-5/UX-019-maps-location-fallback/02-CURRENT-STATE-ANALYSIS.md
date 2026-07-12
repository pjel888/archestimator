# UX-019 — Current State Analysis

Date: 2026-06-23 (candidate paths refreshed 2026-06-24)

## Affected Source Paths (candidate set)

Primary surfaces (verified present 2026-06-24):

```
src/components/workshop/ProjectDetailsModal.tsx
src/components/workshop/ProjectLocationMap.tsx
src/components/workshop/ProjectAddressAutocomplete.tsx
src/components/workshop/projects-page-client.tsx
src/lib/google-maps/loader.ts
src/app/workshop/projects/page.tsx
src/app/workshop/projects/[projectId]/page.tsx
env: NEXT_PUBLIC_GOOGLE_MAPS
```

Recent commits landing the maps surface:

- `fc519eac` feat(workshop): rebuild ProjectDetailsModal on Dialog primitive with Google Maps preview
- `bfc38eed` feat(workshop): add currency picker and Google Maps location to new-project flow

### How To Verify

```sh
for p in src/components/workshop/ProjectDetailsModal.tsx \
         src/components/workshop/ProjectLocationMap.tsx \
         src/components/workshop/ProjectAddressAutocomplete.tsx \
         src/lib/google-maps/loader.ts; do
  [ -e "$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any MISS is drift — re-derive the path before editing.

---

## Current Behavior Summary

Google Maps/Places key, quota, script, or billing failures are external-provider dependent. The primary map integration surface is now in source (`ProjectLocationMap`, `ProjectAddressAutocomplete`, `google-maps/loader`, consumed by `ProjectDetailsModal` and the new-project flow); UX-019's remaining work is the **address-only fallback / edit path** that activates when the Maps provider is unavailable (key missing, quota exhausted, script blocked, billing failure), plus the provider-readiness banner.

Evidence per audit:

> MAP-001 report and tests.

---

## Related Tests

```sh
rg -l 'ProjectLocationMap|ProjectAddressAutocomplete|google-maps' tests/ 2>/dev/null
```

Per the [Keystone](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md) (re-derive live counts during Wave 0):

- `tests/vitest/` — keystone cites 429; current filesystem = 418 (drift noted in [LOOP_LEDGER.md § Audit Pass](../../LOOP_LEDGER.md#audit-pass-2026-06-24))
- `tests/unit/` — 5 files (matches keystone)
- `e2e/` — keystone cites 21; current filesystem = 22

---

## What's Missing Today

| Aspect | Current | Target |
|---|---|---|
| User feedback | Google Maps/Places key, quota, script, or billing failures are external-provider dependent; primary map surface exists. | User can edit location even when map provider is unavailable. |
| Fix path | Partial — primary map integration in source; no fallback/edit path. | Provider readiness banner + address-only fallback/edit path activated on provider failure. |

---

## Linkage

- [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md)
- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
