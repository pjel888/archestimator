# Personas & Jobs-to-be-Done

**Last updated: 2026-05-30**

> **2026-06-18 ROADMAP_SYNC note:** Reconciled against the actual codebase. This is a product/UX intent doc (personas, anxieties, JTBD, evidence metrics); most content is narrative and not a code claim, so it MATCHES by design. The code-checkable parts are the **Feature Paths** and the **Summary Table readiness column**. Every feature-path SURFACE was confirmed to exist in code: login + auth callback (`src/app/login/page.tsx`, `src/app/auth/callback/route.ts`), projects + estimates (`src/app/workshop/projects/**`), component-library sidebar + templates (`src/lib/component-library/actions.ts`, `src/app/workshop/library/**`), donut/cost charts (`src/components/workshop/project-charts/ProjectCostDonutChart.tsx`), XLSX export (`.../export/proposal.xlsx/route.ts`), shared link with Tree View / comments / accept-reject-revision decisions (`src/components/share/ShareEstimateTreeView.tsx`, `SharePageComments.tsx`, `SharePageDecision.tsx`), invite-accept flow (`src/app/invite/[token]/**`, `src/app/workshop/pending-invite/route.ts`), and activity history (`src/components/workshop/estimate-sheet/activity-history.tsx`). Two caveats are flagged inline below: (a) Persona 1's "package-builder" row-add path is built but flag-gated OFF by default (`ARCHESTIMATOR_AI_ENABLED` defaults false → 404; `src/lib/ai/feature-flags.ts`); (b) Persona 6's monitoring/runbooks/metrics are readiness scaffolding + external/manual facts, not built observability. Per the external-proof rule, NO readiness status was promoted: every "Readiness Status" stays UNKNOWN / NEEDS EVIDENCE because those require USER-VALIDATION evidence (completion rates, comprehension tests, survey scores) that code cannot produce.

---

## 1. OWNER-CONTRACTOR / DECISION MAKER

### Profile
Runs a small-to-medium construction or contracting business with 2 to 15 employees. Currently uses Excel or pen and paper for estimates and proposals. Technically capable but not a software power user. Makes pricing and bid decisions personally. The buck stops with them. They value reliability over features and time over perfection.

### Primary Goal
Create accurate estimates fast, share professional proposals with clients, and win more bids at sustainable margins.

### Anxiety
"If my numbers are wrong, I lose money or lose the bid." "I don't have time to learn complicated software." "If I can't figure this out in 10 minutes, I'm going back to Excel."

### Current Workaround
Excel spreadsheets with manual formulas they built years ago, Word documents for proposals stitched together from templates, email for all client communication. Everything lives on their laptop or a shared drive. Version control is appending "_v2_final_FINAL" to filenames.

### Trigger to Use Archestimator
A complex estimate that Excel can't handle cleanly (too many line items, too many variables, or a need to share professionally). Or a client who expects polished, modern proposals that make the contractor look credible.

### Job-to-be-Done
"When I need to price a construction project, I want to build a structured estimate quickly and turn it into a client-ready proposal, so I can win the job at the right price."

### First Success Moment
First estimate with real rows, correct totals, and the ability to export or share it with a real client without embarrassment.

### Feature Path
Login → Create project → Create estimate → Add rows (manual or package-builder) → Review totals → Export XLSX or create shared link → Send to client.

> _Code caveat (2026-06-18 sync): the manual row path, XLSX export, and shared-link path are built and the AI package-builder is implemented (`src/lib/ai/package-builder/**`), BUT the package-builder route is flag-gated OFF by default — `ARCHESTIMATOR_AI_ENABLED` defaults false and the route returns 404 (`src/lib/ai/feature-flags.ts` `isAiRoutesEnabled`), and the Ask-Flip UI flag `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` also defaults false. So in the default deployment this persona's only available row-add path is "manual"._

### Must-Not-Fail Moments
- Login. If they can't get in, nothing else matters.
- Estimate totals being wrong. Trust evaporates instantly.
- Export failing. They need a backup path to familiar tools.
- Shared link not working. The client-facing surface must not break.

### Confusing Terms to Avoid
- "Node" → use "Line item" or "Row"
- "Tree" → use "Estimate sheet" or "Estimate structure"
- "Workspace" → use "Your account" or "Your projects"
- "Schema" → avoid entirely in UI

### Evidence Requirements
- Non-technical user validation with at least 3 owner-contractors
- First-estimate completion rate (target: >80% complete within 15 minutes)
- "Would you replace Excel with this?" exit-survey score


## 2. ESTIMATOR / QUANTITY TAKEOFF USER

### Profile
Dedicated estimator on the team. Builds estimates daily, sometimes multiple per week. Deep Excel user who knows pivot tables, VLOOKUPs, and nested formulas. Lives in spreadsheets. Knows unit costs, supplier catalogs, and material quantities by heart. Wants speed and accuracy above everything else. They are the power user persona and will push the tool the hardest.

### Primary Goal
Build detailed estimates fast with reusable components and accurate costs. Never re-enter the same data twice.

### Anxiety
"I need to update costs across multiple estimates and not miss anything." "If my component library is stale, every estimate I build is wrong." "I can do this faster in Excel if your tool gets in my way."

### Current Workaround
Excel with VLOOKUPs pulling from separate supplier price lists, manual quantity takeoffs from blueprints, copy-paste between sheets. They've built their own system over years and it mostly works, but it's fragile and doesn't scale across the team.

### Trigger to Use Archestimator
A new project requiring detailed line-item estimating where they want to reuse past work. The moment they realize they're rebuilding the same bathroom estimate for the fifth time is the moment they're ready for a component library.

### Job-to-be-Done
"When I'm estimating a new project, I want to use my library of components and templates to build the estimate fast, so I can deliver accurate pricing before the deadline."

### First Success Moment
Using the component library sidebar to insert pre-priced items into an estimate, seeing totals update automatically, and realizing they didn't have to look up a single unit cost.

### Feature Path
Login → Open project → Create estimate → Use component library sidebar → Insert items by search or browse → Use templates for standard rooms/configurations → Edit quantities inline → Review donut charts for cost breakdown → Export or share.

### Must-Not-Fail Moments
- Component costs being stale or wrong. The library is the source of truth.
- Row editing being slow. Every keystroke delay costs trust.
- Tree navigation being confusing. They need to see their estimate structure clearly.
- Search not finding components. If they know it exists but can't find it, they'll type it manually and lose faith in the library.

### Confusing Terms to Avoid
- Same as owner-contractor, plus:
- "Variant" → use "Option" or "Alternative"
- "Lifecycle" → use "Status" (Active, Archived)

### Evidence Requirements
- Component library usage rate (what percentage of rows in new estimates come from the library?)
- Time-to-estimate benchmarks vs. their current Excel workflow
- Library search success rate (searches that produce a clicked result)


## 3. TEAM COLLABORATOR

### Profile
Team member who was invited to a project. May be another estimator, a project manager, or an admin person. Needs to view, edit, or contribute to estimates. May not be the project owner and may not have full permissions. This person might use the product infrequently and needs orientation every time they return.

### Primary Goal
Access the right project and estimate immediately after accepting an invite. Contribute their piece without confusion about what they can and can't do.

### Anxiety
"Did my changes get saved?" "Can I see what others changed?" "Why can't I access what I was invited to?" "Am I editing the right version?"

### Current Workaround
Emailed spreadsheets with tracked changes, shared Google Drives with permission confusion, phone calls to coordinate who's editing what. The whole process is held together by the owner-contractor acting as air traffic control.

### Trigger to Use Archestimator
Receiving an email invite to collaborate on a project. This is usually their first interaction with the product.

### Job-to-be-Done
"When I'm invited to a project, I want to accept the invite and immediately see the right estimate sheet, so I can start contributing without confusion or dead ends."

### First Success Moment
Clicking the invite link, signing in (or signing up) in one smooth flow, and landing directly on the estimate sheet they were invited to view or edit.

### Feature Path
Click invite link in email → Auth (sign in or create account) → Accept invite → Land on correct project/sheet → Edit what they're allowed to edit → See activity history of other people's changes.

### Must-Not-Fail Moments
- Invite landing on the wrong account because they used a different email to sign up.
- Landing on a blank page or the wrong project. They'll close the tab and call the owner.
- Changes not saving. Collaboration trust dies on first data loss.
- Permission confusion. "Why can I see this but not edit it?"

### Confusing Terms
- "Shared project" vs. "Sheet-only access" are used in the UI and must be clearly differentiated. Users need to understand what scope of access they have.
- "Role" or "Permission level" should use plain labels: "Can view", "Can edit", "Full access".

### Evidence Requirements
- Invite acceptance rate (invite sent → account created → first page view)
- Wrong-account recovery success rate (how many users successfully switch to the correct account?)
- Time from invite click to first meaningful edit


## 4. CLIENT / RECIPIENT

### Profile
Property owner, developer, or decision maker receiving an estimate or proposal from their contractor. Not a construction professional and likely non-technical. May be viewing on a phone. Needs to understand what they're paying for and make a decision. This person has zero training and zero patience.

### Primary Goal
Review the estimate, understand the costs at a high level, ask questions about specific items, and make a decision (accept, reject, or request revisions).

### Anxiety
"I don't understand what these line items mean." "Is this price fair? Am I being overcharged?" "How do I ask a question about this specific item?" "What happens if I click this button?"

### Current Workaround
PDF proposals attached to emails, followed by phone calls or back-and-forth emails to clarify questions. Decisions are communicated verbally and confirmed in writing. It works but it's slow and informal.

### Trigger to Use Archestimator
Receiving a shared link from their contractor, usually via email or text message.

### Job-to-be-Done
"When my contractor shares an estimate with me, I want to review it clearly, understand the costs, and communicate my questions or decisions, so I can approve the work with confidence."

### First Success Moment
Opening the shared link, immediately understanding the estimate structure (what's included and what it costs), and finding a clear way to comment or ask a question about a specific line item.

### Feature Path
Open shared link → View estimate (Tree View or Grid Preview) → Review the donut chart for high-level cost breakdown → Comment on specific items → Accept, Reject, or Request Revision → See activity log of interactions.

### Must-Not-Fail Moments
- Shared link not loading. The contractor looks unprofessional.
- Password gate blocking legitimate access. If the client can't get past the lock screen, nothing else matters.
- Comments not posting. The client thinks they asked a question; the contractor never sees it.
- Decisions not recorded. If the client hits "Accept" and nothing happens, trust is broken.

### Confusing Terms
- "Donut chart" → label as "Cost breakdown" or "Where your money goes"
- "Tree View" / "Grid Preview" → use "Detailed view" / "Summary view"
- "Node" / "Line item" → use "Item" or "Cost item" consistently

### Evidence Requirements
- Client comprehension test: can a non-construction person understand the estimate structure without training or explanation?
- Comment and decision rate: what percentage of shared estimates receive at least one comment or decision?
- Mobile rendering quality: the shared view must work on a phone.


## 5. SUPPLIER / LIBRARY MAINTAINER

### Profile
Person responsible for maintaining the component library. Adds suppliers, updates costs, manages brands, organizes folders. This may be the owner-contractor wearing another hat, or a dedicated role on a larger team. They interact with the product less frequently than estimators but their work affects every estimate.

### Primary Goal
Keep the component library accurate and organized so estimators have reliable data at their fingertips.

### Anxiety
"Are these costs up to date?" "Did I put this component in the right folder?" "Can estimators actually find what they need?" "If I organize this wrong, every estimate is wrong."

### Current Workaround
Separate supplier price lists in Excel or PDF, manual cost updates copied into multiple spreadsheets, phone calls to suppliers to confirm current pricing. Organization is whatever made sense at the time.

### Trigger to Use Archestimator
A new supplier relationship, a cost update from an existing supplier, or realizing the library has become disorganized and estimators are complaining.

### Job-to-be-Done
"When our supplier costs change or we add new materials, I want to update the library so estimators always use current pricing without having to think about it."

### First Success Moment
Adding a component with the correct name, brand, supplier, and unit cost, then seeing it appear in the estimator's sidebar and knowing they'll use accurate data.

### Feature Path
Login → Navigate to /workshop/library → Add component → Fill in name, brand, supplier, unit cost, unit of measure → Place in the correct folder → Save → Switch to estimator view → Verify the component appears in the sidebar search results.

### Must-Not-Fail Moments
- Cost entries being wrong. A single typo (e.g., $15.00 instead of $1.50 per foot) propagates across every estimate.
- Components not appearing in search. If the maintainer added it but no one can find it, the library is useless.
- Folder structure being confusing or too rigid. Maintainers need to model their business, not fight the taxonomy.

### Confusing Terms
- "Variant" → use "Option" or "Size/SKU"
- "Price option" → use "Unit cost" or simply "Cost"
- "Lifecycle state" → use "Status" with clear labels (Active, Discontinued, Archived)

### Evidence Requirements
- Library update frequency: how often are costs refreshed?
- Estimator satisfaction: do estimators trust the library data?
- Component findability: search-to-insert success rate from the estimator sidebar.


## 6. PHILIP / ADMIN / OPERATOR

### Profile
Philip — founder, developer, product manager, support agent, and operator. Currently the only person who can deploy, configure, and manage the product. Deep technical knowledge of the entire stack. Carries every pager. This persona exists to document what must change for the product to outgrow a solo operator.

### Primary Goal
Ship a product that real users can use without needing him. Transition from builder to operator by establishing monitoring, runbooks, support processes, and product metrics.

### Anxiety
"Am I the bottleneck on everything?" "What happens if the app breaks while I'm sleeping or on vacation?" "Are users actually getting value from this, or am I building in a vacuum?" "I can't scale myself."

### Current Workaround
Direct involvement in everything: deploys, bug fixes, user onboarding, feature decisions, database access. Discord/DM is the support channel. Logs are checked manually when something seems wrong.

### Trigger to Use Archestimator (as Operator)
Any production issue, user-reported bug, deployment need, onboarding request, or product decision that currently requires Philip's personal attention.

### Job-to-be-Done
"When the product is live with real users, I want monitoring, runbooks, support processes, and product metrics in place, so I can operate the product without being the single point of failure."

### First Success Moment
A user completes the core loop (create estimate → add rows → review totals → export or share) entirely without Philip's help. Bonus: Philip learns about it from a dashboard, not a direct message.

### Feature Path
Monitor dashboard → Review product metrics (active users, estimates created, shares sent) → Triage user feedback → Make data-informed product decisions → Deploy with confidence using automated CI/CD → Handle incidents via documented runbooks.

> _Code caveat (2026-06-18 sync): this path is largely ASPIRATIONAL against current code. What exists: a GitHub Actions CI pipeline (`.github/workflows/ci.yml`: typecheck/lint/test/build/e2e), a shallow liveness health endpoint (`src/app/api/health/route.ts`), beta-feedback triage actions (`src/lib/workshop/beta-feedback-review-actions.ts`), Vercel Web Analytics with redaction (`src/lib/analytics/vercel-web-analytics.ts`), and a fleet of launch/uptime/monitoring READINESS check scripts that only record operator-attested flags (`scripts/check-support-monitoring-readiness.ts`, `verify-hosted-*.ts`). What does NOT exist in code: a product-metrics "Monitor dashboard" (active-users/estimates-created/shares-sent), production RUM (`@vercel/speed-insights` is not installed; `WebVitalsProbe` only console.logs in dev), error-tracking/alerting (no Sentry/Datadog/PagerDuty), automated CD/rollback, and runbooks. Monitoring, deploy pipeline, incident response, and backup/restore remain EXTERNAL/MANUAL operator facts — code cannot prove them. This is consistent with the persona's own framing ("document what must change to outgrow a solo operator")._

### Must-Not-Fail Moments
- Deployment. A bad deploy with no rollback path is the worst-case.
- Incident response. If the app is down, there must be a known, practiced recovery path.
- Data recovery. User data is irreplaceable; backup and restore must be tested.
- User support escalation. There must be a path for critical issues that isn't "message Philip on Discord."

### Confusing Terms
N/A. Philip knows the system deeply. Internal terminology is fine for this persona.

### Evidence Requirements
- Time from issue detection to resolution (tracked per incident)
- Bus-factor mitigation: how many operational tasks can someone other than Philip perform?
- Number of automated processes vs. manual processes
- User self-service rate: what percentage of user actions complete without intervention?


---

## Summary Table

| # | Persona | Primary Job-to-be-Done | First Success Moment | Readiness Status |
|---|---------|----------------------|---------------------|-----------------|
| 1 | Owner-Contractor | Build a structured estimate and turn it into a client-ready proposal | First estimate with correct totals, exported or shared with a real client | UNKNOWN / NEEDS EVIDENCE |
| 2 | Estimator | Use component library and templates to build estimates fast with accurate pricing | Insert components from library, see totals update automatically | UNKNOWN / NEEDS EVIDENCE |
| 3 | Team Collaborator | Accept an invite and immediately see the right estimate sheet to contribute | Click invite, authenticate, and land on the correct project without dead ends | UNKNOWN / NEEDS EVIDENCE |
| 4 | Client / Recipient | Review an estimate, understand costs, and communicate questions or decisions | Open shared link, understand the estimate, and find how to comment or ask a question | UNKNOWN / NEEDS EVIDENCE |
| 5 | Library Maintainer | Update supplier costs and components so estimators always use current pricing | Add a component with correct data and see it appear in the estimator's sidebar | UNKNOWN / NEEDS EVIDENCE |
| 6 | Philip / Operator | Establish monitoring, runbooks, support, and metrics to operate without being the bottleneck | A user completes the core loop without Philip's help; Philip learns from a dashboard | UNKNOWN / NEEDS EVIDENCE |

---

## How to Use This Document

1. **Before building any feature**, identify which persona(s) it serves and read their anxieties and must-not-fail moments.
2. **During UX review**, cross-reference confusing terms to avoid against the current UI copy. If any of the forbidden terms appear, replace them.
3. **During QA**, test each persona's feature path end-to-end. Treat must-not-fail moments as release blockers.
4. **After launch**, collect the evidence specified for each persona. Update readiness status from UNKNOWN → PARTIAL → VALIDATED as evidence accumulates.
5. **When scope-creeping**, ask: "Which persona's job-to-be-done does this serve?" If the answer is none, it's not ready for prioritization.
