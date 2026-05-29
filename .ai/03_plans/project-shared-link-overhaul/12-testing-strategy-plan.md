# Testing Strategy Plan — Shared Link Overhaul

**Date:** 2026-05-28
**Status:** Proposed Planning

This document defines the testing pyramid for the Shared Link V2 features: unit, integration, E2E, security, and load tests.

---

## 1. Testing Pyramid

```
      ┌─────────┐
      │   E2E   │  ← Playwright (happy paths, a11y, mobile)
      ├─────────┤
      │   Int   │  ← Vitest + MSW (API routes, server actions)
      ├─────────┤
      │  Unit   │  ← Vitest (components, hooks, utilities)
      └─────────┘
```

**Target Coverage**:
- Unit: 80%+ for new components and hooks.
- Integration: 100% of new API routes.
- E2E: All happy paths and critical sad paths.

---

## 2. Unit Tests (Vitest)

### 2.1 Component Tests

**`SheetPickerList`**:
- Renders all estimates with checkboxes.
- Toggling an estimate calls `onToggle` with the correct ID.
- "Select all" checks every box. "Deselect all" unchecks all.
- Accessibility: each checkbox has an associated label.

**`RecipientEmailComposer`**:
- Typing a valid email and pressing Enter adds a chip.
- Typing an invalid email shows an inline error.
- Clicking "X" on a chip removes it.
- "Send email" button is disabled while `isSending` is true.

**`SharePageTabs`**:
- Renders one tab per estimate.
- Clicking a tab shows the corresponding table.
- Left/Right arrow keys move focus between tabs.
- Active tab has `aria-selected="true"`.

**`SharePageComments`**:
- Submitting a comment calls the POST endpoint.
- Optimistic UI: comment appears immediately, then is confirmed.
- Error state: reverts optimistic comment and shows error banner.
- Character counter updates as user types.

**`SharePageDecision`**:
- Clicking "Accept" opens confirmation modal.
- On success, buttons are replaced by badge.
- On 409 (already decided), shows "Decision already recorded."

### 2.2 Hook Tests

**`useSharedLinkSession`**:
- Returns `isVerified: true` when cookie is present and valid.
- Returns `isVerified: false` when cookie is missing.

**`useRateLimitedSubmit`**:
- Debounces rapid clicks.
- Handles success and error callbacks.

### 2.3 Utility Tests

- **Rate limiter**: verify counters reset after TTL.
- **Cookie parser**: verify `shared_link_session_*` extraction.
- **Input sanitizer**: verify HTML stripping.

---

## 3. Integration Tests (Vitest + MSW)

### 3.1 API Route Tests

**`POST /api/share/[token]/comment`**:
- Returns 201 with comment ID on valid request.
- Returns 429 when rate limit exceeded.
- Returns 403 when CSRF token missing.
- Returns 403 when session cookie invalid.
- Returns 400 when body exceeds 1,000 chars.
- Returns 410 when publication revoked.

**`POST /api/share/[token]/decision`**:
- Returns 201 on first decision.
- Returns 409 on duplicate decision.
- Returns 403 when session cookie invalid.

**`GET /api/share/[token]/activity`**:
- Returns comments and decisions for valid recipient.
- Filters out `is_internal` comments for unauthenticated requests.
- Returns 403 when recipient token missing.

### 3.2 Server Action Tests

**`addSharedLinkRecipients`**:
- Inserts rows into `shared_link_recipients`.
- Deduplicates emails (case-insensitive).
- Rejects non-manager users with "Only owners and admins..." error.

**`createProjectPublication` with `selectedEstimateIds`**:
- Snapshot only includes selected estimates.
- Empty array results in all estimates (backward compatibility).

---

## 4. E2E Tests (Playwright)

### 4.1 Happy Path: Owner Creates Shared Link

```typescript
test("owner selects sheets and generates a shared link", async ({ page }) => {
  await page.goto("/workshop/projects/test-project");
  await page.click('button:has-text("Shared link")');
  await page.click('text=Sheets');
  await page.check('label:has-text("ES-001 — Structure")');
  await page.check('label:has-text("ES-002 — Finishes")');
  await page.click('button:has-text("Generate shared link")');
  await expect(page.locator('[aria-label="Shared link"]')).toHaveValue(/\/share\//);
});
```

### 4.2 Happy Path: Client Reviews and Accepts

```typescript
test("client opens link, views tabs, and accepts", async ({ page }) => {
  await page.goto("/share/test-token?recipient=test-recipient-token");
  // If password protected
  await page.fill('input[type="password"]', "test-pass");
  await page.click('button:has-text("Unlock")');
  // Tabs
  await expect(page.locator('role=tab:has-text("Structure")')).toBeVisible();
  await page.click('role=tab:has-text("Finishes")');
  await expect(page.locator('text=Concrete works')).not.toBeVisible();
  // Comment
  await page.fill('textarea', "Looks good!");
  await page.click('button:has-text("Post comment")');
  await expect(page.locator('text=Looks good!')).toBeVisible();
  // Decision
  await page.click('button:has-text("Accept Estimates")');
  await page.click('button:has-text("Confirm")');
  await expect(page.locator('text=Accepted on')).toBeVisible();
});
```

### 4.3 Sad Path: Password Lockout

```typescript
test("blocks password after 5 failed attempts", async ({ page }) => {
  for (let i = 0; i < 5; i++) {
    await page.fill('input[type="password"]', "wrong");
    await page.click('button:has-text("Unlock")');
  }
  await expect(page.locator('text=Too many attempts')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeDisabled();
});
```

### 4.4 Mobile Layout

```typescript
test("mobile tabs scroll horizontally and decision bar sticks to bottom", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/share/test-token?recipient=test-recipient-token");
  await expect(page.locator('[data-testid="sticky-decision-bar"]')).toBeVisible();
  // Swipe tabs
  const tabs = page.locator('role=tablist');
  await tabs.evaluate(el => el.scrollBy(200, 0));
});
```

### 4.5 Accessibility

```typescript
test("tabs are keyboard navigable", async ({ page }) => {
  await page.goto("/share/test-token?recipient=test-recipient-token");
  await page.keyboard.press("Tab"); // Focus first tab
  await page.keyboard.press("ArrowRight"); // Move to next tab
  await expect(page.locator('role=tab[aria-selected="true"]')).toHaveText("Finishes");
});
```

---

## 5. Security Tests

### 5.1 Penetration Scenarios

| Scenario | Expected Result |
|----------|----------------|
| POST comment without CSRF header | `403 Forbidden` |
| POST comment without session cookie | `403 Forbidden` |
| POST comment with HTML `<script>` tag | Stored as plain text; no XSS on render |
| POST decision with mismatched snapshot version | `409 Conflict` |
| Brute-force password (6 attempts) | `429 Too Many Requests` with lockout |
| Request `/api/share/[token]/comment` from different origin | `403 Forbidden` |
| SQL injection in comment body | Safely escaped; no error |
| Comment body > 1,000 chars | `400 Bad Request` |

### 5.2 Cookie Security

- Verify `HttpOnly`, `SameSite=Lax`, and `Secure` flags in production.
- Verify cookie payload is HMAC-signed and rejects tampering.

---

## 6. Load Tests

**Tool**: k6 or Artillery (command-line load testing).

**Scenarios**:

1. **Share Page Load**:
   - 100 concurrent virtual users.
   - Each user opens `/share/[token]` 10 times.
   - Target: P95 < 150ms TTFB.

2. **Comment Flood**:
   - 20 concurrent users.
   - Each user posts 10 comments as fast as possible.
   - Target: First 5 succeed per minute; subsequent requests receive `429`.
   - Verify no duplicate comments due to race conditions.

3. **Decision Race**:
   - 5 concurrent users attempt to submit a decision simultaneously.
   - Target: Exactly 1 succeeds; 4 receive `409 Conflict`.

---

## 7. Test Data & Fixtures

Create a shared fixture file:

```typescript
// tests/fixtures/shared-link.ts
export const mockPublicationSnapshot: ProjectPublicationSnapshot = {
  schemaVersion: 1,
  generatedAt: "2026-05-28T00:00:00.000Z",
  project: { id: "proj-1", name: "Valencia Residence", projectCode: "VR-001", clientName: "Client Family", location: "Quezon City", currencyCode: "PHP" },
  estimateCount: 2,
  rowCount: 4,
  totalCost: 4600,
  estimates: [
    { id: "est-1", name: "Structure", sheetCode: "ES-001", updatedAt: "2026-05-27T00:00:00.000Z", rowCount: 2, totalCost: 2300, rows: [/* ... */] },
    { id: "est-2", name: "Finishes", sheetCode: "ES-002", updatedAt: "2026-05-27T00:00:00.000Z", rowCount: 2, totalCost: 2300, rows: [/* ... */] },
  ],
};
```

---

## 8. CI/CD Integration

- **Pre-commit**: `bun run lint` and `bun run test:unit` must pass.
- **Pre-merge**: Full `bun run validate` (unit + integration + typecheck + lint + design-system lint).
- **Nightly**: E2E tests against staging environment.
- **Before Release**: Load test + security scan.
