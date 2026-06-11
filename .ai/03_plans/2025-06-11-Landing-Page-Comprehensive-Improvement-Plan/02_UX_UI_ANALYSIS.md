# 02 — UX/UI Analysis (Severity-Rated Findings)

Status: complete. Every finding cites code or live-session evidence from `01_CURRENT_STATE_AUDIT.md`.
Severity scale: **P0** = undermines trust/conversion or breaks content; fix before any visual polish.
**P1** = materially weakens the page's job; fix in the first improvement pass. **P2** = quality and
craft; fix in the polish pass. **P3** = housekeeping.

The page's job (from `.ai/06_specs/brand/` + the research report in this folder): make a
construction/quote professional believe, within one screen, that Archestimator is a clearer way to
build quotes, estimates, and proposal-ready documents — then move them to the workspace or a
closed-beta request without fake proof.

---

## A. Trust & authenticity (the owner's "more authentic" goal)

### A1. Placeholder testimonials violate the brand's own guardrails — P0
Three rotating quotes attributed to "Estimating lead / Commercial interiors beta workflow",
"Preconstruction manager / General contractor", "Proposal owner / Specialty trade"
(`CompanyProofCarouselSection.tsx:170-191`). `brand-narrative.md` and
`landing-brand-narrative-map.md` §13 explicitly ban fake testimonials on the public homepage.
For a trust-led product ("trust matters more than pure automation"), invented social proof is the
single highest-risk element on the page. **Remove or replace with honest proof** (workflow pillars,
founder thesis, beta-program facts).

### A2. Five video placeholders with no videos — P0
One large "Launch feature video" frame plus four feature-card video frames render play buttons over
empty grid textures (`CompanyProofCarouselSection.tsx:142-168`). To a buyer this reads "unfinished
site", which contaminates the credibility of every real claim nearby. Either ship one real
walkthrough asset (even a 30–60s screen capture) or redesign these slots as static product
proof (annotated screenshots) until video exists.

### A3. Internal contradiction: features marketed as live but tabbed as "Planned" — P0
"Activity History" is sold in the drench section as a flagship card ("Every revision. Every
decision. Always on record.") while the product showcase tabs label "Revision Intelligence" and
"Proposal Comparisons" as **Planned preview** (`ProductShowcaseSection.tsx:91-134`). A diligent
buyer reading both sections finds the page disagreeing with itself. Align the claims ladder:
live MVP capabilities get full feature treatment; planned capabilities get explicit "on the
roadmap" framing.

### A4. The palette is literally amigo.ai's palette — P1
`--brand-orange: #aa412a` and the teal `#083241` are byte-identical to amigo.ai's published CSS
variables (`--amigo-orange: #aa412a`, `--amigo-blue: #083241` — see
`03_REFERENCE_ANALYSIS_AMIGO_INTERCOM.md` §2). Likewise "The Archestimator estimate residency"
mirrors Amigo's "Digital Residency" naming, and the section order mirrors the scraped amigo
structure in `.omx/artifacts/visual-ralph/landing-amigo-reference/`. None of this is visible to a
casual visitor today, but it is the root of the "not authentic" feeling: the page is wearing
another brand's system. Keep the two-color strategy the owner wants, but re-derive the exact
values, the supporting neutrals, and the section vocabulary as Archestimator's own
(see `05_VISUAL_DESIGN_DIRECTION.md`).

### A5. Empty logo-carousel scaffolding — P2
An aria-hidden empty marquee viewport ships ahead of real customer logos
(`CompanyProofCarouselSection.tsx:112-116`). Dead structure invites someone to fill it with fake
logos later (banned) and currently contributes only dead vertical space. Remove until logos are real.

---

## B. First screen & conversion path

### B1. H1 is outcome-only; category is never stated above the fold — P1
"The fastest path from proposal to approval." names no category and no audience. Every reference
page that converts well states **what the product is** in the first screen (research report §
"Say what the product is immediately"; Amigo: "The trusted platform for building, training, and
deploying clinical agents"; Intercom: "The only helpdesk designed for the AI Agent era").
The fix is not discarding the headline the owner likes — it is pairing it with a category-bearing
support line and eyebrow so the first screen answers *what is this / who is it for / why care*.

### B2. "Start Winning" CTA is off-voice and low-information — P1
Brand voice doc lists preferred CTAs: "See the workspace", "Open the workspace", "Start a quote",
"Build a sample quote" (`brand-voice.md` §CTA). "Start Winning" (`HeroSection.tsx:227-234`) is a
sales-bro register the voice spec explicitly avoids ("confident but not overclaiming"), and it
hides what happens on click (it goes to a contact form for signed-out users — a surprise).
Verb+object CTAs that say what happens next outperform vague enthusiasm.

### B3. Single CTA path; no self-qualification — P1
The hero offers one button. There is no "see how it works" / pricing-logic path for
comparison-shoppers (research report: intent-matched CTA table). With pricing deferred during beta,
the honest secondary path is an anchor to the workflow walkthrough (`#method`/`#product`) or the
beta-terms section (`#pricing`). Add a quiet secondary CTA; keep one primary.

### B4. Hero left column has a ~250px dead gap between H1 and support copy — P1
Live screenshot shows the H1 block and the support+CTA block separated by a large empty band
(flex spacing in `HeroSection.tsx` left column). It reads as a rendering bug, not rhythm, and it
pushes the CTA toward the fold line.

### B5. Mobile hero carries zero product narrative — P1
The diagram cards and the signal rail are `hidden lg:block` (`HeroSection.tsx:270-320`). On mobile
the hero is: eyebrow → H1 → paragraph → button → blurry photo. All product
substance (workflow stages, capability list) vanishes. Mobile needs its own compact product-proof
element, not an amputated desktop composition.

### B6. Nav offers no path into the page narrative — P2
Header nav is Platform / Specialties / Company (dropdowns) and a Workspace CTA
(`LandingHeader.tsx:70`), while the page's actual anchors are `#method`, `#product`, `#pricing`,
`#contact`. The named nav items don't map to the single-page story; "Specialties" promises
content the page only gestures at (`SecondaryClaimSection` is a 432px text block). Make nav
items mirror the real sections (How it works / Product / Beta & pricing / Contact) until real
subpages ship.

---

## C. Hero visual & the diagrams (owner: "good BUT still greatly needs improvement")

### C1. The hero visual shows construction, not the product — P1
A blurred rotating photo of timber/warehouses with a procedural gradient on top
(`HeroSection.tsx:239-268`) gives zero evidence the product exists. Intercom's own published ad
research (cited in the research report) found real product imagery outperforms brand-only visuals.
The strongest available proof — the estimate workspace with tree, line items, totals — already
exists as mockups further down the page. The hero visual should *be* product proof
(framed workspace composition or an annotated estimate artifact), with photography demoted to a
treatment, not the subject.

### C2. Floating hero cards have weak figure-ground and tiny type — P1
The three numbered cards sit directly on a busy photo at ~12px body size with translucent
backgrounds. On the live render their copy is hard to read at arm's length, and the right-edge
signal rail items are smaller still. If the cards stay, they need an opaque surface, larger type,
and fewer words; if the hero pivots to product proof (C1), the cards' content merges into the
rough-notation diagram section below.

### C3. 9-slide / 72s Ken Burns rotation is cost without benefit — P2
~2.8MB of JPEG for slides most visitors never see (median session won't reach slide 3), plus
continuous compositing work under the text. One decisive image (or the product composition from C1)
beats nine mediocre rotations — and recovers LCP headroom.

### C4. Rough.js diagram labels break mid-word — P1
"Reusable Componen t Library", "Intuitive Estimating Experienc e" (live screenshot;
`AnimatedProposalRecordSection.tsx` circle labels). The hand-drawn signature the owner wants to
keep is currently shipping with typography bugs that read as broken, not sketchy.

### C5. The rough-notation language is isolated to one band — P2
The hand-drawn voice (rough underlines in hero, rough.js flow diagram) is the page's most
distinctive, ownable asset — and it disappears after pixel 1,485. The drench section, product tabs,
pricing, and final CTA use none of it. Systematize it: sketch annotations for callouts in the
product showcase, hand-drawn arrows/underlines as the consistent "human pencil over precise
document" motif (see `05_VISUAL_DESIGN_DIRECTION.md` §rough-notation system).

### C6. Diagram has no text alternative — P2
The flow (Workflow → Library → Estimate → Proposal → Decision) is conveyed only inside an
`aria-hidden` SVG. Screen-reader users skip the page's best workflow explanation. Provide a
visually-hidden ordered list or adjacent prose equivalent.

---

## D. Visual system & layout

### D1. Reveal-gated content can render blank — P0
Reproduced live: under rAF throttling, whole sections paint as empty color fields
(MotionReveal initial opacity-0 + transition; Lenis-coupled scroll). The same mechanism risks blank
first-paints on slow devices, during fast flick-scrolls, and in link-preview/headless renderers.
Rule: sections must be **visible by default**; entrance motion may *enhance* (e.g., transform/
opacity from 96%→100%) but never gate visibility. (This also matches the impeccable skill's
"reveal animations must enhance an already-visible default".)

### D2. The teal brand color is structurally absent until the footer — P1
The page's stated two-color identity (terracotta + deep teal) is in practice terracotta-only for
~6,000px, then teal appears once as the footer. Amigo's actual rhythm (the model this page borrowed)
alternates warm-light and deep-dark anchor sections (~70/30). Introduce the teal as a mid-page
anchor section (the product showcase or proof section) so the two-color identity is experienced,
not just present in the footer.

### D3. Terracotta drench section is 1.7 viewports of saturated background — P1
1,658px of `#aa412a` with white text, five placeholder media frames and four equal cards. The drench
overwhelms (orange = action color elsewhere) and the section tries to do four jobs at once
(video, feature grid, testimonials, logo strip). Split the jobs; cap the drench at ~one viewport
if kept (see `06_SECTION_BY_SECTION_IMPROVEMENT_SPEC.md` §4).

### D4. Typography does not follow the project's own landing scale — P1
`DESIGN.md` defines a landing-only Inter scale (display 4rem/400/−0.055em, headline-lg, h1–h3,
body 350). The page renders SF Pro at ad-hoc sizes (38/48/54px H1), while Inter is loaded by
`next/font` and then unused (`src/app/layout.tsx:2,7` vs `globals.css:88-94`). Either adopt the
DESIGN.md Inter scale on the landing (recommended; it was written for this register) or update
DESIGN.md — today the system and the page disagree and we pay a font download for nothing.

### D5. Section headline vocabulary drifts off-brand — P1
"The Archestimator estimate residency" (borrowed metaphor, meaningless to a contractor),
"A partnership focused on quote-to-proposal value" (abstract), "Reliable estimating infrastructure
for construction proposals" (infrastructure-speak). The brand docs supply a ready section spine
("Quote in the shape of the offer", "Reuse the cost logic that repeats", "Keep every estimate
version traceable"… — `landing-brand-narrative-map.md` §Section copy spine). Use it.

### D6. Identical-card grids and equalized rhythm — P2
The drench section's 4 equal cards (icon + heading + text + media slot) and the showcase's 4 tabs
produce template rhythm. Vary the proof form per capability (one annotated screenshot, one mini
table, one sketch diagram, one stat) so each section earns its layout.

### D7. Cookie settings button floats over content all session — P3
Persistent bottom-left "Cookie settings" chip overlaps section content in every screenshot.
Move into the footer after first consent decision.

---

## E. Performance

| # | Finding | Severity |
| --- | --- | --- |
| E1 | ~2.8MB hero slide payload all mounted at load; 2.3MB orphan PNG still in `public/landing/` | P1 |
| E2 | LCP image composited under blur + canvas + gradient layers (delays perceived completeness even when LCP fires) | P2 |
| E3 | Inter webfont downloaded but unused on landing (double cost if D4 adopts Inter without removing SF Pro overrides) | P2 |
| E4 | rough.js imported eagerly in a below-fold section; defer like Neat.js | P3 |
| E5 | Continuous animations (Ken Burns ×9, marquee, crossfade, scan, pulses) keep compositor busy for the whole session | P2 |

Budgets to adopt (from the research report, aligned to current CWV): LCP ≤ 2.5s, INP ≤ 200ms,
CLS ≤ 0.1; hero media ≤ 500KB total; landing JS ≤ 200KB gz beyond framework.

---

## F. Accessibility (WCAG 2.2 AA target)

| # | Finding | WCAG | Severity |
| --- | --- | --- | --- |
| F1 | Auto-playing testimonial carousel, no pause/stop control | 2.2.2 Pause, Stop, Hide | P1 |
| F2 | "MVP/Planned preview" badges color-only | 1.4.1 Use of Color | P2 |
| F3 | Rough.js flow diagram lacks text alternative | 1.1.1 Non-text Content | P2 |
| F4 | 12px orange-on-cream / white-on-terracotta micro-text at ~4.5:1 with no margin | 1.4.3 Contrast | P2 |
| F5 | `role="img"` video placeholders announce nonexistent media to AT | 1.1.1 / honesty | P1 (resolves with A2) |
| F6 | Reveal-gated sections (D1) — content not perceivable if JS/observer fails | 1.1.1 robustness | P0 (same fix as D1) |

Existing strengths to preserve: reduced-motion coverage, keyboard-navigable tabs, semantic
landmarks, descriptive hero alt text, consent-gated analytics.

---

## G. SEO & metadata

| # | Finding | Severity |
| --- | --- | --- |
| G1 | Title "Archestimator \| Quote, Proposal & Estimate Workspace" is serviceable but generic-order; research report recommends category-keyword-led titles ("Construction Estimating Software for …") — decide the category phrase once (see 04 §6) and align title, H1 support, and meta description to it | P2 |
| G2 | One H1 per page confirmed — keep | — |
| G3 | No FAQ/structured data; no honest proof section for snippet text; revisit after section rebuild | P3 |
| G4 | PHP-peso (₱) product mockups vs. globally-worded copy — decide the market story (Philippine-first honesty vs. neutral currency in marketing mockups). Flag to owner; both are fine, ambiguity is not. | P2 |

---

## Summary scorecard (current page)

| Dimension | Score /10 | Dominant reason |
| --- | --- | --- |
| Trust & claims honesty | 3 | Fake testimonials, empty video frames, self-contradicting claims |
| First-screen clarity | 5 | Strong outcome headline; missing category, single vague CTA |
| Product proof | 4 | Real mockups exist but are buried; hero shows stock photo |
| Visual distinctiveness | 5 | Rough-notation voice is genuinely ownable but underused; palette borrowed |
| Brand-system compliance | 4 | Voice/CTA/typography drift from the project's own specs |
| Motion quality | 5 | Rich, reduced-motion safe — but reveal-gating breaks robustness |
| Accessibility | 6 | Good bones; carousel, color-only badges, diagram alt |
| Performance | 5 | 5MB+ media for a text-first page |
| **Overall** | **4.6 / 10** | Authenticity and proof, not decoration, are the gap |

The improvement plan therefore prioritizes, in order: (1) honest proof, (2) first-screen clarity
with product evidence, (3) making the rough-notation + two-color system genuinely Archestimator's
own, (4) motion/perf robustness — and only then decorative polish.
