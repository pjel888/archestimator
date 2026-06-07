import type { Decorator } from "@storybook/react";

export const withReducedMotion: Decorator = (Story, context) => {
  const reduced = context.globals?.reducedMotion === true;

  return (
    <div data-reduced-motion={reduced ? "true" : "false"}>
      <Story />
    </div>
  );
};
