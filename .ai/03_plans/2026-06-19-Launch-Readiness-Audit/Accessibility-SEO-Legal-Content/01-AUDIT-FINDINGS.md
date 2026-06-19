# Audit Findings — Accessibility, SEO & Legal/Content Readiness (2026-06-19)

> **Canonical status note:** this file preserves raw audit findings. Post-verification
> severity and launch-gate status live in `03-EVIDENCE-AND-VERIFICATION.md`,
> `02-REMEDIATION-PLAN.md`, and the root `../01-MASTER-INDEX.md`. In particular,
> SEO-01 and SEO-CONTENT-01 were down-rated after the existing
> `X-Robots-Tag: noindex,nofollow` proof; do not use the raw `launch_blocker:true`
> fields below as implementation priority.

## Scope & coverage

**Read in full:** `src/app/layout.tsx`; `src/app/page.tsx`; `src/app/{about,features,pricing,contact}/page.tsx`;
`src/app/{privacy,terms,workshop/terms}/page.tsx`; `src/app/login/page.tsx`; `src/app/beta/access-required/page.tsx`;
`src/app/share/[token]/page.tsx` (metadata block); `src/components/landing/PublicPageShell.tsx`;
`src/components/landing/ContactForm.tsx` (labels); `src/lib/landing/get-landing-auth-state.ts`;
`src/lib/legal/terms-content.ts`; `src/app/workshop/library/error.tsx` + sibling error.tsx files; img-alt
spot checks in `src/components/ui/avatar.tsx`, `ComponentLibraryManager.tsx`, `RecentComponentCard.tsx`.

**Surveyed via rg (not full-read):** all `export const metadata` / `generateMetadata` across `src/app`;
all `<img>` usages; robots/noindex/viewport usages; low-contrast grey tokens on the public surface.

**Deferred (out of lane / другой domain):** deep behind-auth workshop a11y (grids/dialogs/charts already
partially covered by prior packs); the server-side per-route auth mechanism (Domain 1); CSP posture (Domain 7).

## Reconciliation vs prior packs

| Topic | Prior coverage | Verdict |
|---|---|---|
| `robots.ts` / `sitemap.ts` files | `2026-06-19-Launch-Readiness-Audit/NextJS-Vercel-Deploy-And-Headers/00-README.md:22-23,38` plans new `robots.ts`/`sitemap.ts` | **covered-by:** Deploy pack owns the files. This pack supplies content rules (which paths to noindex). Not re-reported as a new file-owning finding; SEO-CONTENT-01 records the **requirement**. |
| `/share/[token]` indexing of private client data | Not addressed in Deploy pack (it covers global robots, not per-route `generateMetadata.robots`) | **none** — genuine new finding (SEO-01). |
| metadataBase / OG / per-page metadata | Not in any pack | **none** (SEO-02, SEO-03). |
| `#7F7F7F` meta fails AA | memory `designmd-tertiary-fails-aa`; not on the public marketing/legal pages (they use `#626260`/`#5f615f`, which pass) | **stale-context:** the `#7F7F7F` token is not used on the audited public pages; the real public-surface issue is **font size**, not this color. |
| Legal page content completeness | archived terms/privacy packs; `src/lib/legal/terms-content.ts` is substantive (157 lines, real PH-jurisdiction terms + privacy, version/effectiveDate set) | **covered-by:** content is real, not placeholder. Only the **rendering** (font size) is flagged (A11Y-01). |
| Landing a11y (landmarks, labels) | archived `landing-page-improvement` / `2025-06-11-Landing-Page-...` | **partial:** `<main>` landmark + ContactForm labels are present/good; remaining gap is skip-link (A11Y-02). |

---

## Findings

### SEO-01 — `/share/[token]` proposal pages are indexable and leak client/project/financial data in metadata
- **Severity:** high · **launch_blocker:** true
- **Evidence:** `src/app/share/[token]/page.tsx:299-318` — `generateMetadata` returns `title`/`description`/`openGraph`
  built from real data: `` `${p.name}…` ``, `` `${count} estimate… Total ${formatMoney(snap.totalCost…)}${p.clientName ? ` for ${p.clientName}` : ""}` ``. There is **no** `robots: { index:false }` on this route (`rg "robots|index" src/app/share/[token]/page.tsx` → no matches), and there is **no** `src/app/robots.ts` / `public/robots.txt` (both absent). So a shared proposal URL that ends up in a crawler's path (referrer, browser sync, email scanners, accidental paste) becomes a public, indexed page exposing the client name, project name, estimate/row counts, and **total contract value**.
- **Impact:** Confidential client pricing and identities become Google-discoverable. For a quoting/proposal product this is a direct trust/contractual breach and a launch blocker.
- **Recommendation:** Add `robots: { index:false, follow:false, googleBot:{ index:false } }` to **every** return path of `generateMetadata` in the share page (incl. the password-protected and not-found branches). Independently, ensure the forthcoming `robots.ts` (Deploy pack) `Disallow: /share/`. Belt-and-suspenders, since `robots.txt` is advisory.
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** none

### SEO-CONTENT-01 — robots.txt / sitemap must scope private routes (content requirements for Deploy pack)
- **Severity:** high · **launch_blocker:** true
- **Evidence:** No `src/app/robots.ts`, no `public/robots.txt`, no `sitemap.ts`/`sitemap.xml` (`ls public/robots.txt public/sitemap.xml` → not found; `rg robots src/app` → only the unsubscribe route html and the missing file). The entire app is currently fully crawlable, including `/workshop/*`, `/login`, `/beta/*`, `/invite/*`, `/share/*`, `/api/*`.
- **Impact:** Private/auth-only surfaces and unbounded `[token]`/`[id]` routes are exposed to crawlers; no canonical sitemap for the public marketing pages.
- **Recommendation:** In the Deploy pack's `robots.ts`: `Disallow` `/workshop`, `/login`, `/beta`, `/invite`, `/share`, `/api`, `/auth`; allow only the marketing+legal pages. `sitemap.ts` = `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms` only. This finding documents the **content contract**; the files are owned there.
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** covered-by:2026-06-19-Launch-Readiness-Audit/NextJS-Vercel-Deploy-And-Headers (files), none (the noindex content scoping itself)

### SEO-02 — No `metadataBase`; OG/twitter image URLs and canonicals resolve relatively
- **Severity:** medium · **launch_blocker:** false
- **Evidence:** `src/app/layout.tsx:20-33` — root `metadata` sets title/description/icons/manifest but **no `metadataBase`**. The share page emits `openGraph` (`src/app/share/[token]/page.tsx:303-307`) but with no `metadataBase` any relative OG/canonical URL resolves against `localhost` at build and produces a Next.js build warning; absolute social-share previews are unreliable.
- **Impact:** Broken/incorrect OG link previews; build-time warnings; no canonical base.
- **Recommendation:** Set `metadataBase: new URL("https://www.archestimator.com")` in root `layout.tsx` metadata.
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** none

### SEO-03 — Marketing & legal pages have no per-page metadata (title/description/OG)
- **Severity:** medium · **launch_blocker:** false
- **Evidence:** Only `src/app/layout.tsx` and `src/app/share/[token]/page.tsx` export metadata (`rg -l "export const metadata|generateMetadata" src/app` → 2 files). `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`, `/login` inherit the single root title "Archestimator | Quote, Proposal & Estimate Workspace" with no unique description/OG. No `openGraph`/`twitter` defaults anywhere except share.
- **Impact:** Every public page shares one title/description → poor SERP/social differentiation and SEO for the marketing funnel.
- **Recommendation:** Add a per-page `export const metadata` (unique title + description, inheriting OG from a root default) to each marketing/legal page. Add a root-level default `openGraph`/`twitter` block in `layout.tsx`.
- **Effort:** M · **Confidence:** high · **existing_plan_overlap:** none

### A11Y-01 — Legal pages render body and headings at 9–12px (sub-readable; WCAG/usability)
- **Severity:** high · **launch_blocker:** false (advisory — DESIGN.md is alpha)
- **Evidence:** `src/app/privacy/page.tsx` and `src/app/terms/page.tsx`: `h1` is `text-[12px]` (`privacy:15`, `terms:19`); section `h2` `text-[11px]`; body copy `text-[10px]` (`privacy:22`, `terms:29`); meta/version line and footer `text-[9px]` (`privacy:18,66`; `terms:22,59`). These are legally operative documents (Terms acceptance / privacy notice) rendered well below the ~16px body norm; 9–10px is a readability and low-vision accessibility problem and undermines clickwrap "conspicuousness".
- **Impact:** Users (esp. low-vision) cannot comfortably read the terms they are legally bound by; weakens enforceability of clickwrap; fails practical WCAG 1.4.4/readability expectations. Color contrast itself **passes** (`#1f201f`/`#5f615f` on `#eeeeec`), so this is purely sizing.
- **Recommendation:** Raise legal body to ~14–16px, headings proportionally, meta line to ≥12px. Advise to Philip; do not block (DESIGN.md alpha).
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** stale-context (memory `designmd-tertiary-fails-aa` flags `#7F7F7F` color; the real legal-page issue is size, not color)

### A11Y-02 — No skip-to-content link on public pages
- **Severity:** low · **launch_blocker:** false
- **Evidence:** `rg "skip.*content|href=\"#main"` across `src/app`/`src/components` → no matches. `PublicPageShell` (`src/components/landing/PublicPageShell.tsx:31-39`) renders `LandingHeader` → `<main>` with no preceding skip link.
- **Impact:** Keyboard/screen-reader users must tab through the full header nav on every page. WCAG 2.4.1 (Bypass Blocks) best practice.
- **Recommendation:** Add a visually-hidden, focus-visible "Skip to content" anchor targeting the `<main>` (`id="main"`) in `PublicPageShell` / root layout.
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** partial:archived landing-page-improvement (landmarks done; skip-link not)

### A11Y-03 — No root `not-found.tsx`, `error.tsx`, or `global-error.tsx`
- **Severity:** medium · **launch_blocker:** false
- **Evidence:** `ls src/app/{not-found,error,global-error}.tsx` → all absent. Error boundaries exist only deep under `/workshop/*` (`src/app/workshop/library/error.tsx` and 6 siblings, all delegating to `WorkshopRouteErrorState`). A 404 on a marketing/legal/share URL, or a render error in the root segment, falls back to Next.js's default unstyled/unbranded screens.
- **Impact:** Unbranded, jarring 404/500 UX on the public surface (incl. expired/invalid `/share` links and mistyped marketing URLs) at the exact moment of a first-impression. No recovery affordance.
- **Recommendation:** Add a branded `src/app/not-found.tsx` (with `<main>`, heading, link home), `src/app/error.tsx` (client, `reset()` button, `role` messaging), and `src/app/global-error.tsx` (its own `<html><body>`).
- **Effort:** M · **Confidence:** high · **existing_plan_overlap:** none

### A11Y-04 — Public pages OK on landmarks, labels, alt, lang, viewport (positive evidence)
- **Severity:** info · **launch_blocker:** false
- **Evidence:** `<html lang="en">` (`layout.tsx:34`); `<main>` landmark on both home (`page.tsx:34`) and non-home shell (`PublicPageShell.tsx:36`); `ContactForm` inputs all have `htmlFor`/`id` pairs and `role="alert"` live regions (`ContactForm.tsx:66,122,131-221`); images carry alt (`avatar.tsx:33` `alt={alt||"Avatar"}`, `ComponentLibraryManager.tsx:404` / `RecentComponentCard.tsx:56` `alt={`${name} thumbnail`}`); no `user-scalable=no`/`maximum-scale` zoom suppression (`rg` clean); the `/api/share/[token]/unsubscribe` html correctly sets `meta robots noindex,nofollow`. Body-copy greys on the public surface (`#626260`/`#5f615f` on `#eeeeec`/`#f5f5f3`) pass AA for normal text.
- **Impact:** None — recorded so remediation does not "fix" already-correct things.
- **Recommendation:** No action.
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** none

---

## Cross-domain notes
- **Domain 1 (Auth & Session):** No `middleware.ts` in `src/` or root. Public-page auth hint is **display-only**
  (`src/lib/landing/get-landing-auth-state.ts` — cookie-pattern sniff, no Supabase round-trip; comment claims
  protected routes do their own fail-closed server-side validation). Verify that per-route server-side guard in Domain 1.
- **Domain 7 (Next/Vercel/Headers):** `robots.ts`/`sitemap.ts` files are theirs to create; SEO-CONTENT-01 and SEO-01
  supply the path-scoping content rules (noindex `/share`, `/workshop`, `/login`, `/beta`, `/invite`, `/api`).
- **Domain 4 (API/Server Actions):** `/share/[token]` metadata deliberately omits an OG image to avoid service-role
  Supabase access on the public route (`page.tsx:309-315`) — sound; just confirm the noindex add (SEO-01) doesn't
  regress that boundary.
