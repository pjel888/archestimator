import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SupportMessageComposer } from "@/components/support/SupportMessageComposer";
import type { SupportDraft } from "@/components/support/support-center-types";

const idleDraft: SupportDraft = {
  clientMessageId: "11111111-1111-4111-8111-111111111111",
  diagnosticsShared: false,
  error: null,
  fileError: null,
  message: "The export omitted every section subtotal.",
  phase: "idle",
  retryAfterSeconds: null,
  screenshot: null,
  screenshotReplacementPending: false,
};

function renderComposer({
  draft = idleDraft,
  isOnline = true,
}: {
  draft?: SupportDraft;
  isOnline?: boolean;
} = {}) {
  let changedDraft: SupportDraft | null = null;
  const onChange = vi.fn((update: (current: SupportDraft) => SupportDraft) => {
    changedDraft = update(draft);
  });
  const onSend = vi.fn();
  render(
    <SupportMessageComposer
      draft={draft}
      isOnline={isOnline}
      kind="new"
      onChange={onChange}
      onRemoveScreenshot={vi.fn()}
      onRetry={vi.fn()}
      onScreenshot={vi.fn(async () => undefined)}
      onSend={onSend}
      onSendWithoutScreenshot={vi.fn()}
      onStartNewAttempt={vi.fn()}
    />,
  );
  return { getChangedDraft: () => changedDraft, onChange, onSend };
}

describe("support message composer", () => {
  it("submits a valid support message through the current support action boundary", () => {
    const { onSend } = renderComposer();

    fireEvent.click(screen.getByRole("button", { name: "Send to support" }));

    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("keeps support submission disabled while the user is offline", () => {
    renderComposer({ isOnline: false });

    expect(screen.getByRole("button", { name: "Send to support" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("You are offline. Send when your connection returns.");
  });

  it("reports the per-message diagnostics choice through the draft updater", () => {
    const { getChangedDraft, onChange } = renderComposer();

    fireEvent.click(screen.getByText("Included details"));
    fireEvent.click(screen.getByRole("checkbox", {
      name: "Include current workspace and device details for this message",
    }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(getChangedDraft()).toMatchObject({ diagnosticsShared: true, error: null });
  });
});
