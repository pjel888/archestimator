# Client Portal Plan-Pack Loop Ledger

## Goal

Implement the Client Portal plan pack from the source-grounded active pack through the complete in-scope repository outcome.

## Run contract

- **Goal/thread:** `019f5542-3224-7eb0-88de-cfc1d2b891d8`
- **Current run scope:** `IMPLEMENT_LOCAL`
- **Profile:** `high-blast-radius`
- **Baseline HEAD:** `6b59648a70c485cd54bad8f3659b3ec454621530`
- **Shared-file integrator:** lead agent
- **Test requirement:** user-directed focused QA was executed for the completed local units; browser, build, hosted, and broad-suite validation remain unrequested.
- **Stop condition:** every core implementation unit is evidenced, no in-scope implementable work remains, and final completion audit passes.

## Capability selection

| Capability | Use | Result |
|---|---|---|
| Supermemory | Required bootstrap and bounded memory lookup | Ready; no task-specific prior fact overrode current source |
| Codex goal mode | Durable objective | Existing compatible goal reused |
| Autoresearch goal discipline | Rubric/stop-condition framing | Reused active goal; no second goal created |
| Official-source research | Validate product-design decisions | Figma, Procore, Qwilr, and W3C primary sources refreshed |
| GitNexus | Broad publication/share flow map | Bounded query used as secondary evidence; index stale and guarded reindex refused unpinned fallback |
| Ultrawork/autopilot | Hands-off execution discipline | Direct single-integrator lane selected because manifest/IDs/cross-links are tightly coupled |
| UltraQA | Focused local validation | Policy/registry Vitest suites and TypeScript gate passed; no browser, build, or broad QA run |
| Product design | Design synthesis | Exact `$product-design` skill unavailable; substituted current `DESIGN.md`, current source, and official product references |

## Semantic audit

| Criterion | Result | Evidence |
|---|---|---|
| Newer pack remains canonical | PASS | User objective and `README.md` |
| Older research comprehended | PASS | `21-SHARED-ESTIMATE-PAGE-AUDIT-DELTA.md` |
| Valid findings retained | PASS | Delta mapping to `REQ-*` and `UNIT-*` |
| Obsolete/conflicting claims retired | PASS | Issuance and status reconciliation in delta |
| Ordinary decisions closed | PASS | `DEC-AUTO-001` through `DEC-AUTO-026` |
| One execution authority | PASS | `15-IMPLEMENTATION-ROADMAP-AND-BACKLOG.md` |
| Test gate preserved | PASS | `16-QUALITY-TEST-RELEASE-AND-OPERATIONS.md` |
| Current-source freshness | PASS | Source inspection at baseline HEAD; stale graph explicitly downgraded |
| Manifest/readiness validation | PASS | Active and archived plan-pack validators passed; planning-prompt suite passed |
| Archive move/reference repair | PASS | Active source path absent; archived predecessor present with 13 files; remaining old-path mentions are explicit historical records |

## Decision log

- `DEC-AUTO-024`: merge the older pack by source-reviewed evidence delta, not wholesale duplication.
- `DEC-AUTO-025`: estimate variants are not a current Client Portal requirement.
- `DEC-AUTO-026`: issuance metadata is implemented; retire the obsolete gap.

## Execution checkpoint — 2026-07-12 UNIT-001

- **Run ID:** `client-portal-unit-001-20260712`
- **Goal/thread:** `019f5542-3224-7eb0-88de-cfc1d2b891d8`
- **Baseline HEAD:** `6b59648a70c485cd54bad8f3659b3ec454621530`
- **Shared-worktree observation:** unrelated archive moves and plan-index updates were already present and were not modified.
- **Lease owner:** lead agent for `src/lib/client-portal/contracts.ts` and this plan-pack checkpoint.
- **Completed unit:** `UNIT-001 — Ratify domain contract and record decisions`.
- **Evidence:** `evidence/UNIT-001-DOMAIN-CONTRACT-v1.md`; source inspection of the current publication route, D1 migrations, snapshot boundary, and legacy decision flow.
- **Decisions frozen:** stable portal versus immutable issue; multiple portals per project; typed section registry; contextual discussion targets; issue-wide formal decisions; external role/capability catalog; explicit public-ID namespaces; retention boundary; legacy compatibility mapping.
- **No-test boundary:** no automated tests, builds, browser automation, hosted checks, or provider mutations were run.
- **Residual risk:** legacy decision routes still carry target metadata and current project foreign keys cascade. They are compatibility concerns owned by `UNIT-002`, `UNIT-013`, and `UNIT-018`, not justification to alter legacy behavior during this docs/types unit.
- **Next ready unit:** `UNIT-002 — Add portal and issue D1 schema`.

## Execution checkpoint — 2026-07-12 UNIT-002

- **Run ID:** `client-portal-unit-002-20260712`
- **Lease owner:** lead agent for `migrations/0068_client_portal_foundation.sql` and this plan-pack checkpoint.
- **Completed unit:** `UNIT-002 — Add portal and issue D1 schema`.
- **Evidence:** `evidence/UNIT-002-D1-SCHEMA-v1.md`; focused source/diff review of the new additive migration and legacy publication schema.
- **Delivered boundary:** stable portals, draft/issue sections, recipients/credentials/grants, assets/brands, threads/messages/reads/subscriptions/mentions, issue-only decisions, audit/analytics/outbox, and legacy mapping/preflight.
- **Compatibility:** legacy publication tables and `/share/[token]` remain unchanged; no hosted D1 provider state was mutated.
- **Recovery:** pre-apply recovery is no apply; post-apply recovery is a forward-only ordered migration. Do not drop v2 issued-record tables.
- **Validation:** static review plus local D1 execution passed. Wrangler applied all 42 statements successfully, then `sqlite_master` confirmed all v2 tables, the legacy-preflight view, and the active issue-recipient decision index. Hosted apply/readback remains a release boundary.
- **Next ready unit:** `UNIT-003 — Central portal policy evaluator`.

## Execution checkpoint — 2026-07-12 UNIT-003

- **Run ID:** `client-portal-unit-003-20260712`
- **Lease owner:** lead agent for `src/lib/client-portal/policy.ts`, its focused test, and this plan-pack checkpoint.
- **Completed unit:** `UNIT-003 — Central portal policy evaluator`.
- **Evidence:** `evidence/UNIT-003-POLICY-v1.md`; TypeScript gate passed and the focused Vitest policy suite passed 6/6.
- **Delivered boundary:** typed actor/resource inputs, role templates, sparse overrides, capability ceilings, section/field filtering, safe denial reasons, shared role preview, and repository/action guard.
- **Residual boundary:** no v2 public route or Publisher action has been created yet. Legacy direct role checks are compatibility code and cannot authorize v2 resources.
- **Next ready unit:** `UNIT-004 — Typed section registry`.

## Execution checkpoint — 2026-07-12 UNIT-004

- **Run ID:** `client-portal-unit-004-20260712`
- **Lease owner:** lead agent for `src/lib/client-portal/section-registry.ts`, policy/contract integration, focused tests, and this plan-pack checkpoint.
- **Completed unit:** `UNIT-004 — Typed section registry`.
- **Evidence:** `evidence/UNIT-004-SECTION-REGISTRY-v1.md`; focused policy/registry suite passed 10/10 and `bunx tsc --noEmit --pretty false` passed.
- **Delivered boundary:** versioned draft and public section manifests, canonical initial section kinds, per-kind layouts/configuration, unknown-key rejection, and issue payload sanitization for hard-private plus opt-in controlled fields.
- **Correction:** recipient roles now include `field:view`; supplier/rate-style fields are controlled and hidden by default rather than permanently unshareable, matching `REQ-030`.
- **Residual boundary:** the registry does not yet build or persist an immutable issue, render a client route, or provide a Publisher control center.
- **Next ready unit:** `UNIT-005 — Issue builder and atomic publish`.

## Execution checkpoint — 2026-07-12 UNIT-005

- **Run ID:** `client-portal-unit-005-20260712`
- **Lease owner:** lead agent for `src/lib/client-portal/issue-builder.ts`, the v2 migration correction, focused tests, and this plan-pack checkpoint.
- **Completed unit:** `UNIT-005 — Issue builder and atomic publish`.
- **Evidence:** `evidence/UNIT-005-ISSUE-BUILDER-v1.md`; isolated Client Portal TypeScript program passed, focused suites passed 12/12, and fresh isolated local D1 applied 42 statements successfully.
- **Delivered boundary:** scoped source reads, policy-gated publish, typed section building/sanitization, immutable content hashes, per-portal idempotency, optional pre-staged R2 references, required D1 batch commit, supersession/current-pointer update, audit event, and outbox intent.
- **Migration correction:** `0068` now uses canonical `estimate_browser` for draft and issue sections and persists a unique per-portal issue idempotency key.
- **Residual boundary:** no public Client Portal route or Publisher action invokes the builder yet; later units own route/service integration and hosted release proof.
- **Next ready unit:** `UNIT-006 — Public portal access, manifest, and lazy section routes`.

## Planning closeout receipt

`evidence/FINAL-PLANNING-CLOSEOUT-v1.md` documents the earlier planning-only closeout. It is not implementation evidence for this active run.

## Execution checkpoint — 2026-07-12 UNIT-006

- **Run ID:** `client-portal-unit-006-20260712`
- **Lease owner:** lead agent for Client Portal public read/session routes, immutable payload contract, focused tests, and this plan-pack checkpoint.
- **Completed unit:** `UNIT-006 — Public portal access, manifest, and lazy section routes`.
- **Evidence:** `evidence/UNIT-006-PUBLIC-ACCESS-v1.md`; focused suite passed 15/15, isolated Client Portal access type-check passed, and clean local D1 migration apply passed.
- **Delivered boundary:** documented `/api/share/:token` manifest/section compatibility adapters; issued-only D1/R2 lazy reads; policy-first hidden-section filtering; immutable project/policy/payload snapshots; password and recipient session gates; private no-store security headers.
- **Correction found by QA:** empty issued allow-lists were normalized to unrestricted rather than accidentally hiding every section; payload bytes are re-sanitized and canonical-hash checked at read time.
- **Residual boundary:** the legacy root share snapshot/session routes remain intact for legacy publications; hosted headers, rate limits, and backfill/cutover are owned by `UNIT-018` through `UNIT-021`.
- **Next ready unit:** `UNIT-007 — Full-width Client Portal shell`.

## Execution checkpoint — 2026-07-12 UNIT-007

- **Run ID:** `client-portal-unit-007-20260712`
- **Lease owner:** lead agent for the v2 share-page branch, Client Portal shell, focused DOM proof, and this plan-pack checkpoint.
- **Completed unit:** `UNIT-007 — Full-width Client Portal shell`.
- **Evidence:** `evidence/UNIT-007-FULL-WIDTH-SHELL-v1.md`; Client Portal focused suite passed 16/16 and isolated shell/access type-check passed.
- **Delivered boundary:** token-safe v2/legacy page branch; viewport grid with desktop rails; mobile section navigation/action/context drawer; issue identity; hash deep links; issued-manifest/selected-section lazy fetches; password/unavailable states.
- **Residual boundary:** generic payload rendering is intentional until section-specific units; this unit has no browser, hosted, or print-device proof.
- **Next ready unit:** `UNIT-008 — Estimate browser extraction and all-row contract`.

## Execution checkpoint — 2026-07-12 UNIT-008

- **Run ID:** `client-portal-unit-008-20260712`
- **Lease owner:** lead agent for issued estimate-browser adapter, renderer, focused test, and this plan-pack checkpoint.
- **Completed unit:** `UNIT-008 — Estimate browser extraction and all-row contract`.
- **Evidence:** `evidence/UNIT-008-ESTIMATE-BROWSER-v1.md`; Client Portal focused suite passed 17/17 and isolated estimate-browser/shell type-check passed.
- **Delivered boundary:** versioned safe estimate payload; compact-tab/legacy compatibility; deterministic all-row paging; Load more/Load all; before-print expansion; dedicated renderer.
- **Residual boundary:** publisher callback composition, tree visualization, and target-action writes remain later units; no browser/device print proof was claimed.
- **Next ready unit:** `UNIT-009 — Financial section adapters`.

## Execution checkpoint — 2026-07-12 UNIT-009

- **Run ID:** `client-portal-unit-009-20260712`
- **Lease owner:** lead agent for issued financial adapters, focused test, and this plan-pack checkpoint.
- **Completed unit:** `UNIT-009 — Financial section adapters`.
- **Evidence:** `evidence/UNIT-009-FINANCIAL-ADAPTERS-v1.md`; Client Portal focused suite passed 18/18 and adapter type-check passed.
- **Delivered boundary:** versioned, reconciliation-safe financial summary, discipline breakdown, and estimate comparison payloads with sensitive source facts excluded.
- **Residual boundary:** publisher callback wiring, chart UI, and discussion targets remain integration work and are not claimed complete here.
- **Next ready unit:** `UNIT-010 — Stable recipient identity and credentials`.

## Execution checkpoint — 2026-07-12 UNIT-010

- **Run ID:** `client-portal-unit-010-20260712`
- **Lease owner:** lead agent for recipient lifecycle service/actions, focused test, and this plan-pack checkpoint.
- **Completed unit:** `UNIT-010 — Stable recipient identity and credentials`.
- **Evidence:** `evidence/UNIT-010-RECIPIENT-LIFECYCLE-v1.md`; expanded focused Client Portal suite passed 23/23 across 8 files, isolated lifecycle TypeScript program passed, and focused diff check passed.
- **Delivered boundary:** normalized stable recipient membership, external role templates, required-approver designation, hash-only bootstrap credentials, session-version invalidation, per-recipient revoke, authenticated invite/resend lifecycle actions, owner audit, and notification intent without raw token/email payloads.
- **Security behavior:** role changes, credential rotation, and revocation are policy-gated to the exact portal project and committed in D1 batches; revocation preserves recipient/history rows while immediately invalidating active credentials and recipient sessions.
- **Residual boundary:** legacy recipient bootstrap migration/backfill and hosted delivery worker proof remain `UNIT-018`/release work; no browser, hosted, or provider mutation is claimed.
- **Next ready unit:** `UNIT-011 — Thread and message domain`.

## Execution checkpoint — 2026-07-12 UNIT-011

- **Run ID:** `client-portal-unit-011-20260712`
- **Lease owner:** lead agent for Client Portal thread/message repositories, public discussion routes, forward-only migration `0069`, focused tests, and this plan-pack checkpoint.
- **Completed unit:** `UNIT-011 — Thread and message domain`.
- **Evidence:** `evidence/UNIT-011-THREAD-MESSAGE-DOMAIN-v1.md`; focused Client Portal suite passed 30/30 across 10 files, D1 local readback confirmed the idempotency and visibility upgrade, and focused diff check passed.
- **Delivered boundary:** typed general/contextual targets; recipient create/reply/resolve/reopen/read/subscription flows; active-recipient mentions; idempotency replay; recipient edit/tombstone policy; public client-only history; and carry-forward metadata/service primitive.
- **Security behavior:** internal notes persist with `visibility = 'internal'`; recipient history is explicitly constrained to `visibility = 'client'`. Public thread operations remain recipient-session/password gated and client-audience-only.
- **Migration correction:** existing local `0068` state lacked both message idempotency and visibility columns, so a forward-only `0069` backfill/index migration supersedes editing already-applied table history.
- **Residual boundary:** the Publisher inbox/UI and pre-send public preview are owned by `UNIT-012`; hosted proof remains a release boundary. Workspace type-check is presently blocked by the unrelated shared-edit syntax error in `src/components/workshop/EstimateWorkspaceClient.tsx:169`.
- **Next ready unit:** `UNIT-012 — Publisher discussion inbox and owner replies`.

## Execution checkpoint — 2026-07-12 UNIT-012

- **Run ID:** `client-portal-unit-012-20260712`
- **Completed unit:** `UNIT-012 — Publisher discussion inbox and owner replies`.
- **Evidence:** `evidence/UNIT-012-PUBLISHER-DISCUSSION-INBOX-v1.md`; focused Client Portal suite and targeted lint passed.
- **Delivered boundary:** manager-gated inbox route, client-visible owner replies, isolated internal notes, resolve/reopen, assignment and carry-forward service actions.
- **Residual boundary:** broader Publisher portfolio configuration remains `UNIT-016`/`UNIT-017` work.

## Execution checkpoint — 2026-07-12 UNIT-013

- **Run ID:** `client-portal-unit-013-20260712`
- **Completed unit:** `UNIT-013 — Explicit issue-wide decisions`.
- **Evidence:** `evidence/UNIT-013-ISSUE-DECISIONS-v1.md`; focused Client Portal suite passed 32 tests and targeted lint/diff checks passed.
- **Delivered boundary:** recipient decisions bind to an exact current issue hash and amount; duplicate submit replays; manager void preserves append-only history.
- **Residual boundary:** hosted legal-signature and quorum workflows remain out of scope.

## Execution checkpoint — 2026-07-12 UNIT-014

- **Run ID:** `client-portal-unit-014-20260712`
- **Completed unit:** `UNIT-014 — Branding and brand assets`.
- **Evidence:** `evidence/UNIT-014-BRANDING-ASSETS-v1.md`; focused branding/issuance/public-shell suite passed 10/10, targeted lint passed, and `git diff --check` passed.
- **Delivered boundary:** manager-only profile hierarchy, constrained accessible themes, processed logo registration, opaque token-scoped asset reads, profile-derived immutable issue snapshots, and resilient co-brand header rendering.
- **Residual boundary:** custom domains, custom fonts, email/PDF generation, and hosted delivery/cache proof remain later/release work; no browser proof is claimed.
- **Next ready unit:** `UNIT-015 — Audit, client activity, analytics, notification outbox`.

## Execution checkpoint — 2026-07-12 UNIT-015

- **Run ID:** `client-portal-unit-015-20260712`
- **Completed unit:** `UNIT-015 — Audit, client activity, analytics, notification outbox`.
- **Evidence:** `evidence/UNIT-015-ACTIVITY-ANALYTICS-NOTIFICATIONS-v1.md`; focused activity/queue/decision/thread suite passed 18/18, targeted lint passed, `bun run type-check` passed, and `git diff --check` passed.
- **Delivered boundary:** separate owner audit/client-safe activity/analytics ledgers; verified-human analytics gates; bounded owner audit and recipient matrix; action-required evaluation; recipient-specific issue notification fan-out; atomic audited reminder intent with cooldown/decision/unsubscribe/revocation suppression; dedicated lease/retry/dead-letter Cloudflare queue handling.
- **Residual boundary:** no browser, hosted Email/Queue, provider, or production telemetry-policy proof is claimed. Unit 16 owns control-center presentation and operational UX.
- **Next ready unit:** `UNIT-016 — Publisher portal portfolio and control center`.

## Execution checkpoint — 2026-07-12 UNIT-016

- **Run ID:** `client-portal-unit-016-20260712`
- **Completed unit:** `UNIT-016 — Publisher portal portfolio and control center`.
- **Evidence:** `evidence/UNIT-016-PUBLISHER-CONTROL-CENTER-v1.md`; focused control-center suite passed 3/3, targeted lint passed, and focused diff check passed.
- **Delivered boundary:** project-scoped, server-paginated portal roster; full-page URL-addressable control center; bounded lazy tab data; recipient next-action/discussion/decision/audit/version projections; selected-estimate source freshness; project sidebar entry point.
- **Residual boundary:** legacy `/workshop/publisher` continues to own legacy client links. Its active remediation findings are retained in `Publisher-Page-Audit`; no migration/removal claim is made here. Full workspace type-check is blocked by unrelated shared `src/lib/admin/support-actions.ts` nullability errors.
- **Next ready unit:** `UNIT-017 — Typed composer and policy editor`.

## Execution checkpoint — 2026-07-12 UNIT-017

- **Run ID:** `client-portal-unit-017-20260712`
- **Completed unit:** `UNIT-017 — Composer, readiness, preview-as-role, publish flow`.
- **Evidence:** `evidence/UNIT-017-COMPOSER-PUBLISH-v1.md`; focused lint, workspace type-check, 5 focused Vitest files / 9 tests, and diff check passed.
- **Delivered boundary:** project-scoped portal creation; registry-only typed composer; Proposal/Cost Review/Executive templates; state-derived publish readiness; explicit immutable issue confirmation; selected historic-thread carry-forward; outbox-backed invite/resend/revoke/role controls; and current-issued-section role preview through the central policy evaluator.
- **Publisher overlap:** `Publisher-Page-Audit` BUG-2 race handling is integrated and verified; its remaining legacy findings stay active because the legacy Publisher has not yet been migrated or retired.
- **Residual boundary:** browser/device, hosted Email/Queue, and hosted public-header proof are not claimed. Legacy backfill and dual-read migration are owned by `UNIT-018`.
- **Next ready unit:** `UNIT-018 — Legacy backfill and dual-read migration`.

## Execution progress — 2026-07-12 UNIT-018

- **Run ID:** `client-portal-unit-018-20260712`
- **Current state:** implementation in progress; not eligible for verification or cutover.
- **Delivered so far:** `legacy-migration-service.ts` provides an idempotent dry-run/apply path that reuses protected legacy token material, maps a legacy publication to a stable portal/current issue, imports only recipient-linked comments and decisions, preserves internal comments as internal-only records, and reports unresolved recipient/target ambiguity instead of guessing an audience merge. The manager action rechecks project/workspace ownership before calling it.
- **Readback guard:** an apply now verifies the deterministic portal/issue mapping, current issue, stable token hash, immutable content hash, and imported recipient/thread/message/decision counts before promoting the mapping to `verified`. A retry completes this same verification if a prior batch committed but status promotion did not. Publisher rosters expose the Client Portal control-center link only for a project-scoped `verified` or `cutover_complete` mapping, so unverified imports remain on the legacy flow.
- **Evidence:** local `client_portal_legacy_preflight` contains one unmigrated published candidate and reports zero recipients/comments/decisions; no raw migration write was made. Migration dry-run/apply-readback and roster bridge contracts passed (9 focused tests); focused output/public-policy/header suite passed 29 tests across 8 files; targeted lint, workspace type-check, and diff check passed. The pre-existing `publisher-drawer.test.tsx` is stale against the current Overview/Recipients/Activity tabs and was excluded from this migration-focused proof.
- **Open work:** no current local/hosted legacy publication has been applied through the protected action or read back against actual data; the Publisher now provides an explicit verified-migration bridge rather than an automatic redirect. Cohort cutover, rollback/fix-forward rehearsal, hosted public-header proof, and the Unit 19-21 release gates remain required before this unit or either pack can be archived.

## Execution update — 2026-07-12 UNIT-018 compatibility hardening

- **Delivered:** migration now reuses one project portal only when no established audience conflicts or a normalized recipient is shared. A disjoint established recipient audience is preserved in a separate deterministic portal rather than merged speculatively. Newly created portals receive their own encrypted stable token, while legacy token dual-read is fail-closed on `verified`/`cutover_complete` mapping state and resolves directly to the mapped immutable issue.
- **Readback:** recipient verification now counts imported credential hashes scoped to the target portal, which remains correct when a stable recipient row is reused across issues. The current-issue and stable-token assertions apply only when this migration creates a portal, not when it safely adds a historic issue to an existing portal.
- **Operational reachability:** a publication manager can now invoke the protected `apply: true` migration from the existing Publisher drawer, after an explicit confirmation. It reports verified import counts and refreshes the roster; unverified imports still never expose a Client Portal control-center path.
- **Evidence:** `evidence/UNIT-018-LEGACY-MIGRATION-v1.md`; focused migration/token tests passed 6/6, targeted lint passed, workspace type-check passed, and diff check passed.
- **Release boundary:** no authenticated local/hosted real-data apply, cohort cutover, rollback rehearsal, or hosted proof is claimed. These remain required for `UNIT-018` release completion and archive eligibility.

## Execution progress — 2026-07-12 UNIT-019

- **Run ID:** `client-portal-unit-019-20260712`
- **Current state:** local calculation/output parity is verified. Production cohort, legacy-data, and browser/device proof remain separate release boundaries and do not reopen this deterministic fixture unit.
- **Delivered:** the golden fixture now invokes the live calculation, project-chart, proposal-model, XLSX workbook, publication-snapshot, Client Portal financial/browser/print, and share-chart builders. It distinguishes the working-chart membership (active scope rows) from issued-client membership (included rows only), asserts canonical totals and charge order, checks the printable row set, and verifies the generated workbook Grand Total.
- **Defects closed:** project charts, their repository totals, and AI chart context now carry `metadata_json.laborUnitCost` through the shared calculation path. The XLSX summary no longer overwrites Grand Total when a sheet adjustment shifts the totals block; dependent rows derive from the computed grand-total row.
- **Evidence:** `evidence/UNIT-019-CALCULATION-OUTPUT-PARITY-v1.md`; focused lint completed with no errors and two existing unused-variable warnings. The current calculation/output parity suite passed 4 files / 30 tests.
- **Open release work:** the fixture does not substitute for production cohort evidence, real issue/print UX validation, or legacy-data parity. Unit 018 live backfill/cutover and Units 020-021 security/rollout gates still prevent release and archive.

## Execution update — 2026-07-12 UNIT-021 rollout control

- **Delivered:** legacy migration is protected by the audited D1 `client_portal_legacy_migration` feature flag, seeded disabled in ordered migration `0070`. The new independently disabled `client_portal_legacy_write_freeze` flag is seeded in `0071`; it stops legacy comments and decisions before a backfill, and mapping state continues the denial automatically after import. The Publisher drawer renders the explicit manager action only when the migration flag is enabled, while an apply now independently fails closed before reading the legacy publication unless both migration and write-freeze flags are enabled.
- **Evidence:** `evidence/UNIT-021-ROLLOUT-CONTROL-v1.md`; the current freeze regression proof passed targeted lint, 5 focused Vitest files / 38 tests, and diff check. `RUNBOOK-CLIENT-PORTAL-LEGACY-CUTOVER-v1.md` records the required operator, support, telemetry, rollback, and release-truth procedure.
- **Release boundary:** no hosted flag enablement, named dogfood/design-partner cohort, real-data migration, rollback rehearsal, support-owner handoff, or actual legacy-write freeze is claimed. Those remain Unit 021 release and archive gates.

## Execution update — 2026-07-12 UNIT-021 migration audit trail

- **Delivered:** legacy migration import, verification, and manager rollback now each create an owner-visible, system-authored `client_portal_audit_events` entry. Event metadata records only migration identifiers, reconciliation counts/hashes, and rollback state; it intentionally excludes stable tokens, recipient emails, and snapshot content. State transitions and their audit entries share a D1 batch when the binding supports it, with a fail-closed sequential adapter fallback.
- **Evidence:** `evidence/UNIT-021-ROLLOUT-CONTROL-v1.md`; fresh lint, 5 focused Vitest files / 38 tests, and `git diff --check` passed.
- **Release boundary:** no operator has yet reviewed this audit trail for a named authorized cohort, and no real hosted migration/rollback event exists. Unit 021 remains `IN_PROGRESS`; neither plan pack is archive-eligible.

## Archive-gate audit — 2026-07-12

- **Outcome:** both the Client Portal and Publisher plan packs remain active; neither was archived.
- **Implemented local work:** the Client Portal migration is manager-gated, dry-run-first, audience-safe, dual-read compatible, and disabled by default behind the `client_portal_legacy_migration` D1 flag. The relevant Publisher overlap is integrated through the verified-mapping roster bridge and the duplicate-response race fix.
- **Fresh local readback:** `client_portal_legacy_preflight` reports one published legacy candidate with no migration status and zero imported recipient, comment, or decision rows. No real legacy publication has been migrated or cut over.
- **Archive blockers:** the refreshed Client Portal evidence index now passes structural validation. Archive eligibility remains blocked by hosted policy/header/cross-portal denial proof; a named cohort with no open P0; an authorized real-data migration and rollback or fix-forward rehearsal; named support ownership; legacy-write freeze; and reconciled release truth.
- **Publisher result:** `Publisher-Page-Audit` structural validation passes, but its retained legacy Publisher findings and required retirement/removal proof remain active. It must not be archived solely because the newer pack exists.
- **Resume point:** enable the migration flag only for an explicitly named authorized cohort, apply one manager-gated migration, collect deterministic readback and rollback evidence, capture hosted response proof, then rerun the frozen archive audit.

## Execution progress — 2026-07-12 UNIT-020

- **Run ID:** `client-portal-unit-020-20260712`
- **Current state:** local security hardening is implemented; hosted final-Worker proof remains open.
- **Delivered:** Client Portal public manifest/section/asset reads, password failures, recipient verification, threads, and decisions now have explicit durable rate-limit scopes. Every local denial is no-store and includes `Retry-After`. Password failures preserve durable five-failure lockout/clear-on-success behavior without holding a Worker request open with a progressive delay.
- **Evidence:** `evidence/UNIT-020-SECURITY-HARDENING-v1.md`; targeted lint, 11 focused Vitest files / 73 tests, workspace type-check, and diff check passed.
- **Validation boundary:** local validation is clean. Hosted final-Worker headers, cross-portal denial, and hidden-byte proof remain intentionally unclaimed.
- **Release boundary:** no final Worker header capture, hosted cross-portal denial, or hosted hidden-byte proof occurred. Unit 020 therefore remains in progress and continues to block release/archive completion.

## Execution update — 2026-07-12 UNIT-018/021 recovery path

- **Delivered:** verified/cutover-complete legacy mappings now have a manager-confirmed rollback that changes only the mapping status to `rejected`. It restores legacy routing and removes the Client Portal roster bridge without deleting imported portal, issue, recipient, discussion, or decision records.
- **Fix-forward:** a later manager migration reuses the deterministic mapping and reruns the existing count/hash readback from `rejected` to `verified`; no duplicate issue or destructive reimport is permitted.
- **Guardrails:** both apply and rollback actions independently require the disabled-by-default rollout flag, authenticated project-manager authorization, and project/workspace ownership. The drawer exposes rollback only for a verified bridge and exposes migration again after rollback.
- **Evidence:** focused lint plus the 5-file / 24-test recovery run, then the combined 11-file / 73-test migration/security run, workspace type-check, and `git diff --check` all passed.
- **Release boundary:** no real cohort mapping was rolled back or reactivated. The recovery path is locally implemented and tested, but Unit 021 still requires an authorized live rehearsal and release evidence before archive eligibility.

## Execution update — 2026-07-12 UNIT-018/020/021 decision dual-read repair

- **Delivered:** restored the legacy shared-link decision handler and dispatches only Client Portal tokens to the v2 decision handler. Legacy share review controls therefore retain their existing API contract before a migration cutover.
- **Freeze boundary:** legacy decision writes subject to the independently disabled migration-write freeze now return a generic no-store `423`, matching legacy comment behavior without disclosing migration state.
- **Evidence:** targeted ESLint, six focused Vitest files / 68 tests, workspace `type-check`, and `git diff --check` passed. The test run was authorized by the current execution objective.
- **Release boundary:** this is local compatibility and denial-path proof only. No hosted header capture, named cohort, real-data cutover, rollback rehearsal, or final release reconciliation occurred; Units 018/020/021 remain in progress.

## Execution update — 2026-07-12 UNIT-018/020/021 regression sweep

- **Outcome:** current Client Portal, legacy-publication, and share contracts
  were re-audited after the dual-read repair. A stale legacy Publisher copy
  expectation was aligned to the current Client Link controls; security test
  doubles now include the migration-status read used by the legacy-write freeze;
  and public snapshot redaction expectations include the safe calculation
  outputs now intentionally serialized for issued content.
- **Evidence:** 23 Client Portal files / 69 tests, 17 legacy-publication route
  and security files / 169 tests, and 8 share/UI files / 151 tests passed.
  Targeted ESLint, workspace `type-check`, and `git diff --check` passed.
- **Boundary:** this regression sweep proves local contracts only. The named
  cohort, hosted header/denial capture, real-data migration and rollback
  rehearsal, support ownership, and release-truth reconciliation remain open.

## Release execution update — 2026-07-12

- **Delivered:** remote D1 migrations `0067` through `0073` are applied with
  no pending migrations. The final Client Portal Worker version
  `d7b080d9-a013-4e53-9e68-65b0116b1b61` is deployed at 100%. The deployment
  initially exposed a client/server module-boundary failure in the composer;
  shared contracts now live in a client-safe module and the Cloudflare build,
  targeted lint, workspace type-check, focused Publisher suite (22 tests),
  and diff check pass.
- **Publisher integration:** the legacy Publisher control center now uses
  stable drawer navigation, restores full roster state after an editor close,
  keeps client-facing mutation errors generic, clears transient copy feedback,
  and loads focused drawer/wizard projects outside the current page. The
  Publisher regression suite was updated from removed table/four-step controls
  to the released client-link control-center contract.
- **Live-cohort result:** the remote database has one active legacy
  publication and no existing migration mapping. Both rollout flags were
  enabled only for the attempted controlled window and were restored to `0`.
  The deployed Publisher route redirects an unauthenticated browser profile to
  sign-in, so the manager-gated migration/rollback action could not be run
  without fabricating an authenticated session or bypassing its authorization.
- **Archive gate:** do not archive either pack yet. The remaining required
  evidence is one authenticated publication-manager dry-run/apply/readback and
  rollback or fix-forward rehearsal for that single cohort, followed by final
  hosted token/header and release-truth capture. The release remains fail
  closed until that protected operator action is available.

## Live-cutover recovery update — 2026-07-12

- **Cohort rehearsal:** the authenticated Publisher manager migrated the named legacy publication and D1 readback verified the deterministic portal and issue, two recipients, one discussion, and migration import/verification audit events.
- **Defect and fix:** the manager Client Portal route then failed because D1 rejected the dynamic audit-event `LIKE` pattern as too complex. `activity-service.ts` now uses an exact `instr` JSON-fragment check at both recipient-audit lookups; targeted ESLint and the equivalent remote D1 query pass.
- **Safe rollback:** the post-fix Worker-version upload did not complete (Cloudflare version creation remained pending with no new deployment record), so the rehearsal was rolled back before leaving the cohort frozen. Remote D1 now reports mapping status `rejected`, one `legacy_migration_rolled_back` audit event, retained imported records (two recipients, one thread, one decision), and both rollout flags disabled.
- **Release boundary:** the code fix is local and the live migration/rollback path was exercised, but no new Worker version exists with the fix. The manager Client Portal route and final hosted header/denial proof remain open; both Client Portal and Publisher packs remain active and are not archive-eligible.

## Live-cutover deployment retry — 2026-07-12

- **Attempt:** rebuilt-source deployment retry reused all 320 static assets and reached the Worker version-upload boundary (`Total Upload: 29260.83 KiB / gzip: 6246.86 KiB`), then received no provider response for 90 seconds and was cancelled safely.
- **Readback:** the authenticated deployments API still reports deployment `f99a75e9-2f45-4d33-894b-e0a449090503` at 100% on pre-fix version `d7b080d9-a013-4e53-9e68-65b0116b1b61`; no new version or deployment was created.
- **Provider boundary:** Cloudflare's status endpoint concurrently reports a minor service outage. This is supporting context only; the repeatable blocker is the unresponsive version-creation request after successful asset handling.
- **Archive gate:** remain fail-closed with the controlled cohort rolled back and both rollout flags disabled. Do not archive the Client Portal or related Publisher pack until a fixed Worker version is deployed and the remaining manager-route and hosted-proof gates pass.

## Live-cutover deployment retry 2 — 2026-07-12

- **Attempt:** a third bounded Wrangler deployment from the clean fixed-source snapshot again read all 320 assets, reused the unchanged asset set, and reached `Total Upload: 29260.83 KiB / gzip: 6246.86 KiB` before Worker version creation stopped responding for 90 seconds.
- **Safety:** the client was cancelled without error output. The authenticated deployments API confirms production is still deployment `f99a75e9-2f45-4d33-894b-e0a449090503`, 100% on pre-fix version `d7b080d9-a013-4e53-9e68-65b0116b1b61`; no new version or traffic change occurred.
- **Blocker:** this is the third consecutive verified failure at the provider's version-creation boundary, while the Cloudflare status endpoint continues to report a minor service outage. No safe local or API fallback can recreate Wrangler's temporary asset credentials and full binding configuration without risking the live Worker.
- **Disposition:** live cutover, hosted proof, manifest completion, and archival remain blocked pending Cloudflare version-upload recovery. Keep the rehearsal rollback in place: mapping rejected, imported records retained, and both rollout flags disabled.
