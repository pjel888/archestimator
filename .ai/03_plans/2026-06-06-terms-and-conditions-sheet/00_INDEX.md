# Terms and Conditions Sheet Implementation Plan Index

> **Plan status:** READY_FOR_IMPLEMENTATION planning package, not implementation.
> **Plan folder:** `.ai/03_plans/2026-06-06-terms-and-conditions-sheet`
> **Created:** 2026-06-06
> **Product:** ArchEstimator / Archestimator SaaS estimation and design-support workspace.

## Task goal

Create a repo-grounded implementation plan for a versioned Terms and Conditions / Terms of Service sheet and acceptance system that gives ArchEstimator the strongest commercially reasonable, legally reviewable SaaS protection while making clear that ArchEstimator is a software tool only.

The future implementation must support attorney-reviewed Terms, user acceptance, versioning, evidence, re-acceptance, Supabase/Postgres persistence, RLS, auth/protected-route gating, UX surfaces, privacy-aware metadata handling, and rollout/rollback safety.

## Scope

- Plan legal-product structure for Terms of Service / Terms and Conditions.
- Plan acceptance UX and audit evidence for new and existing authenticated users.
- Plan Supabase/Postgres schema, RLS, generated-type, migration, and data-retention implications.
- Plan app-route, proxy/auth-callback/session, account/settings, and future billing checkout touchpoints.
- Plan tests, verification, release order, rollback, and `.ai` memory updates.
- Plan future legal-review handoff and placeholders for jurisdiction-specific decisions.

## Non-goals

- No production source-code implementation in this task.
- No Supabase migrations, generated types, package/dependency/config, runtime behavior, or app UI changes in this task.
- No final legal boilerplate or legal advice.
- No claim that absolute zero liability is achievable or guaranteed.
- No provider changes, no secrets, no SlateCamp resources, no billing implementation.

## Legal/product guardrails

1. This is implementation planning only and not final legal advice.
2. Final Terms language must be reviewed by a qualified lawyer before launch or enforcement.
3. The product must not claim absolute “zero liability”; enforceability depends on jurisdiction, consumer-protection law, gross negligence/willful misconduct limits, unconscionability/public-policy limits, and final legal counsel review.
4. The implementation should support strongest reasonable SaaS protections: warranty disclaimers, limitation of liability, no professional-advice/no reliance clauses, output verification responsibilities, acceptable use, indemnity, subscription/payment terms if billing is introduced, termination rights, privacy references, dispute-resolution placeholders, and acceptance audit trails.

## Plan document map

| Doc | Purpose |
| --- | --- |
| `00_INDEX.md` | Start here; scope, sequence, commands, risk and readiness summary. |
| `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md` | MUST/SHOULD/COULD requirements and pass/fail acceptance checks. |
| `02_CODEBASE_RESEARCH.md` | Live repo evidence, commands, inspected files, existing behavior, gaps. |
| `03_ARCHITECTURE_AND_DESIGN_PLAN.md` | Proposed architecture, alternatives, contracts, data flow, Supabase design. |
| `04_IMPLEMENTATION_SEQUENCE.md` | Step-by-step future implementation path with validation/rollback. |
| `05_BLAST_RADIUS_AND_RISK_ANALYSIS.md` | Affected flows, risk table, mitigations, rollback/concurrency risks. |
| `06_TESTING_AND_VERIFICATION_PLAN.md` | Unit/DOM/E2E/RLS/manual validation plan and commands. |
| `07_UI_UX_AND_ACCESSIBILITY_PLAN.md` | User journey, modal/sheet/page decisions, states, a11y, copy, design system. |
| `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md` | Auth/RLS/privacy/performance/caching/data-retention/security plan. |
| `09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md` | Safe deploy order, migration rollout, rollback, provider proof, legal gate. |
| `10_IMPLEMENTATION_PROMPT_DRAFT.md` | Paste-ready future implementation prompt. |
| `11_READINESS_SCORECARD.md` | Plan readiness scoring, evidence, missing items, decision. |
| `12_OPEN_QUESTIONS_AND_DECISIONS.md` | Philip/legal-counsel decisions and implementer-decidable items. |
| `13_TRACEABILITY_MATRIX.md` | Requirement-to-step-to-test-to-risk matrix. |
| `14_DATABASE_SCHEMA_PLAN.md` | Optional deep schema/RLS/generated-types plan. |
| `15_LEGAL_TERMS_CONTENT_STRUCTURE.md` | Optional non-final Terms content checklist for lawyer review. |
| `16_ACCEPTANCE_AUDIT_TRAIL_PLAN.md` | Optional audit evidence, retention, support/admin retrieval plan. |
| `17_EXISTING_USER_REACCEPTANCE_PLAN.md` | Optional existing-user and old-version re-acceptance strategy. |
| `18_UI_DESIGN_SYSTEM_ALIGNMENT.md` | Optional UI primitives/design-system lint alignment plan. |
| `19_RELEASE_CHECKLIST.md` | Optional production-readiness checklist. |
| `20_WORKFLOW_HANDOFF_AND_AGENT_STAFFING.md` | Optional RALPLAN/Ultragoal/Team/code-review/UltraQA handoff guidance. |

## Start-here instructions for future implementation agent

1. Read this file, then `10_IMPLEMENTATION_PROMPT_DRAFT.md`.
2. Re-verify live repo state with the safety commands in `02_CODEBASE_RESEARCH.md`; do not trust this plan if code or migrations changed.
3. Confirm legal copy approval first. If counsel-approved Terms copy is missing, implement only versioned infrastructure and placeholder-safe copy explicitly marked draft, or stop if production copy would be deployed.
4. Use code-review-graph/GitNexus impact analysis before editing symbols; if unavailable, record unavailability and use local inspection.
5. Add tests before or alongside behavior changes; auth/protected-route/browser flows require E2E coverage.
6. Keep production source changes on a scoped branch/PR unless Philip explicitly authorizes main merge.
7. Update `.ai` state/tasks/logs and archive this plan only after implementation is verified.

## Recommended implementation sequence

1. Confirm legal/product decisions and final approved Terms/Privacy copy.
2. Add versioned Terms content source and required version constants.
3. Add Supabase acceptance schema/migration/RLS/grants if persistence is required.
4. Update generated Supabase types using repo convention.
5. Add server-side acceptance persistence path with server-derived user/time/version/metadata.
6. Add read path for current user acceptance status.
7. Add post-auth/protected-route/account UI acceptance and links.
8. Add material-change re-acceptance flow.
9. Add unit/DOM/E2E/RLS tests.
10. Run validation, provider checks if applicable, update `.ai`, then archive plan.

## Required future verification commands

- `git status --short --branch`
- `git diff --check`
- `bun run validate`
- `bun run build`
- `bun run test:e2e` when auth/protected-route/signup/login/acceptance UI changes land
- `bun run lint:design-system` for app/workshop UI changes
- Supabase migration/type commands only under repo safety rules, after `supabase --help` / command verification and only for ArchEstimator project `ebxxqidacheyapmmzavr`.

## Risk summary

High-risk implementation surfaces are auth redirect loops, all-user app lockout, RLS denial or leakage, duplicate/stale acceptance records, legal copy deployed without approval, overbroad liability claims, privacy risk from IP/user-agent storage, future billing/refund cancellation compliance, and migration rollback complexity.

## Bug/blocker references

- `.ai/15_Bugs/2026-06-06-stale-migration-count-documentation.md` — non-blocking docs drift: `.ai/README.md` and root `README.md` migration counts do not match live 81 migration files.
- Existing non-blocking Git GC warning remains tracked at `.ai/15_Bugs/2026-06-04-git-gc-unreachable-loose-objects-warning.md`.

## Current status

Docs-only plan package created. No implementation, migration, package, dependency, config, generated, secret, provider, or runtime files were modified by this planning task.

## Readiness score table

| Category | Score | Status |
| --- | ---: | --- |
| Repository evidence accuracy | 99 | Live file, graph, package, route, Supabase, and docs evidence collected. |
| Requirements clarity | 99 | MUST/SHOULD/COULD with pass/fail criteria. |
| Implementation specificity | 99 | Concrete files, steps, validation, rollback. |
| Test/verification readiness | 99 | Unit/DOM/E2E/RLS/manual/provider gates defined. |
| Risk/blast-radius/rollback coverage | 99 | Required legal/auth/RLS/billing/privacy risks covered. |
| Security/performance/data/UX coverage | 99 | RLS, metadata minimization, design system, performance covered. |
| Legal/product risk coverage | 99 | Zero-liability caveat, counsel gate, professional-use disclaimers planned. |
| Supabase/data model readiness | 99 | Candidate schema/RLS/grants/types/retention plan included. |
| `.ai` documentation hygiene | 99 | Cross-updates and bug plan included. |
| Future implementation usability | 99 | Paste-ready prompt and traceability matrix included. |
| **Overall** | **99** | READY_FOR_IMPLEMENTATION as an engineering plan; legal copy still requires qualified legal review. |

## Planning inputs researched

- EFF, `The Clicks That Bind`: clickwrap strength depends on conspicuous notice, affirmative assent, opportunity to review, and post-acceptance access; browsewrap is weaker. <https://www.eff.org/wp/clicks-bind-ways-users-agree-online-terms-service>
- FTC, `Click to Cancel`: recurring-payment programs need clear consent proof before charging and cancellation at least as easy as signup. <https://www.ftc.gov/business-guidance/blog/2024/10/click-cancel-ftcs-amended-negative-option-rule-what-it-means-your-business>
- FTC, `Protecting Personal Information`: inventory data, keep only information with a business need, apply least privilege, and keep retention/disposal policy. <https://www.ftc.gov/business-guidance/resources/protecting-personal-information-guide-business>
- ICO, `What is personal data`: online identifiers such as IP addresses may be personal data when they can distinguish users. <https://ico.org.uk/media/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/what-is-personal-data-1-0.pdf>
- Supabase RLS docs: enable RLS and scope SELECT/INSERT/UPDATE with authenticated role policies using `auth.uid()`/`WITH CHECK`. <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase changelog 2026-04-28: new public tables may require explicit grants before the Data API can reach them; RLS remains separate. <https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically>
- Local Next.js 16.2.6 docs under `node_modules/next/dist/docs/`: `proxy` is for request-time redirects/optimistic checks and not slow full authorization; Route Handlers are not cached by default; `cookies()`/`headers()` are async runtime APIs.
