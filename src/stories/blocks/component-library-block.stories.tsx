import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPeso, makeComponentLibraryFixture } from "../fixtures/product-fixtures";
import { Note, StoryPanel } from "../ui-library/story-canvas";

function ComponentLibraryBlockPreview() {
  const components = makeComponentLibraryFixture();

  return (
    <StoryPanel className="max-w-2xl space-y-2">
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[9px] leading-3 text-tertiary">Storybook-only block</p>
          <h3 className="text-[12px] font-medium leading-4 text-ink">Component library review</h3>
        </div>
        <Button size="sm" variant="primary">Add component</Button>
      </header>
      <div className="grid gap-1 md:grid-cols-3">
        {components.map((component) => (
          <article key={component.id} className="rounded-xs border border-hairline bg-white p-2">
            <Badge tone={component.status === "approved" ? "success" : component.status === "needs-review" ? "warning" : "neutral"} size="xs">
              {component.status}
            </Badge>
            <h4 className="mt-2 truncate text-[10px] font-medium leading-4 text-ink">{component.name}</h4>
            <p className="text-[9px] leading-3 text-tertiary">{component.category} / {component.supplier}</p>
            <p className="mt-2 text-[10px] font-medium leading-4 text-ink">{formatPeso(component.unitCost)} / {component.unit}</p>
          </article>
        ))}
      </div>
    </StoryPanel>
  );
}

const meta = {
  title: "Blocks/ComponentLibraryBlock",
  component: ComponentLibraryBlockPreview,
  parameters: {
    docs: {
      description: {
        component:
          "Storybook-only composed block for component-library review. It uses static fixtures and does not migrate the live workshop route.",
      },
    },
  },
} satisfies Meta<typeof ComponentLibraryBlockPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ComponentLibraryBlockPreview />,
};

export const MigrationBoundary: Story = {
  render: () => <Note>Blocks are review references only. Production route migration remains separately blocked until owner approval.</Note>,
};
