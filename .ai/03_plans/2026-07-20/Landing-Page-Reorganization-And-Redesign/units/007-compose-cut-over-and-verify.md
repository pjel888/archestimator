# UNIT-007 — Compose, Cut Over, and Verify

**Status:** READY  
**Depends on:** UNIT-006  
**Goal:** Finish composition, prove the fresh tree before cutover, switch and verify `/new` while rollback remains intact, then remove the old design and collect decisive static evidence.

## Owned paths

- `src/components/landing/new-redesign/NewLandingExperience.tsx`
- `src/app/new/page.tsx`
- `next.config.ts`
- `public/landing/new/og-new.png`
- delete `src/components/landing-new/CostThreadJourney.tsx`
- delete `src/components/landing-new/NewLandingPage.tsx`
- delete `src/components/landing-new/landing-content.ts`
- delete `src/components/landing-new/new-landing.module.css`
- `scripts/enforce-app-design-system.mjs` only to remove the obsolete `src/components/landing-new/` exception
- `package.json` and `bun.lock` only if the post-deletion usage audit proves `three` and `@types/three` have no remaining consumers

## Implementation

1. Replace every scaffold slot with the 15 main blocks in the exact architecture order. Assert one header, one `<main id="main-content">`, and one footer.
2. Import Inter from `next/font/google` in the thin route and scope its variable/class to the new experience. Keep the canonical wordmark component unchanged.
3. Author a fresh literal `Metadata` object from the canonical category/hero contract. Do not import `buildLandingMetadata` or retain/copy the current route title or description. Set `/new` to `noindex,nofollow` and point Open Graph/Twitter metadata to a real `1200×630` `public/landing/new/og-new.png` created from the canonical logo/wordmark and Signal color.
4. Replace the route composition with the new experience directly and independently declare `dynamic = "force-static"`. Do not import `PublicPageShell`, shared landing chrome, or any current `/new` implementation.
5. Add `/new` to the existing landing CSP Report-Only route list in `next.config.ts`.
6. Before changing the live route, run Type/LSP, scoped lint, exact 18-band/order, forbidden-import, CTA, metadata-asset, and placeholder checks against the unmounted fresh tree. Do not proceed to route cutover until this checkpoint is green or only unrelated pre-existing diagnostics are precisely recorded.
7. Immediately before cutover, inspect scoped worktree status for `src/app/new/page.tsx` and all four `src/components/landing-new/**` files. If unfamiliar concurrent edits exist, reread and integrate them; never overwrite them. Create an out-of-repository temporary directory with `mktemp -d`, copy the exact pre-cutover `src/app/new/page.tsx` plus all four old component files byte-for-byte, record all five SHA-256 values and the temporary path in local execution evidence, and keep that directory until all post-deletion checks pass.
8. Swap only `src/app/new/page.tsx` to the fresh import while the four old files remain. Run the route/source/type/lint checks. If any fresh-route failure appears, restore the old route import immediately; the old files are still present and the new tree remains available for repair.
9. After the fresh route passes, scan the entire repository for old-tree consumers. Delete all four `src/components/landing-new/**` files only when no consumer remains, then remove the obsolete design-lint allowlist entry for that directory.
10. Audit `three`, `@types/three`, and GSAP usage after deletion:
   - remove `three` and `@types/three` only if no source consumer remains;
   - keep GSAP because other landing routes currently use it;
   - do not add Lenis or another animation package.
11. Remove all temporary placeholders/invariants that are not useful runtime safeguards.
12. Re-run the complete static/source check set after deletion. Only after it passes, remove the out-of-repository rollback directory and record that cleanup in execution evidence.
13. Reconcile every requirement and risk to fresh evidence before marking implementation complete.

## Required static verification

Run the smallest decisive checks; these are not product-test commands:

```bash
bun run type-check
bun run lint -- src/app/new/page.tsx src/components/landing/new-redesign next.config.ts
bun run lint:design-system
```

Then run targeted source checks:

```bash
rg -n "landing-new|landing-v3|CostThreadJourney|NewLandingPage|WebGL|canvas|from ['\"]three['\"]|intent=access|#f24a16|#c9380d" src/app/new src/components/landing/new-redesign
rg -n "PublicPageShell|buildLandingMetadata|Construction estimate-to-proposal workspace|Structure project costs from your own reusable cost knowledge" src/app/new src/components/landing/new-redesign
rg -n "Request early access|intent=started#contact-form" src/components/landing/new-redesign
rg -n "src/components/landing-new" scripts package.json bun.lock src
rg -n "from ['\"]three['\"]|require\(['\"]three['\"]\)" src
```

Read every output. The first and second scans must return no forbidden fresh-tree/current-route matches; the CTA scan must show only intentional canonical records; the old-tree scan must return no repository consumer after deletion; the Three scan determines package cleanup.

## Acceptance

- `/new` imports only the new experience plus framework/font types, stays `force-static`, and does not use `PublicPageShell`, `buildLandingMetadata`, current route copy, or existing landing chrome.
- Exact 18-band structure, one-to-one ordinal mapping, and all anchor IDs are present.
- Old `src/components/landing-new/**` tree and its lint exception are gone.
- No new tree import references any old/current landing design implementation.
- `/new` has fresh literal noindex metadata, a real route-specific OG asset, and the landing CSP Report-Only header.
- Inter is scoped through Next font without a new dependency.
- Static checks pass or every unrelated pre-existing failure is recorded without being “fixed” in this unit.
- Dependency cleanup is evidence-driven; GSAP is not removed while other routes consume it.
- The rollback directory contains the exact pre-cutover route plus all four old files, remains available through post-deletion verification, and is removed only after the final green check.

## Unrun QA proposal

If the implementation task explicitly includes browser/design testing, perform the viewport, keyboard, reduced-motion, overflow, sticky-offset, autoplay-pause, and contrast matrix named in `00-PLAN.md`. Do not claim those runtime/visual properties passed from source inspection alone.

## Recovery

If the fresh import fails before deletion, restore `src/app/new/page.tsx` byte-for-byte from the recorded temporary directory while keeping the fresh tree for repair. If any failure appears after deletion, restore the exact pre-cutover route plus all four old files byte-for-byte from that directory; do not reconstruct files from memory, use `git reset`, or overwrite unrelated work. Keep the backup until the repaired fresh route and post-deletion consumer scan both pass.
