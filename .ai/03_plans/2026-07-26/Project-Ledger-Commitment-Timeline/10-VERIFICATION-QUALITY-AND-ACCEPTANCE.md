# Verification, Quality, and Acceptance

## Profile

The implementation is `Q2_CRITICAL_CHANGE_GATE` because it affects:

- D1 migrations and persisted financial records;
- uploads and private R2 objects;
- public token and recipient access;
- cross-portal confidentiality;
- recipient mutations;
- issue and baseline state;
- decisions;
- external notifications;
- broad product routing and UI.

Use `Q3_RELEASE_GATE` only if a production-release decision is part of the execution task.

## Verification principle

The feature is not complete because:

- the timeline renders;
- a PDF opens;
- a request can be submitted;
- tests pass in isolation.

Completion requires proof that the domain objects, state transitions, privacy boundaries, migration, recovery, public journeys, and current-state projections agree.

## Critical capabilities

| ID | Capability |
|---|---|
| CAP-001 | Project/workspace ownership |
| CAP-002 | Cross-portal confidentiality |
| CAP-003 | Request submission and non-authorization |
| CAP-004 | Artifact upload/scan/version integrity |
| CAP-005 | Multi-artifact issue atomic publication |
| CAP-006 | Stable deterministic diff |
| CAP-007 | Active baseline semantics |
| CAP-008 | Attributable decisions |
| CAP-009 | Timeline projection and exposure |
| CAP-010 | Recipient RBAC/domain role |
| CAP-011 | Legacy link preservation and zero-write cutover |
| CAP-012 | Public portal usability/accessibility |
| CAP-013 | D1/R2 failure recovery |
| CAP-014 | AI draft-only boundary |
| CAP-015 | Workspace command-center correctness |

## Test strategy by layer

### 1. Contract and pure unit tests

Add tests for:

- state transition tables;
- role capability mapping;
- domain role does not grant permission;
- exposure policy;
- change-set canonicalization;
- minor-unit math;
- quantity scaling;
- artifact version invariants;
- issue content hashing;
- deterministic summary;
- AI output schema;
- public DTO sanitization;
- timeline event classification.

Suggested paths:

```text
tests/unit/project-ledger-contracts.test.ts
tests/unit/change-request-state.test.ts
tests/unit/project-artifact-contracts.test.ts
tests/unit/client-portal-change-set.test.ts
tests/unit/client-portal-baseline-state.test.ts
tests/unit/client-portal-role-capabilities.test.ts
tests/unit/client-portal-public-sanitization.test.ts
```

### 2. D1 repository and service tests

Use realistic SQLite/D1 fixtures.

Required:

- artifact create/version/archive;
- request create/amend/withdraw;
- request numbering race;
- request state denial;
- issue draft CAS;
- issue package relationships;
- private source projection;
- change-set persistence;
- active baseline unique constraint;
- decision acceptance batch;
- event/exposure insertion;
- portal isolation;
- backfill idempotency;
- legacy mapping.

Suggested paths:

```text
tests/vitest/project-artifact-repository.test.ts
tests/vitest/change-request-service.test.ts
tests/vitest/client-portal-issue-draft-service.test.ts
tests/vitest/client-portal-change-set-service.test.ts
tests/vitest/client-portal-baseline-service.test.ts
tests/vitest/project-commitment-event-service.test.ts
tests/vitest/client-portal-event-exposure.test.ts
tests/vitest/client-portal-legacy-cutover.test.ts
```

### 3. Migration tests

For every migration:

- clean apply;
- upgrade from current;
- foreign-key check;
- unique index;
- CHECK constraint;
- data copy parity;
- table rebuild;
- rerun/backfill;
- fix-forward.

Required scenarios:

- several portals on one project;
- accepted issue plus pending issue;
- decisions;
- threads with all current target kinds;
- upload assets and cleanup states;
- invalid preflight fixture should fail.

### 4. Upload/runtime integration

Use Workers runtime where applicable.

Required:

- PDF upload;
- image evidence upload;
- MIME spoof;
- oversized;
- pending scan;
- infected/unsupported;
- clean;
- expired override;
- unauthorized project;
- unauthorized portal;
- range request;
- stale/revoked recipient;
- cleanup protected by issue reference;
- abandoned staging cleanup;
- R2 failure after metadata or metadata failure after R2;
- idempotent retry.

### 5. Route/server action tests

Internal:

- timeline read;
- artifact upload/version;
- request assessment;
- issue draft CAS;
- publish;
- baseline summary;
- commitment-center query.

Public:

- portal manifest;
- timeline;
- request create/amend/withdraw;
- evidence upload;
- artifact content;
- issue detail;
- discussion;
- decision;
- role denial;
- cross-portal denial;
- password/session.

### 6. Component tests

- current agreement header;
- no-baseline state;
- pending issue separate from baseline;
- request form notice;
- request detail visibility;
- issue composer readiness;
- structured change display;
- artifact viewer controls;
- role management;
- portal exposure preview;
- commitment-center action counts;
- legacy migration state.

### 7. Browser journeys

#### Journey A — Initial agreement

1. create project/portal;
2. prepare estimate;
3. Publish to Timeline;
4. issue published;
5. recipient reviews;
6. recipient approves;
7. Baseline 1 established;
8. internal and public timelines agree.

#### Journey B — Client request with evidence

1. client opens stable portal;
2. submits request;
3. uploads screenshot/PDF;
4. sees request code and non-authorization notice;
5. owner sees request;
6. owner acknowledges;
7. timeline updates only in correct portal.

#### Journey C — Revision issue

1. owner assesses request;
2. uploads new design PDF version;
3. selects estimate, request, artifact;
4. deterministic diff generated;
5. exclusions/unresolved item entered;
6. issue published;
7. prior baseline remains active.

#### Journey D — Changes requested

1. recipient requests changes;
2. issue changes_requested;
3. baseline unchanged;
4. request returns to assessment;
5. replacement issue published;
6. old pending issue preserved.

#### Journey E — Acceptance

1. required approver accepts replacement;
2. baseline transition occurs;
3. prior baseline becomes superseded;
4. accepted issues preserved;
5. linked request resolved;
6. timelines and command center update.

#### Journey F — Multiple portals

1. client and supplier portals exist;
2. one artifact exposed to client only;
3. supplier cannot infer it;
4. supplier request appears only in supplier scope;
5. internal ledger can see both.

#### Journey G — Legacy migration

1. existing legacy link;
2. migrate;
3. freeze legacy writes;
4. same external link opens modern portal or mapped content;
5. comments/decisions preserved;
6. new request works in modern portal;
7. legacy write route denied.

### Browser matrix

At minimum:

- Chromium desktop;
- Chromium mobile viewport;
- WebKit or Safari-equivalent where current CI supports it;
- Firefox where current public PDF strategy requires it;
- keyboard only;
- 200% zoom;
- reduced motion;
- screen-reader semantic inspection;
- slow network for PDF/timeline;
- expired/revoked sessions.

## Concurrency and idempotency tests

### Request

- two create requests with same idempotency key;
- same key/different content;
- concurrent request-number allocation;
- amendment race;
- withdrawal versus issue link.

### Issue draft

- concurrent draft edit CAS;
- publish versus estimate edit;
- publish versus artifact scan/status change;
- publish versus request amendment;
- publish versus baseline transition;
- duplicate publish idempotency.

### Decision/baseline

- two required approvers submit concurrently;
- decline and approve race;
- idempotent replay;
- acceptance and new issue publish race;
- baseline unique index;
- void decision repair.

### Timeline

- duplicate event insertion;
- exposure duplicate;
- cursor stability with same timestamp;
- backfill replay;
- source event arrives after page cursor.

## Security tests

### Access control

- token shape and hash;
- password session;
- recipient verification;
- portal status;
- issue status;
- artifact mapping;
- request ownership;
- capability ceiling;
- explicit deny;
- section/event policy;
- organization policy;
- field sanitization;
- cross-portal and cross-workspace denial.

### Input safety

- request text length/control chars;
- file names;
- metadata JSON;
- external links;
- HTML/script injection;
- PDF magic bytes;
- range header;
- idempotency key;
- page number;
- search/filter inputs.

### Privacy

Public payload must not contain:

```text
workspace ID
project internal ID
source estimate/row IDs
storage bucket/path
raw token
email unless intended
margin
internal markup
internal source
private provenance
internal note
security event metadata
```

### Abuse

- request spam;
- evidence spam;
- repeated range requests;
- enumeration of public artifact IDs;
- recipient from wrong portal;
- revoked credential;
- stale recipient session;
- password brute force;
- oversized timeline page request.

## Accessibility proof

- semantic timeline list;
- nested request grouping;
- heading hierarchy;
- status text;
- focus on deep link;
- dialog/drawer focus;
- request confirmation;
- decision confirmation;
- artifact viewer keyboard controls;
- visible focus;
- accessible names;
- mobile bottom actions;
- no trapped focus in PDF viewer;
- reduced motion;
- 200% zoom;
- color contrast;
- table alternatives where appropriate.

## Performance proof

### Internal timeline

- bounded current-state query;
- cursor page of 50 or fewer events;
- portal filter index;
- no N+1 object queries;
- large project fixture.

### Commitment Center

- bounded project/portal roster;
- aggregate counts in CTE/subqueries;
- pagination;
- no one-query-per-portal loop.

### Public portal

- timeline first page;
- issue manifest;
- paged estimate rows;
- artifact metadata separate;
- range serving;
- no full PDF buffer;
- no hidden-content counts.

### Publish

- statement-count planning;
- representative large estimate;
- multiple artifacts/requests;
- safe fail before batch limit;
- content hash duration;
- source consistency.

## Mutation/coverage targets

Critical changed branches require 100% according to Q2 policy.

High-risk mutation targets:

- role/capability decisions;
- portal/project ownership;
- active baseline condition;
- accepted issue transition;
- scan gate;
- source-stale check;
- public field sanitization;
- idempotency intent hash;
- exposure filtering;
- row diff match classification;
- legacy write freeze.

No surviving high-risk mutant is acceptable.

## Independent reviews

### Quality reviewer

Read-only, separate from authors.

Review:

- domain cohesion;
- state machines;
- transaction boundaries;
- migration/backfill;
- UI architecture;
- test/evidence traceability;
- performance;
- recovery.

### Security reviewer

Read-only, distinct reviewer.

Review:

- token/session;
- recipient mutation;
- uploads;
- PDF serving;
- R2;
- cross-portal isolation;
- public IDs;
- policy;
- redaction/retention;
- AI data boundary.

### Optional legal/product claims review

Not a technical gate unless separately authorized, but public copy must remain within current claims boundaries.

## Suggested focused commands

Exact paths must be updated to actual test files.

```powershell
bunx vitest run tests/vitest/project-artifact-repository.test.ts tests/vitest/change-request-service.test.ts tests/vitest/client-portal-issue-draft-service.test.ts tests/vitest/client-portal-change-set-service.test.ts tests/vitest/client-portal-baseline-service.test.ts tests/vitest/project-commitment-event-service.test.ts --maxWorkers=1
```

```powershell
bunx vitest run tests/vitest/client-portal-policy.test.ts tests/vitest/client-portal-public-repository.test.ts tests/vitest/client-portal-decision-service.test.ts tests/vitest/client-portal-legacy-cutover.test.ts --maxWorkers=1
```

```powershell
bun run type-check
bun run lint
bun run build
bun run quality:diff-coverage
bun run test:mutation:critical
bun run quality:critical
```

Browser:

```powershell
bunx playwright test e2e/project-commitment-timeline.spec.ts e2e/client-portal-change-request.spec.ts e2e/client-portal-issue-baseline.spec.ts e2e/client-portal-artifacts.spec.ts e2e/client-portal-isolation.spec.ts e2e/legacy-portal-cutover.spec.ts --workers=1
```

Run GitNexus reindex/detect-changes according to current repository policy after central source edits.

## Evidence paths

Recommended:

```text
artifacts/quality/ledger-focused.json
artifacts/quality/ledger-migrations.json
artifacts/quality/ledger-upload-workers.json
artifacts/quality/ledger-policy-matrix.json
artifacts/quality/ledger-concurrency.json
artifacts/quality/ledger-playwright.json
artifacts/quality/ledger-a11y.json
artifacts/quality/ledger-performance.json
artifacts/quality/ledger-legacy-cutover.json
artifacts/quality/ledger-q2-manifest.json
.ai/03_plans/.../evidence/reviews/quality-review.md
.ai/03_plans/.../evidence/reviews/security-review.md
```

## Requirement-to-acceptance mapping

| Requirement | Acceptance |
|---|---|
| REQ-001 | AC-001 |
| REQ-002 | AC-002, AC-009 |
| REQ-003 | AC-008, AC-015 |
| REQ-004 | AC-003 |
| REQ-005 | AC-004, AC-011 |
| REQ-006 | AC-005 |
| REQ-007 | AC-006 |
| REQ-008 | AC-014 |
| REQ-009 | AC-007 |
| REQ-010 | AC-010 |
| REQ-011 | AC-002, AC-009 |
| REQ-012 | AC-012 |
| REQ-013 | AC-013 |
| REQ-014 | AC-011, AC-016 |
| REQ-015 | AC-015 |
| REQ-016 | AC-016 |

## Completion audit

Before marking implementation complete:

- [ ] every requirement has an implemented unit;
- [ ] every acceptance criterion is PASS;
- [ ] every core test/evidence is fresh;
- [ ] migrations apply cleanly and upgrade;
- [ ] backfills replay idempotently;
- [ ] active baseline semantics are proven;
- [ ] cross-portal negative tests pass;
- [ ] public upload and range tests pass;
- [ ] legacy new writes are zero;
- [ ] modern stable links work;
- [ ] no hidden fields in public fixtures;
- [ ] no skipped/flaky critical test;
- [ ] no high/critical security finding;
- [ ] no high-risk surviving mutant;
- [ ] quality reviewer PASS;
- [ ] security reviewer PASS;
- [ ] final plan manifest valid;
- [ ] no hosted/production claim without authorized proof.
