# 13 — Rollout, Rollback, and Operations

## Rollout sequence (per phase)

### Phase 1 (P0 — SEC-1): hash magic-link tokens

1. Task 1.1: read BA source, confirm verify path (gated — stop if false).
2. Task 1.2: add `storeToken:"hashed"` (1-line).
3. Task 1.3: update proof fixture.
4. `bun run type-check` + focused test + `bun run build` (P0 justifies full build).
5. Deploy (low-traffic window per DEC-3).
6. Task 1.5: hosted proof — D1 readback (hashed) + wrangler tail (sign-in works).
7. Monitor sign-in success rate for 1 hour.

**Release gates (blocks production rollout):**
- ✅ Task 1.1 source confirmation
- ✅ type-check + test + build green
- ✅ hosted proof: hashed token + working sign-in
- ✅ no spike in auth-failure logs post-deploy

### Phase 2: defense-in-depth (parallel-safe, per-repo)

1. Per-repo: add authz probe or typed context.
2. Focused unit test per repo.
3. `bun run test` for affected areas.
4. Deploy incrementally (per-repo PRs landable independently).

**Release gates:** type-check + repo tests green; grep audit confirms no action lacks authz.

### Phase 3: rate limits

1. Task 3.1: confirm BA rate-limit adapter backing (D1/KV vs in-memory).
   - If in-memory only → fall back to Cloudflare WAF rate-limit rule (RISK-4).
2. Task 3.2: explicit magic-link config.
3. Rate-limit denial test.
4. Deploy; monitor for legitimate-user lockouts (raise threshold if needed).

**Release gates:** rate-limit test green; no legitimate lockout spike.

### Phase 4: CSP (optional, owner-gated)

1. Collect Report-Only violations (Task 4.1).
2. If violations → nonce infra (Task 4.2).
3. Canary enforced CSP (Task 4.3).
4. Browser proof on core workshop flows.

**Release gates:** canary shows no CSP violations on core flows. **Rollback trigger:** any workshop flow breaks → revert to Report-Only.

### Phase 5: proof harness

1. Land denial/role/exclusivity/cookie tests.
2. Run hosted gates (`cf:release-gates` with production-required flag).

## Rollback procedures

| Phase | Trigger | Procedure | Data impact |
|---|---|---|---|
| 1 | Sign-in breaks post-deploy | Revert the 1-line config (`storeToken:"hashed"` → remove) | None (hashing is forward-only; plaintext resumes) |
| 2 | Repository authz breaks a flow | Revert the specific repo change | None |
| 3 | Rate limit locks out users | Revert config OR raise threshold | None |
| 4 | CSP breaks workshop | Revert to Report-Only | None |
| 5 | n/a (test-only) | n/a | None |

**All rollbacks are config/code reverts — no data migration, no destructive action.**

## Observability

- **Auth failures:** Cloudflare Workers Logs / `wrangler tail` (hosted). Local
  `logs/dev.ndjson` for dev.
- **Rate-limit denials:** monitor post-phase-3.
- **CSP violations:** Report-Only header reports (pre-phase-4) → enforced (post).
- **Account security events:** `account_security_events` D1 table (audit trail).
- Run `bun run ops:agent-debug-snapshot` for the readiness picture; hosted auth
  issues use Workers Logs (local logs are NOT hosted proof).

## Operational checks (owner-owned, not code)

| Check | Why |
|---|---|
| Hosted env has `ARCHESTIMATOR_AUTH_PROVIDER=better-auth` | Without it, auth provider disabled (RISK-9) |
| Hosted env has `CLOSED_BETA_ACCESS_ENABLED=true` (if beta curation desired) | Without it, open signup (RISK-8) |
| Hosted env has `BETTER_AUTH_SECRET` (≥32 chars) | Without it, provider returns 503 |
| Hosted env has Google OAuth client ID/secret | Without it, Google sign-in unavailable |
| `BETTER_AUTH_TRUSTED_ORIGINS` / `ARCHESTIMATOR_ALLOWED_APP_ORIGINS` set correctly | Origin validation |

## Post-release verification

- Phase 1: 1-hour sign-in success-rate watch.
- Phase 3: 24-hour rate-limit-denial review (legitimate vs abuse).
- Phase 4 (if pursued): 1-week workshop-functionality watch post-enforcement.
