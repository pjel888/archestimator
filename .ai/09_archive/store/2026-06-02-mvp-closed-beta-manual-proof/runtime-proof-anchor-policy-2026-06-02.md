# Runtime Proof Anchor Policy - 2026-06-02

Status: Active for the MVP closed-beta launch evidence pack.

## Problem

Provider/runtime proof can become circular when every evidence-only documentation commit triggers a new Vercel preview. Chasing a new "current head" preview after every documentation-only evidence sync creates infinite churn without proving new application behavior.

## Policy

- Treat runtime/provider proof as anchored to the latest commit that can affect application runtime behavior.
- A later commit is evidence-only when it changes only `.ai/` documentation/artifacts/tests that assert documentation truth and does not change `src/`, `supabase/`, `e2e/`, `.env.example`, package/build configuration, CI workflow, or dependency lockfiles.
- Evidence-only commits must still be committed and pushed, but they do not invalidate the prior application-runtime Vercel health proof.
- If any app/runtime input changes, collect fresh runtime/provider proof before improving a launch decision.

## Current Anchors

- Latest app-runtime Vercel preview proof: `638f6813017fd3460c35fcf5917b3049ff7403cf`, captured in `vercel-current-head-read-only-638f681-2026-06-02.md`.
- Later evidence-only commits: `c93ae7a` and `13f5acb`.
- Current repository head when this policy was written: `13f5acbe93af76dbe8e33d819195e0df0453fc61`.

## Launch Meaning

This policy prevents documentation-only churn from being mistaken for missing application proof. It does not make the launch gate pass.

Closed beta remains **NO-GO** until Vercel env, public or approved health monitoring, production/custom-domain app health, rollback, hosted auth, linked Supabase, Resend, spreadsheet-app, support monitoring, legal, and hosted manual E2E proof are complete.
