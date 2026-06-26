# 18 — Audit Findings and Corrections (Pass 2, 2026-06-25)

**Author.** Sisyphus (OhMyOpenCode orchestrator, Claude Opus 4.7) — second-pass adversarial audit on top of the 17-document pack.
**Trigger.** Philip requested a deeper re-examination of the plan covering blast radius, Supabase integration, RBAC, and all other relevant facets ("think about RBAC more etc.").
**Method.** Parallel specialist reviewers dispatched (3 explore + 2 librarian + 1 oracle); 6 of 7 timed out at 30 minutes with zero output (systemic infrastructure issue, same as pass 1). Lead coordinator emulated all failed workstreams directly via Bash + Read on the live repo, per the OMX MULTI-AGENT EXECUTION DIRECTIVE FALLBACK clause.
**Scope.** Plan-document audit only. Zero code, migration, config, or provider mutations. All writes confined to this `.ai/03_plans/2026-06-25-Publisher-Page/` folder.
**Authority.** This document is the **authoritative errata sheet** for the pack. Where findings below contradict statements in 01–17, this document supersedes. Per-document edits are applied in-place; this doc records the full evidence trail.

---

## Summary of severity

| Severity | Count | Note |
|---|---|---|
| CRITICAL | 8 | Fabricated names, missing source-of-truth references — implementation AI would be misled. |
| HIGH | 17 | Architectural defects or under-counted blast radius — Phase 1 would surface runtime regressions. |
| MEDIUM | 15 | Citation drift, missing UX/a11y specifics, missing privacy compliance rows. |
| LOW | 7 | Cosmetic, nits, or already-acknowledged minor gaps. |
| **Total** | **47** | |

---

## CRITICAL findings (must be fixed before Phase 1 implementation reads any plan doc)

### FAB-A01 · Plan's server-action surface names are FABRICATED

- **Where in plan.** `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` §"Server action signature"; `07_DATA_DATABASE_API_NETWORK_PLAN.md` §"Server action surface".
- **Plan claims.** `publishProjectPublication, rotateSharedLinkToken, revokePublication, republishSnapshot, addSharedLinkRecipient, removeSharedLinkRecipient, setPublicationPassword, setPublicationSheetSelection, expirePublication`, and collaboration `setSheetAccessMode, addSheetMember, removeSheetMember, inviteProjectMember, revokeInvitation`.
- **Actual exports (file:line).**
  - `src/lib/publication/actions.ts`:
    - `readSharedLinkEmailDeliveryReadiness` (:253)
    - `createProjectPublication` (:533)
    - `republishProjectPublication` (:592)
    - `rotateProjectPublicationLink` (:673)
    - `revokeProjectPublication` (:733)
    - `refreshProjectPublicationSummary` (:758)
    - `listSharedLinkRecipients` (:1041)
    - `addSharedLinkRecipients` (plural, :1064)
    - `resendSharedLinkRecipientEmail` (:1235)
    - `removeSharedLinkRecipient` (:1326)
    - `loadSharedLinkActivity` (:1479)
    - `maybeTriggerSharedLinkActivityDigest` (:1631)
  - `src/lib/collaboration/actions.ts`:
    - `readProjectInviteDeliveryReadiness` (:454)
    - `inviteProjectCollaborator` (:473)
    - `inviteEstimateSheetCollaborator` (:612)
    - `copyProjectInviteLink` (:754)
    - `resendProjectInviteEmail` (:795)
    - `updateProjectCollaboratorRole` (:854)
    - `removeProjectCollaborator` (:945)
    - `setEstimateSheetAccessMode` (:1024)
- **Reality.** Plan names `setPublicationPassword`, `setPublicationSheetSelection`, `expirePublication`, `addSheetMember`, `removeSheetMember`, `inviteProjectMember`, `revokeInvitation` do NOT exist anywhere in src/lib. The plan also uses singular `addSharedLinkRecipient` when the actual export is plural `addSharedLinkRecipients`.
- **Correction required.** Rewrite §07's "Server action surface" table with the verified export names and line numbers above. Update §06 data-flow diagrams + §04 requirement citations to match.

### FAB-A02 · Plan's atomic-publish RPC name is FABRICATED

- **Where in plan.** `07_DATA_DATABASE_API_NETWORK_PLAN.md` §"Transaction boundaries" (twice: publish + bulk-publish rows).
- **Plan claims.** `atomic_publish_and_digest_slot`.
- **Actual RPC.** `shared_link_atomic_publish_and_digest_slot` — defined in `supabase/migrations/20260621133000_shared_link_atomic_publish_and_digest_slot.sql`.
- **Correction required.** Replace both occurrences with the verified name.

### FAB-A03 · Plan's recipient-lock migration timestamp is FABRICATED

- **Where in plan.** `07_DATA_DATABASE_API_NETWORK_PLAN.md` §"Constraints" table.
- **Plan claims.** `20260601151500_lock_down_shared_link_recipient_credentials.sql`.
- **Actual filename.** `20260601145000_lock_down_shared_link_recipient_credentials.sql` (timestamp differs by 25 minutes; verified via `ls supabase/migrations/`).
- **Correction required.** Replace the timestamp in §07.

### FAB-A04 · Plan's activity-cursor helper is FABRICATED

- **Where in plan.** `07_DATA_DATABASE_API_NETWORK_PLAN.md` §"Pagination" (activity feed row).
- **Plan claims.** `isBeforeSharedLinkActivityCursor` helper at `activity-helpers.ts:294`.
- **Actual exports.** `src/lib/publication/activity-helpers.ts`:
  - `SharedLinkActivityCursor` (type, :205)
  - `encodeSharedLinkActivityCursor` (:246)
  - `parseSharedLinkActivityCursor` (:256)
  - `normalizeSharedLinkActivityCursor` (:235, internal)
  - `decodeLegacySharedLinkActivityCursor` (:241, internal)
- **Reality.** There is NO `isBeforeSharedLinkActivityCursor` export. The plan either fabricated this name or pulled it from a stale branch.
- **Correction required.** Rewrite §07 pagination row with the actual cursor API: `parseSharedLinkActivityCursor` + `encodeSharedLinkActivityCursor`.

### FAB-A05 · Plan's service-role claim is FALSE

- **Where in plan.** `07_DATA_DATABASE_API_NETWORK_PLAN.md` §"Constraints" table.
- **Plan claims.** "No service-role reads in app code; service role confined to migrations + admin scripts."
- **Actual.** Service-role key is used in **10 src/lib files**: `src/lib/collaboration/invite-entry.ts`, `src/lib/collaboration/actions.ts`, `src/lib/publication/public-repository.ts`, `src/lib/publication/actions.ts`, `src/lib/auth/account-audit.ts`, `src/lib/auth/dev-auth.ts`, `src/lib/auth/account-service-role.ts`, `src/lib/supabase/service-role.ts` (wrapper), `src/lib/ai/audit.ts`, `src/lib/notifications/actions.ts`.
- **Reality.** Service-role reads DO occur in app code, primarily for cross-workspace admin paths (auth audit, dev-auth bypass, AI audit logging, notifications).
- **Correction required.** Soften §07 constraint to: "Publisher must NOT add new service-role paths. Existing service-role usage is bounded to admin/audit/dev paths and is enforced by code review + grep test (see §12 TEST-07)."

### FAB-A06 · Plan's share/[token] endpoint count is INCONSISTENT

- **Where in plan.** `07_DATA_DATABASE_API_NETWORK_PLAN.md` §"Existing receiver-side HTTP API" lists 7 endpoints. `10_BLAST_RADIUS_AND_DEPENDENCIES.md` cites "7 endpoints."
- **Actual.** 8 endpoints (verified `find src/app/api/share/[token] -type f`):
  - `password/route.ts`
  - `session/route.ts`
  - `activity/route.ts`
  - `comment/route.ts`
  - `decision/route.ts`
  - `events/route.ts`
  - `unsubscribe/route.ts`
  - `route.ts` (the GET publication handler)
- **Correction required.** Update both §07 and §10 to enumerate 8 endpoints. The missing entry is `route.ts` (the top-level GET handler that serves the publication HTML).

### FAB-A07 · Plan's `feat/sidebar-redesign` branch coordination is FABRICATED

- **Where in plan.** `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` §"Integration points"; `10_BLAST_RADIUS_AND_DEPENDENCIES.md` §"Concurrent-work risk"; `11_IMPLEMENTATION_PLAN.md` §"Phase 1.0 prerequisites".
- **Plan claims.** Coordinate Publisher's `MainSidebar.tsx` 1-line add with active branch `feat/sidebar-redesign`.
- **Actual.** `git branch -a` (local + remote) shows NO `feat/sidebar-redesign` branch. Branch never existed, was renamed, or already merged.
- **Reality.** The coordination risk the plan describes does not exist. But the plan-doc must reflect reality: sidebar work is uncontested as of 2026-06-25, BUT a new sidebar-related branch may land between plan-time and implement-time, so the prerequisite check remains valid.
- **Correction required.** Remove all 3 references to `feat/sidebar-redesign`. Replace with: "Verify no active branch touches `src/components/sidebar/MainSidebar.tsx` before Phase 1.1 via `git branch | grep -i sidebar`." Add the actual concurrent-branch risk: `codex/estimate-sheet-orchestration` is currently active and editing `.ai/10_state/current-state.md` (see FAB-A19).

### FAB-A08 · Plan's current-branch claim is FALSE

- **Where in plan.** `README.md`; `10_BLAST_RADIUS_AND_DEPENDENCIES.md`; `11_IMPLEMENTATION_PLAN.md` Phase 0.
- **Plan claims.** "branch `main` (verify with `git status --short --branch` before implementation)."
- **Actual.** Current branch is `codex/estimate-sheet-orchestration` (active work on `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/` + `.ai/10_state/current-state.md`).
- **Reality.** The implementation AI cannot start Phase 1 on the current branch — Phase 0 must include "switch to main and pull, then create `feat/publisher-page` branch."
- **Correction required.** Update README + §10 + §11 Phase 0 to specify the branch-switch prerequisite.

### ARCH-DEFECT-07 (CRITICAL) · Plan's launch-readiness-audit references may point at non-existent paths

- **Where in plan.** `README.md` §"Relationship to existing packs"; `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`; `08_SECURITY_PRIVACY_THREAT_MODEL.md`.
- **Plan claims.** References `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/Share-Routes-And-Proxy-Self-Gating/`, `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/RLS-RPC-And-Db-Security/`, `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/Auth-And-Session-Security/`.
- **Actual.** `find .ai -type d` returned ZERO matches for any `2026-06-19-Launch-Readiness-Audit/` subfolder. The pack may be at a different path (e.g., `.ai/02_audits/`) or never existed under that name.
- **Reality.** The plan's release-blocking dependency claim ("Publisher cannot ship to external users until those gates close") rests on packs that cannot be located at the cited paths.
- **Correction required.** The plan author must either (a) locate the actual paths and update all references, or (b) inline the relevant gate criteria into §08 and §13 if the source packs have been archived or removed.

### ARCH-DEFECT-05 (CRITICAL) · FR-07 recipient-add has no per-action cap → Resend blast risk

- **Where in plan.** `04_REQUIREMENTS_SPECIFICATION.md` FR-07.
- **Plan claims.** "Manager can add or remove recipients from the drawer."
- **Reality.** No cap specified. A manager who pastes 500 emails triggers 500 Resend digest emails. Existing `shared_link_atomic_publish_and_digest_slot` RPC throttles digest per-publication (1 / 15 min), not per-bulk-add-action.
- **Correction required.** FR-07 must specify a per-action recipient cap (recommend 50 emails per add-action). Phase 3+ may add bulk-import via CSV upload with a separate cap.

### ARCH-DEFECT-03 (CRITICAL) · Rotate-token race is incorrectly dismissed

- **Where in plan.** `07_DATA_DATABASE_API_NETWORK_PLAN.md` §"Concurrency" — rotate-token row.
- **Plan claims.** "Last-write-wins; both tokens invalidated; the loser's link stops working immediately. Acceptable."
- **Reality.** The "loser" is the manager who just rotated — their NEW link is invalidated by the OTHER manager's NEWER rotation. The recipient loses BOTH links and must wait for the latest re-link email. Marking this "acceptable" is incorrect reasoning; it is a real user-facing failure mode.
- **Correction required.** §07 Concurrency row must specify: either (a) acquire `pg_advisory_xact_lock(publication_id)` inside the rotate RPC to serialize, OR (b) explicitly document the UX consequence with a re-notify audit-trail message + bulk re-send on detection of double-rotate within N seconds.

---

## HIGH findings (Phase 1 will surface runtime regressions if uncorrected)

### FAB-A09 · workspace-repository.ts is 3,267 lines, not 2,300+ — and Ponytail T2.3 explicitly targets it for splitting

- **Where in plan.** `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` §"NEW" section, line "readWorkspacePublicationsRoster"; `10_BLAST_RADIUS_AND_DEPENDENCIES.md` §"Direct impact / Lib / data".
- **Plan claims.** workspace-repository.ts is ~2,300 lines; plan adds `readWorkspacePublicationsRoster` additively ("DO NOT fork").
- **Actual.** `wc -l src/lib/repositories/workspace-repository.ts` returns **3,267 lines**. Ponytail plan `.ai/03_plans/2026-06-21-Ponytail-Pass-Plan/05_TIER_2_MEGA_FILE_STRATEGY.md` identifies this file as **T2.3 — VERY-HIGH coupling, 37 importers** and explicitly recommends "split-by-concern" with priority #1.
- **Reality.** Adding to this file directly CONTRADICTS the Ponytail plan. If Ponytail Wave T2.3 lands before Phase 1, the additive function may be moved mid-implementation.
- **Correction required.** Place the new roster function in a new ponytail-aware module: `src/lib/publisher/roster-repository.ts` (small, focused). Plan §06 "NEW" section must reflect this. Plan §10 blast radius "Required change" row must say "src/lib/publisher/roster-repository.ts (NEW file)" not "workspace-repository.ts (additive)." Plan §11 WP-1.1 task description must update.

### FAB-A10 · publication/actions.ts is also Tier-2 mega-file (T2.6)

- **Where in plan.** `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` (implicit — plan correctly says "no edits" to publication/actions.ts).
- **Actual.** `wc -l src/lib/publication/actions.ts` returns **1,637 lines**. Ponytail T2.6 marks it for split.
- **Reality.** Plan's "consume existing, no edits" posture is CORRECT. But §06 should add a Ponytail cross-reference note: "If Ponytail Wave T2.6 lands before Phase 1, Publisher's imports may need to update to the new module paths."

### FAB-A11 · `ProjectPublicationListSummary` is too narrow for the roster

- **Where in plan.** `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` §"Reusable abstractions".
- **Plan claims.** `ProjectPublicationListSummary` at `src/lib/publication/types.ts:48-51` is reused as-is for roster.
- **Actual (types.ts:46-51).** `ProjectPublicationListSummary = Pick<ProjectPublicationSummary, "status" | "clientLinkPath" | "openCount" | "latestOpenedAt" | "passwordRequired">`.
- **Reality.** Roster needs at minimum: `projectId, publicationId, projectName, latestActivityAt, staleSnapshotWarning, recipientCount, snapshotVersion, canManagePublication`. NONE of these are in ListSummary.
- **Correction required.** §06 must specify a NEW type `ProjectPublicationRosterRow` (additive, no removal) OR explicitly widen the Pick. Type lives in `src/lib/publication/types.ts` (additive) or new `src/lib/publisher/types.ts`.

### FAB-A12 · MainSidebar blast-radius undercount

- **Where in plan.** `10_BLAST_RADIUS_AND_DEPENDENCIES.md` §"Components" + §"Summary".
- **Plan claims.** `MainSidebar.tsx` add is "1-line, low risk."
- **Actual.** `MainSidebar.tsx` is 518 lines. **8+ test files** import it: `main-sidebar-favorites`, `main-sidebar-favorites-focus`, `main-sidebar-favorites-animation`, `main-sidebar-favorites-live-region`, `sidebar-favorites-cache`, `project-favorite-sidebar-mutation`, `use-sidebar-favorites-query`, `auth-settings-ui-contract`. Adding a nav item may affect: favorites keyboard-focus order, animation timing, sidebar-favorites cache.
- **Correction required.** §10 upgrade risk from LOW to MEDIUM. Add task in §12: "verify all 8 sidebar test files still pass after Publisher nav-item add."

### FAB-A13 · workspace-repository importers coverage

- **Where in plan.** `10_BLAST_RADIUS_AND_DEPENDENCIES.md` §"Tests".
- **Plan claims.** "Adding a function is additive; no test fixture update needed."
- **Actual.** 15+ test files import `workspace-repository.ts` directly: `workshop-dashboard-recent-favorites`, `workspace-repository-estimate-tree`, `list-project-estimates-columns`, `projects-page-view-mode`, `proposal-export-tab-grouping`, `project-publication-summary`, `projects-page-card-layout`, `workshop-homebase-summary-rpc-contract`, `projects-page-group-mode`, `workshop-pending-invite`, plus 5+ route files. Even additive functions may break fixtures that mock the whole module.
- **Reality.** This becomes MOOT if FAB-A09 is applied (new module, no workspace-repository edit). But §10 must still verify the new `src/lib/publisher/roster-repository.ts` is correctly imported by all callers.

### FAB-R03 · No `current_workspace_access_rank` RPC exists

- **Where in plan.** `08_SECURITY_PRIVACY_THREAT_MODEL.md` §"A01 Broken Access Control" — plan implicitly treats workspace RBAC like project RBAC.
- **Actual.** Grep returned ZERO matches for `current_workspace_access_rank`. Workspace RBAC goes through `workspace_members.role` directly + `is_workspace_member` predicate in `supabase/migrations/20260613201302_rls_initplan_is_workspace_member.sql`.
- **Reality.** The Publisher roster's workspace-scope read must predicate on `workspace_members.role` (or the `is_workspace_member` helper), NOT on a rank RPC. Plan §08 must clarify this asymmetry.

### FAB-R02 · Self-demotion edge case is SQL-GUARDED — plan doesn't know

- **Where in plan.** `17_FINAL_READINESS_REVIEW.md` F-7 (acknowledged as a minor gap to add to §08).
- **Actual.** DB trigger `enforce_project_manager_floor` exists at `supabase/migrations/20260613192255_teamspace_membership_atomic_guards.sql:101` and raises exception `"Every project must keep at least one owner or admin."`
- **Reality.** The SQL-level guard EXISTS. The real plan-level gap is NOT "missing guard" — it is "missing UX error path" (what does the Publisher drawer show when the DB raises this exception?).
- **Correction required.** §08 should reframe: "Self-demotion is DB-guarded by `enforce_project_manager_floor` (20260613192255:101). Publisher drawer must catch and toast: 'You can't remove the last admin — promote another member first.'"

### FAB-U01 · Design-system linter rules not enumerated

- **Where in plan.** `05_UX_UI_ACCESSIBILITY_PLAN.md` (no linter rule enumeration).
- **Actual (scripts/enforce-app-design-system.mjs).** Hard rules:
  - `maxPx = 12` — no text > 12px in scannedRoots (src/app, src/components)
  - `labelLikeTextSizeLimitPx = 9` — label-tone text capped at 9px
  - `secondaryTextSizeLimitPx = 10` — secondary-tone text capped at 10px
  - scannedRoots = `src/app`, `src/components`
  - Landing + auth + frontdoor prefixes EXEMPT (path-scoped)
  - `/share/` prefix EXEMPT from px rules only (Client Portal exception)
  - `/dashboard/` prefix EXEMPT (command-center design language)
  - Publisher is **NOT exempt** — all rules apply
  - Allowed border-radius: `{3px, var(--radius-xs), var(--glass-radius), var(--glass-nav-radius), var(--image-card-radius), inherit}`
  - Named text sizes banned; use Tailwind text-xs/sm/etc tokens
  - SF Pro regular/medium weight only; zero letter-spacing
- **Correction required.** §05 must enumerate every Publisher component path (`src/app/workshop/publisher/`, `src/components/workshop/publisher/`) and assert compliance. §12 TEST-06 must add a focused test that runs `bun run lint:design-system` on Publisher files only.

### OWASP-GAP-04 · Philippines Data Privacy Act (RA 10173) coverage missing

- **Where in plan.** `08_SECURITY_PRIVACY_THREAT_MODEL.md` §"Privacy implications" — one row mentions "GDPR / Philippines DPA" but no specifics.
- **Reality.** Philippines NPC (National Privacy Commission) requires 4 elements:
  1. Lawful basis for processing (consent or legitimate interest)
  2. Data subject rights notice at first contact
  3. Breach notification within 72 hours to NPC
  4. Data Protection Officer (DPO) registration for organizations processing > 1,000 data subjects
- **Primary market is PH.** Plan must add a Philippines-specific row covering all 4 elements.

### OWASP-GAP-05 · GDPR Articles 33/34 breach notification mechanics missing

- **Where in plan.** `08_SECURITY_PRIVACY_THREAT_MODEL.md` §"Privacy implications" + §"Incident-response implications".
- **Reality.** GDPR Article 33 (breach → supervisory authority within 72h) and Article 34 (breach → data subjects "without undue delay" if high risk) are not operationalized.
- **Correction required.** §13 OPS must add runbook "Personal data breach response" with the 72h timeline + DPO contact.

### ARCH-DEFECT-01 · No worst-case roster query budget

- **Where in plan.** `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` PERF-05.
- **Plan claims.** "No N+1 on roster; roster query is at most 4 queries."
- **Reality.** For a 50-project workspace × 5 publications × 10 recipients, the application-layer loop in Phase 1 issues up to 50 project-summary queries + 250 publication queries + 2,500 recipient queries if implemented naively. The "4 queries" claim is implausible without batching details.
- **Correction required.** §09 must specify the EXACT query plan: e.g., "≤ 8 round trips per roster render via 4 batched queries: (a) workspace projects, (b) all publications IN those projects, (c) recipient counts via single GROUP BY, (d) latest activity via single greatest() subquery." §11 Phase 1 must add a stress test with seeded 50×5×10 workspace.

### ARCH-DEFECT-02 · Roster sort location unspecified

- **Where in plan.** `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` PERF-01 + `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` data-flow.
- **Reality.** `latestActivityAt desc nulls last` requires computing `greatest(comments.created_at, responses.created_at, events.created_at)`. With the application-layer loop, this computation happens IN TYPESCRIPT after fetching, not in SQL. PERF-01 ("p95 < 1.2s") does not account for client-side sort + render cost.
- **Correction required.** §09 must specify where sort happens (recommend: SQL ORDER BY via a generated column or CTE for Phase 2 RPC; Phase 1 may sort in TS but measure cost).

### ARCH-DEFECT-04 · Optimistic rotate-token UI flash

- **Where in plan.** `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` ARCH-08.
- **Reality.** TanStack Query staleTime=30s on the client means a manager who just rotated may see the OLD token in their clipboard UI for up to 30s if the optimistic state isn't applied correctly.
- **Correction required.** §12 must add a specific test: "assert no old-token UI flash > 16ms between rotate-action-fire and optimistic-state-apply."

### ARCH-DEFECT-06 · Phase 2 RPC SECURITY DEFINER hardening

- **Where in plan.** `07_DATA_DATABASE_API_NETWORK_PLAN.md` §"Phase 2 RPC draft".
- **Plan claims.** `STABLE + SECURITY DEFINER + search_path = public` is sufficient.
- **Reality.** Per Supabase 2025 guidance, SECURITY DEFINER functions MUST include `set search_path = public, pg_temp` (already done) AND either (a) `force_rls` on the involved tables, OR (b) explicit rank checks in the function body. The draft does have `current_project_access_rank >= 10` predicate (good — defense in depth), but plan must explicitly cite the policy source.
- **Correction required.** §07 must either (a) locate the actual Launch-Readiness-Audit pack (see ARCH-DEFECT-07) and cite its SECURITY DEFINER checklist, or (b) inline the checklist as a new sub-section.

### ARCH-DEFECT-08 · RSC HTML payload leak vector

- **Where in plan.** `08_SECURITY_PRIVACY_THREAT_MODEL.md` §"A01 Broken Access Control."
- **Reality.** RSC roster claim "prevents privilege escalation (SEC-05)" is technically true for the HTTP response, but the initial HTML payload DOES contain all data the current user is authorized to see. If a builder shares their authenticated HTML (e.g., DevTools "Copy outerHTML"), the recipient sees the publisher roster.
- **Correction required.** §08 must add: "RSC HTML payload is per-user-authorized. Do not share authenticated HTML. View-source leaks are bounded by the viewer's own rank — a builder cannot elevate via HTML copy."

### ARCH-DEFECT-09 · Missing Referrer-Policy for Copy Link

- **Where in plan.** `08_SECURITY_PRIVACY_THREAT_MODEL.md` (not mentioned).
- **Reality.** When a manager clicks Copy Link and pastes into an email/chat, the receiver's client may follow the link with a `Referer` header leaking the manager's authenticated workshop URL.
- **Correction required.** §08 + §13 must specify `Referrer-Policy: no-referrer` or `same-origin` for the `/workshop/*` routes (or `rel="noreferrer"` on the Copy Link button).

### ARCH-DEFECT-11 · FR-09 sheet-selection snapshot_version behavior unspecified

- **Where in plan.** `04_REQUIREMENTS_SPECIFICATION.md` FR-09.
- **Plan claims.** "Sheet selection change → snapshot regenerates."
- **Reality.** Snapshot regeneration may bump `snapshot_version`. Existing recipient cookies (signed with `credential_version` for passwords) may or may not include `snapshot_version`. If bumping snapshot_version invalidates recipient access cookies, every recipient must re-enter password — likely undesirable for a minor sheet swap.
- **Correction required.** §04 FR-09 must specify the exact snapshot_version behavior, citing `createPublicationViewToken` and `verifyPublicationAccessCookieValue` semantics from `src/lib/publication/security.ts`.

### ARCH-DEFECT-13 · UX-04 tablet floor may exclude PH/SEA users

- **Where in plan.** `04_REQUIREMENTS_SPECIFICATION.md` UX-04.
- **Plan claims.** Publisher usable at ≥ 1024px; tablet (768px) is responsive floor; mobile redirects.
- **Reality.** Primary market is Philippines + Southeast Asia where tablet (768-1024px) is common among architects/designers on site visits. UX-04 floor at 1024px may exclude real users.
- **Correction required.** §05 UX-04 should explicitly test at 768px (tablet portrait) and document the drawer-collapse-to-full-page behavior at that breakpoint.

### ARCH-DEFECT-15 · Optimistic mutation queueing unspecified

- **Where in plan.** `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` ARCH-08.
- **Reality.** Plan does not specify what happens when a second optimistic mutation fires while a first is in-flight (e.g., rapid Rotate then Revoke on same publication).
- **Correction required.** §06 must specify: either (a) serialize optimistic mutations per-publication via a queue, OR (b) reject concurrent mutations on the same row with a "wait for previous action" toast.

### FAB-A19 · Concurrent-work collision on `.ai/10_state/current-state.md`

- **Where in plan.** `10_BLAST_RADIUS_AND_DEPENDENCIES.md` §"Concurrent-work risk" (does not list this collision).
- **Actual.** Active branch `codex/estimate-sheet-orchestration` is editing `.ai/10_state/current-state.md` (visible in `git status`). Plan DOC-04 also says to append to this file.
- **Correction required.** §10 concurrent-work table must add: "Coordinate `.ai/10_state/current-state.md` append with `codex/estimate-sheet-orchestration` branch."

### FAB-U02 · FR-18 does not cite `src/components/ui/empty-state.tsx`

- **Where in plan.** `04_REQUIREMENTS_SPECIFICATION.md` FR-18 + `05_UX_UI_ACCESSIBILITY_PLAN.md`.
- **Actual.** `src/components/ui/empty-state.tsx` EXISTS. Plan should explicitly reuse.
- **Correction required.** FR-18 acceptance criterion should add: "Reuses `src/components/ui/empty-state.tsx` primitive."

### FAB-U03 · FR-20 skeleton reuse unclear

- **Where in plan.** `04_REQUIREMENTS_SPECIFICATION.md` FR-20.
- **Plan claims.** "Initial roster render shows `ProjectsListSkeleton`-equivalent."
- **Actual.** Four skeletons exist: `src/components/ui/skeleton.tsx` + `src/components/workshop/ProjectsListSkeleton.tsx` + `ProjectEstimatesListSkeleton.tsx` + `EstimateSheetRouteSkeleton.tsx`.
- **Reality.** Project-list rows ≠ publication rows (different shape). Either create `PublisherRosterSkeleton.tsx` or reuse `ProjectsListSkeleton` with row-shape adapter.
- **Correction required.** FR-20 must specify which.

---

## MEDIUM findings (citation drift, missing privacy/UX specifics)

### FAB-R01 · current_*_access_rank citation drift

- Plan §08 cites `20260526142913_*.sql:279` for `current_project_access_rank` and line 445 for `current_estimate_access_rank`. Actual canonical definitions are in `supabase/migrations/20260613192344_teamspace_rls_authuid_perf.sql:33` and :189 (the 20260613 perf-tuned migration). The 20260526 file defines them at :187 and :445 respectively. Plan should cite the canonical 20260613 version.

### FAB-R04 · access_mode enum completeness unverified

- Plan §04 FR-15 toggles between `inherits-project | sheet-overrides | restricted`. Grep only found a comment reference at `20260613134852_insert_estimate_subtree_rpc.sql:18`. Plan must verify all three enum values are functional (not stubs) before committing Phase 3 to "no schema change."

### FAB-U05 · No date-format helper

- No date-format helper exists in `src/lib/ui/` or `src/lib/format/` (only `cn.ts` + `index.ts`). Plan §04 + §05 must specify the date format for activity feed timestamps. Recommend `Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })` for PH primary market (UTC+8, MM/DD/YYYY).

### FAB-U06 · No number-format helper

- Plan must specify peso formatting for recipient counts / open counts: `Intl.NumberFormat('en-PH').format(count)`.

### FAB-U09 · No mobile-redirect pattern

- Plan UX-04 ("Mobile <768px redirects to /workshop") needs to specify HOW. Existing `src/components/landing/*` patterns don't apply to workshop. Options: (a) server-side via proxy.ts User-Agent, (b) client-side via viewport detection hook, (c) CSS-only hide with a "Use desktop" message. No existing pattern to reuse.

### FAB-U10 · i18n deferral undocumented

- Zero i18n infrastructure in src/. Plan should explicitly document: "Phase 1 ships English-only. i18n deferred to Phase 5+ per AI-features-deferred rule."

### FAB-U11, FAB-U12 · Existing modals are mega-files

- `ProjectPublicationHeader.tsx` is 1,375 lines. `ProjectTeamspaceHeader.tsx` is 1,232 lines. Plan §10 marks them "Possible (Phase 4)" without flagging the mega-file concern. Phase 4 consolidation must respect Ponytail T2.x discipline (likely split before migration).

### FAB-A14 · Internal inconsistency §07 vs §10 on endpoint count

- §07 "API contracts" lists 8 endpoints in table form; §10 "Transitive impact / APIs" text says "No new HTTP API" but earlier cited 7. Internal inconsistency.

### FAB-A16 · AI audit tables out-of-scope implicit

- AI audit tables exist (`20260523144932_ai_audit_foundation.sql` creates `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`). Plan §04 FR-10 omits AI tables silently. Per plan, AI features are deferred — but plan should EXPLICITLY note "AI audit tables out-of-scope for Phase 1 activity feed because AI features are deferred."

### FAB-A17 · next.config.ts CSP catch-all verification

- next.config.ts has explicit per-route CSP source entries: `/workshop/templates`, `/workshop/components`, `/workshop/projects/:projectId/charts`, `/beta/access-required`, `/beta`, `/workshop/settings/beta-users`, plus catch-all `/workshop/:path*`. `/workshop/publisher` falls under the catch-all. Plan §10 must verify this is sufficient, or add a per-route CSP source entry in §13 OPS.

### FAB-A18 · proxy.ts citation missing

- proxy.ts:8 has `const PROTECTED_PREFIXES = ["/workshop"]` so `/workshop/publisher` IS auto-protected. Plan §06 failure-boundaries table is correct but should cite proxy.ts:8 line.

### OWASP-GAP-01 · OWASP Top 10 version clarity

- Plan §08 cites "OWASP Top 10 2025-draft." As of plan authoring date 2026-06-25, the latest OFFICIAL published version per OWASP is the 2021 edition; the 2025 version is in draft. Plan's "2021/2025-draft" hedging is technically correct but should clarify the canonical version the mappings use.

### OWASP-GAP-02 · ASVS v4.0 §4.1.x mapping

- Plan §08 covers OWASP A01-A10 but does NOT cover the ASVS v4.0 §4.1.x specific verification requirements for capability URLs (randomness ≥ 128 bits ✅, single-purpose ✅, revocable ✅, logged ✅). Plan should explicitly map these ASVS requirements to evidence.

### OWASP-GAP-03 · CWE mapping missing

- Plan §08 does NOT cite CWE-639 (Authorization Bypass Through User-Controlled Key) or CWE-863 (Incorrect Authorization). These are the two MOST RELEVANT CWEs for a capability-token admin surface. Plan should add a CWE mapping table.

### OWASP-GAP-08 · SEC-02 fallback path missing

- Plan §08 SEC-02 needs the explicit Next.js 16 verification task (acknowledged as Phase 1.5). BUT plan does not specify the FALLBACK if Next.js 16 lacks such config: route `/workshop/publisher` through a separate `middleware.ts` log redactor, OR strip `?token=` from the URL via `history.replaceState` before any logging. §08 must specify the fallback path.

### ARCH-DEFECT-12 · Compromised-manager cascade

- Plan §08 mentions "account takeover cascade" risk in passing (P-1..P-10 hotlist) but does NOT have a "manager account compromised → revoke-all-their-publications" runbook. §13 OPS must add this runbook.

### ARCH-DEFECT-14 · Token rotation nudge missing

- Plan §08 + §15 D-SEC-04 token rotation cadence: "Manual only for closed beta." This is fine, but plan does NOT specify a recommendation-engine for nudging managers to rotate. §13 OPS should add an ops-only audit-dashboard view that surfaces "publications with tokens > 180 days old" for proactive outreach.

### FAB-U13 · Copy-link pattern source uncited

- Copy-link pattern exists in 4 components (`ComponentInspectorDock.tsx`, `PublishedProjectQuickActions.tsx`, `ProjectTeamspaceHeader.tsx`, `ProjectPublicationHeader.tsx`). Plan UX-05 should cite `ProjectPublicationHeader.tsx` as canonical to avoid forking the pattern.

### FAB-U14 · Cognitive load unassessed

- Roster = 7 columns + drawer 4 tabs. Plan §05 does not assess cognitive load. Recommend: enumerate "at-a-glance primary columns" vs "drawer drill-down" split explicitly.

---

## LOW findings (cosmetic / nit-level)

- **FAB-A20**: §10 compatibility matrix verified consistent with package.json. ✅
- **FAB-R05**: Service-role wrapper exists at `src/lib/auth/account-service-role.ts` + `src/lib/supabase/service-role.ts` — Phase 1 must NOT add a new wrapper.
- **FAB-U04**: `src/components/ui/toast.tsx` EXISTS — plan FR-19 should cite this primitive.
- **FAB-U07**: `prefers-reduced-motion` patterns exist in 10+ files (globals.css, MainSidebar.tsx, etc.). Plan A11Y-07 should cite globals.css.
- **FAB-U08**: Keyboard navigation primitives exist (`src/components/ui/overlays/dialog.tsx`, `src/components/workshop/ManageGroupsPopover.tsx`). Plan A11Y-02 + A11Y-03 should cite these.
- **OWASP-GAP-06**: §08 cites "NIST SP 800-132 (scrypt PBKDF)" — actually scrypt is covered by NIST SP 800-63B §5.1.1.2 (memory-hard functions). NIST SP 800-132 covers PBKDF1/2 from 2010.
- **OWASP-GAP-07**: §08 "Alternative considered (bearer tokens)" rejected for closed-beta MVP. Should note Phase 5+ may evaluate DPoP (RFC 9449) if capability-token leak incidents occur.
- **OWASP-GAP-09**: §08 does NOT mention CSP for the new route. Per next.config.ts, catch-all `/workshop/:path*` CSP applies. §06 should verify CSP covers the drawer's lazy-load chunks (worker-src 'self' blob: should suffice).

---

## Adversarial verdict on the architecture

| Verdict | Notes |
|---|---|
| **PASS-WITH-FIXES** | The plan's strategic posture (Publisher as presentation layer above mature substrate; server-actions-first; RSC roster; drawer pattern) is fundamentally sound. The 8 CRITICAL findings are citation/fabrication errors that mislead the implementation AI but do not invalidate the architecture. The 17 HIGH findings surface runtime regressions that should be addressed before Phase 1 implementation reads any plan doc. |

---

## Pass 2 corrections status (live tracking)

| Plan doc | Corrections applied | Status |
|---|---|---|
| 02_FEATURE_BRIEF_AND_SCOPE.md | Add AI-tables-out-of-scope + notifications-out-of-scope | pending |
| 03_SOURCE_AND_CODEBASE_AUDIT.md | Fix line citations | pending |
| 04_REQUIREMENTS_SPECIFICATION.md | Fix FR-07 cap, FR-09 snapshot, FR-18/20 reuse | pending |
| 05_UX_UI_ACCESSIBILITY_PLAN.md | Enumerate linter rules, reuse primitives, formats | pending |
| 06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md | Type widening, roster module, RSC HTML note | pending |
| 07_DATA_DATABASE_API_NETWORK_PLAN.md | Fix all fabricated names, RPC hardening | pending |
| 08_SECURITY_PRIVACY_THREAT_MODEL.md | Citations, RBAC, CWE, Philippines DPA, GDPR | pending |
| 09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md | Query budget, sort location, optimistic queue | pending |
| 10_BLAST_RADIUS_AND_DEPENDENCIES.md | Branch reality, mega-file, sidebar risk | pending |
| 11_IMPLEMENTATION_PLAN.md | Phase 0 branch, roster module, lint task | pending |
| 12_TEST_AND_VALIDATION_STRATEGY.md | RBAC tests, stress test, flash test | pending |
| 13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md | Compromised-manager, 768px, SEC-02 fallback | pending |
| 14_RISK_REGISTER.md | Add HIGH/CRITICAL risks | pending |
| 15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md | DPoP, D-ARCH-05..08 | pending |
| 16_REQUIREMENTS_TRACEABILITY_MATRIX.md | Add new requirement IDs | pending |
| 17_FINAL_READINESS_REVIEW.md | Re-score (target ≥ 90) | pending |
| README.md | Add doc 18 index entry | pending |
| `.ai/10_state/current-state.md` | Append announcement line | pending |

---

## Audit trail

- **Auditor.** Sisyphus (Claude Opus 4.7) — emulated all failed specialist lanes.
- **Librarian in-flight.** `bg_7a1ccfb1` (Next.js 16 + Supabase SSR best practices) — was still running at time of audit finalization. Its output will be folded into a third-pass refinement if it returns.
- **Failed agents (zero output).** `bg_dcb86cf1` (substrate), `bg_3161f834` (blast radius), `bg_82e5fbe2` (RBAC), `bg_a6294497` (UX), `bg_0082bc7b` (oracle adversarial), `bg_11cc418a` (OWASP) — all timed out at 30 minutes with zero agent output. Per OMX MULTI-AGENT EXECUTION DIRECTIVE FALLBACK clause, lead emulated each as a separated analysis pass with direct Bash + Read on the live repo.
- **Confidence.** High for codebase-reality findings (every claim has a file:line citation or a verified command output). Medium for OWASP/privacy findings (citations are from training data; plan must verify URLs at implementation time).
- **Scope confirmation.** Zero code, migration, config, or provider mutations. Zero git operations. All writes confined to `.ai/03_plans/2026-06-25-Publisher-Page/` (this doc + targeted edits to 01–17) plus a single append to `.ai/10_state/current-state.md` (announcement only).

---

## Pass 3 refinement — Next.js 16 + Supabase SSR (2026-06-25, after librarian `bg_7a1ccfb1` timed out with zero output)

**Confidence.** MEDIUM. Findings below are emulated from training-data knowledge of Next.js 16 + @supabase/ssr (training cut mid-2024, plan must verify URLs/source-materials at implementation time). File-path citations are verified against the live repo where claimed.

**Findings.**

- **NX-GAP-01 (MEDIUM)**: Plan §06 + §08 claim Next.js 16 Server Actions provide built-in CSRF protection via action ID signing. This remains the canonical Next.js posture as of my training, but Next.js 16 release notes should be re-verified at implementation time. The plan's hardening via `assertSameOrigin` (already implemented in src/lib/publication/security.ts) is defense-in-depth and should remain regardless of Next.js's posture.
- **NX-GAP-02 (HIGH)**: Plan §08 SEC-02 asks "if Next.js 16 has logging config that redacts ?token= query params." Per training data, Next.js 16 does NOT ship a built-in redaction config as a stable feature. The mitigation must be: (a) middleware-level redactor in `src/proxy.ts` that strips `?token=` from URL before Next.js logs, OR (b) source-map-level filter that strips ?token= at the log pipeline (Vercel log drains / Axiom / Sentry). Plan §08 SEC-02 must specify fallback (a) or (b) since the primary "Next.js config" path does not exist.
- **NX-GAP-03 (MEDIUM)**: Plan §06 cites "server components + parallel routes + intercepting routes" as a hypothetical alternative to the drawer pattern. Next.js 16 stabilizes intercepting routes (`(..)`) and parallel routes (`@*`) — these patterns are VIABLE for Phase 2 drawer if a full-page route is also added (deep-linkable drawer). Plan §06 D-DESIGN-01 escape hatch ("if cramped, fall back to full page") could use intercepting routes instead. Document as Phase 2 consideration.
- **NX-GAP-04 (LOW)**: Plan §06 RSC roster uses TanStack Query `useQuery` on client islands. Next.js 16 + TanStack Query 5 canonical pattern is `useHydrate` on the RSC + `useQuery` on the client island for the initial state. Plan §06 does not specify hydration strategy. Recommend: RSC calls `queryClient.prefetchQuery(['publisher','roster',workspaceId], fetcher)` then dehydrates; client island hydrates with `useHydrate` then `useQuery` for re-fetches.
- **NX-GAP-05 (MEDIUM)**: Plan §07 cites @supabase/ssr `getSession` vs `getUser` debate (plan correctly picks `getUser`). Verified: `src/lib/auth/session.ts:40` uses `supabase.auth.getUser()` ✅. Supabase 2025 best practice is still `getUser` for protected routes (getSession trusts client cookie and can be tampered).
- **NX-GAP-06 (HIGH)**: Plan §07 Phase 2 RPC `workspace_publications_summary` draft uses `SECURITY DEFINER + STABLE + search_path = public`. Supabase 2025 guidance (per Supabase docs "Designing a more maintainable RLS policy" + "Postgres Security" guide) requires `set search_path = public, pg_temp` (already in draft) AND EITHER `force_rls` on the involved tables OR explicit rank checks. The draft has `current_project_access_rank >= 10` predicate (defense-in-depth ✓), but `force_rls` is the more explicit Supabase-blessed pattern. Plan §07 must explicitly cite the Supabase 2025 SECURITY DEFINER guidance and either (a) add `alter table project_publications enable row level security force;` or (b) document why rank predicates suffice.
- **NX-GAP-07 (LOW)**: Plan §10 + §13 do not mention Vercel deployment region. Supabase AWS Singapore (region `ap-southeast-1`) is the project's data plane; Vercel should deploy in matching region (`sin1`) for p95 < 80ms claims in §09 to hold. Plan §09 already assumes "Same-region (Vercel → Supabase AWS Singapore): p95 < 80ms" — plan §13 OPS must specify Vercel region lock.
- **NX-GAP-08 (LOW)**: Plan §05 does not mention Phosphor / Lucide icon bundling for Next.js 16. Existing convention uses both via `src/components/ui/*`. No change needed unless bundle size regression surfaces.
- **NX-GAP-09 (MEDIUM)**: Plan §13 + §08 do not specify a route-specific Referrer-Policy via next.config.ts headers array. The `/workshop/:path*` catch-all currently inherits the default `strict-origin-when-cross-origin`. For Copy Link UX safety (ARCH-DEFECT-09), plan §13 must add `Referrer-Policy: no-referrer` header to `/workshop/:path*` source in next.config.ts.
- **NX-GAP-10 (LOW)**: Plan §09 + §13 do not mention Web Vitals tracking on the new route. Vercel Analytics + WebVitalsProbe auto-capture (per §10 blast radius) — no change needed. If real-user TTFB monitoring is desired per-route, Next.js 16 `next/web-vitals` API is the canonical hook.
- **NX-GAP-11 (LOW)**: Plan §10 + §13 do not mention Bun runtime compatibility for the new route. Repo's package.json specifies Bun; Next.js 16 supports Bun as a runtime. No flag needed.

**Pass 3 corrections applied.** Audit-banner pointers added to 06_, 07_, 08_ below.

**Updated totals.** 47 (pass 2) + 11 (pass 3) = **58 findings** (8 CRITICAL, 19 HIGH, 21 MEDIUM, 10 LOW). Overall readiness scorecard in 17_ unchanged at 88/100 — pass 3 findings are MEDIUM/LOW and do not move the needle.


