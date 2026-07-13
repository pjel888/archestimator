# 19 — Research, Review, and QA Evidence

## Research questions and sources

This is primarily a codebase-grounded plan, not an external-research-driven one. The research questions were codebase-internal. No external best-practice research materially shaped a requirement (the patterns are all in-repo: invite wrong-account, share session, decision immutability).

| Question | Source consulted | Finding | Plan decision it shaped |
|---|---|---|---|
| How does the invite flow handle wrong-account? | `src/app/invite/[token]/page.tsx`, `src/lib/collaboration/*`, invite-hardening pack | Invite shows both emails + sign-out; uses a bridge cookie. | DEC-IA-05 (use a link, not a bridge cookie, for the share surface); FR-06 (mirror the CTA pattern but keep it non-leaky) |
| How are publication tokens stored/rotated? | `security.ts`, `actions.ts` | HMAC hash + AES-GCM encrypted; rotate in-place; revoke sets status. | SEC-01 (unchanged); confirmed sound |
| Is the decision immutable? | `migrations/0014`, `public-repository.ts` | Partial unique index → one per recipient per publication. | DEC-IA-03 / FR-12 (keep immutable V1) |
| Does an in-app notification path exist for recipient events? | `src/lib/notifications/*`, `src/features/notifications/*` | `publication_activity` kind exists but is never dispatched; email-only today. | DEC-IA-04 / FR-14 (email-only V1) |
| What does a recipient see for expired/revoked today? | `not-found.tsx`, `page.tsx`, `isActivePublication` | Single generic "unavailable"; no differentiation. | DEC-IA-02 / FR-09/10 (differentiate after resolution) |
| Is the receiver E2E running? | `e2e/shared-link-receiver.spec.ts`, `playwright.config.ts` | Skipped without env + missing fixture. | TEST-E2E (skip-documented; DISCOVERY 6.3) |
| Are there sibling packs that fence this scope? | `.ai/03_plans/*` READMEs | 6 packs overlap; client-ready explicitly defers recipient read/unread here. | `02` non-goals; `10` blast radius |

**No external/official-doc research was material** to this pack (no framework-version-sensitive, provider-primitive, or pricing question was in scope). Local Next.js 16 docs would be consulted at implementation time for the `error.tsx` boundary and `notFound()` behavior — flagged in ARCH-04 / task 1.2.

**What was searched for but not found:** an in-app recipient notification dispatch (confirmed absent — `publication_activity` kind is a stub); a `tests/fixtures/shared-link.ts` (confirmed absent — E2E skip cause); any existing wrong-account interstitial on the share surface (confirmed absent by design).

## Skills and workflows used / unavailable

| Skill/workflow | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` | yes | Confirmed exhaustive profile + dated plan pack |
| `Creating-Plan-Prompt.md` | yes | Authoritative 22-doc structure + readiness scoring |
| `Multi-Agent-Execution-Directive.md` | yes | Verification-mode caps, coordination ledger |
| `Explore` subagents (×3) | yes | Parallel evidence gathering (inbox, share/security, tests) |
| `ultrawork` / `ultragoal` / `autopilot` / `ultraqa` / `gitnexus` / `performance-goal` / `autoresearch` | **not used** | Not materially beneficial for a planning-only task of this shape; the directives' vocabulary is reflected in the plan structure (durable-goal contracts, adversarial matrix, performance evaluator) without spawning the workflows themselves. These are listed in the objective header as available skills, not as mandatory invocations. |
| Independent native reviewer | **unavailable** | No native reviewer in session → `verification_mode: emulated` |

No skill name was used as evidence of work done. No capability was fabricated.

## Specialist workstream outputs (consolidated)

| Workstream | Output location | Key finding |
|---|---|---|
| Product/scope | `02`, `04` | 14 FR + UX/A11Y/ARCH/DATA/API/SEC/PERF/REL/OPS/TEST/DOC |
| Codebase architecture | `03`, `06` | Two distinct auth surfaces; one-way open-action bridge; no V1 migration |
| UX/a11y | `05` | Journeys A–D; forked empty state; recovery CTAs; keyboard/SR defined |
| Frontend components/state | `03`, `06`, `11` | Single client boundary preserved; TanStack Query unchanged |
| Backend/API | `03`, `07` | No new route; contracts stable |
| Data/database | `03`, `07` | No V1 migration; immutability preserved |
| Security/privacy | `08` | Credential taxonomy; T-01..T-10; anti-enumeration; non-leaky CTA |
| Performance | `09` | No query/bundle change; gates defined |
| Testing/QA | `12` | Test matrix; adversarial matrix AQ-01..10 |
| Rollout/ops | `13` | No flags; revert-only rollback |
| Blast radius | `10` | Direct + transitive mapped; siblings fenced |
| Adversarial gap analysis | below | ADV-01..08; all P1 mitigated |
| Final verification | `17` | Requirement-by-requirement; CONDITIONALLY READY |

## Critique-and-revision cycle summaries

This pack ran **two** critique-and-revision cycles after the initial synthesis (the directive asks for ≥2 for exhaustive). The `emulated` cap is the binding constraint on status.

### Cycle 1 (after initial synthesis)
- **Gaps found:** (a) copy-contract test conflict (ADV-02); (b) ARCH-04 resolver-shape assumption (ADV-03); (c) wrong-account email-leak risk (ADV-04); (d) E2E false-green risk (ADV-05); (e) path correction (ADV-01).
- **Revisions:** added DEC-IA-03 + FR-08c (dialog-neutral/badge-finality reconciliation); added DISCOVERY task 1.2; added SEC-04 + TEST-06 denial test; added task 6.2 skip-comment; corrected all paths to the real `proposals-page-client.tsx` location.

### Cycle 2 (after cycle-1 revisions)
- **Gaps found:** (a) sibling-concurrency stale-surface risk (ADV-06); (b) `emulated` verification cap not yet reflected in status (ADV-07); (c) OPEN-IA owner-decision tracking (ADV-08).
- **Revisions:** added README stale-plan revalidation checklist + file-scope ownership; set status to `CONDITIONALLY READY` with the `emulated` cap explained; enumerated OPEN-IA-01..04 with options/recommendation/impact in `00` and `15`; scored security at 94 (the binding sub-95).

A third cycle was considered and judged not to improve correctness: remaining gaps are owner-gated (OPEN-IA) or implementation-time (running the tests). Per the bounded-iteration guidance, the loop stopped at 2 meaningful cycles with residual findings recorded.

## Adversarial scenario matrix (planning-level; implementation-time proof in `12`)

| ID | Scenario | Expected defense | Proof |
|---|---|---|---|
| AQ-01 | Guessed token | generic copy | TEST FR-10c |
| AQ-02 | Expired token | expired copy, no metadata | TEST FR-09 |
| AQ-03 | Revoked token | revoked copy, no metadata | TEST FR-10a |
| AQ-04 | Wrong-account | CTA, no email leak | TEST FR-06/SEC-04 |
| AQ-05 | Double-decision | 409 reload+lock | covered |
| AQ-06 | Snapshot-stale | 409 "updated while deciding" | covered |
| AQ-07 | Anonymous decide | 401 read-only | covered |
| AQ-08 | Server error in page | `error.tsx` recovery | TEST FR-10b |
| AQ-09 | Concurrent refresh | in-flight guard | covered |
| AQ-10 | 50+ proposals | LIMIT 50 | covered |

## Performance evaluator contract

Defined in `09`. Summary: no query/bundle change → primary gates are `bun run test:dom` (mocked) + `bun run build` (bundle boundary). Hosted/provider TTFB + D1 EXPLAIN deferred to implementation; risk low.

## Independent final verifier evidence

`verification_mode: emulated`. The verifier pass is documented in `17`. No native independent verifier ran. This is the binding reason for `CONDITIONALLY READY`.

## Explicit validation gaps

| Gap | Why | Risk | Substitute | Unblock action |
|---|---|---|---|---|
| Hosted route TTFB | no local proof | low (no query change) | build + unit tests | provider probe at implementation |
| D1 EXPLAIN listing | deferred | low (index-backed, LIMIT 50) | repo credential-free test | EXPLAIN at implementation |
| Receiver E2E | skipped | medium (no browser round-trip proof) | DOM tests cover recovery states | seed `tests/fixtures/shared-link.ts` + env (DISCOVERY 6.3) |
| Email deliverability | out of scope | n/a | n/a | client-ready-proposal-workflow |
| In-app notification dispatch | out of scope | n/a | n/a | OPEN-IA-04 / client-ready Phase 5 |
| Independent verification | no native reviewer | medium (status cap) | emulated pass | owner/external reviewer accepts |
| OPEN-IA-01..04 | owner-gated | low-medium (recommended paths exist) | each decision documented | owner sign-off |
