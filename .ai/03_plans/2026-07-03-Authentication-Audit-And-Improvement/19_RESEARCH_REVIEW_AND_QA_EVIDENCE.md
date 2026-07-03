# 19 - Research Review And QA Evidence

## Independent Review Evidence

| Lane | Evidence used |
|---|---|
| Repo source map | Confirmed Cloudflare-first + Better Auth active source; identified stale Supabase/Vercel docs/tests and active auth files. |
| UX review | Confirmed auth/beta/terms, invite, workspace, share-recipient, and support/admin state requirements from `.ai/16_user-experience`. |
| Security review | Flagged missing threat model, incomplete credential taxonomy, authz matrix, provider cleanup worksheet, logout semantics, evidence redaction, and standards/privacy mapping. |
| External standards research | Confirmed current OWASP ASVS 5.0.0, NIST SP 800-63-4/63B-4, Better Auth, Cloudflare, and EDPB/GDPR planning baselines. |
| Lead verification | Read current plan pack, prompts, AGENTS/current-state, targeted source files, package/runtime files, local Next.js docs, and official docs. |

## Official / Primary Sources

| Source | Planning use |
|---|---|
| OWASP ASVS, https://owasp.org/www-project-application-security-verification-standard/ | ASVS 5.0.0 verification baseline. |
| OWASP Authentication Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html | Reauth, recovery, throttling, and session invalidation considerations. |
| OWASP Session Management Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html | Session ID and lifecycle controls. |
| OWASP CSRF Prevention Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html | CSRF threat model for authenticated browser actions. |
| OWASP OAuth2 Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html | OAuth security practice baseline. |
| OWASP Authorization Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html | Deny-by-default and per-request/object authorization. |
| OWASP API Security Top 10 2023, https://owasp.org/API-Security/editions/2023/en/0x11-t10/ | API object/function/property auth and resource-consumption risks. |
| NIST SP 800-63-4, https://csrc.nist.gov/pubs/sp/800/63/4/final | Digital identity guidelines. |
| NIST SP 800-63B-4, https://csrc.nist.gov/pubs/sp/800/63/b/4/final | Authenticator/session lifecycle and reauthentication guidance. |
| Better Auth Google docs, https://better-auth.com/docs/authentication/google | Google provider prompt/accessType behavior. |
| Better Auth Session Management, https://better-auth.com/docs/concepts/session-management | DB-backed/session/cookie cache/stateless session tradeoffs. |
| Better Auth Cookies, https://better-auth.com/docs/concepts/cookies | Cookie defaults and cross-domain caveats. |
| Better Auth Security, https://better-auth.com/docs/reference/security | CSRF/origin/fetch metadata defaults and disable risks. |
| Better Auth Options, https://better-auth.com/docs/reference/options | OAuth state storage strategy and option behavior. |
| Better Auth Organization, https://better-auth.com/docs/plugins/organization | Organization/access-control plugin evaluation input. |
| OpenID Connect Core 1.0, https://openid.net/specs/openid-connect-core-1_0.html | `prompt` semantics including `select_account` and `login`. |
| RFC 7009 OAuth 2.0 Token Revocation, https://datatracker.ietf.org/doc/html/rfc7009 | Token revocation semantics. |
| Cloudflare Workers best practices, https://developers.cloudflare.com/workers/best-practices/workers-best-practices/ | Worker lifecycle and `waitUntil` cautions. |
| Cloudflare Durable Objects rules, https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/ | In-memory state is not preserved; persist important state. |
| Cloudflare Workers security model, https://developers.cloudflare.com/workers/reference/security-model/ | Runtime security model baseline. |
| Cloudflare Workers secrets, https://developers.cloudflare.com/workers/configuration/secrets/ | Secret binding baseline. |
| Cloudflare D1 data security, https://developers.cloudflare.com/d1/reference/data-security/ | D1 encryption/security baseline. |
| EDPB Secure Personal Data, https://www.edpb.europa.eu/sme/be-compliant/secure-personal-data_en | Authentication factor and secure personal-data guidance. |
| EDPB breach notification guidelines, https://www.edpb.europa.eu/system/files/2023-04/edpb_guidelines_202209_personal_data_breach_notification_v2.0_en.pdf | Awareness/investigation/72-hour breach notification planning. |
| EDPB Article 25 guidelines, https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_201904_dataprotection_by_design_and_by_default_v2.0_en.pdf | Privacy by design/default planning. |
| EDPB right-of-access guidelines, https://www.edpb.europa.eu/system/files/2023-04/edpb_guidelines_202201_data_subject_rights_access_v2_en.pdf | DSAR workflow planning. |

## Source Evidence Checks

| Evidence | Result |
|---|---|
| `package.json` | Confirms Next.js 16, React 19, Better Auth, OpenNext Cloudflare, Wrangler. |
| `wrangler.jsonc` | Confirms Worker, D1, R2, Durable Object, queues, observability, and email binding context. |
| `.env.example` | Confirms invite token pepper and invite rate-limit hash pepper are documented. |
| `src/lib/auth/better-auth-cloudflare.ts` | Google provider returns client ID/secret; prompt policy needs implementation. |
| `src/lib/auth/actions.ts` | Sign-out clears local Better Auth session; provider revocation/all-session policy not explicit. |
| `src/lib/auth/request-proxy.ts` | Protected route gate and state mismatch recovery exist. |
| `src/app/api/auth/[...all]/route.ts` | Better Auth handler is dynamic/no-store and normalizes OAuth callback cookies. |
| `src/lib/publication/security.ts` | Publication credential primitives exist; P10 in-memory lockout risk exists. |
| `src/lib/collaboration/invite-entry.ts` | Invite token hashing and rate-limit pepper fallback exist. |

## Validation Gap

This document is research and static source evidence. It does not prove real Google, Cloudflare, email, D1, R2, Durable Object, or browser behavior. Those claims require the implementation-phase evidence named in `12_TEST_AND_VALIDATION_STRATEGY.md`.
