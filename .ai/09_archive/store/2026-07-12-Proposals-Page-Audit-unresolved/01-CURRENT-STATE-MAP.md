# 01 — Current-State Map: `/workshop/proposals`

Audit date: 2026-07-12. All paths repo-relative under
`/Users/philiplewis/Documents/archestimator`. Every claim cites `file:line`.

## 1. Naming reality (read this first)

**"Proposal" and "publication" are the same object.** There is **no `proposals`
table**. The canonical record is `project_publications`. User-facing copy, the
route, and components say "Proposal"; the data model, repository, and server
actions say "publication". The recipient inbox at `/workshop/proposals` lists
`project_publications` rows where the signed-in user is a
`shared_link_recipients` row.

`proposal_packages` appears only once in the schema — as an onboarding enum value
in `migrations/0005_account_settings.sql` (the user's `primary_use` profile
setting). It is not a table.

## 2. Route files (4 files)

| File | Role | Lines |
|---|---|---|
| `src/app/workshop/proposals/page.tsx` | RSC entry; renders chrome + Suspense | 24 |
| `src/app/workshop/proposals/proposals-data.tsx` | async server component; auth + fetch | 14 |
| `src/app/workshop/proposals/loading.tsx` | route loading → `ProposalsListSkeleton` | 5 |
| `src/app/workshop/proposals/error.tsx` | `"use client"` route error → `WorkshopRouteErrorState` | 15 |

`page.tsx:8-24` — default export `ProposalsPage`. Wraps content in
`<WorkshopRouteHeader title="Proposals" eyebrow="Workspace" showEyebrow={false} breadcrumbs={["Proposals"]} contentClassName="">`,
renders `<WorkshopCanvasWash className="projects-canvas-wash" />`, then
`<Suspense fallback={<ProposalsListSkeleton />}><ProposalsData/></Suspense>`.

`proposals-data.tsx:6-14` — `ProposalsData` async server component. Inside
`withPerfTraceRequest("workshop.proposals.data", …)`: calls
`requireCurrentUserContext()` (authn — redirects `/login` on no session), then
`traced("recipient-proposals.route.list", () => listRecipientProposals())`, then
returns `<ProposalsPageClient userEmail={user.email} initialResult={initialResult} />`.

## 3. Server/client boundary

```
SERVER                                  CLIENT ("use client")
page.tsx                                proposals-page-client.tsx
proposals-data.tsx  (split point)       proposals-page/ProposalsList.tsx
WorkshopRouteHeader.tsx                 proposals-page/ProposalRow.tsx
WorkshopCanvasWash.tsx                  WorkshopRouteErrorState.tsx
ProposalsListSkeleton.tsx              error.tsx (route error boundary)
ProposalsEmptyState.tsx
ProposalsErrorState.tsx
recipient-proposals/actions.ts ("use server")
recipient-proposals-repository.ts ("server-only")
```

The boundary is crossed at `ProposalsPageClient`. Server fetches auth + initial
list; client hydrates TanStack Query with `initialData` and owns refetch/error/
empty logic.

## 4. Component tree (client side)

`src/components/workshop/proposals-page-client.tsx` (`"use client"`, line 1)

- Props (`:13-16`): `{ initialResult: RecipientProposalsResult; userEmail: string }`.
- TanStack Query (`:48-61`):
  - key: `["recipient-proposals", userEmail]` (memoized).
  - `queryFn`: `fetchRecipientProposals` → server action `loadRecipientProposals` (`:31-35`).
  - `initialData: initialResult.ok ? initialResult : undefined`.
  - `enabled: initialResult.ok`.
  - `staleTime: 30_000`, `refetchOnWindowFocus: true`, `retry: false`.
- **No `useMutation`.** The only write-path from the page is the per-row
  `openRecipientProposalAction` server action via `useActionState`.
- **No search, sort, filter, pagination, or view-mode controls.** The only
  interactive control above the list is a manual Refresh button.
- Refs: `retryButtonRef`, `focusRetryAfterFailureRef`, `refreshInFlightRef`.
- `refresh()` (`:63-76`) wraps `query.refetch()` with an in-flight guard.
- Rendering:
  - Hard error (no data + error) → `<ProposalsErrorState>` (`:98-108`).
  - Else: header bar (`h1 "Proposals"` `text-[12px]`, userEmail `text-[10px]`, Refresh button).
  - Soft error (data present + error) → inline warning banner with `WarningCircle` + Retry (`:131-147`).
  - `rows.length > 0` → `<ProposalsList rows onActionError>` (`:150`).
  - else → `<ProposalsEmptyState />` (`:152`).

`src/components/workshop/proposals-page/ProposalsList.tsx` (`"use client"`)
- Props: `{ rows; onActionError? }`. Bordered white card, `<h2>Recipient proposals</h2>` + count chip, maps rows to `<ProposalRow>`.

`src/components/workshop/proposals-page/ProposalRow.tsx` (`"use client"`)
- Props (`:25-28`): `{ proposal: RecipientProposalRow; onActionError? }`.
- `useActionState(openRecipientProposalAction, null)` (`:74`) — React 19 server-action form. Hidden `publicationId` (`:146`), submit `<Button variant="brand" size="sm">` ("Review"/"Opening").
- `getProposalState` (`:51-57`): revoked→danger/XCircle, expired→warning/Hourglass, decision set→success/CheckCircle, hasOpened→neutral/Eye, else New→neutral/Clock.
- `disabled = proposal.status !== "published"` (`:77`).
- Chips: status, decision (`decisionLabels` `:36-40`), expiry (`SealWarning`).
- `formatProposalDate` (`:42-49`): `Intl.DateTimeFormat(undefined, {month short, day numeric, year numeric})`.

`src/components/workshop/proposals-page/ProposalsEmptyState.tsx` (server) — dashed-border card, `EnvelopeSimple`, "No proposals yet" + "This inbox shows proposals sent to your email address."

`src/components/workshop/proposals-page/ProposalsErrorState.tsx` (server) — props `{ error: "unauthorized"|"unknown"; isRetrying?; onRetry; retryButtonRef? }`.

`src/components/workshop/proposals-page/ProposalsListSkeleton.tsx` (server) — uses `<Skeleton>`; 6 skeleton rows mimicking `ProposalRow` grid.

### Shared workshop chrome

- `WorkshopRouteHeader.tsx` (`async`, `:54`) — header + content wrapper. Renders `WorkshopTitleHeader` (breadcrumbs), header actions, `WorkshopNotificationEntry`, and `WorkshopSettingsModal` in Suspense.
- `WorkshopCanvasWash.tsx` (`:6`) — `<div data-workshop-canvas-wash hidden aria-hidden>` marker; `projects-canvas-wash` class drives CSS `:has(...)` to copy `--workshop-page-canvas-wash` onto the shell.
- `WorkshopRouteErrorState.tsx` (`"use client"`, `:1`) — used by `error.tsx`; auto-focuses retry, logs in non-prod, reports via `postClientErrorReport`.

### UI primitives used

Only two: `Button` (`src/components/ui/button.tsx`) and `Skeleton`
(`src/components/ui/skeleton.tsx`). No Card/Dialog/Sheet/Input/Select.

### Sidebar wiring

`src/components/sidebar/MainSidebar.tsx` — `{ id: "proposals", href: "/workshop/proposals", label: "Proposals", icon: Presentation, shortcut: "⌘4" }`. The page is reachable from the sidebar.

## 5. Data layer

### Repository — `src/lib/repositories/recipient-proposals-repository.ts` (164 lines, `"server-only"`)

`listRecipientProposals()` (`:86-163`):
- No parameters. Reads user inside via `getCurrentUserContext()` (`:88`).
- Returns `RecipientProposalsResult = { ok:true; rows } | { ok:false; error:"unauthorized"|"unknown" }` (`:28-30`).
- Scoping: `WHERE lower(recipient.email) = ?` bound to caller's lowercased email (`:147, :152`). **No userId, no workspace_id, no membership join.**
- Single prepared statement, JOINs 6 tables (`:98-151`):
  `shared_link_recipients recipient` INNER JOIN `project_publications publication` INNER JOIN `projects project` (on project.id AND project.workspace_id = publication.workspace_id) INNER JOIN `workspaces workspace` LEFT JOIN `profiles sender` LEFT JOIN `shared_link_responses response` (correlated subquery, latest by created_at DESC).
- `status` computed in SQL CASE (`:107-111`): revoked if `status='revoked'` OR `revoked_at` set; expired if `status='expired'` OR `expires_at <= now`; else published.
- `last_activity_at` = `MAX(published_at, last_opened_at, response.created_at, revoked_at, expires_at-or-published_at)` (`:114-123`).
- `decision` = latest `shared_link_responses.decision` for that recipient+publication (correlated subquery `:138-146`).
- `ORDER BY last_activity_at DESC, publication.published_at DESC, publication.id DESC` (`:149`).
- **Hard `LIMIT 50`**, no offset, no cursor (`:150, :152`).
- Bindings: `now, now, recipientEmail, 50` (`:152`).
- **Error swallowing:** `catch { return { ok:false, error:"unknown" } }` (`:160-162`). No logging.
- **One-bad-row-fails-all:** `if (rows.some(row => row === null)) return { ok:false, error:"unknown" }` (`:157`). A single unmappable row blanks the whole inbox.

Row mapping (`:61-84`):
- `normalizeStatus` (`:50-53`): only `published|expired|revoked`; else `null`.
- `normalizeDecision` (`:55-59`): `null`→`null`; valid→valid; **unexpected→`undefined`**.
- `mapRecipientProposalRow` (`:65`): `if (!status || decision === undefined || !Number.isFinite(snapshotVersion)) return null;`.

### D1 access — `src/lib/cloudflare/d1.ts`

`getCloudflareD1Database()` (`:35-44`): dynamically imports `getCloudflareContext` from `@opennextjs/cloudflare`, calls with `{ async: true }`, reads `context.env.ARCH_DB`, validates `prepare` exists, returns `null` on any failure.

### Server action wrapper — `src/lib/recipient-proposals/actions.ts` (12 lines, `"use server"`)

`loadRecipientProposals()` (`:9-12`): `await requireCurrentUserContext(); return listRecipientProposals();`. Re-calls the same repo (so the client refetch path re-resolves user + re-queries D1).

### Adjacent modules NOT called by the inbox (context only)

- `src/lib/publication/d1-store.ts` — low-level D1 store for snapshots/comments/decisions/recipients. Used by `/share/*`, not the inbox.
- `src/lib/publication/public-repository.ts` — rate limits + token verification + comments/decisions. Used by `/share/*`.
- `src/lib/publication/admin-d1-client.ts` — Supabase-ish `.from()` shim used by the manager actions in `publication/actions.ts`.

## 6. Schema (D1 migrations)

Core tables: `migrations/0014_publication_shared_links.sql`. FK hardening:
`migrations/0066_publication_foreign_keys.sql`.

`project_publications` (`0014:1-28`): `id, workspace_id, project_id, token_hash UNIQUE, encrypted_token, password_hash, status ('published'|'expired'|'revoked'), snapshot_version, selected_estimate_ids (JSON), snapshot_json (JSON), activity_target_labels_json (JSON), location_visibility, published_by, published_at, expires_at, revoked_at, open_count, latest_opened_at, created_at, updated_at`.
- Indexes: partial unique `idx_project_publications_one_published_per_project ON (project_id) WHERE status='published'`; `idx_project_publications_project_status`; `idx_project_publications_token_hash`.

`shared_link_recipients` (`0014:58-81`): `id, publication_id, email, display_name, invited_by, invited_at, recipient_token_hash UNIQUE, delivery_status ('pending'|'sent'|'bounced'|'opened'|'responded'), last_opened_at, email_unsubscribed_at, resend_*`.
- Indexes: unique `idx_shared_link_recipients_publication_email ON (publication_id, lower(email))`; `idx_shared_link_recipients_token_hash`; `idx_shared_link_recipients_publication_created`; **`idx_shared_link_recipients_lower_email ON (lower(email))`** (the index the inbox `WHERE lower(recipient.email)=?` uses); partial unique on `resend_email_id`.

`shared_link_responses` (`0014:126-147`): `id, publication_id, recipient_id, decision, signer_name, signature_intent_hash, created_at`.
`shared_link_events` (`0014:164-178`), `shared_link_comments` (`0014:99-114`), `project_publication_events` (`0014:40-53`), `publication_digest_log` (`0014:186-195`).

`0066` rebuilds each table as `*__0066`, copies rows, drops old, renames, re-creates indexes, and adds real `REFERENCES ... ON DELETE CASCADE/SET NULL`. It also tightens `project_publication_events.event_type` CHECK to **drop `download_attempt_blocked`** (`0066:26-27,127`) — a latent break for any code still emitting that event.

Latest migration as of 2026-07-11 audit: `0067` (`0067_beta_activation_events.sql`). Confirm with `ls migrations/ | sort | tail -3` before any new migration.

## 7. Server action reached from the inbox — `openRecipientProposalAction`

`src/lib/publication/actions.ts:304-380` (`"use server"`):
- `requireCurrentUserContext()` (`:308`).
- Calls D1 RPC `authorize_recipient_publication_for_current_user` with `{ p_publication_id, p_current_user_email: currentUser.email }` (`:319-325`). **Independent recipient authz** — keyed on email, re-verified at open time.
- If no `recipient_id` → `{ ok:false, error:"not-a-recipient" }` (`:330-332`).
- Reads publication row, decrypts token (`:332-352`).
- If no password: sets shared-link session cookies (`:353-371`) and `redirect("/share/${token}")` (`:373,378`).
- This is the **only** write/navigation path from the inbox row.

Defense-in-depth: even though the list is email-scoped, opening is independently
gated by an authorize procedure. A leaked `publicationId` in the list payload
alone cannot grant access.

## 8. Auth / perf / observability

### Auth — `src/lib/auth/session.ts`
- `requireCurrentUserContext()` (`:109-113`): redirects `/login` on no session. `enforceTermsAcceptance` option accepted but **unused** (gate is in layout).
- `getCurrentUserContext()` (`:98-107`): wrapped in React `cache` (one resolution per request). Tries dev-auth bypass, then Better Auth (when `isCloudflareBetterAuthProviderEnabled()`), then closed-beta gate, then profile lookup, then `account_status` banned/suspended → `/access-required`.
- Returns `CurrentUserContext` `{ userId, email, role, profile, displayName, avatarUrl }`. **Carries NO workspace id** — workspace scoping must come from repo SQL.
- Middleware (`src/middleware.ts` → `src/lib/auth/request-proxy.ts`) does a **cookie-presence check** only for `/workshop/*`; real session validation is server-side. Sets `Cache-Control: private, no-cache, no-store` on all `/workshop/*` responses.

### Perf — `src/lib/perf/server-timing.ts`
- `withPerfTraceRequest` (`:65-84`) + `traced` (`:86-96`): use `AsyncLocalStorage` from `node:async_hooks`. **Dormant unless `PERF_TRACE=1`** (`:32-34,66,87`). When dormant, near-zero overhead.
- Does **NOT** emit a `Server-Timing` HTTP header despite the name — only `console.log` JSON lines. Name is a misnomer.
- Workers concern: `node:async_hooks` works only via `wrangler.jsonc:6` `compatibility_flags: ["nodejs_compat"]`. Module-level `new AsyncLocalStorage()` evaluates at import regardless of the flag.

### Observability — `src/lib/observability/logger.ts`
- `emitLogRecord`/`logAppError` → `writeDevLogRecord` → `appendFileSync` to `logs/dev.ndjson` (50MB rotation).
- **Gate:** `shouldWriteDevLog()` (`:57-62`) writes only when `NODE_ENV !== "production"` OR `ARCHESTIMATOR_DEV_LOG_PATH` set. On the deployed Worker (production, no FS) it is a no-op. If `ARCHESTIMATOR_DEV_LOG_PATH` were set in Workers env, `node:fs` calls would throw.
- **Critically:** `listRecipientProposals` swallows errors (`recipient-proposals-repository.ts:160-162`) **without** calling `logAppError`. D1 failures from this path produce zero log evidence.

## 9. Rendering / caching / revalidation

- The page is **implicitly dynamic** (no `export const dynamic/revalidate` on the route, workshop layout, or root layout). Forced by `headers()` (layout `:28`, session `:55`) and `cookies()` (`openRecipientProposalAction` `:361`).
- No `unstable_cache`, `"use cache"`, `revalidateTag`, or React `cache()` on the repo read. **The recipient-proposals read is not cached at the repository/RSC level.**
- Client cache only: TanStack Query `staleTime 30_000`, `refetchOnWindowFocus: true`, `retry: false`.
- `next.config.ts:114-117`: `experimental.staleTimes` dynamic=60s → warm Router Cache may serve a stale dynamic segment for up to 60s on back/forward nav.
- `revalidatePublicationRoutes` (`publication/actions.ts:739-749`) calls `revalidatePath("/workshop/proposals")` (`:745`) from publisher CRUD (create/republish/revoke/rotate/recipients add/remove/resend). **No tag-based caches** (`revalidateTag` never used for proposals).
- **Cross-cache gap:** a publisher mutation purges the RSC cache but NOT the recipient's `["recipient-proposals", userEmail]` client cache → up to 30s stale inbox after a publish/recipient-add (accepted as DEC-AUTO-008 in the active pack).

## 10. Cloudflare bindings (`wrangler.jsonc`)

| Binding | Type | Used by proposals? |
|---|---|---|
| `ARCH_DB` | D1 (`archestimator-proof-db`) | **Yes** — inbox SELECT + `authorize_recipient...` RPC |
| `EMAIL` | `send_email` | Indirect — publisher `addSharedLinkRecipients`/`resend...` send invites via `sendCloudflareEmail` |
| `ARCH_UPLOADS_R2` | R2 (`archestimator-proof-uploads`) | Indirect — snapshot row images, not the inbox query |
| `ASSETS`, `IMAGES`, DOs `COLLAB_ROOMS`/`GLOBAL_PRESENCE`/`SUPPORT_INBOX`, Queue `UPLOAD_JOBS_QUEUE`, crons | various | Not used by the inbox |

`compatibility_flags: ["nodejs_compat"]` (`:6`) is what makes `node:async_hooks`/`node:crypto`/`node:fs` viable on the Worker.

OpenNext: `open-next.config.ts` default `defineCloudflareConfig()`; `next.config.ts` defers `cacheComponents` (45 route-segment-config conflicts). Middleware must be `src/middleware.ts` (not `proxy.ts`) per `@opennextjs/cloudflare@1.20.1` manifest behavior.

## 11. Related surfaces (context, not called by inbox)

- **XLSX export** — `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`. `runtime="nodejs"`, `force-dynamic`, `maxDuration=60`, GET. **Manager-side**, workspace-membership-gated for `audience=internal`. **Not reachable from the inbox.** Recipients open proposals via `/share/<token>`, not this route.
- **`/share/[token]`** — the read-only recipient snapshot view the inbox navigates into. Redesigned 2026-07-11 (archived ACHIEVED). `force-dynamic`. Sub-routes under `/api/share/[token]/*` handle session/password/activity/comment/decision/events/unsubscribe.
- **`ProposalExportPreviewDialog`** (`src/components/workshop/ProposalExportPreviewDialog.tsx`) — owner-side preview dialog. Not imported by the inbox.

## 12. Intent vs. current behavior (key gaps)

| Dimension | Intent (spec/roadmap/directive) | Current code |
|---|---|---|
| Layout | "look like the projects page" — card grid, status tabs, search, sort, view modes; grouping is deferred from V1 | Flat bordered table, no tabs/search/sort/view-mode/grouping |
| Delivery status | `responded` is a valid enum (`0014:67`) and UI handles it (`RecipientEmailComposer.tsx:50,245,673-685`) | `submitClientResponse` only writes `opened` (`d1-store.ts:377,410`) — `responded` never set |
| Email normalization | Recipient matching by `lower(email)` | Consistent trim+lower at invite and read, but **no plus-address folding** (`a+tag@x` ≠ `a@x`) |
| Pagination | Implied "all my proposals" | Hard `LIMIT 50`, no "load more" — silent truncation |
| Error visibility | Diagnose D1 failures | Swallowed to generic "unknown", no logging |

The full gap analysis and bug register is in `02-BUG-AND-RISK-REGISTER.md`.
