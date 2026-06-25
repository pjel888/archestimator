# 04 - Data Flows

Generated: 2026-06-24T16:56:40.064Z

## High-level architecture flow

```text
Browser / public recipient
  -> Next.js proxy and App Router
  -> route handlers / server actions / RSC data loaders
  -> Supabase Auth / PostgreSQL / Storage / Realtime
  -> Resend / AI provider / Google / analytics / Vercel runtime
```

## Data-flow review backlog

- Auth login, callback, magic link, session refresh, logout, closed-beta gate
- Workspace/project/estimate CRUD and multi-tenant reads
- Proposal publication, public share token access, password/session cookies, comments, decisions
- Invitations, email-bound acceptance, recipient identity binding
- Upload/download/image processing/storage signed URL flows
- Excel/PDF export and spreadsheet formula sanitization
- Realtime presence/cursor collaboration
- Resend email generation/webhooks
- AI routes and feature-flagged server capability
- Analytics/third-party scripts and sensitive-token referrer/cache behavior

Each flow must be traced source-to-sink before being marked reviewed.
