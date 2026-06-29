# 01 - Executive Summary

## Problem

Today, an estimator emails a client a shared proposal link. The client can open `/share/[token]`, review the proposal, comment, accept, decline, or request revisions. If they later sign in, there is no signed-in home for proposals sent to their verified email. Their history remains trapped in email threads and raw share URLs.

The canonical persona taxonomy already names this lane: **Shared-Link Recipient**. This plan gives that persona a first-class authenticated inbox without changing the existing public share surface.

## Solution

Create `/workshop/proposals`, a top-level workshop route that lists every publication sent to the signed-in user's verified email, across all workspaces. Rows are read-only inbox entries. The actual review experience remains the existing `/share/[token]` route.

The secure bridge is:

1. List RPC matches `auth.uid()` -> verified `auth.users.email` -> `shared_link_recipients.email`.
2. List DTO excludes all credential material.
3. Review form submits same-tab to `openRecipientProposalAction`.
4. Action authorizes the user for the target `publication_id` through an authorization-only RPC that returns only `publication_id` and `recipient_id`.
5. Action performs a bounded server-only read of `project_publications.encrypted_token`, rejects unavailable rows, decrypts the raw publication token, derives the credential version, sets the existing shared-link session cookies, and redirects to `/share/[raw-token]`.

## Why this approach

The data infrastructure already exists:

- `shared_link_recipients.email` is the natural join key to a signed-in user's verified email.
- `/share/[token]` already handles proposal review, comments, responses, cookies, password state, and revoked/expired behavior.
- `project_publications.encrypted_token` is the server-side recovery source for the raw URL token; `project_publications.token_hash` is only an HMAC lookup key and must never be used as the URL token.

The hard problem is secure identity binding. Signed-in recipients cannot directly read `shared_link_recipients` because RLS and column grants are manager-oriented. A Security Definer list RPC is required for recipient self-read, and a separate authorization-only RPC is required for the Server Action bridge.

## Scope

**In scope:**

- New migration with `list_recipient_publications_for_current_user()`, `authorize_recipient_publication_for_current_user(uuid)`, and `shared_link_recipients_lower_email_idx`.
- New server-only repository and explicit `"use server"` loader for client refetch.
- New `/workshop/proposals` route with loading, empty, error, success, expired, and revoked states.
- New same-tab `openRecipientProposalAction`.
- Sidebar insertion: Proposals above Publisher, shortcut `⌘4`; Publisher shifts to `⌘5`.
- Focused SQL, action, DOM, static leak, browser, and build/type verification.

**Out of scope:**

- Estimator-side "Sent proposals" view.
- Share-link sign-in-as-password flow.
- Lite accounts or claim-token workflows.
- Projects "Shared" tab rename.
- Realtime updates, filters, search, pagination, or bespoke mobile redesign.

## Readiness

`IMPLEMENTATION-READY` for planning handoff.

The user granted owner authority for planning decisions. The council resolved all previous open owner decisions and repaired the original security model. Implementation may start, but implementation completion requires the evidence gates in `12_TEST_AND_VALIDATION_STRATEGY.md`: provider SQL proof, targeted tests, browser smoke, static leak checks, and build/type validation.

## Verification posture

This planning task modified only planning documents and prompts. It does not claim code, provider, browser, production, or runtime proof. Source evidence and independent council review are recorded in `03_SOURCE_AND_CODEBASE_AUDIT.md`, `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`, and `20_OWNER_DELEGATED_DECISIONS_AND_COUNCIL_REVIEW.md`.
