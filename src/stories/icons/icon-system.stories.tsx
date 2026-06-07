import type { Meta, StoryObj } from "@storybook/react";
import { Plus, XCircle } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { IconGallery, Note, StoryHeader, StoryPanel, StorySection } from "../ui-library/story-canvas";

const meta = {
  title: "Icon system/Phosphor Regular",
  parameters: {
    docs: {
      description: {
        component:
          "P0 icon gallery using Phosphor regular outline icons, with labelled and decorative examples.",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const IconGalleryStory: Story = {
  name: "IconGallery",
  render: () => (
    <>
      <StoryHeader
        eyebrow="P0 icons"
        title="Semantic icon map"
        description="Icons remain compact, regular weight, and labelled when they are the only visible control text."
      />
      <IconGallery />
    </>
  ),
};

export const LabelledAndDecorativeIcons: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P0 icons"
        title="Labelled and decorative icon rules"
        description="Icon-only buttons carry accessible labels. Inline decorative icons are hidden from assistive tech."
      />
      <StoryPanel className="flex flex-wrap items-center gap-2">
        <Button size="icon-sm" aria-label="Add estimate row">
          <Plus size={12} weight="regular" aria-hidden="true" />
        </Button>
        <Button size="icon-sm" variant="danger" aria-label="Remove estimate row">
          <XCircle size={12} weight="regular" aria-hidden="true" />
        </Button>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-ink">
          <Plus size={11} weight="regular" aria-hidden="true" />
          Add row
        </span>
      </StoryPanel>
      <StorySection title="Accessibility note">
        <Note>Keyboard focus lands on the button, not the SVG. Decorative SVGs use `aria-hidden`.</Note>
      </StorySection>
    </>
  ),
};
