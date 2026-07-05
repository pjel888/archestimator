# Processor / Sub-processor Register — DRAFT (P1.4)

> **⚠️ COUNSEL REVIEW REQUIRED.** GDPR Art. 28 + DPA IRR §14. Each processor must
> have a signed Data Processing Agreement (DPA) on file before this register is
> treated as compliance evidence.

**Source plan:** `.ai/03_plans/000-Follow Ups/2026-07-04-Security-Compliance-Followups.md` (P1.4)
**Status:** DRAFT — gated on OPEN-DEC-003 (signed DPAs)
**Codebase inventory sources:** `wrangler.jsonc`, `package.json`, `src/lib/email/*`, `src/lib/auth/*`

## Processors

### PR-01 — Cloudflare (primary infrastructure provider)

| Field | Value |
|---|---|
| Role | Processor (infrastructure + edge runtime + storage + email + images) |
| Legal entity | Cloudflare, Inc. (US) / Cloudflare Germany GmbH (EU) |
| Geography | Global edge network; D1 / R2 / Durable Objects data stored in `[OPEN-DEC-003 — confirm regions]` |
| Service scope | Workers compute, D1 (database), R2 (object storage), Durable Objects (realtime), Queues (async jobs), Email (transactional), Images (asset pipeline) |
| Binding | `wrangler.jsonc` `archestimator-proof` Worker |
| DPA status | `[Pending — Cloudflare DPA URL: https://www.cloudflare.com/gdpr/ — confirm executed contract]` |
| Transfer basis | `[OPEN-DEC-003 — SCC + Cloudflare DPF participation]` |
| Sub-processors | See Cloudflare's published sub-processor list: https://www.cloudflare.com/subprocessors/ |
| Audited under | Cloudflare maintains SOC 2 Type II, ISO 27001; customer can request report |

### PR-02 — Google (identity provider)

| Field | Value |
|---|---|
| Role | Processor (OAuth identity provider for "Sign in with Google") |
| Legal entity | Google LLC / Google Ireland Ltd (per region) |
| Geography | Global (Google account infrastructure) |
| Service scope | Google OAuth 2.0 — verification of Google account ownership; receives: authorization code, OAuth scope (email, profile, openid) |
| Binding | `BETTER_AUTH_GOOGLE_CLIENT_ID` env var; configured in Google Cloud Console |
| DPA status | `[Pending — Google Cloud / Workspace DPA — confirm coverage for OAuth scope]` |
| Transfer basis | `[OPEN-DEC-003]` |
| Sub-processors | https://privacy.google.com/businesses/processors/ |
| Audited under | Google maintains SOC 2/3, ISO 27001, ISO 27017, ISO 27018 |

### PR-03 — Cloudflare Email Service (transactional email)

| Field | Value |
|---|---|
| Role | Processor (transactional email delivery) |
| Legal entity | Cloudflare, Inc. |
| Geography | Global edge |
| Service scope | Send invite emails, share notifications, support replies, privacy-request confirmations |
| Binding | `EMAIL` binding in `wrangler.jsonc` |
| DPA status | Covered under primary Cloudflare DPA (PR-01) |
| Transfer basis | Same as PR-01 |
| Audited under | Same as PR-01 |

## Future processors (when features ship)

### PR-FUT-01 — AI inference provider

| Field | Value |
|---|---|
| Status | NOT YET ACTIVE — AI features are deferred (`ARCHESTIMATOR_AI_ENABLED=false`) |
| Candidate providers | DeepSeek (currently implemented in `src/lib/ai/*`); `[OPEN-DEC-006 — confirm provider choice]` |
| Will be added to this register | When the feature is enabled for production |
| Will trigger privacy notice update | Yes (P1.1 must list as processor) |

## Sub-processor change notification

When a new sub-processor is added or a material change occurs:
1. Update this register.
2. Update the published Privacy Notice (P1.1) "Recipients" section.
3. Notify users `[OPEN-DEC-003 — confirm channel: in-app banner, email, or changelog]` 30 days before activation.
4. Provide an objection right (user can request account export + deletion before activation).

## Counsel review checklist

- [ ] Are all current processors captured? (Codebase audit cross-check)
- [ ] Are signed DPAs on file for each?
- [ ] Are transfer bases correctly described?
- [ ] Are sub-processor lists accurate and current?
- [ ] Is the change-notification process documented and operational?

## Publication

When this register is counsel-approved, a user-facing summary will be published on `/privacy` (linked from the Privacy Notice §3 Recipients). The summary will list each processor's name, role, geography, and a link to their DPA. The full register (with internal contract references) stays in this `.ai/10_state/compliance/processor-register.md` for audit purposes.
