/**
 * Content build: content/*.json → assets/data/content.json
 *
 * Refuses to emit a step without an owner, a source URL, verification dates, a verifier, Spanish
 * text, a parseable deadline rule or with an unknown prerequisite; refuses English step text above
 * grade 6.5 (Flesch–Kincaid); warns on steps not verified in 90 days and fails on 120.
 *
 *   npm run content:build            # build
 *   npm run content:build -- --check # validate only (CI)
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ContentSchema, MAX_READING_GRADE, STALE_AFTER_DAYS, validateContent, WARN_AFTER_DAYS } from '../src/domain/content';
import type { Content } from '../src/domain/types';

const ROOT = resolve(import.meta.dirname, '..');
const read = <T>(name: string): T => JSON.parse(readFileSync(resolve(ROOT, 'content', name), 'utf8')) as T;

function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  const stripped = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** Flesch–Kincaid grade level for English prose. */
export function readingGrade(text: string): number {
  const sentences = Math.max(1, (text.match(/[.!?]+(\s|$)/g) ?? []).length);
  const words = text.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  if (words.length === 0) return 0;
  const syl = words.reduce((s, w) => s + syllables(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59;
}

const checkOnly = process.argv.includes('--check');
const today = new Date();
const todayIso = today.toISOString().slice(0, 10);

const content: Content = {
  version: '',
  builtAt: today.toISOString(),
  tracks: read('tracks.json'),
  steps: read('steps.json'),
  resources: read('resources.json'),
  glossary: read('glossary.json'),
  badges: read('badges.json'),
  crisis: read('crisis_resources.json'),
  calendar: read('district_calendar.json'),
};

const errors: string[] = [];
const warnings: string[] = [];

const parsed = ContentSchema.safeParse(content);
if (!parsed.success) {
  for (const issue of parsed.error.issues) errors.push(`${issue.path.join('.')}: ${issue.message}`);
}
errors.push(...validateContent(content));

const dayMs = 86_400_000;
for (const s of content.steps) {
  const age = Math.floor((today.getTime() - Date.parse(`${s.lastVerified}T12:00:00Z`)) / dayMs);
  if (age > STALE_AFTER_DAYS) errors.push(`${s.key}: last verified ${age} days ago (> ${STALE_AFTER_DAYS}); re-verify before building`);
  else if (age > WARN_AFTER_DAYS) warnings.push(`${s.key}: last verified ${age} days ago; re-verify soon`);
  if (s.verifyBy < todayIso) warnings.push(`${s.key}: verify-by ${s.verifyBy} has passed`);
  for (const [field, text] of [
    ['why', s.why],
    ['how', s.how.join(' ')],
  ] as const) {
    const g = readingGrade(text);
    if (g > MAX_READING_GRADE) errors.push(`${s.key}.${field}: reading grade ${g.toFixed(1)} > ${MAX_READING_GRADE} — rewrite in plainer English`);
  }
  if (s.reviewStatus === 'pending') warnings.push(`${s.key}: counselor review pending (shown with a "pending review" label)`);
}
for (const c of content.crisis) if (!c.reviewedBy) errors.push(`crisis ${c.key}: needs a named reviewer`);

const pending = content.steps.filter((s) => s.reviewStatus === 'pending').length;
console.log(`${content.steps.length} steps (${pending} pending review), ${content.resources.length} resources, ${content.glossary.length} glossary terms, ${content.badges.length} badges`);
for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`error ${e}`);
if (errors.length > 0) {
  console.error(`content build failed with ${errors.length} error(s)`);
  process.exit(1);
}

const body = JSON.stringify({ ...content, version: '', builtAt: '' });
content.version = createHash('sha256').update(body).digest('hex').slice(0, 12);
if (!checkOnly) {
  writeFileSync(resolve(ROOT, 'assets/data/content.json'), JSON.stringify(content, null, 2) + '\n');
  console.log(`wrote assets/data/content.json (version ${content.version})`);
} else {
  console.log(`content ok (version ${content.version})`);
}
