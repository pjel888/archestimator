import type { Meta, StoryObj } from "@storybook/react";
import type { ComponentProps } from "react";

import { ControlField } from "@/components/ui/control-input";
import { ControlSelect } from "@/components/ui/control-select";
import { Note, StoryGrid, StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Forms/Select",
  component: ControlSelect,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone native select story for compact app/workshop option sets. Uses static option fixtures and no async provider loading.",
      },
    },
  },
} satisfies Meta<typeof ControlSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <StatusSelect />,
};

export const WithHelper: Story = {
  render: () => (
    <ControlField label="Status" helperText="Static native select fixture" as="div">
      <StatusSelect />
    </ControlField>
  ),
};

export const Invalid: Story = {
  render: () => (
    <ControlField label="Estimate state" errorText="Choose a review state before sharing." as="div">
      <ControlSelect defaultValue="" className="text-danger" wrapperClassName="h-8 border border-dangerSoft px-2">
        <option value="">Choose state</option>
        <option value="draft">Draft</option>
        <option value="review">Review</option>
      </ControlSelect>
    </ControlField>
  ),
};

export const Disabled: Story = {
  render: () => <StatusSelect disabled />,
};

export const CompactDensity: Story = {
  render: () => (
    <StoryGrid columns="md:grid-cols-3">
      <ControlField label="Status" as="div"><StatusSelect /></ControlField>
      <ControlField label="Scope" as="div"><ScopeSelect /></ControlField>
      <ControlField label="Currency" as="div"><CurrencySelect /></ControlField>
    </StoryGrid>
  ),
};

export const KeyboardFocus: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <StatusSelect />
      <Note>Keyboard contract: native select supports Tab focus, arrow navigation, and no custom menu dependency.</Note>
    </StoryPanel>
  ),
};

function StatusSelect(props: ComponentProps<typeof ControlSelect>) {
  return (
    <ControlSelect defaultValue="review" wrapperClassName="h-8 border border-hairline px-2" {...props}>
      <option value="draft">Draft</option>
      <option value="review">In review</option>
      <option value="approved">Approved</option>
    </ControlSelect>
  );
}

function ScopeSelect() {
  return (
    <ControlSelect defaultValue="millwork" wrapperClassName="h-8 border border-hairline px-2">
      <option value="millwork">Millwork</option>
      <option value="lighting">Lighting</option>
      <option value="furniture">Furniture</option>
    </ControlSelect>
  );
}

function CurrencySelect() {
  return (
    <ControlSelect defaultValue="php" wrapperClassName="h-8 border border-hairline px-2">
      <option value="php">PHP</option>
      <option value="usd">USD</option>
    </ControlSelect>
  );
}
