# Decisions, Assumptions, and Alternatives

## Major decisions

### DEC-01 — Keep one aggregated activity route; tighten the contract
- **Problem.** The activity route aggregates comments, decisions, events, display names, metadata. Split vs tighten?
- **Constraints.** Single consumer pattern today; lower surface area is better.
- **Options.** (A) Split into `/comments`, `/decisions`, `/events` GETs; (B) keep one route, tighten the DTO.
- **Advantages of A:** smaller per-response payloads. **Disadvantages:** more routes to gate/version/test; more client waterfalls; contradicts the single-consumer reality.
- **Advantages of B:** minimal surface; one contract; matches owner-feed pattern.
- **Recommended:** B.
- **Reason:** One route with a tight allow-list contract is the smaller attack surface and matches the current single consumer.
- **Consequences:** Future recipient-facing UI builds against one contract.
- **Conditions to revisit:** if a recipient UI needs per-type pagination independent of others.

### DEC-02 — Allow-list facts filter (SEC-03)
- **Problem.** Deny-list regex is pattern-fragile.
- **Options.** (A) deny-list (current); (B) allow-list keyed off `events/route.ts:17` + row coords.
- **Recommended:** B.
- **Reason:** Allow-list fails closed; future metadata keys don't leak by default.

### DEC-03 — Stop selecting `author_email`/recipient `email` in public reads
- **Problem.** Over-fetch of PII.
- **Options.** (A) keep over-fetch (defense via DTO); (B) drop from SELECT.
- **Recommended:** B.
- **Reason:** Least-data at the SQL boundary; defense in depth.

### DEC-04 — Route-level privacy tests (not just composer)
- **Problem.** PROMPT.md: source-only inspection is insufficient.
- **Options.** (A) rely on composer tests + string-contract; (B) add route-handler tests.
- **Recommended:** B.
- **Reason:** Route wiring is where gating/scoping/pagination actually happen.

### DEC-05 — Extend retention to share content (DATA-01)
- **Problem.** Indefinite retention of comments/responses/recipients.
- **Options.** (A) status quo; (B) add rules with owner-signed TTLs.
- **Recommended:** B.
- **Reason:** Data-lifetime minimization; supports first-users privacy posture.

### DEC-06 — Hash recipient email at rest? NO (DATA-03)
- **Problem.** Recipient email is the highest-sensitivity PII.
- **Options.** (A) hash at rest; (B) plaintext + retention + minimization.
- **Recommended:** B.
- **Reason:** Email-matched proposals view (`recipient-proposals-repository.ts`) requires plaintext join. Privacy via retention (DEC-05) + minimization (DEC-03), not hashing.
- **Conditions to revisit:** if the proposals-view feature is removed, revisit hashing.

### DEC-07 — Owner-gated hardening is separate (Phases 3/6/7)
- **Problem.** P1 findings (lockout, Turnstile, secret split, session revocation) need owner input.
- **Options.** (A) bundle into minimization; (B) separate owner-gated phases.
- **Recommended:** B.
- **Reason:** Minimization (Phases 1-2/4-5) is internally resolvable and security-positive; bundling owner-gated work would block it.

## Assumptions

| ID | Assumption | Validated? | Source |
|---|---|---|---|
| ASSUMP-01 | The activity route has no recipient-page UI consumer | Yes (verified: `share/[token]/page.tsx` renders ShareReviewWorkspace only) | repo evidence |
| ASSUMP-02 | Recipient email must stay plaintext for the proposals view | Yes (`recipient-proposals-repository.ts:86-163`) | repo evidence |
| ASSUMP-03 | `loadSharedLinkActivity` remains the full-fidelity owner view | Yes (RBAC-gated; `audience:"owner"`) | repo evidence |
| ASSUMP-04 | The retention cron (`30 3 * * *`) is the delivery vehicle for new rules | Yes (worker.ts:107-115) | repo evidence |
| ASSUMP-05 | Removing `meta` from the DTO is transparent (always undefined) | Yes (composer never sets `meta`) | repo evidence |
| ASSUMP-06 | No consumer reads `author_email` from the public path | Yes (route.ts:174-188 uses recipient_id only) | repo evidence |
| ASSUMP-07 | Free-tier Cloudflare suffices for Phases 1-5 | Yes (no new paid add-on) | `AGENTS.md` posture |
| ASSUMP-08 | D1 supports `DROP COLUMN` (Phase 7 rollback) | Yes (SQLite ≥ 3.35; Cloudflare D1 is ≥ 3.4x) | official docs (Phase 7 verify before edit) |

## Open decisions (owner)

| ID | Decision | Why codebase can't resolve | Options | Recommended | Effect of each | Owner |
|---|---|---|---|---|---|---|
| OPEN-RET-01 | Retention TTLs for share content | Business/legal judgment on data lifetime | 730d comments/responses, 365d recipients post-revoke, 1095d publications/events/digest | as recommended | shorter TTL = more privacy, more risk of deleting in-use data; longer = opposite | Philip |
| OPEN-SEC-02 | Split the shared secret into 4 env vars | Production secret provisioning | split vs keep-fallback | split | split = stronger isolation, rotation risk (RISK-10); keep = current risk (P1-3) | Philip |
| OPEN-SEC-03 | Adopt Turnstile/WAF on share routes | UX friction + Cloudflare free-tier limits | adopt vs defer | adopt for open links, bypass for password | adopt = friction+defense; defer = current scraping risk | Philip |
| OPEN-SEC-04 | Server-side session revocation | Migration + complexity | add `session_generation` vs defer | add | add = kill-switch for stolen cookies; defer = current 24h exposure | Philip |
| OPEN-UX-02 | Feature-flag the activity route off for recipients until a UI ships | Product judgment | flag off vs leave reachable | leave reachable (no consumer today; tightening is enough) | flag off = smaller surface, future re-enable cost; leave = current | Philip |

## Rejected alternatives

- Splitting the activity route into sub-routes (DEC-01).
- Hashing recipient email at rest (DEC-06).
- Deny-list facts filter (DEC-02).
- Client-controlled offset pagination.
- Bundling owner-gated hardening into the minimization phases (DEC-07).
- Broad `bun run validate` as the privacy proof (targeted route tests are the right size per `AGENTS.md`).
- Browser/Playwright proof for Phases 1-2/4-5 (no browser-only claim; proportional policy).
