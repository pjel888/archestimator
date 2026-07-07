# 12 — Test and Validation Strategy

## Repository-native commands (verified against `package.json` / repo conventions)
- `bun run type-check`
- `bun run lint` (and `bun run lint:design-system` for UI)
- `bun run test` / focused `bunx vitest run <file> --maxWorkers=1`
- `bun run test:dom` (React Testing Library)
- `bun run build` (broad, only when risk justifies)
- Targeted Playwright only for browser-only claims (cookie persistence, redirect, focus).
- `bun run validate:agents` (agent surface, not relevant here)

Per AGENTS.md proportional verification: P0 security findings → targeted tests + the
focused files; broad `validate`/`build` only for shared/auth/data-integrity changes.

## Test execution matrix (requirement → evidence)

| Requirement | Test file path | Type | Existing/new | Fixture | Command | Expected evidence | Pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| REQ-CSRF-01 (invite origin) | `tests/vitest/invite-accept-origin.test.ts` | unit | existing (flip assertion) | mocked request | `bunx vitest run tests/vitest/invite-accept-origin.test.ts` | POST stripped headers → denied | none | impl |
| REQ-TENANT-01 | `d1-access-role-boundaries.test.ts`, `workspace-repository-authz-*.test.ts` | unit | existing | D1 mock | focused vitest | outsider denied | none | — |
| REQ-RATE-01 | `project-publication-password-lockout-route.test.ts`, `compliance-privacy-request-route.test.ts` | unit | existing | D1 mock | focused | 429 at threshold | none | — |
| REQ-RATE-02 (estimate) | new `estimate-action-rate-limit-durable.test.ts` | unit | new | two-isolate sim | focused | combined cap enforced | none | impl |
| REQ-RATE-03 (edge) | n/a | provider proof | new | wrangler config | `wrangler` dry-run | rule active | — | owner |
| REQ-NEG-01 | per-domain denial tests (Doc 03 coverage column) | unit | existing | D1 mock | focused | denial per mutation | none | — |
| REQ-NEG-02 | new `project-activity-cross-tenant.test.ts`, `notifications-cross-tenant.test.ts`, etc. | unit | new | D1 mock | focused | outsider empty | none | impl |
| REQ-IDEMP-01 | new per-create tests | unit | new | — | focused | dup submit single effect | none | impl |
| REQ-BODY-01 | extend `project-publication-comments.test.tsx`, `decision.test.tsx` | unit | existing+new | large body | focused | 413 on oversized | none | impl |
| REQ-VALID-01 | n/a | decision | — | — | — | owner doc | — | owner |
| REQ-CSP-01 | new `csp-nonce-enforcement.test.ts` | unit/static | new | — | focused | nonce enforced | none | impl |
| REQ-DOCS-02 | doc check | static | new | — | `git diff` | pointer present | — | impl |
| REQ-DEFENSE-01 | extend `recipient-proposals-action.test.ts` | unit | existing+new | — | focused | action-layer auth present | none | impl |
| REQ-DO-01 | extend `cloudflare-collaboration-room-auth.test.ts` | unit | existing+new | DO mock | focused | upgrade limited | none | impl |
| REQ-SECRET-01 | `project-publication-security.test.ts`, `cookie-credential-version.test.ts` | unit | existing | — | focused | no raw storage | none | — |
| REQ-RELEASE-01 | Doc 13 checklist | manual | new | — | — | all P0 + external status | — | owner |

## Existing negative/denial test inventory (strong coverage)

- **D1 access predicates:** `d1-access-role-boundaries.test.ts`, `d1-access-whole-project.test.ts`,
  `d1-access-created-by.test.ts`, `workspace-repository-authz-{contract,behavior,batched,estimate-scoped-access}.test.ts`.
- **Estimate sheet actions:** `estimate-sheet-actions-authz.test.ts`, `estimate-insert-target-authz.test.tsx`,
  `estimate-action-estimate-scoped-context.test.ts`.
- **Publication surface:** `project-publication-password-lockout-route.test.ts`,
  `csrf-origin-denial.test.ts`, `project-publication-comments.test.tsx`, `project-publication-decision.test.tsx`,
  `project-publication-security-hardening.test.ts`, `security-findings-publication-contracts.test.ts`.
- **Collaboration:** `workspace-collaboration-summary-authz.test.ts`,
  `cloudflare-collaboration-room-auth.test.ts`, `realtime-identity-actions-authz.test.ts`,
  `project-invite-entry-schema.test.ts`, `project-invite-feature-flag.test.ts`,
  `invite-accept-origin.test.ts`.
- **Library/template:** `library-viewer-authz.test.tsx`, `template-editor-actions-authz.test.ts`,
  `library-route-state-authz.test.tsx`.
- **Publisher RBAC:** `publisher-rbac.test.ts`.
- **Beta admin:** `beta-admin-action-boundaries.test.ts`, `closed-beta-allowlist-admin.test.ts`.
- **Compliance/privacy:** `compliance-privacy-request-route.test.ts` (body cap + atomic reserve+rollback).
- **Uploads:** `auth-sensitive-api-boundaries.test.ts` (rejects before body parse on auth fail).

## Coverage gaps (drives REQ-NEG-02 + others)
1. Project activity feed / charts / publisher activity / notifications repositories —
   no dedicated cross-workspace denial behavioral test (rely on upstream gate).
2. Proposal export rate-limit 429 path not asserted in a named test.
3. AI package-builder cross-tenant denial is contract-only, not behavioral.
4. Mass-delete per-estimate `canEditEstimateInD1` blocking not independently tested for
   cross-tenant estimate ids.

## UltraQA-style adversarial scenario matrix (for future implementation)

| ID | User/attacker | Scenario | Setup | Harness | Expected | Status |
|---|---|---|---|---|---|---|
| AQ-01 | cross-site attacker | POST `/invite/<token>/accept` no Origin/Referer | stripped headers | unit | denied (post WP-01) | pending |
| AQ-02 | anonymous | parallel password guesses across IPs | 6 IPs × 5 guesses | integration | each IP locked at 5 | verified |
| AQ-03 | authenticated non-member | GET estimate in other workspace | outsider session | unit | opaque deny | verified |
| AQ-04 | recipient of pub A | comment on pub B | session cookie of A | unit | denied (SEC-06) | verified |
| AQ-05 | attacker | oversized JSON to `/api/share/<token>/comment` | 1MB body | unit | 413 (post WP-05) | pending |
| AQ-06 | attacker | flood estimate mutations across isolates | 2 limiter instances | unit | combined cap (post WP-02) | pending |
| AQ-07 | attacker | many WS upgrades to a room | N opens | unit | limited (post WP-03) | pending |
| AQ-08 | authenticated | replay project create | double submit | unit | single effect (post WP-11) | pending |
| AQ-09 | recipient | use expired publication token | expired row | unit | unavailable | verified |
| AQ-10 | attacker | OAuth state mismatch | mismatched state cookie | worker test | Clear-Site-Data reset | verified |

Pending items map to implementation tasks. Verified items have existing tests.

## What is NOT acceptable as validation
- "Manual QA" without exact steps, actor, setup, expected observations, pass/fail.
- Claiming DoS readiness from ordinary tests (cross-isolate test is the SEC-03 evaluator).
- Claiming provider/edge proof from local-only checks (SEC-02 needs wrangler/provider proof).
- Claiming GitHub hosted-control readiness from local checks (external gap).
