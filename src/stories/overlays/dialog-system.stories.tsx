import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/overlays/dialog";
import { ControlField, ControlInput, ControlTextarea, CONTROL_INPUT_SURFACE_CLASS } from "@/components/ui/control-input";
import { Note, StoryGrid, StoryPanel } from "../ui-library/story-canvas";

type DialogState = "default" | "close-left" | "description" | "scroll" | "footer" | "xs" | "lg" | "danger" | "long" | "accessibility";

function DialogSystemStory({ state = "default" }: { state?: DialogState }) {
  const [open, setOpen] = useState(true);
  const closeLeft = state === "close-left";
  const withDescription = state === "description" || state === "accessibility";
  const withFooter = state === "footer" || state === "danger";
  const danger = state === "danger";
  const long = state === "long" || state === "scroll";
  const sizeClass = state === "xs" ? "max-w-xs" : state === "lg" ? "max-w-3xl" : "max-w-md";

  return (
    <StoryPanel className="min-h-64">
      <Button variant={danger ? "danger" : "secondary"} onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <Dialog open={open} onOpenChange={setOpen} closeLabel="Close story dialog" modal>
        <DialogPortal>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <DialogOverlay blur />
            <DialogContent
              role={danger ? "alertdialog" : "dialog"}
              described={withDescription}
              className={`max-h-[calc(100dvh_-_32px)] w-full ${sizeClass} ${danger ? "border-dangerSoft" : ""}`}
            >
              <DialogHeader>
                {closeLeft ? <DialogCloseButton /> : null}
                <div className="min-w-0">
                  <DialogTitle className={danger ? "text-danger" : undefined}>
                    {danger ? "Remove selected fixture rows?" : "Review dialog primitive"}
                  </DialogTitle>
                  {withDescription ? (
                    <DialogDescription>
                      Accessible title, optional description, Escape close, and overlay dismissal are owned by the primitive.
                    </DialogDescription>
                  ) : null}
                </div>
                {closeLeft ? null : <DialogCloseButton />}
              </DialogHeader>
              <DialogBody className="space-y-3">
                {long ? (
                  <div className="space-y-2">
                    {Array.from({ length: 8 }, (_, index) => (
                      <Note key={index}>Scrollable dialog row {index + 1}: static content stays inside the dialog body.</Note>
                    ))}
                  </div>
                ) : (
                  <StoryGrid columns="md:grid-cols-2">
                    <ControlField label="Package name" helperText="Static field">
                      <ControlInput className={CONTROL_INPUT_SURFACE_CLASS} defaultValue="Beta review package" />
                    </ControlField>
                    <ControlField label="Reviewer note">
                      <ControlTextarea rows={3} defaultValue="Keep modal content compact." />
                    </ControlField>
                  </StoryGrid>
                )}
                {state === "accessibility" ? (
                  <Note>Keyboard contract: dialog content receives focus, Escape closes, and the trigger receives focus after close.</Note>
                ) : null}
              </DialogBody>
              {withFooter ? (
                <DialogFooter>
                  <DialogActions
                    left={<Note>{danger ? "Destructive tone uses alertdialog." : "Footer actions stay pinned."}</Note>}
                    right={
                      <>
                        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button variant={danger ? "danger" : "primary"} onClick={() => setOpen(false)}>
                          {danger ? "Remove" : "Apply"}
                        </Button>
                      </>
                    }
                  />
                </DialogFooter>
              ) : null}
            </DialogContent>
          </div>
        </DialogPortal>
      </Dialog>
    </StoryPanel>
  );
}

const meta = {
  title: "Overlays/DialogSystem",
  component: Dialog,
  parameters: {
    docs: {
      description: {
        component:
          "Low-level Dialog primitive system for composing modal, alert, and floating overlay surfaces without route or provider coupling.",
      },
    },
  },
} satisfies Meta<typeof Dialog>;

export default meta;

type Story = StoryObj;

export const HeaderLayout: Story = { render: () => <DialogSystemStory /> };
export const CloseButtonPosition: Story = { render: () => <DialogSystemStory state="close-left" /> };
export const WithDescription: Story = { render: () => <DialogSystemStory state="description" /> };
export const InternalScroll: Story = { render: () => <DialogSystemStory state="scroll" /> };
export const FooterActions: Story = { render: () => <DialogSystemStory state="footer" /> };
export const Sizes: Story = { render: () => <DialogSystemStory state="lg" /> };
export const Tones: Story = { render: () => <DialogSystemStory state="danger" /> };
export const LongContent: Story = { render: () => <DialogSystemStory state="long" /> };
export const AccessibilityNotes: Story = { render: () => <DialogSystemStory state="accessibility" /> };
