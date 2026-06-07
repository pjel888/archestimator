import type { Meta, StoryObj } from "@storybook/react";

import { Note, StoryGrid, StoryPanel, TypographySpecimen } from "../ui-library/story-canvas";

function TextPreview() {
  return (
    <StoryGrid columns="md:grid-cols-2">
      <TypographySpecimen />
      <StoryPanel className="space-y-2">
        <p className="text-[12px] font-medium leading-4 text-ink">Heading text stays at the 12px product cap.</p>
        <p className="text-[10px] leading-4 text-secondary">Body text uses compact SF Pro sizing with zero letter spacing.</p>
        <p className="truncate text-[10px] leading-4 text-ink">Long text truncates inside the parent without resizing the layout container.</p>
        <Note>Landing display typography remains out of scope for product/workshop stories.</Note>
      </StoryPanel>
    </StoryGrid>
  );
}

const meta = {
  title: "Typography/Text",
  component: TextPreview,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone typography story for product text primitives and compact sizing rules from DESIGN.md.",
      },
    },
  },
} satisfies Meta<typeof TextPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <TextPreview />,
};

export const TruncatedText: Story = {
  render: () => (
    <StoryPanel className="w-64">
      <p className="truncate text-[10px] leading-4 text-ink">A very long component, supplier, or estimate label that truncates cleanly.</p>
    </StoryPanel>
  ),
};
