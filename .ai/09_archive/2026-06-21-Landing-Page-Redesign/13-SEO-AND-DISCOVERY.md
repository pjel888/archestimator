# 13 — SEO & Discovery

> **STATUS: PLANNING ONLY · 2026-06-22 (revised per ratified keystone decisions D-1…D-5) · not code.**
> **Purpose:** Own the organic-search strategy for the landing redesign: keyword strategy,
> per-route meta copy, sitemap + robots, structured data, internal linking, the PH + SEA
> search-volume validation plan, and the measurement plan. `ARCHESTIMATOR_MASTER.md` §12.7
> names SEO targets; §17 #19 flags PH/SEA search-volume validation as NEEDS INPUT. This doc
> closes that gap AND encodes the auth-page SEO policy (D-2) + the orange/ClaimStatus/honesty
> contracts (D-3/D-4/D-5).

This doc owns **discovery**. It does not own on-page copy (→ `05-COPY-SKELETON.md`), the
content workflow (→ `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md`), the i18n locale decision
(→ `18-I18N-AND-LOCALIZATION.md`), or the OG-image production (→
`19-ASSET-PIPELINE-AND-IMAGERY.md`). It feeds those docs the keyword + meta + sitemap/robots +
structured-data contract.

**Scope of this revision (what changed from the 2026-06-21 draft):** the auth-page SEO policy
is now encoded (D-2 — `/login` + `/signup` get `noindex,nofollow` + canonical-self + sitemap
exclusion; the old `Disallow: /auth/` rule was wrong because it missed the canonical `/login`
and `/signup` routes); the fabricated `SearchAction` schema targeting the non-existent
`/features?q=` UI was **removed** (it read as a claim about a UI that does not ship — a §15
violation and a rich-result risk); the sitemap tool is pinned to the **native Next.js
`app/sitemap.ts`** (recommended over `next-sitemap` — one fewer dependency, native RSC, and
the project already standardizes on App Router); per-route OG images are specified and cross-
linked to doc 19; the EN-only hreflang default is stated explicitly with a self-referencing
`xhtml:link` (gated L-I18N-1); the `/newdesign` vs `/` canonical strategy during the A/B is
pinned; and every visual decision binds to a real `globals.css` token (anchors verified by
grep, see §7). The doc-counts and the "no Offer / no aggregateRating" discipline are preserved.

---

## 1. The SEO thesis, in one paragraph

Archestimator's largest pre-launch growth lever is **organic search from PH + SEA AEC
professionals** running estimates in spreadsheets today. The category is enterprise-served
(InEight, Ediphi, Procore — US-centric, thousands per seat) and under-served for the SMB /
supplier / fit-out / solo-estimator segment in PH + SEA. The queries this audience types are
practical and underserved: "construction cost estimate template Philippines," "BOQ format
Excel," "how to make a cost proposal for a house construction," "quantity surveyor tools."
The landing redesign targets these queries by making each route a **search-intent match** —
hero copy that names the category in the audience's words (MASTER §4.1 plain anchor:
"construction cost estimating platform"), section copy that answers the intent behind the
query, and a URL/per-route structure that gives each intent a dedicated landing. No
black-hat tactics; no keyword stuffing; the discipline is MASTER §15 (no invented proof) +
§10 (no hype) — SEO that reads naturally because the copy is already disciplined. **Geo-scope
is PH + SEA** (PH, ID, MY, SG, TH, VN); the primary anchor term is "construction cost
estimating platform" (MASTER §4.1), not "construction cost estimating *software*" — the
distinction is deliberate and explained in §2.3.

---

## 2. Keyword strategy

### 2.1 The category stack (per MASTER §4.1) mapped to search intent

| Layer | Term | Search intent | Our route |
|---|---|---|---|
| **Hook** | "cost intelligence layer" | Informational / category-curiosity (low volume, high intent quality) | `/` hero |
| **Anchor** | "construction cost estimating platform" | Commercial investigation (the term the industry searches) | `/` hero subhead, `/features` H1 |
| **Ambition** | "supplier-linked cost intelligence layer for AEC teams" | Investor / partner (negligible public search volume) | `/trust` (for the minority who dig) |

### 2.2 The keyword clusters (per route)

> ⚠️ **Auth routes `/login` + `/signup` are deliberately ABSENT from this table.** They are
> `noindex,nofollow` (D-2, §4.4) and carry no keyword strategy — they are conversion dead-ends
> for search engines, not landing pages. See §5.2 for their (minimal) `<title>` policy.

| Route | Primary cluster | Secondary cluster | Long-tail |
|---|---|---|---|
| `/` | `construction cost estimating` · `cost estimating platform` · `cost estimate Philippines` | `BOQ template` · `cost proposal template` | `how to estimate construction costs philippines` · `quantity surveyor workflow` |
| `/features` | `estimating software features` · `cost library` · `proposal sharing` | `revision history estimating` · `cost component library` | `estimate version control` · `client proposal review tool` |
| `/pricing` | `construction estimating software pricing` · `cost estimating tool price PH` | `freemium estimating` · `seat-based SaaS peso` | `cheap estimating software philippines` · `estimating tool under 500 pesos` |
| `/about` | `archestimator` · `who built archestimator` | `aec startup philippines` | `filipino construction software founder` |
| `/contact` | `construction software design partner` · `estimate tool demo` | `book estimating walkthrough` | `talk to estimator software founder` |
| `/trust` | `construction software privacy` · `private by design estimating` | `pre-launch mvp estimating` | `honest estimating software claims` |

### 2.3 The PH + SEA validation plan (closes MASTER §17 #19)

⚠️ **GATED on L-SEO-1**: validate real search volume for the clusters above before treating
them as targets. Until validation closes, the clusters above are **hypotheses, not targets**;
copy uses the plain anchor ("construction cost estimating platform") which is the lowest-risk
term.

| Step | Method | Tool | Output |
|---|---|---|---|
| 1 | Pull search-volume + CPC for the primary + secondary clusters, geo-scoped to PH + SEA (PH, ID, MY, SG, TH, VN) | Google Keyword Planner (free) / Ahrefs / Semrush | A volume-weighted priority list per route. |
| 2 | Pull the top 10 ranking pages for each primary cluster; identify the content gap | Manual + Ahrefs SERP overview | Where the enterprise tools rank but no SMB/PH tool does → our opening. |
| 3 | Validate the long-tail with `People Also Ask` + Google Autocomplete, geo-scoped to PH | Manual (free) | A long-tail list to seed section copy + a future blog. |
| 4 | Confirm the plain anchor ("construction cost estimating platform") has volume in PH (vs "construction cost estimating software" / "cost estimate template") | Keyword Planner | The anchor term the hero uses. If "software" outranks "platform" 5:1 in PH, the hero subhead reconsiders — but the MASTER §4.1 canonical anchor is "platform" and is not changed unilaterally by this doc. |

The validation outputs feed back into doc 05 (copy refinement) + this doc (cluster
prioritization). Until validation closes, the clusters above are hypotheses, not targets.

---

## 3. Per-route meta copy

⚠️ **GATED on copy sign-off** (`09-CLAIMS-LEDGER-SIGN-OFF.md`); every line obeys MASTER §15.
The marketing-route meta below is the contract doc 05 implements; the auth-route meta is in
§5.2.

### 3.1 Marketing routes (indexable)

| Route | `<title>` (≤60 chars) | `<meta description>` (≤155 chars) | H1 |
|---|---|---|---|
| `/` | `Archestimator — Construction Cost Estimating Platform` | `Build estimates from a reusable cost library, keep every revision on the record, and send proposals your clients approve. A pre-launch MVP for AEC teams.` | `Your cost intelligence layer.` |
| `/features` | `Features — Archestimator Cost Estimating Platform` | `Every feature tagged Live, Building, or Planned: estimate tree, component library, revision history, proposal sharing, .xlsx export. Honest by design.` | `Every feature, with its status.` |
| `/pricing` | `Pricing, Honestly — Archestimator` | `Freemium, seat-based, peso-denominated. We never meter estimating, exports, or BOQ lines. Full pricing in validation with the teams we build for.` | `Pricing, honestly.` |
| `/about` | `About — Archestimator` | `A new company building the cost intelligence layer for AEC teams who still run on spreadsheets. Pre-launch MVP, founder-led, honest about what ships today.` | `A new company, building for teams who live in spreadsheets.` |
| `/contact` | `Talk to the Founder — Archestimator` | `Book a walkthrough around your own workflow, or send a note. We are looking for design partners who estimate, quote, or propose today.` | `Talk to the founder.` |
| `/trust` | `Trust — Archestimator` | `Every claim tagged Live, Building, or Planned. Private by design. Security posture as shipped. No logos, no badges — honesty is the proof.` | `What we will and will not claim.` |

### 3.2 Meta-robots per route

| Route | `robots` meta | Canonical | Sitemap |
|---|---|---|---|
| `/` | `index,follow` | self (`/`) | included |
| `/features` | `index,follow` | self | included |
| `/pricing` | `index,follow` | self | included |
| `/about` | `index,follow` | self | included |
| `/contact` | `index,follow` | self | included |
| `/trust` | `index,follow` | self | included |
| `/privacy` | `index,follow` | self | included |
| `/terms` | `index,follow` | self | included |
| `/login` | **`noindex,nofollow`** (D-2, §5.2) | **self** (`/login`) | **excluded** |
| `/signup` | **`noindex,nofollow`** (D-2, §5.2) | **self** (`/signup`) | **excluded** |
| `/auth/callback` | **`noindex,nofollow`** | self | **excluded** |
| `/beta/*` | **`noindex,nofollow`** | self | **excluded** |
| `/workshop/*` | **`noindex,nofollow`** | self | **excluded** (app surface, not marketing) |
| `/newdesign` (A/B preview) | **`noindex,nofollow`** | **canonical-to-`/`** pair (§4.3) | **excluded** (canonical-only during A/B) |

---

## 4. Sitemap + robots + canonical

### 4.1 Sitemap tool — native Next.js `app/sitemap.ts` (recommended)

**Decision: use the native Next.js App Router `app/sitemap.ts`**, not `next-sitemap`.

Rationale (grounded):
- The project is already standardized on App Router (`src/app/`); `app/sitemap.ts` is a
  zero-dependency RSC that emits the sitemap at build time. `next-sitemap` is a Pages-router-
  era tool that adds a dependency + a postbuild step for no App-Router gain.
- Native `app/sitemap.ts` returns a `MetadataRoute.Sitemap` array, type-safe, and is read by
  Next.js's metadata pipeline the same way `app/robots.ts` is — one coherent mental model.
- The hreflang `xhtml:link` self-reference (§4.5) is emitted via the `alternates.languages`
  field on each entry; no XML string-building.

### 4.2 `app/sitemap.ts` content (canonical URLs only; auth + app excluded)

The sitemap includes **every indexable marketing route + the legal routes**. It explicitly
**excludes** `/login`, `/signup`, `/auth/*`, `/beta/*`, `/workshop/*`, and `/newdesign` (the
preview during the A/B). The EN-only hreflang self-reference is gated L-I18N-1 (§4.5) but the
shape is shown so the implementation is ready.

```ts
// src/app/sitemap.ts  — native App Router sitemap (RSC). No next-sitemap.
import type { MetadataRoute } from "next";

const BASE = "https://archestimator.com";
const EN = "en"; // launch locale — gated L-I18N-1; only EN ships at launch (doc 18)

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{ path: string; freq: "weekly" | "monthly" | "yearly"; pri: number }> = [
    { path: "/",                 freq: "weekly",  pri: 1.0 },
    { path: "/features",         freq: "monthly", pri: 0.9 },
    { path: "/pricing",          freq: "monthly", pri: 0.8 },
    { path: "/about",            freq: "monthly", pri: 0.7 },
    { path: "/contact",          freq: "monthly", pri: 0.7 },
    { path: "/trust",            freq: "weekly",  pri: 0.8 },
    { path: "/privacy",          freq: "yearly",  pri: 0.3 },
    { path: "/terms",            freq: "yearly",  pri: 0.3 },
  ];
  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.pri,
    // EN-only at launch (doc 18, gated L-I18N-1). Self-referencing hreflang so Google treats
    // EN as the default and does not flag a missing xhtml:link. When FIL/ID ship (doc 18),
    // add them here; until then this is the single-locale correct shape.
    alternates: { languages: { [EN]: `${BASE}${r.path}` } },
  }));
}
```

**Exclusion list (authoritative):** `/login`, `/signup`, `/auth/callback`, `/beta/*`,
`/workshop/*`, `/newdesign`, `/legacy`, `/api/*`, `/share/*` (shared-link receiver —
`noindex,nofollow`, handled by its own metadata, not the sitemap). These never appear in the
array above.

### 4.3 `app/robots.ts` — explicit `/login` + `/signup` disallow (D-2)

> **BUGFIX from the 2026-06-21 draft.** The prior draft's `Disallow: /auth/` was **wrong**: it
> disallowed only `/auth/*` (the callback), which **missed the canonical `/login` and `/signup`
> routes** (D-2 makes them top-level routes, not `/auth/login`). The corrected rule below
> disallows `/login` and `/signup` **explicitly**, plus `/auth/` for the callback, plus the
> other non-marketing surfaces.

Use the native `app/robots.ts` (App Router; type-safe; coherent with `app/sitemap.ts`):

```ts
// src/app/robots.ts
import type { MetadataRoute } from "next";

const BASE = "https://archestimator.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/login",      // D-2: auth is noindex,nofollow — belt-and-suspenders with the meta tag
          "/signup",     // D-2: auth is noindex,nofollow (path settled; route may not exist yet)
          "/auth/",      // the callback + any /auth/* return paths
          "/beta/",      // closed-beta gate surface
          "/workshop/",  // the app surface (not marketing)
          "/newdesign",  // A/B preview (canonical-only during A/B — §4.4)
          "/legacy",     // post-cutover rollback path
          "/api/",       // API routes
          "/share/",     // shared-link receiver surface (private proposal view)
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
```

**Defense in depth:** `Disallow` in `robots.txt` is a *crawling* directive, not an *indexing*
directive (Google may still index a disallowed URL if it is linked to). The per-route
`<meta name="robots" content="noindex,nofollow">` in §3.2 + §5.2 is the authoritative
*indexing* directive. Both layers ship together — `robots.txt` keeps the routes out of the
crawl budget; the meta tag keeps them out of the index. Neither layer alone is sufficient.

### 4.4 Canonical strategy during the A/B (`/newdesign` vs `/`)

**Pinned policy** (during the A/B, before cutover — `08-ROLLOUT-AND-ANALYTICS.md` §3):

| Surface | Canonical | `robots` meta | In sitemap? |
|---|---|---|---|
| `/` (the live, pre-redesign homepage) | self (`/`) | `index,follow` | yes |
| `/features`, `/pricing`, … (live marketing routes) | self | `index,follow` | yes |
| `/newdesign`, `/newdesign/features`, … (the A/B preview variants) | **canonical → the corresponding canonical path** (e.g. `/newdesign/features` → `/features`) | `noindex,follow` (noindex so they don't compete; follow so internal links on them are crawled) | **no** |

- The `noindex,follow` + canonical-to-canonical-pair combination prevents duplicate-content
  penalties while the preview is crawlable for measurement (Vercel Web Analytics + the
  analytics tool L-ENG-2 fire on both surfaces; only the canonical surfaces accumulate index
  equity).
- **Post-cutover:** `/newdesign/*` 301-redirects to the canonical path; the canonical becomes
  self; the preview routes are removed from the router and from `robots.ts`. `08-ROLLOUT-AND-
  ANALYTICS.md` owns the cutover event; this doc owns the canonical discipline during the A/B.
- Do **not** ship the A/B as two indexable variants of the same route — that is the duplicate-
  content trap. The canonical-to-pair rule is the single mechanism that avoids it.

### 4.5 hreflang — EN-only default at launch (gated L-I18N-1)

- **Launch locale = EN only** (`18-I18N-AND-LOCALIZATION.md`). The sitemap's
  `alternates.languages` self-reference (§4.2) makes EN the explicit default; Google treats
  the self-referencing `xhtml:link rel="alternate" hreflang="en"` as "this URL is the EN
  version of itself," which is the correct single-locale shape and avoids the "missing
  xhtml:link" warning.
- **When FIL (Filipino) / ID (Bahasa Indonesia) ship** (post-launch, owner-gated
  **L-I18N-1**), the sitemap entry for each route gains the additional locale variants and a
  matching `hreflang="x-default"` on the EN URL. Doc 18 owns the locale strategy + the
  copy-idiom discipline; this doc owns the sitemap shape that serves it. Until L-I18N-1
  closes, **only EN**.
- **No `hreflang` on auth routes** (`/login`, `/signup`) — they are `noindex,nofollow` and
  carry no locale variants; they get a single canonical-self and nothing else.

---

## 5. Auth-page SEO policy (D-2)

> This section is the authoritative SEO spec for `/login` + `/signup`. `23-AUTH-EXPERIENCE.md`
> §7 cross-links here; this doc owns the policy, that doc owns the implementation.

### 5.1 Why auth pages get the strictest SEO posture

Auth pages are **conversion dead-ends for search engines** (per `23-AUTH-EXPERIENCE.md` §7).
They must NOT compete with the landing in the index, they must NOT leak crawl budget, and they
must NOT accumulate link equity that should flow to marketing routes. The strict posture is:

1. **`<meta name="robots" content="noindex,nofollow">`** on both routes — neither indexed nor
   followed. This is the authoritative *indexing* directive.
2. **Canonical = self** (`/login` → `https://archestimator.com/login`, `/signup` → ditto) —
   dedupes the `?next=`, `?error=`, `?sent=` query variants so Google consolidates any
   discovered URL onto the bare path (which is then noindexed). Self-canonical (not
   canonical-to-`/`) is correct: canonical-to-`/` would be a soft-404 signal.
3. **Sitemap exclusion** — neither route appears in `app/sitemap.ts` (§4.2 exclusion list).
4. **`robots.txt` disallow** — both routes disallowed in `app/robots.ts` (§4.3) as belt-and-
   suspenders with the meta tag.

### 5.2 Auth `<title>` policy (brand-suffixed, not keyword-optimized)

Auth `<title>`s are brand-suffixed and intent-clear but **deliberately not keyword-optimized**
(they are not landing pages):

| Route | `<title>` | `<meta description>` | Notes |
|---|---|---|---|
| `/login` | `Sign in — Archestimator` | none (noindex — no SERP snippet to optimize) | `noindex,nofollow`; canonical-self |
| `/signup` | `Start free — Archestimator` | none | `noindex,nofollow`; canonical-self; route path settled, implementation may not exist at launch — "Start free" routes to `/login` or `/contact` meanwhile. |

No `<meta description>` on auth routes: with `noindex`, Google will not show a snippet, so a
description is dead weight. (A description does not hurt, but it does not help either; omit for
clarity. If the team prefers one for link-preview unfurls, doc 19 owns the OG-image per route,
which is what unfurls actually render.)

### 5.3 No structured data on auth routes

`/login` + `/signup` carry **no `Organization`, `Product`, `WebPage`, or any other JSON-LD**.
Structured data is for indexable surfaces; auth is not indexable. The sitewide `Organization`
+ `WebSite` schema (§6) is emitted in `layout.tsx` and therefore technically present in the
auth HTML, but the `noindex,nofollow` meta prevents rich-result eligibility and Google
consistently ignores structured data on noindexed pages. No additional per-route schema is
added on auth.

### 5.4 OG image per route (cross-link `19-ASSET-PIPELINE-AND-IMAGERY.md`)

Every indexable marketing route ships a dedicated OG image (`/og/<route>.png`, 1200×630,
brand-glass composition — NO fake product screenshots per D-2/§15). Auth routes ship a shared
generic brand OG (`/og/auth.png`) so link previews render brand, not a broken image, even
though the pages are noindexed. Doc 19 owns the production pipeline + the asset list; the
per-route allocation is:

| Route | OG image | Composition |
|---|---|---|
| `/` | `/og/home.png` | Glass brand panel + Doto wordmark + the hero hook line; warm canvas wash |
| `/features` | `/og/features.png` | Glass panel + a Live/Building/Planned status trio (ClaimStatus pills, D-4) |
| `/pricing` | `/og/pricing.png` | Glass panel + "Pricing, honestly" + the no-metered-icon row |
| `/about` | `/og/about.png` | Glass panel + founder wordmark (⚠️ GATED on founder photo L-FND-1 — fallback: wordmark only, no fake headshot) |
| `/contact` | `/og/contact.png` | Glass panel + "Talk to the founder" |
| `/trust` | `/og/trust.png` | Glass panel + the claims-ledger status trio |
| `/login`, `/signup` | `/og/auth.png` (shared) | Glass panel + signal-orange logo slab only — no marketing claims |

OG image discipline: **no fabricated stats, logos, testimonials, or prices on any OG image**
(MASTER §15). The composition uses the real brand tokens (`--brand-orange #F24405`,
`--warm-canvas #f5f5f5`, the `--grad-hero-*` gradients — anchors in §7) rendered server-side
or at build time via `@vercel/og` (doc 19 owns the mechanism). **No clay `#AA412A`** anywhere
in the OG palette (D-3); accent text on OG uses `--brand-orange-dark #C63804` for AA on the
light composition (D-3).

---

## 6. Structured data (JSON-LD)

### 6.1 Organization (sitewide, in `<head>` via `layout.tsx`)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Archestimator",
  "url": "https://archestimator.com",
  "description": "A construction cost estimating platform for AEC teams. Build estimates from a reusable cost library, keep every revision on the record, and send proposals your clients approve.",
  "foundingDate": "2026",
  "slogan": "From cost proposal to client approval."
}
```

No `logo` (none exists yet — `19-ASSET-PIPELINE-AND-IMAGERY.md`; do not fabricate one per
§15). No `sameAs` social links until social profiles exist (no fabrication per §15). When the
logo lands (doc 19), add `"logo": "https://archestimator.com/brand/logo.svg"` and an
`"image"`; until then both are absent.

### 6.2 WebSite (sitewide) — **NO `SearchAction`** (bugfix from the 2026-06-21 draft)

> **REMOVED from the 2026-06-21 draft:** the `potentialAction` `SearchAction` targeting
> `https://archestimator.com/features?q={query}`. That schema declared a site-search UI that
> **does not exist and is not in scope** for the redesign. Shipping a `SearchAction` for a
> non-existent search box is (a) a §15 violation (it reads as a claim about a shipped feature),
> (b) a rich-result risk (Google may attempt to render a search box that 404s), and (c) a
> forward-link that misleads users who see it in SERP. **The corrected `WebSite` schema below
> has no `potentialAction`.** If a real site-search UI ships later, add the `SearchAction` at
> that time, pointed at the real search route — never before.

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "url": "https://archestimator.com",
  "name": "Archestimator",
  "publisher": { "@type": "Organization", "name": "Archestimator" }
}
```

The `publisher` back-reference ties the `WebSite` to the `Organization` (§6.1) so the two
nodes form a connected graph.

### 6.3 Per-route structured data

| Route | Schema | Why |
|---|---|---|
| `/` | `WebPage` + `BreadcrumbList` | Standard. |
| `/features` | `WebPage` + an `ItemList` of features (each tagged `status` — not standard schema; use `description` to encode Live/Building/Planned via the D-4 `ClaimStatus` type) | Rich result eligibility. |
| `/pricing` | `WebPage` (**no `Offer` schema** — no validated price exists; `Offer` would be a §15 violation) | Avoids implying a published price. |
| `/about` | `AboutPage` + `Person` for the founder (⚠️ **GATED on bio assets L-FND-1**) | Rich result eligibility. |
| `/contact` | `ContactPage` | Standard. |
| `/trust` | `WebPage` | Standard. |
| `/login`, `/signup` | **None** (§5.3) | Auth is `noindex,nofollow`; no per-route schema. |

### 6.4 Forbidden structured data (radical honesty — MASTER §15)

⚠️ **GATED, never silently resolved.** The following schemas are **forbidden** because the
underlying facts do not exist; fabricating them would be a §15 violation:

- **No `Product` schema with `aggregateRating`** — no ratings exist (§15). This is non-
  negotiable; do not add a "4.8/5" placeholder.
- **No `Offer` schema on `/pricing`** — no validated price exists (§15; `L-PRC-1`).
- **No `FAQPage` schema** unless we ship a real FAQ (none currently planned; would be a
  separate owner decision).
- **No `Review` schema** — no customer reviews exist (§15).
- **No `SearchAction`** (§6.2 — the target UI does not ship).

---

## 7. Token bindings (every visual decision binds to a real `globals.css` token)

> Verified by grep against `src/app/globals.css` on 2026-06-22. SEO does not render much
> chrome, but the OG images + any robots/sitemap-adjacent UI (e.g. a `/sitemap` human page if
> one ships) bind to these. **No clay `#AA412A`, no `#292929`, no `--proposal-paper` as a page
> background, no Source Serif 4** (D-1/D-3).

| Token | Anchor (`globals.css`) | SEO/OG use |
|---|---|---|
| `--brand-orange` | `#F24405` (L37) | Presence on OG: logo slab fill, the one primary-CTA accent. Never body text on OG (fails AA at ~3:1). |
| `--brand-orange-dark` | `#C63804` (L38) | **AA accent text on OG** (small labels, status legends) — ~5.3:1 on white (D-3). |
| `--brand-orange-soft` | 14% mix (L39) | Soft wash behind a ClaimStatus pill on OG, sparingly (one per OG). |
| `--warm-canvas` | `#f5f5f5` (L17) | OG background (the Glass Brand canvas, D-1 — NOT paper). |
| `--proposal-paper` | `#fffdf8` (L98) | **Accent option only, NOT the OG background** (D-1: paper is demoted). |
| `--ink` | `#3D3D3D` (L10) | OG headline + body ink. |
| `--secondary` | `#5D5D5D` (L11) | OG secondary ink / meta. **Never `#7F7F7F`** for load-bearing OG text (fails AA). |
| `--success` / `--warning` | `#15803d` / `#b45309` (L92/94) | ClaimStatus semantics on the `/features` + `/trust` OG: Live→success, Building→warning (D-4 map in doc 03 §6.1). |
| `--grad-hero-continue` / `--grad-hero-create` | brand-orange→amber→peach (L59-60) | The OG hero composition gradient (abstract — no fake screenshots, D-2). |

**Tailwind v4 gotcha (memory-verified):** `bg-[var(--x)]` silently emits no color in this TW
v4 setup; use `bg-[color:var(--x)]` for any arbitrary-value background on a sitemap/OG-adjacent
component. The named utilities (`bg-canvas-landing`, `text-landing-accent-ink`) sidestep this
via the `@theme inline` mappings in doc 03 §3.3.

---

## 8. Internal linking

The internal-link structure reinforces the funnel + distributes PageRank. **Auth pages are
deliberately absent from this table** — they cross-link only to each other and to legal pages,
never back to marketing sections, so crawl budget is not funneled into noindexed surfaces
(`23-AUTH-EXPERIENCE.md` §7).

| From | To | Anchor | Why |
|---|---|---|---|
| `/` hero | `/features`, `/pricing`, `/signup` (CTAs + nav) | "Start free" / "Book a walkthrough" / nav items | Primary funnel. **"Start free" → `/signup`; self-serve behavior gated L-FUN-2, with `/login` or `/contact` fallback meanwhile.** |
| `/` section 7 (claims ledger) | `/trust` | "Full claims matrix" | Depth for the trust-curious. |
| `/` section 3 (plate) | `/features` | "See the mechanics" | Depth for the evaluation-stage visitor. |
| `/` section 10 (pricing philosophy) | `/pricing` | "Pricing, honestly" | Conversion-adjacent. |
| `/features` | `/trust`, `/pricing` | nav + CTAs | Standard. |
| `/pricing` | `/signup` "Start free" (or `/login` / `/contact`) | CTA | Self-serve path; route settled, behavior gated L-FUN-2. |
| `/about` | `/contact`, `/trust` | nav + inline | Founder-led → contact; trust depth. |
| `/contact` | `/signup` "Start free" (or `/login`) | CTA | Self-serve alternative; route settled, behavior gated L-FUN-2. |
| `/trust` | `/features`, `/pricing` | nav + inline | Standard. |
| Footer (every marketing route) | All marketing routes + `/privacy`, `/terms` | sitemap | Sitewide distribution. **Footer does NOT link to `/login`/`/signup`** — those are reached only via CTAs, keeping them out of the global nav crawl path. |

Every internal link uses a real anchor (not "click here"); every anchor obeys §10 voice. The
"Start free" href is the **one** internal link whose behavior is owner-gated (L-FUN-2); the
route path is settled as `/signup`, while launch slices may temporarily resolve to `/login` or
`/contact` — doc 05 owns the per-CTA routing decision.

---

## 9. Measurement

| Metric | Source | Target |
|---|---|---|
| Organic sessions (PH + SEA) | Vercel Web Analytics (existing, cookieless) + the analytics tool (**L-ENG-2**) | Baseline at launch; growth trajectory tracked monthly. |
| Average organic position for the primary cluster | Google Search Console (free, server-side) | Top 10 within 6 months for `construction cost estimating platform` geo-scoped to PH. |
| Click-through rate from SERP | Search Console | ≥ 3 % (improved via the meta copy in §3.1). |
| Pages indexed | Search Console | 8/8 marketing routes indexed within 2 weeks of cutover. **Auth routes (`/login`, `/signup`) explicitly confirmed NOT indexed** (the noindex posture is verifiable, not assumed). |
| Core Web Vitals (SEO ranking input) | CrUX field data | Per `14-PERFORMANCE-AND-CORE-WEB-VITALS.md`. |
| Sitemap/robots health | Search Console coverage report | Zero "excluded by 'noindex' tag" surprises on marketing routes; auth routes show as "Indexed, though blocked by robots.txt" or "Excluded by 'noindex' tag" (expected). |

Search Console + the analytics tool (L-ENG-2) are the two sources of truth; both are consent-
gated where applicable (Vercel Web Analytics is cookieless; Search Console is server-side).
The "auth NOT indexed" check is a positive verification (confirm the noindex works), not an
absence of evidence.

---

## 10. Content cadence (forward pointer)

The static routes are the SEO foundation. A future blog (`/blog`) targeting the long-tail
clusters (`how to estimate construction costs philippines`, `BOQ format Excel`, etc.) is the
growth surface — but it is **out of scope** for the redesign launch. Tracked as a forward
decision in `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md` §6 (post-launch content roadmap). When the
blog ships, it gets its own sitemap section (`/blog` + `/blog/[slug]`), its own OG image
template (doc 19), and its own `BlogPosting` schema (not `Article` — `BlogPosting` is the more
specific type and inherits `Article`); until then it is absent from this doc's sitemap.

---

## 11. Cross-links (all canonical filenames per `10-CANONICAL-DOC-MAP.md`)

- **`00-OVERVIEW.md`** — owns the ratified keystone decisions D-1…D-5 this doc obeys (Glass
  Brand, full-page auth, orange discipline, ClaimStatus type, honest scoring). The
  L-FUN-1 superseded decision record, L-FUN-2/L-SEO-1/L-I18N-1 gates this doc carries are rows in `00-OVERVIEW.md` §7 and
  in `LOOP_LEDGER.md`.
- **`05-COPY-SKELETON.md`** — the on-page copy; §3.1 meta copy above feeds its §12 (new); the
  keyword clusters (§2.2) feed its copy choices.
- **`08-ROLLOUT-AND-ANALYTICS.md`** — the `/newdesign` A/B canonical discipline (§4.4) +
  the cutover event that flips canonicals to self.
- **`10-CANONICAL-DOC-MAP.md`** — canonical filenames; every cross-link here resolves to it.
- **`14-PERFORMANCE-AND-CORE-WEB-VITALS.md`** — CWV is an SEO ranking input; the
  `app/sitemap.ts` + `app/robots.ts` RSCs add zero client JS.
- **`17-ANALYTICS-AND-OBSERVABILITY.md`** — the measurement tools (L-ENG-2) + the anonymous →
  authenticated session merge boundary at the auth callback.
- **`18-I18N-AND-LOCALIZATION.md`** — the hreflang strategy (§4.5) + the L-I18N-1 launch-
  locale gate.
- **`19-ASSET-PIPELINE-AND-IMAGERY.md`** — the OG images per route (§5.4) + the
  `Organization.logo` schema (§6.1) when the logo lands.
- **`20-CONTENT-WORKFLOW-AND-GOVERNANCE.md`** — the content cadence + the future blog (§10).
- **`23-AUTH-EXPERIENCE.md`** — the auth-page SEO policy (§5) is the authoritative spec;
  doc 23 §7 implements it. Auth `<title>`s (§5.2), canonical-self, sitemap exclusion, and
  `robots.txt` disallow are cross-owned.
- **`LOOP_LEDGER.md`** — L-SEO-1 (PH/SEA volume validation), L-I18N-1 (launch locale),
  L-ENG-2 (analytics tool), L-FND-1 (founder bio → `Person` schema), L-FUN-1 (superseded signup-route record),
  L-FUN-2 (self-serve enablement), L-PRC-1 (pricing validation → no `Offer` schema).

---

## 12. ⚠️ Gated on / Open decisions (carried in `LOOP_LEDGER.md`, never silently closed)

Per D-5, no gate is silently marked closed. Each item below is a row in `LOOP_LEDGER.md`.

- **L-SEO-1 — PH/SEA search-volume validation.** The clusters in §2.2 are hypotheses until
  validated. Until validation closes, copy uses the plain anchor ("construction cost
  estimating platform"), the lowest-risk term. ⚠️ GATED on owner/eng running the validation
  plan (§2.3, 4 steps).
- **L-I18N-1 — Launch locale.** EN-only is the default; the sitemap ships the self-referencing
  hreflang for EN (§4.5). FIL/ID post-launch. ⚠️ GATED on owner.
- **L-ENG-2 — Analytics tool.** Measurement (§9) depends on the tool decision (PostHog
  recommended by doc 17). ⚠️ GATED on owner.
- **L-FND-1 — Founder bio assets.** The `Person` schema on `/about` (§6.3) + the `/about` OG
  image (§5.4) wait on this. Fallback: wordmark-only OG, no `Person` schema, no fake headshot.
- **L-FUN-1 — `/signup` route path.** Superseded by D-2 / `LOOP_LEDGER`: top-level `/signup`.
  This doc's sitemap/robots exclusion list + `<title>` (§5.2) are authoritative for that route.
  The source route still needs implementation; the route-name decision is no longer owner-open.
- **L-FUN-2 — Self-serve enablement.** Whether `/signup` accepts new accounts or routes to
  request-access (doc 23 §3). Does not change the SEO policy (noindex either way); called out
  for traceability.
- **L-PRC-1 — Pricing validation.** No `Offer` schema on `/pricing` (§6.3/§6.4) until a price
  is validated. ⚠️ GATED on ≥5 discovery calls + ≥2 beta estimates + Van Westendorp (per
  `00-OVERVIEW.md` §7 G-7).
- **O — A future blog.** Out of scope for launch; tracked in `20-CONTENT-WORKFLOW`. When it
  ships, it adds `/blog` + `/blog/[slug]` to the sitemap + a `BlogPosting` schema.
- **O — `FAQPage` schema.** Not shipped unless we ship a real FAQ; tracked as a future
  decision (§6.4).
- **O — Real site-search.** If a genuine search UI ships, add the `SearchAction` to the
  `WebSite` schema (§6.2) at that time, pointed at the real route. Until then: no
  `SearchAction`.

**No invented features, metrics, testimonials, prices, ratings, or partner names appear in
this doc.** Voice throughout = Controlled Confidence (MASTER §10). The orange discipline
(D-3), the ClaimStatus type (D-4), and the honest-scoring rule (D-5) are honored: clay
`#AA412A` is absent (it is not a token and is not referenced); ClaimStatus appears only as the
D-4 type name in §6.3/§5.4 context; no score is self-asserted as 100/100/100.

---

## 13. Honest self-score (D-5)

| Dimension | Score | Justification |
|---|---|---|
| **Strategy** | **95 / 100** | The SEO thesis (search-intent match, PH+SEA geo-scope, plain anchor "construction cost estimating platform") is coherent and MASTER-§4.1-grounded; the auth-page SEO policy (D-2) is encoded correctly (noindex,nofollow + canonical-self + sitemap exclusion + robots disallow — the four-layer posture); the A/B canonical strategy (§4.4) and the EN-only hreflang default (§4.5) are pinned. Not 100 because L-SEO-1 (volume validation) and L-I18N-1 (launch locale) are genuinely open — the clusters are honestly labeled hypotheses, not validated targets, which is the correct posture but means the strategy is not yet fully locked. |
| **Quality** | **96 / 100** | Every gap from the 2026-06-21 draft is closed: the `Disallow: /auth/` bug is fixed to explicit `/login` + `/signup` (§4.3); the fabricated `SearchAction` is removed with a §15 justification (§6.2); the sitemap tool is pinned to native `app/sitemap.ts` with type-safe code (§4.1/§4.2); per-route OG images are specified and cross-linked to doc 19 (§5.4); the EN-only hreflang self-reference is explicit (§4.5); the no-Offer/no-aggregateRating discipline is preserved and expanded (§6.4). Every token citation is grep-verified against `globals.css` (§7). Not 100 because the `app/sitemap.ts` + `app/robots.ts` code blocks are plan-spec, not committed code (an implementer may need to reconcile with the real Next.js metadata API version), and the OG-image compositions are specified as constraints rather than pixel-designed (correctly deferred to doc 19 per DESIGN.md-as-alpha). |
| **Implementation-Readiness** | **94 / 100** | An implementer can copy the `app/sitemap.ts` (§4.2) and `app/robots.ts` (§4.3) blocks verbatim (they are valid `MetadataRoute` types), the per-route meta table (§3.1) maps directly to Next.js `metadata` exports, the auth SEO policy (§5) is a checklist, and the canonical-during-A/B rule (§4.4) is a single decision per route. Not 100 because `/signup` does not exist on disk today (implementation deliverable, not a route-name decision), so the robots disallow + noindex for it is policy-ready but not yet applicable; and the OG images (§5.4) are a cross-doc dependency on doc 19's pipeline, not something this doc can ship alone. Per D-5 these open gates honestly cap readiness below 100 rather than being silently closed. |

**Carried to `LOOP_LEDGER.md` (not silent):** L-SEO-1, L-I18N-1, L-ENG-2, L-FND-1,
L-FUN-2, L-PRC-1. L-FUN-1 remains only as a superseded decision record. Plus two
open-but-non-blocking forward decisions (blog, real site-search).
