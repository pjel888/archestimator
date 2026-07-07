# Research, Review, and QA Evidence

## 1. Research questions and sources (validator-gated)

| # | Research question | Primary source consulted | Current official guidance vs community convention | Plan decision it changed | Citation / date | Searched-but-not-found |
|---|---|---|---|---|---|---|
| R1 | Do browsers always send `Origin` on same-origin form POST? | Fetch spec + MDN | Official: yes, Origin is sent on all same-origin POST/PUT/DELETE; community sometimes confuses with Referer | Confirms DEC-01 won't break same-site form POST (Accept button) | Fetch spec "Origin header"; MDN | — |
| R2 | Does `Referrer-Policy: no-referrer` strip Referer on `<a>` clicks (vs form POST)? | MDN + Fetch spec | Official: yes, `no-referrer` suppresses Referer entirely on navigation | Drives P1-T2 DISCOVERY: switch Continue CTA to form POST so Origin is sent | MDN "Referrer-Policy" | — |
| R3 | Does D1 (SQLite) support `ALTER TABLE ADD COLUMN` (nullable) atomically? | SQLite docs | Official: yes, metadata-only for nullable | Confirms migration `0037` is safe | SQLite "ALTER TABLE" | — |
| R4 | Does D1 support `DROP COLUMN` (for rollback)? | SQLite docs + Cloudflare D1 docs | Official: SQLite 3.35.0+; D1 version unconfirmed | Drives RISK-04 + P3-T1 DISCOVERY (`SELECT sqlite_version()`) | SQLite 3.35 release notes | D1's exact SQLite version (to confirm at impl) |
| R5 | Is Better Auth's CSRF library-default sufficient for `/api/auth`? | Better Auth 1.6.22 docs (local `node_modules/better-auth`) | Official: Better Auth applies origin + cookie-token CSRF on its routes | Confirms no new CSRF needed on `/api/auth`; invite routes need their own origin check | better-auth docs | — |
| R6 | Should the invite origin guard use an env allowlist or same-host comparison? | Repo evidence (`getAllowedAppOrigins` exists but unused by invite) | Community: allowlist; repo convention: same-host comparison for invites | DEC-01 keeps same-host comparison (simpler, matches existing pattern) | repo `redirects.ts` | — |
| R7 | Is peppered SHA-256 adequate for invite token hashing (vs HMAC)? | Crypto best practice + repo evidence (`/share` uses HMAC) | Community: HMAC preferred for keyed hashing; repo invite uses peppered SHA-256 | Out of scope to change (rotation via `v1` prefix); documented in 20 | — | — |
| R8 | Does Cloudflare allow env-var changes without redeploy (for the P1 kill switch)? | Cloudflare Workers docs | Official: yes, vars/secrets are hot | Confirms DEC-01 kill switch | Cloudflare "Configuration" | — |

**Validation rubric:** research is sufficient when each decision it changed has a cited primary source and the residual unknowns (R4 D1 version) are isolated to a bounded DISCOVERY sub-step. R7 is documented as out-of-scope (not blocking).

## 2. Skills and workflows used / unavailable

| Skill/workflow | Used? | Why | Substitute if unavailable |
|---|---|---|---|
| `archestimator-plan-pack` | Yes | Confirms exhaustive profile required | manual directive adherence |
| `Explore` subagent | Yes (native) | 4 parallel discovery lanes | manual `rg` + reads (slower) |
| `verification-before-completion` | Yes | drives §4 audit | manual checklist |
| `gitnexus` | Not used | invite flow is well-localized | `rg` sufficed |
| `cloudflare`/`cloudflare-one`/`durable-objects`/`wrangler` | read-only reference | provider semantics | source files |
| `impeccable`/`playwright` | Not used (opt-in) | no visual deliverable | DOM tests + manual |
| `ultraqa` (skill) | emulated pass | adversarial matrix §5 | — |
| Independent native verifier | **Unavailable** | no second verifier dispatched | emulated pass (caps readiness at 97) |

## 3. Specialist workstream outputs

- **L1 (invite source map):** full lifecycle map → 03 §1; surfaced SEC-02, SEC-07, SEC-10, SEC-11.
- **L2 (origin/CSRF/cookie):** policy logic quoted → 03 §3; surfaced SEC-01, SEC-04; CSP Report-Only residual.
- **L3 (auth/membership/email/D1):** schema + email + auth join → 03 §2,§4-5, 07; surfaced SEC-08, REL-02; next migration `0037`.
- **L4 (sibling shape):** convention match → document structure across the pack.

## 4. Critique-and-revision cycle summaries

- **Cycle 1:** consistency + traceability + shadow-path + credential taxonomy. Closed SEC-02, SEC-04, SEC-10, SEC-11 gaps. Added `20_ATTACK_SURFACE_AND_CREDENTIAL_MATERIAL.md`.
- **Cycle 2:** adversarial (UltraQA) + final verifier. Closed SEC-05, SEC-09, DEC-09 (revoke audit metadata). Confirmed no P0/P1.

## 5. UltraQA-style adversarial scenario matrix

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Actual (planning) | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|---|
| AQ-01 | Cross-site attacker | POST `/accept` no Origin/Referer | mock Request, prod env | `invite-accept-origin.test.ts` | 403 before mutation | current code: allowed (the gap) | To prove (P1-T1) | test output | none |
| AQ-02 | Cross-site attacker | POST `/accept` cross-host Origin | mock Request | same | 403 | current: denied (existing) | Existing-proven | existing test | none |
| AQ-03 | Cross-site attacker | POST `/continue` no Origin/Referer | mock Request, prod | `invite-continue-origin.test.ts` (new) | 403, no cookie set | current: cookie set (the gap) | To prove (P1-T2) | test output | none |
| AQ-04 | Cross-site attacker | POST `/sign-out` no Origin/Referer | mock Request, prod | `project-invite-sign-out-route.test.ts` | 403 | current: proceeds (the gap) | To prove (P1-T1) | test output | none |
| AQ-05 | Legitimate user | same-site form POST `/accept` + `/continue` | preview deploy + test invite | manual e2e + curl | accepted / cookie set | current: works | To prove (P1) | manual transcript | test invite |
| AQ-06 | Manager | revoke pending invitation | D1 fixture | `project-collaboration-revoke-invitation.test.ts` (new) | revoked + tokens revoked + audit | n/a (new) | To prove (P3) | test output | fixture |
| AQ-07 | Other-actor attacker | replay used token | D1 fixture | `collaboration-invitation-d1-store.test.ts` | `already_used` + replay audit | current: correct | Existing-proven | existing test | fixture |
| AQ-08 | Wrong-account user | accept invite for other email | D1 fixture | same | wrong-account, no membership | current: correct | Existing-proven | existing test | fixture |
| AQ-09 | Attacker + misconfig | flag disabled, hammer resolve | flag-off env | `project-invite-feature-flag.test.ts` | deny/disabled (not silent allow) | current: fail-open | To prove (P2) | test output | none |
| AQ-10 | Attacker | malformed/oversized token | token regex test | `project-invite-entry-route.test.ts` | invalid | current: correct | Existing-proven | existing test | none |
| AQ-11 | Cross-workspace manager | revoke another workspace's invite | cross-workspace fixture | revoke test (new) | deny (403/error) | n/a (new) | To prove (P3) | test output | fixture |
| AQ-12 | Manager (double-click) | duplicate revoke submit | rapid double call | revoke test (new) | idempotent (already-terminal) | n/a (new) | To prove (P3) | test output | fixture |
| AQ-13 | Pepper-compromise model | (documented, not executed) document blast radius | n/a | n/a | invite hashing + rate-limit IP hashing + realtime signing affected | documented in 08/15/20 | Documented | n/a | n/a |
| AQ-14 | Email outage | invite send fails | circuit-open fixture | `project-collaboration-actions.test.ts` | degrade to manual share | current: correct | Existing-proven | existing test | none |

## 6. Performance evaluator contract

| Field | Value |
|---|---|
| Baseline | resolve 3-4 queries; accept 5-7 (proof harness) |
| Target | no increase |
| Command | `bun run test -- collaboration-invitation-d1-store` (query-count assertions) + hosted proof harness |
| Fixture | existing `codex-collab-proof-*` |
| Runs | deterministic unit (1); timing 3 runs |
| Regression threshold | +0 queries on resolve/accept |
| Related tests | collaboration-invitation-d1-store, project-invite-entry-route, proof harness |
| Evidence artifact | test output + proof JSON |

## 7. Independent final verifier evidence

`verification_mode: emulated` — the final verifier pass was a separated pass by the lead agent (§4 of `17`). No native independent verifier was dispatched. This caps overall readiness at 97 and status at `CONDITIONALLY READY` (auth-adjacent exhaustive pack). An independent reviewer or owner sign-off lifts the cap.

## 8. Explicit validation gaps

- D1 SQLite version for DROP COLUMN (RISK-04 / P3-T1 DISCOVERY).
- Continue CTA navigation mechanism (RISK-02 / P1-T2 DISCOVERY).
- Direct-grant caller semantics (RISK-07 / P4-T1 DISCOVERY).
- Revoke UI placement (RISK-03 / P3-T4 DISCOVERY).
- No invite e2e Playwright spec (FR-03 manual proof).
- Hosted proof is preview-D1, not production.
- OPEN-SEC-01/02, OPEN-REL-01/02 (owner decisions).
