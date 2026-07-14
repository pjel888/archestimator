# Estimate Sheet, Component Interoperability, And Shared Review Plan Pack

**Package:** `PLAN-2026-07-14-estimate-component-shared-review`  
**Suite:** `2026-07-12`  
**Run scope:** `PLAN_ONLY`  
**Package status:** `IMPLEMENTATION_READY`  
**Implementation status:** `NOT_STARTED`  
**Release status:** `NOT_EVALUATED`  
**Exact next unit:** `UNIT-001`

## Readiness Answer

With the modal/CRUD, Cloudflare schema, and beta-cleanup appendices added, this pack is sufficient to direct a proper implementation. Before those additions it identified selected-variant propagation risk but did not fully force one editor authority, every Library/Project/Estimate-row CRUD transition, attachment relational repair, authoritative read-back, or deletion of superseded feature paths.

“Regression” in this pack means preserving a current beta invariant while another defect is repaired. It does **not** authorize backward-compatibility layers, V1/V2 product paths, duplicate editors, feature-flag rollout, or support for hypothetical released clients.

## Target Result

Deliver one first-user MVP in which:

1. estimate area branches, tabs, rows, totals, and mutations stay correct under edits, moves, inserts, deletes, partial loading, and concurrent writes;
2. Library, Project, and Templates components interoperate without losing component identity, selected variants, images, attachments, row overrides, or project boundaries;
3. an issued estimate is immutable, client-safe, full width, financially reconcilable, and reviewable by estimate, area branch, row, and component; and
4. a real recipient can receive access, authenticate through password changes, discuss only authorized issued content, and approve, decline, or request changes under the issued decision policy.

The stop condition is not “the modal saves” or “the shared page renders.” The stop condition is a verified producer-to-consumer contract from private estimate authoring through immutable issue creation, recipient review, discussion, formal decision, audit, and notification.

## Why The Previous Audit Was Replaced

The previous folder was not a valid implementation-ready plan pack:

- it intentionally omitted `plan-pack.json`;
- it reduced implementation to variant attachment persistence;
- it excluded Templates and shared-review interoperability;
- it described dirty-working-tree behavior as if it existed at immutable `HEAD`;
- it claimed shared inline propagation was sound even though an edit opened from a row using `Option 2` can update the component default and collapse linked rows back to that option; and
- its proposed attachment upsert could transfer an existing blob path from an original component to a duplicate.

Those defects are removed rather than preserved as historical ceremony. The useful schema and attachment evidence is incorporated into the new current-state and interoperability documents.

## Baseline And Evidence Boundary

- Immutable Git baseline: `ad2187d23881b490009c45dd283d9ced82c12b10`.
- Current source of truth: the shared dirty worktree observed on `2026-07-14`.
- GitNexus index: useful for baseline call graphs, but stale relative to dirty source; every dirty-only claim is labeled as working-tree evidence.
- The scoped worktree already contains concurrent changes in estimate, component-library, and mutation files. Implementation must reread shared files and preserve unfamiliar work.
- This planning run changed only this plan-pack folder.
- No product tests, builds, browser automation, screenshots, or visual QA were requested or run.

## MVP Surfaces

### Private estimate-authoring path

1. **Area Branches** — estimate tabs, group/area hierarchy, expansion, selection, row counts, branch totals, DnD, and partial-load state.
2. **Estimate Sheet Content** — row insert/edit/move/delete/restore, calculations, history, optimistic state, save state, cache reconciliation, and scoped mutation feedback.
3. **Component Tabs** — Library, Project, and Templates browsing, create/edit/duplicate/move/archive, variant selection, image/attachment ownership, drag/drop, and insertion semantics.

### Client review path

1. build a consistent immutable issue from the same estimate tree and row/component identities;
2. expose only client-safe issued fields and opaque public IDs;
3. show totals by estimate, tab, and area branch with exact reconciliation;
4. allow comments on issued area branches, rows, and components;
5. enforce issue/section membership for every discussion target;
6. support recipient delivery, password and credential invalidation, section-scoped visibility, decisions, receipts, activity, and notifications.

## Highest-Priority Truths

### Launch blockers

- Recipient invitations generate a bootstrap token but current notification rows cannot deliver it; current queue IDs are rejected by the queue filter.
- Recipient verification writes only a cookie and does not make the recipient mutation-eligible.
- A personalized recipient session is not bound to the portal password credential version.
- Thread list/message reads do not reapply issue-section visibility policy.

### Data-integrity blockers

- Library inline edit does not target the initiating row's selected price option and blanket propagation overwrites every linked row with the default option.
- Add/Edit modal draft initialization confuses the initiating row's selected option with the component default.
- Project component fan-out treats variant selection and variant-derived fields as component-wide facts.
- the Components page still has a reduced `EditComponentDrawer` that cannot preserve the full variant/media graph.
- `linked-overridden` rows are included in automatic library synchronization and are reset to `linked-clean`.
- shared-library inline images originate from an estimate-row upload surface rather than component-owned storage.
- variant attachments are validated and carried by UI payloads but are not written by the price-option persistence plan.
- component moves are persisted as two independent writes; target failure can leave only the source committed.
- immediate edits can race normal library/project inserts.
- bulk delete does not enforce the client's expected row revisions.
- secondary-tab truncation is not surfaced to the UI and can make displayed totals incomplete.

### Issued-review blockers

- publication reads can produce a torn issue because estimates, rows, nodes, and tabs have no consistency fence;
- random public-ID namespaces make semantic no-op republish hashes unstable;
- issued rows lose component, variant, component-version, link-state, and row-revision identity;
- Client Portal discussion writes accept client-provided target IDs and labels without issue membership validation;
- legacy shared links support only proposal/estimate/row targets; Client Portal supports area targets but neither supports issued component targets;
- formal decisions do not fully evaluate required-approver policy or transition issue status;
- financial section source and grouping configuration can be ignored or silently substituted.

## Working Contracts To Preserve

- Project components remain project-scoped projections over estimate rows; no new project-component master table is required.
- Foreign-project drops are re-homed to a fresh project component identity.
- Make-project-specific is one atomic row mutation in the dirty worktree and must remain so.
- Estimate and public snapshots use canonical money calculation and public rows expose totals rather than private unit/misc rates.
- Issued Client Portal payloads are immutable and hash-addressed.
- Legacy publication public IDs are opaque and recipient comment routes already use origin, access, password, rate-limit, sanitization, and stale-view guards.
- Component Library list/detail loading is already split so unbounded history/attachment graphs hydrate on demand.
- Row-level loading must remain scoped to affected material/component cells with no numeric-column layout shift.
- Qty remains the active field after a project component is dropped into the sheet.

## Pack Reading Order

1. `README.md` — target, boundary, and stop condition.
2. `01-CURRENT-ARCHITECTURE-AND-EVIDENCE.md` — live producer/consumer map and corrected repository truth.
3. `02-MVP-REQUIREMENTS-AND-INVARIANTS.md` — requirements and non-negotiable domain behavior.
4. `03-FINDINGS-RISK-SECURITY-PERFORMANCE.md` — ranked defects and risk ownership.
5. `04-INTEROPERABILITY-AND-PUBLICATION-CONTRACT.md` — identity, mutation, template, issue, discussion, and decision design.
6. `05-ADD-EDIT-COMPONENT-MODAL-PRD-AND-AUDIT.md` — complete Add/Edit modal, Library/Project component, CRUD, row-transfer, and variant-scoped fan-out authority.
7. `06-CLOUDFLARE-COMPONENT-DATA-AND-STORAGE-SCHEMA.md` — exact component-related D1/R2/Queue schema, ownership, migration, and cleanup contract.
8. `07-BETA-FEATURE-PATH-CLEANUP-AND-SIMPLIFICATION.md` — direct-replacement cleanup and no-compatibility mandate.
9. `IMPLEMENTATION_PLAN.md` — canonical dependency DAG, file ownership, proof, recovery, and exact next unit.
10. `TRACEABILITY.md` — requirement-to-unit-to-evidence coverage and criterion challenge.
11. `LOOP_LEDGER.md` — append-only execution/resume record.

## Cross-Pack Ownership

- This pack is the integration authority for Estimate Sheet producer behavior, component/variant identity, and the issued-review consumer contract.
- `.ai/03_plans/2026-07-12/Workshop-Library-Audit/` retains standalone library-page work not required by these two MVP paths, such as unrelated AI/promotion/export administration.
- `.ai/03_plans/2026-07-13/Shared-Link-Page/` remains presentation-history evidence only. Its `COMPLETE` implementation claim does not close the newly evidenced recipient, target-membership, issued-component, decision, financial-scope, or scale gaps.
- The archived July 12 Client Portal audit is not reactivated. Relevant unresolved evidence is absorbed here because the current user request explicitly requires secure interoperability across both paths.

## Execution Posture

- Start with `UNIT-001`; do not jump to attachment persistence before selected-variant propagation is safe.
- Use one writer per shared file family. Parallelize only disjoint estimate, recipient-access, and publication lanes described in `IMPLEMENTATION_PLAN.md`.
- Use current working-tree source, not old pack prose, when they disagree.
- Run GitNexus impact before changing any indexed symbol. `buildLinkedEstimateRowsSyncStatement` is already assessed HIGH risk and requires an explicit blast-radius warning in the implementation handoff.
- Automated product tests remain `NOT_REQUIRED` until the user explicitly authorizes them. This pack does not carry a speculative regression-suite workstream.
- Static source, TypeScript/LSP, lint, D1 dry-run/schema validation, focused runtime diagnostics, and plan validators are the default evidence surfaces.

## Definition Of Done

The pack may be marked complete only when all of the following are evidenced:

- every `REQ-*`, `UX-*`, `DATA-*`, `OPS-*`, `SEC-*`, and `PERF-*` criterion is reconciled against current source;
- one full Add/Edit modal and one canonical mutation contract own every advanced component edit;
- no linked row changes selected variants or local overrides implicitly;
- all multi-row writes either commit completely or fail without partial persistence;
- every visible tab/branch total is complete or the surface is explicitly read-only/incomplete;
- templates insert with explicit current-source versus saved-snapshot behavior;
- issued component anchors are opaque, immutable, and valid only inside their issue;
- recipients can receive and redeem access, password/credential rotations revoke stale sessions, and hidden-section discussions stay hidden;
- discussion targets and labels are derived from the issued payload server-side;
- required-approver rules drive an atomic issue decision state and receipts;
- public financial views reconcile exactly to the issued total;
- notification/activity delivery has the correct audience and recoverable outbox state;
- the active related packs no longer contradict this completion state; and
- `validate:plan-pack`, `validate:planning-prompts`, `git diff --check`, and final change-scope review pass.
