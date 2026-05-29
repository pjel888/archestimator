# Blast Radius & Risk Analysis — Shared Link Overhaul

**Date:** 2026-05-28

This document evaluates the blast radius and regression risks associated with renaming the public link surface and adding recipient-level interactivity.

---

## 1. Quantitative Impact & Affected Files

The publication system is deeply integrated across different project layers. Modifying these core elements affects the following surfaces:

| Layer | Files | Risk | Key Focus |
|-------|-------|------|-----------|
| **Database & Schema** | `supabase/migrations/` | High | Adding recipient/comments tables; RLS must be lock-tight. Migration must be backward-compatible (no breaking changes to `project_publications`). |
| **Server Actions** | `src/lib/publication/actions.ts` | Medium | Extending `create` / `republish` to handle email delivery notifications. Must preserve existing parameter contracts. |
| **Public Repository** | `src/lib/publication/public-repository.ts` | High | Loading recipient-bound comments and verify decisions. Must not expose recipient emails in snapshot JSON. |
| **Public API Routes** | `src/app/api/share/[token]/*` | High | New POST endpoints for comments and decisions must reuse existing `assertSameOriginPublicPost` and cookie patterns. |
| **Workspace UI** | `ProjectPublicationHeader.tsx`, `ProjectWorkspaceHeaderRow.tsx` | Medium | Adding the sheet selection checkboxes and recipient email chip composer. Must not break the existing compact modal layout. |
| **Public Receiver** | `src/app/share/[token]/page.tsx` | High | Client-side tabs component, comments form, and decision buttons. Must preserve password gate and cookie logic. |
| **AI Copilot Context** | `src/lib/ai/read-context.ts`, `api/ai/ask/route.ts` | Medium | Ensure no recipient emails or client comments leak into AI routes. Current AI routes do **not** read publication tables, so the risk is low but new context loaders must be explicitly excluded. |
| **Existing Test Suite** | `tests/vitest/project-publication-*.test.ts(x)` | High | Update test assertions to match the new "Shared link" strings and new UI controls. |
| **Next.js Config** | `next.config.ts` | Low | May need to update `images.remotePatterns` if component thumbnails are added to the receiver page. |
| **Design System** | `DESIGN.md`, `scripts/enforce-app-design-system.mjs` | Medium | New components must pass the design-system lint script. |

---

## 2. Risk Register & Mitigations

### 1. Breaking the AI Context / Route Providers (Medium Risk)
- **Problem**: New database fields or context loaders might accidentally include recipient details or client comments in AI context.
- **Mitigation**: Keep the `ProjectPublicationSnapshot` JSON structure backwards-compatible. Do not include recipient emails, comments, or decisions inside the snapshot itself. Keep client interactions strictly separated in their own database tables. When creating new context loaders, explicitly exclude `shared_link_*` tables.
- **Current State**: AI routes (`/api/ai/ask`, `/api/ai/package-builder`) do not read `project_publications` today, so blast radius is contained to preventing future leakage.

### 2. Violating the Strict Design System (Medium Risk)
- **Problem**: Introducing new checkboxes, tabs, comments panels, and decision buttons on the receiver page could violate the `DESIGN.md` rules.
- **Mitigation**: Ensure all new components use the SF Pro typography stack, font size ≤12px, border radius of 3px (`rounded-xs`), and Phosphor regular outline icons. Run `bun run lint:design-system` before merging any phase.

### 3. Spam & Abuse on Unauthenticated Write Paths (Critical Risk)
- **Problem**: Allowing client comments and decisions without authentication opens endpoints to automated bot spam.
- **Mitigation**: Enforce a signed cookie session (`shared_link_session_[token]`) issued only through a verified `recipient_token` query parameter. Apply rate limiting (5 comments/minute, 20/hour) on comment actions. Use the existing `assertSameOriginPublicPost` for CSRF on all new POST endpoints.

### 4. Regression of Existing Password-Protected Links (High Risk)
- **Problem**: Modifying the public page resolver or cookie handling could break the password gateway.
- **Mitigation**: Preserve the existing cookie validation logic in `SharePage` (`verifyPublicationAccessCookieValue`). The new recipient session cookie must be **additive** (required only for write actions), not a replacement for the existing password access cookie. Test password entry in Vitest and E2E before releasing.

### 5. Email Infrastructure Failure (High Risk)
- **Problem**: If we add email delivery in Phase 2 but the SMTP/Resend credentials are misconfigured, the "Generate shared link" action will fail silently or throw unhandled errors.
- **Mitigation**: Wrap email dispatch in a try/catch that logs the failure but does NOT fail the publication creation. The link should still be generated and copyable even if the email bounces. Store delivery status in `shared_link_recipients.delivery_status` for retry visibility.

### 6. Snapshot Payload Bloat (Medium Risk)
- **Problem**: Adding image URLs to the snapshot JSON could dramatically increase payload size for large projects.
- **Mitigation**: Keep image references as lightweight `{ url, alt }` objects. Do not inline base64 images. Use Next.js `<Image>` with `loading="lazy"` on the receiver page. Set a soft snapshot size budget of 500KB.

### 7. Database Migration Rollback (Medium Risk)
- **Problem**: If the V2 migration introduces performance issues or bugs, rolling back dropped columns or changed types is destructive.
- **Mitigation**: The migration must be **additive only** — no `ALTER TABLE ... DROP COLUMN` on `project_publications`. New tables (`shared_link_recipients`, etc.) can be dropped and recreated independently if needed.

---

## 3. Mitigation Rules for Execution

1. **Red Tests First**: Every new capability (e.g., selecting sheet subset, client posting comment) must start with a failing test inside the Vitest suite.
2. **Graph Verification**: Run `gitnexus_detect_changes` or equivalent before staging commits to verify changes are constrained to the publication module.
3. **No Index Compliance**: Ensure the receiver page layout preserves `<meta name="robots" content="noindex, nofollow" />`.
4. **Additive Changes Only**: Never modify existing `project_publications` columns. Always add new tables/columns.
5. **Design System Gate**: Run `bun run lint:design-system` and `bun run lint:app-font-size` before any phase merge.
