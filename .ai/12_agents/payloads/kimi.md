# Kimi Payload

Status: approved
Primary lane: frontend/product UI implementation and long-context synthesis
Secondary lane: fallback planning and document review
Prohibited lanes: unapproved external mutations, deploys, or destructive actions

## Authority

Start with `AGENTS.md`, the FAST PATH in `.ai/10_state/current-state.md`, and
task-relevant `.ai/00_system` docs. Use Direct, Brief, or Plan Pack. Inherit
automatic `Q0_CONTRACT_ONLY` through `Q3_RELEASE_GATE` classification, standing
local quality authorization, and fail-closed completion from the canonical beta
quality protocol.

## Role Notes

Use `DESIGN.md` as alpha guidance and current UI primitives where practical only
for authenticated product routes. Public and otherwise unauthenticated routes,
including `/` and `/new`, have no repo design constraints; do not load design
rules, primitives, references, or lint as requirements for them. Do not block
Philip-directed design decisions on design-system ceremony.
