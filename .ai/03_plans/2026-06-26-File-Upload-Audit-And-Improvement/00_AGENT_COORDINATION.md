# Agent Coordination

## Master Goal

Plan a production-grade upload, file, and image architecture for Archestimator without implementing code in this task.

The business outcome is that every current and future upload path can become faster, safer, observable, provider-portable, and easier to extend. Scope includes project cover images, component/library images, estimate-sheet inline project-component reference images, component PDF/XLS/XLSX attachments, future upload surfaces, download/access paths, cleanup, deletion, provider abstraction, and malicious-content defenses.

## Operating Constraints

- Planning-only task. No application code, test, migration, provider, or infrastructure change is part of this work.
- Writes stay inside `.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/`.
- Existing dirty worktree content is presumed owned by other work and must not be reverted.
- External technical claims must come from official/current primary sources when they affect implementation direction.
- Browser automation is not required because the deliverable is a static plan package; UI claims are grounded in source inspection and future test requirements.

## Required Deliverables

- `00_AGENT_COORDINATION.md`
- `01_EXECUTIVE_SUMMARY.md`
- `02_FEATURE_BRIEF_AND_SCOPE.md`
- `03_SOURCE_AND_CODEBASE_AUDIT.md`
- `04_REQUIREMENTS_SPECIFICATION.md`
- `05_UX_UI_ACCESSIBILITY_PLAN.md`
- `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`
- `07_DATA_DATABASE_API_NETWORK_PLAN.md`
- `08_SECURITY_PRIVACY_THREAT_MODEL.md`
- `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`
- `10_BLAST_RADIUS_AND_DEPENDENCIES.md`
- `11_IMPLEMENTATION_PLAN.md`
- `12_TEST_AND_VALIDATION_STRATEGY.md`
- `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`
- `14_RISK_REGISTER.md`
- `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`
- `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `17_FINAL_READINESS_REVIEW.md`
- `18_PLAN_AUDIT_SCORECARD.md`
- `README.md`

## Skills and Surfaces Used

| Skill or surface | Status | Relevance |
|---|---:|---|
| `ultragoal` | Used as guidance | Durable goal/completion discipline; current Codex goal remains active until planning deliverables are verified. |
| `ultraqa` | Used as guidance | Adversarial upload/security/performance scenario coverage. |
| `ultrawork` | Used as guidance | Parallel specialist workstreams and evidence-first coordination. |
| `using-superpowers` | Read | Skill discovery and explicit skill use discipline. |
| `compound-engineering` / `ce-compound` | Read; limited fit | Informed evidence capture; this task writes a plan pack, not a `docs/solutions/` artifact. |
| `code-review` | Used as guidance | Severity-ranked findings and independent review stance. |
| `production-audit` | Used as guidance | Launch-blocker lens and production-readiness scoring. |
| `review` | Used as guidance | Specification consistency and standards review. |
| `impeccable` | Used as guidance | Product UX, accessibility, and interaction-state expectations; loaded `PRODUCT.md`, `DESIGN.md`, and product register. |
| `autopilot` | Used as guidance | Clarify-plan-execute-review-QA shape; implementation stayed disabled by task scope. |
| `vercel:react-best-practices` | Used as guidance | Future React implementation checklist for upload components and hooks. |
| `react-doctor` | Used as guidance | Future React diagnostics gate; not run because no React code changed. |
| `Refactor Safely` | Used as guidance | Future provider-abstraction refactor should lock behavior with tests before shared-symbol edits. |
| `plan` | Used as authority | High-risk planning package with traceable requirements and implementation phases. |
| `performance-goal` | Used as guidance | Upload performance work must define budgets and evaluators before optimization. |
| Planning prompt | Used as authority | `.ai/08_prompts/000_Planning Prompts/Improve-Plan-Prompt.md` defines inventory, scoring, improvement, review, and final-report requirements. |
| Pasted multi-agent directive | Used as authority | `/Users/philiplewis/.codex/attachments/aa83a98f-178b-4874-9777-61541d8678b0/pasted-text-1.txt` defines multi-agent orchestration and completion reporting. |

## Specialist Ledger

| Agent | Goal | Owned scope | Dependencies | Current work/findings | Validation | Status |
|---|---|---|---|---|---|---|
| Lead coordinator | Integrate the planning package and own final readiness judgment. | All plan-package writes, source-evidence sampling, traceability, final static validation. | Specialist findings and current worktree state. | Added scorecard, corrected artifact citations, integrated security/product/UX/feasibility blockers. | Required-file check, prompt-gate check, `git diff --check`, draft-marker scan, final verifier pass. | Complete |
| Product strategist | Test whether the package serves first-user/beta business outcomes. | `01`, `02`, `04`, `11`, `13`, `15`, `16`, `17`. | Source plan and beta-stage context. | Required closed-beta versus production cutline, business outcome metrics, and decision-grade gates. | Product-readiness review with file references. | Complete |
| UX/UI/a11y auditor | Test whether upload journeys and accessibility proof are implementable. | `02`, `03`, `04`, `05`, `09`, `11`, `12`, `16`, `17`. | Current upload source paths and shared UI guidance. | Required per-surface transitions, Phase 4/5 scan UI split, copy taxonomy, and a11y proof matrix. | UX-readiness review with file references. | Complete |
| Security/privacy auditor | Test authz, RLS, abuse, privacy, scanning, and audit coverage. | `03`, `04`, `06`, `07`, `08`, `11`, `12`, `13`, `14`, `15`, `16`, `17`. | Supabase/OWASP docs and source audit. | Required upload-table Postgres RLS/grants and abuse-prevention controls. | Security-readiness review with file references. | Complete |
| Feasibility reviewer | Stress architecture, schema, sequence, and compatibility. | `03`, `04`, `06`, `07`, `09`, `10`, `11`, `12`, `13`, `15`, `16`, `17`. | Current clients, migrations, and route contracts. | Required Phase 0 scan freeze, component-image asset schema, legacy session compatibility, URL resolver phase alignment. | Feasibility review with file references. | Complete |
| Coherence reviewer | Check prompt compliance, consistency, stale evidence, and scorecard gaps. | Every plan document plus `Improve-Plan-Prompt.md`. | Complete package inventory. | Found missing scorecards/inventory, wrong prompt citation, missing risk owners, and `UPLOAD-REQ-018` priority drift. | Coherence review with file references. | Complete |
| Adversarial document reviewer | Challenge readiness claims under the prompt and pasted directive. | Full package, planning prompt, pasted directive. | Current readiness and coordination docs. | Found unsupported readiness, thin multi-agent evidence, missing scorecard, and missing risk deadlines. | Adversarial verdict with blockers. | Complete |
| External researcher | Confirm external technical assumptions from primary docs. | Supabase Storage/RLS/private/signed/resumable/S3 docs and OWASP file-upload guidance. | Internet access and current date. | Confirmed docs still support storage RLS, private buckets/signed URLs, server-side S3 keys, resumable uploads for large/unstable flows, and OWASP upload controls. | Official-source URL list in `03` and `15`. | Complete |
| Final verifier | Independently verify revised package against prompt gates and local evidence. | Full revised package after integration. | All prior findings resolved or recorded. | Confirmed required documents, scorecard, risk ownership, traceability, no stale claims, and static validation. | PASS verdict from independent `verifier` lane. | Complete |

## Review Cycles

| Cycle | Reviewer focus | Required outcome | Status |
|---|---|---|---|
| Initial draft | Synthesize repository evidence and specialist findings | All required docs exist with traceable requirements and implementation tasks | Complete |
| Critique cycle 1 | Adversarial feasibility, security, coherence, scope | Revised Phase 0 direct-write gate, scanner contract, auth matrix, finalization, provider proof, and privacy default | Complete |
| Critique cycle 2 | Final readiness, traceability, implementation handoff | Revised fail-closed legacy attachment handling, lifecycle state ownership, adapter scope, resolver/privacy ordering, and runtime smoke gate | Complete |
| Final verification | Independent package verification | Verified 20 files, prompt-required scorecard, corrected artifact citations, risk ownership, traceability, and static validation | Complete |

## Completion Evidence Required

- Required-file inventory passes for all 20 deliverables.
- `git diff --check -- .ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement` passes.
- No unresolved draft markers remain in the plan pack.
- Final readiness review confirms no source/test/provider files were changed for this planning task.
- `18_PLAN_AUDIT_SCORECARD.md` includes document inventory, initial/final scorecards, before/after comparison, and exact sub-100 score rationale.
