# 21 — Blast Radius & Migration Plan

> **STATUS: PLANNING ONLY · 2026-06-22 (revised per ratified keystone decisions D-1…D-5) · not code.**
> **Purpose:** Own the file-level change inventory, the deletion rail, the migration order,
> the **301 redirect map**, the **sitemap/robots/metadataBase diff**, the risk register, and the
> rollback playbook for the landing redesign. The redesign is **additive marketing + auth pages**:
> it replaces the `src/components/landing/` tree, appends tokens to `globals.css`, adds routes
> (`/trust`, `/signup`, `/newdesign`, `/legacy`), adds the first `sitemap.ts` + `robots.ts` +
> `metadataBase`, and removes components. This doc is the map of the blast radius + the safe
> migration order + the SEO continuity plan.

This doc owns **migration + risk + redirect map**. It does not own the components (→ `11`), the
rollout mechanics (→ `08`), or the per-file diffs (those are the implementer's job). It defines
**what changes, in what order, with what risk, what redirect, and what rollback**.

---

## 0. Proportional risk posture (per AGENT_OPERATING_PROTOCOL "Loop activation criteria")

**Overall risk = LOW.** This is an **additive marketing + auth-skin change**, NOT a
database/RLS/RPC/migration, NOT auth-security (the server actions, callback, closed-beta RPC, and
error-code contract are all unchanged — verified by `23-AUTH-EXPERIENCE.md` §0), NOT data-integrity,
NOT a cross-cutting refactor. The two mildly elevated pieces are:

1. **The new `/signup` route** (gated L-FUN-1/L-FUN-2) — an auth *surface*, but it is a reskin +
   twin of the existing `/login` (same two server actions: `signInWithEmail` with
   `shouldCreateUser:true` + `signInWithGoogle`). No new server-action code, no new RPC, no new
   rate-limit code. The blast radius is one new RSC route + a new `src/components/auth/` dir.
2. **The URL cutover** — the public surface changes. Mitigated entirely by the `/newdesign` preview
   → `/legacy` swap pattern (`08` §2): the cutover is a **URL swap, not a code change** (§2 phase 6).

**Why 27 docs, then?** The breadth is **owner-directed comprehensiveness** (Philip asked for 100%
on all three axes), **not proportional necessity**. Per the project's own proportional-policy rule,
ordinary additive marketing work would run a lightweight in-session loop, not a 27-doc pack. The
pack exists because the owner ratified it; the *risk* stays Low regardless of the doc count. This
section exists so the implementer does not mistake the pack's size for the change's risk.

---

## 1. The blast radius (file-level inventory)

### 1.1 Files ADDED

| Path | Type | Owner doc | Risk |
|---|---|---|---|
| `src/components/landing/shell/LandingShellClient.tsx` | new | `11` §2.1 | Low — additive. |
| `src/components/landing/shell/LandingHeader.tsx` | replace (same path) | `11` §2.1 | Medium — replaces existing nav. |
| `src/components/landing/shell/LandingFooter.tsx` | replace (same path) | `11` §2.1 | Medium — replaces logo-only footer. |
| `src/components/landing/shell/MaturityTag.tsx` | new | `11` §2.1 | Low. |
| `src/components/landing/shared/StatusPill.tsx` | new (D-4 single source of `ClaimStatus`) | `06` §3 + D-4 | Low — additive, owned type. |
| `src/components/landing/sections/*.tsx` (10 files) | new | `11` §2.2 | Low — additive. |
| `src/components/landing/commercial-graph-plate/*.tsx` (4 files) | new | `11` §2.3 + `04` | Low — additive. |
| `src/components/landing/claims-ledger/*.tsx` (3 files) | new | `11` §2.4 + `06` | Low — additive. |
| `src/components/landing/motion/ScrollReveal.tsx` | new (or refactor of existing `MotionReveal`) | `11` §2.5 | Low. |
| `src/components/landing/analytics/LandingAnalyticsBoot.tsx` | new (wraps existing loaders) | `11` §2.5 | Low. |
| `src/components/brand/Wordmark.tsx` | new | `19` §3 | Low. |
| **`src/components/auth/AuthLayout.tsx`** + 6 leaves (`AuthGlassPanel`, `LoginForm`, `SignupForm`, `GoogleButton`, `MagicLinkButton`, `ClosedBetaGate`) | **new dir** | `23` §4 | Low — additive; the `/login` RSC markup is *extracted*, not re-architected. **Zero changes to server actions / callback / closed-beta RPC / error codes** (`23` §0). |
| `src/app/trust/page.tsx` | **new route** | `02` §2.5 + `06` §6 | Low — additive. |
| `src/app/signup/page.tsx` | **new route** (⚠️ GATED L-FUN-1/L-FUN-2 — `23` §9/§10) | `23` §2.1 | Medium — auth surface, but reskin/twin of `/login`. |
| `src/app/newdesign/page.tsx` (+ per-route preview pages) | **new route** (preview only, `08` §2) | `08` §2 | Low — additive, preview. |
| `src/app/legacy/page.tsx` (+ per-route rollback mirrors) | **new route** (rollback host, `08` §2.3) | `08` §2.3 + §4 below | Low — additive, noindex. |
| **`src/app/sitemap.ts`** | **new** (none exists today — verified) | `13` §4 + §3 below | Low — net-new, no migration. |
| **`src/app/robots.ts`** | **new** (none exists today — verified) | `13` §4.2 + §3 below | Low — net-new. |
| `public/brand/wordmark.svg` + `mask-mark.svg` | new | `19` §3 | Low. |
| `public/favicon*` (new set, root-level) | replace `/favicon_io/*` | `19` §4 | Low. |
| `public/og/*.png` (6 files) | new | `19` §5 | Low. |
| `scripts/generate-og-images.mjs` | new | `19` §5 | Low. |
| `scripts/claims-matrix-check.mjs` | new (⚠️ GATED open dependency) | `16` §9.2 | Low. |
| `scripts/claims-forbidden-sweep.mjs` | new (⚠️ GATED open dependency) | `16` §9.1 | Low. |

### 1.2 Files MODIFIED

| Path | Change | Risk | Mitigation |
|---|---|---|---|
| `src/app/globals.css` | **Additive** `--landing-*` token block (`03` §3.2) + `@theme inline` mappings (`03` §3.3). Do NOT clobber. | Low — append-only. | The patch uses anchor strings (not line numbers — verified anchors: `--sidebar-content-offset` for `:root`, `--radius-xs: var(--radius-xs);` for `@theme inline`); CI verifies no existing token is redefined. |
| `src/app/layout.tsx` | Update `metadata.icons` to the new favicon set. **No Source Serif 4 import** (D-1 defers it — `03` §7.4). `metadataBase` added here (`13` §3 — none exists today, verified). | Medium — touches the root layout. | The change is additive (the existing `Doto` + `Roboto_Mono` imports stay per `03` §7.1 — **zero new font requests**); CI verifies the existing fonts still load. |
| `src/app/page.tsx` | Swap the rendered tree to the new components (per `11` §2.1 RSC usage). Keep `ABExperimentProvider` for the A/B (`08` §3). | Medium — the homepage cutover. | The `/newdesign` preview route ships first; the cutover is a URL swap per `08` §2 + §2 phase 6 below. |
| `src/app/features/page.tsx` / `pricing/page.tsx` / `about/page.tsx` / `contact/page.tsx` | Swap to the new components. | Medium — route cutover. | Same as `/` — preview-first, URL-swap cutover. |
| `src/app/login/page.tsx` | Reskin to the 2-col `AuthLayout` shell (`23` §1.2). | Medium — auth surface. | The server-action wiring, callback, RPC, and error codes are **unchanged** (`23` §0); the reskin is markup + component extraction. |
| `src/app/layout.tsx` `metadata` | Update title/description per `13-SEO-AND-DISCOVERY` §3. Add `metadataBase` (canonical origin — pinned in §3 below). | Low. | — |
| `src/components/landing/index.ts` | Drop the removed components; export the new ones. | Medium — barrel change. | The barrel is the single import surface; CI grep verifies no other file imports the removed components directly (`16`). |
| **`next.config.ts`** | Append entries to the **existing `redirects()` array** (L99 — verified present) for the 301 map (§2.1 below). Optionally append to `headers()` to add `X-Robots-Tag: noindex, nofollow` for `/legacy` + `/newdesign` (precedent: the share-page hardening block already does this). | Low — append to existing hooks. | The existing `/workshop/.../charts` redirect entry proves the shape; new entries are additive. |
| `package.json` | Add deps if needed (e.g., PostHog SDK if L-ENG-2 ratifies). | Low. | — |
| `.github/workflows/*.yml` | Add the Lighthouse CI + bundle-analyzer + claims-test jobs. | Low. | Per `16` §10. |

> **No `middleware.ts` is added.** Auth is enforced by Server Components + the callback route
> (verified absent + by design — `23` §0). The redirect map lives in `next.config.ts redirects()`,
> NOT middleware, so it cannot accidentally gate auth or workshop routes.

### 1.3 Files DELETED (⚠️ GATED on owner confirmations per L-REM-*)

| Path | Why | Gate |
|---|---|---|
| `src/components/landing/TestimonialSection.tsx` | §15 fabricated testimonials | L-REM-1 |
| `src/components/landing/CompanyProofCarouselSection.tsx` | §15 fabricated testimonials | L-REM-1 |
| `src/components/landing/company-proof-data.ts` | §15 placeholder partner logos | L-REM-1 |
| `src/components/landing/ProcessBandSection.tsx` (testimonial machinery) | §15 fabricated testimonials (the process-band mechanic may be repurposed; audit at implementation) | L-REM-1 |
| `public/landing/hero-slides/*` (the construction-slide-01…09.jpg + `archestimator-frosted-construction.png`, verified present) | §12.9 "dashboards that perform"; perf cost (the 2.3MB PNG) | L-REM-3 |
| `src/components/landing/ProductPreviewVariants.tsx` (if it re-draws chrome) | Hallmark bans re-drawn chrome | L-REM-5 (audit) |
| `src/components/landing/PartnerSection.tsx` (if it implies real partnerships) | §15-adjacent | L-REM-5 (audit) |
| `src/components/landing/PlaceholderMedia.tsx` (if non-essential) | cleanup | L-REM-5 (audit) |
| `src/components/landing/NeatWireframeBackground.tsx` (if the canvas wash replaces it) | doc `03` §4.1 — the canvas wash IS the background (D-1 Glass Brand, not paper) | L-REM-5 (audit) |
| `/favicon_io/*` (after the new root-level favicon set ships + the old set is no longer referenced) | replace | — |

⚠️ **None of these delete until owner confirms** per the Hallmark deletion rail. The migration plan
ships the new components alongside the old; the deletion is a separate gate (§2 phase 7).

---

## 2. The migration order (the safe sequence) + the redirect map

The order minimizes risk by shipping additive first, then the cutover, then the deletions.

### 2.1 The 301 redirect map (added to `next.config.ts` `redirects()`)

**URLs that CHANGE shape** (old → 301 → new). Only add a 301 where a public URL genuinely moves;
routes that keep their path need no redirect.

| Source (old) | Destination (new) | `permanent` | Why / when |
|---|---|---|---|
| _(none of the canonical marketing routes change path)_ | — | — | `/`, `/features`, `/pricing`, `/about`, `/contact`, `/login` all **keep their URLs**; the cutover swaps the *component tree* under them, not the path. This is the single biggest SEO risk-reducer. |
| `/favicon.ico` → new root-level `public/favicon.ico` | `/favicon.ico` (root) | n/a (file replace, not redirect) | The new set ships at the root; `/favicon_io/*` is deleted in phase 7. No redirect needed if `metadata.icons` points at the new root paths. Add a 301 from `/favicon_io/favicon.ico` → `/favicon.ico` only if log analysis shows inbound traffic to the old subpath. |
| `/trust` (new) | n/a | n/a | **Net-new route** — no old URL to redirect from. |
| `/signup` (new) | n/a | n/a | **Net-new route** (gated L-FUN-1/L-FUN-2). |
| `/newdesign` (preview) | n/a | n/a | **Net-new, internal-only** — `noindex` from day 1 (§3); never in the sitemap. |
| `/legacy` (rollback host) | n/a | n/a | **Net-new, rollback-only** — `noindex` from day 1 (§3); never in the sitemap. |
| Old deep-section anchors (e.g. `/#testimonials`, `/#partners` — if they existed) | the nearest new section anchor (e.g. `/#proof` or `/#how-it-works`) | `true` | **See risk-register row R-8 (anchor rot).** Only add if analytics/search-console shows inbound links to the removed anchors; otherwise let them 404 to the section. |

**Format reference (verified, `next.config.ts:99`):** the existing `redirects()` hook already
returns `[{ source, destination, permanent }]` — the new entries (if any) append to that array.
Prefer `permanent: true` (308) for shape changes that are truly permanent; the anchor-rot redirects
above are the only likely candidates, and only if inbound-link evidence (§R-8) warrants them.

### 2.2 URLs that STAY vs CHANGE (explicit)

| URL | Stays or changes | Notes |
|---|---|---|
| `/` | **Stays** | Component tree swaps; path unchanged. |
| `/features`, `/pricing`, `/about`, `/contact` | **Stay** | Same. |
| `/login` | **Stays** | Reskinned to 2-col (`23`); path + server-action contract unchanged. |
| `/privacy`, `/terms` | **Stay** | Unchanged by this redesign (legal content owner-gated L-LEG-1…4). |
| `/trust` | **NEW** | Additive; no redirect. |
| `/signup` | **NEW** | Additive; gated L-FUN-1/L-FUN-2. |
| `/newdesign`, `/legacy` | **NEW (internal)** | Preview + rollback hosts; `noindex`, sitemap-excluded (§3). |
| `/favicon_io/*` | **REMOVED (phase 7)** | Replaced by root-level set; conditional 301 only on inbound evidence. |

### 2.3 The 7-phase migration order

| Phase | Work | Risk | Rollback |
|---|---|---|---|
| **1. Tokens + favicon + metadataBase (additive)** | Add the `--landing-*` tokens to `globals.css` (`03` §3.2/§3.3); ship the new root-level favicon set; add `metadataBase` to `layout.tsx` (`13` §3). **No Source Serif 4 import** (D-1 defers it). | Low. | Revert the patch; the existing tokens + fonts are untouched. |
| **2. Sitemap + robots (net-new)** | Add `src/app/sitemap.ts` + `src/app/robots.ts` (§3 below). They list the canonical routes and exclude `/newdesign`, `/legacy`, `/login`, `/signup`, `/trust`-if-gated. | Low. | Delete the two files; the app ran without them before. |
| **3. New components (additive, not routed)** | Build the new components per `11` + the `src/components/auth/` leaves per `23` §4. They live in the tree but no route renders them yet. Storybook + unit + component tests pass. | Low. | Delete the new component files; no route is affected. |
| **4. The `/newdesign` preview routes** | Add `/newdesign` + the per-route preview pages; they render the new components. `noindex` from day 1 (§3). Internal review + A/B exposure per `08` §2–3. | Low (the canonical routes are untouched). | Remove the `/newdesign` routes. |
| **5. The `/trust` route + the `/signup` route (additive, gated)** | Add `/trust` (a new route; does not replace anything). Add `/signup` (⚠️ GATED L-FUN-1/L-FUN-2 — `23` §9/§10; ship the `ClosedBetaGate` variant if self-serve is off). `/login` reskin lands here too. | Low–Medium (`/signup` is the only auth-surface addition; server actions unchanged). | Remove the routes. |
| **6. The claims sign-off gate** | Run the sign-off procedure (`09-CLAIMS-LEDGER-SIGN-OFF`); the owner signs that the matrix reconciles. | Gates the cutover. | If fail, correct the matrix; re-run. |
| **7. The cutover (URL swap, NOT code change)** | The new components render at the canonical routes (`/`, `/features`, `/pricing`, `/about`, `/contact`); the old components move to `/legacy`. **The components rendered at `/newdesign` are byte-identical to the ones rendered at the canonical routes post-cutover** — this is the single biggest risk reducer. The `/legacy` route is `noindex` (§3) so it cannot cannibalize the canonical routes during the 30-day rollback window. | Medium — the public surface changes. | Revert the route swap; the `/legacy` components are still live at `/legacy`. |
| **8. Deletions (post-cutover, ⚠️ GATED on owner + 30-day stable)** | Delete the `/legacy` components + the fabricated-testimonial files + the hero slideshow + the 2.3MB PNG + the logo-only footer + `/favicon_io/*`. See §5 for the day-31 `/legacy` action. | Low — the components are no longer rendered. | Restore from git history (30-day window — §5). |

**The cutover is a URL swap, not a code change** — the components rendered at `/newdesign` are
identical to the ones rendered at the canonical routes post-cutover. This is the single biggest risk
reducer and the reason the overall risk is LOW.

### 2.4 The `/newdesign` vs `/` canonical decision during the A/B

During the A/B (`08` §3), both `/newdesign` (new) and `/` (legacy) are live. The SEO discipline:

- **`/newdesign` is `noindex,nofollow` for the entire A/B window** (§3). It is a preview/variant,
  never a candidate for the index. This prevents the A/B from creating duplicate-content competition.
- **`/` remains the canonical URL throughout.** The A/B swaps which *component tree* `/` renders
  (via `ABExperimentProvider`, `08` §3), NOT which URL is canonical. `canonical` on `/` always
  points to `/` self-referentially.
- **At cutover, `/newdesign` is deleted (or kept as a permanent `noindex` preview)** and `/` renders
  the new tree as the steady state. No 301 is needed from `/newdesign` because it was never indexed;
  if it is kept, add a `301 /newdesign/* → /` so any leaked inbound link resolves.

---

## 3. The sitemap + robots + canonical diff (SEO continuity)

These files are **net-new** (verified: no `src/app/sitemap.ts`, no `src/app/robots.ts`, no
`public/robots.txt`, no `metadataBase` exist today). The redesign introduces them.

### 3.1 `src/app/sitemap.ts` (NEW)

Lists the **canonical, indexable** routes only.

| Route | In sitemap? | `lastmod` | `changefreq` | `priority` |
|---|---|---|---|---|
| `/` | ✅ | cutover date | weekly | 1.0 |
| `/features` | ✅ | cutover date | monthly | 0.9 |
| `/pricing` | ✅ | cutover date | monthly | 0.8 |
| `/about` | ✅ | cutover date (⚠️ GATED L-FND-1 founder bio) | monthly | 0.7 |
| `/contact` | ✅ | cutover date | yearly | 0.6 |
| `/trust` | ✅ (once claims ledger is signed off — gate `09`) | sign-off date | monthly | 0.7 |
| `/login` | ❌ excluded (noindex — `23` §7) | — | — | — |
| `/signup` | ❌ excluded (noindex — `23` §7) | — | — | — |
| `/newdesign` | ❌ excluded (preview, noindex) | — | — | — |
| `/legacy` | ❌ excluded (rollback host, noindex) | — | — | — |
| `/auth/callback`, `/beta/*`, `/workshop/*`, `/share/*`, `/invite/*`, `/api/*` | ❌ excluded (app surfaces, not marketing) | — | — | — |

**Diff vs the (non-existent) baseline:** the sitemap is **net-add**. There is no removed-route
cannibalization risk because no canonical route changes path (§2.2). The sitemap is the single
discovery surface for the new `/trust` route.

### 3.2 `src/app/robots.ts` (NEW)

```text
User-agent: *
Allow: /
Disallow: /newdesign
Disallow: /legacy
Disallow: /login
Disallow: /signup
Disallow: /auth
Disallow: /beta
Disallow: /workshop
Disallow: /share
Disallow: /invite
Disallow: /api
Sitemap: <metadataBase>/sitemap.xml
```

- `/login` + `/signup` are `Disallow` **and** carry `<meta name="robots" content="noindex,nofollow">`
  (`23` §7) — belt-and-suspenders (robots.txt does not deindex, but it conserves crawl budget).
- `/newdesign` + `/legacy` are `Disallow` so the preview/rollback hosts never consume crawl budget
  and never risk a duplicate-content entry.
- The `Sitemap:` line pins to `<metadataBase>/sitemap.xml` so the sitemap URL is stable across
  environments.

### 3.3 `metadataBase` (canonical origin — pinned in `layout.tsx`)

- **Pinned to the production origin** (e.g. `https://archestimator.com`) via `metadataBase` in the
  root `metadata` (`13` §3). This makes every route's `canonical` + every OG image URL
  **absolute and stable** across preview/production environments.
- `canonical` on every canonical route is **self-referential** (`/` → `<metadataBase>/`,
  `/features` → `<metadataBase>/features`, etc.). Auth routes self-canonicalize too (`23` §7) to
  dedupe `?next=`/`?error=`/`?sent=` query variants.
- **OG-image URL stability** — see risk-register row R-9. OG images live at
  `<metadataBase>/og/<route>.png` with `Cache-Control: public, max-age=86400, must-revalidate`
  (24h) so a social re-scrape after the cutover is not delayed by a stale long-TTL cache. Filename
  versioning (`/og/<route>.png?v=2026-07`) is the escalation if a non-cache-respecting scraper
  serves the old card.

### 3.4 `/legacy` noindex + canonical strategy (the 30-day rollback window)

The `/legacy` route is the rollback mechanism, but it MUST NOT cannibalize the canonical routes'
SEO during its 30-day window (`08` §2.3):

1. **`/legacy/*` carries `<meta name="robots" content="noindex,nofollow">`** (route-level metadata).
2. **`/legacy/*` is `Disallow` in `robots.txt`** (§3.2).
3. **`/legacy/*` is excluded from the sitemap** (§3.1).
4. **`/legacy/*` `canonical` points to its canonical twin** (`/legacy/` → `<metadataBase>/`,
   `/legacy/features` → `<metadataBase>/features`), NOT to itself — so even if a crawler reaches
   it, the canonical authority flows to the new route, not the rollback host.
5. **HTTP header belt-and-suspenders:** append `X-Robots-Tag: noindex, nofollow` to `/legacy/*` in
   `next.config.ts headers()` (precedent: the existing share-page hardening block already emits this
   header — `next.config.ts` `headers()`).

This 5-layer discipline is what makes a 30-day rollback window safe: the legacy surface is live for
fast rollback but invisible to the index.

---

## 4. The day-31 `/legacy` action (auto-delete / reminder / git tag)

The `/legacy` route is a temporary rollback host, not a permanent fixture. Its end-of-life is
**pinned to day 31 post-cutover** (`08` §2.3) and resolved by one of three owner-gated actions
(L-REM-6):

| Action | When | Mechanism |
|---|---|---|
| **A. Auto-delete** (recommended default) | Day 31, A/B stable, no rollback fired, owner confirms | Delete `/legacy/*` + the old component files + the `/favicon_io/*` remnants (phase 8 of §2.3). Git tag `landing-cutover-stable-<date>` marks the commit the rollback would restore to. |
| **B. Owner reminder** (fallback) | Day 31 if owner is unavailable | A calendar reminder (or a LOOP_LEDGER L-REM-6 tickler) prompts the owner; `/legacy` stays live `noindex` until the owner confirms deletion. No indefinite zombie — cap at day 60, then auto-delete. |
| **C. Keep as permanent `noindex` archive** (exception) | Only if the owner wants an internal-only archive | `/legacy` stays `noindex,nofollow` + `Disallow` + sitemap-excluded indefinitely. Not recommended (technical-debt accrual); documented as a permitted exception. |

**Git tag:** regardless of A/B/C, tag the cutover commit (`landing-cutover-<date>`) and the
day-31-stable commit (`landing-cutover-stable-<date>`) so the 30-day rollback window is
reconstructible from history. This is the audit trail for "we rolled back / we did not."

---

## 5. The risk register

| Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|
| **R-1** The new design regresses `signup` CVR in the A/B | Med | High | The A/B in `08` §3 catches this pre-cutover; rollback is a URL swap (§2.3 phase 7). | Owner |
| **R-2** A claim ships that violates §15 (forbidden list) | Med | High (brand) | The claims-test sweep (`16` §9) catches it in CI; the sign-off gate (`09`) blocks release. | Reviewer + owner |
| **R-3** Deferred-glass CLS / blur jank on mid-range Android | Low | Med | The deferred-glass pattern + ≤4-blur cap (`03` §4); lab CI catches it (`16` §8). L-A11Y-1 (30fps verify) carried. | Eng |
| **R-4** The plate SVG overflows at 320px | Med | Med | The collapse-to-vertical-stack behavior (`04` §4.6); the e2e mobile-render test (`16` §5) catches it. | Eng |
| **R-5** The `/signup` route is not ready by cutover | High | Med | The `Start free` CTA is href-gated (L-FUN-1); the cutover ships with the CTA pointing to `/contact` (the assisted path) or `/login` (magic-link handles signup — `23` §0) until `/signup` lands. **The cutover does NOT wait on `/signup`.** | Owner |
| **R-6** The claims matrix drifts (a feature ships without the matrix updating) | Med | High (brand) | The content workflow (`20` §3) + the weekly reconciliation cadence. | Author + reviewer |
| **R-7** A banned hero line regresses (someone re-adds "Start Winning") | Low | Med (brand) | The forbidden-list sweep (`16` §9.1) catches it in CI. | Eng |
| **R-8** **Inbound-link anchor rot to removed deep sections** (e.g. `/#testimonials`, `/#partners`, `/favicon_io/*`) | Low | Med (SEO) | (a) Audit Search Console + inbound-link tools (Ahrefs/SEMrush if available, else Search Console referrer report) for links to removed anchors/subpaths BEFORE phase-8 deletion; (b) add `301` redirects (§2.1) from any evidence-backed old anchor to the nearest new section (`/#proof`, `/#how-it-works`); (c) for the removed `/#testimonials` specifically, redirect to `/#proof` (the radical-honesty claims ledger is the successor surface). If no inbound evidence, let the anchor 404 to the section (a fragment 404 is harmless). | Owner + SEO |
| **R-9** **OG-image URL stability after cutover** (social scrapers serve a stale card) | Low | Med (brand) | (a) Pin OG URLs to `<metadataBase>/og/<route>.png` (§3.3) so they are absolute and environment-independent; (b) ship `Cache-Control: public, max-age=86400, must-revalidate` (24h) on `/og/*` so a post-cutover re-scrape is not delayed by a stale long-TTL cache; (c) filename-version (`/og/<route>.png?v=2026-07`) as escalation if a non-cache-respecting scraper serves the old card; (d) pre-warm the scrapers (Facebook debugger, LinkedIn Post Inspector, Twitter card validator) on cutover day. | Eng |
| **R-10** Cross-link rot (a doc's link breaks after a rename) | Low | Low | The canonical map (`10`) + the grep verification (`10` §4). | This pack |
| **R-11** An a11y regression (a new component fails axe) | Low | High | The CI a11y tests (`16` §7) catch it. | Eng |
| **R-12** A perf regression (LCP > 2.5s) | Low | Med | The Lighthouse CI gate (`16` §8) catches it. | Eng |
| **R-13** **Analytics-event continuity across cutover** (old vs new event shapes break the funnel dashboard) | Med | Med | (a) The new event schema (`17` §3) is **additive** — old events keep firing from `/legacy` during the 30-day window; (b) the dashboard (`17` §6) consumes both shapes via a `surface: "legacy" \| "new"` discriminator until day 31; (c) no old event name is renamed — new events get new names, old events are deprecated not deleted. This prevents a cutover-day cliff in the funnel. | Eng + analytics |
| **R-14** The owner halts mid-migration | Med | Low | Each phase is independently revertable (§2.3 "Rollback" column). | Owner |

---

## 6. The rollback playbook

| Trigger | Action | Window |
|---|---|---|
| A/B primary regression > 10% relative | Revert the cutover URL swap; `/legacy` is still live and `noindex`. | Immediate. |
| A §15 forbidden hit on the public surface | Revert the cutover; correct the copy; re-run the gate. | Immediate. |
| An a11y regression that escapes CI | Revert the cutover; fix; re-run. | Immediate. |
| A perf regression in the field | Revert the cutover; investigate; re-run. | Within 24 h. |
| A claims-matrix drift post-launch | **Do NOT revert** — the matrix is corrected forward (the `06` §3 lifecycle); the public surface updates on the next sign-off. | Per release. |
| `/signup` abuse spike (L-FUN-4 not ready) | Flip the `Start free` href to `/login` or `/contact` (the assisted path); `/signup` stays up but the CTA routes around it. The closed-beta RPC fail-closes regardless (`23` §3.1). | Immediate. |

The `/legacy` route (§3.4) is the rollback mechanism; it stays live + `noindex` for 30 days
post-cutover, then resolves per §4 (day-31 action).

---

## 7. Cross-links

- `06-PROOF-AND-CLAIMS-DISCIPLINE.md` — the removal rail (§4 there → §1.3 here).
- `08-ROLLOUT-AND-ANALYTICS.md` — the rollout mechanics (§2 there → §2.3 here) + the 30-day `/legacy` window (§2.3 there → §3.4 + §4 here).
- `09-CLAIMS-LEDGER-SIGN-OFF.md` — the sign-off gate (§3 there → §2.3 phase 6 here).
- `10-CANONICAL-DOC-MAP.md` — canonical filenames.
- `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` — the new components (§2 there → §1.1 here).
- `13-SEO-AND-DISCOVERY.md` — the sitemap/robots/metadataBase diff (§3 here implements §3–4 there) + auth `noindex` (§7 of `23`).
- `16-TEST-AND-VERIFICATION-PLAN.md` — the CI gates that catch regressions pre-cutover (§9 claims sweep, §7 a11y, §8 perf).
- `17-ANALYTICS-AND-OBSERVABILITY.md` — the event-schema continuity (R-13) + the `surface` discriminator.
- `19-ASSET-PIPELINE-AND-IMAGERY.md` — the asset additions + the OG-image cache strategy (R-9).
- `23-AUTH-EXPERIENCE.md` — the auth-surface blast radius (§0 there → §0 + §1.1 here) + the no-signup fallback (R-5).
- `LOOP_LEDGER.md` — the L-REM-* family + L-FUN-1/2 + L-REM-6 (day-31 action) + the open dependencies.

---

## 8. ⚠️ Gated on / Open decisions (carried in `LOOP_LEDGER.md`, never silently closed)

Per D-5, no gate is silently marked closed. The load-bearing gates for THIS doc:

- **L-REM-1 → L-REM-5** — Owner confirmation of the deletion rail (§1.3). No deletion ships without it.
- **L-REM-6 (new)** — The day-31 `/legacy` action (A auto-delete / B reminder / C keep — §4). Default A; owner confirms.
- **L-FUN-1** — The `/signup` route path (recommend `/signup`, `23` §10). Affects whether the cutover's `Start free` points to `/signup` or to `/login`/`/contact` (R-5).
- **L-FUN-2** — Beta-onboarding + self-serve enablement (`23` §10). Decides whether `/signup` ships `SignupForm` or `ClosedBetaGate`.
- **L-FUN-3, L-FUN-4** — First-run flow + abuse guardrails (P1). Affect whether the cutover's "Start free" leads to a working activation path; R-5 routes around them.
- **L-ENG-2 / L-ENG-3** — A/B provider + analytics tool ratification. Affect R-13 (event-continuity shape).
- **L-SEO-1** — PH/SEA keyword volumes (affect whether `/trust` is prioritized in the sitemap `priority`).
- **Owner halt tolerance** — The owner may halt the migration at any phase; each phase is independently revertable (§2.3).

---

## 9. Coherence contracts (this doc honors)

- **D-1 (Glass Brand)** — the canvas wash replaces (not paper) the background; `NeatWireframeBackground` deletion gated on that (`03` §4.1). No Source Serif 4 in `layout.tsx` (§1.2 + §2.3 phase 1).
- **D-2 (full-page auth)** — `/login` + `/signup` are routes, not modals; both `noindex,nofollow` + sitemap-excluded (§3.1/§3.2). Auth blast radius is reskin + twin, server actions unchanged (`23` §0).
- **D-3 (orange discipline)** — no clay `#AA412A` anywhere (it is not a token; `globals.css` grep confirms absence except the DESIGN.md-prose comment at L29). The redesign does not introduce it.
- **D-4 (ClaimStatus type)** — single source `src/components/landing/shared/StatusPill.tsx` (§1.1); no divergent type.
- **D-5 (honest scoring)** — the overall risk is rated **LOW** with explicit justification (§0); the doc does not inflate risk to justify its own breadth, nor deflate it to look simple. Gated items are carried, not silently closed (§8).
- **Rate-limiting = Postgres, not Redis** (project position) — no Redis introduced; the closed-beta RPC fail-closes (R-5). Turnstile NOT yet built (R-5 escalation-only).
- **Radical honesty** — no fabricated logos/testimonials/stats/badges/prices in any migration artifact; the OG images are real generated plates (`19`), the claims matrix is the `09` gate.

---

## 10. Honest self-score (D-5)

| Dimension | Score | Justification |
|---|---|---|
| **Strategy** | **95 / 100** | The proportional-risk posture (§0) honestly frames this as additive Low-risk work and justifies the 27-doc breadth as owner-directed, not proportional-necessary — the load-bearing strategic correction the prompt required. The 7-phase order, the "cutover = URL swap not code change" insight, the 5-layer `/legacy` noindex discipline, the day-31 action pin, the R-8 anchor-rot + R-9 OG-stability + R-13 event-continuity rows, and the "Start free → /contact or /login" fallback (R-5) are all concrete and owner-aligned. Not 100 because L-FUN-1/L-FUN-2 (signup path/self-serve) and L-REM-6 (day-31 action) are genuinely open and affect the final cutover shape; the doc recommends defaults but cannot ratify them. |
| **Quality** | **94 / 100** | Every structural claim is verified against live source: `next.config.ts:99` `redirects()` exists (§2.1 format reference), no `metadataBase`/`sitemap.ts`/`robots.ts`/`middleware.ts` exist today (§3 net-new), `public/favicon_io/` + `public/landing/hero-slides` + the frosted PNG exist (§1.3 deletion targets), `X-Robots-Tag: noindex` precedent is in the existing `headers()` block (§3.4 #5), no clay `#AA412A` token (§9). The redirect map is explicit about which URLs change vs stay (§2.2) — zero silent shape changes. Not 100 because: (a) the R-8 inbound-link audit is described as a process ("audit Search Console + referrer report") not a verified result (no inbound-link data was pulled for this revision — it is correctly deferred to cutover-eve); (b) the OG `Cache-Control` value (24h) is a reasonable starting point, not a measured scraper-respect value; (c) the exact `metadataBase` origin is a placeholder (`archestimator.com`) pending L-SEO-1/domain confirmation. |
| **Implementation-Readiness** | **92 / 100** | An implementer can start: the 7-phase order has per-phase rollback, the redirect map has the exact `next.config.ts` hook + format reference, the sitemap/robots/metadataBase diff is a net-new file list with per-route decisions, the day-31 action is pinned, and the risk register maps each risk to a mitigation owner. The blast radius explicitly bounds the auth change to "reskin + twin, server actions unchanged" (per `23` §0). Not 100 because the genuinely-open gates (L-FUN-1/2, L-REM-1…6, L-ENG-2/3, L-SEO-1) honestly cap readiness below 100 — per D-5 these are carried in LOOP_LEDGER, not silently closed. The cutover phase (7) cannot finalize its `Start free` href until L-FUN-1 closes, and the day-31 action (§4) cannot finalize until L-REM-6 closes. |

**Carried to LOOP_LEDGER (not silent):** L-REM-1…5, L-REM-6 (new), L-FUN-1, L-FUN-2, L-FUN-3,
L-FUN-4, L-ENG-2, L-ENG-3, L-SEO-1.
