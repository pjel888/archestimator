import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ControlField, ControlInput, ControlTextarea, CONTROL_INPUT_SURFACE_CLASS } from "@/components/ui/control-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer, InspectorDrawer, Sheet } from "@/components/ui/overlays/sheet-drawer";
import { Note, StoryPanel } from "../ui-library/story-canvas";

type SheetState = "right" | "left" | "bottom" | "inspector" | "form" | "table" | "loading" | "error" | "no-blur";

function SheetDrawerStory({ state = "right" }: { state?: SheetState }) {
  const [open, setOpen] = useState(true);
  const Component = state === "bottom" ? Drawer : state === "inspector" ? InspectorDrawer : Sheet;
  const side = state === "left" ? "left" : state === "bottom" ? "bottom" : "right";
  const table = state === "table";

  return (
    <StoryPanel className="min-h-72">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open sheet
      </Button>
      <Component
        open={open}
        onOpenChange={setOpen}
        title={state === "inspector" ? "Estimate inspector" : "Sheet drawer"}
        description="Panel surface for secondary workflows without forcing a full page transition."
        side={side}
        size={state === "inspector" || table ? "wide" : "md"}
        modal={state !== "inspector"}
        withScrim={state !== "inspector"}
        blurBackdrop={state !== "no-blur"}
        bodyClassName="space-y-3"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            <Button>Apply</Button>
          </>
        }
      >
        {state === "loading" ? (
          <div className="space-y-1">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-11/12" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}
        {state === "error" ? <Note tone="danger">Static drawer validation failed. No provider request was attempted.</Note> : null}
        {table ? (
          <div className="overflow-auto rounded-xs border border-hairline">
            <table className="w-full min-w-[520px] text-left text-[10px] leading-4">
              <thead className="bg-surfaceMuted text-[9px] text-tertiary">
                <tr>
                  <th className="px-2 py-1 font-medium">Section</th>
                  <th className="px-2 py-1 font-medium">Rows</th>
                  <th className="px-2 py-1 font-medium">Review</th>
                </tr>
              </thead>
              <tbody>
                {["Scope", "Costs", "Proposal"].map((section, index) => (
                  <tr key={section} className="border-t border-hairline">
                    <td className="px-2 py-1">{section}</td>
                    <td className="px-2 py-1">{index + 2}</td>
                    <td className="px-2 py-1">Ready</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-2">
            <ControlField label="Drawer field" helperText="Static local state">
              <ControlInput className={CONTROL_INPUT_SURFACE_CLASS} defaultValue="Review package metadata" />
            </ControlField>
            <ControlField label="Panel note">
              <ControlTextarea rows={4} defaultValue="Drawer content remains scrollable and compact." />
            </ControlField>
          </div>
        )}
        {state === "no-blur" ? <Note>No-blur sheet state is required for inspector and utility panels.</Note> : null}
      </Component>
    </StoryPanel>
  );
}

const meta = {
  title: "Overlays/SheetDrawer",
  component: Sheet,
  parameters: {
    docs: {
      description: {
        component:
          "Sheet, Drawer, and SidePanel primitives for right, left, bottom, inspector, form, table, loading, error, and no-blur panel states.",
      },
    },
  },
} satisfies Meta<typeof Sheet>;

export default meta;

type Story = StoryObj;

export const RightSheet: Story = { render: () => <SheetDrawerStory state="right" /> };
export const LeftSheet: Story = { render: () => <SheetDrawerStory state="left" /> };
export const BottomDrawer: Story = { render: () => <SheetDrawerStory state="bottom" /> };
export const InspectorPanel: Story = { render: () => <SheetDrawerStory state="inspector" /> };
export const WithForm: Story = { render: () => <SheetDrawerStory state="form" /> };
export const WithTable: Story = { render: () => <SheetDrawerStory state="table" /> };
export const LoadingState: Story = { render: () => <SheetDrawerStory state="loading" /> };
export const ErrorState: Story = { render: () => <SheetDrawerStory state="error" /> };
export const NoBlur: Story = { render: () => <SheetDrawerStory state="no-blur" /> };
