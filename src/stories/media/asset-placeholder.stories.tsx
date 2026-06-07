import type { Meta, StoryObj } from "@storybook/react";
import { FileText, Image as ImageIcon, UserCircle } from "@phosphor-icons/react";

import { Note, StoryGrid, StoryPanel } from "../ui-library/story-canvas";

function AssetPlaceholderPreview() {
  return (
    <StoryGrid columns="md:grid-cols-3">
      <StoryPanel className="flex min-h-24 flex-col items-center justify-center gap-2">
        <ImageIcon size={18} weight="regular" aria-hidden="true" />
        <p className="text-[10px] font-medium leading-4 text-ink">Image placeholder</p>
      </StoryPanel>
      <StoryPanel className="flex min-h-24 flex-col items-center justify-center gap-2">
        <FileText size={18} weight="regular" aria-hidden="true" />
        <p className="text-[10px] font-medium leading-4 text-ink">Document placeholder</p>
      </StoryPanel>
      <StoryPanel className="flex min-h-24 flex-col items-center justify-center gap-2">
        <UserCircle size={18} weight="regular" aria-hidden="true" />
        <p className="text-[10px] font-medium leading-4 text-ink">Avatar placeholder</p>
      </StoryPanel>
    </StoryGrid>
  );
}

const meta = {
  title: "Media/AssetPlaceholder",
  component: AssetPlaceholderPreview,
  parameters: {
    docs: {
      description: {
        component:
          "Story-only media placeholders for image, document, avatar, and attachment surfaces. No remote image fetch or upload API is used.",
      },
    },
  },
} satisfies Meta<typeof AssetPlaceholderPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <AssetPlaceholderPreview />,
};

export const BoundaryNotes: Story = {
  render: () => <Note>Media stories use local placeholders only; file upload, storage, and provider previews stay deferred.</Note>,
};
