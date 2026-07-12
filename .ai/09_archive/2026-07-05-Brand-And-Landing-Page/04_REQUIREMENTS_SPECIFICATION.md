# 04 — Requirements Specification

**Source authority:** User request + `MASTER` canon + `03` audit.
**ID convention:** REQ-LINT-* (lint), REQ-HERO-*, REQ-PROBLEM-*, REQ-WORKFLOW-*, REQ-FEATURE-*, REQ-SPECIALTIES-*, REQ-COMPARISON-*, REQ-PROOF-*, REQ-FAQ-*, REQ-FINAL-CTA-*, REQ-FOOTER-*, REQ-PRICING-*, REQ-FEATURES-*, REQ-ABOUT-*, REQ-CONTACT-*, REQ-DESIGN-*, REQ-AB-*, REQ-ANALYTICS-*, REQ-MEASUREMENT-*, REQ-SECTION-*.

---

## 0. 2026-07-06 added requirements

These requirements supersede weaker or conflicting requirements in the older matrix.

| REQ ID | Statement | Source | AC | WP | TEST | Status |
|---|---|---|---|---|---|---|
| REQ-HERO-MOCKUP-PRESERVE | The existing hero estimate-sheet/product mockup remains the above-the-fold product proof object. | User continuation brief, `20` §0 | AC-HERO-MOCKUP-PRESERVE: `HeroEstimateWorkspaceMockup` remains in the hero stage and is not replaced by generic media | WP-1B / WP-2A | TEST-HERO-MOCKUP: static source check; browser proof only when hero layout changes | `[PROPOSED]` |
| REQ-HERO-COPY-FIT | Hero subhead is concrete and max 20 words; H1 max 2 lines. | `19` §0, `20` §0 | AC-HERO-COPY-FIT: copy length and layout fit verified at implementation time | WP-1B / WP-2A | TEST-HERO-COPY-FIT: copy lint/static check; mobile browser proof when layout changes | `[PROPOSED]` |
| REQ-DESIGN-PRECISION-EDITORIAL | Landing visual system defaults to Precision Editorial: current neutral/cool palette, restrained frames, 8px repeated-card radius, no one-note warm repaint. | `09` §0, `20` §0 | AC-DESIGN-PRECISION-EDITORIAL | WP-1E / WP-5 | TEST-DESIGN-PRECISION: CSS token review plus browser proof only for visual implementation | `[PROPOSED]` |
| REQ-DESIGN-NO-FAKE-PROOF | Landing page does not render fake counters, adoption metrics, fabricated logos, or "illustrative" proof. | `15` §0, `20` §0 | AC-DESIGN-NO-FAKE-PROOF | WP-1B / WP-2A / WP-4A | TEST-CLAIMS-FAKE-PROOF: source search and claims review | `[PROPOSED]` |
| REQ-VALIDATION-PROPORTIONAL | Each phase uses the smallest validation that proves the changed behavior; Playwright/visual QA are not default gates. | `11` §0, `12` §0 | AC-VALIDATION-PROPORTIONAL | All WP | TEST-VALIDATION-PROPORTIONAL: phase closeout names targeted evidence or gap | `[PROPOSED]` |

---

## 1. Requirements map (REQ → AC → WP → TEST → Status)

All requirements are `[PROPOSED]` for the planning pass. Status changes during implementation.

| REQ ID | Statement | Source | AC | WP | TEST | Status |
|---|---|---|---|---|---|---|
| REQ-LINT-001 | Marketing surfaces contain zero occurrences of "early product" | `06` §3.2 | AC-LINT-001: `rg` returns 0 matches in scope | WP-1A | TEST-LINT-001: `bun run lint:landing-copy` exits 0 | `[PROPOSED]` |
| REQ-LINT-002..023 | (one per banned phrase in `06` §3.2) | `06` §3.2 | AC-LINT-002..023 | WP-1A | TEST-LINT-002..023 | `[PROPOSED]` |
| REQ-HERO-H1 | Hero H1 is one of the two options in `19` §1 | `07` §2.1 | AC-HERO-H1: Hero renders chosen H1 | WP-2A | TEST-HERO-001: Playwright hero h1 text matches | `[PROPOSED]` (OPEN-DEC-001a) |
| REQ-HERO-SUBHEAD | Hero subhead is the recast string in `19` §1 | `07` §2.1 | AC-HERO-SUBHEAD | WP-1B / WP-2A | TEST-HERO-002 | `[PROPOSED]` |
| REQ-HERO-CTA | Hero primary CTA is one of the OPEN-DEC-005 options | `07` §2.1 | AC-HERO-CTA | WP-1B | TEST-HERO-003 | `[PROPOSED]` (OPEN-DEC-005) |
| REQ-HERO-BELOW-CTA | Brand promise "You never start from zero again. Your numbers hold up." appears below hero CTA | `07` §2.1 | AC-HERO-BELOW-CTA | WP-2A | TEST-HERO-004 | `[PROPOSED]` |
| REQ-HERO-METRIC-CARDS | Hero metric cards drop animated counters; preserve ordinals + behavior previews | `07` §2.1, DEC-E | AC-HERO-METRIC-CARDS | WP-2A | TEST-HERO-005 | `[PROPOSED]` (OPEN-DEC-008) |
| REQ-AUDIENCE-BANNER | AudienceBanner component removed | `07` §2 (removed sections) | AC-AUDIENCE-BANNER: function absent from composition | WP-1B | TEST-STRUCTURE-001 | `[PROPOSED]` |
| REQ-AUDIENCE-BAND | AudienceBand recast per `19` §3 | `07` §2.6 | AC-AUDIENCE-BAND | WP-2A | TEST-HERO-006 | `[PROPOSED]` |
| REQ-PROBLEM-EXPAND | ProblemSection body expanded to 3 paragraphs | `07` §2.2 | AC-PROBLEM-EXPAND | WP-2A | TEST-PROBLEM-001 | `[PROPOSED]` |
| REQ-PROBLEM-CLOSER | ProblemSection closer replaced with canonical hook | `07` §2.2 | AC-PROBLEM-CLOSER | WP-2A | TEST-PROBLEM-002 | `[PROPOSED]` |
| REQ-WORKFLOW-SCREENSHOTS | 4 workflow steps each render a real screenshot | `07` §2.3, `09` | AC-WORKFLOW-SCREENSHOTS | WP-2B | TEST-WORKFLOW-001 | `[PROPOSED]` |
| REQ-FEATURE-CH1-LIBRARY | Chapter 1 (Reusable cost intelligence) renders Library dock screenshot | `07` §2.4 | AC-FEATURE-CH1 | WP-2B | TEST-FEATURE-001 | `[PROPOSED]` |
| REQ-FEATURE-CH2-PROPOSAL | Chapter 2 (Proposal handoff) renders Publication viewer screenshot | `07` §2.4 | AC-FEATURE-CH2 | WP-2B | TEST-FEATURE-002 | `[PROPOSED]` |
| REQ-FEATURE-CH3-ACTIVITY | Chapter 3 (Revision + Activity) renders Activity panel screenshot | `07` §2.4 | AC-FEATURE-CH3 | WP-2B | TEST-FEATURE-003 | `[PROPOSED]` |
| REQ-FEATURE-CH4-PRIVACY-NEW | Chapter 4 (Private by design) added | `07` §2.4, DEC-D | AC-FEATURE-CH4 | WP-2B | TEST-FEATURE-004 | `[PROPOSED]` (OPEN-DEC-007) |
| REQ-SPECIALTIES-7 | Specialties section expanded from 3 to 7 per `19` §7 | `07` §2.5, DEC-C | AC-SPECIALTIES-7 | WP-2C | TEST-SPECIALTIES-001 | `[PROPOSED]` (OPEN-DEC-006) |
| REQ-COMPARISON-LINKS | Each comparison "Archestimator" row links to a Live feature | `07` §2.7 | AC-COMPARISON-LINKS | WP-4B | TEST-COMPARISON-001 | `[PROPOSED]` |
| REQ-PROOF-REBUILD | ProofSection rebuilt with 4 screenshots + Cloudflare line | `07` §2.8 | AC-PROOF-REBUILD | WP-4A | TEST-PROOF-001 | `[PROPOSED]` |
| REQ-PROOF-COMPANY-GATE | Company proof gated by `getRenderableCompanyProofItems` | `07` §2.8 | AC-PROOF-COMPANY-GATE | WP-4A | TEST-PROOF-002 | `[PROPOSED]` |
| REQ-FAQ-REPLACE | 5 buyer-journey Q&As replace current 5 softballs | `07` §2.9, `19` §10 | AC-FAQ-REPLACE | WP-4A | TEST-FAQ-001 | `[PROPOSED]` |
| REQ-FINAL-CTA | FinalCta recast with brand promise + tagline + cement anchor | `07` §2.10 | AC-FINAL-CTA | WP-4B | TEST-FINAL-CTA-001 | `[PROPOSED]` |
| REQ-FOOTER-COMPANY | Footer adds company line | `07` §2.11, `19` §12 | AC-FOOTER-COMPANY | WP-1C | TEST-FOOTER-001 | `[PROPOSED]` |
| REQ-FOOTER-COMPLIANCE | Footer adds compliance line | `07` §2.11 | AC-FOOTER-COMPLIANCE | WP-1C | TEST-FOOTER-002 | `[PROPOSED]` |
| REQ-FOOTER-VALUE-ANCHOR | Footer adds value anchor | `07` §2.11 | AC-FOOTER-VALUE-ANCHOR | WP-1C | TEST-FOOTER-003 | `[PROPOSED]` |
| REQ-FOOTER-LINKS | Footer link list expanded | `07` §2.11 | AC-FOOTER-LINKS | WP-1C | TEST-FOOTER-004 | `[PROPOSED]` |
| REQ-SECTION-ORDER | Page composition matches `07` §1 target altitude graph | `07` §1 | AC-SECTION-ORDER | WP-1D | TEST-STRUCTURE-002 | `[PROPOSED]` |
| REQ-PRICING-META | /pricing metadata reframed | `07` §3.1, `19` §13 | AC-PRICING-META | WP-3A | TEST-PRICING-001 | `[PROPOSED]` (OPEN-DEC-002) |
| REQ-PRICING-HERO | /pricing hero reframed | `07` §3.1 | AC-PRICING-HERO | WP-3A | TEST-PRICING-002 | `[PROPOSED]` (OPEN-DEC-002) |
| REQ-PRICING-CEMENT-ANCHOR | /pricing cement anchor eyebrow + status pill updated | `07` §3.1 | AC-PRICING-CEMENT-ANCHOR | WP-3A | TEST-PRICING-003 | `[PROPOSED]` (OPEN-DEC-002) |
| REQ-PRICING-TIER-SHAPE | /pricing tier shape reframed | `07` §3.1 | AC-PRICING-TIER-SHAPE | WP-3A | TEST-PRICING-004 | `[PROPOSED]` (OPEN-DEC-002) |
| REQ-PRICING-VALIDATION-MOVE | "How we are validating price" → "How we set the price", moved lower | `07` §3.1 | AC-PRICING-VALIDATION-MOVE | WP-3A | TEST-PRICING-005 | `[PROPOSED]` (OPEN-DEC-002) |
| REQ-FEATURES-META | /features metadata reframed | `07` §3.2, `19` §14 | AC-FEATURES-META | WP-3B | TEST-FEATURES-001 | `[PROPOSED]` |
| REQ-FEATURES-HERO | /features hero reframed | `07` §3.2 | AC-FEATURES-HERO | WP-3B | TEST-FEATURES-002 | `[PROPOSED]` |
| REQ-FEATURES-LEDGER-ORDER | Claims Ledger rendering reordered (Live dominant, NotUs collapsed) | `07` §3.2, DEC-F | AC-FEATURES-LEDGER-ORDER | WP-3B | TEST-FEATURES-003 | `[PROPOSED]` (OPEN-DEC-001) |
| REQ-FEATURES-AI-SECTION-DROP | /features dedicated AI section removed | `07` §3.2 | AC-FEATURES-AI-SECTION-DROP | WP-3B | TEST-FEATURES-004 | `[PROPOSED]` (OPEN-DEC-003) |
| REQ-ABOUT-META | /about metadata reframed | `07` §3.3, `19` §15 | AC-ABOUT-META | WP-3C | TEST-ABOUT-001 | `[PROPOSED]` |
| REQ-ABOUT-HERO | /about hero reframed | `07` §3.3 | AC-ABOUT-HERO | WP-3C | TEST-ABOUT-002 | `[PROPOSED]` |
| REQ-ABOUT-INTRO | /about intro paragraph 4 reframed | `07` §3.3 | AC-ABOUT-INTRO | WP-3C | TEST-ABOUT-003 | `[PROPOSED]` |
| REQ-ABOUT-FOUNDER | /about founder slot replaced | `07` §3.3, DEC-G | AC-ABOUT-FOUNDER | WP-3C | TEST-ABOUT-004 | `[PROPOSED]` (OPEN-DEC-004) |
| REQ-ABOUT-LIMITATIONS | /about limitations reduced from 6 to 3 | `07` §3.3 | AC-ABOUT-LIMITATIONS | WP-3C | TEST-ABOUT-005 | `[PROPOSED]` |
| REQ-CONTACT-META | /contact metadata reframed | `07` §3.4, `19` §16 | AC-CONTACT-META | WP-3D | TEST-CONTACT-001 | `[PROPOSED]` |
| REQ-CONTACT-HERO | /contact hero reframed | `07` §3.4 | AC-CONTACT-HERO | WP-3D | TEST-CONTACT-002 | `[PROPOSED]` |
| REQ-CONTACT-DESIGN-PARTNERS | /contact "design partners" / "no payment or commitment" copy dropped | `07` §3.4 | AC-CONTACT-DESIGN-PARTNERS | WP-3D | TEST-CONTACT-003 | `[PROPOSED]` |
| REQ-CONTACT-DUAL-CTA | /contact dual CTA added | `07` §3.4 | AC-CONTACT-DUAL-CTA | WP-3D | TEST-CONTACT-004 | `[PROPOSED]` (OPEN-DEC-005) |
| REQ-DESIGN-TOKENS-DOC | DESIGN.md landing-tokens section added | `09` | AC-DESIGN-TOKENS-DOC | WP-5 | TEST-DESIGN-001 | `[PROPOSED]` |
| REQ-DESIGN-TOKENS-IMPL | Landing-only CSS custom properties match `09` §3.1/§4.1 token table | `09`, `20` | AC-DESIGN-TOKENS-IMPL | WP-1E | TEST-DESIGN-002 | `[PROPOSED]` |
| REQ-TYPE-SCALE | No landing text exceeds 4rem; hero H1 remains the largest type | `20` §3.2 | AC-TYPE-SCALE | WP-1E | TEST-DESIGN-003 | `[PROPOSED]` |
| REQ-MONO-FONT-REPLACE | No Roboto Mono, Inter, Roboto, Arial, Open Sans, or Helvetica in landing CSS/JSX | `20` §3.1 | AC-MONO-FONT-REPLACE | WP-1E | TEST-DESIGN-008 | `[PROPOSED]` (OPEN-DEC-010) |
| REQ-FLOATING-NAV | Nav is a floating glass pill; mobile menu is hamburger-to-X full-screen overlay | `20` §3.3, `09` §4.3 | AC-FLOATING-NAV | WP-1E | TEST-DESIGN-006 | `[PROPOSED]` (OPEN-DEC-011) |
| REQ-NAV-SIGNIN-UNIFICATION | Nav "Sign in" shares pill geometry with primary CTA as a secondary CTA | `20` §3.2 | AC-NAV-SIGNIN-UNIFICATION | WP-1B | TEST-DESIGN-009 | `[PROPOSED]` |
| REQ-ISLAND-BUTTON | Primary CTA uses fully rounded pill with nested trailing-icon island | `20` §3.2, `09` §4.2 | AC-ISLAND-BUTTON | WP-1B / WP-1E | TEST-DESIGN-005 | `[PROPOSED]` |
| REQ-PRECISION-FRAME | Repeated cards and screenshot frames use the corrected precision-frame primitive; hero mockup keeps its existing product-stage frame | `20` §0 and §3.5, `09` §0 and §4.1 | AC-PRECISION-FRAME | WP-1E / WP-2A / WP-2B / WP-2C / WP-4A | TEST-DESIGN-004 | `[PROPOSED]` |
| REQ-SCROLL-REVEAL | Section blocks enter viewport via IntersectionObserver fade-up + stagger; reduced-motion path exists | `20` §3.6, `09` §6 | AC-SCROLL-REVEAL | WP-1E | TEST-DESIGN-007 | `[PROPOSED]` |
| REQ-AB-VARIANT-B | A/B experiment `hero-cta-copy` variant B wired with new CTA copy | `13` | AC-AB-VARIANT-B | WP-6 | TEST-AB-001 | `[PROPOSED]` |
| REQ-ANALYTICS-EVENTS | Analytics events fire on 5 surfaces (hero CTA, final CTA, scroll depth, FAQ expand, screenshot engagement) | `13` | AC-ANALYTICS-EVENTS | WP-6 | TEST-ANALYTICS-001 | `[PROPOSED]` |
| REQ-MEASUREMENT-PLAN | Measurement plan doc defines success criteria | `13` | AC-MEASUREMENT-PLAN | WP-6 | TEST-MEASUREMENT-001 | `[PROPOSED]` |

---

## 2. Source strength classification

Per `Multi-Agent-Execution-Directive.md` §7.

| Source strength | REQs |
|---|---|
| `brief` (user request directly) | REQ-LINT-*, REQ-HERO-*, REQ-AUDIENCE-*, REQ-PROBLEM-*, REQ-FEATURES-AI-SECTION-DROP, REQ-ABOUT-*, REQ-CONTACT-* (all derive from the user's "no beta wording and all" + "present as legitimate app" + "audit the landing page" brief) |
| `repo evidence` (current source code) | All REQs with file:line evidence in `03` |
| `official docs` | None directly (no framework version-sensitivity in this plan) |
| `provider proof` | None (no Cloudflare binding changes) |
| `assumption` | REQ-HERO-CTA (depends on ASSUMP-001: `/signup` flow supports self-serve) |
| `derived` | REQ-WORKFLOW-SCREENSHOTS, REQ-FEATURE-CH1..4 (derive from `08` Live matrix L1-L11) |
| `owner-delegated decision` | All `[PROPOSED]` REQs that touch brand voice — pending OPEN-DEC sign-off |

---

## 3. Non-functional requirements

| NFR ID | Statement | Source |
|---|---|---|
| NFR-PERF-001 | Landing page LCP < 2.5s on 4G mobile (Cloudflare Workers edge cache) | `13` Core Web Vitals budget |
| NFR-PERF-002 | Landing page INP < 200ms | `13` |
| NFR-PERF-003 | Landing page CLS < 0.1 | `13` |
| NFR-A11Y-001 | All landing pages pass `axe` accessibility audit (WCAG 2.2 AA) | `05`, `12` |
| NFR-A11Y-002 | Color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text | `05`, `DESIGN.md` |
| NFR-A11Y-003 | Keyboard navigation works on every section; focus visible | `05` |
| NFR-A11Y-004 | Reduced-motion respected (HeroMountMotion, HeroImageZoom, scroll-reveal) | `DESIGN.md` motion rules |
| NFR-SEO-001 | Every public route has unique title + meta description | `03` §6 |
| NFR-SEO-002 | Sitemap includes all 5 public routes + `/trust` | `03` §6.3 |
| NFR-SEO-003 | Schema.org FAQPage JSON-LD preserved on landing | `03` §6.2 |
| NFR-BRAND-001 | Marketing surfaces contain zero banned phrases (`06` §3.2) | `06` |
| NFR-BRAND-002 | Canonical strings (tagline, promise, hook) surface somewhere visible | `08` §11 |
| NFR-CLAIMS-001 | Claims Ledger Live/Building/Planned/NotUs discipline preserved | `03` §5 |
| NFR-CLAIMS-002 | `claims-matrix-check.mjs` continues to pass | `03` §5 |
| NFR-PROOF-001 | No fabricated customer logos, testimonials, adoption metrics, partner names, or compliance badges | `08` §1 |
| NFR-SCOPE-001 | `/workshop/**`, `/share/[token]`, `/api/**`, auth flows, Cloudflare bindings, migrations, package.json — all untouched | `02` §2 |

---

## 4. How this doc feeds the rest of the plan

| Section | Feeds |
|---|---|
| §1 REQ map | `11` (WP-* scope), `12` (TEST-* IDs), `16` (traceability matrix) |
| §2 Source strength | `15` (ASSUMP-* + OPEN-DEC-* context) |
| §3 NFRs | `12` §3 (adversarial QA), `13` (Core Web Vitals budget) |
