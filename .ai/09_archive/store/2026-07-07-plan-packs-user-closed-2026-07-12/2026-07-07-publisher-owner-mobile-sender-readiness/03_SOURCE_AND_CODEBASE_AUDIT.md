# 03 — Source and Codebase Audit

Evidence-grounded inventory of every relevant current-state file, symbol, and behavior. All paths repo-relative. Line numbers from the current working tree (read by native Explore lanes + lead). Inference vs evidence is labeled.

---

## A. Publisher owner UI surface (`src/components/workshop/publisher/`)

| File:Line | Symbol | Responsibility | Mobile behavior | Why relevant | Expected impact |
|---|---|---|---|---|---|
| `src/components/workshop/publisher/PublisherRosterClient.tsx:99` | `PublisherRosterClient` | Client owner of roster table; URL state (`status`,`project`,`q`,`page`,`pageSize`,`drawer`,`tab`); copy-link; mounts drawer | **`min-[768px]:hidden` block at :224 + `min-[768px]:flex` table at :228** → entire roster hidden below 768px | THE mobile blocker | **Modify** (mobile decision) |
| `src/components/workshop/publisher/PublisherRosterClient.tsx:154` | `handleCopyLink` | `navigator.clipboard.writeText` + absolute-URL resolve (`readAbsoluteClientLink` :52) | unreachable on mobile | sender action: copy | Extend (mobile reachability) |
| `src/components/workshop/publisher/PublisherEmptyState.tsx:22` | `PublisherNoRowsEmptyState` `{variant: "filtered"\|"no-publications"\|"mobile"}` | Copy for empty states | supplies `mobile` variant copy at :29-33 ("Publisher needs more width") | the visible mobile blocker | **Modify** (only if mobile decision changes copy) |
| `src/components/workshop/publisher/PublisherRosterRow.tsx:59` | `PublisherRosterRow`, `PublisherRosterCopyState` (`idle\|copied\|failed`) | Renders row + Copy/Open/Manage actions | columns hidden below `lg` (:118,:128); actions unreachable on mobile | sender action entry points | **Modify** (action clarity + mobile card alt) |
| `src/components/workshop/publisher/PublisherDrawer.tsx:114` | `PublisherDrawer`, `PublisherDrawerTabId` (`overview\|recipients\|sheets\|access\|settings\|activity`) | Right drawer; tabs; rotate/revoke via ConfirmDialog | no own mobile gate; `side="right" size="wide"` (sheet-drawer) | sender action surface (recipients/settings) | **Modify** (states/a11y) — SERIALIZE with workflow pack |
| `src/components/workshop/publisher/PublisherDrawer.tsx:90` | `rowToSummary` | Maps roster row → `ProjectPublicationSummary` fallback | — | hardcodes `locationVisibility:"locality"`, `latestRecipientOpen:null` | Verification only |
| `src/components/workshop/publisher/PublisherDrawer.tsx:163` | `runPublicationUpdate` | Serializes mutations + refetch drawer query | — | republish/rotate/revoke dispatch | Verification only |
| `src/components/workshop/publisher/PublisherDrawer.tsx:236` | `copyClientLink` | clipboard copy from drawer | — | sender action: copy (drawer path) | Extend |
| `src/components/workshop/publisher/usePublisherDrawer.ts:16` | `usePublisherDrawer(projectId, open)` | TanStack Query (`drawer(projectId)`, staleTime 10s) + 3 mutations (republish/rotate/revoke) + `refreshPublisherSurface` invalidation | — | mutation state owner | Verification only |
| `src/components/workshop/publisher/publisher-queries.ts:3` | `publisherRosterQueryKeys`, `writePublisherRosterSearchParams` | Query keys + URL param writer | — | cache + URL state | Verification only |
| `src/components/workshop/publisher/PublisherProjectMembersPanel.tsx:125` | `PublisherProjectMembersPanel` | Access tab; invite/remove collaborators | `[&_ table]:min-w-[420px]` (:302) | adjacent (access), not sender core | Verification only (note: also has its own narrow-table risk) |
| `src/components/workshop/publisher/PublisherActivityFeed.tsx:12` | `PublisherActivityFeed` | Activity tab (wraps `SharedLinkActivityFeed`, `isOwner` hardcoded) | — | audit/proof surface | **Modify** (proof surfacing) |
| `src/components/workshop/publisher/PublisherRosterSkeleton.tsx` | skeleton | loading | — | loading state | Verification only |

## B. Publication sender backend (`src/lib/publication/`)

| File:Line | Symbol | Responsibility | Authz | Why relevant | Expected impact |
|---|---|---|---|---|---|
| `src/lib/publication/actions.ts:775` | `createProjectPublication` | Publish/generate share link; builds snapshot; mints token; D1 RPC `replace_project_publication` | `requireAuth`+`assertProjectPublicationManager` | sender action: generate | Verification only (audit) |
| `src/lib/publication/actions.ts:845` | `republishProjectPublication` | Update published row in place (new snapshot, bump version) | same | sender action: generate (update) | Verification only |
| `src/lib/publication/actions.ts:938` | `rotateProjectPublicationLink` | Rotate token **in place** (keeps row id, FK valid); **invalidates recipient hashes** → emailed links stop working | same | sender action: rotate (resend-of-rotate impact) | Verification only (rule surfacing) |
| `src/lib/publication/actions.ts:1012` | `revokeProjectPublication` | Set `status="revoked"`, `revoked_at=now` | same | sender action: revoke | Verification only (rule surfacing) |
| `src/lib/publication/actions.ts:1045` | `refreshProjectPublicationSummary` | Re-read summary | `requireAuth` | drawer refresh | Verification only |
| `src/lib/publication/actions.ts:473` | `readSharedLinkEmailDeliveryReadiness` | `configured = deliveryConfig.configured && hasReplyTo` | `requireCurrentUserContext` | gates email sender actions | Verification only |
| `src/lib/publication/actions.ts:1329` | `listSharedLinkRecipients` | Manager roster read | `requireAuth`+manager assert | recipients tab | Verification only |
| `src/lib/publication/actions.ts:1352` | `addSharedLinkRecipients` | Email recipients; mints per-recipient token (hash-only); bounded concurrency 4; 50 cap; self-invite blocked; batch-abort if link unresolvable | manager assert | sender action: email | Verification only (audit) |
| `src/lib/publication/actions.ts:1554` | `resendSharedLinkRecipientEmail` | **Send-before-persist** (MOD-REC-02); rate-limited 1/5min; mints new raw token; only persists hash on send success | manager assert + `checkSharedLinkRecipientResendRateLimit` | sender action: resend | Verification only (rate-limit surfacing) |
| `src/lib/publication/actions.ts:1653` | `removeSharedLinkRecipient` | Delete recipient row (cascade) | manager assert | sender action (recipient remove) | Verification only |
| `src/lib/publication/actions.ts:1816` | `loadSharedLinkActivity` | Owner-only activity feed | `requireCurrentUserContext` | audit/proof | Verification only |
| `src/lib/publication/actions.ts:304` | `openRecipientProposalAction` | **Confirm client access** bridge: D1 RPC `authorize_recipient_publication_for_current_user` → decrypt token → set session cookie → redirect `/share/<token>` | `requireCurrentUserContext` + recipient-email match | sender action: confirm-access (owner-visibility) | Verification only |
| `src/lib/publication/actions.ts:394` | `assertProjectPublicationManager` | The manager gate: platform `ceo`/`admin` bypass OR `max(workspaceRank, projectRank) ≥ 30` | core authz | sender authz | Verification only (audit) |
| `src/lib/publication/security.ts:63` | `createPublicationToken`, `hashPublicationToken` (HMAC), `encryptPublicationToken` (AES-GCM) | Credential material | — | credential taxonomy | audit-only |
| `src/lib/publication/security.ts:343,419,510` | password access cookie, session cookie, CSRF | Cookie/CSRF material | — | credential taxonomy | audit-only |
| `src/lib/publication/email-links.ts:70` | `buildSharedLinkRecipientEmailLinks` | email body links incl. unsubscribe | — | email action | Verification only |
| `src/lib/publication/recipient-limits.ts:1` | `SHARED_LINK_RECIPIENT_ACTION_LIMIT=50` | recipient cap | — | email action | Verification only |
| `src/lib/publication/d1-store.ts`, `public-repository.ts`, `admin-d1-client.ts`, `snapshot.ts`, `types.ts`, `activity-helpers.ts`, `client-csrf.ts`, `image-url.ts`, `share-copy.ts` | supporting D1/repo/snapshot/security helpers | — | — | supporting | Verification only |

## C. Publisher supporting lib (`src/lib/publisher/`)

| File:Line | Symbol | Responsibility | Why relevant | Expected impact |
|---|---|---|---|---|
| `src/lib/publisher/permissions.ts:3` | `canReadPublisherRosterProject` (`role!=="viewer"`), `canManagePublisherRosterProject` (`owner\|admin`) | UI-level gate | sender authz (UI side) | Verification only |
| `src/lib/publisher/drawer-actions.ts:39` | `readPublisherPublicationDrawerData` | Loads drawer; **redacts `clientLinkPath`/`tokenCopyAvailable` for read-only viewers** (:27-37) | copy-action authz | Verification only |
| `src/lib/publisher/roster-filter.ts:5` | `PUBLISHER_ROSTER_STATUS_FILTERS` | status filter enum + URL params | roster filters | Verification only |
| `src/lib/publisher/roster-repository.ts:24` | `ProjectPublicationRosterRow`, `readWorkspacePublicationsRoster` | server roster build | roster data | Verification only |
| `src/lib/publisher/activity-actions.ts:9` | `loadPublisherWorkspaceActivity` | workshop activity | audit/proof | Verification only |
| `src/lib/publisher/activity-repository.ts` | activity repo | — | audit/proof | Verification only |

## D. Publication UI components (`src/components/workshop/publication/`)

| File:Line | Symbol | Responsibility | Mobile behavior | Why relevant | Expected impact |
|---|---|---|---|---|---|
| `src/components/workshop/publication/RecipientEmailComposer.tsx:293` | `RecipientEmailComposer` | Email recipients (add/remove/resend/retry); `useReducer`; self-invite guard; send disabled unless `emailDeliveryConfigured` | none (fixed tiny type `text-[9px]`; chip row wraps); transitively blocked by roster mobile gate | sender action: email/resend | **Modify** (clarity/states) — SERIALIZE with workflow pack |
| `src/components/workshop/publication/SheetPickerList.tsx:13` | `SheetPickerList` | Sheets tab toggle list | none | adjacent (sheets) | Verification only |
| `src/components/workshop/publication/publication-optimistic.ts:8` | `readPublicationServerSignature`, `shouldUseOptimisticPublicationResult` | optimistic helper (NOT used by drawer — drawer uses real refetch) | — | NOT in sender critical path | Explicitly unaffected |

## E. Route entry & email integration

| File:Line | Symbol | Responsibility | Why relevant | Expected impact |
|---|---|---|---|---|
| `src/app/workshop/publisher/page.tsx:36` | `PublisherPage` (RSC) | Fetches roster server-side (Suspense x2); `WorkshopPageShell` with `publisher-canvas-wash` | route ownership | **Modify** only if mobile needs server data shape change |
| `src/app/workshop/publisher/error.tsx` | route error boundary | error UI | error state | Verification only |
| `src/lib/email/transactional-email-client.ts:98` | `sendEmail` | circuit breaker + config gate → `sendCloudflareEmail` | email action | Verification only |
| `src/lib/email/cloudflare-email-client.ts:121` | `sendCloudflareEmail` | `EMAIL` binding `.send()` | email action | Verification only |
| `wrangler.jsonc:25` | `send_email` binding `EMAIL` | Cloudflare Email Service | email action | Verification only (no binding change) |

## F. D1 schema (audit-only; no migration in this pack)

| Migration:Table | Key columns/constraints | Why relevant |
|---|---|---|
| `0014:1-38` `project_publications` | `token_hash` UNIQUE, `encrypted_token` (AES-GCM), `password_hash` (scrypt), `status` CHECK `published\|expired\|revoked`, UNIQUE partial index one-published-per-project | generate/rotate/revoke backing |
| `0014:58-97` `shared_link_recipients` | `recipient_token_hash` UNIQUE (raw never stored), `delivery_status` CHECK `pending\|sent\|bounced\|opened\|responded`, UNIQUE `(publication_id, lower(email))` | email/resend/remove backing |
| `0014:40-57` `project_publication_events` | open/password telemetry, peppered `ip_hash`/`user_agent_hash` | audit/proof |
| `0006:123` `security_rate_limit_events` | rate-limit backing store | resend rate limit |
| `0014:186` `publication_digest_log` | owner digest log | audit/proof |

No new migration is proposed in this pack (see `07_DATA_DATABASE_API_NETWORK_PLAN.md`).

## G. Existing tests (inventory; see `12`)

Representative (full list in `12_TEST_AND_VALIDATION_STRATEGY.md`):
- `tests/vitest/project-publication-actions.test.ts`, `project-publication-rotate-resend.test.ts`, `publisher-rbac.test.ts`, `publisher-drawer-actions.test.ts`, `publisher-roster-client.test.tsx`, `recipient-email-composer.test.tsx`, `publisher-activity-feed.test.tsx`, `project-publication-security*.test.ts`, `csrf-origin-denial.test.ts`.
- `e2e/shared-link-receiver.spec.ts` (recipient-side end-to-end).

**Gap (evidence, not inference):** there is no Playwright/UI test of the **owner** sender surface across the desktop→mobile breakpoint, and no test asserting the mobile empty state or a mobile layout. This is a test-design finding, addressed in `12`.

## H. Documentation traced

| Doc | Relevant section | Accurate? | Update needed? |
|---|---|---|---|
| `DESIGN.md:519-524` | mobile prioritization (dashboard/list/preview; dense editing → simplified flows) | YES | No (governs DEC-MOBILE) |
| `DESIGN.md:547-548` | publisher canvas wash only; no inner gradients | YES | No |
| `.ai/06_specs/proposal-package-system.md` | recipient access, lockout, comments/decision, digest | YES | No (recipient-side) |
| `.ai/06_specs/shared-link-and-publication-spec.md` | token resolution, cookies, lockout, headers | YES | No |
| `.ai/06_docs/feature-inventory.md`, `walkthrough-shared-link-overhaul.md` | feature walkthroughs | YES | No |
| `.ai/01_roadmap/05-ux-ui-polish-readiness.md`, `20-ux-ui-excellence-scorecard.md`, `22-ruthless-prioritization-for-beta.md` | UX readiness/prioritization | YES | No |

## I. Key current-state findings (consolidated)

1. **The single mobile blocker** is `PublisherRosterClient.tsx:224,228`: a pure CSS `min-[768px]` swap that replaces the roster table with `PublisherNoRowsEmptyState variant="mobile"`. No JS media hook exists. (evidence)
2. **Every sender action is reachable only via the desktop table** (`PublisherRosterRow` Copy/Open/Manage → `PublisherDrawer` → `RecipientEmailComposer`). The drawer has no own mobile gate but is never opened on mobile. (evidence)
3. **The sender backend is fully wired** (not stubbed). The only stub in this surface is the delivery-receipts webhook (`src/app/api/webhooks/resend/` empty) → `delivery_status` never flips to `bounced/opened/responded` from provider signals. (evidence; this is the workflow pack's REL-01, NOT duplicated here)
4. **Authz is consistent and server-enforced** (`assertProjectPublicationManager`, rank ≥ 30). Read-only viewers have `clientLinkPath` redacted. (evidence)
5. **Resend is rate-limited** (1/5min per user+pub+recipient) and **send-before-persist**; **rotate** invalidates recipient hashes (emailed links stop working); **revoke** blocks access. These rules are NOT clearly surfaced to the owner today. (evidence → S4)
6. **No owner-side audit/proof gap**: `project_publication_events` + `publication_digest_log` + `loadSharedLinkActivity` exist, but owner-facing surfacing of "what happened to my send/resend/revoke" is thin. (evidence + inference → S7)
7. **Sibling overlap is real but separable**: the workflow pack owns readiness/Preflight/gating/owner-message; this pack owns device operability + sender-action clarity + owner-side error/recovery/audit-proof/a11y. (evidence)
