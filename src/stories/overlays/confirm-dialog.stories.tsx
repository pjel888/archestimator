import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog, DeleteConfirmDialog, UnsavedChangesDialog } from "@/components/ui/overlays/confirm-dialog";
import { Note, StoryPanel } from "../ui-library/story-canvas";

type ConfirmState = "default" | "destructive" | "busy" | "error" | "unsaved" | "long";

function ConfirmDialogStory({ state = "default" }: { state?: ConfirmState }) {
  const [open, setOpen] = useState(false);
  const longCopy = "This static confirmation includes long copy to prove body wrapping and compact footer hierarchy. ".repeat(4);

  return (
    <StoryPanel className="min-h-56">
      <Button variant={state === "destructive" ? "danger" : "secondary"} onClick={() => setOpen(true)}>
        Open confirmation
      </Button>
      {state === "destructive" ? (
        <DeleteConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Delete selected rows?"
          description="This destructive Storybook fixture does not call production actions."
        />
      ) : state === "unsaved" ? (
        <UnsavedChangesDialog
          open={open}
          onOpenChange={setOpen}
          title="Discard unsaved changes?"
          description="Unsaved local fixture changes will be discarded."
        />
      ) : (
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title={state === "error" ? "Apply failed" : "Apply review decision?"}
          description={state === "long" ? longCopy : "Confirm before changing shared review state."}
          busy={state === "busy"}
          error={state === "error" ? "The static fixture failed local validation." : undefined}
          confirmLabel={state === "busy" ? "Applying" : "Apply"}
        >
          <Note>Cancel remains the safe action for normal confirmations.</Note>
        </ConfirmDialog>
      )}
    </StoryPanel>
  );
}

const meta = {
  title: "Overlays/ConfirmDialog",
  component: ConfirmDialog,
  parameters: {
    docs: {
      description: {
        component:
          "Reusable ConfirmDialog, DeleteConfirmDialog, and UnsavedChangesDialog stories with static state only. These are real UI primitives, not route-action previews.",
      },
    },
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;

type Story = StoryObj;

export const Default: Story = { render: () => <ConfirmDialogStory /> };
export const Destructive: Story = { render: () => <ConfirmDialogStory state="destructive" /> };
export const DestructiveConfirm: Story = Destructive;
export const Busy: Story = { render: () => <ConfirmDialogStory state="busy" /> };
export const Error: Story = { render: () => <ConfirmDialogStory state="error" /> };
export const UnsavedChanges: Story = { render: () => <ConfirmDialogStory state="unsaved" /> };
export const LongContent: Story = { render: () => <ConfirmDialogStory state="long" /> };
export const FocusNotes: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <ConfirmDialogStory />
      <Note>Keyboard contract: cancel is the safe focus target unless the destructive action needs explicit confirmation.</Note>
    </StoryPanel>
  ),
};
