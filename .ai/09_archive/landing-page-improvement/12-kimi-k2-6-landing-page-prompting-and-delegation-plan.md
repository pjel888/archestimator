# Kimi K2.6 Landing Page Prompting and Delegation Plan

**Date:** 2026-05-21
**Status:** Planning-only; no code implementation.
**Scope:** Public `/` landing page below the locked hero.
**Purpose:** Turn Kimi K2.6 from a vague “make the landing page better” designer into a constrained, brand-grounded frontend product designer for Archestimator.

## 1. Why this plan exists

Philip wants Kimi involved because Kimi is strong for frontend/product UI. That is the right model-routing decision, but Kimi will only perform well if the prompt gives it the same constraints a senior human designer would need:

- exact route and section order;
- hard hero lock;
- Archestimator brand/source documents;
- fake-proof restrictions;
- package boundaries;
- current code references;
- output schema;
- implementation/readiness gates;
- validation commands.

Do not ask Kimi to “make it premium” or “add interactivity” without the repo evidence. That invites decorative SaaS output and could accidentally reopen the accepted hero.

## 2. Source research checked

### Kimi K2.6 capability notes

Checked on 2026-05-21 from Kimi API Platform docs:

- `https://platform.kimi.ai/docs/guide/kimi-k2-6-quickstart`
- `https://platform.kimi.ai/docs/guide/prompt-best-practice`
- Local CLI: `kimi, version 1.44.0`

Relevant findings:

- Kimi K2.6 is described as Kimi’s latest model with stronger and more stable long-term code-writing capability, improved instruction compliance, improved self-correction, and stronger autonomous agent execution.
- K2.6 docs explicitly call out long-horizon coding capability across frontend development, DevOps, performance optimization, and multiple languages.
- K2.6 supports a 256K context window, which is useful for giving it brand docs, live source files, and plan docs together.
- Long-thinking mode is useful for multi-step reasoning/tool use, but the docs warn that official builtin web search is temporarily incompatible with K2.6/K2.5 thinking mode. For landing-page work, do web/source research outside the Kimi thinking run, or disable thinking if Kimi itself must use web search.
- Prompt best-practice guidance emphasizes clear instructions, important details/context, role assignment, delimiters/headings, explicit steps, examples of desired output, target length/format, reference text, and breaking down complex tasks.

### Local CLI readiness note

A direct read-only attempt using:

```bash
kimi --work-dir /Users/philiplewis/archestimator --model kimi-k2.6 --thinking --plan --print --final-message-only --input-format text < /tmp/archestimator-kimi-landing-interactivity-prompt.md
```

returned:

```text
LLM not set
```

The same planning prompt succeeded through the local configured Kimi CLI default without forcing `--model kimi-k2.6`:

```bash
kimi --work-dir /Users/philiplewis/archestimator --thinking --plan --print --final-message-only --input-format text < /tmp/archestimator-kimi-landing-interactivity-prompt.md
```

Output plan path from Kimi:

```text
/Users/philiplewis/.kimi/plans/siryn-hawkman-adam-warlock.md
```

Before a later implementation pass that must specifically use Kimi K2.6, first verify the local Kimi config/model alias. Do not assume `--model kimi-k2.6` works in this CLI environment until a smoke command proves it.

## 3. How to make Kimi perform well on this landing page

### Required prompt ingredients

Use this exact pattern for Kimi landing-page work:

1. **Role:** “senior frontend product designer and interaction designer,” not generic coder.
2. **Mode:** read-only planning, review-only, or implementation. Never leave the mode implicit.
3. **Scope:** public `/` landing page only.
4. **Hard boundary:** `HeroSection` is locked; `ProductShowcaseSection` is below-hero scope even though it lives in `HeroSection.tsx`.
5. **Repo files to inspect:** brand docs, current landing sections, `globals.css`, `package.json`, existing plan docs.
6. **Brand constraints:** construction-estimating language; no generic SaaS filler.
7. **Truth constraints:** no fake logos/testimonials/customers/metrics/maturity claims.
8. **Package constraints:** do not install packages unless explicitly asked; current direction is no GSAP for this pass.
9. **Interactivity objective:** motion must clarify estimating logic, not decorate the page.
10. **Deliverable shape:** named headings and exact acceptance criteria.

### Avoid these Kimi prompts

Do not use prompts like:

- “Make the landing page more interactive.”
- “Use GSAP and make it premium.”
- “Design a modern SaaS landing page.”
- “Improve below the fold however you think best.”

Those are too broad. They do not encode Archestimator’s construction-estimating specificity, the locked hero, the placeholder-proof policy, or the no-new-package preference.

### Preferred working split

Use Kimi in two phases:

1. **Kimi planning/design pass** — read-only; asks for diagnosis, three directions, recommended direction, section map, package recommendation, readiness gates, and implementation prompt.
2. **Builder pass** — Codex-first by default, or Kimi direct only if Philip explicitly wants Kimi to build. The builder must work in an isolated branch/worktree and be independently verified.

If Kimi implements later, Hermes still verifies everything locally. Kimi’s self-report is not final evidence.

## 4. Results from the first Kimi read-only design pass

Kimi returned a useful plan and recommended:

- **Direction B:** CSS + IntersectionObserver + functional product tabs.
- **No new packages.** Lenis is already installed and scoped; GSAP is not justified for this pass.
- **Highest ROI fix:** make `ProductShowcaseSection` tabs functional because visual-only tabs weaken credibility.
- **Motion helper:** one small `IntersectionObserver` reveal helper, not per-section scroll listeners.
- **Content fix:** replace the visible `PlaceholderMedia` in `SolutionSection` with a credible static composition or product preview variant.
- **Accessibility:** `prefers-reduced-motion` must immediately reveal content and disable transform/opacity choreography.

Kimi’s full memo is copied into the active plan pack as:

- `.ai/03_plans/landing-page-improvement/13-below-hero-interactivity-readiness-plan.md`

## 5. Kimi prompt for future read-only/frontend-design pass

Use this when Philip wants another Kimi design pass before implementation:

```text
You are Kimi K2.6 acting as a senior frontend product designer and interaction designer for Archestimator.

MODE: READ-ONLY PLANNING ONLY.
- Do not edit files.
- Do not install packages.
- Do not run destructive commands.
- Do not commit, stage, or push.
- You may inspect repository files and current docs.

Project root: /Users/philiplewis/archestimator
Route: public `/` landing page.

Goal:
Create a frontend design/interactivity plan for improving the Archestimator landing page below the accepted hero. The current hero/above-fold is locked. Do not propose changes to `HeroSection` copy or visual treatment. `ProductShowcaseSection` is below-hero scope even though it lives in `HeroSection.tsx`.

Current rendered section order from `src/app/page.tsx`:
1. `HeroSection` — locked, do not touch.
2. `CompanyProofCarouselSection` — full-width light rail, server component, placeholder-safe, no pause/resume button.
3. `ProductShowcaseSection` — below-hero product preview.
4. `SecondaryClaimSection`.
5. `SolutionSection`.
6. `PricingSection`.
7. `FinalCTASection`.

Current package facts:
- Next.js 16.2.6, React 19.2.4, Tailwind v4 via `src/app/globals.css`.
- `lenis@^1.3.23` is already installed and scoped through `LandingSmoothScrollProvider`.
- No GSAP/framer-motion/motion/anime/react-spring/lottie dependency is installed.

Brand/source files you must inspect first:
- `.ai/06_specs/brand/README.md`
- `.ai/06_specs/brand/brand-voice.md`
- `.ai/06_specs/brand/landing-brand-narrative-map.md`
- `.ai/06_specs/brand/public-facing-feature-copy.md`
- `.ai/03_plans/landing-page-improvement/README.md`
- `.ai/03_plans/landing-page-improvement/08-motion-and-microinteraction-plan.md`
- `.ai/03_plans/landing-page-improvement/09-readiness-and-release-plan.md`
- `.ai/03_plans/landing-page-improvement/11-lenis-smooth-scroll-and-placeholder-company-proof-plan.md`
- `.ai/03_plans/landing-page-improvement/12-kimi-k2-6-landing-page-prompting-and-delegation-plan.md`
- `src/app/page.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/CompanyProofCarouselSection.tsx`
- `src/components/landing/SecondaryClaimSection.tsx`
- `src/components/landing/SolutionSection.tsx`
- `src/components/landing/PricingSection.tsx`
- `src/components/landing/FinalCTASection.tsx`
- `src/components/landing/ProductPreview.tsx`
- `src/app/globals.css`
- `package.json`

Brand constraints:
- Archestimator is for construction cost estimators / contractors / architects / QS / engineers / project teams.
- Copy must stay concrete to construction estimating: estimates, BOQs, proposal packages, revisions, quantities, unit costs, assumptions, cost components, Excel/PDF exports.
- No fake logos, fake testimonials, fake customers, fake metrics, fake maturity claims.
- Placeholder company data is allowed only if explicitly marked and neutral.
- The landing page should prove clarity, connected estimate logic, and less spreadsheet/proposal drift.
- Avoid generic SaaS filler like “streamline workflows” or “unlock productivity.”

Design constraints:
- Hero/above-fold locked.
- Below-hero content is focused in centered containers, except the company carousel rail remains full-width.
- Landing can have premium interaction, but it must not feel like spectacle or “Awwwards for its own sake.”
- Motion must clarify: scattered → structured, hidden cost logic → visible cost logic, revisions → traceable changes, estimate → proposal handoff.
- Prefer CSS/Tailwind transitions + one shared IntersectionObserver helper first.
- Lenis is already in place for page-scroll feel.
- GSAP is allowed only as an optional spike if you identify a section where timeline/scrub choreography is genuinely better than CSS/IntersectionObserver. If you recommend GSAP, justify bundle/complexity, cleanup, reduced-motion, no-JS fallback, and exact scope.
- Respect `prefers-reduced-motion`; content must be readable without JS animation.
- No app/workshop typography changes; non-landing app text scale remains tiny.

Deliverable format:
Return a concise but complete planning memo with these headings:
1. Current landing diagnosis
2. Three interaction directions
   - Conservative CSS-first
   - Strong-fit recommended direction
   - Divergent/GSAP-spike direction if useful
3. Recommended direction and why
4. Section-by-section interactivity map
5. Package recommendation
6. Exact readiness gates before implementation
7. Files likely touched in a later implementation
8. Test/browser QA plan
9. Risks and non-negotiables
10. Final implementation prompt that Hermes/Codex/Kimi could use later

Important: Because this is read-only planning, do not report that you changed files. Do not ask follow-up questions; make the best plan from the repo evidence.
```

## 6. Kimi implementation delegation prompt for later

Use only after Philip approves implementation. Prefer an isolated branch or worktree. This prompt assumes Kimi is the builder; if Codex builds, keep the same constraints but change the role.

```text
You are Kimi K2.6 acting as a senior frontend engineer and interaction designer for Archestimator.

MODE: IMPLEMENTATION IN ISOLATION.
- Work only in the provided branch/worktree.
- Do not merge, push to main, deploy, or touch production infrastructure.
- Do not install new packages.
- Do not touch `/workshop` routes or app/workshop components.
- Do not edit the locked `HeroSection` function; only `ProductShowcaseSection` in `HeroSection.tsx` is in scope.

Project root: /Users/philiplewis/archestimator
Route: public `/` landing page.

Read first:
- `.ai/03_plans/landing-page-improvement/README.md`
- `.ai/03_plans/landing-page-improvement/12-kimi-k2-6-landing-page-prompting-and-delegation-plan.md`
- `.ai/03_plans/landing-page-improvement/13-below-hero-interactivity-readiness-plan.md`
- `.ai/06_specs/brand/brand-voice.md`
- `.ai/06_specs/brand/landing-brand-narrative-map.md`
- `.ai/06_specs/brand/public-facing-feature-copy.md`
- `src/app/page.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/ProductPreview.tsx`
- `src/components/landing/SolutionSection.tsx`
- `src/app/globals.css`
- `package.json`

Task:
Improve below-hero landing interactivity without changing the accepted hero.

Required changes:
1. Convert `ProductShowcaseSection` tabs into a functional accessible tablist with four static panels: Estimate Workspace, Component Library, Revision Intelligence, Proposal Comparisons.
2. Add one small `IntersectionObserver`-based reveal helper, or a `MotionReveal` wrapper, for below-hero section entrance choreography.
3. Apply subtle reveal/stagger to `SecondaryClaimSection`, `SolutionSection`, `PricingSection`, and `FinalCTASection`.
4. Replace the visible `SolutionSection` placeholder media with a credible static product/workflow composition. Do not render the word `placeholder` publicly.
5. Standardize hover/focus-visible microinteractions for landing CTAs/cards.
6. Keep `CompanyProofCarouselSection` behavior intact.

Motion rules:
- No GSAP, no framer-motion, no new package.
- `prefers-reduced-motion` must reveal content immediately and disable transform/opacity choreography.
- Content must be readable if JS animation fails.
- Motion must clarify estimating logic, not decorate.

Truth/copy rules:
- Use concrete construction-estimating language: estimates, BOQs, quantities, unit costs, reusable components, revisions, proposal packages, Excel/PDF exports.
- No fake testimonials, fake customers, fake metrics, fake logos, or fake maturity claims.
- Do not make placeholder company proof sound real.

Validation required before final report:
- `git diff --check`
- `bun run validate`
- `bun run build`
- Browser QA at desktop and mobile widths.
- Confirm `HeroSection` function is unchanged.
- Confirm no `/workshop` files changed.

Final report must include:
1. changed files;
2. validation results;
3. browser QA evidence;
4. reduced-motion behavior;
5. remaining risks.
```

## 7. Verification requirements for any Kimi output

Hermes must verify Kimi’s output before telling Philip it is done:

1. Check `git status --short --branch`.
2. Inspect `git diff -- src/components/landing src/app/page.tsx src/app/globals.css package.json`.
3. Confirm no `/workshop` route/component changes unless explicitly approved.
4. Confirm the `HeroSection` function is unchanged.
5. Run validation locally; do not rely on Kimi’s self-report.
6. Browser-check `/` for desktop, mobile, keyboard tabs, reduced-motion, and no horizontal overflow.

## 8. Current decision

For the next landing interactivity pass, use Kimi as the frontend-design reviewer/planner and use Codex or Kimi only after implementation is explicitly approved.

Recommended product direction from the Kimi pass: **functional tabs + CSS/IntersectionObserver microinteractions; no GSAP package now.**
