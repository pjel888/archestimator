# 15 — Decisions, Assumptions, and Alternatives

**Authority:** `Multi-Agent-Execution-Directive.md` §7 (traceability), `Creating-Plan-Prompt.md` §9 (plan quality).
**Source for decisions:** User request + `MASTER` canon + `03` audit findings.
**Status convention:** `[CANON]` (already decided in MASTER), `[PROPOSED]` (this plan recommends; needs founder sign-off), `[OPEN]` (founder must decide before implementation).

---

## 0. 2026-07-06 decision pruning

The earlier version treated too many implementation defaults as founder blockers. This section supersedes §2 where it conflicts.

### 0.1 True blockers

Only these decisions should block implementation:

| ID | Decision | Default if unanswered | Blocks |
|---|---|---|---|
| OPEN-DEC-005 | Primary access CTA and href | "Request access" -> `/contact?intent=access` until `/signup` is verified self-serve | Final CTA labels/hrefs |
| OPEN-DEC-004 | Founder bio/photo | Use the existing one-line founder rationale and remove "bio coming" | Final `/about` founder block |
| OPEN-DEC-002 | Public pricing numbers | Publish no numeric prices; keep tier shape only | Numeric pricing copy |
| OPEN-DEC-PROOF | Real screenshot/proof selection | Use seed/demo screenshots only | Proof screenshot assets |
| OPEN-DEC-009 | Founder rejects Precision Editorial default | Use Precision Editorial | Visual archetype only |

### 0.2 Defaults that do not need founder approval

These are now plan defaults:

| Former blocker | New status | Reason |
|---|---|---|
| Drop fake hero counters | Default | Fabricated adoption-style numbers violate the claims discipline. |
| Remove AudienceBanner | Default | The user likes the hero, not the stacked sticky banner. |
| Tighten hero subhead | Default | Copy-fit and clarity improvement, no canon rewrite. |
| Make Sign in match CTA geometry | Default | UI consistency fix. |
| Replace warm-commercial / Double-Bezel default | Default | Corrected by `09` §0 and `20` §0. |
| Mono font cleanup | Default if using existing configured fonts | No brand decision unless a new font dependency is added. |
| Specialties expansion | Non-blocking if copy stays role-accurate | Can ship incrementally; no fabricated claim. |
| Privacy-by-design chapter | Non-blocking if claims stay limited to actual stack/data policy | Based on existing Cloudflare/Better Auth/R10 facts. |
| Claims Ledger rendering hierarchy | Default | Honesty remains; visual weight changes. |
| Remove dedicated AI apology section | Default | AI fact remains in Claims Ledger or `/trust`; it does not need top-level conversion weight. |

### 0.3 Current recommended defaults

- Visual archetype: Precision Editorial.
- CTA: "Request access" until self-serve signup is proven.
- Hero metric cards: ordinals and behavior previews only.
- Typeface: existing configured fonts; no new font dependency.
- Navigation: visually contained/floating, no stacked AudienceBanner, accessible mobile behavior.

---

## 1. Load-bearing decisions made in this plan

### DEC-A — Reanchor "earn every claim" off conversion surfaces `[PROPOSED]`

**Decision:** The `MASTER §10.2` "earn every claim" principle stays as the brand's discipline. On conversion surfaces (homepage hero, /pricing top, /features top, /contact top), the dominant principle becomes "lead with the change". Honesty anchors (Claims Ledger NotUs rows, "no fabricated metrics", founder-bio-coming, AI-on-the-roadmap, no-compliance-badges) move to `/trust`, `/changelog`, `/roadmap`, and lower-funnel sections of the homepage.

**Rationale:** Honesty is a value. Leading with what we lack is a marketing failure. The current public surface actively tells prospects "we have no proof to show you" (`03` §1.10) and "we are validating the price" (`03` §3.1) on conversion surfaces. A serious AEC buyer reads this as "this is not a real product". The brand voice canon does NOT require self-flagellation on the homepage; it requires precision and no overclaiming. There's a difference.

**Rejected alternative 1:** "Keep the current honesty-first posture on all surfaces." Rejected because the user explicitly asked for "no beta wording and all" and "present as a legitimate app".

**Rejected alternative 2:** "Drop the honesty principle entirely and become a hype-register landing page." Rejected because (a) it contradicts `MASTER §10.2`, (b) the brand promise and category hook are calm-conviction, not hype, (c) hype would undermine the AEC professional audience who has been burned by SaaS marketing.

**Rejected alternative 3:** "Move all honesty anchors to a single `/trust` page." Rejected because some anchors (Privacy by design, Activity history) are competitive wedges and belong on the homepage Proof section. The right distribution is per-surface, not single-page.

**Founder sign-off required:** ✅ Yes — OPEN-DEC-001.

---

### DEC-B — Replace "Book a walkthrough" as primary CTA with access-model-aware product CTA `[PROPOSED]`

**Decision:** Primary CTA on the homepage hero, final CTA, and /contact changes from "Book a walkthrough" (founder-led, service-business framing) to "Request access" -> `/contact?intent=access` while signup is invite-gated. Once `/signup` is verified self-serve, the CTA may become "Start free" -> `/signup`. "Book a walkthrough" moves to secondary CTA.

**Rationale:** A serious AEC buyer landing on the homepage and seeing "Book a walkthrough" as the primary CTA reads "this is a service business, not a product". A product-led CTA is still needed, but the current `/signup` route appears gated by `ClosedBetaGate` (`03` §3.4). "Request access" preserves product intent without dead-ending visitors. If self-serve signup is verified, "Start free" becomes valid.

**Rejected alternative 1:** "Keep 'Book a walkthrough' as primary CTA because we don't have self-serve signup yet." Rejected because it locks the public surface into service-business framing indefinitely.

**Rejected alternative 2:** "Use 'Try the workspace' → `/workshop` as primary CTA." Rejected because `/workshop` is an authenticated route; without signup it would redirect to login and confuse the buyer.

**Rejected alternative 3:** "Use 'Get started' as a generic primary CTA." Rejected because it's vague.

**Founder sign-off required:** ✅ Yes — OPEN-DEC-005 (and Phase 1B verification that `/signup` flow supports the CTA).

---

### DEC-C — Expand AEC specialties from 3 to 7 `[PROPOSED]`

**Decision:** The Specialties section on the homepage expands from 3 (General contractors, Specialty contractors, Commercial interiors) to 7 (Architects, Engineers, General contractors, Specialty / fit-out contractors, Cost estimators / QS, Interior designers, Project managers), matching README + `MASTER §6.2`.

**Rationale:** The current 3 specialties undersell the audience. The README and MASTER describe a 7+ AEC role audience. A GC landing on the page sees 3 specialties and assumes the product is narrow; an architect or QS lands and sees nothing for them. Expanding to 7 gives every primary AEC role a directed message.

**Rejected alternative 1:** "Keep 3 specialties and use a 'Specialty' tab system to expand on click." Rejected because the current 3 undersell the audience even on the tabs.

**Rejected alternative 2:** "Expand to all 12+ roles in `MASTER §6.2`." Rejected because 12+ is too many for a landing-page section; 7 covers the primary AEC roles without becoming a directory.

**Rejected alternative 3:** "Drop the Specialties section entirely and rely on the AudienceBand." Rejected because the AudienceBand is too abstract; the Specialties section gives concrete directed messages.

**Founder sign-off required:** ✅ Yes — OPEN-DEC-006 (scope: 7 specialties confirmed).

---

### DEC-D — Add a 4th FeatureChapter: "Private by design" `[PROPOSED]`

**Decision:** The FeatureChapters section adds a 4th chapter dedicated to the R10 competitive wedge: privacy by design. Copy: "Your data is yours, never pooled or anonymized across customers. Built on Cloudflare Workers, D1, R2, and Better Auth."

**Rationale:** `MASTER §2` names privacy-by-design as one of the four defensible competitive wedges (alongside fit/reach/price, proposal-to-approval, and supplier-linked bridge). The current homepage gives this wedge zero feature-chapter real estate. The Claims Ledger already has the Live redline row; the homepage should mirror it.

**Rejected alternative 1:** "Fold privacy into the ProofSection instead of giving it a chapter." Rejected because privacy deserves chapter-level treatment — it's a wedge, not a footnote.

**Rejected alternative 2:** "Skip the privacy chapter until we have SOC 2 / DPA." Rejected because R10 is a deliberate-positioning choice (`MASTER §1`, `MASTER §4.4`); we don't need a compliance badge to claim it.

**Founder sign-off required:** ✅ Yes — OPEN-DEC-007 (confirms R10 is a public marketing wedge).

---

### DEC-E — Drop the hero fake counters; replace with behavior previews only `[PROPOSED]`

**Decision:** The Hero metric cards ("Areas Priced: 248", "Proposals Submitted: 67", "Bids Won: 19") drop the animated counters entirely. The "01 / 02 / 03" ordinals and the behavior previews (which are already there) stay as the proof.

**Rationale:** The counters are demo placeholders. `MASTER §12.8` bans fabricated adoption metrics. The counters live in a gray zone — defensible as "illustrative" but a sharp buyer will notice. The behavior previews (the tooltips on each card) are the actual product-behavior proof and don't need fake numbers attached.

**Rejected alternative 1:** "Replace fake counters with real numbers from the production D1." Rejected because (a) the product has no external users yet (`MASTER §0`: "pre-launch MVP"), so any number would still be fabricating adoption; (b) even internal-only numbers would be misleading.

**Rejected alternative 2:** "Keep counters but label them as 'illustrative'." Rejected because the label draws more attention to the fakery.

**Rejected alternative 3:** "Replace counters with abstract metric labels (Areas, Components, Suppliers) and no numbers." Rejected because the labels alone don't communicate as much as the existing behavior previews.

**Founder sign-off required:** ✅ Yes — OPEN-DEC-008.

---

### DEC-F — Reorganize /features Claims Ledger rendering `[PROPOSED]`

**Decision:** The /features page renders the Claims Ledger with Live leading (dominant visual weight), Building (2 rows, honest), Planned (3-4 selected, not the full 7), NotUs (collapsed footer-style block, NOT equal visual weight with Live).

**Rationale:** The current /features page (`03` §5.2) renders all 4 groups at equal visual weight. The NotUs group's 8 rows get the same real estate as Live's 11 rows. A serious buyer scrolling /features sees the NotUs at the same level as Live and reads "this product has as many things it doesn't do as things it does". The honesty principle is right; the information architecture is wrong.

**Rejected alternative 1:** "Drop the NotUs group from /features entirely." Rejected because the boundary lines are part of the brand honesty; they should stay, just at lower visual weight.

**Rejected alternative 2:** "Move all NotUs to /trust only." Rejected because /features should still state the boundary; collapsing it to a footer-style block is enough.

**Founder sign-off required:** ✅ Yes — captured in OPEN-DEC-001 (DEC-A reanchor).

---

### DEC-G — Replace founder-bio-coming slot with a real founder block `[PROPOSED]`

**Decision:** The empty orange gradient box on /about (`src/app/about/page.tsx:108-126`) is replaced with a real founder block: founder name, role (Founder & CEO, or Founder), one-paragraph bio, optional photo.

**Rationale:** "Founder bio and photo are coming. We won't invent credentials." is the single most legitimacy-destroying element on the public surface (`03` §3.1). The founder's name and one-paragraph bio are not an unproven claim.

**Rejected alternative 1:** "Keep the empty slot until the founder bio is supplied." Rejected because the empty slot is actively harming conversion.

**Rejected alternative 2:** "Remove the founder section entirely." Rejected because founder-led is part of the brand; the section should exist, just with real content.

**Rejected alternative 3:** "Use a pseudonym or initials only." Rejected because it's worse than the empty slot.

**Founder sign-off required:** ✅ Yes — OPEN-DEC-004 (founder to supply name + bio + optional photo).

---

## 2. The OPEN-DECs (founder sign-off required before implementation begins)

These open decisions must be resolved by the founder before any structural implementation work begins. Phase 1A lint pass (removing banned beta-wording) does NOT require these sign-offs and can proceed in parallel.

### OPEN-DEC-001 — Reanchor "earn every claim" off conversion surfaces

**The decision:** DEC-A above. The honesty principle stays as discipline. On conversion surfaces, "lead with the change" becomes the dominant principle. Honesty anchors move to `/trust`, `/changelog`, `/roadmap`, and lower-funnel homepage sections.

**Why founder must decide:** This is a brand-voice recast. It touches the founder's canon (`MASTER §10.2`).

**Founder options:**
- ☐ Approve as proposed.
- ☐ Approve with modification: ____.
- ☐ Reject — keep current posture. (Plan would then need re-scoping.)

**Default if no response in 7 days:** Phase 1A lint pass proceeds with the banned-phrases list in `06` §3.2; structural recasts deferred until resolved.

---

### OPEN-DEC-002 — Pricing page reframe

**The decision:** /pricing page lead changes from "Pricing numbers are a hypothesis we are validating" to "Freemium. Seat-based. Priced in pesos. Never metered on estimating, exports, or BOQ lines." The cement-anchor metaphor stays; the "hypothesis" eyebrow and status pill drop.

**Why founder must decide:** This reframe touches the founder's pricing-publication discipline (`MASTER §9.3` gates pricing numbers behind discovery). The plan is NOT proposing to publish numbers; it's proposing to stop leading with "we are validating" on the conversion surface.

**Founder options:**
- ☐ Approve as proposed.
- ☐ Approve with modification: ____.
- ☐ Reject — keep current "honest validation" framing.

**Default if no response in 7 days:** Phase 1A lint pass removes "hypothesis" / "being validated" from the meta description; full pricing-page reframe deferred.

---

### OPEN-DEC-003 — AI / deferred-roadmap framing

**The decision:** The /features page drops the dedicated "AI is on the roadmap, not in the product today." section heading. The AI fact stays in the Claims Ledger NotUs footer abbreviation and on `/trust`. The homepage does not surface AI as a section.

**Why founder must decide:** This touches the founder's AI-discipline posture (`MASTER §8.5`: AI deferred to roadmap; Ask-only at Pro and up when shipped).

**Founder options:**
- ☐ Approve as proposed.
- ☐ Approve with modification: ____ (e.g., "Move the AI section to /roadmap page once it exists").
- ☐ Reject — keep the dedicated AI section on /features.

**Default if no response in 7 days:** Phase 1A lint pass removes the AI section heading from /features; the Claims Ledger row stays.

---

### OPEN-DEC-004 — Founder bio slot

**The decision:** DEC-G above. The founder supplies name + 1-paragraph bio + optional photo. Until supplied, the empty slot is replaced with the existing line ("Archestimator exists because the founder has felt the workflow from both sides — the design and cost side, and the software side.") and the "bio coming" caption is removed.

**Why founder must decide:** This is founder content. The plan cannot write it.

**Founder options:**
- ☐ Approve — I'll supply name + bio + photo by ____.
- ☐ Use the existing one-line copy until I supply the full bio. Remove the "bio coming" caption now.
- ☐ Keep the current "bio coming" slot.

**Default if no response in 7 days:** Use the existing one-line copy; remove the "bio coming" caption.

---

### OPEN-DEC-005 — Hero primary CTA

**The decision:** DEC-B above. Primary CTA changes from "Book a walkthrough" to "Request access" -> `/contact?intent=access` while `/signup` requires an invite token. It can switch to "Start free" -> `/signup` after self-serve signup is verified.

**Why founder must decide:** This is a conversion-funnel decision with implications for the closed-beta access model.

**Founder options:**
- ☐ Approve "Request access" -> `/contact?intent=access` while invite-only.
- ☐ Approve "Start free" -> `/signup` after self-serve signup is verified.
- ☐ Approve "Try the workspace" -> `/workshop` only if a demo-mode path exists.
- ☐ Reject — keep "Book a walkthrough" as primary CTA.

**Default if no response in 7 days:** Phase 1B verifies `/signup` flow and picks the right CTA copy automatically.

---

### OPEN-DEC-006 — Specialties expansion scope (DEC-C)

**Founder options:** ☐ Approve 7 specialties. ☐ Modify: ____. ☐ Reject.

### OPEN-DEC-007 — Privacy-by-design FeatureChapter (DEC-D)

**Founder options:** ☐ Approve. ☐ Modify: ____. ☐ Reject.

### OPEN-DEC-008 — Drop hero fake counters (DEC-E)

**Founder options:** ☐ Approve. ☐ Modify: ____. ☐ Reject.

### OPEN-DEC-009 — Visual archetype override

**The decision:** Decide whether to override the corrected default. `09` §0 and `20` §0 now recommend **Precision Editorial**: preserve the existing cool canvas/product mockup/signal-orange backbone, use restrained precision frames, avoid a beige/cream/espresso repaint, and keep the hero estimate-sheet mockup above the fold.

**Why founder must decide:** This is a brand-aesthetic choice that affects palette, texture, and first impression for the next 12+ months.

**Founder options:**
- ☐ Keep Precision Editorial as proposed.
- ☐ Move warmer, but keep the palette neutral and avoid a cream/espresso theme.
- ☐ Move darker, but keep direct product proof and avoid decorative glow/orb styling.
- ☐ Modify palette: ____.

**Default if no response in 7 days:** Precision Editorial is used.

### OPEN-DEC-010 — New mono font dependency

**The decision:** Decide whether a new mono font should be added. The default is to use existing configured fonts and remove literal `Roboto Mono` fallbacks only when an existing configured mono is available.

**Why founder must decide:** Typography is part of brand identity only if a new font dependency or public brand font choice is introduced.

**Founder options:**
- ☐ Use existing configured mono/system mono; add no dependency.
- ☐ Approve a specific mono family: ____.
- ☐ Keep current font fallback stack unchanged for now.

**Default if no response in 7 days:** Use existing configured mono/system mono; add no dependency.

### OPEN-DEC-011 — Navigation architecture

**The decision:** Convert the edge-to-end sticky nav to a floating glass pill (`20` §3.3 and `09` §4.3). On mobile, replace the `details`/`summary` dropdown with a hamburger-to-X morph and full-screen glass overlay with staggered links.

**Why founder must decide:** This changes a core navigation pattern and may affect accessibility/UX assumptions.

**Founder options:**
- ☐ Approve floating glass pill + hamburger-to-X morph as proposed.
- ☐ Approve floating pill but keep a simpler dropdown for mobile.
- ☐ Reject — keep the current sticky edge-to-end nav.

**Default if no response in 7 days:** Use a visually contained/floating treatment that removes the stacked AudienceBanner and keeps mobile behavior accessible.

### OPEN-DEC-012 — HeroMetricCards numeric treatment

**The decision:** The HeroMetricCards drop the animated fake counters. `20` §3.8 recommends replacing them with large `01 / 02 / 03` ordinals + title + proof bullets. This is a narrower version of OPEN-DEC-008.

**Why founder must decide:** Confirms the exact replacement for the counters.

**Founder options:**
- ☐ Approve ordinals-only as proposed.
- ☐ Approve ordinals + one small real metric if one exists (e.g., number of estimate tree levels supported).
- ☐ Reject — keep the animated counters.

**Default if no response in 7 days:** Ordinals-only.

**Note:** As of the 2026-07-06 pruning pass, OPEN-DEC-006, 007, 008, 010, 011, and 012 no longer block implementation when the defaults in §0 are followed. They become founder-review items, not startup gates.

---

## 3. Assumptions (with validation status)

| ID | Assumption | Validation | Status |
|---|---|---|---|
| ASSUMP-001 | The closed-beta gate (`ClosedBetaGate` in `/signup`) allows self-serve signup without an invite token. | `src/app/signup/page.tsx:33-34` renders `ClosedBetaGateFromSearchParams` — appears to require a token in search params. Phase 1B must verify. | ⚠️ Unverified |
| ASSUMP-002 | The A/B experiment `hero-cta-copy` is currently running with variant A only. | `src/app/page.tsx:21` wraps in `ABExperimentProvider` with variant="A". | ✅ Verified (visible in source) |
| ASSUMP-003 | `/trust` route exists and renders honesty anchors correctly. | `src/app/trust/page.tsx:32, 169` confirmed. | ✅ Verified |
| ASSUMP-004 | `/changelog` route does not exist; would need creation if used as a surface for honesty anchors. | Not present in `src/app/` directory listing (`03` §1 audit). | ⚠️ Unverified — Phase 5 must check |
| ASSUMP-005 | `/roadmap` route does not exist; same as above. | Not present. | ⚠️ Unverified — Phase 5 must check |
| ASSUMP-006 | The founder will supply a one-paragraph bio and optional photo for OPEN-DEC-004. | Founder content — not in repo. | ⛔ Founder-dependent |
| ASSUMP-007 | The marketing-surface scope defined in `02` §2 is correct and exhaustive. | `src/app/{/,pricing,features,about,contact}/page.tsx` + `src/components/landing-v3/**` + `src/components/landing/{sections,claims-ledger,shared,company-proof-data}/**`. | ✅ Verified |
| ASSUMP-008 | The `claims-matrix-check.mjs` script reconciles `claims-data.ts` against the live Feature Inventory. | `claims-data.ts:9-11` comment confirms the gate exists. | ✅ Verified (script existence); Phase 1A must verify still passes |
| ASSUMP-009 | Real product screenshots can be captured from `/workshop/projects/[id]/estimates/[nodeId]` etc. without exposing sensitive data. | The workshop has demo data (`data/local/seed.json` per README). | ✅ Verified — use seed data for screenshots |
| ASSUMP-010 | The Cloudflare Workers + D1 + R2 + Better Auth stack is a legitimate trust signal for AEC buyers in Philippines/SEA. | Stack evidence in `wrangler.jsonc`, `package.json`, README. | ✅ Verified (substance); adoption perception unmeasured |

---

## 4. Rejected alternatives (plan-level)

These are alternatives considered and rejected at the plan level (not per-decision).

| Alternative | Why rejected |
|---|---|
| **Skip the planning pass and implement directly.** | Rejected: the founder's brand voice canon (`MASTER §10.2`) requires deliberate sign-off on recasts. Implementing directly would either (a) recast the canon unilaterally (forbidden by `02` §4) or (b) leave the beta-wording in place (fails the user's explicit request). |
| **Use a generic SaaS landing-page template and replace the current page entirely.** | Rejected: the current page has strong foundations (hero architecture, Claims Ledger system, A/B experiment infrastructure). Tearing it out loses that. The plan rebuilds section-by-section, not page-by-page. |
| **Hire a copywriter / brand consultant.** | Rejected: the founder has already done the brand work in `MASTER`. The problem is execution, not strategy. |
| **Wait for real customers before touching the page.** | Rejected: the page is the conversion surface that prevents real customers. The chicken-and-egg problem is solved by recasting the page first, not by waiting. |
| **Move all honesty anchors to a single `/trust` page and remove them from the homepage.** | Rejected: some anchors (Privacy by design, Activity history) are competitive wedges. The right distribution is per-surface. |
| **Build new routes (`/changelog`, `/roadmap`) before restructuring existing ones.** | Rejected: existing routes (`/`, `/pricing`, `/features`, `/about`, `/contact`) carry the conversion load today. Building new routes first delays the recast. `/changelog` and `/roadmap` are Phase 5 enhancements, not Phase 1 blockers. |
| **Invent "design partner" or "founding team" logos to fill the empty proof section.** | Rejected: `MASTER §12.8` explicitly bans fabricated adoption metrics. The plan holds this line. |
| **Move to a new design system (e.g., replace SF Pro app stack with Inter).** | Rejected: out of scope. `DESIGN.md` is alpha-stage but the landing-exempt editorial direction is already defined. The plan extends, not renegotiates. |

---

## 5. Decision log

| Decision | Date | Status | Notes |
|---|---|---|---|
| DEC-A reanchor "earn every claim" | 2026-07-05 | `[PROPOSED]` — OPEN-DEC-001 | Pending founder sign-off |
| DEC-B replace primary CTA | 2026-07-05 | `[PROPOSED]` — OPEN-DEC-005 | Pending founder sign-off + Phase 1B verification |
| DEC-C expand specialties to 7 | 2026-07-05 | `[PROPOSED]` — OPEN-DEC-006 | Pending founder sign-off |
| DEC-D add Privacy FeatureChapter | 2026-07-05 | `[PROPOSED]` — OPEN-DEC-007 | Pending founder sign-off |
| DEC-E drop hero fake counters | 2026-07-05 | `[PROPOSED]` — OPEN-DEC-008 | Pending founder sign-off |
| DEC-F /features Ledger rendering | 2026-07-05 | `[PROPOSED]` — bundled with OPEN-DEC-001 | Pending founder sign-off |
| DEC-G real founder block | 2026-07-05 | `[PROPOSED]` — OPEN-DEC-004 | Pending founder content |
| DEC-H visual archetype selection | 2026-07-05 | `[PROPOSED]` — OPEN-DEC-009 | Pending founder sign-off |
| DEC-I mono font replacement | 2026-07-05 | `[PROPOSED]` — OPEN-DEC-010 | Pending founder sign-off |
| DEC-J floating nav architecture | 2026-07-05 | `[PROPOSED]` — OPEN-DEC-011 | Pending founder sign-off |
| DEC-K hero metric ordinal treatment | 2026-07-05 | `[PROPOSED]` — OPEN-DEC-012 | Pending founder sign-off |

---

## 6. How this doc feeds the rest of the plan

| Section | Feeds |
|---|---|
| §1 DEC-A..K | `11_IMPLEMENTATION_PLAN.md` phase scope + `14_RISK_REGISTER.md` voice-drift risk |
| §0 true blockers/defaults | `17_FINAL_READINESS_REVIEW.md` readiness cap + `README.md` status table |
| §3 ASSUMP-001..010 | `14_RISK_REGISTER.md` unverified-assumption risks |
| §4 Rejected alternatives | `01_EXECUTIVE_SUMMARY.md` "what this plan does NOT do" |
