#!/usr/bin/env node
/*
  Assemble the `postemi` npm package in packages/postemi/.

  The code is NOT forked: `pnpm build:postemi` first builds src/ with
  CLI_BRAND=postemi (tsup.config.ts, src/brand.ts) into packages/postemi/dist.
  This script then copies what the package ships next to it:

    - SKILL.md      from skills/postemi/SKILL.md (written for Postemi)
    - LICENSE       with the Postemi CLI header line
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

/*
  Word start for `posty`: no letter, digit or _ before it, OR a JSON escape
  (`\n`, `\t`, `\r`) right before it. `\b` alone (and a plain look-behind)
  misses "...\n\nposty auth:login" in examples/*.json, where the character
  before `posty` is the `n` of the escape.
*/
const B = String.raw`(?:(?<![A-Za-z0-9_])|(?<=\\[ntr]))`;
const rename = (text) =>
  text
    .replace(new RegExp(`${B}posty-cli\\b`, 'g'), 'postemi')
    .replace(/"posty"/g, '"postemi"')
    .replace(new RegExp(`${B}posty(?= [a-z])`, 'g'), 'postemi')
    .replace(new RegExp(`${B}Posty\\b`, 'g'), 'Postemi');

/** Anything Posty-specific left after the rename is a build error, not a silent leak. */
const check = (name, text) => {
  const leaks = text.match(
    new RegExp(`posty\\.hu|${B}posty\\b|${B}Posty\\b|POSTY_|Budapest|forint`, 'g')
  );
  if (leaks) {
    console.error(`${name}: Posty-specific text left after the rename: ${[...new Set(leaks)].join(', ')}`);
    process.exit(1);
  }
  return text;
};

/* Same AGPL text and Postiz notice (the CLI code is the same); only the name line differs. */
const license = readFileSync(join(root, 'LICENSE'), 'utf8');
if (!license.startsWith('Posty CLI (posty-cli)\n')) {
  console.error('LICENSE: the first line is no longer "Posty CLI (posty-cli)"; update build-postemi.mjs.');
  process.exit(1);
}
writeFileSync(
  join(pkg, 'LICENSE'),
  check('LICENSE', license.replace('Posty CLI (posty-cli)\n', 'Postemi CLI (postemi)\n'))
);
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
