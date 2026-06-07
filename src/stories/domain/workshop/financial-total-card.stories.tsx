import type { Meta, StoryObj } from "@storybook/react";
import { FinancialTotalCard } from "@/components/ui/financial-total-card";

const meta = {
  title: "Domain/Workshop/FinancialTotalCard",
  component: FinancialTotalCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "primary"],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[250px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FinancialTotalCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Subtotal",
    value: "$45,250.00",
    sublabel: "Excludes tax and markup",
  },
};

export const Primary: Story = {
  args: {
    label: "Total Estimate",
    value: "$52,840.50",
    sublabel: "Includes 15% markup",
    variant: "primary",
  },
};

export const WithoutSublabel: Story = {
  args: {
    label: "Tax (8.5%)",
    value: "$3,846.25",
  },
};
