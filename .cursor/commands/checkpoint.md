---
description: Create, verify, or list workflow checkpoints after running verification checks.
---

# Checkpoint Command

Create or verify a checkpoint in your workflow.

## Usage

`/checkpoint [create|verify|list] [name]`

## Create Checkpoint

When creating a checkpoint:

1. Inspect current state with non-mutating source and diff checks.
2. Do not stash, commit, reset, clean, switch branches, or require a clean
   worktree. Git mutation needs its own explicit authorization and canonical Git
   workflow.
3. Log a metadata-only checkpoint to `.claude/checkpoints.log`:

```bash
echo "$(date +%Y-%m-%d-%H:%M) | $CHECKPOINT_NAME | $(git rev-parse --short HEAD)" >> .claude/checkpoints.log
```

4. Report checkpoint created

## Verify Checkpoint

When verifying against a checkpoint:

1. Read checkpoint from log
2. Compare current state to checkpoint:
   - Files added since checkpoint
   - Files modified since checkpoint
   - Authorized evidence now versus then

3. Report:
```
CHECKPOINT COMPARISON: $NAME
============================
Files changed: X
Evidence: [current result versus recorded result]
Tests: [only if the current task explicitly authorized them]
```

## List Checkpoints

Show all checkpoints with:
- Name
- Timestamp
- Git SHA
- Status (current, behind, ahead)

## Workflow

Typical checkpoint flow:

```
[Start] --> /checkpoint create "feature-start"
   |
[Implement] --> /checkpoint create "core-done"
   |
[Test] --> /checkpoint verify "core-done"
   |
[Refactor] --> /checkpoint create "refactor-done"
   |
[PR] --> /checkpoint verify "feature-start"
```

## Arguments

$ARGUMENTS:
- `create <name>` - Create named checkpoint
- `verify <name>` - Verify against named checkpoint
- `list` - Show all checkpoints
- `clear` - List removable checkpoints; deletion needs an explicit request
