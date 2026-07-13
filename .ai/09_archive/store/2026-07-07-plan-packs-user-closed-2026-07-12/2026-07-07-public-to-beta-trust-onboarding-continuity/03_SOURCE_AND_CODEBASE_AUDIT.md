# 03 — Source And Codebase Audit

Read-only, evidence-based. All paths repo-relative. Every entry is `repo evidence` unless marked `[inference]` or `[assumption]`. This audit is the ground truth the rest of the pack builds on; the implementer must re-verify paths before editing (shared worktree).

## 1. Public / landing surface

### 1.1 Which landing variant is LIVE
- `src/app/page.tsx` — `/` route, `force-static`. Imports `ArchestimatorLandingPage` from `@/components/landing-v3/ArchestimatorLandingPage`, wraps in `PublicPageShell(isHomePage=true)` + `ABExperimentProvider("hero-cta-copy","A")`. Renders `isLoggedIn={false}`. **This is the live homepage.**
- Guards: `tests/vitest/landing-amigo-redesign.test.tsx`, `landing-interactivity.test.tsx`, `design-enforcer-auth-allowlist.test.ts` assert the page does NOT import `frontdoor`/`home`/deleted namespaces.
- `src/components/landing-new/NewLandingPage.tsx` is mounted at `/new` (`src/app/new/page.tsx`), an **alternate preview**, not the homepage.
- `src/components/frontdoor/` is **deprecated/empty** (only empty `sections/`, `utilities/` subdirs).

### 1.2 Landing component directories

**`src/components/landing/`** — shared shell + utilities (used by all non-home public pages and as `PublicPageShell`). Barrel: `src/components/landing/index.ts`.
- `PublicPageShell.tsx` — `PublicPageShell`. When `isHomePage=false`: renders `LandingHeader` + `<main data-landing-page-root="true">` + `LandingFooter`. When `isHomePage=true` (the `/` route): renders **only children + `CookieConsentBanner` + `LandingAnalyticsLoader`** — v3 ships its own nav/footer.
- `LandingHeader.tsx` — sticky header for non-home pages. Nav: Platform→`#method`/`/features`, Specialties→`#method`, Company→`/contact`. CTAs: signed-out "Book a walkthrough"→`/contact` + "Sign in"→`/login?next=/workshop/projects`; signed-in "Workspace"→`/workshop`. Mobile menu.
- `LandingFooter.tsx` — **logo-only** (`aria-label="Archestimator home"`). **No legal links.**
- `CookieConsentBanner.tsx` — "Essential only" / "Accept analytics"; persists `archestimator:landing-consent`.
- `ContactForm.tsx` + `ContactFormFromSearchParams` — client `mailto:` builder for `/contact`. Handles `intent` values: `started`, `beta-request`, `walkthrough`, `access`, `demo`, `early-access`, `feedback`.
- `contact-mailto.ts` — `buildSupportMailto`, `normalizeInquiryType`, `SUPPORT_EMAIL` ("support@archestimator.com").
- `sections/LandingCTAs.tsx` — `LandingCTAs`. Canonical CTA pair for non-home pages: primary `/contact?intent=started` ("Start with an estimate") logged-out / `/workshop` ("Open workspace") logged-in; secondary `/contact?intent=walkthrough`.
- `sections/FinalCtaSection.tsx` — `FinalCtaSection`. Closing CTA panel (about/features/pricing/contact/trust/security).
- `claims-ledger/ClaimsLedger.tsx` (+ `claims-data.ts`, `ClaimRow.tsx`, `ClaimFilter.tsx`) — Live/Building/Planned feature matrix.
- `structured-data.tsx` — `LandingStructuredData` (Organization + WebSite JSON-LD), in root layout.
- `company-proof-data.ts` — `getRenderableCompanyProofItems`. **Fail-closed placeholder** (`relationship:"placeholder"`, `permissionConfirmed:false`); NOT imported by active homepage (guarded by `landing-company-proof.test.ts`).
- `constants.ts` — `workshopHref`="/workshop", `loginHref`="/login?next=/workshop/projects".
- `seo-metadata.ts` — `buildLandingMetadata`, `buildNoIndexMetadata`, `LANDING_SITE_ORIGIN` ("https://archestimator.com", flagged `L-SEO-1 GATED`).
- Empty/stub subdirs: `scroll-reveal/`, `commercial-graph-plate/`.

**`src/components/landing-v3/`** — LIVE homepage.
- `ArchestimatorLandingPage.tsx` — entry. Composes `LandingNav`, `AudienceBanner`, `Hero`, `AudienceBand`, `ProblemSection`, `WorkflowStory` (id="workflow"), `FeatureChapters`, `ComparisonSection`, `SpecialtiesSection` (id="specialties"), `ProofSection`, `FaqSection`, `FinalCta`, own `LandingFooter`. `<main data-landing-page-root="true">`.
  - `PrimaryCta`: `isLoggedIn ? "/workshop" : "/contact?intent=walkthrough"`; label "Open workspace" / "Book a walkthrough"; `data-landing-v3-cta="primary"`.
  - `LandingNav`: Product→`#product`, Workflow→`#workflow`, Specialties→`#specialties`, Pricing→`/pricing`, About→`/about`; "Sign in"→`/login?next=/workshop/projects` (logged-out). Mobile `<details>` menu.
  - `LandingFooter`: Product `#product`, Workflow `#workflow`, Specialties `#specialties`, Pricing `/pricing`, About `/about`, Contact `/contact?intent=walkthrough`, Sign in/Workspace `/login`/`/workshop`, **Privacy `/privacy`, Terms `/terms`**. **No security/trust/cookies/support.**
- `landing-content.ts` — `WALKTHROUGH_HREF` ("/contact?intent=walkthrough"), `WORKSPACE_HREF` ("/workshop"), `LOGIN_HREF` ("/login?next=/workshop/projects"), `navItems`, `proofAudiences`, `workflowSteps`, `featureChapters`, `comparisonRows`, `specialties`, `productProof`, `faqs`.
- `HeroEstimateWorkspaceMockup.tsx`, `HeroImageZoom.tsx`, `HeroMountMotion.tsx`, `ProductStage.tsx`, `AnimatedMetricValue.tsx` — hero visuals.
- `landing-v3.module.css` — scoped styles (CTA typography contract test-enforced).

**`src/components/landing-new/`** — `/new` preview.
- `NewLandingPage.tsx` — different CTA posture: `PrimaryCta`→`/contact?intent=access` ("Request access"); sticky bottom "Request access"; "Book a walkthrough" secondary. Nav "Sign in"→`/login?next=/workshop/projects`. "Private by design" ShieldCheck line (Cloudflare Workers/D1/R2/Better Auth). Footer: Features `/features`, Pricing `/pricing`, Trust `/trust`, Privacy `/privacy`. **No Terms link.**
- `NewHeroWorkbench.tsx` (lazy-imports v3's `HeroEstimateWorkspaceMockup`), `new-landing.module.css`.

### 1.3 Public routes (flat under `src/app/`)
`/` (home), `/new` (preview), `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`, `/security`, `/trust`, `/login`, `/signup`, `/invite/[token]`, `/access-required`. **No route groups** (`(landing)`/`(public)`/`(marketing)`/`(legal)`).

### 1.4 Public→authenticated transition points (CTAs)
| Surface | Label | Target | Logged-out? |
|---|---|---|---|
| v3 Hero/Nav/FinalCTA `PrimaryCta` | "Book a walkthrough" | `/contact?intent=walkthrough` | yes |
| v3 Nav "Sign in" | "Sign in" | `/login?next=/workshop/projects` | yes |
| `LandingCTAs` primary | "Start with an estimate" | `/contact?intent=started` | yes |
| `LandingHeader` "Book a walkthrough" | "Book a walkthrough" | `/contact` | yes |
| `LandingHeader`/`LandingCTAs` "Open workspace" | "Open workspace" | `/workshop` | no (logged-in) |
| `/signup` (`ClosedBetaGate`) | "Request access" | POST `/contact intent=beta-request` | yes |
| `/new` `PrimaryCta` | "Request access" | `/contact?intent=access` (normalized→`started`) | yes |
| `/invite/[token]` signed-out | "Continue to Archestimator" | `/invite/{token}/continue` | yes |
| `/access-required` | "Request access" | `mailto:support@archestimator.com` | n/a |

**No** public CTA points to `/register`, `/beta`, `/dashboard`, or `/onboarding`.

### 1.5 Trust signals
- `ClaimsLedger` (Live/Building/Planned) on `/features` + `/trust`.
- `/trust` page: 5 sections (Claims, Private by design, Security posture, Maturity/limitations, Data residency reserved). Explicit "no SOC2/GDPR/HIPAA/DPA".
- `ProofSection` on v3: "No fabricated customer logos, no invented metrics".
- `company-proof-data.ts` fail-closed placeholder; tests forbid testimonials on homepage.
- `FaqSection` with FAQPage JSON-LD (5 Q&As).
- `ComparisonSection`, `SpecialtiesSection`, `WorkflowStory`.
- `/pricing`: philosophy only (Free/Solo/Pro/Team tier shapes, no numbers — labeled hypothesis).
- `/about`: mission/vision/promise, founder (gated/reserved), privacy stance, limitations.
- Security mentions: `/new` "Private by design. Built on Cloudflare Workers, D1, R2, and Better Auth"; `/security` vuln-disclosure; `/trust` security section.

### 1.6 Legal / support links in public surface
**Real routes:** `/terms`, `/privacy`, `/security`, `/trust`, `/contact`, `/about`, `/features`, `/pricing`.
**MISSING routes:** `/support`, `/help`, `/cookies`.

Link placement:
- v3 footer (`ArchestimatorLandingPage.tsx:644`): Privacy `/privacy`, Terms `/terms`, Pricing, About, Contact. **No security/trust/support/cookies.**
- `/new` footer (`NewLandingPage.tsx:590`): Features, Pricing, Trust `/trust`, Privacy `/privacy`. **No Terms.**
- `LoginForm.tsx:108`: "Terms"→`/terms`, "Privacy Policy"→`/privacy` (legal row under form).
- `ClosedBetaGate.tsx`: **no legal links.**
- `/features`: "Trust page"→`/trust`.
- `/terms`: Privacy→`/privacy`; `support@archestimator.com` in body.
- `/invite/[token]` terminal: "Contact Archestimator"→`/contact`.

Support = **email-only** (`mailto:support@archestimator.com`): `/contact`, `/security` (`security@archestimator.com`), `/access-required`, `/workshop/feedback`. No `/support` or `/help` route.

### 1.7 Existing public/landing tests
**Playwright:** `e2e/landing-audit.spec.ts` (comprehensive: perf metrics, SEO, single H1, no mobile overflow, no console errors), `e2e/frontdoor-landing-visual.spec.ts` (v3 visual proof, pixel-variance).
**Vitest:** `landing-amigo-redesign.test.tsx` (v3 contract), `landing-interactivity.test.tsx`, `landing-company-proof.test.ts`, `landing-auth-state.test.ts`, `landing-consent.test.tsx`, `landing-ab-testing.test.tsx`, `landing-security-headers.test.ts`, `public-page-shell.test.tsx`, `public-static-route-contract.test.ts`, `public-cache-safety-harness.test.tsx`, `public-font-lcp-audit.test.ts`, `proxy-sensitive-cache-headers.test.ts`, `trust-page-overclaims.test.ts`, `support-contact-readiness.test.ts`, `contact-form-mailto.test.tsx`, `legal-terms-*.test.ts` suite, `design-enforcer-auth-allowlist.test.ts`.

## 2. Auth / beta / invite / proxy

### 2.1 Better Auth (no static singleton; per-request)
- `src/lib/auth/better-auth-cloudflare.ts` — `createCloudflareBetterAuthOptions` (appName "Archestimator", basePath "/api/auth", D1 adapter, `session.cookieCache.enabled:false`, magic-link plugin). `resolveCloudflareBetterAuthSocialProviders` enables **Google OAuth** when `BETTER_AUTH_GOOGLE_CLIENT_ID`/`SECRET` present (`prompt:"select_account"`). `createCloudflareBetterAuthMagicLinkPlugin` → `sendCloudflareEmail`. `getBetterAuthRouteGateSession` calls `auth.api.getSession({query:{disableCookieCache:true}})`. `readBetterAuthRouteGateUserIdentity`.
- `src/lib/auth/cloudflare-better-auth-runtime.ts` — `resolveOptions` (requires `BETTER_AUTH_SECRET` ≥32 chars + `ARCH_DB`; `baseURL` from `BETTER_AUTH_URL`→`NEXT_PUBLIC_APP_URL`→`NEXT_PUBLIC_SITE_URL`→origin→localhost:3000; `trustedOrigins` merge). `getCloudflareBetterAuthIdentityFromRequest` — single entry for proxy/session/invite.
- `src/lib/auth/auth-provider-selection.ts` — `isCloudflareBetterAuthProviderEnabled` (`ARCHESTIMATOR_AUTH_PROVIDER` ∈ `better-auth`|`cloudflare-better-auth`|`d1-better-auth`). `.env.example` ships `better-auth`.
- **Model:** Google OAuth + email magic-link. **No passwords.** Magic link doubles as signup (`shouldCreateUser:true`). DB-backed sessions (D1 `session`), cookie `better-auth.session_token` / `__Secure-`. Cookie cache disabled.
- Better Auth core tables (`user`/`session`/`account`/`verification`, camelCase) applied via Better Auth's own migrator, NOT in `migrations/`.

### 2.2 Auth routes
- `src/app/api/auth/[...all]/route.ts` — Better Auth catch-all, `runtime:"nodejs"`, `force-dynamic`. GET/POST/PATCH/PUT/DELETE. Normalizes Google OAuth callback cookie. `Cache-Control: no-store`.
- `src/app/auth/callback/route.ts` — **legacy, disabled**: records `auth_callback_legacy_disabled`, redirects `/login?error=callback_exchange_failed`. Better Auth uses `/api/auth/callback/google`.
- `src/app/login/page.tsx` — RSC, `AuthLayout(route="login")` + `LoginFormFromSearchParams` in `<Suspense>`. Reads `next` (default `/workshop`). `noindex`.
- `src/app/signup/page.tsx` — RSC, `force-static`. Renders `ClosedBetaGate`. Comment: "L-FUN-2 GATED: when self-serve is enabled, replace `<ClosedBetaGate>` with `<SignupForm>`."
- `src/app/access-required/page.tsx` — closed-beta denial. Reads `?status=revoked`. Links `/login` + `mailto:support`.
- `src/components/auth/LoginForm.tsx` — **Client**. Google (`signInWithGoogle`) + magic-link (`signInWithEmail`). Honeypot `company_url`. Cross-link `/signup`. Legal row `/terms`+`/privacy`.
- `src/components/auth/ClosedBetaGate.tsx` — RSC. "Start free"; posts `/contact` `intent=beta-request` + honeypot. Cross-link `/login`.
- `src/components/auth/GoogleButton.tsx` / `MagicLinkButton.tsx` — **Client** submit buttons.
- `AuthLayout.tsx`, `AuthGlassPanel.tsx`, `AuthSearchParamsState.tsx`, `AuthStatusBanner.tsx`, `AuthStateMismatchRecoveryScript.tsx`.

### 2.3 Closed-beta gating (grant-based)
- Env: `CLOSED_BETA_ACCESS_ENABLED` (`.env.example` ships `false`). `src/lib/auth/closed-beta-access.ts` `isClosedBetaAccessEnabled` (L32): `!== "true"` → disabled, all pass.
- `getClosedBetaAccessForEmail` (L45): disabled→allowed; no email→denied(`no-email`); else queries D1. Allowed only when `status` ∈ `invited`|`active`. `buildClosedBetaAccessPath` (L84) → `/access-required` (+`?status=revoked`). Statuses: `disabled|no-email|missing|invited|active|revoked|error`.
- `src/lib/auth/closed-beta-d1-store.ts` — `closed_beta_allowed_emails` + `closed_beta_allowlist_audit_events` reads/writes.
- **Primary enforcement point:** `src/lib/auth/session.ts` `getBetterAuthCurrentUserContext` (L53): after Better Auth identity, calls `getClosedBetaAccessForEmail`; `!allowed` → `redirect(buildClosedBetaAccessPath(...))`.
- Admin: `src/lib/auth/beta-allowlist-admin.ts` (`canManageClosedBetaAllowlist`, `readClosedBetaAllowlistQueue`), `beta-allowlist-admin-actions.ts` (server actions; surfaced `/workshop/settings/users`).
- D1 tables (migration `0001_closed_beta_feedback.sql`): `closed_beta_allowed_emails` (normalized_email UNIQUE, status, invited_by, invited_at, accepted_at, notes, metadata_json), `closed_beta_allowlist_audit_events`, `beta_feedback_submissions`, `beta_feedback_status_events`.

### 2.4 Invite token flow (collaboration; distinct from closed-beta)
Feature-flagged: `PROJECT_INVITE_ENTRY_ENABLED` + `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` (64-hex).
- Creation: `src/lib/collaboration/actions.ts` (`inviteProjectCollaborator` L936, `inviteEstimateSheetCollaborator` L1055; `upsertInvitation`, `issueInviteEntryLink` L503; rate-limited 20/hr create). Direct-grant if email matches existing profile.
- Token: `src/lib/collaboration/invite-entry.ts` (`createInviteToken` randomBytes(32).base64url; `hashInviteToken` = `sha256("v1:{pepper}:{token}")` prefixed `v1:`; hint = last 6). Rate limits: resolve 30/60s, continue 10/60s, accept 5/60s, resend 5/hr.
- Entry page: `src/app/invite/[token]/page.tsx` (`resolveInviteEntryState`: invalid/expired/revoked/already_used/signed-out-preview/wrong-account/signed-in-preview/rate-limited). `/accept/route.ts` (CSRF `isAllowedInviteOrigin` before mutation), `/continue/route.ts` (sets `archestimator_pending_invite` HMAC bridge cookie → `/login?next=/workshop/pending-invite`), `/sign-out/route.ts`.
- Redemption: `src/lib/collaboration/invitation-d1-store.ts` (`acceptInvitationInD1` L453; roles owner>admin>editor>viewer rank 4/3/2/1; never downgrades; audit events `collaboration_invite_*`).
- Pending-invite bridge: `src/app/workshop/pending-invite/route.ts`, `pending-invite-actions.ts`, `pending-invite.ts` (`PENDING_INVITE_COOKIE`), `workshop-pending-invite.ts`.
- D1 tables (migration `0007_collaboration_invitations.sql`): `workspaces`, `projects`, `estimates`, `project_members`, `estimate_sheet_members`, `collaboration_invitations` (lifecycle_state), `collaboration_invitation_tokens` (token_hash UNIQUE, partial unique index for one active token/invitation), `collaboration_audit_events`.

### 2.5 Proxy / route protection (Next 16 Proxy; NO middleware.ts)
- `src/proxy.ts` — `proxy(request)` → `requestProxy`. `config.matcher = ["/((?!_next/static|_next/image|favicon.ico).*)"]`.
- `src/lib/auth/request-proxy.ts`:
  - `PROTECTED_PREFIXES=["/workshop"]`, `AUTH_ROUTES=["/login"]`, `PUBLIC_ROUTE_PREFIXES=["/about","/features","/pricing","/contact","/privacy","/terms","/trust","/signup","/invite","/share","/access-required"]`. `/` public.
  - Flow: skip `_next`/`api`/`.`; `redirectStateMismatchToCleanLogin` (Clear-Site-Data on `state_mismatch`); dev-auth bypass; public passthrough (marketing `s-maxage=31536000` or sensitive `private,no-cache,no-store`); if Better Auth disabled + protected → `/login?next=`; if localhost + session cookie → pass; resolve identity; **no user + protected → `/login?next=`**; terms gate `verifyTermsGateCookieValue`; **user + `/login` → `/workshop`**; user + protected → `markProtectedRouteGateRequestHeaders`.
- `src/lib/auth/protected-route-gate.ts` — header gate (`x-archestimator-auth-verified=proxy`, `x-archestimator-terms-accepted=current`). `clearProtectedRouteGateRequestHeaders` strips spoofed inbound headers.
- `src/app/workshop/layout.tsx` — double-checks `isProtectedRouteGateSatisfied`; else resolves context + terms status, redirects to gate or `/login`.
- `cloudflare/auth-callback-normalizer.ts` — Worker (`wrangler.auth-callback-normalizer.jsonc`) normalizes OAuth state cookies across apex.
- Dev auth: `src/lib/auth/dev-auth.ts` + `dev-auth-gate.ts` (`ARCHESTIMATOR_DEV_AUTH_BYPASS=1` + `ARCHESTIMATOR_DEV_AUTH_EMAIL`).

### 2.6 First-user activation / workspace provisioning
- Post-auth redirect: `src/lib/auth/redirects.ts` `DEFAULT_AUTH_DESTINATION="/workshop"`. `src/lib/auth/account-setup.ts` `resolvePostAuthDestination` (callbackURL `/workshop`, except preserves `/workshop/pending-invite`).
- `ensureDefaultWorkspace` (`src/lib/repositories/workspace-repository.ts` L1385, `cache()`-memoized): (1) use `profile.default_workspace_id` if set+usable; (2) else find first membership (workspace_members→project_members→estimate_sheet_members) and set default; (3) else **create** workspace ("My Archestimator Workspace", or "Philip's..." for owner email) + owner membership + set default. Called by `workshop/page.tsx` (L110), `projects/page.tsx`, `projects/[projectId]/estimates/page.tsx`, `publisher/page.tsx`, `WorkshopPageShell.tsx` (L95), API routes.
- Dashboard: `src/app/workshop/page.tsx` → `getWorkshopHomebaseData()` + `ensureDefaultWorkspace()` → `WorkshopDashboard` + `WorkshopHomebaseClient` (empty-state owner). Invite banner from `?invite=accepted|wrong-account|unavailable`. If `archestimator_pending_invite` cookie + no banner → `redirect("/workshop/pending-invite")`.
- Onboarding settings: `src/lib/auth/account-actions.ts` (`getAccountSetupState` L152 reads `user_onboarding_profiles` + membership; `completeOnboarding`, `updateProfileSettings`, `updateWorkspaceSettings`). Surfaced `/workshop/settings/profile`, `/workshop/settings/workspace`. `src/lib/auth/account-data.ts` (option lists, parsers; invited collaborators skip workspace step).
- `/workshop/onboarding/page.tsx` — **redirect-only** → `/workshop/settings`.

## 3. Legal / support / email / SEO

### 3.1 Legal pages
- `/terms` (`src/app/terms/page.tsx`, `force-static`) — content from `CURRENT_TERMS`/`TERMS_CONTENT_SECTIONS` in `src/lib/legal/terms-content.ts` (typed TS constant, NOT MDX). Version `tos-2026-06-06-beta-v1`, effective 2026-06-06, hash `sha256:55b472...`. "Closed beta terms", `legalReviewStatus:"closed_beta_owner_approved_pending_counsel_review"`. **No `metadata` export** (inherits root title template).
- `/privacy` (`src/app/privacy/page.tsx`, `force-static`) — `CURRENT_PRIVACY_NOTICE` (`privacy-2026-06-06-beta-v1`), same source file. Sections: data collected, terms-acceptance records, use, providers (Cloudflare), user responsibility, retention/deletion. Calls itself "Privacy Notice". **No `metadata` export.**
- `/security` (`src/app/security/page.tsx`, `force-static`, full `buildLandingMetadata`) — coordinated disclosure (90-day), scope, safe harbor, hall of fame (empty). `mailto:security@archestimator.com`, PGP `/.well-known/pgp-key.txt`. **`public/.well-known/security.txt` exists (RFC 9116, expires 2027-07-05) but references `/.well-known/pgp-key.txt` which DOES NOT EXIST.**
- `/trust` (`src/app/trust/page.tsx`, `force-static`, full metadata) — Claims, Private by design, Security posture, Maturity/limitations, Data residency reserved. "We do not claim SOC2, GDPR, HIPAA, or DPA."
- **Cookie policy:** no `/cookies` route. `CookieConsentBanner` + `src/lib/landing/consent.ts` only.
- **Acceptable use:** embedded in ToS section `accounts-security-use`, no standalone page.
- **DPA:** missing; `/trust` defers ("Entity and DPA work are not done").

### 3.2 Terms-acceptance gate (post-auth clickwrap)
- `src/app/workshop/layout.tsx` → `getCurrentUserTermsAcceptanceStatus`; `requiresAcceptance` → `buildTermsAcceptanceRedirectPath` → `/workshop/terms?next=...`.
- `src/lib/legal/terms-gate.ts` (`TERMS_ACCEPTANCE_ROUTE="/workshop/terms"`, `TERMS_GATE_FALLBACK_NEXT="/workshop"`).
- `src/app/workshop/terms/page.tsx` → `TermsAcceptancePanel` + `acceptCurrentTermsAction`.
- `src/lib/legal/actions.ts` `acceptCurrentTermsAction` — requires `terms_version===CURRENT_TERMS.version` + `accepted_responsibility==="on"`; records via `recordCurrentTermsAcceptance` (method `authenticated_clickwrap`, context `workshop_terms_gate`).
- Persistence: `terms-acceptance-d1-store.ts`, `terms-acceptance-record.ts`, `terms-acceptance-status.ts`. Stores user id, version, effective date, content hash, privacy version, method, context, timestamp. **Does NOT store raw IP/user-agent.**
- Migration `0002_legal_terms_acceptance.sql` — `legal_terms_acceptances`.
- **No terms acceptance required to submit `/signup` or `/contact`.**

### 3.3 Support / contact
- `/contact` (`src/app/contact/page.tsx`, `force-static`, full metadata) — founder pitch + design-partner criteria + `ContactForm` + `mailto:support@archestimator.com` "Direct Support". Form is **client `mailto:` builder; no server action stores/inbound-routes the message** (`ClosedBetaGate.tsx` comment confirms "no contact server action in `src/lib/landing/`").
- Support email `support@archestimator.com` hardcoded across terms/privacy/contact + `CLOUDFLARE_EMAIL_REPLY_TO` default in `.env.example`.
- **No `/support`, `/help`, `/docs` route.** No Intercom/Zendesk/Crisp integration.
- In-app: `/workshop/feedback`, `/workshop/settings/feedback`, `BetaFeedbackForm`.

### 3.4 Email (transactional)
- `ARCHESTIMATOR_EMAIL_PROVIDER` ∈ `cloudflare-email`|`cloudflare`|`cloudflare-email-service` (`src/lib/email/cloudflare-email-client.ts` `isCloudflareEmailProvider`). `.env.example`: `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false`, `ARCHESTIMATOR_EMAIL_PROVIDER=cloudflare-email`, `CLOUDFLARE_EMAIL_FROM=` (empty), `CLOUDFLARE_EMAIL_REPLY_TO=support@archestimator.com`. **Delivery OFF by default; FROM empty.**
- `src/lib/email/cloudflare-email-client.ts` `sendCloudflareEmail` — resolves `EMAIL` binding via `getCloudflareContext()`, `binding.send({to,from,subject,text,html,replyTo})`. Returns `EMAIL_NOT_CONFIGURED`/`EMAIL_BINDING_MISSING` gracefully.
- `src/lib/email/transactional-email-client.ts` `sendEmail` — circuit breaker (5-min window, 10-min cooldown >50% failure).
- **Templates are inline string literals, no `src/emails/` or templates dir:**
  - Magic-link: `src/lib/auth/better-auth-cloudflare.ts` (~L226) "Sign in to Archestimator".
  - Collaboration invite: `src/lib/collaboration/actions.ts` (~L631) "You're invited to ${projectName}".
  - Access removed: `actions.ts` (~L1362).
  - Published share notification: `src/lib/publication/actions.ts` (~L1286) + unsubscribe footer.
  - Owner activity digest: `publication/actions.ts` (~L1786).
- **No welcome/onboarding email.** No password-reset email (no passwords).

### 3.5 Sitemap / robots / metadata
- `src/app/sitemap.ts` — 8 routes: `/`(1.0), `/features`(0.9), `/trust`(0.8), `/pricing`(0.8), `/about`(0.7), `/contact`(0.7), `/privacy`(0.3), `/terms`(0.3). **`/security` NOT listed.** `/new` correctly absent. Origin `LANDING_SITE_ORIGIN`.
- `src/app/robots.ts` — `Allow:/`, `Disallow:/login,/signup,/workshop,/access-required,/newdesign,/legacy,/auth,/api,/invite,/share`. Sitemap+host. Legal pages allowed.
- Manifest: static `public/favicon_io/site.webmanifest` (referenced in root layout); **no `src/app/manifest.ts`**.
- Indexing: marketing indexable; `/login`,`/signup` `robots:{index:false,follow:false}`.
- Per-route metadata: full `buildLandingMetadata` on `/`,`/new`,`/features`,`/pricing`,`/about`,`/contact`,`/security`,`/trust`. **`/terms`,`/privacy` have NO metadata export.**
- OG: `buildLandingMetadata` references `/og/default.png`; **`public/og/` DOES NOT EXIST.** All OG/Twitter cards point to a missing image.
- JSON-LD: `LandingStructuredData` (Organization+WebSite) in root layout; omits `sameAs`/`aggregateRating` (gated `L-FND-1`/`L-SEO-1`). No per-route WebPage/Breadcrumb.
- Canonicals: via `buildLandingMetadata` `alternates.canonical`; `metadataBase` in root layout. Placeholder origin is the main risk.

### 3.6 Navigation chrome
- Public shell: `PublicPageShell` (non-home: `LandingHeader`+`<main>`+`LandingFooter`+`CookieConsentBanner`+`LandingAnalyticsLoader`; home: bypasses header/footer).
- `LandingHeader` — sticky glass, logo+nav+CTAs.
- `LandingFooter` — **logo-only**, dark teal, `data-visual-reference="amigo-footer"`. **No link columns.**
- Auth layout: `AuthLayout`+`AuthGlassPanel` (separate minimal chrome; no public header/footer).
- Workshop: `WorkshopPageShell`+`MainSidebar` (separate chrome; **no footer legal links**). Sidebar: Workshop⌘1, Projects⌘2, Library⌘3, Proposals⌘4, Publisher⌘5 + favorites + settings.

## 4. Trust-truthfulness ledger (public promises → shipped state)

The claims ledger (`claims-data.ts`) already classifies capabilities as Live/Building/Planned/NotUs. The continuity path must not introduce copy that contradicts it.

| Public promise / signal | Source location | Shipped state | Continuity risk |
|---|---|---|---|
| "Closed beta" expectation | `ClosedBetaGate`, `/trust`, ToS title | Live (allowlist enforced) | None if kept |
| "Invite-only access" | `/access-required` | Live | None |
| "Book a walkthrough" CTA | v3 `PrimaryCta` | Live (mailto builder) | None |
| "Request access" CTA | `ClosedBetaGate`, `/new` | Live (mailto, no receipt) | G7 — silent submit |
| Google + magic-link auth | `LoginForm` | Live | None |
| Terms + Privacy links | `LoginForm` legal row, v3 footer | Live | Inconsistent placement (G2) |
| "Private by design" | `/new`, `/trust` | Live (Cloudflare stack) | None |
| "No SOC2/GDPR/HIPAA/DPA" | `/trust` | Live (truthful omission) | Must not soften |
| Claims ledger Live/Building/Planned | `/features`,`/trust` | Live | Source of truth — must not contradict |
| Security disclosure / PGP | `/security`, `security.txt` | Live (disclosure), **PGP key MISSING** | G4 |
| Cookie consent | `CookieConsentBanner` | Live (essential+analytics) | No policy page (G5) |
| Welcome email | — | **Not shipped** | G8 |
| First-project guidance | dashboard | Partial (0 counts, no CTA) | G9 |

## 5. Document-impact matrix

| Document | Path | Relevant section | Accurate? | Update needed? |
|---|---|---|---|---|
| `AGENTS.md` | `/AGENTS.md` | Stack baseline, Cloudflare mandate, verification policy | Yes | No (planning-only) |
| Fast Path | `.ai/10_state/current-state.md` | Pre-launch closed-beta MVP | Yes | Record plan completion (out of planning scope to mutate now) |
| `DESIGN.md` | `DESIGN.md` | Alpha-stage guide | Yes (alpha) | No |
| Sibling: invite-token-flow-hardening | `.ai/03_plans/2026-07-07-invite-token-flow-hardening/` | Invite deep flow | Yes | Reference only |
| Sibling: first-user-activation-empty-workspace | `.ai/03_plans/2026-07-07-first-user-activation-empty-workspace/` | Empty workspace | Yes | Reference only |
| Sibling: projects-estimates-start-path-ia | `.ai/03_plans/2026-07-07-projects-estimates-start-path-ia/` | Workshop IA | Yes | Reference only |
| `terms-content.ts` | `src/lib/legal/terms-content.ts` | ToS + Privacy content | Yes | Phase 3 may add ClosedBetaGate legal-line reference (no content change) |
| `landing-content.ts` | `src/components/landing-v3/landing-content.ts` | CTA constants | Yes | Phase 0 continuity contract |
| `contact-mailto.ts` | `src/components/landing/contact-mailto.ts` | Intent vocabulary | Yes | Phase 0 mapping doc |

No contradictory source material was silently ignored. The two CTA postures (walkthrough vs access) are treated as a decision to resolve (OPEN-CONT-01), not smoothed over.
