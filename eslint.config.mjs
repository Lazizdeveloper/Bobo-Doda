import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // Client-only auth/storage hydration intentionally synchronizes external
      // browser state into React after mount.
      "react-hooks/set-state-in-effect": "off",
      // Time-relative profile metrics are snapshots, not render identities.
      "react-hooks/purity": "off",
    },
  },
  {
    files: ["scripts/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  globalIgnores([
    ".next/**",
    ".next-*/**",
    "node_modules/**",
    "next-env.d.ts",
    "public/sw.js",
  ]),
]);
