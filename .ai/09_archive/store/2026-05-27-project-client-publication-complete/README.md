# Project Client Publication Plan

**Date:** 2026-05-27
**Status:** Implemented V1, hardening and closeout active. Product code, migration `20260527120000_project_client_publication.sql`, linked Supabase application/repair, public receiver routes, manager controls, password gating, and focused tests now exist; do not archive this folder until the remaining closeout gates in `15-implementation-closeout-and-remaining-gates.md` are resolved.
**Scope owner:** Project workspace header, client-safe publication links, receiver views, open tracking, security/privacy gates, and release runbooks.
**Source request:** Add a project-header group immediately left of Teamspaces for managing client/public publication links, similar in spirit to Notion publish, with optional passwords and open monitoring.

## Outcome

Create a safe, client-facing publication workflow that lets an authenticated project owner/admin publish a project package to an external receiver without making that receiver a Teamspaces collaborator.

The intended user promise is:

> Create a public, view-only client link, optionally require a password, and know whether it was opened.

## V1 Defaults

These defaults are the execution baseline unless Philip changes them before implementation:

| Decision | V1 default | Why |
| --- | --- | --- |
| Header label | `Public link` | Directly describes the action and avoids snapshot/publication jargon |
| Link field label | `Public link` | Matches the generated receiver URL and clarifies default open access |
| Receiver route | `/share/[token]` | Plain and outside `/workshop` |
| Scope | One project-level publication with selected estimate sheets | Valuable without multiplying route/schema paths |
| Content mode | Immutable sanitized snapshot created at publish/republish time | Avoids silent client-facing changes after internal edits |
| Access | High-entropy token plus optional server-validated password | Simple receiver path with bounded security controls |
| Manager permission | Project owner/admin only | Keeps external disclosure authority narrow |
| Downloads | Disabled in V1 | Avoids conflating current private XLSX export with published artifacts; PDF/download requires a later publication-aware artifact plan |
| Tracking | Metadata-only open count and latest-open timestamp | Useful without claiming legal review |
| Teamspaces relationship | Separate UI, route, schema, and permission model | Publication must never create membership |

The full authority record is `00-v1-decision-record.md`.

## Current Implementation Update

- Manager UI now uses `Public link` / `Public client link` / `View-only project page` language instead of `Publish project` or `Client publication snapshot`.
- Public links are open by default for anyone with the URL and remain view-only.
- Managers can generate a link, copy it, open it, update the public page, create a new public link, turn the link off, and set or remove a link password.
- Existing public links keep receiver access outside `/workshop` through `/share/[token]`; password-protected links render a generic password gate before any project snapshot data is loaded.
- The linked Supabase project `ebxxqidacheyapmmzavr` has the publication migration repaired into remote history as `20260527120000`.
- Release/archive closeout is still separate from implementation: full validation/build, final browser manager-action proof, legal/privacy launch gates, and code-review/detect-change evidence remain required.

## Non-Negotiable Boundaries

- Teamspaces remains where it is in the project header.
- The new `Publish` group sits immediately left of the existing Teamspaces group inside the current right-side project-header action slot.
- Published/client links do not create `workspace_members`, `project_members`, or `estimate_sheet_members`.
- Receiver routes live outside `/workshop` and do not render `WorkshopPageShell`, `ProjectMiniSidebar`, Teamspaces, Ask Flip, library panels, or internal workshop chrome.
- Public receiver and publication API routes authorize themselves; `/api` is not protected by the proxy.
- Anonymous users never get direct table reads for workspace, project, estimate, row, collaboration, or publication management tables.
- Raw tokens, token hashes, passwords, password hashes, magic links, service-role details, raw provider payloads, raw IP addresses, and raw referrer URLs must never be exposed to receivers or stored in public metadata.
- Owner/admin recopy of a client link requires an encrypted server-side token envelope; the receiver lookup path still uses only the keyed token hash.
- `Opened` means best-effort access signal only. Do not write `reviewed`, `approved`, `accepted`, `seen by client`, or legal-proof language until those workflows exist.
- Implementation requires red tests before product code.

## Current Repo Facts This Pack Depends On

- `/workshop/projects/[projectId]` is a protected live project dashboard with the shared project header and Teamspaces rail.
- `src/app/workshop/projects/[projectId]/layout.tsx` loads `getProjectCollaborationSummary()` and renders `ProjectWorkspaceHeaderRow`.
- `src/components/workshop/ProjectWorkspaceHeaderRow.tsx` currently passes only `ProjectTeamspaceHeader` into the header right action slot.
- `src/components/workshop/ProjectTeamspaceHeader.tsx` currently labels the internal authenticated route copy as `Share page`, `Project share link`, and `Copy share link`; this must be renamed to private-link language before publication ships.
- `/workshop` is the protected route prefix; `/share/[token]` must stay outside it.
- `/api` bypasses proxy auth in `src/proxy.ts`; publication APIs must validate token, status, password/session, permission, and cache policy themselves.
- Current proposal XLSX export is private, authenticated, and mutable against the current estimate. It is not an immutable publication artifact.
- `/privacy` and `/terms` are pending-review status pages. Public receiver tracking cannot launch until reviewed legal/privacy artifacts replace them.

## Document Map

Read and execute in this order:

1. `00-v1-decision-record.md` - locked defaults, hard blockers, and stop conditions.
2. `01-current-state-and-blast-radius-audit.md` - current seams, graph/code touchpoints, and blast-radius map.
3. `02-product-northstar-and-happy-paths.md` - actors, jobs, V1 happy paths, and success criteria.
4. `03-ux-ui-paths-and-prototypes.md` - manager header/modal states, receiver states, layout rules, and copy matrix.
5. `04-route-access-and-receiver-contract.md` - route families, access state machines, headers, password/session route flow, and public API contract.
6. `05-data-security-privacy-and-tracking-plan.md` - token/password/session/event/privacy/rate-limit threat model.
7. `06-teamspaces-coexistence-and-naming.md` - exact naming, private-link cleanup, and non-overlap with collaboration.
8. `07-tdd-qa-readiness-and-release-gates.md` - red-first test matrix and release gates.
9. `08-implementation-sequence-open-decisions.md` - staged execution, dependency order, and remaining owner gates.
10. `09-receiver-view-model-and-field-whitelist.md` - safe DTOs, field mapping, totals, media, and excluded data.
11. `10-content-mode-snapshot-and-export-contract.md` - snapshot/republish/export contract and future artifact boundaries.
12. `11-schema-rls-migration-and-rollback-runbook.md` - table shape, RLS/grants, migration proof, and rollback posture.
13. `12-security-rate-limit-and-session-runbook.md` - hashing, cookie/session, CSRF, rate limits, incident response.
14. `13-fixtures-browser-qa-and-release-evidence.md` - fixtures, browser smoke matrix, release evidence, and go/no-go checklist.
15. `14-agent-execution-handoff.md` - task backlog, ownership lanes, verification commands, and code-review handoff.
16. `15-implementation-closeout-and-remaining-gates.md` - implementation evidence, archive decision, and unresolved gates.

## Remaining Closeout Stop Conditions

Do not archive or release this plan if any of these are unresolved:

- The V1 decision record is changed but not reconciled across all downstream docs.
- Privacy Notice and Terms remain pending-review for public receiver/open-tracking launch.
- Content mode is not snapshot-based or does not have explicit live/current-view copy.
- Token/password/session/rate-limit rules are not covered by red tests.
- Receiver payload field whitelist is missing for any data surface the route will render.
- Supabase RLS/grants cannot be verified locally and against the linked remote before launch.
- The private Teamspaces share-link copy is still labeled as generic `Share`/`Project share link`.
- The owner/admin manager action path is not freshly proven after the latest UI/server-action changes.
- Full validation/build and code-review/detect-change evidence are missing.

## Execution Readiness Bar

Before archive:

1. Confirm V1 defaults in `00-v1-decision-record.md`.
2. Create red tests named in `07-tdd-qa-readiness-and-release-gates.md`.
3. Run graph/GitNexus impact analysis on exact symbols before editing code.
4. Use the implementation sequence in `08-implementation-sequence-open-decisions.md`.
5. Keep schema/security work separate from header/UI work until the tests define the contract.
6. Record all proof in `13-fixtures-browser-qa-and-release-evidence.md` and `15-implementation-closeout-and-remaining-gates.md`.

## Docs-Only Verification

For this plan pack:

```bash
git diff --check -- .ai/09_archive/store/2026-05-27-project-client-publication-complete .omx/context .omx/plans
```

For future implementation:

```bash
bun run validate
bun run build
git diff --check
```

Add `bun run test:e2e` when receiver routes, auth/proxy behavior, password gates, or browser-only publication flows are implemented.
