# Retention, Deletion, and Legal Holds

## Objective

Replace arbitrary TTLs with a purpose-based, approved retention schedule enforced consistently across primary stores, processors, caches, files, logs, and backups.

## Retention Schedule Fields

- data class;
- processing purpose;
- retention trigger;
- active period;
- archive period;
- deletion or anonymization method;
- legal basis;
- legal-claim rationale;
- processor deletion behavior;
- backup behavior;
- hold eligibility;
- approver;
- review date.

## Current Rules Requiring Validation

Existing repository TTLs include classes such as:

- security and collaboration events;
- shared-link events;
- estimate-sheet events;
- privacy requests;
- activation events;
- sessions;
- uploads;
- operational incidents;
- email and observability logs.

Every value must be approved. A period existing in code is not sufficient justification.

## Lifecycle States

Use explicit states:

- active;
- archived;
- soft-deleted;
- retention pending;
- legally held;
- anonymized;
- purged;
- processor deletion pending;
- backup aging;
- deletion complete.

## Soft Delete Rule

Soft deletion is not final erasure. Every soft-deleted record must have:

- a purge deadline;
- restore authority;
- hold evaluation;
- user disclosure;
- final deletion job;
- deletion evidence.

## Legal Holds

Legal holds must:

- identify scope and legal reason;
- be authorized;
- record start and review dates;
- suspend only relevant deletion;
- prevent silent indefinite retention;
- support release;
- be auditable;
- avoid exposing sensitive legal detail to unauthorized users.

## Anonymization Validation

Anonymization is valid only where re-identification is not reasonably possible.

Test:

- linkage through project IDs;
- unique timestamps;
- event descriptions;
- actor sequence;
- membership history;
- logs;
- email metadata;
- exports;
- backups.

## Cron and Failure Handling

Retention jobs must:

- support dry run;
- produce counts;
- record failures;
- alert on repeated failure;
- be idempotent;
- process bounded batches;
- preserve legal holds;
- expose compliance health in admin;
- include reconciliation against expected aged records.
