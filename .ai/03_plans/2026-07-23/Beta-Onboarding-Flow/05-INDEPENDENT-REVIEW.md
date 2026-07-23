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
| `REV-002` | P1 | A proposed `estimate_created` activation milestone would require unsafe partial taxonomy changes. | Rejected the new milestone. Project/Estimate checklist truth comes only from the closed successful Blank/Duplicate/Template-derived creation families or seven Estimate Sheet mutation families after authoritative save/readback in an authorized current resource context. `UNIT-002` still rebuilds all four existing activation tables in migration `0101` to repair lifecycle FKs while preserving the existing taxonomy, rows, checks, and indexes. |
| `REV-003` | P1 | Privacy erasure, access removal, legal hold, and account deletion semantics conflicted. | Split the lifecycle into workspace-scoped erasure, final-access removal, and full-account deletion; defined hold behavior, retained-row ownership, global-profile treatment, file ownership, ordering, and evidence in `01` and `03`. |
| `REV-004` | P1 | Optional product tests were incorrectly modeled as an authorization boundary. | Removed the `AUTH-*` record. Product, build, and browser checks remain unrun `TEST_PROPOSAL` records; `UNIT-008` must keep behavioral criteria failed until fresh behavior evidence exists. |
| `REV-005` | P2 | The whole-application audit was categorical rather than exhaustive. | Added `04-ROUTE-AND-OVERLAY-INVENTORY.md` with one disposition for all 72 active `page.tsx` routes and reconciliation rules for public exclusion, redirects, auth return, hosts, contextual targets, and help-only surfaces. |
| `REV-006` | P2 | Modal/focus coordination lacked a whole-app signal and concrete owners. | Defined one shared `modal-lifecycle.ts` contract, exact open/close/focus-restored sequencing, shared primitive changes, and adapters for the 23 direct Workshop/Support modal owners found by the canonical search; `UNIT-003` owns the integration. |
| `REV-007` | P2 | Unit ownership used placeholders and allowed shared-file contention. | Replaced placeholders with exact paths, made `UNIT-001` the sole catalog writer, introduced a synchronization barrier, and made shared-path handoffs sequential. |
| `REV-008` | P1 | The proposed state FK excluded project-only and estimate-only collaborators. | Made `workspaceRole` nullable, added `accessSource` and `effectiveRole`, authorized from current workspace/project/estimate grants, anchored state to workspace lifecycle, and prohibited synthetic membership creation. |
| `REV-009` | P1 | Close, Escape, Skip, pause, replay, restart, and reset semantics were conflated. | Defined Close/Escape and app-modal interruption as resumable pause, Skip/Don't show again as durable dismissal, replay as non-regressive, restart as a new generation, and reset-all as an atomic server-resolved transition. |
| `REV-010` | P1 | Events lacked idempotency/run identity and reset-all was ambiguous. | Added `request_fingerprint`, `run_id`, and `launch_mode`; specified CAS/idempotency mismatch behavior and all-or-nothing reset-all over eligible current-version flows. |
| `REV-011` | P2 | Product metrics lacked denominators, windows, and targets. | Defined beta cohorts, observation windows, denominators, and targets for time-to-valid-total, activation conversion, dismissal, and target failure in `02`. |
| `REV-012` | P2 | The first delivery included too many advanced tours. | Initially limited beta-v1 post-value guidance to `library_reuse`. This historical resolution was later superseded by the user's explicit MVP direction in `DEC-AUTO-022`: Client links is now one task-launched manager curriculum, not part of the first-run orientation or an invitation to tour every advanced module. |
| `REV-013` | P1 | The review record and manifest were missing. | Added this record and `plan-pack.json`; readiness remains conditional on fresh manifest/static validation and a final independent read-only review. |

## Beta Comprehension Challenge

The user's beta-readiness question added a stricter outcome than the original
tour-system review: implementation must make Estimate Sheet comprehension
observable rather than merely make guidance available. A new source-mapping
lane and two independent read-only challenge lanes examined the live guided
sample, activation writers, zero state, Estimate Sheet hierarchy, Library
surfaces, and this pack.

Their first verdict was `FAIL` for the expanded outcome. The material findings
and plan repairs are:

| ID | Priority | Challenge finding | Resolution in the expanded pack |
| --- | --- | --- | --- |
| `REV-014` | P1 | The current guided sample creates a project, estimate, Area, priced row, and valid total through normal activation writers, so seeded value can bypass every meaningful learning step. | Added `DATA-003`, `DEC-AUTO-018`, `AC-013`, and `TEST-008`; activation `source` remains the producer taxonomy while non-forgeable `origin_class='tutorial_seed'` marks generated writes, which cannot earn guided-practice or independent-activation credit or suppress required user-action lessons. |
| `REV-015` | P1 | The original requirements and traceability promised speed to value but never required evidence that a beta user understood or could repeat Estimate Sheet work. | Added `UX-005`, `AC-012`, required price/save and add/source predicates, a separate non-starter transfer signal, and explicit `UNIT-004`/`005`/`006`/`008` ownership. |
| `REV-016` | P1 | No unit owned expanding the one-Area/one-row sample into a useful tutorial or safely recovering it. | Expanded `UNIT-005` to own the current guided-sample writers and every project/node/row activation producer, exact bounded seed, persisted tutorial binding, unique atomic claim, reader variant, archive/fresh-copy lifecycle, and sequential action ownership. |
| `REV-017` | P2 | The sample was too shallow to teach hierarchy or row math, and user-facing Area/Branch terminology drift could produce the wrong mental model. | Frozen one realistic residential fit-out project with one estimate, one main sheet, parent plus three Areas, three-to-five purposeful rows, explicit quantity/price/save instruction, and Area-normalized user copy. |
| `REV-018` | P2 | Automatically seeding several projects, Components, or Templates would add clutter without proving reuse comprehension. | Limited beta v1 to one tutorial project; prohibited permanent auto-seeded catalogs; made one normal-action Component reuse task and an optional Template capstone the only reusable-asset learning scope. |

The challenge lanes agreed on the scope boundary: one deep tutorial project is
necessary; multiple samples, a full academy, and a permanent starter catalog
are not.

## Expanded-Scope Pre-Closeout Review

A final independent read-only reviewer initially returned `FAIL` with no `P0`
and two `P1` findings plus one `P2`. The lead accepted all three:

| ID | Priority | Final-review finding | Repair |
| --- | --- | --- | --- |
| `REV-019` | P1 | The pack asserted tutorial-seed classification, but live project/node/row activation producers hard-code normal sources and were outside the complete write allowlists. | Preserved the existing `source` taxonomy, added a separate non-forgeable activation `origin_class`, assigned `projects/actions.ts`, `estimates/actions.ts`, and both node/row intent files to `UNIT-005`, prohibited serialized origin input, and added producer/outbox/event assertions to `TEST-002` and `TEST-008`. |
| `REV-020` | P1 | Practice required the same tutorial generation, but flow persistence carried only generic instructional generation and fresh-copy races/old receipts were undefined. | Added nullable tutorial version/generation to guided-practice state/events, Project identity and active-owner unique indexes, checked initial-claim and archive/rebind/create batches, stale-binding conflict semantics, and concurrent/stale-receipt assertions to `TEST-001` and `TEST-008`. |
| `REV-021` | P2 | One learning-outcome list made non-starter transfer sound required for tutorial completion while later sections made it non-blocking. | Split the outcome into tutorial core, optional depth, and later independent transfer; only the two required current-binding actions close the tutorial flow, while transfer remains separate product-level comprehension evidence. |

Formal manifest reciprocity and `git diff --check` had passed before these
repairs. Product tests, builds, browser automation, screenshots, and D1 changes
remained unrun/not performed under the planning and user-test boundaries.

## Expanded-Scope Final Review Status

`PASS` — the final independent read-only reviewer found no `P0` or `P1`.

The reviewer confirmed:

- activation `source` remains producer taxonomy while server-only,
  non-forgeable `origin_class` reaches outbox/events;
- UNIT-005 owns every live project/node/row producer required to thread
  tutorial origin;
- instructional generation and tutorial version/generation are separately
  persisted;
- unique Project claims, CAS/`changes()`-guarded fresh-copy, and stale-receipt
  exclusion are executable;
- TEST-001/002/008 cover migration, origin, binding, concurrency, and practice;
- tutorial core, optional depth, and later transfer are consistent; and
- manifest reciprocity, including AC-013 <-> TEST-001, passes.

At review time the read-only validator had only expected hash drift pending
canonical refresh. Product tests, build, browser automation, screenshots, D1
mutation, and deployment remain unperformed because this is a planning-only
task and those tests were not authorized.

## User-Directed Starter Workspace Expansion

After the expanded-scope `PASS`, the user explicitly superseded `REV-018` and
`DEC-AUTO-019`: beta users should not land in an empty account with only one
isolated tutorial. The pack now requires a small default starter workspace that
teaches organization and reuse by inspection before asking the user to invent
their own examples.

The revised bounded contract is:

- three shared Projects/four Estimate Sheets: Tutorial, two-sheet Reference,
  and ungrouped Sandbox;
- one per-user **Starter Examples** Project group containing shared Tutorial
  and Reference, while Sandbox remains Ungrouped;
- six persisted workspace Components across exactly two created/claimed custom
  folders plus existing protected `Uncategorized`, including a two-variant
  example; and
- three persisted workspace Templates across two categories.

The expansion does not revive an unbounded demo estate. It adds closed manifest
keys, workspace-versus-user claims, asset-level resumable installation,
an exact new/pre-existing-empty/joining auto-install predicate, explicit add for
non-empty existing workspaces, inactive-key restore with per-asset generations,
no recurring login repair, visible starter labeling, normal
edit/archive/delete behavior, and distinct `starter_seed`, `tutorial_seed`, and
`user_domain` origin. Starting Guided tutorial explicitly creates one normal
workspace practice Project outside starter cardinality rather than silently
creating a duplicate Tutorial for every joining editor. Installation,
presence, route visits, or opens earn no checklist value, practice, reuse,
activation, or independent-transfer credit; only the closed successful
creation/mutation families remain eligible user-domain checklist activity, and
seed events remain auditable without advancing `beta_activation_progress`.

The earlier `PASS` is historical and does not prove this revised starter-pack
scope. Fresh independent read-only review and manifest/static validation are
required before closeout.

## Starter-Expansion Review Findings

A fresh independent read-only review returned `CHANGES REQUIRED` with no `P0`,
two `P1`, and three `P2` findings. The lead accepted and repaired all five:

| ID | Priority | Starter-expansion finding | Repair |
| --- | --- | --- | --- |
| `REV-022` | P1 | The pack both denied checklist credit for seeded views and allowed deliberate starter opens to complete the first two checklist tasks. | Removed open-based completion. Generation, presence, route visits, and opens complete nothing; only the closed successful user-domain creation/mutation families may establish the matching Project/Estimate checklist facts after authoritative save/readback. |
| `REV-023` | P1 | “Existing empty workspace” had no executable predicate and joining-editor behavior was ambiguous. | Defined `isStarterAutoInstallEligible` as zero `projects`, `cost_library_items`, `estimate_templates`, `project_groups`, and non-default `library_folders`; ignored only `is_default_category = 1`; separated new-workspace, pre-existing-empty, non-empty explicit-add, and joining-editor paths; and made existing `installing`/`partial` state resume before emptiness evaluation. |
| `REV-024` | P2 | Restore alternated between “missing” and “missing/archived,” leaving the lifecycle boundary unclear. | Defined inactive/missing-from-active-pack as no active claim/resource graph with latest claim `missing` or `archived`; restore creates only those keys at generation `N+1` and never repairs an active asset. |
| `REV-025` | P2 | `UNIT-004` acceptance depended on later `UNIT-005` action wiring. | Limited `UNIT-004` acceptance to rendering the server snapshot/state shell; `UNIT-005` owns install/resume/restore integration and the end-to-end creator path. |
| `REV-026` | P2 | The manifest appeared to create/claim protected **Uncategorized** instead of resolving the existing system folder. | The installer creates/claims exactly two custom folders, resolves/ensures **Uncategorized** through the existing `is_default_category = 1` Library invariant without a starter folder claim, and claims only `General Labor Allowance` beneath it. |

The lead also repaired a source-derived multi-user clutter risk before
re-review: current Project collections are workspace-visible, so the pack now
installs one shared Tutorial and never silently creates a per-user Tutorial for
joining editors. A personal `Practice — Residential Fit-Out` Project is created
only by an explicit Guided tutorial command, after ordinary workspace
visibility is disclosed, and is outside the starter pack's `3/4/6/3`
cardinality.

The first re-review confirmed `REV-022` through `REV-026` were repaired, then
returned `CHANGES REQUIRED` with no `P0`, one new `P1`, and one new `P2`:

| ID | Priority | First re-review finding | Repair |
| --- | --- | --- | --- |
| `REV-027` | P1 | Restoring a shared Tutorial or Reference Project recreated that Project but did not close every dependent per-user group membership, so workspace state could appear complete while other users remained bound to an archived/deleted generation. | Added `shared_membership_revision`; shared restore now marks every affected eligible user scope partial, invalidates stale claims, reauthorizes and rebinds exact membership pairs in stable batches of at most 25, advances a user revision only after readback, supports deterministic resume/per-user repair without recreating the Project, cleans up ineligible users, and returns workspace state to complete only after all eligible pre-existing users reach the current revision. |
| `REV-028` | P2 | “First qualifying normal mutation” was not a closed operation set, leaving implementers free to count navigation, organization, destructive actions, or inconsistent producer paths. | Closed Project creation to Blank/Duplicate/Template-derived success; closed Estimate creation to Blank/Duplicate/Template instantiation; closed later Estimate work to add Area, add Row, Component-as-Row insertion/reuse, quantity, unit-cost, adjustment, or miscellaneous-cost changes; required authoritative save/readback and server-derived origin/action family; and explicitly excluded navigational, organizational, destructive, seeded, failed, stale, tour-callback, and client-asserted cases. |

A second re-review confirmed the operation-set ambiguity was closed and the
shared restore revision/batching algorithm was otherwise sound, then returned
`CHANGES REQUIRED` with no `P0` and one narrower `P1`:

| ID | Priority | Second re-review finding | Repair |
| --- | --- | --- | --- |
| `REV-029` | P1 | The restore algorithm sent every user who lost starter-organization eligibility through final-access cleanup, but a user may lose workspace grouping capability while retaining project-only/direct-estimate access and instructional/activation state. | Added a distinct checked starter-organization eligibility cleanup. It removes only that user's Starter Examples group/memberships/state/claims, preserves narrower instructional/activation state, tutorial binding, shared assets, and the ordinary practice Project, exits the restore barrier only after no-active-scope readback, keeps final-access cleanup separate, re-enters an in-progress barrier on capability regain, and otherwise bootstraps only the current revision. `TEST-001`, `TEST-004`, and `TEST-008` now cover the mid-restore downgrade and concurrency path. |

### Starter-expansion re-review status

`PASS` — the final focused independent reviewer found no `P0` or `P1`.

The reviewer confirmed:

- `REV-029` now has a distinct idempotent starter-organization cleanup that
  preserves narrower progress, tutorial binding, shared assets, and every
  practice/business Project;
- no-active-scope readback gates barrier exclusion, concurrent losers reread,
  regain during partial restore re-enters the same revision barrier, and regain
  after completion bootstraps only the current revision;
- final-access cleanup remains separate;
- `TEST-001`, `TEST-004`, and `TEST-008` cover downgrade, preservation,
  concurrency, readback, and regain;
- `REV-027` membership-revision/batching closure and `REV-028`'s closed
  authoritative checklist operation set remain intact; and
- manifest reciprocity/DAG/status checks pass; the reviewer observed only the
  expected stale artifact/evidence/manifest hashes before closeout refresh.

After this receipt was recorded, artifact/evidence/manifest hashes were
refreshed and the read-only plan-pack validator passed.

No product tests, builds, browser automation, screenshots, deployment, or D1
mutation were performed.

## User-Directed MVP Tutorial Expansion

The user then required the Estimate Sheet onboarding to be comprehensive enough
to literally guide a beta user and required the authenticated Client links
master page to receive the same treatment. Two fresh read-only source-audit
lanes examined the live Estimate Sheet and publisher route/component/action
contracts before the pack was revised.

Source-backed findings:

- Estimate Sheet already exposes Project/Estimate/Tab/Area/Row hierarchy,
  complete row math, explicit dirty/saving/saved/failed state, offline and
  revision-conflict recovery, Component/Template integration, and virtualized
  Rows, but no route-local lesson rail or rendering-owner target contract.
- `/workshop/publisher` already exposes roster/search/status, manager-only
  create/edit, exact Estimate selection, client/access review, post-save
  verification, copy/Preview, Recipients/Activity, stale/expiry recovery, and
  explicit Replace/Turn off confirmations, but no local guidance.
- `/workshop/publisher/preview/[projectId]` is authenticated Preview;
  `/share/[token]` is the separate public recipient trust boundary.
- republish issues a new URL; Replace immediately invalidates the current URL;
  Turn off invalidates the current URL and recipient links.

The revised pack adds:

- `DEC-AUTO-021`, one shared Estimate Sheet Core/Optional learning rail with
  eight independently resumable lessons and at most four overlay steps per
  lesson;
- stronger `UX-005`/`AC-012`/`TEST-008` coverage for every current row-math
  column, Tab/Area/Row ownership, save/error recovery, Component/Template
  reuse, read-only use, virtualization, and later transfer;
- `UX-006`, `DEC-AUTO-022`, `AC-014`, and `TEST-009` for
  `client_link_publishing`;
- `UNIT-006` ownership of the publisher roster/drawer/wizard, publication
  learning adapter, targets, focus handoffs, and privacy/trust-boundary
  integration; and
- `RISK-019`/`RISK-020` controls against curriculum overload, false
  completion, wrong publication scope, sensitive-data leakage, public/Portal
  confusion, unexpected email, and destructive-link prompting.

The expanded inventory now tracks 26 owners total: the canonical source search
still finds 23 direct Workshop/Support modal owners, while the publisher
wrapper search finds `PublisherDrawer`, `ShareWizard`, and
`ClientPortalComposer` as three additional focus owners. `ASSUMP-003` and its
stale triggers preserve that distinction.

Client links core now requires verified create/republish plus copy/selectable
link or authenticated Preview. Recipient email, Replace, Turn off, Portal
migration, and public-recipient activity remain optional normal product
actions and are never performed or required by onboarding. This revision
supersedes only the `REV-012` Client links deferral; it preserves the short
first-run orientation and every other help-only advanced-surface decision.

The earlier starter-expansion `PASS` is historical for this newer curriculum
scope. Fresh independent read-only review and manifest/static validation were
required and are recorded in the final expansion review below.

## Preserved Strengths

- The pack keeps profile setup, workspace setup, activation truth, and
  instructional progress as separate concepts.
- Joyride remains an uncontrolled, dynamically loaded authenticated client
  island with semantic targets and semantic resume resolution.
- The first orientation remains short and capability-aware, while the Estimate
  Sheet curriculum is task-based and lesson-sized rather than a long tooltip
  tour.
- Starter/tutorial installation uses normal domain integrity boundaries but
  classifies generated writes, requires user-origin practice/reuse, and keeps
  non-starter transfer distinct.
- Replay/reset preserve activation, starter claims/generations, and business
  truth.
- Mobile navigation, virtualized targets, modal focus, missing targets,
  reduced motion, empty states, and support recovery are explicit contracts.
- Migration `0101` remains fix-forward and does not renumber historical files.

## Original-Scope Review Status

`READY WITH FIXES` — both closeout-only fixes were applied after the review.

The final independent read-only reviewer found no `P0` or `P1`, confirmed that
all initial material findings were resolved in substance, and independently
observed:

- the plan-pack validator passing;
- migration head `0100` with `0101` available;
- all 72 active `page.tsx` routes represented;
- the 23-file direct modal-owner search surface represented; and
- no installed `react-joyride` dependency before `UNIT-001`.

The reviewer requested two minimal closeout repairs:

1. replace this document's pending verdict and promote final review evidence;
2. prevent a planning-audit `PASS` receipt from appearing to prove a still
   unimplemented acceptance criterion.

Both are resolved in the final manifest: `EVID-004` is the passed independent
review receipt, while `AC-001` now points to separate planned implementation
evidence instead of the passed current-state audit receipt.

This status applies to the original tour-system scope. It was superseded by the
beta-comprehension challenge above and must not be used as the final verdict for
the expanded pack.

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

## Final MVP Tutorial Expansion Review

**Verdict:** `PASS` — no remaining `P0`, `P1`, or `P2` finding.

One independent read-only reviewer re-audited every pack artifact plus the live
Estimate Sheet and Client links implementation seams. The review specifically
challenged source fidelity, instructional completeness, privacy/security,
same-resource completion, focus ownership, unit paths/DAG, manifest
reciprocity, and stale deferrals.

| ID | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| `REV-030` | P1 | The proposed flow-event SQL `source` CHECK omitted `publication_domain`, although the type, Unit 002, and Client links bridge required it. | Added `publication_domain` to the SQL allowlist and explicit migration/repository acceptance plus arbitrary-source rejection assertions in `TEST-001` and `TEST-009`. |
| `REV-031` | P1 | `UNIT-005` owned a nonexistent `src/components/workshop/EstimateTabStrip.tsx` path. | Replaced it with the live `src/components/workshop/estimate-sheet/EstimateTabStrip.tsx` owner. |
| `REV-032` | P1 | Generic publish and copy/Preview events could compose across different Projects because instructional persistence intentionally stored no resource binding. | Added one atomic same-publication/run server bridge: a short-lived in-memory HMAC receipt binds the authenticated manager, Project, current publication, action, run, revision, and expiry without serializing identifiers; consume reauthorizes/rereads, constant-time verifies, CAS-completes, and rejects A/B interleaving, replacement, expiry, tampering, stale revision, and replay. |
| `REV-033` | P1 | Passed planning receipts again claimed still-failing implementation acceptance criteria. | Removed `AC-013`/`AC-014` from all `PASS` planning evidence; those criteria now point only to planned implementation evidence. |
| `REV-034` | P2 | The modal stop command reproduced the 23 direct owners but could not discover publisher `Drawer`/custom-Dialog focus owners. | Added the narrow publisher wrapper search and classified `PublisherDrawer`, `ShareWizard`, and `ClientPortalComposer`; the current inventory is 72 routes, 23 direct modal owners, and 3 publisher wrappers, for 26 tracked owners. |

The reviewer independently confirmed:

- `publication_domain` is aligned across type, SQL, persistence assertions, and
  Client links behavior;
- the Estimate Tab path resolves to the live rendering owner;
- Client links core uses the exact same current publication and active run,
  with no persisted receipt, binding digest, URL, token, or resource ID;
- the route/focus counts reproduce `72`, `23`, `3`, and `26`;
- all `122` manifest IDs have zero reciprocity errors;
- the unit dependency graph is acyclic;
- passed planning evidence claims no failing acceptance criterion; and
- the read-only validator had only the expected pre-closeout artifact,
  evidence, and manifest hash drift.

No product tests, builds, browser automation, screenshots, D1 mutation,
deployment, or provider action were performed.
