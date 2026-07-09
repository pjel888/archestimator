# 12 — Test and Validation Strategy

## Testing philosophy (proportional)

Per repo verification policy: use the lightest proof that proves the claim.
Auth/security claims require denial tests + hosted proof (not just type-check).

## Test Execution Matrix

| Req | Test file path | Test type | New/existing | Fixture/data setup | Command | Expected evidence | Known reds | Owner |
|---|---|---|---|---|---|---|---|---|
| SEC-1 | `src/lib/auth/__tests__/magic-link-hashing.test.ts` | unit | new | mock magicLink config | `bun run test -- magic-link-hashing` | config includes `storeToken:"hashed"` | none | impl agent |
| SEC-1 | hosted readback | provider proof | new | live magic-link on hosted | `wrangler d1 execute` query on `verification` | `identifier` is hash, not raw token | none | impl agent + owner |
| SEC-2 | `src/lib/auth/__tests__/access-control-denial.test.ts` | unit/integration | new | no-session mock | `bun run test -- access-control` | all protected surfaces reject | none | impl agent |
| SEC-3 | `src/lib/repositories/__tests__/*-authz.test.ts` | unit | new | unauthorized caller fixture | `bun run test -- repositories` | empty/403 for unauthorized | none | impl agent |
| SEC-4 | `src/lib/recipient-proposals/__tests__/actions.test.ts` | unit | new | no-session mock | `bun run test -- recipient-proposals` | action redirects | none | impl agent |
| SEC-5 | `src/lib/auth/__tests__/rate-limit.test.ts` | unit | new | 11 rapid requests | `bun run test -- rate-limit` | 11th blocked | depends on adapter | impl agent |
| SEC-6 | manual + browser | browser | new | workshop session | Playwright (if available) | no CSP violations when enforced | none | impl agent |
| ARCH-1 | `src/lib/auth/__tests__/exclusivity.test.ts` | unit/static | new | grep config | `bun run test -- exclusivity` | no emailAndPassword plugin | none | impl agent |

## Commands (verify against package.json before use)

```bash
bun run type-check
bun run test                    # or focused: bun run test -- <pattern>
bun run validate:error-handling # static gate
bun run lint
git diff --check
```

## UltraQA-style adversarial scenario matrix

| ID | User/attacker model | Scenario | Setup | Expected signal | Status |
|---|---|---|---|---|---|
| QA-1 | Anonymous | GET /workshop/projects | no cookie | 307 → /login | Phase 5 |
| QA-2 | Anonymous | POST to estimate Server Action | no session | redirect/throw | Phase 5 |
| QA-3 | Anonymous | GET /api/projects/:id | no session | 401/403 | Phase 5 |
| QA-4 | Auth user A | GET project owned by user B | valid session A | 403 (canAccess fails) | Phase 5 |
| QA-5 | DB-read attacker | read verification table post-SEC-1 | D1 readback | identifier is hash | Phase 1.5 |
| QA-6 | Flooder | 11 magic-link requests in 60s | repeated POST | 11th rate-limited | Phase 3 |
| QA-7 | CSRF attacker | cross-site POST to Server Action | wrong origin | rejected | (Next.js default) |
| QA-8 | CSRF attacker | cross-site POST to share comment | wrong origin | 403 (assertSameOrigin) | (existing) |
| QA-9 | Tamperer | modify session cookie value | tampered cookie | getSession → null → redirect | (existing) |
| QA-10 | Replay | click consumed magic-link twice | one-shot | 2nd fails | (existing) |
| QA-11 | Open-redirect | /login?next=//evil.com | malicious next | sanitized, stays on-origin | (existing) |
| QA-12 | XSS | inject script in estimate note | payload | CSP blocks (post-SEC-6) | Phase 4 |
| QA-13 | Dev-bypass in prod | set dev-auth header in production | prod env | ignored (non-prod gate) | (existing) |
| QA-14 | Internal route | POST /api/internal/upload-scan no secret | no bearer | 503/401 | (existing) |

## Performance evaluator contract

Auth changes are low-performance-risk, but note:
- **Cookie-cache disabled** means a D1 read on every authenticated request. This
  is a known trade-off (security over latency). Not introduced by this plan.
  If D1 read latency becomes a measured issue, reconsider cookie-cache with a
  short TTL — but that's a separate decision, not in scope.
- **Phase 2 authz probes** add up to 1 D1 read per repository call. For hot paths
  (estimate sheet), measure whether the probe duplicates a caller-side check;
  if so, prefer Option B (typed context) to avoid the extra read.
- **Evaluator:** `bun run test` timing + (if needed) a D1 query-count probe.
  No separate perf harness required for this plan.

## What validation is intentionally skipped

- **Browser proof for phase 1/2/3:** cookie persistence and redirects are proven
  by existing tests + the fact that we're changing config, not transport. Browser
  proof IS required for phase 4 (CSP) per the repo's proportional policy.
- **Broad `bun run validate`/`build`:** reserved for the P0 (phase 1) where a
  full build confirms no auth-config break. Other phases use focused tests.
