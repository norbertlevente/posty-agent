import { defineConfig } from 'tsup';

/*
  One source, two CLIs (see src/brand.ts):
    pnpm build / pnpm build:posty  -> dist/                  (npm posty-cli, command posty)
    pnpm build:postemi             -> packages/postemi/dist/ (npm postemi, command postemi)
  CLI_BRAND picks the brand; it is baked in as a string literal.
*/
const brand = process.env.CLI_BRAND === 'postemi' ? 'postemi' : 'posty';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: false, // Disable DTS generation to avoid type issues
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: brand === 'postemi' ? 'packages/postemi/dist' : 'dist',
  define: {
    __CLI_BRAND__: JSON.stringify(brand),
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
});
