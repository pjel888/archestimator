# 12 — Test and Validation Strategy

**Source authority:** `04_REQUIREMENTS_SPECIFICATION.md` (REQ-* IDs), `11_IMPLEMENTATION_PLAN.md` (Phase structure), `Multi-Agent-Execution-Directive.md` §11-12.

---

## 0. 2026-07-06 validation correction

This plan pack has been revised in a planning-only pass. The validation for this continuation is docs-only:

```bash
git diff --check -- .ai/03_plans/2026-07-05-Brand-And-Landing-Page
```

Implementation later uses proportional validation:

- Copy-only source changes: copy lint plus targeted type/lint.
- CSS-only visual changes: targeted lint/type plus browser proof only for the specific layout, responsive, or interaction claim.
- Above-the-fold hero changes: browser proof on desktop and mobile because the user explicitly wants the hero mockup preserved.
- Route-level structural changes: DOM/unit checks for data/JSON-LD plus browser proof only for visible composition or interaction.
- Release or high-blast-radius work: full `bun run validate` / build as justified.

Playwright, screenshots, visual QA, and Storybook are not default gates for planning docs or simple copy edits.

---

## 1. Test layers (proportional to risk)

Per `AGENTS.md` Verification Policy: "Docs/config changes: `git diff --check` plus path/ignore checks when relevant. Narrow source change: type/LSP check or targeted test for the touched behavior. Shared logic, auth, database, security, or release work: targeted tests plus broader `bun run validate`/`bun run build` only when the risk justifies the time."

This is a **landing-page-only plan**. No auth, no database, no security, no shared logic touched. The test strategy is proportional.

| Layer | When | Tool |
|---|---|---|
| Static (docs/config) | Every phase | `git diff --check`, manual review |
| Copy lint | Phase 1A onward | New `bun run lint:landing-copy` script |
| Design-system lint | Every phase touching landing copy/styles | `bun run lint:design-system` |
| Type check | Every phase touching `.tsx`/`.ts` | `bun run type-check` |
| ESLint | Every phase | `bun run lint` |
| DOM tests | Phase 1A, 2A, 4A | `bun run test:dom` (Vitest + RTL) |
| Playwright E2E | Only when proving interaction, responsive layout, above-the-fold hero fit, or route composition that static/DOM checks cannot prove | Targeted landing audits |
| Visual QA | Explicit visual-review tasks, high-risk UI polish, or screenshot/proof sections where visual regression is the deliverable | `visual-qa` skill or equivalent screenshot diff |
| A11y audit | Phase 5 | `axe` Playwright plugin |
| Reduced-motion audit | Phase 5 | Manual + Playwright `prefers-reduced-motion` emulation |
| Full validate | Release or high-blast-radius gate | `bun run validate` + `bun run build` |
| E2E smoke | Release or browser-critical flow gate | `bun run test:e2e` |

---

## 2. Test execution matrix

This matrix lists candidate tests. The executor chooses the smallest test that proves the changed behavior under §0; do not run browser or visual gates just because they appear here.

| REQ / WP | Test file path | Test type | Existing/new | Fixture | Command | Expected evidence |
|---|---|---|---|---|---|---|
| WP-1A (lint pass) | `tests/vitest/landing-copy-lint.test.ts` (new) | DOM/unit | new | Banned-phrase list | `bun run test:dom -- landing-copy-lint` | 0 banned-phrase matches in scope |
| WP-1B (hero CTA) | `e2e/landing-audit.spec.ts` (existing) | E2E | existing | None | `bun run test:e2e -- landing-audit` | Hero CTA copy matches chosen option |
| WP-1C (footer) | `e2e/landing-audit.spec.ts` | E2E | existing | None | same | Footer renders 4 new elements |
| WP-1D (section reorder) | `e2e/landing-audit.spec.ts` | E2E | existing | None | same | Section order matches `07` §1 |
| WP-1E (visual system foundation) | `tests/vitest/landing-design-tokens.test.ts` (new) + optional visual QA | DOM + optional visual | new | Token table in `09` | `bun run test:dom -- landing-design-tokens` + `bun run lint:design-system` | CSS tokens match corrected `09`; precision-frame primitives render |
| WP-2A (hero rewrite) | `e2e/landing-audit.spec.ts` + `tests/vitest/landing-content.test.ts` (new) | E2E + DOM | new | Hero copy fixtures | `bun run test:dom -- landing-content` | Hero renders all 7 elements per `07` §2.1 |
| WP-2B (screenshots) | `e2e/landing-audit.spec.ts` | E2E | existing | None | same | 4 screenshots render with alt text |
| WP-2C (specialties 7) | `tests/vitest/landing-content.test.ts` | DOM | new | Specialties array | `bun run test:dom -- landing-content` | 7 specialties render |
| WP-3A (/pricing) | `e2e/landing-audit.spec.ts` | E2E | existing | None | same | Pricing hero reframed; "hypothesis" absent |
| WP-3B (/features) | `tests/vitest/claims-ledger.test.ts` (existing or new) | DOM | existing | Claims data | `bun run test:dom -- claims-ledger` | Live dominant; NotUs collapsed |
| WP-3C (/about) | `e2e/landing-audit.spec.ts` | E2E | existing | None | same | About reframed; "new company" absent |
| WP-3D (/contact) | `e2e/landing-audit.spec.ts` | E2E | existing | None | same | Contact reframed; dual CTA renders |
| WP-4A (proof rebuild) | `e2e/landing-audit.spec.ts` | E2E | existing | None | same | 4 screenshots + Cloudflare line |
| WP-4A (FAQ replace) | `tests/vitest/faq-schema.test.ts` (new) | DOM | new | FAQ array | `bun run test:dom -- faq-schema` | Schema.org FAQPage JSON-LD valid |
| WP-4B (final CTA + comparison) | `e2e/landing-audit.spec.ts` | E2E | existing | None | same | Final CTA recast; comparison links resolve |
| WP-5 (visual refresh) | `e2e/landing-audit.spec.ts` + visual-QA | E2E + visual | existing | Screenshots | same + visual-qa skill | Token alignment; DESIGN.md additions |
| WP-6 (A/B + analytics) | `e2e/landing-audit.spec.ts` + analytics smoke | E2E | existing | None | same | Variant B fires; analytics events emit |

---

## 3. Adversarial scenario matrix

Per `Multi-Agent-Execution-Directive.md` §12. Applies to runtime behavior on the public surface.

| ID | User model | Scenario | Setup | Command/harness | Expected signal | Status |
|---|---|---|---|---|---|---|
| ADV-001 | First-time visitor on mobile | Hero stacks; CTA clickable; no horizontal scroll | iPhone 12 emulator | `bun run test:e2e -- landing-audit.mobile` | Hero stacks; CTA tappable; viewport stays within 375px | `[PROPOSED]` |
| ADV-002 | Screen-reader user | Linear DOM order through hero → problem → workflow → features | VoiceOver / NVDA | Manual + Playwright `aria-*` checks | Headings announce; CTAs announce as buttons; screenshots ignored | `[PROPOSED]` |
| ADV-003 | Keyboard-only user | Tab through entire page; every interactive element reachable; focus visible | Manual | Playwright keyboard.trace | No traps; focus ring visible on every interactive | `[PROPOSED]` |
| ADV-004 | Reduced-motion user | Hero motion + scroll-reveal degrade | `prefers-reduced-motion: reduce` | Playwright `emulateMedia` | HeroMountMotion renders statically; reveal shows immediately | `[PROPOSED]` |
| ADV-005 | Logged-in user landing on `/` | Sees public copy, not authenticated state | Cookie session | Browser auth fixture if needed | Public landing renders; "Request access" CTA becomes "Open workspace" if logged-in | `[PROPOSED]` |
| ADV-006 | A/B variant B assigned | Hero CTA copy matches variant B | Cookie set | Playwright with experiment cookie | Variant B CTA renders | `[PROPOSED]` |
| ADV-007 | Search engine crawler | Meta tags + schema.org present | `curl /` | shell | `<title>`, `<meta name="description">`, `<script type="application/ld+json">` all present and accurate | `[PROPOSED]` |
| ADV-008 | Lighthouse audit | Performance + a11y + SEO scores ≥ 90 | Chrome DevTools | Manual Lighthouse run | All three categories ≥ 90 on `/` | `[PROPOSED]` |
| ADV-009 | Banned-phrase regression | New code introduces a banned phrase | Edit a file with banned phrase | `bun run lint:landing-copy` | Exit non-zero; CI blocks | `[PROPOSED]` |
| ADV-010 | Link checker | Footer + comparison links resolve | Crawled | `linkcheck` script | All internal links 200; no orphan anchors | `[PROPOSED]` |
| ADV-011 | Visual regression — typography | Section H2 exceeds hero H1 size | Set viewport to 1440px | visual-qa screenshot diff | Largest heading on `/` is the hero H1 | `[PROPOSED]` |
| ADV-012 | Visual regression — nav | Nav is floating pill, not edge-to-edge bar | Desktop viewport | visual-qa screenshot diff | Nav has rounded pill shape and is detached from top edge | `[PROPOSED]` |
| ADV-013 | Visual regression — button pair | "Sign in" and primary CTA share pill geometry | Desktop viewport | visual-qa screenshot diff | Both buttons are rounded pills; icon island visible in primary CTA | `[PROPOSED]` |
| ADV-014 | Reduced-motion scroll reveal | Scroll-entry animations respect `prefers-reduced-motion` | `prefers-reduced-motion: reduce` | Playwright `emulateMedia` + scroll | Section content visible immediately; no blur/translate animations | `[PROPOSED]` |

---

## 4. Pre-existing reds and known flakes

Per `Multi-Agent-Execution-Directive.md` §11, record known-red or flaky commands.

- `bun run test:e2e` requires environment flags for mutating specs (`ARCHESTIMATOR_E2E_MUTATING_DND=1` etc. per README). Landing-page audit is **not** mutating and should not require these flags. Verify in Phase 1A.
- `bun run cf:preview` requires local Cloudflare bindings. Not needed for landing-page work.
- `bun run validate` is the full gate (type-check + lint + design-system + unit + dom). Use it for release or high-blast-radius phases; prefer focused commands during iteration.

---

## 5. Cleanup

| Resource | Cleanup action |
|---|---|
| Playwright artifacts (screenshots, traces) | Committed only if useful for regression diff; otherwise gitignored |
| Tmp screenshot capture scripts | Deleted after Phase 2B |
| Visual-QA diff artifacts | gitignored |
| A/B experiment cookie (test) | Cleared in test teardown |

---

## 6. How this doc feeds the rest of the plan

| Section | Feeds |
|---|---|
| §1 Test layers | `11` each phase's QA gate |
| §2 Test execution matrix | `16` traceability matrix |
| §3 Adversarial matrix | `14` risk register (residual risks after QA) |
| §4 Pre-existing reds | `11` Phase 1A baseline check |
| §5 Cleanup | `13` ops runbook |
