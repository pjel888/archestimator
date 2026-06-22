---
doc: 23-AUTH-EXPERIENCE
status: NEW (2026-06-22)
owner: Auth dimension (keystone)
canonical: 23-AUTH-EXPERIENCE
bindings:
  - RATIFIED DECISION D-2 (full-page 2-column auth, Google OAuth + magic link, no password)
  - RATIFIED DECISION D-3 (orange token discipline: #F24405 fill / #C63804 AA small text)
  - RATIFIED DECISION D-5 (honest scoring; no self-congratulation)
  - README gate #4 (genuinely owner-gated items carried in LOOP_LEDGER, never silently closed)
verified-against:
  - src/app/login/page.tsx          (full-page RSC, single-col 360px card today)
  - src/lib/auth/actions.ts         (signInWithEmail OTP shouldCreateUser:true; signInWithGoogle OAuth; signOut)
  - src/app/auth/callback/route.ts  (exchangeCodeForSession -> closed-beta check -> /workshop | /beta/access-required)
  - src/lib/auth/closed-beta-access.ts (CLOSED_BETA_ACCESS_ENABLED + check_closed_beta_access RPC)
  - src/lib/auth/error-mapping.ts   (6 public AuthErrorCode values)
  - src/lib/auth/redirects.ts       (sanitizeNextPath, buildLoginRedirectUrl, LOGIN_PATH, DEFAULT_AUTH_DESTINATION=/workshop)
  - src/app/globals.css             (brand-orange tokens, glass vars)
verified-absent:
  - src/app/signup/*               (no signup route today)
  - src/components/auth/*          (no auth component dir today — login page is a single RSC)
  - middleware.ts / src/middleware.ts (no middleware — Server-Component enforcement)
---

# 23 — Auth Experience (`/login` + `/signup`)

> **Owner-directed (Philip, 2026-06-22, D-2):** Auth is a **full-page, two-column, brand-forward** surface. It is NOT a modal. The left column is the same glass brand vocabulary Philip loves on the Workshop Dashboard and Estimate Sheet; the right column is the auth fields. The auth model stays exactly what the product really is: **Google OAuth + magic link, no password.** This doc binds that decision to the real auth wiring (verified above) and threads it through a11y (12), abuse (15), SEO (13), perf (14), test (16), components (11), and analytics (17).

---

## 0. Current state (verified, not assumed)

The recon facts below were confirmed by reading the live source before writing this doc. The 2-column redesign is a **reskin + component extraction + new `/signup` twin**, not a re-architecture of the auth model.

| Fact | Source | Status |
|---|---|---|
| `/login` is a full-page Server Component | `src/app/login/page.tsx` | ✅ today (single-column, `max-w-[360px]` card) |
| Auth = Google OAuth (`signInWithOAuth provider:"google"`, `prompt:select_account`) | `src/lib/auth/actions.ts` `signInWithGoogle` | ✅ unchanged by this redesign |
| Auth = magic link (`signInWithOtp`, `shouldCreateUser:true`) | `src/lib/auth/actions.ts` `signInWithEmail` | ✅ unchanged — `shouldCreateUser:true` means magic link already doubles as signup |
| No password flow anywhere | grep (no `signUp` w/ password, no `signIn` w/ password) | ✅ confirmed — D-2 "no password" is already the truth |
| Supabase via `@supabase/ssr` — browser singleton + `cache()`-wrapped server client | `src/lib/supabase/*` | ✅ reused as-is |
| Callback exchanges code, runs closed-beta check, redirects | `src/app/auth/callback/route.ts` | ✅ reused as-is |
| Closed-beta gate via `CLOSED_BETA_ACCESS_ENABLED` + `check_closed_beta_access` RPC | `src/lib/auth/closed-beta-access.ts` | ✅ reused as-is |
| Public error codes via `?error=` and success via `?sent=1` | `src/lib/auth/error-mapping.ts`, `redirects.ts` | ✅ extended (not replaced) by this redesign |
| `next=` redirect param is sanitized and round-tripped | `sanitizeNextPath` in `redirects.ts` | ✅ reused as-is |
| Server actions live in `src/lib/auth/actions.ts` ("use server") | `actions.ts` | ✅ actions stay here; UI calls them |
| No middleware | `ls middleware.ts` → absent | ✅ auth is enforced by Server Components + the callback route, not middleware |
| No `/signup` route today | `ls src/app/signup` → absent | ⚠️ **NEW route this doc introduces** (path settled by L-FUN-1; self-serve gated L-FUN-2) |
| No `src/components/auth/` today | `ls src/components/auth` → absent | ⚠️ **NEW dir this doc introduces** |

**Migration shape:** extract the inline RSC markup in `page.tsx` into `src/components/auth/*` leaves (RSC shell + client form leaves), wrap both `/login` and the new `/signup` in a shared `AuthLayout`, and reskin to the 2-column glass composition. The callback, closed-beta RPC, and error-code contract stay unchanged; public auth entrypoints still need the doc `15` quota/honeypot wrapper before launch. This is the smallest blast radius that delivers D-2 without pretending abuse controls are already wired.

---

## 1. Direction — full-page, two columns (NOT a modal)

### 1.1 Why full-page, not a modal (D-2 rationale)

- **SEO/noindex is cleaner.** A route can carry its own `<meta name="robots" content="noindex,nofollow">` and canonical-self (see §7). A modal cannot — it inherits the host page's index state and leaks auth surface into the indexable landing graph.
- **Shareable + deep-linkable.** `/login?next=/workshop/x` and `/signup` are stable URLs a beta invite email or a teammate can hand off. A modal requires the host page + query state to reconstruct.
- **Mobile-correct.** On a mid-range Android on 4G (the target device), a full-page route is one cold navigation; a modal stacks on whatever surface opened it, doubling layout cost and fighting the soft keyboard.
- **No trap-focus / escape-handling tax.** Modals demand a focus trap, `Esc` handling, scroll-lock, and backdrop a11y. Auth doesn't need any of that; it's a destination, not an interruption.
- **Parity with the brand surfaces.** The Workshop Dashboard and Estimate Sheet are full-route experiences. Auth should feel like the front door of the same building, not a popup.

### 1.2 Layout contract

```
┌─────────────────────────────────────────────────────────────┐
│  min-h-screen, bg = canvas wash (--grad-canvas-wash)         │
│  ┌────────────────────────┬───────────────────────────────┐ │
│  │  LEFT  (AuthGlassPanel)│  RIGHT (auth fields)          │ │
│  │  ~52% width (≥1024px)  │  max-width 440px, centered    │ │
│  │  dashboard-glass over  │  vertically + horizontally    │ │
│  │  warm canvas wash      │  on the column, not the page  │ │
│  │                        │                               │ │
│  │  - signal-orange logo  │  - H1 ("Sign in" / "Create    │ │
│  │    slab (--glass-logo- │    your account")             │ │
│  │    orange)             │  - public error / success     │ │
│  │  - brand composition:  │    ARIA live regions          │ │
│  │    material-frost +    │  - GoogleButton               │ │
│  │    dashboard gradients │  - "or" divider               │ │
│  │    (--grad-hero-*)     │  - SignupForm / LoginForm     │ │
│  │  - NO fake screenshots │    (email + submit)           │ │
│  │  - NO stock photos     │  - legal links (terms/privacy)│ │
│  │  - aria-hidden=true    │  - cross-link to the twin     │ │
│  │    (decorative)        │    (/login <-> /signup)       │ │
│  └────────────────────────┴───────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

- **Outer shell:** `min-h-screen` over the canvas wash. The two columns sit in a `lg:grid-cols-[1.1fr_1fr]` (or flex) container, `max-w-[1280px]`, centered, with the `--spacing-sm` (8px) rhythm gutter.
- **LEFT (`AuthGlassPanel`):** a single `dashboard-glass` surface (the deferred-glass technique — §8) holding the logo slab and the brand composition. It is **decorative and `aria-hidden="true"`** — it communicates brand, not information (D-2 forbids fake product screenshots, so it must not pretend to be a product preview). The composition is built from the **real dashboard gradients** (`--grad-hero-continue`, `--grad-hero-create`) and the **material-frost vocabulary** already in the Workshop surface — abstract, warm, on-brand. No photographs, no mock UI, no invented metrics (radical-honesty rule, doc 06).
- **RIGHT (fields):** `max-w-[440px]`, centered within its column, generous internal padding (`>= 24px`) so the form breathes and the soft keyboard never hides the submit button on mobile. All text `>= 14px` (landing floor — BRAND VOCABULARY CARD; the 12px app floor does NOT apply on auth).
- **Rhythm:** 8px gutter between columns; 3px radius on inner field cells (`--radius-xs`), 12px on the glass panel (`--glass-radius`), 8px on the legal link row (pills). **No other radii.**

### 1.3 Responsive collapse (< 768px)

| Breakpoint | LEFT panel | RIGHT fields |
|---|---|---|
| `>= 1024px` | Full glass panel, ~52% width, brand composition visible | 440px column |
| `768px – 1023px` | Panel narrows to ~40%, composition simplifies (logo slab + 1 gradient band, frost tiles hidden) | 440px column |
| `< 768px` | **Collapses to a compact brand header** (~120px tall): logo slab + a single thin gradient strip, still glass, still `aria-hidden`. It does NOT disappear — losing all brand on mobile would make auth feel untrusted. | Single column, full-width with `16px` page padding, fields stretch to `100%` up to the 440px cap |

- The collapse is a **content/layout variant of the same component**, not a different component. `AuthGlassPanel` takes a `variant: "full" | "compact"` prop driven by a `lg:`/`md:` visibility swap (two instances, the hidden one `aria-hidden`+`hidden`).
- No layout shift on the fields column between breakpoints — the fields column's box is identical; only the panel beside it changes.

---

## 2. Routes + flows

### 2.1 Routes

| Route | Type | Audience | Today |
|---|---|---|---|
| `/login` | Full-page RSC (`AuthLayout`) | Returning users | exists (single-col) — **reskinned to 2-col** |
| `/signup` | Full-page RSC (`AuthLayout`) | New users ("Start free") | **NEW** — path settled by L-FUN-1; self-serve gated on L-FUN-2 (§9) |
| `/auth/callback` | Route handler (GET) | OAuth + magic-link return | exists — **unchanged** |
| `/beta/access-required` | Full-page RSC | Blocked closed-beta users | exists — **unchanged** |

Both `/login` and `/signup` render through **one shared `AuthLayout`** (the 2-col shell). The only difference is which form leaf mounts (`LoginForm` vs `SignupForm`) and the H1/copy/cross-link. This is deliberate: the two surfaces are the same door, sign facing different ways.

### 2.2 Flow A — Magic link (email → inbox → callback → `/workshop`)

```
/signup or /login
  └─ user types email, submits SignupForm/LoginForm (client leaf)
       └─ invokes signInWithEmail server action (src/lib/auth/actions.ts)
            ├─ validates email present (else redirect ?error=email_required)
            ├─ signInWithOtp({ email, shouldCreateUser:true,
            │     emailRedirectTo:`${origin}/auth/callback?next=${next}` })
            ├─ recordAccountSecurityEvent("auth_email_link_requested")
            └─ redirect `/login?sent=1&next=${next}`   ← ARIA-live "Check your email"
                 └─ user opens email on the SAME device, clicks link
                      └─ /auth/callback?code=...&next=...
                           ├─ exchangeCodeForSession(code)
                           ├─ getUser()
                           ├─ getClosedBetaAccessForEmail(...)   ← §3 gate
                           │    ├─ allowed  -> resolvePostAuthDestination(next) -> /workshop
                           │    └─ denied  -> signOut() + /beta/access-required
                           └─ audit events at each step (auth_callback_*)
```

- `signInWithEmail` already sets `shouldCreateUser:true`, so **the magic link is already the signup mechanism**. `/signup` is therefore the same server action with different copy ("Create your account" vs "Sign in"), not a separate code path. This is a deliberate, simplifying consequence of the no-password model (D-2).
- The "Check your email" confirmation is rendered from `?sent=1` (already wired in `page.tsx`) inside an `aria-live="polite"` region (§5).

### 2.3 Flow B — Google OAuth (button → Google → callback → `/workshop`)

```
/signup or /login
  └─ user clicks GoogleButton (client leaf, type=submit inside a form)
       └─ invokes signInWithGoogle server action
            ├─ signInWithOAuth({ provider:"google",
            │     redirectTo:`${origin}/auth/callback?next=${next}`,
            │     queryParams:{ prompt:"select_account" } })
            ├─ recordAccountSecurityEvent("auth_google_started")
            └─ redirect(data.url)   ← off to Google
                 └─ Google returns to /auth/callback?code=...
                      └─ identical to Flow A from exchangeCodeForSession onward
```

- `prompt:"select_account"` is already set — keeps multi-account users from silently landing in the wrong account. Keep it.
- The Google button is the **primary** CTA on both routes (no password means Google is the lowest-friction path). Magic link is the secondary, accessibility-complete fallback (screen-reader users, users without a Google account, enterprise SSO environments that block OAuth popups).

### 2.4 Error and success rendering (public-safe, ARIA live)

Public error codes are the **closed set** in `src/lib/auth/error-mapping.ts` (`AUTH_ERROR_CODES`). The redesign **reuses this set unchanged** and adds no new codes:

| Code | Surfaces when | Message (public-safe) |
|---|---|---|
| `email_required` | empty email submit | "Enter an email address to receive a sign-in link." |
| `auth_request_failed` | OTP generic failure | "We could not start sign-in. Try again in a moment." |
| `google_request_failed` | OAuth URL fetch failed | "Google sign-in could not start. Try again or use an email link." |
| `callback_missing_code` | callback hit w/o `?code` | "This sign-in link is incomplete. Request a new link to continue." |
| `callback_exchange_failed` | `exchangeCodeForSession` errored | "We could not finish signing you in. Request a new link or try Google again." |
| `invalid_redirect` | `next=` failed sanitization | "We reset the sign-in destination to keep your account safe." |

- All error/success banners render in an `aria-live="polite"` region (already the pattern in `page.tsx`; preserve it). Errors use `--danger`/`--dangerSoft`; success uses `--brand-orange-dark` text on `--brand-orange-soft` (D-3: AA small text is `--brand-orange-dark #C63804`, never `--brand-orange #F24405`).
- **Never expose raw Supabase messages.** `mapAuthErrorToCode` already strips them to the closed set; keep this behavior.

### 2.5 `next=` redirect param (preserved end-to-end)

- `next=` is sanitized by `sanitizeNextPath` (control-char rejection, multi-pass decode, no protocol-relative `//`, no callback-self-reference, no nested-unsafe `next`). The redesign **does not touch this logic** — it is correct and load-bearing for security.
- The hidden `next` input must be present on **both** the Google form and the email form (it already is in `page.tsx`), and on the new `/signup` variants. The twin routes reuse `sanitizeNextPath` from `src/lib/auth/redirects.ts` verbatim.

---

## 3. Closed-beta gate (content variant, NOT a layout change)

### 3.1 How the gate actually works (verified)

`getClosedBetaAccessForEmail` (`src/lib/auth/closed-beta-access.ts`):
1. If `CLOSED_BETA_ACCESS_ENABLED !== "true"` → gate is **off**, everyone allowed (`status:"disabled"`).
2. Else if no email → `status:"no-email"`, denied.
3. Else calls Postgres RPC `check_closed_beta_access({ raw_email })` → returns `{ allowed, status, normalized_email }`.
4. Allowed only when `allowed===true && (status==="invited" || status==="active")`.
5. On RPC error → `status:"error"`, **fail-closed** (denied).

The gate runs **in the callback route after `exchangeCodeForSession`** — i.e. after the user has already authenticated with Google/magic-link. Denied users are signed out and sent to `/beta/access-required` (or `?status=revoked`).

### 3.2 Where the gate shows up in the 2-col design

The 2-col layout is **agnostic to the gate** — the gate is a *content variant of the right column*, not a layout change:

| State | `/login` right column | `/signup` right column |
|---|---|---|
| Gate OFF (`CLOSED_BETA_ACCESS_ENABLED != true`) | LoginForm: Google + magic link, cross-link "Don't have an account? Start free → /signup" | SignupForm: Google + magic link, copy "Create your account" |
| Gate ON, self-serve **enabled** (L-FUN-2 resolved "on") | Same as above | Same as above; the RPC is the gate, not the UI |
| Gate ON, self-serve **disabled** (current beta reality) | LoginForm unchanged (returning invited users) | **ClosedBetaGate variant:** headline stays ("Start free"), but the form is replaced with a "Request access" composition — magic-link field labels "Request your invite" and on submit routes to `/contact?intent=beta-request` (or a waitlist capture) instead of `signInWithOtp`. The left glass panel and the H1 are unchanged. |

**Key invariants:**
- The LEFT `AuthGlassPanel` is **identical** in all three states. The brand doesn't change because the gate changed.
- The gate is **fail-closed** at the RPC layer (§3.1 #5). The UI variant is a courtesy, not the enforcement — even if a user reached `signInWithOtp` with a non-invited email, the callback would deny them. Keep both layers.
- The gate decision for `/signup` is **server-known** (it's an env flag + RPC), so the RSC picks the right variant on the server — no client flicker, no layout shift.

### 3.3 Gated item — L-FUN-2

Whether `/signup` self-serve is **on** (real `SignupForm` accepting new accounts) or **off** (`ClosedBetaGate` request-access variant) is **owner-gated** (Philip, beta-onboarding strategy). It is carried in LOOP_LEDGER as **L-FUN-2** and never silently resolved in this doc. The 2-col design is shipped ready for either resolution.

### 3.4 Closed-beta launch CTA matrix

| Launch state | Header / hero "Start free" | `/signup` right column | Secondary CTA | Analytics interpretation |
|---|---|---|---|---|
| Current source reality (no `/signup` route yet) | `/login?next=/workshop` | n/a | `/contact?intent=walkthrough` | `hero_cta_click` + `login_view`; no `signup_view`. |
| Closed beta, `/signup` route implemented, self-serve OFF | `/signup` | `ClosedBetaGate`; request-access form posts to `/contact?intent=beta-request` or the L-CRM-1 destination | `/contact?intent=walkthrough` | `signup_view` fires; `signup` does not fire unless a real auth callback creates an allowed session. |
| Self-serve ON (L-FUN-2 closed "on") | `/signup` | `SignupForm`; Google + magic-link create accounts via existing auth actions wrapped by doc `15` quota checks | `/contact?intent=walkthrough` | `signup_view`, `signup_attempt`, and `signup_success` become the primary funnel. |
| Waitlist-only fallback | `/contact?intent=beta-request` | Optional not shipped | `/contact?intent=walkthrough` | Assisted funnel only; do not call it signup conversion. |

The matrix is the canonical CTA behavior for docs `05`, `08`, `13`, `16`, and `17`. It prevents
the old L-FUN-1 ambiguity from leaking back into implementation: path is `/signup`; launch behavior
depends on source readiness and L-FUN-2.

---

## 4. Components (cross-link `11-COMPONENT-INVENTORY-AND-CONTENT-MAP`)

All new components live under **`src/components/auth/`** (a new directory; today `page.tsx` is a single inline RSC). Server actions stay in `src/lib/auth/actions.ts` (D-2: the shell is RSC, the forms are the only client leaves, actions are server-only).

| Component | Path | RSC / Client | Props | Notes |
|---|---|---|---|---|
| `AuthLayout` | `src/components/auth/AuthLayout.tsx` | **RSC** | `{ children: ReactNode; route: "login" \| "signup"; next: string; sent?: string; errorCode?: string }` | Renders the 2-col grid: `AuthGlassPanel` (left) + a right column that renders the error/success live regions (from `errorCode`/`sent`) and `children` (the form). Sets the document shell (`min-h-screen`, canvas wash). |
| `AuthGlassPanel` | `src/components/auth/AuthGlassPanel.tsx` | **RSC** (pure presentational) | `{ variant: "full" \| "compact" }` | The decorative brand surface. `aria-hidden="true"`. Uses `dashboard-glass`, the logo slab (`--glass-logo-orange`), and the material-frost + `--grad-hero-*` composition. **No fake product screenshots, no stock photos** (D-2, radical honesty). |
| `LoginForm` | `src/components/auth/LoginForm.tsx` | **Client** ("use client") | `{ next: string }` | Two `<form action={signInWithGoogle}>` and `<form action={signInWithEmail}>` leaves (server actions). Renders `GoogleButton` + divider + email field + submit. `autocomplete` attrs set (§5). Cross-links to `/signup`. |
| `SignupForm` | `src/components/auth/SignupForm.tsx` | **Client** ("use client") | `{ next: string }` | Visually near-identical to `LoginForm` (same two server actions — `shouldCreateUser:true` makes them signup-capable). Copy differs ("Create your account"). Renders the beta-gate variant when self-serve is off (§3.2). Cross-links to `/login`. |
| `GoogleButton` | `src/components/auth/GoogleButton.tsx` | **Client** ("use client") | `{ next: string; label: string }` | A submit button inside the Google `<form action={signInWithGoogle}>`. `variant="secondary"`. Carries the Google "G" mark (asset — § asset pipeline) + `label` ("Continue with Google"). |
| `MagicLinkButton` | `src/components/auth/MagicLinkButton.tsx` | **Client** ("use client") | `{ next: string; label: string }` | The submit button for the email `<form action={signInWithEmail}>`, co-located with the email `ControlInput`. Use `variant="brand"` after extending `ButtonVariant`; do **not** use `variant="primary"` because today's primary is not the signal-orange treatment. |
| `ClosedBetaGate` | `src/components/auth/ClosedBetaGate.tsx` | **RSC** | `{ status?: ClosedBetaAccessStatus }` | The request-access variant that replaces `SignupForm` when self-serve is off (§3.2). Routes the email capture to `/contact?intent=beta-request` (or waitlist). Reuses the same `AuthLayout` shell. |

### 4.1 Designation rules (why RSC shell + client leaves)

- The shell, the glass panel, the gate variant, and the error/success banners are **RSC** — they carry no client interactivity and ship zero client JS. This matches the Workshop Dashboard RSC pattern (memory: `workshop-dashboard-rsc`) and the landing's RSC-first architecture (doc 07).
- The forms are **client leaves** only because they host the `<ControlInput>` focus state and (later) inline validation pre-submit; the actual submit is a **server action** (`<form action={...}>`), so there is **no client-side fetch round-trip** for auth — the form posts straight to the server action. This is the perf-critical choice (§8) and the abuse-resilient choice (§6).
- Server actions (`signInWithEmail`, `signInWithGoogle`, `signOut`) **stay** in `src/lib/auth/actions.ts` under `"use server"`. The redesign does not move them. Memory `use-server-exports-only-async`: this file exports only async functions — do not add a non-async export, or `next build` (not `tsc`/`vitest`) will catch it.

### 4.2 Reuse, not reinvention

- `ControlInput`, `Button` (variants `primary`/`secondary`, sizes `md`) are reused from `@/components/ui/*` exactly as the current `page.tsx` uses them.
- The error-mapping (`getPublicAuthError`, `AUTH_ERROR_CODES`), redirect helpers (`sanitizeNextPath`, `buildLoginRedirectUrl`, `resolveAuthOrigin`), and the closed-beta module are **imported as-is**. No new auth-lib code is introduced by this redesign.

---

## 5. Accessibility (cross-link `12-ACCESSIBILITY-AUDIT`)

| Requirement | Implementation |
|---|---|
| **No keyboard trap** | The left `AuthGlassPanel` is `aria-hidden="true"` and `tabindex` is absent on all its children — it is never in the tab order. The right column has a clean, linear tab order: Google button → email field → submit → legal links → cross-link to twin route. |
| **Logical tab order** | DOM order matches visual order; no `tabindex` positive values anywhere. |
| **Labeled fields** | The email `<ControlInput>` has a `<label>` (visible, `>= 14px`) wrapping it (preserve the existing pattern). Google button has an accessible name from its label. |
| **`autocomplete` attributes** | Email field: `autocomplete="email"` (already set). The form wrappers: `autocomplete="on"` for login; for signup the email field additionally carries `autocomplete="email"` and the form can carry `autocomplete="on"`. (No `autocomplete="new-password"` — there is no password field, by D-2.) This satisfies WCAG 1.3.5 (Identify Input Purpose) and helps password managers / browser autofill. |
| **Error live regions** | The error banner is `aria-live="polite"` and `role="status"`; the success ("Check your email") banner likewise. On submit failure (server action redirect with `?error=`), the RSC re-renders with the banner present in initial HTML — assistive tech announces it on page load. |
| **Focus management on submit** | Because submit is a server action (full document transition to the redirected URL), focus is managed by the browser: it lands at the top of the new document. On the `?sent=1` redirect, the success banner is the first focusable/relevant region — place it at the top of the right column so it's announced first. Avoid client-side focus juggling; it's not needed here. |
| **Color contrast** | All load-bearing text uses `--ink #3D3D3D`, `--secondary #5D5D5D`, or `--brand-orange-dark #C63804` (D-3). **Never `--brand-orange #F24405` for small text** (it fails AA on white at ~3:1). Never `#7F7F7F` (memory `designmd-tertiary-fails-aa`). Primary CTA fill `--brand-orange` is fine because the *text on it* is white on a strong fill (contrast checked in doc 12). |
| **Reduced motion** | The deferred-glass arming sequence respects `prefers-reduced-motion` for any blur animation transition (the @property `--glass-blur-amount` is set instantly, not animated, when reduced motion is requested — see BRAND VOCABULARY CARD). |
| **Keyboard-reachable Google OAuth** | Google sign-in is a `<button type="submit">` in a `<form action={signInWithGoogle}>`, not a popup script — fully keyboard-reachable and screen-reader-friendly. |
| **Page language + title** | Each route sets `<title>` and `lang` via metadata (see §7). H1 is present once per route. |

---

## 6. Abuse guardrails (cross-link `15-FORMS-AND-ABUSE-GUARDRAILS`)

The auth surface is the highest-abuse-risk surface on the landing. Guardrails:

1. **Postgres rate-limiting, NOT Redis** (project position — memory, README). The `security_rate_limit_events` table is the required durable throttle for magic-link, OAuth-start, `/contact`, and `/signup` attempts per email + per IP. Current `src/lib/auth/actions.ts` calls Supabase directly; **public `/login` or `/signup` must not ship until the rate-limit wrapper/honeypot path in `15-FORMS-AND-ABUSE-GUARDRAILS.md` is implemented and tested.** The redesign may reuse the existing auth actions internally, but the public entrypoints need explicit quota checks before delegating.
2. **Honeypot field.** Each client form (`LoginForm`, `SignupForm`) carries a visually-hidden, `aria-hidden`, `tabindex=-1` honeypot input (e.g. `name="company_url"`). Server actions reject submissions where the honeypot is non-empty. Cheap, accessible, no CAPTCHA friction.
3. **Validation.** Email is validated server-side (format + length + lowercase normalization — already done in `signInWithEmail`). The redesign preserves this; client-side validation is progressive-enhancement only.
4. **Fail-closed closed-beta.** `getClosedBetaAccessForEmail` returns `status:"error"` → `allowed:false` on any RPC error (§3.1). The redesign does not weaken this.
5. **Turnstile = escalation-only, NOT yet built.** Cloudflare Turnstile is **planned** (not implemented). Until it ships, `/login` + `/signup` rely on honeypot + Postgres rate-limit + server validation. CAPTCHA is added only if abuse metrics warrant (doc 15 owns the escalation criteria). Do not invent a CAPTCHA in this redesign.
6. **`next=` sanitization is a security control.** `sanitizeNextPath` prevents open-redirect (no protocol-relative `//`, no `javascript:`, no callback self-reference, control-char + multi-pass decode guards). The redesign reuses it unchanged and adds the hidden `next` input to every form variant (including `ClosedBetaGate`'s `/contact` route, which carries `next` forward).
7. **Public-safe errors.** The closed error-code set (§2.4) never leaks Supabase internals, email existence, or beta-allowlist state. Keep `mapAuthErrorToCode` as the only path from raw error → user message.
8. **Audit trail.** `recordAccountSecurityEvent` already fires at every step (`auth_email_link_requested`, `auth_google_started`, `auth_callback_*`, `auth_callback_beta_access_denied`). The redesign preserves all existing events and adds the analytics-layer events in §8 (which are product analytics, not security audit — keep the two layers distinct).

---

## 7. SEO (cross-link `13-SEO-AND-DISCOVERY`)

`/login` and `/signup` are **conversion dead-ends for search engines** and must NOT compete with the landing in the index.

| Control | Implementation |
|---|---|
| `robots` | `<meta name="robots" content="noindex,nofollow">` in both routes' metadata. |
| `canonical` | `canonical` self-referential (`/login` → `https://site/login`, `/signup` → `https://site/signup`) to dedupe any `?next=`/`?error=`/`?sent=` query variants. |
| `sitemap` | Both routes excluded from the XML sitemap (doc 13 owns the sitemap exclusion list). |
| `<title>` | `"Sign in — Archestimator"` / `"Start free — Archestimator"` — brand suffix preserved, intent clear, but not keyword-optimized (they're not landing pages). |
| Internal links | The landing's "Start free" CTA routes to `/signup` (or `/login` while L-FUN-2 is unresolved — §9). Auth pages cross-link only to each other and to legal pages, never back to marketing sections (avoids funneling crawl budget into noindex). |
| Structured data | None. Auth pages carry no `Organization`/`Product` schema (that lives on the landing root, doc 13). |

---

## 8. Performance & Core Web Vitals (cross-link `14-PERFORMANCE-AND-CORE-WEB-VITALS`)

| Concern | Decision |
|---|---|
| **RSC-first** | The shell, the glass panel, the gate, and the error/success banners are RSC — zero client JS for the brand surface. Only the form leaves hydrate, and they hydrate only the input + submit (`<form action={server-action}>`), not a fetch layer. |
| **Magic-link submit is a server action** | `<form action={signInWithEmail}>` posts directly to the server action — **no client JS round-trip, no client fetch, no loading spinner JS.** The browser handles the redirect natively. This is the single biggest perf + simplicity win of the no-password model. |
| **Deferred glass** | `AuthGlassPanel` uses the deferred-glass technique (BRAND VOCABULARY CARD): paint blur-OFF first, arm after first paint + idle via `<html data-glass="ready">` + double-rAF + `requestIdleCallback`, hard 1500ms backstop. Auth is **one surface**, so it contributes **at most 1 simultaneous blur panel** — well under the ≤4 cap. LCP holds. |
| **LCP element** | On auth, the LCP element is the H1 ("Sign in" / "Start free") text in the right column, NOT the glass panel (deferred). Text LCP is fast and stable. The glass panel is below-the-fold-irrelevant for LCP because it's decorative and `aria-hidden`. |
| **No layout shift** | The fields column's box is identical across the SSR paint and the hydrated state (the form is present in SSR HTML; hydration only attaches focus handling). Reserved space for the error/success banner prevents CLS when one appears. |
| **Assets** | The only image asset is the Google "G" mark — serve it as a small inline SVG or a tiny optimized PNG from the asset pipeline (doc 19). The left panel is pure CSS gradients + glass — **zero image bytes**. |
| **Fonts** | Auth uses `--font-sf-pro` for the form UI (system stack, zero fetch) and `--font-display` (Doto) for the H1 in the left panel only (the H1 in the right column can be SF Pro to avoid a display-font fetch on the critical path — verify in doc 14). |
| **Mobile GPU** | Glass blur capped at `--glass-blur: 18px` (≤20px mobile ceiling), single panel — mid-range Android on 4G holds 30fps (memory `liquid-glass-sidebar-direction`: estimate-alignment + 30fps still need live verification on the target device — carry as a verify item, not a claim). |

---

## 9. Analytics & observability (cross-link `17-ANALYTICS-AND-OBSERVABILITY`)

### 9.1 Product analytics events (NEW — owned by this doc, instrumented per doc 17)

| Event | When | Props |
|---|---|---|
| `signup_view` | `/signup` RSC renders | `{ route, beta_gate: "on"\|"off", self_serve: "on"\|"off" }` |
| `login_view` | `/login` RSC renders | `{ route }` |
| `auth_method_selected` | user clicks Google or submits magic-link form | `{ method: "google"\|"magic_link", route: "login"\|"signup" }` |
| `signup_attempt` | `signInWithEmail` called from `/signup` | `{ method }` (no email — PII) |
| `login_attempt` | `signInWithEmail` or `signInWithGoogle` called from `/login` | `{ method }` |
| `signup_link_sent` | `?sent=1` rendered on `/signup` flow | `{ method: "magic_link" }` |
| `login_success` | callback → `/workshop` after a `/login`-originated session | `{ method }` |
| `signup_success` | callback → `/workshop` after a `/signup`-originated session | `{ method }` |
| `closed_beta_denied` | callback → `/beta/access-required` | `{ status }` (closed-beta status, NOT email) |

- **No PII in analytics.** Email is never an event prop. `recordAccountSecurityEvent` (the audit layer, §6) holds the email against the user id server-side; the product-analytics layer is anonymous until session merge.
- **Anonymous → authenticated session merge.** When a user lands on the marketing site (anonymous id), visits `/signup`, and authenticates, the analytics SDK must merge the anonymous id into the now-authenticated user id (doc 17 owns the mechanism — PostHog `$identify`/alias or equivalent). This doc owns the **contract**: the auth callback is the merge boundary, and `login_success`/`signup_success` are the merge-triggering events.

### 9.2 Security audit events (EXISTING — preserved, NOT product analytics)

`recordAccountSecurityEvent` events (`auth_email_link_requested`, `auth_google_started`, `auth_callback_succeeded`, `auth_callback_failed`, `auth_callback_missing_code`, `auth_callback_beta_access_denied`) are the **security audit trail** and stay exactly as wired. They are NOT duplicated into product analytics. Doc 17 reconciles the two layers.

---

## 10. Gated items (carried in LOOP_LEDGER, never silently closed)

| ID | Item | Owner | This doc's stance |
|---|---|---|---|
| **L-FUN-1** | `/signup` route path. | Philip | **Resolved by D-2 / LOOP_LEDGER: `/signup`.** Do not re-prompt on route shape. Only L-FUN-2 decides whether the route renders self-serve signup or the closed-beta gate. |
| **L-FUN-2** | Beta-onboarding + self-serve enablement: does `/signup` accept new accounts (`SignupForm`) or route to request-access (`ClosedBetaGate`)? | Philip | The 2-col design ships ready for both (§3.2). Default to `ClosedBetaGate` (current beta reality) until Philip flips self-serve on. **This is the gate that decides whether "Start free" routes to `/signup` or to `/login`.** |
| **L-LEG-2** | Privacy Policy live before handling signup data. | Philip / legal | `/signup` must not collect email before the Privacy Policy is linked and live. The legal-links row is in the design (§1.2); the Policy itself is owner-gated. |
| **L-LEG-3** | Data Processing Agreement (DPA) for beta signups (enterprise/AEC firms may require it). | Philip / legal | Gated; surface as a link from `/signup` legal row only if/when Philip confirms it's required for closed beta. |
| **L-A11Y-1** (verify, not block) | Live 30fps glass-blur verification on the target mid-range Android device. | Eng | Memory `liquid-glass-sidebar-direction`: estimate-alignment + Realme 30fps need live verification. Auth's single-panel blur is the lowest-risk surface, but verify before claiming the perf score. |
| **L-CRM-1** (verify, not block) | Waitlist / CRM destination for `ClosedBetaGate` submissions (`/contact?intent=beta-request` or a dedicated waitlist). | Philip | The gate's CTA destination is owner-gated; default to `/contact` until confirmed. |

---

## 11. Test & verification plan (cross-link `16-TEST-AND-VERIFICATION-PLAN`)

- **Unit:** `AuthLayout` renders both columns at `lg:` and collapses the panel at `<768px`; `AuthGlassPanel` is `aria-hidden`; `LoginForm`/`SignupForm` carry `autocomplete` and the honeypot; `ClosedBetaGate` renders when self-serve is off.
- **Integration (server actions):** `signInWithEmail` redirects `?sent=1` on success and `?error=email_required` on empty email (existing behavior — preserve the test). `signInWithGoogle` redirects to the Google URL on success.
- **Integration (callback):** `exchangeCodeForSession` success + allowed user → `/workshop`; success + denied user → `/beta/access-required` + signed out (existing — preserve). Add: `next=` is preserved through the full round trip.
- **Security:** `sanitizeNextPath` rejects `//evil.com`, `javascript:`, callback self-reference, control chars, multi-pass-encoded payloads (existing — preserve). Honeypot rejection. Rate-limit enforcement per email + IP.
- **a11y:** axe-core on `/login` and `/signup` — zero violations (color contrast, label-input association, aria-live regions, no positive tabindex).
- **Responsive:** snapshot the 2-col → 1-col collapse at the 768px and 1024px breakpoints.
- **Manual:** magic-link round trip on a real email (Google account + non-Google); Google OAuth round trip; closed-beta denial flow; `?error=` rendering for each code in the closed set.

---

## 12. Coherence contracts (this doc honors)

- **D-2** — full-page 2-col auth, Google OAuth + magic link, no password. ✅ (§1, §2)
- **D-3** — orange token discipline: `--brand-orange #F24405` for fills/logo/focus; `--brand-orange-dark #C63804` for AA small text; clay `#AA412A` is not a token and not referenced. ✅ (§5). Tailwind v4 gotcha honored: `bg-[color:var(--x)]`, never `bg-[var(--x)]`.
- **D-4** — ClaimStatus type not directly used on auth (no Live/Building/Planned claims here); if a claim ever appears on the glass panel it imports `StatusPill` from `src/components/landing/shared/StatusPill.tsx` and narrows. ✅
- **D-5** — honest scoring (§13). No self-congratulation. Verify-items are carried, not claimed.
- **Auth noindex** — `/login` + `/signup` are `noindex,nofollow`, canonical-self, sitemap-excluded. ✅ (§7)
- **"Start free" gated** — L-FUN-1 route path settled; L-FUN-2 self-serve carried. ✅ (§3.4, §10)
- **Rate-limiting = Postgres** — no Redis. Turnstile not yet built. ✅ (§6)
- **Radical honesty** — no fake screenshots/stats/testimonials; the glass panel is abstract brand composition only. ✅ (§1.2)

---

## 13. Honest self-score (D-5)

| Dimension | Score | Justification |
|---|---|---|
| **Strategy** | **96 / 100** | The 2-col full-page direction is owner-ratified (D-2) and justified against modal alternatives with concrete reasons (SEO, mobile, shareability, parity). The closed-beta-gate-as-content-variant insight keeps the design durable across L-FUN-2 outcomes, and §3.4 pins the launch CTA matrix. Not 100 because L-FUN-2 (self-serve) is genuinely open and affects the final copy/flow; route path is settled by L-FUN-1. |
| **Quality** | **94 / 100** | Every claim is bound to a verified source file (§0). Component list is implementer-ready (path, RSC/client, props). a11y/abuse/SEO/perf/analytics are each concrete and cross-linked. Not 100 because: (a) the LCP-element-is-H1 claim is reasonable but not yet measured on the target device (L-A11Y-1/L-CRM-1 verify items); (b) the exact brand composition inside `AuthGlassPanel` is specified as constraints (gradients, frost, no screenshots) but not pixel-designed — that is correctly deferred to implementation per DESIGN.md-as-alpha-guide. |
| **Implementation-Readiness** | **93 / 100** | An engineer can start: real source bindings, exact component paths, designation rules, reused-vs-new code split, test plan. Not 100 because the new `src/components/auth/` directory and `/signup` route do not exist yet (they are the deliverable), and because `shouldCreateUser:true` doubling as signup — while verified true — needs a behavioral confirmation that a brand-new email lands in `/workshop` and not `/beta/access-required` when the gate is off (the callback runs the gate either way; verify in implementation). These are honest implementation-time confirmations, not doc gaps. |

**Carried to LOOP_LEDGER (not silent):** L-FUN-2, L-LEG-2, L-LEG-3, L-A11Y-1, L-CRM-1.
L-FUN-1 remains only as a superseded decision record.
