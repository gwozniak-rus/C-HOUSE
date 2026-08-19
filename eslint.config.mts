import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import configPrettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "coverage/**",
      "dist/**",
      "web-build/**",
      "public/**",
      // Deno runtime (Supabase Edge Functions) — different globals/module
      // resolution than the app, lint separately with `supabase functions`.
      "supabase/functions/**",
      // Supabase CLI-generated local runtime cache (gitignored, not source).
      "supabase/.branches/**",
      "supabase/.temp/**",
    ],
  },

  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  pluginReactHooks.configs.flat.recommended,
  // Turns off ESLint stylistic rules that would fight Prettier's formatting.
  // Run Prettier itself separately (`npm run format`) — routing it through
  // ESLint via eslint-plugin-prettier hangs under this project's toolchain.
  configPrettier,

  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    // "detect" crashes under ESLint 10 (eslint-plugin-react@7.37.5 calls the
    // removed `context.getFilename`); pin to the installed React version instead.
    settings: { react: { version: "19.2" } },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "warn",
      // TypeScript already enforces prop shapes; this rule is redundant and
      // false-positives on destructured function-component params.
      "react/prop-types": "off",
    },
  },

  // Node-executed config files (not bundled by Metro/babel for the app).
  {
    files: [
      "*.config.{js,cjs,mjs,ts,mts,cts}",
      "babel.config.js",
      "metro.config.js",
      "jest.setup.ts",
    ],
    languageOptions: { globals: { ...globals.node } },
  },

  // Jest test files.
  {
    files: ["__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}", "jest.setup.ts"],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
    rules: {
      // Mocks in this codebase rely on require() for un-hoisted, per-test
      // module factories (see jest.setup.ts) — idiomatic for Jest, not a mistake.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);
