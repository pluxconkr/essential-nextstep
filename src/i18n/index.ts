/**
 * Tiny typed string table: t(key, params) with {name} placeholders and .one/.other plurals.
 * No Expo imports here — shared by tests and the server. The app shell sets the device language at boot.
 */
import { en, type Key } from './en';
import { es } from './es';

export type Locale = 'en' | 'es';
export type { Key };

const DICTS: Record<Locale, Record<Key, string>> = { en, es };
let current: Locale = 'en';

/** Accepts a BCP-47 tag or language code; anything that is not Spanish falls back to English. */
export function setLocale(tag: string | null | undefined): Locale {
  current = tag?.toLowerCase().startsWith('es') ? 'es' : 'en';
  return current;
}

export function locale(): Locale {
  return current;
}

export function t(key: Key, params?: Record<string, string | number>): string {
  let s: string = DICTS[current][key] ?? en[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Translate for a specific locale (family view, server-side notices). */
export function tFor(loc: Locale, key: Key, params?: Record<string, string | number>): string {
  let s: string = DICTS[loc][key] ?? en[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

type PluralKeyOf<K> = K extends `${infer B}.one` ? (`${B}.other` extends Key ? B : never) : never;
export type PluralKey = PluralKeyOf<Key>;

/** Exactly one vs. everything else. Fills {n} automatically. */
export function tn(n: number, key: PluralKey, params?: Record<string, string | number>): string {
  return t(`${key}.${n === 1 ? 'one' : 'other'}` as Key, { n, ...(params ?? {}) });
}

/** Pick the localised field of a content record ("title" / "titleEs"). */
export function pick<T extends object>(obj: T, base: string): string {
  const rec = obj as Record<string, unknown>;
  const v = current === 'es' ? rec[`${base}Es`] : undefined;
  const fallback = rec[base];
  return typeof v === 'string' && v.length > 0 ? v : typeof fallback === 'string' ? fallback : '';
}

export function pickList<T extends object>(obj: T, base: string): string[] {
  const rec = obj as Record<string, unknown>;
  const v = current === 'es' ? rec[`${base}Es`] : undefined;
  const fallback = rec[base];
  if (Array.isArray(v) && v.length > 0) return v as string[];
  return Array.isArray(fallback) ? (fallback as string[]) : [];
}
