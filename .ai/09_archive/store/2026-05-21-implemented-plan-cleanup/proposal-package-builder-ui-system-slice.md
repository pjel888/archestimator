# Proposal Package Builder + UI System Slice

**Date:** 2026-05-16
**Status:** Implemented on `feat/proposal-package-builder-ui-system`

## Purpose

Advance Archestimator from a saved estimate workspace into a contractor proposal package workflow while establishing reusable UI primitives early.

## Product goals

1. Add a proposal package builder surface that edits commercial terms instead of leaving them as static placeholder copy.
2. Add an issued proposal detail route that can be printed/exported by browser print.
3. Keep issued proposal snapshots immutable.
4. Avoid one-off UI by extracting internal primitives and composition patterns now.

## UI system rules

- No Storybook for now unless Philip explicitly approves.
- Build lightweight internal primitives under `src/components/ui/`.
- Use `DESIGN.md` tokens and semantic variants.
- Reuse primitives before inventing new one-off shells.
- If a use case changes, improve the primitive rather than duplicating styling.
- Component tests should focus on behavior and accessibility, not snapshots of class strings.

## Planned primitives

- `Button`
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
- `Field`, `TextInput`, `Textarea`
- `Tabs`
- `StatCard`
- existing `StatusPill` remains and can be improved later

## Planned proposal fields

- proposal subject
- through/contact name
- contractor/company name
- tax/VAT statement
- validity days
- payment terms
- warranty terms
- exclusions
- inclusions/notes
- schedule/duration note

## Verification

- Unit tests for proposal package defaults and snapshot field preservation.
- DOM tests for primitives/proposal builder interactions.
- E2E route checks for dashboard, project workspace, and issued proposal print route.
