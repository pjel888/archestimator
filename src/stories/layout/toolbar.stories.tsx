import type { Meta, StoryObj } from "@storybook/react";
import { DotsThree, FunnelSimple, Plus } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button";
import { SearchInput } from "@/components/ui/search-input";

function ToolbarPreview() {
  return (
    <div className="flex max-w-2xl items-center gap-1 rounded-xs border border-hairline bg-white p-1">
      <SearchInput value="" readOnly placeholder="Search" shortcutKey="/" aria-label="Toolbar search" wrapperClassName="h-8 min-h-8 flex-1" />
      <ToolbarIconButton label="Filter"><FunnelSimple size={12} weight="regular" aria-hidden="true" /></ToolbarIconButton>
      <ToolbarIconButton label="More actions"><DotsThree size={12} weight="regular" aria-hidden="true" /></ToolbarIconButton>
      <Button size="sm" variant="primary"><Plus size={12} weight="regular" aria-hidden="true" />Add</Button>
    </div>
  );
}

const meta = {
  title: "Layout/Toolbar",
  component: ToolbarPreview,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone Toolbar composition using shared SearchInput, ToolbarIconButton, and Button primitives.",
      },
    },
  },
} satisfies Meta<typeof ToolbarPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ToolbarPreview />,
};
