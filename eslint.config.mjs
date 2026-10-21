// Next.js 16: eslint-config-next ships native flat configs (FlatCompat no longer loads them).
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Old site, owner originals, licensed references and build outputs.
    "legacy/**",
    "references/**",
    "assets/**",
    ".open-next/**",
    ".wrangler/**",
    "cloudflare-env.d.ts",
    // Third-party agent skills (Impeccable ships bundled browser scripts).
    ".claude/**",
  ]),
]);

export default eslintConfig;
