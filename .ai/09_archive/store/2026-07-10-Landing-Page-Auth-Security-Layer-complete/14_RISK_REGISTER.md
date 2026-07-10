# 14 — Risk Register

| ID | Description | Trigger | Prob | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-1 | SEC-1 hashing breaks in-flight magic-link sign-in | Deploy straddles a 5-min token window | Med | Low (user re-requests link) | Med | Magic-link auth | User reports sign-in failure | Deploy-window guidance (Task 1.4) | n/a | User requests a fresh link | Owner | Low | Open |
| RISK-2 | `storeToken:"hashed"` verify path differs from expectation | Better Auth version/plugin internals differ | Low | High (auth broken) | High | All auth | type-check + test before deploy | Task 1.1 source read first | Revert config (1-line) | Revert + reinvestigate | Impl | Low (after 1.1) | Open |
| RISK-3 | Repository authz probes add D1 load on hot paths | Phase 2 adds probe to estimate sheet reads | Med | Med (latency) | Med | Estimate performance | Query-count probe | Prefer Option B (typed context) where caller is authoritative | Revert probe, keep caller-side | Revert | Impl | Low–Med | Open |
| RISK-4 | Better Auth rate limiter unreliable on Workers (in-memory, per-isolate) | SEC-5 relies on BA default limiter | Med | Med (abuse under-bound) | Med | Magic-link/OAuth abuse | Rate-limit test inconsistent across isolates | Confirm D1/KV-backed adapter; else fall back to Cloudflare WAF rate-limit | WAF fallback | Enable WAF rate-limit rule | Impl | Med | Open |
| RISK-5 | Enforced CSP breaks workshop inline scripts | SEC-6 switches to enforce | Med | High (broken UI) | High | Workshop UI | CSP violation in canary | Task 4.1 log review + nonce infra first | Keep Report-Only, defer | Revert to Report-Only | Owner | Med | Open |
| RISK-6 | Concurrent agent edits same auth file during impl | Shared worktree | Med | Med (conflict) | Med | `better-auth-cloudflare.ts` | `git status` before edit | File-scope ownership declaration | Re-read + merge | Serialize edits | Impl | Low | Open |
| RISK-7 | BA core schema drift (runtime-applied, not in migrations) | BA version upgrades regenerate different DDL | Low | Med | Med | Auth tables | SEC-7 readiness gate | Documented contract + gate | Manual re-apply | Fix-forward | Impl | Low–Med | Open |
| RISK-8 | Closed-beta allowlist bypass if `CLOSED_BETA_ACCESS_ENABLED` unset | Env misconfiguration | Low | High (open signup) | High | Auth gating | Config audit | Confirm env in hosted | Set the flag | Set flag + audit | Owner | Low (if env correct) | Open |
| RISK-9 | `ARCHESTIMATOR_AUTH_PROVIDER` unset in production → fallback path | Env unset | Low | High (auth provider disabled) | High | All auth | Config audit | Confirm env in hosted | Set the env | Set env | Owner | Low (if env correct) | Open |
| RISK-10 | Cookie-cache-disabled D1 read cost scales with users | User growth | Low (closed beta) | Low–Med | Low–Med | D1 cost/latency | D1 metrics | Monitor; revisit cookie-cache if needed | Re-enable cache w/ short TTL | Separate decision | Owner | Low | Open |
| RISK-11 | OAuth state cookie ordering quirk regresses on Cloudflare change | Cloudflare cookie handling changes | Low | Med (OAuth breaks) | Med | Google OAuth | OAuth sign-in fails | `normalizeOAuthCallbackRequest` + mismatch cleanup | Re-normalize | Patch normalization | Impl | Low | Open |
| **RISK-12** | SEC-11 (session-hash) has no clean BA config path | RFU-1 finds BA can't hash session tokens | Med | High (residual verifier-compromise risk) | High | Session at rest | SEC-10/11 proof | RFU-1 first | Fall back to compensating controls (DEC-6b: tight D1 access + short TTL + IP/UA binding) | Owner accepts risk OR custom override | Impl+Owner | Med–High | Open |
| RISK-13 | SEC-14 accountLinking default is unsafe (auto-merge) | RFU-2 finds BA auto-merges magic-link+Google | Low–Med | High (ATO/lockout) | High | Account integrity | ATO test (Chain 5) | Closed-beta curation | Set `accountLinking:{enabled:false}` | Disable merge | Impl | Low (if RFU-2 confirms safe) | Open |
| RISK-14 | SEC-12 Cloudflare retains token in logs | RFU-4 finds Workers Logs keeps `?token=` | Med | Med (5-min window) | Med | Magic-link | Logs query | 5-min TTL | Accept risk + short TTL | Shorten TTL + redact | Impl | Low–Med | Open |
| RISK-15 | SEC-13 removing BETTER_AUTH_SECRET fallback breaks envs | Env doesn't set separate secrets | Med | Med (terms/publication cookies break) | Med | Terms/Publication | Cookie errors | Staged deploy w/ new envs first | Re-add fallback | Restore fallback | Impl | Low | Open |
| RISK-16 | Email bombing (SEC-5) floods victim inbox + Email quota | No durable per-identifier rate limit | Med | Med (abuse + cost) | Med | Magic-link delivery | Inbox/quota monitoring | D1/KV rate limit OR WAF | WAF fallback | Enable WAF rule | Impl+Owner | Med | Open |

## Highest-priority risks to manage

1. **RISK-2** (verify path) — mitigated by Task 1.1 reading source first.
2. **RISK-8/9** (env config) — not code; confirm hosted env has the flags set.
   These are operational, owner-owned.
3. **RISK-5** (CSP break) — only applies if SEC-6 is pursued; can be deferred.
