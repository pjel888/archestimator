# Completion Report — `/new` Landing Implementation

**Date:** 2026-07-21
**Executor:** codebase AI (goal-mode run against this pack's `prompt.md`)
**Target route:** `/new` only
**Outcome:** implemented, validated, and committed. Release/promotion remains `NOT_EVALUATED` — no deployment, no sitemap/canonical change, `/` untouched.

## 1. Outcome summary

`/new` now renders a complete, light, product-led landing page following the Velora macrostructure with truthful Archestimator content, the real sanitized estimate-workspace demo in the hero (loop on desktop/in-view, static final phase on mobile/reduced-motion/hidden tab), restrained GSAP/CSS motion with full reduced-motion fallbacks, and the design-partner early-access conversion model. The live `/` route, sitemap, globals, contact flow, providers, and package/lockfiles are unchanged.

## 2. Files created

- `src/components/landing-new/ArchestimatorNewLandingPage.tsx` — server-first page composition (all 13 sections + FAQ JSON-LD)
- `src/components/landing-new/NewLandingAuthCta.tsx` — client island: auth-aware primary CTA and sign-in/workspace link (`useLandingAuthHint`)
- `src/components/landing-new/NewLandingHeroDemo.tsx` — client island: frame + in-view/media-driven playback wrapper
- `src/components/landing-new/NewLandingMotionController.tsx` — client island: scroll progress, hero entrance, reveals, flow activation, spotlight, menu dismiss
- `src/components/landing-new/NewLandingPrimitives.tsx` — server primitives: container, section heading, four bento mini-visuals
- `src/components/landing-new/new-landing-content.ts` — all visible copy, typed, single source (also feeds FAQ schema)
- `src/components/landing-new/new-landing.module.css` — scoped light visual system, responsive, reduced-motion

## 3. Files modified

- `src/app/new/page.tsx` — renders `PublicPageShell isHomePage` + new page; absolute title, description, `robots: noindex,nofollow`, `force-static` preserved
- `src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx` — backward-compatible optional props `playback` (default `"loop"`), `staticPhase` (default `"fauxwood-replaced"`), `pauseWhenDocumentHidden` (default `false`), `className`; paused playback cancels timers and ends shared drag state; loop resumes deterministically from the current phase index
- `src/components/landing-v3/landing-v3.module.css` — three additions only: `--hero-mockup-canvas-width` / `--hero-mockup-shift-x` inherit-hooks on the existing scale rule (defaults identical to previous behavior), and a `[data-hero-playback="static"]` rule hiding the cursor/ghost layer

## 4. Shared-file changes and why

Only the shared hero mockup (+ its CSS module) changed, exactly as the pack's conditional edit allows. Defaults preserve current `/` behavior byte-for-byte at the prop level; the existing call `<HeroEstimateWorkspaceMockup />` is unchanged and still loops. The CSS variable hooks default to the old values (`1780px`, `0px` shift), so `/` renders identically.

## 5. Route-isolation result

`git diff` confirms no changes to: `src/app/page.tsx`, `src/app/sitemap.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/landing/*` (shell, contact, analytics), `src/lib/landing/seo-metadata.ts`, `package.json`, `bun.lock` (a concurrent, unrelated support-feature change exists in the worktree and was deliberately excluded from this task's commits). `/new` builds as `○` (static prerender). No A/B provider mounted. No canonical added. No redirect.

## 6. Copy/claim audit result

- Prohibited-phrase scan over `src/app/new` + `src/components/landing-new`: **0 matches** ("Trusted by", "Bids won", "AI-powered", "See the workflow", "Book a walkthrough", "Free forever", "per month", etc.)
- Positive scan confirms: approved H1, "Request early access", "Pre-release MVP", `/contact?intent=beta-request`, `data-landing-cta` attributes, `fauxwood-replaced` static phase
- Main narrative word count: **750 words** (target 700–900, excluding FAQ/footer/labels)
- FAQ JSON-LD generated from the same `faqs` array as visible copy; no Offer/rating/review schema

## 7. Commands run and results

- `bun run type-check` — pass
- `bun run lint -- src/app/new/page.tsx src/components/landing-new src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx` — pass
- `git diff --check` (scoped) — pass
- `bun run validate:plan-pack .ai/03_plans/2026-07-21/archestimator-new-landing-plan-pack` — pass (hashes refreshed after adding this report)
- `NODE_OPTIONS="--max-old-space-size=8192" bun run build` — pass; `/new` listed as static (`○`). Note: plain `bun run build` OOM-crashed (SIGABRT) on this machine; with an 8 GB heap the build completes. This is a machine/memory condition, not a code error.
- Browser QA (Playwright, owner-authorized via `prompt.md`), all pass:
  - viewport matrix 360/390/768/1024/1280/1440/1920: one H1, `noindex,nofollow`, zero horizontal overflow, product frame visible at every width, zero console/page errors
  - reduced motion (390 + 1280): static playback, `data-new-landing-motion="reduced"`, all content visible without animation
  - desktop loop lifecycle: static → loop when frame in view (`drag-faucet` observed) → static when scrolled away
  - live `/` smoke: renders, zero page errors
  - mobile menu opens and lists all links + CTA; reveals never leave content hidden (0 stuck elements after scroll-through at 1440 and 390)

## 8. Commands not run

- `bun run test`, Playwright spec files, Lighthouse/Web Vitals profiling, screen-reader runs — not created or expanded; browser QA above was the authorized scope. Measured LCP/CLS/INP claims are therefore **not made**.

## 9. Test proposals awaiting authorization

| ID | Proposal | Status |
|---|---|---|
| TP-001 | `bun run build` | RUN (authorized by task prompt) — pass with 8 GB heap |
| TP-002 | Browser viewport matrix | RUN — pass |
| TP-003 | Reduced-motion/visibility browser check | RUN — pass |
| TP-004 | Scoped Playwright `/new` spec file | UNRUN — no test files created (not requested) |
| TP-005 | Current `/` smoke | RUN — pass |
| TP-006 | Lighthouse/Web Vitals profile | UNRUN — authorization not provided |
| TP-007 | Screen-reader spot check | UNRUN — authorization not provided |

## 10. Known visual/performance uncertainty

- Real-device (touch, iOS Safari) behavior unverified; QA was Chromium headless.
- Lighthouse/CWV numbers unmeasured (TP-006). Source-level budgets hold: no new dependencies, server-first page, 3 small client islands + existing demo, reserved frame aspect ratios, offscreen/hidden pause, no canvas/WebGL.
- `content-visibility: auto` was considered for lower sections and intentionally skipped to avoid ScrollTrigger measurement interplay; the page is light without it.
- The first `bun run build` OOM is environmental; CI memory should use the 8 GB flag if it reproduces there.

## 11. Requirement-evidence reconciliation

| ID | Status | Evidence |
|---|---|---|
| REQ-001 | PASS | route-isolation diff; `/` smoke pass |
| REQ-002 | PASS | copy deck transcription in `new-landing-content.ts`; prohibited scan 0 matches; 750-word narrative |
| REQ-003 | PASS | all CTAs "Request early access" → `/contact?intent=beta-request`; pricing slot replaced by design-partner cards |
| UX-001 | PASS | 13-section Velora-mapped order in `ArchestimatorNewLandingPage.tsx`; light token system |
| UX-002 | PASS | hero mounts `HeroEstimateWorkspaceMockup` with sanitized local data |
| UX-003 | PASS | viewport matrix QA; frame visible 360–1920; static mobile phase; DOM-order vertical flow |
| UX-004 | PASS | GSAP/CSS only; one-shot reveals; reduced-motion static path verified in browser |
| PERF-001 | PASS (source level) | no dep/lockfile change; 3 route client islands; loop pauses offscreen/hidden; budgets unmeasured (TP-006) |
| SEC-001 | PASS | sanitized labels; no fabricated proof; no customer data fetched |
| OPS-001 | PASS | noindex/nofollow; shell consent/analytics inherited; CTA data attributes; this report |
| AC-001 | PASS | §5 |
| AC-002 | PASS | section order + light system in source; QA screenshots |
| AC-003 | PASS | hero diff, default props, cleanup source; loop lifecycle QA |
| AC-004 | PASS | §6 |
| AC-005 | PASS | viewport matrix QA incl. mobile product proof |
| AC-006 | PASS | reduced-motion QA; cleanup in motion controller and mockup |
| AC-007 | PASS (source level) | build pass; no runtime added; measurement boundary noted |
| AC-008 | PASS | prohibited scan; demo-data labeling |
| AC-009 | PASS | metadata source; single-source FAQ schema; validator pass; this report |
| AC-010 | PASS | CTA contract in `NewLandingAuthCta.tsx`; no pricing/scarcity/proof |

## 12. Current `git status --short` (scoped)

Commits contain only: `src/app/new/page.tsx`, `src/components/landing-new/`, `src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx`, `src/components/landing-v3/landing-v3.module.css`, and this pack's traceability refresh. Unrelated concurrent worktree changes (support feature) were left untouched and uncommitted by this task.

## 13. Deviations from the plan pack

1. **Auth-aware CTA split into `NewLandingAuthCta.tsx`** — the pack's fixed tree listed six files; doc 08 explicitly permits splitting the auth-aware CTA into its own client component to keep the page server-first. Taken.
2. **Testing/browser QA executed** — the pack's default was `TEST_PROPOSAL`; the owner's `prompt.md` for this run explicitly authorized lint, type-check, build, and browser QA. Authority order §1 (owner's current request) applied.
3. **Commits + push performed** — same owner authorization overrode the pack's no-commit boundary.
4. **Mobile demo crop uses `--hero-mockup-canvas-width: 980px` + `--hero-mockup-shift-x: 60px`** — tuned per wireframe crop notes after visual inspection; keeps estimate hierarchy and rows legible without hiding the real component.
5. **No third-party code or assets copied.** Velora used for structure/interaction study; LaunchPad for conceptual motion cues only. No attribution notice required.

## 14. Remaining risks / next actions

- Promotion of `/new` is a separate owner decision (see pack doc 11 promotion checklist).
- TP-006/TP-007 (Lighthouse, screen-reader) remain unrun proposals.
- Real-device touch QA recommended before any promotion.
- **No deployment or promotion occurred.**
