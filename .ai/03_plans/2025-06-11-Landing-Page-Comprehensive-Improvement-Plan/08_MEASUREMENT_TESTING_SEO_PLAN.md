# 08 — Measurement, A/B Testing, SEO & Quality Budgets

Status: complete. Builds on the existing consent-gated GA4 + Clarity stack
(`LandingAnalyticsLoader.tsx`, `ABExperimentProvider.tsx`) and the prior A/B + GDPR plan pack
(`.ai/03_plans/landing-page-improvement/ab-testing-gdpr-international-compliance/`). The full
event-taxonomy research is in `Landing-Page-Research-Report.md`; this doc fixes the concrete
post-redesign setup.

## 1. KPIs (in priority order)

| KPI | Definition | Why first-class |
| --- | --- | --- |
| Visitor → beta request | `/` sessions producing a `/contact` form submit (`generate_lead`) | The page's only real conversion during closed beta |
| Hero CTA CTR | hero `cta_click` / sessions | First-screen clarity check |
| Scroll-to-method rate | sessions reaching `#method` viewport | Does the first screen earn the story |
| Request quality | owner-rated lead fit (manual, weekly) | Guardrail against copy that attracts the wrong audience |
| Signed-in workspace opens from `/` | `cta_click(target=workspace)` | Returning-user path health |

Activation KPIs (first estimate created, etc.) stay app-side and out of scope here.

## 2. Event taxonomy (post-redesign)

Keep existing names; add labels — no breaking renames:

| Event | Trigger | Params |
| --- | --- | --- |
| `page_view` | load | `page_type:"landing"`, `ab_variant` |
| `cta_click` | any CTA | `location: hero/header/pricing/final`, `target: request_access/workspace/how_it_works`, `cta_label`, `ab_variant` |
| `section_view` | section 50% visible, once | `section: hero/method/problem/capabilities/product/proof/pricing/final` |
| `faq_open` | FAQ item expand | `question_id` |
| `tab_view` | showcase tab select | `tab: workspace/library/revision/comparison` |
| `generate_lead` | contact form success | `lead_type:"beta_request"`, `source_section` |
| `consent_update` | banner action | `analytics`, `marketing` |

Implementation: extend the existing tracking helper used by `HeroSection`/`PricingSection`
(events already fire `cta_click` with `location`/`target`).

## 3. A/B program (re-armed after redesign — one change per test, NN/g rule)

| # | Hypothesis | Variants | Primary metric | Guardrail |
| --- | --- | --- | --- | --- |
| 1 | Category eyebrow beats outcome eyebrow | "Estimating & proposal workspace for construction teams" vs "Close projects faster." | Hero CTA CTR | Bounce |
| 2 | Existing H1 A/B (re-run on new design) | "The fastest path…" vs "Estimate with precision…" | Beta requests | Scroll-to-method |
| 3 | Hero artifact vs hero artifact+photo-strip backdrop | visual only | Hero CTA CTR | LCP |
| 4 | Secondary link presence | with/without "See how it works ↓" | Beta requests (not CTR) | Hero CTA CTR dilution |
| 5 | FAQ placement | inside pricing vs separate band | Beta requests | Scroll depth |

Minimum sample discipline: with current traffic, run sequentially, 2-week minimum per test; if
volume is too low for significance, treat as directional + qualitative (Clarity session replays).

## 4. Accessibility acceptance checklist (WCAG 2.2 AA)

| Check | Standard | Where |
| --- | --- | --- |
| Contrast: ink-2/paper-1, white/clay, light-text/petrol, badge text | 1.4.3 | tokens (07 Task 1.1, 4.1) |
| No color-only status (MVP/Planned badges icon+text) | 1.4.1 | showcase |
| No autoplaying carousel (removed) | 2.2.2 | proof strip |
| Diagram text alternative (`<ol>`) | 1.1.1 | diagram band |
| Hero artifact `figure`/`figcaption` | 1.1.1 | hero |
| Keyboard: nav, tabs, FAQ, all CTAs; visible focus on all three surface colors | 2.1.1/2.4.7 | page-wide |
| Target size ≥24px | 2.5.8 | CTAs, tabs, FAQ |
| Reduced-motion parity for every animation | 2.3.3 | page-wide |
| Content visible without JS/observer | robustness | MotionReveal fix |
| One H1; logical heading order; landmarks | 1.3.1/2.4.6 | page-wide |

## 5. Performance budgets (gate values)

| Metric | Budget | Current (audit) |
| --- | --- | --- |
| LCP (4G, mid-tier mobile) | ≤2.5s | unmeasured; 308KB preloaded JPEG + 3 overlay layers |
| CLS | ≤0.1 | low risk; verify artifact/font |
| INP | ≤200ms | verify post-redesign |
| Hero media | ≤500KB (target ~0 images) | ~2.8MB (9 slides) + 2.3MB orphan |
| Total landing images | ≤900KB | ~5.1MB |
| Landing JS beyond framework | ≤200KB gz; rough.js dynamically imported below fold | rough.js eager |
| Long-running animations | 1 (diagram draw) | 5+ infinite loops |

Measure: Lighthouse CI (or manual run archived in `screenshots/`), WebPageTest mobile profile,
GA4 web-vitals events if already wired app-side.

## 6. SEO checklist

- [ ] Metadata per 04 §6 (title/description for `/`, `/contact`, `/pricing`, `/features`).
- [ ] H1 unique; section H2s use brand-spine phrasing (carry "estimate/quote/proposal" naturally).
- [ ] FAQ markup: use real `FAQPage` JSON-LD only if FAQ content stays publicly stable.
- [ ] OpenGraph/Twitter image: render the hero artifact as the OG image (product proof in link
      previews; also a forcing function for the artifact to read at small sizes).
- [ ] Verify no-JS render (sections visible) — also the SEO-snapshot insurance.
- [ ] Internal links: footer → `/features`, `/pricing`, `/about`, `/contact`, `/privacy`, `/terms`.
- [ ] Post-launch: Search Console coverage + CTR on the category phrase after 4 weeks.

## 7. Qualitative validation (cheap, before/after)

- 5-second test (3–5 construction/quote professionals, even informal): "What is this product?
  Who is it for?" — pass = both answered from the first screen.
- Clarity replays weekly for the first month: watch for drench-section exits (old) vs capability-row
  engagement (new), FAQ opens, artifact hover attention.
- Beta-request form: add optional "What made you request access?" free-text — the cheapest copy
  research available.
