# Validation, Resume, and Completion Audit

## Validation Classification

- **Current planning work:** static contract validation only.
- **Future landing implementation:** `NOT_REQUIRED` for automated product tests by default.
- **Browser/visual proof:** `TEST_PROPOSAL`, closed behind `AUTH-001` until the user explicitly requests it for the implementation task.
- **External deployment:** outside scope and never inferred from local evidence.

## Planning Evidence Completed

| Claim | Evidence |
| --- | --- |
| Root and `/new` route authority | `src/app/page.tsx:1-22`; `src/app/new/page.tsx:1-24` |
| Exact hero provenance | `NewLandingHeroDemo.tsx:17-97`; `HeroEstimateWorkspaceMockup.tsx:18-67,220-320` |
| Fake browser frame boundary | `NewLandingHeroDemo.tsx:69-95`; `new-landing.module.css:649-766` |
| Current landing composition/copy | `ArchestimatorNewLandingPage.tsx:53-88`; `new-landing-content.ts:54-335` |
| Current glass/material patterns | `src/app/globals.css:242-317,1510-1551` |
| Existing motion/3D dependencies | `package.json` GSAP, `@gsap/react`, `three`, `@types/three` entries |
| Reference-site synthesis | `research/REFERENCE-SITE-SYNTHESIS.md` |
| Kimi prompt guidance | `research/KIMI-PROMPTING-RESEARCH.md` |

## Acceptance Evidence Matrix

| Criterion | Required implementation evidence | Test classification |
| --- | --- | --- |
| `AC-001` | Source/diff confirms root shell and current route/CTA/metadata behavior; `/new` diff is empty. | `NOT_REQUIRED` |
| `AC-002` | Active CSS/source scan confirms light route tokens, orange signal, limited blur, and removed banned patterns. | `NOT_REQUIRED` |
| `AC-003` | Source/diff confirms exact hero import, disclosure, removed fake chrome, and neutral later slots. | `NOT_REQUIRED` |
| `AC-004` | Server composition/copy inspection confirms hierarchy, first-viewport content, three-part strip, and claim discipline. | `NOT_REQUIRED`; visual line-wrap proof remains proposed. |
| `AC-005` | Source confirms one labelled GSAP timeline, native-scroll ownership, client-only Three boundary, fallback, and cleanup. Rendered reversible-scroll evidence is proposed. | `TEST_PROPOSAL` |
| `AC-006` | Source/CSS confirms matchMedia branches, stacked mobile content, semantics, and no-WebGL/reduced-motion fallbacks. Viewport/assistive proof is proposed. | `TEST_PROPOSAL` |
| `AC-007` | Source confirms dynamic story load, DPR cap, visibility pause, explicit dimensions, and disposal. | `NOT_REQUIRED`; performance measurement is optional evidence if later requested. |
| `AC-008` | Fresh static command output, complete diff inspection, changed-file list, and explicit proof gaps. | `NOT_REQUIRED` |

## Authorized Static Verification for Implementation

Use the smallest relevant path set after the final diff exists:

```bash
git diff --check
bun run lint -- src/app/page.tsx src/components/landing-production
bun run type-check
rg -n "traffic-light|heroDemoDots|heroDemoUrl|aurora|fake dashboard|placeholder screenshot|BIM|automated takeoff|AI-powered|customer logos|Awwwards-winning" src/components/landing-production src/app/page.tsx
git diff -- src/app/page.tsx src/components/landing-production src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx src/app/new/page.tsx
```

Rules:

- Read every command result.
- Repair in-scope failures only.
- Do not broaden into unrelated tests or builds.
- Do not call a command passed if it was not run or its output was not read.
- If the repository command name changes, use the current package script that provides the same static evidence and record it.

## Proposed Browser Evidence

Only run if `AUTH-001` is explicitly opened for the implementation task.

### Viewports and states

1. 1440 x 1000 desktop.
2. 1280 x 800 laptop.
3. 768 x 1024 tablet.
4. 390 x 844 mobile.
5. 320 x 812 narrow mobile.
6. Reduced-motion desktop and mobile.
7. WebGL unavailable or forced static fallback.
8. Full down-scroll and up-scroll through all five stages.

### Proof targets

- first-viewport message and CTA hierarchy;
- hero headline line count;
- exact hero product readability and disclosure;
- no fake browser chrome or aurora;
- single orange thread continuity;
- reversible five-stage story;
- no blank canvas/loading shift;
- stacked mobile sequence;
- no horizontal overflow;
- focus, navigation, FAQ, and CTA usability;
- reduced-motion and no-WebGL completeness.

Browser evidence proves only the inspected local state. It is not hosted or production proof.

## Plan-Pack Validation

After every plan artifact and manifest hash is current:

```bash
bun run validate:plan-pack -- .ai/03_plans/2026-07-22/landing-page-improvement
git diff --check -- .ai/03_plans/2026-07-22/landing-page-improvement .ai/08_prompts/kimi-landing-page.md
```

The prompt source path should be absent after the move. The destination prompt is part of the manifest.

## Requirement Reconciliation Checklist

### `REQ-001`

- [ ] `/` is the only redesigned route.
- [ ] `ProductionPublicPageShell` behavior remains.
- [ ] `/new` remains noindex and unchanged.
- [ ] CTA/contact/workspace/sign-in routes are current.

### `UX-001`

- [ ] Light/airy canvas dominates.
- [ ] `--brand-orange` is the CTA/thread signal.
- [ ] Glass is limited and has an opaque fallback.
- [ ] Banned generic SaaS aesthetics are absent.

### `UX-002`

- [ ] Exact sanitized workspace remains the hero.
- [ ] Fake dots, URL bar, glow, and browser frame are removed.
- [ ] Later slots contain no fabricated product geometry.
- [ ] Concept visuals are labelled.

### `UX-003`

- [ ] Eight planned chapters are present without filler.
- [ ] Three-part value strip is retained.
- [ ] One primary CTA dominates.
- [ ] Claims are source-backed and public-beta copy stays minimal.

### `UX-004`

- [ ] One cost thread connects the story.
- [ ] One labelled GSAP timeline controls five stages.
- [ ] Native scrolling remains authoritative.
- [ ] Three.js is subordinate and nonessential.

### `UX-005`

- [ ] Tablet/mobile are authored alternatives.
- [ ] Reduced motion removes the pin and camera motion.
- [ ] No-WebGL/load failure retains the story.
- [ ] Semantics, focus, contrast, and controls are coherent.

### `PERF-001`

- [ ] Story code is not in the initial hero path.
- [ ] Dimensions prevent layout shift.
- [ ] DPR and geometry/material work are capped.
- [ ] Offscreen/hidden work pauses.
- [ ] renderer, geometry, materials, observers, and GSAP resources dispose.

### `OPS-001`

- [ ] No dependency or deployment added.
- [ ] Analytics/consent/metadata behavior is preserved.
- [ ] Unrelated work remains untouched.
- [ ] Static verification is fresh.
- [ ] Unrun visual proof is reported as a gap.

## Resume Instructions

1. Read `README.md`, then `00-PLAN.md` and the artifact for the next unit.
2. Check `plan-pack.json.next_unit` and dependency statuses.
3. Run the repository startup contract and inspect the worktree.
4. Re-read current source for every file owned by the next unit.
5. If a stale trigger fired, rebaseline before edits.
6. Complete the next unit, collect its evidence, update status, and only then unlock the downstream unit.
7. Never infer browser, hosted, or production proof from source/static checks.

## Stale Triggers

Re-audit affected requirements if any of these change:

- root or `/new` route composition/metadata;
- `ProductionPublicPageShell`, landing analytics, cookie consent, contact mailto, CTA, sign-in, or workspace route behavior;
- `NewLandingHeroDemo`, `HeroEstimateWorkspaceMockup`, or `EstimateWorkspaceClient` presentation/fixture contracts;
- landing copy claims or public beta policy;
- shared glass tokens or one-blur performance guidance;
- installed GSAP, Three.js, React, or Next.js version/conventions;
- user authorization for tests, browser proof, build, deployment, or external actions;
- current worktree overlap on landing-production paths.

## Final Handoff Shape

Return a concise implementation report containing:

1. Result.
2. Changed files and deleted route-owned code.
3. Exact product proof used, including fixture/presentation provenance.
4. Every remaining screenshot slot and its future exact route/state.
5. GSAP/WebGL behavior and all fallback branches.
6. Fresh static validation evidence.
7. Unrun browser/visual proposal and any real remaining risk.

