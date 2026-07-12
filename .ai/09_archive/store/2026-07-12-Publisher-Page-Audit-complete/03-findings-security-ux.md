# 02b — Findings: Security, UX/UI & Consistency

Severity: **P0** security/data · **P1** real issue · **P2** debt · **P3** nit.
Evidence = `file:line` vs `main@b4b85b307`. The public share path was summarized
for context (only Publisher-reused slices are in scope).

## Security

### SEC-1 — Share HTML page lacks explicit `Cache-Control: no-store` [P1]

**Evidence:** `src/app/share/[token]/page.tsx` sets `export const dynamic =
"force-dynamic"` (line 35) but sends **no explicit `Cache-Control`** header on
the HTML response. All sibling JSON API routes (`/api/share/[token]/*`) send
explicit `Cache-Control: no-store`; the page does not.

**Impact:** `force-dynamic` prevents Next's data cache, but a downstream CDN
(Cloudflare) could cache the rendered HTML by default. For a password-protected
publication, the unlocked HTML (after cookie verify) could in principle be
CDN-cached if Cloudflare cache rules are loose, leaking the proposal to a
different visitor at the same edge. **Not a confirmed exploit** (depends on
Cloudflare cache rules / `next.config` headers not audited here), but the
defensive fix is cheap and the API siblings already do it.

**Note on scope:** this is the public `/share/[token]` page, which the Publisher
**preview route reuses** (`preview/[projectId]/page.tsx` renders the same
`ShareContainer`/components). The preview route itself is `requireAuth` +
`assertProjectPublicationManager` gated, so the concern is the *public* page the
Publisher generates links to — included because the Publisher is the entry point
that creates these links.

**Fix shape (UNIT-4):** add `Cache-Control: no-store` (and consider
`Surrogate-Control: no-store`) to the share page response, matching the JSON API
siblings. Verify Cloudflare cache rules don't override. `TEST_PROPOSAL`
optional (verify header present on a response — needs runtime).

### SEC-2 — Preview `token="manager-preview"` is safe (verified, no action)

**Evidence:** `preview/[projectId]/page.tsx:37` passes
`previewMode="manager-read-only"`, `token="manager-preview"`,
`viewToken="manager-preview"` to `ShareReviewWorkspace`.

**Conclusion:** **Not a vulnerability.** `previewMode` is a truthy gate that
*removes* the comment/decision components (it hides, never unlocks). The fake
`"manager-preview"` token never reaches an API: the comment/decision components
(which call `/api/share/<token>/*`) are not rendered in preview mode; the only
component that uses `token` (`SharePageTabs`) uses it solely as a
`localStorage` key (`share-tab:${token}`), no network. Even a tampered client
re-enabling the UI would call `/api/share/manager-preview/...`, which fails
`isPublicationTokenShape` (must be 43 base64url chars) → 404. The preview page
is `requireAuth` + manager-gated. **Documented as safe; no fix.**

### SEC-3 — Manager mutation error leakage (ties to BUG-3) [P2]

**Evidence:** uncaught throws in `assertProjectPublicationManager`
(`actions.ts:394`) propagate to the client. The public comment route
(`comment/route.ts:440-446`, SEC-15) explicitly avoids echoing RPC/DB errors,
but the *manager* server actions do not have the same guarantee.

**Impact:** A D1/internal error message could surface in the manager UI feedback.
Low severity (manager is authenticated, no cross-user data), but inconsistent
with the public-side redaction discipline. Fix alongside BUG-3 (UNIT-5):
return generic `{ ok:false, message }` rather than raw error text.

### Security posture — strengths (no action, documented for memory)

- Token: HMAC-SHA256 hash stored; AES-256-GCM envelope at rest; decrypt only for
  link construction (`security.ts:78-99`).
- Password: scrypt + per-hash salt; constant-time verify; signed access cookie
  bound to `deriveCredentialVersion(passwordHash)` so password rotation
  invalidates old cookies (`security.ts:143-195,318`).
- Recipients: HMAC-hash only in DB; raw token stripped from URL after session
  cookie set via redirect (`session/route.ts:34-44`).
- Rate limits on every public surface: open 60/min, comment 5/min/20hr, decision
  5/min, password 5/hr with backoff, session 10/min/50hr, export 12/min/120hr.
  Keys are `sha256(scope + tokenHash + ipHash)`, IP HMAC'd with a pepper.
- CSRF double-submit (`x-archestimator-csrf` header == `ae_publication_csrf`
  cookie) on all public writes (`security.ts:374-410`).
- OG metadata generic (no project names/totals/images) — safe link unfurl.
- RBAC: all manager mutations `requireAuth` + owner/admin role
  (`permissions.ts:7`); recipient actions re-assert manager on the resolved
  project.
- `submitClientComment` / `submitClientResponse` re-validate
  `activePublicationWhere(tokenHash)` + snapshot version before write
  (`d1-store.ts:666-669,746-748`) — optimistic-concurrency guard.

## UX / UI

### UX-1 — `PublisherProjectMembersPanel` dead code (feature gap or stale scaffold) [P1]

See BUG-6. If the drawer was meant to show project members, the feature is
missing from the live UI.

### UX-2 — `ClientPreviewBanner` hardcodes amber palette bypassing theme tokens [P2]

**Evidence:** `ClientPreviewBanner.tsx:5` uses `border-amber-200 bg-amber-50
text-amber-950` instead of theme tokens (`warningSoft`/`warning` used elsewhere,
e.g. `PublisherDrawer.tsx:252`).

**Impact:** Visual inconsistency with the rest of the warning surface; won't
adapt if theme tokens change. Note `DESIGN.md` is alpha-stage (defer to Philip
on design), so this is low priority — flagged for consistency, not blocking.

**Fix shape (UNIT-7):** swap to `warning`/`warningSoft` tokens (or confirm
amber is intentional with owner given DESIGN.md is alpha).

### UX-3 — Two pagination models coexist on one page [P2]

**Evidence:** roster uses **URL page-number** pagination
(`PublisherPagination.tsx`); activity feed uses **cursor** pagination
(`PublisherActivityFeed` → `SharedLinkActivityFeed` "Load older activity" button).

**Impact:** Not a bug — they paginate different data with different shapes
(roster = bounded filtered set; activity = append-only event stream). Documented
as intentional. No action unless simplification is desired.

### UX-4 — Tiny font sizes throughout (`!text-[8px]`/`[9px]`/`[10px]`) [P3]

**Evidence:** pervasive `!text-[9px]`, `!text-[10px]`, `!text-[8px]` across
`PublisherRosterClient`, `PublisherDrawer`, `PublisherRosterCard`, etc.

**Impact:** Readability/accessibility concern at very small sizes. `DESIGN.md`
is alpha-stage; defer to Philip. Flagged as a nit, not blocking.

## Consistency / tech debt (P2/P3)

| ID | Finding | Evidence | Fix |
|---|---|---|---|
| DEBT-1 | Activity `limit:50` duplicated as literal in 3 files | `activity-repository.ts:107`; `PublisherActivityFeed.tsx:17`; `SharedLinkActivityFeed.tsx:140,192` | UNIT-7: single source of truth |
| DEBT-2 | `console.warn` left in production | `roster-repository.ts:199` (`[publisher-roster] unable to decrypt publication token`) | UNIT-7: route through structured log or remove |
| DEBT-3 | `PublisherRosterRow.tsx` misnamed (helpers module) | `PublisherRosterRow.tsx` — exports `readPublisherStatusCopy`, `formatPublisherDate`, etc. | UNIT-7: rename to `publisher-row-helpers.ts` (low value; churn risk) |
| DEBT-4 | Locale `"en-PH"` hardcoded in 2+ places | `PublisherRosterRow.tsx:24`; `PublisherDrawer.tsx:60`; `ProjectMembersAccessPanel.tsx:135` | UNIT-7: shared locale constant (low priority) |
| DEBT-5 | Pixel-size class literals duplicated | grid templates in skeleton/picker/members | low priority; defer to DESIGN.md |
| DEBT-6 | `load()` manual pagination not guarded against double-click | `SharedLinkActivityFeed.tsx:346` (only `disabled={loadingMore}`) | UNIT-2 (optional): add re-entrancy guard |
| DEBT-7 | `PublisherProjectPicker` double focus directive | `PublisherProjectPicker.tsx:70,85` (`initialFocus="first"` + `autoFocus`) | UNIT-7: verify dialog primitive precedence; remove conflict |

## Outdated code assessment

The Publisher surface is **largely current and not outdated**. The "legacy"
markers found are **intentional backwards-compat** (old drawer tab URLs, old
cursor format, legacy snapshot row shapes) — all documented and aligned with
current runtime types. The Supabase-style query builder in `admin-d1-client.ts`
is **D1, not legacy Supabase** (verified: `actions.ts:265-267`). No dead
Supabase/Postgres/RLS dependency was found in the Publisher path. The only true
dead production code is `PublisherProjectMembersPanel` (BUG-6/UX-1).
