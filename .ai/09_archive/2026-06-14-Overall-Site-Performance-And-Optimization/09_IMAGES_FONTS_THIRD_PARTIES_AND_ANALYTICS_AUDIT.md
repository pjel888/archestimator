# 09 — Images, Fonts, Third-Parties & Analytics Audit

Purpose: assess the perceived-performance and launch-readiness posture of static asset delivery (images/fonts), third-party scripts, and analytics/RUM instrumentation across Archestimator's public, share, and authed surfaces.

Status: AUDIT / PLANNING ONLY
Date: 2026-06-14

---

## 1. Dimension summary

Overall this dimension is in surprisingly good shape for a pre-launch app, with several thoughtfully-engineered choices that contradict the stale concerns in the brief. Fonts are self-hosted via `next/font/google` (Roboto_Mono, latin subset, default `display:swap` + preload) so there is no render-blocking external Google Fonts request; the only font issue is that Roboto Mono is preloaded app-wide from the root layout even though the authed SF-Pro UI never uses it. Third-party analytics is disciplined: GA4 (`@next/third-parties`) and Microsoft Clarity load only on landing/marketing pages via `PublicPageShell`, are consent-gated (default `analytics:false`) and use `afterInteractive` strategy; Vercel Web Analytics is mounted exactly once in the root layout with a `beforeSend` redactor that drops `/share`, `/invite`, and `/workshop` events entirely (strong share-link privacy). The landing WebGL background (`@firecms/neat`/three) and Lenis smooth scroll are both reduced-motion/mobile-gated, dynamically imported, idle-deferred, and IntersectionObserver-paused. Image handling is mostly correct: hero and share covers use `next/image` with `priority` + `sizes` + aspect-ratio CLS protection, and raw `<img>` tags are confined to local blob previews / private API-route URLs that legitimately cannot pass through `remotePatterns`.

The real gaps: (1) `@vercel/speed-insights` is NOT installed and no `<SpeedInsights/>` component is wired, so field Web Vitals RUM is not actually collected despite a readiness script existing — a genuine launch-readiness gap; (2) ~10MB of orphaned/dead public assets (`Cards/*.jpg`, a Screenshot PNG, `archestimator-frosted-construction.png`, 700KB logo PNG, Next starter SVGs); (3) a 2.7MB unoptimized `sidebar-BG.png` served as a CSS background on every authed page; (4) the share-page "priority LCP cover image" path is effectively inert because the normalizer rejects the private `project-images` bucket where covers actually live. None of these threaten the noindex/no-referrer/enforced-CSP posture of share links.

Live measurement was blocked (no dev server, dev-auth disabled, no build run), so all runtime numbers are cited from existing archive evidence only.

---

## 2. Already implemented (do not re-recommend)

Reconciled against the orchestrator's ground truth (verified 2026-06-14 @ HEAD 3070c46c) plus this session's direct reads. These are confirmed-present and must not be re-proposed as missing:

- **Self-hosted webfont via `next/font/google`** — Roboto_Mono, `subsets:['latin']`, default `display:swap` (non-blocking). Verified `src/app/layout.tsx:2,7`. No external `fonts.googleapis.com`/`gstatic.com` request (grep confirmed zero external font links).
- **SF Pro delivered via system stack** — `--font-sf-pro` is a pure system stack; zero font downloads. The "SF Pro" doc claim is consistent with the code, not a bug (see AS06).
- **Vercel Web Analytics mounted exactly once** — `src/app/layout.tsx:3,28`, single `<VercelWebAnalytics/>` in the root layout; no nested re-mount.
- **Share-link analytics redaction** — `beforeSend` redactor drops `/share`, `/invite`, `/workshop` events and strips search/hash (`src/lib/analytics/vercel-web-analytics.ts:5-6,26-43`).
- **GA4 + Clarity gating** — landing-only (`PublicPageShell`), consent-gated (default `analytics:false`), env-gated, `afterInteractive` (AS07).
- **CSP allow-list scoped to tracking hosts** — googletagmanager/google-analytics/clarity in script-src/connect-src/img-src; report-only on landing/workshop/invite, ENFORCED on `/share` (next.config; per ground truth).
- **WebGL background fully gated** — `NeatWireframeBackground` is `dynamic(ssr:false)`, reduced-motion/touch/<768px gated, idle-deferred, dynamic-imports `@firecms/neat` only on activation, IntersectionObserver-paused (AS09).
- **next/image with priority + sizes + aspect-ratio CLS protection** on landing hero (first slide only) and the share cover wrapper (`HeroSection.tsx`, `SharePageHero.tsx`).
- **Upload-time image optimization** — private project images are sharp-optimized to WebP at capped dimensions (1600px main / 512px thumb, quality 82/85) on write (`src/app/api/projects/images/route.ts:251-261`).
- **`images.remotePatterns` scoped to the public `component-images` bucket only** — `next.config.ts:45`; this is a deliberate boundary, not an oversight (it is the *cause* of AS05/AS10, not a gap to "fix" by widening).
- **`optimizePackageImports` (phosphor), `experimental.staleTimes`, `@next/bundle-analyzer`** — per ground truth; analyzer only emits a treemap with `ANALYZE=true` AND `--webpack` (NOT turbopack).
- **Route-transition perf work (Phases 0-7)** — loading.tsx shells, error.tsx, prefetch-on-hover, React.cache, 10 `next/dynamic` files (incl. `NeatWireframeBackground ssr:false`, bubble chart, D3 submodule imports) — per ground truth; out of scope to re-list here beyond the asset/analytics dimension.

Note on the readiness script: `scripts/check-vercel-speed-insights-readiness.ts` exists, but it queries a server-side metrics stream that nothing currently feeds — see AS01. Its existence is NOT equivalent to RUM being wired.

---

## 3. Findings

### AS01 — Vercel Speed Insights RUM is not installed or wired — no field Web Vitals collection

Severity: High
Confidence: Verified
Bottleneck class: GOVERNANCE_GAP
Affected surface: All routes (production RUM telemetry)
User symptom: No user-facing symptom; team has zero field Core Web Vitals (LCP/INP/CLS/TTFB) visibility from real users, so regressions ship undetected.
Technical cause: `package.json` lists `@vercel/analytics` but NOT `@vercel/speed-insights`; `node_modules/@vercel/` contains only `analytics`; no SpeedInsights component is imported anywhere in `src`. The existing `scripts/check-vercel-speed-insights-readiness.ts` queries Vercel's server-side metrics API via the CLI for `vercel.speed_insights_metric.*`, but those metrics are only populated if a `<SpeedInsights/>` beacon runs in real browsers — which it does not. The readiness check therefore evaluates a data stream that nothing is feeding.
Evidence:
- /Users/philiplewis/archestimator/package.json (deps: `@vercel/analytics` present at line 60, no `@vercel/speed-insights`)
- node_modules/@vercel/ lists only `analytics` (verified via ls)
- `grep -rEn 'speed-insights|SpeedInsights' src/` returns no component usage
- /Users/philiplewis/archestimator/scripts/check-vercel-speed-insights-readiness.ts (queries `vercel.speed_insights_metric.*` but nothing emits it)
Current metric:
- Field RUM Web Vitals: 0 data sources wired (verified). Readiness script's `coreVitalsGood` gate cannot pass without a browser beacon.
Target metric:
- Speed Insights beacon active on production; p75 FCP<=1800 / LCP<=2500 / INP<=200 / CLS<=0.1 rows populated for the current deployment.
Recommended action:
- Plan to add the `@vercel/speed-insights` package and mount its component in the root layout alongside `VercelWebAnalytics`, applying the same sensitive-path redaction (`beforeSend` equivalent) so `/share`, `/invite`, `/workshop` URLs are not leaked into RUM. Treat this as a launch-readiness blocker for the readiness script to ever return green. Verify in a live deployment that rows appear before declaring readiness.
Validation gate:
- After deploy, `scripts/check-vercel-speed-insights-readiness.ts` shows `hasCurrentDeploymentData=true` for FCP/LCP/INP/CLS; Vercel dashboard shows incoming Speed Insights data points.
Risk:
- Adding a beacon increases client JS slightly and sends Web Vitals; must redact tokenized/authed URLs to avoid leaking `?recipient=` tokens, matching the existing Vercel Web Analytics redactor.
Rollback/deletion criteria:
- Remove the component/import if it materially regresses TBT on public routes or if URL redaction is found incomplete in a live capture.

---

### AS02 — Roboto Mono is preloaded app-wide but the authed SF-Pro UI never uses font-mono

Severity: Low
Confidence: Verified
Bottleneck class: FONT
Affected surface: All authed routes (`/workshop/*`, `/share`) — every page rendered through the root layout
User symptom: Tiny: an unused WOFF2 font file is preloaded on workshop/share pages where the mono font is never displayed, adding a wasted high-priority network fetch.
Technical cause: `src/app/layout.tsx` loads Roboto_Mono in the root layout and exposes it as `--font-roboto-mono` → `--font-mono`. `next/font` defaults to `preload:true`, so the latin WOFF2 is `<link rel=preload>` on every page. `font-mono` is used only on marketing/landing components (about/features/pricing/contact + landing ProductPreview eyebrows/numerics); grep finds zero `font-mono` usage under `/workshop` or `/share`. The body and even landing root use `--font-sf-pro` (system stack), so SF Pro requires no download at all.
Evidence:
- /Users/philiplewis/archestimator/src/app/layout.tsx:7 (Roboto_Mono in root layout, no display/preload override; verified)
- /Users/philiplewis/archestimator/src/app/globals.css:82,94,99 (`--font-mono` mapped to roboto-mono; body + landing use `--font-sf-pro`)
- grep `font-mono`: only `src/app/{about,features,pricing,contact}/*` and `src/components/landing/*` — none under workshop/share
Current metric:
- 1 preloaded WOFF2 (Roboto Mono latin) on 100% of routes incl. mono-free authed pages.
Target metric:
- Roboto Mono fetched only on routes that render `font-mono` (marketing/landing), or preload disabled so it is fetched on demand.
Recommended action:
- Plan to either (a) set `preload:false` on the Roboto_Mono config so the file is fetched only when `font-mono` actually renders, or (b) move the font declaration into a marketing/landing layout segment rather than the root layout. Keep `display:swap` (already the default) and the latin subset. Confirm no authed surface visibly depends on `font-mono` before scoping it out of the root.
Validation gate:
- Network panel on `/workshop/projects` shows no Roboto Mono request (or no preload); marketing pages still render mono eyebrows/numerics correctly.
Risk:
- Disabling preload can cause a brief swap flash of mono text on marketing pages on first paint; acceptable with `display:swap` and acceptable given mono is decorative (eyebrows/labels).
Rollback/deletion criteria:
- Re-enable preload if a CLS/FOUT regression appears on marketing-page mono headers in a live capture.

---

### AS03 — ~10MB of orphaned/dead assets shipped in public/ (Cards, screenshot, frosted PNG, logo PNG, starter SVGs)

Severity: Low
Confidence: Verified
Bottleneck class: IMAGE_ASSET
Affected surface: `public/` static bundle (repo + deploy artifact, not JS bundle)
User symptom: No direct runtime symptom (these are unreferenced so not requested by users), but they bloat the repo/deploy artifact and create a risk of accidental future reference at full uncompressed size.
Technical cause: grep across `src/` finds no references to: `public/Cards/{Templates,Projects,Components}-Card.jpg` (~6MB total), `public/Screenshot 2026-05-18 at 9.00.39 PM.png` (968KB), `public/landing/archestimator-frosted-construction.png` (2.3MB), `public/archestimator_logo.png` (700KB — the logo component uses the SVG instead), and the Next starter SVGs `public/{next,vercel,window,globe,file}.svg`. They are dead weight.
Evidence:
- `du -k` of public/: `Cards/*.jpg` ~2.2MB+1.9MB+1.8MB; `sidebar-BG.png` 2.7MB; `archestimator-frosted-construction.png` 2.3MB; `Screenshot 2026...png` 968KB; `archestimator_logo.png` 700KB
- `grep -rEn 'Templates-Card|Projects-Card|Components-Card|Screenshot 2026|frosted-construction|archestimator_logo' src/` → only Storybook 'Cards/' titles + the SVG logo; no PNG/jpg references
- `grep next.svg|vercel.svg|window.svg|globe.svg|file.svg` in src/ → none
- `ls public/` confirms files exist
Current metric:
- ~10MB unreferenced public assets (verified by du + grep).
Target metric:
- Orphaned assets removed; only referenced assets remain in `public/`.
Recommended action:
- Plan a cleanup pass to delete confirmed-orphan public assets (the three Cards JPGs, the dev Screenshot PNG, frosted-construction PNG, the 700KB logo PNG superseded by the SVG, and the five Next starter SVGs). Confirm each is unreferenced (no dynamic string concatenation, no manifest, no email template) before removing. Do not touch `component-thumbnails/` or `landing/hero-slides/` which are referenced.
Validation gate:
- Build succeeds; grep confirms zero references; visual check of landing/sidebar/logo unchanged.
Risk:
- Low — only delete after confirming no dynamic reference; `sidebar-BG.png` and hero-slides are referenced and must be kept.
Rollback/deletion criteria:
- Restore any asset if a 404 or missing-image regression appears in a live page check.

---

### AS04 — 2.7MB unoptimized sidebar-BG.png served as CSS background on every authed page

Severity: Medium
Confidence: Verified
Bottleneck class: IMAGE_ASSET
Affected surface: All `/workshop` authed routes (sidebar header)
User symptom: On a cold cache, the authed app downloads a 2.7MB PNG for a small decorative sidebar-header background, competing for bandwidth with the route's data/JS and slowing perceived first render.
Technical cause: `src/components/sidebar/SidebarHeader.tsx` sets `backgroundImage: url('/sidebar-BG.png')`. As a CSS background it bypasses `next/image` entirely — no resizing, no WebP/AVIF conversion, no responsive srcset. A 2.7MB PNG is enormous for a sidebar accent. Cached after first load, but the cold-load cost lands on every new authed session and is the single largest static asset that is actually referenced.
Evidence:
- /Users/philiplewis/archestimator/src/components/sidebar/SidebarHeader.tsx:39 (`backgroundImage: url("/sidebar-BG.png")`; verified)
- `du -k public/sidebar-BG.png` = 2708 KB (verified)
- Sidebar renders on authed routes whose largest-initial-JS profile is already flagged (estimates/charts/project detail)
Current metric:
- 2.7MB PNG on cold authed load (verified file size).
Target metric:
- Sidebar background under ~50-100KB via compressed WebP/AVIF at the actual rendered dimensions.
Recommended action:
- Plan to re-encode the sidebar background to WebP/AVIF at the real display size (likely a few hundred px) and/or replace the CSS background with a `next/image` fill element so it gets format negotiation and proper sizing. If the asset is purely decorative, consider a CSS gradient/SVG instead of a raster. Measure the cold-load delta on `/workshop/projects`.
Validation gate:
- Network panel on a fresh authed load shows the sidebar background under target size in a modern format; sidebar visual unchanged.
Risk:
- Low visual risk if re-encoded at adequate quality; CSS-background-to-`next/image` swap touches layout and must preserve the existing header composition.
Rollback/deletion criteria:
- Revert to the PNG if re-encoding introduces visible banding/artifacts in the sidebar header.

---

### AS05 — Share-page priority LCP cover image is effectively inert — normalizer rejects the private bucket where covers actually live

Severity: Medium
Confidence: Likely
Bottleneck class: IMAGE_ASSET
Affected surface: `/share/*` (public share pages)
User symptom: Share recipients rarely see the project cover hero; the "priority" LCP image the component is built around usually renders nothing, so the intended above-the-fold hero is absent.
Technical cause: `SharePageHero` declares the cover as a priority `next/image` (intended LCP). But `normalizePublicationImageUrl` (applied at snapshot capture in `snapshot.ts` and again in the hero) only accepts `/component-thumbnails/*` or the PUBLIC `component-images` bucket, and explicitly rejects any `/project-images/` path. Project covers are uploaded via `/api/projects/images` into the PRIVATE `project-images` bucket and surfaced as `/api/projects/images?path=...` route URLs — neither a public `component-images` URL nor a local thumbnail — so the normalizer returns null and the hero renders nothing. `next.config` `remotePatterns` also only allow `component-images`, so even if the URL slipped through, the optimizer would reject it. Net: the "LCP cover" path is largely dead for normally-uploaded covers.
Evidence:
- /Users/philiplewis/archestimator/src/components/share/SharePageHero.tsx:24-40 (priority Image; returns null when `coverImageUrl` is null — verified lines 24,26-27,33)
- /Users/philiplewis/archestimator/src/lib/publication/image-url.ts:4-43 (rejects `/project-images/`, requires `component-images` public bucket; verified line 5 prefix + multiple `return null` guards)
- /Users/philiplewis/archestimator/src/lib/publication/actions.ts:425-428 (cover read from metadata `projectImageUrl`/`coverImageUrl`)
- /Users/philiplewis/archestimator/src/app/api/projects/images/route.ts:15,202-206 (covers stored in private `project-images` bucket, served via API route URL)
- /Users/philiplewis/archestimator/next.config.ts:45 (`remotePatterns` only `component-images/**`; verified)
Current metric:
- Share hero cover renders null for `project-images`-sourced covers (code-path inference); LCP element is then text/structure not the intended image.
Target metric:
- Either the share hero reliably renders an optimized cover (with a deliberately-allowed source) OR the dead priority-image path is removed so it is not mistaken for an LCP optimization.
Recommended action:
- Plan a decision: if share covers should display, define a sanctioned, signed/CDN-friendly public cover URL captured at publish time (and add its host to `remotePatterns` + the share CSP `img-src`), preserving noindex/no-referrer. If covers should stay private/absent on shares, remove the inert priority cover path so it is not counted as an LCP win. Confirm actual cover URL shapes in production metadata before choosing. Any chosen remote host MUST be reflected in the enforced `/share` CSP `img-src` and must not weaken no-referrer/noindex.
Validation gate:
- On a real shared link, the hero either renders the cover via an allowed optimized source or is intentionally absent; share security headers (noindex, no-referrer, enforced CSP) unchanged.
Risk:
- Adding a new image host to `remotePatterns`/CSP widens the share attack surface and must be tightly scoped; mis-scoping could leak private covers or weaken CSP.
Rollback/deletion criteria:
- Revert any `remotePatterns`/CSP widening if it admits unintended hosts or if private covers become reachable; restore null-render behavior.

---

### AS06 — Design-system "SF Pro" claim reconciled: SF Pro is system-stack (no download); Roboto Mono is the only actually-downloaded font

Severity: Low
Confidence: Verified
Bottleneck class: FONT
Affected surface: All routes (typography)
User symptom: No symptom; this resolves the README/DESIGN.md vs `layout.tsx` apparent contradiction. SF Pro is rendered from the local system font stack (zero network cost), so there is no missing webfont; the doc claim and the code are consistent once understood.
Technical cause: DESIGN.md/README claim the product font is "SF Pro". `layout.tsx` loads `next/font/google` Roboto_Mono. These are not in conflict: `globals.css` defines `--font-sf-pro` as a system stack (`'SF Pro Text','SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif`) applied to body and landing root, so SF Pro is never downloaded (falls back to platform fonts off-Apple). Roboto Mono is a genuine downloaded webfont used only via `font-mono` on marketing/landing.
Evidence:
- /Users/philiplewis/archestimator/src/app/globals.css:39 (`--font-sf-pro` system stack), :94 (body uses it), :82 (`--font-mono`=roboto-mono)
- /Users/philiplewis/archestimator/src/app/layout.tsx:7 (Roboto_Mono webfont)
- /Users/philiplewis/archestimator/DESIGN.md:352 ("SF Pro via the system stack")
- README.md:195 ("Font: SF Pro")
Current metric:
- Downloaded webfonts: 1 (Roboto Mono). SF Pro = system stack, 0 downloads (verified).
Target metric:
- Same — documentation should explicitly note SF Pro is system-stack and Roboto Mono is the only webfont, to avoid future confusion.
Recommended action:
- No perf change required. Plan a one-line documentation clarification (in DESIGN.md/README) stating SF Pro is delivered via the system stack and that Roboto Mono is the only downloaded webfont (latin/swap), so reviewers do not treat the apparent mismatch as a bug. Pair with AS02's scoping decision.
Validation gate:
- Docs reviewed; no code change; behavior unchanged.
Risk:
- None (documentation only).
Rollback/deletion criteria:
- N/A.

---

### AS07 — GA4 + Clarity third-party analytics: landing-only, consent-gated, afterInteractive — correctly isolated from public LCP/TBT-critical paint and from share/workshop

Severity: Low
Confidence: Verified
Bottleneck class: THIRD_PARTY
Affected surface: Landing/marketing routes only (`/`, `/about`, `/features`, `/pricing`, `/contact`, `/terms`, `/privacy`)
User symptom: None observed; analytics scripts do not block initial paint and do not load at all without analytics consent or on share/workshop pages.
Technical cause: `GoogleAnalytics` (`@next/third-parties/google`) and Clarity (`next/script` `strategy=afterInteractive`) are rendered only by `LandingAnalyticsLoader` inside `PublicPageShell`, which appears only on the public marketing pages. Both are gated behind `useLandingCookieConsent` (default `analytics:false`; server snapshot returns null→false) and behind presence of `NEXT_PUBLIC_GA_MEASUREMENT_ID` / `NEXT_PUBLIC_CLARITY_PROJECT_ID`. `afterInteractive` ensures they load after hydration, not in the critical path. The CSP (report-only on landing, enforced on `/share`) already allow-lists googletagmanager/google-analytics/clarity in script-src/connect-src/img-src.
Evidence:
- /Users/philiplewis/archestimator/src/components/landing/LandingAnalyticsLoader.tsx:7-22 (consent gate + env gate)
- /Users/philiplewis/archestimator/src/components/landing/ClarityScript.tsx:7-9 (`afterInteractive`)
- /Users/philiplewis/archestimator/src/components/landing/PublicPageShell.tsx:42 (mounted in marketing shell only)
- grep `PublicPageShell` → only `src/app/{page,about,privacy,contact,terms,features,pricing}.tsx`
- /Users/philiplewis/archestimator/src/lib/landing/useLandingCookieConsent.ts:40 (default `analytics:false`)
- /Users/philiplewis/archestimator/next.config.ts:16-20 (CSP allow-list)
Current metric:
- GA4+Clarity load only post-consent on marketing pages, `afterInteractive` (verified by code path). No third-party scripts on `/share` or `/workshop`.
Target metric:
- Maintain current isolation; no third-party analytics on share/workshop/public-LCP-critical paint.
Recommended action:
- No change needed. Note as a positive control. If post-consent TBT on marketing pages is ever a concern, plan to measure GA/Clarity main-thread cost with Speed Insights (AS01) once RUM is wired; until then there is no evidence of a TBT problem from these scripts.
Validation gate:
- Live capture (blocked this session) would confirm GA/Clarity absent pre-consent and absent on `/share` & `/workshop`.
Risk:
- None from current state; keep CSP allow-list scoped to the three tracking hosts.
Rollback/deletion criteria:
- N/A (no change).

---

### AS08 — Vercel Web Analytics mounted once with strong share-link URL redaction (no double-load, tokens not leaked)

Severity: Low
Confidence: Verified
Bottleneck class: THIRD_PARTY
Affected surface: All routes (root layout)
User symptom: None; analytics is mounted exactly once and tokenized/authed URLs are stripped from analytics events, protecting share-link recipients.
Technical cause: `VercelWebAnalytics` (`@vercel/analytics/next`) is rendered a single time in `src/app/layout.tsx` body. Its `beforeSend=redactVercelAnalyticsEvent` returns null (drops the event entirely) for any URL under `/share`, `/invite`, or `/workshop`, and normalizes/strips query+hash otherwise. No second mount exists anywhere. This preserves the share-link security posture (no `?recipient=` token or workshop path leaked to analytics).
Evidence:
- /Users/philiplewis/archestimator/src/app/layout.tsx:28 (single `VercelWebAnalytics`; verified)
- grep `<Analytics` src/ → only `VercelWebAnalytics.tsx` (no double mount)
- /Users/philiplewis/archestimator/src/lib/analytics/vercel-web-analytics.ts:5-49 (drops `/share`,`/invite`,`/workshop`; strips search/hash — verified prefixes lines 5-6, `return null` guards 26-43)
- nested layouts (workshop/library/project) do not re-mount analytics (verified)
Current metric:
- 1 analytics mount; events for `/share`,`/invite`,`/workshop` dropped (verified by redactor logic).
Target metric:
- Maintain single mount + redaction; extend the same redaction to Speed Insights when added (AS01).
Recommended action:
- No change. When wiring Speed Insights (AS01), reuse this redaction pattern so its beacon also drops/sanitizes tokenized and authed URLs. Note as a positive control for the share-link security requirement.
Validation gate:
- N/A (no change); covered by existing redactor unit behavior.
Risk:
- None.
Rollback/deletion criteria:
- N/A.

---

### AS09 — Landing WebGL (Neat/three) and Lenis smooth scroll are well-gated; minor Lenis bundle ships to reduced-motion users on /

Severity: Low
Confidence: Verified
Bottleneck class: BUNDLE_WEIGHT
Affected surface: Landing home page `/` (`NeatWireframeBackground`, `LandingSmoothScrollProvider`)
User symptom: Negligible; the heavy three.js/`@firecms/neat` WebGL bundle is never loaded for reduced-motion/touch/mobile users, and the static gradient paints immediately. The only minor cost is the Lenis library bundling into the `/` client even when reduced-motion disables it at runtime.
Technical cause: `NeatWireframeBackground` is `dynamic(ssr:false)` with `loading:null`, only activates when NOT (reduced-motion || coarse-pointer || <768px), defers via `requestIdleCallback` (1800ms timeout), dynamically `import()`s `@firecms/neat` only on activation, and pauses via IntersectionObserver when off-screen — so three.js/neat never enter the bundle path for excluded users. `LandingSmoothScrollProvider` gates Lenis activation on `prefers-reduced-motion`, but because it is a static import in a `'use client'` component, the Lenis code is still in the `/` client bundle even when reduced-motion short-circuits to plain children at runtime. Lenis is only on `/` (`page.tsx`), not other marketing pages.
Evidence:
- /Users/philiplewis/archestimator/src/components/landing/HeroSection.tsx:11-16 (`dynamic ssr:false`), :329 (mount)
- /Users/philiplewis/archestimator/src/components/landing/NeatWireframeBackground.tsx:6,56-91,116 (fallback query, idle defer, dynamic import, IO pause)
- /Users/philiplewis/archestimator/src/components/landing/LandingSmoothScrollProvider.tsx:3-4 (static import lenis), :33-41 (reduced-motion gate at runtime)
- /Users/philiplewis/archestimator/src/app/page.tsx:33 (Lenis provider only on `/`)
Current metric:
- WebGL bundle: 0 for reduced-motion/touch/mobile (dynamic). Lenis: in `/` client bundle regardless of reduced-motion (static import).
Target metric:
- Lenis also code-split so reduced-motion users on `/` do not download it; WebGL gating unchanged.
Recommended action:
- No change required for Neat (already exemplary). Optionally plan to lazy-load Lenis (dynamic import the ReactLenis path) only when reduced-motion is false, mirroring the Neat pattern, to shave the landing client bundle for reduced-motion users. Low priority given Lenis is small relative to the three.js stack already deferred.
Validation gate:
- Bundle/network on `/` with `prefers-reduced-motion` shows no Lenis chunk; smooth scroll still works for motion-allowed users.
Risk:
- Low; dynamic-importing the scroll provider could introduce a one-frame non-smooth scroll before activation for motion-allowed users.
Rollback/deletion criteria:
- Revert to static import if dynamic loading causes a visible scroll-init jank on `/`.

---

### AS10 — Private project images bypass next/image (served via Node API route, 5-min browser cache, no edge/optimizer transform)

Severity: Low
Confidence: Verified
Bottleneck class: IMAGE_ASSET
Affected surface: `/workshop` project detail + project modals (private cover/thumbnail images)
User symptom: On cache miss, each private project image re-downloads from Supabase storage through a Node serverless function rather than a CDN/edge, and is not re-transformed/resized by `next/image` at request time; modest latency on first view.
Technical cause: Private images live in the `project-images` bucket and are served by `/api/projects/images` GET (runtime nodejs) with `Cache-Control private, max-age=300`. Uploads ARE sharp-optimized to WebP at capped dimensions (1600px main, 512px thumb, quality 82/85) at write time, which is good. But reads cannot use `next/image` (`remotePatterns` only allow the public `component-images` host, and an API route URL is not a remote pattern host), so the raw `<img>` tags in `ProjectDetailsModal` / `NewProjectImagePanel` are unavoidable and there is no per-request responsive srcset or CDN edge cache; every 5-minute expiry triggers a fresh Node-function fetch from storage.
Evidence:
- /Users/philiplewis/archestimator/src/app/api/projects/images/route.ts:13,202-206 (nodejs runtime, private max-age=300), :251-261 (sharp WebP optimization on upload)
- /Users/philiplewis/archestimator/src/components/workshop/ProjectDetailsModal.tsx:198 (raw `<img>` on /api route url)
- /Users/philiplewis/archestimator/src/components/workshop/NewProjectImagePanel.tsx:33 (raw `<img>` on blob/preview)
- /Users/philiplewis/archestimator/next.config.ts:45 (`remotePatterns` exclude private bucket)
Current metric:
- Private images: WebP-optimized at upload (good); served via Node route with 5-min browser cache, no CDN/edge cache, no read-time responsive sizing.
Target metric:
- Longer/edge-cached private image delivery (or signed-URL + `next/image`) reducing repeat Node-function fetches; responsive sizing for large covers.
Recommended action:
- Accept the raw `<img>` usage as correct (these cannot pass `remotePatterns`). Optionally plan to (a) lengthen the browser cache or add an edge/CDN cache layer for private images keyed to the immutable storage path (the uploaded path is content-addressed with `randomUUID`), or (b) issue short-lived signed Supabase URLs and let `next/image` optimize them by adding the signed host to `remotePatterns` — weighing the auth/RLS implications. Since upload-time optimization already exists, this is low priority. Any change must preserve the existing RLS/ownership checks in the GET handler.
Validation gate:
- Repeat views of a project cover hit cache (or edge) rather than re-invoking the Node function; ownership/RLS checks unchanged; share pages remain unaffected (`project-images` stays out of shares per AS05).
Risk:
- Signed-URL + `remotePatterns` widening touches the security boundary and must keep RLS intact; cache-lengthening risks serving stale images after re-upload (mitigated by content-addressed paths).
Rollback/deletion criteria:
- Revert cache/edge changes if a stale-image or authorization regression appears in a live check.

---

## 4. Dimension tables & notes

## Measurement status (this session)

Live runtime measurement was BLOCKED: no dev server (ports 3000-3020 closed), dev-auth bypass disabled, no Playwright storage state, and build/next dev were deliberately not run (shared `.next`, concurrent agents). All file/size/code claims below are VERIFIED by direct Read/Grep/du. No runtime numbers were fabricated; archive evidence is cited where relevant.

## Reconciliation matrix (brief claim vs verified reality)

| Brief / doc claim | Verified reality | Verdict |
|---|---|---|
| README/DESIGN.md font = "SF Pro" | SF Pro = system stack (`--font-sf-pro`), zero downloads; only Roboto Mono is downloaded | Reconciled (AS06) — not a bug |
| layout.tsx loads Roboto_Mono via next/font/google | Confirmed; latin subset; no `display`→defaults to swap; no `preload:false`→preloaded app-wide | Confirmed + AS02 scope issue |
| @vercel/analytics present, @vercel/speed-insights likely NOT | Confirmed: analytics present + mounted once; speed-insights absent from package.json, node_modules, and src | Confirmed (AS01 launch gap) |
| @next/third-parties + GA4/Clarity — consent-gated? landing-only? | Both: landing-only (PublicPageShell), consent-gated (default false), env-gated, afterInteractive | Confirmed good (AS07) |
| Analytics double-loading risk | None — single mount, no nested re-mount | Confirmed clean (AS08) |
| NeatWireframeBackground three.js/WebGL cost | dynamic ssr:false + reduced-motion/touch/mobile gate + idle defer + IO pause + static fallback | Confirmed excellent (AS09) |
| Lenis smooth scroll cost | reduced-motion gated at runtime, only on `/`; but statically imported (bundle ships) | Confirmed + minor (AS09) |
| images.remotePatterns limited to component-images/** | Confirmed; consequence: private project-images + share covers can't use optimizer | Confirmed (AS05, AS10) |
| Share links preserve noindex/no-referrer/CSP | Confirmed unchanged; analytics redactor drops /share events | No rec breaks this |

## next/image vs raw <img> inventory

| File | Usage | Source kind | Optimized? | Notes |
|---|---|---|---|---|
| landing/HeroSection.tsx | next/image fill, slide[0] `priority`+sizes | local /landing/hero-slides/*.jpg | yes | 9 slides; only first has priority (correct). Carousel = Ken Burns CSS |
| share/SharePageHero.tsx | next/image fill+priority+sizes+aspect wrapper | normalized public component-images URL | yes | LCP-intended but usually null (AS05) |
| share/ShareEstimateTree*/Panel/Tabs.tsx | next/image | public component-images | yes | row thumbnails |
| brand/ArchestimatorLogo.tsx | next/image w/h | /archestimator_logo(_white).svg | passthrough (SVG) | uses SVG, NOT the 700KB PNG |
| sidebar/MainSidebar.tsx | next/image | local/public | yes | — |
| library/ComponentInspectorDock.tsx | next/image fill+sizes WITH guard | `isNextImageSafeSource` → else raw <img> | conditional | defensive fallback (correct) |
| component-library-manager/* | next/image | public component-images | yes | — |
| sidebar/SidebarHeader.tsx | CSS background-image | /sidebar-BG.png (2.7MB) | NO | bypasses optimizer (AS04) |
| workshop/ProjectDetailsModal.tsx | raw <img> | /api/projects/images URL or blob | NO (justified) | private API route, can't pass remotePatterns (AS10) |
| workshop/NewProjectImagePanel.tsx | raw <img> | blob preview URL | N/A | local preview — correct |

## public/ asset size audit (du -k)

| Asset | Size | Referenced in src? | Verdict |
|---|---|---|---|
| sidebar-BG.png | 2.7MB | YES (CSS bg, SidebarHeader) | AS04 — optimize |
| landing/archestimator-frosted-construction.png | 2.3MB | NO | AS03 orphan |
| Cards/Templates-Card.jpg | 2.2MB | NO (only Storybook title "Cards/") | AS03 orphan |
| Cards/Projects-Card.jpg | 1.9MB | NO | AS03 orphan |
| Cards/Components-Card.jpg | 1.8MB | NO | AS03 orphan |
| Screenshot 2026-05-18 at 9.00.39 PM.png | 968KB | NO | AS03 orphan (dev cruft) |
| archestimator_logo.png | 700KB | NO (logo uses .svg) | AS03 orphan |
| landing/hero-slides/*.jpg (9) | 204–408KB each (~2.6MB) | YES | OK (next/image, priority on first) |
| favicon_io/android-chrome-512x512.png | 150KB | YES (manifest) | OK |
| favicon_io/* (ico/16/32/apple/192) | <22KB each | YES | OK |
| {next,vercel,window,globe,file}.svg | <1.4KB each | NO | AS03 orphan (Next starter) |
| component-thumbnails/ (91 jpg) | 4.5MB total | YES (seed/demo) | OK on-demand; consider trimming seed set later |
| component-images public bucket (Supabase) | remote | remotePatterns allow | OK (only remote host allowed) |

## Font posture (verified)

- Roboto Mono: `next/font/google`, `subsets:['latin']`, no `display` set → **swap** (non-blocking), no `preload:false` → **preloaded** on every route. Self-hosted by next/font (no fonts.googleapis/gstatic request — grep confirmed zero external font links).
- SF Pro: pure system stack in `--font-sf-pro`; body + landing root use it; **zero font downloads**.
- font-mono usage: marketing/landing only (about, features, pricing, contact, ProductPreview eyebrows/numerics). None under `/workshop` or `/share` → AS02 (app-wide preload is wasted on authed routes).

## Third-party / analytics load map

| Script | Where mounted | Gate | Strategy | On /share? | On /workshop? |
|---|---|---|---|---|---|
| Vercel Web Analytics | root layout (1x) | always | @vercel/analytics/next | event dropped via beforeSend | event dropped via beforeSend |
| GA4 (@next/third-parties) | PublicPageShell→LandingAnalyticsLoader | consent.analytics + GA env id | (afterInteractive via third-parties) | NO | NO |
| MS Clarity | LandingAnalyticsLoader→ClarityScript | consent.analytics + Clarity env id | next/script afterInteractive | NO | NO |
| Vercel Speed Insights | **NOT WIRED** | — | — | — | — (AS01) |
| @firecms/neat (three/WebGL) | HeroSection (dynamic ssr:false) | !reduced-motion & !touch & ≥768px & idle | dynamic import on activate | NO | NO |
| Lenis | LandingSmoothScrollProvider (/ only) | !reduced-motion (runtime) | static import (in / bundle) | NO | NO |

## Budget critique (this dimension)

- The legacy e2e budgets (publicRoute 15000ms, slow3g 30000ms) are smoke/regression budgets, not readiness; they say nothing about image/font/analytics quality. The real readiness gate for this dimension is **field Core Web Vitals via Speed Insights, which is not collected at all (AS01)** — so there is currently no enforceable image/font/third-party readiness budget tied to real LCP/INP/CLS. Recommend (planning-level) that once AS01 lands, a per-route p75 LCP/INP/CLS budget on public + share + top-3 authed routes becomes the actual readiness gate, using the thresholds already encoded in `check-vercel-speed-insights-readiness.ts` (FCP≤1800, LCP≤2500, INP≤200, CLS≤0.1, TTFB≤800).

## Share-link security note (no rec breaks it)

All recommendations preserve the share posture: enforced CSP on `/share`, no-referrer, X-Robots noindex/nofollow, analytics-event drop for `/share` & `/invite`. AS05's optional cover-image enablement is explicitly conditioned on adding any new host to BOTH `remotePatterns` AND the enforced `/share` CSP `img-src` without weakening no-referrer/noindex; AS10 keeps `project-images` out of shares. No recommendation introduces an unindexed-leak or referrer-leak path.

---

## 5. Cross-references

- **03_ROUTE_SPEED_MATRIX.md** — AS04 (sidebar-BG.png cold-load) and AS01 (no field LCP/INP/CLS) feed per-route LCP/TBT rows; the share-route entry should reflect AS05 (cover hero usually absent → LCP element is text/structure, not the intended image).
- **12_OPTIMIZATION_BACKLOG.md** — sequence: AS01 (High, launch gate) → AS04 (Medium, cold-load weight) → AS05 (Medium, decision: enable-or-delete share cover) → AS02/AS03/AS09/AS10 (Low, hygiene/bundle). AS06/AS07/AS08 are positive controls (documentation-only / no-change).
- **13_RISK_REGISTER_AND_BLAST_RADIUS.md** — security-boundary-touching items to register: AS01 (RUM URL redaction must match the existing redactor or tokens leak), AS05 and AS10 (any `remotePatterns`/CSP widening = share/RLS attack-surface change). AS03 (orphan deletion) carries 404-regression risk if a dynamic reference is missed.
- **15_READINESS_DECISION.md** — AS01 is the dimension's launch-readiness blocker: the readiness script cannot return green without a live Speed Insights beacon emitting data. No image/font/third-party readiness claim can be made until field CWV are actually collected from a prod-like deployment.
