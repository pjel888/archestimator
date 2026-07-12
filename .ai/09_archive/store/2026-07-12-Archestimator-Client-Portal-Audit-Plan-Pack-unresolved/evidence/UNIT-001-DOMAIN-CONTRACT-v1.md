# UNIT-001 Domain Contract Receipt

## Scope and status

- **Unit:** `UNIT-001`
- **Run scope:** `IMPLEMENT_LOCAL`
- **Result:** `PASS` for the docs/types-only foundation; no legacy route, API, database, or production state was changed.
- **Source revision:** `6b59648a70c485cd54bad8f3659b3ec454621530`
- **Validation boundary:** source inspection and static contract review only. Automated tests, builds, browser proof, and provider actions remain unauthorized.

## Canonical contract

`02-PRODUCT-MODEL-AND-TERMINOLOGY.md` remains the product source of truth. `src/lib/client-portal/contracts.ts` is its executable type boundary for all new Client Portal work.

The contract fixes these first-release rules:

1. A **Client Portal** is the stable project-review relationship, URL, recipient roster, brand configuration, and history. An **Issue** is an immutable published version beneath that portal.
2. A project may own multiple portals. A content revision creates an issue; it does not create a new portal or silently rotate recipient identity.
3. Only the approved `CLIENT_PORTAL_SECTION_KINDS` registry can define owner-configured portal sections. The new model has no arbitrary scripts, CSS, queries, formulas, or page-builder blocks.
4. Discussion targets are typed contextual anchors. They may identify a row, chart, or section, but they do not participate in formal decision scope.
5. The first-release formal decision scope is exactly `issue`. `ClientPortalIssueDecisionContext` intentionally has no discussion target field.
6. External recipient templates are Viewer, Commenter, Reviewer, and Approver. Capability checks remain server-evaluated and relationship-aware in later units.
7. New public identifiers use the explicit portal/issue/section/recipient/thread/message/decision/asset namespaces defined in `CLIENT_PORTAL_PUBLIC_ID_PREFIXES`.
8. Issued content is immutable; revocation preserves historical activity; project deletion needs a retention tombstone or equivalent preservation path; internal notes must never share client-visible storage or query paths.

## Current-source reconciliation

| Current fact | Source evidence | UNIT-001 decision | Follow-up owner |
|---|---|---|---|
| `project_publications` exposes one published row per project | `migrations/0014_publication_shared_links.sql`, `migrations/0066_publication_foreign_keys.sql` | This is legacy compatibility only; Client Portal schema must support multiple portals per project. | `UNIT-002` |
| Legacy public routes are `/share/[token]` | `src/app/share/[token]/page.tsx`, `src/app/api/share/[token]/*` | Preserve legacy reads/links until a migration mapping is complete. | `UNIT-002`, `UNIT-018` |
| Legacy responses permit row/estimate target metadata but have uniqueness on `(recipient_id, publication_id)` | `migrations/0014_publication_shared_links.sql`, `src/app/api/share/[token]/decision/route.ts`, `src/components/share/SharePageDecision.tsx` | Treat those target fields as historic presentation metadata. New formal decisions are issue-wide only. | `UNIT-013`, `UNIT-018` |
| Legacy recipients belong to publications | `migrations/0014_publication_shared_links.sql`, `src/lib/publication/d1-store.ts` | New recipients belong to stable portals so a reissue does not lose recipient identity. | `UNIT-002`, `UNIT-010`, `UNIT-018` |
| Legacy tables cascade from projects | `migrations/0066_publication_foreign_keys.sql` | Retention migration must preserve required issued records before any source-project deletion path can remove them. | `UNIT-002`, `UNIT-018`, `UNIT-021` |
| Existing snapshot code sanitizes published IDs and avoids exposing live estimate rows | `src/lib/publication/snapshot.ts`, `src/lib/publication/public-repository.ts` | Reuse snapshot-first/public-ID patterns; new portal reads must not fall back to live private rows. | `UNIT-005`, `UNIT-006` |

## Migration assumptions frozen for UNIT-002

- Legacy `project_publications` remains readable during the compatibility period; no destructive rewrite occurs in `UNIT-002`.
- Each legacy publication maps to exactly one imported portal/issue pair, with legacy token routing preserved until `UNIT-018` completes dual-read/cutover proof.
- New `client_portals` and `portal_issues` rows must separate stable identity from immutable issue content and cannot retain the one-published-publication-per-project constraint.
- A new issue carries portal recipient identity forward by reference, not by copying recipient rows into a disposable publication.
- Legacy response target columns are retained only for history/audit migration; the new decision table must reference a single issue scope and store the signed issue amount/hash context.
- Any migration that changes deletion behavior needs a fix-forward/tombstone path before it can replace the current project-cascade relationship.

## Acceptance review

| Acceptance claim | Evidence | Result |
|---|---|---|
| One source-of-truth spec | Product vocabulary/decisions in `02-PRODUCT-MODEL-AND-TERMINOLOGY.md`, executable mirror in `src/lib/client-portal/contracts.ts` | PASS |
| New model has no row-decision semantics | `ClientPortalIssueDecisionContext` has only issue identity, version, total, currency, and hash; row/estimate targets exist only in `ClientPortalDiscussionTarget` | PASS |
| Migration assumptions enumerated | Current-source reconciliation and frozen assumptions above | PASS |

## Residual risk and next unit

Legacy code still accepts row/estimate target metadata on `/api/share/[token]/decision`; that behavior remains an explicitly isolated compatibility surface until `UNIT-013` and `UNIT-018`. `UNIT-002` is next and owns additive D1 portal/issue schema plus the compatibility mapping.

## TEST_PROPOSAL

When testing is explicitly authorized, run `bun run vitest -- tests/vitest/client-portal/contracts.test.ts` after adding coverage for section/role/ID contract invariants. Risk: a new section or capability may drift from the policy registry without a compile-time or behavior-level guard.
