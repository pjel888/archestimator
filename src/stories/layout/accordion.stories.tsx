import type { Meta, StoryObj } from "@storybook/react";

import { Accordion } from "@/components/ui/accordion";
import { StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Layout/Accordion",
  component: Accordion,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "A vertically stacked set of interactive headings that each reveal a section of content.",
      },
    },
  },
  args: {
    items: [],
  },
  argTypes: {
    allowMultiple: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Accordion>;

export default meta;

type Story = StoryObj<typeof meta>;

const defaultItems = [
  {
    id: "item-1",
    title: "Is it accessible?",
    content: "Yes. It adheres to the WAI-ARIA design pattern.",
  },
  {
    id: "item-2",
    title: "Is it styled?",
    content: "Yes. It comes with default styles that match the other components' aesthetic.",
  },
  {
    id: "item-3",
    title: "Is it animated?",
    content: "Yes. It's animated by default, but you can disable it if you prefer.",
  },
];

export const Default: Story = {
  render: () => (
    <StoryPanel className="max-w-md">
      <div className="rounded-xs border border-hairline bg-surface px-4">
        <Accordion items={defaultItems} />
      </div>
    </StoryPanel>
  ),
};

export const SingleOpen: Story = {
  render: () => (
    <StoryPanel className="max-w-md">
      <div className="rounded-xs border border-hairline bg-surface px-4">
        <Accordion items={defaultItems} allowMultiple={false} />
      </div>
    </StoryPanel>
  ),
};

export const MultipleOpen: Story = {
  render: () => (
    <StoryPanel className="max-w-md">
      <div className="rounded-xs border border-hairline bg-surface px-4">
        <Accordion items={defaultItems} allowMultiple={true} />
      </div>
    </StoryPanel>
  ),
};

export const WithDefaultOpen: Story = {
  render: () => (
    <StoryPanel className="max-w-md">
      <div className="rounded-xs border border-hairline bg-surface px-4">
        <Accordion 
          items={[
            { ...defaultItems[0], defaultOpen: true },
            defaultItems[1],
            defaultItems[2],
          ]} 
        />
      </div>
    </StoryPanel>
  ),
};

export const WithLongContent: Story = {
  render: () => (
    <StoryPanel className="max-w-md">
      <div className="rounded-xs border border-hairline bg-surface px-4">
        <Accordion 
          items={[
            {
              id: "long-1",
              title: "Detailed Specifications",
              content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
            },
            {
              id: "long-2",
              title: "Installation Guide",
              content: "1. Unpack the contents carefully.\n2. Verify all parts are present.\n3. Follow the assembly instructions in order.\n4. Do not overtighten screws.\n5. Contact support if you encounter any issues during installation.",
            }
          ]} 
        />
      </div>
    </StoryPanel>
  ),
};
