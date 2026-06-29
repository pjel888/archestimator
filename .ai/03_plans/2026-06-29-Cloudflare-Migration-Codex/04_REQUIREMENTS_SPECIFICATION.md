---
title: Requirements Specification
plan_id: 2026-06-29-cloudflare-migration-codex
document: 04
---

# Requirements Specification

## Functional Requirements

R-001: The migration strategy must preserve first-user launch readiness for auth, estimating workflows, cost library, proposal publication, collaboration, uploads, email, and data recovery.

R-002: The plan must support a hybrid target if hybrid is cheaper and safer than full provider replacement.

R-003: The plan must quantify Cloudflare cost using real usage before recommending production cutover.

R-004: Cloudflare front-door adoption must be separable from application hosting/database/auth migration.

R-005: Workers adoption must start with sidecars or bounded services unless Next.js 16 route parity is proven.

R-006: D1 must not replace Supabase Postgres until the app's Postgres features are mapped to SQLite/D1-compatible behavior or explicitly redesigned.

R-007: Better Auth must not replace Supabase Auth until SSR sessions, route gating, OAuth/magic links, claims, admin operations, invite flows, closed-beta gates, terms gates, and database authorization identity are proven.

R-008: KV may only store cache values where eventual consistency and stale reads are acceptable.

R-009: R2 may be piloted for objects only when app-level authorization, signed access, upload validation, virus/scan lifecycle, image handling, and rollback are defined.

R-010: Queues may be piloted for retryable jobs only when idempotency, retries, poison messages, scheduling, and observability are defined.

R-011: Hyperdrive may be considered only for Worker-to-external-Postgres/MySQL paths. It must not be described as D1 acceleration or a database replacement.

R-012: Cloudflare Email Service must be evaluated separately for inbound routing and outbound sending. Resend remains baseline until transactional delivery parity is proven.

R-013: Realtime collaboration must have an explicit replacement strategy before any Supabase Realtime removal.

R-014: WAF/rate-limit/DDoS adoption must include rules, false-positive handling, allowlists, security event review, and rollback.

R-015: Every migration slice must include rollback or fix-forward steps that avoid data loss.

R-016: Provider readiness scripts must be replaced with equivalent proof scripts before old provider checks are retired.

R-017: The planning prompt must be updated so future provider-migration plans require official-doc research, parity matrices, cost inputs, and staged proof gates.

R-018: Any future Cloudflare execution slice must refresh installed Cloudflare skill guidance, official Cloudflare docs, product changelogs, and Wrangler config schema before relying on exact limits, pricing, API fields, binding shapes, or compatibility behavior.

R-019: Any Worker-based slice must treat `wrangler.jsonc`, generated `Env` binding types, compatibility date/flags, secrets handling, observability config, and `workerd`/preview behavior as required planning and proof surfaces.

## User And Operator Stories

U-001: As the owner, I can compare current spend with Cloudflare spend using actual monthly usage and current official pricing.

U-002: As an estimator, I can sign in, access the workshop, and keep my workspace boundaries intact after any auth/provider change.

U-003: As an estimator, my projects, estimates, rows, costs, snapshots, and templates remain correct after any database/storage migration.

U-004: As a collaborator, presence, cursor sharing, invitations, and permissions continue to work or have a clearly communicated replacement plan.

U-005: As a client using a public share link, publication access, comments, responses, passwords, and decisions remain secure and available.

U-006: As a user uploading images or attachments, uploads remain private, scanned, authorized, and recoverable.

U-007: As an operator, background upload scan/cleanup jobs retry safely and surface failures.

U-008: As an operator, email delivery failures are visible and do not break link generation.

U-009: As an operator, I can roll back each migration slice without losing data.

## Non-Functional Requirements

NFR-001: No measurable regression in protected-route authorization.

NFR-002: No cross-workspace data exposure.

NFR-003: No production cutover without provider-readback evidence.

NFR-004: No provider replacement based on pricing pages alone.

NFR-005: No new critical single point of failure without rollback.

NFR-006: No cache layer may become an authorization source of truth.

NFR-007: No email migration without deliverability and webhook/event parity.

NFR-008: No D1 migration without a database restore and backup strategy.

NFR-009: No Cloudflare production slice may hard-code stale pricing or quota numbers without an execution-date source refresh.
