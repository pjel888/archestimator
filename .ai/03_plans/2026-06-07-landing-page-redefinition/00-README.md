---
title: Landing Page Redefinition Plan
date: 2026-06-07
status: draft-for-implementation
owner: Archestimator
scope: public-homepage
---

# Landing Page Redefinition Plan

## Purpose

This plan redefines the public homepage so it matches what Archestimator is now: a closed-beta cost proposal workspace for quote-heavy teams, with construction estimating as the current proof case and a larger direction toward reusable cost intelligence, proposal records, supplier catalogs, and future quote workflows.

The current homepage is visually promising, especially the Three.js hero background, but the page still feels sparse and disconnected from the current product, Notion strategy, and closed-beta posture. The fix is not more decorative cards or app screenshots. The fix is a stronger narrative, sharper copy, better section rhythm, honest workflow proof, and a conversion path that feels intentionally closed beta.

## Plan Pack

- `01-strategic-brief.md` - requirements, scope boundaries, key decisions, risks, and implementation units.
- `02-information-architecture-and-copy-plan.md` - proposed section order, page thesis, copy system, CTA language, FAQ direction, and route alignment.
- `03-visual-ux-and-media-plan.md` - visual direction, video placeholder policy, motion/accessibility/performance rules, and section-level design notes.
- `04-implementation-and-qa-plan.md` - staged implementation plan, affected files, tests, browser QA, and adversarial scenario matrix.
- `05-research-evidence-and-guardrails.md` - repo, live-browser, `.ai`, Notion, and subagent evidence used to create this plan.

## Accepted Thesis

Archestimator should not present itself as a generic estimating app, a mature procurement platform, or an AI magic estimator.

The homepage should say, clearly:

> Better proposals start with better cost intelligence.

Then it should prove the claim by showing how quote/proposal work stays structured: offer structure, reusable cost logic, assumptions, revision context, and proposal handoff stay connected.

## Non-Negotiables

- Keep the current Three.js hero background direction.
- Do not add app screen mockups or screenshot-style fake product visuals.
- Use video placeholders only as honest proof slots or future recording cards, not as the focus of the page.
- Replace placeholder company-proof energy with workflow proof until real permissioned customer proof exists.
- Treat the product as closed beta: anonymous CTAs should favor `Request beta access`.
- Use `Open workspace` only for authenticated or allowlisted users.
- Label public claims as `Available in MVP preview`, `Partially available`, `Planned next`, or `Do not claim yet`.
- Do not imply purchase-order execution, legal-document automation, autonomous AI estimating, guaranteed savings, guaranteed accuracy, mature compliance, or finalized pricing.

## Source Priority

1. Current product truth and claim safety from repo and `.ai`.
2. Notion Homebase, Brand and Positioning, Marketing and GTM, Roadmap, Pricing, and accelerator pitch pages.
3. Current live homepage behavior at `localhost:3000`.
4. Existing landing-page improvement plans, with stale construction-first or screenshot-first guidance downgraded.
5. Design-system and Impeccable guidance.

## Implementation Stop Condition

The landing redesign is ready for release when:

- The homepage reads as a closed-beta quote/proposal workspace, not a generic or stale construction-only page.
- The first proof after the hero is an honest workflow/video placeholder, not fake customer proof.
- CTA language is consistent with closed beta.
- Planned capabilities are visibly labeled.
- Landing tests, targeted copy tests, reduced-motion checks, desktop/mobile browser QA, and contrast checks pass.
- No dead anchors, horizontal overflow, misleading proof, fake logos, or unlabeled planned workflows remain.
