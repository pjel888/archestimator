# 05 — UX, UI, and Accessibility Plan

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Verification mode: `emulated`

## Scope note

This audit is an **API audit**, not a comprehensive UX audit (the comprehensive UX audit lives in the sibling pack `.ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/`). This `05_*.md` is therefore a **narrow but non-empty** scope: it covers the UX / accessibility posture of **error states returned by the API surface to clients**, including loading/empty/error states rendered by client components that consume API responses.

Per `Creating-Plan-Prompt.md:615-638` (uX, UI, accessibility), the audit must inspect screen states for every API-driven flow. We narrow to error-bearing surfaces.

Primary user journeys in scope (API-driven, client-visible error states):

1. **Sign-in / sign-up / OAuth callback / magic link** — error envelope surfaces show error toast; loading state on credential submission; magic-link confirm banner on email.
2. **Invite accept / continue** — error on expired/invalid token; session-conflict resolution; ownership-of-existing-account gate.
3. **Project CRUD** — error on duplicate-name conflict; error on quota; error on parent-project required.
4. **Estimate row CRUD** — optimistic update rollback on conflict; row-level error banner when ownership denied.
5. **Direct upload to R2** — upload-progress UI; signed-URL fail; oversized file rejection; unauthenticated retry.
6. **Publication / share link view (anonymous)** — password gate prompt; expired/revoked token; session cookie banner; accessibility of comment modal; decision confirmation modal.
7. **Better Auth session expiry** — graceful re-auth flow, no broken intermediate state.
8. **Durable Object WebSocket disconnection / reconnect** — UI reconnection banner; cursor-ghost persistence debounce.
9. **Email send (invite, share)** — bounce toast; recipient invalid email pre-validation; unsubscribe confirmation.
10. **Internal error ingest / error reporting** — silent; clients never see internal route errors.

## State matrix for API-driven client states

| Surface | Loading | Empty | Success | Validation error | Auth denied | Conflict | Offline / network error | Server error | Confirmation | Undo |
|---|---|---|---|---|---|---|---|---|---|---|
| Project list | skeleton | empty state | list updates | inline error | toast + redirect /login | silent | toast + retry | toast + ops log | n/a | n/a |
| Estimate row | inline save spinner | empty group | row saved | inline form error | row-level error banner | rollback | retry button | toast + ops log | destructive row delete confirm | undo on row delete (optimistic rollback) |
| Component library | skeleton | empty | saved | inline error | row-level banner | rollback | retry | toast | delete confirm | undo |
| Direct upload | progress bar | n/a | done | 422 inline | retry after auth | n/a | retry | toast | overwrite confirm | undo |
| Share-token view | password skeleton | empty published-state | visible | password error | expired/invalid token banner | n/a | retry | toast + ops log | n/a | n/a |
| Share-token comment | inline | n/a | visible | inline | n/a | n/a | retry | toast | n/a | n/a |
| Share-token decision | inline | n/a | status badge | inline | n/a | n/a | retry | toast | confirm destructive reject | n/a |
| Better Auth sign-in | spinner | n/a | redirect /workshop | inline zod | "incorrect credentials" toast | n/a | retry with backoff | toast + ops log | n/a | n/a |
| OAuth callback | spinner | n/a | redirect /workshop | state error toast | 401 | n/a | retry from /login | toast + ops log | n/a | n/a |
| Invite accept | spinner | n/a | redirect /workshop | token-blocked banner | expired banner | n/a | retry | toast + ops log | confirm accepting role | n/a |
| Email send (invite) | spinner | n/a | toast "invite sent" | 422 invalid email | 401 toast | n/a | retry | toast + ops log | confirm send | n/a |
| WS connection | connect banner | n/a | cursor visible | 400 toast | 401 → redirect | n/a | reconnecting banner | toast + ops log | n/a | n/a |

## Accessibility considerations

For each error state and confirm modal rendered from API response:

- **Keyboard operability**: error banner must receive focus OR be programmatically announced (depending on whether modal-y or inline). Confirm modal must trap focus until dismissed.
- **Visible focus**: destructive-confirm-button must show focus ring.
- **Semantic HTML**: error banner uses `<div role="alert">` or `<output aria-live="polite">`; critical errors use `role="alert"` (assertive). Confirm modal uses `<dialog>` with `aria-modal="true"`.
- **Accessible name**: every error banner has an accessible name (text content or `aria-label`).
- **Focus restoration**: after closing a confirm modal, focus returns to the trigger.
- **Live-region behavior**: toast container is `<output aria-live="polite">` or equivalent. Login-failure toast uses `aria-live="assertive"`.
- **Responsive**: error banner does not overflow on small screens.
- **Reduced motion**: any inline spinner respects `@media (prefers-reduced-motion: reduce)`.
- **Color + non-color status cue**: destructive is not red-only — also has text "Error" or icon.

## Localization considerations

For each error state or banner:

- The error contract DTO (`{ok, data, error: {code, message}}`) should carry a **stable error code** so client i18n pickers can map `{code}` to a translated string per locale.
- A raw English `error.message` is acceptable as fallback ONLY; UI must never display raw internal paths / SQL fragments / stack traces.
- The audit recommends the envelope `code` be a stable enum per surface (`PROJECT_NOT_FOUND`, `ESTIMATE_CONFLICT`, `INVITE_TOKEN_EXPIRED`, `SHARE_TOKEN_REVOKED`, `WS_TICKET_INVALID`, `R2_OBJECT_UNAUTHORIZED`, `AI_FEATURE_FLAG_OFF`, etc.).

## UX regressions to prevent (with API surface responsibility)

| Regression | API contribution | UX mitigation |
|---|---|---|
| Optimistic row update shows wrong value after rollback | Server Action must return the canonical post-mutation value via DTO, not just success/failure | Client uses returned DTO to overwrite optimistic value |
| Anonymous comment on a share with expired token | Server Action / Route Handler must return `SHARE_TOKEN_EXPIRED` code, not 401 anonymous | Client renders "this share link has expired — contact owner" instead of "log in" |
| Multi-tab session race | Better Auth server must signal stale session in `getSession()` response | Client subscribes to session-validity ticker; on stale, redirect to /login |
| DO WS reconnect storm | DO server must rate-limit ticket re-mint per session | Client uses exponential backoff; UI banner "reconnecting..." |
| Direct upload signed-URL expired before upload started | Server must include a short-lived mint but a long-enough expiry for user network | Client pre-check; re-mint on expiry |
| Duplicate broadcast email sent on retry | Server Action must dedup per `inviteId` — second submit returns 200 with same `inviteId` | Client shows "invite already sent" instead of "send another" |

## User-facing documentation implications

The audit recommends the user-facing help docs (`/help`, `/privacy`, `/terms`) explicitly describe:

1. **What anonymous recipients can see** when given a share link (with and without password).
2. **What cookies are set** in the share-token session (`PUBLICATION_ACCESS_COOKIE_SECRET` indicates an access cookie — confirm what it carries).
3. **What invite recipients can do** in `accept` vs `continue` flow (existing user vs new user).
4. **What happens on revoke** of a share link or invite.
5. **Realtime cursor sharing** — must be disclosed (transient PII — display name + cursor color).
6. **AI feature visibility** — when `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=true` or `ARCHESTIMATOR_AI_ENABLED=true`, the AI surface's data-handling must be disclosed in privacy terms.

## UX/UI/Accessibility acceptance criteria for the audit

Coverage maps to AC-* from `04_*.md`:

- AC-046 (WCAG 2.2 AA alert/role semantics on error-rendered components) — REQ-A11Y-001
- AC-047 (RTL live-region assertion for toast/banner) — REQ-A11Y-002

## Documentation impact matrix (UX-adjacent)

| Document | Update needed | Why |
|---|---|---|
| `/privacy` Privacy Policy | Share-link cookie description; cursor sharing disclosure; AI feature data description | New runtime surfaces (Cloudflare Email Service, Durable Object, WS, R2) |
| `/terms` Terms of Service | AI-feature standby disclaimer when feature-flagged | AI surfaces exist but are disabled |
| `/help` (if exists) | Share-token expiry / revoke UX; invite accept-vs-continue; magic-link session | New flows |
| DESIGN.md (alpha) | API error-state design tokens (banner color, copy tone, motion) | Cross-cutting API UX |

## What this doc does NOT cover

- Visual design system audit (`DESIGN.md` is alpha; covered by `lint:design-system`).
- Storybook review (sibling pack covers).
- Landing-page / marketing UX (sibling pack covers).
- Onboarding flow UX (sibling pack covers; UI onboarding is not API-driven exclusively).
- Mobile-specific UX (audit-cloudflare-only runtime doesn't change mobile UX; sibling pack covers).

These exclusions are honest. They live with the UX-Audit sibling pack.