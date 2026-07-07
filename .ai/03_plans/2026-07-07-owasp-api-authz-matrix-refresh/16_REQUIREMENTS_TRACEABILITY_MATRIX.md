# 16 — Requirements Traceability Matrix

| Requirement ID | Source | User Outcome | Impl Phase | Task IDs | Code Areas | Acceptance Criteria | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| REQ-MATRIX-01 | brief + repo | complete authz matrix | (this pack) | — | Doc 03 | every route/action row present | static review of Doc 03 | n/a | ✅ proven |
| REQ-TENANT-01 | repo | workspace isolation | — | — | `d1-access.ts`, repositories | probe before every read/write | d1-access-*, workspace-repository-authz-* | release gate | ✅ proven |
| REQ-CSRF-01 | repo (SEC-01) | invite origin holds | P0 | WP-01 | `invite-origin.ts:39` | POST stripped headers denied | invite-accept-origin.test.ts (flip) | closed-beta gate | ❌ gap |
| REQ-RATE-01 | repo | durable public limits | — | — | publication/privacy/AI/invite limits | 429 at threshold | lockout/limit tests | release gate | ✅ proven |
| REQ-RATE-02 | repo (SEC-03) | global estimate limit | P0 | WP-02 | `action-rate-limit.ts:38` | cross-isolate cap | new durable-limit test | closed-beta gate | ❌ gap |
| REQ-RATE-03 | owner (SEC-02) | edge abuse protection | P1 | WP-04 | `wrangler.jsonc` (if approved) | rule active + proof | provider proof | broad-launch gate | ❌ owner-gated |
| REQ-NEG-01 | brief | denial test per mutation | — | — | per-domain | denial asserted | Doc 12 inventory | release gate | ⚠️ partial |
| REQ-NEG-02 | repo | read-repo cross-tenant tests | P1 | WP-06 | new tests | outsider empty | new test files | broad-launch gate | ❌ gap |
| REQ-IDEMP-01 | repo | single-effect creates | P2 | WP-11 | per-create | dup → single effect | new tests | broad-launch | ⚠️ partial |
| REQ-BODY-01 | repo (SEC-06) | pre-parse body cap | P1 | WP-05 | share POST routes | 413 oversized | extend comment/decision tests | broad-launch | ❌ gap |
| REQ-VALID-01 | owner (SEC-06) | validation standard | P2 | WP-10 | trust boundaries | owner doc | n/a | broad-launch | ❌ owner-gated |
| REQ-CSP-01 | repo (SEC-07) | CSP hardening | P1 | WP-08 | `next.config.ts`, layout | nonce enforced | new csp test | broad-launch | ❌ owner-gated |
| REQ-DOCS-01 | brief | single matrix artifact | (this pack) | — | this pack | present | static | n/a | ✅ proven |
| REQ-DOCS-02 | brief | June audit superseded | P1 | WP-09 | June README | pointer present | static | n/a | ❌ gap |
| REQ-DEFENSE-01 | repo (SEC-05) | action-boundary auth | P1 | WP-07 | `recipient-proposals/actions.ts` + audit | action-layer auth | extend action test | broad-launch | ❌ gap |
| REQ-DO-01 | repo (SEC-04) | WS upgrade limit | P0 | WP-03 | `collaboration-room.ts` | upgrade limited | extend room-auth test | closed-beta gate | ❌ gap |
| REQ-SECRET-01 | repo | no raw creds | — | — | publication/security.ts | no raw storage | security tests | release gate | ✅ proven |
| REQ-RELEASE-01 | brief | release gate checklist | — | — | Doc 13 | all P0 + external | Doc 13 | release gate | ✅ (checklist) |

No requirement is untraced. Every implementation task (WP-01..12) maps to ≥1 requirement.
