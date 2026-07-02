# 11 — Implementation Plan (Audit-pack — for FUTURE remediation)

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Verification mode: `emulated`

> **Scope note**: This is the implementation entrypoint for the **future remediation work** that should follow this audit pack's recommendations. The audit pack itself is docs-only. The future remediation is a SEPARATE implementation plan, opened after this audit pack ships. This doc defines the phasing for that future remediation.

## Implementation phases (for future remediation)

| Phase | Work | Surfaces | Dependencies | Verification gate |
|---|---|---|---|---|
| Phase 1 — D1 access centralization | Build `src/lib/cloudflare/d1-access/` module; codemod every Server Action + Route Handler to use it; per-table `workspace_id`/`owner_id` scoping | All action files (30), all route handlers touching D1 | None — starts here | `cf:d1-authz-matrix` full matrix + AC-011 |
| Phase 2 — Per-Action verdict completion | Audit every Server Action file for (auth, ownership, validator, idempotency, error contract); fill TBD rows in `08_*.md` | All action files | Phase 1 done | AC-012 complete |
| Phase 3 — Error envelope `{ok, data, error}` | Implement stable envelope across Route Handlers + Server Actions; introduce stable error `code` enum | All handlers | Phase 1 + 2 done | AC-002 + AC-003 |
| Phase 4 — Idempotency keys for mutations | Add idempotency-key flow for every mutation; conditional update OR transactional guard where insufficient | All mutations | Phase 3 done | AC-004 |
| Phase 5a — **BUILD WebSocket ticket surface (P0, ADV-P0-1, RISK-036)** | BUILD (not verify) an HMAC-signed, session-bound, ≤60s TTL, one-shot ticket mint+verify for `/__cloudflare/collaboration-room/:roomName`. Ticket is minted by the Next.js Server Action that mounts the WS client (after Better Auth session validation + workspace/project membership check), then verified in `routeCollaborationRoomRequest` BEFORE DO forwarding. Reject anonymous upgrades with 401. Design source: `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/23_D1_AUTH_REALTIME_REDESIGN_PLAN.md` §"Durable Objects Realtime Plan" (first required proof: "Room ownership and authorization before connection"). Proof spike: `27_PROOF_SPIKE_BACKLOG.md` §"P6: Durable Objects/WebSockets Realtime Proof". Architecture context: `22_FULL_CLOUDFLARE_NATIVE_TARGET.md` §"Target Architecture". | `src/lib/cloudflare/collaboration-room-router.ts`, `src/lib/cloudflare/collaboration-room.ts`, the Server Action that loads the collaboration page, `wrangler.jsonc` (secret binding for `COLLAB_ROOM_TICKET_SECRET` or reuse `BETTER_AUTH_SECRET`) | Phase 3 done | AC-013a + denial test (anonymous upgrade → 401; expired ticket → 401; replay/one-shot reuse → 401; cross-workspace room-name → 401) |
| Phase 5b — Credential-material module | Introduce `src/lib/auth/credentials/*` types per material C1..C12; codemod share/invite/WS mint (now the 5a ticket surface)/signed-URL to use them | auth, share, invite, DO, R2 | Phase 5a done | AC-013 |
| Phase 6 — Internal route secret gating | Verify all four `/api/internal/*` routes reject anonymous + verify `CRON_SECRET` and `UPLOAD_*_JOB_SECRET` rotation procedure | `src/app/api/internal/*/route.ts` (4) | None — parallel-safe with phase 1 | AC-007 |
| Phase 7 — DLQ alert | Implement Workers Observability alert OR scheduled scan of `archestimator-upload-jobs-dlq` | Queue DLQ | None — parallel-safe | AC-032 |
| Phase 8 — Observability sampling decision | Confirm or raise `head_sampling_rate`; add redaction helper; replace `console.log` with structured-logger OR justify | `wrangler.jsonc`, `worker.ts`, route handlers | Optional — parallel-safe | AC-033, AC-034 |
| Phase 9 — DMARC `p=reject` | DNS update; bounce-handling posture check; email content redaction helpers | DNS, email | Coordinate with Philip/ops | AC-021 |
| Phase 10 — Server Actions manifest | Auto-generate Server Action manifest; type-check gated on manifest drift | All Server Action files | Phase 2 done | AC-049 |
| Phase 11 — Adversarial test sweep | Add UltraQA scenarios from `19_*.md` to test suite | All | Phase 1-5 done | AC-042 |
| Phase 12 — Pre-existing RED triage | Per SRC-018, triage ~131 RED tests across 36 files; mark owners OR fix incrementally | tests/vitest | Phase 1-5 partial done | AC-041 |

## Per-phase durable-goal contract (per Creating-Plan-Prompt.md §4A ULTRAGOAL-style)

| Phase ID | Goal ID | Objective | Scope | REQs covered | Required evidence | Stop condition | Review gate | QA gate |
|---|---|---|---|---|---|---|---|---|
| Phase 1 | WP-001 | D1 access centralization | All action files (30) | REQ-ARCH-001, REQ-SEC-001 | cf:d1-authz-matrix full matrix | All action files use repository module | Phase 1 review (D1 + authz) | Phase 1 QA |
| Phase 2 | WP-002 | Per-Action verdict completion | All action files | REQ-SEC-002 | verdict table TBD→PASS/WARN/FAIL complete | All verdicts non-TBD | Phase 2 review | Phase 2 QA |
| Phase 3 | WP-003 | Error envelope | All handlers | REQ-API-002, REQ-API-003 | envelope test per handler | All handlers return `{ok,data,error}` | Phase 3 review | Phase 3 QA |
| Phase 4 | WP-004 | Idempotency keys | All mutations | REQ-API-004 | duplicate-submit test per mutation | All mutations idempotent | Phase 4 review | Phase 4 QA |
| Phase 5a | WP-005a | **BUILD WebSocket ticket surface (P0, ADV-P0-1, RISK-036)** | `collaboration-room-router.ts` + `collaboration-room.ts` + Server Action that mounts WS client + `wrangler.jsonc` secret | REQ-SEC-010, REQ-SEC-003 | (1) ticket-mint unit test; (2) ticket-verify unit test (reject anonymous, expired, replayed, cross-workspace); (3) live WS denial test: anonymous upgrade to `/__cloudflare/collaboration-room/:knownRoomName` returns 401 | Anonymous upgrade, expired ticket, replay/one-shot reuse, cross-workspace room-name ALL rejected with 401 | Phase 5a review (security lead) | Phase 5a QA (denial tests green) |
| Phase 5b | WP-005b | Credential-material module | auth + share + invite + DO + R2 | REQ-SEC-003 | type unit tests | All 12 materials typed distinctly | Phase 5b review | Phase 5b QA |
| Phase 6 | WP-006 | Internal secret gating | 4 internal routes | REQ-API-007 | denial test per route | All 4 reject anonymous | Phase 6 review | Phase 6 QA |
| Phase 7 | WP-007 | DLQ alert | Queue + Workers Observability | REQ-REL-002 | DLQ alerts document | Alert fires on simulated DLQ | Phase 7 review | Phase 7 QA |
| Phase 8 | WP-008 | Observability sampling decision | `wrangler.jsonc` | REQ-REL-003, REQ-REL-004 | observability dashboard + redaction helper | Sampling raised OR justification | Phase 8 review | Phase 8 QA |
| Phase 9 | WP-009 | DMARC `p=reject` | DNS, email | REQ-SEC-011, OPEN-006 | DNS TXT readback + bounce proof | `p=reject` live + bounce route works | Phase 9 review | Phase 9 QA |
| Phase 10 | WP-010 | Server Action manifest | All | REQ-ARCH-002 | manifest diff check | Manifest matches `grep` of `use server` | Phase 10 review | Phase 10 QA |
| Phase 11 | WP-011 | UltraQA adversarial tests | All | REQ-TEST-004, AC-042 | adversarial scenario matrix in test suite | At least 1 test per scenario | Phase 11 review | Phase 11 QA |
| Phase 12 | WP-012 | Pre-existing RED triage | tests/vitest | SRC-018, AC-041 | RED test ledger with owners | All ~131 REDs classified | Phase 12 review | Phase 12 QA |

## Parallelization (ULTRAWORK-style)

| Phase | Parallel-safe with | Sequential with | Shared-file risk |
|---|---|---|---|
| Phase 1 | Phase 6, 7, 8, 9 | None (foundational) | All action files |
| Phase 2 | Phase 6, 7, 8, 9 | Phase 1 | All verdict rows |
| Phase 3 | Phase 9 | Phase 1, 2 | All handlers |
| Phase 4 | Phase 9, Phase 10 | Phase 3 | Mutation handlers |
| Phase 5 | Phase 6, 9 | Phase 3 | auth, share, invite, DO, R2 |
| Phase 7 | All | None | n/a |
| Phase 8 | All | None | n/a |
| Phase 11 | All | Phase 4, 5 | tests/vitest |
| Phase 12 | All | Phase 1-5 partial | tests/vitest |

## Implementation order (recommended)

```
Phase 6 → Phase 7 → Phase 8 → Phase 9 (DNS only, separate cycle)
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
Phase 10 (after Phase 2)
Phase 11 (after Phase 4, 5)
Phase 12 (parallel with Phase 1-5)
```

12 phases over multiple sprints; each phase independently landable in a separate PR.

## Blocker condition per phase

| Phase | Blocker condition |
|---|---|
| Phase 1 | D1 access layer codemod fails on a Server Action touching multi-workspace scope (cross-workspace query needed for admin tools) |
| Phase 2 | Server Action has no auth check AND no caller — orphaned legacy code (delete vs preserve) |
| Phase 3 | Envelope causes client-side break in production route — phase the rollout per route |
| Phase 4 | Idempotency key strategy doesn't fit a mutation with side-effects (e.g., email send) — use Side Effects 1 ledger |
| Phase 5 | Credential material at raw form is currently shared by two surfaces — fix before phase proceeds |
| Phase 6 | Internal route currently allows anonymous — broken assumption; coordinate with Ops |
| Phase 7 | Cloudflare alerting rule limit hit; use scheduled scan as fallback |
| Phase 8 | Sampling rate raise causes billing issue — accept 0.1 + add external sink |
| Phase 9 | DMARC `p=reject` blocks legitimate traffic — accept `p=quarantine` transient + investigate DKIM/SPF |
| Phase 10 | Manifest auto-generation breaks on inline `"use server"` — generate per-file manifest |
| Phase 11 | Adversarial test fails — fix forward |
| Phase 12 | Pre-existing RED carries legitimate product bug — fix forward, mark P0 |

## Files explicitly off-limits to the FUTURE remediation

- `.ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/` (sibling UX audit pack)
- `.ai/03_plans/2026-06-29-Rate-Limiting/` (sibling rate-limit pack — owns SCE-* / RL-* IDs)
- Provider state (no fresh Cloudflare deploy, DNS, or GitHub without explicit owner authorization)

## Implementation execution gate (before remediation starts)

A future remediation agent MUST:

1. Re-read this audit pack in full.
2. Re-read `.ai/10_state/current-state.md` FAST PATH.
3. `git status --short --branch` confirm main branch.
4. `bun run type-check && bun run lint && bun run build` confirm green.
5. Run `bun run test:dom` to confirm pre-existing REDs are unchanged.
6. Confirm an independent reviewer is available (lift CONDITIONALLY READY → phase-ready).
7. For each phase: open a fresh dated plan pack at `.ai/03_plans/<YYYY-MM-DD>-API-Audit-Remediation-Phase-<n>/` and reference back to this audit pack's REQ-* / WP-* IDs.