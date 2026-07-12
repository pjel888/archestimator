# Hosted Template-To-Estimate Insert Proof

Date: 2026-07-02 05:39 UTC

This proof used a separate headless Chromium context authenticated with a signed Better Auth session sourced from Cloudflare D1. It exercised the production Cloudflare Worker UI at `https://archestimator.com`.

## Scope

- Project: `bd9a8e68-4e24-49d8-aeed-e4651b7cab0b`
- Estimate: `985f6690-741e-4136-9fa1-a4896cd364e4`
- Target area node: `e4b71a81-47fc-4f5a-bead-35e4e8050eae`
- Target tab: `5bf33713-4fec-4d82-b408-bbf11cb2cb91`
- Workspace: `258b50ee-3fde-4f6a-a9d9-c360ec44cd0b`
- Actor: `4e23801d-6fc2-4886-b980-d15ca2b164b8`
- Signed-in email: `philipjonlewis@gmail.com`

## Result

Pass.

A structured throwaway template was seeded directly into Cloudflare D1, then inserted through the hosted Templates tree context menu on `archestimator.com`. Remote D1 readback found the `template_inserted` history event, inserted estimate node, and inserted estimate row. The inserted proof estimate artifacts and source template were cleaned up after readback.

## Source Template

- Template id: `2bffd98d-0119-476a-9b4e-570d4129d752`
- Name: `Codex CF Insert Template 20260702T053817Z`
- Category: `Codex CF Insert Proof 20260702T053817Z`
- Template node id: `dfc1944f-d263-4936-b41a-7eab195db35a`
- Template node name: `Codex CF Insert Area 20260702T053817Z`
- Template row id: `fd83c28d-8c75-4746-a3a8-44b2cf95d6fd`
- Template row material: `Codex CF Insert Row 20260702T053817Z`
- Quantity/unit cost: `2` / `45.67`

## Hosted Insert Readback

- UI insert path: Templates tree context menu
- Event id: `7f644a9f-2820-414c-a1e8-b65cf10c13a8`
- Event type: `template_inserted`
- Correlation id: `faf85d65-3a7a-48d9-8ed3-64e8543bd17d`
- Actor: `4e23801d-6fc2-4886-b980-d15ca2b164b8`
- Created at: `2026-07-02T05:39:03.344Z`
- Inserted root node id: `198a9e33-13f9-4791-bf17-d800abaf1921`
- Inserted node count: `1`
- Inserted row count: `1`

Inserted node readback:

- Name: `Codex CF Insert Area 20260702T053817Z`
- Kind: `area`
- Parent: `e4b71a81-47fc-4f5a-bead-35e4e8050eae`
- Estimate tab: `5bf33713-4fec-4d82-b408-bbf11cb2cb91`

Inserted row readback:

- Row id: `115cb4fc-8ed9-40c9-84ba-4c3a282b5234`
- Material: `Codex CF Insert Row 20260702T053817Z`
- Description: `Inserted through hosted Cloudflare template proof`
- Quantity/unit/unit cost: `2` / `unit` / `45.67`
- Misc cost: `1.23`

## Cleanup Readback

- Inserted estimate nodes after cleanup: `0`
- Inserted estimate rows after cleanup: `0`
- Source templates after cleanup: `0`
- Source template nodes after cleanup: `0`
- Source template rows after cleanup: `0`

## Boundary

The structured source template was seeded directly into Cloudflare D1 to create a deterministic insert source. The mutation under test was the hosted production UI insert path and its D1 history/persistence result. Component-library viewer denial remains open.
