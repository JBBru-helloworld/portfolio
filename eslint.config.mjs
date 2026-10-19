import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
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
    ],
  },
];

export default eslintConfig;
