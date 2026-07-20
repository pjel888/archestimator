# Canonical Execution Plan — Attio-Led `/new` Rebuild

## 1. Outcome, Constraints, Evidence, Stop Condition

### Target result

Replace `/new` with a completely fresh, static-first Archestimator landing page whose structure, proportions, typography, product-stage choreography, and sticky workflow storytelling closely track the current Attio homepage while remaining wholly original in copy, product UI, assets, and brand expression.

### Success criteria

1. `/new` contains the exact 18-band contract in [`architecture/section-system.md`](./architecture/section-system.md): announcement, owned header, 15 main blocks, and owned footer, mapped one-for-one to the current Attio sequence.
2. The page uses Attio as the primary reference. Comand and Intercom may improve secondary details but may not replace, reorder, or dilute the Attio-led hierarchy.
3. No code, copy, CSS, section order, visual composition, motion logic, assets, components, route shell, metadata helper, title, or description are reused from the current `/new` implementation.
4. The only existing implementation carryovers are the canonical `ArchestimatorLogo`/wordmark exports and canonical Signal orange tokens `#F24405` and `#C63804`.
5. Every product visual is a newly authored, sanitized DOM/SVG representation of a source-verified Archestimator workflow; no real customer data, fake traction, fake UI capability, or Attio interface replica appears.
6. The route remains server-rendered and `force-static`; JavaScript is limited to small, named interaction islands. No WebGL, Three.js, GSAP, Lenis, canvas, video, or new runtime dependency is introduced for `/new`.
7. Motion pauses offscreen, stops after one autoplay cycle, stops after manual interaction, and collapses to an immediately readable static state under `prefers-reduced-motion` or without JavaScript.
8. The current `/new` remains functional until the fresh tree passes its pre-cutover checkpoint; the route swap is then verified while the old tree still exists, and deletion happens only after rollback is no longer needed.

### Hard boundaries

- Local repository implementation only. No deploy, DNS, hosted mutation, paid service, or `/` promotion.
- No changes to the active shared `LandingHeader.tsx` work owned by the 2026-07-19 `UX-CTA-001` plan.
- Do not import `PublicPageShell`, `buildLandingMetadata`, current route title/description, shared landing chrome, or any existing landing implementation. Author a fresh route composition and literal `Metadata` object; independently keep `force-static` as the output contract.
- Keep `/new` explicitly noindex during review and provide a real route-specific Open Graph asset.
- Primary CTA: `Request early access` → `/contact?intent=started#contact-form`. The `beta-request` alias is accepted by the parser, but `started` is the current canonical intent.
- No secondary sample-proposal CTA until a real public sample route exists. A product-stage tab or anchor is navigation, not a conversion CTA.

### Evidence base

- Current-run Attio desktop/mobile DOM, computed-style, motion, and screenshot study.
- Current-run Comand and Intercom official-site studies.
- Supplied `CONTEXT/` corpus, classified by [`CONTEXT/README.md`](./CONTEXT/README.md) and reconciled clause-by-clause in [`CONTEXT/claim-reconciliation.md`](./CONTEXT/claim-reconciliation.md).
- Repository source for logo, tokens, CTA parser, product states, Next.js 16 server/client boundaries, and route-specific CSS behavior.

### Stop condition

Stop implementation only when every ready unit is complete, the fresh tree has passed the pre-cutover checkpoint, `/new` has passed static verification on the fresh import, the old `landing-new` tree is gone, the post-deletion source checks are green, the temporary rollback copy is removed, and every requirement is reconciled to fresh evidence. Browser/performance/visual claims remain explicitly unproven unless the implementation task separately authorizes and runs the named QA proposal.

## 2. Precedence and Supersession

The latest founder directive controls the redesign. It supersedes older supplied-brief instructions that say to retain or refactor the current `/new`, reuse its WebGL discipline, use Edra as a reference, avoid a new type direction, or keep the prior section scaffold. It does **not** supersede product truth, canonical messaging, accessibility, performance discipline, prohibited-claim rules, or the one-primary-CTA conversion goal.

Reference precedence is strict:

1. **Attio:** near-exact structural/type/motion grammar.
2. **Comand:** secondary technical precision only.
3. **Intercom:** secondary mobile progressive disclosure and trust closure only.
4. **Archestimator:** all copy, product semantics, imagery, proof, logo, color, and conversion behavior.

## 3. Canonical Design Decisions

### Layout

- Sticky stack: `48px` announcement + `68px` desktop header (`116px` total); narrow stack approximately `100px`.
- Outer frame: `max-width: 1440px`, `24px` desktop insets, `16px` narrow insets.
- Structural grid: 24 equal columns with hairlines; desktop workflow split is `6/24` navigation + `18/24` proof.
- Breakpoints: `640`, `768`, `992`, and `1280px`.
- Section intro rhythm: `152px` top / `80px` bottom desktop, `88px` / `64px` mobile unless the section contract gives a smaller band.
- Marketing surfaces remain architectural and mostly square. Use `10px` controls, `8–16px` product windows, and layered product-only shadows; no generic floating-card/bento field.

### Typography

- Load Inter through `next/font/google`, scoped to `/new`; use weights `400`, `500`, `600`. Do not copy Attio's proprietary Inter Display files.
- Preserve the canonical logo/wordmark component unchanged. Do not replace it with text or `public/archestimator_logo.svg`.
- Mobile hero: `40/38px`; `56/54px` from `640px`; desktop `clamp(64px, calc(16px + 5.333svh), 80px)` at `.95` line height.
- Standard H2: `32/36px` mobile and `40/44px` desktop. Dark-system title: `40/40px` mobile and `56–64px` desktop. Nothing exceeds `80px`.
- Hero lead: `15/19.5px` mobile, `18/23.4px` desktop. Body `16/22px`; compact body/nav `14/20px`; labels/product chrome `12–13/18px`.
- Headings use `500–600` weight and tight negative tracking; body uses regular/medium. Currency and quantity fields use tabular numerals.

### Color and material

- Canvas `#FFFFFF`; secondary canvas `#F7F7F5`; ink `#111214`; muted `#62656C`; line `#E6E6E3`; dark act `#0E0F11`.
- Signal `#F24405` is the sole bright accent. Use dark ink on Signal fills. Use `#C63804` only for small orange text/icons on light surfaces.
- Hero atmosphere adapts Attio's gradient/stripe treatment into a pale orange field (`#FFF7F2` → `#FFE4D5` → `#FFC3A6`) with a subtle `1px / 8px` vertical stripe.
- No full-orange section, gradient blob, glassmorphism, neon, fake 3D object, or off-brand orange.

### Motion

There are four motion families only:

1. **Entry/reveal:** `blur(1.5–2.5px)`, opacity, and at most `16px` translation; `600–800ms`; reveal easing `[0,0,.58,1]`.
2. **Product playback:** one shared controller for hero, reusable-intelligence, and decision-signal demos; in-view only, one autoplay cycle, tab-hidden/offscreen pause, manual interaction stops autoplay.
3. **Sticky workflow state:** active chapter changes near `45%` viewport; indicator `320ms`; panels reveal at `70–75vh`; click scroll is smooth unless reduced motion.
4. **Microinteraction:** color/border/underline only; `50ms` enter, `300ms` exit, no hover lift.

Desktop hero reveal order mirrors Attio: eyebrow `0ms`, H1 `100ms`, lead `200ms`, primary CTA `300ms`, product stage `450ms` delay with `900ms` scale `.98→1`. After initial scroll, desktop copy fades to `0`, blurs to `2.5px`, and the stage settles near `.852` within `800ms`. This behavior is removed below `768px` and under reduced motion.

## 4. Product-Truth Contract

The visual story is `estimate → reusable knowledge → output → review → decision/revision context`. [`CONTEXT/claim-reconciliation.md`](./CONTEXT/claim-reconciliation.md) is authoritative for exact status, source paths, and public-strength limits.

| Public proof state | Source truth | Allowed representation | Forbidden implication |
|---|---|---|---|
| Structured estimate | `src/lib/estimates/types.ts`; `src/lib/estimates/tree-hierarchy.ts`; `src/lib/estimates/d1-intents/nodes.ts` | Sanitized hierarchy, rows, quantities, units, rates, totals | Autonomous creation, typed trade/room dimensions, takeoff, price truth, or accuracy guarantee |
| Reusable cost knowledge | `src/lib/repositories/component-library-repository.ts`; `src/lib/reusable-sources/actions.ts`; `src/lib/estimates/actions.ts` | Explicit search, preview, component/template selection, and insert/copy | Automatic reuse, self-learning, global proprietary cost database, or pooled customer data |
| Proposal and Excel output | `src/components/workshop/ProposalExportPreviewDialog.tsx`; `src/lib/proposal-export/create-proposal-workbook.ts`; `src/lib/client-portal/issue-builder.ts` | Preview, editable `.xlsx` download, issued proposal/version state | Native PDF export, legal/contractual certification, immutable legal record, or automatic approval |
| Contextual review | `src/lib/client-portal/public-thread-handlers.ts`; `src/lib/client-portal/thread-repository.ts`; `src/lib/client-portal/publisher-discussion-service.ts` | Targeted discussion tied to issued estimate/area/row context | Anonymous unrestricted access, real-time coauthoring, inline client editing, or automatic retention across versions |
| Decision record | `src/lib/client-portal/decision-service.ts`; `src/components/client-portal/ClientPortalDecisionSection.tsx` | Issue-wide approve/request-changes/decline receipt tied to current content hash | Row-level approval, e-signature, contract execution, or guaranteed approval |
| Revision continuity | `src/lib/client-portal/issue-builder.ts`; `src/lib/client-portal/publisher-discussion-service.ts`; `src/lib/estimates/d1-intents/history-events.ts` | Version/activity context and explicitly manual, revalidated unresolved-thread carry-forward | Claim that feedback automatically rewrites the estimate, applies a guided revision, or closes the loop |

All demo data is authored in `fixtures.ts`, visibly fictional, generic, and sanitized. Product visuals are presentation-only and either `aria-hidden` with an adjacent semantic summary or use concise labelled controls when tabs are genuinely interactive.

## 5. Exact Page Spine

The architecture file is authoritative. The page has 18 visible bands:

1. Announcement
2. Owned header
3. Centered hero and product composition
4. Capability proof matrix
5. Platform thesis
6. Five-chapter sticky workflow
7. Reusable intelligence
8. Dark connected-context act
9. Decision signals
10. Connected handoffs
11. Structured control layer
12. Founder trust
13. Honest proof matrix
14. Illustrative project workflow story
15. Current product/status rail
16. Early-access briefing and FAQ
17. Dark final CTA
18. Owned footer

The Attio order is preserved one-for-one: announcement → navigation → hero/product composition → logo-proof substitute → platform thesis → sticky chapters → self-building substitute → dark system thesis → signals substitute → connectivity substitute → developer-platform substitute → testimonial substitute → scale-proof substitute → customer-story substitute → changelog substitute → newsletter substitute → final CTA → footer. No beat is merged, skipped, or moved.

## 6. Fresh File Architecture

Create only new files under a new tree until cutover:

```text
src/components/landing/new-redesign/
  NewLandingExperience.tsx
  NewLandingHeader.tsx
  NewLandingFooter.tsx
  content.ts
  fixtures.ts
  tokens.module.css
  interactions/
    MobileMenu.client.tsx
    HeroStage.client.tsx
    ProductPlayback.client.tsx
    WorkflowRail.client.tsx
  sections/
    Hero.tsx
    Hero.module.css
    ProductStage.tsx
    ProductStage.module.css
    PlatformWorkflow.tsx
    PlatformWorkflow.module.css
    ConnectedContext.tsx
    ConnectedContext.module.css
    TrustAndClose.tsx
    TrustAndClose.module.css
public/landing/new/
  og-new.png
```

Do not import anything from `src/components/landing-new/**`, `src/components/landing-v3/**`, or existing landing section components. Product source files may be read as semantic truth but are not imported into the new marketing tree.

## 7. Execution DAG

1. [`UNIT-001`](./units/001-freeze-contract-and-fresh-foundation.md): freeze truth, create content/fixtures/tokens, and scaffold the fresh tree beside the live route.
2. [`UNIT-002`](./units/002-build-owned-shell-and-chrome.md): build announcement, page-owned header/footer, and responsive menu.
3. [`UNIT-003`](./units/003-build-hero-and-product-stage.md): build centered hero and four-state product stage with Attio-matched type and entry motion.
4. [`UNIT-004`](./units/004-build-platform-and-workflow-rail.md): build capability grid, thesis, and five-chapter sticky workflow.
5. [`UNIT-005`](./units/005-build-intelligence-context-and-outputs.md): build reusable intelligence, dark system act, decision signals, connected handoffs, and structured-control bands.
6. [`UNIT-006`](./units/006-build-trust-status-faq-and-close.md): build founder trust, honest proof, illustrative workflow, status rail, early-access briefing/FAQ, final CTA, and footer content.
7. [`UNIT-007`](./units/007-compose-cut-over-and-verify.md): compose, wire fresh metadata/CSP/OG, checkpoint, swap and verify the route with rollback intact, then delete the old tree and audit dependencies.

Units are sequential because the shared content/tokens contract must stabilize before section work and the current route must stay intact until all new work is ready.

## 8. Verification Strategy

### Required during implementation (`NOT_REQUIRED` product-test classification)

- Source/diff audit for forbidden imports and old-design reuse.
- Type/LSP diagnostics on changed TypeScript.
- Existing lint/static commands scoped to changed files when supported.
- `rg` checks for `landing-new`, `three`, `WebGL`, `canvas`, fabricated claims, wrong CTA intent, and noncanonical orange within the new tree.
- Static route/source inspection proving one header, one `main`, one footer, `force-static`, noindex, real OG asset, and `/new` in CSP Report-Only coverage.
- Dependency usage audit before removing `three`/`@types/three`; keep GSAP because other routes use it.

### Unrun implementation QA proposal

If the implementation task explicitly authorizes product/browser testing, run design QA at `390×844`, `768×1024`, `1440×900`, and `1800×977`, plus keyboard-only and forced reduced-motion passes. Prove sticky offsets, readable mobile product states, pause/offscreen behavior, no horizontal overflow, contrast, and the 18-band order. Any Lighthouse/bundle/LCP number is a proposal until freshly measured; do not encode speculative thresholds as passed evidence.

### Plan-pack verification

Run:

```bash
bun run validate:plan-pack -- .ai/03_plans/2026-07-20/Landing-Page-Reorganization-And-Redesign
```

## 9. Risks and Recovery

- **Reference over-copy:** retain geometry and timing, never copy Attio/Comand/Intercom words, data, logos, illustrations, CSS, proprietary fonts, or interface assets.
- **Product overclaim:** use the truth matrix; mark conceptual diagrams as conceptual; explicitly avoid automatic revision claims.
- **Hydration/performance:** keep every static band server-rendered; one client island per actual interaction; no canvas/video/third-party animation dependency.
- **Sticky accessibility:** mobile uses a horizontal sticky selector and vertically flowing chapters, not desktop pinning; reduced motion renders final states immediately.
- **Cutover regression:** retain the old tree and an out-of-repo byte-for-byte backup of the exact pre-cutover route plus all four old files through verification; restore all five from that backup if the fresh route fails, then delete only after the fresh import and consumer scan pass.
- **Shared ownership:** do not touch shared `LandingHeader.tsx`/`LandingFooter.tsx`; use page-owned chrome to avoid the active CTA plan.
- **Missing proof:** omit customer logos, testimonials, metrics, sample proposal link, and ROI claims until real evidence exists.

## 10. Completion Reconciliation

The lead must finish with a requirement-to-evidence audit covering: reset/no reuse; reference precedence; exact 18-band count/order; typography/grid/color; four motion families; responsive/reduced-motion contract; clause-level product-truth ledger; CTA/contact route; noindex/CSP/OG; staged cutover and recoverable deletion; dependency cleanup; and static validation. No implementation or release claim may be stronger than the evidence actually collected.
