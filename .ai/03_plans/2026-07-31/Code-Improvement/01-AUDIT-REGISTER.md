# Current-Source Audit Register

Baseline: `93d5124d268a1b6016f63f8a8e5e69e118630d13`  
Audit date: 2026-07-31 Asia/Manila  
Disposition vocabulary: `CONFIRMED`, `INVESTIGATE`, `SUPERSEDED`,
`REFUTED`, `BOUNDARY`

This register is an implementation-planning audit, not a claim that unexecuted
flows pass at runtime. Findings were accepted only after current-source
reconciliation. GitNexus results were navigation hints, not proof.

## 1. Repository Coverage

| Surface | Evidence inspected | Result |
| --- | --- | --- |
| App/runtime | 75 pages, 94 route handlers, 62 server-action modules, `worker.ts` | Covered by domain sampling and caller tracing |
| Data | 125 active D1 migrations, repositories, mutation intents and receipts | CRUD/lifecycle matrix completed |
| Tests | 1,000 Vitest test files and 26 E2E files inventoried; focused gaps mapped | Existing coverage is broad but misses confirmed edge cases; `QA-001` currently stops profile execution |
| Provider | `wrangler.jsonc`, Worker/DO/queue/upload adapters | Local configuration inspected; hosted state not claimed |
| Architecture | largest/high-churn modules and direct importers | Five deepening candidates accepted |
| Security | authz, public tokens, realtime, uploads, queues, logs, retention, headers | One High and grouped Medium findings remain |
| Dependencies | installed lockfile advisory scan | No High/Critical advisory reported |
| Documentation | current product/runtime guides and deep architecture overview | Deep overview is materially stale |

## 2. CRUD and Lifecycle Matrix

`Sound` means the expected operation and authorization/lifecycle transition were
found in current source with adjacent tests. It does not replace fresh runtime
evidence.

| Feature | Create | Read/list | Update/transition | Archive/delete/restore | Current disposition |
| --- | --- | --- | --- | --- | --- |
| Projects | Sound | Sound; unbounded aggregate | Sound | Archive/restore sound | `PERF-002` scale defect |
| Estimate sheets/tree | Sound | Sound | Rename/reorder/revision sound | Archive/restore sound | No CRUD defect confirmed |
| Estimate rows/contributions | Sound | Sound | Insert/edit/move/restore and mutation receipts present | Delete/restore sound | `PERF-004` replay read amplification |
| Estimate tabs | Sound | Sound | Sound | Archive action exists but has no active caller/restore | `INVESTIGATE` product intent |
| Commercial terms | Sound | Sound | Revisioned update present | N/A | `COR-001`, `COR-002` |
| Proposals/preview | Sound | Sound | Preview/edit/publication present | Lifecycle present | `COR-008` cache/signature invalidation |
| Component library | Components, variants, materials, labor, equipment, adders sound | Paged browse sound | Edit/sync/mutation present | Archive present; restore absent | `COR-007`; archive is `INVESTIGATE` |
| Component templates | Sound | Sound | Propagation present | Lifecycle present | `COR-007` variant reference gap |
| Collaboration/invites | Invite create/resend sound | Members/invites sound | Accept, role, access mode sound | Revoke/remove sound | Core CRUD sound; realtime security separate |
| Legacy publication | Publish/link/recipient create sound | Link/recipient/activity sound | Republish/rotate/resend sound | Revoke terminal by design | `COR-005`, `PERF-006` |
| Client Portal | Compose/publish/recipient create sound | Portal/issues/decisions/discussions/timeline sound | Issue/change/decision/recipient transitions sound | Access-off present; archive state lacks transition | `COR-003`, `COR-009`; archive `INVESTIGATE` |
| Change requests | Create/amend sound | Versions/list/detail sound | Submit/acknowledge/assess/propose/accept/reject/withdraw sound | Immutable history intentional | No CRUD defect confirmed |
| Commitments/timeline | Append sound | Read/filter sound | Exposure transitions sound | Withdrawal/redaction intentional | No CRUD defect confirmed |
| Uploads/artifacts | Reserve/create/version sound | Status/list/read sound | Finalize/scan/override lifecycle present | Expire/delete/archive/tombstone sound | CRUD sound; `SEC-004` through `SEC-007` |
| Onboarding/starter | Flow/install/create sound | State/resume sound | Claim/recovery/restart/lease sound | Reset/terminal states present | CRUD sound; `PERF-001` boundary inversion |
| Support | Conversation/message/attachment create sound | Inbox/thread/read sound | Triage/status/privacy/read-through sound | Retention-controlled | `COR-006`, `SEC-012` |
| Notifications/activity | Delivery/event append sound | Feed/list sound | Read/dismiss/ack sound | Retention-controlled | `COR-004`; UI first-page-only |
| Admin | Representative account/feature/release/inbox/saved-reply flows sampled | Authenticated admin reads found | Moderation/state changes found | Domain-specific | No new defect in bounded pass |
| Privacy requests | Create/verify sound | User/admin list/detail sound | Lease/execute/CAS sound | Export/erasure/terminal completion intentional | Core lifecycle sound; retention gap in `SEC-013` |

## 3. Confirmed Correctness Findings

### `COR-001` - Commercial authorization excludes inherited workspace access

- Priority: P1
- Evidence: `src/lib/commercial-terms/repository.ts:435` uses project/estimate
  membership only, while canonical inherited workspace access is implemented at
  `src/lib/authz/d1-access.ts:406`.
- Failure: a legitimate workspace member can be denied commercial-term
  mutations when no redundant project-member row exists.
- Owner: `UNIT-001`

### `COR-002` - Commercial mutation guard binds the actor twice

- Priority: P1
- Evidence: `src/lib/commercial-terms/repository.ts:176` supplies five guard
  values for four guard placeholders, while
  `src/lib/estimates/mutation-receipts.ts:89` already binds the actor.
- Failure: deterministic bind/placeholder mismatch on the guarded mutation path.
- Owner: `UNIT-001`

### `COR-003` - Fresh portal credentials fail after first verification

- Priority: P1
- Evidence: `src/lib/client-portal/public-repository.ts:391` requires both a
  credential update and a `last_verified_at IS NULL` recipient update to change
  rows; `src/lib/client-portal/public-session-handler.ts:38` rejects false.
- Failure: a newly issued credential is rejected when the recipient-level update
  is a legitimate no-op.
- Owner: `UNIT-002`

### `COR-004` - Notification pagination omits rows

- Priority: P1
- Evidence: `src/lib/notifications/repository.ts:112` fetches `limit + 1`,
  returns `limit`, derives the cursor from the excluded row, then queries with a
  strict older-than predicate; ordering lacks an ID tie-break.
- Failure: the first row of every later page is unreachable; equal timestamps
  are unstable. `NotificationCenter.tsx:23` never requests later pages.
- Owner: `UNIT-003`

### `COR-005` - Publication reports sent after persistence failure

- Priority: P1
- Evidence: `src/lib/publication/actions.ts:1601` ignores the returned error from
  delivery-state persistence; `src/lib/publication/admin-d1-client.ts:396`
  returns errors instead of throwing.
- Failure: UI reports `sent` while D1 remains pending, enabling duplicate or
  missed recovery.
- Owner: `UNIT-004`

### `COR-006` - Losing support replay reasserts side effects

- Priority: P1
- Evidence: `src/lib/repositories/support-conversations-d1.ts:987` pre-reads,
  uses `INSERT OR IGNORE`, then unconditionally updates unread/timestamps at
  `:1046`.
- Failure: a concurrent losing replay can restore unread state after the user
  read the conversation.
- Owner: `UNIT-005`

### `COR-007` - Component variant mutations strand template selections

- Priority: P1
- Evidence: `src/lib/component-library/component-mutation-d1.ts:492` and
  `:1567` reconcile estimate rows only; template selections are defined in
  `migrations/0127_material_variants_value_engineering.sql:171`;
  `src/lib/component-library/template-propagation-d1.ts:493` assumes active
  options.
- Failure: deleting/replacing a referenced variant can leave template state that
  cannot propagate.
- Owner: `UNIT-006`

### `COR-008` - Proposal signature omits quantity sidecars

- Priority: P2
- Evidence:
  `src/components/workshop/estimate-sheet/proposal-preview-model.ts:32` signs
  total
  quantity/mode/percentage but not `quantityBase` or
  `quantityContingencyAmount`, which are materialized at
  `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:292`.
- Failure: preview/cache identity can remain unchanged after a commercial
  quantity input changes.
- Owner: `UNIT-001`

### `COR-009` - Recipient-filtered thread pages can be empty with more data

- Priority: P3
- Evidence: `src/lib/client-portal/thread-repository.ts:478` limits raw rows
  before applying recipient visibility and derives `hasMore` from raw rows.
- Failure: users may repeatedly load empty/underfilled pages before reaching
  visible content.
- Owner: `UNIT-005`

## 4. Confirmed Security and Privacy Findings

### `SEC-001` - Realtime revocation does not survive reconnect

- Severity: High
- Evidence: five-minute signed token at
  `src/lib/collaboration/realtime-room-token.ts:176`; revocation at
  `src/lib/cloudflare/collaboration-room.ts:596` closes current sockets but
  persists no deny state checked during a new upgrade.
- Impact: a revoked subject can reconnect while the issued token remains valid.
- Owner: `UNIT-007`

### `SEC-002` - Realtime capacity is consumed before authorization

- Severity: Medium
- Evidence: `src/lib/cloudflare/collaboration-room-router.ts:29` and
  `src/lib/cloudflare/collaboration-room.ts:203` allocate/check room capacity
  before complete authentication; origin and subject/global limits are absent;
  control authentication directly compares secrets at `:600`.
- Impact: anonymous resource exhaustion and weaker cross-origin/control
  boundaries.
- Owner: `UNIT-008`

### `SEC-003` - Support/global-presence realtime channels retain secret fallback

- Severity: Medium
- Evidence: `src/lib/collaboration/realtime-room-token.ts:4` retains invite and
  identity credential fallbacks through `readRealtimeRoomTokenSecret`; active
  callers remain in support inbox/fanout and global presence. Collaboration
  issuance and room verification already use
  `readCollaborationRoomTokenSecret` and reject those fallbacks.
- Impact: exposure of another subsystem credential expands into realtime token
  minting.
- Owner: `UNIT-008`

### `SEC-004` - Pending uploads can bind to product records

- Severity: Medium
- Evidence:
  `src/lib/component-library/component-mutation-d1.ts:1182` accepts pending
  attachment references.
- Impact: unverified content can become product-visible before a trusted clean
  transition.
- Owner: `UNIT-009`

### `SEC-005` - Upload finalization does not verify stored bytes strongly

- Severity: Medium
- Evidence:
  `src/app/api/component-library/attachments/direct-upload/route.ts:511`
  trusts HEAD metadata; `src/lib/uploads/provider-portability.ts:134` accepts
  ETag in place of a content checksum.
- Impact: claimed content identity/type can diverge from stored bytes.
- Owner: `UNIT-009`

### `SEC-006` - Policy-only scanning can mark content clean

- Severity: Medium
- Evidence: `src/lib/uploads/clamd-scanner.ts:158` and
  `src/lib/uploads/policy-scanner.ts:39` allow the fallback policy scanner to
  produce a clean classification.
- Impact: "clean" does not prove a malware engine inspected the object.
- Owners: `UNIT-009`, `UNIT-024`, `UNIT-025`

### `SEC-007` - Scan jobs read full objects without a ceiling

- Severity: Medium
- Evidence: `src/lib/uploads/scan-job.ts:359` reads the complete object before
  scanning.
- Impact: oversized or adversarial objects can exhaust Worker memory.
- Owner: `UNIT-009`

### `SEC-008` - Secondary origin and operational routes remain public

- Severity: Medium
- Evidence: `wrangler.jsonc:10` enables `workers_dev`; internal/proof routes use
  reusable bearer secrets over public HTTP.
- Impact: unnecessary public attack surface and credential replay scope.
- Owner: `UNIT-010`

### `SEC-009` - Upload queue accepts unsigned, sender-chosen identity

- Severity: Medium
- Evidence: `src/lib/cloudflare/upload-job-queue.ts:124` emits unsigned objects,
  `:178` validates shape only, and `:338` trusts message idempotency keys.
- Impact: any binding-capable producer can forge provenance or suppress a valid
  same-batch job.
- Owner: `UNIT-011`

### `SEC-010` - Token-bearing browser and cache controls are incomplete

- Severity: Medium
- Evidence: permissive/staged CSP and no invite no-store at
  `next.config.ts:38`; cookie security tied to build environment at
  `src/lib/publication/security.ts:370`; share-state 404/423 oracle at
  `src/app/api/share/[token]/route.ts:36`; unbounded URL-keyed isolate cache at
  `src/lib/cloudflare/worker-route-optimizations.ts:57`.
- Impact: weaker token privacy, injection containment, and future cross-user
  cache safety.
- Owner: `UNIT-012`

### `SEC-011` - Raw Better Auth session tokens are stored

- Severity: Medium
- Evidence: `src/lib/auth/better-auth-cloudflare.ts:38` and `:243`, schema at
  `migrations/0104_better_auth_core_schema.sql:18`.
- Impact: database disclosure yields reusable bearer material.
- Owners: `UNIT-013`, `UNIT-026`

### `SEC-012` - Support repository methods are not actor-bound

- Severity: Medium latent
- Evidence: low-level support reads/writes accept record IDs without actor
  context; current callers are guarded, but the repository does not preserve the
  authorization invariant itself.
- Impact: a future caller can bypass tenant/admin boundaries accidentally.
- Owner: `UNIT-005`

### `SEC-013` - Operational errors, redundant PII, and retention coverage diverge

- Severity: Medium
- Evidence: raw cron errors at `worker.ts:253`, `:284`, `:321`; redundant actor
  email in `src/lib/admin/audit-repository.ts:60`; raw user agent in
  `src/lib/admin/observability-repository.ts:101`; incomplete registry coverage
  in `src/lib/compliance/retention-core.ts:87`.
- Impact: sensitive details persist in logs/D1/backups beyond minimal purpose.
- Owner: `UNIT-014`

## 5. Confirmed Performance Findings

### `PERF-001` - Workspace reads hide onboarding I/O

- Evidence: `src/lib/repositories/workspace-repository.ts:1412` always awaits
  starter installation; it reads two starter states at
  `src/lib/onboarding/starter-pack-actions.ts:2156`.
- Cost: ready requests perform unrelated D1 reads across 19 direct importers.
- Owner: `UNIT-015`

### `PERF-002` - Projects builds an unbounded workspace aggregate

- Evidence: no-limit project and estimate reads at
  `src/lib/repositories/workspace-repository.ts:1537` and `:1650`; sequential
  90-ID access batches at `:1303`; full route serialization at
  `src/app/workshop/projects/page.tsx:29`; client maps/sorts all rows at
  `src/components/workshop/projects-page-client.tsx:1451`.
- Cost: D1, serialization and render work grow with total workspace size.
- Owner: `UNIT-016`

### `PERF-003` - AI evidence reads are serial and duplicated

- Evidence: serial workspace/project reads at
  `src/lib/ai/package-builder/read-tools.ts:1412`; serial evidence branches at
  `:1506`; duplicate prior-estimate queries at `:973` and `:1180`.
- Cost: avoidable D1 serial depth before an AI request.
- Owner: `UNIT-017`

### `PERF-004` - Restore replay issues one read per row

- Evidence: up to 100 `readRowById` calls at
  `src/lib/estimates/d1-intents/rows.ts:3317`; the fresh path already has a
  batched read at `:3424`.
- Cost: 100 D1 reads for an idempotent replay.
- Owner: `UNIT-018`

### `PERF-005` - Activity reconciliation is 1+2N statements

- Evidence: 500-row cap and two per-row statements at
  `src/lib/activity/activity-outbox.ts:105`.
- Cost: up to 1,001 statements in the daily pass.
- Owner: `UNIT-022`

### `PERF-006` - Legacy publication blocks on external email

- Evidence: `src/lib/publication/actions.ts:1567` awaits provider delivery and
  state update for as many as 50 recipients; canonical Client Portal uses the
  queue bound in `wrangler.jsonc`.
- Cost: request latency and ambiguous retry state.
- Owner: `UNIT-004`

### `PERF-007` - Client surfaces subscribe to whole query objects

- Evidence: `SharePageComments.tsx:359`,
  `SharedLinkActivityFeed.tsx:183`,
  `TemplateEditorClient.tsx:143`, and
  `proposals-page-client.tsx:48`.
- Cost: avoidable rerenders/effect invalidations.
- Owner: `UNIT-023`

## 6. Architecture, Cleanup, and Documentation Findings

### `ARCH-001` - Workspace repository is a cross-domain hotspot

- Evidence: `src/lib/repositories/workspace-repository.ts` is approximately
  3,872 lines with 55 importers and spans auth, onboarding, project catalogue,
  collaboration, publication, and estimate route concerns.
- Required shape: direct-import focused modules; no re-export facade.
- Owners: `UNIT-015`, `UNIT-016`

### `ARCH-002` - EstimateSheet owns projection, orchestration, UI state, and JSX

- Evidence: `src/components/workshop/EstimateSheetContent.tsx` is approximately
  4,001 lines; display transforms at `:559`, state bag at `:725`, composition at
  `:1779`.
- Constraint: preserve the completed `EditableRowStore` as mutation owner.
- Owner: `UNIT-019`

### `ARCH-003` - Component editor domain model is embedded in its modal

- Evidence:
  `src/components/workshop/component-library-manager/AddComponentModal.tsx`
  owns draft types, hydration, diff, validation, payload projection and async UI
  across roughly 2,802 lines.
- Required shape: pure model with no server-action or upload-effect adapter.
- Owner: `UNIT-021`

### `CLEAN-001` - Client Portal decision void surface is orphaned

- Evidence: no production importer of
  `src/lib/client-portal/decision-actions.ts`; delegated
  `voidClientPortalDecision` in `decision-service.ts:284` has no caller.
- Action: delete, do not invent recompute behavior.
- Owner: `UNIT-028`

### `DOC-001` - Deep architecture overview describes the retired runtime

- Evidence: `.ai/06_specs/deep/architecture-overview.md` describes
  Supabase/Postgres/RLS and an old migration/route inventory, while current
  executable provider truth is Cloudflare/D1 in `wrangler.jsonc`.
- Action: replace with current topology or retire in favor of maintained source
  maps.
- Owner: `UNIT-028`

### `QA-001` - Bootstrap baseline lineage rejects its admitted tracked baseline

- Priority: P1 quality infrastructure
- Evidence: `scripts/quality/component-core.ts:1409` treats any addition of
  `quality/baseline.json` anywhere in current `HEAD` history as incompatible with
  bootstrap admission. The admitted baseline at `quality/baseline.json:2859` is
  correctly marked bootstrap because its immutable comparison base
  `214fd2af3564c6c90d6bb46a7f2f7bd19faa811d` has no predecessor baseline.
  `bun run quality:contracts` now returns
  `COMPONENT_BASELINE_BOOTSTRAP_LINEAGE_INVALID`.
- Failure: once the first bootstrap baseline is committed, every Q-profile stops
  at contract validation before behavior evidence can run.
- Required shape: accept the byte-identical first admitted baseline after its
  introduction when the immutable comparison base has no predecessor; reject
  mutation, deletion/reintroduction, comparison-base rollback, and a second
  bootstrap after established history.
- Owner: `UNIT-000`

## 7. Investigation-Only Items

These are not defects until product intent is proven:

| Item | Evidence | Decision required |
| --- | --- | --- |
| Archived components have no restore UI | Repository hides archived records; no restore action found | Retain terminal archive, add restore, or remove misleading affordance |
| Native Client Portal exposes archived state without transition | Policy/read model recognizes archive; access service does not expose it | Define credential, discussion, and access semantics before any action |
| Estimate tab archive path is unused and has no restore | Action exists without an active caller | Delete dead path or validate future lifecycle requirement |

`UNIT-027` owns the decision and follow-up reclassification. It must not implement
a lifecycle transition merely to make the matrix symmetrical.

## 8. Superseded, Refuted, and Boundary Findings

| Prior concern | Current disposition |
| --- | --- |
| Component-library browse is unbounded | `SUPERSEDED`: current management browse is paged |
| Estimate editable-row state needs extraction | `SUPERSEDED`: `EditableRowStore` is current mutation owner |
| Estimate persistence lacks typed intent modules | `SUPERSEDED`: current actions delegate to intent/mutation modules |
| Client Portal lacks durable notification queue | `SUPERSEDED`: queue and idempotent consumer are bound/current |
| Onboarding completion milestone is broken | `REFUTED`: current state/recovery lifecycle covers it |
| Support reply always leaves unread state wrong | `SUPERSEDED`: current read-through/finalization fixes it; replay race remains |
| Brand asset password enforcement missing | `SUPERSEDED`: current public repository enforces it |
| Bulk import absent | Not a CRUD defect without a current product requirement |
| Committed secret or SQL injection | Not established by the current scan |
| GitHub required checks/ruleset enforced | `BOUNDARY`: local workflow source exists; hosted readback is absent |
| Production `workers.dev` reachability and provider flags | `BOUNDARY`: configuration risk confirmed; hosted state not probed |

### July 19 predecessor-to-current mapping

| Predecessor unit | Current disposition |
| --- | --- |
| Quality `UNIT-001` - template variant repointing | Current and absorbed by `UNIT-006` |
| Quality `UNIT-004` - proposal contingency identity | Current and absorbed by `UNIT-001` |
| Quality `UNIT-006` - support unread/results | Broad prior wording superseded; current concurrent replay and visible paging are in `UNIT-005` |
| Quality `UNIT-025` - restore replay batching | Current and absorbed by `UNIT-018` |
| Quality `UNIT-029` - set-wise activity outbox | Current and absorbed by `UNIT-022` |
| Quality `UNIT-030` - narrow TanStack subscriptions | Current and absorbed by `UNIT-023` |
| Quality `UNIT-044` - workspace repository boundaries | Narrowed to workspace context and project catalogue in `UNIT-015` and `UNIT-016` |
| Quality `UNIT-045` - EstimateSheet decomposition | Narrowed to the deletion-tested view projection in `UNIT-019`; completed row-store work is not repeated |
| Quality `UNIT-047` - orphaned decision actions | Current deletion in `UNIT-028` |
| Quality `UNIT-048` - Next nonce CSP | Evidence-gated branch of `UNIT-012`, not an assumed recipe |
| Security `UNIT-001` - realtime revocation | Current and absorbed by `UNIT-007`/`UNIT-008` with persisted reconnect denial |
| Security `UNIT-002` - Worker edge seam | Current local configuration/removal work in `UNIT-010`; hosted reachability remains `AUTH-001` |
| Security `UNIT-003` - bearer/secret cleanup | Collaboration secret separation is landed; remaining support/global-presence and operational work is in `UNIT-008` and `UNIT-010` |
| Security `UNIT-004` - email boundary chokepoint | Not promoted: current audit found no independent accepted defect requiring duplicate work |
| Security `UNIT-005` through `UNIT-007` - upload bind/finalize/scan | Reconciled as fail-closed admission `UNIT-009`, provider decision `UNIT-024`, and conditional authoritative scan `UNIT-025` |
| Security `UNIT-008` - queue signing | Current and absorbed by `UNIT-011` |
| Security `UNIT-009` - browser hardening | Current mechanical controls plus evidence-gated CSP in `UNIT-012` |
| Security `UNIT-010` and `UNIT-011` - logging/retention | Current and absorbed by `UNIT-014` |
| Security `UNIT-012` - CI/branch protection | Local workflow source is not hosted enforcement; retained only as `AUTH-001` boundary |
| Security `UNIT-013` - flat defense-in-depth backlog | Retired as an execution unit; only reverified current subfindings appear in `UNIT-005` through `UNIT-014` |

The targeted July 20 packs are narrower predecessors, not parallel authorities.
`UNIT-028` must record their exact final status before any terminal, especially
Quick Correctness, D1 Runtime Consolidation, Estimate Mutation Integrity, and
Money Math, so already-landed work is not reopened.

## 9. Test and Evidence Gaps

Existing adjacent tests are broad, but decisive missing cases include:

- commercial guard bind count and inherited workspace access;
- second portal credential after prior verification;
- notification multi-page/equal-timestamp traversal;
- provider-send success followed by D1 update failure;
- losing concurrent support insert after unread state changed;
- template selection migration/rejection during variant replacement;
- quantity-sidecar-only proposal invalidation;
- revoked realtime reconnect, anonymous capacity and per-subject capacity;
- stored-byte checksum/type mismatch, pending bind rejection, scanner
  inconclusive state, and scan byte ceiling;
- queue MAC tamper and consumer-recomputed idempotency;
- invite no-store and request-derived secure-cookie behavior;
- complete retention-registry coverage;
- bootstrap-baseline persistence after admission and rejection of re-bootstrap
  after prior immutable history;
- 100-row restore read count, 500-row outbox statement budget, and
  1,000-project page traversal.

No unit may close one of these findings using only a source-diff assertion.

## 10. Baseline Commands and Receipts

| Command/evidence | Result |
| --- | --- |
| `bun run supermemory:ensure` | Degraded: pinned local executable missing; unrelated work continued |
| `git status --short --branch` before audit | Clean `main...origin/main` |
| `node .gitnexus/run.cjs analyze` | 36,037 nodes, 143,309 edges, 1,819 clusters, 300 flows |
| `bun run ops:agent-debug-snapshot` | Local debugging ready; latest `/workshop` error stale/already mitigated |
| `bun audit --json --audit-level=high` | `{}`; no High/Critical installed advisory reported |
| `bun run test:dom -- --reporter=json --outputFile=.tmp/code-improvement-vitest.json` | `PASS`: 2,140/2,140 suites and 6,775/6,775 tests; no failed, pending, or todo tests. Summary: `evidence/baseline-dom-tests.json` |
| `bun run quality:contracts` | `FAIL`: one `COMPONENT_BASELINE_BOOTSTRAP_LINEAGE_INVALID` finding; repair is owned by `UNIT-000`, and no Q-profile is claimed green before it passes |

## 11. Remaining Audit Risk

- Static inspection cannot prove D1/DO/queue concurrency behavior.
- The repository is large enough that absence claims remain bounded by current
  symbol/caller and test inventories.
- Provider reachability, production data shape, flags, secrets, and GitHub
  enforcement remain unproven without separately authorized readback.
- Browser boundary changes require the automatic Q-profile's Playwright/browser
  evidence during implementation.
