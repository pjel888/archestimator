# International Readiness Plan

**Status:** Planning; no route move, locale proxy, or legal-region review shipped
**Created:** 2026-05-27
**Scope:** Public landing page `/`, marketing subpages, and product foundation for multi-region support

## User job

As a product owner, I need Archestimator to be accessible and compliant for international users — starting with the public website and laying the foundation for localized product experiences.

## Goals

1. Establish i18n strategy for the public landing page and marketing subpages
2. Define locale routing pattern compatible with Next.js 16 App Router
3. Assess translation readiness: content volume, brand voice preservation, maintenance cost
4. Ensure multi-region legal compliance: GDPR (EU/UK), CCPA/CPRA (California), and any other priority jurisdictions
5. Prepare the product data model for future multi-currency and regional construction conventions

## Non-goals

- Full product i18n (workshop, estimate editor, component library) — scope to public pages first
- Automatic machine translation pipeline — human review required for brand copy
- Multi-currency estimating engine — this is a future product phase
- Regional construction code compliance — separate product scope

## i18n strategy

### Phase 1: Public pages only (current scope)

```
/               → English (default)
/es/            → Spanish landing page
/fr/            → French landing page
/de/            → German landing page
```

Static marketing subpages follow the same locale prefix:
```
/es/about       → Spanish about page
/fr/features    → French features page
/de/pricing     → German pricing page
```

### Phase 2: Product localization (future)

Authenticated routes remain English-only initially. When product i18n is approved:
- User locale preference stored in profile
- Estimate UI labels translated
- Number/currency formatting per locale
- Date formatting per locale

### Routing implementation options

| Approach | Next.js 16 support | Complexity | Notes |
|----------|-------------------|------------|-------|
| `next-intl` | ✅ Excellent | Medium | Most popular; server + client |
| `next-i18next` | ⚠️ Lagging | High | i18next ecosystem but Next 16 support unclear |
| Built-in `[locale]` + proxy | ✅ Native | Low | No library; manual translation loading |
| Vercel i18n routing | ✅ Native | Low | Limited to routing; pair with translation lib |

**Recommended:** `next-intl` — mature, App Router-compatible, supports server components, and has ICU message format for complex translations.

**Next.js 16 routing note:** Next.js 16 uses the `proxy.ts` file convention for request-time routing logic; this repo already has `src/proxy.ts` for Supabase auth route protection. Future i18n work must compose locale routing into that existing proxy rather than creating a parallel `src/middleware.ts`.

## Translation readiness

### Content inventory

| Page | Word count (approx) | Translation priority | Notes |
|------|---------------------|---------------------|-------|
| Landing `/` | ~600 words | High | Hero locked; below-hero is primary surface |
| `/about` | ~300 words | Medium | Company/product story |
| `/features` | ~500 words | High | Feature descriptions; keep claims matrix safe |
| `/pricing` | ~200 words | High | Simple pricing table |
| `/contact` | ~100 words | Low | Form labels only |
| `/privacy` | ~1,500 words | Mandatory | Legal; professional translation required |
| `/terms` | ~2,000 words | Mandatory | Legal; professional translation required |

### Translation workflow

1. Extract English strings to JSON/Markdown translation files
2. Send to human translator (not machine-only for brand copy)
3. Review for construction domain terminology accuracy
4. Load via `next-intl` message files
5. Version translation files alongside code

### Brand voice preservation

- Archestimator's value proposition ("faster construction cost estimates") must survive translation
- Construction terminology needs glossary (e.g., "estimate" ≠ "presupuesto" in some Spanish dialects, "BOQ" ≠ "devis" in some French contexts)
- Maintain the product's direct, professional, no-fluff tone across languages

## Multi-region legal compliance

### Priority jurisdictions

| Region | Regulation | Key requirements |
|--------|-----------|-----------------|
| EU/EEA | GDPR | Cookie consent, privacy policy, data rights, DPA |
| UK | UK GDPR + DPA 2018 | Substantially similar to EU GDPR; separate adequacy |
| California, USA | CCPA/CPRA | Privacy notice, opt-out of sale, data access/deletion |
| Canada | PIPEDA | Consent, purpose limitation, individual access |
| Australia | Privacy Act 1988 | APP compliance, cross-border disclosure |
| Singapore | PDPA | Consent, purpose limitation, data protection |

### Implementation priority

1. GDPR (EU/UK) — active in `gdpr-compliance/`
2. CCPA/CPRA — lightweight addendum to privacy policy; "Do Not Sell My Info" link if applicable
3. Other jurisdictions — privacy policy language coverage; no per-jurisdiction banners in MVP

### Non-GDPR legal acceptance gates

Before any copy says "international ready" or implies multi-region compliance:

| Region | Minimum acceptance gate |
|--------|--------------------------|
| California, USA | Privacy policy includes CCPA/CPRA notice, access/deletion request path, and "Do Not Sell/Share" posture if applicable |
| Canada | Privacy policy names consent/purpose/access posture and support contact |
| Australia | Privacy policy names cross-border disclosure and correction/access request path |
| Singapore | Privacy policy names PDPA-aligned consent/purpose/protection posture |

These are document and legal-review gates, not implementation proof. Mark each as "not yet reviewed" until a dated source/reviewer note exists.

## Data model considerations for multi-region

- `workspaces` table: add `default_currency` and `default_locale` columns (nullable, English/USD default)
- `profiles` table: add `locale` and `currency` preference columns
- Avoid hardcoding currency symbols (₱) and units (sqm) in database-stored content — store values and format at display layer
- Philippine peso (₱) remains the default and primary currency; multi-currency is future-gated

## Risks

- Legal translations carry liability — require professional translator certification for privacy/terms
- Locale-prefixed URLs change all public route structures — verify redirects, sitemap, and SEO
- Construction terminology varies significantly by region — glossary essential before translation begins
- Cookie consent must also be locale-aware (banner text, privacy policy link per locale)
- Singapore hosting + EU users = need documented transfer safeguards (see GDPR plan)

## Implementation phases

### Phase 8a-ii: i18n foundation
- Install `next-intl` package
- Compose locale detection into existing `src/proxy.ts` (accept-language header)
- Proxy must EXCLUDE: `/workshop/*`, `/api/*`, `/login`, `/auth/*`, `/_next/*`
- Create `src/app/[locale]/layout.tsx` with `NextIntlClientProvider`
- Move landing pages: `page.tsx` → `[locale]/page.tsx`, `about/page.tsx` → `[locale]/about/page.tsx`, etc.
- Configure redirect: `/` → `/[defaultLocale]` (default: `en`)
- Update `next.config.ts` with `next-intl` plugin
- Verify: all current pages still render identically in `/[locale]` prefix

### Phase 8a-iii: Translation extraction
- Extract all English landing copy to `messages/en.json`
- Replace hardcoded strings in landing components with `useTranslations()` / `t()` calls
- Content inventory priority:
  1. `page.tsx` (homepage — ~600 words)
  2. `features/page.tsx` (~500 words)
  3. `pricing/page.tsx` (~200 words)
  4. `about/page.tsx` (~300 words)
  5. `contact/page.tsx` (~100 words)
  6. `privacy/page.tsx` (~1,500 words — professional translation required)
  7. `terms/page.tsx` (~2,000 words — professional translation required)

### Phase 8a-iv: Construction glossary
- Create `glossary/en-es.json`, `glossary/en-fr.json`, etc.
- Key terms needing verified translation: estimate, BOQ, quantity survey, contingency, provisional sum, variation, R-1, setback, floor area ratio, building code
- Glossary serves translators; embed in translation pipeline

### Phase 8a-v: Sitemap & SEO
- Regenerate `sitemap.ts` with locale alternates (`<xhtml:link rel="alternate" hreflang="...">`)
- Add `hreflang` tags to all landing pages
- Set `lang` attribute on `<html>` per locale
- Verify Google Search Console after deployment

## Dependencies

- **Blocks on:** DRY auth refactor (Phase 8a-i)
- **Blocks on:** Legal pages created (Phase 8b-ii) — before translating privacy/terms
- **Independent of:** A/B testing (can proceed in parallel)

## Language switcher UI

### Placement

The locale selector should appear in both the **header** and **footer** for maximum discoverability:

- **Header**: compact globe icon (Phosphor `Globe`) in the right side of `LandingHeader`, between the nav links and the CTA. Dropdown on click showing available locales with their native names: `English`, `Español`, `Français`, `Deutsch`.
- **Footer**: text links in a row near the copyright: `English · Español · Français · Deutsch`. Current locale is bold, others are links.

### Behavior

- Switching locale sets a `NEXT_LOCALE` cookie and redirects to the equivalent page in the new locale (e.g., `/en/features` → `/es/features`)
- If the equivalent page doesn't exist in the target locale, redirect to the locale's homepage
- The language switcher is NOT shown on `/login`, `/workshop/*`, or `/api/*` (English-only surfaces)
- Active locale is highlighted (bold or underlined), not removed from the list
- Respects `prefers-reduced-motion` for dropdown animation

### Implementation

```typescript
// src/components/landing/LocaleSwitcher.tsx
"use client";

import { usePathname } from "next/navigation";
import { Globe } from "@phosphor-icons/react";

const LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
] as const;

export function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const pathname = usePathname();

  const switchTo = (locale: string) => {
    // Strip current locale prefix, add new one
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, "") || "/";
    window.location.href = `/${locale}${pathWithoutLocale}`;
  };

  return (
    <div className="relative group">
      <button className="flex items-center gap-1 text-[10px]">
        <Globe className="w-3.5 h-3.5" />
        {LOCALES.find((l) => l.code === currentLocale)?.label}
      </button>
      <div className="absolute right-0 top-full mt-1 hidden group-hover:block ...">
        {LOCALES.map((locale) => (
          <button
            key={locale.code}
            onClick={() => switchTo(locale.code)}
            className={locale.code === currentLocale ? "font-bold" : ""}
          >
            {locale.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## i18n rollback plan

The `[locale]` route migration is structurally one-way (files move). If it causes a critical SEO or UX bug:

### Pre-migration safety
1. **Before moving files**: commit the current flat-route structure as a checkpoint
2. **Proxy branch is additive**: if locale routing breaks, disabling the i18n branch inside `src/proxy.ts` restores old routing while preserving auth redirects
3. **Keep redirect from old paths**: add permanent redirects (`308`) from `/about` → `/en/about`, `/features` → `/en/features`, etc. — old bookmarks and backlinks still work
4. **Test on a staging branch first**: merge to a `feat/i18n` branch, deploy to a preview URL, run the verification gates, THEN merge to `main`

### Rollback steps
1. Revert or disable the i18n branch inside `src/proxy.ts` while keeping the existing auth proxy behavior intact
2. Revert `next.config.ts` i18n plugin removal
3. Move files back from `src/app/[locale]/` to `src/app/` (git revert the move commit)
4. Remove `next-intl` from `package.json`
5. `bun run build` — verify old routes work
6. Deploy

**Estimated rollback time**: 15 minutes. The proxy is the single point of request-time routing control, but it also owns auth redirects today; do not delete the file as a rollback.

### Additional redirects for safety

```typescript
// next.config.ts — keep these permanently even after i18n migration
async redirects() {
  return [
    // Legacy flat paths → locale-prefixed paths
    { source: "/about", destination: "/en/about", permanent: true },
    { source: "/features", destination: "/en/features", permanent: true },
    { source: "/pricing", destination: "/en/pricing", permanent: true },
    { source: "/contact", destination: "/en/contact", permanent: true },
    { source: "/privacy", destination: "/en/privacy", permanent: true },
    { source: "/terms", destination: "/en/terms", permanent: true },
  ];
}
```

These redirects ensure zero broken links for anyone who bookmarked or linked to the old flat paths.

## Files affected (from blast radius analysis)

| File | Change type | Risk |
|------|------------|------|
| `package.json` | Add `next-intl` | LOW |
| `next.config.ts` | Add `next-intl` plugin | LOW |
| `src/proxy.ts` | UPDATE — locale redirect composed with existing auth protection | **HIGH** |
| `src/app/[locale]/layout.tsx` | NEW | **HIGH** |
| `src/app/[locale]/page.tsx` | Move from `src/app/page.tsx` | **HIGH** |
| `src/app/[locale]/about/page.tsx` | Move | MEDIUM |
| `src/app/[locale]/features/page.tsx` | Move | MEDIUM |
| `src/app/[locale]/pricing/page.tsx` | Move | MEDIUM |
| `src/app/[locale]/contact/page.tsx` | Move | MEDIUM |
| `src/app/[locale]/privacy/page.tsx` | Move | MEDIUM |
| `src/app/[locale]/terms/page.tsx` | Move | MEDIUM |
| `messages/en.json` | NEW | LOW |
| `messages/es.json` | NEW (after translation) | LOW |
| `glossary/en-es.json` | NEW | LOW |
| `src/app/sitemap.ts` | Update | LOW |
| ALL landing components | Replace hardcoded text with `t()` | MEDIUM |

## Verification gates

- [ ] `bun run build` passes
- [ ] `bun run validate` passes
- [ ] `/en` renders identically to old `/` (before i18n)
- [ ] `/workshop/*` routes unchanged (no locale prefix)
- [ ] `/api/*` routes unchanged
- [ ] `/login` unchanged
- [ ] `/auth/callback` unchanged
- [ ] Sitemap returns locale alternates
- [ ] `hreflang` tags present on all landing pages
- [ ] No console errors on any landing page
- [ ] Claims matrix checkpoint complete for every localized public claim
- [ ] Non-GDPR legal acceptance gates marked reviewed or not-yet-reviewed with dated evidence

## References

- `../gdpr-compliance/README.md` — GDPR implementation details
- `../ab-testing/README.md` — A/B testing across locales
- `.ai/03_plans/landing-page-improvement/17-public-subpages-claims-matrix.md` — claims must hold across languages
- `.ai/06_specs/brand/` — brand voice, narrative, and copy reference
