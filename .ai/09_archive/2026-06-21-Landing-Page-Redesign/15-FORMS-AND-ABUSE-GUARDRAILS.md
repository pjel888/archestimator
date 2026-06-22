---
doc: 15-FORMS-AND-ABUSE-GUARDRAILS
status: PLANNING ONLY · upgraded 2026-06-22 · not code
owner: Forms / abuse-guardrails dimension
canonical: 15-FORMS-AND-ABUSE-GUARDRAILS
bindings:
  - RATIFIED DECISION D-1 (Glass Brand — does not change abuse logic, only the visual chrome of the error states)
  - RATIFIED DECISION D-2 (full-page 2-col auth; the visual 2-col form is OWNED BY 23 — this doc owns ABUSE DEFENSE only)
  - RATIFIED DECISION D-3 (orange token discipline: #F24405 fill / #C63804 AA small text for error states)
  - RATIFIED DECISION D-5 (honest scoring; no self-congratulation; gated items carried in LOOP_LEDGER)
  - README gate #4 (genuinely owner-gated items carried in LOOP_LEDGER, never silently closed)
  - PROJECT POSITION: rate-limiting is Postgres (`security_rate_limit_events`), NOT Redis. Turnstile is NOT yet built (planned); CAPTCHA is escalation-only.
verified-against:
  - supabase/migrations/20260601003000_security_rate_limit_events.sql  (the `security_rate_limit_events` table + indexes + RLS)
  - supabase/migrations/20260621133000_shared_link_atomic_publish_and_digest_slot.sql  (`reserve_security_rate_limit_slot` RPC — fixed-window slot reservation)
  - src/lib/ai/rate-limit.ts  (proven sliding-window rate-limit lib pattern to clone — `checkAiAskQuota`)
  - src/lib/publication/security.ts  (`getClientIp` — x-forwarded-for reader)
  - src/lib/auth/actions.ts  (server-action pattern: "use server" + headers() + redirect())
  - src/lib/auth/closed-beta-access.ts  (fail-closed RPC pattern)
  - src/lib/landing/consent.ts  (`parseLandingConsentValue`, `LANDING_CONSENT_COOKIE_NAME`)
  - src/app/contact/page.tsx  (current contact page — to be reskinned, form logic replaced)
  - src/components/landing/ContactForm.tsx  (current client form — fields today)
  - src/app/globals.css  (brand tokens for the error/feedback states — see §8)
verified-absent:
  - src/app/signup/*  (no signup route on disk — NEW implementation deliverable; path settled by L-FUN-1)
  - src/lib/landing/contact-actions.ts  (no contact server-action file — NEW, this doc names the path)
  - any Redis / Upstash / ioredis dependency in package.json  (Postgres is the rate-limit store)
  - any Turnstile / hCaptcha / reCAPTCHA integration  (CAPTCHA not built; escalation-only)
---

# 15 — Forms & Abuse Guardrails

> **STATUS: PLANNING ONLY · 2026-06-22 · not code.**
> **Purpose:** Own the **abuse defense** for the two public submission surfaces in the redesign:
> the `/contact` form and the `/signup` funnel (when it ships). This doc does NOT own the form's
> visual layout, copy, or a11y — those live in `23-AUTH-EXPERIENCE.md` (the 2-col visual form),
> `05-COPY-SKELETON.md` (form copy), and `12-ACCESSIBILITY-AUDIT.md` §6 (form a11y). This doc
> owns the **server-side defense**: rate-limiting, honeypot, validation, fail-closed behavior,
> monitoring, and the CAPTCHA-escalation trigger.
>
> **Scope split with `23-AUTH-EXPERIENCE.md`:** doc 23 owns *what the form looks like and how the
> user interacts with it* (the 2-col layout, the `LoginForm` / `SignupForm` client leaves, the
> error-banner ARIA-live regions, the closed-beta gate variant). **Doc 15 owns *how the server
> defends the submission endpoint* (rate-limit storage + RPC + thresholds, honeypot, validation,
> fail-closed retry UX, SSRF/header-injection guards, CAPTCHA escalation criteria).** Every
> defense is named; every threshold is justified; every storage decision is Postgres.

---

## 0. The pivot in one paragraph (D-1 / D-2 / D-3 / D-5)

This doc was authored under a paper/serif visual direction; the abuse logic was always storage-
and-validation-agnostic, so the **Glass Brand pivot (D-1) does not change a single rule below.**
What changes is the chrome of the error / rate-limit / success feedback states: they now render in
the glass-brand vocabulary (D-3 orange discipline: `--brand-orange #F24405` fill for the primary
CTA, `--brand-orange-dark #C63804` for AA small text, `--danger #b91c1c` for hard errors) instead
of paper. The auth surface is a **full-page 2-column route** (D-2, owned by `23-AUTH-EXPERIENCE.md`);
this doc treats `/signup` purely as a submission endpoint that needs the same abuse defense as
`/contact`, regardless of which visual variant ships. Scoring is honest (D-5): the prior
self-assessed "100/100/100" is recalled; the genuinely owner-gated items (L-FUN-2 beta-onboarding,
L-FUN-4 abuse-guardrail P1, L-ENG-2 email provider, L-LEG-2 Privacy
Policy) are carried in `LOOP_LEDGER.md` and cap the Implementation-Readiness score below 100 until
they close.

---

## 1. The threat model (what we are defending against)

The two public submission surfaces are:

1. **`/contact` form** — captures name, role, email, current-workflow text. Routes to a founder
   inbox + the design-partner pipeline. Low-volume, high-signal target.
2. **`/signup` funnel** (path settled by L-FUN-1; implementation still new) — Free-tier account creation via Google OAuth
   + magic link (no password — D-2). Higher-volume; the activation path to the moat metric.

**Threats (defense-in-depth, named):**

| Threat | Surface | Severity | Defense (this doc) |
|---|---|---|---|
| Form spam (bots, content injection, SEO-spam links in the textarea) | `/contact` | Medium | Honeypot (§4) + rate-limit (§3) + content validation incl. URL stripping (§5). |
| Email bombing (targeted harassment: an attacker submits the same victim email N times to flood their inbox via the magic-link / contact auto-reply) | `/contact`, `/signup` | Medium-High | **Per-recipient-email rate-limit** (§3.1: 1/day per email on `/contact`; 1/day per email on `/signup`). |
| Signup abuse / mass account creation / credential-stuffing probe | `/signup` | High | Rate-limit per IP + per email (§3.2) + fail-closed (§7) + audit logging (§6). (No password surface means no classic credential stuffing, but OTP-start abuse is the analogous threat.) |
| SSRF / header injection via the form | both | Low (sanitized) | Header-source validation (§5.3) + output encoding. |
| Enumeration of beta-allowlist / valid emails | `/signup`, `/login` | Medium | Public-safe closed error-code set (owned by `23-AUTH-EXPERIENCE.md` §2.4; this doc enforces the **no-leak invariant** in §5.4). |
| Auth-token abuse (invite/share tokens) | invite/share paths | High | POST-only mutations + token hashing + server pepper — **existing concern**, cross-link to `ARCHESTIMATOR_MASTER.md` §8.6; this doc does not redesign it. |
| Rate-limit backend unreachable (Supabase outage / network partition) | both | Medium | **Fail-closed** (§7): return an error, never open. |

The landing itself does **not** call Supabase from the browser (doc 07 §1.3). The form submits to a
**server action** (`"use server"`) that then writes to the inbox / pipeline / auth. The abuse
surface is the **server-action endpoint**, not the page.

---

## 2. The storage decision — Postgres, NOT Redis (canonical project position)

> **HARD PROJECT POSITION (verified).** Archestimator rate-limits on the **Supabase Postgres
> `security_rate_limit_events` table**, not Redis/Upstash. There is **no Redis dependency** in
> `package.json` (verified absent: no `ioredis`, `redis`, `@upstash/*`). Every prior reference in
> this doc to "Redis or a Supabase rate-limit table" is **corrected here**: Redis is NOT a
> shipped option and is NOT planned for the landing. If a future hot-path needs sub-ms limits, that
> is a separate, owner-gated infra decision (L-ENG-x); it does not change this doc's default.

### 2.1 The table (verified — `supabase/migrations/20260601003000_security_rate_limit_events.sql`)

```sql
create table if not exists public.security_rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  scope text not null,                          -- e.g. "landing_contact", "landing_signup"
  key_hash text not null,                       -- sha256 of composite key parts (§3.3)
  metadata_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  expires_at timestamptz not null               -- drives the GC delete
);

create index if not exists security_rate_limit_events_lookup_idx
  on public.security_rate_limit_events(scope, key_hash, occurred_at desc);
create index if not exists security_rate_limit_events_expiry_idx
  on public.security_rate_limit_events(expires_at);

-- RLS ON; service_role only (no anon/authenticated grants).
```

This table is a **sliding-window event log**: each accepted submission inserts a row keyed by
`scope` + `key_hash`; enforcement counts rows in the window. The `scope` column namespaces the
landing surfaces (`landing_contact`, `landing_signup`, `landing_signup_google`) from the existing
app scopes (`ai_ask`, `publication_digest`, shared-link).

### 2.2 The two proven in-repo patterns (clone, do not invent)

The codebase already has **two** Postgres-backed rate-limit patterns. This doc reuses them rather
than introducing a third:

| Pattern | Source | Mechanism | Use for |
|---|---|---|---|
| **Sliding-window count** | `src/lib/ai/rate-limit.ts` (`checkAiAskQuota`) | Insert event row → `count(*)` over each window → deny if over | **PRIMARY for `/contact` + `/signup`** — matches the multi-window thresholds in §3. |
| **Fixed-window slot reservation (RPC)** | `supabase/migrations/20260621133000_shared_link_atomic_publish_and_digest_slot.sql` (`reserve_security_rate_limit_slot`) | `pg_advisory_xact_lock(hashtext(scope), hashtext(key_hash))` → count → insert, single DB-serialized tx | **OPTIONAL hardening** if we observe a count+insert race under concurrent load (the publication digest path needed it for atomic single-slot guarantees). Not required at launch volume. |

The sliding-window pattern (`src/lib/ai/rate-limit.ts`) is the **default** for the landing: it is
simpler, already ships, and the landing's submission volume is low enough that the count-then-insert
race window is acceptable. **Upgrade to the RPC if and only if** monitoring (§6) shows enforcement
is being defeated by concurrent submits from the same key — this is a measured escalation, not an
upfront assumption.

### 2.3 New shared lib (named path)

The rate-limit helper for the landing surfaces lives in a new shared module that mirrors the
`src/lib/ai/rate-limit.ts` shape:

- **`src/lib/landing/rate-limit.ts`** — exports `checkLandingSubmissionQuota({ scope, windows,
  keyParts }): Promise<{ allowed: true } | { allowed: false; retryAfter: number; message: string }>`.
  It reuses the same `createHash("sha256")` composite-key hash, the same insert-then-count flow, and
  the same `security_rate_limit_events` table. The service-role admin client is constructed the same
  way as `createAiAuditSupabaseClient` (server-only, service-role key from env).

**Migration file path** (the landing introduces NO new table — it reuses the existing one; a
migration is only needed if we later adopt the fixed-window RPC, and even then the RPC already
exists from the shared-link work, so no new migration is required). **No schema change is in scope
for this redesign.** This is the lowest-blast-radius path.

### 2.4 Contact / waitlist data-flow contract (PII handling)

Before any public `/contact`, beta-request, walkthrough, or closed-beta waitlist form accepts real
visitor data, the implementation must pin this data flow:

| Item | Required contract |
|---|---|
| Storage destination | One of: a Postgres `landing_leads` table, the founder inbox, or an approved CRM. No silent third-party sink. |
| Access | Founder/admin-only during closed beta; no public dashboard, no broad workspace member access. |
| Retention | Default 12 months for rejected/idle leads, or shorter if legal chooses. Deletion path must be documented before public launch. |
| Provider readiness | Privacy Policy live (L-LEG-2); vendor DPA / Data Privacy Act posture checked before any CRM/PostHog Cloud lead sync (L-LEG-3). |
| Export/deletion | Manual owner-run export/deletion process is acceptable for closed beta; public launch requires a written runbook. |
| Support loop | Beta requests route to the owner support channel named in the launch runbook; no form should promise response timing until that channel is staffed. |

This table is a launch-readiness blocker for public signup/contact forms, not for static preview
routes. It closes the ambiguity between "form fields exist" and "PII processing is approved."

---

## 3. Rate-limit thresholds (composite-key, per-surface)

⚠️ **GATED on L-FUN-4** (the P1 abuse-guardrail work) — the thresholds below are the **planned**
policy; until L-FUN-4 closes, only a honeypot-only `/contact` is acceptable pre-launch (§7).

### 3.1 `/contact` thresholds

| Window | Limit | Key | Rationale |
|---|---|---|---|
| Per hour | **3 submissions** | `ip` | A human doing 3+ walk-through requests/hour is implausible; catches bot floods. |
| Per day | **10 submissions** | `ip` | Caps sustained low-rate abuse from one IP. |
| Per day | **1 submission** | `email` (recipient target) | **Email-bombing defense**: prevents an attacker from flooding a victim's inbox via the contact auto-reply. |
| Per hour | **100 submissions** | `global` (scope-wide) | Catches a distributed attack (many IPs, many emails). |

**Composite key:** `ip + email + route` hashed together (§3.3), so the same IP submitting different
emails is throttled by the IP cap; the same email from different IPs is throttled by the email cap;
the global cap is the backstop. The four windows are checked in priority order (per-IP first, so the
most specific message wins).

### 3.2 `/signup` thresholds

| Window | Limit | Key | Rationale |
|---|---|---|---|
| Per hour | **5 signups** | `ip` | Higher than `/contact` (legitimate org signups from one office IP) but still bot-hostile. |
| Per day | **1 signup** | `email` | One account per email; also the email-bombing defense (prevents OTP-flooding a victim inbox). |
| Per hour | **200 signups** | `global` | Backstop for distributed attacks. |

The same thresholds apply to **both** the magic-link action (`signInWithEmail` from `/signup`) and
the Google-OAuth-start action (`signInWithGoogle` from `/signup`), via two scopes:
`landing_signup` (magic link) and `landing_signup_google` (OAuth start). Google OAuth has its own
provider-side abuse protections; our rate-limit is a secondary backstop, not the primary defense.

### 3.3 The composite-key hash (verified pattern — `src/lib/ai/rate-limit.ts:23`)

```ts
function hashLandingQuotaKey(parts: Array<string | null | undefined>) {
  return createHash("sha256")
    .update([SCOPE, ...parts.map((p) => p?.trim() || "-")].join(""))
    .digest("base64url");
}
// /contact windows: keyParts = [ip, email, "contact"]   (the route disambiguates from /signup)
// /signup windows:  keyParts = [ip, email, "signup"]
// global windows:   keyParts = ["global", SCOPE]         (no PII — just the scope)
```

Hashing the key means the rate-limit table stores **no raw PII** — only a one-way hash of ip+email.
This is a privacy property (the table is `service_role`-only via RLS, but hashing is defense-in-
depth). The `` (unit separator) delimiter prevents key-collision ambiguity.

### 3.4 HTTP response shape

On a rate-limit hit, the server action does **not** return a literal `429` (server actions
communicate via redirect, not HTTP status — `src/lib/auth/actions.ts` uses `redirect()`). Instead:

- It redirects back to the form route with a `?rate_limited=1&retry=<seconds>` query param.
- The form leaf (owned by doc 23 / `05` for `/contact`) renders an `aria-live="polite"` banner:
  "You've reached the submission limit. Try again in `<humanized retry>` (or tomorrow)."
- The banner uses `--warning #b45309` text on `--warning-soft #fef3c7` (D-3 AA-compliant warning
  palette — **never** `--brand-orange #F24405` for the small text; it fails AA).

This matches the existing closed-error-code pattern in `src/lib/auth/error-mapping.ts` (public-safe
codes via query param, no internals leaked).

---

## 4. Honeypot (both surfaces)

A visually-hidden field that looks legitimate to a bot but is never shown to a real user or a
screen-reader user.

```tsx
<input
  type="text"
  name="company_url"            // honeypot — "company_url" looks like a real field a bot fills
  tabIndex={-1}                 // not in tab order
  autoComplete="off"
  aria-hidden="true"            // never announced to assistive tech
  className="sr-only"           // visually hidden but NOT display:none (bots detect display:none)
/>
```

**Rules:**

- If `company_url` (or whatever name the surface uses) is **non-empty**, treat as a bot: **silently
  drop** the submission and return a fake-success response (the `?sent=1` / thank-you path), so the
  bot does not learn the defense exists.
- The honeypot name is **per-surface and stable**: `/contact` uses `company_url`; `/signup` reuses
  `company_url` on the magic-link form and a second honeypot `phone` on the Google-OAuth-start form
  (Google's form has only the `next` hidden input today, so adding one honeypot is the minimum
  viable bot tripwire).
- Never put the honeypot behind `display: none` — bots detect it. `sr-only` + `tabindex=-1` +
  `aria-hidden` is the accessible + effective pattern (already used across the app).
- The honeypot is a **first-line cheap filter**, not the only defense — it catches unsophisticated
  bots; the rate-limit + validation catch the rest.

---

## 5. Input validation + SSRF / header-injection guards

### 5.1 `/contact` field validation

| Field | Rule | Error message (public-safe) |
|---|---|---|
| Name | 2–80 chars; letters, spaces, hyphens, apostrophes, periods; **no HTML, no control chars** | "Please enter your name (2–80 characters)." |
| Role | One of the enum values (architect / engineer / contractor / estimator / supplier / PM / client / other) | "Please select your role." |
| Email | RFC-valid; max 254 chars; **lowercase-normalized**; no HTML; MX-record check **optional** (defer until bounce rate justifies — L-ENG-2 family) | "Please enter a valid email." |
| Current-workflow (textarea) | 0–1000 chars; no HTML; no control chars; **URL stripping** (replace `https?://\S+` with `[link removed]` to defeat SEO-spam link injection) | "Please keep your note under 1000 characters." |
| Consent checkbox | Required | "Please confirm you have read the privacy notice." |
| Honeypot (`company_url`) | Must be empty | (silent drop — fake success) |

Errors render per `12-ACCESSIBILITY-AUDIT.md` §6: `aria-invalid`, `aria-describedby`, AA-contrast
error text (`--danger` on `--danger-soft`, D-3).

### 5.2 `/signup` field validation

`/signup` reuses the **existing** server-side email validation in `signInWithEmail`
(`src/lib/auth/actions.ts:36` — `String(formData.get("email")).trim().toLowerCase()`), plus the
honeypot + rate-limit additions above. **No new validation logic is introduced for `/signup`** —
the auth actions already normalize + validate the email; this doc only adds the rate-limit call and
the honeypot check as wrapper logic in the new server-action file (§5.5).

### 5.3 SSRF / header-injection guards (which headers, which charset)

The server action reads a **closed, allow-listed** set of request headers (mirrors the verified
pattern in `src/lib/auth/actions.ts:16-33` `getRequestMetadata`):

| Header | Read how | Validation |
|---|---|---|
| `x-forwarded-for` | `.split(",")[0].trim()` → first hop only (the client IP) | **Character whitelist**: `^[A-Za-z0-9.:_-]+$`, max 45 chars (IPv6 max). Reject (treat as unknown IP → fall through to global-only rate-limit) on any other char. Never reflect this value back to the user. |
| `user-agent` | read for audit logging only | **Truncate to 256 chars**; strip control chars; never render in HTML without escaping. Used only in `recordAccountSecurityEvent` metadata, never returned to the client. |
| `host`, `x-forwarded-proto`, `origin` | read by `resolveAuthOrigin` (`src/lib/auth/redirects.ts`) to build the callback URL | **Already validated** by `resolveAuthOrigin` (the existing open-redirect guard). The landing contact action does NOT reconstruct URLs from these — it uses the resolved origin only for the magic-link redirect, never for outbound HTTP. |
| `content-type` | NOT read — Next.js server actions enforce `multipart/form-data` parsing; we never manually parse a body | N/A — no manual body parsing = no SSRF via content-type confusion. |
| `referer` / `referrer` | **NOT trusted.** Read for analytics only (which page the submit came from) | If logged, truncate + strip control chars. Never used for access control or redirect. |

**The form does not make outbound HTTP requests based on user input.** The contact action writes to
the founder inbox via the email provider (server-side, fixed recipient) and to a DB table; the
signup action calls Supabase Auth. There is **no user-controllable URL fetch** anywhere in either
flow — this is the primary SSRF mitigation (the attack surface does not exist). The header
validation above is defense-in-depth for the audit log.

### 5.4 No-leak invariant (email enumeration defense)

- `/contact` returns the **same** generic success path whether the email is valid, invalid-but-
  plausible, or rate-limited (the rate-limit case redirects with `?rate_limited=1`, which is not
  an enumeration signal because it fires on IP/email volume, not on email existence).
- `/signup` reuses the closed `AUTH_ERROR_CODES` set (`23-AUTH-EXPERIENCE.md` §2.4): the magic-link
  action returns `?sent=1` whether or not the email is already registered (`shouldCreateUser:true`
  means the link works for both new and existing users). **Never** add a "this email is already
  registered" message — that is an enumeration vector.

### 5.5 The server-action files (named paths)

| Surface | File (NEW) | Reuses |
|---|---|---|
| `/contact` | **`src/lib/landing/contact-actions.ts`** (`"use server"` — exports `submitContactForm`) | `src/lib/landing/rate-limit.ts` (§2.3), `recordAccountSecurityEvent` (audit), `parseLandingConsentValue` (consent), the email provider (L-ENG-2). |
| `/signup` | **`src/lib/auth/signup-actions.ts`** (`"use server"` — thin wrapper around the existing `signInWithEmail` + `signInWithGoogle`) | Adds the `landing_signup` / `landing_signup_google` rate-limit check + honeypot guard **before** delegating to the existing auth actions in `src/lib/auth/actions.ts`. Does NOT duplicate or fork the auth logic — it wraps it. |

**Why a separate `signup-actions.ts` and not inline in `actions.ts`:** the existing `actions.ts` is
shared by `/login` (returning users) and would be touched by every auth change; isolating the
`/signup`-specific abuse wrappers in their own file keeps the blast radius of L-FUN-4 contained
and matches the repo convention of one concern per file under `src/lib/auth/`. The `/login` path
inherits the same rate-limit by calling the same `checkLandingSubmissionQuota` from the existing
actions (login is lower-risk but should still be throttled — credential-stuffing probes hit login,
not signup). This is a **recommendation**, not a hard contract; the implementer may inline if
`actions.ts` stays clean. Tracked as a verify item, not a gate.

Memory `use-server-exports-only-async`: both files export **only async functions** under
`"use server"` — adding a non-async export breaks `next build` (not `tsc`/`vitest`).

### 5.6 Pending, duplicate-submit, and retry contract

Every public form leaf (`ContactForm`, `LoginForm`, `SignupForm`, `ClosedBetaGate`) must expose
a deterministic pending state:

| State | Required behavior |
|---|---|
| Initial | Submit button enabled; `aria-describedby` points to field help/error text; honeypot hidden from AT. |
| Pending | Use `useFormStatus()` or the local equivalent inside the submit-button leaf; disable the submit button; set `aria-busy="true"` on the form region; preserve field values; do not change layout height. |
| Duplicate click while pending | No second server action call. If the platform still receives a second POST, the Postgres quota layer catches it and returns the same public-safe result. |
| Success | Render the existing `?sent=1` / thank-you path in an `aria-live="polite"` region; never clear the message on re-render until navigation or a new submission. |
| Rate-limited / fail-closed | Render one public-safe retry message with `Retry-After` if available; keep the submit button disabled only until the visible retry window expires or the user edits the form. |

This is a UX + safety contract, not a new library requirement. It exists so `16-TEST-AND-
VERIFICATION-PLAN.md` can assert pending behavior without hard-coding component internals.

---

## 6. Audit logging + monitoring + alerting

### 6.1 Audit trail (existing pattern — `recordAccountSecurityEvent`)

Every submission, every rate-limit hit, every rejection is logged via
`recordAccountSecurityEvent` (the same audit layer `src/lib/auth/actions.ts` uses) with:

- `eventType` (e.g. `landing_contact_submit_allowed`, `landing_contact_rate_limited`,
  `landing_signup_honeypot_hit`, `landing_signup_rate_limited`)
- `ipAddress` (the validated `x-forwarded-for` first hop — §5.3)
- `userAgent` (truncated)
- `metadata` containing the **safe_next** (sanitized), the route, the rate-limit window that fired,
  and a **hash** of the email (never the raw email in the audit log — the raw email lives in the
  inbox/DB row, keyed by submission id).

This is the **security audit layer**, distinct from product analytics (`17-ANALYTICS-AND-
OBSERVABILITY.md`). The two layers are kept separate per doc 23 §9.2.

**Implementation contract update:** add the `landing_*` event names to the server-side audit-event
type surface (`src/lib/auth/account-data.ts`) or route them through an explicit landing audit writer
before implementation. Do not rely on prose-only event names; type drift would silently drop the
audit trail.

### 6.2 Monitoring signals + alert thresholds

| Signal | Source | Alert threshold → action |
|---|---|---|
| Submission rate (per hour) | `security_rate_limit_events` count | **> 2× the 7-day rolling average** → alert (possible attack). |
| Honeypot hit rate | audit log (`landing_*_honeypot_hit`) | **> 5% of submissions** → alert (bot activity); triggers the CAPTCHA-escalation review (§8). |
| Rate-limit hits | audit log (`landing_*_rate_limited`) | **> 50 in an hour** → alert. |
| Signup → first-estimate activation | product analytics `signup` + `first_estimate_created` | **Activation rate < 20%** → alert (form/onboarding problem — not a defense issue, but a funnel-health signal). |
| Rate-limit backend unreachable | the `checkLandingSubmissionQuota` throw path | **Any** fail-closed event → page the founder (§7). |

Alerts route to the founder inbox + the analytics dashboard (`17-ANALYTICS-AND-OBSERVABILITY.md`).

---

## 7. Fail-closed retry UX (the load-bearing safety property)

> **HARD RULE.** If the rate-limit backend (Supabase Postgres) is unreachable, the submission
> **fails closed** — it returns an error to the user, never an open accept. This is the single most
> important abuse property: an outage must not silently disable rate-limiting.

### 7.1 The fail-closed code path

The `checkLandingSubmissionQuota` helper (`src/lib/landing/rate-limit.ts`) **throws** on any
Supabase error (mirrors `src/lib/ai/rate-limit.ts:55,63,73` — every `error` throws, it does not
return `allowed:true`). The server action catches the throw and redirects to a **fail-closed error
state**:

| Surface | Fail-closed UX |
|---|---|
| `/contact` | Redirect to `/contact?error=service_unavailable`; render an `aria-live="polite"` banner: "We couldn't submit your message right now. Please try again in a few minutes, or email us directly at support@archestimator.com." (The support email is a hardcoded fallback — it does not depend on the rate-limit backend.) Banner uses `--danger` on `--danger-soft` (D-3). |
| `/signup` | Redirect to `/signup?error=service_unavailable`; same banner pattern with a "try again" CTA. The closed-beta gate and the auth actions are **not bypassed** — if the rate-limit cannot be checked, the signup does not proceed to `signInWithOtp`. |

### 7.2 Why fail-closed, not fail-open

- **Fail-open** (accept the submission, log the outage) would let an attacker time an attack to a
  brief Supabase hiccup and flood the surface during the window. For `/contact` this is a spam
  risk; for `/signup` this is an account-creation / OTP-flood risk.
- **Fail-closed** trades a brief user-facing error for a hard safety property. The landing is
  low-volume; a 5-minute outage costs a handful of frustrated submitters, not a flood. The founder
  is paged (§6.2) so the window is short.
- This mirrors the verified fail-closed pattern in `src/lib/auth/closed-beta-access.ts`: on RPC
  error, `status:"error"` → `allowed:false` (denied). The landing surfaces hold the same line.

### 7.3 Retry guidance

The fail-closed banner offers a **manual retry** ("try again in a few minutes") and the direct
email fallback (`/contact` only). There is **no automatic retry loop** — an auto-retry would hammer
the backend during the outage. The user is in control of the retry cadence.

---

## 8. The CAPTCHA decision (escalation-only, NOT yet built)

> **Cloudflare Turnstile is NOT yet built.** It is the **planned** escalation path. Until it ships,
> `/contact` + `/signup` rely on **honeypot + Postgres rate-limit + validation + fail-closed**.
> This is the launch posture. Do not invent a CAPTCHA integration in this redesign.

### 8.1 The decision matrix

| Option | Pro | Con | Stance |
|---|---|---|---|
| **No CAPTCHA** (honeypot + rate-limit + validation) | Best UX; no third-party; no privacy cost; zero JS | Less defense against determined bots | **LAUNCH DEFAULT.** Sufficient for a low-volume, closed-beta surface. |
| **Cloudflare Turnstile** (invisible) | No user interaction; privacy-respecting; free | Third-party script (perf cost); a JS dependency; integration work | **ESCALATION PATH.** Add when §8.2 triggers fire. |
| **hCaptcha** | Privacy-respecting; free tier | User interaction sometimes required | Alternative to Turnstile if Turnstile proves ineffective. |
| **Google reCAPTCHA** | Effective | Privacy cost; Google dependency; UX cost | **REJECT (R10).** Conflicts with the private-by-design posture. Never. |

### 8.2 Turnstile escalation TRIGGER (concrete thresholds)

CAPTCHA is added **only** when monitoring (§6) shows abuse that the existing defenses cannot hold.
The trigger is **any one** of:

| Trigger | Threshold | Source |
|---|---|---|
| Honeypot hit rate sustained | **> 5% of submissions for 7 consecutive days** | audit log |
| Rate-limit hit volume | **> 50 `rate_limited` events/hour, sustained for 3 days** | audit log |
| Spam that reaches the inbox | **> 10 confirmed-spam contact submissions/week** (manual founder review) | founder inbox |
| Signup abuse | **> 100 `landing_signup` rate-limit hits in an hour** (distributed attack signature) | audit log |

When a trigger fires, the owner (Philip) decides whether to enable Turnstile. This is **not an
automated escalation** — it is an owner-gated decision logged in `LOOP_LEDGER.md` (open item, no
L-ID until triggered). The integration point is the server action (verify the Turnstile token
server-side before proceeding), not the client form (doc 23 owns the client; this doc owns the
server verification).

### 8.3 Radical-honesty note

The landing must **not** display a "protected by Turnstile" badge or any security-theater claim
while Turnstile is unbuilt. §15 (`06-PROOF-AND-CLAIMS-DISCIPLINE.md`) forbids invented badges; a
CAPTCHA badge on a form with no CAPTCHA is exactly that. When Turnstile ships, it is announced
factually in the `/trust` page (per the D-4 ClaimStatus type — it would be a `Live` claim).

---

## 9. The consent model (cross-link, not redefinition)

The redesign reuses the **existing** `LANDING_CONSENT_COOKIE_NAME` + `parseLandingConsentValue()`
+ `createLandingConsentState()` from `src/lib/landing/consent.ts` (verified). Three tiers:

1. **Necessary** (always on) — the form submission itself; security audit logging; rate-limit
   enforcement. These do not depend on the consent cookie.
2. **Analytics** (opt-in via the banner) — the `route_view`, `contact_form_submit`, `signup`,
   `first_estimate_created` events. The server action reads the consent cookie before firing the
   analytics event (existing pattern).
3. **Marketing/ads** (not applicable at launch — no ad scripts).

The **consent checkbox on `/contact`** is a **separate, submission-specific** consent ("I have read
the Privacy Notice and agree to be contacted"), distinct from the analytics cookie consent. Both
must be honored. The consent state is captured in the `contact_form_submit` analytics event for
audit.

---

## 10. Brand vocabulary for the feedback states (D-1 / D-3)

This doc does not own the form layout, but it owns the **meaning** of each feedback state, which
binds to a real `globals.css` token (verified):

| State | Token (verified in `src/app/globals.css`) | Usage rule |
|---|---|---|
| Hard error (validation fail, fail-closed, rate-limit) | text `--danger #b91c1c` (L96) on `--danger-soft #fee2e7` (L97) | Small text → must pass AA (~5.9:1 on the soft bg). **Never** `--brand-orange #F24405` for small error text (fails AA). |
| Warning (rate-limit retry, soft caution) | text `--warning #b45309` (L94) on `--warning-soft #fef3c7` (L95) | AA-compliant warning pair. |
| Success (submission accepted) | text `--brand-orange-dark #C63804` (L38) on `--brand-orange-soft` (L39, 14% mix) | D-3: AA small orange text uses the **dark** token, not the fill. |
| Primary CTA fill (submit button) | `--brand-orange #F24405` (L37) fill, white text | D-3 allows the fill on primary CTAs (white-on-orange passes AA). |
| Focus ring | `--brand-orange #F24405` (L37) | Instant `:focus-visible` ring (doc 07). |
| Muted helper text | `--secondary #5d5d5d` (L11) or `--muted-foreground #6b6b6b` (L26) | **Never** `#7F7F7F` (memory `designmd-tertiary-fails-aa`). |
| Glass panel (the form's container) | `.dashboard-glass` class (the form leaf lives inside a glass surface per doc 23) | At most **one** blur panel per auth viewport (doc 23 §8); the contact form is a single surface. |

**Tailwind v4 gotcha (memory `tailwind-arbitrary-var-needs-color-hint`):** use
`bg-[color:var(--danger-soft)]` / `text-[color:var(--danger)]`, **not** `bg-[var(--x)]` — the latter
silently emits no color in this TW v4 setup.

---

## 11. The `/contact` form's relationship to the redesign (what changes, what stays)

The current `src/app/contact/page.tsx` + `src/components/landing/ContactForm.tsx` are **replaced**
by the redesign (per `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md`):

- **Stays:** the field set (name, role, email, current-workflow, consent), the founder-inbox
  destination, the privacy-promise copy point.
- **Changes:** the visual chrome (paper → glass, per D-1 — owned by doc 03 / 11 / 23 visual specs);
  the submission path (client fetch → **server action** `submitContactForm` in
  `src/lib/landing/contact-actions.ts`); the abuse defense (none today → honeypot + rate-limit +
  fail-closed).
- **Removed:** any hardcoded color hex in the JSX (e.g. the current `#f5f5f3`, `#cfcfca`,
  `#626260`) — replaced by tokens (D-3, doc 03).

This doc owns the **submission-path + defense** delta; the visual delta is owned by docs 03 / 11 /
23. The blast-radius doc (21) owns the file-level migration order.

---

## 12. Cross-links (all canonical filenames per `10-CANONICAL-DOC-MAP.md`)

- `05-COPY-SKELETON.md` — the `/contact` form copy (field labels, consent text, error-message
  wording owned here, copy placement owned there).
- `07-ENGINEERING-CONSTRAINTS.md` — the funnel co-dependencies (§8) + the `/signup` route decision
  (§6.1) + the no-Supabase-from-the-browser rule (§1.3).
- `08-ROLLOUT-AND-ANALYTICS.md` — the analytics events (§4) + the preview-route gating.
- `10-CANONICAL-DOC-MAP.md` — canonical filenames (every link above resolves here).
- `12-ACCESSIBILITY-AUDIT.md` §6 — the form a11y (`aria-invalid`, `aria-describedby`, AA contrast).
- `13-SEO-AND-DISCOVERY.md` — `/login` + `/signup` `noindex,nofollow` (the abuse defense does not
  change this; the noindex is a discovery concern, not a defense concern).
- `16-TEST-AND-VERIFICATION-PLAN.md` — the abuse-defense tests (rate-limit, honeypot, validation,
  fail-closed, no-leak).
- `17-ANALYTICS-AND-OBSERVABILITY.md` — the monitoring + alerting dashboard + the audit-vs-
  analytics layer separation.
- `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` — the file-level change inventory for `/contact` + the
  new `/signup` + `src/lib/landing/contact-actions.ts` + `src/lib/landing/rate-limit.ts` +
  `src/lib/auth/signup-actions.ts`.
- `23-AUTH-EXPERIENCE.md` — **the visual 2-col form** (`AuthLayout`, `LoginForm`, `SignupForm`,
  `ClosedBetaGate`); the closed error-code set (§2.4); the closed-beta-gate-as-content-variant
  pattern (§3.2). This doc (15) owns the **server defense** that wraps those forms.
- `LOOP_LEDGER.md` — L-FUN-1 (superseded `/signup` route decision), L-FUN-2 (beta onboarding), L-FUN-4 (abuse
  guardrails P1), L-LEG-2 (Privacy Policy), L-ENG-2 (email provider / analytics tool), L-RAT-6
  (R10 private-by-design stance that rejects reCAPTCHA).

---

## 13. ⚠️ Gated on / Open decisions (carried in `LOOP_LEDGER.md`, never silently closed)

Per D-5, no gate is silently marked closed. The load-bearing gates for THIS doc:

- **G — Abuse guardrails P1 (L-FUN-4).** Durable Postgres rate-limiting is the load-bearing
  dependency for both surfaces. Until it ships, **neither** `/contact` nor `/signup` should go
  fully public. A temporary `/contact` with honeypot-only is acceptable pre-launch (low-volume,
  founder-monitored); a public `/signup` without rate-limiting is **not** acceptable (it is the
  account-creation surface).
- **G — The `/signup` implementation.** L-FUN-1 settles the route path as `/signup`, but the
  source route does not exist yet. The server-action file (`src/lib/auth/signup-actions.ts`) is
  named but not written until the route implementation starts.
- **G — Beta onboarding + self-serve (L-FUN-2).** Decides whether `/signup` runs `SignupForm`
  (real account creation) or `ClosedBetaGate` (request-access variant). The defense wraps both;
  the routing is gated.
- **G — Privacy Policy (L-LEG-2).** Blocks the consent copy on `/contact` + the `/signup` legal-
  links row. The form must not collect email before the Policy is live.
- **G — Email provider (L-ENG-2 family).** The contact action writes to the founder inbox via an
  email provider; the provider choice is owner-gated. The defense is provider-agnostic (it throttles
  the submission, not the email send).
- **O — CAPTCHA escalation (§8.2).** Default no CAPTCHA at launch; Turnstile as escalation when a
  trigger fires. Owner-gated at trigger time; no L-ID until triggered.
- **O — Disposable-email blocking.** Defer until abuse observed; blocking disposable emails can
  exclude legitimate users (some contractors use disposable emails for trials).
- **O — MX-record email validation.** Defer until bounce rate justifies the latency cost (L-ENG-2).
- **O — Sliding-window vs fixed-window RPC (§2.2).** Default sliding-window; upgrade to
  `reserve_security_rate_limit_slot` RPC only if monitoring shows a count+insert race. Measured
  escalation, not upfront.

---

## 14. Coherence contracts (this doc honors)

- **D-1 (Glass Brand)** — the abuse logic is storage-agnostic; the error/feedback chrome is bound
  to real glass-brand tokens (§10). No paper/serif references as the default.
- **D-2 (full-page 2-col auth)** — this doc owns **abuse defense only**; the visual 2-col form is
  owned by `23-AUTH-EXPERIENCE.md`. The split is explicit in §0 + §5.5 + §12.
- **D-3 (orange discipline)** — small error/warning text uses `--danger` / `--warning` /
  `--brand-orange-dark #C63804`, **never** `--brand-orange #F24405` fill for small text. Clay
  `#AA412A` is NOT a token and NOT referenced anywhere in this doc. `bg-[color:var(--x)]` form
  honored.
- **D-4 (ClaimStatus)** — not directly used here (no Live/Building/Planned claims on a form); the
  Turnstile-would-be-`Live` note in §8.3 references the type if a claim is ever made.
- **D-5 (honest scoring)** — §15 below. No self-congratulation; gated items carried, not closed.
- **Rate-limiting = Postgres** — §2; Redis is explicitly NOT shipped. `security_rate_limit_events`
  is the verified table.
- **Turnstile NOT yet built** — §8; escalation-only with concrete triggers.
- **Radical honesty** — no fake badges (§8.3), no invented security claims, no invented stats.

---

## 15. Honest self-score (D-5)

| Dimension | Score | Justification |
|---|---|---|
| **Strategy** | **96 / 100** | The threat model is complete (bots, email bombing, SSRF, enumeration, token abuse, backend-unreachable), the storage decision is the canonical project position (Postgres, verified — not Redis), the defense-in-depth is coherent (honeypot → rate-limit → validation → fail-closed → CAPTCHA-escalation), and the scope split with doc 23 is explicit. The fail-closed rule is the load-bearing safety property and is stated unambiguously. Not 100 because L-FUN-2/L-FUN-4 are genuinely open and the `/signup` launch behavior depends on them; the Turnstile-escalation triggers are policy I assert, not yet owner-confirmed in their exact numeric thresholds. |
| **Quality** | **95 / 100** | Every storage claim is grep-verified against the real migration + the real `src/lib/ai/rate-limit.ts` + the real RPC; every threshold is justified; every cross-link resolves to a canonical filename; the server-action file paths are named and follow the verified `src/lib/auth/actions.ts` pattern; the SSRF section names the exact headers + char whitelist; the composite-key hash cites the real implementation. No `#AA412A`, no Redis-as-default, no paper/serif-as-default. Not 100 because: (a) the exact honeypot field name (`company_url` / `phone`) is a recommendation the implementer may tune; (b) the fail-closed error message wording is a suggestion, not copy-locked (doc 05 owns final copy); (c) the sliding-vs-RPC choice is deferred to monitoring, which is correct but leaves one architectural decision open. |
| **Implementation-Readiness** | **92 / 100** | An engineer can start: the table + RPC already ship (no migration needed), the rate-limit lib pattern is proven and clonable (`src/lib/ai/rate-limit.ts`), the server-action files are named with their imports identified, the pending/duplicate-submit contract is testable, the fail-closed path is concrete, and the thresholds are deploy-ready numbers. Not 100 because: (a) `src/lib/landing/rate-limit.ts`, `src/lib/landing/contact-actions.ts`, and `src/lib/auth/signup-actions.ts` do not exist yet (they are the deliverable); (b) `/signup` does not exist on disk even though its route path is settled; (c) the Privacy Policy is not live (gated L-LEG-2, blocks the consent copy); (d) the fail-closed UX needs a live test that a real Supabase outage produces the error state, not an open accept — this is an honest implementation-time verification, not a doc gap. Per D-5 these open gates cap readiness below 100 rather than being silently closed. |

**Carried to LOOP_LEDGER (not silent):** L-FUN-2, L-FUN-4, L-LEG-2, L-ENG-2, L-RAT-6
(R10 → rejects reCAPTCHA). Open (no L-ID until triggered): CAPTCHA escalation, disposable-email
blocking, MX validation, sliding-vs-RPC upgrade.
