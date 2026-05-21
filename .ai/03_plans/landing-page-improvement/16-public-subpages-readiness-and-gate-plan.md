# Public Landing Subpages Readiness and Gate Plan

**Date:** 2026-05-21 18:05 PST
**Status:** Planning only; implementation readiness gate.
**Scope:** Readiness checklist for public marketing subpages: `/features`, `/pricing`, `/about`, `/contact`, `/privacy`, `/security`, and future `/resources`.
**Parent folder:** `.ai/03_plans/landing-page-improvement/`
**Related plans:**

- `14-public-subpages-analysis-plan.md`
- `15-public-subpages-research-plan.md`

## Purpose

This document defines the gates that must be passed before Archestimator public subpages are implemented and before they are treated as release-ready.

The goal is not to create more pages quickly. The goal is to create credible, focused, brand-aligned pages that strengthen the public landing system without overclaiming product maturity.

## Hard boundaries

1. **No code implementation during this planning pass.**
2. **Do not touch the accepted homepage hero** unless Philip explicitly reopens it.
3. **Do not change `/workshop` behavior** as part of public subpage work unless a subpage uses a static, safe product screenshot/mockup reference.
4. **Do not publish fake proof.** No fake customer logos, testimonials, usage metrics, ratings, or `trusted by` language.
5. **Do not imply final pricing.** Pricing must stay MVP-preview/early-access unless Philip approves an actual model.
6. **Do not publish legal/security claims without a fact matrix.**
7. **Do not launch thin resources pages.** `/resources` waits until real content briefs exist.

## Pre-implementation gate

A subpage may enter implementation only when all relevant items below are complete.

### Universal pre-implementation checklist

- [ ] Live branch and dirty state checked with `git status --short --branch`.
- [ ] Scope is route-specific and does not mix unrelated app/workshop changes.
- [ ] Existing public landing files re-read before editing.
- [ ] Brand docs re-read or summarized for the target page.
- [ ] Claims matrix completed for the target page.
- [ ] Route architecture selected: keep homepage in place or route group migration.
- [ ] Shared public shell/navigation approach decided.
- [ ] SEO title/description drafted.
- [ ] Accessibility considerations listed before design.
- [ ] Responsive layout target chosen for mobile/tablet/desktop.
- [ ] Test strategy defined.
- [ ] Deletion criteria stated if Philip rejects the page direction.

### Claims matrix gate

Each public statement must be labeled:

- `live`
- `mvp-preview`
- `mockup/static-preview`
- `planned`
- `unsafe/do-not-publish`

Public copy must then follow the label:

- `live` can be written directly.
- `mvp-preview` needs preview/early-access framing.
- `mockup/static-preview` needs visual-scaffold wording and must not imply working behavior.
- `planned` should be minimized or placed in future-direction language.
- `unsafe/do-not-publish` must be removed.

High-risk claims that always require explicit review:

- Excel/PDF export behavior.
- Proposal-ready outputs.
- Revision intelligence/change tracking.
- Visual cost breakdowns and comparisons.
- Pricing/free access.
- Security/privacy/compliance.
- Any proof involving companies, customers, or results.

## Recommended implementation order and readiness gates

### Gate 1 — Shared public shell/navigation

**Goal:** Prepare route-aware public-page structure without disturbing the homepage.

**Preferred first implementation direction:** Keep `src/app/page.tsx` in place and add a shared component such as `PublicPageShell` rather than moving the homepage into a route group immediately.

**Files likely involved later:**

- `src/components/landing/PublicPageShell.tsx`
- `src/components/landing/LandingHeader.tsx`
- `src/components/landing/LandingFooter.tsx`
- `src/content/marketing/public-nav.ts`

**Readiness requirements:**

- [ ] Decide how header links behave on `/features`, `/pricing`, `/about`, and `/contact`.
- [ ] Use full route links for real pages.
- [ ] Use homepage anchor links only when intentionally linking back to `/` sections.
- [ ] Preserve `workshopHref` and `loginHref` constants unless contact flow changes.
- [ ] Ensure sticky header does not cover page anchors.
- [ ] Ensure current homepage snapshots/tests do not regress.

**Validation later:**

- route render tests;
- header/footer link tests;
- browser check on homepage and at least one subpage.

### Gate 2 — `/features`

**Goal:** Create the highest-value product explanation page.

**Implementation readiness:**

- [ ] Feature claims matrix completed.
- [ ] Each of seven feature anchors has a maturity label.
- [ ] Visual proof plan exists for each chapter.
- [ ] H1 and metadata are distinct from homepage.
- [ ] Feature sections do not repeat homepage copy verbatim.
- [ ] CTA path approved.

**Content checks:**

- [ ] Uses public feature names from `public-facing-feature-copy.md`.
- [ ] Explains the problem each feature replaces.
- [ ] Avoids generic SaaS phrases.
- [ ] Avoids overpromising production maturity.
- [ ] Uses `construction cost estimators` or narrower approved audience language.

**UX checks:**

- [ ] Optional section nav is keyboard accessible.
- [ ] Long page has good visual rhythm and focused containers.
- [ ] Static visuals are readable on mobile.
- [ ] No essential information exists only inside animation.

### Gate 3 — `/pricing`

**Goal:** Explain early access/pricing honestly.

**Implementation readiness:**

- [ ] Philip-approved meaning for `₱0`, if used.
- [ ] Approved term: MVP preview, early access, beta, or design-partner access.
- [ ] No final tiers unless monetization model is approved.
- [ ] FAQ drafted and checked against current product truth.
- [ ] CTA path decided: `/login?next=/workshop/projects`, `/contact`, or both.

**Content checks:**

- [ ] Does not imply permanent free pricing.
- [ ] Does not imply production readiness.
- [ ] Does not compare competitor prices unless refreshed and dated.
- [ ] Clear statement of what is included now and what is still being shaped.

**UX checks:**

- [ ] Pricing cards do not create fake enterprise maturity.
- [ ] FAQ is scannable and accessible.
- [ ] Mobile layout avoids cramped multi-column pricing comparisons.

### Gate 4 — `/about`

**Goal:** Publish a serious product/founder/mission page.

**Implementation readiness:**

- [ ] Founder/company facts approved by Philip.
- [ ] Current stage language approved.
- [ ] Geography/focus language approved.
- [ ] Product story is grounded in brand docs.
- [ ] No fake team, investor, office, customer, or maturity claims.

**Content checks:**

- [ ] Enemy is disconnected workflow, not the estimator and not Excel itself.
- [ ] Explains `The Archestimator Way` in practical estimating language.
- [ ] States what Archestimator is not.
- [ ] Does not overuse AI language.

### Gate 5 — `/contact`

**Goal:** Provide a professional path for demo/access/support inquiries.

**Implementation readiness:**

- [ ] Contact destination selected: mailto, server action, form provider, CRM, calendar, or other.
- [ ] Required fields decided.
- [ ] Spam/abuse handling decided if a form is used.
- [ ] Privacy text exists next to the form.
- [ ] Success and error states specified.
- [ ] Delivery path tested before release.

**Accessibility checks:**

- [ ] Every field has a visible label.
- [ ] Required fields are programmatically communicated.
- [ ] Error messages are associated with fields.
- [ ] Success state is announced or clearly visible.
- [ ] Keyboard-only submission works.

### Gate 6 — `/privacy`

**Goal:** Publish accurate privacy coverage before broad lead capture.

**Implementation readiness:**

- [ ] Data collection fact matrix completed.
- [ ] Providers listed accurately.
- [ ] Analytics/cookies confirmed.
- [ ] Retention/deletion approach confirmed.
- [ ] Privacy contact confirmed.
- [ ] Effective date set.
- [ ] Legal/human review completed.

**Content checks:**

- [ ] No invented legal promises.
- [ ] No mismatch with actual code/providers.
- [ ] Plain-English enough for real users.

### Gate 7 — `/security`

**Goal:** Explain verified security posture without compliance overclaiming.

**Implementation readiness:**

- [ ] Security fact matrix completed.
- [ ] Supabase/Auth/RLS facts verified in code/migrations.
- [ ] Dev-auth bypass constraints verified.
- [ ] Service-role key exposure scan completed.
- [ ] No certifications claimed unless documented.

**Content checks:**

- [ ] No `SOC 2`, `ISO`, `bank-level`, or `enterprise-grade` claims unless verified.
- [ ] Clear distinction between current technical posture and future hardening.
- [ ] No secrets or internal implementation details that increase risk.

### Gate 8 — `/resources`

**Goal:** Add SEO/content hub only when real guides exist.

**Implementation readiness:**

- [ ] At least 3 real resource briefs approved.
- [ ] Keyword/search intent research completed.
- [ ] Each guide has a human-useful outline.
- [ ] No AI-generated filler.
- [ ] Internal linking plan exists.

**Defer if:** There is no real content beyond generic marketing claims.

## Design and layout readiness

### Container system

- Public subpages should use focused middle containers like the improved below-hero homepage sections.
- Recommended maximum widths:
  - narrative text: `max-w-[760px]` to `max-w-[860px]`;
  - product sections: `max-w-[1040px]`;
  - dense comparison/FAQ sections: `max-w-[920px]` to `max-w-[1040px]`;
  - full-width background bands only when they serve hierarchy, not decoration.

### Typography

- Landing/subpage typography may be larger than app/workshop typography.
- Do not let landing-page font-size utilities leak into app/workshop routes.
- Keep H1s visually strong but less dominant than the accepted homepage hero unless a subpage specifically needs a campaign-style hero.
- Use concise construction-estimating vocabulary, not generic SaaS abstractions.

### Motion and microinteractions

Current decision from landing plan:

- No new animation packages for this pass.
- Lenis is installed and used landing-only.
- Use CSS transitions and one small IntersectionObserver reveal helper where needed.
- Respect `prefers-reduced-motion`.

Subpage rules:

- Do not add GSAP/framer-motion unless a new package decision is explicitly approved.
- Do not animate core copy in a way that blocks reading.
- Microinteractions should clarify state: nav active states, FAQ expand/collapse, feature chapter focus, form success/error.
- Reduced-motion mode must reveal content immediately and disable transform/opacity choreography.

## SEO readiness

Each implemented public route needs:

- unique `metadata.title`;
- unique `metadata.description`;
- canonical URL strategy;
- OpenGraph/Twitter metadata if the public site is nearing release;
- sitemap inclusion if route is launch-ready;
- robots policy if route should not be indexed yet;
- one clear H1;
- logical H2/H3 hierarchy;
- route-specific internal links;
- no structured data that implies fake ratings, reviews, customers, or organization details not yet verified.

Suggested title directions:

- `/features`: `Archestimator Features — Construction Cost Estimating Workspace`
- `/pricing`: `Archestimator Pricing — MVP Preview Access`
- `/about`: `About Archestimator — A Clearer Way to Build Construction Estimates`
- `/contact`: `Contact Archestimator — Request Access or a Demo`
- `/privacy`: `Archestimator Privacy Policy`
- `/security`: `Archestimator Security`

Final wording should be checked during implementation.

## Accessibility readiness

Universal accessibility gates:

- [ ] One H1 per page.
- [ ] Semantic landmarks: header, main, footer.
- [ ] Keyboard navigation works from header through CTA/form/footer.
- [ ] Focus states visible.
- [ ] Links have meaningful names.
- [ ] Buttons are buttons; links are links.
- [ ] Forms have labels, descriptions, errors, and success states.
- [ ] Color contrast passes for dark and orange sections.
- [ ] Reduced motion respected.
- [ ] Carousels/marquees are not required to understand content.
- [ ] Decorative duplicate marquee content is `aria-hidden`.
- [ ] Sticky header does not trap or obscure focus targets.

Testing later should include at least:

- keyboard-only navigation;
- mobile viewport inspection;
- reduced-motion mode check;
- screen-reader accessible names for nav/CTA/form controls.

## Responsive readiness

Test routes at minimum:

- 375px mobile width;
- 768px tablet width;
- 1024px laptop width;
- 1280px desktop width;
- one tall desktop if page has long sections.

Responsive checks:

- no horizontal overflow;
- nav does not wrap awkwardly;
- footer columns collapse cleanly;
- page intros remain readable;
- feature chapters do not become too tall or too dense;
- pricing cards do not imply hidden columns;
- form fields are usable on mobile;
- sticky header does not cover anchors or first sections.

## Proof and claim-safety readiness

Before release, run a content scan for prohibited language:

- `Trusted by`
- `Used by`
- `Customers include`
- `testimonial`
- `SOC 2`
- `ISO`
- `bank-level`
- `guaranteed`
- `never lose`
- `save X%`
- `enterprise-grade`
- real company names not verified as customers

Allowed patterns:

- `MVP preview`
- `early access`
- `preview workspace`
- `planned`
- `designed to`
- `helps`
- `keeps ... connected`
- `make ... easier to review`

## Technical validation plan for future implementation

For documentation-only updates:

```bash
git diff --check
```

For public subpage code changes:

```bash
bun run validate
bun run build
git diff --check
```

Focused tests to add later:

- header/footer route-link tests;
- `/features` renders seven approved feature anchors;
- no fake-proof/prohibited-copy scan for public pages;
- pricing page labels MVP-preview terms clearly;
- contact form accessible labels and success/error states if implemented;
- sitemap/robots route coverage if added;
- reduced-motion behavior for reveal sections if motion is used.

Browser verification later:

- load `/`, `/features`, `/pricing`, `/about`, `/contact`;
- verify console has no errors;
- verify no horizontal overflow;
- verify sticky header and anchor offsets;
- inspect desktop and mobile screenshots;
- test keyboard focus order;
- test form submission route if contact form exists.

## Release gate

A public subpage is release-ready only when:

- route-specific objective is clear;
- claims matrix is satisfied;
- page copy is brand-aligned and not generic SaaS filler;
- no fake proof or unverified maturity claim exists;
- metadata is unique;
- accessibility and responsive checks pass;
- validation commands pass;
- browser verification has no material issue;
- remaining risks are documented.

## Deletion criteria

Delete or archive a subpage direction if:

- Philip rejects the content strategy;
- the page duplicates homepage copy without adding a distinct user job;
- claims cannot be supported by current product state;
- legal/security wording cannot be verified;
- pricing/contact decisions remain unresolved and would force vague filler;
- the page requires broad app/workshop changes outside the public marketing scope.
