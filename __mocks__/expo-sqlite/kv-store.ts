/** In-memory stand-in for expo-sqlite/kv-store in Jest. Mirrors the synchronous API the app uses. */
export class SQLiteStorage {
  private map = new Map<string, string>();
  constructor(_name: string) {}
  getItemSync(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItemSync(key: string, value: string | ((prev: string | null) => string)): void {
    const next = typeof value === 'function' ? value(this.map.get(key) ?? null) : value;
    this.map.set(key, next);
  }
  removeItemSync(key: string): void {
    this.map.delete(key);
  }
  getAllKeysSync(): string[] {
    return [...this.map.keys()];
  }
  clearSync(): void {
    this.map.clear();
  }
}
