# 12 — Second-Pass Hardening (Adversarial Review & Synthesis)

**Plan:** Shared Link Improvement Plan · **Date:** 2026-06-13
**Lens:** Synthesis of an independent 2nd-pass review of docs 01–11. This document does **not** change any code or any of the original 11 docs; it records what survived adversarial scrutiny, what must change, and the precise amendments needed before T1 execution.

> Truth posture: every load-bearing claim below was re-verified by me (the synthesizer) against current `main` via Read/grep before citing. Where I assert a file:line, I read it in this pass. Where a number is a target or an inference, it is labelled. The original plan self-scored **100% across all four dimensions in all 11 docs** ([11 §5](11_SCORING_AND_INTEGRITY.md)); this pass concludes that is **defensible as a *planning artifact* on Strategy/Quality, but overstated on Implementation Readiness** for T1, because several "layout-only / LOW-blast / instant-rollback" framings leak into shared, non-trivial, or unscoped work the plan books as free.

---

## 1. Purpose & how this 2nd pass was produced

The first pass (docs 00–11) was a single-author audit+plan that scored itself 100%. This 2nd pass stress-tests it with **independent, differently-incentivized agents**, then I reconcile their findings against source:

| Stream | Agents / segments | What it produced |
|---|---|---|
| **Red-team (adversarial)** | 3 lenses: product-strategy, ux-design, implementation-pragmatist | 21 challenges + ~26 unstated assumptions; each tries to break a premise the plan treats as settled |
| **Prior-art grounding** | 3 segments: construction-estimating tools, SaaS proposal/quote portals, data-dense client docs | What real peers (Jobber, Buildxact, Proposify, Qwilr, PandaDoc, DocuSign, Stripe, SEB) + UX research (Baymard, NN/g, USWDS, WCAG) actually do |
| **Integration feasibility** | 2 areas: tabs/tree/decision machinery, print/responsive CSS | Concrete composition risks + a wiring plan + which tests churn |
| **Effort sizing** | 4 tracks, phase-by-phase | Effort + dependencies + critical path + schedule risks |
| **Visual mockup** | 1 build | An embeddable HTML mockup of the proposed layout |
| **Completeness critic + verifier** | 1 each | 12 still-missing gaps, 6 contradictions, a P0-decision-impact verdict, and a readiness delta |

My role here is **adjudication**, not stenography: for each strong challenge I state whether the plan **holds, must be revised, or must change**, and exactly how. I down-weight challenges that contradict verified ground truth and up-weight those I could independently confirm in code.

---

## 2. Red-team outcomes (strongest challenge per lens + my adjudication)

### 2.1 Product-strategy lens

**ADV-01 — The "top feature" / "response rate measurably improves" north-star is unfalsifiable at current scale.** *Verdict: PLAN MUST CHANGE (the success definition), feature work HOLDS.*
The feature has ~11 publications / 1,168 events lifetime ([05 DB-01](05_DATABASE_AUDIT.md), agent re-verified via `list_tables`) and the product is NO-GO closed beta ([10_state/decisions.md](../../10_state/decisions.md), 2026-06-02). A "response rate" north-star ([01 §7 line 66, §10 line 96](01_STRATEGY.md)) cannot move detectably at n=11. This is correct and I agree. It does **not** invalidate doing the overhaul — the layout/typography problem is real and code-verified ([page.tsx:71](../../../src/app/share/[token]/page.tsx#L71) is a centered `max-w-[960px]`; Button text is `!text-[10px]`) — but the *headline metric* must be demoted. **Change:** reframe the investment as "launch-readiness polish of the outbound surface," demote response-rate to a post-launch hypothesis, and make T1's success criterion the AC/qualitative gates. See [Amendment A1](#7-plan-amendments).

**ADV-03 — The baseline that would make impact "provable" is sequenced AFTER T1 ships.** *Verdict: PLAN MUST CHANGE (sequencing), and it is a genuine self-contradiction.*
[09 §4 P-Perf-0](09_IMPLEMENTATION_PLAN.md) lives in Track T2, which [09 §1 line 12](09_IMPLEMENTATION_PLAN.md) sequences *after* T1. So the headline overhaul lands before its own pre-overhaul baseline exists; a clean before/after is impossible by construction. The plan self-scored Truth & Integrity 100% partly on "impact is provable, not asserted" ([01 §11, 09 line 75](01_STRATEGY.md)). That claim is undercut by its own sequencing. **Change:** either move baseline capture out of T2 into a P-UI-0 prerequisite, or drop the provable-impact claim. Given ADV-01 (n=11), I recommend dropping the metric, not re-sequencing a measurement that can't reach significance.

**ADV-02 / ADV-04 / ADV-05 — "cheaper middle option," "premium portal is not a brand goal," "reuse the existing proposal scale."** *Verdict: PARTIALLY VALID — REVISE framing, but prior art overrides the core of ADV-02.*
- ADV-02 (ship a wide single-column first, defer the rail) is the most interesting strategy challenge, but **prior art contradicts it** (see §3): three independent construction tools and the e-commerce/Stripe canonical pattern converge on total+decision in a persistent right-side surface. The rail is **table-stakes, not speculative**. I do *not* adopt "defer the rail." I *do* adopt its breakpoint concern, which is independently confirmed by the UX lens (ADV-UX-01) — see §2.2.
- ADV-04 ("premium portal" is layered on, brand asks for clarity+trust) is fair and cheap to honor: replace the organizing metaphor with "clear, trustworthy, legible proposal that prints well." Low-cost wording change. **Revise.**
- ADV-05 ("reuse existing proposal scale instead of minting a new one") collides with code reality (§2.3, ADV-01-impl): there is no existing share/proposal type tier; the enforcer hardcodes a 12px cap with only a landing allowlist. There is no third scale to reuse. **Does not change the plan**, but the type-scale decision (D1) changes character — see §3 and §2.3.

**ADV-06 — Anonymous "silent dead-end" may be correct security behavior mislabeled as a conversion bug.** *Verdict: HOLDS with a copy reframe.* Decisions are bound to a named recipient (the signed-cookie/token model). A stranger accepting a six-figure bid is a worse outcome than a dropped response. Keep S-04 as the small item it is; reframe the copy from "convert anonymous visitors" to "explain why a decision requires being the named recipient." No structural change. The plan already scopes this correctly ([09 D4](09_IMPLEMENTATION_PLAN.md)).

### 2.2 UX-design lens

**ADV-UX-01 — The rail regresses the table on the *modal* laptop (1366/1440).** *Verdict: PLAN MUST CHANGE. This is the single most important UX finding and I confirmed every input in code.*
The grid splits at `xl=1280` ([03 §4.5 line 266](03_UX_UI_AUDIT_AND_OVERHAUL.md)) with a fixed `380px` rail ([03:233](03_UX_UI_AUDIT_AND_OVERHAUL.md)) and the Tree view keeps a `260px` navigator *inside* the work-zone — confirmed at [SharePageTabs.tsx:517](../../../src/components/share/SharePageTabs.tsx#L517) (`hidden lg:flex lg:w-[260px]`) and [03 §4.5 line 265](03_UX_UI_AUDIT_AND_OVERHAUL.md). At a 1366 viewport: container minus padding ≈ 1286; minus 380 rail minus gap ≈ 882 work-zone; minus 260 tree nav ≈ **~620px for the actual BOQ table — narrower than today's ~680px** inside the 960px column. The headline promise ("the table finally gets the width") *regresses* on the most common client laptop for the Tree view. And **AC-UX-01 only measures at ≥1536px** ([03:378](03_UX_UI_AUDIT_AND_OVERHAUL.md)), which structurally dodges the case where the rail hurts. **Change:** defer the grid split to `2xl=1536` (keep 1280–1535 wide-single-column), *or* collapse the 260px tree nav into a drawer/popover whenever the rail is present; and add an AC measuring work-zone table width at 1366/1440. See [Amendment A2](#7-plan-amendments).

**ADV-UX-07 / R8 — The sticky rail can't hold Summary + Decision + Comments and keep the Decision visible on a 768px-tall laptop.** *Verdict: PLAN MUST CHANGE. AC-UX-06 is asserted-but-physically-unachievable as composed.*
The rail holds Summary + a 3-button Decision + a scrolling Comments thread whose body is `max-h-[420px]` ([SharePageComments.tsx:331](../../../src/components/share/SharePageComments.tsx#L331), re-verified). On a 1366×768 laptop (~700px usable height) the combined sticky-block height exceeds the viewport, so either the rail scrolls internally (Decision *not* always-visible → defeats AC-UX-06 at [03:383](03_UX_UI_AUDIT_AND_OVERHAUL.md)) or Comments clips. The required guard — make only Summary+Decision sticky, or `max-height: calc(100vh - offset); overflow-y:auto` — is specified nowhere. Both the feasibility pass (R8) and prior-art (CSS-Tricks, Smashing, SEB) flag it independently. **Change:** make only the short Summary+Decision sub-block sticky; let Comments flow non-sticky below; add an AC that the sticky sub-block height < 768px. See [Amendment A3](#7-plan-amendments).

**ADV-UX-04 — "3-zone layout reads as premium" is asserted, never operationalized; the plan adds a workshop-style RIGHT rail while rejecting the LEFT one.** *Verdict: REVISE — add a qualitative gate.* "Premium" is genuinely never turned into a testable signal, and three dense vertical bands (260px nav + 380px rail with three stacked sections + per-sheet donut + up-to-4 control rows) risk reading "busier," passing every width/type AC while failing the unmeasured goal. **Change:** operationalize it (one calm primary reading path; rail reads as a quiet companion, not a third dashboard column; consider pulling Comments out of the always-visible rail) and prototype the xl layout against "paper proposal," not just AC-UX-01.

**ADV-UX-02 — The donut is an undrawn layout decision marked "verify-only."** *Verdict: PLAN MUST CHANGE. I confirmed the geometry.* The compact donut is `w-full h-[400px]` with a `520×400` viewBox ([CostDonutChart.tsx:315, 67-68](../../../src/components/charts/CostDonutChart.tsx#L67)) and callout label X coords hardcoded for a 520-wide canvas (`LEFT_LABEL_X:16 / RIGHT_LABEL_X:504`, [CostDonutChart.tsx:74-75](../../../src/components/charts/CostDonutChart.tsx#L74)). In a ~1000px work-zone, `preserveAspectRatio` meet-centering floats a ~520px donut in a much wider band — **re-creating the wasted-space complaint inside the work-zone.** Doc 03 itself flags this as a watch-item ([03 §4.8 line 426](03_UX_UI_AUDIT_AND_OVERHAUL.md): "the `compact` donut (520×400 viewBox) when it renders in a wider zone") but [03 §5](03_UX_UI_AUDIT_AND_OVERHAUL.md) still classes the row "none/verify." **Change:** decide+draw it — cap the container (`mx-auto max-w-[560px]`, left-align) or move it beside the Summary — and re-classify the row to "layout-only: constrain compact container width." See [Amendment A4](#7-plan-amendments).

**ADV-UX-03 / R2 / R6 — "Consolidate 3 tab rows" is underspecified and breaks tests.** *Verdict: REVISE (precision) + tests WILL churn.* There are effectively **four** control surfaces, and three distinct `role="tablist"` regions exist ([SharePageTabs.tsx:322, 371, 406](../../../src/components/share/SharePageTabs.tsx#L322)). The keyboard-nav test uses a *global* `getAllByRole('tab')` and indexes `tabs[0]/tabs[1]` as estimate tabs, relying on the Tree/Grid sub-tabs (also `role="tab"` at [:417](../../../src/components/share/SharePageTabs.tsx#L417)) rendering *after* the tablist. UX-15 moving the Tree/Grid toggle *above* the tablist breaks that ordering. **Change:** render the view toggle as `role="button"`/radiogroup (it's a view-mode switch, more correct anyway) so it leaves the global tab set; scope the test to `within(getByRole('tablist',{name:/estimates/i}))`; do **not** fold the sub-sheet tablist into the segmented control (the v12 multi-tab test depends on its `${name} tabs` accessible name). The plan's "consolidate 3 rows" language is imprecise and would break tests if taken literally.

**ADV-UX-06 / S-06 — Mobile "stacked row-cards" destroys column-scanning and is still an open decision.** *Verdict: REVISE — validate before committing.* For a 412-row estimate, stacking cards loses down-column Qty/Unit/Total comparison — the exact need of the trade/QS reviewer personas the plan names ([01 §4](01_STRATEGY.md)) — and contradicts the plan's own observation that print (full-width real table) is the best-behaved surface (UX-10). It's listed in [09 P-UI-3 S-06](09_IMPLEMENTATION_PLAN.md) as if settled but is genuinely contested. **Change:** validate the card pattern against the scan task, or prefer a constrained table (Description + Total, Qty/Unit on tap; or pinned Description column with horizontal scroll); add an AC that mobile preserves down-column total comparison; don't let "no horizontal scroll" (AC-UX-05) dominate.

**ADV-UX-05 — The "approved exception" becomes a precedent pattern; resolve the ink drift in the same governance pass.** *Verdict: REVISE (governance), does not change T1 sequencing.* Make the Client Portal scale a *named, documented tier* with explicit scope and a lint rule that recognizes the tier, not a blanket exception; fix the `#3D3D3D` vs `#292929` ink drift (V10, [11 §2](11_SCORING_AND_INTEGRITY.md)) in the same pass so the new scale references one real ink value.

### 2.3 Implementation-pragmatist lens

**ADV-01-impl — "Register the type scale as an approved DESIGN.md exception" assumes an exception API that does not exist.** *Verdict: PLAN MUST CHANGE. CRITICAL. I independently confirmed this.*
[scripts/enforce-app-design-system.mjs](../../../scripts/enforce-app-design-system.mjs) hardcodes `maxPx = 12` (line 6), `labelLikeTextSizeLimitPx = 9` (line 7), and `secondaryTextSizeLimitPx = 10` (line 8) over all of `src/app` + `src/components`. The **only** escape is a flat 5-file `landingAllowlist` (lines 10-16) + the `src/components/landing/` prefix (line 17). **`grep` for `share` in the script returns nothing.** Worse, it forbids named sizes like `text-2xl` outright (forcing arbitrary `text-[NNpx]` which then trips `px>12`), flags uppercase labels >9px, and flags secondary-tone text >10px — all of which the plan's `/share` scale (13–14px body, 11px uppercase eyebrows, 11px tertiary footers) violates on three independent rules. So **D1=Yes is not a documentation sign-off; it requires editing a shared CI build-gate** across three rules. [09 P-UI-2 S-03](09_IMPLEMENTATION_PLAN.md) says only "apply as share-scoped utilities" and [AC-UX-13] says "registered as an approved exception" — both assume a mechanism that isn't there. **Change:** add a P-UI-0 prerequisite to extend the enforcer with a `/share` allowlist covering all three rules, ship it on its own deploy *before* the layout commit, and add a guard test that the enforcer still fails on a >12px violation outside `/share`. See [Amendment A5](#7-plan-amendments).

**ADV-02-impl — The "unmistakable decision CTA" is unachievable as layout-only because the buttons ARE the shared Button primitive pinned at 10px with `!important`.** *Verdict: PLAN MUST CHANGE. HIGH. Confirmed.*
[SharePageDecision.tsx](../../../src/components/share/SharePageDecision.tsx) renders the shared `Button`, whose base class hardcodes `!text-[10px] !font-medium` ([button.tsx:55](../../../src/components/ui/button.tsx#L55)). I counted **90 importers** of that primitive (`grep -rl` → 90; the critic estimated ~67/~90 — actual is 90), and editing it is explicitly forbidden ([07 §4](07_BLAST_RADIUS_ANALYSIS.md), [09 §3](09_IMPLEMENTATION_PLAN.md)). So the premise "the decision prompt deserves to be unmistakable" (03 UX-02) and the mockup's prominent buttons cannot both be true while the buttons stay at 10px. This is the single most likely place "layout-only" leaks into a shared primitive. **Change:** reclassify decision-CTA typography as **[deeper]**, not [layout-only]. Decide explicitly: (i) hand-roll share-scoped button styling that does not touch the shared primitive (and budget a11y/focus-trap re-verification), or (ii) accept 10px CTAs, drop the "unmistakable buttons" claim, and anchor the page on the 24px summary total. Add an AC that `src/components/ui/button.tsx` does **not** appear in the T1 diff. See [Amendment A6](#7-plan-amendments).

**ADV-03-impl — "Tuning the compact donut branch" is geometry work, not a className bump, and risks the shared hydration test.** *Verdict: REVISE.* The compact branch's fixed `h-[400px]` exists *because* `aspect-ratio` was unreliable in the old narrow flex-1+sidebar layout ([CostDonutChart.tsx:310-312](../../../src/components/charts/CostDonutChart.tsx#L310) comment, re-read). Re-fitting it for a wide zone touches `COMPACT` dims (lines 66-78). Owner-page isolation is **genuine** (the workshop page hits the FULL branch only — feasibility PRC-6 confirmed), but isolation from `tests/vitest/share/cost-donut-chart-hydration.test.tsx` is **not** — that test renders the compact branch and asserts byte-identical SVG. **Change:** keep tuning strictly inside the `COMPACT` constant block + compact-ternary literals; never touch the shared d3 generators / `roundSvgPath` / `formatSvgNumber`; re-run the hydration test. Pairs with [Amendment A4](#7-plan-amendments).

**ADV-04-impl — S-13 is mis-sized: making the stale e2e *meaningful* needs a recipient-session fixture, not a testid rename; and no test covers the new anonymous state.** *Verdict: PLAN MUST CHANGE. Confirmed.*
[e2e/shared-link-receiver.spec.ts:66](../../../e2e/shared-link-receiver.spec.ts#L66) asserts `[data-testid="sticky-decision-bar"]` is *visible*, but the code emits only `data-share-decision-bar` / `decision-locked-badge` ([SharePageDecision.tsx:220-221, 240](../../../src/components/share/SharePageDecision.tsx#L220)) and returns `null` when the session isn't valid. So a visible bar requires a working recipient session (cookie/HMAC/snapshot-version binding), not a testid. Meanwhile the copy-contract test only mocks `{isValid: true}` ([share-page-decision-bar-copy-contract.test.tsx:19](../../../tests/vitest/share/share-page-decision-bar-copy-contract.test.tsx#L19)) and never exercises the anonymous `isValid:false` path S-04 adds. **Change:** before T1, determine the e2e's real status (red/skipped) and scope the session fixture as the actual S-13 work; add a vitest unit test mounting `SharePageDecision` with `isValid:false` to lock the S-04 state. See [Amendment A7](#7-plan-amendments).

**ADV-05-impl / PRC-2 — Print can render a 2-column grid because print.css only resets max-width/padding, not `display:grid`.** *Verdict: PLAN MUST CHANGE. Confirmed.*
[print.css:16-18](../../../src/app/share/print.css#L16) sets `.share-print-content { max-width:none; padding:0 }` — it does **not** reset `display`. If the new `xl:grid-cols-[minmax(0,1fr)_380px]` lands on the `.share-print-content` element, print inherits a two-column grid with an empty 380px rail track. The unit test only asserts the class exists ([project-publication-page.test.tsx:158], referenced in [09 risks table](09_IMPLEMENTATION_PLAN.md)), so it passes while print is broken. Separately, the `.share-print-estimate + .share-print-estimate` page-break rule ([print.css:34-36](../../../src/app/share/print.css#L34)) is **inert today** — `SharePageTabs` renders only the one active panel, so there's never a second sibling; "one estimate per page" (AC-UX-11, [03:388](03_UX_UI_AUDIT_AND_OVERHAUL.md)) is aspirational, not preserved. **Change:** put the grid on an *inner* wrapper (not on `.share-print-content`), or add `@media print { .share-print-content { display:block !important; grid-template-columns:none !important } }`; add a test that the grid container prints single-column; and drop the one-estimate-per-page claim (or implement a real print-only all-panels stack as separate scope). See [Amendment A8](#7-plan-amendments).

**ADV-06-impl / ADV-08-impl — "Instant rollback" leaks if non-UI changes co-bundle; D1 pixel-exact pre-approval will likely be re-litigated.** *Verdict: REVISE.*
- The enforcer edit (ADV-01-impl) and S-36 (CSP/HSTS/noindex, which [09 §5](09_IMPLEMENTATION_PLAN.md) explicitly folds into T1 component tests) are non-UI changes. If either rides in the T1 deploy, the "pure-UI revert" guarantee ([01 §8, 09 line 74](01_STRATEGY.md)) breaks. **Change:** state explicitly that the enforcer edit and S-36 ship on their **own** deploys (or land before T1 as prerequisites), never co-bundled with the layout commit.
- D1 is framed as a pixel-exact sign-off (22/24/26/15/13-14/11px) from a table, but the runtime ink is `#3D3D3D` not spec `#292929` (so a token-accurate mockup won't match production contrast), and a type scale is the canonical see-it-to-judge-it call. **Change:** split D1 — get owner sign-off on the *principle* (a `/share` exception exists, ~2× current scale) before build; defer exact px to a built prototype reviewed at P-UI-2 against the P-UI-0 baseline.

**ADV-07-impl — `bun run validate` re-runs the whole single-worker DOM suite every loop.** *Verdict: HOLDS (working-mode note only).* `test:dom` is an unfiltered `vitest run --maxWorkers=1`. Across 4 churn-heavy phases this is a real slow-feedback driver. **Add a working-mode note:** during T1 iteration run only `tests/vitest/project-publication-*` + `tests/vitest/share/*` with a path filter; reserve full `validate` for the phase exit gate.

---

## 3. Prior-art grounding (evidence-based verdict on D1 + the zoning model)

Three segments were reviewed. Confidence: construction-tools **high**, data-dense-docs **high**, SaaS-portals **medium**. Prior art was *not* thin; it converges strongly.

**Full-browser zoning + sticky right-rail decision: SUPPORTED (table-stakes, not an experiment).**
- Jobber, Buildxact, and Proposify independently place total + approve/decline on the **right side** of the quote view (right panel or sticky footer total). Three unrelated construction/proposal tools converge without coordination.
- Stripe checkout's canonical desktop pattern is a right-column order summary visible alongside the action; e-commerce eye-tracking is cited by the prior-art segment as showing the always-visible CTA gets more fixations, with a "48% of top-200 sites use it" figure *(prior-art segment claim — not independently verified by the synthesizer; treat the specific percentage and the eye-tracking fixation claim as unsourced)*. SEB's financial design system has a *named* "sticky summary bar" for exactly this.
- Qwilr (the most web-native proposal tool) uses full-browser pages with a centered content zone and a sticky nav exposing total + Accept; PandaDoc uses a centered ~850px document and is described as "more traditional." **Archestimator's current 960px centered column is the outlier; the plan's fluid ladder + rail is the well-supported direction.**
- NN/g is cited (via the prior-art segment) for the guidance that wide viewports are best used as a *supplementary column* (main + sidebar), not a single expanded column — which directly supports the work-zone + rail split over ADV-02's wide-single-column. The attached "77% of sessions are above 1100px" figure is a *prior-art segment claim — not independently verified by the synthesizer*; the directional guidance, not the exact percentage, is what carries weight here.

**Net on the zoning model (D2):** **GO, directionally unchanged.** The rail is not removed. But prior art *also* validates two of the revisions above: (a) the reviewed proposal tools **collapse the rail to a sticky bottom CTA bar on mobile** — the plan does not specify this. The supporting "46% of proposals open on phones" figure and the "every tool does this" universality are *prior-art segment claims — not independently verified by the synthesizer*; the pattern is well-attested but the precise share and the "every"-quantifier should not read as measured fact. (b) NN/g and GitLab Pajamas warn against artificially wide tables, reinforcing that the table must get *real* width (ADV-UX-01's 1366 regression matters).

**Client Portal type scale (D1): the bump is SUPPORTED unanimously; the *mechanism* is the problem; prior art pushes the floor UP not down.**
- Current 10px body / 8-9px labels is below every web-native and WCAG-AA reference. The bump survives unanimously — Jobber/Buildxact/Proposify/Qwilr are all web-native, not shrunken PDFs.
- **But the segments split on the target:** construction-tools say 13-14px is directionally fine; SaaS-portals and data-dense-docs (WCAG AA consensus 16px body, 12px soft floor) say 13-14px is a **floor, not a target**, and **11px labels are below the soft floor — raise to 12px minimum**. Reasonable synthesis: 13-14px is acceptable for the *data table* (data context, not extended prose), but **prose sections (header, descriptions) should target 15-16px**, and **labels should be 12px not 11px**. Also: **prose cap should tighten from ~680px to ~560-600px** (≈70ch at 14px; Baymard/USWDS/UXPin all cite 50-75 CPL — 680px at 13-14px is ~90-100 CPL, too wide). Tables correctly escape the prose cap.

**Net on D1:** **Approve the scale (direction validated by competitive practice and WCAG), but D1 changes *nature*: it is "approve the principle + own the enforcer change," not "approve DESIGN.md prose."** Raise the label floor to 12px and the prose body toward 15-16px; tighten the prose cap to ~560-600px.

**Highest-confidence gap prior art surfaces that the plan only defers:** the reviewed peer tools surface firm logo/name/contact + a validity/expiry period *before the client decides* (the "every peer tool" universality is a *prior-art segment characterization — not independently verified by the synthesizer across the full market*, though it held across each tool the segment examined). The plan correctly notes `snapshot.project` lacks preparer/firm identity and valid-until (V11, [types.ts:92-104]) and defers them ([01 §9, 09 D3](09_IMPLEMENTATION_PLAN.md)). Prior art says this is the **most visible trust gap vs. peers** — flag it as a near-term follow-on (still a deferred snapshot-shape change), not a low-priority nice-to-have.

---

## 4. Integration feasibility verdict

**Overall: FEASIBLE-WITH-CHANGES. The core composition claim HOLDS and was independently confirmed; the "layout-only" qualifier needs tightening on five specific points.**

**What's confirmed safe (the structural foundation is real):**
- `SharePageDecision` and `SharePageComments` are each a single self-contained `<section>` taking only a `token` prop, sharing no refs/context/state with `SharePageTabs`, gating purely on the client-side `useSharedLinkSession()` cookie hook ([SharePageDecision.tsx:236-242](../../../src/components/share/SharePageDecision.tsx#L236), [SharePageComments.tsx:301-306](../../../src/components/share/SharePageComments.tsx#L301)). They are **re-parentable into any grid cell with zero logic change** (feasibility R1). This is the load-bearing premise of the whole overhaul, and it holds.
- The scroll-to-node tree nav, sessionStorage active-sheet persistence, and roving tablist are all internal to `SharePageTabs` and unaffected by the rail move (R5). The only change there is the `lg:`→`md:` two-pane gate — a className swap that preserves `contentRef` ([SharePageTabs.tsx:511](../../../src/components/share/SharePageTabs.tsx#L511)).
- `ShareFloatingTreeNav` is **confirmed dead** (zero importers outside its own file; corroborated by the 2026-05-29 memory note). Safe delete (S-09).
- `CostDonutChart` owner-page isolation is genuine: the workshop page re-exports and hits the FULL branch only. Touch only the `compact` branch.

**The wiring plan (how to compose the rail/work-zone with existing machinery):**
1. **Page shell** ([page.tsx:71](../../../src/app/share/[token]/page.tsx#L71)): keep `share-print-content` on the outer wrapper but make it a plain block carrying the fluid width ladder; put the `xl` grid on an **inner** wrapper (this avoids PRC-2 print breakage). Left cell = ProposalHeader + Hero + SharePageTabs (work-zone); right cell = new Summary card + Decision + Comments (`xl:sticky xl:top-6 self-start`, **no** `overflow-hidden`/`transform`/`contain` so the `fixed inset-0 z-50` confirm modal isn't clipped — R7). Below xl: single column, order Summary → Decision → estimate → Comments.
2. **Decision/Comments** are pure re-parents (no prop change). Add `data-testid="sticky-decision-bar"` to the decision section (both decided and undecided branches) to satisfy the e2e and AC-UX-06. Swap hardcoded `#FFFDF8` → `bg-proposalPaper`.
3. **Sticky budget** (R8/ADV-UX-07): make only Summary+Decision sticky; let Comments flow; keep the existing `max-h-[420px]` internal scroll.
4. **Three tablists** (R2/R6): only the Tree|Grid view-mode row becomes the segmented control (move to the heading row, change off `role="tab"`); keep the Estimates tablist and the sub-sheet tablist as-is.
5. **Donut** stays in the work-zone; cap its width or re-fit the compact block (A4).
6. **Banner** (PRC-7): swap the two `max-w-[960px]` literals in [SharePageSessionBanner.tsx:28,54](../../../src/components/share/SharePageSessionBanner.tsx#L28) to the shared container token so the full-bleed bar's inner content aligns with the wider body (required to satisfy AC-UX-02's "no remaining 960px literals").

**Tests that will churn (the plan implies "tests unaffected" — they are not):**
- `project-publication-page.test.tsx:603-636` — global `getAllByRole('tab')` ordering breaks when the view toggle moves above the tablist. Scope it / change the toggle role.
- `project-publication-page.test.tsx:441` — the tab-font assertion accepts ≤11px; a 13px bump (AC-UX-03) **fails** it. Update the regex.
- `e2e/shared-link-receiver.spec.ts:66` — needs the new `sticky-decision-bar` testid **and** a recipient-session fixture (A7).
- `cost-donut-chart-hydration.test.tsx` — passes only if compact tuning stays out of the shared d3/rounding code.
- `project-publication-page.test.tsx:158` — keep `.share-print-content` on the rendered top wrapper or it breaks.

**Two latent assumptions the "layout-only" framing glosses (neither is a blocker, both need a deliberate call):**
- The two-pane tree's internal `overflow-auto` is currently a **no-op** (no bounded-height ancestor), so the "sticky/independently-scrolling tree nav" the plan implies does **not** come for free — it needs an explicit bounded height + `min-h-0` (PRC-3). Decide: inline-growing tree (safe, no change) vs sticky-scrolling nav (needs the height constraint). Do not promise the latter for free.
- The tree's mount-time mobile-mode flip (`useState(false)` → `useEffect`) is the biggest CLS source on mobile and is **not** fixed by the wider container (PRC-5). Flag AC-UX-15 (CLS<0.1) as not-yet-met under current tree behavior rather than asserting the overhaul achieves it.

---

## 5. Effort sizing + critical path

**T1 is the project critical path** (ships first and alone). Internal order is forced: **P-UI-0 → P-UI-1 → {P-UI-2, P-UI-3}**. Rollup effort **L** (4 phases, one deploy/rollback unit).

| Phase | Effort | Gating dependency |
|---|---|---|
| **P-UI-0** (safety net: S-12 visual baseline, S-13 e2e) **+ NEW: enforcer edit prerequisite** | S → **M** once the enforcer + session-fixture work is counted | Hard gate; opens the whole T1 path. **Re-sized up** by ADV-01-impl (enforcer) + ADV-04-impl (session fixture). |
| **P-UI-1** (container + zoning) | M | Gated by P-UI-0 + D5/D6 (low-stakes breakpoint tunes). Highest-consequence layout step. |
| **P-UI-2** (typography + trust + DS hygiene) | M | **Blocked on D1** (the single hardest external gate) + the enforcer change. |
| **P-UI-3** (IA, states, mobile, dead code) | M | S-06 mobile re-layout is the largest single piece; S-04 needs security copy review; S-09 is a free parallel delete. |

**T2 (perf)** rolls up **L**, off the critical path, behind T1. P-Perf-0 gates everything; **S-30 (version-keyed snapshot cache) is the only Med-risk correctness item in T1–T3** — a missed invalidation hook across the 4 mutation paths serves revoked/stale confidential data. If schedule compresses, ship P-Perf-1 alone and defer P-Perf-2 to remove this risk.

**T3 (security)** rolls up **M–L**, most parallelizable; P-Sec-1 anytime; S-34 (token-off-URL) is the largest single item. S-36's CSP bundle test couples softly to T1 — but must ship on its own deploy (ADV-06-impl).

**T4 (DB)** rolls up **XL**, entirely off the schedule until a DB write channel opens (no Docker; hosted SQL denied — [memory: archestimator-db-channel-boundaries]). Design-ready, execution-deferred.

**Biggest schedule risks:** (1) **D1 on the critical path** — gates P-UI-2 + the headline value; force it (and the now-larger enforcer change) to resolve at/before P-UI-1 entry; D1=No has a defined whitespace-only fallback. (2) **Skipping/under-investing P-UI-0** — no VR net exists; silent shifts in P-UI-1/2 ship undetected. (3) **The token-leak trap** in S-10/S-03 (achieving the scale via `globals.css` turns LOW-blast into app-wide HIGH-blast) — the `detect_changes` gate proving `ProjectChartsPage` doesn't appear is the guard and must actually run on the real diff. (4) **P-Perf-0 omission cascades** — without it, T2 wins are unprovable and T4's S-50 retention window has no data to size against.

---

## 6. Visual mockup

**Path:** [`assets/proposed-layout-mockup.html`](assets/proposed-layout-mockup.html) (verified present, 29.7 KB, self-contained fragment, no network assets, transparent background).

**What it demonstrates:** the proposed full-browser layout from [03 §4](03_UX_UI_AUDIT_AND_OVERHAUL.md) in three stacked sections: (1) **Desktop xl/2xl** — fluid container (`max-w 1440→1760`) holding the `minmax(0,1fr) 380px` grid: a wide work-zone (26px H1, 680px-capped prose, 16:6 hero, sheet tablist + 240px tree nav + a full-width 5-column BOQ table in pesos) beside a sticky 380px rail (24px tabular total + sheets/items/currency/prepared-for/prepared-on, a proposalPaper Decision card, a Discussion thread). (2) **Before/after** schematics contrasting today's ~34%-wide centered strip + ~480px empty gutters against the proposed split. (3) **Mobile 375px** — single column, total up top, hero, stacked per-row cards, 44px stacked decision buttons.

**Deviations the mockup itself flags (honest, do not over-read it):**
- **Type-scale key is superseded by §3.** The mockup's scale key reads "Labels **11px min**" ([mockup line 274](assets/proposed-layout-mockup.html)), but §3's prior-art conclusion **supersedes** it: raise the body toward **15-16px** for prose sections and lift the **label floor to 12px** (11px is below the soft floor). An owner reading the mockup standalone should treat §3's numbers — not the mockup key — as authoritative.
- Width ladder is shown as an annotation, not live breakpoint stepping (a static fragment can't demo 760/1100/1440/1760).
- Tree nav drawn at 240px (spec keeps the current 260px) — thumbnail-fit only.
- **Donut omitted** — the exact gap ADV-UX-02/A4 says must be decided. The mockup does not demonstrate donut placement.
- **The decision buttons in the mockup are drawn larger than the shipped 10px** — they do not reflect the `!text-[10px]` shared-primitive constraint (ADV-02-impl/A6). The mockup shows the *intended* look, which the current Button primitive cannot produce without the [deeper] change.
- "Valid through" shown in the footer though valid-until is **not** in the snapshot today (deferred snapshot-shape change) — illustrative only.
- Anonymous-visitor state (UX-03/AC-UX-07) not drawn — recipient happy-path only.

**Net:** useful for the owner to react to direction (and to make the D1 *principle* call), but **not** a substitute for the built prototype D1's pixel values need (ADV-08-impl), and it visually overstates two things the code constrains (button size, donut placement). Treat it as a direction artifact, not a spec.

---

## 7. Plan amendments

The original 11 docs do **not** need a rewrite. The architecture is sound and prior-art-validated. But **eight precise amendments** are required before T1 can be executed as "LOW-blast / layout-only / instant-rollback" honestly. Listed by severity.

| # | Doc(s) | Exact change | Severity |
|---|---|---|---|
| **A5** | 09 (P-UI-0, P-UI-2), 03 (AC-UX-13) | Add a P-UI-0 prerequisite: extend `scripts/enforce-app-design-system.mjs` with a `/share` allowlist covering the 12px cap, the uppercase>9px rule, AND the secondary-tone>10px rule. Ship it on its **own** deploy before the layout commit. Add a guard test that the enforcer still fails on a >12px violation outside `/share`. Reframe D1 as "approve principle + own the enforcer change," not "register DESIGN.md prose." | **Critical** |
| **A6** | 03 (§5 SharePageDecision row, AC-UX-02 set), 09 (P-UI-3) | Reclassify decision-CTA typography as **[deeper]**, not [layout-only]: the buttons are the shared `Button` primitive pinned at `!text-[10px]` ([button.tsx:55](../../../src/components/ui/button.tsx#L55), 90 importers, forbidden to edit). Either hand-roll share-scoped button styling (budget a11y/focus-trap re-verification) or accept 10px CTAs and anchor on the 24px total. Add an AC that `src/components/ui/button.tsx` is absent from the T1 diff. | **High** |
| **A2** | 03 (§4.5, AC-UX-01), 09 (P-UI-1 S-02, D5) | The rail regresses the Tree-view table at 1366/1440 (260px nav + 380px rail leaves ~620px < today's ~680px). Defer the grid split to `2xl=1536` (keep 1280–1535 wide-single-column) OR collapse the 260px tree nav into a drawer when the rail is present. Add an AC measuring work-zone table width at 1366/1440 (require ≥ ~680px), not only ≥1536px. | **High** |
| **A3** | 03 (§4.6, AC-UX-06), 09 (P-UI-2 S-05) | Make only the Summary+Decision sub-block sticky; let Comments flow non-sticky below (or cap it). Add an AC that the sticky sub-block height < 768px (so AC-UX-06 is achievable on a 1366×768 laptop). Specify the rail uses `position:sticky`/`top-6`/`self-start` only — no `overflow-hidden`/`transform`/`contain`. | **High** |
| **A8** | 03 (AC-UX-11), 09 (P-UI-1, risks table) | Put the xl grid on an **inner** wrapper (not on `.share-print-content`), OR add `@media print { .share-print-content { display:block !important; grid-template-columns:none !important } }`. Add a test asserting single-column print of the grid container. Drop the "one estimate per page" claim (the page-break rule is inert — only one panel is ever in the DOM) or implement a real print-only all-panels stack as separate scope. | **Medium** |
| **A7** | 09 (P-UI-0 S-13), 03/06 (S-04) | Reclassify S-13: the stale e2e needs a recipient-session fixture (cookie/HMAC/snapshot-version binding), not a testid rename — `SharePageDecision` returns `null` when not valid. Scope the fixture. Add a vitest unit test mounting `SharePageDecision` with `isValid:false` to lock the new anonymous (S-04) state, which the existing copy-contract test (mocks `isValid:true` only) cannot. | **Medium** |
| **A4** | 03 (§5 CostDonutChart row, §4.7 wireframe) | Re-classify the donut from "none/verify" to "layout-only: constrain compact container width." Decide+draw placement (cap `mx-auto max-w-[560px]` left-aligned, or move beside the Summary) and add it to the wireframe. Keep tuning inside the `COMPACT` constant block only; never the shared d3/rounding code; re-run `cost-donut-chart-hydration.test.tsx`. | **Medium** |
| **A1** | 01 (§7, §10), 09 (P-Perf-0) | Demote the response-rate north-star to a post-launch hypothesis (unfalsifiable at n=11; product NO-GO). Make T1 success the AC/qualitative gates. Reframe the investment as "launch-readiness polish of the outbound surface." Either move baseline capture out of T2 into a P-UI-0 prerequisite or drop the provable-impact claim (recommend drop). Replace the "premium portal" metaphor with "clear, trustworthy, legible proposal that prints well." | **Medium** |

**Lower-severity refinements (fold in, no severity row needed):** raise the label floor to 12px and prose body toward 15-16px (prior art); tighten the prose cap from ~680px to ~560-600px; specify the **mobile sticky-bottom-bar** rail fallback (every peer does this; 46% mobile opens); add the working-mode test-filter note (ADV-07-impl); ship S-36 (CSP) on its own deploy not co-bundled with T1 (ADV-06-impl); make the Client Portal scale a named governed tier and fix the ink drift in the same pass (ADV-UX-05); flag firm-identity/valid-until as a near-term trust follow-on rather than a low-priority defer (prior-art highest-confidence gap).

---

## 8. Honest re-score: does the 2nd pass raise or confirm confidence?

**It confirms confidence in the *direction* and *strategy*, and it lowers confidence in the *as-written implementation readiness* of T1 — then provides the exact patch that restores it.**

**Now de-risked (was uncertain, now evidence-grounded):**
- The full-browser + sticky-rail zoning model is no longer a single-author bet — three independent prior-art segments converge on it as table-stakes. (Was: asserted. Now: validated.)
- The type bump is unanimously supported by web-native + WCAG references. The direction of D1 is settled.
- The core composition claim (Decision/Comments are self-contained, single-prop, re-parentable with zero logic change) was **independently confirmed in code** — the LOW *code* blast-radius is real.
- The CostDonutChart owner-page isolation is genuine.

**Still requires execution-time verification (the evidence does NOT let me claim T1 will be effective with certainty):**
- **Live pixels on the real page still need an owner-provided token.** No browser pass was run against `/share/[token]` in either pass; D1's exact px values, AC-UX-14/15/16 (donut legibility @375, CLS, LCP), and the "premium" qualitative gate all need rendered pixels. The mockup is a fragment, not the live page, and it overstates button size + omits the donut.
- The five "leak" points must be pinned before "layout-only/instant-rollback" is true: the **enforcer rewrite** (A5), the **decision-CTA primitive constraint** (A6), the **donut placement** (A4), the **1366/1440 rail math** (A2), and the **rail-overflow guard** (A3). Until pinned, the first-pass claim that "a competent engineer can execute without further planning decisions" ([11 §1 Impl-Readiness](11_SCORING_AND_INTEGRITY.md)) is **not yet true** — these are planning decisions, not execution details.
- AC-UX-06 and AC-UX-11 are currently **asserted-but-not-achievable as composed** (sticky height vs 768px; print grid). They become achievable with A3/A8.

**Efficiency is the bigger honest hit than effectiveness.** The plan's own 3×-time sink list (type scale, donut), plus the unfiltered single-worker `test:dom` across 4 churn-heavy phases, plus the under-sized S-13 and the unscoped enforcer edit, mean P-UI-0→P-UI-2 will take meaningfully longer than the first pass implies. None are fatal; all are addressable.

**Bottom line:** once the eight amendments are folded in (especially the four Critical/High: A5, A6, A2, A3), readiness returns to roughly 90%+. The architecture survives; what changes is the rail trigger breakpoint, the CTA-type honesty, the D1 mechanism, the print/rail-overflow guards, and the success definition. **No P0 reversal:** full-browser is not reversed, the rail is not removed, the type bump is not shrunk.

---

## 9. Self-score (this 2nd-pass document, against the [11 §1](11_SCORING_AND_INTEGRITY.md) rubric)

| Dimension | Score | Honest justification |
|---|---|---|
| **Strategy** | **95%** | Adjudicates every strong challenge with a clear hold/revise/change verdict and grounds the zoning + D1 calls in three prior-art segments. Short of 100% because the opportunity-cost question ADV-01 raises (overhaul hours vs the NO-GO launch gates) is acknowledged but not resolved — that is genuinely an owner call above this doc's pay grade. |
| **Implementation Readiness** | **90%** | The eight amendments are precise (doc + exact change + severity) and the wiring plan is concrete and code-cited. Short of 100% because A6 (hand-roll share buttons vs accept 10px) and A2 (defer-split vs drawer-nav) each leave an owner/engineer choice open, and the live-pixel verification genuinely cannot be discharged here. |
| **Quality** | **97%** | Every load-bearing claim is re-verified with a file:line I read this pass (enforcer lines 6-8 + landing allowlist lines 10-16/prefix line 17; button.tsx:55 + 90 importers; donut 520×400/h-[400px]; print.css:16-18,34-36; e2e:66 vs decision testids; the three tablists; AC-UX-01/06/11 framing). Inferences and targets are labelled. |
| **Truth & Integrity** | **98%** | States plainly where the first pass's 100% self-score is overstated (Impl-Readiness for T1) and where it is defensible (Strategy/Quality as a planning artifact). No metric relabelled as fact; the n=11 unfalsifiability and the sequencing contradiction are named, not papered over; the mockup's own overstatements are called out. |

> This document is a planning/synthesis artifact. It changed no code and no original doc. It records what must change before execution and is itself honest about the boundary of what was checked (no live render, no owner token, no browser pass).

---

*Inputs: 3-lens red-team, 3-segment prior-art, 2-area feasibility, sizing, mockup, completeness critic, verifier. Upstream docs: [01](01_STRATEGY.md), [03](03_UX_UI_AUDIT_AND_OVERHAUL.md), [09](09_IMPLEMENTATION_PLAN.md), [11](11_SCORING_AND_INTEGRITY.md). Mockup: [assets/proposed-layout-mockup.html](assets/proposed-layout-mockup.html).*
