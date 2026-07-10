# Maintainability And Integration Gate

## Program Contract

`REQ-002`, `AC-004`, `TEST-004`, and `BETA-P1-10` define a cross-pack evidence
gate. The Program does not implement a shared abstraction and does not require
every pack to extract a component. It verifies that each capability owner made
and proved a bounded retain/extract decision from current caller and test facts.

## Required Receipt Shape

Each of the nine packs emits exactly one disposition receipt:

- package ID, source revision, manifest digests, and scoped changed files;
- `REQUIRED` or explicit justified `N/A` matching the canonical matrix;
- current caller/importer/consumer map for the changed capability;
- pre-change characterization or golden-master proof;
- high-change/high-test-cost evidence used to decide retain versus extract;
- selected boundary, rejected alternative, and compatibility constraints;
- changed files and before/after ownership of behavior and tests;
- focused validation, broader check when shared behavior changed, and independent
  verifier result; and
- final audit artifact plus canonical receipt digest.

An `N/A` row remains a receipt. Silence, no changed product component, or a
worker assertion does not satisfy the matrix.

## Decision Rules

Extract only when it removes a demonstrated mixed responsibility, duplicated
domain rule, unstable caller contract, or expensive test boundary. Retain when
the current module is already coherent and extraction would add forwarding
layers, duplicate state, or broaden the change. Prefer existing utilities and
deletion over a new generic framework.

The gate fails if a pack:

- invents a cross-domain abstraction to satisfy the audit;
- changes behavior without a red/characterization test;
- lists callers without checking current imports/consumers;
- moves code but leaves duplicate models or dual authorities;
- omits a required receipt or substitutes another pack's receipt;
- changes a `REQUIRED` row to `N/A` without updating the canonical Program
  decision and evidence; or
- claims completion from file shape, line count, or reviewer identity.

## Integration Review

`UNIT-003` checks the exact nine-package ID set and expected disposition, then
validates each receipt against the owning pack's final manifest. `UNIT-004`
ensures the resulting boundaries compose across Activity/Publisher,
Activation/Operating, Calculation/Publisher/export, Estimate/Activity, and
Release proof integration.

Version mismatch, missing consumer proof, or a changed owner manifest makes only
the affected row stale first; any release truth packet consuming it becomes
stale transitively.

## Evidence Boundary

The maintainability receipt proves a bounded design and verification decision.
It does not prove hosted behavior, provider configuration, accessibility in a
real browser, production performance, legal approval, or release readiness.
