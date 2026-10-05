/** Collision-resistant ids without a dependency: time + 80 bits of randomness, base-36. */
export function newId(prefix: string): string {
  const time = Date.now().toString(36);
  let rand = '';
  const g = globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } };
  if (g.crypto?.getRandomValues) {
    const bytes = g.crypto.getRandomValues(new Uint8Array(10));
    for (const b of bytes) rand += (b % 36).toString(36);
  } else {
    for (let i = 0; i < 10; i++) rand += Math.floor(Math.random() * 36).toString(36);
  }
  return `${prefix}_${time}${rand}`;
}

/** 128-bit token in base32 (Crockford alphabet, no ambiguous letters) for family links. */
export function newToken(): string {
  const alphabet = '0123456789abcdefghjkmnpqrstvwxyz';
  const g = globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } };
  const bytes = new Uint8Array(16);
  if (g.crypto?.getRandomValues) g.crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  let out = '';
  for (const b of bytes) out += alphabet[b % 32];
  return out + alphabet[bytes[0] % 32] + alphabet[bytes[15] % 32];
}
