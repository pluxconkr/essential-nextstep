/**
 * Web twin of kv.ts on localStorage (console and family view never store student data;
 * this exists so shared code resolves on web).
 */
const PREFIX = 'nextstep:';

function ls(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export const kv = {
  lastWriteOk: true,
  get<T>(key: string): T | null {
    try {
      const raw = ls()?.getItem(PREFIX + key);
      return raw == null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown): boolean {
    try {
      ls()?.setItem(PREFIX + key, JSON.stringify(value));
      this.lastWriteOk = true;
      return true;
    } catch {
      this.lastWriteOk = false;
      return false;
    }
  },
  update<T>(key: string, fn: (prev: T | null) => T): T {
    const next = fn(this.get<T>(key));
    this.set(key, next);
    return next;
  },
  remove(key: string): void {
    try {
      ls()?.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  },
  keys(): string[] {
    const s = ls();
    if (!s) return [];
    const out: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
    }
    return out;
  },
  clear(): void {
    for (const k of this.keys()) this.remove(k);
  },
};

export type KV = typeof kv;
