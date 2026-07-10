# Supermemory Always-On Agent Bootstrap

**Date:** 2026-07-10
**Mode:** local agent-framework implementation
**Proof boundary:** local machine and repo adapters

## Goal

Make Archestimator's local Supermemory service a verified, persistent bootstrap
dependency for every coding-agent entry surface, without committing secrets or
trusting an unverified installer wrapper.

## Scope

- Persist the verified native server path and pinned SHA-256 outside the repo.
- Load only recognized provider variables from the local Supermemory env file.
- Add idempotent configure and ensure commands plus a macOS LaunchAgent.
- Require `bun run supermemory:ensure` in canonical agent guidance and payloads.
- Make agent validation fail when the bootstrap requirement drifts.
- Prove clean-shell startup, restart recovery, health, and memory round trip.

## Non-goals

- Commit provider credentials or `.supermemory/` runtime data.
- Install or execute an unpinned registry package or second-stage wrapper.
- Change application runtime, provider resources, or production infrastructure.
- Add browser or visual validation.

## Acceptance Criteria

1. A clean shell can resolve the persisted binary configuration and report a
   healthy Supermemory service without manually exporting server variables.
2. The configured native binary must match a repo-pinned checksum before start.
3. Provider config is parsed as data, not sourced as executable shell input.
4. A loaded macOS LaunchAgent restores health after the server is stopped.
5. Every active agent entry surface requires `bun run supermemory:ensure`, and
   `bun run validate:agents` enforces that contract.
6. A sanitized local memory can be written and found through the local API.

## Validation Plan

- Focused Vitest coverage for configure/start/ensure and adapter enforcement.
- Node syntax checks and focused lint/type checks.
- `bun run validate:agents` plus Codex/OpenCode resolver checks.
- Clean-shell configure/ensure/health proof.
- LaunchAgent forced-restart proof.
- Sanitized Supermemory search/write/search round trip.
- Scoped `git diff --check` and final diff review.
