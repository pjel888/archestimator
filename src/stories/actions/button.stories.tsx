import type { Meta, StoryObj } from "@storybook/react";
import { ArrowClockwise, FloppyDisk, Plus, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Note, StoryHeader, StoryPanel, StorySection } from "../ui-library/story-canvas";

const meta = {
  title: "Actions/Button",
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone Button story for the shared ArchEstimator action primitive. Uses static labels only and keeps app/workshop sizing at the compact SF Pro scale.",
      },
    },
  },
  args: {
    children: "Review estimate",
    variant: "secondary",
    size: "md",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "danger", "overlay", "scrim"],
      description: "Visual intent. App/workshop stories use neutral compact variants; overlay/scrim are specialist states.",
    },
    size: {
      control: "select",
      options: ["sm", "md", "icon", "icon-sm", "scrim"],
      description: "Compact control size. Use icon sizes only with accessible labels.",
    },
    disabled: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <StoryPanel className="flex flex-wrap items-center gap-1">
      <Button variant="primary">Save estimate</Button>
      <Button variant="secondary">Review</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="danger">Delete</Button>
    </StoryPanel>
  ),
};

export const Sizes: Story = {
  render: () => (
    <StoryPanel className="flex flex-wrap items-center gap-1">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="icon-sm" aria-label="Add row">
        <Plus size={12} weight="regular" aria-hidden="true" />
      </Button>
      <Button size="icon" aria-label="Save estimate">
        <FloppyDisk size={13} weight="regular" aria-hidden="true" />
      </Button>
    </StoryPanel>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Button variant="primary">
      <FloppyDisk size={13} weight="regular" aria-hidden="true" />
      Save estimate
    </Button>
  ),
};

export const IconOnly: Story = {
  render: () => (
    <Button size="icon-sm" aria-label="Add row">
      <Plus size={12} weight="regular" aria-hidden="true" />
    </Button>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Waiting for selection",
  },
};

export const Loading: Story = {
  render: () => (
    <Button aria-busy="true" disabled>
      <ArrowClockwise size={12} weight="regular" className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      Saving
    </Button>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Button variant="danger">
      <Trash size={12} weight="regular" aria-hidden="true" />
      Delete row
    </Button>
  ),
};

export const LongContent: Story = {
  render: () => (
    <Button className="max-w-48 truncate">
      Long action label that truncates inside compact controls
    </Button>
  ),
};

export const KeyboardFocus: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="Accessibility"
        title="Keyboard focus and label contract"
        description="Buttons expose native keyboard activation, visible focus rings, disabled semantics, and icon-only accessible labels."
      />
      <StorySection title="Focus examples">
        <StoryPanel className="flex flex-wrap items-center gap-1">
          <Button variant="primary">Tab target</Button>
          <Button size="icon-sm" aria-label="Refresh estimate">
            <ArrowClockwise size={12} weight="regular" aria-hidden="true" />
          </Button>
          <Button disabled>Disabled target</Button>
        </StoryPanel>
      </StorySection>
      <Note>Migration status: ready for app reuse; no production route migration has been performed by this story.</Note>
    </>
  ),
};
