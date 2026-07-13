# 10 — Blast Radius and Dependencies

## Impact classification

Legend: **Required** = must change to deliver the plan. **Probable** = likely change during implementation. **Possible** = may need a touch. **Verification only** = no change expected, verify still works. **Explicitly unaffected**.

### Users / roles

| Surface | Impact | Notes |
|---|---|---|
| Owner/admin (manager) | Required | New preflight UI, owner message, gate, notifications |
| Editor | Probable | Sees preflight (read), actions disabled where manage gate applies (existing) |
| Viewer | Verification only | Read gate unchanged; link redaction unchanged |
| Recipient (external) | Probable | Receives owner-composed message; their decision now flips `responded` (no UI change) |
| ceo/admin global | Verification only | Bypass unchanged |

### Screens / components

| Component | Impact | Reason |
|---|---|---|
| `ProposalExportPreviewDialog.tsx` | Required (UX-02) | Add readiness warnings |
| `use-estimate-proposal-preview.ts` | Possible | Expose warnings subset |
| `EstimateHeaderActions.tsx` | Possible (v1.1 only, ARCH-03) | Optional unified CTA |
| `PublisherDrawer.tsx` | Required (UX-01, FR-09) | Preflight panel, gate-aware buttons |
| `usePublisherDrawer.ts` | Probable | Include readiness in drawer data |
| `RecipientEmailComposer.tsx` | Required (UX-03, FR-05, FR-06) | Message fields + honest status labels |
| `PublisherRosterRow.tsx` | Probable (FR-06) | Optional readiness indicator |
| `SheetPickerList.tsx` | Explicitly unaffected | Reuse as-is |
| `PublisherProjectMembersPanel.tsx` | Explicitly unaffected | RBAC surface |
| `proposals-page/*` (recipient inbox) | Explicitly unaffected | Recipient-side (sibling plan) |

### Routes / APIs

| Route | Impact | Reason |
|---|---|---|
| `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | Explicitly unaffected | Readiness runs above this |
| `/share/[token]` + `/api/share/[token]/*` | Verification only | Decision path gets `responded` side-effect; no contract change |
| Manager Server Actions (`createProjectPublication`, `republishProjectPublication`, `addSharedLinkRecipients`, `resendSharedLinkRecipientEmail`) | Required | New gate + message fields |

### Services / libs

| Lib | Impact |
|---|---|
| `src/lib/proposal-readiness/` | **Required (NEW)** |
| `src/lib/proposal-export/` | Verification only (reuse helpers) |
| `src/lib/publication/actions.ts` | Required (gate + message + notification calls) |
| `src/lib/publication/d1-store.ts` | Required (`submitClientResponse` `responded` flip) |
| `src/lib/publication/public-repository.ts` | Required (`submitSharedLinkDecision` `responded` flip) |
| `src/lib/publisher/drawer-actions.ts` | Probable (extend drawer data with readiness) |
| `src/lib/publisher/roster-repository.ts` | Verification only (reuse staleness) |
| `src/lib/notifications/` | Required (FR-08 dispatch + insert) |
| `src/lib/email/*` | Verification only (call site changes) |
| `src/lib/legal/*` | Verification only (terms link only) |

### Database / migrations

| Object | Impact |
|---|---|
| `migrations/0037_shared_link_recipients_invitation_message.sql` | **Required (NEW, additive)** per DEC-02 |
| `shared_link_recipients` | Add 2 nullable columns |
| `project_publications` | Explicitly unaffected |
| `notification_deliveries`/`notification_definitions` | DISCOVERY-REQUIRED (DATA-04) |

### Background jobs / queues

No background jobs touched. Owner digest (existing) reused for notification throttling. No queue changes.

### Integrations / network

| Integration | Impact |
|---|---|
| Cloudflare Email Service | Verification only (message content change only) |
| Cloudflare D1 | Additive migration |
| R2 / Durable Objects / Queues / Cron | Explicitly unaffected |

### Caches / state

- React Query drawer key gains a readiness block (no new key). Invalidation unchanged (`refreshPublisherSurface`).
- Zustand `useEstimateHeaderActionsStore` unchanged (v1.1 may add a CTA registration, optional).

### Auth / authz

- `assertProjectPublicationManager` reused. `canReadPublisherRosterProject` reused. No new auth path.

### Tests

| Test area | Impact |
|---|---|
| New: `tests/vitest/proposal-readiness/*.test.ts` | Required (TEST-01/02/03/14) |
| New: `tests/vitest/publication/*.test.ts` extensions | Required (TEST-04/07/10/15) |
| New: `tests/vitest/notifications/*.test.ts` | Required (TEST-11) |
| New: DOM tests for drawer/composer/dialog | Required (TEST-05/06/08/09/12/13) |
| New: `tests/vitest/perf/proposal-readiness.bench.test.ts` | Required (PERF-01) |
| Existing publication/publisher tests | Verification only (regression) |

### Documentation

| Doc | Impact |
|---|---|
| `.ai/10_state/current-state.md` | Required (DOC-01, append entry on completion) |
| `.ai/10_state/decisions.md` | Required (DEC-01, DEC-02 entries) |
| User-facing help (optional) | Possible (P2 tooltip explaining honest delivery labels) |

### Existing features

- Export XLSX path: unchanged behavior; gains readiness warnings in the dialog (additive).
- Publisher drawer: gains Preflight panel (additive); existing tab order preserved.
- Recipient inbox: unchanged (recipient-side).
- Collaboration/RBAC: unchanged.

### Backward compatibility

- Migration is additive + nullable → zero downtime.
- Server Action input additions are optional → existing callers unaffected.
- `delivery_status='responded'` is a new write but the value already exists in the CHECK → existing readers (composer chips, roster) already handle it.
- Feature flags (OPS-01) allow dark-ship + instant rollback (OPS-02).

### Other active development

- Sibling plan prompts (deliverable-trust, public-share-activity-minimization, recipient-inbox-IA, etc.) are **not yet implemented**. This pack's scope is chosen to not collide: it touches owner-side readiness + message + dispatch + `responded`; the deliverable-trust pack owns export integrity (hashing/immutable archive). If the deliverable-trust pack lands first, its integrity layer wraps the same XLSX this pack readies — no conflict.

## Parallelization classification (implementation)

| Workstream | Classification | Reason |
|---|---|---|
| `proposal-readiness` lib + unit tests | Parallel-safe (new module, no shared file) | Independent |
| Migration `0037` | Sequential after latest migration; parallel-safe otherwise | Additive |
| `responded` flip in `d1-store` + `public-repository` | Parallel-safe (different functions) | Independent txn additions |
| Owner message plumbing (`actions.ts` + composer + email builder) | Sequential within itself (shared `actions.ts` file) | Shared-file |
| Notification dispatch (`notifications/` + `actions.ts` call sites) | Sequential vs owner-message (shared `actions.ts`) | Shared-file |
| Drawer Preflight UI + DOM tests | Parallel-safe after readiness DTO exists | Depends on DTO |
| Export-dialog readiness hints + DOM tests | Parallel-safe after readiness DTO exists | Depends on DTO |
| Perf bench | Parallel-safe after readiness lib exists | Depends on lib |

Dependency graph:

```
[FR-01 readiness lib] ─┬─► [FR-04 gate in actions.ts] ─┬─► [UX-01 drawer preflight]
                       ├─► [UX-02 export-dialog hints]   ├─► [FR-09 resend/revoke gating]
                       └─► [PERF-01 bench]               └─► [TEST-04]

[DATA-04 discovery] ──► [FR-08 notification dispatch] ──► [TEST-11]

[FR-07 responded flip in d1-store/public-repository] ──► [TEST-10, TEST-15]

[DATA-02 migration 0037] ──► [FR-05 owner message in actions.ts + composer + email] ──► [TEST-07, TEST-08]
```

Critical path: **FR-01 → FR-04 → UX-01** is the spine; everything else fans out.
