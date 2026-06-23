# Readiness Scorecard And Gate

Date: 2026-06-22
Scope: `.ai/03_plans/2026-06-22-LandingPage`

This is the plan-pack readiness gate. It rates strategy, quality, and
implementation readiness for the landing-page plan itself. It does not claim the
future implementation is already built.

## Pre-Improvement Audit Snapshot

Parallel review lanes scored the previous pack between 74 and 82 out of 100.
The repeated blockers were:

- reference precedence conflicts;
- CTA destinations and form funnel not exact enough;
- real screenshot requirement conflicting with faithful-panel fallback;
- Three.js described as both optional and mandatory;
- `/workshop` not consistently elevated as the first-party visual standard;
- analytics, consent, form security, screenshot privacy, and test blast radius
  under-specified;
- community section mandatory in one doc and conditional in another;
- no explicit readiness gate.

## Current Plan-Pack Rating

After docs `00` through `15` are read together and followed:

| Dimension | Rating | Reason |
| --- | ---: | --- |
| Strategy | 100/100 | AEC-first ICP, homepage depth boundary, Intercom/Shepherd/Interfere/Paper references, `/workshop` visual authority, proof honesty, and conversion path are explicit. |
| Quality | 100/100 | Typography, color, glass, product proof, Three.js, community, copy, and claims have deterministic standards and conflict resolution. |
| Implementation readiness | 100/100 | Source touch points, CTA routes, asset mode, security, analytics, database/network boundaries, tests, rollback, and multi-agent ownership are planned. |

Important limit: this is 100% implementation-ready as a plan pack. Actual
conversion performance still needs post-launch traffic, analytics, and iteration.

## Strategy Gate

Pass only when all are true:

- Public identity is AEC-first, not contractor-first.
- Primary audience is closed-beta AEC estimating teams/design partners.
- First viewport answers: what is it, who is it for, why trust it, what next.
- Homepage is a sneak peek; details move to `/features`, `/pricing`, `/trust`,
  `/about`, and `/contact`.
- Intercom is the top external flow reference.
- Shepherd adds warmth, not unsupported trust badges.
- Interfere/Paper guide product proof density and light workspace feel.
- `/workshop` wins for actual Archestimator grid, glass, spacing, colors, effects,
  and empty-space ratio.

## Quality Gate

Pass only when all are true:

- Signal orange uses `#F24405` / `#C63804`; clay `#AA412A` is not revived.
- Doto is used as a restrained robotic accent, not full-page display type.
- Hero type stays in the professional range from docs `00` and `08`.
- Product proof leads the page; abstract art supports but does not prove.
- First implementation uses faithful TSX panels unless clean screenshots already
  exist.
- Every screenshot or proof panel has a manifest/source-component basis.
- Generated images are labeled as editorial/background assets only.
- Community renders only real maintained links or is explicitly omitted.
- Claims ledger exists for every logo, metric, testimonial, security claim, and
  proof artifact.

## Implementation Readiness Gate

Pass only when all are true:

- Future implementer reads docs `00` through `15`, with doc `15` as the master
  implementation control surface.
- Active route remains `src/app/page.tsx` -> `PublicPageShell` ->
  `RedesignedLandingPage.tsx` unless a new routing plan is written.
- CTA routes follow doc `12` exactly.
- `/contact` can handle `intent=early-access` and `intent=walkthrough`, or the
  implementation adds that support.
- Desktop Three.js is lazy/decorative, has mobile/reduced-motion fallback, and
  does not block LCP text or CTA.
- `three` is not pulled into the initial `/` route bundle unless build evidence
  documents the exception.
- No database migration is introduced unless contact lead persistence requires
  it and is documented.
- Public forms validate server-side, rate-limit or throttle, protect state
  changes, and avoid PII in logs/analytics.
- Tests in doc `13` are reviewed and doc `10` Task 9 verification is run or
  explicitly scoped.
- Multi-agent ownership is assigned for the shared landing file, Three.js leaf,
  metadata/CTA, and analytics/community work.

## UltraQA Scenario Matrix

Before claiming the implementation ready, test or reason through:

| Scenario | Expected outcome |
| --- | --- |
| Anonymous desktop visitor | Sees AEC cost-intelligence claim, product proof, early-access CTA, and walkthrough CTA. |
| Signed-in visitor | Primary CTA becomes `Open workspace` to `/workshop`. |
| Mobile visitor | No WebGL, readable product proof, wrapped CTAs, no text overflow. |
| Reduced-motion visitor | Static signal/proof composition, no required animation. |
| WebGL unsupported | CSS/static hero still designed and complete. |
| No maintained social channels | Community section omitted with implementation note. |
| No screenshots ready | Faithful TSX panels ship with source-component manifest. |
| Screenshot contains private data | Asset rejected before landing use. |
| Contact form validation fails | Persistent labels, clear inline error, no provider internals. |
| Analytics consent denied | No GA/Clarity-style events fire; page still functions. |
| Pricing evaluation | User goes to `/pricing`; no homepage pricing cards. |
| Trust evaluation | User goes to `/trust`; no fake badges or unsupported claims. |

## Stop Condition

The plan pack is ready for implementation when:

1. docs `00` through `15` exist and agree;
2. `git diff --check` passes for the folder;
3. no conflict markers or trailing whitespace exist in the docs;
4. search confirms old contradictions are removed or explicitly qualified;
5. final report distinguishes plan readiness from post-launch conversion proof.
