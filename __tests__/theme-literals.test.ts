/**
 * Design tokens live in src/ui/theme.ts and nowhere else: no literal font sizes, weights,
 * line heights or hex colours in screens or widgets. (Plan §16.2 / AC19.)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const ALLOWED = new Set(['ui/theme.ts']);
const PATTERNS: [string, RegExp][] = [
  ['fontSize literal', /fontSize:\s*\d/],
  ['fontWeight literal', /fontWeight:\s*['"]\d/],
  ['lineHeight literal', /lineHeight:\s*\d/],
  ['hex colour literal', /['"`]#[0-9a-fA-F]{3,8}['"`]/],
];

test('no type or colour literals outside src/ui/theme.ts', () => {
  const offenders: string[] = [];
  for (const file of walk(ROOT)) {
    const rel = relative(ROOT, file);
    if (ALLOWED.has(rel)) continue;
    const src = readFileSync(file, 'utf8');
    for (const [label, re] of PATTERNS) {
      const m = re.exec(src);
      if (m) offenders.push(`${rel}: ${label} (${m[0]})`);
    }
  }
  expect(offenders).toEqual([]);
});

test('src/domain imports nothing from React, React Native or Expo', () => {
  const offenders: string[] = [];
  for (const file of walk(join(ROOT, 'domain'))) {
    const src = readFileSync(file, 'utf8');
    if (/from\s+['"](react|react-native|expo[^'"]*|@expo\/[^'"]*|@\/(ui|store|services|data|server)[^'"]*)['"]/.test(src)) offenders.push(relative(ROOT, file));
  }
  expect(offenders).toEqual([]);
});
