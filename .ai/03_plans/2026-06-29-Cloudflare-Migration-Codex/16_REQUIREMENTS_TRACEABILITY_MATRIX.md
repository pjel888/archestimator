---
title: Requirements Traceability Matrix
plan_id: 2026-06-29-cloudflare-migration-codex
document: 16
---

# Requirements Traceability Matrix

| Requirement | Covered in | Future proof |
| --- | --- | --- |
| R-001 Launch readiness preserved | 01, 03, 10, 12, 17 | Slice-specific launch checks |
| R-002 Hybrid allowed | 01, 06, 15 | Cost model and architecture review |
| R-003 Usage-based cost | 01, 20 | Cost workbook |
| R-004 Front-door separable | 06, 11, 13 | Front-door rollout/rollback proof |
| R-005 Workers sidecars first | 06, 11 | Worker sidecar proof |
| R-006 D1 gated | 07, 12, 21 | D1 compatibility matrix |
| R-007 Better Auth gated | 08, 12, 21 | Auth parity proof |
| R-008 KV eventual consistency | 06, 08, 20, 21 | Cache correctness tests |
| R-009 R2 pilot | 06, 11, 12, 13, 21 | Storage auth/rollback proof |
| R-010 Queues pilot | 06, 11, 12, 13, 21 | Queue idempotency proof |
| R-011 Hyperdrive scoped | 06, 07, 20, 21 | Worker-to-Postgres latency proof |
| R-012 Email evaluated separately | 03, 12, 20, 21 | Email deliverability/webhook proof |
| R-013 Realtime replacement explicit | 03, 06, 10, 21 | Realtime architecture proof |
| R-014 WAF/rate-limit planned | 08, 11, 13, 20 | Security event proof |
| R-015 Rollback required | 12, 13, 17 | Rollback rehearsal |
| R-016 Provider proof replaced | 03, 12, 18 | New readiness scripts |
| R-017 Prompt updated | Prompt changes outside plan folder | `Improve-Plan-Prompt.md` and `Multi-Agent-Execution-Directive.md` diffs |
| R-018 Cloudflare source refresh | 00, 06, 09, 11, 12, 18, 19, 20 | Execution-date docs/changelog/schema refresh |
| R-019 Worker toolchain proof | 06, 08, 09, 11, 12, 18, 21 | Wrangler config/types/runtime proof |

## User Story Traceability

| Story | Requirements | Validation |
| --- | --- | --- |
| U-001 Cost comparison | R-003 | Cost workbook |
| U-002 Auth/workshop | R-001, R-007, R-014 | Auth proof, protected route tests |
| U-003 Data correctness | R-006, R-015, R-016 | DB/provider proof |
| U-004 Collaboration | R-013 | Realtime proof |
| U-005 Share links | R-001, R-014, R-015 | Share route tests, cache proof |
| U-006 Uploads | R-009, R-010, R-015 | R2/Queues proof |
| U-007 Jobs | R-010, R-016 | Queue proof |
| U-008 Email | R-012 | Email proof |
| U-009 Rollback | R-015 | Rollback rehearsal |

## Unresolved Traceability Gaps

GAP-001: Current usage/spend is not present in repo evidence. Cost savings cannot be claimed.

GAP-002: D1 compatibility cannot be resolved without schema/RPC/RLS deep mapping.

GAP-003: Better Auth compatibility cannot be resolved without an auth proof.

GAP-004: Realtime replacement is not covered by the user's listed Cloudflare primitives.

GAP-005: Next-on-Workers fidelity cannot be resolved without a preview build and route proof.
