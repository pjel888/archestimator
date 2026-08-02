# Canonical Unit Catalog

> **Historical catalog — not runnable.** Every unit in this predecessor is
> `SUPERSEDED` without an implementation claim. Current disposition and any
> runnable work belong to `.ai/03_plans/2026-07-31/Code-Improvement/`. The unit
> descriptions below are preserved as provenance only.

## How To Use This Catalog

Each unit was a proposed bounded assignment. Source IDs point to
`AUDIT-AND-DISPOSITION.md`; the byte-preserved predecessor document remains
available under `source-snapshots/` for deeper historical evidence. Current
source and the successor override all implementation directions in this catalog.

For every unit, run GitNexus impact before editing any symbol. `Static` means
scoped source/diff, type/LSP, lint, validator, dry-run, or local query evidence.
`TEST_PROPOSAL` records risk but does not authorize test-file edits or execution.

## UNIT-001 — Repoint Template Rows When Variants Disappear

- **Sources:** consistency `032`.
- **Owned paths:** `src/lib/component-library/component-mutation-d1.ts`,
  `src/lib/component-library/template-propagation-d1.ts`.
- **Change:** extend linked-row discovery and mutation impact so both estimate
  rows and `estimate_template_row_items` that reference a removed variant are
  repointed to a valid fallback before template propagation resolves them.
- **Acceptance:** no live template row can retain an unavailable selected
  variant after the same component mutation that already repairs estimate rows;
  current three upstream mutation callers remain covered.
- **Evidence:** GitNexus impact/context, scoped SQL/source review, static type and
  lint evidence. **TEST_PROPOSAL:** focused estimate+template variant repointing.

## UNIT-002 — Make Verification And CI Claims Truthful

- **Sources:** performance `001`; improve `001`, invalid `017`.
- **Owned paths:** `package.json`, `.github/workflows/`, root verification docs.
- **Change:** expose one local verification entrypoint by composing existing
  scripts, remove claims that CI is active when no workflow exists, and keep
  local workflow definition separate from GitHub activation. Add no dependency,
  Husky layer, reset command, or unsound scoped TypeScript gate.
- **Acceptance:** documented commands exist; local and hosted claims are
  distinct; any workflow file is least-privilege and remains undeployed until a
  separate commit/push authorization.
- **Evidence:** JSON parsing, workflow syntax/static review, doc/source diff.
  Product gates remain unrun.

## UNIT-003 — Guard Stale Estimate-Row Insert Success

- **Sources:** improve `007`.
- **Owned paths:** `src/hooks/use-estimate-row-mutations.ts`.
- **Change:** apply the current latest-scoped-operation guard used by replace
  mutations to insert success handling so an older completion cannot overwrite
  newer optimistic state.
- **Acceptance:** out-of-order insert success is ignored without changing valid
  rollback or replace behavior.
- **Evidence:** GitNexus impact, control-flow/source diff, type/LSP evidence.
  **TEST_PROPOSAL:** one out-of-order insert coordinator case.

## UNIT-004 — Include Contingency In Proposal Preview Identity

- **Sources:** consistency `023`.
- **Owned paths:** `src/components/workshop/estimate-sheet/proposal-preview-model.ts` and direct
  signature consumers if the current location has moved.
- **Change:** include `quantityBase` and `quantityContingencyAmount` in the
  proposal preview signature; do not restore the removed labor field.
- **Acceptance:** changing only the base/contingency split invalidates a cached
  preview even when rolled-up quantity is unchanged.
- **Evidence:** GitNexus impact, signature call-site review, static diff.

## UNIT-005 — Purge Workspace And Query State On Sign-Out

- **Sources:** consistency `021`, `033`.
- **Owned paths:** client sign-out handlers, `src/lib/auth/actions.ts`,
  `src/hooks/use-estimate-workspace-state.ts`, query-client ownership.
- **Change:** centralize client cleanup for every sign-out/user-identity change;
  reset user-scoped ephemeral stores and clear/remove TanStack Query data without
  persisting or erasing user-independent UI preferences.
- **Acceptance:** a second user on the same origin cannot observe the prior
  user's workspace selection or cached query data.
- **Evidence:** auth-path inventory, store/query key review, static diff.
  **TEST_PROPOSAL:** user A → sign-out → user B boundary.

## UNIT-006 — Reconcile Support Unread State And Result Limits

- **Sources:** consistency `006`, `029`.
- **Owned paths:** `src/lib/repositories/support-conversations-repository.ts`,
  `src/app/api/admin/support/conversations/route.ts`, direct admin consumers.
- **Change:** clear `unread_for_admin` when an admin reply resolves that state and
  make the newest-100 cap explicit via total/has-more metadata or truthful UI.
- **Acceptance:** admin replies do not leave false unread state; operators are
  never shown a silently complete-looking truncated inbox.
- **Evidence:** repository/API shape review, GitNexus route impact, static diff.

## UNIT-007 — Fail Closed For Invite POSTs Without Origin Evidence

- **Sources:** consistency `016`.
- **Owned paths:** `src/lib/collaboration/invite-origin.ts` and direct invite POST
  callers.
- **Change:** reject state-changing invite requests when both `Origin` and
  `Referer` are absent while preserving valid same-origin browser requests.
- **Acceptance:** missing or mismatched origin evidence is denied; legitimate
  requests retain their current path.
- **Evidence:** route/caller map and static branch review. **TEST_PROPOSAL:** exact
  absent, valid, and mismatched header contract cases.

## UNIT-008 — Reuse Constant-Time Comparison For CSRF And Control Secrets

- **Sources:** improve `004`; consistency `014`; prior July-16 bearer helper.
- **Owned paths:** `src/lib/publication/security.ts`,
  `src/lib/cloudflare/collaboration-room.ts`, shared security utilities.
- **Change:** route live CSRF/control-secret comparisons through the existing
  length-safe timing-safe pattern; do not weaken multi-secret constant-work
  behavior or duplicate crypto helpers.
- **Acceptance:** unequal lengths fail safely, no raw secret equality remains in
  the cited live paths, and public bearer behavior is unchanged.
- **Evidence:** GitNexus impact, security-path source scan, static diff.
  **TEST_PROPOSAL:** publication CSRF and collaboration-room auth suites.

## UNIT-009 — Remove The Personal Platform-Admin Fallback

- **Sources:** improve `005`.
- **Owned paths:** `src/lib/auth/roles.ts`, environment examples and truthful
  configuration docs.
- **Change:** remove the hardcoded personal dev/test email fallback while keeping
  production's current fail-closed role and explicit allowlist behavior.
- **Acceptance:** no identity is granted admin status from source-code email;
  configured roles/allowlists still work.
- **Evidence:** role-call-site review, source/env diff, static type evidence.

## UNIT-010 — Centralize All Live Share-Cookie Decoding

- **Sources:** improve `014` (rewritten).
- **Owned paths:** live share comment, decision, and activity routes plus
  `src/lib/publication/security.ts`.
- **Change:** replace all three route-local decoders with the canonical signed
  cookie parser and define malformed percent-encoding as fail-closed rather than
  throwing.
- **Acceptance:** one encoding/validation contract serves all live share routes;
  no route-local `decodeURIComponent` drift remains.
- **Evidence:** route map, parser call-site scan, static diff. **TEST_PROPOSAL:**
  three route suites with encoded and malformed cookie inputs.

## UNIT-011 — Separate Telemetry Pepper From Publication Secrets

- **Sources:** improve `015` (narrowed).
- **Owned paths:** telemetry hashing and publication secret readers in
  `src/lib/publication/security.ts` or their current extracted locations, env
  examples/readiness docs.
- **Change:** remove publication-token-secret fallback from telemetry hashing;
  define a dedicated configured pepper and truthful degraded/fail-closed policy.
- **Acceptance:** publication token material is never reused as a telemetry
  domain secret; existing publication and AI draft secret fail-closed behavior
  is not reimplemented.
- **Evidence:** secret-reader call graph, env/source diff, redacted static proof.

## UNIT-012 — Require Direct-Upload Checksum Binding

- **Sources:** improve `011`.
- **Owned paths:** direct-upload reservation/finalize routes,
  `src/lib/uploads/direct-upload-records.ts`, provider portability checks.
- **Change:** require a normalized checksum at reservation and finalize; do not
  accept provider ETag as integrity-equivalent unless the provider contract
  proves the same digest algorithm.
- **Acceptance:** missing/mismatched checksum cannot finalize; the stored object,
  reservation, and final record bind to the same digest.
- **Evidence:** route/dataflow map, provider contract review, static diff.
  **TEST_PROPOSAL:** missing checksum and ETag-only refusal cases.

## UNIT-013 — Bound Upload Scan-Override TTL

- **Sources:** improve `012`.
- **Owned paths:** `src/lib/uploads/scan-override.ts`,
  `src/lib/uploads/scanning.ts`, configuration docs if a constant is exposed.
- **Change:** enforce one maximum future override TTL at approval and consumption
  boundaries, preserving expiry and audit behavior.
- **Acceptance:** expired, malformed, and max-plus-one overrides fail; exact-max
  remains valid.
- **Evidence:** value-flow review and static diff. **TEST_PROPOSAL:** boundary
  matrix in the existing override/scanning suites.

## UNIT-014 — Route Legacy Money Totals Through The Oracle

- **Sources:** improve `008`; consistency `001` is already implemented and does
  not restore labor.
- **Owned paths:** `src/lib/estimates/estimate-row-total.ts` and its current
  repository/dashboard consumers.
- **Change:** replace raw floating-point compatibility math with the existing
  integer-minor-unit oracle while preserving public return types and rounding.
- **Acceptance:** the wrapper and direct consumers agree with the canonical
  oracle for decimals, contingencies, and boundaries.
- **Evidence:** mandatory HIGH upstream impact review, consumer inventory, static
  diff. **TEST_PROPOSAL:** named estimate total/repository parity suites.

## UNIT-015 — Make Absent D1 Batch Support Fail Before Writes

- **Sources:** improve `002`.
- **Owned paths:** `src/lib/estimates/d1-intents/database.ts`, explicit test-double
  adapters only if authorized.
- **Change:** remove sequential pseudo-atomic fallback from `runD1Batch`; reject
  before preparing/executing any write when atomic batch support is absent.
- **Acceptance:** production D1 behavior is unchanged, non-batch adapters fail
  before side effects, and callers receive one explicit contract error.
- **Evidence:** mandatory CRITICAL upstream impact review, all 23 direct callers
  classified, static/type evidence. **TEST_PROPOSAL:** focused atomicity suites;
  no test-double edits without `TEST_TASK`.

## UNIT-016 — Converge Fixed-Window Limits And Breakers Durably

- **Sources:** improve `003` and fixed-window portion of `019`; prior July-16
  durable public-rate-limit infrastructure.
- **Owned paths:** estimate action rate limits, share comment breaker, shared
  durable rate-limit utilities and bound DO configuration if reuse requires it.
- **Change:** migrate isolate-local fixed-window counters/breakers onto the
  existing durable engine with explicit keys, windows, failure policy, and no
  second competing infrastructure.
- **Acceptance:** enforcement is consistent across isolates and retains current
  route-specific thresholds/error shapes.
- **Evidence:** caller and key-space map, provider binding review, static diff.
  **TEST_PROPOSAL:** existing estimate/durable-limit contract suites.

## UNIT-017 — Reduce Agent Adapters To Canonical Stubs

- **Sources:** improve `020`.
- **Owned paths:** root agent adapter files and
  `scripts/validate-ai-workflow-adapters.mjs`.
- **Change:** keep `AGENTS.md` authoritative; reduce CLAUDE/CODEX/GEMINI/Cursor/
  Windsurf adapters to required harness markers and canonical pointers, and
  extend the validator to every maintained adapter without disturbing generated
  runtime markers.
- **Acceptance:** no contradictory policy body remains outside authority;
  `bun run validate:agents` passes.
- **Evidence:** static agent validator and scoped diff; no product tests.

## UNIT-018 — Repair D1 Performance Tooling And Current-Stack Docs

- **Sources:** performance `015`, `016`.
- **Owned paths:** active performance scripts and
  `.ai/01_roadmap/27-performance-budget-and-regression-gates.md`.
- **Change:** replace active Supabase/Postgres/Vercel assumptions with D1/
  Cloudflare commands and metrics; archive or clearly label historical harnesses
  rather than rewriting provider-exit evidence.
- **Acceptance:** every active command targets bound current resources; historical
  comparisons remain clearly historical.
- **Evidence:** script dry-run/help/static parsing and doc reference scan.

## UNIT-019 — Resolve Upload-Job Producer Topology

- **Sources:** improve `009`; consistency `007`.
- **Owned paths:** upload job enqueue/consumer/proof routes, queue configuration,
  no migration until the decision is complete.
- **Change:** trace every reachable producer and decide keep/activate/delete. If
  kept, define durable idempotency identity and retention; if unreachable by
  design, delete dead scheduled enqueue paths instead of adding a table.
- **Acceptance:** one documented reachable topology exists, or dead topology is
  removed; proof-only traffic is not misreported as production demand.
- **Evidence:** GitNexus/process and queue-binding map, local configuration proof.

## UNIT-020 — Scope Upload-Job Route Secrets

- **Sources:** improve `010`.
- **Dependencies:** `UNIT-019`.
- **Owned paths:** upload scan/cleanup job routes and scheduled dispatcher secret
  selection.
- **Change:** stop accepting shared `CRON_SECRET`; use one job-internal secret or
  queue-native trust boundary consistent with the retained topology.
- **Acceptance:** global cron credentials cannot call upload job endpoints; local
  scheduled/queue execution retains a single explicit authentication path.
- **Evidence:** route map, secret dataflow, redacted static proof.

## UNIT-021 — Prove A Viable Production Scanner Provider

- **Sources:** improve `006` (split).
- **Owned paths:** upload scanner provider ports/configuration and a local decision
  receipt; no paid/external provisioning.
- **Change:** determine whether the current Workers topology can reach a supported
  scanner with required size, timeout, privacy, and availability characteristics.
  Select an existing viable provider boundary or reject/defer with exact gaps.
- **Acceptance:** one implementable provider contract exists, or scanning is
  truthfully blocked/deferred without pretending the policy scanner is malware
  scanning.
- **Evidence:** official provider/runtime docs and current adapter map; hosted
  proof remains credential/user-gated.

## UNIT-022 — Define The Image Scan State Machine And Provider Contract

- **Sources:** improve `006` (split).
- **Dependencies:** `UNIT-012`, `UNIT-019`, `UNIT-020`, `UNIT-021`.
- **Owned paths:** scanner/provider interfaces, upload state definitions, queue
  and R2/Images binding map; no producer, consumer, or delivery mutation.
- **Change:** specify reserve → upload → queued → scanning → clean/quarantine →
  delivery transitions, checksum identity, retry/idempotency keys, and the
  chosen provider boundary before implementation units touch code.
- **Acceptance:** every transition, failure state, trust boundary, and
  continuation condition is explicit. A rejected topology/provider outcome
  supersedes this unit and `UNIT-052` through `UNIT-054`; it does not unlock
  speculative implementation.
- **Evidence:** end-to-end dataflow, provider decision receipt, queue/binding map,
  and explicit keep/reject outcome from `UNIT-019` and `UNIT-021`.

## UNIT-023 — Make Upload Admission Atomic Across Isolates

- **Sources:** active-concurrency portion of improve `019`.
- **Dependencies:** `UNIT-016`.
- **Owned paths:** `src/lib/uploads/admission-control.ts`, selected D1/DO durable
  coordination boundary, fix-forward migration only if evidence requires one.
- **Change:** separate fixed-window abuse limiting from active reservation count;
  implement atomic acquire/release/expiry semantics across isolates using an
  existing bound primitive.
- **Acceptance:** concurrent uploads cannot oversubscribe the cap across isolates;
  abandoned reservations expire and release is idempotent.
- **Evidence:** concurrency state-machine proof and binding review; hosted proof
  and product tests remain proposed.

## UNIT-024 — Define The Publication Delivery Queue Contract

- **Sources:** performance `011`; improve `021`.
- **Owned paths:** publication state model, queue contract, binding map, and
  decision receipt; no producer/consumer implementation yet.
- **Change:** define event identity, token version/rotation semantics, durable
  enqueue state, retry/expiry rules, and whether an existing bound queue can
  carry the contract without weakening its current consumer.
- **Acceptance:** one publication-specific contract and binding decision exists;
  a missing semantic fit stops at the recorded authorization boundary instead
  of silently creating or reusing infrastructure.
- **Evidence:** publication state/queue flow, GitNexus impact, and queue binding
  proof.

## UNIT-025 — Batch Restore-Replay Row Reads

- **Sources:** performance `004`; improve `023`.
- **Owned paths:** `src/lib/estimates/d1-intents/rows.ts`.
- **Change:** replace per-ID `Promise.all(readRowById)` in idempotent restore replay
  with the existing bounded batch-read pattern, preserving input order, missing
  rows, and replay response shape.
- **Acceptance:** one bounded read set replaces N reads and replay semantics do
  not change.
- **Evidence:** LOW GitNexus impact, SQL/source diff, statement-count reasoning.

## UNIT-026 — Make Web Vitals Page Lifecycle Deterministic

- **Sources:** deterministic half of performance `002`.
- **Owned paths:** `src/components/web-vitals-collector.tsx`.
- **Change:** retain stable observer/listener references, disconnect observers,
  and remove the exact `pagehide` handler during cleanup.
- **Acceptance:** remount/unmount cannot accumulate observers or anonymous unload
  listeners; current metric payload shape remains valid.
- **Evidence:** lifecycle source review and static diff.

## UNIT-027 — Decide Web Vitals Batching And Sampling From Evidence

- **Sources:** measurement half of performance `002`.
- **Dependencies:** `UNIT-026`.
- **Owned paths:** Web Vitals collector, internal endpoint, observability writer,
  decision receipt.
- **Change:** measure event volume and loss tolerance; choose keep, bounded batch,
  sampling, or retention adjustment. Implement only the supported option with
  backward-compatible payload parsing.
- **Acceptance:** one measured policy and volume budget exists; no speculative
  sampling silently drops diagnostic coverage.
- **Evidence:** local payload/statement counts and current retention review.

## UNIT-028 — Avoid Empty Five-Minute Cron Event Writes

- **Sources:** performance `005`.
- **Owned paths:** `worker.ts`, cron observability repository, scheduled task
  summary shape.
- **Change:** record a cron-run row only for meaningful work, failure, or an
  intentionally sampled heartbeat; preserve error observability. Use the correct
  288 invocations/day baseline.
- **Acceptance:** no-op five-minute runs stop producing unconditional rows while
  failed and productive runs remain observable.
- **Evidence:** scheduler branch review, statement-count calculation, static diff.

## UNIT-029 — Reconcile Activity Outbox Set-Wise

- **Sources:** performance `009` and redirected `PERF-CRON-003`.
- **Owned paths:** `src/lib/activity/activity-outbox.ts` plus a fix-forward index
  only if local query evidence requires it.
- **Change:** replace the current 1+2N reconciliation loop with bounded set-based
  updates/selects while preserving each row's retry count, next-attempt backoff,
  lease/error state, and cap.
- **Acceptance:** a 500-row pass no longer creates up to 1,001 statements and
  retains per-row retry semantics.
- **Evidence:** local D1 SQL dry run/EXPLAIN, state-transition review, static diff.

## UNIT-030 — Narrow Whole-Result TanStack Query Subscriptions

- **Sources:** fresh React Doctor production errors.
- **Owned paths:** `SharePageComments.tsx`, `SharedLinkActivityFeed.tsx`,
  `TemplateEditorClient.tsx`, `proposals-page-client.tsx`.
- **Change:** destructure or select only used query fields so components do not
  subscribe to irrelevant result-object changes; preserve status/error/data use.
- **Acceptance:** all four components retain behavior and no longer hold the whole
  query result solely for a subset of fields.
- **Evidence:** call-site review, React Doctor scoped rerun proposal, static diff.

## UNIT-031 — Stabilize Virtual Row Inputs Without Hooks Violations

- **Sources:** performance `003`; improve `022`.
- **Owned paths:** `src/components/workshop/estimate-sheet/rows/row-table.tsx` and the
  memoized row boundary.
- **Change:** first confirm prop identity contributes measurable rerenders. If it
  does, pass stable primitives or precompute outside the row loop; never call
  `useMemo` inside `.map()`.
- **Acceptance:** profiler/source evidence supports the chosen terminal state;
  any implementation obeys Hooks rules and preserves virtualization coordinates.
- **Evidence:** component boundary review; profiler/browser proof is user-gated.

## UNIT-032 — Replace Unbounded Library Loading With Order-Safe Paging

- **Sources:** performance `013`.
- **Owned paths:** `src/lib/repositories/component-library-repository.ts`, its
  page/UI consumer, fix-forward index only after local `EXPLAIN`.
- **Change:** preserve current category/name ordering while replacing repeated
  OFFSET full-load accumulation with a bounded page/cursor contract or a
  matching covering index. Do not use `created_at` keyset ordering that changes
  behavior or edit applied migrations.
- **Acceptance:** project library browsing is bounded and order-stable; local
  `EXPLAIN QUERY PLAN` supports any new index.
- **Evidence:** query plan, pagination consumer map, static diff.

## UNIT-033 — Define Message-Specific Durable Object Backpressure

- **Sources:** performance `007`.
- **Owned paths:** collaboration/presence/support Durable Object send paths and a
  shared policy only if message semantics genuinely align.
- **Change:** classify messages as droppable/coalescible/required, prove runtime
  buffered-amount support, then apply thresholds per class. Never globally drop
  auth, error, or state-convergence messages.
- **Acceptance:** slow consumers have a documented bounded policy and required
  messages retain reliable close/retry behavior; unsupported runtime APIs yield
  a rejection receipt, not speculative code.
- **Evidence:** official Cloudflare API proof, send-site inventory, local model.

## UNIT-034 — Measure And Remove Redundant XLSX Body Copying

- **Sources:** performance `008`.
- **Owned paths:** proposal XLSX route and workbook builder.
- **Change:** isolate the response-body conversion from workbook generation,
  measure peak memory, and remove a redundant copy only when the Workers response
  API accepts the workbook buffer safely. Do not change ZIP compression here.
- **Acceptance:** the copy is independently retained or removed from bounded
  memory evidence, with identical response bytes and a reversible terminal state.
- **Evidence:** bounded local memory/byte-identity evidence; no hosted load run
  without authority.

## UNIT-035 — Decide Auth Read Coalescing Without Weakening Revocation

- **Sources:** performance `010`.
- **Owned paths:** `src/lib/auth/better-auth-cloudflare.ts`, session readers, auth
  architecture decision receipt.
- **Change:** map the three D1 reads and determine whether request-local
  coalescing can remove duplication. Treat `disableCookieCache: true` as an
  intentional immediate-revocation control; do not enable cached sessions without
  an explicit revocation/staleness policy.
- **Acceptance:** supported read coalescing is implemented or rejected; session
  revocation semantics never weaken silently.
- **Evidence:** official Better Auth session docs, request call graph, D1 counts.

## UNIT-036 — Place The Dormant Closed-Beta Guard Without Request D1

- **Sources:** consistency `009`.
- **Owned paths:** closed-beta config, proxy/middleware/auth boundary, no new
  per-request database lookup.
- **Change:** confirm the dormant feature's intended activation contract and place
  enforcement at a configuration/session-aware boundary if still needed. Keep it
  dormant or remove dead configuration if the product decision has expired.
- **Acceptance:** one explicit activation path exists without adding middleware
  D1 overhead; current OFF behavior remains truthful.
- **Evidence:** auth/config route map and owner-state record.

## UNIT-037 — Map Route/Provider Consumers Before Provider Splitting

- **Sources:** performance `012`.
- **Owned paths:** provider composition and route layouts only after a read-only
  consumer map.
- **Change:** identify which of the eight global providers are used per route and
  measure the bundle/mount consequence. Split only providers proven unnecessary
  outside their route group; keep intentionally global query/auth/theme owners.
- **Acceptance:** a route-provider matrix supports every move, and any split has
  one owner with no duplicate provider instances.
- **Evidence:** import/route map and bundle evidence proposal; no browser QA by
  default.

## UNIT-038 — Explain Component-Source Guard SQL Before Refactoring

- **Sources:** performance `014`.
- **Dependencies:** `UNIT-001`.
- **Owned paths:** `src/lib/component-library/template-propagation-d1.ts`, local
  D1 fixture/query evidence, fix-forward index only if proven.
- **Change:** run local `EXPLAIN QUERY PLAN` and representative fanout counts for
  the current `json_each`/`json_extract` guards. Refactor to a CTE/index only when
  the plan proves a material improvement without changing guarded semantics.
- **Acceptance:** HIGH-risk SQL is implemented with before/after query evidence or
  rejected with a decisive no-benefit receipt.
- **Evidence:** mandatory HIGH GitNexus review plus local EXPLAIN/fanout evidence.

## UNIT-039 — Resolve Column-Width Reset Scope From UX Evidence

- **Sources:** consistency `011`.
- **Owned paths:** column-width reset action/store and the control that invokes it.
- **Change:** determine whether reset means current estimate, workspace default,
  or global last-used preference; align key deletion and copy with that contract.
- **Acceptance:** reset scope is explicit and implementation matches it; absent a
  product signal, retain behavior and close as evidence-rejected.
- **Evidence:** current UI copy, key ownership, and consumer map.

## UNIT-040 — Decide Invite-Preview Disclosure Policy

- **Sources:** consistency `017`.
- **Owned paths:** invite preview response and consuming page, policy receipt.
- **Change:** inventory actually rendered fields and decide whether unauthenticated
  token holders may see them. Gate or redact only fields the policy classifies as
  sensitive; do not implement the stale claim that `invited_email` is rendered.
- **Acceptance:** policy and response agree, or current unguessable-token behavior
  is explicitly retained.
- **Evidence:** response/UI field map and privacy decision.

## UNIT-041 — Resolve The Root Share API Contract

- **Sources:** consistency `024`.
- **Owned paths:** `src/app/api/share/[token]/route.ts`, external-contract docs,
  direct consumers if any are discovered.
- **Change:** prove whether external consumers rely on `publicationId`. If none,
  return the real publication ID or rename the opaque project ID field with a
  version-safe response; otherwise preserve and document compatibility.
- **Acceptance:** field name/value semantics are truthful without breaking a
  known consumer.
- **Evidence:** GitNexus route map plus explicit external contract search.

## UNIT-042 — Inventory And Classify Real Client Failures

- **Sources:** improve `018` (rewritten).
- **Owned paths:** current client error reporter and a generated domain inventory;
  no production call-site migration.
- **Change:** classify the 46 reported calls into actionable failures,
  intentional development/performance probes, and harmless diagnostics; record
  payload/redaction requirements for each migration domain.
- **Acceptance:** every candidate has one classification and owner, with no
  blanket `no-console` rule or mixed-domain implementation receipt.
- **Evidence:** call inventory, current reporter contract, and redaction review.

## UNIT-043 — Define The Action-Error Compatibility Contract

- **Sources:** improve `024`.
- **Owned paths:** `src/lib/observability/with-action-errors.ts`, current shared
  error types, and a domain compatibility matrix; no domain migration.
- **Change:** define thrown-versus-returned public contracts, expected validation/
  auth shapes, unexpected-error reporting, and the minimum `AppError` mapping
  needed by `UNIT-061` through `UNIT-064`.
- **Acceptance:** the wrapper contract is explicit enough that each domain can
  migrate and close independently without changing client-visible codes or
  recovery behavior.
- **Evidence:** wrapper impact map, response-shape matrix, and static contract
  review. **TEST_PROPOSAL:** existing wrapper contract suite.

## UNIT-044 — Define Remaining Workspace Repository Extraction Boundaries

- **Sources:** improve `025` (amended); July-16 estimate-tree extraction complete.
- **Owned paths:** `src/lib/repositories/workspace-repository.ts`, its callers,
  and an extraction/import-boundary map; no symbol move.
- **Change:** exclude July-16 estimate-tree work, partition remaining publication/
  homebase and access/admin exports, record transaction/auth seams, and choose a
  serialization order for `UNIT-065` and `UNIT-066`.
- **Acceptance:** every remaining export has one target domain and all shared-file
  or circular-import hazards are known before extraction.
- **Evidence:** GitNexus context/impact and import-cycle baseline.

## UNIT-045 — Decompose EstimateSheet Orchestration And JSX

- **Sources:** improve `026` (rewritten); prior July-16 row-store work complete.
- **Dependencies:** `UNIT-003`, `UNIT-031`.
- **Owned paths:** `EstimateSheetContent.tsx` and newly extracted hooks/components
  with exclusive shared-file ownership.
- **Change:** split remaining orchestration, derived view state, sidebars, and JSX
  at existing stable boundaries. Keep `EditableRowStore` the sole commit/rollback
  owner and do not repeat the old row-hook extraction recipe.
- **Acceptance:** the main component materially shrinks, extracted boundaries have
  explicit inputs, and render/commit semantics remain unchanged.
- **Evidence:** mandatory leader-reviewed impact, source/static render contract,
  type/lint. **TEST_PROPOSAL:** named characterization/memoization suites.

## UNIT-046 — Remove The FireCMS Neat Patch And Dependency

- **Sources:** improve `027`.
- **Owned paths:** `src/components/landing/NeatWireframeBackground.tsx`, `package.json`, lockfile,
  patch file, a small self-owned background implementation or existing asset.
- **Change:** replace the sole patched package use with an existing/local minimal
  effect, then remove dependency and patch with no new package.
- **Acceptance:** landing background retains an intentional accessible fallback,
  the dependency/patch is absent, and non-visual source behavior is unchanged.
- **Evidence:** dependency/import scan and static diff. **TEST_PROPOSAL:** existing
  component test; visual parity is separately user-gated.

## UNIT-047 — Delete Orphaned Client Portal Decision Actions

- **Sources:** consistency `034` and invalid dead-service residue from `004`.
- **Owned paths:** `src/lib/client-portal/decision-actions.ts`, exports/imports and
  stale documentation only.
- **Change:** reverify zero production importers, remove the orphaned module and
  any dead export surfaces; do not invent status-recompute behavior for the
  unreachable function.
- **Acceptance:** no production/runtime import breaks and the dead path cannot be
  re-raised as a live correctness defect.
- **Evidence:** GitNexus context plus source import scan and static diff.

## UNIT-048 — Reassess A Next.js 16 Nonce CSP After Share Stabilization

- **Sources:** improve `016` (conditional; July-16 BY-DESIGN defer).
- **Dependencies:** `UNIT-007`, `UNIT-010`, `UNIT-041`.
- **Owned paths:** local Next.js 16 docs, Proxy/dynamic rendering architecture,
  share CSP config only after decision.
- **Change:** verify current Next 16 nonce requirements and quantify dynamic-render
  and rollout cost. Implement only if the owner priority is reactivated and a
  browser/CSP `TEST_TASK` exists; do not use the stale `headers()` nonce design.
- **Acceptance:** current defer remains explicit or an approved, framework-valid
  per-request design exists with a rollback plan.
- **Evidence:** local official Next docs and current route architecture.

## UNIT-049 — Reassess Revision Handoff At The MVP Stage-C Trigger

- **Sources:** improve `029`.
- **Disposition:** `SUPERSEDED` in this pack; the MVP Stage-C owner is canonical.
- **Owned paths:** MVP owner plan and a decision receipt until Stage C is active.
- **Change:** at the named trigger, compare existing immutable issue/thread
  carry-forward with the partial change-request → source-estimate navigation;
  define only the missing bounded handoff.
- **Acceptance:** before Stage C, the unit closes as deferred to the MVP owner;
  after the trigger, it yields one narrow navigation/revision unit rather than a
  second proposal-surface architecture.
- **Evidence:** current Client Portal composer and admin estimate-system map.

## UNIT-050 — Bound Cost-Intelligence Research After Money Convergence

- **Sources:** improve `030`.
- **Disposition:** `SUPERSEDED/DEFERRED_NO_ACTIVE_OWNER`; neither this master nor
  the current MVP pack owns runnable research.
- **Trigger:** reopen only after `UNIT-014=VERIFIED` and a new explicitly named
  cost-intelligence plan pack is created with an owner, bounded user decision,
  query/privacy budget, and acceptance criteria.
- **Owned paths:** none while superseded; the future pack must declare them.
- **Change:** none in this pack. Do not create a dashboard, aggregate, or AI
  expansion from this historical proposal.
- **Acceptance:** this unit remains non-runnable until the complete trigger is
  recorded; the future pack becomes the sole canonical owner if created.
- **Evidence:** deferred-no-owner receipt and future plan-pack path, if any.

## UNIT-051 — Remove The Dead Row-Update Broadcast Hook

- **Sources:** performance `017` (retained cleanup).
- **Status:** `BLOCKED` until the user explicitly authorizes a test task because
  two maintained Vitest files import the otherwise production-dead module.
- **Owned paths:** `src/hooks/use-estimate-row-update-broadcast.ts`,
  `src/lib/admin/estimate-system-knowledge-data.ts`, and the two importing tests.
- **Change:** take the source pack's preferred deletion branch, remove stale
  knowledge references, and delete or rewrite only the tests whose sole subject
  is the removed hook. Do not wire a receive side without a product request.
- **Acceptance:** no production, knowledge, or test reference remains; no realtime
  row-update capability is claimed after deletion.
- **Evidence:** repository-wide reference scan and user-authorized targeted test
  task; no test edits or execution are authorized by this plan alone.

## UNIT-052 — Enforce Image Scan Admission And Enqueue

- **Sources:** improve `006` (split).
- **Dependencies:** `UNIT-022` with a positive retained-state-machine receipt.
- **Owned paths:** component-image upload admission, checksum-bound reservation,
  and scan-job producer only.
- **Change:** mark covered images scan-required, reject missing checksum identity,
  and enqueue exactly one scan event without making the object public.
- **Acceptance:** covered uploads cannot take a `not_required` shortcut and a
  retry cannot create a second logical scan job.
- **Evidence:** producer state transition, queue payload diff, binding review.

## UNIT-053 — Consume Image Scan Results Idempotently

- **Sources:** improve `006` (split).
- **Dependencies:** `UNIT-052`.
- **Owned paths:** scanner consumer, result persistence, retry and quarantine
  transitions; no public delivery mutation.
- **Change:** process the provider result once per checksum/event identity,
  quarantine failures or unsafe objects, and preserve recoverable retry state.
- **Acceptance:** duplicate/out-of-order results cannot publish, regress, or
  silently lose the object state.
- **Evidence:** consumer/result state proof and fix-forward recovery receipt.

## UNIT-054 — Gate Image Delivery To Verified Clean Objects

- **Sources:** improve `006` (split).
- **Dependencies:** `UNIT-053`.
- **Owned paths:** R2/Images delivery authorization and public URL resolution.
- **Change:** expose only checksum-bound objects in the clean terminal state;
  quarantine, pending, failed, or superseded objects remain non-public.
- **Acceptance:** every delivery path checks the same clean-state authority and
  cannot bypass it through legacy URL generation.
- **Evidence:** delivery call graph, access-boundary diff, recovery proof.

## UNIT-055 — Persist Publication Delivery Intent And Enqueue

- **Sources:** performance `011`; improve `021`.
- **Dependencies:** `UNIT-024` with a positive existing-bound-queue decision.
- **Owned paths:** `src/lib/publication/actions.ts`, publication delivery intent,
  and producer adapter only.
- **Change:** persist invite/token version and recoverable delivery intent before
  enqueue, then return without waiting for email delivery.
- **Acceptance:** enqueue failure leaves truthful resumable state and request
  latency no longer includes recipient delivery.
- **Evidence:** transaction/order proof, producer payload, fix-forward receipt.

## UNIT-056 — Deliver Publication Events Idempotently

- **Sources:** performance `011`; improve `021`.
- **Dependencies:** `UNIT-055`.
- **Owned paths:** publication-specific queue consumer and email adapter only.
- **Change:** deliver once per recipient/event/token version, reject obsolete
  tokens, and keep Client Portal notification semantics behind an explicit
  adapter rather than reusing its payload blindly.
- **Acceptance:** retries cannot deliver an obsolete or duplicate logical event.
- **Evidence:** consumer idempotency flow, token-rotation proof, recovery receipt.

## UNIT-057 — Reconcile Publication Delivery Outcomes

- **Sources:** performance `011`; improve `021`.
- **Dependencies:** `UNIT-056`.
- **Owned paths:** publication delivery status/result reconciliation and retry
  visibility only.
- **Change:** persist sent, terminal-failed, retryable, and superseded outcomes so
  callers and operators see the truthful state.
- **Acceptance:** no queued event remains ambiguously successful and recovery can
  resume without rotating or resending the wrong token.
- **Evidence:** result-state diff, operator visibility, fix-forward receipt.

## UNIT-058 — Migrate Workshop Client Failures To Structured Reporting

- **Sources:** improve `018` (rewritten).
- **Dependencies:** `UNIT-042`.
- **Owned paths:** workshop/estimate client components classified actionable by
  the inventory.
- **Change:** migrate only actionable failures to the existing structured,
  redacted fire-and-forget reporter; preserve intentional probes.
- **Acceptance:** workshop failures retain UX behavior and emit no sensitive data.
- **Evidence:** domain call list, redaction and static diff receipt.

## UNIT-059 — Migrate Publication And Portal Client Failures

- **Sources:** improve `018` (rewritten).
- **Dependencies:** `UNIT-042`.
- **Owned paths:** publication, share, and Client Portal client components
  classified actionable by the inventory.
- **Change:** apply the existing reporter without changing token, auth, navigation,
  or user-recovery behavior.
- **Acceptance:** domain failures are structured/redacted and intentional probes
  remain explicit.
- **Evidence:** domain call list, auth/redaction review, static receipt.

## UNIT-060 — Migrate Admin Support And Upload Client Failures

- **Sources:** improve `018` (rewritten).
- **Dependencies:** `UNIT-042`.
- **Owned paths:** admin, support, library, and upload client components classified
  actionable by the inventory.
- **Change:** migrate only actionable failures while preserving operator-facing
  diagnostics and current fire-and-forget behavior.
- **Acceptance:** the domain closes with one bounded receipt and no blanket
  console ban.
- **Evidence:** domain call list, redaction review, static receipt.

## UNIT-061 — Migrate Publication Action Errors

- **Sources:** improve `024`.
- **Dependencies:** `UNIT-043`.
- **Owned paths:** publication actions and their direct consumers.
- **Change:** apply the compatibility contract without changing validation,
  invite/token, or recovery response shapes.
- **Acceptance:** unexpected errors report/map consistently; expected results are
  byte/shape compatible at the public boundary.
- **Evidence:** GitNexus impact, response-shape diff, fix-forward receipt.

## UNIT-062 — Migrate Library Action Errors

- **Sources:** improve `024`.
- **Dependencies:** `UNIT-043`.
- **Owned paths:** library actions and direct consumers.
- **Change:** apply the compatibility contract while retaining current validation,
  import, and variant error shapes.
- **Acceptance:** the library domain closes independently with no shared-wrapper
  drift.
- **Evidence:** GitNexus impact, response-shape diff. **TEST_PROPOSAL:** existing
  library action-error suite.

## UNIT-063 — Migrate Estimate And Workshop Action Errors

- **Sources:** improve `024`.
- **Dependencies:** `UNIT-043`.
- **Owned paths:** estimate/workshop actions and direct consumers.
- **Change:** apply the compatibility contract without changing stale-write,
  mutation, or client recovery semantics.
- **Acceptance:** expected domain results remain shape-compatible and unexpected
  throws report once.
- **Evidence:** GitNexus impact, response-shape diff, fix-forward receipt.

## UNIT-064 — Migrate Admin And Support Action Errors

- **Sources:** improve `024`.
- **Dependencies:** `UNIT-043`.
- **Owned paths:** admin/support actions and direct consumers.
- **Change:** apply the compatibility contract while preserving authorization and
  operator-visible recovery behavior.
- **Acceptance:** no auth/validation result becomes a generic unexpected error.
- **Evidence:** GitNexus impact, response-shape and auth-boundary receipt.

## UNIT-065 — Extract Publication And Homebase Repositories

- **Sources:** improve `025` (amended).
- **Dependencies:** `UNIT-044`.
- **Owned paths:** `workspace-repository.ts`, publication/homebase callers, and
  focused repository siblings.
- **Change:** move the mapped publication/homebase exports behind direct imports
  without a compatibility re-export facade.
- **Acceptance:** callers compile against focused modules and transaction/auth
  seams plus import direction remain unchanged.
- **Evidence:** GitNexus impact, import-cycle check, scoped type/lint receipt.

## UNIT-066 — Extract Access And Admin Repositories

- **Sources:** improve `025` (amended).
- **Dependencies:** `UNIT-065` because both units edit the shared source module.
- **Owned paths:** remaining mapped access/admin exports, callers, and focused
  repository siblings.
- **Change:** complete the second extraction slice without redoing July-16
  estimate-tree work or leaving a compatibility facade.
- **Acceptance:** remaining mixed-domain exports are removed, callers use focused
  modules, and no circular import or transaction/auth change appears.
- **Evidence:** GitNexus impact, import-cycle check, scoped type/lint receipt.

## UNIT-067 — Decide XLSX ZIP Compression From Isolated Evidence

- **Sources:** performance `008`.
- **Owned paths:** proposal XLSX workbook builder compression options only.
- **Change:** measure workbook size and CPU with compression isolated from response
  body copying. Enable compression only when the size benefit justifies Workers
  CPU/memory cost; otherwise retain the current setting with a rejection receipt.
- **Acceptance:** compression has one independently measured terminal decision,
  does not depend on `UNIT-034`, and preserves workbook contents.
- **Evidence:** bounded local size/CPU comparison and workbook-content identity;
  no hosted load run without authority.

## Test-Only Follow-Up

`FOLLOWUP-TEST-001` preserves consistency source `035`: the getting-started route
test references a removed checklist. It is `TEST_PROPOSAL`, not a runnable unit.
When the user explicitly authorizes a test task, reverify the production route,
remove or rewrite only the stale assertion, and run only that targeted file.
