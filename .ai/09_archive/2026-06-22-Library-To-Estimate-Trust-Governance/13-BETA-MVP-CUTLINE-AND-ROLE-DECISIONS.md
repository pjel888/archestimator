# Beta MVP Cutline And Role Decisions

This document closes the strategic ambiguity found during the independent
planning audit. The pack has two valid product outcomes: a beta-safe reuse
foundation and a full durable trust-governance layer. They must not be treated
as one undifferentiated release.

## Release Cutline

| Outcome | Included units | May ship when | Must remain blocked until |
| --- | --- | --- | --- |
| Beta reuse foundation | U1, U2, U3, and the U6 states needed by those flows. | Compare-before-replace, source taxonomy, target revalidation, cache scope, and visible recovery states pass QA-001 through QA-007, QA-011 where touched, QA-015 for mutating actions, QA-020 for touched performance claims, and QA-022 if source links render. | It cannot claim durable accepted-cost governance, reviewed attachments, or governance queues. |
| Full governance layer | U4, U5, and U7 evidence/telemetry for all durable trust changes. | DB preflight, migration/RPC design, role decision, private read policy, signed URL policy, evidence privacy, and runtime observability gates pass. | DB preflight is absent, current schema contradicts the proposed migration shape, non-admin curator authority is required but unplanned, or private evidence could leak. |

`Partial` is an internal checkpoint or final work-status label, not a release
claim. A partial implementation may be reported honestly, but it is not
shippable unless it satisfies either the beta reuse foundation gates or the full
governance gates.

The beta reuse foundation is valuable by itself. It prevents silent stale or
foreign-source estimate commits without waiting for supplier self-service,
provider cost ingestion, durable review queues, or attachment approval.

Phase 0 confirms current eligibility for this cutline. It does not reopen DR-1
unless fresh evidence proves the default beta-first path is unsafe or impossible.

## Decision Records

### DR-1: Phase 1 Is The Smallest Beta-Safe Slice

Decision: U1-U3 are the beta MVP. They make cost-bearing estimate commits safer
before durable governance exists.

Rationale: The highest-risk user moment is replacing or inserting a row into an
estimate. Compare-before-replace, sidebar source separation, and scoped cache
revalidation directly protect that moment.

Rejected: Blocking all reuse-safety work behind U4/U5 durable governance. That
would delay the highest-value closed-beta safety fix and force database work to
carry too much product uncertainty.

Consequence: U1-U3 may ship with visible warnings that a cost or attachment
needs review. They may not label any cost as reviewed accepted unless durable
governance has passed its gates.

### DR-2: Durable Governance Defaults To Additive Migration Plus RPC Gates

Decision: If U4 or U5 persists accepted cost, lock state, assignee, reviewer,
approval, supersede, or audit prose, it must use the durable DB/RPC path in
`10-DATABASE-MIGRATION-AND-RPC-READINESS.md` and
`15-DATABASE-PREFLIGHT-MIGRATION-RPC-SPEC.md`.

Rationale: Trust state that survives reloads or controls reuse decisions is
product data, not local UI state. It needs constraints, RLS, audit history, and
atomic conflict behavior.

Rejected: Shipping app-layer governance as if it were durable. That would create
unreviewed "accepted" states and make later migration ambiguous.

Consequence: A transient app-layer prototype may be built only behind a clearly
non-durable label and leaves U4/U5 open.

### DR-3: Beta Governance Authority Is Admin-Only

Decision: For closed beta, trust-changing governance actions are limited to
`public.is_platform_admin()` or `public.is_workspace_admin(workspace_id)`.

Rationale: UX role names such as Library curator and Reviewer are task labels.
They are not new database roles. Using existing admin predicates keeps the beta
permission model secure and implementable.

Rejected: Inferring curator/reviewer authority from workspace member or editor.
Current broad editor access is too permissive for accepted-cost locks,
attachment approvals, and private audit notes.

Consequence: If beta users need non-admin curators, implementation must pause
U4/U5 and add a separate role/permission model plan before durable governance
ships.

### DR-4: Phase 0 Reconciles Baseline Truth Instead Of Freezing It

Decision: This pack must not permanently claim either "full validate is red" or
"full validate is green." Phase 0 records the current state in this pack's
evidence before implementation splits.

Rationale: `.ai/10_state/current-state.md` contains a stable fast-path warning
about known main reds and a later Library-specific validate pass. Both can be
true for different worktrees or moments.

Rejected: Treating broad `bun run validate` as the only done gate, or ignoring
it entirely. Focused proof remains required, and broad validation is reported
fresh when run.

Consequence: Final reports use "current baseline reconciled on DATE" language,
not stale line-number claims.

### DR-5: Source Links Are Display-Only Unless SSRF Controls Are Added

Decision: Source URLs may be rendered for authorized private users after link
normalization, but this plan does not authorize server-side fetching of arbitrary
source URLs.

Rationale: Displaying a safe hostname is lower risk than fetching URLs through
server infrastructure.

Rejected: Adding price-source URL fetch/previews during this cycle. It would
bring SSRF, redirect, DNS rebinding, timeout, and content-size controls into a
reuse-safety plan.

Consequence: `http:` source links are disabled by default unless a product
approval is recorded in this document. `https:` is the default clickable scheme.

## Release NO-GO Rules

- No beta reuse foundation release if a stale, archived, foreign-workspace, or
  stale-target source can silently commit into an estimate.
- No full governance release if DB preflight has not captured current schema,
  grants, RLS, duplicate probes, generated-type impact, and project ref
  `ebxxqidacheyapmmzavr`.
- No U4/U5 release if workspace member/editor can mutate or read private
  governance audit prose without the role decision being changed by plan.
- No evidence claim may rely on raw `_evidence/` dumps that include private
  URLs, filenames, storage paths, customer/project names, signed URLs, provider
  secrets, SQL row dumps, or review prose.
- No release-ready claim if Safari/iOS/Android/RTL, full glass matrix, 5,000-row
  tier, portal/focus, or copy-deck gaps are in scope and remain unproven. If
  they are out of scope for this pack, record that boundary in Phase 0 evidence.
