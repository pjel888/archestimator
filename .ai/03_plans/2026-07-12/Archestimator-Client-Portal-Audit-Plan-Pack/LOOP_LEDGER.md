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
