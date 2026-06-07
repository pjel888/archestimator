import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ControlField, ControlInput, ControlTextarea, CONTROL_INPUT_SURFACE_CLASS } from "@/components/ui/control-input";
import { Skeleton } from "@/components/ui/skeleton";
import { AppModal } from "@/components/ui/overlays/modal";
import { Note, StoryPanel } from "../ui-library/story-canvas";

type AppModalState =
  | "default"
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "fullscreen"
  | "blur"
  | "no-blur"
  | "form"
  | "table"
  | "loading"
  | "error"
  | "destructive";

function AppModalStory({ state = "default" }: { state?: AppModalState }) {
  const [open, setOpen] = useState(false);
  const size = state === "xs" ? "xs" : state === "sm" ? "sm" : state === "lg" ? "lg" : state === "xl" ? "xl" : state === "fullscreen" ? "fullscreen" : "md";
  const destructive = state === "destructive";
  const table = state === "table";
  const loading = state === "loading";
  const error = state === "error";

  return (
    <StoryPanel className="min-h-64">
      <Button variant={destructive ? "danger" : "primary"} onClick={() => setOpen(true)}>
        Open app modal
      </Button>
      <AppModal
        open={open}
        onOpenChange={setOpen}
        title={destructive ? "Delete proposal package?" : "Edit proposal package"}
        description="Application modal with fixed blurred backdrop by default."
        size={size}
        tone={destructive ? "destructive" : error ? "danger" : "default"}
        blurBackdrop={state !== "no-blur"}
        bodyClassName="space-y-3"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant={destructive ? "danger" : "primary"} disabled={loading} aria-busy={loading}>
              {destructive ? "Delete" : loading ? "Saving" : "Save"}
            </Button>
          </>
        }
      >
        {loading ? (
          <div className="space-y-1">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-10/12" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : null}
        {error ? <Note tone="danger">Static validation failed. The story does not call a provider to recover.</Note> : null}
        {table ? (
          <div className="overflow-auto rounded-xs border border-hairline">
            <table className="w-full min-w-[520px] text-left text-[10px] leading-4">
              <thead className="bg-surfaceMuted text-[9px] text-tertiary">
                <tr>
                  <th className="px-2 py-1 font-medium">Item</th>
                  <th className="px-2 py-1 font-medium">Qty</th>
                  <th className="px-2 py-1 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {["Cabinetry", "Countertop", "Hardware"].map((item, index) => (
                  <tr key={item} className="border-t border-hairline">
                    <td className="px-2 py-1">{item}</td>
                    <td className="px-2 py-1">{index + 1}</td>
                    <td className="px-2 py-1">Review</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-2">
            <ControlField label="Package title" helperText="Static Storybook field">
              <ControlInput className={CONTROL_INPUT_SURFACE_CLASS} defaultValue="Kitchen Renovation Proposal" />
            </ControlField>
            <ControlField label="Client note">
              <ControlTextarea rows={state === "fullscreen" ? 8 : 3} defaultValue="Prepared for closed beta review." />
            </ControlField>
          </div>
        )}
        {state === "no-blur" ? <Note>Blur is disabled for comparison only; AppModal defaults to a blurred backdrop.</Note> : null}
      </AppModal>
    </StoryPanel>
  );
}

const meta = {
  title: "Overlays/AppModal",
  component: AppModal,
  parameters: {
    docs: {
      description: {
        component:
          "Fixed application modal with compact header, scroll body, footer actions, size presets, tones, and blurred backdrop as the default Archestimator modal behavior.",
      },
    },
  },
} satisfies Meta<typeof AppModal>;

export default meta;

type Story = StoryObj;

export const Default: Story = { render: () => <AppModalStory /> };
export const SizeXs: Story = { render: () => <AppModalStory state="xs" /> };
export const SizeSm: Story = { render: () => <AppModalStory state="sm" /> };
export const SizeMd: Story = { render: () => <AppModalStory state="md" /> };
export const SizeLg: Story = { render: () => <AppModalStory state="lg" /> };
export const SizeXl: Story = { render: () => <AppModalStory state="xl" /> };
export const Fullscreen: Story = { render: () => <AppModalStory state="fullscreen" /> };
export const WithBlurBackdrop: Story = { render: () => <AppModalStory state="blur" /> };
export const WithoutBlurBackdrop: Story = { render: () => <AppModalStory state="no-blur" /> };
export const FormContent: Story = { render: () => <AppModalStory state="form" /> };
export const TableContent: Story = { render: () => <AppModalStory state="table" /> };
export const LoadingState: Story = { render: () => <AppModalStory state="loading" /> };
export const ErrorState: Story = { render: () => <AppModalStory state="error" /> };
export const DestructiveState: Story = { render: () => <AppModalStory state="destructive" /> };
