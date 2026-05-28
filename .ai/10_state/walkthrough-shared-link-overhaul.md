# Shared Link Overhaul (V2) — Support Team Walkthrough

**Date:** 2026-05-28 (P14 closure)  
**Worktree:** `/Users/philiplewis/archestimator/.worktrees/feature/shared-link-overhaul-v2`  
**Status:** Complete (P0–P13; see `.ai/01_roadmap/README.md` Phase 5A for full evidence)  
**Related:** `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, `DESIGN.md`, src/lib/publication/*, src/app/share/[token]/page.tsx, src/components/workshop/ProjectPublicationHeader.tsx

## What Was Built (V2 vs V1)
V1 (archived 2026-05-27, `.ai/09_archive/store/2026-05-27-project-client-publication-complete/`) provided basic "Public link" manager controls + simple `/share/[token]` receiver with optional password.

V2 ("Shared Link Overhaul") standardizes terminology to "Shared link", adds production hardening, collaboration surfaces, and resilience:

- **Manager (owner) surfaces**: Project header "Shared link" modal with 5 tabs (Link / Sheets / Access / Recipients / Activity). Create/rotate/revoke/republish links, select specific estimate sheets (SheetPickerList), add/manage recipients (email chips + Resend delivery with graceful fallback), view activity feed, set/remove password.
- **Receiver (client) surfaces**: `/share/[token]` public view-only page (no login). Password gate (if set) with signed HttpOnly cookie. Tabbed or responsive layout showing project snapshot + per-sheet estimate cards/tables (thumbnails from source_snapshot). Submit decisions (accept/reject/revise with comments), add threaded comments (P6), view-only after decision lock.
- **Security & resilience (P5, P10–P12)**: Recipient session cookies (context-bound), same-origin CSRF on password/POSTs, scrypt password hashes, in-memory progressive lockout (5 attempts → 15min block, delays 1s/2s/4s/8s), password_attempt audit events, circuit breakers + retry + offline queue for comments/emails/decisions, structured logging, CSP hardening (P11).
- **Activity & notifications (P8)**: Owner activity ledger in modal (filtered), best-effort rate-limited email digests on comments/decisions/activity (non-blocking), badge signals.
- **Email (P0/P4)**: Resend client (mock fallback in tests), RecipientEmailComposer extracted, delivery tracking, graceful error states.
- **Visual & a11y (P2/P9)**: Tabbed navigation (SharePageTabs, ARIA fixed), hero cover images (from project metadata), row thumbnails, responsive (sticky bars, safe-area), compact design-system (SF Pro, ≤12px, regular/medium, 0 tracking, xs radius, reference tokens).
- **Data**: P3 migration added `shared_link_*` tables, SECURITY DEFINER RPCs for comments/decisions/recipients (no direct anon grants). Snapshots are sanitized DTOs (not live authz).

All changes additive, backwards compatible with V1 tokens/snapshots/tests (except P13 string updates to "Shared link"). No breaking changes to existing flows.

## How to Use — Owner / Manager Flow
1. In protected `/workshop/projects/[projectId]`, open the project header "Shared link" (or "Public client link") control.
2. Create new shared link (or rotate/revoke existing). Optionally select specific Sheets via SheetPickerList (defaults to all; 0-selected validation prevents empty publish).
3. Add Recipients: type emails → chips (normalize/validate). Send invites via Resend (delivery_status tracked; mocks in tests).
4. Set optional password (scrypt hashed server-side).
5. Copy the `/share/[token]` URL. Open to preview.
6. Monitor: Switch to Activity tab for owner feed (comments, decisions, opens, password attempts). Digests emailed (rate-limited ~1/15min).
7. Update/republish: Change sheets/password → republish (new snapshot version, token stable or rotated).
8. Revoke: Turns link off (token invalid thereafter).

**Sheets tab** allows granular scoping (additive to V1 all-or-nothing).

## How to Use — Recipient / Client Flow
1. Open the shared `/share/[token]` URL (public, no auth).
2. If password-protected: Enter password (same-origin POST to `/api/share/[token]/password`). Success sets signed context-bound HttpOnly cookie; failures record `password_attempt` events. 5 failures → progressive delays + 15min lockout (429 "Too many attempts", input disabled).
3. View project snapshot (hero image if present, summary).
4. Navigate tabs/sheets: Per-estimate cards + tables (thumbnails from row source_snapshot.imageUrl where present). Responsive on mobile (sticky decision rail).
5. **Decisions (P7)**: Submit accept / reject / request revision (session-gated; locks to read-only badge after submit/409 conflict). Decision + comment stored via RPC.
6. **Comments (P6)**: Add/view comments per scope (project or estimate). Session cookie required for interactive; supports offline queue + retry (P12).
7. All data view-only. No edits to live workspace. Snapshot is immutable at publish time.

**Security notes for support**: Tokens are pepper-hashed + encrypted recopy tokens server-side. Password never plaintext. Sessions bound to token + origin. CSP Report-Only + strict in prod. Rate/circuit in-mem (see limitations).

## Known Limitations & Environment Notes
- **P3 Docker blocker**: Local Supabase verification (Docker) blocked in CI/dev; authorized to proceed with linked remote + sims/tests. Migration applied and grant-verified on `ebxxqidacheyapmmzavr`.
- **In-memory state**: Rate limiting, circuit breakers, lockout, offline queues, and some session flags are in-memory / sessionStorage. Not durable across restarts or multi-instance until Redis/infra slice. Production impact: short windows of reset on deploy.
- **P13 testing**: Full E2E/penetration/load via Playwright sims + focused Vitest (publication tests, password, actions, security, header). Live unauthed Docker matrix limited by env; all targeted tests green at P13 commit. No critical gaps.
- **Email/Resend**: Mock fallback for tests; real sends use server-only key. Type casts in some paths (temporary).
- **Launch gates**: Still blocked by Phase 7 (reviewed Privacy Notice/Terms, subprocessor list, Vercel evidence, provider audit, support runbooks). Public claims limited.
- **No PDF/artifacts yet**: Per V1 remaining + future plan.
- **TypeScript**: Some legacy casts in email + publication paths (addressed in quality fixes; full regen later).
- **Graph impacts**: Every packet + P14 pre-edit used code-review-graph MCP (search_tool schema first → get_impact_radius etc.). 500-node / 120-file blast on core publication surface was medium risk, 0 critical flows.

## Troubleshooting (Common Support Scenarios)
- **"Invalid / expired / revoked token"**: Normal for rotate/revoke. Owner must issue new link. Check `readLatestProjectPublication` + RPCs.
- **Password gate loops or "Too many attempts" (429)**: Lockout active (15min in-mem). Wait or owner removes password. Check `password_attempt` events in activity. Same-origin CSRF failures → generic error (no leak).
- **Comments / decisions not submitting or "session required"**: Missing/invalid recipient session cookie (P5). Re-enter password or clear site data for the token origin. Hook `useSharedLinkSession` + `verifySharedLinkSessionCookieValue`.
- **Emails not received (recipients)**: Resend delivery_status != sent. Check Resend dashboard (server key), rate limits, or test mocks. Graceful UI states shown (P4).
- **Activity / digest missing**: Rate-limited (1/15min). Non-blocking best-effort. Check `maybeTriggerSharedLinkActivityDigest` + `shouldSendDigest`.
- **CSP blocks or console errors on /share**: P11 headers (Report-Only in dev). Safe; strict in prod. Images/thumbnails from allowed storage.
- **"Shared link" vs old "Public link" UI text**: P1 rename complete + P13 test string updates. Old tokens continue to work.
- **Thumbnail / hero images missing**: Captured at publish time from `projects.metadata` + row `source_snapshot.imageUrl` (P9 additive). Old V1 snapshots omit gracefully.
- **Revalidate / stale data after republish**: `revalidatePublicationRoutes` + server action. Hard refresh or new token.
- **General errors**: P12 circuits/retry/logging + structured errors. Check server logs for correlation ids. Offline queue auto-flushes on reconnect.

**Support escalation**: Link to owner Activity tab + full `.ai/` evidence. Do not share raw tokens/passwords. All mutations audited via RPCs + metadata events.

## Evidence & References
- **Commits**: P0 859285c → P13 4c93bb1 (full list in `.ai/01_roadmap/README.md` Phase 5A).
- **MCP impacts & self-reviews**: Inline in `src/app/share/[token]/page.tsx`, `SharePageTabs.tsx`, `ProjectPublicationHeader.tsx`, `actions.ts`, `security.ts`, `public-repository.ts` (every packet documents search_tool + radius + red-first + design 0).
- **Tests**: `tests/vitest/project-publication-*.test.*` (password, actions, decision, header, security) — green at P13.
- **Design**: 0 violations (`bun run lint:design-system` clean post-P9 + P14). SF Pro, ≤12px, regular/medium, 0 tracking, xs radius, reference tokens (DESIGN.md).
- **Divergence note**: Detailed 13 plan docs + Master Prompt + COMPLETION-REPORT in main `.ai/03_plans/project-shared-link-overhaul/` (absent from worktree .ai/ due to isolation). P14 used code + git + existing .ai/ state + MCP.
- **Protocol**: AGENTS.md, Claude.md, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, subagent-driven-development (impacts before edits, red tests, additive, no secrets, .ai/ brain).

**For support**: Direct owners to workshop project header "Shared link" modal. Direct recipients to the provided `/share/[token]` URL + this doc for common issues. All P0–P13 followed full quality gates; P14 is pure documentation closure.

---

*This walkthrough is additive documentation only. No behavior change. Update alongside roadmap/state after any future publication slice.*