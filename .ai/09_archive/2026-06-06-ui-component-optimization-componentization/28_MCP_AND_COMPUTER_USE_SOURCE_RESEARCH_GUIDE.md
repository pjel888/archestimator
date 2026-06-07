# MCP And Computer Use Source Research Guide

## Purpose

Future agents should ground component-library implementation in current repo state, official docs, and visual evidence. Do not rely on stale recalled package behavior.

## Repo And Graph Evidence

Use graph tools before broad grep where available:

- code-review graph architecture/impact/change tools.
- GitNexus query/context/impact/detect changes.

Use shell reads for exact file content after graph points to files.

## External Docs

Check official sources at implementation time:

- Storybook docs for Next.js, accessibility, docs/testing, and framework package.
- Tailwind v4 docs for CSS/theme integration.
- shadcn/ui docs for Tailwind v4 and component generation posture.
- Flowbite docs for public component categories and blocks.
- Aceternity docs for AI recommendations and motion/effect references.

If using package docs, prefer official docs and package repository over blog posts.

## Browser/Computer Use

Use browser/computer-use only when visual inspection or logged-in dashboard state is required.

Allowed examples:

- Inspect local Storybook at `http://localhost:6006`.
- Capture visual evidence of Storybook stories.
- Review a design reference supplied by Philip.

Not needed for:

- Reading local files.
- Searching source code.
- Running validation commands.

## Evidence Rules

Record:

- Exact source URL.
- Date checked.
- Why it matters.
- Any owner/package/license gate.

Do not record:

- Secrets.
- Private dashboard values.
- Raw production data.
- Proprietary paid-source content unless explicitly approved.
