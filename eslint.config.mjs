import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code local state and git worktrees are not part of the app.
    // `worktrees/**` alone still lints other files under `.claude/`.
    ".claude/**",
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
