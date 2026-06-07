import type { Meta, StoryObj } from "@storybook/react";

import { ButtonGroup, Button, IconButton } from "@/components/ui";
import { StoryPanel } from "../ui-library/story-canvas";
import { List, GridFour, MapTrifold } from "@phosphor-icons/react";

const meta = {
  title: "Actions/ButtonGroup",
  component: ButtonGroup,
  parameters: {
    docs: {
      description: {
        component: "ButtonGroup component for grouping related buttons together.",
      },
    },
  },
  args: {
    children: <Button>Test</Button>,
  },
} satisfies Meta<typeof ButtonGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel>
      <ButtonGroup>
        <Button variant="secondary">Day</Button>
        <Button variant="secondary">Week</Button>
        <Button variant="secondary">Month</Button>
      </ButtonGroup>
    </StoryPanel>
  ),
};

export const Primary: Story = {
  render: () => (
    <StoryPanel>
      <ButtonGroup>
        <Button variant="primary">Save</Button>
        <Button variant="primary">Publish</Button>
      </ButtonGroup>
    </StoryPanel>
  ),
};

export const Ghost: Story = {
  render: () => (
    <StoryPanel>
      <ButtonGroup>
        <Button variant="ghost">Left</Button>
        <Button variant="ghost">Center</Button>
        <Button variant="ghost">Right</Button>
      </ButtonGroup>
    </StoryPanel>
  ),
};

export const Vertical: Story = {
  render: () => (
    <StoryPanel>
      <ButtonGroup orientation="vertical">
        <Button variant="secondary">Top</Button>
        <Button variant="secondary">Middle</Button>
        <Button variant="secondary">Bottom</Button>
      </ButtonGroup>
    </StoryPanel>
  ),
};

export const Sizes: Story = {
  render: () => (
    <StoryPanel className="flex flex-col gap-4 items-start">
      <ButtonGroup size="sm">
        <Button variant="secondary">Small</Button>
        <Button variant="secondary">Small</Button>
      </ButtonGroup>
      <ButtonGroup size="md">
        <Button variant="secondary">Medium</Button>
        <Button variant="secondary">Medium</Button>
      </ButtonGroup>
      <ButtonGroup size="lg">
        <Button variant="secondary">Large</Button>
        <Button variant="secondary">Large</Button>
      </ButtonGroup>
    </StoryPanel>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <StoryPanel>
      <ButtonGroup>
        <IconButton icon={<List size={14} weight="regular" />} label="List view" variant="secondary" />
        <IconButton icon={<GridFour size={14} weight="regular" />} label="Grid view" variant="secondary" />
        <IconButton icon={<MapTrifold size={14} weight="regular" />} label="Map view" variant="secondary" />
      </ButtonGroup>
    </StoryPanel>
  ),
};

export const WithMixedActions: Story = { args: { children: [<Button key="1" variant="secondary">Save</Button>, <Button key="2" variant="primary">Publish</Button>] } };
