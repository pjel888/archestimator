# 10 — Analytics, Business Scorecard, and Founder Cadence

## 1. Objective

Turn activity data into a small set of decisions.

The current Analytics route is a provider link page, while Home now has a narrow aggregate-only beta operating layer. Neither surface yet provides a canonical acquisition funnel, financial-readiness contract, or provider integration-health view.

## 2. Metric hierarchy

### Level 1 — Company outcomes

- activated users/accounts;
- retained activated users/accounts;
- successful proposals/publications;
- recipient engagement and decisions;
- active design partners;
- customer blockers;
- operating cost and capacity;
- acquisition traffic and qualified signup conversion;
- commercial/financial outcomes when a real source exists.

### Level 2 — Funnel

- access/invitation;
- signup;
- profile;
- onboarding;
- workspace;
- project;
- estimate;
- structured row/component;
- export/proposal;
- publication/share;
- recipient open;
- comment;
- decision;
- retained use.

### Level 3 — Feature/product health

- estimate editing;
- component reuse;
- charts/data;
- proposal export;
- publication/client review;
- collaboration;
- activity/history;
- uploads;
- AI.

### Level 4 — Diagnostics

- route/action events;
- errors;
- latency;
- job/delivery states.

Home shows Level 1 and actionable Level 2 changes. Deeper levels stay in analytics routes.

## 3. Canonical metric contract

```ts
type AdminMetricDefinition = {
  key: string;
  name: string;
  description: string;
  sourceEvents: string[];
  subject: "visitor" | "user" | "account" | "workspace" | "project" | "estimate" | "publication" | "recipient" | "billing_customer" | "subscription" | "invoice";
  numerator: string;
  denominator: string | null;
  window: string;
  identityRule: string;
  dedupeRule: string;
  freshnessSla: string;
  owner: string;
  status: "defined" | "partial" | "not_instrumented" | "retired";
};
```

A metric card links to its definition.

## 4. Activation

Recommended first-user activation:

A user/account is activated when it completes a meaningful estimating outcome, not merely login.

Candidate definition:

```text
Onboarding completed
AND project created
AND estimate contains at least one meaningful priced row
AND one output/review action:
  proposal preview/export OR publication/share
```

Track milestone progression separately.

Ratify with real user behavior before using it as a commercial KPI.

## 5. Meaningful activity

Meaningful activity includes:

- project/estimate content mutation;
- component reuse;
- proposal/export;
- publication/republication;
- client review response;
- collaboration action.

Exclude:

- background refresh;
- session renewal;
- page mount alone;
- admin preview;
- bot link preview;
- health checks.

## 6. Retention

For current scale:

- weekly retained activated users;
- weekly retained activated accounts;
- four-week cohort table;
- last meaningful activity;
- reason/status for lost users where known.

Avoid DAU vanity pressure for a professional workflow that may not be daily.

## 7. Proposal/client-review metrics

- estimates exported;
- publications created;
- recipients invited;
- delivered;
- verified opens;
- first view time;
- comments;
- changes requested;
- approvals/declines;
- time to decision;
- revision count;
- stale/no-view follow-up.

This is a core product differentiator and should appear in founder metrics.

## 8. Customer success metrics

- invite-to-signup;
- signup-to-activation time;
- stalled milestone count;
- design-partner health;
- open customer blockers;
- support response/resolution;
- feedback close-loop;
- inactive activated accounts;
- founder follow-ups due.

## 9. Product quality metrics

- error-free critical workflow rate;
- export failure;
- publication write failure;
- upload/scan failure;
- calculation/output parity finding;
- client decision failure;
- unresolved data-quality findings;
- release incident rate.

## 10. Business, acquisition, and financial scorecard

No billing provider or accounting source exists in the current repository. The plan must distinguish **integration readiness** from **financial data availability** instead of excluding the domain.

The founder scorecard includes:

### Customer

- invited users;
- signed-up users;
- activated users;
- retained accounts;
- design partners;
- at-risk/blocked;
- interviews completed;
- active customer follow-ups.

### Product

- meaningful estimates;
- proposals/exports;
- publications;
- recipient engagement;
- decisions;
- component reuse.

### Operations

- open incidents;
- customer blockers;
- data-quality findings;
- release state;
- support backlog;
- cost/capacity.

### Commercial — manual/linked until system exists

- active prospects/design partners;
- paid customers — unavailable until billing;
- MRR, new/expansion/contraction/churned MRR — unavailable until billing;
- active/trialing/past-due/canceled subscriptions — unavailable until billing;
- invoices due/overdue, failed payments, refunds, and disputes — unavailable until billing;
- gross cash collected and net revenue remain distinct;
- founder-entered runway/budget — optional and clearly manual;
- expected infrastructure cost.

Do not fabricate zeros for unavailable financial metrics. Show “Not instrumented.”

### Financial integration contract

When a billing source is selected, Admin consumes a provider-owned read adapter rather than becoming the billing system:

- provider customer ↔ canonical Archestimator account/workspace mapping;
- subscription lifecycle and current entitlement summary;
- invoice/payment/refund/dispute state;
- metric-definition version for MRR, churn, active subscriber, and revenue;
- webhook/event-delivery health, replay, and periodic reconciliation;
- source currency and multi-currency limitation;
- provider/source deep link for every actionable exception;
- no card, bank, secret, or unrestricted raw provider payload stored in Admin.

Revenue recognition, tax, general ledger, invoicing, and payment mutation remain provider/accounting responsibilities.

### Traffic and acquisition contract

The founder needs a privacy-safe path from external interest to product value:

```text
visit → qualified landing session → signup → profile provision → activation → retained professional use → publication/decision
```

Initial traffic dimensions:

- host and landing path;
- referrer host/source category;
- campaign attribution only when the selected source actually provides it;
- country/device/browser at aggregate level;
- Core Web Vitals by landing path;
- bot/admin/health-check exclusions;
- consent/privacy mode and data-retention status.

Cloudflare Web Analytics is suitable for aggregate page/performance truth but does not currently provide custom events or UTM query parameters. Product conversion therefore stays in first-party events, and any cross-source attribution must be explicit, consent-compatible, bounded, and labeled probabilistic when it is not a deterministic join.

## 11. Metric views

### Today

- new action items;
- customer blockers;
- current release/incident;
- signups/activation since checkpoint.

### 7 days

- activated and retained;
- support/feedback;
- publications/decisions;
- releases/errors;
- cost/capacity.

### 30 days

- cohorts;
- funnel conversion;
- feature adoption;
- repeated themes;
- reliability trend;
- infrastructure growth.

### Cohort

- signup week/month;
- activation;
- first publication;
- retention.

## 12. Founder daily cadence

### Start of day

1. Open Today.
2. Review critical/urgent.
3. Review customer promises.
4. Check release/production.
5. Triage new signals.
6. Select top three founder outcomes.

Admin records review checkpoint, not a detailed personal task list.

### Midday

- support/follow-up;
- release/incident changes;
- new blocked users.

### End of day

- resolve/snooze active items;
- set follow-ups;
- record decision/notes;
- leave no unclassified urgent item.

## 13. Weekly review

The Weekly Review route is a guided snapshot.

Sections:

1. **Outcomes**
   - activated/retained;
   - publications/decisions;
   - customer wins.

2. **Customer**
   - blocked/at-risk;
   - support/feedback themes;
   - follow-ups.

3. **Product**
   - shipped changes;
   - feature adoption;
   - product quality.

4. **Operations**
   - incidents;
   - jobs/data quality;
   - cost/capacity;
   - restore/recovery.

5. **Acquisition and Business**
   - traffic and qualified signup movement;
   - activation by available source/cohort;
   - billing exceptions and recurring-revenue movement when connected;
   - manual runway/budget freshness.

6. **Decisions**
   - keep/change/stop;
   - flags to remove;
   - experiments/research;
   - next week focus.

7. **Snapshot**
   - immutable or versioned weekly summary;
   - optional founder notes.

## 14. Monthly review

Later/P1:

- cohort retention;
- activation trend;
- product discovery themes;
- cost forecast;
- reliability;
- commercial progress;
- roadmap decisions.

## 15. Saved analysis

Do not build arbitrary BI.

Support approved analyses:

- funnel;
- cohort;
- retention;
- feature adoption;
- publication conversion;
- customer health;
- support/feedback;
- reliability;
- cost/capacity.

Advanced SQL remains outside Admin.

## 16. Instrumentation backlog

Admin should expose missing instrumentation as explicit work:

- metric key;
- missing event/source;
- affected dashboard;
- priority;
- proposed producer;
- data/privacy review;
- status.

“Not instrumented” becomes a data-quality/product-ops item rather than a fake zero.

## 17. Data aggregation

At current scale, direct indexed queries may suffice.

Introduce daily snapshots only when:

- direct queries become slow;
- historical definitions must be preserved;
- provider data is imported;
- weekly review needs frozen denominators.

Snapshot fields include definition version and source cutoff.

## 18. External analytics

Use external systems for specialized analysis:

- Cloudflare Web Analytics;
- Clarity;
- GA if used;
- future PostHog-like product analysis.

Admin should:

- show configured/connected/readable state separately;
- show integration health, source-as-of, last success, lag, and failure/reconciliation state;
- link to exact report;
- summarize first-party critical metrics;
- never imply link availability equals data quality.

Use provider-native systems for raw logs, traffic exploration, billing operations, and detailed reports. Admin owns the cross-domain summary, mapping state, actionable exceptions, and deep links.

## 19. Metric governance

Every metric has:

- owner;
- definition;
- version;
- first available date;
- data status;
- known gaps;
- retirement.

Changing an activation definition creates a new version. Do not rewrite historical meaning silently.

## 20. MVP boundary

MVP:

- canonical funnel definitions;
- aggregate acquisition/traffic baseline with truthful provider capability limits;
- customer attention metrics;
- 7/30-day scorecard;
- publication/client-review metrics;
- financial-readiness DTO and unavailable states;
- activated-provider integration-health status;
- weekly review route;
- checkpoint and notes;
- “not instrumented” states.

Later:

- external product analytics ingestion;
- experiment statistics;
- custom dashboards;
- provider-specific billing mutations, accounting, tax, and revenue recognition;
- predictive churn.
