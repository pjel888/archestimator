import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ControlField, ControlInput, ControlTextarea, CONTROL_INPUT_SURFACE_CLASS } from "@/components/ui/control-input";
import { Modal } from "@/components/ui/modal";
import { Note, StoryPanel } from "../ui-library/story-canvas";

function ModalLauncher({ tone = "default" }: { tone?: "default" | "destructive" | "busy" | "error" | "long" }) {
  const [open, setOpen] = useState(true);
  const destructive = tone === "destructive";
  const busy = tone === "busy";
  const error = tone === "error";
  const long = tone === "long";

  return (
    <StoryPanel className="min-h-64">
      <Button variant={destructive ? "danger" : "primary"} onClick={() => setOpen(true)}>
        Open modal
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={destructive ? "Delete estimate row" : "Review estimate"}
        description={destructive ? "This static story previews a destructive confirmation." : "Provider-free modal state for Storybook review."}
        bodyClassName="space-y-3"
      >
        {busy ? <Note tone="warning">Saving static fixture changes...</Note> : null}
        {error ? <Note tone="danger">The fixture failed local validation. No provider call was attempted.</Note> : null}
        <ControlField label="Reviewer" helperText="Static modal form field">
          <ControlInput className={CONTROL_INPUT_SURFACE_CLASS} defaultValue="Client Reviewer" />
        </ControlField>
        <ControlField label="Decision note">
          <ControlTextarea rows={long ? 8 : 3} defaultValue={long ? "Long modal content remains scrollable inside the compact dialog body. ".repeat(6) : "Ready for review."} />
        </ControlField>
        <div className="flex justify-end gap-1">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant={destructive ? "danger" : "primary"} disabled={busy} aria-busy={busy}>
            {destructive ? "Delete" : busy ? "Saving" : "Confirm"}
          </Button>
        </div>
      </Modal>
    </StoryPanel>
  );
}

const meta = {
  title: "Overlays/Modal",
  component: Modal,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone Modal story for compact dialog surfaces. Stories use local state and static fields only; no route, auth, or provider behavior is invoked.",
      },
    },
  },
} satisfies Meta<typeof Modal>;

export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => <ModalLauncher />,
};

export const WithDescription: Story = {
  render: () => <ModalLauncher />,
};

export const FormDialog: Story = {
  render: () => <ModalLauncher />,
};

export const DestructiveConfirm: Story = {
  render: () => <ModalLauncher tone="destructive" />,
};

export const Busy: Story = {
  render: () => <ModalLauncher tone="busy" />,
};

export const ErrorState: Story = {
  render: () => <ModalLauncher tone="error" />,
};

export const LongContent: Story = {
  render: () => <ModalLauncher tone="long" />,
};

export const FocusNotes: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <ModalLauncher />
      <Note>Keyboard contract: Escape closes the modal; focus-trap hardening remains a production primitive follow-up if needed.</Note>
    </StoryPanel>
  ),
};
