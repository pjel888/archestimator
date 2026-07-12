# Data Subject Rights Operations

## Rights Workflow

Create a unified Privacy Request Orchestrator with:

1. request intake;
2. request classification;
3. identity verification;
4. controller or processor role determination;
5. scope discovery;
6. legal exception and hold evaluation;
7. system-by-system execution;
8. second-person review for destructive actions;
9. response package;
10. delivery verification;
11. closure record;
12. appeal or complaint handling.

## Required Request Types

- information request;
- access;
- correction;
- deletion or blocking;
- objection;
- restriction;
- portability;
- consent withdrawal;
- complaint;
- representative or estate request;
- customer-controller request.

## System Adapters

Adapters must cover:

- user and account;
- authentication identities and sessions;
- workspaces and memberships;
- invitations;
- projects, estimates, proposals, templates, and components;
- share links and access events;
- comments, approvals, and activity;
- uploads and exports;
- support;
- email delivery;
- analytics;
- error and security logs;
- AI records;
- legal acceptance;
- privacy requests;
- billing;
- processors;
- backups and restore limitations.

## Identity Verification

Use proportionate verification. Do not collect government ID by default.

Possible methods:

- authenticated session plus reauthentication;
- verified email challenge;
- workspace-owner confirmation for processor-managed data;
- signed authorization for representatives;
- additional proof only where risk requires it.

## Processor Scenario

Where a request concerns customer-controlled project data:

- determine whether Archestimator may respond directly;
- notify or route to the customer controller;
- preserve request timestamps;
- provide tooling and evidence to the customer;
- avoid disclosing data controlled by another organization without authority.

## Erasure Rules

Erasure must distinguish:

- deletion;
- anonymization;
- restriction;
- legal hold;
- contractual retention;
- backup aging;
- records required to establish or defend legal claims.

## Export Requirements

Exports must be:

- complete within approved scope;
- machine-readable where portability applies;
- human-readable;
- encrypted or access-controlled;
- time-limited;
- accompanied by a data-source and recipient manifest;
- logged without exposing the exported contents.
