# Archestimator Proposal Package & Publication System

**Date:** 2026-05-29<br />
**Status:** Implemented / Active<br />
**Purpose:** Defines the client-facing presentation layers of the application, including offline spreadsheet exports and view-only shared link dashboards.

---

## 1. Industry-Standard Excel Proposal Export

Contractors require offline spreadsheet copies that match professional quotation formats. Users can generate exports via `/workshop/projects/[projectId]/estimates`.

### 1.1 Spreadsheet Design & Topology
*   **Grid Layout:** Implements column allocations:
    *   `Col A`: Item reference code or outline number (e.g. `1.1.1`).
    *   `Col B`: Material name / Designation description.
    *   `Col C`: Cost description particulars.
    *   `Col D`: Quantity (right-aligned).
    *   `Col E`: Unit (centered).
    *   `Col F`: Base Unit Cost (right-aligned, PHP formatted).
    *   `Col G`: Contingency/Markup/Discount percentage (right-aligned).
    *   `Col H`: Total Cost (right-aligned, PHP formatted).
*   **Total Computations:** Every row calculates using Excel cell formulas:
    *   `Total = (Quantity * UnitCost) + MiscCost + ((Quantity * UnitCost) * ContingencyPercentage / 100)`.
*   **Visual Styling:** Uses high-contrast typography, bold font weights for Group and Area headers, distinct zebra striping for rows, and clean grid borders to prevent clipping.

---

## 2. V2 Shared Link Client Publications

Managers can publish view-only snapshots of an estimate to clients through the **Public link manager modal** on the project page.

### 2.1 Publication Generation (`/share/[token]`)
*   Creates a `project_publications` database row holding a token hash, optional scrypt password hash, and the complete immutable estimate JSON snapshot at publication time.
*   **Access Control:** Managers add recipient email addresses. Authentication verification uses a signed `archestimator_pending_invite` cookie or context-bound HttpOnly access cookie for password-gated sheets.
*   **Lockout Policy:** IP addresses are blocked for 15 minutes after 5 consecutive password failures. Locked screens render a generic security error and log a `password_attempt` event.

### 2.2 Client Receiver Dashboard
The public route `/share/[token]` displays a dashboard designed for client review:

*   **Cost Donut Chart:** A D3 donut chart displaying cost allocations by space, category, or supplier. Highlights hover states and updates cost numbers in the empty center circle.
*   **Sub-Tab Content Toggles:**
    *   **Tree View:** Reconstructs the tree structure from snapshot row lists using node path logic, rendering read-only custom nodes.
    *   **Grid Preview:** Displays flat tabular tables matching spreadsheet views.
*   **Floating Navigation Rail:** Displays a vertical anchor list on large viewports, automatically scrolling to specific sections and highlighting active positions using IntersectionObservers.

### 2.3 Collaboration & Feedback Channels
*   **Comments Feed:** Clients can write messages on specific rows or nodes. Submitting posts passes CSRF checks, validates active sessions, and processes text through input sanitizers.
*   **Decision Controls:** Clients record formal approvals by clicking **Accept**, **Decline**, or **Request Revision**. Submissions verify snapshot version parameters to prevent race conditions on stale estimates.
*   **Owner Notifications:** Publication events trigger automated emails containing summaries of comments or decisions, sent to the project owner via Resend integrations (rate-limited to 1 digest per 15 minutes).
