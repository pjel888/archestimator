# Future Implementation Prompt Draft

Copy/paste this into a fresh implementation session when Philip is ready to implement.

```text
You are a repo-aware ArchEstimator coding agent in /Users/philiplewis/archestimator.

Implement the Terms and Conditions / Terms of Service acceptance system using the plan folder:
.ai/03_plans/2026-06-06-terms-and-conditions-sheet

CRITICAL CONSTRAINTS:
- Verify this plan against current repo reality before editing. Read AGENTS.md, .ai/README.md, .ai/00_system/DOCS_SOURCE_OF_TRUTH.md, .ai/00_system/AGENT_OPERATING_PROTOCOL.md, .ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md, .ai/00_system/VALIDATION_MATRIX.md, .ai/10_state/current-state.md, .ai/10_state/decisions.md, .ai/10_state/known-issues.md if present, .ai/01_roadmap/README.md, DESIGN.md, package.json, README.md, relevant .ai/06_specs, this plan folder, active plans, and relevant archives.
- Use code-review-graph/GitNexus before broad grep and before editing symbols. Run impact analysis on any function/class/method before editing. If GitNexus is unavailable, document it and use code-review-graph/local inspection.
- For Next.js route/proxy/handler/server-action work, read current local docs under node_modules/next/dist/docs before implementation assumptions.
- For Supabase work, read the Supabase skill/docs/changelog, use only ArchEstimator project ebxxqidacheyapmmzavr, never SlateCamp, never commit secrets, never expose service_role in public code.
- FINAL LEGAL COPY MUST BE APPROVED BY A QUALIFIED LAWYER BEFORE PRODUCTION TERMS TEXT IS IMPLEMENTED OR ENFORCED. If approved copy is missing, implement only infrastructure or stop and report NEEDS_HUMAN_DECISION.
- Do not claim absolute zero liability. Terms/UI must present commercially reasonable protections and user responsibility, subject to enforceability/legal review.

IMPLEMENTATION TARGET:
- Add versioned Terms content metadata, public Terms display, acceptance UI, Supabase acceptance persistence/RLS if required, server-side acceptance status/save paths, protected-app or post-auth acceptance gate, re-acceptance behavior, settings/account legal status, and tests as specified in the plan.
- Current closed beta has no Stripe/checkout/subscription/billing. Do not implement billing. Preserve future billing clauses only in legal content structure if approved.

MERGE POLICY:
- Default repo decision says feature branches/PRs and no automatic main merge.
- Create a scoped branch such as codex/terms-acceptance or feat/terms-acceptance.
- Commit and push the branch; open/prepare PR if available.
- Only merge to main automatically if Philip's implementation prompt explicitly authorizes it.

VALIDATION:
- Add/update tests where necessary, possible, and needed.
- Required commands after implementation: git diff --check, bun run validate, bun run build, bun run lint:design-system for app/workshop UI changes, bun run test:e2e for auth/protected-route/browser/user-flow changes.
- For Supabase schema changes, use repo-approved migration/type workflow, explicit grants/RLS, RLS denial tests, and separate local vs linked evidence.

.AI HYGIENE:
- Update .ai/10_state/current-state.md, .ai/10_state/decisions.md, .ai/04_tasks, and .ai/05_logs with implementation status/evidence.
- Create bug plans in .ai/15_Bugs for any discovered blocker, failing test, stale assumption, security concern, legal ambiguity, or serious implementation ambiguity.
- Archive this plan under .ai/09_archive only after successful implementation and verification.

FINAL REPORT MUST INCLUDE:
- Changed files, validation commands/results, Supabase/local/provider evidence boundaries, legal approval evidence path/status, branch, commit hash, push/PR status, bugs created, remaining risks, and whether implementation is ready for review.
```
