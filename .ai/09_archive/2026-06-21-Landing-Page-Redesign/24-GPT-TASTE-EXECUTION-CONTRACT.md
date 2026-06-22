# 24 - GPT Taste Execution Contract

> **STATUS: PLANNING ONLY - 2026-06-22 - not code.**
> **Mandatory skill:** `$gpt-taste` from
> `/Users/philiplewis/.agents/skills/gpt-taste/SKILL.md`.
> This document restructures the landing implementation handoff so every UI-building agent starts
> from the installed taste-skill contract before writing React, CSS, copy markup, motion code, or
> visual assets.

**Purpose:** make `$gpt-taste` the enforceable execution prompt for the Archestimator landing
redesign while preserving the plan pack's product-truth rails: Glass Brand continuity, radical
honesty, accessibility, Core Web Vitals, and the closed-beta MVP constraints.

---

## 1. Invocation rule

Every implementation lane that touches the public marketing or auth UI MUST start its prompt with:

```text
$gpt-taste
Implement the Archestimator Landing Page Redesign from
.ai/03_plans/2026-06-21-Landing-Page-Redesign.
Read 24-GPT-TASTE-EXECUTION-CONTRACT.md first, then MASTER-IMPLEMENTATION-PLAN.md.
Before writing any React/UI code, output the required <design_plan> block and obey the
gpt-taste AIDA, GSAP, hero, bento, asset, and label-sweep rules unless a named Archestimator
truth rail below explicitly narrows the rule.
```

The literal `$gpt-taste` invocation is not optional. If a future implementation prompt omits it,
that prompt is invalid and must be rewritten before code starts.

Supporting skills installed from the same taste package are available for narrower surfaces:

| Skill | Role in this pack |
|---|---|
| `$gpt-taste` | **Primary and mandatory** execution contract for the landing/auth visual build. |
| `$design-taste-frontend` | Secondary anti-slop review pass for landing/portfolio/redesign taste after `$gpt-taste` has shaped the build. It does not override `$gpt-taste`. |
| `$design-taste-frontend-v1` | Compatibility fallback only. Do not use unless an older prompt explicitly requires v1 behavior. |
| `$stitch-design-taste` | Use only if producing a Google Stitch `DESIGN.md` reference. It is not the React implementation contract. |

---

## 2. Precedence

The build must satisfy `$gpt-taste`; however, this is still Archestimator. When the skill and the
product contract collide, resolve in this order:

1. **Truth and safety:** no fabricated features, metrics, testimonials, partner logos, prices,
   compliance badges, screenshots, or product states. `06-PROOF-AND-CLAIMS-DISCIPLINE.md` wins.
2. **Accessibility:** `prefers-reduced-motion`, keyboard access, text contrast, focus visibility,
   body-text floor, and no hover-only disclosure are hard gates. `12-ACCESSIBILITY-AUDIT.md` wins.
3. **Performance:** Core Web Vitals, the <=4 live-blur cap, and bundle budgets remain gates.
   `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` wins.
4. **Brand continuity:** Glass Brand tokens, signal orange discipline, Doto/Roboto Mono/SF Pro,
   and no clay `#AA412A` remain hard contracts. `03-VISUAL-LANGUAGE-AND-TOKENS.md` wins.
5. **Taste execution:** within those rails, `$gpt-taste` is mandatory and should be applied
   aggressively, not softened into a generic restrained SaaS page.

This means "static interfaces are forbidden" from `$gpt-taste` is interpreted as:

- the marketing landing must include real GSAP-powered editorial motion;
- auth, forms, legal/claims tables, reduced-motion mode, and crawlable claim text still degrade to
  static, accessible HTML;
- motion is concentrated in isolated client leaves so the RSC-first shell remains intact.

---

## 3. Mandatory `<design_plan>` block

Before writing any UI code, the implementing agent MUST produce a `<design_plan>` block containing
all five `$gpt-taste` preflight checks, adapted to Archestimator:

```xml
<design_plan>
1. Python RNG Execution:
   seed = len(prompt) % N
   hero = <Cinematic Center | Artistic Asymmetry | Editorial Split>
   font = <Satoshi | Cabinet Grotesk | Outfit | Geist>
   components = <three selected gpt-taste components>
   gsap = <two selected GSAP paradigms>

2. AIDA Check:
   Navigation, Attention/Hero, Interest/Bento or mechanic grid, Desire/GSAP proof motion,
   Action/Footer are all present.

3. Hero Math Verification:
   H1 max width is explicit, default max-w-6xl or wider. Hero line count is designed for
   2-3 lines, never 4-6. No stamp icons, spam tags, raw hero stats, or fake proof.

4. Bento Density Verification:
   Any bento/grid uses grid-flow-dense and a stated span math check. No missing corners,
   dead cells, or unowned voids. If the section uses a mechanic grid instead of bento,
   the same no-dead-space proof is required.

5. Label Sweep and Button Check:
   No cheap meta labels such as SECTION 01, QUESTION 05, ABOUT US. Button text contrast is
   verified. Primary CTA uses signal orange only where AA-safe.
</design_plan>
```

The plan is saved in the implementation evidence or PR description. If it is missing, the phase
fails verification even if the code compiles.

---

## 4. Required `$gpt-taste` design commitments

| Skill requirement | Archestimator implementation contract |
|---|---|
| Creative premium nav | Build a glass masthead that feels like product chrome, not a generic SaaS navbar. |
| AIDA structure | Map AIDA to the existing route taxonomy: Navigation -> Hero -> product-mechanic interest -> commercial-graph/claims desire -> CTA/footer action. |
| 2-3 line hero | The hero H1 uses an ultra-wide measure (`max-w-6xl` baseline) and must not wrap into a narrow six-line slab at 1280px, 768px, or 414px. |
| Gapless bento | The "What you get" or product-mechanic band must use a verified dense grid, horizontal accordion, or equally deliberate no-dead-space composition. |
| Editorial typography | The landing editorial font is selected by deterministic RNG from Satoshi, Cabinet Grotesk, Outfit, or Geist. Inter is forbidden. Doto remains valid for the wordmark, app-continuity accents, and product-native UI moments, but it does not satisfy the `$gpt-taste` editorial-font requirement by itself. |
| Real GSAP | Add `gsap` and `@gsap/react` only after checking `package.json`; current repo state does not list them. Use `ScrollTrigger` in isolated client leaves only. |
| Hover physics | Every clickable card/image/mechanic tile gets transform feedback inside an overflow-safe wrapper, with reduced-motion fallbacks. |
| GSAP paradigms | At least two of: scroll pinning, image scale/fade, scrubbed text reveal, card stacking. Select them in the `<design_plan>`. |
| Component arsenal | At least three of: inline typography images/material capsules, horizontal accordions, infinite marquee, feedback carousel. Testimonials are banned unless real; use a claims/proof carousel or founder/proof panel instead. |
| Asset rule | Seeded `picsum.photos` may be used only for draft atmospherics or placeholders, explicitly marked and blocked from cutover. Production prefers Archestimator abstract material assets, commercial-graph visuals, OG assets, or real founder/product assets. |
| Meta-label ban | No "SECTION 01", "QUESTION 05", "ABOUT US", fake chapter tags, or cheap eyebrow numbering. |
| Horizontal overflow guard | The root marketing surface uses `overflow-x-hidden w-full max-w-full` or the plan's stricter `overflow-x: clip` equivalent. Any GSAP off-screen motion must be contained. |

---

## 5. Motion architecture

The `$gpt-taste` build adds a new landing motion island:

```text
src/components/landing/gpt-taste/
  GsapLandingMotion.tsx
  GsapPinnedProof.tsx
  GsapScrubbedWords.tsx
  GsapCardStack.tsx
  gpt-taste-design-plan.ts
```

Rules:

1. Each file that imports GSAP starts with `"use client"`.
2. Server components render all core copy and claim text before the client leaf hydrates.
3. `ScrollTrigger` is registered inside the client leaf and cleaned up on unmount.
4. The leaf must check `prefers-reduced-motion`; reduced motion shows the final readable state
   without scrubbing, pinning, scale, opacity traps, or scroll-jacking.
5. Off-screen transforms must be wrapped so they cannot create horizontal scrollbars.
6. GSAP must not own auth form submission, claims data, SEO text, or route-level state.

---

## 6. Parallel-agent execution prompt

When multiple coding agents implement this plan, the lead dispatches disjoint scopes only. Use this
coordination preamble in every worker prompt:

```text
Dedicated /goal: implement your assigned landing-redesign slice under the mandatory $gpt-taste
contract. You are not alone in the repo. Multiple agents may be editing nearby files. Do not
revert others. Before editing, run git status and re-read every file you will touch. Stay inside
your assigned write scope. If another lane conflicts with your scope, stop and report to the lead.
Before UI code, produce the required <design_plan> for your slice or cite the lead-approved shared
<design_plan>. Return changed files, verification run, and unresolved gates.
```

Disjoint lane split:

| Lane | Owns | Does not touch |
|---|---|---|
| Foundation lead | `globals.css`, package dependency additions, shared barrels, `LOOP_LEDGER.md` | Section bodies |
| Hero/taste motion | hero, GSAP islands, AIDA design plan | Auth forms, claims parser, package scripts except through lead |
| Product-mechanic grid | "What you get", horizontal accordion/bento mechanics | Hero H1, auth |
| Commercial graph/claims | plate, claims ledger, proof carousel/filter | Hero typography, forms |
| Auth | `/login`, `/signup`, `src/components/auth/` | Marketing GSAP except shared brand panel import |
| Verification | tests, visual/perf/a11y gates | Source UI except test fixtures |

Barrel exports and shared dependency installs are lead-only to avoid conflicts.

---

## 7. Verification gates added by this contract

The implementation is not complete until these pass or are honestly carried:

1. `rg -n "gpt-taste|<design_plan>|ScrollTrigger|@gsap/react|gsap" src/ tests/` shows the planned
   implementation and tests for the taste contract.
2. `rg -n "SECTION [0-9]|QUESTION [0-9]|ABOUT US" src/components/landing src/app -g '*.tsx'`
   returns zero false-positive public labels.
3. A hero-wrap test verifies the H1 max-width class and bans 4-6 line narrow hero structures by
   static class contract plus visual proof at implementation time.
4. A dense-grid test verifies `grid-flow-dense` or documents the equivalent no-dead-space layout.
5. GSAP unit/DOM tests verify `ScrollTrigger` registration is client-only and cleaned up.
6. Reduced-motion tests verify pinned/scrubbed/card-stack sections render readable final states.
7. Performance checks compare pre/post bundle cost. If GSAP pushes marketing first-load JS over the
   budget, the GSAP island must be dynamically imported or deferred below the fold.
8. Visual proof captures the first viewport, pinned proof section, dense grid, and mobile 320/375/414
   fallbacks once code exists. Browser proof is not required for this docs-only restructuring pass.

---

## 8. Open gates

| ID | Gate | Default until closed |
|---|---|---|
| L-TASTE-1 | Approve adding `gsap` and `@gsap/react` to dependencies. | Plan assumes they will be added during implementation after package check. |
| L-TASTE-2 | Final choice of the Python RNG output for hero/component/GSAP selections. | Implementer computes it in `<design_plan>` from the actual prompt. |
| L-TASTE-3 | Production replacement for any seeded placeholder imagery. | Use abstract Archestimator material assets or real approved assets before cutover. |
| L-TASTE-4 | Owner visual sign-off that the Awwwards-style motion still feels like Archestimator. | Keep Glass Brand tokens and honesty rails; carry sign-off to visual gate. |

These gates do not block planning. They block production cutover if unresolved.

---

## 9. Non-negotiable bans

- No fabricated testimonials, logos, metrics, ratings, compliance badges, partner names, prices, or
  product screenshots.
- No raw `SECTION 01`, `QUESTION 05`, `ABOUT US`, or similar meta-labels.
- No narrow 6-line hero headline.
- No invisible or low-contrast button text.
- No hover-only claim disclosure.
- No GSAP scroll motion that traps keyboard users or ignores `prefers-reduced-motion`.
- No `#AA412A`, clay token, or unapproved orange small text.
- No uncontained off-screen transforms that create horizontal scrollbars.

The correct result is a Glass Brand landing that feels materially more ambitious, editorial,
motion-rich, and mathematically composed than the prior plan, while still telling only the truth.
