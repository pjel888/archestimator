# Public To Beta Trust And Onboarding Continuity — Plan Pack

**Date:** 2026-07-07
**Plan folder:** `.ai/03_plans/2026-07-07-public-to-beta-trust-onboarding-continuity/`
**Mode:** `planning-only` (no application code, tests, migrations, or config changed)
**Plan profile:** `exhaustive` (touches auth, closed-beta gating, invites, legal gates, public surfaces, first-workflow entry — high blast radius)
**Source brief:** `PROMPT.md`

## Plan status: `CONDITIONALLY READY`

**Suite label mapping:** `READY`↔`IMPLEMENTATION-READY`, `READY WITH EXTERNAL DECISIONS`↔`CONDITIONALLY READY`, `NO-GO`/`NOT-READY`↔`NOT READY`.

The **design** is implementation-ready: every requirement traces to exact current-state file paths, symbols, and acceptance criteria, and every implementation task names exact repo-relative target paths and symbols (no approximate placement). The package is held at `CONDITIONALLY READY` rather than `IMPLEMENTATION-READY` because:

1. **`verification_mode: emulated`** — no native independent reviewer was available in this session; all review passes were separated passes by the same lead agent. Per the suite authority contract this caps overall readiness at 97 for high-blast-radius planning and caps package status at `CONDITIONALLY READY` unless a real independent reviewer or explicit owner acceptance later approves the final package.
2. **Genuinely external decisions remain** (see Blocked decisions table): canonical CTA/intent posture, footer link set, cookie-policy page, welcome-email copy, and production-domain confirmation. These are `owner-delegated planning decisions` with recommended options, but they change user-facing copy and cannot be silently finalized by a planning task.
3. **Email delivery is OFF by default** in env (`ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false`, `CLOUDFLARE_EMAIL_FROM=` empty) — the welcome/onboarding email slice depends on owner-confirmed delivery configuration plus provider deliverability proof that is out of scope for a planning-only task.

When the named slices are accepted and `verification_mode` is upgraded by an independent reviewer or owner, the package can move to `IMPLEMENTATION-READY` for those slices.

## What this pack delivers (the planning outcome)

This pack turns the fragmented public→beta→auth→onboarding path into **one coherent, truthful, testable acceptance path**. An executor can build it **without re-discovering** the trust/onboarding surface:

- **Continuity map** of the live path: landing CTA → beta request → allowlist grant → login → terms gate → workspace provisioning → first workflow (`03`, `05`, `06`).
- **Trust-truthfulness ledger** — every public promise mapped to its current shipped state (Live/Building/Planned/NotUs) so no landing copy overclaims (`03` §4, `08` §6).
- **Requirements** with stable IDs (FR/UX/A11Y/ARCH/SEC/REL/OPS/TEST/DOC/CONT-*) and objective acceptance criteria (`04`).
- **Exact target paths and symbols** for every implementation task, with new files proposed at exact repo-relative paths (`11`).
- **Shadow-path matrices** for every behavior-bearing flow (`04` §3).
- **Adversarial QA matrix** (`19` §5).
- **Performance evaluator contract** for the landing→auth transition (`09`, `19` §6).
- **Rollout/rollback and operations gates** (`13`).

## Implementation start document

**`11_IMPLEMENTATION_PLAN.md`** — phased (0–6), dependency-aware, with exact target paths per task.

### Phase order & dependency graph

```
Phase 0 (continuity contract + CTA intent reconciliation)  ──► Phase 1 (footer/trust-link continuity)
                                                                    │
                                                                    ▼
Phase 2 (legal/support page completeness: cookies, security sitemap, metadata)  ──► Phase 3 (terms-gate continuity + beta-request receipt)
                                                                    │
                                                                    ▼
Phase 4 (welcome + invite-acceptance emails, owner-gated)  ──► Phase 5 (first-workflow entry: dashboard first-project CTA + onboarding redirect)
                                                                    │
                                                                    ▼
                                                              Phase 6 (tests, perf evaluator, rollout gates)
```

- **Phase 0** is the load-bearing prerequisite: it fixes the canonical CTA/intent vocabulary and the continuity contract that downstream phases consume. It is `BLOCKED-EXTERNAL` on the CTA posture decision (OPEN-CONT-01) but the rest of Phase 0 can proceed.
- **Phases 1, 2, 3** are parallel-safe with each other after Phase 0 lands the contract (disjoint file scopes: footer components vs legal routes vs terms/beta actions).
- **Phase 4** is **owner-gated** (email delivery config + welcome copy).
- **Phase 5** depends on Phase 0's contract for the "where do I go next" handoff.
- **Phase 6** consumes all prior phases.

## Requirements / task / test traceability

- Requirements: `04` (FR/UX/A11Y/ARCH/SEC/REL/OPS/TEST/DOC/CONT-*).
- Traceability matrix: `16`.
- Test execution matrix: `12` §2.
- Adversarial matrix: `19` §5 (ADV-01..18).
- Implementation tasks: `11` (WP-0.1..6.3).

## Blocked decisions table (external)

| ID | Decision | Owner | Unblocks | Recommended option |
|---|---|---|---|---|
| OPEN-CONT-01 | Canonical beta CTA + intent vocabulary (walkthrough vs access vs started) | owner/product | Phase 0, FR-CONT-02 | Keep live v3 "Book a walkthrough" (`intent=walkthrough`) as the primary public CTA; reserve "Request access" (`intent=access`/`beta-request`) for the `/signup` ClosedBetaGate. Document the mapping in `contact-mailto.ts`. |
| OPEN-CONT-02 | Public footer link set (which of Privacy/Terms/Trust/Security/Support/Cookies) | owner/product | Phase 1, FR-CONT-04 | Add a unified footer link group: Privacy, Terms, Trust, Security, Contact (mailto). Keep it consistent across the v3 footer, `/new` footer, and shared `LandingFooter`. |
| OPEN-CONT-03 | Cookie-policy page (standalone `/cookies` vs embedded in Privacy) | owner/legal | Phase 2, FR-CONT-06 | Add a lightweight `/cookies` page that lists the cookie categories the `CookieConsentBanner` actually controls (essential, analytics) plus the `archestimator:landing-consent` cookie. Link it from the banner. |
| OPEN-CONT-04 | Welcome/onboarding email copy + enable delivery | owner/product | Phase 4, FR-CONT-09 | Add a single welcome email fired on first successful workshop entry; keep it short, set `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED` + `CLOUDFLARE_EMAIL_FROM` in production env. Requires provider deliverability proof before claiming "sent". |
| OPEN-CONT-05 | Confirm production domain `archestimator.com` | owner/ops | FR-CONT-11, SEO/canonicals | Confirm `LANDING_SITE_ORIGIN` and clear the `L-SEO-1 GATED` marker. |
| OPEN-CONT-06 | Terms-gate scope: require acceptance on beta-request submit? | owner/legal | FR-CONT-07 | Defer; keep the post-auth clickwrap gate as the single acceptance point to avoid a double-gate, but add a plain-language "by requesting access you agree to..." line on `ClosedBetaGate` linking to `/terms` + `/privacy`. |

## Stale-plan revalidation checklist

Before executing any slice, the implementer must confirm these have not drifted:

- [ ] `src/components/landing-v3/ArchestimatorLandingPage.tsx` is still the live `/` entry (re-verify `src/app/page.tsx` import + `landing-amigo-redesign.test.tsx`).
- [ ] `src/app/signup/page.tsx` still renders `ClosedBetaGate` (not `SignupForm`); the `L-FUN-2 GATED` comment is still present.
- [ ] `CLOSED_BETA_ACCESS_ENABLED` posture unchanged (`src/lib/auth/closed-beta-access.ts`).
- [ ] `src/proxy.ts` + `src/lib/auth/request-proxy.ts` still own route protection (no `middleware.ts` reintroduced).
- [ ] Terms gate still enforced in `src/app/workshop/layout.tsx` via `getCurrentUserTermsAcceptanceStatus`.
- [ ] `contact-mailto.ts` intent vocabulary (`walkthrough|access|started|beta-request|feedback|general`) unchanged.
- [ ] `LANDING_SITE_ORIGIN` value and the `L-SEO-1 GATED` marker still as recorded.
- [ ] `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED` and `CLOUDFLARE_EMAIL_FROM` still as recorded.

## Commands/checks to run before the first implementation edit

```bash
git status --short --branch          # confirm shared-worktree state, no surprise changes
git diff --check                     # whitespace/conflict markers
rg -n "ClosedBetaGate|ensureDefaultWorkspace|getCurrentUserTermsAcceptanceStatus" src | head
bun run type-check                   # baseline type health
bun run lint                         # baseline lint health
```

## Files explicitly off-limits during planning

This is a `planning-only` task. No application code, tests, migrations, schemas, package manifests, provider state, or config may be changed. The only files created live **inside this plan folder**. `PROMPT.md` (already present) is preserved untouched.

## Files and systems intentionally unaffected

- Workshop estimating/editing internals (estimate rows, component projection, templates) — out of scope; this pack is about the *entry* path, not the estimating workflow itself.
- Collaboration invitation deep internals (token crypto, acceptance redemption) — covered by the sibling `2026-07-07-invite-token-flow-hardening` pack; this pack touches only the *continuity* of the invite→auth→workshop handoff.
- Better Auth core identity tables (`user`/`session`/`account`/`verification`) — managed by Better Auth's migrator, not in scope.
- D1 migrations beyond additive legal/cookie/onboarding-page concerns (no schema changes are required by the core continuity path; see `21_DATABASE_CHANGE_BLUEPRINTS.md` — most phases need **no** migration).

## External proof that remains required before production rollout

- Hosted/manual smoke of the full landing→beta-request→grant→login→terms→workspace→first-project path against `archestimator.com` (DOM-CONT proof).
- Email deliverability proof for the welcome/onboarding email once delivery is enabled (provider-backed proof).
- Legal-owner signoff on any new/changed policy copy (cookie policy, footer links, ClosedBetaGate legal line).
- Confirmation of `archestimator.com` as the production origin.

## Archive policy

Do **not** archive automatically. Archive the whole pack only after the implemented continuity path has passed hosted smoke + owner acceptance. Named completed slices (e.g., footer link continuity) may be archived independently if they land and verify before the rest.
