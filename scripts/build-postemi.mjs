#!/usr/bin/env node
/*
  Assemble the `postemi` npm package in packages/postemi/.

  The code is NOT forked: `pnpm build:postemi` first builds src/ with
  CLI_BRAND=postemi (tsup.config.ts, src/brand.ts) into packages/postemi/dist.
  This script then copies what the package ships next to it:

    - SKILL.md      from skills/postemi/SKILL.md (written for Postemi)
    - LICENSE       as is
    - PROVIDER_SETTINGS.md, SUPPORTED_FILE_TYPES.md, examples/*.json
                    from the repo root, with the command and product name
                    changed (`posty upload` -> `postemi upload`, Posty ->
                    Postemi). Those files name nothing else that differs
                    between the brands; check() below fails the build if
                    one ever does.

  packages/postemi/package.json and README.md are kept in git; everything
  this script writes is generated and ignored (.gitignore).
*/
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = join(root, 'packages', 'postemi');

if (!existsSync(join(pkg, 'dist', 'index.js'))) {
  console.error('packages/postemi/dist/index.js is missing: run "pnpm build:postemi", not this script alone.');
  process.exit(1);
}

const rename = (text) =>
  text
    .replace(/\bposty-cli\b/g, 'postemi')
    .replace(/"posty"/g, '"postemi"')
    .replace(/\bposty(?= [a-z])/g, 'postemi')
    .replace(/\bPosty\b/g, 'Postemi');

/** Anything Posty-specific left after the rename is a build error, not a silent leak. */
const check = (name, text) => {
  const leaks = text.match(/posty\.hu|\bposty\b|\bPosty\b|POSTY_|Budapest|forint/g);
  if (leaks) {
    console.error(`${name}: Posty-specific text left after the rename: ${[...new Set(leaks)].join(', ')}`);
    process.exit(1);
  }
  return text;
};

copyFileSync(join(root, 'LICENSE'), join(pkg, 'LICENSE'));
copyFileSync(join(root, 'skills', 'postemi', 'SKILL.md'), join(pkg, 'SKILL.md'));

for (const doc of ['PROVIDER_SETTINGS.md', 'SUPPORTED_FILE_TYPES.md']) {
  writeFileSync(join(pkg, doc), check(doc, rename(readFileSync(join(root, doc), 'utf8'))));
}

rmSync(join(pkg, 'examples'), { recursive: true, force: true });
mkdirSync(join(pkg, 'examples'));
for (const file of readdirSync(join(root, 'examples'))) {
  const text = readFileSync(join(root, 'examples', file), 'utf8');
  writeFileSync(join(pkg, 'examples', file), check(`examples/${file}`, rename(text)));
}

check('SKILL.md', readFileSync(join(pkg, 'SKILL.md'), 'utf8'));
console.log('packages/postemi assembled: dist, SKILL.md, LICENSE, PROVIDER_SETTINGS.md, SUPPORTED_FILE_TYPES.md, examples/');
