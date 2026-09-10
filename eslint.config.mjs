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
      // O'zbek tilidagi tutuq belgilari (o', g') va tirnoqlar uchun
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    /* Tekshiruv skriptlari — Node CommonJS. `scratch/` dagi bir martalik
       tekshiruv fayllari ham shu qoidaga kiradi: ular ilova bundle'iga
       tushmaydi, lekin lint'da `require()` xatosi berib `npm run verify`
       ni yiqitardi (ya'ni deploy oldidan majburiy tekshiruv umuman
       o'tmasdi). */
    files: ["scripts/**/*.cjs", "scratch/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  globalIgnores([
    ".next/**",
    ".next-*/**",
    "node_modules/**",
    "next-env.d.ts",
    "public/sw.js",
    // Backend (NestJS) — alohida repo-ichi loyiha, o'z eslint/tsconfig'i bilan
    // (backend/eslint.config.mjs). Frontend `eslint .` uni tekshirmasin.
    "backend/**",
  ]),
]);
