# 16 - Dependency, Cache, and Image Decision Matrix

**Date**: 2026-06-11
**Purpose**: Turn package/cache/image questions into explicit implementation gates instead of ad hoc optimization guesses.
**Status**: Source-audited; runtime measurement and provider proof pending.

---

## Evidence Snapshot

| Surface | Current evidence | Planning impact |
|---------|------------------|-----------------|
| Redis / Upstash package | No Redis, Upstash, or KV dependency in `package.json` | Do not add Redis by default for the path-to-sheet work. It needs a measured shared-cache or rate-limit problem first. |
| Next.js cache docs | Local Next 16 docs say `use cache: remote` adds durable shared caching but also storage, network latency, and platform cost | Remote cache is a costed architecture decision, not a default performance tweak. |
| Protected route cache headers | `src/proxy.ts` keeps `/workshop/*` on `private, no-cache, no-store` | Estimate sheet data must not be CDN/shared-cache optimized unless the data is proven non-secret and invalidation-safe. |
| React request cache | `getCurrentUserContext` and `getCurrentWorkspaceProject` already use React `cache()` | Preserve per-request dedupe; do not mistake it for cross-request persistence. |
| Component library eager load | Estimate sheet page still passes `getCurrentWorkspaceComponentLibrary()` through the initial server render | Prefer lazy/session client cache before remote cache. |
| In-memory rate limiters | Publication password/digest paths use in-memory `Map`; invite rate limiting uses provider/database-backed logic | Redis may be more relevant for shared-link/rate-limit durability than for the estimate-sheet performance path. Keep separate plans. |
| Next image config | `next.config.ts` configures Supabase Storage `remotePatterns` for `/storage/v1/object/public/component-images/**` and `sharp` is installed | Component thumbnails can move to `next/image` if URLs match the configured public storage path. |
| Inline image surfaces | `EstimateSheetContent.tsx`, `component-library/index.tsx`, and `ComponentCard.tsx` still use inline `backgroundImage` for component thumbnails | These bypass Next image sizing/srcset/lazy behavior and belong in the performance plan. |
| Landing hero image | `HeroSection.tsx` uses `next/image` with `priority`; local Next 16 docs deprecate `priority` in favor of `preload` | Future implementation should replace `priority` with `preload` only for the single LCP hero image. |
| Package import optimization | `next.config.ts` only optimizes `@phosphor-icons/react`; TanStack/Zustand optimization is unproven | Add `optimizePackageImports` only after bundle analyzer proof; do not cargo-cult config. |

---

## Decision Matrix

| Question | Default decision | Evidence required to change | Implementation gate |
|----------|------------------|-----------------------------|---------------------|
| Should this path add Redis / Upstash / KV now? | **No** | Measured repeated cross-request backend pressure on shared, non-secret data; clear invalidation model; cost approval | Add a cache ADR before dependency install. Include local fallback, invalidation tests, and provider-cost note. |
| Should component library data use Redis? | **No for Sprint 0-2** | Lazy/session cache still leaves first-open latency above budget under realistic fixture, and repeated requests overload Supabase | Try lazy load + client/TanStack cache first. Consider remote cache only for shared catalog summary, not user-specific sheet data. |
| Should estimate sheet/tree data use remote cache? | **No** | A non-secret derived snapshot is introduced with explicit authorization, RLS-safe keys, invalidation, and stale-data UX | Keep live protected estimate data sourced from Supabase with no-store semantics. |
| Should estimate-list totals use Redis? | **No** | SQL/RPC aggregate cannot meet payload/CPU targets and a derived shared summary is approved | Prefer Postgres aggregate/view/RPC with RLS parity; do not create distributed cache before database proof. |
| Should image thumbnails use `next/image`? | **Yes, if source URL is allowed** | If image is private/auth-required or outside `remotePatterns`, route through existing image API or keep unoptimized with explicit reason | Use `fill`, correct `sizes`, meaningful/empty `alt`, and no layout shift. |
| Should landing hero use `priority`? | **No on Next 16** | None; local Next 16 docs mark `priority` deprecated | Use `preload` for the single above-fold LCP hero candidate. Avoid preloading multiple rotating slides. |
| Should every image be preloaded? | **No** | Only one above-fold LCP image per viewport clearly benefits | Use `loading="lazy"` or default lazy behavior for non-LCP images. |
| Should `@tanstack/react-virtual` be installed? | **No by default** | Post-Sprint 0-2 profiling proves DOM count remains limiting | Dependency approval and QA for focus, drag/drop, cursor overlays, and off-screen selection. |
| Should `optimizePackageImports` include TanStack/Zustand? | **Maybe** | `ANALYZE=true bun run build` proves bundle impact and no build regression | Add one package at a time, measure route chunks before/after. |
| Should `react-complex-tree` be replaced? | **No in this plan** | Tree package itself is proven as the bottleneck after CSS scoping, memoization, and interaction tests | Replacement is separate product-risk work because tree behavior affects drag/drop and selection. |
| Should `@firecms/neat` / Three be removed from landing? | **No by default** | Landing trace shows WebGL idle import affects LCP/TBT or low-end device responsiveness | It is already dynamic, idle-activated, and reduced-motion aware; measure before cutting. |
| Should `roughjs` be removed? | **No by default** | Below-fold animation causes measurable scripting cost or layout instability | Keep if IntersectionObserver/rAF gating remains effective. |
| Should `exceljs` be optimized for this path? | **Not unless client bundle proof shows leakage** | Bundle analyzer shows ExcelJS in client chunks | It should remain server/API-only. Add import-boundary test if leakage appears. |

---

## Cache Architecture Rules

1. **Protected estimate data is not a Redis-first problem.** It is user-specific, RLS-protected, frequently mutating, and currently guarded by no-store route semantics.
2. **Use Postgres for aggregate truth first.** Estimate-list totals should move toward SQL/RPC/view parity before any distributed cache.
3. **Use session/client cache for opened UI panels first.** Component-library sidebar data should lazy load and cache in the client/session before remote cache is considered.
4. **Remote cache needs invalidation design.** Any Redis/KV proposal must state keys, TTL, tags, invalidation triggers, stale-data UX, cost, and failure fallback.
5. **Do not cache auth state globally.** Landing auth display can use a neutral CTA or display-only hint, but protected routes must keep secure `getUser()` validation.
6. **Do not let cache hide correctness bugs.** Every cached path needs stale-data, mutation, rollback, and permission-change tests.

---

## Image Optimization Rules

1. Use `next/image` for component thumbnails when the URL is public and matches `next.config.ts` `remotePatterns`.
2. Use `fill` only inside a stable-size relative container and always provide `sizes`.
3. Use `preload`, not `priority`, for the single true LCP hero image in Next 16.
4. Do not preload carousel/background images that may not become LCP.
5. Keep `unoptimized` only for authenticated/private images or cases where the default loader cannot fetch required headers.
6. Replace CSS `backgroundImage` only when the image remains decorative/accessibility-equivalent or proper `alt` text is provided.
7. Measure before/after transferred image bytes and LCP; do not count a component rewrite as an image optimization without network proof.

---

## Package Approval Checklist

Before adding any package:

- What route and metric does it improve?
- What existing package or platform capability was considered first?
- Is it already present transitively or can the current dependency solve the problem?
- What is the client bundle impact?
- Does it run on server, edge, browser, or all three?
- Does it introduce provider cost?
- Does it create a new secret or environment variable?
- Does it create RLS/auth/cache invalidation risk?
- What tests and browser QA prove it did not break the estimate path?

If the answer is uncertain, create a short ADR in this plan pack before installing.

---

## Implementation Placement

- Treat this matrix as a gate before U2, U4, U6, U10, and any package/config change.
- Update `13-implementation-readiness-plan.md` if a decision changes execution order.
- Update `14-adversarial-qa-matrix.md` with package/cache/image-specific QA rows when code is implemented.
- Archive evidence under `.ai/09_archive/store/<date>-path-sheet-package-cache-image/`.

