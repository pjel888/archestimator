<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Cache Safety and Public Personalization Matrix

Public-page TTFB may be one of the biggest wins, but cache work is unsafe until personalization is mapped. Current public pages include auth state, consent, and A/B behavior that can make “static marketing cache” assumptions false.

## Current personalization/cookie anchors to verify

| Anchor | Why it matters |
| --- | --- |
| `src/proxy.ts` — `MARKETING_PAGE_CACHE_CONTROL = "private, no-cache, max-age=0, must-revalidate"` | Current behavior intentionally prevents shared public caching. |
| `src/app/page.tsx` | Home page may read cookies/A-B state before render. |
| `src/lib/landing/get-landing-auth-state.ts` | Landing pages may vary for logged-in vs logged-out users. |
| `src/components/landing/ABExperimentProvider.tsx` | A/B variant can vary markup/content per visitor. |
| `src/lib/ab-testing/variant-assigner.ts` | Variant assignment may use cookies or request-specific state. |
| `src/components/landing/CookieConsentBanner.tsx` | Consent state changes analytics/script behavior. |

## Cache safety matrix

| Route/content class | Shared CDN cache allowed? | Conditions before relaxing cache | Required proof |
| --- | --- | --- | --- |
| Static marketing shell with identical HTML for all users | Potentially yes | no auth-specific header/content, no Set-Cookie, no per-user variant | `curl -I`, `httpstat`, HTML diff across anonymous/logged-in/variant states |
| Marketing page with auth-aware CTA/header | Not until isolated | move auth-specific piece behind dynamic/Suspense/client boundary or prove identical output | logged-in vs logged-out screenshot/HTML/header comparison |
| Marketing page with A/B variant | Not as one shared response | variant must be encoded in cache key or isolated; otherwise cache can serve wrong variant | variant assignment tests and cache-key/header design |
| Consent banner/scripts | HTML may be cacheable only if consent state is client-side/non-personalized | scripts remain consent-gated; no server Set-Cookie in cached HTML | consent off/on trace and cookie/header checks |
| `/invite/[token]` | No broad shared cache | tokenized entry can be sensitive | no-store/token redaction proof |
| `/share/[token]` and share APIs | No broad shared cache | token/password/session/recipient state | no-store/security tests |
| Protected `/workshop/*` | No shared cache | user-specific data | auth tests and cache headers |
| Static assets/images | Yes if non-sensitive/public | access policy and cache headers safe | image/API route smoke and header proof |

## Implementation rule

Do not change `MARKETING_PAGE_CACHE_CONTROL` until a future worker proves whether public marketing HTML is identical across:

1. anonymous fresh visitor,
2. logged-in beta user,
3. consent accepted vs rejected,
4. each A/B variant,
5. mobile vs desktop if server output varies.

If output differs, split static shell from dynamic/personalized parts before using shared CDN cache.
