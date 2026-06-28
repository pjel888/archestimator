# 02 — Feature Brief and Scope

## Source

Two inputs converged to form this brief:

1. **User's confirmed decisions** (from conversation):
   > "1. Top Level Nav, this should definitely be in the main nav sidebar. above the publisher page in the order of things.
   > 2. yes i agree, separate page later. /workshop/proposals inbox and viewing only. i think the estimators view should be in /publisher.
   > 3. yes i agree with your reco, lets ship without it for now.
   > 4. yes i agree with you. show all publications matching their email.. period."

2. **Second AI's independent review** (from conversation):
   > "Best course:
   > 1. Keep Projects for owned projects.
   > 2. Rename the current Projects tab from Shared to Shared Projects eventually, to reduce confusion.
   > 3. Keep Publisher as the estimator/owner-side 'sent proposal links' control plane.
   > 4. Add Proposals as the recipient-side inbox: 'proposal packages sent to me.'
   > 5. Keep /share/[token] working for people who never join the app."

Both sources agree on shape. The user's decisions are the authority on placement and scope.

## User story

**As a** Shared-Link Recipient who has signed in (Google OAuth or magic link),
**I want** a single page in Archestimator that lists every proposal sent to my verified email,
**So that** I can find, track, and re-open proposals without digging through email threads or saving share links.

## Functional scope (v1)

### In scope

1. **New top-level nav item** "Proposals" in `MainSidebar.tsx`, positioned above "Publisher".
2. **New authenticated route** `/workshop/proposals`:
   - Requires signed-in user (`requireCurrentUserContext`).
   - Renders list of publications sent to the signed-in user's verified email.
   - Cross-workspace: shows publications from any workspace where the recipient's email appears in `shared_link_recipients`.
3. **List row data** (per publication):
   - Project name + project code
   - Workspace / sender company name
   - Sender display name (the estimator who invited them, if recorded)
   - Publication status: published / expired / revoked
   - Recipient engagement signals: opened-yet, decision submitted (accepted / declined / revision_requested), last activity timestamp
   - Published date
4. **Review action**: each row has a "Review proposal" control that bridges the user into `/share/[token]` via a server action — no token exposed to client.
5. **Empty state**: helpful copy when no publications match the user's email.
6. **Loading state**: skeleton mirroring the project list loading pattern.
7. **Error state**: graceful fallback if the RPC fails.

### Out of scope (v1)

1. **Estimator-side "Sent" view** — stays in `/workshop/publisher`. Separate future plan.
2. **"Sign in with Google" as share-link password** — separate, larger change involving the publication password route and security primitives.
3. **Lite account / claim token** for recipients who never sign in — the existing `/share/[token]` route already serves them.
4. **Renaming the Projects "Shared" tab** — separate concern. Today's "Shared" tab shows workspace-shared projects (collaborator lane), not received proposals; the misnomer is acknowledged but its rename is not in this plan.
5. **Realtime updates** — refresh-on-focus and manual refresh are sufficient for v1; no Supabase Realtime subscription.
6. **Filters and search** — v1 shows everything published to the user, sorted by `published_at desc`. Filtering by status / sender / project arrives in a later pass.
7. **Pagination** — assumed recipient inbox is small (tens of items, not thousands). If volume grows, the RPC is designed to accept a `page_limit` parameter already.
8. **Mobile-specific layout** — uses the standard workshop shell responsive behavior. No bespoke mobile design.

## Non-goals (explicit)

1. **NOT granting project workspace access** — recipients stay outside workspace membership. They see proposal snapshot data via `/share/[token]`, not live project data.
2. **NOT exposing credential material** anywhere in client bundle, DOM, action state, network response, URL, or logs: `recipient_token_hash`, `project_publications.token_hash`, and `encrypted_token` stay server-only.
3. **NOT modifying `/share/[token]`** behavior — the existing public surface continues working for anonymous and password-unlocked recipients.
4. **NOT introducing a new permission role** — per the canonical persona taxonomy, "personas are not permission roles". The recipient uses the existing `authenticated` role; access is gated by the RPC's `auth.uid()` lookup.
5. **NOT changing the publication lifecycle** — publishing, revocation, expiry, and password mechanics stay exactly as they are.

## Constraints

| Constraint | Source |
|---|---|
| Archestimator Supabase project boundary: `ebxxqidacheyapmmzavr` only | `AGENTS.md` standing database mandate |
| No credential exposure | `20260601145000_lock_down_shared_link_recipient_credentials.sql` + publication token schema/action evidence |
| No service-role key in client bundle | Repo-wide invariant; `publication/public-repository.ts:130-148` pattern |
| RLS must remain enabled on `shared_link_recipients` | `20260528220000_project_shared_link_overhaul.sql:232` |
| Pre-launch MVP iteration bias | `AGENTS.md` — fast useful iteration over heavyweight ceremony |
| Proportional verification | `AGENTS.md` — focused tests for changed behavior, not full `bun run validate` |

## Success metrics

Since this is pre-launch with no external users yet, success is measured by:

| Metric | Target | Measurement |
|---|---|---|
| Plan implementation-readiness | ≥98 overall after independent council repair | `17_FINAL_READINESS_REVIEW.md` scorecard |
| Single-pass implementation feasibility | No `DISCOVERY-REQUIRED`, `BLOCKED-ARCHITECTURE`, or `BLOCKED-EVIDENCE` task markers | `11_IMPLEMENTATION_PLAN.md` task audit |
| Provider-backed RPC proof (post-implementation) | List RPC returns expected rows; authorization RPC returns only ids; non-recipient caller denied | Implementation-time SQL readback |
| Cross-workspace correctness | Fixture recipient with publications from 2 workspaces sees both | Implementation-time provider fixture + browser smoke |

## Failure metrics

| Failure mode | What it signals |
|---|---|
| `recipient_token_hash`, `project_publications.token_hash`, or `encrypted_token` appears in any client bundle, DOM, URL, action state, log, or network response | Critical security regression — halt implementation |
| Non-recipient can read another user's proposals | RLS / RPC logic flaw — halt implementation |
| `/share/[token]` for non-signed-in recipients breaks | Scope bleed — out-of-contract change happened |
| RPC returns slow (>500ms p95) for a fixture recipient with 50 publications | Missing index or query-plan problem |
