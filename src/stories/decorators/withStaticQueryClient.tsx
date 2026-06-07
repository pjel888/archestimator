import type { Decorator } from "@storybook/react";

export const withStaticQueryClient: Decorator = (Story) => (
  <div data-static-query-client="fixture-only">
    <Story />
  </div>
);
