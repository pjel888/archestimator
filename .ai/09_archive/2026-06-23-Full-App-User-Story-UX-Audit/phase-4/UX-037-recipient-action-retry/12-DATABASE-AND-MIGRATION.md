# UX-037 — Database And Migration

Date: 2026-06-23 | DB Impact: MINIMAL — UI/copy only

This issue is UI/copy-only. No schema change, migration, or backfill required. No DB objects created, altered, or deleted.

## Data Classification

| Class | Examples | Handling |
|---|---|---|
| Public | Landing copy | No restrictions |
| Internal | Workspace names | Auth-gated |
| Confidential | Cost data | Auth + RLS + never in logs |
| Restricted | Emails, tokens | Encrypted/hashed |

**UX-037** handles **Public/Internal** class data.

## Linkage

[11-SECURITY-AND-RLS.md](11-SECURITY-AND-RLS.md) | [07-BLAST-RADIUS-AND-ROLLBACK.md](07-BLAST-RADIUS-AND-ROLLBACK.md) | [15-IMPLEMENTATION-READINESS-CHECKLIST.md](15-IMPLEMENTATION-READINESS-CHECKLIST.md)
