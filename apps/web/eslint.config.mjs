import { defineConfig, globalIgnores } from "eslint/config";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
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
    "eslint.config.mjs",
  ]),
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@eslint-community/eslint-comments": eslintComments,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@eslint-community/eslint-comments/require-description": "error",
      // Aspirational target from CI design was 50; current baseline tops out ~133.
      // Ship at 150 and ratchet down in follow-ups rather than block on day one.
      // File line caps live in scripts/ci/check-file-size.mjs (single source of truth).
      "max-lines-per-function": [
        "error",
        {
          max: 150,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='require']",
          message:
            "Inline require() is banned — use top-level imports (see AGENTS / Cursor rules).",
        },
        {
          selector: ":function ImportExpression",
          message:
            "Inline import() in functions is banned unless justified (e.g. next/dynamic).",
        },
      ],
    },
  },
  {
    files: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "max-lines-per-function": "off",
    },
  },
]);

export default eslintConfig;
