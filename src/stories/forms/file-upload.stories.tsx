import type { Meta, StoryObj } from "@storybook/react";

import { FileUpload } from "@/components/ui/file-upload";
import { ControlField } from "@/components/ui/control-input";
import { StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Forms/FileUpload",
  component: FileUpload,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "A drag-and-drop file upload component with size and type validation.",
      },
    },
  },
  argTypes: {
    invalid: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
    multiple: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof FileUpload>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Upload Document">
        <FileUpload />
      </ControlField>
    </StoryPanel>
  ),
};

export const WithFilesSelected: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Upload Document" helperText="Interact with the component to see selected files">
        <FileUpload />
      </ControlField>
    </StoryPanel>
  ),
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) {
      const file = new File(["dummy content"], "project-specifications.pdf", { type: "application/pdf" });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      const event = new Event("change", { bubbles: true });
      input.dispatchEvent(event);
    }
  },
};

export const Disabled: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Upload Document">
        <FileUpload disabled />
      </ControlField>
    </StoryPanel>
  ),
};

export const Invalid: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Upload Document" errorText="File is required">
        <FileUpload invalid />
      </ControlField>
    </StoryPanel>
  ),
};

export const AcceptPdfOnly: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Upload PDF">
        <FileUpload accept=".pdf,application/pdf" />
      </ControlField>
    </StoryPanel>
  ),
};
