---
title: Security Privacy Threat Model
plan_id: 2026-06-29-cloudflare-migration-codex
document: 08
---

# Security Privacy Threat Model

## Trust Boundaries

TB-001 Browser to Cloudflare edge.

TB-002 Cloudflare edge to current or future origin.

TB-003 Next.js app to Supabase Auth/Postgres/Storage/Realtime.

TB-004 Worker sidecars to R2/KV/Queues/Hyperdrive/D1.

TB-005 Email provider to webhook route.

TB-006 Public share token/password boundary.

TB-007 Service-role/admin paths.

## High-Risk Threats

T-001 Cross-workspace data access after RLS removal or rewrite.

T-002 Auth session confusion between Supabase Auth and Better Auth during migration.

T-003 Public share access weakening from cache or WAF/CDN behavior.

T-004 Private object exposure in R2 due to public bucket, predictable keys, or weak signed URLs.

T-005 Stale KV values used as authorization truth.

T-006 Queue duplicate or replay causing duplicate mutations, duplicate emails, or state corruption.

T-007 Worker webhook endpoint accepting forged Resend or Cloudflare Email events.

T-008 D1 transaction mismatch causing partial writes compared with current RPC behavior.

T-009 WAF/rate-limit false positives blocking owner, beta users, webhook providers, or OAuth callbacks.

T-010 Rate limiting fail-open behavior not visible to operators.

T-011 Cloudflare cache storing user-specific protected pages.

T-012 Loss of audit/history/provider proof scripts during provider replacement.

T-013 Worker runtime or config drift exposes secrets, bypasses environment separation, or gives code broader Cloudflare account access than a binding requires.

## Required Controls

SC-001 Keep protected workshop, share, auth callback, upload, and webhook routes no-store/private until explicit caching proof exists.

SC-002 Do not use KV for session authority, locks, strong counters, or permission state.

SC-003 Keep application-level authorization on every R2 object access.

SC-004 Give every queued message an idempotency key.

SC-005 Verify webhook signatures at the edge/origin before state changes.

SC-006 For Better Auth, define exact session cookies, CSRF/same-site behavior, OAuth callback handling, magic-link behavior, and admin operations.

SC-007 For D1, replace RLS with an explicit authorization strategy and test every tenant boundary.

SC-008 Stage WAF rules in log/simulate mode before blocking where Cloudflare plan allows.

SC-009 Keep Cloudflare security events and app logs correlated by request ID where possible.

SC-010 Maintain backup/restore proof before any data migration.

SC-011 Use Worker bindings and scoped secrets for Cloudflare resources. Do not hardcode provider credentials in source, config, docs, logs, screenshots, or generated artifacts.

SC-012 Generate and review Worker environment binding types from the actual Wrangler config before treating a Worker slice as implementation-ready.

## Privacy Requirements

- Do not expose project names, estimate data, cost library content, emails, share tokens, invite tokens, or attachment metadata through edge logs or object keys.
- Avoid embedding raw user IDs, emails, or project names in R2 object keys unless encrypted/hashed or otherwise approved.
- Preserve deletion and retention behavior for uploads, shares, and account data.
- Re-evaluate data processing locations and subprocessors before production cutover.
