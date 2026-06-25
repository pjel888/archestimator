# 01 - Threat Model

Generated: 2026-06-24T16:56:40.064Z

## Sensitive assets

- Account and identity data
- Workspace membership and roles
- Client and recipient information
- Projects, estimates, estimate rows, and pricing/supplier data
- Proposal snapshots, comments, decisions, and responses
- Uploaded images, PDFs, XLS/XLSX files, and attachments
- Audit and security events
- Share, invitation, session, webhook, OAuth, API, and service-role tokens

## Trust boundaries

- Browser and public network input
- Next.js proxy, App Router, React Server Components, route handlers, and server actions
- Supabase SSR/auth helpers and session cookies
- Supabase PostgreSQL with RLS/RPC/triggers/views/grants
- Supabase Storage buckets and signed URLs
- Supabase Realtime channels
- Resend email APIs and webhooks
- AI provider routes and DeepSeek-related code
- Google/analytics services
- Vercel deployment/runtime controls
- CI/CD workflows and dependency installation

## Threat actors

- Anonymous internet attacker
- Unauthenticated former user
- Normal authenticated user
- Same-workspace lower-privilege member
- User from another workspace
- Removed workspace member
- Invited but unregistered user
- Malicious public-link recipient
- Attacker with leaked or old share token
- Malicious file uploader
- Automated bot
- Compromised browser/session
- Compromised dependency or CI workflow
- Developer accidentally enabling development bypasses in hosted environments

## Repository-specific rule

The central proxy intentionally skips `/api` paths. Therefore every API route must prove its own authentication, authorization, tenant isolation, validation, CSRF/origin handling, and abuse controls.

## Current status

Threat model scaffolded from the supplied brief. Source-backed data flows and control evidence remain pending.
