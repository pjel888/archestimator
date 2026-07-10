# ArchEstimator MVP Pre-Release Beta Readiness Audit

**Repository:** `pjel888/archestimator`  
**Branch reviewed:** `main`  
**Audit date:** July 10, 2026  
**Release target assessed:** Invite-only, external pre-release Beta with real professional users and real-but-controlled project data

---

## 1. Executive verdict

ArchEstimator is **ready for a founder-led internal alpha and controlled demonstrations**, but it is **not yet ready for an external pre-release Beta**.

The core estimate-authoring product is substantially built: hierarchical estimates, inline editing, reusable components, templates, history, exports, publications, comments, recipient decisions, collaboration, security controls, and an unusually deep operational toolchain all exist. The central problem is no longer feature absence in the editor. The problem is that the product does not yet close four critical loops:

1. **Release confidence:** active CI is disabled, browser coverage is weak, and documentation overstates current automation.
2. **First-user activation:** a true zero-project user receives no strong guided path to first value.
3. **Decision support:** estimate analytics and publisher analytics present data, but do not reliably identify risk, explain changes, or drive follow-up.
4. **Recovery and operation:** local restore evidence is strong, but hosted/provider-backed restore proof and a fully truthful operator dashboard are incomplete.

### Readiness scorecard

| Area | Audit score | Assessment |
|---|---:|---|
| Core estimating workspace | 8.0 / 10 | Strong Beta foundation |
| Component library and templates | 7.5 / 10 | Strong, with governance and usability follow-up |
| Public proposal review | 7.0 / 10 | Functional and reasonably polished |
| Collaboration and history | 7.0 / 10 | Capable, but needs hosted proof |
| Estimate intelligence and analytics | 3.5 / 10 | Main product gap |
| Publisher / recipient analytics | 4.0 / 10 | Events exist; decisions are not synthesized |
| First-run onboarding and activation | 3.5 / 10 | Major conversion risk |
| Security and authorization | 7.5 / 10 | Material hardening completed; residual risks remain |
| Backup and restore readiness | 5.0 / 10 | Local proof only |
| Release automation | 2.5 / 10 | External-Beta blocker |
| Support and observability | 6.5 / 10 | Good foundation; operator truth is mixed |
| Documentation truth and release state | 4.0 / 10 | Significant drift |
| **Overall external-Beta readiness** | **5.5 / 10** | **No-go today** |
| **Internal pilot readiness** | **8.0 / 10** | **Go with founder supervision** |

These scores are prioritization judgments, not automated test results.

---

## 2. Audit scope and method

This was a source-level audit of the current repository through the connected GitHub workspace. It covered:

- application routes and route boundaries;
- estimate tree, estimate rows, mutations, history, templates, export, and data views;
- project dashboard and project collection experience;
- publication creation, public share page, recipient sessions, comments, decisions, and event tracking;
- Publisher roster and drawer;
- component library and major data types;
- Better Auth, authorization, token handling, telemetry, and rate limits;
- Cloudflare Worker, D1, R2, Durable Objects, Queues, and scheduled operations;
- admin, support, observability, feedback, legal, and privacy surfaces;
- package scripts, CI history, Playwright configuration, E2E coverage, release gates, backup/restore evidence;
- current commit history and repository documentation.

### Limitation

The repository could be inspected through GitHub, but it was not locally cloneable or executable in this session. Therefore this report distinguishes:

- **source-confirmed behavior**;
- **documented or commit-evidence claims**;
- **hosted proof still required**.

No production configuration, database, deployment, issue, branch, or source file was changed.

---

## 3. What is already strong

### 3.1 The estimate editor is not the primary problem

The estimate workspace already includes the hard mechanics required for a credible MVP:

- hierarchical groups and areas;
- tabbed estimate sheets;
- inline quantity and cost editing;
- optimistic mutations;
- saving, saved, failed, offline, and revision-conflict states;
- row and node activity;
- restore-from-history behavior;
- reusable templates and component insertion;
- project-scoped access controls;
- export preview and workbook generation;
- lazy loading and route performance work.

**Evidence paths**

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/components/workshop/EstimateWorkspaceClient.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/components/workshop/estimate-tree/`
- `src/lib/repositories/project-estimate-sheets-repository.ts`

This means Beta work should not be framed as “finish the estimating engine.” The estimating engine is already the strongest part of the product.

### 3.2 The public proposal workflow is real

The current shared page supports:

- protected publication tokens;
- optional password gates and lockout;
- recipient-specific secure sessions;
- public-safe snapshots;
- a project/proposal header;
- total, sheet count, row count, client, currency, and prepared date;
- estimate and row navigation;
- contextual comments;
- proposal-, estimate-, or row-level response targeting;
- approve, request changes, or decline;
- signer name capture for approval;
- stale-snapshot conflict handling;
- mobile bottom navigation;
- print-oriented styling;
- event and open tracking with bot classification.

**Evidence paths**

- `src/app/share/[token]/page.tsx`
- `src/components/share/SharePageProposalHeader.tsx`
- `src/components/share/SharePageSummaryCard.tsx`
- `src/components/share/ShareReviewWorkspace.tsx`
- `src/components/share/SharePageComments.tsx`
- `src/components/share/SharePageDecision.tsx`
- `src/lib/publication/public-repository.ts`
- `src/lib/publication/security.ts`
- `src/lib/publication/types.ts`

The public page is not a placeholder. Its Beta gap is primarily proposal identity, review clarity, analytics, and follow-up—not basic functionality.

### 3.3 Security has materially improved

Current source includes:

- application-layer authorization on D1 reads and writes;
- fail-closed project access checks;
- disabled implicit OAuth account linking;
- durable D1-backed rate limits;
- hashed magic-link verification tokens;
- short magic-link expiration;
- password failure lockout;
- hashed publication and recipient tokens;
- keyed telemetry hashing rather than reversible bare IP hashes;
- same-origin and CSRF protection on public writes;
- event-metadata allowlists and size limits;
- generic client-facing error envelopes;
- audit and security event records.

**Evidence paths**

- `src/lib/auth/better-auth-cloudflare.ts`
- `src/lib/authz/d1-access.ts`
- `src/lib/publication/public-repository.ts`
- `src/lib/publication/security.ts`
- `src/app/api/share/[token]/`
- `src/lib/repositories/`
- `migrations/`

The largest residual auth risk is that Better Auth session tokens remain raw values in D1 for up to the configured session lifetime. This is mitigated—not eliminated—by access control, no cookie cache, expiration, event logging, and revocation capabilities. It should be an explicit Beta risk acceptance rather than an accidental one.

### 3.4 Operational engineering is unusually mature

The repository includes:

- structured logging;
- request IDs;
- operational incidents and incident events;
- client error and web-vital events;
- scheduled and queue handlers;
- release-gate scripts;
- Cloudflare resource and pricing proofs;
- deployment dry runs;
- support monitoring scripts;
- D1 restore rehearsal tooling;
- security and design-system enforcement;
- extensive Vitest and Bun test suites;
- in-app Beta feedback;
- a D1-backed admin support inbox.

This is a real advantage. However, it has created an imbalance: internal infrastructure and plan evidence are more developed than the first-user and product-decision experience.

---

## 4. Critical findings

## 4.1 P0 — Active CI and merge safety are missing

The current workflow was intentionally moved under `.github/workflows-disabled/`, so GitHub Actions no longer enforce validation on pushes or pull requests. The README still claims active CI.

This is the single clearest external-Beta blocker.

The repository already has strong local commands, including type checks, linting, tests, design enforcement, security validation, build checks, and browser tests. The problem is not lack of checks; the problem is lack of guaranteed execution.

An additional risk is that `next.config.ts` permits build-time TypeScript errors for the Cloudflare build path. That can be acceptable only when an independent type-check is mandatory. With CI disabled, it is unsafe.

### Required action

Restore an active workflow and make it a required merge/deploy gate.

### Required checks

1. frozen dependency install;
2. TypeScript;
3. lint and error-handling validation;
4. unit, DOM, repository, authz, security, and migration tests;
5. design-system and source invariant checks;
6. OpenNext/Cloudflare build;
7. critical-path Playwright;
8. dependency and secret scanning;
9. deployment preview or staging smoke;
10. artifact retention for failed browser traces and screenshots.

### Acceptance criteria

- No protected merge can bypass the required status checks.
- A production deployment can only use a commit that passed the same checks.
- The README accurately describes the active pipeline.
- The TypeScript build exception has a mandatory compensating type-check.
- Dependency updates have an automated or scheduled review path.

---

## 4.2 P0 — Browser proof does not cover the product’s golden path

The current Playwright default is a single Desktop Chrome project. Other desktop and mobile browsers are opt-in. During the Cloudflare migration, many critical E2E specs were removed, including estimate interactions, publisher flows, collaboration, library routes, and related fixtures.

The shared-link E2E suite is disabled by default and requires manually seeded publication and recipient tokens. Its source comments refer to nightly CI even though active CI is disabled.

The test hierarchy is therefore inverted:

- unit and integration evidence is deep;
- actual user-journey proof is shallow and partly aspirational.

### Required Beta golden path

A single deterministic staging fixture must prove:

1. request or receive Beta access;
2. sign in;
3. enter a workspace;
4. see a correct zero-state;
5. create a project;
6. receive a default estimate;
7. add an area;
8. add a template or library component;
9. edit quantity and cost;
10. observe saved state;
11. reload and verify persistence;
12. open estimate health/data analytics;
13. preview and download export;
14. publish selected sheets;
15. open the recipient link;
16. pass password/session checks when enabled;
17. comment;
18. approve, request changes, or decline;
19. return to Publisher;
20. see the recipient event and required follow-up.

### Browser policy

- Per merge: Chromium desktop critical path.
- Per release: Chromium plus WebKit mobile review/share path.
- Nightly: Firefox, Safari/WebKit, small iPhone, modern iPhone, iPad, Android viewport.
- Beta editing may be declared desktop-first, but public review and critical recovery must work on mobile.

### Acceptance criteria

- The golden path runs against Cloudflare-parity staging.
- It is not skipped by default.
- Seed and cleanup are deterministic.
- Failures retain trace, screenshot, console, request, and response evidence.
- Hosted post-deploy smoke runs automatically.

---

## 4.3 P0 — First-user activation is underdesigned

The current project collection handles search-empty and status-empty states, but a true user with zero projects on the default “All” tab can fall through to an empty collection with no strong guided action.

Project creation itself is competent: name, client, currency, code, location, image, and a default estimate are handled. But there is no first-value path after creation.

### Required zero-state

The first project screen should offer three explicit choices:

1. **Start with a guided sample**  
   A safe, clearly labeled starter project that demonstrates areas, components, quantities, pricing sources, health flags, export, and sharing.

2. **Start from a template**  
   Choose a project/estimate template before entering the blank editor.

3. **Create blank**  
   Preserve the current clean project creation route for experienced users.

“Import existing estimate” may be exposed as Beta or “coming next,” depending on actual reliability. It should not be implied if it is not supported.

### Required first-estimate checklist

A non-blocking checklist should guide:

- complete project details;
- set project type and floor area;
- create or choose an area;
- add a component/template;
- set quantity;
- verify source, price date, and confidence;
- review estimate health;
- preview export;
- publish to a recipient.

The checklist should disappear after completion and remain reopenable from Help.

### Activation event model

Track:

`invite_accepted → workspace_ready → project_created → first_area_created → first_row_priced → first_valid_total → health_reviewed → export_completed → publication_created → recipient_opened → recipient_engaged → recipient_decided`

### Acceptance criteria

- A new invited user can reach a persisted, non-zero estimate without founder intervention.
- Every empty state has a next action.
- The sample is clearly labeled as demonstration data.
- No onboarding step traps the user in a wizard.
- Admin can see where each Beta user stopped.

---

## 4.4 P1 — The Data page is composition reporting, not estimate intelligence

The existing Data route can:

- select a baseline estimate;
- compare up to two additional sheets;
- group by category, supplier, or space;
- show totals, row counts, donuts, and bucket lists.

This is useful, but it does not answer the questions a professional estimator needs before issuing or sharing work:

- Is the estimate complete?
- Which values are stale or unverified?
- What changed?
- Which items drive the total?
- What is over budget?
- Where are quantities or prices suspicious?
- What must I fix before sending this to a client?

The data model already contains much of the raw information required:

- unit cost;
- quantity;
- category and category path;
- supplier and brand;
- source URL;
- pricing source;
- pricing date;
- confidence;
- component version;
- link state;
- scope status;
- labor unit cost;
- row and estimate revisions;
- project budget.

### Recommended Estimate Intelligence cockpit

#### A. KPI strip

- Current total
- Planned budget
- Variance and percentage
- Priced rows / total rows
- Stale-price rows
- Unpriced or zero-cost rows
- Incomplete-scope rows
- Cost per square metre, only when floor area is available

#### B. Estimate Health

Use transparent rules rather than an unexplained score.

Recommended sections:

- **Pricing completeness:** missing cost, missing source, missing date, low confidence
- **Pricing freshness:** configurable threshold by category or workspace
- **Scope completeness:** blank description, unit, quantity, designation, or scope status
- **Version integrity:** detached, overridden, or source-changed library rows
- **Budget health:** over budget, near threshold, no budget
- **Concentration risk:** excessive dependence on one supplier/category
- **Calculation validity:** non-finite values, negative quantities, abnormal adjustments

Each issue must include:

- severity;
- affected count and value;
- plain-language explanation;
- direct link to filtered rows;
- clear remediation.

#### C. Cost drivers

- top 10 rows by total;
- cumulative Pareto percentage;
- largest spaces;
- largest categories;
- largest suppliers;
- change drivers versus baseline.

#### D. Revision and baseline comparison

- total delta;
- added rows;
- removed rows;
- quantity changes;
- unit-rate changes;
- scope changes;
- new stale or unverified items;
- responsible user and timestamp where available.

#### E. Risk/data-quality table

A filterable table should support:

- unpriced;
- stale;
- missing source;
- low confidence;
- changed source;
- overridden;
- no supplier;
- no scope;
- over-budget contribution;
- high-value outlier.

#### F. Drill-through

Every chart segment, KPI, and warning should open the exact filtered rows in the estimate workspace. Analytics without correction paths will become passive decoration.

### Required typed project fields

To make project-level intelligence reliable, add typed fields rather than burying them in generic metadata:

- project type;
- gross floor area;
- area unit;
- project phase;
- target budget;
- budget basis date;
- base currency;
- location market/region;
- procurement status;
- estimate purpose or issue status.

### Beta v1 health rules

A reasonable first release does not need machine learning. Deterministic rules are more trustworthy:

- `unitCost <= 0` → unpriced;
- no pricing source/date → provenance missing;
- price date older than workspace threshold → stale;
- confidence missing or explicitly low → review;
- no quantity/unit/description → scope incomplete;
- link state `source-changed`, `detached`, or `linked-overridden` → version review;
- one supplier over a configurable percentage → concentration warning;
- total above budget → critical;
- total above 85% of budget → warning.

---

## 4.5 P1 — Publisher analytics does not yet support follow-up decisions

The Publisher roster and drawer already expose:

- publication status;
- selected sheet count;
- recipient count;
- open count;
- comments and unresolved comments;
- decisions;
- latest activity;
- password, expiration, and location settings;
- activity feed.

The underlying public repository also records:

- page visit;
- password gate viewed;
- password unlocked;
- proposal viewed;
- recipient session started;
- bot/device/browser/OS/country metadata;
- recipient opens;
- comments;
- decisions.

The missing step is synthesis.

### Required Publisher funnel

For each publication and snapshot version:

1. Sent or link generated
2. Delivered, when email-delivery proof is available
3. Recipient session started
4. Proposal viewed
5. Engaged
6. Commented
7. Decision submitted

Definitions must be explicit:

- **Total opens:** non-bot proposal renders.
- **Unique viewer:** first non-bot view per recipient and snapshot version.
- **Anonymous view:** valid publication open without a verified recipient.
- **Engaged recipient:** viewed plus comment, row selection event, print/download, or decision.
- **Decision:** accepted, revision requested, or declined.
- **Action required:** unresolved comment, requested revision, failed delivery, stale snapshot, or no decision after configured follow-up period.

### Required recipient matrix

| Recipient | Delivery | First view | Last view | Views | Comments | Decision | Last action | Follow-up |
|---|---|---|---|---:|---:|---|---|---|

Do not merge anonymous traffic into recipient engagement.

### Required owner actions

- Copy secure link
- Resend invitation
- Send reminder
- Resolve or reply to comment
- Open exact commented row
- Republish changed estimate
- Revoke recipient
- Mark follow-up complete
- Export activity record

### Required risk badges

- Not viewed
- Viewed, no response
- Revision requested
- Unresolved comments
- Snapshot stale
- Link expiring
- Password failures
- Delivery failed
- Anonymous traffic only
- Decision complete

### Privacy requirements

- Clearly state which metrics are recorded.
- Keep bot and anonymous traffic separate.
- Do not present country or device data as precise user identity.
- Keep raw IPs and raw user agents out of product analytics.
- Define retention and deletion behavior before enabling access telemetry in production.
- Version metrics by publication snapshot so republishing does not corrupt the funnel.

---

## 4.6 P1 — The public proposal needs stronger issue identity and trust context

The current share page is readable and responsive, but it still reads like a generic “Proposal Review.”

Before broader Beta use, display:

- proposal title;
- issue/revision number;
- snapshot version;
- prepared date;
- validity period;
- issuer company and contact;
- recipient/client;
- project and location;
- included estimate sheets;
- assumptions;
- exclusions;
- tax treatment;
- currency;
- pricing basis date;
- approval effect;
- “superseded” or “updated” state when a newer issue exists.

This is not a request to turn the software into a legal contract engine. It is a request to prevent ambiguity over what the recipient is reviewing.

### Recommended page hierarchy

1. Proposal identity and status
2. Executive summary and total
3. Assumptions, exclusions, and validity
4. Estimate sheet navigation
5. Line items and contextual questions
6. Response actions
7. Activity/receipt copy for the recipient
8. Print/export

### Important scope rule

The application currently positions exports and shared snapshots as working documents rather than immutable issued records. Preserve that claim until an explicit issue-record policy, snapshot immutability contract, and legal review are complete.

---

## 4.7 P0 — Backup and restore evidence is local, not provider-backed

The D1 restore rehearsal is well designed for a local sanitized fixture:

- create fixture;
- dump;
- import;
- compare row counts;
- compare checksums;
- check foreign keys.

However, the script explicitly reports `localOnly: true` and `providerBacked: false`.

### Required external-Beta proof

1. Export a real hosted staging D1 database.
2. Restore into a disposable D1 database.
3. Verify migration ledger and schema objects.
4. Verify row counts and critical checksums.
5. Run foreign-key and orphan checks.
6. Verify auth denials and workspace isolation.
7. Point a disposable Worker/staging environment to the restored database.
8. Run the golden path read-only and a controlled write.
9. Record recovery time, operator, commands, evidence, and rollback.
10. Destroy the disposable environment according to policy.

### Acceptance criteria

- A named operator can restore service using documented commands.
- The proof is recent and repeatable.
- The test includes application behavior, not only database import success.
- Restore evidence is treated as a release artifact.

---

## 4.8 P1 — Admin/operator truth is mixed with stubs

The D1-backed support inbox is real and useful. By contrast, the Admin overview currently includes:

- “Stub” signup, team, support, and flag metrics;
- a hard-coded signup chart;
- pending D1/R2/Queue health;
- a non-wired incident strip.

The Admin analytics page is mostly provider link-outs, and the observability page explicitly does not claim hosted log or alert readiness.

This is acceptable during implementation but dangerous if treated as an operational control surface.

### Required Beta operator dashboard

Show only metrics backed by real sources:

- invited users;
- accepted invites;
- active Beta users;
- activation milestone reached;
- first estimate;
- first valid total;
- first export;
- first publication;
- first recipient view;
- first recipient engagement;
- first decision;
- feedback by severity/status;
- open support conversations;
- unresolved incidents;
- last successful backup/restore proof;
- latest release and smoke status.

Any unavailable metric should say **Unavailable**, not display fabricated sample values.

---

## 4.9 P1 — Documentation is not a reliable source of release truth

Current README drift includes:

- a stale migration count;
- active-CI claims even though workflows are disabled;
- E2E inventory that no longer matches current coverage;
- proposal-open tracking marked planned even though event tracking exists;
- completed and planned features mixed without proof timestamps.

The repository contains many large, dated plan packs. They are useful history but should not be used as current product truth unless source-confirmed.

### Required canonical readiness manifest

Generate one machine-readable and human-readable report containing:

- current commit SHA;
- current D1 migration version;
- enabled feature flags;
- active application routes;
- current test counts;
- active CI workflow;
- latest hosted smoke;
- latest restore proof;
- latest security scan;
- current legal document version;
- current open P0/P1 blockers;
- release decision;
- evidence timestamps and paths.

The README should summarize this manifest rather than duplicate it manually.

---

## 4.10 P1 — Maintainability risk is concentrated in very large client modules

Several core client files are extremely large:

- `src/components/workshop/projects-page-client.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/hooks/use-estimate-row-mutations.ts`

They contain multiple state machines, rendering concerns, filters, transitions, optimistic reconciliation, and modal orchestration.

This is not a reason to pause Beta. It is a reason to avoid piling analytics and onboarding into the same files.

### Refactoring rule

Extract by product capability, not arbitrary line count:

- estimate health state and selectors;
- filtered-row query state;
- activity/revision state;
- export state;
- onboarding state;
- publication analytics selectors;
- project collection zero-state;
- modal orchestration.

Keep server-authoritative calculations in repositories or pure shared modules. Do not duplicate total and health formulas inside UI components.

---

## 5. Prioritized Beta backlog

## P0 — Must close before external Beta

| ID | Work item | Why it blocks Beta | Acceptance criteria |
|---|---|---|---|
| BETA-P0-01 | Restore active CI and required checks | Regressions can merge/deploy without reproducible validation | Required protected checks; deploy only passed SHA; artifacts retained |
| BETA-P0-02 | Staging golden-path E2E | Core workflows are not proven end to end | Deterministic seed/cleanup; unskipped; post-deploy smoke |
| BETA-P0-03 | Provider-backed D1 restore drill | Real user data recovery is unproven | Hosted export restored to disposable D1; app/authz checks pass |
| BETA-P0-04 | True zero-state and first-value onboarding | New users can stall before experiencing value | Guided sample/template/blank paths; first valid total without support |
| BETA-P0-05 | Screen/share/XLSX total parity fixtures | Trust failure if outputs disagree | Golden fixtures match totals, adjustments, currency, and row scope |
| BETA-P0-06 | Production telemetry contract | Analytics may be misleading or privacy-ambiguous | Metric definitions, bot separation, retention, consent, production flag proof |
| BETA-P0-07 | Beta incident, rollback, and support contract | Failures need an owned response path | Named owner, severity, response targets, rollback, customer communication |
| BETA-P0-08 | Auth residual-risk decision | Raw session-token risk is currently implicit | Written acceptance or mitigation; revocation drill; D1 access review |
| BETA-P0-09 | Legal Beta gate | Current terms are owner-approved pending counsel | Explicit limited-cohort approval; counsel gate before broader/paid launch |
| BETA-P0-10 | Release truth manifest | Current docs can create false confidence | Generated current-state report used for every release decision |

## P1 — First Beta product slices

| ID | Work item | Outcome |
|---|---|---|
| BETA-P1-01 | Estimate Health cockpit | Users know what is unsafe or incomplete before sharing |
| BETA-P1-02 | Analytics drill-through | Every warning/chart leads to the rows that need correction |
| BETA-P1-03 | Revision intelligence | Users understand total, quantity, rate, and scope changes |
| BETA-P1-04 | Publisher funnel | Owners know whether recipients viewed, engaged, or decided |
| BETA-P1-05 | Recipient matrix and follow-up | Sharing becomes a managed client workflow |
| BETA-P1-06 | Proposal issue identity | Recipients know exactly what version they are reviewing |
| BETA-P1-07 | Real Beta cohort dashboard | Founder can manage activation, support, and product risk |
| BETA-P1-08 | Price freshness governance | Library and estimate prices expose basis date and confidence |
| BETA-P1-09 | Accessibility and mobile review pass | Public review and critical actions are dependable on mobile |
| BETA-P1-10 | Large-component capability extraction | New Beta work does not increase regression concentration |

## P2 — Post-Beta, do not block the first cohort

- portfolio benchmarking;
- client/project-type/supplier historical intelligence;
- automated cost-per-area benchmarks;
- cash-flow and schedule analytics;
- supplier quote requests;
- immutable issued proposal records;
- advanced client portals;
- subscriptions and billing;
- broad public signup;
- enterprise administration;
- advanced AI copilot and package generation;
- full mobile estimate editing.

---

## 6. Recommended product slices

## Slice A — Release integrity

Deliver together:

- active CI;
- protected checks;
- deterministic staging seed;
- golden-path E2E;
- hosted smoke;
- canonical readiness manifest;
- restore drill.

This creates the foundation for every later Beta iteration.

## Slice B — Activation

Deliver together:

- zero-project state;
- sample/template/blank choice;
- first-estimate checklist;
- activation event taxonomy;
- admin activation funnel;
- contextual Help and feedback.

Do not build a long modal wizard. The product itself should teach the workflow.

## Slice C — Estimate trust

Deliver together:

- KPI strip;
- deterministic health rules;
- risk table;
- drill-through;
- budget variance;
- top drivers;
- export/share blocking warnings only for truly critical issues.

Warnings should be actionable, not punitive. Allow users to proceed with acknowledged exceptions where professional judgment is appropriate.

## Slice D — Client handoff

Deliver together:

- proposal issue identity;
- assumptions/exclusions/validity;
- Publisher funnel;
- recipient matrix;
- unresolved-comment and requested-revision workflow;
- reminders and republish actions;
- snapshot-versioned analytics.

This is the slice that turns ArchEstimator from an estimate editor into a proposal workflow product.

---

## 7. Analytics design specification

## 7.1 Estimate Data page

### Header

- Estimate name and code
- Current issue/baseline
- Last updated
- Prepared by
- Budget
- Filters
- Export analysis

### KPI row

| KPI | Formula / source | Action |
|---|---|---|
| Total | Canonical estimate total | Open all rows |
| Budget variance | Total − project budget | Filter overage drivers |
| Pricing completeness | Rows with valid positive price / rows requiring price | Open unpriced |
| Provenance completeness | Rows with source and date / priced rows | Open missing provenance |
| Freshness | Rows inside threshold / priced rows | Open stale |
| Scope completeness | Rows with required scope fields / all rows | Open incomplete |
| Source integrity | Clean linked rows / linked rows | Open changed/overridden |
| Cost per area | Total / gross floor area | Open project assumptions |

### Main panels

1. Health and action queue
2. Category/space/supplier composition
3. Top cost drivers/Pareto
4. Budget allocation
5. Revision/baseline change
6. Risk/data-quality table

### Empty states

- No rows: “Add an area or start from a template.”
- No budget: “Set a planned budget to enable variance.”
- No floor area: “Add gross floor area to enable cost-per-area.”
- No baseline: “Save or choose a version to compare changes.”
- No price dates: “Add basis dates to monitor freshness.”

## 7.2 Publisher

### Roster columns

- Project
- Publication status
- Snapshot version
- Recipients
- Unique viewers
- Engaged
- Unresolved comments
- Decision
- Last activity
- Action required

### Drawer tabs

1. Overview
2. Analytics
3. Recipients
4. Comments and decisions
5. Included sheets
6. Security and access
7. Activity

### Funnel

- Generated
- Invited
- Delivered
- Viewed
- Engaged
- Commented
- Decided

Never treat “open count” as a conversion metric by itself.

## 7.3 Public share page

### Trust block

- Issuer
- Proposal/issue title
- Revision
- Prepared date
- Valid through
- Recipient
- Currency and tax basis
- Included sheets
- Assumptions
- Exclusions

### Response block

- Explain whether approval is an acknowledgment, proposal acceptance, or non-binding review response.
- Show the exact target: proposal, estimate, or row.
- Show the snapshot/version being accepted.
- Give the recipient a record of their submitted response.

---

## 8. Data-model additions

Add typed columns or first-class related records for:

### Projects

- `project_type`
- `gross_floor_area`
- `gross_floor_area_unit`
- `project_phase`
- `market_region`
- `target_budget`
- `budget_basis_date`
- `procurement_status`

### Estimates / estimate versions

- `estimate_purpose`
- `issue_status`
- `revision_code`
- `valid_until`
- `pricing_basis_date`
- `tax_basis`
- `assumptions`
- `exclusions`
- `prepared_by`
- `baseline_version_id`

### Publications

- public issue title;
- public revision code;
- validity date;
- issuer profile snapshot;
- assumptions/exclusions snapshot;
- decision-effect text;
- supersedes/superseded-by reference;
- snapshot-versioned analytics rollup.

Do not rely on mutable live project fields for an already-published proposal. All recipient-facing identity and basis fields should be captured in the publication snapshot.

---

## 9. Release gate definition

External Beta is **GO** only when all of the following are true:

### Engineering

- Active required CI is green.
- Cloudflare build and staging deploy are green.
- Golden-path E2E is green.
- Hosted post-deploy smoke is green.
- No known P0 security, authorization, calculation, or data-loss defect exists.
- Migration parity is verified.

### Data

- Hosted D1 restore rehearsal is green.
- Screen/share/XLSX totals match golden fixtures.
- Publication snapshots are versioned and stale state is visible.
- Price provenance and freshness gaps are visible before sharing.

### Product

- Zero-project and zero-estimate users have clear next actions.
- A new user can create the first valid estimate without support.
- Estimate Health identifies actionable risk.
- Publisher identifies recipient state and next action.
- Public proposal identifies the exact issue under review.

### Operations

- Support channel is tested.
- Feedback triage has an owner and status.
- Incident and rollback procedures have been rehearsed.
- Admin shows real cohort and release metrics.
- Release truth manifest is current.

### Legal and privacy

- Beta Terms and Privacy Notice are approved for the intended limited cohort.
- Telemetry definitions and retention are approved.
- Wider/public/paid launch remains blocked pending qualified counsel review.

---

## 10. Beta operating model

Use a small, founder-led design-partner cohort. The objective is not raw signup volume. The objective is to prove:

1. a professional can build a credible estimate;
2. the health layer finds useful mistakes;
3. an exported/shared output is trusted;
4. a recipient can understand and respond;
5. the owner can see the response and act;
6. the system can recover when something fails.

### Weekly Beta review inputs

- activation funnel;
- incomplete onboarding sessions;
- estimate-health warnings generated and resolved;
- export and publication success/failure;
- recipient view and decision funnel;
- feedback by severity;
- support aging;
- error clusters;
- incident status;
- top workflow abandonment points;
- release smoke and restore-proof freshness.

### Severity model

- **P0:** security breach, cross-workspace access, data loss, incorrect total, unrecoverable publication, broken login for cohort
- **P1:** blocked core workflow, export mismatch, recipient cannot respond, persistent save failure
- **P2:** degraded workflow with workaround, misleading analytics, accessibility issue on supported path
- **P3:** polish, copy, non-critical layout, enhancement

---

## 11. What not to build before Beta

Do not dilute the release with:

- AI copilot;
- natural-language estimate generation;
- billing;
- enterprise portfolio features;
- full mobile editing;
- advanced predictive benchmarking;
- immutable legal contract workflows;
- broad marketplace or supplier transaction systems.

The Beta value proposition is already sufficient:

> Build a structured professional estimate, identify its risks, issue a clear client review, and know what happened next.

That loop must become reliable before the roadmap expands.

---

## 12. Final recommendation

**Do not launch an unsupervised external Beta from the current `main` state.**

Proceed in this order:

1. restore release safety and hosted recovery proof;
2. fix first-user activation;
3. ship Estimate Health with drill-through;
4. ship Publisher funnel and recipient follow-up;
5. strengthen proposal issue identity;
6. begin a tightly managed design-partner Beta.

ArchEstimator already has enough core product to succeed. The next milestone is not “more features.” It is turning the existing capabilities into a coherent, observable, recoverable professional workflow.

---

## Appendix A — Key evidence locations

### Release and testing

- `.github/workflows-disabled/ci.yml`
- `package.json`
- `playwright.config.ts`
- `e2e/auth.spec.ts`
- `e2e/shared-link-receiver.spec.ts`
- `scripts/check-cloudflare-release-gates.ts`
- `scripts/generate-cloudflare-d1-restore-rehearsal.ts`
- `next.config.ts`

### Estimate workspace and analytics

- `src/app/workshop/projects/[projectId]/data/page.tsx`
- `src/lib/repositories/project-data-repository.ts`
- `src/components/workshop/project-data/ProjectDataClient.tsx`
- `src/components/workshop/project-data/CostComparisonBoard.tsx`
- `src/components/workshop/project-data/EstimateColumn.tsx`
- `src/components/workshop/EstimateWorkspaceClient.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/lib/estimates/types.ts`

### Projects and onboarding

- `src/app/workshop/page.tsx`
- `src/components/workshop/WorkshopHomebaseClient.tsx`
- `src/app/workshop/projects/page.tsx`
- `src/components/workshop/projects-page-client.tsx`
- `src/components/workshop/NewProjectForm.tsx`
- `src/components/workshop/NewProjectFormSections.tsx`
- `src/components/workshop/ProjectDashboardClient.tsx`

### Publication and sharing

- `src/app/share/[token]/page.tsx`
- `src/lib/publication/types.ts`
- `src/lib/publication/public-repository.ts`
- `src/lib/publication/security.ts`
- `src/components/share/SharePageProposalHeader.tsx`
- `src/components/share/SharePageSummaryCard.tsx`
- `src/components/share/ShareReviewWorkspace.tsx`
- `src/components/share/SharePageComments.tsx`
- `src/components/share/SharePageDecision.tsx`
- `src/app/workshop/publisher/page.tsx`
- `src/lib/publisher/roster-repository.ts`
- `src/components/workshop/publisher/PublisherRosterClient.tsx`
- `src/components/workshop/publisher/PublisherRosterRow.tsx`
- `src/components/workshop/publisher/PublisherDrawer.tsx`
- `src/components/share/SharedLinkActivityFeed.tsx`

### Security, legal, support, and operations

- `src/lib/auth/better-auth-cloudflare.ts`
- `src/lib/authz/d1-access.ts`
- `src/app/terms/page.tsx`
- `src/app/privacy/page.tsx`
- `src/lib/legal/terms-content.ts`
- `src/components/workshop/BetaFeedbackForm.tsx`
- `src/lib/workshop/beta-feedback-actions.ts`
- `src/app/admin/page.tsx`
- `src/app/admin/support/page.tsx`
- `src/components/admin/AdminSupportInbox.tsx`
- `src/app/admin/analytics/page.tsx`
- `src/app/admin/observability/page.tsx`
- `worker.ts`
- `wrangler.jsonc`

### Documentation truth

- `README.md`
- `AGENTS.md`
- `.ai/01_roadmap/README.md`
- `.ai/10_state/current-state.md`
- dated plan packs under `.ai/03_plans/`
- archived evidence under `.ai/09_archive/`


----------------

## Executive verdict

I completed a comprehensive **source-level audit of the current `main` branch**, covering the estimate workspace, projects, library, exports, publications, shared review, analytics, authentication, authorization, D1/R2/Workers infrastructure, testing, observability, support, legal surfaces, and release tooling. I could inspect the private repository through GitHub, but I could not clone and execute it locally in this session, so hosted behavior still requires the release proofs below.

**ArchEstimator is ready for a founder-led internal alpha. It is not ready for an unsupervised external pre-release Beta today.** The estimating engine is already strong. The real gaps are release safety, first-user activation, estimate intelligence, recipient analytics, and provider-backed recovery.

| Area                          |            Readiness |
| ----------------------------- | -------------------: |
| Core estimating               |         **8.0 / 10** |
| Library and templates         |         **7.5 / 10** |
| Public proposal review        |         **7.0 / 10** |
| Security and authorization    |         **7.5 / 10** |
| Estimate analytics            |         **3.5 / 10** |
| Publisher analytics           |         **4.0 / 10** |
| First-user activation         |         **3.5 / 10** |
| Backup and recovery           |         **5.0 / 10** |
| Release automation            |         **2.5 / 10** |
| **External Beta readiness**   | **5.5 / 10 — No-go** |
| **Internal supervised pilot** |    **8.0 / 10 — Go** |

## 1. What is already strong

The **estimate editor is not the main problem**. It already has optimistic updates, saving and failure states, offline handling, revision-conflict recovery, activity history, restore actions, templates, filters, tabs, and export preview. Empty estimates also provide direct actions to add an area or browse templates.

The **public shared proposal is also real**, not a placeholder. It presents the proposal total and metadata, estimate navigation, contextual comments, proposal/estimate/row-level responses, secure recipient sessions, approve/revise/decline actions, stale-snapshot conflict handling, and a mobile navigation bar.

Security has advanced materially: implicit OAuth linking is disabled, magic-link tokens are hashed and short-lived, D1-backed rate limiting is used, and public telemetry distinguishes bots while storing keyed hashes rather than raw request identifiers.

The architectural imbalance is the key issue: **engineering infrastructure and planning are ahead of product activation and decision support**.

## 2. External-Beta blockers

### P0-1 — Restore active CI

The strongest blocker is straightforward: GitHub Actions were deliberately moved to `.github/workflows-disabled`, so repository checks are not automatically enforced. The README still states that CI runs on pushes and pull requests.

This is especially risky because the Cloudflare build path permits TypeScript build errors, relying on a separate type-check as the compensating control. That control is not safe when CI is optional.

Required gate:

* Frozen dependency install
* TypeScript and lint
* Unit, DOM, repository, migration, authz, and security tests
* Design and error-handling enforcement
* OpenNext/Cloudflare build
* Critical Playwright flow
* Dependency and secret scanning
* Staging/post-deployment smoke
* Required protected status checks before deployment

### P0-2 — Rebuild the product-level E2E suite

The current Playwright default covers only Desktop Chromium; the cross-browser and mobile matrix is environment-gated. During the Cloudflare migration, many critical E2E specs covering estimate interactions, Publisher, collaboration, and library workflows were removed.

The shared-link suite is skipped by default and requires manually prepared publications and recipient tokens. Its comments still describe nightly CI execution, which does not currently exist.

One deterministic staging test must cover:

**Sign in → zero state → project → estimate → area/component → edit/save/reload → health review → export → publish → recipient open/comment/decision → owner follow-up.**

### P0-3 — Prove hosted D1 recovery

The repository’s restore rehearsal is thoughtful, but it explicitly identifies itself as local-only and not provider-backed. It proves SQLite fixture export/import mechanics—not recovery of the actual hosted system.

Before real client data enters Beta:

1. Export hosted staging D1.
2. Restore it to a disposable D1 database.
3. Verify migration state, row counts, checksums, and referential integrity.
4. Verify workspace isolation and authorization denials.
5. attach a disposable Worker and run critical routes.
6. Record recovery steps and rollback evidence.

### P0-4 — Fix first-user activation

A true zero-project account on the default “All” view does not receive the same useful empty-state handling as search and status filters. The collection can simply render no cards and no guided next action.

The project form successfully creates a project and default estimate, but it provides no choice between a sample, template, or blank workflow.

The zero state should provide:

* **Start with guided sample**
* **Start from template**
* **Create blank**

Then use a reopenable checklist:

**Project details → area → component/template → quantity and price → health review → export → share.**

### P0-5 — Establish output parity

ArchEstimator must have golden fixtures proving that:

* editor total;
* Data-page total;
* shared snapshot total;
* export-preview total; and
* native XLSX total

all agree for adjustments, contingencies, tabs, currencies, and excluded scope.

Existing workbook evidence verifies structure and ExcelJS readability, but commit evidence still records missing native Excel/Numbers/LibreOffice recalculation and print proof.

### P0-6 — Close the operating contract

The in-app support inbox and Beta feedback system are meaningful strengths. The Admin overview, however, still presents stub metrics, a hard-coded chart, pending infrastructure health, and an unwired incident strip.

Before Beta, define:

* issue severity;
* owner;
* response target;
* escalation;
* rollback;
* customer communication;
* feedback status and release linkage.

The legal documents are suitable for a limited owner-controlled Beta posture, but their own status remains “owner approved pending counsel review.”

## 3. The main missing product surfaces

### A. Estimate Intelligence

Your concern is correct. The current Data page is primarily **cost-composition visualization**:

* baseline plus two comparison sheets;
* grouping by category, supplier, or space;
* total and line count;
* donut and bucket breakdowns.

It does not yet answer:

* Is this estimate complete?
* What is stale or unverified?
* What changed?
* What is over budget?
* Which rows drive the total?
* What must be corrected before sharing?

The data model already contains pricing source/date, confidence, category, supplier, version/link state, scope status, labor cost, quantities, and adjustments, so much of this can be delivered without redesigning the estimating engine.

#### Recommended UI

**KPI strip**

* Total
* Budget variance
* Pricing completeness
* Stale pricing
* Unpriced rows
* Incomplete scope
* Cost/m² when floor area exists

**Estimate Health**

* Missing cost/source/date
* Low confidence
* Stale rates
* Blank quantities/units/descriptions
* Detached or source-changed components
* Budget risk
* Supplier concentration
* Calculation anomalies

**Decision panels**

* Top cost drivers and Pareto
* Category/space/supplier composition
* Baseline or revision delta
* Added/removed rows
* Quantity and rate changes
* Risk/data-quality table

The critical design principle: **every metric and warning must drill directly into the affected estimate rows with a remediation action.**

Add typed project fields for project type, gross floor area, area unit, phase, market, target budget, and budget basis date. Do not keep core analytics inputs buried in generic metadata.

### B. Publisher and shared-link analytics

Publisher currently presents status, recipient and open counts, comments, decisions, included sheets, security settings, and raw activity.

The underlying repository tracks useful stages such as page visit, password gate, unlock, proposal view, recipient session, bots, device type, comments, and decisions.

What is missing is synthesis into a client-management workflow.

#### Required Publisher funnel

**Generated → Invited → Delivered → Viewed → Engaged → Commented → Decided**

#### Required recipient matrix

| Recipient | Delivery | First view | Last view | Views | Comments | Decision | Follow-up |
| --------- | -------- | ---------- | --------- | ----: | -------: | -------- | --------- |

Separate:

* unique viewers from total opens;
* verified recipients from anonymous traffic;
* real users from bots;
* current snapshot activity from previous revisions.

Add owner-facing action states:

* Not viewed
* Viewed, no response
* Revision requested
* Unresolved comments
* Snapshot stale
* Link expiring
* Delivery failed
* Decision complete

Then provide direct actions: resend, remind, reply, open commented row, republish, revoke, or mark follow-up complete.

### C. Public proposal trust and identity

The public page is usable, but its header remains generic: “Proposal Review,” project identity, and “Awaiting your review.”

For Beta, it needs:

* proposal title;
* issue/revision;
* snapshot version;
* prepared date;
* validity period;
* issuer and contact;
* included sheets;
* assumptions;
* exclusions;
* tax and currency basis;
* pricing basis date;
* clear explanation of what approval means;
* superseded/updated status.

This should remain a **working proposal review**, not be represented as an immutable legal contract until the issued-record policy and legal review are complete.

## 4. Recommended execution order

### Slice A — Release integrity

Active CI, protected checks, deterministic fixtures, hosted smoke, golden-path E2E, output parity, canonical release manifest, and provider-backed restore.

### Slice B — Activation

Zero-state redesign, sample/template/blank paths, first-estimate checklist, activation events, and a real Beta cohort dashboard.

### Slice C — Estimate trust

KPI strip, deterministic health rules, risk table, drill-through, budget variance, top drivers, and revision comparison.

### Slice D — Client handoff

Proposal issue identity, Publisher funnel, recipient matrix, unresolved-comment workflow, reminders, republishing, and snapshot-versioned analytics.

Do **not** delay Beta for AI, billing, enterprise portfolio features, predictive benchmarking, or full mobile estimate editing. The product promise for Beta should be:

> **Build a structured professional estimate, identify its risks, issue a clear client review, and know what happened next.**

The complete audit—including the evidence map, P0/P1/P2 backlog, acceptance criteria, proposed analytics information architecture, data-model additions, golden path, and go/no-go definition—is here:

[Download the full ArchEstimator Beta Readiness Audit](sandbox:/mnt/data/archestimator_beta_readiness_audit_2026-07-10.md)

**Recommendation: keep external Beta closed until Slice A is fully green; then launch a tightly managed design-partner cohort while Slices B–D ship in that order.**
