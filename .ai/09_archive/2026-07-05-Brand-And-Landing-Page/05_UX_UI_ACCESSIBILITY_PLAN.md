# 05 — UX, UI, and Accessibility Plan

**Source authority:** `07_LANDING_PAGE_SECTIONS.md` (target architecture), `09_DESIGN_SYSTEM_AND_VISUAL_DIRECTION.md` + `20_DESIGN_AUDIT_AND_VISUAL_DIRECTION.md` (high-end visual direction), `DESIGN.md` (alpha-stage design system), WCAG 2.2 AA.

---

## 1. UX principles

- **Lead with the change.** Every section opens with what the product does, not what it lacks (`06` §2).
- **Earn attention step-by-step.** Hook → problem → product proof → workflow → specialties → comparison → real proof → objection-handling → close (`07` §1).
- **Calm-conviction register.** Confident without overclaiming. Never salesy. Never hedgy (`06` §2).
- **Accessibility is a release gate, not a polish step** (NFR-A11Y-001..004).

---

## 2. User journeys

### 2.1 Primary journey — first-time visitor

1. Land on `/` hero.
2. Read H1 + subhead + dual CTA.
3. Click primary CTA ("Request access" while invite-gated; "Start free" only after self-serve signup is verified) or secondary "Book a walkthrough".
4. Convert to signup or contact.

**Goal:** Answer 5 questions in the first scroll: Does this exist? Does it do what I do? Is it built for me? Will my data be safe? Can I try it? (`06` §6.2)

### 2.2 Secondary journey — evaluator (architect/QS/GC researching tools)

1. Land on `/`.
2. Scroll through problem → workflow → feature chapters → specialties.
3. Land on /features to see Live/Building/Planned.
4. Open /pricing to see model shape.
5. Open /about to evaluate the company.
6. Either convert to signup or bounce to a competitor.

**Goal:** The page must hold attention at every section. No altitude drops (`07` §1).

### 2.3 Tertiary journey — return visitor with invite token

1. Land on `/share/[token]` or `/invite/[token]` directly. (Out of scope; not modified.)
2. Or land on `/`, click "Sign in", proceed to `/workshop`.

---

## 3. Information architecture

Per `07` §1 target altitude graph. 11 sections + nav + footer:

1. Nav (preserve)
2. Hero (recast in Phase 2A)
3. Problem (preserve + expand)
4. Workflow (preserve + screenshots)
5. Feature Chapters (3 → 4)
6. Specialties (3 → 7)
7. Audience flow band (recast)
8. Comparison (tighten)
9. Proof (rebuild)
10. FAQ (replace)
11. Final CTA (recast)
12. Footer (rebuild)

---

## 4. Accessibility commitments (WCAG 2.2 AA)

| Commitment | Implementation |
|---|---|
| Perceivable | All screenshots have alt text describing **what they prove**, not what they show. Color contrast ≥ 4.5:1 body / 3:1 large. SVG chart text ≥ 11px (already enforced per `DESIGN.md` data-viz exception). |
| Operable | Keyboard navigation works on every section. Focus visible. Mobile nav uses `<details>` (already). No keyboard traps. Hero metric card tooltips are `<button>` + `aria-describedby` (already). |
| Understandable | Copy uses plain words, one idea per sentence (`MASTER §10.2`). Section headings are descriptive. Form labels are explicit. |
| Robust | Semantic HTML. ARIA where needed (already in Claims Ledger, nav). Schema.org FAQPage JSON-LD preserved. |
| Reduced motion | `prefers-reduced-motion` respected by HeroMountMotion, HeroImageZoom, scroll-reveal handlers (already; verify in Phase 5). |
| Responsive | Mobile-first stacking at `< 768px`. Specialties horizontal scroll. Footer stacks. |

---

## 5. Responsive behavior

| Breakpoint | Behavior |
|---|---|
| `< 640px` (mobile) | Hero stacks vertically. Single-column layout throughout. Specialties horizontal scroll. Footer stacks. Mobile nav via hamburger. |
| `640px – 768px` (large mobile / small tablet) | Same as mobile, slightly larger type. |
| `768px – 1024px` (tablet) | 2-column where applicable. Specialties 2-col grid. |
| `1024px – 1440px` (laptop) | Full multi-column layout. |
| `> 1440px` (desktop) | Max-width container, generous whitespace. |

---

## 6. Component states (every interactive element)

Per `Creating-Plan-Prompt.md` §8 (UX/UI/Accessibility). Every interactive element must define: default, hover, focus, active, disabled, loading, error, empty.

| Component | States |
|---|---|
| Hero primary CTA | default, hover, focus-visible, active, disabled (if invite-only), loading (signup redirect) |
| Hero metric card button | default, hover, focus-visible, tooltip-expanded |
| FAQ `<details>` | closed, open, focus-visible |
| Mobile nav `<details>` | closed, open |
| Contact form | empty, focused, validating, success, error |
| Cookie consent banner | visible, dismissed |

---

## 7. How this doc feeds the rest of the plan

| Section | Feeds |
|---|---|
| §1 UX principles | `06` voice principles alignment |
| §2 User journeys | `12` test scenarios |
| §3 Information architecture | `07` section architecture |
| §4 Accessibility | `12` a11y test matrix |
| §5 Responsive | `12` responsive audit |
| §6 Component states | `12` interaction tests |
| Visual direction | `09` + `20` motion + haptic patterns (reduced-motion path required) |
