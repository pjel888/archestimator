# Evidence & Verification — Accessibility, SEO & Legal/Content Readiness (2026-06-19)

Adversarial verification pass over `01-AUDIT-FINDINGS.md`. Each finding was re-opened at the cited
files/lines and an attempt was made to refute it. Default posture: skepticism. Severity/launch-blocker
inflation corrected. `existing_plan_overlap` claims re-checked against the real prior packs.

## Verification verdicts

### SEO-01 — `/share/[token]` indexable & leaks data in metadata → **ADJUSTED (high→low, blocker true→false)**
- **Verified facts:** `generateMetadata` has no `robots` field on any branch
  (`src/app/share/[token]/page.tsx:271-321`, confirmed by `rg "robots|index"` → 0 hits). The success
  branch does embed real data into title/description: `${p.name}…` and `Total ${formatMoney(snap.totalCost…)}${p.clientName ? \` for ${p.clientName}\` : ""}` (lines 301-302). No `src/app/robots.ts` / `public/robots.txt` (both confirmed absent).
- **Refutation that lands:** the audit's core premise — that these pages are *indexable* — is **false**.
  `next.config.ts:107-113,118-124,132-134` applies `X-Robots-Tag: noindex, nofollow` to `/share/:path*`
  **and** `/api/share/:path*`. `X-Robots-Tag` is an authoritative crawler directive honored by Google/Bing
  identically to a meta robots tag. The confidential proposal pages are therefore already excluded from
  search indexes. The data-in-`<meta>` concern survives only for **non-robots scrapers** (chat link
  unfurlers, email scanners), which is an accepted product trade-off (the recipient is the intended
  audience), not an indexing exposure.
- **`existing_plan_overlap` correction:** audit said `none`; it is actually **partial:DEPLOY-03** — the
  Deploy pack owns the robots.txt `Disallow: /share` half and already documents the `X-Robots-Tag` header.
- **Final:** low / not a blocker. The metadata `robots:{index:false}` remains worth doing as cheap
  defense-in-depth (remediation item #4).

### SEO-CONTENT-01 — robots/sitemap must scope private routes → **ADJUSTED (high→low, blocker true→false)**
- **Verified:** no `robots.ts`/`sitemap.ts`/`public/robots.txt`/`public/sitemap.xml` (all confirmed absent).
- **Refutation that lands:** the launch-blocker framing is wrong. The *confidential* surfaces
  (`/share`, `/workshop`, `/invite`, and the share API) already carry header-level
  `noindex, nofollow` (`next.config.ts:112,160-176`). The missing `robots.txt`/`sitemap.ts` is a
  defense-in-depth + marketing-SEO gap, not a private-data-exposure gate. The Deploy pack's **own**
  DEPLOY-03 already rated this `adjusted (down) → low`
  (`…Deploy-And-Headers/02-REMEDIATION-PLAN.md:13`). Re-asserting it as a blocker here contradicts the
  owning pack.
- **`existing_plan_overlap`:** **covered-by:2026-06-19-Launch-Readiness-Audit/NextJS-Vercel-Deploy-And-Headers**
  (DEPLOY-03 owns the files and the policy). This pack contributes only the content contract.
- **Final:** low / not a blocker; folded into the Deploy pack's plan + the content contract in 02.

### SEO-02 — No `metadataBase` → **CONFIRMED (medium, no blocker)**
- **Verified:** `src/app/layout.tsx:18-30` has title/description/icons/manifest, **no `metadataBase`**.
  Share page emits relative `openGraph` (`page.tsx:313-316`). With no base, Next resolves OG/canonical
  against localhost at build and warns. Real, reproducible in `next build`.
- **Final:** medium / not a blocker. Severity as audited.

### SEO-03 — No per-page metadata on marketing/legal pages → **CONFIRMED (medium, no blocker)**
- **Verified:** `rg -l "export const metadata|generateMetadata" src/app` → exactly 2 files
  (`layout.tsx`, `share/[token]/page.tsx`). `/about`, `/features`, `/pricing`, `/contact` each render an
  `<h1>` but export no metadata (spot-checked lines 36/126/51/16). They all inherit one root title.
- **Final:** medium / not a blocker. As audited.

### A11Y-01 — Legal pages at 9–12px → **CONFIRMED (low, advisory, no blocker)**
- **Verified:** `privacy/page.tsx` `h1` `text-[12px]` (15), `h2` `text-[11px]` (31,37,43,…), body
  `text-[10px]` (23), meta/footer `text-[9px]` (12,18,66). `terms/page.tsx` mirrors it (h1:19, body:30,
  meta:16,22,59). Colors `#1f201f`/`#5f615f` on `#eeeeec` — contrast passes AA; the issue is **size only**,
  exactly as the audit states.
- **Severity correction:** audit labeled this **high** (advisory). For a closed beta with no external
  users yet, sub-readable legal text is a real readability/conspicuousness concern but **not high** in
  launch-impact terms, and DESIGN.md is an alpha guide (advise, don't gate). Downgraded to **low /
  advisory**. The audit was already right that it is **not** a launch blocker.
- **`existing_plan_overlap` check:** audit's `stale-context` note re: memory `designmd-tertiary-fails-aa`
  is **correct** — that memory flags the `#7F7F7F` *color* token, which is **not** used on these legal
  pages; the real issue here is font size. Verdict upheld.
- **Final:** low / advisory / not a blocker; requires Philip sign-off before applying.

### A11Y-02 — No skip-to-content link → **CONFIRMED (low, no blocker)**
- **Verified:** `rg "skip.*content|href=\"#main"` → 0 hits. `PublicPageShell.tsx:34` renders
  `<main data-landing-page-root="true">` with **no `id`** (so even adding a link needs an id target).
  Home `page.tsx:34` same.
- **Final:** low. As audited.

### A11Y-03 — No root not-found/error/global-error → **CONFIRMED (medium, no blocker)**
- **Verified:** `ls src/app/{not-found,error,global-error}.tsx` → all absent. Error boundaries exist only
  under `/workshop/*`. Public 404/500 (incl. expired `/share` links) hit Next's default screens.
- **Final:** medium / not a blocker. As audited.

### A11Y-04 — Positive evidence (landmarks, labels, alt, lang, viewport) → **CONFIRMED (info)**
- **Verified:** `<html lang="en">` (`layout.tsx:34`); `<main>` on home (`page.tsx:34`) and shell
  (`PublicPageShell.tsx:34`); ContactForm has `htmlFor`/`id` pairs for all 5 inputs
  (`ContactForm.tsx:131-216`) + `role="alert"` live regions (66,122); avatar alt fallback
  (`avatar.tsx:35`); CookieConsentBanner `role="region"`+`aria-label` (74-75) and trigger `aria-label`
  (63); no `user-scalable`/`maximum-scale` anywhere (`rg` clean). All correct — do not "fix" these.

## Launch-blocker tally
**0** launch blockers in this domain. The two findings the prior auditor marked `launch_blocker: true`
(SEO-01, SEO-CONTENT-01) are both refuted as blockers because the confidential `/share`/`/workshop`/
`/invite` surfaces already ship `X-Robots-Tag: noindex, nofollow` (`next.config.ts:112`), and the
residual robots.txt/sitemap work is owned + already down-rated by the Deploy pack (DEPLOY-03).

---

## Proof gates per remediation item

| Item | Proof gate | What it proves | Honest limits |
|------|-----------|----------------|---------------|
| 1 `metadataBase` | `bun run build` shows **no** metadataBase resolution warning; inspect built `<head>` of `/` for absolute OG `url` | Base resolves; warning gone | Local build can't prove the prod host is correct — confirm host with Philip/Deploy pack |
| 2 per-page metadata | `bun run build`; `rg "export const metadata" src/app/{about,features,pricing,contact,privacy,terms}/page.tsx` → 6 hits; view-source each page for unique `<title>`/`<meta name=description>` | Unique metadata present and builds | SERP impact itself is not locally testable (needs live crawl) |
| 3 error/not-found | `bun run build` succeeds (global-error must render standalone); hit a bogus URL in `bun run dev` → branded 404; throw in a test route → branded error + working `reset()` | Boundaries render & recover | global-error only triggers on root-layout failure — exercise via a forced throw, not just visual |
| 4 share robots | `rg "index: false" src/app/share/[token]/page.tsx` on all 5 branches; `bun run dev` → view-source `/share/<token>` shows `<meta name="robots" content="noindex,nofollow">`; confirm no new Supabase import | Meta noindex on every branch, no boundary regression | Redundant with the already-present header; "fixes" a near-zero-residual risk |
| 5 legal sizing | Visual diff at the chosen sizes; axe/Lighthouse no new contrast crits (colors unchanged) | Readability improved, contrast still AA | Subjective; **gated on Philip's design call** — do not auto-apply |
| 6 skip link | Keyboard Tab on `/` → first focus reveals "Skip to content"; Enter jumps focus to `#main`; `rg 'id="main"'` present | Skip link works & target exists | Manual keyboard check; no automated gate beyond presence grep |

### What local checks CANNOT prove (be honest)
- Actual search-engine de-indexing of `/share` (depends on live crawler behavior + the prod header
  being served — verify with `curl -I https://<prod>/share/<token>` post-deploy for `X-Robots-Tag`).
- Real social-unfurl previews (need a live URL through a debugger like the platform card validators).
- That `link-unfurlers/email scanners` do or don't read the share `<meta>` description — product
  decision, not a test.
- `bun run validate` is **known-red on main** (charts set-state-in-effect; ProposalExportPreviewDialog
  design-lint; test:dom can hang). Do **not** gate on a green `validate`. Use targeted `bun run build`
  + the per-item checks above, and assert **no new** reds in the touched files only.
