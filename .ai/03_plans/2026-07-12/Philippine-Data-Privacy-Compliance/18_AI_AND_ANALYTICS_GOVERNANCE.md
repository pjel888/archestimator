# AI and Analytics Governance

## AI Rule

Customer data must not be used to train general models unless the customer and affected data subjects have a valid, specific legal basis and contractually approved arrangement. Default must be no training.

## AI Inventory

For every AI feature, record:

- feature;
- provider and model;
- data sent;
- system prompt;
- retention;
- training use;
- region;
- subprocessor;
- logging;
- output storage;
- user control;
- human review;
- PIA;
- fallback;
- deletion method.

## AI Data Minimization

- redact unnecessary identifiers;
- exclude credentials and secrets;
- exclude full project history unless needed;
- use field-level allowlists;
- avoid sending uploads by default;
- isolate tenants;
- prohibit provider-side training where contractually available;
- apply short retention.

## Analytics Classification

Separate:

- essential operational telemetry;
- security telemetry;
- product analytics;
- session replay;
- marketing analytics;
- advertising tracking.

Each category requires a specific purpose, basis, notice, and retention.

## Cookie Controls

Implement:

- essential cookies always active;
- non-essential categories disabled until permitted;
- preference storage;
- withdrawal;
- consent versioning where consent applies;
- script blocking before choice;
- no dark patterns.

## Prohibited Analytics

- capturing passwords or tokens;
- unredacted session replay;
- recording estimate values without clear necessity;
- collecting public-share visitor identity beyond declared purpose;
- cross-customer behavioral profiles without approval;
- indefinite event retention.

## Automated Decisions

Any feature that makes or materially influences significant decisions about users must be documented, explained, tested, and subject to human review.
