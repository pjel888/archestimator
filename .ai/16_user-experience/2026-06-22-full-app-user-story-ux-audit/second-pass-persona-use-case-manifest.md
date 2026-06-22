# Second-Pass Persona And Use-Case Manifest

Date: 2026-06-22

This manifest explains the second-pass expansion of `canonical-feature-status.csv`. The CSV remains the single canonical status tracker; this file is a readable index for the newly added personas, story IDs, issue IDs, and targeted verification IDs.

## Persona Matrix

| Persona group | Personas included | Primary missed angle | Added or sharpened story IDs |
|---|---|---|---|
| Estimator / PM / contractor-builder | Estimator, contractor/builder, field operator, project manager | Interrupted estimate capture, what-if branches, field handoff, readiness, contractor clarification, access-path-specific project/package access | `EST-010`, `EST-011`, `EST-012`, `EST-013`, `FIELD-001`, `FIELD-002`, `PM-001`, `PM-002`, `COLLAB-004` |
| Admin / support / operator | Business owner, support triager, support response operator, monitoring operator, provider readiness operator, legal/privacy operator, release campaign operator, beta operator, launch owner | Operational ownership, provider proof, support repair, legal/privacy operations, campaign safety, owner governance | `OWNER-001`, `OWNER-002`, `OPS-002`, `OPS-003`, `OPS-004`, `LEGAL-002`, `SUPPORT-001`, `SUPPORT-002`, `NOTIF-004`, `NOTIF-005`, `ADMIN-002`, `ADMIN-003` |
| Client / recipient / stakeholder | Share-link recipient, non-technical client, stakeholder reviewer | Comprehension, session recovery, unsubscribe recovery, print packet, activity completeness, comment/decision retry | `SHARE-007`, `SHARE-008`, `SHARE-009`, `SHARE-010`, `SHARE-011`, `SHARE-012`, `SHARE-013` |
| Supplier / vendor / cost source | Supplier, vendor, brand steward, cost-source manager, library curator | Supplier contribution, supplier/brand governance, cost freshness, attachment/spec-sheet approval, accepted cost reconciliation | `LIB-004`, `LIB-005`, `LIB-006`, `LIB-007`, `COST-001`, `API-002` |
| General app / route coverage | Invited collaborator, returning bookmarked user, project asset user, public visitor | Missing route/API inventory and evidence-quality gaps | `INVITE-001`, `ROUTE-001`, `API-001`, `PUBSITE-004` |

## Added Issue Themes

| Issue IDs | Theme |
|---|---|
| `UX-030`, `UX-031`, `UX-032` | Estimator, contractor/builder, field, PM, and business-owner workflows that were hidden inside generic estimating/collaboration/share rows. |
| `UX-033`, `UX-034` | Supplier/vendor/cost-source and attachment/spec-sheet governance. |
| `UX-035`, `UX-036`, `UX-037` | Recipient comprehension, recovery, print, activity, comment, and decision reliability. |
| `UX-038`, `UX-039`, `UX-040` | Operator, campaign, support, beta cohort, and admin repair ownership. |
| `UX-041`, `UX-042`, `UX-043`, `UX-044` | Evidence-quality correction, route/API inventory correction, auth/account/invite recovery specificity, and estimate accessibility/validation gaps. |

## Targeted Verification IDs

| Verification ID | Scope | Proof shape |
|---|---|---|
| `TV-PUBLIC` | Public site, legal pages, feature maturity claims | Static route/text-contract tests and owner copy review. |
| `TV-AUTH` | Auth, beta access, terms, redirects | Focused auth/legal tests plus hosted/provider proof for real sign-in when needed. |
| `TV-INVITE` | Invite accept, continue, sign-out, repair | Route/action tests plus support repair workflow proof. |
| `TV-WORKSHOP-ADMIN` | Workshop shell, settings, account, beta admin | Component/action tests for role-aware states and admin support affordances. |
| `TV-PROJECT-DASHBOARD` | Project list, dashboard, PM readiness, owner governance | Focused dashboard/component tests and one joined authenticated journey when implemented. |
| `TV-ESTIMATE-SHEET` | Estimate list, sheet, validation, tabs, tree, cost entry, alternatives | Vitest estimate-sheet suites plus browser smoke only for joined persistence/mobile claims. |
| `TV-FIELD-HANDOFF` | Contractor/builder and field packages | New contract/component tests for field package contents, access-path behavior, receipt, and feedback. |
| `TV-LIBRARY-SOURCING` | Supplier, brand, cost-source, attachment/spec-sheet governance | Library workflow tests for stale queue, supplier directory, attachment approval, and accepted cost. |
| `TV-DATA-MAPS` | Charts, data, map provider fallback | Focused chart/location tests plus external map provider proof only when needed. |
| `TV-COLLABORATION` | Invites, project collaboration, presence, permission-limited access | Local collaboration tests plus gated two-user E2E for live presence/reconnect claims. |
| `TV-SHARE-RECIPIENT` | Publication, share links, recipient recovery, print, comments, decisions | Share component/API tests plus gated receiver E2E for full recipient journey. |
| `TV-ASSET-API` | Project images, library images, attachments | API contract tests for upload, validation, failure, and recipient-facing fallback. |
| `TV-AI` | AI package builder, draft/apply, disabled/quota/provider states | Deterministic AI route/component tests; provider/model quality remains separately unproven. |
| `TV-OPS-SUPPORT` | Feedback, notifications, legal/privacy, monitoring, provider readiness, launch operations | Readiness scripts, focused admin/support tests, and external/provider proof flags. |
| `TV-ROUTE-ALIASES` | Route/API inventory and backward-compatible aliases | Source path checks and route smoke tests for explicit entry points. |

## Evidence Status Vocabulary

Use these proof-level meanings in the canonical CSV. The exact allowed values and mappings are now canonicalized in `08-csv-schema-and-validation-contract.md`.

| Evidence status | Meaning |
|---|---|
| `Concrete local tests identified` | A specific local test path exists, but this second pass did not execute it. |
| `Inventory only; related tests identified; not executed in second pass` | Nearby tests exist, but they do not prove the full user story. |
| `Source evidence only; missing user-story test` | Code or route exists, but no matching behavior test was identified. |
| `Browser proof not run` | Claim needs browser/user-journey evidence or an equivalent DOM test before it should be treated as proven. |
| `Provider proof not run` | Claim depends on hosted/provider behavior such as email delivery, map quota, Supabase runtime, monitoring, or Vercel runtime. |
| `Known red or blocked broad validation; targeted proof required` | Broad validation is not an actionable pass/fail signal, so row-level targeted verification is required. |

## Stop Condition

The second-pass pack is complete when:

- `canonical-feature-status.csv` parses with 93 rows, 22 columns, no duplicate story IDs, and no malformed issue references.
- Every `UX-*` referenced by the CSV exists in `ux-logistical-errors-and-fixes.md` and `post-fix-scenario-tests.md`.
- `README.md`, `testing-loop-and-validation.md`, and this manifest describe the 93-row second-pass shape.
- `00-readiness-scorecard.md` through `11-access-path-rbac-ux-review.md` exist and describe the strategy, implementation, UX, security, verification, execution, CSV schema, decision, access-path, and RBAC/UX contracts needed for a 100% implementation-ready planning packet.
- `git diff --check -- .ai/16_user-experience` passes.
