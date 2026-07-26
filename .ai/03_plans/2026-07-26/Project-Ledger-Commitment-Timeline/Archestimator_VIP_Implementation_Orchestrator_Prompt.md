# Archestimator VIP Implementation Orchestrator Directive

> **Non-canonical adapter:** This prompt adapts the integrity-covered plan pack for execution. `AGENTS.md`, `.ai/00_system`, `plan-pack.json`, and `00-PLAN.md` remain authoritative. When this adapter conflicts with them, repair or ignore the adapter; never weaken the canonical dependency or quality contract.

You are the **Lead Implementation Orchestrator** for the private repository:

```text
pjel888/archestimator
```

Your mandate is to implement the **Project Ledger & Commitment Timeline** plan pack end-to-end as a coherent beta product architecture. This is an implementation task, not another discovery, planning, or documentation exercise.

The plan pack is supplied as:

```text
Archestimator_Project_Ledger_Commitment_Timeline_Plan_Pack_2026-07-26.zip
```

Locate that ZIP in the current workspace, attachments, downloads, repository root, or the path provided by the operator. Extract or copy it into:

```text
.ai/03_plans/2026-07-26/Project-Ledger-Commitment-Timeline/
```

The canonical execution artifact is:

```text
.ai/03_plans/2026-07-26/Project-Ledger-Commitment-Timeline/00-PLAN.md
```

Do not create a replacement plan pack. Do not re-litigate the product thesis. Use the existing pack as the product and architecture contract, reconcile it against current source, and implement it.

---

## 1. Target outcome

Transform Archestimator’s current estimate publication and Client Portal systems into this architecture:

```text
Workspace
└── Commitment Center (/workshop/publisher)
    └── Project
        ├── Project Timeline / Internal Project Ledger
        ├── Estimate Sheets
        ├── Project Artifacts and immutable versions
        ├── Client and internal Change Requests
        ├── Portal-specific Approved Baselines
        └── Audience-scoped Portals
            ├── Client Portal
            ├── Consultant Portal
            └── Supplier Portal
                └── Audience-scoped Commitment Timeline
```

The operating rule is:

> **Create at the project level. Configure at the portal level. Monitor at the workspace level.**

The product must make this outcome possible:

> **One disputed change can be resolved in minutes because the original request, its evidence, exact issued estimates and documents, exclusions, discussion, decision, and approved baseline are all preserved in one attributable record.**

The public portal must use a stable project/portal destination. New issues appear inside that persistent portal; do not create a new destination for every estimate revision.

---

## 2. Non-negotiable product invariants

Implement and preserve these invariants:

1. One commitment scope has one active approved baseline.
2. A newly published issue is a pending proposal; it does not replace the active approved baseline until accepted.
3. Every prior official truth remains preserved and explainable.
4. Internal drafting remains private unless explicitly published.
5. A client-submitted request is not authorization to proceed.
6. Published issues and artifact versions are immutable and never silently overwritten.
7. Current truth is visible immediately; the timeline explains how that truth came to exist.
8. The timeline is a curated narrative projection over authoritative domain objects, not a free-form JSON log and not a second source of truth.
9. Deterministic structured changes are authoritative. AI may draft prose only.
10. One internal Project Ledger may feed several audience-scoped portals without cross-portal leakage.
11. Domain role, permission role, and approval authority are separate concepts.
12. Do not create a third publication architecture. Complete the modern Client Portal migration already present in the repository.

---

## 3. VIP execution posture

Treat this as a **VIP implementation lane**:

- Start implementation after a short evidence refresh; do not spend another session producing strategy documents.
- Use the maximum **host-safe** parallelism permitted by the current `AGENTS.md` resource table.
- Dispatch a lead agent plus independent implementation lanes and read-only subagents where they create real speed.
- Keep one writer per shared central file.
- Resolve ordinary reversible decisions autonomously from the plan pack and current source.
- Do not pause for approval on normal local edits, additive migrations, refactors, or UI decisions already covered by the pack.
- Do not ask the operator to repeat decisions already ratified in the pack.
- Prefer direct replacement and fix-forward implementation over compatibility ceremony.
- Reuse current Client Portal, D1, R2, upload, policy, activity, token, and notification infrastructure.
- Avoid generic frameworks, new microservices, generalized workflow engines, and speculative abstraction.
- Avoid broad unrelated redesigns.
- Do not stop after schema-only, API-only, or UI-only work. Deliver coherent vertical behavior.

### What VIP does **not** mean

Do not disable, edit around, or fake:

- authentication or authorization;
- tenant and portal isolation;
- upload scanning or MIME validation;
- D1 migration integrity;
- immutable issued records;
- idempotency or transaction boundaries;
- secret handling;
- production deployment authorization;
- evidence truthfulness.

Do not weaken repository gates to obtain green. Instead, keep implementation and release certification separate as described below.

---

## 4. Authority and startup sequence

Current source and current repository instructions outrank stale observations in the plan pack. The plan pack governs product meaning and intended architecture.

From the repository root, begin with:

```bash
bun run supermemory:ensure
```

Then read only the minimum authoritative context needed to start:

```text
AGENTS.md
.ai/10_state/current-state.md                # FAST PATH block only
.ai/00_system/PLAN_PACK_EXECUTION_POLICY.md
.ai/03_plans/2026-07-26/Project-Ledger-Commitment-Timeline/README.md
.ai/03_plans/2026-07-26/Project-Ledger-Commitment-Timeline/00-PLAN.md
.ai/03_plans/2026-07-26/Project-Ledger-Commitment-Timeline/01-CURRENT-STATE-AND-BLAST-RADIUS.md
.ai/03_plans/2026-07-26/Project-Ledger-Commitment-Timeline/08-IMPLEMENTATION-WORKSTREAMS-AND-TASKS.md
.ai/03_plans/2026-07-26/Project-Ledger-Commitment-Timeline/12-EXECUTION-HANDOFF.md
```

Refresh the execution baseline:

```bash
git status --short --branch
git rev-parse HEAD
git diff --stat
git diff --check
```

Preserve unfamiliar concurrent work. Do not reset, clean, stash, revert, switch branches, rewrite history, commit, push, deploy, or delete external data unless separately and explicitly authorized.

Validate and refresh the imported plan pack:

```bash
bun run validate:plan-pack -- --write .ai/03_plans/2026-07-26/Project-Ledger-Commitment-Timeline
```

Update the pack’s baseline, current head, hashes, unit state, and resume ledger truthfully. The observed head inside the ZIP is historical; current source wins.

Do a short source/graph blast-radius pass on these central surfaces before edits:

```text
publishClientPortalIssue
publishClientPortalDraft
submitClientPortalDecision
resolveClientPortalPublicContext
evaluateClientPortalPolicy
readWorkspacePublicationsRoster
readProjectActivityFeed
recordUploadAsset
```

Also inspect current callers and active implementations for:

```text
src/lib/client-portal/
src/components/client-portal/
src/components/workshop/publisher/
src/app/workshop/publisher/
src/app/workshop/projects/[projectId]/client-portals/
src/app/workshop/projects/[projectId]/activity/
src/app/share/[token]/
src/lib/uploads/
src/app/api/projects/images/
src/app/api/component-library/attachments/
migrations/
wrangler.jsonc
```

Do not delay implementation for exhaustive repository-wide reconnaissance. Investigate only direct and transitive blast radius supported by source evidence.

---

## 5. Swarm topology and file ownership

Use the maximum safe number of agents allowed by host memory and current repository instructions. If resources permit, use the following lanes. If resources are lower, serialize them in the same dependency order rather than dropping scope.

### Lead / integrator

Owns:

- baseline and plan state;
- central architecture contracts;
- dependency sequencing;
- shared-file arbitration;
- integration merges;
- migration ordering;
- final requirement audit;
- final report.

### Lane A — Schema and domain contracts

Read:

```text
02-TARGET-PRODUCT-AND-DOMAIN-MODEL.md
03-DATABASE-AND-MIGRATION-DESIGN.md
09-LEGACY-CUTOVER-AND-RECOVERY.md
```

Own:

- D1 migrations;
- domain IDs and DTOs;
- state machines;
- repositories and service contracts;
- idempotent backfills;
- baseline semantics at the data layer.

### Lane B — Project artifacts and upload security

Read:

```text
05-ARTIFACT-UPLOAD-AND-DOCUMENT-SECURITY.md
```

Own:

- project artifacts and immutable versions;
- PDF/image upload policy;
- private R2 paths;
- scan lifecycle;
- artifact serving and browser preview;
- cleanup/retention integration.

### Lane C — Change requests

Read:

```text
02-TARGET-PRODUCT-AND-DOMAIN-MODEL.md
04-APPLICATION-ROUTES-AND-UX.md
06-RBAC-AUDIENCE-AND-PORTAL-PROJECTION.md
```

Own:

- internal and recipient request services;
- request versions;
- evidence links;
- request state transitions;
- public request APIs and UI;
- acknowledgment/assessment workflow.

### Lane D — Issue packages, deterministic diff, and baseline

Read:

```text
07-ISSUE-PACKAGES-DIFF-AND-AI-NARRATIVE.md
```

Own:

- issue drafts;
- estimate/artifact/request package composition;
- private stable source projection;
- deterministic change sets;
- issue content hash;
- decision-to-baseline transition;
- preservation of accepted history.

### Lane E — Internal Project Timeline and UX

Read:

```text
04-APPLICATION-ROUTES-AND-UX.md
```

Own:

- `/workshop/projects/[projectId]/timeline`;
- current-agreement header;
- curated commitment event read model;
- deep links;
- artifact/request/issue/baseline detail views;
- project navigation update;
- raw Activity kept as a separate audit view.

### Lane F — Public portal timeline and recipient experience

Own:

- timeline-first `ClientPortalShell` experience;
- issue detail;
- artifact viewer;
- request creation and amendment;
- discussion and decision journeys;
- recipient-safe deep links;
- responsive and accessible public UX.

### Lane G — RBAC, audience projection, and approval authority

Read:

```text
06-RBAC-AUDIENCE-AND-PORTAL-PROJECTION.md
```

Own:

- new capabilities;
- domain roles;
- permission bundles;
- required approver rules;
- explicit portal event/artifact exposure;
- cross-portal negative policy behavior;
- recipient/organization visibility.

### Lane H — Commitment Center and legacy cutover

Read:

```text
09-LEGACY-CUTOVER-AND-RECOVERY.md
```

Own:

- transforming `/workshop/publisher` into **Commitment Center** while keeping the route;
- modern portal/request/decision queries;
- cross-project action queues;
- legacy creation shutdown;
- backfill and write freeze;
- stable public access preservation;
- removal of legacy authoring after verified cutover.

### Read-only review lanes

At integration checkpoints, use distinct read-only reviewers for:

- architecture/data integrity;
- security and cross-portal confidentiality;
- focused quality review.

### Central file arbitration

The lead is the only writer, or explicitly delegates one writer at a time, for:

```text
src/lib/client-portal/contracts.ts
src/lib/client-portal/policy.ts
src/lib/client-portal/issue-builder.ts
src/lib/client-portal/publish-service.ts
src/lib/client-portal/decision-service.ts
src/lib/client-portal/public-repository.ts
src/components/client-portal/ClientPortalShell.tsx
migrations/*
```

Read-only subagents may inspect these concurrently. No two agents may edit the same central file at once.

---

## 6. Dependency waves

Run the swarm in waves. Read-only preparation may begin early, but production writes must respect dependencies.

### Wave 0 — Fast characterization

Complete `UNIT-001` quickly:

- map current contracts;
- capture current issue/supersession/baseline behavior;
- identify existing public token, portal, upload, policy, and legacy paths;
- record current migration head and next migration number;
- freeze only the critical invariants needed to edit safely.

Do not turn this into exhaustive documentation.

### Wave 1 — Contracts and Cloudflare D1 schema

Implement `UNIT-002`:

- additive domain tables and indexes;
- required safe table rebuilds only where SQLite constraints demand them;
- typed contracts and state enums;
- idempotency keys;
- private source identities;
- baseline history;
- commitment event and portal exposure identities;
- migration/backfill scripts.

Schema must be stable enough for parallel domain implementation before Wave 2 begins.

### Wave 2 — Artifacts, then requests

Run `UNIT-003`, complete its mapped evidence, then run `UNIT-004`:

- project artifact lifecycle;
- immutable artifact versions;
- PDF/image upload and scan path;
- recipient evidence upload;
- first-class change requests and versions;
- request state transitions and target links.

### Wave 3 — Issue package, diff, then baseline

Run `UNIT-005`, `UNIT-006`, and `UNIT-007` in dependency order with explicit shared-file serialization:

- issue draft package composer;
- selected estimate sheets;
- selected artifact versions;
- selected request versions;
- assumptions, exclusions, unresolved items;
- deterministic structured comparison;
- human revision note;
- publish consistency and idempotency;
- active baseline transition on acceptance only.

Do not begin with AI. The deterministic and human-reviewed path must work independently.

### Wave 4 — Internal timeline, public timeline, then access completion

Run `UNIT-008`, `UNIT-009`, and `UNIT-010` in dependency order after the domain contracts are stable:

- internal Project Timeline;
- public portal Timeline;
- deep links and object detail;
- client request creation;
- artifact viewing;
- event exposure policy;
- domain roles, permission roles, and approval authority.

### Wave 5 — Commitment Center and legacy cutover

Run `UNIT-011`, complete its mapped evidence, then run `UNIT-012`:

- switch the workspace roster to modern `client_portals`, requests, issues, decisions, and action counts;
- keep `/workshop/publisher` as the route but label it **Commitment Center**;
- route authoring into canonical project/portal surfaces;
- stop new legacy shared-link creation;
- backfill and freeze legacy writes;
- preserve stable public access and historical evidence;
- remove legacy authoring only after modern behavior is proven.

### Wave 6 — AI narrative

Implement `UNIT-013` after the deterministic change set, human revision note, and issue publication flow are complete. It may be prepared after UNIT-006 only when its files do not overlap the active dependency lane, but it must finish before UNIT-014 while it remains in the pack.

AI remains additive and non-authoritative. Removing it from execution requires an explicit plan-pack scope edit that also removes its UNIT-014 dependency; it may not be silently deferred.

---

## 7. Mandatory implementation scope

The following are core and may not be deferred as “future work”:

### Project-level ledger and timeline

- Add `/workshop/projects/[projectId]/timeline`.
- Show active approved baseline separately from pending issue.
- Show open requests, unresolved discussions, pending decisions, and latest meaningful events.
- Keep the existing raw Activity feed available as “All activity” or equivalent.

### Audience-scoped portals

- One project may have multiple portals.
- Each portal has a stable URL and its own audience, visibility, decisions, baseline, and timeline projection.
- The same project artifact version may be exposed to several portals without duplicating the source file.
- No portal may infer hidden events or artifact counts from another portal.

### First-class change requests from day one

Verified permitted recipients must be able to:

- create a request;
- attach evidence;
- amend through a new immutable request version;
- discuss it;
- withdraw it under the state rules;
- see that submission is not authorization to proceed.

Internal users must be able to acknowledge, assess, link, and resolve requests through issues.

### First-class project artifacts

Implement project-owned logical artifacts with immutable versions, including at least:

- PDF;
- JPEG/PNG/WebP/AVIF evidence where current upload infrastructure supports them.

Each artifact version must preserve:

- project/workspace ownership;
- filename and content type;
- byte size;
- checksum/content hash;
- storage identity;
- uploader and timestamp;
- classification and purpose;
- scan state;
- provenance metadata;
- replacement/version relationship;
- publication relationships.

### Multi-artifact issue packages

An issued issue must be able to include:

- one or more selected estimate sheets;
- exact project artifact versions;
- exact request versions;
- evidence;
- human revision note;
- deterministic change set;
- assumptions;
- exclusions;
- unresolved dependencies;
- requested decision;
- immutable content identity.

### Deterministic version log

Compute authoritative structured changes before any prose generation:

- total change;
- estimate added/removed/changed;
- quantity, unit cost, scope status, and row changes;
- tree/group changes;
- artifact added/removed/replaced;
- request added/linked/resolved;
- assumption/exclusion/unresolved-item changes.

Use private stable source identities. Never silently guess ambiguous row matches.

### Correct baseline semantics

- Publishing creates a pending current proposal.
- Acceptance establishes the next active baseline.
- Changes requested, decline, withdrawal, or replacement of an unaccepted issue do not replace the active baseline.
- Previous accepted issues and baseline transitions remain preserved.

### Roles and authority

Keep separate:

```text
Domain role:
Client / Owner representative / Contractor / Architect / Engineer / QS / PM / Supplier / Subcontractor / Consultant

Permission role:
Viewer / Commenter / Requester / Reviewer / Approver / Editor / Publisher / Administrator

Approval authority:
Required approver status and the exact portal/issue decision policy
```

Extend the existing capability system rather than inventing a separate authorization framework.

### Commitment Center

`/workshop/publisher` becomes a workspace command center showing, at minimum:

- portals grouped by project;
- new external requests;
- pending issues;
- changes requested;
- pending approvals;
- discussions waiting on owner;
- delivery/access problems;
- stale or missing baselines;
- fast links into the project timeline and portal controls.

It monitors and routes work. It is not the main project file library or issue authoring surface.

---

## 8. Cloudflare D1, R2, and migration mandate

The orchestrator must implement the necessary Cloudflare schema and storage changes. Do not leave schema as pseudo-code.

### D1 migrations

- Inspect `wrangler.jsonc`, the current `migrations/` sequence, and current D1 conventions.
- Create the next correctly numbered additive migration files under `migrations/`.
- Follow the schema and migration sequence in `03-DATABASE-AND-MIGRATION-DESIGN.md`.
- Prefer additive tables, columns, indexes, triggers, and idempotent backfills.
- Use a table rebuild only when SQLite/D1 constraints require it, and preserve every existing row and foreign-key relationship.
- Preserve current portal tokens, issued issue content, decisions, recipients, comments, audit records, and stable public access.
- Do not edit legacy `supabase/migrations/`.
- Do not create a parallel database provider.

At minimum, implement durable identities and relationships for:

```text
project_artifacts
project_artifact_versions
project_change_requests
project_change_request_versions
project_change_request_state_events
request targets and evidence links
client_portal_issue_drafts
issue draft estimate/artifact/request links
normalized issued issue estimate/artifact/request links
private issued source estimates/rows/nodes
client_portal_issue_change_sets
client_portal_baselines
project_commitment_events
client_portal_event_exposures
portal/recipient/domain-role extensions
```

Use current repository naming conventions if source evidence supports better names, but preserve the semantics above.

### Local migration execution

Use repository migration helpers first. Verify Wrangler syntax/config against the installed version and `wrangler.jsonc` before direct commands.

Required local behavior:

1. apply all migrations to a clean local D1 database;
2. apply them as an upgrade over the current pre-feature schema with representative legacy data;
3. rerun idempotent backfills;
4. run foreign-key and uniqueness checks;
5. verify the application can read the migrated data.

Do not run remote D1 mutations blindly.

If an authorized non-production Cloudflare environment is already connected and current repository policy explicitly permits remote migration in this session, then:

1. export or otherwise capture the required pre-migration recovery evidence;
2. list pending migrations against the exact configured database;
3. apply only the new reviewed migrations;
4. verify schema and representative readback;
5. record the exact environment and results.

Never mutate production, deploy the Worker, delete R2 data, or claim hosted proof implicitly. If remote authority is absent, complete all migration files and local proof, and report the exact remote command as pending—not as completed.

### R2 and upload lifecycle

Reuse the existing upload lifecycle, `upload_assets`, checksums, scan gates, cleanup claims, and `ARCH_UPLOADS_R2` binding.

Add a dedicated project-artifact/evidence upload surface rather than storing master documents as brand assets.

Requirements:

- private bucket/object access;
- content sniffing, not browser MIME trust;
- PDF and supported image allowlist;
- bounded size;
- recipient upload rate limits;
- scan-required state for PDFs and external evidence;
- no public URL exposure;
- range-capable authenticated/portal-scoped PDF serving;
- safe content disposition;
- cleanup only when no immutable issued relationship requires retention.

For the first implementation, prefer the simplest secure PDF experience that works across supported browsers: browser-native preview through a protected range-serving route plus a safe download fallback. Do not add a heavy PDF editing or redlining framework.

---

## 9. Lean implementation and verification policy

The operator explicitly wants fast implementation without overtesting or overengineering.

### During implementation

Do **not** run after every unit:

- the full repository test suite;
- full `quality:critical` aggregation;
- mutation testing;
- full cross-browser matrix;
- Storybook build;
- complete visual regression;
- broad performance audits;
- release-gate checks.

Do not create tests for every component, getter, copy string, or trivial rendering branch.

Use the cheapest decisive verification for each slice:

- compile/type evidence for contracts;
- clean and upgrade local D1 apply for migrations;
- focused repository/service checks for state machines;
- focused negative checks for portal isolation and upload access;
- one or two browser smoke journeys for each new critical user path;
- direct source/graph inspection for unchanged supporting behavior.

### Critical checks that may not be deferred

Even in VIP mode, run focused proof for:

1. active baseline remains unchanged when a pending issue is published;
2. acceptance creates exactly one next baseline;
3. portal A cannot read portal B’s request, event, artifact, or issue;
4. request submission does not alter estimate or baseline;
5. issued artifact version remains readable after a newer working version exists;
6. unsupported, unscanned, revoked, cross-project, and cross-portal assets are denied;
7. duplicate request/publish/decision retries are idempotent;
8. migrations apply to clean and upgrade databases without losing legacy data;
9. public payloads do not leak internal IDs, storage paths, internal notes, margins, or private provenance.

### Integration checkpoints

Run focused checks after each wave, not each file.

At the final implementation checkpoint run, at minimum:

```bash
bun run type-check
bun run lint
bun run build
```

Also run only the focused test/integration files created or directly affected for:

- migrations and backfill;
- artifacts/uploads;
- requests;
- issue/diff/baseline;
- portal policy/isolation;
- critical public timeline journey;
- legacy cutover.

Run the current authoritative Q2 profile once at the end after focused wave checks. It includes the required aggregate tests, changed-branch coverage, mutation scope, browser/accessibility journeys, migration proof, security review, quality review, and machine-readable manifest. Do not narrow or defer required evidence.

### Completion requires local Q2 certification

This task targets:

```text
IMPLEMENTED / Q2 PASS
```

Do not edit or bypass quality policy. Focused checks run after waves; the complete current Q2 profile runs once at the end. A failed, missing, skipped, malformed, or deferred required Q2 artifact leaves the implementation incomplete. Local Q2 proof does not claim hosted or production readiness.

---

## 10. Anti-overengineering rules

Do not:

- introduce event sourcing as a new system of record;
- build a generic BPM/workflow engine;
- build CAD/BIM or graphical PDF redlining;
- implement a general cloud drive;
- create a separate service solely for the timeline;
- duplicate the same document for every portal;
- use `client_portal_assets` as the master project document library;
- let AI compare arbitrary PDFs and declare contractual facts;
- make AI required for publishing;
- create a new global RBAC framework when the existing capability evaluator can be extended;
- create one shared link per issue;
- retain legacy authoring longer than necessary after verified cutover;
- create broad feature flags or dual-write systems without a proven migration need;
- rewrite unrelated authenticated UI;
- add dependencies without direct necessity;
- create extra planning documents unless they are a required migration/evidence artifact.

Prefer:

- existing D1 repository patterns;
- existing Client Portal service boundaries;
- existing stable `/share/[token]` dispatch;
- existing upload lifecycle and R2;
- existing notification outbox/queue;
- existing project Activity as the raw audit source;
- additive domain services and deterministic read models;
- concise, composable UI primitives already used in the repository.

---

## 11. Default resolutions for non-blocking open questions

Do not pause for these unless current source proves a conflict. Use these implementation defaults:

1. Keep route `/workshop/publisher`; visible product label becomes **Commitment Center**.
2. Use browser-native PDF preview through protected range serving, with download fallback. Defer page-coordinate annotations and graphical redlining.
3. Reuse current conservative upload ceilings: approximately 20 MB for PDFs/attachments and 12 MB for images unless current policies require a lower limit.
4. If a project has exactly one usable portal, default to it; otherwise require explicit portal selection.
5. Request visibility defaults to the portal audience that created it, subject to explicit recipient/organization policy. Never make it globally project-public.
6. A recipient may withdraw a request before a linked issue is published. After publication, withdrawal becomes a new attributable request event/version and does not rewrite the issued package.
7. Artifact-level discussion is core. Page-coordinate PDF comments are deferred.
8. AI narrative is optional, draft-only, disabled when no existing approved AI runtime/configuration is available.
9. Baseline void/repair is an administrator-only future repair path; do not invent casual editing of accepted history.
10. Keep retention language and implementation conservative; do not promise unconditional permanence.

Record any deviation in the existing decision ledger with source-backed rationale.

---

## 12. Required progress reporting

After each wave, provide a concise implementation update containing:

- units completed;
- files and migrations changed;
- important domain decisions resolved;
- current data migration state;
- focused evidence run and outcome;
- current parallel lanes;
- exact next wave;
- real blocker, if any.

Do not report low-level tool chatter. Surface material findings immediately, especially:

- data-loss risk;
- cross-portal leakage;
- baseline corruption;
- upload/security failures;
- D1 statement/batch limits;
- incompatible concurrent edits.

---

## 13. Required deliverables

By the end of the implementation run, produce:

### Repository implementation

- D1 migrations and backfills;
- domain contracts and services;
- internal Project Timeline;
- first-class artifacts and versions;
- first-class change requests;
- multi-artifact issue composer;
- deterministic change set;
- correct baseline semantics;
- timeline-first public portal;
- role/exposure controls;
- modern Commitment Center;
- legacy cutover implementation;
- optional AI narrative only if the core is already complete.

### Plan state

- refreshed `plan-pack.json` baseline and hashes;
- truthful unit states;
- resume ledger;
- decision changes, if any;
- exact pending hardening/release evidence.

### Final report

Report:

1. product behavior implemented;
2. architecture and schema delivered;
3. all migration filenames and what each does;
4. local D1 migration/apply results;
5. R2/upload changes;
6. routes and UI surfaces changed;
7. legacy cutover status;
8. focused verification actually run;
9. complete Q2 evidence and independent review verdicts;
10. remaining risks and exact next hardening tasks;
11. whether any external Cloudflare action was performed;
12. confirmation that no production deployment, commit, push, or destructive external action was performed unless separately authorized.

Do not claim tests, migrations, hosted behavior, or production state that were not actually verified.

---

## 14. Stop conditions

Continue implementation while safe in-scope work remains.

Stop only for one of these conditions:

### Implemented and Q2 verified

The complete vertical architecture works locally, all mapped evidence is fresh, migrations are locally valid, and the required independent quality and security reviews approve. Report:

```text
IMPLEMENTED / Q2_PASS
```

### AUTH_BLOCKED

A prohibited credentialed, destructive, paid, deployment, or production action is the only remaining step after all safe local work is complete.

### TECH_BLOCKED

A core deliverable remains impossible after materially different local approaches fail and no runnable unit remains.

### QUALITY_BLOCKED

Current repository policy requires evidence that cannot run, while the implementation itself is complete and no safe code fix remains.

Do not stop because the work is large. Use the resume ledger and continue in the next context with the exact active unit and owned paths.

---

## 15. Begin now

1. Import and validate the plan pack.
2. Refresh current source and migration head.
3. Inspect host resources and dispatch the maximum safe swarm.
4. Complete Wave 0 rapidly.
5. Begin D1 schema and domain implementation immediately.
6. Keep the operator informed at wave boundaries.
7. Do not return with another proposal. Return with implemented code, migrations, focused proof, and an honest hardening remainder.
