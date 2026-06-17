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
    "archestimator_pitch deck/**",
    "test-table.tsx",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
