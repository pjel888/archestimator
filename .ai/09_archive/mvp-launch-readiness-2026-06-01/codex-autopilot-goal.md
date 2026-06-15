You are Codex running in `/Users/philiplewis/archestimator`. Operate in autopilot mode using GPT-5.5 medium. Your mission is to implement everything that can be implemented without owner input from `/Users/philiplewis/archestimator/.ai/03_plans/mvp-launch-readiness-2026-06-01` so Archestimator becomes closed-beta MVP ready for beta testers, beta investors, and startup incubator review.

If this `/goal` is near or over any Codex input limit, immediately save the full goal into `/Users/philiplewis/archestimator/.ai/03_plans/mvp-launch-readiness-2026-06-01/codex-autopilot-goal.md`, continue from that file, and treat it as the active mission contract.

Work continuously. Do not stop for clarification unless there is a true destructive-production-data risk that cannot be avoided. If a plan item needs owner approval, make the safest closed-beta MVP decision yourself, document it in `.ai/03_plans/mvp-launch-readiness-2026-06-01/34-architecture-decision-records.md`, and continue.

Primary objective: implement the MVP closed-beta readiness plan fully enough that the app is working, valuable, controlled by beta email whitelist, has no visible unfinished AI, has no payment requirement, has polished core estimating/library/template/export flows, and passes all validation with zero errors.

Hard launch constraints:

* Closed beta only.
* No payments, no Stripe, no checkout, no subscription enforcement.
* Google Sign-In only for beta users unless current magic-link behavior is explicitly retained safely.
* Add closed-beta email whitelist enforcement.
* Only whitelisted users can access `/workshop` and protected app routes.
* Public marketing/legal/share routes must remain accessible according to current rules.
* Ask Flip / AI assistant must be hidden and AI API routes disabled by default.
* Core estimating workflow must work end-to-end.
* Component library must be usable.
* Templates must be usable.
* Project-specific/unlinked components must work safely.
* Excel export must be professional and useful for real bid/BOQ workflows.
* Feedback/support path must exist for beta testers.
* Legal/beta copy must be truthful.
* Vercel/Supabase/Resend/env/deployment assumptions must be documented and updated.
* Worktree must end clean except for deliberate completed changes that are staged, committed, and pushed.

Before coding, read and understand:

1. `AGENTS.md`
2. `DESIGN.md`
3. `README.md`
4. `package.json`
5. `.env.example`
6. `.github/workflows/*`
7. `.ai/README.md`
8. `.ai/00_system/ai-folder-canonical-map.md`
9. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
10. `.ai/10_state/current-state.md`
11. `.ai/10_state/decisions.md`
12. `.ai/06_specs/*`
13. Every file inside `.ai/03_plans/mvp-launch-readiness-2026-06-01`

Use graph-first analysis before edits:

* Run code graph / impact analysis where available.
* Before changing high-blast-radius files, identify callers, affected flows, tests, and rollback.
* High-blast-radius targets include auth/session/proxy, `WorkshopPageShell`, AI routes, `EstimateSheetContent`, row mutation server actions/RPCs, component library, templates, proposal export, Supabase migrations/types, and route handlers.
* Record findings in `.ai/03_plans/mvp-launch-readiness-2026-06-01/15-blast-radius-register.md` and `.ai/03_plans/mvp-launch-readiness-2026-06-01/14-evidence-index.md`.

Start with a baseline:

```bash
git status --short
git rev-parse HEAD
bun install --frozen-lockfile
bun run type-check
bun run lint
bun run lint:design-system
bun run test
bun run test:dom
bun run build
```

If any command fails, debug and fix before continuing unless the failure is clearly documented as pre-existing and unrelated. The final state must target zero TypeScript errors, zero lint errors, zero design-system violations, passing tests, and successful build.

Implementation priority order:

PHASE 1 — Closed beta access control.
Implement email whitelist access for closed beta.

* Add a Supabase migration for a closed-beta allowlist table. Prefer the final table/schema documented in the plans. If unresolved, choose `closed_beta_allowed_emails`.
* Fields should support normalized unique email, status `invited | active | revoked`, invited_by, invited_at, accepted_at, notes, metadata, created_at, updated_at.
* Add RLS/grants appropriate for closed beta. Normal users should not be able to enumerate the allowlist. Philip/admin/service role can manage manually in Supabase for MVP.
* Add server-side helper to check whether the authenticated user’s verified Google email is allowed.
* Gate `/workshop` and protected app routes. Non-whitelisted authenticated users must not access the app.
* Avoid auth callback redirect loops.
* Preserve public routes and public share routes according to current behavior.
* Add access-denied / closed-beta-pending UX with sign-out/contact/request-access copy.
* Add env flags if needed: `CLOSED_BETA_ACCESS_ENABLED=true`, and public UI copy flag only if necessary.
* Update `.env.example`.
* Add tests for whitelisted, non-whitelisted, revoked, public route, and access-denied states.
* Update relevant docs in `.ai`.

PHASE 2 — Remove public paid-launch assumptions.

* Ensure no payment/billing/checkout implementation is required for MVP closed beta.
* Reframe or hide pricing/payment copy.
* If `/pricing` exists, make it truthful for closed beta: invitation-only, no payment yet, pricing announced after beta, contact/request access.
* Remove any launch-blocking Stripe/payment/billing tasks from MVP docs and move them to post-beta.
* Add/adjust tests or snapshots for public copy where appropriate.
* Update `.ai/32-business-model-and-pricing-readiness-note.md`, `.ai/38-closed-beta-scope-and-nonpayment-plan.md`, and launch gate docs.

PHASE 3 — Hide/defer Ask Flip and AI.

* Hide `AskFlipFooterAssistant` from all workshop pages by default.
* Gate AI routes before handler/provider/database-heavy logic:

  * `/api/ai/ask`
  * `/api/ai/package-builder`
* Disabled AI routes must not call model providers and must not perform expensive AI context reads.
* Use safe env flags and update `.env.example`.
* Keep AI code in repo. Do not delete it.
* Add tests proving AI UI is absent when disabled and AI routes return disabled/404 before handler/provider calls.
* Ensure build and tests pass.

PHASE 4 — Project-specific/unlinked components.

* Implement the safest schema-accurate plan from `07-project-specific-unlink-components-plan.md` and `17-data-contracts-rpc-migrations.md`.
* Use existing `estimate_row_link_state` semantics if verified:

  * `linked-clean`
  * `linked-overridden`
  * `detached` = project-specific / explicitly unlinked from library
  * `unlinked` = manual / never linked
  * `source-changed` = future/dormant unless already used
* Add migration/RPC/action/hook/UI needed for unlink.
* Preserve source history safely.
* Do not mutate `cost_library_items` when editing project-specific rows.
* Add row badges: linked, linked edited, project-specific.
* Add “Make project-specific” action and confirmation.
* Add/edit project-specific component fields where MVP-safe: material/name, description, supplier text, unit, unit cost, notes.
* Ensure row revision conflicts are handled safely.
* Add activity/history event using actual `estimate_sheet_events` schema.
* Add tests proving:

  * linked row can detach
  * detached row clears or neutralizes library linkage per final contract
  * editing detached row never mutates library
  * library changes do not alter detached row
  * export uses detached row values
  * UI badges/actions are correct
  * conflict/rollback behavior works

PHASE 5 — Component library polish.
Implement the practical MVP polish from the plans:

* Search/filter if missing.
* Empty/loading/error states.
* Trust fields such as supplier, pricing date, lifecycle/status, unit, cost.
* Better seed/demo data quality where feasible.
* Keep bulk import/export and overbuilt manager features deferred unless already trivial and stable.
* Ensure design-system compliance.
* Add tests for search, empty state, loading/error state, and core browse/create/insert path.

PHASE 6 — Templates polish.
Implement practical MVP template improvements:

* Template preview/details with structure, areas, row counts, and totals.
* Empty/loading/error states.
* Insert feedback.
* Ensure template insertion works into estimate groups.
* Keep full template admin CRUD deferred unless already trivial.
* Add tests for preview, insertion, empty/error/loading states.

PHASE 7 — Excel bid/BOQ export.
Implement the professional Excel export plan.

* Current export must not remain a raw dump.
* Export should follow the reference bid/BOQ structure documented in the plans:

  * Header block: project, location, owner/client, bidder/contractor, date, estimate code, currency.
  * General notes: no blank line totals, mark INCLUDED/EXCLUDED/BY OTHERS/OSM/OFCI/OSCI, double-check formulas/subtotals, extra items under OTHERS, remarks column.
  * Detailed form columns: item, particulars, unit, qty, material unit cost, labor unit cost, cost total, line total, notes/remarks.
  * Sections: General Preliminaries, Site Works, Architectural Works, Glass and Glazing, Doors and Windows, FFE, Electrical, Mechanical, Plumbing/Sanitary/Fire Protection, Others.
  * Summary: section totals, direct cost, contingency, VAT if configured/defaulted, grand total, cost per sqm if available, estimated duration if available.
  * Commercial/legal blocks: exclusions, qualifications, payment terms, validity, warranty, signature/conforme.
  * Formula-driven totals wherever feasible.
  * No visible blank LINE TOTAL cells.
* Choose MVP-safe material/labor behavior based on actual schema. If labor is not fully supported in UI/model, use honest compatibility mode and document it in workbook notes.
* Ensure preview/download parity.
* Ensure export route works on Vercel Node runtime constraints.
* Add ExcelJS tests for workbook structure, formulas, values, detached row behavior, no blank total cells, sheet names, and key metadata.
* Add manual QA checklist artifact in `.ai` if manual spreadsheet apps cannot be run.

PHASE 8 — Onboarding, feedback, legal/beta copy.

* Implement or wire a practical beta feedback/support path.

  * Prefer safest MVP: visible feedback/contact route or external form/support email if no in-app feedback table exists.
  * If an in-app feedback table is straightforward, implement it with RLS and basic submission UI.
* Ensure first-run path for whitelisted users is clear:

  * login
  * workspace/profile context
  * empty project state
  * create first project
  * create estimate
  * insert component/template
  * export
* Add closed-beta legal/copy updates:

  * beta terms outline/copy
  * privacy page closed-beta truth
  * no payment terms
  * user responsibility for estimate accuracy
  * export disclaimer
  * support/contact and data deletion contact
* Ensure public pages do not overpromise AI, payments, enterprise, or unsupported features.
* Add tests where feasible and manual QA checklist.

PHASE 9 — Infrastructure, Vercel, Supabase, Resend, observability, backup.
Implement and document all feasible readiness improvements:

* Update `.env.example` comprehensively.
* Verify/document required Vercel env variables.
* Verify/document Supabase Auth Google OAuth callback URLs.
* Verify/document Supabase migrations and storage buckets.
* Verify/document Resend env/webhook requirements.
* If Resend is not required for manual closed beta invites, document it as P1 unless visible share/invite flows require it.
* Add or update monitoring/support docs. If Sentry or uptime monitoring is not already configured and too large for MVP, document it as required pre-beta manual monitoring or P1.
* Ensure backup/rollback plan exists before migrations.
* Redis/caching: implement only if the plan and evidence show it is needed for closed beta. Otherwise explicitly defer Redis and document triggers for adoption.
* Update `.ai/22-infrastructure-vercel-supabase-resend-plan.md`, `.ai/23-performance-caching-redis-scalability-plan.md`, `.ai/27-observability-monitoring-support-plan.md`, `.ai/30-data-backup-disaster-recovery-plan.md`, and `.ai/40-closed-beta-operations-runbook.md`.

PHASE 10 — Investor/incubator demo and beta ops readiness.

* Prepare or document demo workspace/data strategy.
* Ensure app can be demoed without exposing unfinished surfaces.
* Add or update beta operations runbook:

  * how Philip adds whitelist emails
  * how to revoke users
  * how to invite manually
  * how to verify access
  * how to collect feedback
  * how to triage bugs
  * how to pause beta
  * how to rollback
* Update `.ai/28-investor-incubator-demo-readiness-plan.md`, `.ai/29-beta-program-readiness-plan.md`, `.ai/36-final-executive-launch-brief.md`, and `.ai/43-closed-beta-readiness-scorecard.md`.

Commit/push discipline:

* Work in meaningful batches.
* After each completed phase or stable sub-phase:

  1. run targeted tests for that phase
  2. run relevant validation commands
  3. update `.ai` evidence/status docs
  4. `git status --short`
  5. stage only related files
  6. commit with a meaningful message
  7. push to GitHub
* Do not make one giant commit unless unavoidable.
* Example commit messages:

  * `feat(auth): add closed beta email allowlist gate`
  * `chore(ai): disable Ask Flip surfaces for closed beta`
  * `feat(estimates): add project-specific component unlink flow`
  * `feat(export): produce industry bid form workbook`
  * `docs(beta): update closed beta launch readiness evidence`
* If push fails, diagnose and retry safely.
* If remote conflicts occur, pull/rebase safely, resolve, rerun tests, push.

Documentation/archive discipline:

* Continuously update relevant `.ai` files:

  * `.ai/01_roadmap/*`
  * `.ai/03_plans/mvp-launch-readiness-2026-06-01/*`
  * `.ai/10_state/current-state.md`
  * `.ai/10_state/decisions.md`
  * any relevant `.ai/06_specs/*`
* When a document or ticket is fully implemented and verified, mark it as implemented with:

  * commit SHA
  * files changed
  * tests run
  * evidence
  * remaining debt if any
* Do not archive the full MVP readiness folder until every item inside it is implemented or explicitly moved to post-beta/deferred with evidence.
* If a single markdown plan is fully implemented, either:

  * move it to an `implemented/` subfolder inside the MVP readiness folder, or
  * mark it as `Status: Implemented` at the top and cross-link evidence.
* Keep the folder organized so future agents can tell exactly what remains.

Validation requirements:
Run full validation after major phases and before final push:

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test
bun run test:dom
bun run build
```

If there is a `bun run validate` script, use it as well, but do not assume it replaces the explicit commands unless verified.

Debugging requirement:

* If a command fails, fix it before proceeding.
* If a test is flaky, rerun and diagnose.
* If a failure is pre-existing, prove it with baseline evidence, isolate it, and document whether it blocks closed beta.
* Final state should have zero errors.
* Do not leave broken tests unless explicitly marked non-blocking with evidence and a follow-up ticket, but prefer fixing them.

Safety rules:

* Do not expose service role keys to browser code.
* Do not weaken RLS.
* Do not disable auth protections.
* Do not delete data.
* Do not run destructive migrations without a rollback path.
* Do not run production-mutating scripts.
* Do not commit secrets.
* Do not leave AI callable by default.
* Do not leave public paid-pricing copy implying payments are live.
* Do not leave non-whitelisted users able to access protected app routes.

Final completion criteria:
At the end, the repository must have:

* Closed beta allowlist access implemented and tested.
* Ask Flip hidden and AI routes disabled by default.
* No payment/billing requirement.
* Closed beta pricing/copy/legal posture updated.
* Core project/estimate/library/template workflows working.
* Project-specific component unlink implemented and tested.
* Excel export upgraded and tested.
* Beta feedback/support path available.
* `.env.example` updated.
* Vercel/Supabase/Resend/readiness docs updated.
* `.ai` roadmap/state/decision/readiness docs updated.
* All changes staged, committed, and pushed in meaningful commits.
* Worktree clean after final push.
* Final evidence recorded in `.ai/03_plans/mvp-launch-readiness-2026-06-01/14-evidence-index.md`, `12-final-mvp-launch-gate.md`, `36-final-executive-launch-brief.md`, and `43-closed-beta-readiness-scorecard.md`.

Final report to write into `.ai/03_plans/mvp-launch-readiness-2026-06-01/final-codex-implementation-report.md`:

1. Commit SHAs pushed
2. Features implemented
3. Files changed by phase
4. Tests run and results
5. Build/lint/type-check results
6. Remaining P0 blockers, if any
7. Remaining P1 risks
8. Deferred post-beta items
9. Manual QA still required
10. Closed beta go/no-go recommendation

Then provide a concise terminal summary with the same information.
