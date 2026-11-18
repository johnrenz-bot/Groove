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
    "scripts/archive/**",
    "read-pdf.js",
    "read-pdf.mjs",
  ]),
  {
    files: ["**/*.cjs"],
    rules: {
      // Plain CommonJS may use require(); the TS import rule does not apply.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // The react-hooks plugin is only registered by the Next flat configs for
    // JS/TS sources; applying these rules globally made every .cjs/.mjs file
    // (e.g. the scratch helpers at the repo root) fail config evaluation.
    files: ["**/*.{js,jsx,ts,tsx,mjs,mts,cts}"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@next/next/no-img-element": "warn",
    },
  },
]);

export default eslintConfig;
