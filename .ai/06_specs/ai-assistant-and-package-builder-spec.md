# AI Assistant & Package-Builder System Specification

**Date:** 2026-05-29  
**Status:** Active  
**Scope:** Ask Flip panel (`AskFlipFooterAssistant`), API routes (`/api/ai/ask` and `/api/ai/package-builder`), and database RPC actions.

---

## 1. Intent-Gated Read-Only Chatbot (`/api/ai/ask`)

The chatbot allows users to ask questions about workspace resources. To protect database boundaries and prevent model hallucinations or SQL injection, all reads go through a strict intent resolver (`src/lib/ai/read-context.ts`):

```
                        +----------------------------+
                        |  Incoming Message Prompt   |
                        +--------------+-------------+
                                       |
                                       v
                             Intent Resolver Gate
                             - Project list?
                             - Library item search?
                             - Cost charts audit?
                             - Sheet activity?
                                       |
                                       v
                           ID-Free Compact Context
                           - Strips IDs/Emails
                           - Strips Private Metadata
                                       |
                                       v
                               LLM Response
```

*   **Intents Tracked:** Project lists, library component details, template categories, estimate chart summaries, and sheet event activity.
*   **ID-Free Data Transfer:** Raw UUIDs, profile emails, transaction correlation tokens, and client contact details are stripped from LLM prompts. Only safe display labels, unit values, and event categories are forwarded.
*   **Metadata Logging:** Chat runs write metadata-only logs to `ai_data_access_events` for audit trails, never storing user prompts or model responses.

---

## 2. Package-Builder Draft Engine (`/api/ai/package-builder`)

Prompts asking for structured setup (e.g. *"Assemble a 3 bedroom package, budget 5M php"*) route to the package builder.

### 2.1 Structured Room Mapping & Templates
*   Parses layout criteria to determine rooms (Area Nodes) and structures.
*   **Template Matching:** Matches keywords against reusable template titles.
*   **Precedent Ranking:** Scopes the workspace's cost history. Library items that have been frequently inserted into similar rooms in other projects are prioritized over unused items.
*   **Fixtures & Finishes:** Bedroom areas are plan-mapped with paint and lighting fixtures; bathrooms map flooring tiles and sanitary basins. If matching components are missing from the workspace, the draft remains silent rather than generating synthetic pricing.

### 2.2 Security Tokens & HMAC Validation
*   Draft results are returned as transient in-memory objects (not written to production tables).
*   **Draft Token:** The server issues an HMAC-signed token bound to the draft contents, draft ID, active user profile, workspace ID, and a strict expiration window.
*   Subsequent refinement requests (e.g. *"make it cheaper"*) must pass the parent draft, hash, and signed token back to the route for validation before modification.

---

## 3. Transaction-Safe Apply Workflow

Applying a drafted package is confirmation-gated and executes transactionally to protect database integrity.

```
       +--------------------------------------------------------------+
       | User reviews draft preview and checks "Confirm Apply" box   |
       +------------------------------+-------------------------------+
                                      |
                                      v
                             Verify HMAC Token
                             - Matches active user?
                             - Matches workspace?
                                      |
                                      v
                          Insert Idempotency Command
                          - Check ai_package_apply_commands
                                      |
                                      v
                        Transaction-Safe DB RPC Execute
                        - create_project_estimate_package_with_history
                        - Logs ai_package_applied history event
                        - Returns project/node IDs
```

### 3.1 Idempotency Protection
*   The client sends a UUID `command_id` with the Apply request.
*   The server inserts this ID into `ai_package_apply_commands` (which carries a unique constraint). Replays or network retries return `idempotent_replay` immediately without duplicating database rows.

### 3.2 Atomic Database RPC Execution
*   Apply parameters are passed to `public.create_project_estimate_package_with_history()`.
*   The database stored procedure verifies the user's workspace editor role, checks for an active server-authorized run row in `ai_action_runs`, and inserts all project, estimate, node, and row item snapshots atomically.
*   **Auto-Audit Logging:** Inserts a timeline event (`ai_package_applied`) in `estimate_sheet_events` in the same database transaction. Any failure triggers a complete transaction rollback.
