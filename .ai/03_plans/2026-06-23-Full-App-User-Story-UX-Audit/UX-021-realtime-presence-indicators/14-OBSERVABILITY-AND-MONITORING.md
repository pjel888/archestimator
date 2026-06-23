# UX-021 — Observability And Monitoring

Date: 2026-06-23

## Observability Boundary

Use Vercel Web Analytics and Speed Insights for client/performance signal through the existing redaction seam. Add Postgres event rows only for core product/operator events that need queryable support or audit.

Do not add bespoke per-issue counters, histograms, gauges, traces, span attributes, or alerts unless a later implementation plan names a sink, redaction rule, owner, and proof gate.

Forbidden analytics payloads: tokens, emails, user IDs, project IDs, raw entity IDs, addresses, proposal contents, free text, and unredacted URLs.

## Audit Trail

If mutations are involved: `estimate_sheet_events`, `account_security_events`, `collaboration_audit_events`, `shared_link_events`.

## Implementation Hooks

- Reuse the existing Vercel analytics redaction seam for client events.
- Prefer existing Postgres audit or publication event tables for operator/support proof.
- Document any new event name, redaction rule, owner, and proof gate before implementation.

## Linkage

[04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md) | [10-PERFORMANCE-BUDGET.md](10-PERFORMANCE-BUDGET.md) | [13-NETWORK-AND-API-CONTRACT.md](13-NETWORK-AND-API-CONTRACT.md)
