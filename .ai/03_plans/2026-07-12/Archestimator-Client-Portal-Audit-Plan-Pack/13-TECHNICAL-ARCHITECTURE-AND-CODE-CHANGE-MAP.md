# 13 — Technical Architecture and Code Change Map

## 1. Target runtime architecture

```mermaid
flowchart TD
  Owner[Owner / Portal Manager] --> Publisher[Publisher Control Center]
  Publisher --> DraftRepo[Portal Draft Repository]
  Publisher --> Policy[Portal Policy Evaluator]
  Publisher --> Builder[Issue Snapshot Builder]

  PrivateSources[Projects / Estimates / Charts / Branding] --> Builder
  Builder --> IssueTxn[Atomic Issue Publication]
  IssueTxn --> D1[(D1 Portal Metadata + Threads + Decisions)]
  IssueTxn --> R2[(R2 Large Immutable Payloads + Assets)]
  IssueTxn --> Outbox[Notification Outbox]
  Outbox --> Queue[Cloudflare Queue]
  Queue --> Email[Cloudflare Email]

  Recipient[Anonymous / Recipient] --> PublicRoute[/share/[portalToken]]
  PublicRoute --> Access[Access + Recipient Session]
  Access --> Policy
  Policy --> Manifest[Issued Portal Manifest]
  Manifest --> Sections[Lazy Issue Sections]
  Sections --> D1
  Sections --> R2

  Recipient --> ThreadAPI[Thread / Message API]
  Recipient --> DecisionAPI[Decision API]
  ThreadAPI --> Policy
  DecisionAPI --> Policy
  ThreadAPI --> D1
  DecisionAPI --> D1

  DO[Durable Object Realtime Transport - later] --> ThreadAPI
```

## 2. Domain boundaries

### Portal configuration

Owns:

- stable portal;
- draft sections;
- branding references;
- access policy;
- recipient policy;
- decision policy;
- current issue pointer.

Suggested module:

```text
src/lib/client-portals/
  types.ts
  policy.ts
  repository.ts
  actions.ts
  draft.ts
  readiness.ts
  public-ids.ts
  errors.ts
```

### Issue publication

Owns:

- source reads;
- canonical calculations;
- section builders;
- sanitization;
- immutable manifest;
- content hashes;
- D1/R2 transaction;
- supersession;
- notification intents.

Suggested module:

```text
src/lib/client-portal-issues/
  types.ts
  builder.ts
  manifest.ts
  publish.ts
  repository.ts
  section-registry.ts
  section-builders/
    overview.ts
    estimates.ts
    financial-summary.ts
    cost-breakdown.ts
    estimate-comparison.ts
    assumptions-exclusions.ts
    activity-policy.ts
    decision.ts
```

### Public portal

Owns:

- token resolution;
- access/session;
- public manifest;
- section reads;
- recipient identity;
- client-safe DTOs;
- no-store headers.

Suggested module:

```text
src/lib/client-portal-public/
  access.ts
  repository.ts
  dto.ts
  session.ts
  rate-limits.ts
  security-headers.ts
```

### Discussion

```text
src/lib/client-portal-discussions/
  types.ts
  repository.ts
  actions.ts
  policy.ts
  targets.ts
  mentions.ts
  notifications.ts
  carry-forward.ts
```

### Decisions

```text
src/lib/client-portal-decisions/
  types.ts
  repository.ts
  actions.ts
  policy.ts
  receipt.ts
  evaluator.ts
```

### Branding

```text
src/lib/client-portal-branding/
  types.ts
  repository.ts
  actions.ts
  assets.ts
  sanitizer.ts
  effective-brand.ts
```

### Analytics and activity

```text
src/lib/client-portal-events/
  audit.ts
  analytics.ts
  client-activity.ts
  taxonomy.ts
  summaries.ts
  outbox.ts
```

## 3. Route map

### Public routes

```text
src/app/share/[token]/
  page.tsx
  loading.tsx
  not-found.tsx
  print.css

src/app/api/share/[token]/
  manifest/route.ts
  sections/[sectionPublicId]/route.ts
  session/route.ts
  password/route.ts
  verify/route.ts
  threads/route.ts
  threads/[threadPublicId]/messages/route.ts
  threads/[threadPublicId]/status/route.ts
  decision/route.ts
  activity/route.ts
  assets/[assetPublicId]/route.ts
  unsubscribe/route.ts
```

Keep `/api/share/[token]/comment` as a legacy compatibility adapter during migration.

### Publisher routes

```text
src/app/workshop/publisher/
  page.tsx
  new/page.tsx
  [portalId]/page.tsx
  [portalId]/preview/page.tsx
  [portalId]/issues/[issueId]/page.tsx
```

Do not encode privileged state in public token routes for manager preview.

## 4. Public component architecture

```text
src/components/client-portal/
  ClientPortalShell.tsx
  ClientPortalHeader.tsx
  ClientPortalNavigation.tsx
  ClientPortalSectionRenderer.tsx
  ClientPortalContextRail.tsx
  ClientPortalMobileActions.tsx
  ClientPortalStatusBanner.tsx
  ClientPortalFooter.tsx

  sections/
    OverviewSection.tsx
    EstimatesSection.tsx
    FinancialSummarySection.tsx
    CostBreakdownSection.tsx
    EstimateComparisonSection.tsx
    AssumptionsExclusionsSection.tsx
    DiscussionSection.tsx
    ActivitySection.tsx
    DecisionSection.tsx

  estimates/
    PortalEstimateSwitcher.tsx
    PortalEstimateTabSwitcher.tsx
    PortalEstimateTree.tsx
    PortalEstimateTable.tsx
    PortalEstimateTargetActions.tsx

  discussions/
    PortalThreadList.tsx
    PortalThreadView.tsx
    PortalMessageList.tsx
    PortalMessageComposer.tsx
    PortalThreadStatus.tsx
    PortalDiscussionDrawer.tsx

  decisions/
    PortalDecisionPanel.tsx
    PortalDecisionConfirmDialog.tsx
    PortalDecisionReceipt.tsx
```

The current share components should be extracted into these modules rather than wrapped in another giant orchestrator.

## 5. Publisher component architecture

```text
src/components/workshop/client-portals/
  PortalPortfolioClient.tsx
  PortalPortfolioTable.tsx
  PortalQuickDetail.tsx
  PortalNextAction.tsx

  control-center/
    PortalControlCenter.tsx
    PortalOverviewTab.tsx
    PortalContentTab.tsx
    PortalBrandingTab.tsx
    PortalPeoplePermissionsTab.tsx
    PortalDiscussionsTab.tsx
    PortalDecisionsTab.tsx
    PortalAnalyticsTab.tsx
    PortalVersionsTab.tsx
    PortalAccessSettingsTab.tsx

  composer/
    PortalSectionList.tsx
    PortalSectionLibrary.tsx
    PortalSectionEditor.tsx
    PortalReadinessPanel.tsx
    PortalPublishDialog.tsx
    PortalRolePreviewBar.tsx

  recipients/
    PortalRecipientTable.tsx
    PortalRecipientInviteDialog.tsx
    PortalRecipientRoleEditor.tsx
    PortalRecipientActivitySummary.tsx

  branding/
    PortalBrandAssetPicker.tsx
    PortalBrandPreview.tsx
    PortalCoBrandingMode.tsx

  discussions/
    PublisherThreadInbox.tsx
    PublisherThreadDetail.tsx
    PublisherPublicReplyComposer.tsx
    PublisherInternalNoteComposer.tsx
```

## 6. Current-file transition map

| Current path | Action | Reason |
|---|---|---|
| `src/app/share/[token]/page.tsx` | Keep route; reduce to access + manifest + shell orchestration | Current route is security-sensitive and too presentation-aware |
| `src/components/share/ShareContainer.tsx` | Retire for portal; retain only for legacy/print if needed | Centered cap conflicts with full-width portal |
| `ShareReviewWorkspace.tsx` | Decompose | Proposal-centric orchestration cannot scale to typed sections |
| `SharePageTabs.tsx` | Extract estimate browser, tree/details, print logic | 900+ line capability bundle |
| `ShareEstimateTreeView.tsx` | Reuse after target/action and full-row changes | Good existing tree foundation |
| `SharePageComments.tsx` | Legacy adapter; replace with thread UI | Flat comment model is insufficient |
| `SharePageDecision.tsx` | Rebuild against explicit issue-wide decision | Current contextual target is misleading |
| `SharedLinkActivityFeed.tsx` | Split owner/public feed renderers around shared event DTO | Useful but needs portal policy |
| `src/lib/publication/security.ts` | Preserve primitives; generalize naming carefully | Hardened security foundation |
| `snapshot.ts` | Preserve row/tree sanitization; move to section builders | One snapshot object becomes section payloads |
| `public-repository.ts` | Split by access/sections/discussions/decisions | Current module is too broad |
| `d1-store.ts` | Replace broad publication store with domain repositories | New schema and atomicity |
| `actions.ts` | Split manager, recipient, notification, activity capabilities | Current file is oversized and coupling-heavy |
| `admin-d1-client.ts` | Avoid expanding Supabase-like shim; use explicit SQL repositories | New domain needs auditable query contracts |
| `ShareWizard.tsx` | Replace with full-page composer | Current estimate/password editor cannot hold new complexity |
| `PublisherDrawer.tsx` | Retain as quick detail only | Control center moves to full route |
| `roster-repository.ts` | Replace with server-paginated portal roster query | Current 8-query + JS filter pattern will not scale |
| `project-charts/*` | Reuse pure aggregation and safe DTO ideas | Proven financial domain |
| project image upload route | Extract secure image pipeline for brand assets | Do not reuse project-specific access path directly |

## 7. Repository contracts

Every repository method should require explicit scope.

Bad:

```ts
getPortal(id)
```

Preferred:

```ts
getPortalForWorkspace({
  workspaceId,
  portalId,
  actor
})
```

Public:

```ts
getIssuedPortalByTokenHash({
  tokenHash,
  requestedIssueNumber
})
```

Thread write:

```ts
createPortalMessage({
  actor,
  portalId,
  issueId,
  threadId,
  idempotencyKey,
  body
})
```

Repositories should return domain result codes, not raw SQLite/provider errors.

## 8. Section registry architecture

```ts
type PortalSectionDefinition<K extends PortalSectionKind> = {
  kind: K;
  schemaVersion: number;
  validateDraft(input: unknown): ValidationResult<PortalSectionDraft<K>>;
  buildIssuePayload(ctx: IssueBuildContext, draft: PortalSectionDraft<K>): Promise<PortalIssueSection<K>>;
  sanitizeForRecipient(
    payload: PortalIssueSection<K>,
    policy: EffectiveRecipientPolicy,
  ): PortalPublicSection<K> | null;
  renderMode: "prose" | "standard" | "wide" | "immersive";
  supportsDiscussionTargets: boolean;
  supportsPrint: boolean;
};
```

The registry is a server-owned allowlist. The client can request only registered kinds and versioned schemas.

## 9. Snapshot generation

### Read phase

- authorize portal manager;
- load portal draft;
- load selected estimates and authorized project data;
- load brand profiles/assets;
- load chart facts/aggregates;
- load carry-forward threads;
- validate source freshness.

### Build phase

- canonical totals;
- section payloads;
- public ID maps;
- field allowlists;
- brand snapshot;
- decision policy;
- issue manifest;
- content and payload hashes.

### Commit phase

- D1 batch/transaction;
- R2 writes staged before commit with cleanup on failure, or content-addressed writes safe to orphan and later collect;
- issue insert;
- section references;
- prior issue supersession;
- portal current issue update;
- audit event;
- notification outbox.

### Failure

No partially current issue. An issue is either fully committed and referenced, or not visible.

## 10. D1 transaction constraints

D1 supports batch execution and SQLite transactions through the platform's supported APIs. Keep a single publication transaction bounded:

- metadata and small payloads in D1;
- large section bytes prewritten to content-addressed R2;
- D1 commit references only verified payload hashes;
- cleanup queue removes unreferenced R2 objects after grace period.

Do not hold a transaction across network email delivery.

## 11. Query strategy

### Portal portfolio

One paginated SQL query with CTEs/subqueries for:

- current issue;
- recipients;
- delivery failures;
- open/waiting threads;
- decision state;
- latest human activity;
- action-required flags.

Avoid correlated subqueries per row where a grouped join/window query works.

### Public manifest

One token lookup and one manifest/issue read.

### Section

One issue/section lookup plus R2 read if necessary.

### Thread list

Cursor by `(last_message_at, id)`.

### Messages

Cursor by `(created_at, id)`.

### Analytics

Pre-aggregated recipient/issue summaries for Publisher; raw events paginated only on demand.

## 12. Client state

### TanStack Query

Use for:

- manifest;
- lazy sections;
- thread lists/messages;
- recipient decision;
- public activity;
- Publisher portal detail tabs.

### URL state

Use for:

- section;
- target;
- issue number;
- Publisher filters;
- selected portal tab;
- role preview.

### Local component state

Use for:

- drawers/dialogs;
- drafts;
- selected chart interaction;
- optimistic message.

### Zustand

Only if cross-component portal UI state becomes genuinely high-frequency. Do not create a portal global store preemptively.

## 13. Realtime

MVP remains request/Query based. Later, a Durable Object room keyed by portal can broadcast:

- `thread.message.created`;
- `thread.status.changed`;
- `decision.submitted`;
- `issue.published`;
- presence/typing.

Clients refetch authoritative D1 state after notification. The DO is transport, not record.

## 14. Observability

Every route/action emits:

- request ID;
- route/action;
- portal/issue public or hashed identifiers;
- actor class;
- policy reason code;
- duration;
- payload size class;
- result code.

Key spans:

- access resolution;
- manifest load;
- section load;
- policy evaluation;
- snapshot source read;
- section build;
- R2 write;
- D1 commit;
- message write;
- decision write;
- notification enqueue/send.

## 15. Feature flags

Use bounded migration flags:

- `client_portal_v2_owner_create`;
- `client_portal_v2_public_read`;
- `client_portal_threads`;
- `client_portal_financial_sections`;
- `client_portal_branding`;
- `client_portal_client_activity`.

Flags are rollout controls, not permanent alternate architectures.

## 16. Compatibility

- legacy `/share/<publication-token>` remains readable;
- legacy comment/decision routes adapt to migrated issue where safe;
- current Publisher link routes redirect to upgraded portal;
- old issue content is not rebuilt from current source;
- old links never expose new portal sections unintentionally.

## 17. Technical acceptance criteria

- Public portal does not import private project repository functions.
- Full-width shell and each section are separately testable.
- Section registry rejects unknown kinds/schema versions.
- Publisher preview and public render use the same public DTOs/policy.
- Issue publication is idempotent and atomic.
- Repositories always carry explicit workspace/portal scope.
- Large payloads do not exceed D1 practical limits.
- D1 remains authoritative for collaboration and decisions.
- No giant component absorbs portal, discussions, decisions, and analytics together.
