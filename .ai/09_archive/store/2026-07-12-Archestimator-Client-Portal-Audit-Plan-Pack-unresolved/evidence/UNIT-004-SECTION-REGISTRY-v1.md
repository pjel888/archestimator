# UNIT-004 Typed Section Registry Receipt

## Scope and status

- **Unit:** `UNIT-004`
- **Run scope:** `IMPLEMENT_LOCAL`
- **Result:** `PASS`
- **Implementation:** `src/lib/client-portal/contracts.ts`, `src/lib/client-portal/section-registry.ts`, and `src/lib/client-portal/policy.ts`
- **Focused tests:** `bunx vitest run tests/vitest/client-portal-policy.test.ts tests/vitest/client-portal-section-registry.test.ts --maxWorkers=1` — 10 passed.
- **TypeScript:** `bunx tsc --noEmit --pretty false` — passed.

## Delivered contract

- The canonical top-level kinds are `overview`, `estimate_browser`, `financial_summary`, `cost_breakdown`, `estimate_comparison`, `assumptions_exclusions`, `discussion`, `activity`, and `decision`.
- Draft schema version 1 validates exact root fields, stable identifiers, layout compatibility, and only the typed configuration keys registered for a section kind.
- The public section manifest has its own version 1 schema and excludes draft-only configuration and interaction controls.
- Issued payload serialization recursively removes permanently private fields and keeps supplier/rate-style controlled fields absent unless the section field policy explicitly opts in.
- No arbitrary custom section, HTML, CSS, script, SQL, query, or configuration key can pass the registry boundary.

## Acceptance review

| Acceptance claim | Evidence | Result |
|---|---|---|
| Versioned draft and public schemas | `parseClientPortalSectionDraft` and `buildClientPortalPublicSection` produce distinct schema-versioned contracts. | PASS |
| Unknown kind rejected | Focused registry suite rejects `custom_html`. | PASS |
| Renderer/build/sanitize contracts | Registry entries own allowed layouts/defaults; public builder and issued-payload sanitizer are the sole export path. | PASS |
| Safe field policy | Policy defaults controlled cost fields to hidden; serializer strips hard-private and unselected controlled values. | PASS |

## Validation boundary

This receipt proves the local typed registry, policy integration, and serialization boundary only. It does not prove future issue building, public routes, rendering, print, browser behavior, or hosted D1/Cloudflare behavior.

## Next unit

`UNIT-005` can now build immutable issue payloads from the registered sections, policy metadata, and v2 D1 tables.
