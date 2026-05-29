# workflow
- Conduct read-only architecture/code reviews with CLEAR/WATCH/BLOCK status before committing feature changes. Confidence: 0.90
- Map blast radius (CRITICAL/LOW) and affected file references before implementing UI changes. Confidence: 0.80
- Prefer reusable UI primitives (e.g., modal) over inline or feature-specific solutions. Confidence: 0.75
- For planning audits, perform second and third passes on the same documents to catch gaps the first pass missed (e.g., frozen state, missing error handling, inference bugs). Confidence: 0.70
- Integrate shadcn UI primitives (built on Radix) for new UI components; do not use shadcn add --all — add only the specific primitives needed per feature slice. Confidence: 0.85
- Prefer direct implementation over asking clarifying questions mid-task — proceed with best judgment and the user will correct in subsequent iterations. Confidence: 0.85
- After meaningful batches of changes: stage, commit with descriptive messages, push to branch, and ensure all worktrees are merged into main. Confidence: 0.70
- Recovery branches (e.g., `wip/post-shared-link-merge-recovery`) containing stashed work should be merged into main when their files are needed to resolve build errors or missing dependencies. Confidence: 0.75
