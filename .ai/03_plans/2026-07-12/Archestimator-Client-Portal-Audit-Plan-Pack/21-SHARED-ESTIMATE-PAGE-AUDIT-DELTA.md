# 21 — Shared Estimate Page Audit Delta

## 1. Purpose and authority

This artifact consolidates the useful evidence from the superseded `Shared-Estimate-Page` audit into the newer Client Portal plan. It is a semantic merge, not a wholesale copy.

Authority order:

1. current source at `6b59648a70c485cd54bad8f3659b3ec454621530`;
2. repository policy and the current planning prompt suite;
3. this Client Portal pack;
4. the archived Shared Estimate pack as historical audit evidence.

The older pack's `COMPLETE/ACHIEVED` tuple described completion of its audit artifact. It does not prove that its remediation backlog was implemented and is not inherited by this active implementation plan.

## 2. Merge decisions

### DEC-AUTO-024 — Consolidate by evidence delta

- **Options:** copy all older files; preserve only a pointer; source-review and merge only decision-relevant findings.
- **Decision:** source-review and merge only decision-relevant findings.
- **Reason:** the newer pack already supersedes the older product model. Copying eleven files would create duplicate execution authority and stale findings; a pointer alone would lose important implementation evidence.
- **Confidence:** high.
- **Revision trigger:** a retained archived finding is shown to have no canonical requirement/unit mapping.

### DEC-AUTO-025 — Treat estimate variants as a non-gap

- **Decision:** do not add estimate-level variant/alternate/scenario scope to the Client Portal.
- **Evidence:** the current estimate publication model supports estimate sheets and estimate tabs; component-library price-option variants belong to the Workshop Library domain.
- **Consequence:** a future true estimate-scenario feature needs its own dated plan and blast-radius audit.
- **Confidence:** high.

### DEC-AUTO-026 — Retire obsolete issuance finding

- **Decision:** remove the old `BUG-9` claim that issuance metadata is dead/aspirational.
- **Evidence:** `src/components/share/SharePageSummaryCard.tsx` renders issue number, version, issued date, scope, and validity from `snapshot.issuance`; `src/lib/publication/types.ts` carries the issuance contract.
- **Consequence:** preserve issuance display as reusable current behavior under `REQ-020`, `REQ-023`, and `UNIT-007/013`; do not schedule a duplicate repair.
- **Confidence:** high.

## 3. Retained findings and canonical ownership

| Older finding | Current source disposition | Canonical requirements | Canonical units | Merge result |
|---|---|---|---|---|
| GAP-1 node/area commenting absent | Still valid: target unions and D1 checks remain `proposal|estimate|row` | REQ-024, REQ-027 | UNIT-004, UNIT-008, UNIT-011 | Retained as typed `node` target plus thread UX |
| GAP-2 tree-view row commenting absent | Still valid: current tree rows do not expose the collated-row target affordance | REQ-024 | UNIT-007, UNIT-008, UNIT-011 | Retained as focus/hover Discuss action and active-target sync |
| BUG-1 cross-widget stale activity | Still relevant during legacy transition | REQ-005, REQ-028 | UNIT-011, UNIT-015 | Retained; mutations must update/invalidate thread, activity, unread, and next-action views |
| BUG-2 silent degradation above 500 rows | Still valid: reconstruction/store limits remain present | REQ-002, REQ-029 | UNIT-006, UNIT-008 | Retained; every published row must remain reachable without silent fallback loss |
| BUG-3 no decision undo/change and weak draft continuity | Product direction remains valid, implementation shape changes | REQ-004, REQ-023, REQ-048, REQ-055 | UNIT-013 | Superseding append-only decision/void model; optional draft persistence is local UX, not record mutation |
| SEC-1 public HTML cache policy unproven | `force-dynamic` exists; explicit hosted HTML/header proof is still absent | REQ-046 | UNIT-006, UNIT-020 | Retained as hosted release proof; not claimed complete locally |
| PERF-1 unbounded expanded tree DOM | Still plausible; current caps and expand behavior require measurement | REQ-002, REQ-058 | UNIT-008, UNIT-019 | Retained as pagination/virtualization design plus `TEST_PROPOSAL`; no benchmark run authorized |
| ACT-1 recipient activity surface absent/insufficient | Current activity primitives exist but target portal surface remains part of the new design | REQ-005, REQ-006, REQ-031 | UNIT-015, UNIT-017 | Retained as typed client-safe Activity section, not a raw internal feed |
| UX-1 implicit target | Still relevant | REQ-024 | UNIT-007, UNIT-011 | Retained through active-target highlight, deep link, context rail, and explicit composer label |
| UX-2/3/7/8 threading, resolution, filtering, anchor indicators | Still valid and directly supported by official Figma behavior | REQ-012, REQ-027, REQ-028 | UNIT-011, UNIT-012 | Retained as first-release discussion model |
| UX-4 edit/delete | Partially retained | REQ-026 | UNIT-011, UNIT-012 | Message edit window plus audited tombstone; no destructive history erasure |
| UX-5 mentions | Useful but not critical to initial data boundary | REQ-012 | UNIT-011 | Included after core thread/reply/resolve semantics within the same unit if bounded |
| UX-6 attachments/rich text | Security/processing expansion | Deferred | Deferred P2 | Not required for first release; plaintext first |
| UX-9/10 unread and notifications | Still valid | REQ-028, REQ-042 | UNIT-011, UNIT-015 | Retained |
| DEC-4 multi-stakeholder decision | New pack covers required approvers while deferring ordered/quorum workflows | REQ-034, REQ-055 | UNIT-010, UNIT-013 | Constrained first release; advanced workflow later |
| DEC-5 RFI first-class record | Structured work-item research is useful but a separate RFI domain is premature | REQ-012, REQ-024 | UNIT-011 | Use typed threads/status/target now; no separate RFI table in MVP |
| DEC-6 per-section reviewed state | Useful but distinct from formal approval | REQ-023, REQ-024 | UNIT-011, UNIT-013 | Discussion/status may track review; formal decision remains issue-wide |
| DEC-7 decision record visibility | Still valid | REQ-023, REQ-055 | UNIT-013, UNIT-015 | Retained as explicit issue/amount/currency/scope/actor/time receipt |
| PERF-2 large SSR snapshot | Valid monitoring concern | REQ-002, REQ-024 | UNIT-006, UNIT-008 | Resolved architecturally by manifest + lazy section reads, not a premature micro-fix |
| PERF-3 duplicate snapshot reads | Legacy optimization, superseded by repository redesign | REQ-047 | UNIT-005, UNIT-006 | Do not optimize old flow before new issue builder/repository boundary exists |
| BUG-5 dead `activeNodeId` | Still valid | REQ-024 | UNIT-007, UNIT-008 | Retained as part of active-target synchronization |
| BUG-7 blocking password backoff | Remains a Worker reliability concern | REQ-046 | UNIT-006, UNIT-020 | Replace blocking delay with durable rate-limit semantics during route hardening |
| SEC-2 runtime snapshot shape validation | Still relevant | REQ-044, REQ-047 | UNIT-004, UNIT-005, UNIT-006 | Retained through versioned section schemas and reject/compatibility behavior |
| SEC-3 client-provided view token soft binding | Keep as defense-in-depth review item | REQ-032, REQ-046 | UNIT-003, UNIT-006, UNIT-020 | Policy/session authority must not trust client-only evidence |

## 4. Superseded or excluded findings

| Older item | Disposition | Reason |
|---|---|---|
| BUG-9 issuance metadata dead | Superseded | Current summary UI renders issuance/version/validity |
| Flat-comment-specific schema prescriptions | Superseded | New canonical model separates threads and messages rather than extending one flat comment row indefinitely |
| Directly optimize legacy `project_publications` JSON | Superseded | Stable portal + immutable issue architecture replaces the overloaded lifecycle |
| Arbitrary rich text/attachments in first release | Deferred | Adds sanitization, asset auth, retention, quota, and malware-processing scope before core discussion proof |
| Live chat/realtime as source of truth | Rejected | Durable D1 threads/messages remain authoritative; realtime may notify only |
| Estimate variants/alternates/scenarios | N/A | No current estimate-level variant domain exists; estimate tabs already flow through publication |
| Audit-stage `implementation_status: COMPLETE` | Not inherited | It proves the old planning audit artifact, not this plan's implementation |

## 5. Product-design synthesis

The retained target experience is a professional cost-review workspace and trust instrument, not a generic dashboard or chat app.

- Use the full browser canvas for navigation, cost trees, tables, comparisons, and contextual discussion while keeping prose locally measure-limited.
- Preserve the current document/paper tone where it helps proposal trust; use layout width and interaction structure rather than decorative dashboard chrome.
- Keep the estimate hierarchy, financial view, and discussion target synchronized so the client always understands what a number or comment refers to.
- Surface issue identity, scope, amount, currency, recipient context, and permanence at the decision boundary.
- Keep one controlled mobile action surface for discussion and formal response; the current desktop-only sticky decision bar is not sufficient.
- Make charts supplemental: expose an accessible table/equivalent and never rely on color alone.
- Use anchored thread counts, reply, resolve/reopen, unread, filtering, and deep links. Figma's current official comment model validates this interaction family; Procore's current Correspondence model validates typed status, permissions, related records, and action ownership for AEC workflows.

## 6. Source-fresh facts confirmed during consolidation

- `ShareReviewTargetKind` remains `proposal|estimate|row`; node targets are not implemented.
- D1 publication comment/response checks remain `proposal|estimate|row` in migration `0066`.
- `SharePageTabs.tsx` still passes `activeNodeId={undefined}`.
- `ShareEstimateTreePanel.tsx` and `SharePageTabs.tsx` retain 250-row display caps; publication activity reads retain 500-row bounds.
- `StickyDecisionBar.tsx` remains hidden below `sm`.
- the public page is `force-dynamic`, while hosted HTML/header proof remains uncollected.
- issuance/version metadata is implemented in `SharePageSummaryCard.tsx`.
- the current GitNexus index was 173 commits stale; the repo-safe reindex correctly refused an unpinned registry fallback, so no current-code claim depends on stale graph output.

## 7. Test authorization boundary

No automated test, build, browser automation, screenshot, benchmark, or hosted check was run. The implementation pack records proposals in `16-QUALITY-TEST-RELEASE-AND-OPERATIONS.md`; execution requires an explicit current-task `TEST_TASK`.

## 8. Completion result

Every retained Shared Estimate finding now has one canonical requirement/unit owner or an explicit defer/reject disposition. No older file remains an execution authority, and no obsolete status or product assumption is carried into the active pack.
