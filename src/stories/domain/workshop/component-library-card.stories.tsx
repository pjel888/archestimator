import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPeso, makeComponentLibraryFixture, type StoryComponentLibraryItem } from "../../fixtures/product-fixtures";
import { StoryGrid, StoryPanel } from "../../ui-library/story-canvas";

function ComponentLibraryCardItem({ component }: { component: StoryComponentLibraryItem }) {
  return (
    <StoryPanel className="space-y-1">
      <Badge tone={component.status === "approved" ? "success" : component.status === "needs-review" ? "warning" : "neutral"}>{component.status}</Badge>
      <h3 className="truncate text-[11px] font-medium leading-4 text-ink">{component.name}</h3>
      <p className="text-[9px] leading-3 text-tertiary">{component.category} / {component.supplier}</p>
      <p className="text-[10px] font-medium leading-4 text-ink">{formatPeso(component.unitCost)} / {component.unit}</p>
      <Button size="sm" variant="secondary">Review</Button>
    </StoryPanel>
  );
}

function ComponentLibraryCardPreview() {
  return (
    <StoryGrid columns="md:grid-cols-3">
      {makeComponentLibraryFixture().map((component) => (
        <ComponentLibraryCardItem key={component.id} component={component} />
      ))}
    </StoryGrid>
  );
}

const meta = {
  title: "Domain/Workshop/ComponentLibraryCard",
  component: ComponentLibraryCardPreview,
  parameters: {
    archestimator: {
      storybookContract: "fixture-only",
    },
    docs: {
      description: {
        component:
          "Standalone ComponentLibraryCard story using static component fixtures. It does not import library repositories or mutate component data.",
      },
    },
  },
} satisfies Meta<typeof ComponentLibraryCardPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ComponentLibraryCardPreview />,
};

export const Approved: Story = {
  render: () => <ComponentLibraryCardItem component={makeComponentLibraryFixture()[0]} />,
};

export const NeedsReview: Story = {
  render: () => <ComponentLibraryCardItem component={makeComponentLibraryFixture()[1]} />,
};

export const Draft: Story = {
  render: () => <ComponentLibraryCardItem component={makeComponentLibraryFixture()[2]} />,
};

export const Grid: Story = {
  render: () => <ComponentLibraryCardPreview />,
};
