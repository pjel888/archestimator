# Storybook Config Skeletons

**Status:** Planning skeletons only. These files do not exist yet.
**Use after:** Philip approves Storybook package installation.
**Do not copy blindly:** Future implementation must re-check official Storybook and Next.js local docs first.

## Package Scripts Skeleton

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "devDependencies": {
    "storybook": "<current-approved-version>",
    "@storybook/nextjs-vite": "<current-approved-version>"
  }
}
```

Optional, only if approved and compatible:

```json
{
  "devDependencies": {
    "@storybook/addon-a11y": "<current-approved-version>",
    "@storybook/test": "<current-approved-version>"
  }
}
```

## `.storybook/main.ts` Skeleton

```ts
import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  framework: {
    name: "@storybook/nextjs-vite",
    options: {}
  },
  stories: [
    "../src/**/*.stories.@(ts|tsx|mdx)",
    "../src/**/*.mdx"
  ],
  addons: [
    "@storybook/addon-docs"
    // "@storybook/addon-a11y" // add only after approval
  ],
  staticDirs: [
    "../public"
  ],
  docs: {
    autodocs: "tag"
  }
};

export default config;
```

Fallback if official/current compatibility proves Vite unsuitable:

```ts
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  framework: {
    name: "@storybook/nextjs",
    options: {}
  },
  stories: ["../src/**/*.stories.@(ts|tsx|mdx)", "../src/**/*.mdx"],
  addons: ["@storybook/addon-docs"],
  staticDirs: ["../public"],
  docs: { autodocs: "tag" }
};

export default config;
```

## `.storybook/preview.tsx` Skeleton

```tsx
import type { Preview } from "@storybook/nextjs-vite";
import "../src/app/globals.css";
import { withArchEstimatorTheme } from "../src/stories/decorators/withArchEstimatorTheme";
import { withMockRouter } from "../src/stories/decorators/withMockRouter";
import { withStaticQueryClient } from "../src/stories/decorators/withStaticQueryClient";
import { withReducedMotion } from "../src/stories/decorators/withReducedMotion";

const preview: Preview = {
  parameters: {
    nextjs: {
      appDirectory: true
    },
    controls: {
      expanded: true
    },
    a11y: {
      // enable only when addon is installed
      test: "todo"
    },
    options: {
      storySort: {
        order: [
          "Foundations",
          "Icons",
          "Typography",
          "Actions",
          "Forms",
          "Menus",
          "Overlays",
          "Navigation",
          "Data Display",
          "Trees",
          "Domain",
          "Motion",
          "Blocks",
          "Governance"
        ]
      }
    }
  },
  decorators: [
    withArchEstimatorTheme,
    withMockRouter,
    withStaticQueryClient,
    withReducedMotion
  ],
  tags: ["autodocs"]
};

export default preview;
```

## `preview-head.html` Decision

Default: do not create this file unless Storybook needs static font metadata or viewport tuning that cannot live in `preview.tsx`.

Forbidden in `preview-head.html`:

- Analytics scripts.
- Vercel Speed Insights or Analytics.
- Supabase, Resend, OAuth, or provider scripts.
- Private dashboard snippets.
- External paid asset links.

## Decorator Skeletons

```tsx
// src/stories/decorators/withArchEstimatorTheme.tsx
import type { Decorator } from "@storybook/react";

export const withArchEstimatorTheme: Decorator = (Story) => (
  <div data-archestimator-story-root="true" className="min-h-screen bg-background text-foreground font-sans">
    <Story />
  </div>
);
```

```tsx
// src/stories/decorators/withMockRouter.tsx
import type { Decorator } from "@storybook/react";

export const withMockRouter: Decorator = (Story) => (
  <div data-mock-route="/workshop/projects/demo/estimates/demo-node">
    <Story />
  </div>
);
```

```tsx
// src/stories/decorators/withStaticQueryClient.tsx
import type { Decorator } from "@storybook/react";

export const withStaticQueryClient: Decorator = (Story) => (
  <Story />
);
```

```tsx
// src/stories/decorators/withReducedMotion.tsx
import type { Decorator } from "@storybook/react";

export const withReducedMotion: Decorator = (Story, context) => {
  const reduced = context.globals?.reducedMotion === true;
  return (
    <div data-reduced-motion={reduced ? "true" : "false"}>
      <Story />
    </div>
  );
};
```

## Fixture Builder Skeleton

```ts
// src/stories/fixtures/project-fixtures.ts
export type StoryProject = {
  id: string;
  name: string;
  code: string;
  status: "draft" | "active" | "shared" | "archived";
  estimateCount: number;
  totalCost: number;
};

export function makeProjectFixture(overrides: Partial<StoryProject> = {}): StoryProject {
  return {
    id: "story-project-001",
    name: "Demo Renovation Package",
    code: "AE-STORY-001",
    status: "active",
    estimateCount: 3,
    totalCost: 1285000,
    ...overrides
  };
}
```

## Story File Template

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";

const meta = {
  title: "Actions/Button",
  component: Button,
  parameters: {
    docs: {
      description: {
        component: "ArchEstimator product Button. App/workshop use only; production migration remains deferred until Storybook approval."
      }
    }
  },
  args: {
    children: "Save estimate"
  }
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    "aria-busy": true,
    children: "Saving"
  }
};
```

## Validation Skeleton

Run after future implementation:

```bash
bun install
bun run storybook
bun run build-storybook
bun run validate
bun run build
git diff --check
```

The exact `bun run type-check` script name is mandatory for type checking. Do not use `bun run typecheck`.
