# Archestimator Landing Page Improvement Plan Pack

## Status

- **Mode:** Plan Pack
- **Package:** `PLAN-2026-07-22-landing-page-improvement`
- **Profile:** standard
- **Implementation:** not started
- **First ready unit:** `UNIT-001`
- **Target route:** `/`
- **Reference route:** `/new` remains noindex and unchanged
- **Action ceiling:** local implementation only
- **Tests:** user-controlled; static verification is available, browser proof remains a proposal until separately authorized

## Target Result

Replace the current public root landing page with a light, airy, direct product story that:

- explains Archestimator in the first viewport;
- keeps the current sanitized estimate workspace as the one exact hero proof;
- uses neutral, visibly labelled replacement slots for any later product screenshots that do not yet exist;
- applies `--brand-orange` as the action color and as the continuous cost-thread narrative device;
- borrows only subtle liquid-glass material cues from the workshop and app;
- uses one GSAP-controlled Three.js/WebGL story to explain continuity from estimate to decision;
- remains complete with reduced motion, no WebGL, touch input, or JavaScript-disabled core content;
- preserves current public-shell analytics, cookie consent, metadata behavior, CTA destinations, and the noindex `/new` reference route.

## Authority Order

1. Current `AGENTS.md` and project planning/validation policy.
2. Current repository source and current product behavior.
3. The user's current landing direction and proof instructions.
4. `00-PLAN.md` and the remaining artifacts in this pack.
5. External references as design research only, never as clone targets.

## Artifact Map

| Artifact | Purpose |
| --- | --- |
| `00-PLAN.md` | Canonical implementation contract, dependency graph, decisions, units, and acceptance criteria. |
| `01-CURRENT-STATE-AND-PROOF.md` | Route, product-proof, dependency, token, and stale-plan audit. |
| `02-DESIGN-REFERENCE-MOTION-SPEC.md` | Page divisions, copy deck, light material system, GSAP/WebGL behavior, and fallback design. |
| `03-VALIDATION-RESUME-AUDIT.md` | Verification boundary, evidence matrix, resume instructions, and final audit. |
| `KIMI-IMPLEMENTATION-PROMPT.md` | Kimi-specific implementation prompt moved from `.ai/08_prompts/` and rewritten around current source. |
| `research/REFERENCE-SITE-SYNTHESIS.md` | First-party reference-site research, dated 2026-07-23. |
| `research/KIMI-PROMPTING-RESEARCH.md` | First-party Kimi prompt/model/agent research, dated 2026-07-23. |
| `plan-pack.json` | Machine-readable execution and evidence manifest. |

## Primary Decisions

1. The root route is the implementation target. `/new` is a preserved legacy reference, not the redesign target.
2. The exact hero proof is the current sanitized `EstimateWorkspaceClient` demonstration exposed by `HeroEstimateWorkspaceMockup` and wrapped by `NewLandingHeroDemo`. The user referred to this as the `/new` hero; current source identity wins over route naming.
3. The current fake browser dots, URL bar, glow field, and aurora treatment around that exact proof are removed. The underlying product surface stays.
4. Later product proof may use neutral replacement slots only. A slot cannot contain fabricated controls, tables, dashboards, or product-inspired UI.
5. The visual language is daylight-first: warm white, near-black ink, fine rules, quiet surface depth, and orange action. Glass is restricted to navigation or small foreground hierarchy cues.
6. GSAP owns scroll choreography. One Three.js island receives normalized story progress; it never owns scrolling and never carries essential copy.
7. Existing GSAP and Three.js dependencies are sufficient. No dependency addition is planned.
8. The stale 2026-07-21 landing plan pack is historical input only. This pack supersedes its route assumptions and execution order.

## Stop Condition

Implementation is complete when `AC-001` through `AC-008` are reconciled against fresh evidence, the exact hero proof remains truthful, all later visual placeholders are honest, core content survives every fallback, static verification is green, and any unrun browser proposal is reported as a proof gap rather than passed.

