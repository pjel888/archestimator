# 14 — Quality, Release, and Operations

## 1. Evidence boundary and test authorization

This planning task did not:

- run tests;
- build;
- start a dev server;
- use browser automation;
- inspect hosted Admin;
- mutate D1/provider state;
- verify provider APIs.

This pack does not authorize tests, builds-as-gates, browser automation, screenshots, Storybook, or broad QA. Criteria default to `NOT_REQUIRED` and use the cheapest decisive non-test evidence. If source/static/runtime evidence cannot prove a named critical invariant, record a `TEST_PROPOSAL` with that risk and one exact narrow command; only an explicit current-task user request may promote it to `TEST_TASK` and authorize execution.

## 2. Quality strategy

Use three evidence layers:

1. domain contracts and state transitions;
2. route/action authorization, schema, query, and integration boundaries;
3. one end-to-end founder acceptance journey, proved statically or manually unless the user explicitly requests automation.

Avoid broad test expansion for every dashboard card.

## 3. Highest-risk invariants

### Identity

- canonical auth/profile semantics;
- no missing users;
- no fake activity;
- last founder/admin protected.

### Action Inbox

- stable dedupe;
- source reconciliation;
- snooze;
- no duplicated source mutation;
- no lost urgent item.

### Customer 360

- cross-workspace authorization;
- event source semantics;
- no hidden sensitive fields;
- health reasons deterministic.

### Support/signals

- customer reply and internal note isolated;
- idempotent messages;
- waiting/unread state;
- duplicate/theme correctness.

### Release

- absent evidence never passes;
- production decision durable;
- exact commit/release;
- rollback reference.

### Repair

- preview/apply parity;
- bounded rows;
- idempotency;
- audit;
- postcondition;
- no stale overwrite.

### Communications

- audience eligibility;
- recipient count;
- preferences/consent;
- duplicate publish;
- honest delivery status.

## 4. Evidence proportionality

### Pure/domain evidence

Use rule tables, typed contracts, invariants, and transition reviews for:

- activation stage;
- health reasons;
- action derivation;
- dedupe;
- priority;
- metric definition;
- data checks;
- repair preview;
- release check state.

### Repository and integration evidence

Use schema/constraint/index inspection, query plans, call-site review, dry-runs, and affected-row postconditions for:

- search binding/order;
- pagination;
- D1 uniqueness;
- action state;
- notes;
- signal annotations;
- release records;
- findings/repairs.

### Component and interaction evidence

Use component source, semantic DOM/state inventory, action wiring, and responsive CSS review for:

- command palette;
- triage keyboard actions;
- context drawer;
- internal/public composer distinction;
- degraded states;
- confirmations.

### Browser boundary

Browser automation is optional and user-gated. If authorized, use one founder journey after several slices rather than one suite per widget.

## 5. Founder acceptance journey

The final release receipt traces this journey. Automation remains optional and user-gated:

1. founder enters `/admin`;
2. sees urgent action;
3. searches a user;
4. opens User 360;
5. reviews support and product activity;
6. adds follow-up;
7. follow-up appears in Action Inbox;
8. triages feedback as duplicate/theme;
9. opens current release and blocker;
10. resolves data-quality finding through previewed repair;
11. returns Home with updated state.

Denial branches:

- non-admin denied;
- stale revision rejected;
- self/last-founder destructive action denied;
- internal note never sent to user;
- unknown repair key rejected;
- hidden entity search result absent.

## 6. Performance budgets

### Home

- urgent/action summary begins rendering first;
- independent panels parallel;
- no provider fetch blocks first render;
- bounded queries;
- no full event table scans.

### Search

- exact ID/email path fast;
- debounce/cancel;
- bounded results;
- index-supported prefix;
- detail lazy.

### Entity 360

- summary first;
- tabs lazy;
- timelines cursor-paginated;
- no unbounded memberships/projects/events.

### Operations

- aggregated snapshots;
- provider cached;
- raw logs external.

Numeric budgets should be ratified from current performance roadmap and measured environment rather than duplicated here.

## 7. Security evidence

Required review surfaces:

- route/layout/API/action denial matrix;
- exact capability;
- fresh-auth flows;
- last-admin/founder floor;
- CSRF/origin for route writes;
- no-store/private headers;
- search no leakage;
- audit redaction;
- repair command allowlist;
- AI read-only tools;
- prompt-injection fixtures.

## 8. Data-quality verification

For each check:

- clean fixture;
- violating fixture;
- repeated run/upsert;
- resolved/reopened;
- deletion/retention;
- source revision.

For each repair:

- dry run;
- apply;
- repeated apply;
- partial failure;
- stale finding;
- postcondition.

## 9. Metric verification

For each founder metric:

- definition version;
- numerator;
- denominator;
- identity/dedupe;
- window;
- bot/admin filtering;
- missing source;
- cutoff;
- late event behavior.

Golden fixture should cover a few representative users/accounts, not enormous synthetic infrastructure.

## 10. Accessibility evidence

Source/static review covers:

- keyboard navigation;
- focus order/restoration;
- screen-reader labels;
- status not color-only;
- zoom;
- sticky header focus;
- dialog/drawer;
- dynamic update announcements;
- chart equivalents;
- mobile triage.

## 11. Release stages

### Internal source alpha

- founder only;
- local/current D1;
- no provider writes;
- Home/search/action inbox.

### Founder dogfood

- real operational data;
- real notes/follow-ups;
- read-only release/operations links;
- safe support/feedback.

### Controlled production

- high-risk action hardening;
- data-quality dry-run;
- release records;
- truthful hosted health;
- support action queue.

### Expanded operations

- provider snapshots;
- safe repairs;
- targeted communications;
- cost/capacity.

## 12. Feature rollout

Use existing/new flag registry only for:

- high-risk alternate path;
- staged cohort;
- emergency kill switch.

Do not flag every UI component.

Admin shell/search/home can roll out founder-only directly after verification.

## 13. Rollback

### Read-only features

Revert route/component.

### Action Inbox

Founder state table is additive. Disable derivation source or route; source domains remain.

### Notes/pins

Additive and reversible.

### Release/data-quality

Disable commands, retain records.

### Domain mutations

Existing domain rollback/fix-forward policy applies.

No migration drops in early phases.

## 14. Incident response for Admin defects

Examples:

- cross-tenant data shown;
- dangerous action affects wrong user;
- repair changes unexpected rows;
- Home hides urgent source item;
- notification sends wrong audience.

Response:

1. disable affected action/surface;
2. preserve audit/logs;
3. stop job/queue if needed;
4. identify affected records;
5. revert/fix-forward;
6. verify postcondition;
7. communicate;
8. create incident/postmortem.

## 15. Operational ownership

As one founder:

- the UI may display “Owner: Philip” implicitly;
- code still stores actor/owner where material;
- no rota builder;
- no team workload dashboard required;
- reminders and weekly review prevent forgotten work.

## 16. Validation selection

Select the narrowest command only when it is an authorized evidence class for the current execution task. Type/static/lint/dry-run checks remain proportional. Tests, builds used as test gates, browser automation, and broad validation require explicit current-task user authorization; this document intentionally records no standing test command.

## 17. Completion evidence

Final release report includes:

- founder jobs proven;
- route/slice;
- data sources;
- mutations and safeguards;
- tests actually authorized/run;
- hosted proof actually collected;
- degraded/provider gaps;
- remaining deferred features;
- current state update.

## 18. Release blockers

- cross-workspace leakage;
- fake/ambiguous metric;
- lost action item;
- last-founder lockout;
- internal note leak;
- wrong communication audience;
- repair without preview/affected proof;
- release shown safe from missing evidence;
- provider status misrepresented;
- unresolved P0 identity/action defect.
