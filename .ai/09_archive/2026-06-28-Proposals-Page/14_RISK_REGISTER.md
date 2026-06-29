# 14 - Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Detection | Prevention | Mitigation | Owner | Residual |
|---|---|---|---|---|---|---|---|---|---|---|
| RISK-001 | Closed-beta gate denies legitimate recipients | Recipient email is not allowlisted | Medium | Medium | Medium | Sign-in support report | Add recipient emails to allowlist when publication is sent | Manual allowlist; future auto-add | Philip/Ops | Low after process |
| RISK-002 | Sidebar redesign branch conflicts with nav insertion | Concurrent edit to `MainSidebar.tsx` | Medium | Low | Low | Rebase/merge conflict | Rebaseline before Phase 5 | Resolve manually; preserve owner shortcut decision | Impl | Low |
| RISK-003 | RPC slow at higher recipient volume | Recipient has hundreds of publications | Low | Medium | Low | Provider `EXPLAIN ANALYZE`, logs | `lower(email)` index and limit | Add cursor pagination | Impl | Low |
| RISK-004 | Recipient email changes and old proposals disappear | User changes auth email | Low | Medium | Low | User report | Document email-as-identity v1 | Manual data migration or future `claimed_user_id` | Philip | Accepted |
| RISK-005 | Credential material leaks to client/logs | Developer returns/logs hash or encrypted token | Low | High | High | Static leak grep, tests, review, browser network inspect | DTO contract excludes credentials | Remove leak; audit logs; rotate affected material if exposed | Impl | Low after checks |
| RISK-006 | `token_hash` is accidentally used as `/share/[token]` | Implementer misses token taxonomy | Medium | High | High | Browser smoke fails; code review | Credential taxonomy in `07`/`08`/`11`/prompts | Use `encrypted_token` decrypt server-side only | Impl | Low |
| RISK-007 | Direct Server Action POST opens unauthorized proposal | Attacker posts another `publicationId` | Low | High | High | Action negative tests/provider denial | Authorization RPC before privileged read | Deny, log non-sensitive reason, fix forward | Impl | Low |
| RISK-008 | Expired/revoked row opens despite disabled UI | Direct POST bypasses disabled control | Medium | Medium | Medium | Action tests | Action rechecks publication status | Return unavailable; refresh list | Impl | Low |
| RISK-009 | Type generation drift | `gen:types` skipped after migration | Medium | Medium | Medium | Type-check fails or RPC typing missing | Implementation checklist | Run `bun run gen:types` | Impl | Low |
| RISK-010 | Server Function refetch storms on focus | Rapid tab switching | Low | Low | Low | Network panel/test | TanStack stale time and dedupe | Increase stale time | Impl | Low |
| RISK-011 | Email reuse exposes prior employer proposals | Reused mailbox matches old recipient rows | Low | Medium | Low | User/privacy report | Accepted email-identity tradeoff for v1 | Revoke stale publications; future claim model | Philip | Accepted |
| RISK-012 | Cookie helper signature changes before implementation | Source drift | Low | Medium | Low | Stale-plan checklist/type-check | Re-read helper before Phase 4 | Update action to current helper contract | Impl | Low |
| RISK-013 | Browser-only redirect/cookie behavior differs from tests | Unit tests mock too much | Medium | Medium | Medium | Playwright smoke | Browser proof is mandatory | Fix action/form/cookie integration before completion | Impl | Low |
| RISK-014 | Provider function applies locally but fails linked project | Migration drift/provider differences | Low | High | Medium | Supabase push/readback | Idempotent migration and provider proof | Drop new functions/index; fix forward | Impl | Low |
| RISK-015 | Plan drifts before implementation | New merge changes schema/helpers/routes | Medium | Low | Low | README stale-plan checklist | Revalidate before first edit | Patch plan or adjust implementation | Impl | Low |

## Top risks

The highest risks are credential leakage, misuse of `token_hash` as URL material, and direct Server Action authorization bypass. The repaired plan addresses these with credential taxonomy, authorization-only RPC, server-side decrypt, action negative tests, static leak checks, provider SQL proof, and browser smoke.

## Unmitigated critical risks

None. Remaining high-impact risks have explicit implementation proof gates before completion.
