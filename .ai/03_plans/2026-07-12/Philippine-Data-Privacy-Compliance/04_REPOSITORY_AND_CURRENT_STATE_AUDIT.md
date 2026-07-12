# Repository and Current-State Audit

## Confirmed Existing Strengths

The current Archestimator repository contains:

- privacy request types for access, rectification, erasure, restriction, portability, objection, and other requests;
- request lifecycle states and triage metadata;
- hashing of requester email, IP address, and user-agent values;
- filtering of secret-shaped metadata keys;
- export and erasure helpers for support, activity, and activation records;
- activity-actor anonymization;
- retention classes, TTLs, legal holds, purge actions, anonymization, and evidence records;
- Cloudflare D1, authentication, upload, email, observability, restore, and provider-readiness scripts;
- privacy and retention unit tests;
- operational incident and observability tooling.

## Material Gaps

### Governance gaps

- DPO appointment is not proven.
- PIC legal entity and contact details require confirmation.
- NPC registration assessment is not proven.
- ROPA completeness is not proven.
- PIA completion is not proven.
- Privacy manual and annual review evidence are not proven.
- Vendor DPAs and transfer assessments are not proven.

### Product and engineering gaps

- no confirmed central data-subject request orchestrator;
- incomplete system-by-system export and erasure coverage;
- no proven deletion propagation to all subprocessors;
- no verified privacy center and status workflow;
- no confirmed cookie preference layer;
- privacy notice coverage at every collection point is unverified;
- admin support-access governance needs dedicated review;
- anonymization effectiveness requires re-identification testing;
- backup deletion and restore behavior requires disclosure and evidence;
- token storage and lifecycle findings must be closed before release.

### Operational gaps

- no demonstrated breach tabletop exercise;
- no proven 72-hour notification workflow;
- no documented data-subject identity verification standard;
- no retention exception approval workflow;
- no periodic privileged-access review evidence;
- no processor incident escalation exercise.

## Required Codebase Audit Scope

The implementation team must inspect:

- authentication, sessions, magic links, OAuth callbacks;
- user, account, workspace, and membership records;
- collaboration and invitations;
- public share and password-protected share routes;
- comments, approval, decline, and activity history;
- project, estimate, proposal, component, and template data;
- uploads, generated exports, and temporary files;
- email delivery and support systems;
- analytics, telemetry, logs, error monitoring, and request IDs;
- AI prompts, responses, tool calls, data access, and training flags;
- legal acceptance records;
- admin routes, impersonation, support access, and bulk actions;
- cron jobs, queues, outboxes, caches, backups, and restore processes;
- archived and legacy Supabase, Vercel, and other provider resources.

## Required Output

Produce a source-level inventory containing:

- file path;
- table or storage system;
- personal-data categories;
- access path;
- processing purpose;
- retention behavior;
- deletion behavior;
- provider;
- authorization boundary;
- privacy notice;
- tests;
- known gaps;
- remediation owner.
