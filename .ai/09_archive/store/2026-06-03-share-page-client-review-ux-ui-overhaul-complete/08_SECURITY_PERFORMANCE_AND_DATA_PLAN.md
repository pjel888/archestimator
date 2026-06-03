# 08 — Security, Performance & Data Plan

**Plan:** Share Page Client Review UX/UI Overhaul
**Date:** 2026-06-03

---

## Security

### Preserved Security Boundaries (NO CHANGES)

| Boundary | Current Implementation | Plan Impact |
|----------|----------------------|-------------|
| Token hashing | SHA-256(pepper + rawToken) → `project_publications.token_hash` | NO CHANGE |
| Password hashing | scrypt → `project_publications.password_hash` | NO CHANGE |
| Access cookies | HttpOnly, SameSite=Lax, signed `shared_link_session_[token]` | NO CHANGE |
| CSRF protection | `assertSameOriginPublicPost()` in API routes | NO CHANGE |
| Rate limiting | Durable `security_rate_limit_events` table + in-memory lockout | NO CHANGE |
| Password lockout | 5 attempts / 15 minutes, progressive delay | NO CHANGE |
| CSP headers | Enforced on `/share/:path*` | NO CHANGE |
| X-Frame-Options | DENY on API routes | NO CHANGE |
| X-Content-Type-Options | nosniff on API routes | NO CHANGE |
| Snapshot DTO | Whitelisted fields, no raw IDs/emails/private metadata | NO CHANGE |
| RLS policies | All publication tables RLS-protected | NO CHANGE |

### New Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Comment GET route (if added) | Public read-only, scoped to publication token, no recipient emails exposed |
| Decision GET route (if added) | Public read-only per recipient session, no cross-recipient decision leakage |
| Comment history in DOM | Comments contain author email display — already in current API response, no new exposure |

### Security Rules Enforced

- Never touch SlateCamp resources
- Only ArchEstimator Supabase project `ebxxqidacheyapmmzavr`
- No secrets in code, `.ai`, or commits
- No service-role key exposure
- No recipient token exposure in client-side code
- Hashed token design preserved
- CSRF/same-origin defenses preserved
- Rate limits preserved

---

## Performance

### Performance Budget
| Metric | Current (estimated) | Target | Risk |
|--------|---------------------|--------|------|
| Page load (LCP) | ~2-3s | No regression | LOW |
| First contentful paint | ~1-2s | No regression | LOW |
| Time to interactive | ~2-3s | No regression | LOW |
| Cumulative layout shift | ~0.05 | < 0.1 | LOW |
| JavaScript bundle size | ~150KB (gzipped) | No increase > 10KB | LOW |

### Performance Considerations

| Change | Performance Impact | Mitigation |
|--------|-------------------|------------|
| Comment history loading | Additional fetch on mount | Lightweight GET, small payload, cache-friendly |
| Decision state loading | Additional fetch on mount | Lightweight GET, tiny payload |
| Chart SVG rounding | Negligible CPU (string processing on small SVG) | Process once per render |
| Layout restructure | No new blocking resources | CSS-only changes, no new JS |
| New components | Minor bundle increase (~2-5KB gzipped) | Acceptable for UX improvement |

### Caching
- No changes to cache headers
- Publication snapshots remain server-rendered with `force-dynamic`
- Client-side comment/decision fetches use standard browser HTTP caching

### Image Loading
- Cover images: `next/image` with `loading="lazy"` (existing)
- Row thumbnails: `next/image` with `loading="lazy"` (existing)
- No new image loading patterns introduced

---

## Data

### No Schema Changes
This plan does NOT require any database migrations. All existing tables remain unchanged.

### Data Tables (Read-Only Context)
| Table | Use in Share Page |
|-------|-------------------|
| `project_publications` | Token resolution, password verification, snapshot retrieval |
| `shared_link_recipients` | Recipient identity resolution |
| `shared_link_comments` | Comment storage and retrieval (if GET route added) |
| `shared_link_responses` | Decision storage and retrieval (if GET route added) |
| `shared_link_events` | Activity/analytics event recording |
| `security_rate_limit_events` | Durable rate limit tracking |

### New API Reads (If Added in Phase 5)

**Comment GET** (if needed):
```
GET /api/share/[token]/comment
→ Returns: Comment[] for the publication
→ Auth: Public, no authentication required
→ Scope: Publication-scoped only
→ Rate limit: Existing public read rate limits apply
```

**Decision GET** (if needed):
```
GET /api/share/[token]/decision
→ Returns: { decision, note } for the current recipient session
→ Auth: Requires valid recipient session cookie
→ Scope: Recipient-scoped only
→ Rate limit: Existing public read rate limits apply
```

### Data Privacy
- No new PII exposure
- Comment author emails already visible in existing API (displayed as "You" or email)
- Decision state is recipient-scoped (cannot see other recipients' decisions)
- No raw tokens, password hashes, or internal IDs exposed in client-side code

---

## Failure Modes

| Failure | Impact | Recovery |
|---------|--------|----------|
| Comment GET fails | Comments don't load, user sees empty state or error | Retry button, graceful degradation |
| Decision GET fails | Decision state not shown, user can still submit | Retry on next page load |
| Chart rendering fails | Chart area blank | `CostDonutChart` handles gracefully (empty donut) |
| CSS layout breaks | Visual degradation | No data loss, functional elements still work |
| Build fails | Cannot deploy | Fix before merge |

---

## Input Validation

- Comment body: Max 1000 characters (existing client + server validation)
- Decision note: Max 2000 characters (existing client + server validation)
- All API inputs validated server-side (unchanged)
- HTML sanitization on comment body (existing)
