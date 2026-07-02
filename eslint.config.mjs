import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".vercel/**",
    "out/**",
    "build/**",
    "storybook-static/**",
    "next-env.d.ts",
    "node_modules/**",
    ".ai/**",
    ".agents/**",
    ".claude/**",
    ".codex/**",
    ".commandcode/**",
    ".cursor/**",
    ".github/skills/**",
    ".hermes/**",
    ".omx/**",
    ".supermemory/**",
    ".cache/**",
    ".gitnexus/**",
    ".code-review-graph/**",
    ".chunkhound/**",
    ".opennext/**",
    "archestimator_pitch deck/**",
    "test-table.tsx",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "prompt",
          message: "Use an in-app dialog or inline editor instead of the native browser prompt API.",
        },
        {
          name: "confirm",
          message: "Use an in-app confirmation dialog instead of the native browser confirm API.",
        },
        {
          name: "alert",
          message: "Use an in-app alert, toast, or status surface instead of the native browser alert API.",
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "prompt",
          message: "Use an in-app dialog or inline editor instead of window.prompt.",
        },
        {
          object: "window",
          property: "confirm",
          message: "Use an in-app confirmation dialog instead of window.confirm.",
        },
        {
          object: "window",
          property: "alert",
          message: "Use an in-app alert, toast, or status surface instead of window.alert.",
        },
        {
          object: "globalThis",
          property: "prompt",
          message: "Use an in-app dialog or inline editor instead of the native browser prompt API.",
        },
        {
          object: "globalThis",
          property: "confirm",
          message: "Use an in-app confirmation dialog instead of the native browser confirm API.",
        },
        {
          object: "globalThis",
          property: "alert",
          message: "Use an in-app alert, toast, or status surface instead of the native browser alert API.",
        },
        {
          object: "self",
          property: "prompt",
          message: "Use an in-app dialog or inline editor instead of the native browser prompt API.",
        },
        {
          object: "self",
          property: "confirm",
          message: "Use an in-app confirmation dialog instead of the native browser confirm API.",
        },
        {
          object: "self",
          property: "alert",
          message: "Use an in-app alert, toast, or status surface instead of the native browser alert API.",
        },
      ],
    },
  },
]);

export default eslintConfig;
