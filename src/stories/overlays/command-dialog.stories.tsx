import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CommandDialog, CommandMenu, type CommandGroup } from "@/components/ui/overlays/command-dialog";
import { Note, StoryPanel } from "../ui-library/story-canvas";

const commandGroups: CommandGroup[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { id: "open-project", label: "Open project", description: "Jump to a closed-beta project", shortcut: "P" },
      { id: "new-estimate", label: "New estimate", description: "Create a static estimate fixture", shortcut: "N" },
    ],
  },
  {
    id: "review",
    label: "Review",
    items: [
      { id: "share-package", label: "Share package", description: "Open proposal review surface", shortcut: "S" },
      { id: "approve-changes", label: "Approve changes", description: "Mark static review fixture approved", shortcut: "A" },
    ],
  },
];

function CommandDialogFixture({ variant = "default" }: { variant?: "default" | "palette" | "menu" | "loading" | "empty" | "focus" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(variant === "empty" ? "zzzz" : "");

  return (
    <StoryPanel className="min-h-64">
      <Button onClick={() => setOpen(true)}>Open commands</Button>
      {variant === "menu" ? (
        <div className="mt-3 max-w-lg">
          <CommandMenu query={query} onQueryChange={setQuery} groups={commandGroups} />
        </div>
      ) : (
        <CommandDialog
          open={open}
          onOpenChange={setOpen}
          query={query}
          onQueryChange={setQuery}
          groups={commandGroups}
          loading={variant === "loading"}
          emptyLabel="No command fixture found"
          title={variant === "palette" ? "Command palette" : "Command dialog"}
          description="Provider-free command surface for app navigation and review actions."
        />
      )}
      {variant === "focus" ? <Note>Keyboard contract: query input is the first field and filtered commands expose option semantics.</Note> : null}
    </StoryPanel>
  );
}

const meta = {
  title: "Overlays/CommandDialog",
  component: CommandDialog,
  parameters: {
    docs: {
      description: {
        component:
          "CommandDialog, CommandPalette, and CommandMenu primitives using local grouped command fixtures. No cmdk dependency or route action is introduced.",
      },
    },
  },
} satisfies Meta<typeof CommandDialog>;

export default meta;

type Story = StoryObj;

export const Default: Story = { render: () => <CommandDialogFixture /> };
export const CommandPalette: Story = { render: () => <CommandDialogFixture variant="palette" /> };
export const CommandMenuInline: Story = { render: () => <CommandDialogFixture variant="menu" /> };
export const LoadingState: Story = { render: () => <CommandDialogFixture variant="loading" /> };
export const EmptyState: Story = { render: () => <CommandDialogFixture variant="empty" /> };
export const KeyboardFocus: Story = { render: () => <CommandDialogFixture variant="focus" /> };
