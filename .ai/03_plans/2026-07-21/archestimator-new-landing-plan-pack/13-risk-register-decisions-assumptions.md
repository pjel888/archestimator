# Risk Register, Decisions, and Assumptions

## Decision register

### DEC-AUTO-001 — Use Velora’s macrostructure, not its claims

**Status:** Active  
**Decision:** Preserve Velora’s section sequence and conversion rhythm. Replace its social proof, pricing, generic dashboards, and component-library content with Archestimator product evidence and early-access information.  
**Reason:** Satisfies “exact SaaS template as base” without importing false facts.

### DEC-AUTO-002 — Light-first Archestimator visual system

**Status:** Active  
**Decision:** Use warm white, light gray, ink, slate, and restrained signal orange. No full-width dark section is required.  
**Reason:** Direct owner requirement and brand fit.

### DEC-AUTO-003 — Reuse the real estimate-workspace hero

**Status:** Active  
**Decision:** Use the current sanitized `HeroEstimateWorkspaceMockup`, not a fake analytics dashboard.  
**Reason:** Strongest truthful product proof already exists.

### DEC-AUTO-004 — No fabricated proof

**Status:** Active  
**Decision:** Replace avatars, logos, quotes, ratings, customer counts, numeric stats, and outcome metrics with workflow and product evidence.  
**Reason:** No approved public evidence set exists.

### DEC-AUTO-005 — Use one canonical primary CTA

**Status:** Active  
**Decision:** “Request early access” links to `/contact?intent=beta-request`; signed-in visitors may see “Open workspace.”  
**Reason:** Canonical Notion instruction and existing route compatibility.

### DEC-AUTO-006 — Omit secondary hero proof CTA

**Status:** Active  
**Decision:** Do not render “View a sample client proposal” until a real public asset exists.  
**Reason:** A placeholder would be deceptive.

### DEC-AUTO-007 — No new animation runtime

**Status:** Active  
**Decision:** Recreate selected Velora/LaunchPad cues with existing GSAP and CSS.  
**Reason:** Lower bundle and maintenance risk; avoids two motion systems.

### DEC-AUTO-008 — Mobile product proof is static, not hidden

**Status:** Active  
**Decision:** Keep the real demo visible below 820 pixels in a static final phase.  
**Reason:** Product proof is more important than autoplay; current live route’s hide rule should not be repeated.

### DEC-AUTO-009 — Server-first page with client islands

**Status:** Active  
**Decision:** Keep page composition and copy server-renderable; isolate auth CTA, motion controller, and product demo.  
**Reason:** Better static resilience and client-budget control.

### DEC-AUTO-010 — `/new` remains preview-only

**Status:** Active  
**Decision:** Noindex, no sitemap, no redirect, no canonical promotion, no deployment/promotion action.  
**Reason:** Owner requested implementation planning for `/new`, not replacement of `/`.

### DEC-AUTO-011 — Pricing slot becomes early-access expectations

**Status:** Active  
**Decision:** Preserve Velora’s two-card conversion geometry but remove prices and plans.  
**Reason:** Public pricing is not canonical.

### DEC-AUTO-012 — Testing remains proposal-only

**Status:** Active  
**Decision:** Plan static checks and exact test proposals, but do not run/create tests or browser/build evidence without owner authorization.  
**Reason:** Repository policy and task scope.

## Assumption register

### ASSUMP-001 — `/new` is still an isolated preview

**Status:** Active  
**Affected:** route, metadata, sitemap, promotion boundary  
**Validation:** re-read current route and owner instruction in `UNIT-001`.  
**Invalidation trigger:** redirect, sitemap entry, owner says replace `/`.

### ASSUMP-002 — No verified public sample proposal is available

**Status:** Active  
**Affected:** hero CTA, proof strategy  
**Validation:** search current repo/corpus and ask only if owner provides an asset during implementation.  
**Invalidation trigger:** approved public route/token/file with permission to market it.

### ASSUMP-003 — Existing `beta-request` contact intent remains acceptable

**Status:** Active  
**Affected:** primary CTA destination  
**Validation:** re-read `ContactForm.tsx`.  
**Invalidation trigger:** intent removed or owner supplies a dedicated early-access route.

### ASSUMP-004 — Public-route design freedom remains current

**Status:** Active  
**Affected:** scoped visual system and new component folder  
**Validation:** re-read `AGENTS.md`.  
**Invalidation trigger:** new active route-specific design constraint.

### ASSUMP-005 — Shared hero can be extended backward-compatibly

**Status:** Active  
**Affected:** product autoplay/static behavior and `/` safety  
**Validation:** inspect call sites and component lifecycle.  
**Invalidation trigger:** tests/callers rely on inaccessible internal timer semantics or static mode causes shared-state defects.

### ASSUMP-006 — The existing product demo remains sufficiently representative

**Status:** Active  
**Affected:** hero proof  
**Validation:** compare to current product source and owner’s “we have that in our landing page now” instruction.  
**Invalidation trigger:** current hero is deprecated or materially inaccurate.

### ASSUMP-007 — No new route-specific data request is needed

**Status:** Active  
**Affected:** performance/privacy  
**Validation:** all page content is static and demo data local.  
**Invalidation trigger:** owner requires live customer, sample proposal, or CMS content.

## Risk matrix

Scales:

- Probability: Low / Medium / High
- Impact: Low / Medium / High / Critical

| ID | Risk | Probability | Impact | Trigger |
|---|---|---|---|---|
| `RISK-001` | Real hero is too heavy for a marketing route | Medium | High | bundle or runtime evidence shows regression |
| `RISK-002` | Copy drifts into unsupported claims | Medium | High | implementer “improves” canonical copy or reuses current landing claims |
| `RISK-003` | Shared hero change alters live `/` | Medium | Critical | defaults or cleanup behavior change |
| `RISK-004` | Motion creates accessibility or fatigue defects | Medium | High | content hidden, reduced motion incomplete, too many loops |
| `RISK-005` | Fake proof re-enters through template parity | Medium | High | logos/testimonials/stats/pricing added to fill slots |
| `RISK-006` | Third-party code copied without license discipline | Low | High | direct Velora or LaunchPad source pasted |
| `RISK-007` | Product proof disappears or becomes unreadable on mobile | Medium | High | old 820px hide pattern reused |
| `RISK-008` | Second animation runtime is added for convenience | Medium | Medium | `motion` or Framer Motion dependency appears |
| `RISK-009` | Page becomes information-heavy | High | Medium | multiple feature lists, long paragraphs, extra sections |
| `RISK-010` | Preview route accidentally becomes indexable | Low | High | robots removed, sitemap/canonical added |
| `RISK-011` | Demo interaction leaks shared drag state | Low | High | autoplay pauses mid-drag without cleanup |
| `RISK-012` | Native product subtree is confusing to screen readers | Medium | Medium | many inert-looking controls remain exposed |
| `RISK-013` | Light orange usage fails contrast | Medium | High | signal orange used for small text or CTA fill without dark variant |
| `RISK-014` | Completion claims visual/performance proof that was not run | Medium | High | source review reported as browser/Lighthouse pass |

## Risk controls

### RISK-001 — Hero weight

Mitigation order:

1. static mobile;
2. in-view/document-visible loop;
3. no new animation runtime;
4. server-first page;
5. measure only under authorization;
6. optimize/crop same truthful UI before screenshot substitution.

Owner-visible boundary: performance target remains unproven until authorized measurement.

### RISK-002 — Claim drift

Controls:

- central copy file;
- source hierarchy;
- prohibited phrase scan;
- copy-deck diff;
- no inline convenience copy;
- final requirement audit.

### RISK-003 — Live-route regression

Controls:

- optional props only;
- current behavior as defaults;
- call-site search;
- shared diff isolated;
- `/` test proposal recorded;
- do not refactor current landing.

### RISK-004 — Motion/accessibility

Controls:

- two perpetual effects maximum;
- static defaults;
- reduced-motion kill paths;
- fine-pointer gates;
- native controls;
- cleanup inventory;
- no scroll hijack.

### RISK-005 — Fake proof

Controls:

- exact Velora replacement map;
- audience roles instead of logos;
- workflow verbs instead of stats;
- connection cards instead of testimonials;
- early access instead of pricing.

### RISK-006 — License

Controls:

- retain Velora MIT notice for copied/substantial code;
- prefer first-principles recreation;
- LaunchPad concepts only;
- third-party notice document;
- completion report lists adapted source.

### RISK-007 — Mobile product visibility

Controls:

- explicit acceptance criterion;
- static final phase;
- dedicated frame rules;
- no `display:none`;
- viewport test proposal.

### RISK-008 — Dependency duplication

Controls:

- package/lockfile no-change invariant;
- GSAP/CSS motion spec;
- final dependency diff.

### RISK-009 — Information overload

Controls:

- section count fixed;
- card counts fixed;
- paragraph and word ceilings;
- remove decorative copy first;
- no roadmap/feature dump.

### RISK-010 — Indexing

Controls:

- metadata criterion;
- sitemap diff;
- promotion boundary;
- final route source evidence.

### RISK-011 — Drag state

Controls:

- end drag on static switch, hidden tab, timer cancellation, and unmount;
- one timer;
- shared component lifecycle review.

### RISK-012 — Product accessibility

Controls:

- labeled region;
- evaluate inert/aria-hidden only with equivalent text;
- no aria-live;
- test proposal for screen reader.

### RISK-013 — Contrast

Controls:

- dark orange for normal text/fill;
- signal orange decorative;
- semantic tokens;
- source review and future authorized visual audit.

### RISK-014 — False completion

Controls:

- separate source pass from test proposal;
- release remains not evaluated;
- exact command log;
- every unrun test named.

## Authorization boundaries

No active external-action boundary is required to implement source locally.

The following remain owner-controlled:

- tests and builds used as test evidence;
- browser automation and screenshots;
- visual QA;
- commits, pushes, pull requests;
- deployment;
- promotion from `/new` to `/`;
- indexability, sitemap, canonical, and redirects;
- publication of sample proposal;
- public pricing;
- customer proof.

Do not model an owner-controlled action as a blocker to local source implementation. Mark the related release proof as a boundary in the completion report.

## Change-control rules

### Minor change

May be made without reopening strategy when it:

- fixes grammar;
- resolves line wrapping;
- improves semantic markup;
- tunes a token within the same visual intent;
- fixes cleanup;
- reduces copy.

### Material change

Requires explicit owner decision or plan reconciliation when it:

- changes hero promise or CTA;
- adds/removes a major section;
- adds social proof or pricing;
- changes `/` or route promotion;
- adds a dependency;
- replaces the real hero;
- introduces a sample proposal;
- changes product positioning;
- adds a live data source;
- changes test authorization.

## No unresolved blocker

At package creation, no known decision blocks local implementation. Assumptions must be refreshed in `UNIT-001`, but the recommended defaults permit work to begin.
