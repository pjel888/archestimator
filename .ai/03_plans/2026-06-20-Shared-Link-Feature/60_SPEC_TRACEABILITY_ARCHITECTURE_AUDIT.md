# Shared Link / Publication Feature Architecture Audit

Date: 2026-06-20

Scope:
- `.ai/06_specs/walkthrough-shared-link-overhaul.md`
- `.ai/06_specs/proposal-package-system.md`
- `.ai/10_state/decisions.md`
- `.ai/10_state/current-state.md`
- `.ai/09_archive/store/2026-05-27-project-client-publication-complete/`
- `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/`
- `src/app/share/[token]/`
- `src/app/api/share/[token]/`
- `src/components/share/`
- `src/components/workshop/publication/`
- `src/lib/publication/`
- `src/lib/share/`
- `supabase/migrations/`

Evidence note:
- Direct evidence is cited as `path:line-range`.
- When I rely on absence from repo scan, I mark it as indirect evidence.
- I did not edit source code or run browser automation.

## 1. Intended architecture summary from specs/archive

The intended V2 shared-link architecture is a production-grade split between:
- a manager-facing publication modal on the project page, and
- a client-facing receiver dashboard at `/share/[token]`.

V2 is explicitly described as replacing the original V1 "Public link" with recipient management, tabbed navigation, client comments and decisions, owner activity feeds, email digests, security hardening, error resilience, and testing (`.ai/06_specs/walkthrough-shared-link-overhaul.md:10-18`).

The archived implementation plan says the receiver dashboard should include:
- cost donut chart,
- Tree View / Grid Preview sub-tabs,
- a floating navigation rail with IntersectionObserver behavior,
- comments and decision controls,
- and owner notifications via Resend (`.ai/06_specs/proposal-package-system.md:38-50`, `.ai/06_specs/walkthrough-shared-link-overhaul.md:152-157`).

The manager modal in the archive is a five-tab surface:
- Link, Sheets, Access, Recipients, Activity,
- with owner-only full activity feed and recipient email delivery/resend (`.ai/06_specs/walkthrough-shared-link-overhaul.md:21-44`, `.ai/06_specs/walkthrough-shared-link-overhaul.md:82-158`, `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/08-api-routes-and-server-actions-plan.md:117-160`, `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/08-api-routes-and-server-actions-plan.md:224-237`).

Security intent in the archive:
- token hash -> optional password gate -> immutable snapshot -> optional recipient session -> read-only receiver UI with comments/decisions,
- 15-minute lockout after 5 password failures,
- enforced CSP on `/share/:path*`,
- and three hardening headers on share routes (`.ai/06_specs/walkthrough-shared-link-overhaul.md:169-188`, `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/05-security-privacy-auth-plan.md:29-68`, `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/05-security-privacy-auth-plan.md:72-110`, `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/05-security-privacy-auth-plan.md:126-161`).

Project memory also records the V1 baseline as a simple public link and the V2 completion as a separate shared-link surface (`.ai/10_state/current-state.md:793-794`, `.ai/10_state/current-state.md:865-868`, `.ai/10_state/decisions.md:793-794`, `.ai/10_state/decisions.md:865-868`).

## 2. Current architecture summary from source

The current receiver route is `src/app/share/[token]/page.tsx`. It renders a single-column share page with:
- recipient session initialization,
- session banner,
- proposal header,
- summary card,
- decision controls,
- hero image,
- estimate tabs,
- comments,
- and a footer (`src/app/share/[token]/page.tsx:74-97`, `src/app/share/[token]/page.tsx:131-260`).

The manager-facing publication modal lives in `src/components/workshop/ProjectPublicationHeader.tsx`. It currently implements a five-tab modal:
- Link,
- Estimates,
- Access,
- Recipients,
- Activity,
- plus link controls, expiry/password controls, and the recipient composer (`src/components/workshop/ProjectPublicationHeader.tsx:305-307`, `src/components/workshop/ProjectPublicationHeader.tsx:605-900`).

The receiver-side estimate navigator is `src/components/share/SharePageTabs.tsx`. It currently implements:
- per-sheet donut aggregation,
- Tree View / Grid Preview sub-tabs,
- horizontal estimate tabs with roving tabindex,
- tree reconstruction,
- a hidden desktop tree panel alongside the main tree view,
- and a grid search/table fallback (`src/components/share/SharePageTabs.tsx:82-85`, `src/components/share/SharePageTabs.tsx:269-551`, `src/lib/share/reconstruct-share-tree.ts:81-195`, `src/lib/share/aggregate-share-chart-buckets.ts:37-89`).

Comments and decisions are implemented as client-side gated interactions:
- comments require a valid recipient session, same-origin POST, CSRF headers, snapshot-version validation, sanitize/truncate, and per-recipient rate limits (`src/app/api/share/[token]/comment/route.ts:134-334`, `src/components/share/SharePageComments.tsx:38-280`).
- decisions require a valid recipient session, same-origin POST, snapshot-version validation, allowed decision types, and per-recipient rate limits (`src/app/api/share/[token]/decision/route.ts:69-241`, `src/components/share/SharePageDecision.tsx:66-280`).

Activity is split into two paths:
- a public-safe filtered activity route for recipient/public views (`src/app/api/share/[token]/activity/route.ts:27-29`, `src/app/api/share/[token]/activity/route.ts:80-265`), and
- an owner-only server action that loads the full feed including internal items (`src/lib/publication/actions.ts:1270-1483`, `src/components/share/SharedLinkActivityFeed.tsx:14-95`).

Snapshot and security plumbing are in place:
- publication snapshot types include schema version 1 / 1.2, tree nodes, tabs, cover image, and row metadata (`src/lib/publication/types.ts:10-44`, `src/lib/publication/types.ts:51-117`),
- public-read sanitization strips unsafe/legacy data before exposure (`src/lib/publication/snapshot.ts:112-133`, `src/lib/publication/snapshot.ts:265-293`),
- and `next.config.ts` applies enforced CSP/hardening to `/share/:path*` plus security headers to share API routes (`next.config.ts:11-45`, `next.config.ts:108-152`, `next.config.ts:168-205`).

Recipient management is implemented end-to-end in the manager lane:
- list/add/resend/remove recipient actions,
- best-effort Resend dispatch,
- and owner digest triggering (`src/lib/publication/actions.ts:967-1483`, `src/components/workshop/publication/RecipientEmailComposer.tsx:16-25`, `src/components/workshop/publication/RecipientEmailComposer.tsx:81-117`, `src/components/workshop/publication/RecipientEmailComposer.tsx:146-260`).

## 3. Traceability matrix

| Requirement / capability | Implemented evidence | Gaps / non-working risk | Severity |
|---|---|---|---|
| Immutable public snapshot with optional password gate and access cookie | `src/app/share/[token]/page.tsx:139-170`, `src/lib/publication/actions.ts:504-565`, `src/lib/publication/security.ts:328-372` | No functional gap found. Current route still resolves snapshot, gates on password cookie, and derives a view token from snapshot version. | OK |
| Recipient session bootstrap for `?recipient=` links and subsequent session reuse | `src/app/share/[token]/page.tsx:172-209`, `src/app/api/share/[token]/session/route.ts:38-113`, `src/lib/publication/security.ts:375-510` | No functional gap found. Session cookie is additive to password access and is cleared by DELETE. | OK |
| Commenting and decision workflows bound to recipient identity, CSRF, snapshot version, and rate limits | `src/app/api/share/[token]/comment/route.ts:185-334`, `src/app/api/share/[token]/decision/route.ts:124-241`, `src/components/share/SharePageComments.tsx:57-280`, `src/components/share/SharePageDecision.tsx:82-280` | No functional gap found. Routes reject invalid session/view tokens and sanitize/truncate input. | OK |
| Manager recipient email management and resend flow | `src/components/workshop/ProjectPublicationHeader.tsx:885-900`, `src/components/workshop/publication/RecipientEmailComposer.tsx:81-117`, `src/components/workshop/publication/RecipientEmailComposer.tsx:146-260`, `src/lib/publication/actions.ts:967-1267` | No functional gap found. Recipient rows, resend rotation, and removal are present. | OK |
| Owner activity feed with internal comments plus notifications/digest | `src/lib/publication/actions.ts:1270-1483`, `src/app/api/share/[token]/activity/route.ts:27-29`, `src/components/share/SharedLinkActivityFeed.tsx:14-95` | Feed exists, but current client refresh is focus/visibility based rather than push/live. Digest trigger is present. | P2 |
| Receiver-side floating navigation rail / sticky section nav from archive | Spec: `.ai/06_specs/proposal-package-system.md:38-46`, `.ai/06_specs/walkthrough-shared-link-overhaul.md:152-157`; current: `src/components/share/SharePageTabs.tsx:310-551`, `src/components/share/SharePageTabs.tsx:533-549` | Indirect evidence: repo-wide source scan did not return `src/components/share/ShareFloatingTreeNav.tsx`. Current UI uses tree/grid sub-tabs and a tree panel, not a sticky floating rail. | P3 |
| Share route and share API security headers / CSP hardening | `next.config.ts:108-152`, `next.config.ts:168-205` | No functional gap found in current source. Share routes have enforced CSP and the expected hardening headers. | OK |
| Notification / rate-limit durability | `src/lib/publication/actions.ts:1284-1294`, `src/lib/publication/actions.ts:1471-1483`, `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/COMPLETION-REPORT.md:48-48`, `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/COMPLETION-REPORT.md:119-119` | In-memory only; resets on restart and is per-process. Fine for a single-node beta, but not durable for scale-out. | P3 |

## 4. Architectural findings

| ID | Severity | Evidence | Impact | Recommendation | Verification needed |
|---|---|---|---|---|---|
| SHF-01 | P2 | `src/components/share/SharedLinkActivityFeed.tsx:25-95`, `src/components/share/SharedLinkActivityFeed.tsx:81-95`, `.ai/06_specs/walkthrough-shared-link-overhaul.md:117-121` | The feed only refreshes on mount, focus, and visibility changes. The intended architecture called for live/realtime updates, so owners can miss new comments/decisions until they switch tabs or refocus the window. | Add a live update mechanism on top of the existing owner server action, or explicitly update the spec/archive to state that focus-triggered refresh is the intended V2 behavior. Keep the public filtered route unchanged. | Browser-level proof that new activity appears without manual refresh; unit/integration coverage for the owner feed update path. |
| SHF-02 | P3 | `.ai/06_specs/walkthrough-shared-link-overhaul.md:29-32`, `.ai/06_specs/walkthrough-shared-link-overhaul.md:152-157`, `.ai/06_specs/proposal-package-system.md:38-46`, `src/components/share/SharePageTabs.tsx:321-351`, `src/components/share/SharePageTabs.tsx:533-549` | The archived V2 receiver UX includes a sticky floating navigation rail. Current source instead ships tree/grid sub-tabs and a hidden desktop tree panel. That is a real architecture mismatch, and the repo scan did not find a `ShareFloatingTreeNav` implementation file. | Decide whether the floating rail is still required. If yes, implement it on the current receiver dashboard. If not, update the spec/archive so future work does not treat the missing rail as debt. | Desktop browser QA for large viewports and a component test that asserts section navigation / active-section highlighting. |
| SHF-03 | P3 | `src/lib/publication/actions.ts:1284-1294`, `src/lib/publication/actions.ts:1471-1483`, `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/05-security-privacy-auth-plan.md:72-110`, `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/COMPLETION-REPORT.md:48-48` | Digest throttling and related in-memory rate limiting reset on process restart and do not coordinate across workers/instances. That is acceptable for a closed-beta single-node deployment, but it will duplicate or under-throttle once the app scales horizontally. | Keep for beta only if single-process deployment is guaranteed. If scale-out is planned, move the throttling state to a durable store (DB row or Redis) behind the existing helper API. | Restart test plus a multi-worker / multi-instance simulation that proves a digest is not emitted twice inside the rate window. |

## 5. Proposed upgrade sequencing

1. Resolve the receiver-navigation contract first.
   - Decide whether the floating rail is still part of the intended V2 surface or whether the current tree/grid pattern is the new canonical design.
   - Dependency: this choice controls whether the spec/archive or the code should move.
   - Conflict risk: any parallel UI lane touching `src/components/share/SharePageTabs.tsx` or the receiver dashboard can easily reintroduce the wrong navigation model.

2. Add realtime activity updates on top of the existing owner/public split.
   - Keep the public filtered route and the owner-only server action separate.
   - Dependency: the owner feed must preserve `is_internal` visibility rules while the public route stays privacy-filtered.
   - Conflict risk: if a lane "simplifies" the feed to one endpoint, it can leak internal comments or regress recipient visibility.

3. Promote in-memory throttling/digest state only if the deployment model needs it.
   - Dependency: this should follow the live-update decision because the same activity domain owns both notification and feed freshness.
   - Conflict risk: moving the state too early can complicate beta delivery without changing user-visible behavior.

4. Reconcile the archive/spec names with actual source ownership.
   - `ProjectPublicationHeader` currently owns the manager modal tabs; `SharePageTabs` owns the receiver estimate UI.
   - Dependency: without that mapping, future audits will keep misrouting work to the wrong file.
   - Conflict risk: documentation-only work can drift from the code if another lane is renaming the same surfaces.

## 6. Handoffs / conflicts for other lanes

- UI lane: confirm whether the missing floating nav is a real product gap or an obsolete archive requirement. If it is still required, this is a direct implementation task in the receiver dashboard.
- Backend lane: implement or reject realtime activity updates. The current feed and notification logic are already split cleanly enough to extend without a schema rewrite.
- Infrastructure lane: decide whether digest/rate-limit state remains in-memory for beta or moves to a durable store before scale-out.
- Docs lane: update the spec/archive to reflect the current file ownership split (`ProjectPublicationHeader` for manager modal, `SharePageTabs` for receiver estimate views) if that split is intentional.
- Coordination note: I did not observe conflicting source edits in the files I inspected, but if another agent is modifying any of the share/publication files listed above, treat this report as the current-state baseline and avoid overlapping edits until the contract is settled.

