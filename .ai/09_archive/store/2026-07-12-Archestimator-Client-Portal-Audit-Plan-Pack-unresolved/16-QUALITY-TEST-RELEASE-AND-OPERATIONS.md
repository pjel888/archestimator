# 16 — Quality, Test, Release, and Operations

## 1. Current evidence boundary

This plan pack did not run:

- unit tests;
- integration tests;
- builds;
- browser automation;
- screenshots;
- Playwright;
- hosted checks;
- provider mutations.

The repository requires explicit current-task authorization before those test and browser surfaces are used. The commands below are **TEST_PROPOSALS**, not authorization.

For this planning run, every readiness criterion uses `test_requirement: NOT_REQUIRED`, `test_trigger: NONE`, and static/source/manifest evidence. Product implementation risks may retain a named `TEST_PROPOSAL`, but no proposal is executable until Philip explicitly creates a current-task `TEST_TASK`.

## 2. Quality strategy

Use a risk-based evidence pyramid:

1. pure domain/schema tests;
2. repository integration against local D1;
3. route/action integration;
4. component interaction/accessibility;
5. deterministic browser golden path;
6. hosted Cloudflare parity/smoke;
7. migration/recovery/rollback rehearsal.

No single green layer proves the whole Client Portal.

## 3. Domain test matrix

### Portal/issue

- multiple portals per project;
- issue number allocation;
- immutable issue data;
- supersession;
- content hash stability;
- idempotent publish;
- failed publish leaves current issue unchanged;
- unknown section rejected.

### Policy

- role templates;
- sparse overrides;
- recipient status/expiry;
- section visibility;
- field visibility;
- formal decision capability;
- owner portal scope;
- preview parity;
- deny by default.

### Calculations

- row total;
- estimate total;
- issue total;
- chart buckets;
- comparison delta;
- hidden field independence;
- rounding;
- all rows.

### Discussions

- target validation;
- thread/message idempotency;
- unread;
- resolve/reopen;
- message edit/tombstone;
- owner public reply;
- internal note denial;
- carry-forward.

### Decisions

- issue/content hash;
- required approver;
- one active decision;
- duplicate retry;
- void append-only;
- summary rule;
- stale issue;
- signer rules.

### Branding

- asset ownership;
- MIME/magic bytes;
- image processing;
- contrast fallback;
- issue brand snapshot;
- public asset serialization.

## 4. D1 integration tests

Use a migration-complete local D1 fixture.

Prove:

- all FKs;
- unique constraints;
- indexes expected;
- transaction/batch atomicity;
- recipient survives issue;
- revoke preserves history;
- cascade/tombstone policy;
- query pagination;
- portfolio aggregate correctness;
- legacy backfill counts;
- idempotency conflict behavior.

## 5. Public route tests

For every route:

- valid anonymous/recipient role;
- missing token;
- malformed token;
- revoked/expired;
- password required;
- invalid session;
- CSRF failure;
- origin failure;
- wrong portal/issue/section;
- hidden section;
- stale view;
- oversized body;
- rate limit;
- provider error redaction;
- no-store/security headers.

Inspect response bytes to ensure hidden fields and internal IDs are absent.

## 6. Component and accessibility tests

### Portal shell

- landmark structure;
- keyboard section navigation;
- focus after route/section change;
- sticky header/footer not obscuring focus;
- context rail/drawer focus management;
- mobile bottom sheet;
- 200% zoom;
- no horizontal page overflow except intentional data surface.

### Estimate browser

- nested navigation semantics;
- all-row load;
- keyboard table/tree;
- direct target;
- hidden columns;
- print all.

### Discussions

- thread create/reply;
- live regions;
- unread;
- resolve/reopen;
- mention selection;
- optimistic/offline retry;
- duplicate prevention;
- owner/client actor distinction.

### Decision

- clear scope;
- confirmation;
- signer;
- saved receipt;
- unauthorized state;
- stale issue preservation.

### Branding

- missing logo;
- one logo;
- two logos;
- long names;
- color contrast;
- blocked image;
- print.

## 7. Browser golden path

Proposed deterministic flow:

1. internal owner logs in;
2. creates project/estimates fixture;
3. opens Client Portals;
4. creates Proposal Review portal;
5. adds financial comparison;
6. uploads owner/client logo;
7. invites Commenter and Approver;
8. previews both roles;
9. publishes Issue 1;
10. recipient verifies and opens;
11. recipient navigates all sections and rows;
12. commenter creates row thread;
13. owner replies and resolves;
14. approver requests changes;
15. owner updates estimate and publishes Issue 2;
16. selected thread carries forward;
17. approver approves Issue 2;
18. owner sees funnel, activity, and decision receipt;
19. old issue remains immutable and marked superseded;
20. stable URL opens current issue.

Denial branches:

- viewer cannot comment;
- commenter cannot approve;
- hidden supplier section absent;
- stale Issue 1 decision rejected;
- revoked recipient denied;
- old rotated credential denied.

## 8. Visual QA viewport set

Only after explicit authorization:

- 320×568;
- 390×844;
- 768×1024;
- 1024×768;
- 1440×900;
- 1920×1080;
- 2560×1440;
- 200% zoom;
- reduced motion;
- high contrast where supported.

The primary visual proof is that 1920/2560 widths are meaningfully used, not a centered card surrounded by dead space.

## 9. Performance budgets

Initial proposed budgets, to ratify with measurement:

### Public portal

- manifest compressed payload: target < 100 KB;
- initial current-section payload: target < 250 KB for ordinary portals;
- no raw full-project chart facts;
- lazy section loads;
- interaction ready without loading all rows;
- all-row path bounded/paginated;
- no more than one token lookup + one manifest read on initial request.

### Publisher

- portfolio first page: one primary query plus bounded supporting query;
- no eight-round-trip baseline;
- search debounce;
- no full workspace child scans;
- control center tabs lazy-loaded;
- issue build reports section duration/bytes.

Budgets should be evidence-derived before release, not treated as arbitrary promises.

## 10. Load and abuse tests

- many recipients;
- many sections;
- thousands of rows;
- long discussion;
- concurrent message retry;
- concurrent decision;
- publish retry;
- invitation burst;
- rate limit;
- R2 section failure;
- Queue delivery retry;
- bot/open traffic;
- expired/revoked token.

## 11. Migration verification

Before production backfill:

- export D1;
- run preflight;
- dry-run mapping;
- report portals/issues/recipients/comments/decisions;
- identify ambiguous merges;
- verify checksums/counts;
- test on disposable database;
- exercise legacy and new links;
- rollback/fix-forward rehearsal.

After backfill:

- old and new totals;
- old token resolution;
- recipient mapping;
- comments/messages;
- decisions;
- current issue pointer;
- FK check;
- orphan report;
- sample manual review.

## 12. Security review

Required before external cohort:

- authorization matrix;
- hidden-field response inspection;
- public asset access;
- token/session lifecycle;
- CSRF/origin;
- no-store/CSP on hosted Worker;
- internal-note isolation;
- custom-domain code absent or gated;
- log/analytics redaction;
- rate-limit atomicity;
- portal deletion/retention.

## 13. Release stages

### Stage 0 — Source/domain complete

No user rollout. Schema, policy, issue builder, public adapters behind flags.

### Stage 1 — Internal dogfood

Owner-created portals only. No automatic migration. Test fixtures and controlled real project.

### Stage 2 — Named design partners

Small cohort, founder-supervised:

- one portal template;
- selected financial sections;
- verified recipients;
- no custom domains;
- no Client Admin;
- no legal e-signature claims;
- strong support and incident logging.

### Stage 3 — External Beta

Only after:

- active CI;
- golden path;
- hosted denial/header proof;
- parity;
- provider-backed restore;
- migration proof;
- support/incident runbook;
- privacy/retention approval;
- no P0.

## 14. Rollback strategy

### Application

- feature flag new portal create/read;
- legacy read remains;
- route can fall back only to the preserved legacy issue, never live private data;
- new writes stopped without deleting data.

### Migration

Prefer fix-forward after additive schema. Keep legacy tables and mapping. Do not drop legacy columns/tables in the initial release.

### Public issue

Withdraw a bad issue and restore previous current issue through an audited owner action. Never mutate the bad issue silently.

### Assets/R2

Content-addressed assets are safe to orphan temporarily; cleanup after references are verified.

### Notifications

Pause consumers; outbox retains pending intents; avoid duplicate sends through idempotency.

## 15. Incident runbook

Classify:

- unauthorized access;
- hidden-field exposure;
- wrong total/calculation;
- wrong recipient/portal;
- decision attached to wrong issue;
- public/internal message leak;
- broken stable link;
- notification misdelivery;
- migration loss;
- asset malware/content issue.

Immediate actions:

1. disable affected portal/feature;
2. preserve logs/audit;
3. stop queues if delivery risk;
4. identify portal/issues/recipients;
5. notify owner/security/legal decision owner;
6. remediate/fix-forward;
7. verify denial and data integrity;
8. communicate to cohort;
9. post-incident update and test.

## 16. Operational dashboards

Track:

- portal errors by route/action;
- issue publish failures;
- D1/R2 latency and payload size;
- message/decision failures;
- delivery failures/dead letters;
- authorization denials;
- rate limits;
- portal action-required age;
- migration anomalies;
- restore proof freshness.

Do not fabricate unavailable metrics.

## 17. Proposed commands

These are examples to formalize during implementation and require explicit test authorization.

| Proposal | Named risk | Exact candidate command | Authorization state |
|---|---|---|---|
| TEST-PROPOSAL-001 | Shared TypeScript contracts drift | `bun run type-check` | Not authorized |
| TEST-PROPOSAL-002 | Focused lint/static violations | `bun run lint` | Not authorized |
| TEST-PROPOSAL-003 | Portal domain/repository regressions | `bun run test` | Not authorized |
| TEST-PROPOSAL-004 | Portal component interaction/accessibility regressions | `bun run test:dom` | Not authorized |
| TEST-PROPOSAL-005 | Golden client journey or responsive/browser regressions | `bun run test:e2e` | Not authorized |
| TEST-PROPOSAL-006 | Cloudflare build/runtime incompatibility | `bun run cf:build` | Not authorized |
| TEST-PROPOSAL-007 | Hosted public-route/header mismatch | `bun run cf:verify-hosted-routes` | Not authorized |
| TEST-PROPOSAL-008 | Release-gate integration failure | `bun run cf:release-gates` | Not authorized |
| TEST-PROPOSAL-009 | D1 migration recovery failure | `bun run cf:d1-restore-rehearsal` | Not authorized |

```bash
bun run type-check
bun run lint
bun run test
bun run test:dom
bun run test:e2e
bun run cf:build
bun run cf:verify-hosted-routes
bun run cf:release-gates
bun run cf:d1-restore-rehearsal
```

Add focused portal commands rather than relying only on the broad suite.

## 18. Release acceptance

External Beta is blocked if any exists:

- cross-portal auth defect;
- hidden financial field leak;
- wrong total/parity;
- decision ambiguity;
- lost historic issue/comment/decision;
- public/internal note leak;
- migration orphan;
- missing hosted no-store;
- no rollback/support owner;
- unresolved privacy/retention policy.

A polished visual design does not override these gates.
