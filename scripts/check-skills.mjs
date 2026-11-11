#!/usr/bin/env node
/*
  Checks the agent skills, and with --sync copies them where they are shipped.

    node scripts/check-skills.mjs          # check only; exit 1 on a problem
    node scripts/check-skills.mjs --sync   # copy, then check

  The source of every skill is skills/<name>/. The copies:

    skills/posty (the CLI skill)
      -> SKILL.md and reference/ at the repo root (the npm package ships them)
      -> plugins/posty-cli/skills/posty (the Claude Code CLI plugin)
    skills/posty-writing (the writing skill)
      -> the plugins people install in an agent: posty-cli, posty-cursor,
         posty-grok. Not posty-mcp and posty-chatgpt: those one-package
         listings ship their own main skill only.

  Each plugin's own `posty` skill (MCP, ChatGPT, Cursor, Grok) is its own text
  and is not copied, but it is checked like the rest.

  Checks, on every skill file (skills/**, plugins/<plugin>/skills/**, the root
  SKILL.md and reference/):
    1. every copy is identical to its source;
    2. no em or en dash, and no hyphen used as a dash (" - " in prose; code
       blocks and inline code are skipped; a list item's leading "- " is fine);
    3. every relative link resolves.
*/
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** [source dir under skills/, destination dir relative to the repo root] */
const COPIES = [
  ['posty', '.'],
  ['posty', 'plugins/posty-cli/skills/posty'],
  ['posty-writing', 'plugins/posty-cli/skills/posty-writing'],
  ['posty-writing', 'plugins/posty-cursor/skills/posty-writing'],
  ['posty-writing', 'plugins/posty-grok/skills/posty-writing'],
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

/** The files of a skill: SKILL.md plus everything under reference/. */
function skillFiles(dir) {
  const files = ['SKILL.md'];
  const ref = join(dir, 'reference');
  if (existsSync(ref)) files.push(...walk(ref).map((f) => relative(dir, f)));
  return files.sort();
}

if (process.argv.includes('--sync')) {
  for (const [name, to] of COPIES) {
    const from = join(root, 'skills', name);
    const dest = join(root, to);
    if (to !== '.') rmSync(dest, { recursive: true, force: true });
    else rmSync(join(dest, 'reference'), { recursive: true, force: true });
    for (const file of skillFiles(from)) cpSync(join(from, file), join(dest, file), { recursive: true });
  }
  console.log(`check-skills: synced ${COPIES.length} copies`);
}

const failures = [];
const fail = (message) => failures.push(message);
const read = (path) => readFileSync(path, 'utf8');

// 1. Copies
for (const [name, to] of COPIES) {
  const from = join(root, 'skills', name);
  const dest = join(root, to);
  const want = skillFiles(from);
  const have = existsSync(join(dest, 'SKILL.md')) ? skillFiles(dest) : [];
  const where = to === '.' ? 'the repo root' : to;
  if (want.join('\n') !== have.join('\n')) {
    fail(`${where}: files differ from skills/${name} (run node scripts/check-skills.mjs --sync)`);
    continue;
  }
  for (const file of want) {
    if (read(join(from, file)) !== read(join(dest, file))) {
      fail(`${where}/${file} differs from skills/${name}/${file} (run node scripts/check-skills.mjs --sync)`);
    }
  }
}

// 2 and 3. Dashes and links in every skill file
const checked = new Set([join(root, 'SKILL.md')]);
if (existsSync(join(root, 'reference'))) walk(join(root, 'reference')).forEach((f) => checked.add(f));
walk(join(root, 'skills')).forEach((f) => checked.add(f));
for (const plugin of readdirSync(join(root, 'plugins'))) {
  const dir = join(root, 'plugins', plugin, 'skills');
  if (existsSync(dir)) walk(dir).forEach((f) => checked.add(f));
}

for (const file of [...checked].filter((f) => f.endsWith('.md')).sort()) {
  const name = relative(root, file);
  let inFence = false;
  read(file)
    .split('\n')
    .forEach((line, i) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return;
      }
      if (inFence) return;
      const prose = line.replace(/`[^`]*`/g, '``');
      if (/[–—]/.test(prose)) fail(`${name}:${i + 1}: em or en dash`);
      if (/\S\s+-{1,2}\s+\S/.test(prose.replace(/^\s*[-*]\s+/, ''))) {
        fail(`${name}:${i + 1}: hyphen used as a dash`);
      }
      for (const [, target] of line.matchAll(/\]\((\.{1,2}\/[^)#\s]*)/g)) {
        if (!existsSync(join(dirname(file), target))) fail(`${name}:${i + 1}: broken link ${target}`);
      }
    });
}

if (failures.length) {
  console.error(`check-skills: ${failures.length} problem(s)\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`check-skills: ok (${COPIES.length} copies, ${checked.size} files)`);
