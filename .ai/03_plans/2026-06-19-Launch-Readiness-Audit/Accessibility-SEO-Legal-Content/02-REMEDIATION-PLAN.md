# Remediation Plan — Accessibility, SEO & Legal/Content Readiness (2026-06-19)

> Adversarially verified against the codebase and the prior packs on 2026-06-19.
> See `03-EVIDENCE-AND-VERIFICATION.md` for per-finding verdicts and proof gates.

## Headline correction (read first)

The prior auditor's two **launch-blocker** SEO findings (SEO-01, SEO-CONTENT-01)
are **overstated**. `/share/:path*` and `/api/share/:path*` already ship
`X-Robots-Tag: noindex, nofollow` at the **HTTP-header** level via
`shareHardeningHeaders` in `next.config.ts:107-113,118-124,132-134`. `X-Robots-Tag`
is an authoritative, crawler-respected directive (Google/Bing honor it exactly like a
`<meta name="robots">` tag). So confidential client proposals on `/share` are **not**
currently indexable. `/workshop/:path*` and `/invite/:path*` carry the same header
(`next.config.ts:160-176`). The Deploy pack (`2026-06-19-Launch-Readiness-Audit/NextJS-Vercel-Deploy-And-Headers`,
DEPLOY-03) already owns the residual `robots.txt`/`sitemap.ts` work and **already rated it
adjusted-to-LOW** for exactly this reason.

**Net: there are ZERO launch blockers in this domain.** Everything here is reversible
polish and defense-in-depth that improves the public surface but does not gate the closed beta.

## Priority order (no blockers — ordered by value/effort)

| # | Item | Finding(s) | Severity | Effort | Depends on |
|---|------|-----------|----------|--------|-----------|
| 1 | `metadataBase` + root default OG/twitter | SEO-02 | medium | S | none |
| 2 | Per-page metadata on marketing + legal pages | SEO-03 | medium | M | #1 (inherits OG) |
| 3 | Root `not-found.tsx` / `error.tsx` / `global-error.tsx` | A11Y-03 | medium | M | none |
| 4 | Defense-in-depth `robots` on `/share` `generateMetadata` | SEO-01 | low | S | none |
| 5 | Legal-page font-size readability (advisory) | A11Y-01 | low (advisory) | S | Philip sign-off |
| 6 | Skip-to-content link on public shell | A11Y-02 | low | S | none |

`robots.ts` / `sitemap.ts` files themselves are **owned by the Deploy pack** (DEPLOY-03);
this pack only supplies the path-scoping content contract (below). Do not create those files here.

---

## 1 — `metadataBase` + root default OG/twitter (SEO-02)

**Why:** `src/app/layout.tsx:18-30` sets title/description/icons/manifest but **no
`metadataBase`**. The share page emits `openGraph` with relative resolution; with no base,
Next resolves OG/canonical URLs against `localhost` at build and emits a build warning, and
social previews are unreliable. There is no root-level OG/twitter default for any page to inherit.

**Steps:**
1. In `src/app/layout.tsx` root `metadata`, add:
   - `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.archestimator.com")`
     (confirm the canonical production host with Philip — if the prod domain is the apex
     `archestimator.com` rather than `www.`, use that; do not hardcode the wrong host).
   - A default `openGraph` block: `{ type: "website", siteName: "Archestimator", title, description, url: "/" }`.
   - A default `twitter` block: `{ card: "summary_large_image", title, description }`.
2. Do NOT add an OG `image` that requires Supabase/service-role on the public route — keep the
   share page's deliberate no-image posture (`src/app/share/[token]/page.tsx:304-309`). A static
   marketing OG image under `public/` is fine for the root default.

**Files:** `src/app/layout.tsx`.
**Risk:** very low (metadata-only). **Effort:** S.
**Cross-domain:** confirm the canonical host with the Deploy pack (it also references the host for
robots/sitemap `host`/`sitemap` fields) so both packs use one source of truth — prefer a shared
`NEXT_PUBLIC_SITE_URL` env value.

---

## 2 — Per-page metadata on marketing + legal pages (SEO-03)

**Why:** Only `layout.tsx` and `share/[token]/page.tsx` export metadata. `/about`, `/features`,
`/pricing`, `/contact`, `/privacy`, `/terms`, `/login`, `/beta/access-required` all inherit the
single root title with no unique description/OG → poor SERP/social differentiation for the funnel.

**Steps:**
1. Add `export const metadata: Metadata = { title, description }` to each of:
   `src/app/about/page.tsx`, `src/app/features/page.tsx`, `src/app/pricing/page.tsx`,
   `src/app/contact/page.tsx`, `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`.
   - These are `async` server components today; a sibling `export const metadata` is valid alongside
     the default export. Use the `title.template`/string title pattern — set a `title.template`
     (`"%s | Archestimator"`) in the root layout so per-page titles compose cleanly.
2. For `/privacy` and `/terms`, also set `robots: { index: true, follow: true }` explicitly (they
   are intended to be public/indexable) and a per-page canonical via `alternates: { canonical: "/terms" }`.
3. Do **not** add per-page metadata to `/login` or `/beta/access-required` that competes for SEO;
   the Deploy pack's `robots.ts` will `Disallow` those. A minimal `robots: { index: false }` on
   `/beta/access-required` is reasonable defense-in-depth but is owned by the Deploy posture — note,
   don't duplicate.

**Files:** the six marketing/legal `page.tsx` above; `src/app/layout.tsx` (title template).
**Risk:** low. **Effort:** M.
**Dependency:** OG inheritance depends on item #1 landing first.

---

## 3 — Branded root error / not-found / global-error (A11Y-03)

**Why:** `src/app/{not-found,error,global-error}.tsx` are all absent. Error boundaries exist only
deep under `/workshop/*` (`src/app/workshop/library/error.tsx` + siblings → `WorkshopRouteErrorState`).
A 404 on a marketing/legal/`/share` URL (incl. expired/invalid share links) or a root-segment render
error falls back to Next's default unstyled screens — a poor first impression and no recovery affordance.

**Steps:**
1. `src/app/not-found.tsx` (server component): `<main>` with `id="main"`, an `<h1>`, a short message,
   and a `<Link href="/">` home. Reuse landing tokens; keep it dependency-light (no auth, no Supabase).
2. `src/app/error.tsx` (`"use client"`): accept `{ error, reset }`, render a branded message with a
   `reset()` button and a home link; `role="alert"` on the message; do not surface raw error text.
3. `src/app/global-error.tsx` (`"use client"`): must render its own `<html><body>` (it replaces the
   root layout when the root errors); minimal branded fallback + reset.
4. Keep all three free of `getLandingAuthState`/`cookies()` so a failure in those paths can't recurse.

**Files (new):** `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`.
**Risk:** low–medium (global-error replaces root layout — verify it renders standalone in `next build`).
**Effort:** M.

---

## 4 — Defense-in-depth `robots` on `/share` generateMetadata (SEO-01, adjusted to LOW)

**Why (corrected):** The header-level `X-Robots-Tag: noindex, nofollow` already keeps these pages
out of indexes (`next.config.ts:112`). This item is **belt-and-suspenders only**: a metadata
`robots: { index:false }` is a second signal if the header is ever misconfigured, and it costs
nothing. Separately, note the **description string itself** embeds the client name + total contract
value (`src/app/share/[token]/page.tsx:301-302`) — this is fine for the intended recipient, but it
means any non-robots scraper (link-unfurlers in chat apps, email security scanners) that fetches the
page can read it from `<meta>`. That is an accepted product trade-off (the recipient is meant to see
it); it is **not** a crawler-indexing exposure. Do not escalate it back to a blocker.

**Steps:**
1. In `src/app/share/[token]/page.tsx`, add `robots: { index: false, follow: false }` to **every**
   return path of `generateMetadata`: the success branch (310-317), the `protectedPublicationMetadata`
   constant (271-278), the not-found branches (286, 294), and the `catch` (319).
   Cleanest: build a shared `const noIndexRobots = { index: false, follow: false } as const;` and
   spread it into each returned `Metadata`.
2. Optionally tighten the unfurl-leak by trimming the total/clientName out of the OG `description`
   while keeping the human-readable on-page content — **only if Philip wants** link-preview privacy;
   default is to leave it (the recipient is the audience). Record the decision.

**Files:** `src/app/share/[token]/page.tsx`.
**Risk:** very low — confirm it does not reintroduce Supabase/service-role access (it does not; pure
metadata). **Effort:** S.
**existing_plan_overlap:** the robots.txt `Disallow: /share` half is **covered-by DEPLOY-03**; this
metadata half is net-new but redundant-by-design.

---

## 5 — Legal-page font-size readability (A11Y-01, ADVISORY — not a gate)

**Why:** `src/app/privacy/page.tsx` and `src/app/terms/page.tsx` render legally operative documents
at sub-readable sizes: `h1` `text-[12px]` (`privacy:15`, `terms:19`), `h2` `text-[11px]`, body
`text-[10px]` (`privacy:23`, `terms:30`), meta/footer `text-[9px]` (`privacy:12,18,66`; `terms:16,22,59`).
Color contrast **passes** (`#1f201f`/`#5f615f` on `#eeeeec`) — the issue is purely size. 9–10px on a
clickwrap/notice undermines readability for low-vision users and weakens "conspicuousness" of terms.

**DESIGN.md is an alpha guide, not law** (per CLAUDE.md + memory `design-contract-is-alpha-guide`).
This is **advice to Philip**, not a blocker and not something to auto-apply without his call.

**Suggested change (if approved):** body → `text-[14px]`/`text-[15px]` with `leading-6`; `h1` →
`text-[20px]+`; `h2` → `text-[15px]`; meta/footer → `text-[12px]`. Keep the existing colors.

**Files:** `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`.
**Risk:** low (visual only). **Effort:** S. **Dependency:** Philip design sign-off.

---

## 6 — Skip-to-content link (A11Y-02)

**Why:** No skip link anywhere (`rg "skip.*content|href=\"#main"` → 0). Keyboard/SR users tab through
the full header nav on every public page. The `<main>` elements also lack an `id` to target
(`PublicPageShell.tsx:34`, `page.tsx:34` both `<main data-landing-page-root="true">` with no `id`).

**Steps:**
1. Add `id="main"` to the `<main>` in `src/components/landing/PublicPageShell.tsx:34` and the home
   `<main>` in `src/app/page.tsx:34` (or refactor home to also flow through the shell `<main>`).
2. Add a visually-hidden, `:focus-visible`-revealed `<a href="#main" class="sr-only focus:not-sr-only …">`
   as the first focusable element — best placed once in `PublicPageShell` before `LandingHeader`. For
   the home page (which renders `LandingHeader` inside `page.tsx`, not via the shell `else` branch),
   add the same anchor at the top of the home tree or unify the layout so the skip link is shared.

**Files:** `src/components/landing/PublicPageShell.tsx`, `src/app/page.tsx` (and a `sr-only`/`focus`
utility if not already in `globals.css`).
**Risk:** low. **Effort:** S.

---

## Content contract handed to the Deploy pack (DEPLOY-03)

This pack does **not** own `robots.ts`/`sitemap.ts`. It asserts the content rules the Deploy pack must
honor (it already plans these — listed here only as the cross-pack contract):
- `robots.ts`: `Allow: /`; `Disallow`: `/api`, `/workshop`, `/invite`, `/share`, `/login`, `/beta`,
  `/auth`. Reference the sitemap + `host`.
- `sitemap.ts`: marketing + public legal only — `/`, `/about`, `/features`, `/pricing`, `/contact`,
  `/privacy`, `/terms`. **Not** `/login`, `/beta`, `/share`, `/workshop`.
- Use the same canonical host as item #1 (`NEXT_PUBLIC_SITE_URL`).

## Cross-domain dependencies
- **Deploy/Headers (Domain 7):** owns `robots.ts`/`sitemap.ts` + the existing `X-Robots-Tag` headers.
  Share the canonical-host env value. Confirm the `/login`,`/beta` noindex header (DEPLOY-02) so this
  pack does not duplicate per-page `robots:false`.
- **Auth (Domain 1):** unaffected — error/not-found pages must stay auth-free to avoid recursion.
- **API/Server Actions (Domain 4):** the SEO-01 metadata change must not introduce Supabase access on
  the public `/share` route (it does not).
