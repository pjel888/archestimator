# Admin Information Architecture, UX, and Accessibility

## Experience Model

This is an operational tool, not a marketing dashboard. Use dense, scan-friendly tables, split views, filters, status text, explicit timestamps, and predictable navigation. Avoid decorative cards, oversized headings, and hidden critical state.

## Navigation and Route Evolution

Preserve existing URLs during rollout. The target grouping is:

- **Overview**: attention queue, operating metrics, health, recent signups/activity, scheduled notifications, open incidents/support.
- **Users**: list, saved filters, detail/User 360, interventions.
- **Accounts**: Corporate-owned surfaces.
- **Notifications**: Campaigns, Scheduled, Drafts, Templates, Delivery Issues, Preferences/Policy.
- **Support**: Inbox, assignments, SLA/escalations.
- **Analytics**: product funnels and provider links/reads.
- **Configuration**: feature flags, maintenance, rollout controls.
- **Audit & Security**: admin actions, sensitive reads, security facts.
- **Operations**: incidents, health, cron, queues/DLQ, errors, vitals, hosted proof readiness.

## User List

Server-driven query parameters:

- search, canonical identity/profile mismatch, account status, role, corporate account, workspace, signup window, last-authenticated window, last-product-activity window, onboarding state, support state, notification engagement state;
- cursor pagination with deterministic sort `(selected_field, user_id)`;
- visible source/as-of metadata for derived columns;
- saved views are operator-local or server-owned only after an explicit persistence need.

The table never downloads the entire user set for client filtering. Bulk actions require explicit selection summary, high-risk confirmation, per-target eligibility, and an idempotent batch command.

## User 360 Layout

Header shows display identity, email, canonical/profile reconciliation, platform status, signup, last login, last authenticated, last product activity, online freshness, and active interventions.

Tabs:

1. Summary
2. Access and Memberships
3. Activity
4. Sessions and Security
5. Projects and Estimates
6. Support and Feedback
7. Notifications
8. Admin Interventions

Every tab has loading, empty, unavailable, stale, denied, partial-source, and error states. Partial-source success must not silently look complete.

## Notification Manager Screens

### Campaign List

Columns: status, title, type, audience summary, schedule, owner, last editor, eligible count, materialized count, read rate, failure count, last transition. Filters cover lifecycle, kind, severity, surface/channel, owner, date, audience, and failure state.

### Composer

Use a bounded multi-step editor:

1. Content
2. Delivery surface/channel
3. Audience
4. Schedule/expiry
5. Preview and test
6. Review and publish

Autosave uses optimistic versioning. A persistent validation summary identifies blocking issues. Preview reproduces the real inbox/modal rendering contract without making the campaign visible.

### Campaign Detail

Show immutable version, lifecycle timeline, audience rule/snapshot, intended/eligible/excluded counts, publish runs, chunk/job progress, engagement metrics, failures/retries, audit trail, cancellation/retraction state, and replacement relation.

### Scheduling

- store canonical schedule in UTC plus original IANA time zone and local wall-clock intent;
- render daylight-saving ambiguity/invalid-time warnings;
- scheduled list includes exact next attempt and freshness;
- edit after approval creates a new version and requires re-review;
- cancel and reschedule are explicit state transitions, not field edits.
- one-time and recurring schedules expose rule summary, next occurrence, schedule revision, series state, DST policy, and bounded upcoming occurrences;
- edits create a new schedule revision and require an explicit disposition for pending occurrences;
- cancel/retract controls require an explicit scope: this occurrence, remaining series, or all materialized occurrences where permitted.

### Templates and Preferences

Templates have searchable active/archived lists, immutable version history, allowed-variable schemas, preview, duplicate, archive, and provenance into campaigns; they cannot be sent directly. Admin Preferences/Policy shows defaults, mandatory classes, quiet-hours/digest behavior, and configuration health. End users own their choices at `/settings/notifications`, with accessible channel/kind toggles, time zone, quiet hours, and digest cadence plus disabled/unavailable states.

## Interaction Safety

- destructive or wide-impact actions use named confirmation dialogs with scope/count and reason;
- preview/test-send is visually distinct from publish;
- publishing cannot be triggered by Enter in a text field;
- stale optimistic versions block publication and show the conflicting editor/time;
- high-risk actions require fresh auth where supported;
- success is reported only after durable command acceptance, not after a client click;
- background progress persists across navigation and reload.

## Accessibility Contract

- semantic page landmarks and one clear `h1` per screen;
- active nav uses `aria-current`;
- tables expose header associations, sortable state, selection count, and pagination labels;
- filters have programmatic labels and keyboard order; filter chips have remove names;
- dialogs focus the title, trap focus, restore focus, and close on Escape unless a non-cancellable publish transition is actively committing;
- form errors link summary to fields and use `aria-describedby`;
- async save/publish status uses restrained live regions; progress changes are not announced continuously;
- status never relies on color alone;
- charts have text/table equivalents;
- timelines use ordered lists and semantic `<time>`;
- responsive behavior preserves actions without horizontal page overflow; dense tables may use a controlled horizontal container;
- reduced motion is respected.

## Browser Proof Boundary

No browser automation is required to approve this planning pack. During implementation, use DOM tests for semantics and state logic; use targeted browser proof only for complex responsive composition, keyboard/focus workflows, schedule/preview/publish interactions, or auth/data routing behavior that static/DOM evidence cannot prove.
