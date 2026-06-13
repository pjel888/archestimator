import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

// SEC-08 (AC-SEC-08) — no-dangerouslySetInnerHTML regression guard.
//
// There is no live XSS vuln on the share surface today: recipient-supplied content
// (comment bodies, author names, decision notes, activity copy) renders as React JSX
// text nodes, so React auto-escapes it. This static guard locks that safe rendering in
// place so a future refactor of these components cannot silently reintroduce
// `dangerouslySetInnerHTML` on a path that renders recipient-controlled content.
//
// We read each component's source and assert the literal string is absent. This is a
// build-time/source-level assertion, not a render test — the goal is that NO code path
// in these files opts into raw HTML injection.

const RECIPIENT_CONTENT_COMPONENTS = [
  // comment body + author name render path
  "src/components/share/SharePageComments.tsx",
  // decision note render path
  "src/components/share/SharePageDecision.tsx",
  // activity feed (recipient comment/decision copy)
  "src/components/share/SharedLinkActivityFeed.tsx",
] as const;

describe("SEC-08 — share components never use dangerouslySetInnerHTML", () => {
  it.each(RECIPIENT_CONTENT_COMPONENTS)(
    "%s renders recipient-supplied content as text nodes (no dangerouslySetInnerHTML)",
    (path) => {
      const source = readFileSync(path, "utf8");
      expect(source).not.toContain("dangerouslySetInnerHTML");
    },
  );
});
