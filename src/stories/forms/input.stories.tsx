import type { Meta, StoryObj } from "@storybook/react";

import { ControlField, ControlInput, CONTROL_INPUT_SURFACE_CLASS } from "@/components/ui/control-input";
import { Note, StoryGrid, StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Forms/Input",
  component: ControlInput,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone input story for the shared ControlInput primitive. Static values cover helper, invalid, disabled, read-only, prefix/suffix, long value, density, and focus guidance.",
      },
    },
  },
  args: {
    defaultValue: "Demo Renovation Package",
    className: CONTROL_INPUT_SURFACE_CLASS,
    "aria-label": "Project name",
  },
  argTypes: {
    align: {
      control: "select",
      options: ["left", "center", "right"],
    },
    invalid: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
    readOnly: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof ControlInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ControlField label="Project name" helperText="Default shared input story">
      <ControlInput className={CONTROL_INPUT_SURFACE_CLASS} defaultValue="Demo Renovation Package" aria-label="Project name" />
    </ControlField>
  ),
};

export const WithHelper: Story = {
  render: () => (
    <ControlField label="Project name" helperText="Visible helper copy stays below the 10px control text.">
      <ControlInput className={CONTROL_INPUT_SURFACE_CLASS} defaultValue="Demo Renovation Package" />
    </ControlField>
  ),
};

export const Invalid: Story = {
  render: () => (
    <ControlField label="Project code" errorText="Use 3-24 uppercase letters or numbers.">
      <ControlInput className={CONTROL_INPUT_SURFACE_CLASS} invalid defaultValue="project with spaces" />
    </ControlField>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: "Locked after publication",
  },
};

export const Readonly: Story = {
  args: {
    readOnly: true,
    defaultValue: "AE-STORY-001",
  },
};

export const WithPrefixSuffix: Story = {
  render: () => (
    <StoryPanel className="flex max-w-sm items-center rounded-xs border border-hairline bg-white px-2">
      <span className="shrink-0 text-[9px] font-medium leading-3 text-tertiary">PHP</span>
      <ControlInput className="h-8 border-0 px-2 text-right" align="right" defaultValue="1285000" aria-label="Budget amount" />
      <span className="shrink-0 text-[9px] font-medium leading-3 text-tertiary">total</span>
    </StoryPanel>
  ),
};

export const LongValue: Story = {
  args: {
    defaultValue: "Extremely long project label that remains editable inside compact control surfaces without shifting surrounding layout",
  },
};

export const CompactDensity: Story = {
  render: () => (
    <StoryGrid columns="md:grid-cols-2">
      <ControlField label="Quantity">
        <ControlInput className={CONTROL_INPUT_SURFACE_CLASS} align="right" defaultValue="42" />
      </ControlField>
      <ControlField label="Unit rate">
        <ControlInput className={CONTROL_INPUT_SURFACE_CLASS} align="right" defaultValue="6200" />
      </ControlField>
    </StoryGrid>
  ),
};

export const KeyboardFocus: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <ControlInput className={CONTROL_INPUT_SURFACE_CLASS} defaultValue="Tab to focus this control" aria-label="Keyboard focus input" />
      <Note>Keyboard contract: native input focus, `aria-invalid` on invalid states, and no live provider validation in stories.</Note>
    </StoryPanel>
  ),
};
