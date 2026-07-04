# WORKSHOP DASHBOARD — IMPLEMENTATION DIRECTIVE
### Archestimator · Main Dashboard ("Workshop") build

---

## 0 · FOR PHILIP (how to use this doc — delete before pasting if you want)

Paste everything below the line into your codebase AI (Claude Code / Cursor / Windsurf). It is written **as a directive to the AI**, not to you. It is intentionally a **forcing function**: the AI is barred from writing dashboard code until it has (a) read the whole repo and (b) produced an approved information-architecture proposal. There are two hard STOP gates where it must come back to you.

One decision is yours to make and is flagged at the bottom: **the new display font.** I've given a single strong recommendation; confirm or override.

---
---

> **TO THE IMPLEMENTING AI — READ THIS ENTIRE DOCUMENT BEFORE TOUCHING ANYTHING.**
> This is not a ticket. It is a multi-phase directive with gates. Skipping a phase, skipping a gate, or implementing the feature list verbatim are all **failure conditions**. You will be judged on the quality of your *thinking*, not just the code.

---

## A · MISSION

The Workshop dashboard is currently an empty shell (a greeting on white space). Turn it into the **command center of Archestimator** — the place an architect or estimator lands and instantly knows where they were, where to go, and how to start the next estimate, wrapped in a **liquid-glass + warm-gradient** aesthetic that extends the existing Archestimator design system.

The dashboard's single job: **get the user into the right estimate fast, let them start a new one with zero friction, and orient them across Projects, Estimate Sheets, the Library, and their Favorites.**

---

## B · OPERATING PRINCIPLES (NON-NEGOTIABLE)

1. **The repo is the source of truth.** This document tells you *what* and *why* and *how it should feel*. The repo tells you *how it's actually built*. Where they appear to conflict, surface the conflict — do not silently pick one.
2. **Reuse, never duplicate.** Use the existing design tokens, components, hooks, data-access layer, routing, and state patterns. If you find yourself writing a second way to fetch projects, stop — you've missed the existing one.
3. **No fabricated data, ever.** If a metric, count, or aggregate (e.g. "total estimated value") is not actually computable from existing data, **do not invent it and do not stub fake numbers.** Mark it `⚠️ NEEDS INPUT` in your proposal and propose either how to compute it or to drop it.
4. **Tokens only.** No hardcoded colors, spacing, radii, blur values, or font names in components. Every visual value resolves to a token. If a needed token doesn't exist, propose it in the design spec — don't inline it.
5. **The feature list is a floor, not a ceiling, and not a blueprint.** You are required to think past it (see §E).
6. **Two STOP gates exist.** You do not pass them on your own authority.

---

## C · EXECUTION PROTOCOL (phased + gated)

### PHASE 0 — RECON (read the whole codebase)
Before any opinion, any design, any code. Produce a **RECON findings document** (markdown) covering at minimum:

- **Stack & conventions** — framework + version, router, styling system (Tailwind config? CSS vars? Shadcn? something else?), component library, state management, font-loading mechanism, how the app currently themes itself.
- **Design system** — where the design guidelines / tokens / theme live. Catalog the real color tokens, the type scale, spacing scale, radii, shadows, and any existing "surface"/"glass"/"elevation" primitives. **Quote the actual token names.** Identify the warm/terracotta brand accent currently used on the Workshop sidebar and name its token.
- **Data model** — the real entities and their relationships. Specifically confirm:
  - Project → Estimate Sheet relationship (one-to-many? naming? fields?)
  - Library structure (confirm the two sub-pages: **Components** and **Templates** — names, routes, shapes)
  - Favorites: is favoriting **project-level only**, or does **per-estimate-sheet** favoriting exist? (This decides whether the favorites tree in §D is even possible.)
  - Any notion of "recent / last-edited / last-opened" timestamps on projects and sheets.
  - Any existing aggregates (counts, totals, values) or activity log.
- **Existing data-access** — the hooks / queries / server actions that already fetch projects, sheets, library items, favorites. List them by name and signature so you reuse them.
- **Routing & nav** — every route the dashboard would link to, and the current nav rail icons and what each one opens.
- **The current Workshop page** — the file(s) that render it today, the greeting logic (it already does time-of-day: "Good evening"), and the layout container it lives in.
- **Responsive & target** — discover whether this app is desktop-first, mobile-supported, or both. Do **not** assume. Report what the breakpoints and existing responsive patterns tell you.

> **⛔ GATE 1.** Present the RECON document. **STOP. Await "RECON approved — proceed."** Do not start Phase 1 until told.

---

### PHASE 1 — CRITICAL IA PROPOSAL (the thinking phase)
Using only what you found in Phase 0, produce an **information-architecture proposal** (markdown). This is the most important deliverable in the whole job. It must:

- Answer every question in **§E (Critical-Thinking Mandate)**.
- Decide the **final module set** for the dashboard — you may merge, reorder, drop, or add to the §D floor, **but every decision must be justified** against (a) the real data model, (b) cheap-to-render cost, and (c) the core job in §A.
- Complete the **module-justification table** in §E.
- Define the **layout hierarchy** (what is hero / primary / secondary / tertiary) and a low-fi wireframe (ASCII or described regions) showing placement on the canvas — including which modules sit in the white top-left vs. the warm bottom-right (see §F layout principle).
- List the **states** each module needs: loaded, **empty / first-run** (new user, zero projects), loading (skeleton), error.
- Restate which design tokens you'll **add** (fonts, gradient, glass recipe, patterns) — see §F — without yet writing code.
- Surface all `⚠️ NEEDS INPUT` items.

> **⛔ GATE 2.** Present the IA proposal. **STOP. Await "Proposal approved — build."** Do not write a single component until told.

---

### PHASE 2 — DESIGN SPEC
Translate the approved proposal into concrete, token-level decisions: the new typography tokens, the gradient definition, the glass recipe tokens (blur, surface alpha, border, highlight, shadow), the pattern assets, the layout grid, and the component tree (named, with which existing components they compose). Fold this into the proposal doc or a short follow-up — no gate, but it must exist before Phase 3.

### PHASE 3 — IMPLEMENT
Build the dashboard exactly to the approved proposal + spec. Follow existing patterns. Wire **every** module to **real** data via the existing data-access layer. Build all states (loaded / empty / loading / error). Keep components small and composed.

### PHASE 4 — VERIFY
Run the **Definition of Done** checklist (§I) yourself before declaring complete. Test the empty/first-run state explicitly. Test responsiveness at the repo's real breakpoints. Sanity-check contrast on the warm gradient and glass.

### PHASE 5 — CLOSE
Briefly document what was added: new tokens, new components, new font(s), and any `⚠️ NEEDS INPUT` items still outstanding.

---

## D · CONFIRMED SCOPE (the floor)

These are *in* unless your Phase 1 analysis gives a strong, data-backed reason against (in which case, argue it at GATE 2):

1. **Quick links** to **Projects** and to the **Library** (and the Library's two sub-pages: **Components** and **Templates**).
2. **Recent Projects** and **Recent Estimate Sheets** (most-recently-touched first — confirm the timestamp field exists in Phase 0).
3. **Favorites as a tree** — favorite **Projects** as parent nodes, with each project's **favorite Estimate Sheets** nested beneath it, collapsible. *(Requires per-sheet favoriting — if Phase 0 shows favoriting is project-level only, flag it and propose the closest viable design.)*
4. **Primary creation actions** — at minimum **New Project** and **New Estimate Sheet**, surfaced as low-friction, high-prominence entry points.

These four are the **floor**. They are deliberately *not* a layout. You decide hierarchy and grouping in Phase 1.

---

## E · CRITICAL-THINKING MANDATE (this is why you read the whole codebase)

You are explicitly required to **think past §D**. In your Phase 1 proposal, answer all of the following with reasoning tied to the actual repo:

1. **What is the one action a returning user does most?** Make it the most frictionless thing on the page. Defend your choice.
2. **"Continue where you left off"** — should the dashboard let a user jump straight back into the single most-recently-edited estimate sheet (one tap, not via a list)? If the data supports it, this is often the highest-value module on a tool like this. Decide and justify.
3. **At-a-glance orientation** — is there real, cheap-to-compute data worth surfacing as a compact stat strip (e.g. number of active projects, sheets in progress, items in the library)? If yes, which metrics and where do they come from? **If the data doesn't exist, say so and drop it — do not fake stat cards.**
4. **Global search / command** — does the app have (or want) a quick search to find any project / sheet / library item from the dashboard? Evaluate whether it belongs here in v1.
5. **Library spotlight** — would surfacing featured or recently-used **Templates/Components** on the dashboard meaningfully shorten the path to a new estimate (start-from-template)? Evaluate.
6. **First-run experience** — what does a brand-new user with zero projects see? A blank dashboard is a failure. Design a purposeful empty state that drives the first project/estimate creation.
7. **What does NOT belong here?** Name at least two plausible-sounding modules you are deliberately **excluding** and why (scope, data cost, low value, or better-placed elsewhere). A dashboard that tries to hold everything holds nothing.
8. **Hierarchy** — rank every surviving module: hero → primary → secondary → tertiary. Justify the ranking against the core job.

**Complete this table in your proposal** (add/remove rows as your analysis dictates):

| Module | Keep / Drop / Add | Backing data (real hook/query/field) | Render cost | Serves core job? | Hierarchy | Notes / `⚠️ NEEDS INPUT` |
|---|---|---|---|---|---|---|
| Continue last estimate | | | | | | |
| New Project / New Sheet | | | | | | |
| Recent Projects | | | | | | |
| Recent Estimate Sheets | | | | | | |
| Favorites tree | | | | | | |
| Quick links (Projects / Library) | | | | | | |
| Library spotlight (Templates/Components) | | | | | | |
| At-a-glance stats | | | | | | |
| Global search | | | | | | |
| _(your proposed additions)_ | | | | | | |
| _(your deliberate exclusions)_ | Drop | — | — | — | — | reason |

---

## F · DESIGN DIRECTION — liquid glass, warm gradient, drafting type

**Reference gestalt:** *iOS "liquid glass" depth × warm editorial mesh-gradient × technical-drafting typography, floating on a white canvas.* Think Apple-style frosted depth and luminous edges, a warm Amber/clay gradient bloom, and slab/typewriter type that nods to construction stamps and drafting labels.

> The implementing AI will not see Philip's reference screenshots. The intent below is written to be self-contained — but Philip can show you the references (Servana dashboard, frosted gradient cards, Amber Studio / Renove Studio gradients, opencal hero, Nolla type poster, iOS glass widgets) if useful.

### F1 · Canvas & the bottom-right gradient bloom
- **Base canvas stays dominantly near-white / off-white.** Use the repo's lightest surface token (or propose one). White is the default; the gradient is an accent, not a takeover.
- **One large, soft warm gradient bloom anchored at / just off the bottom-right corner**, radiating inward and *upward-left*, and **fully dissolving into the white before it reaches the center–top-left.** Net effect: a clean white top-left flowing into a warm glow at the bottom-right — a diagonal light source, not a flat fill.
- **Hues:** warm and brand-coherent — pull from / harmonize with the existing terracotta accent: clay / terracotta → amber → soft peach → transparent. Premium and **subtle**: a bloom, not a billboard.
- This must be a **token / single source** (a background layer or CSS gradient utility), not a one-off inline style.

### F2 · Liquid glass (frosted) modules
- Primary dashboard modules render as **frosted-glass panels**: semi-transparent surface + `backdrop-filter` blur + a subtle luminous edge/inner-highlight + soft shadow for depth. Cards that sit over the bottom-right bloom should let the warm light diffuse through the blur — that's the signature look.
- Define a **single glass recipe as tokens** (blur radius, surface alpha, border/highlight, shadow) and reuse it. Keep depth gentle and luminous (iOS liquid-glass feel), with **content kept fully crisp** on top.
- **Establish a layer system:** solid white canvas → warm gradient bloom → glass containers → crisp content.
- **Do NOT frost everything.** Glass is for *containers and widgets*. Dense, text-heavy lists / data (e.g. a long recent-sheets list, the favorites tree contents) must stay **legible** — frost the panel chrome, not the data rows, and never sacrifice readability for the effect.

### F3 · Patterns (texture, not noise)
- Add **subtle technical/drafting motifs** on select surfaces to avoid a boring flat dashboard — e.g. a faint **dot-grid or blueprint grid**, hairline **registration/crosshair marks**, or a sparse **plus/star grid**. Construction-tool appropriate.
- Use **sparingly and at very low opacity**, sitting *under* content. One or two accent surfaces, not everywhere. Patterns are decoration on glass/gradient cards, never behind body text.

### F4 · Typography — the new font
Introduce **ONE new display family** for the greeting, section titles, and key numerics — a **slab serif with technical/typewriter character** that nods to drafting labels and construction stamps. It must **extend** the existing type scale (new tokens, loaded via the repo's font pipeline — if Next.js, prefer `next/font` and guard against layout shift), **not replace** the existing UI body font.

- **Recommendation (Philip to confirm — see §J):** **Zilla Slab** for display/headings. Warm, characterful slab that complements the terracotta palette. Keep the existing sans for body. **Optionally** introduce a monospace — **Space Mono** (more character) or **IBM Plex Mono** (more restrained) — for **numerics & metadata** (estimate values, dates, IDs) to lean into the "typewriter / technical" feel. Lead with the slab; the mono is an optional accent you may propose.
- Elevate the existing **"Good evening, [name]"** greeting with the new display font as a genuine hero moment, with the warm bloom behind it.

### F5 · Color
- Honor the existing **warm terracotta brand accent.** The gradient hues, glass highlights, and accent states should all read as one family with it. Don't introduce a competing brand hue — at most a *very* faint cool note for depth, only if it harmonizes.

### F6 · Layout principle (ties IA to aesthetic)
Because the bloom lives bottom-right and white lives top-left:
- Put **legibility-critical, text-dense** modules toward the **clean white top-left** (greeting, primary nav/quick links, recent lists, favorites tree).
- Put **lighter, more visual** modules toward the **warm bottom-right** where glass-over-gradient shines (a hero CTA, a featured Library/template card, a decorative stat). Let your hierarchy from §E drive exact placement.

### F7 · Motion
Restraint. Gentle, purposeful transitions only (hover/focus depth on glass, list reveals). **No constantly-animating gradients.** Honor `prefers-reduced-motion`.

---

## G · ENGINEERING CONSTRAINTS

- **Performance:** `backdrop-filter` blur is GPU-expensive. **Cap the number of simultaneously-blurred layers** (favor a few larger glass panels over dozens of small ones). Provide a **non-blur fallback** (solid translucent surface) where unsupported. Lazy-load / paginate any potentially large list.
- **Accessibility — WCAG AA, no exceptions:** all text must hit AA contrast **including over the most saturated part of the warm bloom and over glass.** Test the worst case. Honor `prefers-reduced-transparency` / `prefers-reduced-motion` (reduce or disable glass/animation gracefully). Full keyboard support; the favorites tree must be keyboard-navigable and screen-reader-sane (proper roles/labels for the expand/collapse tree).
- **Responsive:** follow the repo's real breakpoints (discovered in Phase 0 — do not assume mobile vs desktop). The bloom and glass must degrade gracefully on small screens; the favorites tree must remain usable wherever the app is supported.
- **Data:** every module fetches via existing patterns. Show skeletons on load, real empty states on no-data, and graceful error states on failure. Never block the whole dashboard on one slow query.

---

## H · ANTI-PATTERNS (do NOT)

- ❌ Skip Phase 0/1 or pass a STOP gate on your own authority.
- ❌ Implement §D verbatim without the critical-thinking pass in §E.
- ❌ Build a parallel data layer or re-implement components that already exist.
- ❌ Hardcode any color / spacing / radius / blur / font — tokens only.
- ❌ Fabricate metrics, counts, totals, or content to fill space.
- ❌ Over-frost (everything blurred → muddy, slow, illegible).
- ❌ Ship without a designed **empty / first-run** state.
- ❌ Let the glass/gradient win over legibility anywhere.
- ❌ Introduce a font that fights or replaces the existing body type instead of extending the scale.

---

## I · DEFINITION OF DONE

- [ ] RECON document delivered and approved (GATE 1).
- [ ] IA proposal — with completed §E table, hierarchy, wireframe, states, and `⚠️ NEEDS INPUT` list — delivered and approved (GATE 2).
- [ ] Design spec exists (tokens for font(s), gradient, glass recipe, patterns, grid).
- [ ] Dashboard implemented exactly to the approved proposal + spec.
- [ ] Every module wired to **real** data via existing data-access; **zero fabricated values**.
- [ ] All states present: loaded, **empty/first-run**, loading (skeleton), error.
- [ ] Liquid-glass + warm bottom-right bloom + drafting type all present and coherent with the existing terracotta system.
- [ ] Responsive at the repo's real breakpoints.
- [ ] WCAG AA contrast verified over gradient and glass; reduced-motion / reduced-transparency honored; favorites tree keyboard- and SR-accessible.
- [ ] Performance sane (blur layers capped, fallback present, large lists handled).
- [ ] No token violations; no duplicated logic; components small and composed.
- [ ] Close note delivered (new tokens, components, fonts, outstanding `⚠️ NEEDS INPUT`).

---

## J · OPEN QUESTIONS FOR PHILIP (`⚠️ NEEDS INPUT`)

The AI must collect answers to these (most resolve during Phase 0/1; this one is Philip's call up front):

1. **⚠️ Display font — Philip's decision.** Recommendation: **Zilla Slab** (display) + optional **Space Mono / IBM Plex Mono** (numerics). Confirm, or name your preferred slab/typewriter family.
2. Does **per-estimate-sheet favoriting** exist, or is favoriting project-level only? *(Determines the favorites tree — to be confirmed in Phase 0.)*
3. Is there computed **aggregate data** (project/sheet counts, total estimated value) for an at-a-glance strip, or should stats be dropped from v1? *(Phase 0.)*
4. **Mobile scope** — is the dashboard expected to be fully usable on mobile, or is it desktop-first? *(Phase 0 discovers the target; confirm intent.)*
5. Any modules to **explicitly exclude** from v1 that the AI should not even propose?
