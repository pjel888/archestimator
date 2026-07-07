# 03 — Source and Codebase Audit

Evidence base: read-only inspection. File:line references are repo-relative where possible; absolute paths use `/Users/philiplewis/Documents/archestimator/`.

## A. Document / source map

| Document | Path | Purpose | Relevant section | Accuracy | Update needed? |
|---|---|---|---|---|---|
| Task brief | `.ai/03_plans/2026-07-07-client-ready-proposal-package-workflow/PROMPT.md` | Defines goal, evidence, required pack, constraints, stop condition | Whole | Current | No (input) |
| Creating-Plan-Prompt | `.ai/08_prompts/000_Planning Prompts/Creating-Plan-Prompt.md` | Planning directive | Whole | Current | No |
| Multi-Agent-Execution-Directive | `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` | Execution directive | Whole | Current | No |
| Current state | `.ai/10_state/current-state.md` | Append-only truth log | Fast-path block | Current (verify before relying on a detail) | No |
| AGENTS.md | `AGENTS.md` | Entry point + stack baseline + Cloudflare mandate + proportional verification | Whole | Current | No |
| Migration 0014 | `migrations/0014_publication_shared_links.sql` | Entire publication domain schema | Whole | Current | No |
| Migration 0015 | `migrations/0015_publication_admin_sidecars.sql` | **Misnamed** — project/estimate columns + estimate rows/nodes/tabs | Whole | Current (misleading name) | No (cosmetic) |
| Latest migration | `migrations/0036_cost_library_component_drafts.sql` | Cost library drafts | n/a | Current | No |

Related **plan prompts** (siblings, only PROMPT.md present, not yet built — read for boundary, not for built-state):
`2026-07-07-proposal-export-and-immutable-deliverable-trust`, `2026-07-07-public-share-activity-minimization`, `2026-07-07-public-to-beta-trust-onboarding-continuity`, `2026-07-07-publisher-owner-mobile-sender-readiness`, `2026-07-07-recipient-proposals-inbox-ia-recovery`. These define the broader proposal/publication program; **none are implemented yet**, so this pack does not assume their outputs.

## B. Codebase area inventory (current-state)

### B1. Export preview + XLSX workbook (fully built, XLSX only)

| File | Symbols | Responsibility | Relevant to plan? |
|---|---|---|---|
| `src/components/workshop/EstimateHeaderActions.tsx` | `EstimateHeaderActions` | Thin Zustand-driven trigger; exposes "Preview Excel Export" + "Activity" only. Off-route renders nothing. | Reuse: optional unified entry point (S9) |
| `src/components/workshop/ProposalExportPreviewDialog.tsx` | `ProposalExportPreviewDialog`, `ProposalExportPreviewScope`, `ProposalExportUserSettings` | `<dialog>` modal preview of XLSX contents: freshness badge, scope toggle (all-tabs/active-tab), settings panel (contingency/VAT/formulas/internal-breakdown), 3-col metadata strip, static "this file will contain" list (Bid Form/Summary/Commercial Terms/Source Breakdown), `validationIssues` as "export notes to review." No send/publish action in-dialog. | **Key reuse: surface readiness signals here** (S1/S3) |
| `src/components/workshop/proposal-export-preview-utils.ts` | `clampRate` | Clamps rate strings 0–100; empty = keep current | Unchanged |
| `src/components/workshop/estimate-sheet/proposal-preview-model.ts` | `DEFAULT_PROPOSAL_EXPORT_USER_SETTINGS`, `PROPOSAL_XLSX_CONTENT_TYPE`, `createProposalPreviewSignature`, `countUnsavedEditableRows`, `appendProposalExportSettingsParams`, `proposalPreviewModelSettings`, `readContentDispositionFilename`, `triggerBlobDownload` | Bridges editable estimate tree ↔ export model/settings; **staleness signature** + **unsaved-edits count** already computed here | **Key reuse: source-staleness warning** (S3) |
| `src/components/workshop/estimate-sheet/use-estimate-proposal-preview.ts` | `useEstimateProposalPreview` | Orchestration hook: `openProposalPreview`, `refreshProposalPreview`, `downloadProposalExport`, settings/scope changes, `proposalPreviewStatus` (freshness/download/downloadError/unsavedEdits). Fetch-then-blob download with content-type + content-disposition validation. | Reuse: integrate readiness into status |
| `src/lib/proposal-export/types.ts` | `ProposalExportAudience` (`client\|internal`), `ProposalExportSettings` (14 fields), `ProposalExportModel`, `ProposalExportValidationIssue`, `ProposalExportMetadata` (incl. clientName, contractorName, grossFloorArea, currency), `ProposalExportTotals` | Domain types for the export model | Reuse: `ProposalExportValidationIssue` is the extension point for readiness signals |
| `src/lib/proposal-export/settings.ts` | `defaultProposalExportSettings`, `applyAudiencePolicy`, `resolveProjectCharges`, `resolveSheetAdjustment` | Defaults + audience redaction (`client` → no Source Breakdown, no supplier-in-remarks) | Reuse: readiness preview must honor audience redaction |
| `src/lib/proposal-export/build-proposal-export-model.ts` | `flattenEstimateTree`, `consolidateProposalRows`, `buildProposalExportModel` | Estimate tree → client-safe model; canonical division reordering; per-section renumbering; **emits only 2 validation issues today**: `empty_estimate` (warning), `cost_split_compatibility_mode` (info) | **Key extension point: add readiness issues** (S1) |
| `src/lib/proposal-export/create-proposal-workbook.ts` | `createProposalWorkbook`, `createProposalWorkbookBuffer`, `BID_FORM_COLUMNS` | Builds XLSX (Bid Form/Summary/Commercial Terms/Source Breakdown) via local `xlsx-workbook.ts`. Live formulas. No PDF. | Unchanged |
| `src/lib/proposal-export/worksheet-name.ts` | `sanitizeWorksheetBaseName`, `buildUniqueWorksheetNames`, `quoteWorksheetCellReference` | Excel-safe worksheet naming (31-char, dedupe) | Unchanged |
| `src/lib/proposal-export/xlsx-workbook.ts` | `Workbook`, `Worksheet`, `Row`, `Cell`, `FormulaCellValue` | **Hand-rolled OpenXML writer** (declares OOXML namespaces directly; not ExcelJS thin wrapper) | Unchanged |
| `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | GET handler | Server-side XLSX generation. Gates: 401 not signed in; 429 rate limit (`checkProposalExportRateLimit`); 400 malformed settings; 413 over caps (`PROPOSAL_EXPORT_NODE_LIMIT=1200`, `ROW_ITEM_LIMIT=3000`, `TAB_LIMIT=50`); invalid-uuid SQLSTATE 22P02 → 400; audience resolved server-side (no client escalation to internal). | Unchanged; readiness model runs above this |

### B2. Publisher drawer + roster (fully built)

| File | Symbols | Responsibility | Relevant? |
|---|---|---|---|
| `src/components/workshop/publisher/PublisherDrawer.tsx` | `PublisherDrawer`, `PublisherDrawerTabId` (`overview\|recipients\|sheets\|access\|settings\|activity`), `ConfirmedPublisherAction` | Right-side drawer; status badge, password pill, stale-snapshot pill ("Nd behind"), Copy/Open link, republish/rotate/revoke mutations serialized via `publicationActionInFlightRef`. Read-only viewers see redacted link. | **Key host: add Preflight/Readiness surface** (S1/S2/S3/S9) |
| `src/components/workshop/publisher/usePublisherDrawer.ts` | `usePublisherDrawer` | React Query hook (10s staleTime) over `readPublisherPublicationDrawerData`; 3 mutations; `refreshPublisherSurface` invalidation | Reuse: prefetch readiness alongside |
| `src/components/workshop/publisher/publisher-queries.ts` | `publisherRosterQueryKeys`, `writePublisherRosterSearchParams` | Query-key factory + URL params (status/project/q/page) | Unchanged |
| `src/components/workshop/publisher/PublisherRosterClient.tsx` | `PublisherRosterClient` | Roster table client; status tabs (All/Active/Stale/Expired/Revoked/Drafts), filters, pagination; opens drawer via URL intent `?drawer=<projectId>&tab=<id>` or click. Mobile (<768px) → disabled empty state. | Unchanged |
| `src/components/workshop/publisher/PublisherRosterRow.tsx` | `PublisherRosterRow` | One roster row: status, recipient count, open count, latest activity, sheet scope, Copy/Open/Manage actions, `linkUnavailableReason` | Reuse: optional readiness indicator column |
| `src/components/workshop/publisher/PublisherRosterSkeleton.tsx`, `PublisherEmptyState.tsx`, `PublisherActivityFeed.tsx` | — | Skeletons/empty states; activity feed wrapper over `loadPublisherWorkspaceActivity` (no auto-poll; "use Refresh") | Unchanged |
| `src/components/workshop/publisher/PublisherProjectMembersPanel.tsx` | `PublisherProjectMembersPanel` | Access tab: internal team RBAC (owner/admin/editor/viewer), per-sheet access mode, sheet-scoped invites. **Not** recipient email management. | Unchanged |
| `src/components/workshop/publication/SheetPickerList.tsx` | `SheetPickerList` | Checkbox list of estimates (sheets) with Select all/Clear; "N / M selected" | Reuse as-is (S4) |
| `src/components/workshop/publication/RecipientEmailComposer.tsx` | `RecipientEmailComposer`, `RecipientComposerMessage` | Recipients tab: email chip input; statuses pending/sent/bounced/opened/responded; send gated on `readSharedLinkEmailDeliveryReadiness().configured`; self-invite blocked; resend confirm for opened/responded; remove confirm. **No subject/body/custom-message fields today.** | **Key change: add owner-composed message** (S5) |
| `src/components/workshop/publication/publication-optimistic.ts` | `readPublicationServerSignature`, `shouldUseOptimisticPublicationResult` | UI staleness signature; no consumer in audited dirs (staged/elsewhere) | Unchanged |

### B3. Publisher server actions + repos (fully built)

| File | Symbols | Responsibility | Relevant? |
|---|---|---|---|
| `src/lib/publisher/permissions.ts` | `canReadPublisherRosterProject` (role ≠ viewer), `canManagePublisherRosterProject` (owner/admin) | Role-based app-layer gating | Reuse: readiness-read uses read gate; readiness-action uses manage gate |
| `src/lib/publisher/drawer-actions.ts` | `readPublisherPublicationDrawerData` | `"use server"`; `requireAuth`; enforces read gate; parallel-loads summary + sheets + collaborators; **redacts client link for read-only viewers** | Reuse: extend to include readiness block |
| `src/lib/publisher/roster-filter.ts` | `PUBLISHER_ROSTER_STATUS_FILTERS`, `parsePublisherRosterFilters` | Status aliases (published→active, unpublished/draft→drafts) | Unchanged |
| `src/lib/publisher/roster-repository.ts` | `readWorkspacePublicationsRoster`, `composePublisherRosterResult`, `readPublicationStatus`, `readPublicationSnapshotStaleness` | D1 roster; decrypts token for managers; synthesizes `unpublished` rows for manageable projects; computes effective status + stale-snapshot warning | **Key reuse: staleness already computed here** (S3) |
| `src/lib/publisher/activity-actions.ts` + `activity-repository.ts` | `loadPublisherWorkspaceActivity`, `readPublisherWorkspaceActivity` | Merges 5 activity sources; cursor-paginated; `partial`/`unavailableSources` for graceful degradation | Unchanged |

### B4. Publication lifecycle (fully built)

| File | Symbols | Responsibility | Relevant? |
|---|---|---|---|
| `src/lib/publication/types.ts` | `ProjectPublicationStatus` (`unpublished\|published\|expired\|revoked`), `ProjectPublicationSnapshot` (schemaVersion 1/1.2/1.3), `ProjectPublicationSummary` | Status enum + snapshot shape | Unchanged |
| `src/lib/publication/actions.ts` | `createProjectPublication`, `republishProjectPublication`, `rotateProjectPublicationLink`, `revokeProjectPublication`, `refreshProjectPublicationSummary`, `listSharedLinkRecipients`, `addSharedLinkRecipients`, `resendSharedLinkRecipientEmail`, `removeSharedLinkRecipient`, `readSharedLinkEmailDeliveryReadiness`, `openRecipientProposalAction`, `loadSharedLinkActivity`, `maybeTriggerSharedLinkActivityDigest`, `assertProjectPublicationManager`, `sendSharedLinkRecipientInvitationEmail`, `triggerOwnerDigestIfAllowed` | 78KB `"use server"` module; the lifecycle hub. **Optimistic `sent` at line ~1494–1497 with explicit "provider delivery receipts are future work" comment.** | **Key change targets: `addSharedLinkRecipients`/`sendSharedLinkRecipientInvitationEmail` (message), decision path (`responded`), dispatch notifications** |
| `src/lib/publication/security.ts` | `hashPublicationToken`, `encryptPublicationToken`, scrypt password hashing, access/session cookie HMAC, `assertSameOriginPublicPost`/`assertSameOriginPublicFormPost` | Token + password + cookie + CSRF security | Unchanged (reuse) |
| `src/lib/publication/client-csrf.ts` | `createPublicationCsrfHeaders` | Client-side double-submit CSRF | Unchanged |
| `src/lib/publication/snapshot.ts` | `buildProjectPublicationSnapshot`, `sanitizeProjectPublicationSnapshotForPublicRead`, `createPublicationSnapshotIdMaps`, `sanitizeProjectPublicationLocation` | Frozen snapshot build + public-read sanitizer (opaque IDs, GPS redaction) | **Key reuse: readiness preview uses same redaction** |
| `src/lib/publication/d1-store.ts` | `createPublicationD1Store` (factory; ~20 methods) | Low-level public-side D1 store; `markRecipientOpened` (only writer of non-pending/sent status today); `submitClientResponse` (decision; dedup; signer_name; signature_intent_hash) | **Key change: `submitClientResponse` flips `responded`** (S11) |
| `src/lib/publication/admin-d1-client.ts` | `PublicationD1QueryBuilder`, `callProcedure` (`replace_project_publication`, `rotate_project_publication_credentials`, `persist_shared_link_recipient_resend`, `reserve_security_rate_limit_slot`, `authorize_recipient_publication_for_current_user`) | Manager-side write/procedure layer over D1 (allowlist `knownTables`; `assertSafeIdentifier`) | Unchanged |
| `src/lib/publication/public-repository.ts` | `resolveProjectPublicationAccessByToken`, `resolveProjectPublicationSnapshotByToken`, `recordProjectPublicationEvent`, `submitSharedLinkDecision`, rate limiters, `verifySharedLinkRecipientToken`, `resolveSharedLinkRecipientIdentity` | Public read+write layer; `React.cache` memoization; SEC-06 cross-publication recipient scoping; bot-gated open count | **Key change: `submitSharedLinkDecision` flips `responded`** (S11) |
| `src/lib/publication/share-copy.ts` | `SHARED_LINK_UNAVAILABLE_COPY`, `sharedLinkUnavailableErrorBody` | 404 copy | Unchanged |
| `src/lib/publication/email-links.ts` | `buildSharedLinkRecipientEmailLinks` | Builds recipient link + unsubscribe href; strict `/share/[token]` validation | Unchanged |
| `src/lib/publication/recipient-limits.ts` | `SHARED_LINK_RECIPIENT_ACTION_LIMIT = 50` | Per-add cap | Unchanged |

### B5. Recipient inbox (built, minimal)

| File | Symbols | Responsibility | Relevant? |
|---|---|---|---|
| `src/lib/recipient-proposals/actions.ts` | `loadRecipientProposals` | 9-line wrapper | Unchanged |
| `src/lib/repositories/recipient-proposals-repository.ts` | `listRecipientProposals`, `RecipientProposalRow`, `RecipientProposalStatus` (`published\|expired\|revoked`), `RecipientProposalDecision` (`accepted\|declined\|revision_requested\|null`) | Recipient inbox feed; matches `lower(recipient.email)`; status computed in SQL (revoked > expired-by-date > published); `has_opened` only newness signal; LIMIT 50 | Unchanged (recipient-side is sibling plan's scope) |
| `src/components/workshop/proposals-page-client.tsx` + `proposals-page/*` | `ProposalsPageClient`, `ProposalsList`, `ProposalRow`, empty/error/skeleton states | Recipient-facing inbox; Review button → `openRecipientProposalAction`; no resend/revoke from inbox | Unchanged |

### B6. Email + notifications (mixed)

| File | Symbols | Responsibility | State | Relevant? |
|---|---|---|---|---|
| `src/lib/email/transactional-email-client.ts` | `sendEmail`, `readEmailDeliveryConfig`, `isEmailDeliveryEnabled`, circuit breaker | Generic envelope; Cloudflare Email only; 5-min/50% circuit breaker | Built | Unchanged (call site changes) |
| `src/lib/email/cloudflare-email-client.ts` | — | `binding.send(...)` via `getCloudflareContext({ async: true })` | Built | Unchanged |
| `src/lib/notifications/types.ts` | kinds incl. `publication_activity`; severities; surfaces | **Enum only — no dispatcher** | **Stubbed** | **Key change: dispatch `publication_activity`** (S10) |
| `src/lib/notifications/repository.ts` | read/state-update only | **No INSERT path** | **Stubbed** | **Key change: add insert/dispatch** (S10) |
| `src/lib/legal/terms-content.ts` | `CURRENT_TERMS`, `CURRENT_PRIVACY_NOTICE`, `TERMS_ACCEPTANCE_SUMMARY` | Platform beta terms only; no per-proposal terms | Built | Reuse: surface at owner-send step (S12) |

### B7. Data schema (publication domain)

All in `migrations/0014_publication_shared_links.sql` (fully built). Tables:

- `project_publications` — the "proposal" row. PK `id`; `status` CHECK `('published','expired','revoked')`; partial UNIQUE `idx_..._one_published_per_project` (one live link per project); `snapshot_version ≥ 1`; `selected_estimate_ids` JSON; `snapshot_json` JSON; `location_visibility`; `open_count`; `expires_at`; `revoked_at`.
- `project_publication_events` — visitor telemetry (`open`, password events, `download_attempt_blocked`).
- `shared_link_recipients` — PK `id`; `(publication_id, lower(email))` UNIQUE; `recipient_token_hash` UNIQUE; `delivery_status` CHECK `('pending','sent','bounced','opened','responded')`; `resend_*` columns (legacy-named, store Cloudflare messageId); `email_unsubscribed_at`.
- `shared_link_comments` — comments; `recipient_id` nullable (null = owner); `target_kind` CHECK `('proposal','estimate','row')`; `snapshot_version_at_comment`.
- `shared_link_responses` — decisions; `decision` CHECK `('accepted','declined','revision_requested')`; partial UNIQUE `(recipient_id, publication_id)`; `signer_name`; `signature_intent_hash`.
- `shared_link_events` — recipient-scoped events (`open`, `comment_add`, `accept_decision`, `decline_decision`, `password_attempt`).
- `publication_digest_log` — owner digest delivery log.

**No schema change is required** for the in-scope work:
- `responded` is already in the `delivery_status` CHECK — only a missing writer.
- Owner-composed message can be stored on `shared_link_recipients` (new nullable columns) **or** kept ephemeral per-send (analysis in `07`; recommendation: persist a short `invitation_subject`/`invitation_message` on the recipient row for audit + resend consistency, additive migration `0037`).
- `publication_activity` notifications use the existing `notification_deliveries`/`notification_definitions` tables (need confirmation those tables exist — flagged in `07` as a DISCOVERY-REQUIRED step; if they don't exist, dispatch is BLOCKED-EVIDENCE).

## C. Gaps and TODOs discovered

| Gap | Evidence | Plan handling |
|---|---|---|
| No readiness/preflight layer | Only gate is "≥1 sheet selected" (`actions.ts:807-809`, `890-892`) | S1/S2 — new `proposal-readiness` lib |
| No owner-composed recipient message | `sendSharedLinkRecipientInvitationEmail` subject/body hardcoded; `RecipientEmailComposer` addresses only | S5 — extend `RecipientInput` + composer + email builder |
| `bounced` never written; no webhook route | `src/app/api/webhooks/resend/` empty; no webhook handler; provider is Cloudflare Email | S7 — BLOCKED-EXTERNAL in `11`/`15` |
| `responded` never written on decision | `submitClientResponse`/`submitSharedLinkDecision` write `shared_link_responses` but don't flip `delivery_status` | S11 — wire the hook |
| `publication_activity` notification not dispatched | enum exists; no INSERT in app code | S10 — add dispatcher |
| `publication-optimistic.ts` has no consumer | grep found no consumers in audited dirs | Out of scope (pre-existing) |
| Recipient removal is hard DELETE (orphan risk) | `removeSharedLinkRecipient` deletes row; comments/responses reference `recipient_id` | Out of scope (pre-existing data-hygiene; noted in `14`) |
| `0015` misnamed | filename says "publication_admin_sidecars" but alters projects/estimates | Cosmetic; noted |
| `expired` derived not persisted | no cron flips published→expired | Out of scope (pre-existing); noted in `14` |
| `logs_email_delivery` referenced but never created | `0034` retention class; no migration creates it | Out of scope (pre-existing); noted |

## D. Build-state summary

| Area | Build state |
|---|---|
| Export preview + XLSX | Fully built (XLSX only; advisory validation; no send in-dialog) |
| Publisher drawer + roster | Fully built |
| Publication lifecycle (create/republish/rotate/revoke) | Fully built |
| Publication security (tokens/CSRF/snapshot) | Fully built |
| Recipient inbox | Built (minimal; recipient-side) |
| Email client | Built (Cloudflare Email only) |
| Notifications dispatcher | **Stubbed** (enum only) |
| Bounce/complaint ingestion | **Missing** (BLOCKED-EXTERNAL) |
| Readiness/preflight | **Missing** (this plan's core gap) |
| Owner-composed message | **Missing** |
| `responded` status writer | **Missing** |
| PDF | **Missing** (out of scope) |
