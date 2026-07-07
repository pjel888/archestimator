# 02 — Feature Brief And Scope

## Source brief (verbatim from `PROMPT.md`)

> **Goal:** Create a plan pack for continuity from public landing pages to beta access, legal/support expectations, account creation, and first workflow entry.
>
> **Evidence To Start From:** Landing implementations exist under `src/components/landing/`, `src/components/landing-new/`, and `src/components/landing-v3/`. `e2e/landing-audit.spec.ts` covers some landing checks. Existing brand/landing plan exists, but public-to-beta trust, legal, support, and onboarding continuity are not one acceptance path. Invite token and first-user activation plans cover adjacent deeper flows.
>
> **Required Plan Pack:** Map public promises, beta CTA, invite/auth continuity, terms/privacy/support links, trust signals, expectation-setting copy, first workflow handoff, tests, and launch acceptance.
>
> **Constraints:** Do not turn this into a generic marketing redesign. The plan should protect user trust and reduce first-session confusion.
>
> **Stop Condition:** The pack is complete when the public-to-beta path is coherent, truthful, and ready to connect to onboarding.

## Decomposed planning objectives

The brief names nine things to "map": (1) public promises, (2) beta CTA, (3) invite/auth continuity, (4) terms/privacy/support links, (5) trust signals, (6) expectation-setting copy, (7) first workflow handoff, (8) tests, (9) launch acceptance. This pack treats each as a first-class requirement group (see `04`) and traces each end-to-end (see `16`).

## Scope boundaries

### In scope
- **Public promises → truthfulness:** ensure every capability claimed on the public surface maps to a Live shipped state (via the existing claims ledger), with no overclaim and no silent omission that would confuse a first user.
- **Beta CTA continuity:** one canonical CTA/intent vocabulary across the live v3 homepage, the `/new` preview, the shared `LandingCTAs`, the `LandingHeader`, and `ClosedBetaGate`.
- **Invite/auth continuity:** the handoff between a collaboration invite (`/invite/[token]`) and auth/workspace entry is legible to the user (correct copy, correct resume target, no dead-ends). Deep token crypto is out of scope (sibling pack).
- **Terms/privacy/support/legal links:** present, correct, reachable, and consistently placed across all public footers and the beta gate.
- **Trust signals:** kept truthful (no fabricated logos/testimonials/metrics); claims ledger remains source of truth.
- **Expectation-setting copy:** beta-stage expectations (closed beta, invite-only, what works today, what is building) are surfaced honestly at the access boundary.
- **First workflow handoff:** after the gate, the user has an obvious, low-friction path to create their first project/estimate.
- **Tests + launch acceptance:** a continuity contract test, per-requirement tests, a performance evaluator, and rollout gates.

### Out of scope (non-goals)
- **Generic marketing redesign** — no new visual language, no restyling, no new brand system (explicit constraint). UI changes are strictly the minimum to close a continuity gap (footer links, a CTA label, an empty-state CTA, a receipt).
- **Open self-serve signup** — `/signup` remains a `ClosedBetaGate` until the owner flips `L-FUN-2`; this pack does not implement `SignupForm`.
- **New auth providers / password auth** — Better Auth Google OAuth + magic-link stays.
- **Estimating workflow internals** — rows, components, templates, proposals are untouched.
- **Collaboration invite token internals** — generation, hashing, redemption belong to `2026-07-07-invite-token-flow-hardening`.
- **First-user empty-workspace deep flows** — belong to `2026-07-07-first-user-activation-empty-workspace`; this pack touches only the *entry handoff*.
- **Pricing numbers / DPA / SOC2/GDPR/HIPAA badges** — explicitly deferred or truthfully omitted per existing `/trust` and `/pricing` posture.
- **Provider/infra changes** — no migrations required for the core path (see `21`); email delivery enablement is owner-gated config, not infra.

## Assumptions

| ID | Assumption | Source strength | Validated? |
|---|---|---|---|
| ASSUMP-CONT-01 | `landing-v3` remains the live `/` variant for the lifetime of this plan | repo evidence + test guards | Yes (revalidate per README checklist) |
| ASSUMP-CONT-02 | Closed beta remains grant-based (allowlist + env flag), not code-based | repo evidence | Yes |
| ASSUMP-CONT-03 | Terms acceptance stays a single post-auth clickwrap gate | repo evidence + DEC-CONT-01 | Yes (decision) |
| ASSUMP-CONT-04 | Email delivery can be enabled by the owner without infra change (Cloudflare Email binding already wired) | repo evidence (`EMAIL` binding, `sendCloudflareEmail`) | Yes (config), provider deliverability unverified |
| ASSUMP-CONT-05 | The `claims-ledger` Live/Building/Planned model is the canonical truthfulness framework | repo evidence | Yes |
| ASSUMP-CONT-06 | `archestimator.com` is the intended production domain | `.ai` state + `LANDING_SITE_ORIGIN` | Open (OPEN-CONT-05) |

## Success metrics (planning-level)

- **Continuity coherence:** a single documented contract maps every public CTA/intent to its destination and every public promise to a shipped state.
- **Truthfulness:** zero overclaims on the public surface (enforced by existing + new tests); claims ledger remains the only capability-claim source.
- **First-session confusion reduction:** no dead-end, no unexplained redirect, no broken legal/support link on the path from `/` to first project creation.
- **Testability:** every behavior-bearing requirement has an objective acceptance test; one continuity contract test covers the whole path.
- **Launch acceptance:** the path passes hosted smoke + owner signoff (external, recorded as rollout gate).

## Failure metrics (what would make this plan a failure)

- Any new overclaim introduced (e.g., "trusted by", invented metrics, fake logos).
- Any reduction of the truthfulness stance (e.g., softening the "no SOC2/GDPR" line).
- A double terms-gate or a regression in the proxy→layout→session trust ordering.
- A continuity test that passes but does not actually exercise the user-visible path.
- Scope creep into marketing redesign or estimating internals.
