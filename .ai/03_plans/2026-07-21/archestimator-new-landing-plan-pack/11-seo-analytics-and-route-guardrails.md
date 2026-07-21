# SEO, Analytics, and Route Guardrails

## Route status

`/new` is a preview route.

Required status:

```text
static
noindex
nofollow
not in sitemap
not canonical production landing
not redirected from /
```

Do not infer that a polished implementation authorizes public promotion.

## Metadata contract

Recommended:

```ts
export const metadata: Metadata = {
  title: {
    absolute: "Archestimator — Construction estimating from estimate to proposal",
  },
  description:
    "Build structured estimates, reuse cost knowledge, present clearer proposals, and keep reviews and revisions connected. Request early access to Archestimator.",
  robots: {
    index: false,
    follow: false,
  },
};
```

Also preserve:

```ts
export const dynamic = "force-static";
```

### Why absolute title

The root layout defines a brand-appending title template. An absolute title prevents accidental “Archestimator … — Archestimator” duplication.

### Canonical

Do not add a canonical URL during this task.

The existing metadata helper’s site origin is still documented as a working assumption, and `/new` is not the production route. Adding a canonical could imply promotion or create an incorrect alternate relationship.

### Open Graph

OG metadata is optional for a noindex preview. Do not introduce an unverified product image or public launch copy merely to fill the fields.

## Sitemap

`src/app/sitemap.ts` must remain unchanged.

The final diff should prove `/new` was not added.

## Structured data

The root layout already provides sitewide structured data.

The page may add FAQ JSON-LD because it renders FAQ content. Requirements:

- schema derives from the same `faqs` array;
- visible and schema answers match;
- no pricing, customer ratings, aggregate rating, review, product-offer, or availability schema;
- no claim that the pre-release MVP is generally available;
- use the repository’s JSON-LD escaping helper.

## Shell

Use:

```tsx
<PublicPageShell isHomePage>
  <ArchestimatorNewLandingPage />
</PublicPageShell>
```

This preserves:

- cookie consent;
- consent-gated landing analytics;
- route-owned header/footer.

Do not use the shell’s non-home branch because that would add the old public header/footer and create nested main ownership.

## Analytics

### Existing behavior

The shell loads analytics only when consent and production telemetry allow it. The page must not bypass this.

### CTA instrumentation

Every primary CTA:

```html
data-landing-cta="primary"
data-landing-cta-location="header"
```

Allowed locations:

```text
header
hero
early-access
final-cta
```

A utility sign-in link is not a primary CTA.

### Section instrumentation

Optional inert attributes:

```html
data-new-landing-section="hero"
data-new-landing-section="product"
data-new-landing-section="workflow"
data-new-landing-section="connected-record"
data-new-landing-section="early-access"
data-new-landing-section="faq"
```

These allow later delegated analytics or inspection without creating provider calls.

Do not add:

- direct `gtag` calls;
- direct Clarity calls;
- provider-specific scripts;
- tracking before consent;
- custom telemetry backend;
- fake conversion events.

## CTA destination contract

Signed out:

```text
Request early access
/contact?intent=beta-request
```

Signed in:

```text
Open workspace
/workshop
```

Utility sign in:

```text
Sign in
/login?next=/workshop/projects
```

The current contact form normalizes `beta-request` into the existing access-request flow. No contact backend change is required.

## Link rules

### Anchor links

- Product → `#product`
- Workflow → `#workflow`
- Connected record → `#connected-record`
- FAQ → `#faq`

### Footer

Allowed:

- About → `/about`
- Contact → `/contact`
- Privacy → `/privacy`
- Terms → `/terms`
- Sign in → login path
- Workspace → `/workshop` when auth hint indicates signed in

### Excluded

- Pricing, unless owner explicitly adds it to this experiment;
- sample proposal, until a real public asset exists;
- feature subroutes invented for the page;
- external reference sites;
- GitHub reference repository links in the rendered page.

## Accessibility and analytics

Do not make a click target solely for analytics. All tracked CTA elements must be real links with normal browser behavior.

Do not prevent default navigation to wait for an event.

Do not identify or announce demo interactions as real user activity.

## Privacy

The hero uses sanitized local data.

The page must not:

- fetch customer data;
- show real project identities;
- leak auth/session data into markup;
- serialize internal user context into metadata;
- pool customer costs;
- imply supplier endorsement;
- add form collection;
- create a hidden waitlist request.

The CTA sends the user to the existing contact flow.

## Preview safeguards

- visible pre-release badge;
- noindex;
- no sitemap;
- no public price;
- no availability guarantee;
- no launch countdown;
- no “buy now” or checkout;
- no schema Offer;
- no redirect from `/`;
- no production canonical;
- no external deployment action.

## Promotion checklist — separate future task

Do not perform these actions now. If the owner later chooses `/new` as the production landing, a separate plan must evaluate:

1. replacing or redirecting `/`;
2. canonical and OG metadata;
3. sitemap inclusion;
4. existing A/B experiment retirement;
5. current landing rollback path;
6. analytics baselines and event names;
7. visible stage language;
8. sample proposal proof;
9. pricing links;
10. browser, build, performance, and accessibility validation;
11. deployment and rollback;
12. legal/brand review.

A complete `/new` implementation is not implicit promotion approval.

## Route-isolation audit

Final source review must confirm no changes to:

```text
src/app/page.tsx
src/app/sitemap.ts
src/lib/landing/seo-metadata.ts
src/components/landing/ContactForm.tsx
src/components/landing/LandingAnalyticsLoader.tsx
src/app/layout.tsx
```

Any change to these requires a documented dependency and owner-visible explanation.
