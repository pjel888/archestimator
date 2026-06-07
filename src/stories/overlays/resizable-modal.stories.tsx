import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ControlField, ControlInput, CONTROL_INPUT_SURFACE_CLASS } from "@/components/ui/control-input";
import { FloatingModal, PopupWindow, ResizableModal } from "@/components/ui/overlays/resizable-modal";
import { Note, StoryGrid, StoryPanel } from "../ui-library/story-canvas";

type ResizableState =
  | "default"
  | "no-backdrop"
  | "transparent"
  | "small"
  | "medium"
  | "large"
  | "min-max"
  | "inspector"
  | "floating"
  | "footer"
  | "scroll"
  | "notes"
  | "focus";

function ResizableModalStory({ state = "default" }: { state?: ResizableState }) {
  const [open, setOpen] = useState(false);
  const Component = state === "floating" ? FloatingModal : state === "inspector" ? PopupWindow : ResizableModal;
  const noBackdrop = state === "no-backdrop" || state === "inspector" || state === "floating";
  const size = state === "small" ? "sm" : state === "large" ? "lg" : "md";

  return (
    <StoryPanel className="min-h-72">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open resizable
      </Button>
      <Component
        open={open}
        onOpenChange={setOpen}
        title={state === "inspector" ? "Inspector popup" : "Resizable work surface"}
        description="Resizable and floating modals default to no blur so they can act like tool windows."
        size={size}
        position={state === "inspector" ? "top-right" : state === "floating" ? "bottom-right" : "center"}
        withOverlay={!noBackdrop}
        transparentOverlay={state === "transparent" || noBackdrop}
        overlayBlur={false}
        minWidth={state === "min-max" ? 360 : 320}
        minHeight={state === "min-max" ? 260 : 220}
        maxWidth={state === "min-max" ? 640 : undefined}
        maxHeight={state === "min-max" ? 460 : undefined}
        bodyClassName="space-y-3"
        footer={
          state === "footer" ? (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
              <Button>Apply</Button>
            </>
          ) : undefined
        }
      >
        {state === "scroll" ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }, (_, index) => (
              <Note key={index}>Scrollable inspector row {index + 1}: resize handle stays on the window edge.</Note>
            ))}
          </div>
        ) : (
          <StoryGrid columns="md:grid-cols-2">
            <ControlField label="Width" helperText="CSS resize handles the surface">
              <ControlInput className={CONTROL_INPUT_SURFACE_CLASS} defaultValue={state === "min-max" ? "360-640 px" : "520 px"} readOnly />
            </ControlField>
            <ControlField label="Mode">
              <ControlInput className={CONTROL_INPUT_SURFACE_CLASS} defaultValue={noBackdrop ? "Floating" : "Overlay"} readOnly />
            </ControlField>
          </StoryGrid>
        )}
        {state === "notes" || state === "focus" ? (
          <Note>Keyboard contract: close button and body controls remain tabbable; Escape closes through the shared Dialog primitive.</Note>
        ) : null}
      </Component>
    </StoryPanel>
  );
}

const meta = {
  title: "Overlays/ResizableModal",
  component: ResizableModal,
  parameters: {
    docs: {
      description: {
        component:
          "ResizableModal, FloatingModal, and PopupWindow primitives for inspector and tool-window surfaces. They intentionally do not blur by default.",
      },
    },
  },
} satisfies Meta<typeof ResizableModal>;

export default meta;

type Story = StoryObj;

export const Default: Story = { render: () => <ResizableModalStory /> };
export const NoBackdrop: Story = { render: () => <ResizableModalStory state="no-backdrop" /> };
export const TransparentOverlay: Story = { render: () => <ResizableModalStory state="transparent" /> };
export const ResizableSmall: Story = { render: () => <ResizableModalStory state="small" /> };
export const ResizableMedium: Story = { render: () => <ResizableModalStory state="medium" /> };
export const ResizableLarge: Story = { render: () => <ResizableModalStory state="large" /> };
export const MinMaxSize: Story = { render: () => <ResizableModalStory state="min-max" /> };
export const InspectorPopup: Story = { render: () => <ResizableModalStory state="inspector" /> };
export const FloatingToolWindow: Story = { render: () => <ResizableModalStory state="floating" /> };
export const WithFooterActions: Story = { render: () => <ResizableModalStory state="footer" /> };
export const InternalScroll: Story = { render: () => <ResizableModalStory state="scroll" /> };
export const ResizeNotes: Story = { render: () => <ResizableModalStory state="notes" /> };
export const KeyboardFocus: Story = { render: () => <ResizableModalStory state="focus" /> };
