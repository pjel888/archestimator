---
title: Feature Brief And Scope
plan_id: 2026-06-29-cloudflare-migration-codex
document: 02
---

# Feature Brief And Scope

## Brief

The owner wants to prepare the cheapest/full Cloudflare redesign while Archestimator has not launched. Candidate services:

- Workers for compute.
- D1 for SQL database.
- Better Auth for auth.
- KV for cache.
- R2 for object storage.
- Queues for background jobs.
- Hyperdrive for database acceleration.
- Email Routing/Sending.
- WAF and DDoS protection.
- Durable Objects/WebSockets for realtime.
- Turnstile for abuse protection.
- Web Analytics and Workers Observability for speed/ops proof.

The requested output is a research-backed planning package and an update to the generic planning prompt so future planning work handles provider migrations correctly. This task is planning only.

## In Scope

- Current-state repository/provider dependency audit.
- Cloudflare platform fit and current official-doc facts.
- Better Auth fit for Cloudflare/D1.
- Provider parity matrix.
- Cost model inputs and pricing facts.
- Migration phases.
- Validation gates.
- Rollback strategy.
- Risk register.
- Prompt update for future provider-migration planning.
- Full Cloudflare-native target design.
- D1/Auth/Realtime redesign plan.
- Performance budget and "super fast" proof plan.

## Out Of Scope

- Writing or changing application code.
- Changing tests.
- Changing Supabase migrations.
- Creating Cloudflare resources.
- Moving DNS.
- Replacing Supabase/Vercel/Resend in a live environment.
- Committing or pushing.
- Claiming the migration is implemented.

## Product Outcomes To Protect

- Authenticated workshop access works for first users.
- Estimating workflows, cost libraries, and proposal packages stay correct.
- Collaboration invitations, public share links, realtime presence/cursors, and email notifications remain reliable.
- Uploads, attachments, image access, and scan/cleanup jobs remain secure and recoverable.
- Data isolation and RLS-equivalent behavior remain provable.
- Launch readiness checks remain meaningful after any provider shift.

## Initial Assumptions

A-001: Cost is a driver, but the owner has not supplied current monthly usage/spend yet.

A-002: The product is pre-launch/closed-beta, so a deeper redesign is acceptable if safety is preserved and current providers remain available as fallback during proof.

A-003: Supabase/Postgres remains the current durable baseline until a detailed D1 redesign proof exists.

A-004: Cloudflare Email Service must be evaluated separately from older Email Routing assumptions because current Cloudflare docs describe outbound sending through Email Service.

A-005: Cloudflare's Next.js path should be treated as adapter-dependent and version-sensitive because local Next.js docs still require platform fidelity proof for non-verified adapters.

## Non-Goals

- No production provider cutover during this planning task.
- No rewrite for its own sake.
- No D1 adoption unless it passes data-integrity, authorization, backup/restore, and performance requirements.
- No auth replacement unless session, claims, invite, closed-beta, legal terms, and RLS identity behavior can be preserved or redesigned with proof.
- No hybrid default if full Cloudflare-native proof is viable, fast enough, and cheaper; hybrid remains the fallback.
