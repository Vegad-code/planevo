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
]);

export default eslintConfig;
