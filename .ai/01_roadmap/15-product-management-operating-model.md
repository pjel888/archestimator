# Product Management Operating Model

> Last updated: 2026-05-30

Archestimator's operating model for product management. Defines how the product is steered, how feedback becomes features, and how Philip makes decisions without getting buried in spreadsheets himself. This document is the PM source of truth — canonical over informal notes, Slack threads, or Notion pages.

---

## 1. Product Mission

Help contractors, estimators, and their teams create structured, shareable construction estimates and proposals — starting from a spreadsheet but ending with client confidence.

---

## 2. Product Principles

These principles govern every product decision. When in doubt, the principle wins.

**Users reach first value without explanation.**
If a new user can't get to a useful estimate within minutes of signing up, the product has failed. No onboarding tours, no manual reading, no "getting started" guides. The interface teaches as you go. Time-to-value is the primary onboarding metric, and anything that lengthens it is debt.

**Spreadsheet-familiar, not spreadsheet-bound.**
Users know how spreadsheets work: rows, columns, formulas, totals. Archestimator starts from that mental model but progressively reveals structure that spreadsheets can't provide — line-item libraries, version history, client-facing views, and collaborative editing. Don't break the spreadsheet metaphor; transcend it.

**Estimates are collaborative, not solitary.**
Estimating is rarely a one-person job. The product must support multiple estimators working in the same estimate, inviting outside review, and seeing who changed what. Solo mode is table stakes; collaboration is the product.

**Client-facing outputs build trust, not confusion.**
Every estimate has two audiences: the team building it and the client receiving it. The client view must be clean, confident, and explainable. If a client asks "what does this number mean?", the output has failed. Line items should include plain-English descriptions, not just trade codes and quantities.

**AI assists, does not autonomously decide.**
AI can suggest, draft, and check — but the estimator always has final say. No AI-generated number ships to a client without human review. AI is a force multiplier for someone who knows what they're doing, not a replacement for domain expertise.

**Evidence over ambition: ship only what's proven.**
Every feature starts as a hypothesis, not a certainty. Don't build based on what "feels right" or what competitors have. Ship small, measure actual usage, and iterate. Features that don't prove themselves get cut. The roadmap is written in data, not wishful thinking.

**Estimates are living documents, not printouts.**
An estimate evolves from rough takeoff to final proposal through multiple rounds. The product must track versions, show what changed, and let users compare revisions. Printing to PDF happens at the end, not the beginning. The estimate inside Archestimator is the source of truth; exported files are snapshots.

---

## 3. User Value Thesis

Construction estimating lives in spreadsheets because spreadsheets are universal, flexible, and immediately understandable. But spreadsheets fail at everything that happens after the numbers are entered: sharing with the team, presenting to a client, tracking revisions, reusing past work, and turning an estimate into a proposal. Archestimator keeps what spreadsheets do well — the familiar grid, the formula-like thinking, the unfiltered control over every cell — and layers on exactly what's missing: structure, collaboration, client-ready output, and a cost library that makes every estimate faster than the last. The result is a tool that feels as direct as a spreadsheet but produces output that looks like it came from a dedicated estimating system. For contractors who currently spend Sunday nights formatting estimates for Monday morning client meetings, Archestimator turns hours of cleanup into minutes of review.

---

## 4. North Star Metric Options

Each candidate metric is evaluated below on its merits, weaknesses, and how practical it would be to measure with local-first instrumentation.

### Candidate A: `Completed estimate exported or shared per active workspace`

**Pros:** Directly measures the end of the value chain — the moment an estimate leaves the tool and reaches a client. Unambiguous: either an export/share happened or it didn't.

**Cons:** Too lagging. An export might happen once per project lifecycle, which means weeks or months between data points for a given workspace. Doesn't capture whether the estimate was useful, only that it was sent. Could be gamed by exporting drafts. Low frequency makes statistical significance hard to reach with a small beta cohort.

**Measurement feasibility:** HIGH. Exports and shares are discrete events that can be instrumented locally. However, "completed" is subjective — does an estimate need all line items filled? Client approval? Hard to automate the "completed" qualifier without human judgment.

### Candidate B: `Time from first login to first useful estimate`

**Pros:** Measures the onboarding experience directly. Short time-to-value correlates with activation and retention. Actionable: if it's high, you know onboarding needs work.

**Cons:** Only measures the first session, not ongoing engagement. A user might create one estimate quickly and never return. "Useful" is subjective — what makes an estimate "useful" vs "toy"? Hard to define without explicit user feedback. Not a growth metric; more of a health metric for the funnel.

**Measurement feasibility:** MEDIUM. Login timestamps and estimate creation timestamps are easy. But "useful estimate" requires a definition that doesn't exist yet (minimum line items? exported? viewed by client?).

### Candidate C: `Weekly active workspaces with at least one estimate edit/export/share`

**Pros:** Captures the core action loop (edit, export, or share) at the right unit of analysis (workspace, not individual user). Weekly cadence is frequent enough to surface trends in a small beta. Combines creation (editing) with distribution (exporting/sharing). Works with local-first instrumentation — just count workspaces that had any of these events in a 7-day window.

**Cons:** Doesn't distinguish between light and heavy usage — one edit per week counts the same as twenty. Doesn't capture estimate quality or client outcomes. Requires defining "active workspace" and "estimate edit" precisely (is opening and closing an estimate enough?).

**Measurement feasibility:** HIGH. Edit timestamps, export events, and share-link creation are all instrumentable client-side events. Weekly windowing is straightforward in analytics code. The definition is concrete enough to be computed consistently.

### Candidate D: `Projects that reach client review state`

**Pros:** Aligns perfectly with the product mission — client confidence is the goal, and client review is the bridge to it. Measures an outcome, not just activity. Every project that reaches review represents real value delivered.

**Cons:** Extremely lagging. A project might take weeks or months to reach review. Depends on client behavior, which Archestimator doesn't control (the client might never open the link). Small beta sample makes this metric volatile and unactionable on a weekly basis. Doesn't capture reuse or return engagement.

**Measurement feasibility:** LOW. "Client review state" requires the client to take action (open the link, leave feedback). This is measurable when it happens, but the absence of review doesn't mean the product failed — it might mean the client called instead. Requires network-dependent analytics that may conflict with local-first architecture.

### Candidate E: `Estimate-to-proposal completion rate`

**Pros:** Measures the full journey from creation to client-ready output. High completion rate means the product works end-to-end. Low completion rate points to specific drop-off points.

**Cons:** A proposal *export* now exists (XLSX Bid Form / BOQ — see code note below), but there is still no distinct in-product "proposal" lifecycle *state* an estimate transitions into, so "completion" has no canonical definition. Completion rate is a ratio, which means small numerator changes produce wild swings when the denominator is small. Not suitable for a beta with fewer than a few hundred estimates.

**Measurement feasibility:** LOW. A proposal-export pipeline is BUILT (`src/lib/proposal-export/` — `build-proposal-export-model.ts`, `create-proposal-workbook.ts`; HTTP route `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`; output is XLSX only, **no PDF/CSV path**). But a proposal as a tracked product *state* still doesn't exist, and "completion" is a fuzzy concept — is a proposal "complete" when exported? When the client accepts? When the job is won? Each definition changes the number dramatically.
<!-- ROADMAP_SYNC 2026-06-18: DRIFT fixed — prior text claimed "the proposal package feature is still in the roadmap" / "Proposal state doesn't exist in the product." Code shows proposal/BOQ XLSX export is implemented and route-wired; only the proposal *lifecycle state* is still absent. -->


---

## 5. Recommended North Star

**North Star Metric: Weekly active workspaces with at least one estimate edit/export/share.**

This metric wins for three reasons. First, it captures real engagement, not vanity signups — a workspace only counts if someone is doing actual estimating work. Second, it uses workspaces as the unit of analysis, not individual users, because estimating is inherently collaborative. A team of three who share a workspace represents one engaged customer, not three (and a solo estimator with five workspaces represents five engaged customers, which is correct). Third, edit/export/share covers the full value chain: creating and refining estimates (edits), sending them to clients (exports), and collaborating with team members (shares). A workspace that only edits but never exports might be stuck; one that only exports without editing might be using the tool as a file converter. The combination tells a complete story.

The weekly window is tight enough to show trends in a small beta (8-12 weeks of data gives enough points to spot patterns) but long enough to accommodate the pace of construction estimating, where an estimate might sit idle for a day or two while waiting for subcontractor numbers.

### Supporting Metrics

These three metrics explain *why* the North Star moves.

**Activation rate: % of new workspaces that create at least one estimate within 7 days.**
Baseline: `UNKNOWN / NEEDS INSTRUMENTATION`
Measures onboarding effectiveness. If a workspace signs up and never creates an estimate, nothing else matters. A low activation rate means the product is hard to understand or hard to get started with. Tracked weekly as: (workspaces created 7-14 days ago that activated) / (total workspaces created 7-14 days ago). The 7-day offset prevents counting workspaces that haven't had a full week yet.

**Share rate: % of active estimates that generate at least one shared link.**
Baseline: `UNKNOWN / NEEDS INSTRUMENTATION`
Measures whether estimates are breaking out of solo mode. An estimate that's never shared is a personal scratchpad — useful, but not the product's core value. A high share rate means teams are collaborating or clients are receiving proposals. A low share rate might mean the sharing UX is buried or users don't trust the output quality yet.

**Return rate: % of workspaces active in consecutive weeks.**
Baseline: `UNKNOWN / NEEDS INSTRUMENTATION`
Measures whether Archestimator becomes a habit. A user who creates one estimate and leaves got temporary value; a user who returns week after week has integrated the tool into their workflow. Tracked as: (workspaces active in week N that were also active in week N-1) / (workspaces active in week N-1).

---

## 6. Activation Definition

A workspace is activated when the user has:

1. Created at least one project
2. Created at least one estimate within that project
3. Added at least one row item to that estimate

This is the minimum meaningful outcome because:

Creating a project shows the user understood the organizational model. Creating an estimate shows they found the core action. Adding a row item shows they actually started estimating — not just clicking around. A workspace that stops before adding a row item hasn't begun the real work. They might be exploring, confused, or testing the product without real intent.

This definition intentionally excludes exports, shares, or client review. Those are engagement milestones, not activation milestones. Activation answers "did they start estimating?"; engagement answers "did they keep going?". Forcing exports into activation would mean a user who creates a thorough 100-line estimate but hasn't exported it yet is "not activated", which is wrong.

Activation should be measured within a 7-day window from workspace creation. A workspace that activates on day 10 still counts as activated, but for rate calculations we look at the 7-day window to keep the metric responsive.

---

## 7. Primary Product Loops

Each loop represents a repeatable user journey that drives value and retention. Loops are the product's flywheels — each completion makes the next run easier or more likely.

### Estimate Creation Loop

`create project → create estimate → add rows → review totals → export/share`

The core loop. A user starts a new project, opens a fresh estimate, adds line items (either manually or from the cost library), reviews the calculated totals and markups, and exports or shares the result. Each completed estimate builds the cost library, making the next estimate faster. Over time, users develop personal libraries of common assemblies that turn a 100-line estimate into a 10-line estimate with bundled line items.

**Key accelerant:** The cost library. The more estimates a user creates, the richer their library becomes, and the faster subsequent estimates are.

**Friction point:** First estimate has no cost library. Mitigate with sensible defaults and an obvious way to save items as reusable.

### Collaboration Loop

`invite team member → accept invite → edit estimate → see changes`

Multiple users work in the same estimate. One person creates the estimate, invites a colleague, the colleague accepts and begins editing, and both parties see each other's changes (with attribution). The loop completes when the estimate reaches a state both collaborators agree on — typically when it's ready for client review.

**Key accelerant:** Real-time or near-real-time presence. Seeing someone else's cursor or changes reduces the "did you get my version?" anxiety that plagues spreadsheet-based estimating.

**Friction point:** Conflict resolution. Two people editing the same line item at the same time. Mitigate with clear ownership indicators and non-destructive editing.

### Client Review Loop

`share link → client views → client comments/decides → owner responds`

An estimator shares an estimate with a client via a link (not a PDF attachment). The client opens it in a clean, non-editable view, reviews the numbers, and either approves, requests changes, or asks questions. The estimator receives the feedback and adjusts. The loop repeats until the client is satisfied and the estimate becomes a proposal.

**Key accelerant:** Client view quality. If the client-facing view is confusing, the loop stalls at "client views". If it's clear and professional, the loop moves to "client decides" quickly.

**Friction point:** The client might not open the link at all. Some clients prefer phone calls or email chains. Share links should include gentle nudges (view counts, "last opened" timestamps) and degrade gracefully to PDF export for clients who won't engage digitally.

### AI Assistance Loop

`ask question / request package → review draft → apply → verify`

The user invokes AI help — asking for a line-item recommendation, requesting a full assembly package, or checking an estimate for errors. The AI drafts a response. The user reviews it, applies what they want (and discards the rest), and verifies the result against their domain knowledge. The loop produces a better estimate than either the human or the AI could produce alone.

**Key accelerant:** Domain-specific training. The more the AI knows about construction estimating norms in the user's trade, the less review is needed before application.

**Friction point:** Trust. If the AI gets something wrong early, the user stops using it entirely. Mitigate with confidence indicators, source explanations ("this price is based on RSMeans 2024 data"), and always-visible undo.

<!-- ROADMAP_SYNC 2026-06-18: this loop is DESIGN, not a live default. The AI Ask + Package-Builder routes are IN PROGRESS and FLAG-GATED OFF by default (`src/lib/ai/feature-flags.ts` — isAiRoutesEnabled() defaults false; disabled routes return 404 "AI is disabled for closed beta"). The provider is DeepSeek, not Claude/OpenAI (`src/lib/ai/deepseek.ts`), and requires an external DEEPSEEK_API_KEY at runtime. So this loop does not run in the default closed-beta deployment. -->


---

## 8. Weekly PM Cadence

Philip reviews the following each week. This is not a meeting — it's a 30-minute solo review, augmented by whatever the codebase assistant can report.

### What Philip Reviews

| Area | Action | Source |
|------|--------|--------|
| North Star metric | Check trend, note anomalies | Instrumentation dashboard |
| Supporting metrics | Activation rate, share rate, return rate | Instrumentation dashboard |
| User feedback | Read all new feedback since last review | Feedback intake system |
| Top 3 bugs | Confirm they're triaged and assigned | Bug tracker / 14-owner-decisions.md |
| Outstanding decisions | Review any unmade decisions, set deadlines | 14-owner-decisions.md |
| Beta health | Any churn signals, support requests, confusion patterns | Feedback intake + instrumentation |
| Competitive landscape | Any notable moves by competitors | Manual review |
| Roadmap alignment | Is the current development sprint aligned with the top-priority bets? | Roadmap doc vs current work |

### How Feedback is Triaged

Every piece of user feedback gets a severity label:

| Severity | Definition | Action |
|----------|------------|--------|
| **P0 — Blocking** | User cannot complete core workflow. Data loss, broken exports, crashes. | Fix immediately. Drop current sprint if needed. |
| **P1 — Major friction** | User can complete workflow but with significant pain. Confusing UI, slow performance, manual workarounds. | Plan for next sprint. Must be resolved within 2 weeks. |
| **P2 — Annoyance** | Workflow works but there's a better way. Missing shortcut, suboptimal default, unclear label. | Queue for "quality" sprint every 4th week. |
| **P3 — Nice to have** | Feature request or improvement that would be nice but doesn't block anyone. | Log in backlog. Revisit during quarterly planning. |
| **Not a bug / By design** | Feedback that reflects a misunderstanding or a deliberate product choice. | Respond with explanation. If pattern emerges, reconsider the design choice. |

### How Decisions are Logged

All product decisions — feature scope, priority changes, design choices with tradeoffs, and "we're not building X" decisions — are logged in `14-owner-decisions.md` with:

- Decision date
- What was decided
- Why (the context and alternatives considered)
- Who was consulted
- Revisit date (if applicable)

Decisions without a revisit date are considered final until new evidence emerges. Every decision entry includes a one-line summary as its title so Philip can scan entries quickly.

---

## 9. Feedback Intake Process

The flow from user complaint to shipped improvement:

```
Beta user → Feedback channel → Triage → Prioritize → Roadmap → Implement → Validate → Closed loop
```

**Step 1: Collection.** Feedback enters through whatever channels beta users have: in-app feedback form, email to Philip, GitHub issues, or direct conversation. All feedback lands in a single place (currently: `14-owner-decisions.md` for decisions, but a dedicated feedback log is recommended once volume exceeds ~10 items/week).

**Step 2: Triage.** Philip (or the codebase assistant on his behalf) assigns severity and tags. Within 48 hours, every item has a severity label. P0 items are actioned immediately.

**Step 3: Prioritize.** During the weekly review, open feedback is sorted against the Impact/Effort matrix (see Section 10). High-impact, low-effort items jump to the top.

**Step 4: Roadmap.** Accepted items land on the relevant roadmap doc (see `01_roadmap/` directory) with a target milestone.

**Step 5: Implement.** The item is built. Implementation is tracked in the development workflow.

**Step 6: Validate.** After shipping, the original reporter is notified (if known). Usage data confirms whether the change moved any metric.

**Step 7: Closed loop.** The feedback item is marked resolved. If the reporter responds with "still broken" or "not what I meant", the item reopens at triage.

---

## 10. Feature Prioritization Framework

Use the Impact/Effort matrix to prioritize every feature request, bug fix, and improvement. This framework keeps the roadmap honest and prevents "this would be cool" from becoming "this is what we're building."

### Matrix

```
                          IMPACT
                    Low              High
          ┌──────────────────┬──────────────────┐
          │                  │                  │
    Low   │   MAYBE LATER    │    DO NOW        │
          │   (Opportunistic)│   (Top priority) │
          │                  │                  │
  EFFORT  ├──────────────────┼──────────────────┤
          │                  │                  │
          │                  │                  │
   High   │   AVOID          │   PLAN NEXT      │
          │   (Don't do)     │   (Sequence      │
          │                  │    carefully)    │
          └──────────────────┴──────────────────┘
```

### Category Definitions

**Do now (high impact, low effort).** These are the gift items. A small change that unlocks disproportionate value. Examples: adding a keyboard shortcut for the most common action, fixing a confusing label that causes support requests, exposing an existing feature that's buried in a menu. These items skip the roadmap and go straight into the current sprint if capacity exists.

**Plan next (high impact, high effort).** The strategic bets. These are the features that change the product's trajectory but require significant investment. Examples: PDF export, cost library v1, collaborative editing. These go on the roadmap with clear milestones, and each one gets a lightweight spec before development begins. Never have more than 3 "plan next" items in progress simultaneously.

**Maybe later (low impact, low effort).** Nice improvements that don't move the needle but are easy to ship. Examples: adding a new color theme, adding a "sort by name" option in a rarely-used view. These fill gaps in sprints or get bundled into a "polish week" every 4-6 weeks. If an item sits in "maybe later" for more than two quarters, delete it — it's never going to happen.

**Avoid (low impact, high effort).** The trap items. These sound impressive but would consume resources better spent elsewhere. Examples: a full custom reporting engine before anyone has asked for it, integration with a niche accounting system that one beta user mentioned, rebuilding the entire UI framework. "Avoid" doesn't mean "never" — it means "not until evidence changes the impact rating." If three more beta users request it and the effort estimate drops because supporting infrastructure arrives, the item can move.

### Applying the Framework

1. Every new feature request gets an impact score (1-5) and an effort estimate (S/M/L/XL).
2. Impact is assessed against the North Star and supporting metrics: will this move one of them?
3. Effort is estimated by the codebase assistant or the implementing developer, not by Philip.
4. The quadrant determines initial priority.
5. During weekly review, Philip can override the quadrant if context demands it (e.g., a strategic bet that's technically "avoid" by the matrix but unlocks a partnership). Overrides must be logged in `14-owner-decisions.md` with rationale.

---

## 11. Decision Log Process

The canonical decision log lives at `.ai/01_roadmap/14-owner-decisions.md`. Every product decision that involves a tradeoff, a scope boundary, or a deliberate "no" is recorded there.

**What goes in the decision log:**
- Feature scope decisions ("we're building X but not Y")
- Priority decisions ("we're doing A before B because...")
- Architecture decisions with product implications ("we're using local-first storage, which means...")
- Strategic decisions ("we're targeting residential contractors first, not commercial")
- Decisions to stop doing something ("we're deprecating the old export format")

**What does NOT go in the decision log:**
- Implementation details (how a feature was built)
- Bug reports (unless the decision is "we're not fixing this")
- Meeting notes (unless a decision was made during the meeting)
- Speculative discussions that didn't result in a decision

**Entry format (minimum):**
- Title (one-line summary of the decision)
- Date
- Decision
- Rationale (why this, what alternatives were considered)
- Revisit date or "final"

**Process:**
1. Philip makes a decision (or the codebase assistant surfaces one that needs making).
2. Codebase assistant drafts the entry.
3. Philip reviews and confirms.
4. Entry is committed to the repo. The decision log is version-controlled alongside the code, which means every decision is traceable to a point in time and the state of the codebase when it was made.

---

## 12. Beta Review Ritual

Every week, Philip conducts a 30-minute beta review. This is the single most important ritual in the PM operating model — it's where data meets intuition, and where the roadmap either stays the course or pivots.

### Agenda (strict 30 minutes)

**Minutes 0-5: Metrics check.**
North Star trend (up/down/flat). Supporting metrics (activation rate, share rate, return rate). Any metric that moved more than 20% week-over-week gets flagged for deeper investigation. If a metric is flat for 4+ consecutive weeks, that's also a flag — something isn't growing.

**Minutes 5-10: Top 3 user quotes.**
Pull the three most revealing things beta users said this week. Not necessarily the most positive things — the most *revealing*. A confused user is more valuable than a happy one at this stage. For each quote: what does this tell us we didn't know before?

**Minutes 10-15: Top 3 bugs.**
Review the three highest-severity bugs from the week. Confirm each has an owner and an estimated fix date. If any P0 or P1 bug is older than 7 days without a fix, that's a process problem — escalate.

**Minutes 15-20: Top 3 feature requests.**
The three most-requested features (by distinct users, not by volume from one user). Cross-reference with the prioritization matrix. If a feature request appears for the third consecutive week, it graduates to an automatic "plan next" unless Philip explicitly kills it.

**Minutes 20-25: Go/no-go assessment.**
Answer one question: if we shipped the product exactly as it is today to 10 more beta users, would they succeed? If yes, continue onboarding. If no, what's the single biggest blocker? That blocker becomes the top priority for the coming week.

**Minutes 25-30: Action items.**
List concrete actions from this review: decisions to log, bugs to escalate, features to spec, users to contact. Every action item gets a name (who owns it) and a deadline (by next review, by end of month, etc.).

### What Philip Must Decide

These decisions can't be delegated to the codebase assistant or to the development process. Philip must decide them personally, because they define what the product *is* and *is not*.

| Decision | Status | Notes |
|----------|--------|-------|
| **North Star metric** | PENDING | Section 5 recommends "weekly active workspaces with at least one estimate edit/export/share." Philip must confirm or override. |
| **Activation definition** | PENDING | Section 6 defines activation as project + estimate + row item within 7 days. Philip must confirm or adjust. |
| **Beta persona** | PENDING | Who exactly is the ideal beta user? Residential? Commercial? Solo estimator? Small team? This decision determines outreach, onboarding, and feature priority. |
| **Onboarding strategy** | PENDING | How do beta users discover the product? Direct invitation? Waitlist? Open signup? This affects growth rate and feedback quality. |
| **PDF export priority** | PENDING | Is export-to-PDF a launch requirement or a post-launch feature? This affects the MVP scope significantly. Code note (2026-06-18): an XLSX proposal/BOQ export is already BUILT (`src/lib/proposal-export/`, route `.../export/proposal.xlsx`), but **no PDF export path exists** — so this decision is specifically about whether to add PDF on top of the existing spreadsheet export. Owner decision; not promoted. |
| **Pricing timeline** | PENDING | When does Archestimator start charging? Never (free forever)? Post-beta? Day one of GA? This affects user expectations and revenue planning. |

### What Codebase AI May Propose But Not Decide

The codebase assistant (and any AI collaborators) can propose the following, but Philip makes the final call:

- Feature scope and priority
- Architecture choices with product implications (e.g., offline-first vs online-required)
- Documentation structure and audience targeting
- Test strategy and quality gates
- Performance optimization priorities

The codebase assistant MUST NOT decide on:

- Product scope (what to build or not build)
- Pricing model or strategy
- Legal considerations (ToS, privacy policy, data handling)
- Deployment environment or launch timing
- Who to hire, fire, or partner with
- Strategic direction (which market, which persona, which problem)

When the codebase assistant proposes a decision in a domain it shouldn't decide, it must clearly flag: "This requires Philip's decision" and surface it in the weekly review.

---

## Addendum: Instrumentation Notes

As of 2026-05-30, no **product-usage** metrics are instrumented. All baselines are `UNKNOWN / NEEDS INSTRUMENTATION`. The first implementation task for any metric is building the client-side event tracking that feeds it. Local-first architecture means analytics must be opt-in and privacy-respecting — no server-side telemetry without explicit user consent.

<!-- ROADMAP_SYNC 2026-06-18: status held (NEEDS INSTRUMENTATION is still accurate for the North Star / supporting-metric pipeline). Precision note: some *traffic/perf* analytics scaffolding now exists but does NOT feed the product metrics above. Specifically: privacy-redacted Vercel Web Analytics is wired app-wide (`src/lib/analytics/vercel-web-analytics.ts` redacts /workshop, /share, /invite; mounted in `src/app/layout.tsx`); a consent-gated landing A/B + GA4/Clarity path exists (`src/lib/ab-testing/*`); and a dev-only Web Vitals probe console-logs behind NEXT_PUBLIC_PERF_TRACE=1 (`src/components/workshop/WebVitalsProbe.tsx`). There is still NO event store, no activation/share/return-rate pipeline, and no metrics dashboard — so the activation/share/return baselines and the North Star remain uninstrumented. Telemetry seams (`src/lib/collaboration/realtime-telemetry.ts`, `src/lib/estimates/express-components-telemetry.ts`) are console stubs, not a sink. -->


Recommended first instrumentation tasks (in order):

1. **Workspace events:** created, deleted, renamed
2. **Project events:** created, archived
3. **Estimate events:** created, edited (debounced), exported, shared (link generated)
4. **Row item events:** added, edited, deleted
5. **User session events:** login, logout, session duration
6. **Error events:** crashes, failed exports, failed shares

Until instrumentation exists, product decisions rely on qualitative feedback, direct observation, and Philip's judgment. That's fine for a beta — but the moment quantitative decisions are needed, instrumentation is no longer optional.

---

## Appendix: Document Maintenance

This document should be reviewed and updated:

- When the North Star metric changes
- When activation definition changes
- When a new product principle is adopted or an existing one is deprecated
- When the beta review ritual format changes
- Quarterly, even if nothing else changed, to ensure it still reflects reality

The "Last updated" date at the top of this document is the single source of truth for freshness. If it's more than 90 days old, treat this document as potentially stale.
