# 15 — Risks, Decisions, and Non-Goals

## 1. Risk register

| ID | Risk | Severity | Mitigation |
|---|---|---:|---|
| RISK-001 | Home becomes card clutter | P1 | action-first hierarchy, approved modules, remove non-actionable widgets |
| RISK-002 | Action projection diverges from source | P0 | stable source refs, reconciliation, derived content, persist only founder state |
| RISK-003 | Urgent item hidden by dedupe/snooze | P0 | priority escalation reopens, source revision, critical cannot be silently dismissed |
| RISK-004 | Search leaks cross-workspace data | P0 | server policy per result, bounded DTO, denial-path review |
| RISK-005 | User health becomes opaque/manipulative | P1 | rule-based reason codes, no AI-only score |
| RISK-006 | Admin becomes second CRM | P1 | operational notes/follow-ups only; no sales pipeline |
| RISK-007 | Admin becomes second task manager | P1 | source obligations and linked follow-ups only |
| RISK-008 | Support internal note sent to customer | P0 | separate components/actions/repositories |
| RISK-009 | Feedback themes become AI fiction | P1 | AI suggests, founder confirms, source signals visible |
| RISK-010 | Entity 360 query becomes slow/unbounded | P1 | summary first, lazy tabs, cursors, indexes |
| RISK-011 | Release shown ready from absent proof | P0 | `not_evaluated`, evidence state, explicit waiver |
| RISK-012 | Provider configuration treated as health | P0 | evidence-level labels |
| RISK-013 | Repair command corrupts data | P0 | allowlist, dry-run, max rows, fresh auth, idempotency, postcondition |
| RISK-014 | Feature flags accumulate | P1 | owner/review/expiry/consumer/action items |
| RISK-015 | Cost data inaccurate | P1 | source status and as-of; no fake precision |
| RISK-016 | Metric definition changes silently | P1 | version definitions/snapshots |
| RISK-017 | Advanced campaigns delay homebase | P1 | reprioritized phases and MVP boundary |
| RISK-018 | Too many new tables at once | P1 | vertical-slice migrations only |
| RISK-019 | Admin duplicates Cloudflare/Sentry/analytics | P1 | summary + deep links, not raw backend |
| RISK-020 | Solo optimization prevents future admins | P2 | capability/actor fields retained without role-builder UI |
| RISK-021 | Founder notes exposed in export/customer UI | P0 | admin-only table/DTO and authorization |
| RISK-022 | AI prompt injection triggers action | P0 | read-only tools, untrusted data boundary, human confirmation |
| RISK-023 | AI leaks private context | P0 | approved DTOs, provider policy, redaction, scoped retrieval |
| RISK-024 | Weekly review becomes busywork | P2 | generated snapshot, decisions only, no compulsory prose |
| RISK-025 | Fragmented tools remain forever | P1 | staged migration with named end state |
| RISK-026 | Migration of tool creates two mutation owners | P0 | one owner at each stage, redirect and removal |
| RISK-027 | Mobile controls enable accidental mutation | P1 | triage-first; dangerous operations desktop/fresh-auth |
| RISK-028 | Action priorities create alert fatigue | P1 | simple actionable rules, review precision/noise |
| RISK-029 | Provider API costs exceed free posture | P1 | link-out first, approved collectors, budget |
| RISK-030 | Audit/event tables grow without retention | P1 | retention/aggregation/cleanup policy |
| RISK-031 | Cross-pack consolidation produces two ledgers | P1 | closed by one canonical implementation plan, ledger, and manifest; predecessor archived |
| RISK-032 | Plan becomes another exhaustive blocker | P1 | deliver vertical founder slices, conditional later phases |
| RISK-033 | Financial metrics use inconsistent definitions | P0 | provider-linked definitions, version MRR/churn/active-subscriber semantics, separate cash from revenue |
| RISK-034 | Billing webhook success is mistaken for reconciled state | P0 | event-delivery health, idempotency, periodic source reconciliation, explicit lag/cutoff |
| RISK-035 | Traffic attribution violates privacy or overstates certainty | P0 | aggregate first, consent-compatible joins, bounded retention, label probabilistic attribution |
| RISK-036 | Raw logs/provider payloads leak secrets or PII | P0 | provider-native storage, allowlisted summaries, redaction, sensitive-read audit, retention |
| RISK-037 | Provider adapter failure silently freezes founder metrics | P0 | source-as-of, last success/failure, lag, stale state, actionable reconciliation |
| RISK-038 | Privacy requests are missed | P0 | durable owner/status/due date, Action Inbox escalation, canonical export/delete workflow |

## 2. Decisions to preserve from the predecessor

| ID | Decision |
|---|---|
| DEC-AUTO-001 | Better Auth user is the canonical identity; profile is an app projection. |
| DEC-AUTO-002 | Signup, profile provision, login, authenticated use, product activity, and online presence remain distinct facts. |
| DEC-AUTO-003 | High-impact actions require exact server capability, protected-founder floor, fresh auth, reason, revision/affected-row proof, idempotency, audit, and recovery. |
| DEC-AUTO-004 | Queue/Cron dispatch work; D1 state and idempotency remain authoritative. |
| DEC-AUTO-005 | No arbitrary SQL, raw credential/token/IP/user-agent exposure, or unrestricted provider payloads in Admin. |
| DEC-AUTO-006 | Provider and production claims require source-matched provider evidence; local evidence never substitutes. |
| DEC-AUTO-007 | Notification definition/version, audience, occurrence, run, recipient, retry, retraction, replacement, preference, and denominator semantics remain durable even when delivery is phased. |
| DEC-AUTO-008 | Existing domain repositories remain the sole mutation owners; Admin composes reads and founder workflow state. |
| DEC-AUTO-009 | No billing provider is assumed. Financial visibility and provider-integration readiness are in scope now; provider-specific billing mutations, accounting, tax, and revenue recognition wait for a selected system. |
| DEC-AUTO-010 | Tests, builds-as-gates, browser automation, and broad QA remain user-gated and claim-specific. |

## 3. Consolidated product decisions

| ID | Decision |
|---|---|
| DEC-AUTO-011 | Home is an obligation system, not a decorative metric gallery. |
| DEC-AUTO-012 | Global search and the Action Inbox are P0. |
| DEC-AUTO-013 | Customer success and broader Entity 360 are explicit product surfaces. |
| DEC-AUTO-014 | Release readiness, data quality, and safe repair are founder products, not only implementation gates. |
| DEC-AUTO-015 | Cost/capacity and founder cadence are P1 operating surfaces. |
| DEC-AUTO-016 | One-time targeted outreach precedes recurring campaigns and generalized dispatch scale. |
| DEC-AUTO-017 | AI is source-cited and read-only first; it never bypasses human confirmation. |
| DEC-AUTO-018 | The Admin shell is full-width, grouped by founder job, and preserves existing routes during migration. |
| DEC-AUTO-019 | Existing workshop tools are linked first, then migrated without two mutation owners. |
| DEC-AUTO-020 | New schema is added only by an activated vertical slice; generic workflow/CRM/dashboard abstractions are rejected. |

## 4. Recommended owner defaults

| Decision | Default |
|---|---|
| Home route | Today |
| Action owner | Philip |
| Timezone | Asia/Manila display, UTC stored |
| Urgent customer response target | 1 working day; critical 4 working hours |
| Follow-up default snooze | next working day |
| Health model | status + reason codes, no numeric score |
| Search retention | no raw query audit unless sensitive; aggregate usage only |
| Recents | local first |
| Pins/notes/follow-ups | durable D1 |
| Release execution | external/provider link first |
| Repair apply | founder fresh-auth, dry-run required |
| AI actions | drafts/read-only |
| Notification MVP | one-time, targeted, previewed |
| Campaign recurrence | later |
| Billing metrics | not instrumented |
| Financial readiness | define unavailable states, mappings, metric definitions, integration health, and reconciliation before provider activation |
| Traffic analytics | aggregate first; first-party product events own conversion; no invented UTM/custom-event capability |
| Provider API | link-out until approved credentials/benefit |

## 5. Explicit non-goals

### Not a database console

No SQL editor, table browser with arbitrary writes, or raw secret display.

### Not a project manager

No sprint planning, dependency management, or team task system.

### Not a CRM

No sales pipeline, deal stages, quote/invoice system.

### Not an observability backend

No raw log warehouse, trace UI, or provider replacement.

### Not an incident paging vendor

No on-call schedules/escalation service in MVP.

### Not a marketing automation suite

No complex visual workflows or multichannel journey builder.

### Not a billing platform

Admin summarizes provider-owned customer/subscription/invoice/payment state after selection; it does not become the payment, invoicing, tax, or accounting system.

### Not an autonomous operations agent

No unsupervised mutations.

### Not a generic dashboard builder

Approved modules and saved filters only.

## 6. Scope escalation triggers

Create a separate plan only when:

- payment acceptance, tax, accounting, or revenue-recognition implementation beyond the Admin read-adapter boundary;
- external customer accounts/admin needed;
- multiple support/admin operators;
- recurring campaign demand proven;
- provider deployment execution from Admin;
- custom status page;
- experiment platform;
- data warehouse;
- autonomous low-risk AI actions;
- multi-account Cloudflare operations.

## 7. Stop conditions

Stop adding Founder Homebase scope when:

- daily triage is complete;
- core entities are searchable;
- customer obligations are contextual;
- production/release/data integrity are visible;
- follow-ups durable;
- founder scorecard and weekly review work;
- traffic/acquisition and financial readiness are truthful, source-linked, and reconciliation-aware;
- next unmet need is advanced scale, not missing daily operation.

## 8. Consolidation decisions the final merger must make

1. Rename existing target from “operator control plane” to “Founder Homebase and Admin Control Plane.”
2. Reorder notification units after founder core.
3. Add new Home/Search/Action/Release/Data Quality/Customer Success slices.
4. Expand User 360 into entity 360.
5. Merge Support with Signals, not tables.
6. Keep one implementation plan and ledger.
7. Keep existing deep notification docs as P2 reference.
8. Replace generic “Overview attention queue” with the explicit action-item contract.
