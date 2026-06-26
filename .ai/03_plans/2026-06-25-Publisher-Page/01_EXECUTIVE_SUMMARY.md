# 01 — Executive Summary

## The headline

Archestimator's `/workshop/publisher` route is a 17-line stub (`src/app/workshop/publisher/page.tsx`) sitting on top of one of the most security-hardened publication + collaboration substrates in the repo. **The Publisher page is not new infrastructure — it is the missing unified admin surface above infrastructure that already exists.**

Today the user has to flip between three+ surfaces to manage sharing, RBAC, and client access:

- `ProjectTeamspaceHeader.tsx` right-rail modal at `/workshop/projects/[projectId]` (member list, role assignment, sheet access toggles, copy readonly project link)
- `ProjectPublicationHeader.tsx` (publication manager modal: password, recipients, sheet picker, snapshot rotation)
- `/share/[token]` receiver route (client view of a single publication, with comments + decision)
- `RecipientEmailComposer.tsx` + `SheetPickerList.tsx` (sub-components of the publication modal)
- Workspace settings (`/workshop/settings/workspace`) for workspace-level role management

**The Publisher page is the single home for all of it** — scoped to the workspace, project, or sheet depending on navigation context, with a unified activity feed, permission matrix, publication roster, and grant management UI.

---

## What already exists (do not rebuild)

| Capability | Where | Evidence |
|---|---|---|
| HMAC-SHA256 share-token hashing with pepper | `src/lib/publication/security.ts:71-74` | `hashPublicationToken(token, secret)` |
| AES-256-GCM recopy-token encryption | `src/lib/publication/security.ts:76-82` | `encryptPublicationToken` / `decryptPublicationToken` |
| scrypt password hashing + Unicode NFC normalization | `src/lib/publication/security.ts:121-159` | `hashPublicationPassword` / `verifyPublicationPassword` / `normalizePublicationPassword` |
| HttpOnly signed access cookies | `src/lib/publication/security.ts:177-325` | `createPublicationAccessCookieName` + HMAC-signed payload with `expiresAt` + `credentialVersion` + `tokenDigest` |
| Signed publication view tokens (snapshot binding) | `src/lib/publication/security.ts:252-277` | `createPublicationViewToken` embeds `snapshotVersion` + `tokenDigest` |
| CSRF tokens (POST + form-post) | `src/lib/publication/security.ts:161-175` | `createPublicPostCsrfToken` / `createPublicFormCsrfToken` |
| Same-origin enforcement | `src/lib/publication/security.ts:354-413` | `assertSameOrigin` / `assertSameOriginPublicPost` / `assertSameOriginPublicDelete` / `assertSameOriginPublicFormPost` |
| IP+token lockout (5 attempts / 15 minutes, progressive delays) | `src/lib/publication/security.ts:588+` | `isPasswordLocked` |
| Manager-action RBAC gate | `src/lib/publication/actions.ts:174-211` | `assertProjectPublicationManager(projectId)` — rank ≥ 30 (admin) required |
| Role rank computation (owner=40, admin=30, editor=20, viewer=10) | `src/lib/publication/actions.ts:167-170`, `src/lib/collaboration/actions.ts:63-65, 102-105` | numeric rank functions |
| Workspace CEO/admin bypass | `src/lib/publication/actions.ts:188`, `src/lib/repositories/workspace-repository.ts:1738, 1962, 2301` | `profile.role === "ceo" || profile.role === "admin"` |
| Sheet-level RBAC rank predicate | `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql:445` | `current_estimate_access_rank(target_estimate_id) >= 30` |
| Project-level RBAC rank predicate | same migration, line 279 | `current_project_access_rank(target_project_id) >= 30` |
| Access-mode enum (inherits-project / sheet-overrides / restricted) | same migration + `src/lib/collaboration/types.ts` | `estimate_sheet_access_settings.access_mode` |
| Publication API surface (7 endpoints) | `src/app/api/share/[token]/{password,activity,comment,decision,events,session,unsubscribe}` | full receiver-side pipeline |
| Publication manager server actions | `src/lib/publication/actions.ts` (10+ exported actions) | publish, rotate, revoke, republish, add/remove recipients, manage sheets |
| Invite flow (hashed tokens, 14-day expiry, accept/revoke/expire states) | `src/lib/collaboration/{actions,invite-entry,pending-invite}.ts`, `supabase/migrations/20260527115342_project_invite_entry_tokens.sql` | full lifecycle |
| Audit tables | `collaboration_audit_events`, `account_security_events`, `estimate_sheet_events`, `shared_link_events` | 4 separate audit surfaces |
| Test coverage | 427 vitest files + 20+ e2e specs | security-contract tests already enforce publication, collaboration, invite, share-header, RLS invariants |
| UI primitives | 60+ components in `src/components/ui/` | full design system: data-table, modal, toast, accordion, dropdown-menu, segmented-control, tabs, empty-state, badge, status-badge, search-input, skeleton, etc. |
| Workshop page shell | `src/components/workshop/WorkshopPageShell.tsx` | title + eyebrow + breadcrumbs + content slot — direct reuse |
| Liquid-glass sidebar | `src/components/sidebar/MainSidebar.tsx` + `SidebarNavItemRow` | nav infrastructure ready for a Publisher item |

---

## What the Publisher page must ADD

The capability gaps (with severity):

| Gap | Why it matters | Severity |
|---|---|---|
| **G1: Unified roster view.** No single screen shows "every publication I manage, its status, its open count, its stale-snapshot state, its comment pressure." | Builders flip between projects to triage. | HIGH |
| **G2: Granular per-recipient grants.** Today a recipient is binary (has access). Publisher needs view / comment / decision / future-edit per recipient. | Current model is "view + comment + decision" bundled. Edit-grant is a launch cut-line decision. | MED |
| **G3: "All sheets" vs "some sheets" editor scope at grant time.** Today `estimate_sheet_access_settings.access_mode = restricted` + per-sheet members expresses "some", but the manager UI is buried in the Teamspaces modal. | Builders cannot see scope at a glance. | HIGH |
| **G4: Consolidated activity feed.** Today comments, decisions, opens, grant changes, and publication rotations live in 4 separate audit tables. Publisher needs a unified per-project (or per-workspace) timeline. | Builders miss critical client signals. | HIGH |
| **G5: Sidebar nav entry.** No `Publisher` item exists in `MainSidebar`. | Discovery problem. | MED |
| **G6: Publication health surfaces.** Stale-snapshot warning exists (`types.ts:41-45`) but is buried per project. Publisher needs a rollup. | Trust: builders ship stale proposals. | MED |
| **G7: Bulk operations.** Bulk-rotate, bulk-revoke, bulk-add-recipient across multiple publications. | Operational efficiency at scale. | LOW (post-launch) |
| **G8: Rate-limit + abuse surface consolidation.** Today rate limits live in 4 places (publication password, comment, decision, digest). Publisher needs a single abuse dashboard for owners. | Future admin/ops. | LOW (post-launch) |

---

## The single most valuable next step

**Implement Phase 1 of `11_IMPLEMENTATION_PLAN.md`:** scaffold the Publisher page behind a feature flag, replace the 17-line stub with a server-component roster that lists publications visible to the current user (reusing `workspace-repository.ts` query patterns). This is the smallest coherent change that delivers user value, validates the data flow, and exposes the next layer of decisions (sidebar placement, filter UX, activity-feed design) before any new RPC or migration is written.

Phase 1 is **additive and reversible** — it does not touch existing share/collaboration code paths, only adds a new read surface. This matches the repo's pre-launch bias toward fast, useful iteration.

---

## What this plan is NOT ready to do

The plan identifies open product decisions in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`:

- **D1:** Recipient edit-grant model — not in MVP, but the schema decision affects the data model now.
- **D2:** "All-sheets" editor scope vs explicit per-sheet enumeration — UX cut-line.
- **D3:** Sidebar placement (top-level `/workshop/publisher` vs `/workshop/projects/[id]/publisher` vs both).
- **D4:** Should Publisher replace the Teamspaces + Publication manager modals, or coexist?
- **D5:** Workspace-level vs project-level vs sheet-level entry routing.

These are Philip's calls. The plan provides options + recommended paths but does not pre-decide them.

---

## Top three risks

| Risk | Mitigation |
|---|---|
| **R1: Privilege escalation via the new unified roster.** Aggregating many projects' publications into one view creates a new leak vector. | Server-component-driven roster; all queries go through existing RLS; no client-side filtering of privileged data. See `08_SECURITY_PRIVACY_THREAT_MODEL.md`. |
| **R2: Snapshot staleness at scale.** Publisher will surface stale snapshots; if the staleness check is O(N) per publication, the page becomes slow. | Use existing `staleSnapshotWarning` precomputation; add a single rollup RPC if measured. See `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`. |
| **R3: Concurrent work collisions.** Multiple active branches touch share/collaboration code (`feat/sidebar-redesign`, `codex/fix-project-delete`). Publisher must not edit those files until they merge. | Strict file-scope ownership in `11_IMPLEMENTATION_PLAN.md`. See `10_BLAST_RADIUS_AND_DEPENDENCIES.md`. |

---

## Readiness scores (initial — see `17_FINAL_READINESS_REVIEW.md` for final)

| Category | Score |
|---|---|
| Product strategy | 85 |
| Scope clarity | 80 |
| Requirements completeness | 75 |
| UX/UI readiness | 65 |
| Accessibility readiness | 60 |
| Architecture readiness | 85 |
| Data/database readiness | 75 |
| API/network readiness | 75 |
| Security/privacy readiness | 80 |
| Performance/scalability readiness | 70 |
| Reliability/operational readiness | 70 |
| Blast-radius coverage | 80 |
| Testing/validation readiness | 75 |
| Rollout/rollback readiness | 75 |
| Requirements traceability | 80 |
| **Overall implementation readiness** | **75** |

Scores below 100 are explained in `17_FINAL_READINESS_REVIEW.md` with the exact deficiency, affected document, and whether internally resolvable or externally blocked.
