# 02 — Architecture and Trust Boundaries

## Stack snapshot

- **Framework:** Next.js `16.2.6` (App Router) with `next.config.ts` (TypeScript)
- **Runtime assumption:** Vercel (per repo conventions) with Bun for local dev / scripts (`package.json`)
- **Database:** Postgres via Supabase, accessed with `@supabase/supabase-js` `2.106.2` and `@supabase/ssr` `0.10.3`
- **Auth:** Supabase Auth (OTP + OAuth callback at `src/app/auth/callback/route.ts`)
- **AI provider:** DeepSeek via `src/lib/ai/deepseek.ts` (HTTP, 20s timeout, model `deepseek-v4-flash`, 900 max tokens)
- **Email:** Resend (transactional + webhook receiver at `src/app/api/webhooks/resend/route.ts`)
- **Storage:** Supabase Storage (via service-role client in upload routes)
- **Excel export:** `exceljs`
- **Image pipeline:** `sharp`

## Trust boundaries

```
┌──────────────────────────────────────────────────────────────────────┐
│                     UNTRUSTED — INTERNET                              │
│   • Anonymous shared-link viewers                                    │
│   • Anonymous upload attempts (public storage paths)                 │
│   • Webhook senders (Resend → /api/webhooks/resend)                  │
│   • OAuth/OTP callback initiators                                    │
└──────────────────────────────────────────────────────────────────────┘
                              │ HTTPS, WAF/CDN assumed
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     EDGE / MIDDLEWARE                                 │
│   • src/proxy.ts: rewrite bare host to www, security headers,        │
│     authentication wall for /app/*, gate dev auth bypass              │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     APPLICATION — Next.js (Node runtime)              │
│   • src/app/                     RSC + route handlers                │
│   • src/lib/                     Domain libraries                    │
│   • src/lib/ai/                  AI client + audit + auth            │
│   • src/lib/publication/         Shared-link crypto + storage        │
│   • src/lib/collaboration/       Invite entry contract               │
│   • src/lib/email/               Resend integration                  │
│   • src/lib/auth/                Session resolution + dev bypass     │
│   • src/lib/repositories/        RLS-dependent reads (server client) │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     DATA — Supabase / Postgres + Storage              │
│   • 19+ migrations: core, publication, share, audit, AI,             │
│     collaboration, auth-account, rate-limit, webhooks                │
│   • RLS enabled on every reviewed table                              │
│   • SECURITY DEFINER RPCs for AI apply + collab invitation resolve  │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL PROVIDERS (untrusted relative to app)    │
│   • DeepSeek HTTPS API                                               │
│   • Resend HTTPS API                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

## Boundary controls summary

| Boundary | Control | Evidence |
|---|---|---|
| Internet → Edge | TLS (assumed), Vercel WAF (assumed) | Not in code; not in scope |
| Edge → App auth wall | `src/proxy.ts` route protection for `/app/*` | `src/proxy.ts` |
| App → DB (regular) | RLS + server client w/ anon or session JWT | Migrations + `src/lib/repositories/workspace-repository.ts` |
| App → DB (privileged) | Service-role client in publication / public-repository / AI audit | `src/lib/publication/public-repository.ts`, `src/lib/ai/audit.ts`, `src/lib/email/resend-webhooks.ts` |
| App → Storage (privileged) | Service-role client for object writes from upload routes | `src/app/api/component-library/attachments/route.ts` (server-side, not user-facing) |
| App → External (DeepSeek) | Outbound HTTPS, env key | `src/lib/ai/deepseek.ts` |
| App → External (Resend) | Outbound HTTPS, env key, webhook signature verification | `src/lib/email/resend-webhooks.ts` + `src/app/api/webhooks/resend/route.ts` |
| External → App (Resend webhook) | Svix signature verification; `no-store`; missing-secret reject | `src/app/api/webhooks/resend/route.ts` |
| Internet → Public share routes | HMAC + AES-GCM token check, scrypt password, 24h access cookie, CSRF same-origin POST check, in-memory + durable rate limits, circuit-breaker on `/comment` | `src/lib/publication/security.ts`, `src/app/api/share/[token]/...route.ts` |
| Internet → Invite entry | Config-blocked (`PROJECT_INVITE_ENTRY_ENABLED=false`), fail-closed | `src/lib/collaboration/invite-entry.ts`, `src/app/invite/[token]/page.tsx` |

## Service-role consumption points (privileged)

The following are the only call sites that hold the service-role key (or are designed to do so). Any compromise of any of these grants full DB read/write.

1. `src/lib/publication/public-repository.ts` — public shared-link lookups
2. `src/lib/ai/audit.ts` — `createAiAuditSupabaseClient` — AI audit recorder
3. `src/lib/email/resend-webhooks.ts` — Resend outbound (not DB-privileged but key-privileged)
4. Upload route server-side writes (images, attachments) — `src/app/api/.../images/route.ts` and `attachments/route.ts`
5. `src/lib/auth/dev-auth.ts` — `getDevCurrentUserContext` (loopback + dev-flag gated)
6. XLSX export route — likely service-role or RLS-only (the file reads from `getProjectEstimateTreeByEstimate`, which uses the server client; needs explicit service-role check; flagged in [13](./13-file-upload-and-storage.md))

## Trust boundary risks (high-level)

1. **Service-role blast radius:** the service-role key is the only credential that bypasses RLS. A leaked key collapses the authorization model. **Mitigation:** keep it server-only, never expose via `NEXT_PUBLIC_*` (verified — only in `.env.example` as `SUPABASE_SERVICE_ROLE_KEY`).
2. **Dev auth bypass:** the dev-bypass path (loopback + flag) bypasses Supabase session lookup. If the flag is set in a non-loopback environment, it short-circuits auth. **Mitigation:** triple-gated (`NODE_ENV != production` + flag + loopback hostname). **Risk:** in a containerised environment, loopback checks must account for how the runtime resolves hostname.
3. **Public routes:** every public route handler must independently enforce the same-origin check. A future route that forgets `assertSameOriginPublicPost` opens CSRF. **Mitigation:** helper + code review; not a compile-time guarantee.

See [20](./20-compliance-mapping-owasp-asvs.md) for ASVS boundary mapping.
