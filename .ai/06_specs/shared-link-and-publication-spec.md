# Shared Link & Publication System Specification

**Date:** 2026-05-29  
**Status:** Active  
**Scope:** View-only client sharing portal (`/share/[token]`), public APIs (`/api/share/[token]/*`), and manager publication modal.

---

## 1. Security Architecture & Data Protection

Shared Links expose view-only estimate snapshots to external clients without requiring full app sign-up. The publication pipeline implements several defensive security layers:

```
                  +------------------------------------------------+
                  |  Client requests /share/[token]                |
                  +-----------------------+------------------------+
                                          |
                                          v
                      Is Link Password-Protected?
                      +----- YES ---------------- NO -----+
                      |                                   |
                      v                                   v
             Cookie Session Valid?               Access Granted
             +- YES ------ NO -+                          |
             |                 |                          v
             v                 v                   Load Snapshot
       Access Granted    Render Password Gate
                         - Lockout checking
                         - Verification
```

### 1.1 Token Resolution
*   The raw token in `/share/[token]` is never stored in the database.
*   The application performs SHA-256 peppered hashing on the raw token to match against `project_publications.token_hash`.
*   A second encrypted `recopy_token` is stored to allow regeneration of URLs without corrupting previous links.

### 1.2 Password Gates & HttpOnly Cookies
*   Optional passwords use **scrypt** cryptographic hashing.
*   Successful password entry issues a signed, context-bound, `HttpOnly` session cookie (`shared_link_session_[token]`) containing expiration attributes.
*   The public receiver page verifies this cookie before exposing snapshot JSON content.

### 1.3 Lockout Policy & Security Headers
*   **Brute-Force Lockout:** Tracks failed password attempts by IP and token in a memory-backed lockout register.
*   **Delay Matrix:** Failed entries trigger progressive sleep delays (1s, 2s, 4s, 8s...). A hard limit of **5 attempts** within **15 minutes** triggers a complete block, returning a stable generic error message.
*   **API Security:** Public endpoints enforce strict Content Security Policies (CSP), frame denial headers (`X-Frame-Options: DENY`), mime-type validation (`X-Content-Type-Options: nosniff`), and Same-Origin verification on modifying requests.

---

## 2. Interactive Presentation Layer

The public client view replicates the visual aesthetics of the estimating workspace but strips all editing permissions.

### 2.1 Aggregated Cost Charts
*   **CostDonutChart:** Renders a D3 SVG donut chart displaying costs grouped by space, component category, or supplier. Slices include hover-highlight animations that populate text summaries in the empty center ring.
*   **Cost Bubble Chart:** A D3 packed bubble chart alternative representing comparative cost volumes.
*   **Gutter Layout:** Donut callout labels are placed in side-gutters rather than arc intersections to prevent clipping.

### 2.2 Reconstructed Hierarchy Trees
*   Client snapshots store flat arrays of `PublicationSnapshotRow` objects.
*   The client runs a structural builder (`reconstructTreeFromRows`) to rebuild a nested location tree based on ancestor designation paths.
*   The reconstructed tree uses the shared read-only `WorkshopTree<TNode>` to maintain visual consistency.

### 2.3 Navigation Rail
*   Viewports above `lg` render a sticky left-aligned anchor tree menu.
*   **IntersectionObserver Integration:** Listens to center column scrolling and automatically highlights the active location node in the navigation tree.
*   Anchor clicks trigger smooth scroll actions (`scrollIntoView`) targeting the corresponding sheet category headers.

---

## 3. Client Collaboration Pipelines

Clients can interact with the estimate snapshot via comments and formal decision submissions.

### 3.1 Comment Submission (`/api/share/[token]/comment`)
*   Permits comments on individual estimate rows or hierarchical group nodes.
*   **Rate Limits:** Enforces a local sliding LRU rate limit: maximum **5 comments per minute** and **20 comments per hour** per recipient token.
*   **Sanitization:** Submissions are HTML-stripped and truncated to **1,000 characters** before PostgreSQL persistence.

### 3.2 Decision Workflow (`/api/share/[token]/decision`)
*   Allows recipients to submit a formal status: **Accept**, **Decline**, or **Request Revision**.
*   **Optimistic Version Checks:** Submissions must provide the current `snapshot_version` in the payload. The database rejects decisions if the snapshot version has changed in the background.
*   **Post-Decision Comments:** Submitting a decision does not block comments, allowing ongoing collaboration during revision loops.

### 3.3 Digest Notifications
*   Comment posts and decisions trigger automated email digests to the estimate owner.
*   **Throttling:** Email digests are rate-limited to **1 email per 15 minutes** per publication to prevent spamming from active client comment loops. Email transmission uses the Resend API integration.
