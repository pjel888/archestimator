/goal

You are implementing a HIGH-PRIORITY landing page redesign for Archestimator.

THIS IS NOT A PLANNING TASK.

This is a COMPLETE IMPLEMENTATION TASK.

Your job is to faithfully implement the attached plan pack until the entire implementation is COMPLETE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OBJECTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Implement the ENTIRE landing page redesign described in the attached plan pack.

The target route is:

    /new

NOT "/"
NOT any existing marketing pages.

The existing landing page remains untouched.

The /new route is our experimental next-generation landing page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIMARY SOURCE OF TRUTH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The attached plan pack is the PRIMARY source of truth.

Follow it exactly.

Do not improvise architecture.

Do not simplify.

Do not ignore sections.

Implement every requirement.

If something inside the plan pack conflicts with the current codebase,
determine the safest implementation that satisfies BOTH.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECONDARY SOURCES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Read and use all applicable repository documentation before coding.

Including but not limited to:

.ai/

agents.md

claude.md

codex.md

DESIGN.md

Agent contracts

Planning contracts

Landing system

Component conventions

Animation conventions

Cloudflare deployment constraints

Routing conventions

Brand system

Current landing implementation

SEO implementation

Analytics implementation

Cookie consent implementation

Accessibility implementation

Use existing repository conventions whenever they produce the same result.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL DESIGN GOALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The result should feel like a premium modern SaaS.

Reference inspiration:

Velora UI

LaunchPad

But it MUST become unmistakably Archestimator.

DO NOT COPY.

DO NOT CLONE.

DO NOT RECREATE THEIR BRAND.

Use them purely as inspiration for:

• pacing

• layout

• spacing

• hierarchy

• animation quality

• interaction quality

Everything else must become uniquely Archestimator.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERY IMPORTANT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO NOT create fake dashboards.

DO NOT create fake charts.

DO NOT create fake analytics.

DO NOT create generic SaaS illustrations.

Reuse the existing sanitized Estimate Workspace Hero already inside the repository.

Improve it where necessary.

Do not replace it with placeholders.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANDING PAGE PRINCIPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The landing page must:

feel premium

feel architectural

feel deliberate

feel modern

feel extremely polished

avoid marketing fluff

avoid giant paragraphs

avoid feature dumping

avoid endless scrolling

Every section must earn its place.

Reduce words whenever visuals communicate better.

The page should feel expensive.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANIMATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Implement every motion described in the plan pack.

Microinteractions matter.

Hover states.

Scroll reveals.

Depth.

Parallax.

Cursor interactions.

Section transitions.

Reduced motion support.

Everything should feel intentional.

Do not introduce animation that hurts usability.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSIVENESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The landing page must be production quality on:

Desktop

Laptop

Tablet

Mobile

No overflow.

No broken layouts.

No clipped animations.

No layout shift.

No hydration mismatch.

No visual glitches.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERFORMANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do NOT sacrifice performance.

Maintain:

excellent Lighthouse

excellent Core Web Vitals

excellent CLS

excellent LCP

excellent INP

Avoid unnecessary JavaScript.

Lazy load where appropriate.

Keep bundle size under control.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCESSIBILITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Maintain full accessibility.

Semantic HTML.

Keyboard navigation.

Focus states.

ARIA.

Reduced motion.

Color contrast.

Screen reader compatibility.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Maintain everything specified in the plan pack.

No accidental indexing.

Keep:

metadata

structured data

canonical strategy

OpenGraph

robots

analytics

cookie consent

intact.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPLEMENTATION STRATEGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before touching code:

1.

Read the ENTIRE plan pack.

2.

Read all affected source files.

3.

Map dependencies.

4.

Determine implementation order.

5.

Only then begin coding.

Never code blindly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPLEMENTATION LOOP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Repeat until COMPLETE:

Read

Understand

Implement

Review

Refactor

Simplify

Polish

Review again

Fix

Repeat

Do not stop after "working."

Continue until it is genuinely polished.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CODE QUALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Prefer:

existing components

existing hooks

existing utilities

existing animation systems

existing tokens

existing providers

Delete duplication.

Do not create unnecessary abstractions.

Do not over-engineer.

Prefer maintainability.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELF REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After implementation, perform multiple review passes.

Review as:

Frontend engineer

Design engineer

Product designer

Accessibility reviewer

Performance reviewer

Architecture reviewer

Animation reviewer

Marketing reviewer

Fix every issue discovered.

Repeat until no meaningful issues remain.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Commit frequently.

Small logical commits.

Meaningful commit messages.

Push regularly.

Never accumulate massive uncommitted changes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO NOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not rewrite unrelated systems.

Do not touch authenticated routes.

Do not modify existing production landing pages.

Do not remove existing reusable components unless replaced with a better version.

Do not create fake marketing metrics.

Do not invent customer testimonials.

Do not invent company logos.

Do not add placeholder copy.

Everything must remain truthful.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUCCESS CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The task is complete ONLY when:

✓ Every implementation unit in the plan pack is finished.

✓ Every acceptance criterion is satisfied.

✓ The page is responsive.

✓ The page is visually polished.

✓ Motion is complete.

✓ Accessibility passes.

✓ Performance remains excellent.

✓ No obvious UX issues remain.

✓ No console errors.

✓ No hydration issues.

✓ No layout issues.

✓ No TODOs remain.

✓ Code has been cleaned and refactored.

✓ Commits have been pushed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

At the end provide:

1. Executive summary

2. Files created

3. Files modified

4. Major architectural decisions

5. Performance improvements

6. UX improvements

7. Animation improvements

8. Accessibility improvements

9. Remaining risks

10. Acceptance checklist

11. Git commit history

12. Anything intentionally deviated from the plan pack and why

Only finish once the landing page is genuinely production-ready and would be worthy of replacing the current landing page.

/goal Implement the attached Archestimator `/new` landing-page plan pack completely and production-ready.

Treat every file in the attached plan pack as the primary source of truth. Begin with `README.md`, `00_INDEX.md`, `plan-pack.json`, the implementation sequence/units, acceptance criteria, copy deck, wireframes, motion specification, component architecture, responsive requirements, validation plan, and licensing notes. Also read all applicable repository instructions, especially `AGENTS.md`, agent contracts, design conventions, and planning/execution policies.

Scope:
- Work only on the `/new` landing-page route and directly supporting reusable components.
- Do not replace or materially alter the current `/` production landing page.
- Follow the Velora-inspired structure defined in the plan pack, translated into Archestimator’s light visual system and truthful product narrative.
- Reuse the repository’s existing sanitized Estimate Workspace hero demo. Do not create generic fake dashboards, fabricated metrics, testimonials, customers, logos, or placeholder product UI.
- Use LaunchPad only for interaction and motion cues described in the pack. Do not copy its branding or content.
- Keep the page focused and appropriately concise. Every section must earn its place.

Execution:
1. Inspect the full plan pack and all affected code before editing.
2. Build a dependency and blast-radius map.
3. Implement the documented units in sequence.
4. Reuse existing shells, tokens, components, CTA routes, analytics, consent, SEO, animation utilities, and accessibility patterns where appropriate.
5. Implement responsive behavior, reduced-motion handling, semantic HTML, keyboard support, focus states, contrast, and loading/error safeguards.
6. Prevent horizontal overflow, hydration mismatches, layout shifts, console errors, broken interactions, and unnecessary client-side JavaScript.
7. Preserve `/new` indexing behavior exactly as specified in the plan pack.
8. Respect third-party licensing and attribution requirements documented in the pack.
9. Do not over-engineer or rewrite unrelated systems.

Continuously loop through implementation, browser inspection, review, correction, simplification, and polish until every acceptance criterion is satisfied. Use all relevant available skills and parallel agents where genuinely helpful, but maintain one coherent implementation and resolve conflicts before merging work.

Validate with the repository’s appropriate lint, type-check, build, and focused tests. Perform visual browser QA at desktop, laptop, tablet, and mobile widths, including animations, navigation, CTAs, overflow, reduced motion, and console output. Avoid broad unrelated test expansion.

Create small logical commits with meaningful messages and push the completed work unless repository policy or unavailable credentials prevent it.

Do not stop at a partial scaffold. Finish all plan-pack requirements, remove temporary code and unresolved TODOs, and provide a final report containing:
- completion status
- plan units and acceptance criteria completed
- files created and modified
- major design and architecture decisions
- validation commands and results
- responsive, accessibility, performance, and motion QA
- commits created and push status
- deviations from the plan with justification
- remaining risks or blockers

The task is complete only when `/new` is polished, truthful, responsive, accessible, performant, visually coherent, and ready for production review.