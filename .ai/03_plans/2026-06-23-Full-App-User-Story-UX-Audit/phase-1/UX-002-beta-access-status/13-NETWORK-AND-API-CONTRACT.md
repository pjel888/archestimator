#  — Network And API Contract

Date: 2026-06-23

## Status Codes

| Code | When |
|---|---|
| 200 | Success |
| 201 | Created |
| 302 | Redirect (login/accept) |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Unauthorized |
| 404 | Not found |
| 413 | Payload too large |
| 429 | Rate limited |
| 500 | Server error |

## Error Shape
```json
{
  "status": "error",
  "message": "Specific, actionable description",
  "code": "ERR_VALIDATION_FAILED",
  "fields": { "fieldName": "Validation message" }
}
```

**Message rules:** specific, actionable, safe (never raw DB errors, stack traces, internal paths)

## Pagination

| Param | Default | Max |
|---|---|---|
| page | 1 | — |
| pageSize | 20 | 100 |
| orderBy | created_at | — |
| order | desc | — |

## Caching

| Surface | Cache-Control |
|---|---|
| Public pages | `s-maxage=3600, stale-while-revalidate=86400` |
| Auth pages | `private, no-cache` |
| API | `private, max-age=30` |
| Static assets | `public, max-age=31536000, immutable` |

## Realtime (if applicable)

| Channel | Event | Payload |
|---|---|---|
| `estimate-cursor:{sheetId}` | `cursor-move` | `{ userId, position, timestamp }` |
| `project-presence:{projectId}` | `presence-sync` | `{ users: [...], lastSeen }` |

## Idempotency
- `INSERT ... ON CONFLICT` for upserts
- Disable submit during async ops
- Use request hash for dedup

## Linkage

[04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md) | [10-PERFORMANCE-BUDGET.md](10-PERFORMANCE-BUDGET.md) | [14-OBSERVABILITY-AND-MONITORING.md](14-OBSERVABILITY-AND-MONITORING.md)
