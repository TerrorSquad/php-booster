import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["**/node_modules/**", "**/vendor/**"],
  },
  {
    files: ["booster/**/*.{js,mjs,cjs,ts,mts,cts}"],
    ...js.configs.recommended,
    languageOptions: { globals: globals.node },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["booster/**/*.{ts,mts,cts}"],
  })),
  {
    files: ["booster/**/*.json"],
    plugins: { json },
    language: "json/json",
    ...json.configs.recommended,
  },
  ...markdown.configs.recommended.map((config) => ({
    ...config,
    files: ["booster/**/*.md"],
  })),
]);
