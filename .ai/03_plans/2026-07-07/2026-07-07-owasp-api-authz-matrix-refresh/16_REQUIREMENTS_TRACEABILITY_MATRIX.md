# 16 — Requirements Traceability Matrix

Columns (Improve-Plan-Prompt mandated schema):
`Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision`

Source-strength legend: `brief` (PROMPT.md), `repo evidence` (current source), `official docs`, `derived`, `owner-delegated`.

| Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|---|
| SRC-01 | REQ-MATRIX-01 Complete authz decision table covers every route/action | PROMPT.md "endpoint inventory, auth/authz decision table" + `find src/app -name route.ts` = 33 routes, `rg '"use server"'` = 30 modules | brief + repo evidence | Doc 03 B/H + Doc 20 §I | — (this pack) | routes: 33/33 with file:line verdicts (proven); actions: domain-grouped pattern coverage, NOT per-export file:line | static review of Doc 03 | LOW | ⚠️ PARTIAL — routes proven; actions domain-grouped not per-action | honest scope note Doc 03 §I; full per-action appendix is a separate deliverable |
| SRC-02 | REQ-TENANT-01 Workspace isolation on every authenticated read/write | `src/lib/authz/d1-access.ts`; `workspace-repository.ts` `ensureDefaultWorkspace` | repo evidence | Doc 03 F, Doc 07, Doc 08 | — | probe before every read/write; cross-tenant denial tests pass | `d1-access-role-boundaries`, `workspace-repository-authz-*` | LOW | ✅ PROVEN | REQ-NEG-02 extends read-repo tests |
| SRC-03 | REQ-CSRF-01 Invite origin gate fails closed on stripped headers | `src/lib/collaboration/invite-origin.ts:39` returns true on absent | repo evidence | Doc 01 SEC-01, Doc 08 T-01, Doc 11 WP-01 | WP-01 | POST no Origin+Referer → denied; GET unchanged | PROOF-01/02/03 | MED (SEC-01 demoted) | ❌ GAP (P0) | — |
| SRC-04 | REQ-RATE-01 Durable rate limiting on public surfaces | `public-repository.ts` 11 scopes; `compliance-privacy-request-route` | repo evidence | Doc 03 E, Doc 07 | — | 429 at threshold | PROOF-11 + lockout tests | LOW | ✅ PROVEN | — |
| SRC-05 | REQ-RATE-02 Estimate mutation global rate limit | `action-rate-limit.ts:20,38` in-memory Map | repo evidence | Doc 01 SEC-03, Doc 11 WP-02 | WP-02 | cross-isolate cap enforced | PROOF-04/05 | MED (SEC-03) | ❌ GAP (P0) | — |
| SRC-06 | REQ-RATE-03 Edge/WAF abuse protection decision | `wrangler.jsonc` no waf/rate_limit binding | repo evidence + owner | Doc 01 SEC-02, Doc 11 WP-04 | WP-04 | rule active + provider proof OR owner defer | PROOF-14 + wrangler | HIGH-broad/MED-beta | ❌ OWNER-GATED | OPEN-01 |
| SRC-07 | REQ-NEG-01 Negative test per mutation | PROMPT.md "negative tests" + Doc 12 inventory | brief + repo evidence | Doc 12 | — | denial asserted per mutation | Doc 12 inventory | MED | ⚠️ PARTIAL | gaps in REQ-NEG-02 |
| SRC-08 | REQ-NEG-02 Read-repo cross-tenant denial tests | Doc 12 coverage gaps (activity/charts/publisher/notifications) | derived | Doc 11 WP-06 | WP-06 | outsider empty/denied | PROOF-08 | LOW–MED | ❌ GAP (P1) | — |
| SRC-09 | REQ-IDEMP-01 Idempotency on replayable creates | `actions.ts` bulk has hash+correlationId; single creates replayable | repo evidence | Doc 07, Doc 11 WP-11 | WP-11 | dup submit → single effect OR documented | new tests | LOW | ⚠️ PARTIAL (P2) | — |
| SRC-10 | REQ-BODY-01 Pre-parse body cap on public JSON POSTs | share POSTs use `request.json()` w/o pre-cap (post-parse clamps only) | repo evidence | Doc 01 SEC-06, Doc 11 WP-05 | WP-05 | 413 oversized before parse | PROOF-07 | LOW–MED | ❌ GAP (P1) | — |
| SRC-11 | REQ-VALID-01 Centralized validation decision (zod vs hand-rolled) | zero `from "zod"` in src/ | repo evidence + owner | Doc 01 SEC-06, Doc 11 WP-10 | WP-10 | owner doc | n/a | LOW | ❌ OWNER-GATED | OPEN-03 |
| SRC-12 | REQ-CSP-01 CSP hardening roadmap | `next.config.ts` unsafe-inline/eval; Report-Only except /share | repo evidence + owner | Doc 01 SEC-07, Doc 11 WP-08 | WP-08 | nonce enforced on /workshop + /api/auth | PROOF-13 | MED-broad/LOW-beta | ❌ OWNER-GATED | OPEN-02 |
| SRC-13 | REQ-DOCS-01 Single current authz matrix artifact | PROMPT.md | brief | this pack | — | present | static | LOW | ✅ PROVEN | — |
| SRC-14 | REQ-DOCS-02 June audit marked superseded | PROMPT.md "do not rely on older June audit" | brief + repo evidence | Doc 11 WP-09 | WP-09 | pointer present in June README | static | LOW | ❌ GAP (P1) | June README already has a guardrail; add specific pointer |
| SRC-15 | REQ-DEFENSE-01 Action-boundary authz consistency | `recipient-proposals/actions.ts:8` no action auth; `maybeTriggerSharedLinkActivityDigest:1968` caller-authorized | repo evidence | Doc 01 SEC-05/11, Doc 11 WP-07/13 | WP-07/13 | action-layer auth present OR documented+contract test | PROOF-09 | LOW–MED | ❌ GAP (P1) | SEC-11 added in audit |
| SRC-16 | REQ-DO-01 WebSocket upgrade DoS mitigation | `collaboration-room.ts:94` accept before auth | repo evidence | Doc 01 SEC-04, Doc 11 WP-03 | WP-03 | upgrade limited or token-gated | PROOF-06 | MED | ❌ GAP (P0) | — |
| SRC-17 | REQ-SECRET-01 No raw credentials stored; rotation invalidates | `publication/security.ts` HMAC/scrypt/AES; credentialVersion | repo evidence | Doc 03 C, Doc 08 | — | no raw columns; rotation invalidates cookies | PROOF-12 | LOW | ✅ PROVEN | — |
| SRC-18 | REQ-RELEASE-01 Release gate checklist | PROMPT.md "release gates" | brief | Doc 13 | — | all P0 + external status | PROOF-14 | MED | ✅ (checklist) | external GitHub-control gap recorded |
| SRC-19 | REQ-DOC-03 (new) R2 signed-URL invariant + origin-source reconciliation | retracted SEC-08 / `r2-storage-provider.ts`; `ARCHESTIMATOR_ALLOWED_APP_ORIGINS` 4 consumers | repo evidence (audit correction) | Doc 01 SEC-09/10, Doc 11 WP-12 | WP-12 | invariant documented; **do NOT remove** env var | static | LOW | ❌ GAP (P2) | retraction of SEC-08 (Doc 20 ADV-01) |

**No requirement is untraced.** Every work item (WP-01..13) maps to ≥1 Source ID. Every
Source ID has source evidence + source strength + acceptance + proof path + status.
