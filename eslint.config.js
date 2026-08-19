import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: [
      "apps/editor/**/*.{ts,tsx}",
      "games/**/*.{ts,tsx}",
      "packages/renderer-pixi/**/*.ts",
      "packages/renderer-three/**/*.ts",
      "packages/runtime/**/*.ts",
      "packages/editor-core/**/*.ts",
      "packages/game-components/**/*.ts",
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: [
      "apps/project-server/**/*.ts",
      "packages/project/**/*.ts",
      "scripts/**/*.{ts,js,mjs}",
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: [
      "packages/scene/**/*.ts",
      "packages/shared/**/*.ts",
      "packages/core/**/*.ts",
      "packages/commands/**/*.ts",
      "packages/assets/**/*.ts",
    ],
    languageOptions: {
      globals: {
        ...globals.es2022,
        console: "readonly",
        performance: "readonly",
      },
    },
  },
  {
    files: ["**/vite.config.ts", "**/vitest.config.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
);
