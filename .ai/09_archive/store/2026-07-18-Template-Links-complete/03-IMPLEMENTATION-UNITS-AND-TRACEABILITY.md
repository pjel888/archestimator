# Implementation Units And Traceability

## 1. Acceptance Criteria

| ID | Pass condition | Current |
| --- | --- | --- |
| `AC-001` | Additive migration, ordered version-1 backfill, composite tenant/resource constraints, target-scope triggers, ready/expired-job indices, typed projections, no historical-copy instances, and no inferred tabs for legacy content are proven. | `PASS` — migration `0092`, typed projections, and a fresh full local migration-chain apply prove the additive schema and no-inference backfill. |
| `AC-002` | Every confirmed master-owned mutation targets all active instances; each converges or exposes truthful updating/retryable-failed/terminal-failed state with class-permitted actions; detached instances are skipped. | `PASS` — immutable version fan-out, per-instance jobs, bounded immediate/cron drains, status projection, retry taxonomy, and detach guards are implemented. |
| `AC-003` | Template Editor and Estimate Sheet master commands cover zero/one/many scope, action-specific preview, stale reconfirmation, same-intent committed/not-applied/unknown resolution, single-flight state, one-owner bulk policy, no local shared Undo, and authoritative response. | `PASS` — shared mutation preview/confirmation, guarded intents, receipt-first recovery, and blocked unknown-outcome state are implemented and covered by focused tests. |
| `AC-004` | Linked/current/updating/failed visuals, Template-level progress query states, retryable/terminal recovery actions, deterministic multi-root ownership, sheet-level announcements, compact behavior, focus/scroll recovery, and detached/local rendering satisfy artifact `02`. | `PASS` — compact rails/badges, root ordinals, progress/failure controls, source navigation, retry/detach actions, and virtualized progress rendering are implemented. |
| `AC-005` | Master commit, instance apply, receipts, version ordering, live Component precedence, snapshot ownership, server-authoritative topology, history, publication revision, and detach/delete are atomic/idempotent at their declared boundaries. | `PASS` — D1 batch boundaries, monotonic reconciliation, live Component resolution, row CAS, receipts, history/publication updates, detach, and deletion preservation are implemented. |
| `AC-006` | Read/fan-out/insert/render budgets pass without N+1 queries, one-statement-per-item linked writes, job-state scans, broad cache replacement, or unrelated rerenders. | `PASS` — set-based JSON expansion, bind-budget assertions, indexed job claims, compact read projection, memoized branch props, and TanStack-virtualized progress avoid the prohibited shapes. |
| `AC-007` | Every insertion entry point, empty-source rule, duplicate, detach continuation, retry, instance delete, archive/restore IA, atomic master delete, historical copy, and composition behavior matches artifact `02`. | `PASS` — explicit linked/copy selection and fallback plus duplicate, retry, detach, instance delete, archive/restore, and detach-all permanent delete are implemented. |
| `AC-008` | D1 constraints/triggers plus every preview/mutation/job/reconcile/detach/delete guard prove workspace/project/estimate/tab/parent/template ownership and reject mismatched resources. | `PASS` — composite constraints, trigger guards, authenticated workspace lookups, scoped transactions, and negative authorization coverage protect every new path. |

## 2. Requirement Traceability

| Requirement | Source evidence | Decisions | Units | Criteria | Evidence target |
| --- | --- | --- | --- | --- | --- |
| `REQ-001` | `SRC-001` | `DEC-AUTO-001`, `DEC-AUTO-005`, `DEC-AUTO-015` | `UNIT-001`, `UNIT-002` | `AC-001` | `EVID-001`, `EVID-003` |
| `REQ-002` | `SRC-001`, `SRC-003` | `DEC-AUTO-004`, `DEC-AUTO-006`, `DEC-AUTO-009`, `DEC-AUTO-016`, `DEC-AUTO-019` | `UNIT-003`, `UNIT-004`, `UNIT-007` | `AC-002` | `EVID-001`, `EVID-003`, `EVID-004` |
| `REQ-003` | `SRC-002` | `DEC-AUTO-003`, `DEC-AUTO-012`, `DEC-AUTO-013`, `DEC-AUTO-018` | `UNIT-003`, `UNIT-005` | `AC-003` | `EVID-002`, `EVID-003` |
| `UX-001` | `SRC-002` | `DEC-AUTO-011`, `DEC-AUTO-014`, `DEC-AUTO-016`, `DEC-AUTO-019` | `UNIT-005` | `AC-004` | `EVID-002`, `EVID-003` |
| `DATA-001` | `SRC-001`, `SRC-003` | `DEC-AUTO-001`, `DEC-AUTO-003`, `DEC-AUTO-007`, `DEC-AUTO-009`, `DEC-AUTO-013`, `DEC-AUTO-014`, `DEC-AUTO-017`, `DEC-AUTO-018`, `DEC-AUTO-019` | `UNIT-001`, `UNIT-003`, `UNIT-004`, `UNIT-007` | `AC-005` | `EVID-001`, `EVID-003`, `EVID-004` |
| `PERF-001` | `SRC-001`, `SRC-002`, `SRC-003` | `DEC-AUTO-001`, `DEC-AUTO-004`, `DEC-AUTO-011`, `DEC-AUTO-016` | `UNIT-004`, `UNIT-005`, `UNIT-007` | `AC-006` | `EVID-001`, `EVID-002`, `EVID-003` |
| `OPS-001` | `SRC-001`, `SRC-002` | `DEC-AUTO-002`, `DEC-AUTO-005`, `DEC-AUTO-006`, `DEC-AUTO-008`, `DEC-AUTO-010`, `DEC-AUTO-013`, `DEC-AUTO-015`, `DEC-AUTO-017`, `DEC-AUTO-019` | `UNIT-002`, `UNIT-004`, `UNIT-006`, `UNIT-007` | `AC-007` | `EVID-001`, `EVID-002`, `EVID-003` |
| `SEC-001` | `SRC-001` | `DEC-AUTO-008`, `DEC-AUTO-009` | `UNIT-001`, `UNIT-003`, `UNIT-004`, `UNIT-006` | `AC-008` | `EVID-001`, `EVID-003` |

## 3. Source Register

### `SRC-001` — Current Template/D1 lifecycle

Primary paths:

- `migrations/0007_collaboration_invitations.sql`
- `migrations/0015_publication_admin_sidecars.sql`
- `migrations/0024_estimate_templates.sql`
- `migrations/0081_estimate_mutation_receipts.sql`
- `migrations/0082_estimate_row_integrity_constraints.sql`
- `src/lib/component-library/actions.ts`
- `src/lib/component-library/template-editor-actions.ts`
- `src/lib/estimates/d1-intents/templates.ts`
- `src/lib/estimates/estimate-tree-read-repository.ts`

Implementation conclusion: migration `0092` adds version, instance, mapping, job, and intent state with composite ownership constraints and same-resource triggers. Existing copy insertion remains independent; new linked insertion creates durable identity only for new, valid whole-Template inserts.

### `SRC-002` — Current React/UX lifecycle

Primary paths:

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`
- `src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts`
- `src/components/workshop/estimate-sheet/rows/branch.tsx`
- `src/components/workshop/estimate-sheet/rows/virtual-branch-list.tsx`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `src/components/workshop/library/template-editor/`
- `src/hooks/use-estimate-query.ts`

Implementation conclusion: Template mutation confirmation and retained intent recovery now mirror the proven shared Component controls. Compact link state is projected into memoized recursive/virtualized branches, while the Template Editor owns virtualized global progress and recovery.

### `SRC-003` — Current Cloudflare/worker constraints

Primary paths and sources:

- `worker.ts`
- `wrangler.jsonc`
- `src/lib/cloudflare/client-portal-notification-queue.ts`
- [D1 Database API](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- [Queues delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/)

Implementation conclusion: `ARCH_DB` owns durable propagation and intent state, immediate requests drain bounded work, and the existing five-minute schedule resumes both paths without adding or repurposing a Queue.

### `SRC-004` — Selected planning authority

`00-PLAN.md` resolves implementation boundaries and sequencing from the current evidence. It is not implementation proof.

## 4. Exact File Ownership By Unit

| Unit | Owned surface | Shared-file caution |
| --- | --- | --- |
| `UNIT-001` | migration, Template/link/intent domain types, read repositories | Reread `types.ts` and both repositories before edits; other Estimate work frequently touches them. |
| `UNIT-002` | Template insertion D1/action/hook/picker | Preserve current multi-template atomic copy and unavailable-source confirmation. |
| `UNIT-003` | impact/mutation services, editor/actions, command classifier | `actions.ts` and `EstimateSheetContent.tsx` are shared high-churn files; keep adapters thin. |
| `UNIT-004` | reconciler/jobs/component interop/history | Do not regress linked Component row fan-out or mutation receipt identity. |
| `UNIT-005` | branch/virtualization/row handlers/query cache/editor UX | Avoid moving unrelated sheet state into `EstimateSheetContent.tsx`. |
| `UNIT-006` | Template/instance lifecycle actions and menus | Replace current hard delete deliberately; do not alter Component permanent-delete semantics. |
| `UNIT-007` | Worker schedule, job drain, observability | Combine five-minute scheduled responsibilities; do not repurpose queues or add a cron. |
| `UNIT-008` | scoped verification and pack/state reconciliation | No broad refactor or unrelated cleanup. |

## 5. Data Integrity Checklist

`GATE-DATA-001` passes because all are true:

- [x] version `1` exists for every current Template after migration;
- [x] no migration/backfill creates an instance for an existing Estimate copy;
- [x] migration `0092` does not assign tabs to legacy tabless Estimate nodes;
- [x] active instance rows have non-null `template_id`; detached rows do not;
- [x] instance insert/update rejects mismatched Template/workspace, project/workspace, estimate/project, tab/estimate, and parent/tab chains;
- [x] node/row mapping insert/update rejects a target outside the instance workspace/Estimate while retaining a missing-target mapping for deterministic repair;
- [x] job insert/update rejects a mismatched instance/workspace/Template tuple;
- [x] one unresolved Template mutation intent owns the normalized server payload and survives client close/reload without permitting a second intent;
- [x] `applied_version_number <= target_version_number` always holds;
- [x] each active master node/row has at most one mapping per instance;
- [x] each mapped Estimate node/row belongs to only one source ID within the instance;
- [x] master node/row deletion cannot erase a mapping before reconciliation;
- [x] linked insert creates source graph, instance, mappings, history, publication revision, and receipt atomically;
- [x] master mutation creates source version and every active target job atomically;
- [x] instance apply is atomic and monotonic;
- [x] local takeoff fields survive source updates;
- [x] newer Component versions never regress;
- [x] retrying an old Template version cannot write Component-owned values from `snapshot_json`;
- [x] detach leaves all Estimate content and removes every active mapping/job;
- [x] master permanent delete cannot cascade into Estimate content;
- [x] detach-all permanent delete commits a surviving tombstone result to the non-FK intent row before deleting the Template header;
- [x] estimate/project/workspace deletion cleans instance state without damaging the master;
- [x] every retry is idempotent and uses a retained intent/job identity;
- [x] terminal job classes cannot reset or enter bulk retry, while `attempts_exhausted` can reset only through the guarded server path;
- [x] malformed cross-workspace/project/estimate/tab/parent/mapping/job SQL fixtures fail with the declared trigger/FK error and mutate zero rows.

## 6. UX/Performance Checklist

`GATE-UX-001` passes because all are true at the local source/static verification boundary:

- [x] picker, single drop, multi-Template drop, subtree drop, Template composition, and save-as-Template follow the exact linked/copy matrix;
- [x] empty Templates cannot create an invisible linked instance;
- [x] linked insertion rejects tabless/archived targets before mutation and offers an explicit retained-target copy fallback;
- [x] every master-owned action warns before optimistic mutation;
- [x] one active linked instance warns just as many instances do; zero-instance Template Editor edits do not show a false impact warning;
- [x] mixed local/shared and multi-master bulk commands fail before mutation while supported one-master bulk commands create one revision;
- [x] propagated shared commits never enter local Undo;
- [x] impact counts and bounded Estimate details match the confirmed fingerprint;
- [x] a post-submit disconnect retains one intent; receipt-first replay resolves committed or definite not-applied, while repeated transport failure stays visibly unknown and blocks a new same-Template shared mutation;
- [x] local quantity/adjustment actions do not warn or query Template impact;
- [x] linked-current/updating/failed states are textual and accessible;
- [x] Template Editor has a persistent global progress/failure owner with all/per-instance retry and authorized navigation;
- [x] global progress covers loading, stale-cache, query-error-with-cache, and query-error-empty without conflating query retry with job retry;
- [x] retryable/terminal failure classes expose only permitted actions, and server-side bulk retry excludes terminal instances;
- [x] detach from any descendant always previews the complete instance, last applied version, abandoned target, and no-auto-replay behavior;
- [x] recursive and virtualized branches show consistent rails/badges;
- [x] multi-root instances have stable ordinals, one primary visual action owner, context access from every root, and one sheet-level announcement owner;
- [x] no linked visual changes row height or scroll position;
- [x] dirty row drafts survive non-conflicting refresh; authoritative row deletion retains a bounded recoverable session draft and moves focus predictably without pausing D1;
- [x] topology changes preserve a surviving stable-ID viewport anchor/expansion/selection or use the declared sibling/parent fallback;
- [x] initiating instance updates first or immediately shows truthful pending state;
- [x] polling exists only while visible work is pending;
- [x] unrelated branches/rows do not rerender from unstable link props;
- [x] artifact `02` read, request, job, and render budgets are enforced by indexed/set-based source shapes, bind-budget coverage, compact projections, memoization, and virtualization; browser timing remains outside this local evidence set.

## 7. Focused Verification

The user explicitly authorized focused implementation testing. The following scoped suite passed:

```text
bunx vitest run tests/vitest/template-editor-actions-authz.test.ts tests/vitest/template-editor.test.tsx tests/vitest/cloudflare-scheduled-upload-jobs.test.ts tests/vitest/estimate-template-trusted-insert.test.ts tests/vitest/library-template-insert-picker.test.tsx tests/vitest/estimate-sheet-branch-header-ui.test.tsx tests/vitest/component-library-d1-bind-budget.test.ts tests/vitest/template-intent-recovery.test.ts --maxWorkers=1
```

Result: 8 files and 64 tests passed. The suite covers linked/copy insertion, authorization, shared mutation behavior, Worker scheduling, branch status UI, D1 bind budgets, and unknown-outcome intent recovery.

Additional fresh evidence:

- `bun run type-check` passed;
- changed-file ESLint exited 0 with warnings only;
- a fresh full local D1 migration chain applied through migration `0092`;
- `git diff --check` passed.

Browser automation, screenshots, deployment, remote migration apply, and hosted proof were not run and are not required by the local implementation ceiling. Release status therefore remains `NOT_EVALUATED`.

## 8. Risk To Unit Mapping

| Risk | Owning units | Required disposition |
| --- | --- | --- |
| `RISK-001` source/impact/outcome race | `UNIT-001`, `UNIT-003`, `UNIT-004` | durable normalized intent, exact version/fingerprint guards, receipt-first replay, and stale recovery evidence |
| `RISK-002` partial propagation | `UNIT-004`, `UNIT-007` | per-instance atomicity, applied/target UI, durable retry |
| `RISK-003` field/component overwrite | `UNIT-004`, `UNIT-005` | ownership matrix and current Component guard |
| `RISK-004` render fan-out | `UNIT-005` | stable scalar projection and render evidence |
| `RISK-005` delete/orphan drift | `UNIT-001`, `UNIT-006` | FK/check design, atomic detach, delete simulations |
| `RISK-006` cron recovery latency | `UNIT-007` | immediate drain, metrics, bounded schedule; Queue only after evidence |
| `RISK-007` historical copy misclassification | `UNIT-002`, `UNIT-006` | zero automatic backfill and explicit copy/link UI |
| `RISK-008` cross-workspace access | `UNIT-001`, `UNIT-003`, `UNIT-004`, `UNIT-006` | workspace guards and negative evidence |

## 9. Independent Review Checklist

The final checker must challenge, not restate, the plan:

1. Can a mapping survive source deletion long enough to delete the right Estimate row/node?
2. Can two rapid versions or an expired lease regress `applied_version_number`?
3. Can detach and a processor commit concurrently?
4. Can a Template snapshot overwrite a newer Component version or local quantity?
5. Can the source commit succeed without creating work for one active instance?
6. Can a failed instance become invisible or appear current?
7. Can master hard delete cascade into an Estimate?
8. Can any preview/job/reconcile query omit workspace/project ownership?
9. Can tab/parent/mapping/job rows be inserted with a mismatched resource chain despite request guards?
10. Does virtualized rendering communicate a multi-root instance once, keep actions reachable, and restore focus/scroll after topology changes?
11. Can mixed bulk, local Undo, or a dirty-row draft resurrect master-deleted content or create more than one hidden source revision?
12. Can a user in the Template Editor find and recover every partial/failed propagation outcome?
13. Can a disconnect after submit create a second intent/version or leave the user free to issue a conflicting shared mutation while outcome is unknown?
14. Can terminal access/scope/component/mapping failures appear bulk-retryable, or can a progress query error masquerade as job failure?
15. Do empty, archived, compact-width, updating-detach, and permanent-delete flows have one unambiguous entry and exit?
16. Does the proposed validation respect the user-controlled test gate?

Any unresolved P0/P1 answer keeps `GATE-VERIFY-001` failed.

## 10. Completion Audit

`UNIT-001` through `UNIT-008` are verified. Every accepted requirement maps to a passing acceptance criterion, all three gates pass, all declared risks have implemented mitigations, and no ready slice or next unit remains. `AUTH-001` continues to exclude hosted apply/deploy, so release status remains `NOT_EVALUATED` while the plan lifecycle advances to archival.
