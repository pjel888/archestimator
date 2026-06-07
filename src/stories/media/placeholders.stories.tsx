import type { Meta, StoryObj } from "@storybook/react";
import { File, ImageSquare } from "@phosphor-icons/react";

function MediaPlaceholderPreview() {
  return (
    <div className="grid max-w-lg grid-cols-2 gap-2">
      <div className="flex h-28 items-center justify-center rounded-xs border border-hairline bg-surfaceMuted text-tertiary">
        <ImageSquare size={22} weight="regular" aria-hidden="true" />
        <span className="ml-2 text-[10px] font-medium leading-4">Image placeholder</span>
      </div>
      <div className="flex h-28 items-center justify-center rounded-xs border border-hairline bg-surfaceMuted text-tertiary">
        <File size={22} weight="regular" aria-hidden="true" />
        <span className="ml-2 text-[10px] font-medium leading-4">Document placeholder</span>
      </div>
    </div>
  );
}

const meta = {
  title: "Media/Placeholders",
  component: MediaPlaceholderPreview,
  parameters: {
    docs: {
      description: {
        component:
          "DEFERRED Media group entry for static placeholders. No upload or storage provider behavior is included.",
      },
    },
  },
} satisfies Meta<typeof MediaPlaceholderPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DeferredPreview: Story = { render: () => <MediaPlaceholderPreview /> };
