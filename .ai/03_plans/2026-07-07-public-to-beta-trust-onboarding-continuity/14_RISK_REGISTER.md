# 14 — Risk Register

Technical + non-technical. Severity = Probability × Impact (H/M/L).

| ID | Description | Trigger | Prob | Impact | Sev | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-CONT-01 | CTA drift after OPEN-CONT-01 resolution | someone changes v3 PrimaryCta without updating contract/test | M | M | M | landing, tests | CTA-continuity test fails | WP-0.2 test locks it | update contract + test together | revert | implementer | low | open (mitigated by test) |
| RISK-CONT-02 | Footer copy/contrast a11y regression | new links fail AA contrast or focus | L | M | L | a11y, landing | a11y test / axe | reuse existing link styles | fix classes | revert | implementer | low | open |
| RISK-CONT-03 | `requestBetaAccess` abuse/flood | abuser discovers the endpoint | M | M | M | intake, D1, owner inbox | rate-limit + audit monitoring | honeypot + email/IP rate-limit | tighten limits; revert to mailto | disable action | implementer/ops | med | open (mitigated) |
| RISK-CONT-04 | Enumeration via receipt | receipt reveals allowlist membership | M | H | H | security | uniform-receipt test | uniform receipt (SEC-CONT-03) | enforce uniformity | revert | implementer | low | open (mitigated by design) |
| RISK-CONT-05 | Welcome-email double-fire | two trigger sites wired or race | M | L | M | email, UX | idempotency event count | ONE trigger site + idempotency check-then-insert | tolerate rare dup | dedupe via unique constraint (migration) | implementer | low | open (mitigated) |
| RISK-CONT-06 | Email delivery misconfigured in prod | `CLOUDFLARE_EMAIL_FROM` invalid / not allowlisted | M | M | M | email | send failure logs | owner config verify (L3 gate) | graceful skip (REL-CONT-01) | disable delivery | owner/ops | med | open (owner-gated) |
| RISK-CONT-07 | Trustfulness regression (overclaim sneaks in) | new copy says "trusted by" etc. | L | H | M | trust, legal | overclaim tests | claims-ledger cross-check | keep tests green | revert | implementer | low | open (mitigated by existing tests) |
| RISK-CONT-08 | `/cookies` or legal page cache/headers wrong | served with auth headers or dynamic | L | M | L | cache, perf | `public-static-route-contract.test.ts` | add `/cookies` to contract test | fix export | revert | implementer | low | open |
| RISK-CONT-09 | Onboarding redirect adds a hop | naive implementation chains redirects | L | L | L | perf, UX | redirect-count Playwright | preserve single-redirect behavior | measure | revert | implementer | low | open |
| RISK-CONT-10 | PGP key publication liability | publishing a key implies a specific contact/commitment | M | L | L | security, legal | owner review | owner decision (OPEN-CONT) | remove reference instead | n/a | owner | low | open (owner-gated) |
| RISK-CONT-11 | Concurrent-agent file collision (shared worktree) | another agent edits a touched file | M | M | M | integration | file-scope ownership + fresh `git status` | re-read before edit; small diffs | coordinate via ledger | merge carefully | implementer | low | open (process) |
| RISK-CONT-12 | Scope creep into marketing redesign | implementer restyles beyond the gap | L | M | L | scope | review against `02` non-goals | constraint in PROMPT.md | reject non-continuity changes | revert | implementer/lead | low | open (process) |
| RISK-CONT-13 | `completeOnboarding` vs `workshop/page.tsx` trigger ambiguity | welcome email wired at both | L | M | L | email | two sends | pick ONE site (WP-4.1) | idempotency backstop | remove one wire | implementer | low | open (mitigated) |
| RISK-CONT-14 | Closed-beta allowlist admin queue XSS (name/company render) | untrusted text rendered as HTML in `/workshop/settings/users` | L | H | M | security | ADV-08 test | render as text, never dangerouslySetInnerHTML | escape | fix render | implementer | low | open (mitigated by pattern) |
| RISK-CONT-15 | Domain not confirmed → wrong canonicals | `archestimator.com` not the real prod domain | L | M | L | SEO | OPEN-CONT-05 | owner confirmation gate | placeholder guarded | update origin | owner | low | open (owner-gated) |

No unmitigated **critical** risk remains. The highest open risks (RISK-CONT-04 enumeration, RISK-CONT-03 abuse) are mitigated by design controls (uniform receipt, rate-limit + honeypot) and adversarial tests.
