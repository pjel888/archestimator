import type { Meta, StoryObj } from "@storybook/react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Layout/ScrollArea",
  component: ScrollArea,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "A scrollable area component that supports vertical or both orientations.",
      },
    },
  },
  argTypes: {
    orientation: {
      control: "select",
      options: ["vertical", "both"],
    },
  },
} satisfies Meta<typeof ScrollArea>;

export default meta;

type Story = StoryObj<typeof meta>;

const LongContent = () => (
  <div className="space-y-4 p-4 text-[10px] text-ink">
    <h4 className="font-medium">Terms and Conditions</h4>
    <p>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
    </p>
    <p>
      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
    </p>
    <p>
      Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
    </p>
    <p>
      Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.
    </p>
    <p>
      Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.
    </p>
  </div>
);

const WideContent = () => (
  <div className="w-[800px] space-y-4 p-4 text-[10px] text-ink">
    <h4 className="font-medium">Wide Data Table</h4>
    <div className="flex gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-20 w-40 shrink-0 rounded-xs border border-hairline bg-surfaceMuted p-2">
          Column {i + 1}
        </div>
      ))}
    </div>
    <p>
      This content is wider than the container, forcing horizontal scrolling when orientation is set to &quot;both&quot;.
    </p>
  </div>
);

export const Default: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <div className="h-64 rounded-xs border border-hairline bg-surface">
        <ScrollArea className="h-full">
          <LongContent />
        </ScrollArea>
      </div>
    </StoryPanel>
  ),
};

export const WithMaxHeight: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <div className="rounded-xs border border-hairline bg-surface">
        <ScrollArea maxHeight={150}>
          <LongContent />
        </ScrollArea>
      </div>
    </StoryPanel>
  ),
};

export const BothOrientations: Story = {
  render: () => (
    <StoryPanel className="max-w-md">
      <div className="h-48 rounded-xs border border-hairline bg-surface">
        <ScrollArea className="h-full" orientation="both">
          <WideContent />
        </ScrollArea>
      </div>
    </StoryPanel>
  ),
};
