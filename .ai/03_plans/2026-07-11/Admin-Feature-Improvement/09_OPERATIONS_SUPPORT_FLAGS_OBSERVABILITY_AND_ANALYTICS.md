# Operations, Support, Flags, Observability, and Analytics

## Overview Attention Queue

The overview prioritizes actionable facts:

- open incidents by severity;
- stalled/failed notification campaigns and scheduler freshness;
- queue/DLQ backlog;
- overdue/unassigned support conversations;
- identity/profile mismatch count;
- admin action failures/reconciliation needs;
- recent signup/activation and active-user metrics with source/as-of labels;
- health checks that exercise real bound capabilities where safe.

Decorative provider links remain secondary. Every tile is independently loadable/failable.

## Support Operations

Build on existing D1 conversation/message and SupportInbox DO contracts:

- assignment/owner;
- priority and SLA target/breach;
- status workflow `open|pending_user|pending_admin|resolved|archived`;
- tags and internal notes separated from user-visible messages;
- canned replies with explicit preview/edit;
- attachment metadata, size/type/scanning/retention policy;
- escalation to incident/security/privacy workflow;
- unread semantics for admin and user;
- idempotent reply and email failure state;
- full user-360 link and redacted timeline event;
- email-to-ticket only after Cloudflare Email Routing/parser/threading/abuse hosted proof.

Transactional support email is not a campaign notification. Campaign audiences cannot ingest support message bodies.

## Feature Configuration

- typed registry with key, type, default, env override, current D1 value, scope, owner, consumer paths, rollout phase, expiry/review date, and kill-switch semantics;
- precedence is explicit and displayed;
- before/after audit with affected consumer list;
- reserved flags show `not implemented` rather than pretending to operate;
- maintenance mode must be enforced at a shared mutation boundary or removed from the primary control surface;
- notification flags: manager read, compose, publish, scheduler, fanout consumer, optional email channel, retraction, and emergency global stop;
- no flag may bypass security/audit invariants.

## Audit and Security Operations

Replace placeholder rows with:

- filters for actor, target, action, outcome, date, request/correlation/campaign;
- safe before/after summaries;
- sensitive-read events;
- account security facts and intervention history;
- retention/hold labels;
- link to incident/campaign/user detail;
- export only under bounded audited capability.

## Observability and Incidents

Admin renders existing operational sources without replacing their owners:

- client errors by class/route/version and bounded user correlation;
- web vitals trends by route/version;
- cron and ops run freshness/failure;
- notification scheduler/run/chunk/queue/DLQ progress;
- support and email delivery failures;
- D1 query/lock/error aggregates;
- incident state/severity/owner/timeline;
- hosted observability/support proof artifact readiness;
- Cloudflare docs/dashboard links as escape hatches, not evidence.

Operational alerts remain separate from product campaigns. A product notification can be an incident communication only after an operator explicitly creates/links the campaign; it does not satisfy alert delivery proof.

## Product Analytics

Prefer first-party D1-derived aggregates with defined event coverage:

- signup -> profile provision -> onboarding -> first workspace/project/estimate;
- activation and retained authenticated/product use;
- collaboration invites/acceptance/active multi-user projects;
- publication/share creation, recipient activity, decisions;
- estimate creation/edit/export/proposal milestones;
- component library and AI feature use with privacy-safe counts;
- support volume/resolution;
- notification materialization/read/dismiss/ack by campaign/cohort.

Every funnel names event sources, missing instrumentation, dedupe rules, identity reconciliation, window, denominator, and freshness. Provider analytics remain link-out until enabled and proved.

## Fragmented Operator Tools

Inventory admin-only workshop settings (closed beta users, feedback review, upload/scan operations, and other platform tools), then apply DEC-AUTO-017 deterministically:

- link from `/admin` by default while the domain remains workshop-owned;
- share an existing component only when two current UIs duplicate the same read-only presentation;
- migrate a route/UI only through a separately recorded owner/redirect/consumer-test decision; this pack does not choose migration during execution;
- mark unavailable/unfinished tools visibly without creating a second mutation path.

Do not maintain two mutation paths for the same operation.

## Completion Criteria

- no placeholder or approximate metric is labeled live truth;
- every visible control has a proven consumer;
- support operations have assignment/SLA/audit/failure semantics;
- notification operational failures are discoverable and reconcilable;
- product analytics have stable event contracts;
- hosted provider/alert/readiness claims use hosted artifacts only.
