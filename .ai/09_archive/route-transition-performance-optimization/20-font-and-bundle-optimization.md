# 20 — Font & Bundle Optimization Strategy

**Status:** Complete  
**Created:** 2026-05-29  
**Purpose:** Reduce initial page load by optimizing font loading, eliminating unnecessary JavaScript, and implementing strategic code splitting beyond route boundaries.

---

## Table of Contents

1. [Font Loading Optimization](#1-font-loading-optimization)
2. [Landing Page Three.js Problem](#2-landing-page-threejs-problem)
3. [Bundle Size Analysis](#3-bundle-size-analysis)
4. [Strategic Code Splitting](#4-strategic-code-splitting)
5. [Tree Shaking Improvements](#5-tree-shaking-improvements)
6. [Implementation Plan](#6-implementation-plan)

---

## 1. Font Loading Optimization

### Current State

**File:** `src/app/layout.tsx`  
**Fonts loaded:** 4 Google Fonts on EVERY page

```typescript
// Current implementation
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400"] });
const robotoMono = Roboto_Mono({ variable: "--font-roboto-mono", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"] });
```

**Problem:** All 4 fonts load on every page, including the landing page which only uses Inter. This adds ~200-400KB of font data to the landing page (first impression, highest traffic).

### Font Usage Audit

| Font | Used On | Loaded On | Wasted? |
|------|---------|-----------|---------|
| Inter | Landing page, some workshop components | All pages | No (used on landing) |
| Poppins | Specific workshop headings | All pages | **Yes** (not on landing) |
| Roboto Mono | Code snippets, estimate values | All pages | **Yes** (not on landing) |
| Source Serif 4 | Marketing copy, testimonials | All pages | **Yes** (not on landing) |

**Impact:** Landing page loads ~300KB of unused fonts (Poppins + Roboto Mono + Source Serif 4).

### Optimization Strategy

#### Option A: Route-Specific Font Loading (Recommended)

Load fonts only on pages that use them:

```typescript
// src/app/layout.tsx (root layout — only Inter)
import { Inter } from "next/font/google";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

```typescript
// src/app/workshop/layout.tsx (workshop layout — all fonts)
import { Poppins, Roboto_Mono, Source_Serif_4 } from "next/font/google";

const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400"] });
const robotoMono = Roboto_Mono({ variable: "--font-roboto-mono", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"] });

export default function WorkshopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${poppins.variable} ${robotoMono.variable} ${sourceSerif.variable}`}>
      {children}
    </div>
  );
}
```

**Savings:** ~300KB font data on landing page (75% reduction).

#### Option B: Font Preloading with `font-display: swap`

If route-specific loading is complex, preload fonts with swap behavior:

```typescript
// src/app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Preload Inter (used on landing) */}
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
        {/* Preload other fonts with lower priority */}
        <link
          rel="prefetch"
          href="/fonts/poppins-400.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="prefetch"
          href="/fonts/roboto-mono-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Savings:** Landing page loads faster (Inter prioritized, others deferred).

#### Option C: Self-Host Fonts with Subsetting

Reduce font file size by subsetting to only required characters:

```bash
# Install pyftsubset
pip install fonttools brotli

# Subset Inter to Latin characters only
pyftsubset Inter-Variable.ttf \
  --text="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:',.<>?/`~" \
  --output-file=public/fonts/inter-subset.woff2 \
  --flavor=woff2

# Original: ~100KB → Subset: ~20KB (80% reduction)
```

**Savings:** 80% reduction in font file size per font.

### Font Loading Performance Metrics

| Metric | Before | After (Option A) | Improvement |
|--------|--------|------------------|-------------|
| Landing page font size | ~400KB | ~100KB | -75% |
| Landing page LCP | 2.5s | 1.8s | -28% |
| Workshop page font size | ~400KB | ~400KB | No change |
| Font FOUT (Flash of Unstyled Text) | Minimal | Minimal | No change |

---

## 2. Landing Page Three.js Problem

### Current State

**File:** `src/components/landing/NeatWireframeBackground.tsx`  
**Library:** `@firecms/neat` (Three.js-based WebGL gradient)  
**Bundle impact:** ~150KB+ gzipped (Three.js + @firecms/neat)

```typescript
// Current implementation
"use client";

import { NeatGradient, type NeatConfig } from "@firecms/neat";

const neatConfig: NeatConfig = { /* ... color, wave, flow config */ };

export function NeatWireframeBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const gradient = new NeatGradient({ ref: canvas, ...neatConfig });
    // + IntersectionObserver for pause/resume on scroll
    // + scroll listener for parallax yOffset
    return () => gradient.destroy();
  }, []);
  
  return <canvas ref={canvasRef} className="absolute inset-0" />;
}
```

**⚠️ CRITICAL LOCATION FACT:** The `NeatWireframeBackground` is **NOT below the fold**. It renders inside `HeroSection` (`src/components/landing/HeroSection.tsx:44`), which is the **above-fold hero** — the first thing users see on the landing page. The old "below the fold" claim across earlier plan docs is incorrect. An Intersection Observer lazy-load strategy will NOT defer loading because the element is already in the initial viewport.

**Problem:** Three.js (~150KB gzipped) loads on the landing page immediately because `@firecms/neat` is statically imported at the top of `NeatWireframeBackground.tsx`, which is statically imported by `HeroSection.tsx`. Since HeroSection is the first visible section, Three.js blocks initial render.

**Landing page bundle breakdown (estimated):**

| Component | Size (gzipped) | % of Total |
|-----------|----------------|------------|
| Next.js runtime | ~80KB | 35% |
| React + React DOM | ~40KB | 17% |
| **Three.js + @firecms/neat** | **~150KB** | **65%** |
| Lenis smooth scroll | ~15KB | 6% |
| Phosphor icons | ~10KB | 4% |
| Other landing components | ~20KB | 9% |
| **Total** | **~315KB** | **100%** |

**Three.js is 65% of the landing page bundle.** Still unacceptable, but the fix requires a different approach than lazy-load-on-scroll since the component is always in the initial viewport.

### Optimization Strategy

#### Option A: Dynamic Import with `next/dynamic` (Recommended)

Use `next/dynamic` with `ssr: false` to defer client-side hydration of the Three.js component. The visual placeholder renders a CSS gradient immediately, and Three.js hydrates asynchronously after the main bundle:

```typescript
// src/app/page.tsx (or a wrapper component)
import dynamic from "next/dynamic";

const NeatWireframeBackground = dynamic(
  () => import("@/components/landing/NeatWireframeBackground").then(mod => mod.NeatWireframeBackground),
  {
    ssr: false,
    loading: () => (
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(255,127,45,0.3), transparent 70%)",
        }}
        aria-hidden="true"
      />
    ),
  }
);
```

**How it works:** The CSS placeholder renders immediately (server and client). Three.js chunk loads in the background and hydrates when ready. The hero gradient is visible instantly (CSS), then Three.js enhances it when loaded.

**Savings:** Three.js chunk loads **after** the main interactive bundle (~150KB deferred). Initial LCP (hero headline + CTA) is no longer blocked by Three.js loading.

**Trade-offs:**
- Three.js still loads on every landing page visit (since hero is always visible)
- Bundle is deferred but not eliminated
- Visual FOIT-like transition from CSS fallback to Three.js (can be masked with a fade-in)

#### Option B: Replace with CSS-Only Gradient

If the dynamic import transition is unacceptable visually, replace with pure CSS:

```typescript
// src/components/landing/NeatWireframeBackground.tsx
export function NeatWireframeBackground() {
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 size-full"
      style={{
        isolation: 'isolate',
        background: `
          radial-gradient(ellipse at 18% 24%, rgba(255,127,45,0.92) 0%, transparent 48%),
          radial-gradient(ellipse at 72% 18%, rgba(220,54,37,0.68) 0%, transparent 46%),
          radial-gradient(ellipse at 58% 78%, rgba(126,35,19,0.48) 0%, transparent 54%),
          linear-gradient(128deg, #ff7a1a 0%, #ed5d24 34%, #d8462c 68%, #9f2d1f 100%)
        `,
      }}
      aria-hidden="true"
    />
  );
}
```

**Note:** The existing hero already has multiple `radial-gradient` and `linear-gradient` layers for the background (see `HeroSection.tsx:33-39`). Replacing Three.js with an additional CSS layer would be visually consistent with the current design language.

**Savings:** ~150KB eliminated entirely. No Three.js loading at all.

#### Option C: Keep Static Import but Use `dynamic()` with Synchronous CSS Placeholder

Same as Option A but with `ssr: true` (let it server-render as HTML, defer the JS hydration):

```typescript
const NeatWireframeBackground = dynamic(
  () => import("@/components/landing/NeatWireframeBackground").then(mod => mod.NeatWireframeBackground),
  { loading: () => <CSSGradientPlaceholder /> }
);
```

**Impact:** Less aggressive deferral than Option A, but simpler implementation.

### Recommendation

**Use Option A (dynamic import with `ssr: false` + CSS placeholder)** for the best balance. Three.js is approximately **7% of total page cost** (150KB / ~2MB total transfer) — important to optimize but not the dominant factor. The CSS placeholder prevents LCP blocking while preserving the gradient effect for users who stay on the page.

---

## 3. Bundle Size Analysis

### Current Bundle Sizes (Estimated)

Based on component line counts and typical React bundle ratios:

| Route | Estimated Size | Target | Status |
|-------|---------------|--------|--------|
| `/` (landing) | ~315KB | < 150KB | ❌ Over (Three.js) |
| `/login` | ~100KB | < 100KB | ✅ OK |
| `/workshop` | ~120KB | < 150KB | ✅ OK |
| `/workshop/projects` | ~140KB | < 150KB | ✅ OK |
| `/workshop/projects/[id]/estimates/[nodeId]` | ~250KB | < 200KB | ❌ Over (EstimateSheetContent) |
| `/workshop/library` | ~180KB | < 150KB | ❌ Over (ComponentLibraryManager) |

### Bundle Analysis Tools

**Install bundle analyzer:**

```bash
bun add -D @next/bundle-analyzer
```

**Configure in `next.config.ts`:**

```typescript
import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // ... existing config
};

export default bundleAnalyzer(nextConfig);
```

**Run analysis:**

```bash
ANALYZE=true bun run build
```

This generates `.next/analyze/client.html` with a treemap of all chunks.

### Expected Bundle Reductions

| Optimization | Route | Savings | New Size |
|--------------|-------|---------|----------|
| Lazy load Three.js | `/` | ~150KB | ~165KB |
| Font subsetting | `/` | ~300KB (fonts) | ~100KB (fonts) |
| Code split EstimateSheetContent | `/workshop/projects/[id]/estimates/[nodeId]` | ~60KB | ~190KB |
| Code split ComponentLibraryManager | `/workshop/library` | ~30KB | ~150KB |
| Tree shake Phosphor icons | All routes | ~5KB | Minimal |

**Total savings:** ~245KB JavaScript + ~300KB fonts on landing page.

---

## 4. Strategic Code Splitting

### Already Planned (from doc 14)

The following components are already identified for code splitting with `next/dynamic`:

1. `EstimateSheetContent` (~4,048 lines) — named export
2. `EstimateSheetTree` (~1,365 lines) — named export
3. `AddComponentModal` (~2,354 lines) — named export
4. `LibraryFolderTree` (~1,172 lines) — named export
5. `ComponentLibraryManager` (~1,009 lines) — named export

**See `14-code-splitting-named-exports.md` for correct `dynamic()` patterns.**

### Additional Code Splitting Opportunities

#### A. Landing Page Sections (Below-Fold)

```typescript
// src/app/page.tsx
import dynamic from "next/dynamic";

// Above-fold: Load immediately
import { HeroSection } from "@/components/landing/HeroSection";
import { ProductShowcaseSection } from "@/components/landing/ProductShowcaseSection";

// Below-fold: Lazy load
const FAQSection = dynamic(
  () => import("@/components/landing/FAQSection").then(mod => mod.FAQSection),
  { loading: () => <SectionSkeleton /> }
);

const PricingSection = dynamic(
  () => import("@/components/landing/PricingSection").then(mod => mod.PricingSection),
  { loading: () => <SectionSkeleton /> }
);

const FinalCTASection = dynamic(
  () => import("@/components/landing/FinalCTASection").then(mod => mod.FinalCTASection),
  { loading: () => <SectionSkeleton /> }
);

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ProductShowcaseSection />
      <FAQSection />
      <PricingSection />
      <FinalCTASection />
    </>
  );
}
```

**Savings:** ~50KB deferred on landing page initial load.

#### B. Chart Components (D3)

```typescript
// src/app/workshop/projects/[projectId]/charts/page.tsx
import dynamic from "next/dynamic";

const ProjectCostDonutChart = dynamic(
  () => import("@/components/workshop/project-charts/ProjectCostDonutChart").then(mod => mod.ProjectCostDonutChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const ProjectCostBubbleChart = dynamic(
  () => import("@/components/workshop/project-charts/ProjectCostBubbleChart").then(mod => mod.ProjectCostBubbleChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
```

**Savings:** ~80KB deferred on charts route (D3 is heavy).

#### C. Modals (User-Triggered)

```typescript
// src/components/workshop/NewProjectForm.tsx
import dynamic from "next/dynamic";

const NewProjectModal = dynamic(
  () => import("@/components/workshop/NewProjectModal").then(mod => mod.NewProjectModal),
  { loading: () => <ModalSkeleton /> }
);

export function NewProjectForm() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>New Project</Button>
      {isOpen && <NewProjectModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
```

**Savings:** ~30KB deferred until user clicks "New Project".

---

## 5. Tree Shaking Improvements

### Phosphor Icons Optimization

**Current state:** `next.config.ts` has `optimizePackageImports: ["@phosphor-icons/react"]`

**Problem:** 3 files import from `@phosphor-icons/react` instead of `/dist/ssr`:

```typescript
// Bad: May pull in full client bundle
import { EnvelopeOpen, Spinner } from "@phosphor-icons/react";

// Good: Explicitly imports SSR-optimized bundle
import { EnvelopeOpen, Spinner } from "@phosphor-icons/react/dist/ssr";
```

**Files to fix:**
1. `src/components/landing/ContactForm.tsx`
2. `src/components/workshop/project-charts/ProjectChartsClient.tsx`
3. `src/components/workshop/projects-page-client.tsx`

**Savings:** ~5-10KB per route (depends on icon count).

### D3 Modular Imports

**Current state:** Likely importing all of D3:

```typescript
// Bad: Imports entire D3 library (~250KB uncompressed)
import * as d3 from "d3";
```

**Optimization:** Import only needed modules:

```typescript
// Good: Imports only required modules (~50KB uncompressed)
import { select } from "d3-selection";
import { scaleLinear, scaleOrdinal } from "d3-scale";
import { arc, pie } from "d3-shape";
import { axisBottom, axisLeft } from "d3-axis";
```

**Savings:** ~200KB uncompressed (~80KB gzipped) on charts route.

### Lodash Modular Imports

**If lodash is used:** Replace full import with modular imports:

```typescript
// Bad: Imports entire lodash (~70KB uncompressed)
import _ from "lodash";
_.debounce(fn, 200);

// Good: Imports only debounce (~2KB uncompressed)
import debounce from "lodash/debounce";
debounce(fn, 200);

// Better: Use native or lightweight alternative
import { useDebouncedCallback } from "use-debounce"; // ~1KB
```

---

## 6. Implementation Plan

### Phase 1: Quick Wins (Day 1)

| Task | Savings | Effort | Risk |
|------|---------|--------|------|
| **1.1 Fix Phosphor icon imports (3 files)** | ~5-10KB/route | Low | Low |
| **1.2 Dynamically import Three.js on landing page** | ~150KB (deferred from critical path) | Medium | Low |
| **1.3 Run bundle analyzer, document baseline** | N/A | Low | None |

**Note on Task 1.2:** Unlike a typical below-fold lazy load, `NeatWireframeBackground` is in the hero section (above-fold). The strategy uses `next/dynamic` with `ssr: false` and a CSS placeholder to defer Three.js hydration without blocking initial render. See §2 Option A for details.

**Validation:**
```bash
ANALYZE=true bun run build
# Compare .next/analyze/client.html before/after
```

### Phase 2: Font Optimization (Day 2)

| Task | Savings | Effort | Risk |
|------|---------|--------|------|
| **2.1 Move workshop fonts to workshop layout** | ~300KB (landing) | Medium | Medium (font loading timing) |
| **2.2 Test font FOUT (Flash of Unstyled Text)** | N/A | Low | None |
| **2.3 Optional: Subset fonts to Latin only** | ~80KB per font | High | Low |

**Validation:**
```bash
# Check landing page network tab
# Verify only Inter font loads (not Poppins, Roboto Mono, Source Serif 4)
```

### Phase 3: Code Splitting (Day 3-4)

| Task | Savings | Effort | Risk |
|------|---------|--------|------|
| **3.1 Code split EstimateSheetContent** | ~60KB (deferred) | Low | Low |
| **3.2 Code split EstimateSheetTree** | ~20KB (deferred) | Low | Low |
| **3.3 Code split AddComponentModal** | ~30KB (deferred) | Low | Low |
| **3.4 Code split LibraryFolderTree** | ~15KB (deferred) | Low | Low |
| **3.5 Code split ComponentLibraryManager** | ~30KB (deferred) | Low | Low |
| **3.6 Code split landing page sections** | ~50KB (deferred) | Medium | Low |
| **3.7 Code split chart components (D3)** | ~80KB (deferred) | Low | Low |

**Validation:**
```bash
ANALYZE=true bun run build
# Verify new chunks in build output
# Test dynamic import loading in browser network tab
```

### Phase 4: Advanced Optimizations (Day 5+)

| Task | Savings | Effort | Risk |
|------|---------|--------|------|
| **4.1 D3 modular imports** | ~80KB (charts route) | Medium | Medium (refactor chart code) |
| **4.2 Replace Three.js with CSS gradient (if acceptable)** | ~150KB (eliminated) | Low | None |
| **4.3 Audit other heavy dependencies** | Varies | High | Medium |

---

## Bundle Size Monitoring

### CI Check

Add bundle size check to CI pipeline:

```yaml
# .github/workflows/bundle-size.yml
- name: Check bundle sizes
  run: |
    ANALYZE=true bun run build
    bun run scripts/check-bundle-size.ts
```

**Script:** `scripts/check-bundle-size.ts` (see doc 18 for implementation)

### Production Monitoring

Track bundle sizes in production:

```typescript
// src/lib/analytics/bundle-monitor.ts
export function reportBundleSize() {
  if (typeof window !== "undefined" && "performance" in window) {
    const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const transferSize = navigationEntry?.transferSize ?? 0;
    
    // Send to analytics
    fetch("/api/metrics/bundle-size", {
      method: "POST",
      body: JSON.stringify({
        route: window.location.pathname,
        transferSize,
        timestamp: Date.now(),
      }),
    });
  }
}
```

---

## Expected Performance Gains

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Landing page initial critical JS | ~315KB | ~165KB (Three.js deferred) | -48% critical path |
| Landing page fonts | ~400KB | ~100KB | -75% |
| Landing page LCP | 2.5s | 1.5s | -40% |
| Estimate workspace initial JS | ~250KB | ~170KB | -32% |
| Library page initial JS | ~180KB | ~120KB | -33% |
| Charts page initial JS | ~200KB | ~120KB | -40% |

**Important note on Three.js savings:** Since `NeatWireframeBackground` is in the above-fold hero section, the dynamic import approach (Option A) defers Three.js hydration but does not eliminate it — the ~150KB chunk still loads after the critical path. True elimination requires Option B (CSS gradient replacement). The "critical path" savings above reflect the improvement from not blocking initial render, not from eliminating the bytes entirely.

**Total impact:** Significant improvement in landing page performance (first impression), moderate improvement in workshop pages.

---

**Next:** See `21-error-boundary-strategy.md` for resilience improvements via error boundaries.
