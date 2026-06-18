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
    "mcp-servers/**",
    "scratch/**",
    "dist/**",
    "node_modules/**",
    "check_encoding.js",
    // Archived code — excluded from TS, should not block lint/release
    "app/_archive/**",
  ]),
  {
    rules: {
      // Supabase query results and external API responses genuinely require `any`
      // until we have full database type generation. Downgraded to warn so build
      // can succeed while we incrementally add proper types.
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars are warnings — prefixed with _ to suppress per-variable
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "@typescript-eslint/ban-ts-comment": "warn",
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
