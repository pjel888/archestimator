# 00 - Agent Coordination Ledger

**Master goal:** produce a planning-only, implementation-ready auth audit and hardening package for Cloudflare-first Archestimator auth.

**Current lane:** solo lead integration with independent read-only support lanes.

**Stop condition:** this pack is complete when it contains enough source, UX, security, standards, risk, implementation, and validation detail for a future implementation agent to execute phase-by-phase without rediscovering the system. It does not need to prove runtime behavior in this pass.

---

## Constraints

Forbidden in this planning pass:
- Editing app source, tests, migrations, package manifests, configs, provider state, or runtime state.
- Running migrations, provider mutation, deployments, commits, pushes, browser automation, or screenshots.
- Claiming auth hardening is implemented.
- Claiming provider, hosted, browser, or production proof from local static review.

Allowed:
- Read-only source inspection.
- Official-doc research.
- Edits inside `.ai/03_plans/2026-07-03-Authentication-Audit-And-Improvement/`.
- Focused static validation of the plan pack.

---

## Evidence Lanes

| Lane | Owner / Role | Scope | Result |
|---|---|---|---|
| Lead integration | Main Codex agent | Read prompts, skills, AGENTS, current-state FAST PATH, source snippets, package/runtime files; integrate docs | Complete |
| Repo source map | Native `explore` lane | Current auth/runtime reality and stale Supabase/Vercel classification | Complete; confirmed Cloudflare-first + Better Auth active, legacy Supabase/Vercel auth mostly historical |
| UX source map | Native `designer` lane | `.ai/16_user-experience` auth/invite/share/terms state expectations | Complete; identified missing `05_UX_UI_ACCESSIBILITY_PLAN.md` and recovery-copy matrix |
| Security document review | Native `ce-security-lens-reviewer` lane | Plan-level security/privacy gaps | Complete; identified missing credential taxonomy, authz matrix, threat model, provider-leftover worksheet, standards/privacy map |
| External standards research | Native `researcher` lane + lead web checks | OWASP, NIST, GDPR/EDPB, Cloudflare, Better Auth | Complete; sources listed in `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` |

Verification mode: `independent-assisted`. The independent lanes were read-only and did not mutate files.

---

## Source Authority Model

1. Current repo source, tests, config, and `.ai/10_state/current-state.md` FAST PATH.
2. Official docs for version-sensitive APIs and standards.
3. Existing UX/spec/roadmap docs after current-source reconciliation.
4. Older plans and memory only as background.

Do not let older Supabase/Vercel-era docs override current source.

---

## Conflict Resolution Log

| Conflict | Resolution |
|---|---|
| Existing pack said `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER` was missing from `.env.example`. | Current `.env.example` documents it. `RISK-005` is closed as a stale finding. |
| Existing pack treated provider final lock-in as out of scope. | Updated: Cloudflare-first + Better Auth are current planning assumptions; this pack includes provider-leftover cleanup classification but not provider cutover execution. |
| Existing pack called Google-side sign-out optional because `prompt=select_account` "fixes" it. | Updated: `prompt=select_account` fixes account-picker UX, but logout/session/revocation semantics remain an explicit policy decision. |
| Existing source audit included a concrete OAuth `state` value. | Updated: future evidence must redact OAuth state, codes, cookies, session IDs, invite/share URLs, email addresses, and tokens. |

---

## Open Decisions

| Decision | Needed before | Default posture |
|---|---|---|
| Whether sign-out remains local-session-only or adds OAuth grant revocation/all-session controls | Phase 1 completion | Be explicit. Do not imply Google logout happened unless implemented and tested. |
| Whether publication P10 lockout uses Durable Object singleton or D1 hard-lock rows | Phase 2 implementation | Prefer the simpler durable design that works across Worker isolates. |
| Whether Better Auth organization/RBAC plugin is adopted now or deferred | Phase 3 design | Do not adopt a plugin until it maps cleanly to workspace/project/estimate roles. |
| Whether legacy `/auth/callback` is deleted or retained with disabled telemetry | Phase 5 cleanup | Delete only after OAuth client redirect URIs and stale-cookie behavior are verified. |
| What retention window applies to auth/session/invite/publication audit events | Privacy/ops completion | Minimize and document; do not keep credential-adjacent evidence indefinitely. |
