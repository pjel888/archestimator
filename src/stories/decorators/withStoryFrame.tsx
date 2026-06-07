import type { Decorator } from "@storybook/react";

export const withStoryFrame: Decorator = (Story) => (
  <main className="min-h-screen bg-canvas p-3">
    <div className="mx-auto min-h-[calc(100vh-24px)] max-w-6xl border border-hairline bg-white p-3">
      <Story />
    </div>
  </main>
);
