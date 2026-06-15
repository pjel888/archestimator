# Archestimator Landing Page Dependency Graph

## 1. Entry Points (Pages → Landing Components)

| Page | Imports from `@/components/landing` |
|------|-------------------------------------|
| `src/app/page.tsx` | `PublicPageShell`, `LandingHeader`, `LandingSmoothScrollProvider`, `LandingFooter`, `HeroSection`, `SecondaryClaimSection`, `CompanyProofCarouselSection`, `ProductShowcaseSection`, `SolutionSection`, `PricingSection`, `FAQSection`, `FinalCTASection` |
| `src/app/about/page.tsx` | `PublicPageShell` |
| `src/app/features/page.tsx` | `PublicPageShell` |
| `src/app/pricing/page.tsx` | `PublicPageShell` |
| `src/app/contact/page.tsx` | `PublicPageShell`, `ContactForm` |

---

## 2. Root Layout — Universal Dependency (Affects ALL Pages)

**`src/app/layout.tsx`**
- Imports `AppProviders` from `./providers`
- Imports fonts: `Inter`, `Poppins`, `Roboto_Mono`, `Source_Serif_4` (next/font/google)
- Imports global styles: `react-complex-tree/lib/style-modern.css`, `lenis/dist/lenis.css`, `./globals.css`
- **Impact**: Changes here affect every route including `/workshop/*`

**`src/app/providers.tsx`**
- Imports `QueryClientProvider` from `@tanstack/react-query`
- Imports `ToastProvider` from `@/components/ui/toast`
- **Impact**: React Query + Toast are mounted for ALL pages (landing + workshop)

---

## 3. Landing Component Internal Dependency Tree

```
PublicPageShell
├── LandingHeader
│   ├── next/link
│   ├── @phosphor-icons/react/dist/ssr (ArrowRight)
│   ├── @/components/brand/ArchestimatorLogo
│   │   ├── next/image
│   │   └── @/lib/ui/cn
│   └── ./constants (loginHref, workshopHref)
├── LandingFooter
│   ├── next/link
│   ├── @phosphor-icons/react/dist/ssr (ArrowRight)
│   ├── @/components/brand/ArchestimatorLogo
│   ├── ./MotionReveal
│   └── ./constants (loginHref, workshopHref)
└── LandingSmoothScrollProvider
    ├── lenis/react (ReactLenis)
    └── lenis (LenisOptions type)

HeroSection
├── next/link
├── ./NeatWireframeBackground
│   └── @firecms/neat (NeatGradient, NeatConfig)
└── ./constants (loginHref)

SecondaryClaimSection
├── @phosphor-icons/react/dist/ssr (ChartBar, FileXls, GitDiff, Package, TreeStructure)
└── ./MotionReveal

CompanyProofCarouselSection
└── ./company-proof-data
    └── (pure data/types — no external deps)

ProductShowcaseSection
└── ./ProductPreviewVariants
    └── (self-contained JSX — no external deps)

SolutionSection
├── ./SectionIntro
│   ├── ./CtaLink
│   │   └── next/link
│   └── ./constants (workshopHref)
└── ./MotionReveal

PricingSection
├── ./CtaLink
├── ./MotionReveal
└── ./constants (workshopHref)

FAQSection
├── @phosphor-icons/react/dist/ssr (CaretDown)
└── ./MotionReveal

FinalCTASection
├── next/link
├── @phosphor-icons/react/dist/ssr (ArrowRight)
├── ./MotionReveal
└── ./constants (workshopHref)

ContactForm
└── @phosphor-icons/react (EnvelopeOpen, Spinner)

AnnouncementBanner
├── next/link
├── @phosphor-icons/react/dist/ssr (X)
└── ./constants (workshopHref)

EstimatorEngineSection
├── ./CtaLink
├── ./PlaceholderMedia
└── ./constants (workshopHref)

FeaturesSection
├── ./PlaceholderMedia
└── ./SectionIntro

PartnerSection
├── ./PlaceholderMedia
└── ./SectionIntro

TestimonialSection
└── ./PlaceholderMedia

ProductPreview
└── (self-contained JSX — no external deps)

MotionReveal
└── (React only — IntersectionObserver + matchMedia)

CtaLink
└── next/link

PlaceholderMedia
└── (self-contained JSX — no external deps)
```

---

## 4. Shared Utilities / Primitives

### Direct imports from `src/components/ui/*`
- **NONE** of the landing components directly import from `@/components/ui/*`
- **Indirect**: `AppProviders` (root layout) imports `ToastProvider` from `@/components/ui/toast`, making toast globally available

### Utility imports
| Utility | Used By | Path |
|---------|---------|------|
| `cn` | `ArchestimatorLogo` | `@/lib/ui/cn` |
| `createSupabaseServerClient` | All 5 landing pages | `@/lib/supabase/server` |

---

## 5. Cross-Contamination with Authenticated `/workshop` Routes

### Landing → Workshop
- **NONE**. No landing component imports from `@/components/workshop` or `@/app/workshop`.

### Workshop → Landing
- **NONE**. No workshop file imports from `@/components/landing`.

### Shared / Indirect Contamination
| Connection | Risk Level | Details |
|------------|------------|---------|
| Root Layout (`layout.tsx`) | **HIGH** | Wraps ALL routes. Font, metadata, CSS, and `AppProviders` changes affect workshop. |
| `AppProviders` (`providers.tsx`) | **HIGH** | React Query + ToastProvider mounted globally. Workshop receives landing-agnostic providers. |
| Supabase Auth | **MEDIUM** | Landing pages use `createSupabaseServerClient` — same auth infra as workshop. Auth schema changes affect both. |
| `globals.css` | **MEDIUM** | Imported in root layout. CSS changes can leak into workshop UI. |

---

## 6. Hooks, Utilities, Data Files

| File | Type | Consumers |
|------|------|-----------|
| `src/lib/supabase/server.ts` | Server client factory | All 5 landing pages (via `getLandingAuthState`) + 15 other files |
| `src/lib/ui/cn` | Classname utility | `ArchestimatorLogo` + likely many workshop components |
| `src/components/landing/constants.ts` | Route constants | `LandingHeader`, `LandingFooter`, `HeroSection`, `PricingSection`, `FinalCTASection`, `AnnouncementBanner`, `EstimatorEngineSection`, `SectionIntro` |
| `src/components/landing/company-proof-data.ts` | Data + types | `CompanyProofCarouselSection` |
| `src/components/landing/MotionReveal.tsx` | Animation hook-component | `SecondaryClaimSection`, `SolutionSection`, `PricingSection`, `FAQSection`, `FinalCTASection`, `LandingFooter` |

---

## 7. Risk Assessment by Dependency Chain

| Chain | Risk | Reason |
|-------|------|--------|
| `layout.tsx` → `AppProviders` → `ToastProvider` | **HIGH** | Any ToastProvider bug or API change breaks toast across the entire app (landing + workshop). |
| `layout.tsx` → global CSS | **MEDIUM** | `globals.css` changes can unintentionally style workshop components. |
| `createSupabaseServerClient` → all landing pages | **MEDIUM** | Auth check function `getLandingAuthState` is **duplicated** in all 5 page files (not DRY). If auth logic changes, 5 files must be updated. |
| `ArchestimatorLogo` → `cn` | **LOW** | `cn` is a stable utility; low churn risk. |
| `LandingSmoothScrollProvider` → `lenis/react` | **LOW-MEDIUM** | Lenis version bumps could change scroll behavior or APIs. |
| `NeatWireframeBackground` → `@firecms/neat` | **LOW** | Niche package. If deprecated, hero background needs rebuild. |
| `@phosphor-icons/react` | **LOW** | Stable icon library used widely. API changes would be breaking but unlikely. |
| Landing ↔ Workshop direct imports | **NONE** | Clean separation — no direct cross-imports. |

---

## 8. Key Findings Summary

1. **Clean component boundary**: Landing and workshop components do not import each other. Good architectural separation.
2. **Root layout is the single point of coupling**: `layout.tsx` and `providers.tsx` are the only files that bridge landing and workshop surfaces.
3. **No direct `src/components/ui/*` usage in landing**: Landing components are fully custom-styled (Tailwind-only). The only UI primitive exposure is via the global `ToastProvider` in `AppProviders`.
4. **Auth state check is duplicated**: The `getLandingAuthState` async function appears identically in `page.tsx`, `about/page.tsx`, `features/page.tsx`, `pricing/page.tsx`, and `contact/page.tsx`.
5. **Brand logo is the only shared visual primitive**: `ArchestimatorLogo` from `src/components/brand/` is used by `LandingHeader` and `LandingFooter`.
