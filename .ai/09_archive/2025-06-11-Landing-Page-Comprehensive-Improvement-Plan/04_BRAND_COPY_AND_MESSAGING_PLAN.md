# 04 — Brand, Copy & Messaging Plan

Status: complete. Canonical sources: `.ai/06_specs/brand/brand-foundation.md`, `brand-voice.md`,
`brand-narrative.md`, `landing-brand-narrative-map.md`, `.ai/06_specs/archestimator-product-thesis.md`,
plus the conversion research in `Landing-Page-Research-Report.md`.

Owner constraint honored throughout: **"a lot of the text and copy in our existing landing page is
already good enough"** — this plan keeps the existing copy wherever it already serves, and marks
every slot as KEEP / REFINE / REPLACE / REMOVE with rationale. Nothing here invents customers,
metrics, or testimonials (brand guardrail).

---

## 1. Positioning sentence (the one-sentence truth test)

Working positioning (synthesized from brand-foundation + thesis + research report, construction
proof-case first):

> **Archestimator is a structured workspace where construction and quote-heavy teams build
> itemized estimates from reusable components and turn them into proposal-ready documents clients
> can review and approve — without losing assumptions, versions, or the logic behind the number.**

Every landing section must be derivable from this sentence. The research report's variant
("Turn drawings into defensible estimates…") leans on drawing/takeoff capability the product
does **not** have — do not adopt drawing-import claims (brand-foundation: "Not a design/BIM takeoff
platform").

## 2. Message hierarchy (page-level)

1. **Hero:** outcome + category + who it's for + product proof + one action.
2. **Diagram band:** the method in one glance (workflow → estimate → proposal → decision).
3. **Problem naming:** the scattered-workflow pain, respectfully ("the estimator is not the problem").
4. **Capability proof, one job per section:** workspace structure → reusable components →
   versions/revisions → proposal handoff. Live features full-voice; planned features explicitly
   "on the roadmap".
5. **Honest beta terms:** what beta means, what it costs (nothing), what happens after.
6. **Final CTA:** repeat the hero action verbatim.

## 3. Copy decision matrix — every current text slot

### Header / nav
| Slot | Current | Verdict | Plan |
| --- | --- | --- | --- |
| Nav items | Platform / Specialties / Company | REPLACE | "How it works · Product · Beta & pricing · Contact" — anchor links that match the real page until subpages are real |
| Header CTA | "Workspace →" | KEEP | On-voice ("Open the workspace" family), says what happens |

### Hero
| Slot | Current (variant A) | Verdict | Plan |
| --- | --- | --- | --- |
| Eyebrow | "Close Projects Faster." | REPLACE | Carry the category here: "Estimating & proposal workspace for construction teams" — quiet, factual, kills the what-is-this ambiguity without touching the H1 |
| H1 | "The fastest path from proposal to approval." | KEEP | Owner likes it; it is outcome-true and short. Works once the eyebrow carries category |
| Support | "Stop wasting time on messy spreadsheets and scattered feedback. archestimator gives you a single, centralized workflow to build pricing, manage revisions, and get faster approvals." | REFINE | Keep structure; swap "single, centralized workflow" (generic SaaS) for brand vocabulary: "one connected workspace to build pricing, manage revisions, and get faster approvals." Keep the rough-notation underline on "archestimator" |
| Primary CTA | "Start Winning" | REPLACE | Signed-out: **"Request beta access"** (it really goes to /contact). Signed-in: **"Open the workspace"**. Both from brand-voice CTA list / honest-action rule |
| Secondary CTA | (none) | ADD | **"See how it works"** → `#method` (quiet link style) |
| Badge | "Now On Closed Beta" | KEEP | Honest, useful; restyle for legibility |
| A/B variant B set | "Win More Bids." / "Estimate with Precision…" | KEEP as experiment | Re-run the experiment after redesign; variant copy stays in the experiment board |

### Rough-diagram band
| Slot | Current | Verdict | Plan |
| --- | --- | --- | --- |
| Right-column prose | "Build the estimate and turn it into a clear cost proposal your client can review, comment on, and approve." + "Keep the pricing, scope, feedback, revisions, and final decision in one place, without stitching together spreadsheets, PDFs, email threads, and scattered comments by hand." | KEEP | This is the best copy on the page — exactly on-voice. Promote it to the section's lead position |
| Diagram node labels | Project Workflow / Component Library / Estimating Experience / Estimate / Proposal / Decide / Approved | REFINE | Fix wrapping bug; shorten circle labels ("Component Library", "Estimating") so they fit whole-word |
| Section heading | (none — diagram floats) | ADD | From brand spine: **"Quote in the shape of the offer."** |

### Terracotta section (rebuilt per 06 §4)
| Slot | Current | Verdict | Plan |
| --- | --- | --- | --- |
| Eyebrow | "Launch feature video" | REMOVE | No video exists; if/when one ships: "Product walkthrough" |
| H2 | "See the complete archestimator workflow" | KEEP | Honest and clear (with rough underline) |
| Support | "A single launch-ready walkthrough for estimating, reusable components, proposal handoff, review, and client decision records." | REFINE | Drop "launch-ready" (internal jargon): "One walkthrough: estimating, reusable components, proposal handoff, review, and client decision records." |
| Feature card 1 | "Project-Shaped Workflow / Structure your proposal the way you think about the work / Organize costs around the real shape of the engagement…" | KEEP | Strong, on-voice |
| Feature card 2 | "Reusable Component Library / Build it once. Use it everywhere. / Save any component, materials, services, labor, packages…" | KEEP | Strong |
| Feature card 3 | "Proposal Handoff / From costing to client-ready in one flow / Carry your line items, totals, exclusions, and assumptions straight into a polished proposal output…" | KEEP, verify | Confirm export/share maturity before launch (01 §11); soften "polished proposal output" to "review-ready proposal" if export is still maturing |
| Feature card 4 | "Activity History / Every revision. Every decision. Always on record." | REFINE | If revision UI is still "Planned": reframe as "Revision history — in progress: every change traceable as the quote matures" or move to roadmap framing (02 §A3) |
| Testimonials (3 fake quotes) | — | **REMOVE** | Brand guardrail. Replace with the honest-proof strip (06 §5): real product facts, founder thesis line, beta-program facts |
| Logo marquee scaffold | empty | REMOVE | Until real |

### `#method` section
| Slot | Current | Verdict | Plan |
| --- | --- | --- | --- |
| Eyebrow | "Built around construction estimate patterns" | KEEP | |
| H2 | "Workflows designed for every estimating specialty." | KEEP | |
| Support | "Every team names scope differently. Archestimator gives the quote enough structure to carry rooms, assemblies, supplier context, allowances, and revisions without flattening the work into one brittle spreadsheet." | KEEP | Excellent — most on-voice paragraph on the page |

### `#product` showcase
| Slot | Current | Verdict | Plan |
| --- | --- | --- | --- |
| Eyebrow | "Platform method" | REPLACE | "Inside the workspace" |
| H2 | "The Archestimator estimate residency" | REPLACE | Borrowed amigo concept. Use brand spine: **"A structured workspace for the whole quote."** or "The estimate, the library, and the proposal in one place." |
| Support | "A structured workspace for training your own estimate logic: the project tree, reusable library, revision memory, and proposal path all stay visible as the quote matures." | REFINE | Drop "training your own estimate logic" (opaque); "A structured workspace for your estimate logic: …" |
| Tab labels + status | Estimate Workspace (MVP preview) / Component Library (MVP preview) / Revision Intelligence (Planned preview) / Proposal Comparisons (Planned preview) | REFINE | Keep honesty; rename "Revision Intelligence" → "Revision History (planned)", "Proposal Comparisons" → "Proposal Comparison (planned)"; add icon+text to badges (a11y F2) |

### `#pricing`
| Slot | Current | Verdict | Plan |
| --- | --- | --- | --- |
| Eyebrow | "Closed beta partnership" | KEEP | |
| H2 | "A partnership focused on quote-to-proposal value." | REPLACE | Abstract. Use: **"Free during the closed beta. Honest pricing after."** |
| Support | "Request access to the closed beta for structured quote sheets, reusable catalog logic, and connected estimate organization. Payment, checkout, and public plans are deferred until after beta." | KEEP | Honest and specific |
| Card | "0 / No payment during beta / Pricing decisions come after beta learning, workflow fit, and owner review." | REFINE | Keep facts; restyle "0" as set-piece number (05 §numbers); change third line to buyer-facing: "Public pricing follows the beta — shaped with the teams using it." |
| CTA | "Request access" | KEEP | |

### Final CTA + footer
| Slot | Current | Verdict | Plan |
| --- | --- | --- | --- |
| Eyebrow | "Start quoting" | KEEP | |
| H2 | "Reliable estimating infrastructure for construction proposals." | REPLACE | Infrastructure-speak. Mirror the hero: **"The fastest path from proposal to approval."** (research: final CTA mirrors hero action) or brand spine: "A clearer way to create quotes, estimates, and proposal-ready documents." |
| CTA | "Open workspace" | REFINE | "Open the workspace" (brand-voice exact phrasing); signed-out users should see "Request beta access" here too — do not deep-link them into a login wall |
| Footer | nav groups, logo | KEEP | Add "Cookie settings" link here (02 §D7) |

## 4. New copy blocks to add (exact text, ready to use)

### Problem section (new, between diagram band and capability sections — narrative-map §4)
- Eyebrow: "The old way"
- H2: **"The hard part is not the total. It is keeping the logic behind the total organized as the offer changes."**
- Body: "Copied spreadsheets, tabs with unclear scope, assumptions buried outside the sheet, proposal documents drifting away from the estimate. Most teams do not realize how much time they lose to re-finding, rechecking, rebuilding, and reconnecting quote work — because the mess feels normal. The problem is not the estimator. The problem is the workflow."
- Sketch annotation (rough-notation): circle "feels normal".

### Honest proof strip (replaces fake testimonials — see 06 §5)
- Heading: **"Built in the open, with the teams using it."**
- Facts (only verifiable, update at publish time): "In closed beta with working estimate
  workspace and component library" · "Multiple estimate sheets per project for options and
  revisions" · "Proposal share pages clients can open in the browser" · "No payment during beta".
- Founder line (1–2 sentences, owner to approve): "Archestimator exists because skilled estimators
  lose too much time reconnecting work that should have stayed connected. We are building the
  clearer way, with the teams who quote for a living."

### Beta FAQ (new, 4 questions, in/near `#pricing` — research report module M)
1. **"What does the closed beta include?"** — "The estimate workspace, the reusable component
   library, multiple estimate sheets per project, and proposal share pages. Revision history and
   proposal comparison are in active development."
2. **"What does it cost?"** — "Nothing during beta. Public pricing comes after, shaped with beta
   teams. No credit card, no surprise conversion."
3. **"What happens to my data after beta?"** — "Your projects, estimates, and library remain yours.
   We will give clear notice and migration paths before any plan changes."
4. **"How do I get access?"** — "Request access and tell us how your team quotes. We onboard teams
   in small batches so the first estimate gets real support."

## 5. Voice rules applied to this page (from brand-voice.md, enforced)

- Banned on this page: "all-in-one platform", "revolutionary", "world-class", "AI-powered" as a
  lead, "seamless", "streamline/unlock/supercharge", fake "Trusted by", em dashes in display copy,
  shame-the-spreadsheet-user framing.
- Sentence patterns to reuse: "Create ___ faster without losing ___." · "Keep ___, ___, and ___
  connected." · "Less ___. More ___." · "The problem is not ___. The problem is ___."
- Buttons: verb + object, always state the real next step.
- Numbers: only product-truth numbers (totals in demo artifacts, beta facts). No adoption claims,
  no invented ROI.

## 6. SEO metadata (decide the category phrase once)

Decision needed from owner (flagged in 02 §G4): market story for currency/region (₱ mockups).
Recommended category phrase: **"construction estimating and proposal software"** (keeps the broader
quote-team narrative for later without claiming takeoff/BIM).

| Page | Title | Meta description |
| --- | --- | --- |
| Home | `Archestimator — Construction Estimating & Proposal Software` | `Build itemized estimates from reusable components and turn them into proposal-ready documents clients can approve. In closed beta — free during beta.` |
| `/contact` | `Request Beta Access — Archestimator` | `Tell us how your team quotes. We onboard closed-beta teams in small batches with real support for your first estimate.` |
| `/pricing` | `Pricing — Free During Closed Beta — Archestimator` | `No payment during the closed beta. Public pricing follows, shaped with the teams using it.` |
| `/features` | `Inside the Workspace — Archestimator` | `Project-shaped estimates, a reusable component library, revisions, and proposal handoff — one connected workspace.` |

H1 stays unique per page; title and H1 share the category phrase family (research report §SEO).
