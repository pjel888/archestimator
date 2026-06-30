---
title: Requirements Traceability Matrix
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Requirements Traceability Matrix

| Requirement | Coverage |
| --- | --- |
| R1 Planning package only in target directory | README, 00, 18. |
| R2 No implementation/code/provider changes | 00 boundary, 18 audit. |
| R3 All required files exist | README index, 18 audit, validation commands. |
| R4 YAML frontmatter in every document | All documents. |
| R5 Readiness verdict and recommended direction | README, 01, 17. |
| R6 Agent coordination and uncertainty handling | 00. |
| R7 Executive summary with proxy/API/server-action risk | 01, 03. |
| R8 Feature brief and scope | 02. |
| R9 Source-backed codebase audit with exact refs | 03. |
| R10 Complete inventory of routes/actions/rate-relevant surfaces | 04. |
| R11 Abuse threat model | 05. |
| R12 Policy/limit matrix with hypotheses | 06. |
| R13 Architecture/provider design | 07. |
| R14 Cloudflare native plan with official docs refresh | 08. |
| R15 Future app limiter module plan | 09. |
| R16 Sequenced P0-P12 work packages | 10. |
| R17 Test and validation strategy | 11. |
| R18 Observability and operations | 12. |
| R19 Rollout/rollback/false positive plan | 13. |
| R20 Security/privacy/data retention | 14. |
| R21 Decisions D1-D12 and alternatives | 15. |
| R22 Final readiness review | 17. |
| R23 Completion audit with status and stop condition | 18. |
| R24 Specific concern: `src/proxy.ts`/API bypass | 00, 03, 01. |
| R25 Specific concern: scattered rate-limit code | 03, 04, 07, 09. |
| R26 Specific concern: in-memory state not durable | 03, 04, 06, 10. |
| R27 Specific concern: inconsistent IP/country headers | 03, 07, 14. |
| R28 Specific concern: DB-backed tradeoffs | 03, 07, 09. |
| R29 Specific concern: public proposal UX | 05, 06, 13, 17. |
| R30 Specific concern: high-frequency estimate editing | 04, 05, 06, 10, 11. |
| R31 Specific concern: uploads/exports expensive | 04, 05, 06, 10, 12. |
| R32 Specific concern: AI planned | 04, 05, 06, 10, 11. |
| R33 Specific concern: webhooks/internal jobs signatures/replay/idempotency | 04, 05, 10, 11, 15. |
| R34 Cloudflare migration coordination | README, 01, 07, 08, 17. |
| R35 Official docs and access date | 08. |
| R36 Validation commands included | 11, 18. |

## Gaps Carried Forward

| Gap | Why acceptable in planning package |
| --- | --- |
| No live traffic metrics | The app is preparing for first users; shadow rollout is required before threshold approval. |
| No provider mutation proof | This task is planning-only; Cloudflare production gates remain closed. |
| Server action inventory is grouped, not function-by-function | Route/action discovery is recorded; implementation P0 requires refreshed full classification before edits. |
| Current worktree has unrelated changes | Completion audit distinguishes package outputs from pre-existing repo state. |
