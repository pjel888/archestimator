# Independent Review

## Review Scope

Two independent, read-only review lanes examined the planning artifacts and
current source before the manifest was written:

- **Code review lane:** implementation readiness, traceability, ownership,
  migration safety, and validation-policy correctness.
- **Architecture/critic lane:** Joyride v3 semantics, collaborator eligibility,
  state-machine integrity, concurrency, scope, and simplicity.

Neither lane edited source, ran product tests, ran builds, used browser
automation, or changed D1. Both returned `NOT READY` on the first pass. Neither
reported a `P0`.

## Initial Findings And Resolutions

| ID | Priority | Initial finding | Resolution in this pack |
| --- | --- | --- | --- |
| `REV-001` | P1 | Safe post-auth return intent lacked an owner and acceptance trace. | Added `SEC-002`, `AC-011`, `TEST-007`, and exact auth/login/terms/setup path ownership in `UNIT-003`; `03-ARCHITECTURE-DATA-AND-VERIFICATION.md` defines sanitization, fragment handling, reauthorization, and fallback. |
| `REV-002` | P1 | A proposed `estimate_created` activation milestone would require unsafe partial taxonomy changes. | Rejected the new milestone. The checklist reads authorized `estimates` truth instead. `UNIT-002` still rebuilds all four existing activation tables in migration `0101` to repair lifecycle FKs while preserving the existing taxonomy, rows, checks, and indexes. |
| `REV-003` | P1 | Privacy erasure, access removal, legal hold, and account deletion semantics conflicted. | Split the lifecycle into workspace-scoped erasure, final-access removal, and full-account deletion; defined hold behavior, retained-row ownership, global-profile treatment, file ownership, ordering, and evidence in `01` and `03`. |
| `REV-004` | P1 | Optional product tests were incorrectly modeled as an authorization boundary. | Removed the `AUTH-*` record. Product, build, and browser checks remain unrun `TEST_PROPOSAL` records; `UNIT-008` must keep behavioral criteria failed until fresh behavior evidence exists. |
| `REV-005` | P2 | The whole-application audit was categorical rather than exhaustive. | Added `04-ROUTE-AND-OVERLAY-INVENTORY.md` with one disposition for all 72 active `page.tsx` routes and reconciliation rules for public exclusion, redirects, auth return, hosts, contextual targets, and help-only surfaces. |
| `REV-006` | P2 | Modal/focus coordination lacked a whole-app signal and concrete owners. | Defined one shared `modal-lifecycle.ts` contract, exact open/close/focus-restored sequencing, shared primitive changes, and adapters for all 23 direct Workshop/Support modal owners inventoried in `04`; `UNIT-003` owns the integration. |
| `REV-007` | P2 | Unit ownership used placeholders and allowed shared-file contention. | Replaced placeholders with exact paths, made `UNIT-001` the sole catalog writer, introduced a synchronization barrier, and made shared-path handoffs sequential. |
| `REV-008` | P1 | The proposed state FK excluded project-only and estimate-only collaborators. | Made `workspaceRole` nullable, added `accessSource` and `effectiveRole`, authorized from current workspace/project/estimate grants, anchored state to workspace lifecycle, and prohibited synthetic membership creation. |
| `REV-009` | P1 | Close, Escape, Skip, pause, replay, restart, and reset semantics were conflated. | Defined Close/Escape and app-modal interruption as resumable pause, Skip/Don't show again as durable dismissal, replay as non-regressive, restart as a new generation, and reset-all as an atomic server-resolved transition. |
| `REV-010` | P1 | Events lacked idempotency/run identity and reset-all was ambiguous. | Added `request_fingerprint`, `run_id`, and `launch_mode`; specified CAS/idempotency mismatch behavior and all-or-nothing reset-all over eligible current-version flows. |
| `REV-011` | P2 | Product metrics lacked denominators, windows, and targets. | Defined beta cohorts, observation windows, denominators, and targets for time-to-valid-total, activation conversion, dismissal, and target failure in `02`. |
| `REV-012` | P2 | The first delivery included too many advanced tours. | Limited beta-v1 post-value guides to `library_reuse` and `client_sharing`; retained audited modules as help-only or deferred decisions instead of extending the first-run tour. |
| `REV-013` | P1 | The review record and manifest were missing. | Added this record and `plan-pack.json`; readiness remains conditional on fresh manifest/static validation and a final independent read-only review. |

## Preserved Strengths

- The pack keeps profile setup, workspace setup, activation truth, and
  instructional progress as separate concepts.
- Joyride remains an uncontrolled, dynamically loaded authenticated client
  island with semantic targets and semantic resume resolution.
- The first experience is short and capability-aware; the estimate guide is
  route-local and cannot create business data merely to advance itself.
- Replay/reset preserve activation and business truth.
- Mobile navigation, virtualized targets, modal focus, missing targets,
  reduced motion, empty states, and support recovery are explicit contracts.
- Migration `0101` remains fix-forward and does not renumber historical files.

## Final Review Status

`READY WITH FIXES` — both closeout-only fixes were applied after the review.

The final independent read-only reviewer found no `P0` or `P1`, confirmed that
all initial material findings were resolved in substance, and independently
observed:

- the plan-pack validator passing;
- migration head `0100` with `0101` available;
- all 72 active `page.tsx` routes represented;
- the current 23-file direct modal-owner search surface represented; and
- no installed `react-joyride` dependency before `UNIT-001`.

The reviewer requested two minimal closeout repairs:

1. replace this document's pending verdict and promote final review evidence;
2. prevent a planning-audit `PASS` receipt from appearing to prove a still
   unimplemented acceptance criterion.

Both are resolved in the final manifest: `EVID-004` is the passed independent
review receipt, while `AC-001` now points to separate planned implementation
evidence instead of the passed current-state audit receipt.

## Improvement Challenge Pass

After the plan-improvement rewrite, one new independent, read-only critic
evaluated the final outcome contract against:

- `Improve-Plan-Prompt.md`;
- `Create-Implementation-Prompt.md`;
- `Frontier-Planning-Kernel.md`;
- `Plan-Pack-Schema.md`;
- `Multi-Agent-Execution-Directive.md`; and
- every artifact in this pack.

The critic returned `PASS` with no material finding. It specifically confirmed:

- `IMPLEMENTATION_PLAN.md` is the one canonical execution artifact;
- `UNIT-001` is startable with no routine question;
- assignment ownership, permissions, timeout, retry, evidence, test decision,
  and handoff fields are present;
- the accepted hybrid onboarding outcome and exclusions remain intact;
- planning evidence is not represented as implemented product behavior; and
- source seams still show no installed Joyride dependency, migration head
  `0100`, and 72 active `page.tsx` routes.

During lead closeout, two non-material consistency edits strengthened the
reviewed surface without changing outcome, scope, DAG, or ownership: assignment
terminal statuses were normalized to the directive's
`COMPLETE|PARTIAL|FAILED|CANCELLED` vocabulary, and the proposed source layout
was frozen to the unit-owned paths rather than leaving relocation to executor
judgment. The lead rechecked those clauses against the directive before the
final hash and validator refresh.

## Manifest Interpretation

- `UNIT-*=READY` means the implementation contract is executable without a
  routine design choice being delegated to the executor.
- `AC-*=FAIL` and `GATE-*=FAIL` mean product behavior is not implemented or
  freshly proved yet; they do not contradict plan readiness.
- `EVID-001` through `EVID-005` prove planning inputs, audit completeness,
  current-source grounding, and review readiness only.
- `EVID-006` through `EVID-011` are planned implementation evidence and remain
  non-passing until their named behavior is implemented and actually observed.
