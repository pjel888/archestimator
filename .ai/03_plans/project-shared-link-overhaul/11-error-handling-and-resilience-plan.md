# Error Handling & Resilience Plan — Shared Link Overhaul

**Date:** 2026-05-28
**Status:** Proposed Planning

This document maps failure modes, fallback UX, retry logic, and circuit breakers for the Shared Link system.

---

## 1. Failure Mode Matrix

| Failure | Impact | Detection | Recovery |
|---------|--------|-----------|----------|
| **Email provider down** | Recipients don't receive emails, but link is still copyable. | SMTP/Resend error response | Log failure, set `delivery_status='pending'`, allow owner to retry manually. |
| **Recipient token invalid** | Client cannot post comments or decisions. | Cookie verification fails | Show "Verify your email" prompt with a "Resend link" option (if owner re-triggers). |
| **Rate limit exceeded** | Client temporarily blocked from posting. | In-memory counter hits threshold | Return `429` with `Retry-After` header. UI shows countdown timer. |
| **Snapshot version mismatch** | Client is viewing an outdated proposal. | Server compares `snapshot_version` on POST | Return `409`. UI shows "Proposal updated — refresh" banner with a reload button. |
| **Database connection error** | All writes fail. | Supabase connection timeout | Return `500`. UI shows "Unable to save. Please try again." with retry button. |
| **Comment POST timeout** | Comment not saved, but UI may show it (optimistic). | Fetch timeout (> 10s) | Revert optimistic UI, show error, allow retry. |
| **Password brute force** | Unauthorized access attempt. | Attempt counter hits 5 | Lockout for 15 minutes. Show "Too many attempts" message. |
| **CSRF token mismatch** | POST blocked. | `assertSameOriginPublicPost` fails | Return `403`. UI falls back to page reload to refresh CSRF cookie. |
| **Image load failure** | Thumbnails don't render in estimate table. | `onError` on `<Image>` | Show a small placeholder square with the item's discipline initial. |
| **Mobile offline** | Client cannot post comment. | `navigator.onLine === false` | Queue comment in `sessionStorage`, show "Will send when online" banner, auto-retry on reconnect. |

---

## 2. Retry Logic

### 2.1 Client-Side Retry

**Comment POST**:
- Attempt 1: Immediate.
- Attempt 2: After 2 seconds (if network error).
- Attempt 3: After 5 seconds.
- Max attempts: 3.
- After max attempts: Show persistent error with manual "Retry" button.

**Decision POST**:
- Non-idempotent (after first success, subsequent attempts return 409).
- Do NOT auto-retry on 5xx. Show error immediately and require manual retry.

### 2.2 Server-Side Retry

**Email Dispatch**:
- Attempt 1: Immediate.
- Attempt 2: After 30 seconds (background queue or edge function).
- Max attempts: 3.
- After max attempts: Update `delivery_status='failed'` and stop retrying.

---

## 3. Fallback UX

| Scenario | Fallback |
|----------|----------|
| **0 estimates selected** | Disable "Generate shared link" button. Show inline validation: "Select at least one estimate." |
| **No comments yet** | Show friendly empty state: "No comments yet. Be the first to ask a question." |
| **No recipients added** | Show subtle helper text: "Add recipient emails to send the link automatically." |
| **Link opened without recipient token** | Show the proposal in read-only mode. Hide comment composer and decision buttons. Show banner: "Want to comment or approve? Open the link from your email invitation." |
| **Decision already recorded** | Replace buttons with static badge. Disable further decisions. Optionally allow additional comments. |
| **Email bounced** | Show yellow warning chip next to recipient in manager modal. Tooltip: "Delivery failed. Check the email address." |
| **Image fails to load** | Show a 32x32 gray square with the row's discipline initial (e.g., "S" for Structural). |

---

## 4. Circuit Breakers

### 4.1 Comment Endpoint Circuit Breaker
If the comment POST endpoint returns >50% 5xx errors over a 5-minute window:
- **Open the circuit**: Return `503 Service Unavailable` immediately for 2 minutes.
- **UX**: Show "Comments are temporarily unavailable. Please try again later."
- **Monitoring**: Log circuit breaker events to `shared_link_events`.

*Implementation*: Simple in-memory circuit breaker using a global error counter and timestamp. For multi-instance deployments, upgrade to a shared Redis counter.

### 4.2 Email Dispatch Circuit Breaker
If the email provider returns >50% failures over 5 minutes:
- **Open the circuit**: Stop attempting email sends for 10 minutes.
- **UX**: Show banner in manager modal: "Email delivery is temporarily paused. You can still copy and share the link manually."

---

## 5. Logging & Observability

All errors must be logged with structured context:

```typescript
type SharedLinkErrorLog = {
  level: "warn" | "error";
  route: string;           // e.g., "/api/share/[token]/comment"
  errorCode: string;       // e.g., "RATE_LIMIT_EXCEEDED"
  publicationId?: string;
  recipientId?: string;
  ipHash?: string;
  timestamp: string;
  stack?: string;
};
```

- **Warn**: Rate limits, CSRF mismatches, snapshot version mismatches (expected edge cases).
- **Error**: Database failures, crypto failures, unhandled exceptions.

**Alerting Thresholds**:
- >10 errors/minute on any share API route → page on-call engineer.
- >5% email delivery failure rate → notify infrastructure owner.
