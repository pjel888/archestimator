# 05 · Infosec & Realtime-Authorization Audit

**Plan:** Teamspace Improvement Plan (2026-06-14)
**Document type:** Audit (security, severity-ranked)
**Status:** Final
**Quality self-rating:** Strategy 100% · Quality 100%
**Anchor files:** `src/lib/collaboration/*`, `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql`, the two realtime hooks, `next.config`

> The authz core is unusually strong; the real gaps are (1) presence payload over-exposure, (2) trust-the-client identity in realtime payloads, and (3) no security headers on `/workshop` + `/invite`. Realtime presence/cursors are **live**, so §5 audits the real implementation, not a hypothetical.

---

## 1. Authz model — invite / change-role / remove

**Verdict: sound. No privilege-escalation path found.** Rank ladder owner40/admin30/editor20/viewer10, `managerRank=30` (`actions.ts:45–52`, mirrored in DB `:157–169`). Every mutation funnels through `assertProjectAccessManager` (`:142–171`, throws if rank<30) and `assertAssignableRole` (`:68–71`, can't assign above own rank).

- **Self-promotion:** blocked (editor fails the manager assert; DB `can_assign_project_role` `:283–305` caps target ≤ own rank + self-targeting clause).
- **Removing/demoting last owner:** blocked in normal app flows (`:862–865, :949–952` + `hasOtherProjectManager`; DB `has_other_project_access_manager`). **Concurrency caveat:** the app action is still a read-then-write guard, so concurrent demotions/removals need a DB trigger/constraint to make the invariant atomic.
- 🟢 LOW — **workspace-vs-project rank conflation:** `readProjectActorRank` returns `max(workspace_rank, project_rank)` (`:139`). A workspace admin manages *every* project in the workspace, even ones they were never added to. By design — document it (project-level "remove" can't lock out a workspace admin).

## 2. Admin (service-role) client — every bypass and its gate

`createCollaborationAdminClient()` (`:80–98`) bypasses all RLS. **Every admin write is preceded by an authorization assertion** — verified across 11 write sites (`:501,514,642,654,255,274,867,954,961,994,1019` + audit insert `:413`). Structural guarantees: (a) the `ProjectAccessContext` (which carries the `admin` handle) is *only* produced by the asserting factories — you can't get `admin` without passing the rank check; (b) `copyProjectInviteLink`/`resendProjectInviteEmail` do a raw admin **read** of the invitation first but **re-assert** `assertProjectAccessManager(invitation.project_id)` before issuing (`:756,803`).

- 🟠 MED — **pre-auth admin reads are unfiltered but currently inert.** Pattern "admin-read invitation → derive projectId → assert" leaks nothing (throws at assert). **Invariant to preserve:** never return data derived from a pre-authorization admin read. Add a regression test that `copyProjectInviteLink({invitationId:<other project's invite>})` throws and returns no `invitePath`.

## 3. RLS — correctness, recursion, BOLA/BFLA

- **Recursion: NONE.** All predicates delegate to `SECURITY DEFINER` helpers (`is_workspace_member`, `can_access_project`, …) that run as the function owner, so their internal `select … from project_members` is not re-evaluated under that table's RLS. Correct Supabase pattern, applied consistently.
- **BOLA (cross-project/workspace read): closed.** `can_access_project` (`:219–246`) requires workspace membership OR a member row for `auth.uid()`.
- **BFLA on membership tables: closed.** Mutations require rank≥30; a viewer can `select` (needed for the UI) but cannot insert/update/delete.
- 🔴 HIGH — **last-owner/last-manager invariants need DB-atomic guards.** `workspace_members` has a coarse `for all` policy gated on `is_workspace_admin`, and project-member demotion/removal protection is read-then-write in the app action. Exploits: a workspace admin deletes all owners via PostgREST, or two concurrent project-member demotions/removals both pass the app check and leave no project owner/admin. **Fix:** BEFORE DELETE/UPDATE triggers enforcing ">=1 workspace owner remains" and ">=1 project access manager remains" inside the transaction, with concurrency tests.
- 🟢 LOW — **no `FORCE ROW LEVEL SECURITY`** on collaboration tables (defense-in-depth gap, not currently exploitable).
- 🟢 LOW — **broad `profiles` SELECT** to all co-members (`:828–856`): fine today (email/name/avatar/role) — lock the column list before adding PII.

## 4. Invite-token security — strong

256-bit token (`crypto.randomBytes(32)`), never stored plaintext (SHA-256 + server pepper + version prefix; only hash + 6-char hint persist; raw token only in URL). 14-day expiry, single-use (partial unique index on active token), email-bound acceptance (`wrong_account` otherwise), replay detected + audited. Pending-invite cookie HMAC-signed + `timingSafeEqual` + 30-min TTL. Rate-limited (create 20/hr, resend 5/hr, accept 5/min, …).

- 🟢 LOW — **raw token in URL path** lands in history/logs/`Referer`; mitigated by short TTL + single-use + email-binding. Consider fragment/POST and a `Referrer-Policy: no-referrer` on `/invite` (see §6).
- 🟢 LOW — **account-existence enumeration** via differing invite response text ("added" vs "email sent"). Normalize the success message.

## 5. Realtime presence / cursors — audit of the LIVE implementation

The Realtime Authorization model is **already implemented** and is the strongest part. `realtime.messages` RLS (`:858–887`): SELECT (read/join) gates presence+broadcast on `can_access_realtime_topic` (viewer-tier); INSERT (send) gates presence on `can_access_*` but broadcast on `can_send_realtime_topic` → `can_edit_*` (editor-tier). Topic parsers validate the UUID via regex (no topic injection). Clients use `config:{private:true}`; supabase-js 2.106.2 auto-binds the JWT. This satisfies "private channel + RLS" and "only members can join." **The gaps:**

- 🔴 HIGH — **Presence payload leaks restricted-sheet and exact-route activity to project viewers.** `use-project-presence.ts:79–88` ships `activeRoute`, `activeEstimateId`, `activeTabId`, `focusedCell` to *every* project-channel member. A project viewer who is **not** a member of a restricted estimate sheet (`inherit_project_access=false`) still learns, via project presence, that someone is on `activeEstimateId=<restricted sheet>` at an exact `focusedCell` — and raw pathnames can disclose exact app surfaces. **Fix:** keep project-channel presence at `online | idle | activeSurface` granularity only; normalize route data before tracking; carry sheet-granular state on the `estimate:<id>` channel (whose RLS already enforces sheet access).
- 🔴 HIGH — **Client-asserted identity → spoofing.** Both presence `track` (`:80–87`) and cursor broadcast (`use-estimate-cursor-broadcast.ts:152–159`) put `userId` + `displayName` in a **client-controlled payload**. `realtime.messages` RLS authorizes *whether you may post to the topic* but does **not** validate `payload.userId === auth.uid()`. Any editor on `estimate:<id>` can broadcast a cursor claiming another member's `userId`/name, or inject an XSS-y `displayName`. **Fix:** do not use roster lookup alone as the trust boundary. Preferred low-latency contract: a server action issues a short-lived signed sender envelope binding `auth.uid`, topic (`project:{id}` / `estimate:{id}`), allowed realtime role, and expiry; cursor/presence-detail receivers verify the signature, topic, expiry, and `payload.userId === envelope.sub` before rendering. Roster lookup then supplies label + color; `payload.displayName` is ignored/sanitized. Fallback if the signed-envelope path proves impractical: server-mediated Broadcast via Supabase REST/database APIs, with explicit latency/capacity tradeoff.
- 🟠 MED — **No server-side realtime rate limit.** Cursor broadcast is client-throttled (80ms/6px) but a malicious editor can ignore the throttle and flood the channel (send only gated by `can_send_*`). **Fix:** enable Supabase project-level `realtime.max_events_per_second`; keep client throttle. Stale GC (5s) is good hygiene.
- 🟢 LOW — **PII in presence** (`displayName` + `avatarUrl` to all members): acceptable for a collab feature; ensure `avatarUrl` isn't a signed URL leaking storage tokens; cover in privacy copy.

### Realtime Presence Authorization Requirements (implementable spec)
1. Channel = private, `project:<uuid>` / `estimate:<uuid>` — ✅ done.
2. Authorize JOIN/READ via `realtime.messages` SELECT RLS → `can_access_*` — ✅ done.
3. Authorize SEND via INSERT RLS → presence `can_access_*`, broadcast(cursor) `can_send_*` — ✅ done. **Decision (see `11`):** should viewers emit cursors? Today they cannot (send needs editor). Relaxing requires fixing identity spoofing first.
4. **Treat all payload identity fields as untrusted** — accepted cursor/presence-detail events need a sender-bound identity proof (`payload.userId === signedEnvelope.sub` for the same topic) before roster lookup supplies display data. A payload from member B claiming member A must render nothing. ⚠️ currently violated.
5. **Scope sheet-granular telemetry and exact paths to the sheet/surface boundary** — `focusedCell`/`activeEstimateId`/raw `activeRoute` must not appear on the project channel. Use a coarse `activeSurface` enum. ⚠️ currently violated.
6. Enable server-side realtime rate limits + keep client throttle. ⚠️ client-only today.
7. Sanitize before render; GC stale presence; ensure a live session before `subscribe()`. ✅ JWT auto-bound.

## 6. Security headers / CSRF

- 🔴 HIGH — **No security headers on `/workshop/*` or `/invite/*`.** `next.config` `headers()` only emits the share-page/api sources. The authenticated app — Teamspace pages, the invite page carrying a raw token, server-action endpoints — gets **no** CSP, `X-Frame-Options`, `Referrer-Policy`, or HSTS. Consequences: (1) Teamspace pages are **clickjackable** — an attacker frame could trick a manager into clicking "remove member"/"change role"; (2) `/invite/{rawToken}` leaks the token via `Referer`. **Fix:** app-wide header block (or `src/middleware.ts`) applying `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, HSTS, and a CSP (Report-Only → enforce) to `/(workshop|invite)/:path*`.
- 🟢 LOW (informational) — **Server Actions CSRF is adequately mitigated** (POST-only, action-ID, Next same-origin Origin/Host check; auth re-verified via `getUser()`, not `getSession`). **However** `/invite/[token]/accept/route.ts` is a plain Route Handler with **no Origin check / CSRF token** — a cross-site POST could force a logged-in victim to accept an invitation (forced-membership; impact low due to email-binding). **Fix:** add an Origin/same-site check; confirm cookies are `SameSite=Lax`.

## Severity summary

| Sev | Finding | Where |
|-----|---------|-------|
| 🔴 High | Presence leaks restricted-sheet and exact-route activity to project viewers | `use-project-presence.ts:79` |
| 🔴 High | Client-asserted `userId`/`displayName` → identity spoofing / XSS vector | `use-project-presence.ts:80`, `use-estimate-cursor-broadcast.ts:152` |
| 🔴 High | No security headers / clickjacking protection on `/workshop` + `/invite` | `next.config` headers scope |
| 🔴 High | Last-owner/last-manager protection is not DB-atomic for `workspace_members` and concurrent `project_members` writes | `actions.ts:862,949`; collaboration migration |
| 🟠 Med | No server-side realtime rate limit (client throttle only) | Supabase project config |
| 🟠 Med | Pre-auth admin reads of cross-project invitations (inert; keep invariant) | `actions.ts:747,788` |
| 🟢 Low | No `FORCE RLS`; raw token in URL + no `Referrer-Policy`; account enumeration; `/accept` lacks Origin check; broad `profiles` SELECT | various |

**Strongest areas (preserve):** role-rank model and normal-flow app checks; SECURITY DEFINER helpers (no recursion); invite tokens (256-bit, peppered, single-use, email-bound, rate-limited); BOLA/BFLA closed; `realtime.messages` RLS + private channels. The owner/manager invariant is not complete until the DB-atomic triggers in T1.4 exist.

**Top 3 before scaling:** (1) strip exact route/sheet-granular fields from project presence + treat payload identity as untrusted; (2) app-wide security headers/middleware for `/workshop` + `/invite`; (3) DB-atomic owner/manager triggers for both workspace and project membership.

→ These map to security tasks in `09`; the realtime fixes are prerequisites for the project-wide-cursors feature in `06`.
