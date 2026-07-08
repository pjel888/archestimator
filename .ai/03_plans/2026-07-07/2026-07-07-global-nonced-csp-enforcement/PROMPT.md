# GLM5.2 Plan Pack Prompt: Global Nonced CSP Enforcement

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-global-nonced-csp-enforcement`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a security plan pack for moving Archestimator from partial/report-only CSP toward global enforced, nonced CSP suitable for first users.

## Evidence To Start From

- `next.config.ts` defines CSP policies with `unsafe-inline`/`unsafe-eval` allowances in some paths.
- `next.config.ts` comments defer per-request nonce plumbing for workshop/invite routes.
- The catch-all hardening block omits CSP for many routes.
- Public share CSP is stronger than some app surfaces, creating inconsistent security posture.

## Required Plan Pack

Include current CSP matrix by route class, nonce plumbing approach for Next.js 16/OpenNext/Cloudflare, third-party/script allowances, report-only rollout, enforcement phases, regression tests, and CSP violation evidence.

## Constraints

Read relevant Next.js 16 docs before implementation planning where behavior is uncertain. Do not break Cloudflare deployment compatibility.

## Stop Condition

The pack should let an executor implement CSP hardening in phases with clear proof and rollback points.
