# 15 — Decisions, Assumptions, and Alternatives

> **PASS-3 OWNER DECISIONS APPLIED (2026-06-26).** Philip's Phase 0 calls are now resolved in this document and propagated through the plan pack: D-ARCH-05 uses a DB-level rotate serialization lock, D-ARCH-06 rejects same-publication concurrent mutations instead of silently queueing them, D-ARCH-07 confirms a 50-recipient per-action cap, D-ARCH-08 bumps `snapshot_version` on sheet-scope save without invalidating the separate access cookie, D-SEC-05 keeps DPoP as Phase 5+ incident/scale-triggered research only, and D-OPS-01 selects `Referrer-Policy: no-referrer` for `/workshop/:path*`.

> **PASS-2 AUDIT BANNER (2026-06-25), superseded by PASS-3 decisions above for D-ARCH/D-SEC/D-OPS items.** Pass 2 added the following decision prompts from `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md`; they are no longer open:
>
> - **D-ARCH-05 · Rotate-token race handling.** Resolved: DB-level per-publication rotate serialization/lock; no UX-only last-write-wins acceptance. (ARCH-DEFECT-03)
> - **D-ARCH-06 · Optimistic mutation queueing.** Resolved: reject concurrent same-publication mutations with disabled controls and a wait toast; do not silently queue. (ARCH-DEFECT-15)
> - **D-ARCH-07 · FR-07 recipient cap.** Resolved: 50 recipient inputs per add/remove action. (ARCH-DEFECT-05)
> - **D-ARCH-08 · FR-09 snapshot_version behavior on sheet change.** Resolved: sheet-scope save bumps `snapshot_version`, access cookies remain valid, receiver view-token state refreshes. (ARCH-DEFECT-11)
> - **D-SEC-05 · DPoP / token-binding evaluation.** Resolved: Phase 5+ incident/scale-triggered research only; no DPoP implementation now. (OWASP-GAP-07)
> - **D-OPS-01 · Referrer-Policy for /workshop/*.** Resolved: set `Referrer-Policy: no-referrer` on `/workshop/:path*`. (ARCH-DEFECT-09)
>
> Plus 6 plan-author corrections to assumptions A4, A5, A8, A10: see doc 18_ FAB-A05 (service-role claim), FAB-A09 (workspace-repository size), FAB-A11 (ListSummary type too narrow), FAB-A16 (AI tables out-of-scope), FAB-A07 (fabricated branch), FAB-A08 (current branch).

---

## ADR-style decisions

### D-ARCH-09 · Remove Publisher flag-off rollback path
- **Date.** 2026-06-26.
- **Problem.** WP-4.3 still required deletion of `ProjectPublicationHeader` and `ProjectTeamspaceHeader`, but the implementation retained them behind the flag-off rollback path.
- **Decision.** Under Philip's 2026-06-26 delegated blocker-resolution authority, remove the flag-off rollback path and make the project header chrome use Publisher project/access deep-links directly.
- **Rejected.** Keep the rollback branch until a later release window — it kept dead modal code and tests alive after Publisher drawer feature parity was locally verified.
- **Consequences.** `ARCHESTIMATOR_PUBLISHER_ENABLED` is no longer part of the Publisher release path; legacy header files and their tests are deleted.
- **Validation.** Source reference scan found no runtime/source references; the focused rollback-removal suite passed 8 files / 68 tests; the broader Publisher DOM matrix passed 19 files / 174 tests; `bun run type-check`, scoped ESLint, and `git diff --check` passed.
- **Status.** RESOLVED.

### D-QA-01 · Manual accessibility signoff re-scope
- **Date.** 2026-06-26.
- **Problem.** The original validation strategy asked for manual screen-reader / owner signoff, but this execution environment cannot produce genuine VoiceOver, NVDA, JAWS, or human assistive-technology proof.
- **Decision.** Under Philip's 2026-06-26 delegated blocker-resolution authority, re-scope the gate to agent-run automated accessibility evidence for this local readiness run.
- **Scope.** Axe critical-violation smoke, keyboard drawer open/close, focus return, DOM accessibility contracts, and feed-article keyboard focusability.
- **Limitation.** Do not call this VoiceOver/NVDA/human screen-reader proof.
- **Validation.** Publisher Playwright e2e passed 4 Chromium specs including the accessibility smoke; activity feed DOM tests passed after adding `tabIndex={0}` to feed articles; the re-scope artifact is `.ai/99_scratch/publisher-external-gates/manual-accessibility-rescope-2026-06-26.md`.
- **Status.** RESOLVED FOR LOCAL RELEASE READINESS.

### D-ARCH-01 · Publisher as a route, not a modal
- **Problem.** Where should the unified publication/RBAC management surface live?
- **Constraints.** Existing modals (`ProjectPublicationHeader`, `ProjectTeamspaceHeader`) are project-scoped and not deep-linkable; users need a workspace-wide view.
- **Options considered.**
  - (a) Top-level route `/workshop/publisher` (RSC). **CHOSEN.**
  - (b) Project-scoped route `/workshop/projects/[id]/publisher`.
  - (c) Modal in the project page header.
  - (d) Both (a) and (b).
- **Advantages of chosen.** Deep-linkable; scalable; allows Phase 4 modal consolidation; server-rendered (RLS-safe).
- **Disadvantages.** None material.
- **Security implications.** Server-rendered RSC enforces RLS at the route boundary.
- **Performance implications.** RSC avoids client bundle bloat; better TTFB.
- **Operational implications.** Standard Next.js route deployment.
- **Recommended option.** (a), with project pages deep-linking to `/workshop/publisher?project=<id>` rather than adding route (b) in Phase 1-3.
- **Reason.** Workspace-wide view is the unmet need; project page already has a modal.
- **Consequences.** Sidebar needs a Publisher item (FR-17).
- **Conditions that would change.** If users overwhelmingly expect Publisher at project scope, add (b).

### D-ARCH-02 · RSC roster, not client-side fetch
- **Problem.** How should the roster fetch privileged publication data?
- **Options.**
  - (a) RSC fetches via repository layer; client receives filtered slice. **CHOSEN.**
  - (b) Client fetches via TanStack Query against `/api/publisher/roster`.
  - (c) Client fetches privileged superset, filters in browser.
- **Recommended.** (a).
- **Reason.** Prevents privilege escalation via client-side filter (SEC-05); smaller client bundle; better TTFB.
- **Rejected: (c)** — security risk.

### D-ARCH-03 · Application-layer loop for roster, not new RPC (Phase 1)
- **Problem.** Should Phase 1 add a `workspace_publications_summary` RPC?
- **Options.**
  - (a) Application-layer loop over existing per-project rollup. **CHOSEN for Phase 1.**
  - (b) New RPC.
- **Recommended.** (a) first; (b) only if PERF-01 fails.
- **Reason.** Avoid premature RPC work; current N (projects per workspace) is small in closed beta.
- **Conditions that would change.** Workspace with 50+ projects measured slow.

### D-ARCH-04 · Server actions only, no new HTTP API (Phase 1)
- **Problem.** Should Phase 1 add `/api/publisher/*` endpoints?
- **Options.**
  - (a) Server actions only. **CHOSEN for Phase 1.**
  - (b) HTTP API.
- **Recommended.** (a).
- **Reason.** Existing server actions cover all needed mutations; no new public attack surface.
- **Conditions that would change.** External integration (Zapier, Make) requests an HTTP API.

### D-DESIGN-01 · Drawer vs full-page detail
- **Problem.** Where should the publication detail surface live?
- **Options.**
  - (a) Right-side slide-over drawer on wide viewports; full page on narrow. **CHOSEN.**
  - (b) Full page `/workshop/publisher/[id]`.
  - (c) Modal.
- **Recommended.** (a).
- **Reason.** Preserves roster context; faster perceived latency (no navigation); responsive.
- **Conditions that would change.** If drawer feels cramped at 1024px, fall back to (b).

### D-UX-01 · Workspace-first roster with project drill-down
- **Problem.** Should the roster default to workspace or project scope?
- **Options.**
  - (a) Workspace-first; project filter via URL param. **CHOSEN.**
  - (b) Project-first; user picks project.
- **Recommended.** (a).
- **Reason.** Solves the "I have to flip between projects" pain.

### D-UX-02 · Default sort by latest activity
- **Problem.** How should roster rows be ordered?
- **Options.**
  - (a) `latestActivityAt desc nulls last`. **CHOSEN.**
  - (b) `publishedAt desc`.
  - (c) `projectName asc`.
- **Recommended.** (a).
- **Reason.** Triage efficiency — most-pressing publications surface first.

### D-UX-03 · Modal coexistence Phase 1–3
- **Problem.** Should Phase 1 deprecate the existing modals?
- **Options.**
  - (a) Coexist Phase 1–3; consolidate Phase 4. **CHOSEN.**
  - (b) Deprecate immediately on Phase 1.
- **Recommended.** (a).
- **Reason.** Avoid breaking existing muscle memory; Phase 4 consolidation is gated by Publisher drawer feature parity.

---

## Resolved product decisions

Resolved for the Publisher Page plan pack on 2026-06-25.

### D1 · Recipient edit-grant capability model
- **Question.** Should recipients be able to edit estimate sheets, or only view/comment/decide?
- **Current state.** Recipients have view + comment + decision (bundled). No edit capability.
- **Options.**
  - (a) Keep bundled (view+comment+decision); no edit. **CHOSEN for MVP.**
  - (b) Add per-recipient capabilities column (`view`, `comment`, `decision`, `edit`).
- **Answer.** Use (a): keep the existing bundled recipient behavior for MVP. Recipients can view, comment, and decide; they cannot edit estimate sheets.
- **Decision.** No `shared_link_recipients.capabilities` column in Phase 1, Phase 2, or Phase 3. Keep DATA-04 as a Phase 5+ escape valve only.
- **Effect of each option.** (a) no schema change; (b) requires migration + receiver-side capability enforcement + Publisher UI to manage grants.
- **Conditional paths.** If (b) chosen before public launch: add `capabilities` column with default `array['view']`, extend `/api/share/[token]/*` to enforce, add Publisher drawer section.
- **Status.** RESOLVED.

### D2 · "All sheets" vs "some sheets" editor scope at grant time
- **Question.** When granting editor access, should the manager pick "all sheets under project" vs explicit sheet list, or both?
- **Current state.** `estimate_sheet_access_settings.access_mode` enum (inherits-project | sheet-overrides | restricted) already expresses this at the sheet level. The Teamspaces modal UI for it is buried.
- **Options.**
  - (a) Surface the existing enum in Publisher (no schema change). **CHOSEN.**
  - (b) Add a new "scope at grant time" UX where each grant picks all/some.
- **Answer.** Use (a): Publisher should expose the existing `estimate_sheet_access_settings.access_mode` model instead of inventing a second grant-scope model.
- **Decision.** No new "scope at grant time" schema or UX in MVP. Implement Phase 3 access controls on top of the existing enum and per-sheet overrides.
- **Status.** RESOLVED.

### D3 · Sidebar placement
- **Question.** Where in `MainSidebar` should the Publisher item go?
- **Options.**
  - (a) Between `Templates` and `Settings`. **CHOSEN.**
  - (b) Top-level (above Projects).
  - (c) Under Projects as a sub-item.
- **Answer.** Use (a): add `Publisher` between `Templates` and `Settings`.
- **Decision.** `Publisher` is a top-level sidebar item linking to `/workshop/publisher`, with active state on `/workshop/publisher*`.
- **Status.** RESOLVED.

### D4 · Modal consolidation timing
- **Question.** When do we deprecate the existing `ProjectPublicationHeader` and `ProjectTeamspaceHeader` modals in favor of Publisher?
- **Options.**
  - (a) Phase 4 (after Publisher drawer reaches feature parity). **CHOSEN.**
  - (b) Never (coexist permanently).
  - (c) Phase 1 (aggressive).
- **Answer.** Use (a): keep the existing modals through Phase 1, Phase 2, and Phase 3; consolidate them in Phase 4 after Publisher drawer feature parity.
- **Decision.** Phase 1-3 must not break `ProjectPublicationHeader` or `ProjectTeamspaceHeader`. Phase 4 replaces their primary flows with "Open in Publisher" entry points.
- **Status.** RESOLVED.

### D5 · Entry routing
- **Question.** Should Publisher be reachable from `/workshop/publisher` only, or also from `/workshop/projects/[id]/publisher`?
- **Options.**
  - (a) Top-level only. **CHOSEN for Phase 1-3.**
  - (b) Both (deep-link from project page).
- **Answer.** Use (a): `/workshop/publisher` is the only Publisher route for Phase 1-3.
- **Decision.** Project-scoped entry points should deep-link to `/workshop/publisher?project=<id>` rather than introducing `/workshop/projects/[id]/publisher` now. Add the project-scoped route only if closed-beta usage shows users expect it.
- **Status.** RESOLVED.

### D6 · Drawer vs full-page detail
- **Question.** (See D-DESIGN-01 above.)
- **Status.** Decision made: drawer. Reconsider if cramped.

### D7 · Default sort
- **Question.** (See D-UX-02 above.)
- **Status.** Decision made: latest activity.

### D-UX-04 · At-a-glance roster vs audit-table roster
- **Question.** Should the roster expose every available publication metric in the default table?
- **Options.**
  - (a) Six-column at-a-glance roster with secondary detail in drawer/detail. **CHOSEN.**
  - (b) Wide audit table with opens, last-opened, snapshot version, stale-days, recipients, and actions all visible by default.
- **Answer.** Use (a): the default roster optimizes for find, compare, manage, and act workflows. Secondary fields remain available in the drawer/detail surface.
- **Decision.** Implement UX-09. Default visible columns: publication/project, status/health, recipients summary, latest activity, sheet scope, actions.
- **Status.** RESOLVED.

### D-UX-05 · Permission-action feedback
- **Question.** How explicit should rotate/revoke/password/sheet/recipient changes be?
- **Options.**
  - (a) Impact preview before mutation plus truthful next-step or undo behavior. **CHOSEN.**
  - (b) Toast-only feedback after mutation.
- **Answer.** Use (a): Publisher manages access and client-facing links, so impact must be clear before the action commits.
- **Decision.** Implement UX-10. Undo appears only when the underlying mutation is truly reversible; otherwise show next steps such as copy new link, re-notify, or view activity.
- **Status.** RESOLVED.

### D-UX-06 · 768px tablet support
- **Question.** Is 768px a supported builder viewport or a mobile fallback?
- **Options.**
  - (a) Supported priority-column tablet layout. **CHOSEN.**
  - (b) Treat 768px as unsupported and show desktop-first fallback.
- **Answer.** Use (a): doc 18 identifies PH/SEA tablet use as a real risk. Only `<768px` should use the fallback.
- **Decision.** Implement UX-11 and validate 768px portrait.
- **Status.** RESOLVED.

### D-ARCH-05 · Rotate-token race handling
- **Question.** If two managers rotate the same publication at nearly the same time, should Publisher rely on a documented UX consequence or serialize the mutation?
- **Options.**
  - (a) Acquire a DB-level per-publication lock during rotate. **CHOSEN.**
  - (b) Allow last-write-wins and document the loser-link consequence plus re-notify recovery.
- **Answer.** Use (a): serialize rotation inside the database transaction. The implementation should prefer a stable advisory lock keyed from the publication UUID inside `rotate_project_publication_credentials`; if the implementation chooses a row-level lock instead, it must still prove that only one rotate commits at a time for a given publication.
- **Decision.** No UX-only race acceptance. The second rotate waits behind the first or returns the existing "Shared link changed while rotating. Refresh and try again." conflict path after comparing `expected_encrypted_token`.
- **Reason.** Link rotation is a security-sensitive credential change. A manager should never receive a freshly copied link that another near-simultaneous rotate has already invalidated.
- **Implementation effect.** Phase 2 may require a small migration to add the lock to the existing rotate RPC, plus a concurrency test with two simultaneous rotate attempts for one publication.
- **Rejected.** UX consequence + bulk re-notify. It leaves too much room for sending a dead client link during closed-beta onboarding.
- **Status.** RESOLVED.

### D-ARCH-06 · Optimistic mutation queueing
- **Question.** When a manager fires a second mutation on the same publication while the first is in flight, should the UI serialize it in a queue or reject it?
- **Options.**
  - (a) Serialize a per-publication client mutation queue.
  - (b) Reject concurrent same-publication mutations with disabled controls and a "wait for the previous action" toast. **CHOSEN.**
- **Answer.** Use (b): only one manager mutation per publication may be in flight from a given client at a time. Disable conflicting same-publication controls, keep read-only navigation available, and show a concise wait toast if a double-click/keyboard repeat bypasses the disabled state.
- **Decision.** Do not silently queue destructive or permission-changing actions. The manager must make the next decision against fresh post-mutation state.
- **Reason.** Queuing "Rotate then Revoke" or "Sheet change then Recipient add" can execute stale intent after the first mutation changes the access surface.
- **Implementation effect.** `publication-optimistic.ts` reuse must be wrapped with a per-publication in-flight guard; tests must cover second mutation rejection and rollback of the first mutation.
- **Status.** RESOLVED.

### D-ARCH-07 · Recipient cap
- **Question.** Is 50 recipients per action the confirmed cap?
- **Options.**
  - (a) 50 recipient inputs per add/remove action. **CHOSEN.**
  - (b) Lower cap (10 or 25).
  - (c) Higher cap or uncapped.
- **Answer.** Use (a): cap recipient add and remove actions at 50 recipient inputs per submitted action. Managers may repeat the action for larger lists after each result is visible.
- **Decision.** Add-recipient input above 50 fails before any Resend/digest work starts and renders the error summary plus inline composer error. Remove-recipient bulk UI, if present, uses the same 50/action cap for predictable audit and rollback behavior.
- **Reason.** The cap protects digest/email blast risk while still covering realistic closed-beta recipient batches.
- **Status.** RESOLVED.

### D-ARCH-08 · Sheet-scope save, `snapshot_version`, and cookies
- **Question.** Does changing the selected sheets bump `snapshot_version`, and does that invalidate recipient access cookies?
- **Options.**
  - (a) Bump `snapshot_version` and invalidate all recipient access cookies.
  - (b) Bump `snapshot_version`, refresh view-token state, and do **not** invalidate the separate access cookie. **CHOSEN.**
  - (c) Do not bump `snapshot_version` on sheet-scope save.
- **Answer.** Use (b). Sheet-scope save is a content/snapshot change, so it must rebuild the snapshot and bump `project_publications.snapshot_version`. It must not force password re-entry for recipients solely because the visible sheet set changed.
- **Code evidence.** `createPublicationAccessCookie` / `verifyPublicationAccessCookieValue` bind access cookies to `publicationId`, `credentialVersion`, and token digest; they do not include `snapshotVersion`. `createPublicationViewToken` binds the receiver view token to `snapshotVersion`, so receiver-side view-token refresh is the correct content-snapshot boundary.
- **Decision.** Sheet-scope save bumps `snapshot_version`; existing publication access cookies remain valid unless the token or password credential changes. The receiver must refresh/reissue a view token for the new snapshot version before accepting comments/decisions that depend on snapshot locking.
- **Rejected.** Cookie invalidation on every sheet-scope change. It turns a manager's sheet cleanup into a client re-auth event and is unnecessary under the current cookie model.
- **Status.** RESOLVED.

---

## Security decisions

### D-SEC-01 · Capability tokens (existing model) vs bearer tokens
- **Decision.** Keep capability tokens (existing model). See `08_SECURITY_PRIVACY_THREAT_MODEL.md`.
- **Reason.** Existing model matches OWASP Capability URL guidance and industry practice.

### D-SEC-02 · Per-manager rate limit (Phase 2 proposal)
- **Question.** Should we add a per-manager rate limit on recipient adds / rotates / revokes?
- **Current state.** None. Auth-gated but unlimited.
- **Options.**
  - (a) No limit in closed beta. **CHOSEN.**
  - (b) 60 actions / hour per manager.
- **Answer.** Use (a): do not add a new per-manager Publisher mutation rate limit for closed beta.
- **Decision.** Reuse existing auth, manager gates, origin checks, audit rows, and any existing action-specific limits. Reconsider (b) only if closed-beta telemetry shows abuse or accidental bulk mutation risk.
- **Status.** RESOLVED.

### D-SEC-03 · Audit dashboard scope
- **Question.** Should the future audit dashboard be workspace-scoped or cross-workspace (super-admin)?
- **Options.**
  - (a) Workspace-scoped. **CHOSEN.**
  - (b) Cross-workspace for Philip (CEO) only.
- **Answer.** Use (a): future Publisher audit views should be workspace-scoped.
- **Decision.** Do not add a cross-workspace super-admin audit dashboard in this plan pack. If needed later, design it as a separate admin/ops surface, not as part of builder-facing Publisher.
- **Status.** RESOLVED.

### D-SEC-04 · Token rotation cadence policy
- **Question.** Should publications auto-rotate tokens every 90 days?
- **Options.**
  - (a) Manual only. **CHOSEN for closed beta.**
  - (b) Auto-rotate every 90 days with manager notification.
- **Answer.** Use (a): token rotation stays manual for closed beta.
- **Decision.** No scheduled token rotation job, notification workflow, or background token lifecycle policy in Phase 1-3. Reconsider 90-day auto-rotation after real usage patterns and support burden are known.
- **Status.** RESOLVED.

### D-SEC-05 · DPoP / token-binding evaluation
- **Question.** Should Publisher implement DPoP or proof-of-possession token binding for publication capability links now?
- **Options.**
  - (a) Implement DPoP/proof-of-possession for share links now.
  - (b) Do not implement now; keep DPoP as Phase 5+ research triggered by leak incidents, enterprise requirements, or 10x scale. **CHOSEN.**
- **Answer.** Use (b): no DPoP or browser-bound token scheme in Phase 1-4.
- **Decision.** Existing capability URLs, HMAC token hashing, encrypted recopy token storage, password credential versioning, lockout, revocation, expiry, referrer hardening, and audit events remain the security model for closed beta. Phase 5 may evaluate DPoP only as a research spike if real leak incidents or enterprise controls justify the complexity.
- **Reason.** Browser support, key storage UX, recipient friction, and recovery cost are not proportional for first users.
- **Status.** RESOLVED.

### D-OPS-01 · Referrer-Policy for `/workshop/*`
- **Question.** Should authenticated workshop routes set a protective Referrer-Policy?
- **Options.**
  - (a) `Referrer-Policy: no-referrer`. **CHOSEN.**
  - (b) `Referrer-Policy: same-origin`.
  - (c) No route-level policy; rely on individual links.
- **Answer.** Use (a): set `Referrer-Policy: no-referrer` for `/workshop/:path*`.
- **Decision.** Phase 1 must add a route-specific header via `next.config.ts` `headers()` (or the current Next.js 16 equivalent after reading `node_modules/next/dist/docs/`) for `/workshop/:path*`, and Publisher open-share anchors still use `rel="noreferrer"` as defense in depth.
- **Reason.** The manager's authenticated workshop URL is not useful analytics context for external share destinations and should not leak through browser referrer behavior.
- **Rejected.** `same-origin`, because it retains intra-origin referrer detail that is not needed for Publisher's copy/open-share workflow.
- **Status.** RESOLVED.

---

## Assumptions

| ID | Assumption | Risk if wrong |
|---|---|---|
| A1 | Workspace-first roster is the chosen Publisher default. | Re-route to project-first; minimal refactor. |
| A2 | Existing modals coexist until Phase 4. | Builder confusion (R-UX-01). |
| A3 | Per-recipient edit-grant is not in MVP. | Schema migration if added. |
| A4 | Existing access-mode enum is the surface for "all/some sheets". | UI refactor if not. |
| A5 | Workspace has < 50 projects in closed beta. | Phase 2 RPC needed earlier. |
| A6 | Existing non-AI audit/event sources are sufficient for the Phase 2 activity feed. AI audit tables remain excluded because no AI features are in Publisher now. | New table or future Phase 5 feed expansion needed. |
| A7 | TanStack Query 30s staleTime is sufficient for roster cache. | Stale data; tune shorter. |
| A8 | Builder tablet floor is 768px; <768px receives the desktop-first fallback. | Responsive rework if tablet usage exceeds expectations. |
| A9 | Closed-beta users tolerate feature flag flips. | Communication overhead. |
| A10 | No new dependencies needed in Phase 1. | Bundle bloat. |

---

## Alternatives considered and rejected

### ALT-01 · Build a new publication subsystem from scratch
- **Rejected.** Existing substrate (HMAC tokens, AES-256-GCM recopy, scrypt passwords, RLS, audit tables) is mature, tested, security-hardened. Rebuilding would take weeks and introduce regression risk.

### ALT-02 · Use an off-the-shelf RBAC engine (SpiceDB, OpenFGA, Cerbos)
- **Rejected for closed beta.** Adds infrastructure dependency; current rank-based model is sufficient at < 50 projects per workspace. Reconsider at Phase 5+ scale.

### ALT-03 · Migrate modals immediately on Phase 1
- **Rejected.** Breaks muscle memory; Phase 4 consolidation after Publisher proves value is safer.

### ALT-04 · HTTP API instead of server actions
- **Rejected for Phase 1.** Adds public attack surface; existing server actions cover all needs. Reconsider for external integration in Phase 5+.

### ALT-05 · Bulk-action operations in Phase 1
- **Rejected.** P3 priority; phase 1 should ship the read surface and individual actions first.

### ALT-06 · Real-time collaborative grant editing (multi-user)
- **Rejected.** Closed-beta scale doesn't justify CRDT/OT complexity.

### ALT-07 · Mobile-responsive Publisher from day 1
- **Rejected.** Builder persona is desktop-first; mobile redirect is the floor.

### ALT-08 · Replacing receiver-side components
- **Rejected.** `/share/[token]` receiver is a different surface with different UX constraints. Publisher is builder-side only.

### ALT-09 · AI-powered publication summaries
- **Rejected.** AI features remain deferred per repo policy.

### ALT-10 · New crypto primitives
- **Rejected.** Existing `src/lib/publication/security.ts` is comprehensive.

---

## Traceability

Each decision traces to:
- A requirement in `04_REQUIREMENTS_SPECIFICATION.md`.
- An implementation task in `11_IMPLEMENTATION_PLAN.md`.
- A risk in `14_RISK_REGISTER.md` (if applicable).
- A resolved D-prefixed decision where applicable.

See `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` for full mapping.
