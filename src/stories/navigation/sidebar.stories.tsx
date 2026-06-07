import type { Meta, StoryObj } from "@storybook/react";
import { Gear, HouseLine, SquaresFour } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";

function SidebarPreview() {
  const items = [
    { label: "Projects", icon: SquaresFour, active: true },
    { label: "Home", icon: HouseLine },
    { label: "Settings", icon: Gear },
  ];

  return (
    <aside className="w-56 rounded-xs border border-hairline bg-white p-2">
      <p className="mb-2 text-[11px] font-medium leading-4 text-ink">ArchEstimator</p>
      <nav className="space-y-1" aria-label="Story sidebar">
        {items.map(({ label, icon: Icon, active }) => (
          <a key={label} href="#" aria-current={active ? "page" : undefined} className={`flex min-h-7 items-center gap-2 rounded-xs px-2 text-[10px] font-medium leading-4 ${active ? "bg-surfaceMuted text-ink" : "text-secondary"}`}>
            <Icon size={13} weight="regular" aria-hidden="true" />
            {label}
            {active ? <Badge size="xs">current</Badge> : null}
          </a>
        ))}
      </nav>
    </aside>
  );
}

const meta = {
  title: "Navigation/Sidebar",
  component: SidebarPreview,
  parameters: {
    docs: {
      description: {
        component:
          "Story-only sidebar navigation preview for compact product shell review. It does not replace WorkshopPageShell.",
      },
    },
  },
} satisfies Meta<typeof SidebarPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <SidebarPreview />,
};
