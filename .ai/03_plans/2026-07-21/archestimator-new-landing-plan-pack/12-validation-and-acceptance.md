# Validation and Acceptance

## Evidence policy

This package separates:

- implementation readiness;
- source-level correctness;
- automated test proof;
- release proof.

The plan is implementation-ready. The implementation is not automatically release-ready.

Current owner authorization covers planning only. Application tests, builds-as-tests, browser automation, screenshots, Storybook, and visual QA remain `TEST_PROPOSAL` work until explicitly authorized.

## Requirement register

| ID | Requirement | Completion role |
|---|---|---|
| `REQ-001` | Implement only `/new` and preserve the live `/` route and public route infrastructure | Core |
| `UX-001` | Follow Velora’s macrostructure in a light, Archestimator-specific visual system | Core |
| `UX-002` | Reuse the current sanitized product demonstration in the hero | Core |
| `REQ-002` | Use accurate, canonical, concise Archestimator content | Core |
| `UX-003` | Provide complete responsive behavior and keep product proof visible on mobile | Core |
| `UX-004` | Add restrained reference-inspired motion with reduced-motion and cleanup paths | Core |
| `PERF-001` | Add no new animation runtime and preserve a bounded performance architecture | Core |
| `SEC-001` | Use sanitized data and no fabricated or privacy-sensitive public proof | Core |
| `OPS-001` | Preserve preview SEO, consent analytics, traceability, and resumable handoff | Core |
| `REQ-003` | Use “Request early access” and replace pricing/social-proof slots truthfully | Core |

## Acceptance criteria

### AC-001 — Route isolation

**Requirement links:** `REQ-001`, `OPS-001`

Pass when source evidence shows:

- `/new` renders the new page;
- `/new` remains `force-static`;
- `/new` remains `noindex,nofollow`;
- `/` source is unchanged;
- sitemap is unchanged;
- no redirect/rewrite promotes `/new`;
- global tokens, contact flow, providers, and package files are unchanged;
- any shared hero change is backward-compatible and default-preserving.

Permitted evidence:

- scoped diff;
- route source;
- sitemap source;
- shared component call-site review;
- TypeScript and lint.

Test proposal:

- smoke `/` and `/new` in browser.

### AC-002 — Structural and visual adaptation

**Requirement links:** `UX-001`

Pass when source shows the exact mapped order:

1. progress;
2. header;
3. hero/product frame/outcomes;
4. audience marquee;
5. product bento;
6. connected-record split;
7. activity split;
8. three principle cards;
9. six connection cards;
10. two-card early access;
11. FAQ;
12. final CTA/dock;
13. footer.

And:

- overall route is light;
- product frame is the strongest visual;
- no dark-template clone;
- no fake template content;
- no section is missing because a reference effect was not implemented.

Permitted evidence:

- component source;
- CSS tokens;
- structural review.

Test proposal:

- desktop visual comparison against the section map, not pixel cloning.

### AC-003 — Real hero product proof

**Requirement links:** `UX-002`

Pass when:

- hero renders `HeroEstimateWorkspaceMockup`;
- product data remains sanitized/local;
- no fake analytics dashboard or unrelated screenshot replaces it;
- frame has accessible sanitized-demo labeling;
- loop/static props preserve old defaults;
- timer/drag cleanup is explicit.

Permitted evidence:

- imports and JSX;
- hero shared diff;
- default prop values;
- cleanup source.

Test proposal:

- observe a full desktop loop and static reduced-motion state.

### AC-004 — Canonical copy

**Requirement links:** `REQ-002`

Pass when:

- H1 matches approved copy;
- subheadline matches approved copy;
- CTA says “Request early access”;
- stage says pre-release MVP;
- copy is centralized;
- no unsupported claim appears;
- no visible paragraph exceeds the defined density ceiling without a documented reason;
- repeated content is controlled;
- rendered copy contains no prohibited proposed-copy phrase.

Permitted evidence:

- `new-landing-content.ts`;
- copy deck comparison;
- static text scan;
- narrative word count.

### AC-005 — Responsive product and layout contract

**Requirement links:** `UX-003`

Pass at source level when:

- CSS accounts for the viewport matrix;
- no fixed page-width offender is known;
- product frame remains present under 820 pixels;
- mobile hero uses static final phase;
- bento, flow, activity, cards, access section, dock, and footer have explicit collapsed layouts;
- header and CTAs have safe narrow-screen behavior;
- layout geometry is reserved.

Source-level pass must be marked with a browser-test boundary if visual testing is not authorized.

Test proposal:

- 360, 390, 768, 1024, 1280, 1440, and 1920 browser matrix.

### AC-006 — Motion, interaction, and reduced motion

**Requirement links:** `UX-004`

Pass when:

- existing GSAP/CSS only;
- hero message is stable;
- reveal effects are one-shot;
- product loop is in-view/document-visible/desktop only;
- marquee and ambient effects stop under reduced motion;
- spotlight/tilt are fine-pointer only;
- no content depends on animation;
- every observer/listener/timer/GSAP context cleans up;
- no viewport contains more than two perpetual effects by design.

Test proposal:

- browser normal motion, reduced motion, tab visibility, route navigation, coarse pointer.

### AC-007 — Performance architecture

**Requirement links:** `PERF-001`

Pass at source level when:

- package and lockfile unchanged;
- page root remains server-compatible;
- client islands are limited and documented;
- route makes no new data call;
- product loop pauses;
- geometry is reserved;
- no canvas/WebGL/particle runtime;
- no broad full-screen animated filter;
- lower sections can use containment;
- source has no obvious perpetual React rerender loop.

Real performance budgets remain unproven without authorized measurement.

Test proposal:

- production build, bundle review, Lighthouse/Web Vitals profile.

### AC-008 — Truth, privacy, and proof integrity

**Requirement links:** `SEC-001`, `REQ-002`

Pass when:

- demo is explicitly sanitized;
- no customer, project, user, supplier endorsement, or market-price implication is introduced;
- no invented logo, quote, rating, customer count, performance metric, public price, tracking claim, or legal-grade sign-off;
- no AI, procurement, payment, or marketplace positioning;
- no sample-proposal CTA without a real asset;
- customer data is not fetched or pooled.

Permitted evidence:

- copy scan;
- content source;
- hero fixture source;
- network/import review.

### AC-009 — Preview SEO, analytics, and handoff

**Requirement links:** `OPS-001`

Pass when:

- absolute accurate title;
- accurate description;
- noindex/nofollow;
- no production canonical introduced;
- FAQ schema and visible copy are single-sourced;
- PublicPageShell retains consent/analytics;
- CTA data attributes exist;
- completion report names files, checks, unrun tests, limitations, and exact state;
- plan package traceability is refreshed after edits.

### AC-010 — Truthful conversion section

**Requirement links:** `REQ-003`

Pass when:

- every signed-out primary action uses `/contact?intent=beta-request`;
- primary label is “Request early access”;
- signed-in label may be “Open workspace”;
- no “Book a walkthrough” appears;
- no hero proof CTA without verified asset;
- pricing slot is replaced with design-partner access and expectations;
- no price, plan, discount, availability guarantee, or scarcity claim;
- no customer social proof substitutes for pricing.

## Default static verification

These commands are evidence candidates, not application tests:

```bash
git diff --check
bun run type-check
bun run lint -- src/app/new/page.tsx src/components/landing-new src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx
bun run validate:plan-pack .ai/03_plans/2026-07-21-new-landing-page
```

If a command cannot run because of environment or existing unrelated failures, record:

- exact command;
- exact failure;
- whether it is caused by the implementation;
- remaining evidence used;
- no false pass.

## Prohibited-copy scan

Run against rendered `/new` source:

```bash
rg -n \
  "Trusted by|Loved by|Bids won|Revenue|Conversion|AI-powered|Autonomous|Marketplace|Procurement|Payments|Industry-leading|Enterprise-ready|Legally binding|Immutable approval|See who opened|Book a walkthrough|See the workflow|Free forever|Starting at|per month" \
  src/app/new src/components/landing-new
```

Expected result: no rendered-copy match.

A comment explaining a prohibition should be rewritten or excluded from the scoped source if it causes ambiguity.

## Required positive scan

```bash
rg -n \
  "Make every estimate easier|Request early access|Pre-release MVP|/contact\\?intent=beta-request|data-landing-cta|fauxwood-replaced" \
  src/app/new src/components/landing-new src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx
```

Expected: the approved copy, action route, analytics attributes, and static hero phase are traceable.

## Source review checklist

### Route

- [ ] one route page;
- [ ] absolute title;
- [ ] accurate description;
- [ ] noindex/nofollow;
- [ ] force-static;
- [ ] shell home mode;
- [ ] no A/B provider.

### Content

- [ ] one H1;
- [ ] exact hero;
- [ ] exact CTA;
- [ ] pre-release stage;
- [ ] section count/order;
- [ ] no prohibited proof;
- [ ] no public price;
- [ ] no sample CTA;
- [ ] FAQ visible/schema same source.

### Hero

- [ ] real component imported;
- [ ] sanitized label;
- [ ] static mobile;
- [ ] loop desktop/in-view;
- [ ] hidden-tab pause;
- [ ] timer cleanup;
- [ ] drag cleanup;
- [ ] old defaults unchanged.

### Accessibility

- [ ] skip link;
- [ ] landmark order;
- [ ] heading order;
- [ ] focus visible;
- [ ] 44-pixel controls;
- [ ] native menu/FAQ;
- [ ] semantic marquee;
- [ ] diagram description;
- [ ] no aria-live demo;
- [ ] reduced-motion static content.

### Performance

- [ ] no dependency change;
- [ ] server page root;
- [ ] bounded client islands;
- [ ] no route data request;
- [ ] reserved geometry;
- [ ] no WebGL/canvas;
- [ ] limited perpetual motion;
- [ ] offscreen pause;
- [ ] cleanup.

### Isolation

- [ ] `/` unchanged;
- [ ] sitemap unchanged;
- [ ] globals unchanged;
- [ ] contact unchanged;
- [ ] analytics provider unchanged;
- [ ] package/lock unchanged;
- [ ] shared hero backward-compatible.

## TEST_PROPOSAL register

Do not execute without explicit authorization.

| ID | Proposal | Purpose |
|---|---|---|
| `TP-001` | `bun run build` | Production/static route compilation |
| `TP-002` | Browser viewport matrix | Visual responsiveness and overflow |
| `TP-003` | Reduced-motion and visibility-state browser check | Motion fallback/lifecycle |
| `TP-004` | Scoped Playwright `/new` spec | Semantic, CTA, menu, FAQ, mobile product visibility |
| `TP-005` | Current `/` smoke | Shared-hero regression |
| `TP-006` | Lighthouse/Web Vitals profile | LCP/CLS/INP and bundle follow-up |
| `TP-007` | Screen-reader spot check | Product-region, menu, FAQ, diagram comprehension |

An implementation report must list each as `UNRUN — authorization not provided` unless the owner later authorizes and the command is actually executed.

## Acceptance status at package creation

All acceptance criteria are intentionally unsatisfied before implementation. The machine manifest records them as `FAIL` to mean “not yet implemented,” not “plan defect.”

They may move to:

- `PASS` with valid evidence;
- `BOUNDARY` where owner-controlled testing or external action remains;
- `N/A` only when the owner changes the requirement;
- never `PASS` based solely on visual confidence or plan prose.
